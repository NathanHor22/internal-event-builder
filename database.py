import psycopg2
import psycopg2.extras
from contextlib import contextmanager
import config


class _CursorWrapper:
    """Makes a psycopg2 cursor behave like sqlite3's execute() return value."""

    def __init__(self, cursor, last_id=None):
        self._cursor = cursor
        self._last_id = last_id

    def fetchall(self):
        return self._cursor.fetchall()

    def fetchone(self):
        return self._cursor.fetchone()

    @property
    def lastrowid(self):
        return self._last_id


class _ConnectionWrapper:
    """Wraps a psycopg2 connection to match the sqlite3 interface used across this codebase."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=None):
        # Translate SQLite-style ? placeholders to psycopg2-style %s
        pg_sql = sql.replace('?', '%s')
        is_insert = pg_sql.strip().upper().startswith('INSERT')
        if is_insert and 'RETURNING' not in pg_sql.upper():
            pg_sql = pg_sql.rstrip().rstrip(';') + ' RETURNING id'
        cursor = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(pg_sql, params or ())
        last_id = None
        if is_insert:
            row = cursor.fetchone()
            last_id = row['id'] if row else None
        return _CursorWrapper(cursor, last_id)

    def executescript(self, script):
        """Execute multiple semicolon-separated SQL statements (DDL use only)."""
        cursor = self._conn.cursor()
        for stmt in script.split(';'):
            stmt = stmt.strip()
            if stmt:
                cursor.execute(stmt)
        cursor.close()
        self._conn.commit()

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


def get_db():
    """Return an open database connection wrapper. Caller is responsible for closing."""
    conn = psycopg2.connect(config.DATABASE_URL)
    return _ConnectionWrapper(conn)


@contextmanager
def db_connection():
    """Context manager that yields a connection and guarantees it is closed."""
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    with db_connection() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS brand_voices (
            id             SERIAL PRIMARY KEY,
            name           TEXT NOT NULL,
            tone           TEXT,
            description    TEXT,
            sample_phrases TEXT,
            dos            TEXT,
            donts          TEXT,
            is_predefined  INTEGER DEFAULT 0,
            created_at     TIMESTAMPTZ DEFAULT NOW(),
            updated_at     TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS events (
            id              SERIAL PRIMARY KEY,
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
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id          SERIAL PRIMARY KEY,
            event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            objective   TEXT,
            phase       TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW(),
            updated_at  TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS event_platforms (
            id          SERIAL PRIMARY KEY,
            event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            platform    TEXT NOT NULL,
            is_selected INTEGER DEFAULT 1,
            reasoning   TEXT
        );

        CREATE TABLE IF NOT EXISTS content_pieces (
            id              SERIAL PRIMARY KEY,
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
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )
    """)
