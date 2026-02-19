"""
Email service for sending verification and reset emails
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EmailServiceBase(ABC):
    """Base class for email service implementations"""

    @abstractmethod
    def send_verification_email(self, email: str, token: str, name: str) -> bool:
        """Send email verification link"""
        pass

    @abstractmethod
    def send_password_reset_email(self, email: str, token: str, name: str) -> bool:
        """Send password reset link"""
        pass


class SendGridEmailService(EmailServiceBase):
    """SendGrid email service implementation"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.sendgrid_api_key
        if not self.api_key:
            logger.warning("SendGrid API key not configured")

    def send_verification_email(self, email: str, token: str, name: str) -> bool:
        """Send email verification link via SendGrid"""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            verification_link = f"https://app.formacion.ai/verify?token={token}"

            message = Mail(
                from_email=(settings.email_from, settings.email_from_name),
                to_emails=email,
                subject="Verify Your Email - FormaconIA",
                html_content=f"""
                <h2>Welcome to FormaconIA, {name}!</h2>
                <p>Please verify your email to activate your account:</p>
                <p><a href="{verification_link}">Verify Email</a></p>
                <p>Or copy this link: {verification_link}</p>
                <p>This link expires in 48 hours.</p>
                """,
            )

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            if response.status_code == 202:
                logger.info(f"Verification email sent to {email}")
                return True
            else:
                logger.error(f"Failed to send verification email: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error sending verification email: {str(e)}")
            return False

    def send_password_reset_email(self, email: str, token: str, name: str) -> bool:
        """Send password reset link via SendGrid"""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            reset_link = f"https://app.formacion.ai/reset-password?token={token}"

            message = Mail(
                from_email=(settings.email_from, settings.email_from_name),
                to_emails=email,
                subject="Reset Your Password - FormaconIA",
                html_content=f"""
                <h2>Password Reset Request</h2>
                <p>Hi {name},</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>Or copy this link: {reset_link}</p>
                <p>This link expires in 24 hours.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                """,
            )

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            if response.status_code == 202:
                logger.info(f"Password reset email sent to {email}")
                return True
            else:
                logger.error(f"Failed to send password reset email: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error sending password reset email: {str(e)}")
            return False


class MockEmailService(EmailServiceBase):
    """Mock email service for testing"""

    def __init__(self):
        self.sent_emails = []

    def send_verification_email(self, email: str, token: str, name: str) -> bool:
        """Log verification email (mock)"""
        self.sent_emails.append({
            "type": "verification",
            "email": email,
            "token": token,
            "name": name,
        })
        logger.info(f"[MOCK] Verification email to {email}: {token}")
        return True

    def send_password_reset_email(self, email: str, token: str, name: str) -> bool:
        """Log password reset email (mock)"""
        self.sent_emails.append({
            "type": "password_reset",
            "email": email,
            "token": token,
            "name": name,
        })
        logger.info(f"[MOCK] Password reset email to {email}: {token}")
        return True


def get_email_service() -> EmailServiceBase:
    """Get email service instance based on configuration"""
    if settings.app_env == "testing":
        return MockEmailService()
    elif settings.email_provider == "sendgrid":
        return SendGridEmailService()
    else:
        logger.warning(f"Unknown email provider: {settings.email_provider}, using mock")
        return MockEmailService()
