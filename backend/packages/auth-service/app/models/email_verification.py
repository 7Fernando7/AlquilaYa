"""
Email verification token model
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base
from app.models.uuid_type import GUID


class EmailVerification(Base):
    """Email verification request model"""

    __tablename__ = "email_verifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    verification_token = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="email_verifications")

    def __repr__(self) -> str:
        return f"<EmailVerification(id={self.id}, user_id={self.user_id})>"

    def is_valid(self) -> bool:
        """Check if verification token is still valid"""
        return (
            self.verified_at is None and
            datetime.utcnow() < self.expires_at
        )

    def mark_verified(self):
        """Mark email as verified"""
        self.verified_at = datetime.utcnow()
