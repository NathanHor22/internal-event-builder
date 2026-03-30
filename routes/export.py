import os
from flask import Blueprint, send_file, jsonify
from services.export_service import export_csv, export_excel, export_pdf

export_bp = Blueprint('export', __name__)

@export_bp.route('/api/export/<int:event_id>/csv')
def download_csv(event_id):
    data = export_csv(event_id)
    if not data:
        return jsonify({"error": "Event not found or no content"}), 404
    from io import BytesIO
    buf = BytesIO(data.encode('utf-8'))
    buf.seek(0)
    return send_file(buf, mimetype='text/csv', as_attachment=True,
                     download_name=f'event_{event_id}_content.csv')

@export_bp.route('/api/export/<int:event_id>/excel')
def download_excel(event_id):
    filepath = export_excel(event_id)
    if not filepath:
        return jsonify({"error": "Event not found or no content"}), 404
    return send_file(filepath, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name=f'event_{event_id}_content.xlsx')

@export_bp.route('/api/export/<int:event_id>/pdf')
def download_pdf(event_id):
    filepath = export_pdf(event_id)
    if not filepath:
        return jsonify({"error": "Event not found or no content"}), 404
    return send_file(filepath, mimetype='application/pdf',
                     as_attachment=True, download_name=f'event_{event_id}_content_plan.pdf')
