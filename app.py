import os
from flask import Flask, render_template, jsonify, request
import config
from database import init_db
from seed_data import seed_brand_voices
from extensions import limiter


def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_UPLOAD_SIZE

    limiter.init_app(app)

    config.init_directories()
    init_db()
    seed_brand_voices()

    from routes.events import events_bp
    from routes.campaigns import campaigns_bp
    from routes.content import content_bp
    from routes.brand_voices import brand_voices_bp
    from routes.ai import ai_bp
    from routes.export import export_bp
    from routes.slides import slides_bp

    for bp in (events_bp, campaigns_bp, content_bp, brand_voices_bp, ai_bp, export_bp, slides_bp):
        app.register_blueprint(bp)

    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        # Only set HSTS when actually on HTTPS
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    @app.errorhandler(429)
    def rate_limit_handler(e):
        return jsonify({
            "error": "Rate limit exceeded. Please slow down.",
            "retry_after": e.description
        }), 429

    @app.route('/')
    def index():
        return render_template('index.html')

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG') == '1', port=5000)
