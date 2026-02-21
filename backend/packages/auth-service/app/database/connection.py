"""
Database connection and session management
"""

from sqlalchemy import create_engine, pool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base

from app.config import get_settings

settings = get_settings()

# Create database engine with connection pooling
# SQLite doesn't support pool_size and max_overflow, so we need to handle it specially
engine_kwargs = {
    "echo": settings.debug,
}

if settings.database_url.startswith("sqlite"):
    # SQLite uses NullPool by default and doesn't support pool_size/max_overflow
    engine = create_engine(settings.database_url, **engine_kwargs)
else:
    # PostgreSQL and other databases support pooling
    engine = create_engine(
        settings.database_url,
        poolclass=pool.NullPool if settings.app_env == "testing" else pool.QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Verify connections before using them
        **engine_kwargs,
    )

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Session:
    """
    Dependency injection for database session

    Usage in FastAPI:
        async def some_endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create all tables on app startup
def init_db():
    """Initialize database (create all tables)"""
    from app.database import Base
    Base.metadata.create_all(bind=engine)


# Drop all tables
def drop_db():
    """Drop all tables (for testing)"""
    from app.database import Base
    Base.metadata.drop_all(bind=engine)
