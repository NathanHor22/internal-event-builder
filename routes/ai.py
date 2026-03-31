import json
import anthropic
from flask import Blueprint, request, jsonify, g
from database import get_db
from services.ai_service import extract_brief, suggest_platforms, generate_ideas, write_content, recommend_ads
import config
from extensions import limiter

ai_bp = Blueprint('ai', __name__)

# 20 AI calls per hour per IP — protects Anthropic API spend
_AI_LIMIT = "20 per hour"

ALLOWED_MODELS = {
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
}

@ai_bp.before_request
def set_api_credentials():
    """Promote user-supplied API key and model from headers into flask.g."""
    user_key = request.headers.get('X-Api-Key', '').strip()
    user_model = request.headers.get('X-Api-Model', '').strip()
    g.api_key = user_key if user_key else None
    g.model = user_model if user_model in ALLOWED_MODELS else None

@ai_bp.errorhandler(Exception)
def handle_ai_error(e):
    return jsonify({"error": "An internal error occurred. Please try again."}), 500


@ai_bp.route('/api/ai/verify-key', methods=['POST'])
@limiter.limit("10 per hour")
def verify_key():
    data = request.json or {}
    api_key = data.get('api_key', '').strip()
    if not api_key:
        return jsonify({"error": "api_key required"}), 400
    try:
        client = anthropic.Anthropic(api_key=api_key)
        client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=5,
            messages=[{"role": "user", "content": "Hi"}]
        )
        return jsonify({"valid": True})
    except anthropic.AuthenticationError:
        return jsonify({"valid": False, "error": "Invalid API key"}), 401
    except Exception:
        return jsonify({"valid": False, "error": "Could not connect to Anthropic API"}), 400

@ai_bp.route('/api/ai/extract-brief', methods=['POST'])
@limiter.limit(_AI_LIMIT)
def api_extract_brief():
    data = request.json
    event_id = data.get('event_id')
    if not event_id:
        return jsonify({"error": "event_id required"}), 400
    db = get_db()
    event = db.execute("SELECT raw_text FROM events WHERE id = ?", (event_id,)).fetchone()
    db.close()
    if not event or not event['raw_text']:
        return jsonify({"error": "No raw text found for this event"}), 400
    result = extract_brief(event['raw_text'])
    # Update event with extracted data
    db = get_db()
    db.execute("""UPDATE events SET name = COALESCE(?, name), description = ?,
        target_audience = ?, theme = ?, goals = ?, dates = ?, location = ?,
        additional_info = ?, updated_at = NOW() WHERE id = ?""",
        (result.get('name'), result.get('description'), result.get('target_audience'),
         result.get('theme'), json.dumps(result.get('goals', [])),
         json.dumps(result.get('dates', {})), result.get('location'),
         json.dumps(result.get('additional_info', {})), event_id))
    db.commit()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    db.close()
    return jsonify({"extracted": result, "event": dict(event)})

@ai_bp.route('/api/ai/suggest-platforms', methods=['POST'])
@limiter.limit(_AI_LIMIT)
def api_suggest_platforms():
    data = request.json
    event_id = data.get('event_id')
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    db.close()
    if not event:
        return jsonify({"error": "Event not found"}), 404
    result = suggest_platforms(dict(event))
    # Save platforms
    db = get_db()
    db.execute("DELETE FROM event_platforms WHERE event_id = ?", (event_id,))
    for p in result:
        db.execute("INSERT INTO event_platforms (event_id, platform, is_selected, reasoning) VALUES (?, ?, 1, ?)",
                   (event_id, p['platform'], p.get('reasoning', '')))
    db.commit()
    platforms = db.execute("SELECT * FROM event_platforms WHERE event_id = ?", (event_id,)).fetchall()
    db.close()
    return jsonify([dict(p) for p in platforms])

@ai_bp.route('/api/ai/generate-ideas', methods=['POST'])
@limiter.limit(_AI_LIMIT)
def api_generate_ideas():
    data = request.json
    event_id = data.get('event_id')
    campaign_id = data.get('campaign_id')
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        db.close()
        return jsonify({"error": "Event not found"}), 404
    voice = None
    if event['brand_voice_id']:
        voice = db.execute("SELECT * FROM brand_voices WHERE id = ?", (event['brand_voice_id'],)).fetchone()
    if not voice:
        voice = db.execute("SELECT * FROM brand_voices WHERE name = 'Professional'").fetchone()
    platforms = db.execute("SELECT * FROM event_platforms WHERE event_id = ? AND is_selected = 1",
                          (event_id,)).fetchall()
    db.close()
    ideas = generate_ideas(dict(event), dict(voice), [dict(p) for p in platforms])
    # Save ideas as content pieces
    if campaign_id and ideas:
        db = get_db()
        created = []
        for idea in ideas:
            cur = db.execute(
                """INSERT INTO content_pieces (campaign_id, title, format, platform, timing, angle, status)
                   VALUES (?, ?, ?, ?, ?, ?, 'draft')""",
                (campaign_id, idea.get('title', 'Untitled'), idea.get('format'),
                 idea.get('platform'), idea.get('timing'), idea.get('angle'))
            )
            created.append(cur.lastrowid)
        db.commit()
        pieces = []
        for cid in created:
            piece = db.execute("SELECT * FROM content_pieces WHERE id = ?", (cid,)).fetchone()
            pieces.append(dict(piece))
        db.close()
        return jsonify({"ideas": ideas, "content_pieces": pieces})
    return jsonify({"ideas": ideas})

@ai_bp.route('/api/ai/write-content', methods=['POST'])
@limiter.limit(_AI_LIMIT)
def api_write_content():
    data = request.json
    content_id = data.get('content_id')
    db = get_db()
    piece = db.execute("SELECT * FROM content_pieces WHERE id = ?", (content_id,)).fetchone()
    if not piece:
        db.close()
        return jsonify({"error": "Content piece not found"}), 404
    campaign = db.execute("SELECT * FROM campaigns WHERE id = ?", (piece['campaign_id'],)).fetchone()
    event = db.execute("SELECT * FROM events WHERE id = ?", (campaign['event_id'],)).fetchone()
    voice = None
    if event['brand_voice_id']:
        voice = db.execute("SELECT * FROM brand_voices WHERE id = ?", (event['brand_voice_id'],)).fetchone()
    if not voice:
        voice = db.execute("SELECT * FROM brand_voices WHERE name = 'Professional'").fetchone()
    db.close()
    result = write_content(dict(piece), dict(event), dict(voice))
    # Update content piece
    db = get_db()
    db.execute("""UPDATE content_pieces SET copywriting = ?, video_script = ?, caption = ?,
        updated_at = NOW() WHERE id = ?""",
        (result.get('copywriting'), result.get('video_script'), result.get('caption'), content_id))
    db.commit()
    updated = db.execute("SELECT * FROM content_pieces WHERE id = ?", (content_id,)).fetchone()
    db.close()
    return jsonify(dict(updated))

@ai_bp.route('/api/ai/recommend-ads', methods=['POST'])
@limiter.limit(_AI_LIMIT)
def api_recommend_ads():
    data = request.json
    event_id = data.get('event_id')
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        db.close()
        return jsonify({"error": "Event not found"}), 404
    pieces = db.execute("""
        SELECT cp.* FROM content_pieces cp
        JOIN campaigns c ON cp.campaign_id = c.id
        WHERE c.event_id = ?
    """, (event_id,)).fetchall()
    db.close()
    if not pieces:
        return jsonify({"error": "No content pieces found"}), 400
    pieces_list = [dict(p) for p in pieces]
    recs = recommend_ads(pieces_list, dict(event))
    # Apply recommendations
    db = get_db()
    for rec in recs:
        if rec.get('should_promote') and rec.get('content_id'):
            db.execute("""UPDATE content_pieces SET is_ad = 1, ad_platform = ?, ad_reasoning = ?,
                ad_budget = ?, updated_at = NOW() WHERE id = ?""",
                (rec.get('ad_platform'), rec.get('reasoning'),
                 rec.get('suggested_budget'), rec['content_id']))
    db.commit()
    db.close()
    return jsonify(recs)
