"""
User service for user management
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import User, UserType
from app.utils.password import hash_password, validate_password

logger = logging.getLogger(__name__)


class UserService:
    """User management service"""

    @staticmethod
    def create_user(
        db: Session,
        email: str,
        password: str,
        name: str,
        user_type: str
    ) -> User:
        """
        Create a new user

        Args:
            db: Database session
            email: User email (must be unique)
            password: Plain text password
            name: User full name
            user_type: 'seeker' or 'owner'

        Returns:
            Created user object

        Raises:
            ValueError: If email already exists or password invalid
            IntegrityError: If database constraint violated
        """
        # Validate password
        is_valid, error = validate_password(password)
        if not is_valid:
            raise ValueError(error)

        # Check if email exists
        existing_user = db.query(User).filter(User.email == email.lower()).first()
        if existing_user:
            logger.warning(f"Registration attempt with existing email: {email}")
            raise ValueError("Email already registered")

        # Validate user_type
        try:
            user_type_enum = UserType(user_type.lower())
        except ValueError:
            raise ValueError(f"Invalid user_type: {user_type}. Must be 'seeker' or 'owner'")

        try:
            # Create new user
            new_user = User(
                email=email.lower(),
                password_hash=hash_password(password),
                name=name,
                user_type=user_type_enum,
                email_verified=False,
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            logger.info(f"User created: {new_user.id} ({new_user.email})")
            return new_user

        except IntegrityError as e:
            db.rollback()
            logger.error(f"Database error creating user: {str(e)}")
            raise ValueError("Failed to create user (database error)")

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        """
        Get user by email

        Args:
            db: Database session
            email: User email

        Returns:
            User object or None
        """
        return db.query(User).filter(User.email == email.lower()).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        """
        Get user by ID

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            User object or None
        """
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def update_profile(
        db: Session,
        user_id: str,
        **kwargs
    ) -> User:
        """
        Update user profile

        Args:
            db: Database session
            user_id: User UUID
            **kwargs: Fields to update (name, phone, bio, profile_photo_url)

        Returns:
            Updated user object
        """
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            raise ValueError("User not found")

        # Only allow specific fields to be updated
        allowed_fields = {'name', 'phone', 'bio', 'profile_photo_url'}
        for field in allowed_fields:
            if field in kwargs and kwargs[field] is not None:
                setattr(user, field, kwargs[field])

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def deactivate_user(db: Session, user_id: str) -> User:
        """
        Deactivate user account

        Args:
            db: Database session
            user_id: User UUID

        Returns:
            Updated user object
        """
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            raise ValueError("User not found")

        user.is_active = False
        db.commit()
        db.refresh(user)

        logger.info(f"User deactivated: {user_id}")
        return user
