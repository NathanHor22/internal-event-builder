import json
from flask import Blueprint, request, jsonify
from database import get_db

brand_voices_bp = Blueprint('brand_voices', __name__)

@brand_voices_bp.route('/api/brand-voices', methods=['GET'])
def list_voices():
    db = get_db()
    rows = db.execute("SELECT * FROM brand_voices ORDER BY is_predefined DESC, name").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@brand_voices_bp.route('/api/brand-voices', methods=['POST'])
def create_voice():
    data = request.json
    db = get_db()
    cur = db.execute(
        """INSERT INTO brand_voices (name, tone, description, sample_phrases, dos, donts, is_predefined)
           VALUES (?, ?, ?, ?, ?, ?, 0)""",
        (data.get('name', 'Custom Voice'), data.get('tone'), data.get('description'),
         json.dumps(data.get('sample_phrases', [])),
         json.dumps(data.get('dos', [])),
         json.dumps(data.get('donts', [])))
    )
    db.commit()
    voice = db.execute("SELECT * FROM brand_voices WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(dict(voice)), 201

@brand_voices_bp.route('/api/brand-voices/<int:voice_id>', methods=['PUT'])
def update_voice(voice_id):
    data = request.json
    db = get_db()
    fields = []
    values = []
    for key in ['name', 'tone', 'description']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    for key in ['sample_phrases', 'dos', 'donts']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(json.dumps(data[key]) if isinstance(data[key], list) else data[key])
    if fields:
        fields.append("updated_at = NOW()")
        values.append(voice_id)
        db.execute(f"UPDATE brand_voices SET {', '.join(fields)} WHERE id = ?", values)
        db.commit()
    voice = db.execute("SELECT * FROM brand_voices WHERE id = ?", (voice_id,)).fetchone()
    db.close()
    return jsonify(dict(voice))

@brand_voices_bp.route('/api/brand-voices/<int:voice_id>', methods=['DELETE'])
def delete_voice(voice_id):
    db = get_db()
    voice = db.execute("SELECT is_predefined FROM brand_voices WHERE id = ?", (voice_id,)).fetchone()
    if voice and voice['is_predefined']:
        db.close()
        return jsonify({"error": "Cannot delete predefined brand voices"}), 400
    db.execute("DELETE FROM brand_voices WHERE id = ?", (voice_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})
