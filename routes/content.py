from flask import Blueprint, request, jsonify
from database import get_db

content_bp = Blueprint('content', __name__)

ALLOWED_FIELDS = ['title', 'format', 'copywriting', 'video_script', 'caption', 'platform',
                  'timing', 'angle', 'is_ad', 'ad_platform', 'ad_budget', 'ad_start_date',
                  'ad_end_date', 'ad_reasoning', 'sort_order', 'status']

@content_bp.route('/api/campaigns/<int:campaign_id>/content', methods=['GET'])
def list_content(campaign_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM content_pieces WHERE campaign_id = ? ORDER BY sort_order, created_at",
        (campaign_id,)
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@content_bp.route('/api/campaigns/<int:campaign_id>/content', methods=['POST'])
def create_content(campaign_id):
    data = request.json
    db = get_db()
    cur = db.execute(
        """INSERT INTO content_pieces (campaign_id, title, format, copywriting, video_script, caption,
           platform, timing, angle, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (campaign_id, data.get('title', 'Untitled'), data.get('format'), data.get('copywriting'),
         data.get('video_script'), data.get('caption'), data.get('platform'), data.get('timing'),
         data.get('angle'), data.get('status', 'draft'))
    )
    db.commit()
    piece = db.execute("SELECT * FROM content_pieces WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(dict(piece)), 201

@content_bp.route('/api/content/<int:content_id>', methods=['PUT'])
def update_content(content_id):
    data = request.json
    db = get_db()
    fields = []
    values = []
    for key in ALLOWED_FIELDS:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    if fields:
        fields.append("updated_at = datetime('now')")
        values.append(content_id)
        db.execute(f"UPDATE content_pieces SET {', '.join(fields)} WHERE id = ?", values)
        db.commit()
    piece = db.execute("SELECT * FROM content_pieces WHERE id = ?", (content_id,)).fetchone()
    db.close()
    return jsonify(dict(piece))

@content_bp.route('/api/content/<int:content_id>', methods=['PATCH'])
def patch_content(content_id):
    return update_content(content_id)

@content_bp.route('/api/content/<int:content_id>', methods=['DELETE'])
def delete_content(content_id):
    db = get_db()
    db.execute("DELETE FROM content_pieces WHERE id = ?", (content_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})

@content_bp.route('/api/content/reorder', methods=['PUT'])
def reorder_content():
    data = request.json  # list of {id, sort_order}
    db = get_db()
    for item in data:
        db.execute("UPDATE content_pieces SET sort_order = ? WHERE id = ?",
                   (item['sort_order'], item['id']))
    db.commit()
    db.close()
    return jsonify({"success": True})

@content_bp.route('/api/events/<int:event_id>/content', methods=['GET'])
def list_event_content(event_id):
    db = get_db()
    rows = db.execute("""
        SELECT cp.*, c.name as campaign_name, c.phase as campaign_phase
        FROM content_pieces cp
        JOIN campaigns c ON cp.campaign_id = c.id
        WHERE c.event_id = ?
        ORDER BY c.id, cp.sort_order, cp.created_at
    """, (event_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])
