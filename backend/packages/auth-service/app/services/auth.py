"""
Authentication service for registration, login, and token management
"""

import logging
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import User, EmailVerification, Session as SessionModel
from app.services.user import UserService
from app.services.email import get_email_service
from app.utils.password import verify_password
from app.utils.jwt import create_access_token, create_refresh_token
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

    @staticmethod
    def validate_credentials(db: Session, email: str, password: str) -> User:
        """
        Validate user credentials (email and password)

        Args:
            db: Database session
            email: User email
            password: Plain text password

        Returns:
            User object if credentials valid

        Raises:
            ValueError: If email not found or password invalid
        """
        user = UserService.get_user_by_email(db, email)
        if not user:
            logger.warning(f"Login attempt with non-existent email: {email}")
            raise ValueError("Invalid email or password")

        if not user.is_active:
            logger.warning(f"Login attempt with inactive account: {email}")
            raise ValueError("Account is inactive")

        if not user.email_verified:
            logger.warning(f"Login attempt with unverified email: {email}")
            raise ValueError("Email not verified")

        # Verify password
        if not verify_password(password, user.password_hash):
            logger.warning(f"Failed login attempt (bad password): {email}")
            raise ValueError("Invalid email or password")

        logger.info(f"Credentials validated: {email}")
        return user

    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str,
        ip_address: str,
        user_agent: str
    ) -> dict:
        """
        Authenticate user and create session with JWT tokens

        Args:
            db: Database session
            email: User email
            password: Plain text password
            ip_address: IP address of login request
            user_agent: User agent of login request

        Returns:
            Dict with access_token, refresh_token, expires_in

        Raises:
            ValueError: If authentication fails
        """
        # Validate credentials
        user = AuthService.validate_credentials(db, email, password)

        # Create JWT tokens
        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        # Create session record
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)

        session = SessionModel(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.utcnow() + access_token_expires,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        logger.info(f"User logged in: {user.id} ({user.email})")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": int(access_token_expires.total_seconds()),
            "token_type": "Bearer",
        }

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> dict:
        """
        Create new access token from refresh token

        Args:
            db: Database session
            refresh_token: Refresh token from login

        Returns:
            Dict with new access_token and expires_in

        Raises:
            ValueError: If refresh token invalid or expired
        """
        # Find session by refresh token
        session = db.query(SessionModel).filter(
            SessionModel.refresh_token == refresh_token,
            SessionModel.is_active == True,
        ).first()

        if not session:
            logger.warning(f"Refresh token not found or invalid")
            raise ValueError("Invalid refresh token")

        if not session.is_valid():
            logger.warning(f"Refresh token expired: {session.user_id}")
            raise ValueError("Refresh token expired")

        # Get user
        user = session.user
        if not user or not user.is_active:
            logger.warning(f"User not found or inactive: {session.user_id}")
            raise ValueError("User not found or inactive")

        # Create new access token
        new_access_token = create_access_token(str(user.id))
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)

        # Update session with new token
        session.access_token = new_access_token
        session.expires_at = datetime.utcnow() + access_token_expires
        db.commit()

        logger.info(f"Access token refreshed: {user.id}")

        return {
            "access_token": new_access_token,
            "expires_in": int(access_token_expires.total_seconds()),
            "token_type": "Bearer",
        }
