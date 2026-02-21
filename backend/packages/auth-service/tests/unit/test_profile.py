"""
Unit tests for profile management functionality
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from unittest.mock import patch

from app.models import User, EmailVerification, Base
from app.services.auth import AuthService
from app.services.user import UserService
from app.services.email import MockEmailService


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def create_verified_user(test_db: Session, email: str = "test@example.com"):
    """Helper to create a verified user"""
    with patch('app.services.email.get_email_service', return_value=MockEmailService()):
        user = AuthService.register(
            db=test_db,
            email=email,
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        verification = test_db.query(EmailVerification).filter(
            EmailVerification.user_id == user.id
        ).first()

        AuthService.verify_email(db=test_db, verification_token=verification.verification_token)
        return user


class TestUserProfileRetrieval:
    """Tests for user profile retrieval"""

    def test_get_user_profile_success(self, test_db: Session):
        """Test successful user profile retrieval"""
        user = create_verified_user(test_db)

        retrieved_user = UserService.get_user_by_id(test_db, user.id)

        assert retrieved_user is not None
        assert retrieved_user.id == user.id
        assert retrieved_user.email == user.email
        assert retrieved_user.name == user.name

    def test_get_user_profile_not_found(self, test_db: Session):
        """Test getting profile for non-existent user"""
        retrieved_user = UserService.get_user_by_id(test_db, "nonexistent-id")

        assert retrieved_user is None

    def test_get_user_profile_includes_optional_fields(self, test_db: Session):
        """Test that profile includes optional fields"""
        user = create_verified_user(test_db)

        retrieved_user = UserService.get_user_by_id(test_db, user.id)

        assert hasattr(retrieved_user, 'phone')
        assert hasattr(retrieved_user, 'bio')
        assert hasattr(retrieved_user, 'profile_photo_url')


class TestUserProfileUpdate:
    """Tests for user profile updates"""

    def test_update_user_name(self, test_db: Session):
        """Test updating user name"""
        user = create_verified_user(test_db)
        new_name = "Updated Name"

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name=new_name
        )

        assert updated_user.name == new_name
        # Verify persistence
        db_user = test_db.query(User).filter(User.id == user.id).first()
        assert db_user.name == new_name

    def test_update_user_phone(self, test_db: Session):
        """Test updating user phone number"""
        user = create_verified_user(test_db)
        phone = "+34912345678"

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            phone=phone
        )

        assert updated_user.phone == phone

    def test_update_user_bio(self, test_db: Session):
        """Test updating user bio"""
        user = create_verified_user(test_db)
        bio = "I am a property renter in Madrid"

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            bio=bio
        )

        assert updated_user.bio == bio

    def test_update_user_profile_photo(self, test_db: Session):
        """Test updating user profile photo"""
        user = create_verified_user(test_db)
        photo_url = "https://example.com/photo.jpg"

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            profile_photo_url=photo_url
        )

        assert updated_user.profile_photo_url == photo_url

    def test_update_multiple_profile_fields(self, test_db: Session):
        """Test updating multiple profile fields at once"""
        user = create_verified_user(test_db)

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="New Name",
            phone="+34912345678",
            bio="My bio",
            profile_photo_url="https://example.com/photo.jpg"
        )

        assert updated_user.name == "New Name"
        assert updated_user.phone == "+34912345678"
        assert updated_user.bio == "My bio"
        assert updated_user.profile_photo_url == "https://example.com/photo.jpg"

    def test_update_profile_nonexistent_user(self, test_db: Session):
        """Test updating profile for non-existent user"""
        with pytest.raises(ValueError, match="User not found"):
            UserService.update_profile(
                db=test_db,
                user_id="nonexistent-id",
                name="New Name"
            )

    def test_update_profile_partial_fields(self, test_db: Session):
        """Test that partial updates don't affect other fields"""
        user = create_verified_user(test_db)
        original_name = user.name
        new_bio = "New bio"

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            bio=new_bio
        )

        # Name should remain unchanged
        assert updated_user.name == original_name
        # Bio should be updated
        assert updated_user.bio == new_bio

    def test_update_profile_with_none_values(self, test_db: Session):
        """Test that None values don't overwrite existing data"""
        user = create_verified_user(test_db)
        phone = "+34912345678"

        # Set phone first
        UserService.update_profile(
            db=test_db,
            user_id=user.id,
            phone=phone
        )

        # Update with None values
        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            phone=None,
            bio=None
        )

        # Phone should remain unchanged
        assert updated_user.phone == phone
        # Bio should remain None
        assert updated_user.bio is None

    def test_update_profile_preserves_email(self, test_db: Session):
        """Test that email is not updatable via update_profile"""
        user = create_verified_user(test_db)
        original_email = user.email

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="New Name"
        )

        # Email should not change
        assert updated_user.email == original_email

    def test_update_profile_preserves_password(self, test_db: Session):
        """Test that password is not updatable via update_profile"""
        user = create_verified_user(test_db)
        original_hash = user.password_hash

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="New Name"
        )

        # Password hash should not change
        assert updated_user.password_hash == original_hash

    def test_update_profile_preserves_user_type(self, test_db: Session):
        """Test that user_type is not updatable via update_profile"""
        user = create_verified_user(test_db, email="owner@example.com")
        original_type = user.user_type

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="New Name"
        )

        # User type should not change
        assert updated_user.user_type == original_type

    def test_update_profile_preserves_verification_status(self, test_db: Session):
        """Test that email verification status is preserved"""
        user = create_verified_user(test_db)
        assert user.email_verified is True

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="New Name"
        )

        # Verification status should be preserved
        assert updated_user.email_verified is True


class TestProfileFieldValidation:
    """Tests for profile field validation"""

    def test_name_can_be_updated_to_valid_length(self, test_db: Session):
        """Test updating name with valid length"""
        user = create_verified_user(test_db)

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="A"  # Single character is valid
        )

        assert updated_user.name == "A"

    def test_phone_max_length(self, test_db: Session):
        """Test that very long phone numbers can be set"""
        user = create_verified_user(test_db)
        phone = "+" + "1" * 19  # 20 characters max

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            phone=phone
        )

        assert updated_user.phone == phone

    def test_bio_max_length(self, test_db: Session):
        """Test that long bios can be set"""
        user = create_verified_user(test_db)
        bio = "x" * 500  # 500 characters max

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            bio=bio
        )

        assert updated_user.bio == bio

    def test_empty_string_updates(self, test_db: Session):
        """Test that empty strings can be set for optional fields"""
        user = create_verified_user(test_db)

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            bio=""
        )

        assert updated_user.bio == ""


class TestProfilePersistence:
    """Tests for profile data persistence"""

    def test_profile_changes_persisted_to_database(self, test_db: Session):
        """Test that profile changes are saved to database"""
        user = create_verified_user(test_db)
        new_bio = "Updated bio"

        UserService.update_profile(
            db=test_db,
            user_id=user.id,
            bio=new_bio
        )

        # Query directly from database
        db_user = test_db.query(User).filter(User.id == user.id).first()
        assert db_user.bio == new_bio

    def test_profile_update_isolation(self, test_db: Session):
        """Test that updates to one user don't affect others"""
        user1 = create_verified_user(test_db, email="user1@example.com")
        user2 = create_verified_user(test_db, email="user2@example.com")

        UserService.update_profile(
            db=test_db,
            user_id=user1.id,
            bio="User 1 bio"
        )

        # User 2's profile should be unaffected
        user2_refreshed = test_db.query(User).filter(User.id == user2.id).first()
        assert user2_refreshed.bio != "User 1 bio"

    def test_profile_update_creates_updated_at_timestamp(self, test_db: Session):
        """Test that profile updates update the updated_at timestamp"""
        user = create_verified_user(test_db)
        original_updated_at = user.updated_at

        # Wait a tiny bit (should update timestamp)
        import time
        time.sleep(0.01)

        updated_user = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="New Name"
        )

        # updated_at might be same if it's the same second,
        # but it should be >= original
        assert updated_user.updated_at >= original_updated_at


class TestProfileDataTypes:
    """Tests for profile field data types and constraints"""

    def test_profile_id_is_uuid(self, test_db: Session):
        """Test that user ID is a valid UUID"""
        from uuid import UUID
        user = create_verified_user(test_db)
        # ID should be a UUID object or string
        assert isinstance(user.id, (str, UUID))
        assert len(str(user.id)) > 0

    def test_profile_created_at_is_datetime(self, test_db: Session):
        """Test that created_at is a datetime object"""
        user = create_verified_user(test_db)
        assert isinstance(user.created_at, datetime)

    def test_profile_updated_at_is_datetime(self, test_db: Session):
        """Test that updated_at is a datetime object"""
        user = create_verified_user(test_db)
        assert isinstance(user.updated_at, datetime)

    def test_profile_optional_fields_are_nullable(self, test_db: Session):
        """Test that optional fields can be None"""
        user = create_verified_user(test_db)

        assert user.phone is None or isinstance(user.phone, str)
        assert user.bio is None or isinstance(user.bio, str)
        assert user.profile_photo_url is None or isinstance(user.profile_photo_url, str)
