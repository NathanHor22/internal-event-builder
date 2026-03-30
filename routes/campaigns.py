from flask import Blueprint, request, jsonify
from database import get_db

campaigns_bp = Blueprint('campaigns', __name__)

@campaigns_bp.route('/api/events/<int:event_id>/campaigns', methods=['GET'])
def list_campaigns(event_id):
    db = get_db()
    rows = db.execute("""
        SELECT c.*, (SELECT COUNT(*) FROM content_pieces cp WHERE cp.campaign_id = c.id) as content_count
        FROM campaigns c WHERE c.event_id = ? ORDER BY c.created_at
    """, (event_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@campaigns_bp.route('/api/events/<int:event_id>/campaigns', methods=['POST'])
def create_campaign(event_id):
    data = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO campaigns (event_id, name, objective, phase) VALUES (?, ?, ?, ?)",
        (event_id, data.get('name', 'New Campaign'), data.get('objective'), data.get('phase'))
    )
    db.commit()
    campaign = db.execute("SELECT * FROM campaigns WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(dict(campaign)), 201

@campaigns_bp.route('/api/campaigns/<int:campaign_id>', methods=['PUT'])
def update_campaign(campaign_id):
    data = request.json
    db = get_db()
    fields = []
    values = []
    for key in ['name', 'objective', 'phase']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    if fields:
        fields.append("updated_at = NOW()")
        values.append(campaign_id)
        db.execute(f"UPDATE campaigns SET {', '.join(fields)} WHERE id = ?", values)
        db.commit()
    campaign = db.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
    db.close()
    return jsonify(dict(campaign))

@campaigns_bp.route('/api/campaigns/<int:campaign_id>', methods=['DELETE'])
def delete_campaign(campaign_id):
    db = get_db()
    db.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})
