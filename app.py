from flask import Flask, send_from_directory
import config
from database import init_db
from seed_data import seed_brand_voices

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['MAX_CONTENT_LENGTH'] = config.MAX_UPLOAD_SIZE

# Initialize database and seed data
init_db()
seed_brand_voices()

# Register route blueprints
from routes.events import events_bp
from routes.campaigns import campaigns_bp
from routes.content import content_bp
from routes.brand_voices import brand_voices_bp
from routes.ai import ai_bp
from routes.export import export_bp

app.register_blueprint(events_bp)
app.register_blueprint(campaigns_bp)
app.register_blueprint(content_bp)
app.register_blueprint(brand_voices_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(export_bp)

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
