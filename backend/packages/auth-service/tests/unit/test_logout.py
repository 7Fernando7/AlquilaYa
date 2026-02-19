"""
Unit tests for logout functionality
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from unittest.mock import patch

from app.models import User, EmailVerification, Session as SessionModel, Base
from app.services.auth import AuthService
from app.services.email import MockEmailService


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def create_logged_in_user(test_db: Session, email: str = "test@example.com"):
    """Helper to create a logged-in user with session"""
    with patch('app.services.email.get_email_service', return_value=MockEmailService()):
        # Register
        user = AuthService.register(
            db=test_db,
            email=email,
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        # Verify email
        verification = test_db.query(EmailVerification).filter(
            EmailVerification.user_id == user.id
        ).first()
        AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

        # Login
        token_data = AuthService.login(
            db=test_db,
            email=email,
            password="SecurePass123!",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0"
        )

        return user, token_data


class TestLogoutSuccess:
    """Tests for successful logout"""

    def test_logout_success(self, test_db: Session):
        """Test successful logout"""
        user, token_data = create_logged_in_user(test_db)
        access_token = token_data["access_token"]

        # Verify session exists and is active
        session = test_db.query(SessionModel).filter(
            SessionModel.user_id == user.id,
            SessionModel.is_active == True,
        ).first()
        assert session is not None
        assert session.is_active is True

        # Logout
        result = AuthService.logout(db=test_db, access_token=access_token)

        assert result is True

        # Verify session is now inactive
        session_after = test_db.query(SessionModel).filter(
            SessionModel.access_token == access_token
        ).first()
        assert session_after is not None
        assert session_after.is_active is False

    def test_logout_invalidates_session(self, test_db: Session):
        """Test that logout invalidates the session"""
        user, token_data = create_logged_in_user(test_db)
        access_token = token_data["access_token"]

        # Before logout, session should be valid
        session_before = test_db.query(SessionModel).filter(
            SessionModel.access_token == access_token,
            SessionModel.is_active == True,
        ).first()
        assert session_before is not None

        # Logout
        AuthService.logout(db=test_db, access_token=access_token)

        # After logout, no active session with this token should exist
        session_after = test_db.query(SessionModel).filter(
            SessionModel.access_token == access_token,
            SessionModel.is_active == True,
        ).first()
        assert session_after is None

    def test_logout_multiple_times_same_token(self, test_db: Session):
        """Test that logout fails with already-inactive token"""
        user, token_data = create_logged_in_user(test_db)
        access_token = token_data["access_token"]

        # First logout succeeds
        AuthService.logout(db=test_db, access_token=access_token)

        # Second logout with same token should fail
        with pytest.raises(ValueError, match="Invalid session"):
            AuthService.logout(db=test_db, access_token=access_token)


class TestLogoutErrors:
    """Tests for logout error handling"""

    def test_logout_invalid_token(self, test_db: Session):
        """Test logout with invalid token"""
        with pytest.raises(ValueError, match="Invalid session"):
            AuthService.logout(db=test_db, access_token="invalid-token")

    def test_logout_nonexistent_session(self, test_db: Session):
        """Test logout with token that has no session"""
        # Create a valid-looking but non-existent token
        fake_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fake.fake"

        with pytest.raises(ValueError, match="Invalid session"):
            AuthService.logout(db=test_db, access_token=fake_token)


class TestLogoutAllSessions:
    """Tests for logout from all sessions"""

    def test_logout_all_sessions_single_session(self, test_db: Session):
        """Test logout all with single session"""
        user, token_data = create_logged_in_user(test_db)

        # Should have 1 active session
        active_count = test_db.query(SessionModel).filter(
            SessionModel.user_id == user.id,
            SessionModel.is_active == True,
        ).count()
        assert active_count == 1

        # Logout all sessions
        count = AuthService.logout_all_sessions(db=test_db, user_id=str(user.id))

        assert count == 1

        # No active sessions should remain
        active_count_after = test_db.query(SessionModel).filter(
            SessionModel.user_id == user.id,
            SessionModel.is_active == True,
        ).count()
        assert active_count_after == 0

    def test_logout_all_sessions_multiple_sessions(self, test_db: Session):
        """Test logout all with multiple sessions (multiple devices)"""
        user, token_data1 = create_logged_in_user(test_db)

        # Create another session for same user (simulating login from different device)
        token_data2 = AuthService.login(
            db=test_db,
            email=user.email,
            password="SecurePass123!",
            ip_address="192.168.1.1",
            user_agent="Chrome"
        )

        # Should have 2 active sessions
        active_count = test_db.query(SessionModel).filter(
            SessionModel.user_id == user.id,
            SessionModel.is_active == True,
        ).count()
        assert active_count == 2

        # Logout all sessions
        count = AuthService.logout_all_sessions(db=test_db, user_id=str(user.id))

        assert count == 2

        # No active sessions should remain
        active_count_after = test_db.query(SessionModel).filter(
            SessionModel.user_id == user.id,
            SessionModel.is_active == True,
        ).count()
        assert active_count_after == 0

    def test_logout_all_sessions_no_active_sessions(self, test_db: Session):
        """Test logout all when no active sessions exist"""
        user, token_data = create_logged_in_user(test_db)

        # Logout the session
        AuthService.logout(db=test_db, access_token=token_data["access_token"])

        # Logout all should return 0
        count = AuthService.logout_all_sessions(db=test_db, user_id=str(user.id))

        assert count == 0

    def test_logout_all_sessions_only_invalidates_user_sessions(self, test_db: Session):
        """Test that logout all only affects the specified user"""
        user1, token1 = create_logged_in_user(test_db, email="user1@example.com")
        user2, token2 = create_logged_in_user(test_db, email="user2@example.com")

        # Both users have 1 active session
        user1_sessions = test_db.query(SessionModel).filter(
            SessionModel.user_id == user1.id,
            SessionModel.is_active == True,
        ).count()
        user2_sessions = test_db.query(SessionModel).filter(
            SessionModel.user_id == user2.id,
            SessionModel.is_active == True,
        ).count()
        assert user1_sessions == 1
        assert user2_sessions == 1

        # Logout all for user1
        AuthService.logout_all_sessions(db=test_db, user_id=str(user1.id))

        # User1 should have no active sessions
        user1_after = test_db.query(SessionModel).filter(
            SessionModel.user_id == user1.id,
            SessionModel.is_active == True,
        ).count()
        assert user1_after == 0

        # User2 should still have active session
        user2_after = test_db.query(SessionModel).filter(
            SessionModel.user_id == user2.id,
            SessionModel.is_active == True,
        ).count()
        assert user2_after == 1


class TestSessionAfterLogout:
    """Tests for session behavior after logout"""

    def test_session_marked_inactive_after_logout(self, test_db: Session):
        """Test that session.is_active is False after logout"""
        user, token_data = create_logged_in_user(test_db)
        access_token = token_data["access_token"]

        # Get session before logout
        session_before = test_db.query(SessionModel).filter(
            SessionModel.access_token == access_token
        ).first()
        original_created_at = session_before.created_at

        # Logout
        AuthService.logout(db=test_db, access_token=access_token)

        # Get session after logout
        session_after = test_db.query(SessionModel).filter(
            SessionModel.access_token == access_token
        ).first()

        # Verify is_active is False
        assert session_after.is_active is False

        # created_at should not change
        assert session_after.created_at == original_created_at

    def test_logout_preserves_session_metadata(self, test_db: Session):
        """Test that logout preserves other session metadata"""
        user, token_data = create_logged_in_user(test_db)
        access_token = token_data["access_token"]

        # Get session before logout
        session_before = test_db.query(SessionModel).filter(
            SessionModel.access_token == access_token
        ).first()
        original_ip = session_before.ip_address
        original_user_agent = session_before.user_agent

        # Logout
        AuthService.logout(db=test_db, access_token=access_token)

        # Get session after logout
        session_after = test_db.query(SessionModel).filter(
            SessionModel.access_token == access_token
        ).first()

        # Metadata should be preserved
        assert session_after.ip_address == original_ip
        assert session_after.user_agent == original_user_agent


class TestMultipleLogouts:
    """Tests for handling multiple logout scenarios"""

    def test_logout_one_of_multiple_sessions(self, test_db: Session):
        """Test that logout only invalidates the specified session"""
        user, token_data1 = create_logged_in_user(test_db)

        # Create another session
        token_data2 = AuthService.login(
            db=test_db,
            email=user.email,
            password="SecurePass123!",
            ip_address="192.168.1.1",
            user_agent="Firefox"
        )

        # Logout first session only
        AuthService.logout(db=test_db, access_token=token_data1["access_token"])

        # First session should be inactive
        session1 = test_db.query(SessionModel).filter(
            SessionModel.access_token == token_data1["access_token"]
        ).first()
        assert session1.is_active is False

        # Second session should still be active
        session2 = test_db.query(SessionModel).filter(
            SessionModel.access_token == token_data2["access_token"]
        ).first()
        assert session2.is_active is True
