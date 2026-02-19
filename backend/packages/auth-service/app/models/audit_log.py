"""
Audit log model for security event tracking
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, func, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class AuditEventType(str, enum.Enum):
    """Audit event types"""
    ACCOUNT_CREATED = "account_created"
    EMAIL_VERIFIED = "email_verified"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    TOKEN_REFRESH = "token_refresh"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_CONFIRMED = "password_reset_confirmed"
    LOGOUT = "logout"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"


class AuditLog(Base):
    """Audit log for security events"""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    event_type = Column(SQLEnum(AuditEventType), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=False)

    # Use JSONB for PostgreSQL, JSON for others
    try:
        details = Column(JSONB, nullable=True)
    except:
        details = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User", backref="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, event_type={self.event_type}, user_id={self.user_id})>"
