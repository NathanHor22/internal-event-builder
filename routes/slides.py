import os
import json
import glob
import logging
from flask import Blueprint, request, jsonify, send_file, g
import config

log = logging.getLogger(__name__)
from extensions import limiter
from services.slide_service import generate_slide_content
from services.pptx_builder import build_pptx

slides_bp = Blueprint('slides', __name__)

_SLIDES_LIMIT = "10 per hour"

SLIDES_DIR = os.path.join(config.BASE_DIR, 'slides_output')
os.makedirs(SLIDES_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}


@slides_bp.before_request
def set_api_credentials():
    from routes.ai import ALLOWED_MODELS
    user_key = request.headers.get('X-Api-Key', '').strip()
    user_model = request.headers.get('X-Api-Model', '').strip()
    g.api_key = user_key if user_key else None
    g.model = user_model if user_model in ALLOWED_MODELS else None


@slides_bp.errorhandler(Exception)
def handle_error(e):
    log.exception("Unhandled error in slides blueprint")
    return jsonify({"error": "An error occurred while generating the deck. Please try again."}), 500


@slides_bp.route('/api/slides/generate', methods=['POST'])
@limiter.limit(_SLIDES_LIMIT)
def generate_slides():
    # Parse answers from multipart form or JSON
    if request.content_type and 'multipart' in request.content_type:
        try:
            wizard_answers = json.loads(request.form.get('answers', '{}'))
        except (json.JSONDecodeError, ValueError):
            return jsonify({"error": "Invalid answers JSON"}), 400
    else:
        wizard_answers = request.json or {}

    if not wizard_answers.get('event_name'):
        return jsonify({"error": "event_name is required"}), 400

    # Extract text from uploaded PDF brief if provided
    pdf_text = ''
    if 'client_brief' in request.files:
        pdf_file = request.files['client_brief']
        if pdf_file.filename and pdf_file.filename.lower().endswith('.pdf'):
            safe_name = f"brief_{os.urandom(6).hex()}.pdf"
            tmp_path = os.path.join(config.UPLOAD_DIR, safe_name)
            pdf_file.save(tmp_path)
            try:
                from parsers.pdf_parser import parse_pdf
                pdf_text = parse_pdf(tmp_path)
            finally:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

    # Save uploaded images temporarily
    image_paths = []
    for key in sorted(request.files.keys()):
        if key.startswith('image_'):
            img = request.files[key]
            if img.mimetype in ALLOWED_IMAGE_TYPES:
                ext = img.filename.rsplit('.', 1)[-1].lower() if '.' in img.filename else 'jpg'
                img_path = os.path.join(SLIDES_DIR, f"img_{os.urandom(6).hex()}.{ext}")
                img.save(img_path)
                image_paths.append(img_path)

    try:
        # Generate slide content via Claude
        slide_data = generate_slide_content(wizard_answers, pdf_text=pdf_text)

        # Build PPTX
        pptx_bytes = build_pptx(slide_data, image_paths=image_paths)
    finally:
        # Clean up temp images
        for p in image_paths:
            try:
                os.remove(p)
            except OSError:
                pass

    # Clean up old files for the same event name
    safe_name = "".join(
        c if c.isalnum() or c in '-_ ' else '_'
        for c in wizard_answers.get('event_name', 'deck')
    )[:40].strip()
    for old in glob.glob(os.path.join(SLIDES_DIR, f"{safe_name}_*.pptx")):
        try:
            os.remove(old)
        except OSError:
            pass

    filename = f"{safe_name}_{os.urandom(4).hex()}.pptx"
    filepath = os.path.join(SLIDES_DIR, filename)
    with open(filepath, 'wb') as f:
        f.write(pptx_bytes)

    return jsonify({
        "filename": filename,
        "slide_count": len(slide_data.get('slides', [])) + 1,
        "deck_title": slide_data.get('deck_title', wizard_answers.get('event_name')),
    })


@slides_bp.route('/api/slides/download/<filename>', methods=['GET'])
def download_slide(filename):
    if not all(c.isalnum() or c in '-_.' for c in filename):
        return jsonify({"error": "Invalid filename"}), 400
    if not filename.endswith('.pptx'):
        return jsonify({"error": "Invalid file type"}), 400
    # Resolve the real path and confirm it's inside SLIDES_DIR
    filepath = os.path.realpath(os.path.join(SLIDES_DIR, filename))
    if not filepath.startswith(os.path.realpath(SLIDES_DIR) + os.sep):
        return jsonify({"error": "Invalid filename"}), 400
    if not os.path.isfile(filepath):
        return jsonify({"error": "File not found"}), 404
    return send_file(
        filepath,
        mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation',
        as_attachment=True,
        download_name=filename,
    )
