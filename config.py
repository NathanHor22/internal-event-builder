import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)
DB_PATH = os.path.join(BASE_DIR, 'content_engine.db')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
EXPORT_DIR = os.path.join(BASE_DIR, 'exports')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
ANTHROPIC_MODEL = os.environ.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)
