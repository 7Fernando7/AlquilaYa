"""
Password reset token model
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class PasswordReset(Base):
    """Password reset request model"""

    __tablename__ = "password_resets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    reset_token = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="password_resets")

    def __repr__(self) -> str:
        return f"<PasswordReset(id={self.id}, user_id={self.user_id})>"

    def is_valid(self) -> bool:
        """Check if reset token is still valid"""
        return (
            self.used_at is None and
            datetime.utcnow() < self.expires_at
        )

    def mark_used(self):
        """Mark reset as used"""
        self.used_at = datetime.utcnow()
