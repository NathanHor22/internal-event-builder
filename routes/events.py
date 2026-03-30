import os
import json
from flask import Blueprint, request, jsonify
from database import get_db
import config

events_bp = Blueprint('events', __name__)

@events_bp.route('/api/events', methods=['GET'])
def list_events():
    db = get_db()
    rows = db.execute("""
        SELECT e.*, bv.name as brand_voice_name,
               (SELECT COUNT(*) FROM campaigns c WHERE c.event_id = e.id) as campaign_count,
               (SELECT COUNT(*) FROM content_pieces cp
                JOIN campaigns c2 ON cp.campaign_id = c2.id
                WHERE c2.event_id = e.id) as content_count
        FROM events e
        LEFT JOIN brand_voices bv ON e.brand_voice_id = bv.id
        ORDER BY e.created_at DESC
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@events_bp.route('/api/events', methods=['POST'])
def create_event():
    data = request.json
    db = get_db()
    cur = db.execute(
        """INSERT INTO events (name, description, target_audience, theme, goals, dates, location, additional_info, brand_voice_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (data.get('name', 'Untitled Event'), data.get('description'), data.get('target_audience'),
         data.get('theme'), json.dumps(data.get('goals', [])), json.dumps(data.get('dates', {})),
         data.get('location'), json.dumps(data.get('additional_info', {})),
         data.get('brand_voice_id'), data.get('status', 'draft'))
    )
    db.commit()
    event_id = cur.lastrowid
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    db.close()
    return jsonify(dict(event)), 201

@events_bp.route('/api/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    db = get_db()
    event = db.execute("""
        SELECT e.*, bv.name as brand_voice_name, bv.tone as brand_voice_tone
        FROM events e
        LEFT JOIN brand_voices bv ON e.brand_voice_id = bv.id
        WHERE e.id = ?
    """, (event_id,)).fetchone()
    if not event:
        db.close()
        return jsonify({"error": "Event not found"}), 404
    result = dict(event)
    # Get platforms
    platforms = db.execute("SELECT * FROM event_platforms WHERE event_id = ?", (event_id,)).fetchall()
    result['platforms'] = [dict(p) for p in platforms]
    # Get campaigns with content counts
    campaigns = db.execute("""
        SELECT c.*, (SELECT COUNT(*) FROM content_pieces cp WHERE cp.campaign_id = c.id) as content_count
        FROM campaigns c WHERE c.event_id = ? ORDER BY c.created_at
    """, (event_id,)).fetchall()
    result['campaigns'] = [dict(c) for c in campaigns]
    db.close()
    return jsonify(result)

@events_bp.route('/api/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    data = request.json
    db = get_db()
    fields = []
    values = []
    allowed = ['name', 'description', 'target_audience', 'theme', 'location', 'brand_voice_id', 'status']
    for key in allowed:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    json_fields = ['goals', 'dates', 'additional_info']
    for key in json_fields:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(json.dumps(data[key]) if not isinstance(data[key], str) else data[key])
    if not fields:
        return jsonify({"error": "No fields to update"}), 400
    fields.append("updated_at = datetime('now')")
    values.append(event_id)
    db.execute(f"UPDATE events SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    db.close()
    return jsonify(dict(event))

@events_bp.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    db = get_db()
    db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})

@events_bp.route('/api/events/upload', methods=['POST'])
def upload_brief():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.pdf', '.pptx'):
        return jsonify({"error": "Only PDF and PPTX files are supported"}), 400
    # Save file
    safe_name = f"{os.urandom(8).hex()}{ext}"
    filepath = os.path.join(config.UPLOAD_DIR, safe_name)
    file.save(filepath)
    # Parse
    raw_text = ""
    if ext == '.pdf':
        from parsers.pdf_parser import parse_pdf
        raw_text = parse_pdf(filepath)
    elif ext == '.pptx':
        from parsers.pptx_parser import parse_pptx
        raw_text = parse_pptx(filepath)
    # Create event with raw text
    db = get_db()
    cur = db.execute(
        "INSERT INTO events (name, raw_file_path, raw_text, status) VALUES (?, ?, ?, 'draft')",
        (file.filename.rsplit('.', 1)[0], filepath, raw_text)
    )
    db.commit()
    event_id = cur.lastrowid
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    db.close()
    return jsonify(dict(event)), 201

@events_bp.route('/api/events/<int:event_id>/platforms', methods=['GET'])
def get_platforms(event_id):
    db = get_db()
    rows = db.execute("SELECT * FROM event_platforms WHERE event_id = ?", (event_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@events_bp.route('/api/events/<int:event_id>/platforms', methods=['PUT'])
def update_platforms(event_id):
    data = request.json  # list of {platform, is_selected, reasoning}
    db = get_db()
    db.execute("DELETE FROM event_platforms WHERE event_id = ?", (event_id,))
    for p in data:
        db.execute(
            "INSERT INTO event_platforms (event_id, platform, is_selected, reasoning) VALUES (?, ?, ?, ?)",
            (event_id, p['platform'], p.get('is_selected', 1), p.get('reasoning', ''))
        )
    db.commit()
    rows = db.execute("SELECT * FROM event_platforms WHERE event_id = ?", (event_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])
