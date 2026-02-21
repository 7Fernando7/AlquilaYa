"""
Pytest fixtures and configuration for Auth Service tests
"""

import os
from typing import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Test database configuration
TEST_DATABASE_URL = "sqlite:///./test.db"


@pytest.fixture(scope="session")
def test_db_engine():
    """Create test database engine"""
    engine = create_engine(
        TEST_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    yield engine
    # Cleanup
    if os.path.exists("test.db"):
        os.remove("test.db")


@pytest.fixture
def db_session(test_db_engine) -> Generator[Session, None, None]:
    """Provide a database session for tests"""
    # Import here to avoid circular imports
    from app.database import Base

    Base.metadata.create_all(bind=test_db_engine)
    SessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_db_engine
    )
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_db_engine)


@pytest.fixture
def mock_email_service(monkeypatch):
    """Mock email service for tests"""

    class MockEmailService:
        def __init__(self):
            self.sent_emails = []

        def send_verification_email(self, email: str, token: str) -> bool:
            self.sent_emails.append({"email": email, "token": token, "type": "verification"})
            return True

        def send_password_reset_email(self, email: str, token: str) -> bool:
            self.sent_emails.append({"email": email, "token": token, "type": "reset"})
            return True

    return MockEmailService()


@pytest.fixture
def mock_redis(monkeypatch):
    """Mock Redis client for tests"""

    class MockRedis:
        def __init__(self):
            self.data = {}

        def get(self, key: str):
            return self.data.get(key)

        def set(self, key: str, value, ex=None):
            self.data[key] = value

        def delete(self, key: str):
            if key in self.data:
                del self.data[key]

        def incr(self, key: str):
            if key not in self.data:
                self.data[key] = 0
            self.data[key] += 1
            return self.data[key]

        def expire(self, key: str, time: int):
            pass

    return MockRedis()
