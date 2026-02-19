"""
Session model for managing active login sessions
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Session(Base):
    """User session model (one per login)"""

    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False, unique=True, index=True)

    ip_address = Column(String(45), nullable=False)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", backref="sessions")

    def __repr__(self) -> str:
        return f"<Session(id={self.id}, user_id={self.user_id})>"

    def is_valid(self) -> bool:
        """Check if session is still valid"""
        return self.is_active and datetime.utcnow() < self.expires_at

    def invalidate(self):
        """Invalidate this session"""
        self.is_active = False
