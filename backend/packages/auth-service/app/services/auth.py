"""
Authentication service for registration, login, and token management
"""

import logging
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import User, EmailVerification
from app.services.user import UserService
from app.services.email import get_email_service
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service"""

    @staticmethod
    def register(
        db: Session,
        email: str,
        password: str,
        name: str,
        user_type: str
    ) -> User:
        """
        Register a new user and send verification email

        Args:
            db: Database session
            email: User email
            password: Plain text password
            name: User full name
            user_type: 'seeker' or 'owner'

        Returns:
            Created user object

        Raises:
            ValueError: If registration fails
        """
        # Create user (unverified)
        user = UserService.create_user(db, email, password, name, user_type)

        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(
            hours=settings.email_verification_expire_hours
        )

        # Create verification record
        email_verification = EmailVerification(
            user_id=user.id,
            verification_token=verification_token,
            expires_at=expires_at,
        )
        db.add(email_verification)
        db.commit()

        # Send verification email
        email_service = get_email_service()
        email_sent = email_service.send_verification_email(
            email=user.email,
            token=verification_token,
            name=user.name,
        )

        if not email_sent:
            logger.warning(f"Failed to send verification email to {user.email}")
            # Don't fail registration if email fails (can be resent)

        logger.info(f"User registered: {user.id}")
        return user

    @staticmethod
    def verify_email(db: Session, verification_token: str) -> User:
        """
        Verify user email

        Args:
            db: Database session
            verification_token: Token from verification email

        Returns:
            Verified user object

        Raises:
            ValueError: If token invalid or expired
        """
        # Find verification record
        verification = db.query(EmailVerification).filter(
            EmailVerification.verification_token == verification_token
        ).first()

        if not verification:
            raise ValueError("Invalid verification token")

        if not verification.is_valid():
            raise ValueError("Verification token has expired")

        # Get user and verify email
        user = verification.user
        user.verify_email()

        # Mark verification as complete
        verification.mark_verified()

        db.commit()
        db.refresh(user)

        logger.info(f"Email verified: {user.id} ({user.email})")
        return user

    @staticmethod
    def resend_verification_email(db: Session, email: str) -> bool:
        """
        Resend verification email to user

        Args:
            db: Database session
            email: User email

        Returns:
            True if email sent successfully

        Raises:
            ValueError: If user not found or already verified
        """
        user = UserService.get_user_by_email(db, email)
        if not user:
            raise ValueError("User not found")

        if user.email_verified:
            raise ValueError("Email already verified")

        # Delete old verification tokens
        db.query(EmailVerification).filter(
            EmailVerification.user_id == user.id
        ).delete()

        # Generate new verification token
        verification_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(
            hours=settings.email_verification_expire_hours
        )

        # Create new verification record
        email_verification = EmailVerification(
            user_id=user.id,
            verification_token=verification_token,
            expires_at=expires_at,
        )
        db.add(email_verification)
        db.commit()

        # Send verification email
        email_service = get_email_service()
        email_sent = email_service.send_verification_email(
            email=user.email,
            token=verification_token,
            name=user.name,
        )

        logger.info(f"Verification email resent to: {email}")
        return email_sent
