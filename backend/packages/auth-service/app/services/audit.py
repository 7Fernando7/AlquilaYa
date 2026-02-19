"""
Audit logging service for security events
"""

import logging
import json
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.models import AuditLog
from app.models.audit_log import AuditEventType

logger = logging.getLogger(__name__)


class AuditService:
    """Service for audit logging security events"""

    @staticmethod
    def log_event(
        db: Session,
        event_type: AuditEventType,
        user_id: Optional[str] = None,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Log a security event

        Args:
            db: Database session
            event_type: Type of event (from AuditEventType enum)
            user_id: User ID (optional, None for unauthenticated events)
            ip_address: IP address of the request
            user_agent: User agent string
            details: Additional details (JSON-serializable dict)

        Returns:
            Created AuditLog object

        Raises:
            ValueError: If event type invalid or database error
        """
        try:
            from uuid import UUID

            # Convert user_id to UUID if provided
            user_id_uuid = None
            if user_id:
                try:
                    if isinstance(user_id, str):
                        user_id_uuid = UUID(user_id)
                    else:
                        user_id_uuid = user_id
                except (ValueError, AttributeError):
                    logger.warning(f"Invalid user_id format: {user_id}")

            # Create audit log entry
            audit_log = AuditLog(
                user_id=user_id_uuid,
                event_type=event_type,
                ip_address=ip_address,
                user_agent=user_agent,
                details=details,
            )

            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)

            logger.info(
                f"Audit event logged: {event_type.value} "
                f"(user_id={user_id}, ip={ip_address})"
            )

            return audit_log

        except Exception as e:
            logger.error(f"Failed to log audit event: {str(e)}")
            # Don't raise - audit logging should not break the main flow
            return None

    @staticmethod
    def log_account_created(
        db: Session,
        user_id: str,
        email: str,
        user_type: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> AuditLog:
        """Log account creation event"""
        details = {
            "email": email,
            "user_type": user_type,
        }
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.ACCOUNT_CREATED,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )

    @staticmethod
    def log_email_verified(
        db: Session,
        user_id: str,
        email: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> AuditLog:
        """Log email verification event"""
        details = {
            "email": email,
        }
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.EMAIL_VERIFIED,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )

    @staticmethod
    def log_login_success(
        db: Session,
        user_id: str,
        email: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> AuditLog:
        """Log successful login event"""
        details = {
            "email": email,
        }
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.LOGIN_SUCCESS,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )

    @staticmethod
    def log_login_failure(
        db: Session,
        email: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
        reason: str = "invalid_credentials",
    ) -> AuditLog:
        """Log failed login attempt"""
        details = {
            "email": email,
            "reason": reason,
        }
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.LOGIN_FAILURE,
            user_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )

    @staticmethod
    def log_token_refresh(
        db: Session,
        user_id: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> AuditLog:
        """Log token refresh event"""
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.TOKEN_REFRESH,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={},
        )

    @staticmethod
    def log_password_reset_requested(
        db: Session,
        email: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> AuditLog:
        """Log password reset request event"""
        details = {
            "email": email,
        }
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.PASSWORD_RESET_REQUESTED,
            user_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )

    @staticmethod
    def log_password_reset_confirmed(
        db: Session,
        user_id: str,
        email: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> AuditLog:
        """Log password reset confirmation event"""
        details = {
            "email": email,
        }
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.PASSWORD_RESET_CONFIRMED,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )

    @staticmethod
    def log_logout(
        db: Session,
        user_id: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> AuditLog:
        """Log logout event"""
        return AuditService.log_event(
            db=db,
            event_type=AuditEventType.LOGOUT,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={},
        )
