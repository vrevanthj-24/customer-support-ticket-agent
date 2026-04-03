# migrate.py
from app.database import engine

with engine.connect() as conn:
    try:
        conn.execute("ALTER TABLE tickets ADD COLUMN resolved_at TIMESTAMP NULL")
        print("✓ resolved_at added")
    except Exception as e:
        print(f"resolved_at: {e}")
    try:
        conn.execute("ALTER TABLE tickets ADD COLUMN resolution_time_minutes FLOAT NULL")
        print("✓ resolution_time_minutes added")
    except Exception as e:
        print(f"resolution_time_minutes: {e}")