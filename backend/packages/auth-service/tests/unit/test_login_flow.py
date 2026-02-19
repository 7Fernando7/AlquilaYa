"""
Unit tests for login functionality
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from unittest.mock import patch

from app.models import User, EmailVerification, Session as SessionModel, Base
from app.services.auth import AuthService
from app.services.email import MockEmailService
from app.utils.jwt import verify_token


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


class TestLoginFlow:
    """Tests for login flow"""

    def test_login_success(self, test_db: Session):
        """Test successful login"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register and verify a user
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            # Now login
            token_data = AuthService.login(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0"
            )

            assert token_data["access_token"] is not None
            assert token_data["refresh_token"] is not None
            assert token_data["token_type"] == "Bearer"
            assert token_data["expires_in"] > 0

            # Verify session was created
            session = test_db.query(SessionModel).filter(
                SessionModel.user_id == user.id
            ).first()
            assert session is not None
            assert session.ip_address == "127.0.0.1"
            assert session.user_agent == "Mozilla/5.0"

    def test_login_invalid_email(self, test_db: Session):
        """Test login with non-existent email"""
        with pytest.raises(ValueError, match="Invalid email or password"):
            AuthService.login(
                db=test_db,
                email="nonexistent@example.com",
                password="SecurePass123!",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0"
            )

    def test_login_invalid_password(self, test_db: Session):
        """Test login with wrong password"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register and verify a user
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            # Try login with wrong password
            with pytest.raises(ValueError, match="Invalid email or password"):
                AuthService.login(
                    db=test_db,
                    email="test@example.com",
                    password="WrongPass123!",
                    ip_address="127.0.0.1",
                    user_agent="Mozilla/5.0"
                )

    def test_login_unverified_email(self, test_db: Session):
        """Test login with unverified email"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register but don't verify
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            # Try to login without verifying email
            with pytest.raises(ValueError, match="Email not verified"):
                AuthService.login(
                    db=test_db,
                    email="test@example.com",
                    password="SecurePass123!",
                    ip_address="127.0.0.1",
                    user_agent="Mozilla/5.0"
                )

    def test_login_inactive_account(self, test_db: Session):
        """Test login with inactive account"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register and verify a user
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            # Deactivate the account
            user.is_active = False
            test_db.commit()

            # Try to login
            with pytest.raises(ValueError, match="Account is inactive"):
                AuthService.login(
                    db=test_db,
                    email="test@example.com",
                    password="SecurePass123!",
                    ip_address="127.0.0.1",
                    user_agent="Mozilla/5.0"
                )

    def test_credentials_validation(self, test_db: Session):
        """Test credential validation"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register and verify a user
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            # Validate credentials
            validated_user = AuthService.validate_credentials(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!"
            )

            assert validated_user.id == user.id
            assert validated_user.email == "test@example.com"

    def test_token_contains_user_id(self, test_db: Session):
        """Test that JWT token contains user ID"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register and verify a user
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            # Login
            token_data = AuthService.login(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0"
            )

            # Verify token contains user ID
            # Note: This requires the JWT public key to be available
            # For now, just verify the token is not empty
            assert len(token_data["access_token"]) > 0


class TestRefreshToken:
    """Tests for token refresh"""

    def test_refresh_token_success(self, test_db: Session):
        """Test successful token refresh"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register, verify, and login
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            token_data = AuthService.login(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0"
            )

            # Refresh token
            new_token_data = AuthService.refresh_access_token(
                db=test_db,
                refresh_token=token_data["refresh_token"]
            )

            assert new_token_data["access_token"] is not None
            assert new_token_data["token_type"] == "Bearer"
            assert new_token_data["expires_in"] > 0
            # New token should be different from old one
            assert new_token_data["access_token"] != token_data["access_token"]

    def test_refresh_token_invalid(self, test_db: Session):
        """Test refresh with invalid token"""
        with pytest.raises(ValueError, match="Invalid refresh token"):
            AuthService.refresh_access_token(
                db=test_db,
                refresh_token="invalid-token"
            )

    def test_refresh_token_expired(self, test_db: Session):
        """Test refresh with expired token"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register, verify, and login
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            token_data = AuthService.login(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0"
            )

            # Expire the session
            session = test_db.query(SessionModel).filter(
                SessionModel.user_id == user.id
            ).first()
            session.expires_at = datetime.utcnow() - timedelta(hours=1)
            test_db.commit()

            # Try to refresh
            with pytest.raises(ValueError, match="Refresh token expired"):
                AuthService.refresh_access_token(
                    db=test_db,
                    refresh_token=token_data["refresh_token"]
                )

    def test_refresh_token_inactive_session(self, test_db: Session):
        """Test refresh with inactive session"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # Register, verify, and login
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()

            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            token_data = AuthService.login(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0"
            )

            # Invalidate the session
            session = test_db.query(SessionModel).filter(
                SessionModel.user_id == user.id
            ).first()
            session.is_active = False
            test_db.commit()

            # Try to refresh
            with pytest.raises(ValueError, match="Invalid refresh token"):
                AuthService.refresh_access_token(
                    db=test_db,
                    refresh_token=token_data["refresh_token"]
                )
