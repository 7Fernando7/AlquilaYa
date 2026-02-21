"""
Unit tests for password reset functionality
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from unittest.mock import patch

from app.models import User, EmailVerification, PasswordReset, Base
from app.services.auth import AuthService
from app.services.email import MockEmailService
from app.utils.password import verify_password


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def create_verified_user(test_db: Session, email: str = "test@example.com"):
    """Helper to create a verified user"""
    with patch('app.services.email.get_email_service', return_value=MockEmailService()):
        user = AuthService.register(
            db=test_db,
            email=email,
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        verification = test_db.query(EmailVerification).filter(
            EmailVerification.user_id == user.id
        ).first()

        AuthService.verify_email(db=test_db, verification_token=verification.verification_token)
        return user


class TestPasswordResetRequest:
    """Tests for password reset request"""

    def test_request_password_reset_success(self, test_db: Session):
        """Test successful password reset request"""
        user = create_verified_user(test_db)

        # Mock the email service inside the request_password_reset call
        with patch('app.services.auth.get_email_service', return_value=MockEmailService()):
            result = AuthService.request_password_reset(db=test_db, email=user.email)

        assert result is True

        # Verify reset token was created
        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()
        assert reset is not None
        assert reset.reset_token is not None
        assert reset.used_at is None

    def test_request_password_reset_nonexistent_email(self, test_db: Session):
        """Test password reset request with non-existent email"""
        with pytest.raises(ValueError, match="User not found"):
            AuthService.request_password_reset(db=test_db, email="nonexistent@example.com")

    def test_request_password_reset_multiple_tokens(self, test_db: Session):
        """Test that requesting reset multiple times invalidates old tokens"""
        user = create_verified_user(test_db)

        with patch('app.services.auth.get_email_service', return_value=MockEmailService()):
            # First request
            AuthService.request_password_reset(db=test_db, email=user.email)
            first_reset = test_db.query(PasswordReset).filter(
                PasswordReset.user_id == user.id
            ).first()
            first_token = first_reset.reset_token

            # Second request
            AuthService.request_password_reset(db=test_db, email=user.email)

        # Only one reset token should exist (old one deleted)
        resets = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).all()
        assert len(resets) == 1
        assert resets[0].reset_token != first_token


class TestPasswordResetConfirmation:
    """Tests for password reset confirmation"""

    def test_confirm_password_reset_success(self, test_db: Session):
        """Test successful password reset"""
        user = create_verified_user(test_db)

        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            AuthService.request_password_reset(db=test_db, email=user.email)

        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()

        # Confirm reset
        updated_user = AuthService.confirm_password_reset(
            db=test_db,
            reset_token=reset.reset_token,
            new_password="NewSecurePass456!"
        )

        # Verify password was updated
        assert updated_user.id == user.id
        assert verify_password("NewSecurePass456!", updated_user.password_hash)

        # Verify reset token is marked as used
        reset_after = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()
        assert reset_after.used_at is not None

    def test_confirm_password_reset_invalid_token(self, test_db: Session):
        """Test password reset with invalid token"""
        with pytest.raises(ValueError, match="Invalid reset token"):
            AuthService.confirm_password_reset(
                db=test_db,
                reset_token="invalid-token",
                new_password="NewSecurePass456!"
            )

    def test_confirm_password_reset_expired_token(self, test_db: Session):
        """Test password reset with expired token"""
        user = create_verified_user(test_db)

        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            AuthService.request_password_reset(db=test_db, email=user.email)

        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()

        # Expire the token
        reset.expires_at = datetime.utcnow() - timedelta(hours=1)
        test_db.commit()

        with pytest.raises(ValueError, match="expired"):
            AuthService.confirm_password_reset(
                db=test_db,
                reset_token=reset.reset_token,
                new_password="NewSecurePass456!"
            )

    def test_confirm_password_reset_already_used(self, test_db: Session):
        """Test password reset with already-used token"""
        user = create_verified_user(test_db)

        with patch('app.services.auth.get_email_service', return_value=MockEmailService()):
            AuthService.request_password_reset(db=test_db, email=user.email)

        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()

        # Use the token
        AuthService.confirm_password_reset(
            db=test_db,
            reset_token=reset.reset_token,
            new_password="NewSecurePass456!"
        )

        # Try to use again - token is now marked as used, so is_valid() returns False
        with pytest.raises(ValueError, match="expired"):
            AuthService.confirm_password_reset(
                db=test_db,
                reset_token=reset.reset_token,
                new_password="AnotherPass789!"
            )

    def test_confirm_password_reset_invalid_password(self, test_db: Session):
        """Test password reset with invalid new password"""
        user = create_verified_user(test_db)

        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            AuthService.request_password_reset(db=test_db, email=user.email)

        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()

        # Try with invalid password (too short)
        with pytest.raises(ValueError):
            AuthService.confirm_password_reset(
                db=test_db,
                reset_token=reset.reset_token,
                new_password="short"
            )

    def test_confirm_password_reset_no_special_char(self, test_db: Session):
        """Test password reset with password missing special character"""
        user = create_verified_user(test_db)

        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            AuthService.request_password_reset(db=test_db, email=user.email)

        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()

        # Try with no special character
        with pytest.raises(ValueError):
            AuthService.confirm_password_reset(
                db=test_db,
                reset_token=reset.reset_token,
                new_password="NewSecurePass123"
            )


class TestPasswordResetFlow:
    """Integration tests for complete password reset flow"""

    def test_complete_password_reset_flow(self, test_db: Session):
        """Test complete password reset flow"""
        user = create_verified_user(test_db)
        old_password = "SecurePass123!"
        new_password = "NewSecurePass456!"

        # Step 1: Request password reset
        with patch('app.services.auth.get_email_service', return_value=MockEmailService()):
            AuthService.request_password_reset(db=test_db, email=user.email)

        # Step 2: Get reset token
        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()
        assert reset.reset_token is not None

        # Step 3: Verify old password still works
        validated = AuthService.validate_credentials(
            db=test_db,
            email=user.email,
            password=old_password
        )
        assert validated.id == user.id

        # Step 4: Confirm reset
        AuthService.confirm_password_reset(
            db=test_db,
            reset_token=reset.reset_token,
            new_password=new_password
        )

        # Step 5: Verify old password doesn't work anymore
        with pytest.raises(ValueError, match="Invalid email or password"):
            AuthService.validate_credentials(
                db=test_db,
                email=user.email,
                password=old_password
            )

        # Step 6: Verify new password works
        validated = AuthService.validate_credentials(
            db=test_db,
            email=user.email,
            password=new_password
        )
        assert validated.id == user.id

    def test_password_reset_allows_login(self, test_db: Session):
        """Test that user can login after password reset"""
        user = create_verified_user(test_db)
        new_password = "NewSecurePass456!"

        # Request and confirm password reset
        with patch('app.services.auth.get_email_service', return_value=MockEmailService()):
            AuthService.request_password_reset(db=test_db, email=user.email)

        reset = test_db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id
        ).first()

        AuthService.confirm_password_reset(
            db=test_db,
            reset_token=reset.reset_token,
            new_password=new_password
        )

        # Try to login with new password
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            token_data = AuthService.login(
                db=test_db,
                email=user.email,
                password=new_password,
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0"
            )

        assert token_data["access_token"] is not None
        assert token_data["refresh_token"] is not None
