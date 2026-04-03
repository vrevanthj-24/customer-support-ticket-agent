from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings
import os

# Use the effective database URL
DATABASE_URL = settings.effective_database_url

# Remove ssl-mode from URL for pymysql compatibility
if "tidbcloud.com" in DATABASE_URL:
    # Remove ssl-mode parameter
    DATABASE_URL = DATABASE_URL.replace("?ssl-mode=VERIFY_IDENTITY", "")
    DATABASE_URL = DATABASE_URL.replace("&ssl-mode=VERIFY_IDENTITY", "")

print(f"Connecting to TiDB Cloud...")

# Create engine with SSL configuration for pymysql
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
    connect_args={
        "ssl": {"ssl-mode": "VERIFY_IDENTITY"}
    } if "tidbcloud.com" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()