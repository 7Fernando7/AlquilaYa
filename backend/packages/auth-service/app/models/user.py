"""
User model for authentication and profile management
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, func
from datetime import datetime
import uuid
import enum

from app.database import Base
from app.models.uuid_type import GUID


class UserType(str, enum.Enum):
    """User type enumeration"""
    SEEKER = "seeker"  # Renter looking for properties
    OWNER = "owner"    # Property owner/landlord


class User(Base):
    """User account model"""

    __tablename__ = "users"

    # Primary key
    id = Column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # Authentication fields
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash = Column(String(255), nullable=False)

    # Profile fields
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    bio = Column(String(500), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)

    # User type
    user_type = Column(
        SQLEnum(UserType),
        nullable=False,
        index=True,
    )

    # Status fields
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, user_type={self.user_type})>"

    def verify_email(self):
        """Mark email as verified"""
        self.email_verified = True
        self.email_verified_at = datetime.utcnow()

    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login_at = datetime.utcnow()

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.name,
            "phone": self.phone,
            "bio": self.bio,
            "profile_photo_url": self.profile_photo_url,
            "user_type": self.user_type.value,
            "email_verified": self.email_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
