# database.py
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# ---------------------------------------------------------------------------
# Detect environment
# On Vercel the filesystem is read-only except /tmp
# ---------------------------------------------------------------------------
_IS_VERCEL = bool(os.environ.get("VERCEL"))
_DB_PATH = "/tmp/agent.db" if _IS_VERCEL else "./agent.db"

SQLALCHEMY_DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Base class untuk semua model SQLAlchemy (SQLAlchemy 2.0 style)
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass
