import sqlite3
import config

def get_db():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS brand_voices (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            tone          TEXT,
            description   TEXT,
            sample_phrases TEXT,
            dos           TEXT,
            donts         TEXT,
            is_predefined INTEGER DEFAULT 0,
            created_at    TEXT DEFAULT (datetime('now')),
            updated_at    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS events (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL,
            description     TEXT,
            raw_file_path   TEXT,
            raw_text        TEXT,
            target_audience TEXT,
            theme           TEXT,
            goals           TEXT,
            dates           TEXT,
            location        TEXT,
            additional_info TEXT,
            brand_voice_id  INTEGER REFERENCES brand_voices(id),
            status          TEXT DEFAULT 'draft',
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            objective   TEXT,
            phase       TEXT,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS event_platforms (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            platform    TEXT NOT NULL,
            is_selected INTEGER DEFAULT 1,
            reasoning   TEXT
        );

        CREATE TABLE IF NOT EXISTS content_pieces (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id     INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
            title           TEXT NOT NULL,
            format          TEXT,
            copywriting     TEXT,
            video_script    TEXT,
            caption         TEXT,
            platform        TEXT,
            timing          TEXT,
            angle           TEXT,
            is_ad           INTEGER DEFAULT 0,
            ad_platform     TEXT,
            ad_budget       REAL,
            ad_start_date   TEXT,
            ad_end_date     TEXT,
            ad_reasoning    TEXT,
            sort_order      INTEGER DEFAULT 0,
            status          TEXT DEFAULT 'draft',
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.close()
