"""
Unit tests for AuthService
"""

import pytest
import secrets
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from unittest.mock import Mock, patch

from app.models import User, EmailVerification, Base
from app.services.auth import AuthService
from app.services.email import MockEmailService
from app.config import get_settings


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


class TestAuthServiceRegister:
    """Tests for AuthService.register"""

    def test_register_success(self, test_db: Session):
        """Test successful user registration"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            assert user.id is not None
            assert user.email == "test@example.com"
            assert user.name == "Test User"
            assert user.user_type.value == "seeker"
            assert not user.email_verified

            # Verify email verification record was created
            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()
            assert verification is not None
            assert verification.verified_at is None

    def test_register_creates_verification_token(self, test_db: Session):
        """Test that registration creates a verification token"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="owner"
            )

            verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()
            assert verification.verification_token is not None
            assert len(verification.verification_token) > 0

    def test_register_duplicate_email(self, test_db: Session):
        """Test that duplicate registration is rejected"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            with pytest.raises(ValueError, match="Email already registered"):
                AuthService.register(
                    db=test_db,
                    email="test@example.com",
                    password="DifferentPass123!",
                    name="Different User",
                    user_type="owner"
                )

    def test_register_invalid_password(self, test_db: Session):
        """Test that invalid passwords are rejected"""
        with pytest.raises(ValueError, match="Password must"):
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="weak",
                name="Test User",
                user_type="seeker"
            )


class TestAuthServiceVerifyEmail:
    """Tests for AuthService.verify_email"""

    def test_verify_email_success(self, test_db: Session):
        """Test successful email verification"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
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

            verified_user = AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            assert verified_user.email_verified
            assert verified_user.email_verified_at is not None

            # Check that verification record is marked as verified
            verification_after = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()
            assert verification_after.verified_at is not None

    def test_verify_email_invalid_token(self, test_db: Session):
        """Test that invalid token is rejected"""
        with pytest.raises(ValueError, match="Invalid verification token"):
            AuthService.verify_email(db=test_db, verification_token="invalid-token")

    def test_verify_email_expired_token(self, test_db: Session):
        """Test that expired tokens are rejected"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
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

            # Manually expire the token
            verification.expires_at = datetime.utcnow() - timedelta(hours=1)
            test_db.commit()

            with pytest.raises(ValueError, match="expired"):
                AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

    def test_verify_email_already_verified(self, test_db: Session):
        """Test that already verified emails are rejected"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
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

            # Verify once
            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            # Try to verify again
            with pytest.raises(ValueError, match="expired"):
                AuthService.verify_email(db=test_db, verification_token=verification.verification_token)


class TestAuthServiceResendVerification:
    """Tests for AuthService.resend_verification_email"""

    def test_resend_verification_success(self, test_db: Session):
        """Test successful verification email resend"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="SecurePass123!",
                name="Test User",
                user_type="seeker"
            )

            # Get original token
            original_verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).first()
            original_token = original_verification.verification_token

            # Resend
            AuthService.resend_verification_email(db=test_db, email="test@example.com")

            # New verification should be created with different token
            new_verification = test_db.query(EmailVerification).filter(
                EmailVerification.user_id == user.id
            ).order_by(EmailVerification.created_at.desc()).first()

            assert new_verification.verification_token != original_token

    def test_resend_verification_user_not_found(self, test_db: Session):
        """Test resend with non-existent email"""
        with pytest.raises(ValueError, match="not found"):
            AuthService.resend_verification_email(db=test_db, email="nonexistent@example.com")

    def test_resend_verification_already_verified(self, test_db: Session):
        """Test resend when email is already verified"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
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

            # Verify the email
            AuthService.verify_email(db=test_db, verification_token=verification.verification_token)

            with pytest.raises(ValueError, match="already verified"):
                AuthService.resend_verification_email(db=test_db, email="test@example.com")


class TestAuthServicePasswordValidation:
    """Tests for password validation in AuthService"""

    def test_valid_password_requirements(self, test_db: Session):
        """Test that valid password meets all requirements"""
        with patch('app.services.email.get_email_service', return_value=MockEmailService()):
            # This should succeed
            user = AuthService.register(
                db=test_db,
                email="test@example.com",
                password="MyPassword123!@#",
                name="Test User",
                user_type="seeker"
            )

            assert user is not None

    def test_password_too_short(self, test_db: Session):
        """Test password less than 8 characters"""
        with pytest.raises(ValueError):
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="Pass1!",
                name="Test User",
                user_type="seeker"
            )

    def test_password_uppercase_requirement(self, test_db: Session):
        """Test password without uppercase"""
        with pytest.raises(ValueError):
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="mypassword123!",
                name="Test User",
                user_type="seeker"
            )

    def test_password_lowercase_requirement(self, test_db: Session):
        """Test password without lowercase"""
        with pytest.raises(ValueError):
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="MYPASSWORD123!",
                name="Test User",
                user_type="seeker"
            )

    def test_password_digit_requirement(self, test_db: Session):
        """Test password without digit"""
        with pytest.raises(ValueError):
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="MyPassword!",
                name="Test User",
                user_type="seeker"
            )

    def test_password_special_char_requirement(self, test_db: Session):
        """Test password without special character"""
        with pytest.raises(ValueError):
            AuthService.register(
                db=test_db,
                email="test@example.com",
                password="MyPassword123",
                name="Test User",
                user_type="seeker"
            )
