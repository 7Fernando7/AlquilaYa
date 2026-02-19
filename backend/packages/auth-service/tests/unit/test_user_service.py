"""
Unit tests for UserService
"""

import pytest
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import User, Base
from app.services.user import UserService
from app.utils.password import hash_password, verify_password


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


class TestUserServiceCreate:
    """Tests for UserService.create_user"""

    def test_create_user_success(self, test_db: Session):
        """Test successful user creation"""
        user = UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.user_type.value == "seeker"
        assert not user.email_verified
        assert verify_password("SecurePass123!", user.password_hash)

    def test_create_user_email_lowercased(self, test_db: Session):
        """Test that email is lowercased on creation"""
        user = UserService.create_user(
            db=test_db,
            email="Test@EXAMPLE.COM",
            password="SecurePass123!",
            name="Test User",
            user_type="owner"
        )

        assert user.email == "test@example.com"

    def test_create_user_duplicate_email(self, test_db: Session):
        """Test that duplicate emails are rejected"""
        UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        with pytest.raises(ValueError, match="Email already registered"):
            UserService.create_user(
                db=test_db,
                email="test@example.com",
                password="DifferentPass123!",
                name="Different User",
                user_type="owner"
            )

    def test_create_user_duplicate_email_case_insensitive(self, test_db: Session):
        """Test that duplicate emails are rejected regardless of case"""
        UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        with pytest.raises(ValueError, match="Email already registered"):
            UserService.create_user(
                db=test_db,
                email="TEST@EXAMPLE.COM",
                password="DifferentPass123!",
                name="Different User",
                user_type="owner"
            )

    def test_create_user_invalid_password_short(self, test_db: Session):
        """Test that short passwords are rejected"""
        with pytest.raises(ValueError, match="at least 8 characters"):
            UserService.create_user(
                db=test_db,
                email="test@example.com",
                password="Short1!",
                name="Test User",
                user_type="seeker"
            )

    def test_create_user_invalid_password_no_uppercase(self, test_db: Session):
        """Test that passwords without uppercase are rejected"""
        with pytest.raises(ValueError, match="at least one uppercase letter"):
            UserService.create_user(
                db=test_db,
                email="test@example.com",
                password="securepass123!",
                name="Test User",
                user_type="seeker"
            )

    def test_create_user_invalid_password_no_lowercase(self, test_db: Session):
        """Test that passwords without lowercase are rejected"""
        with pytest.raises(ValueError, match="at least one lowercase letter"):
            UserService.create_user(
                db=test_db,
                email="test@example.com",
                password="SECUREPASS123!",
                name="Test User",
                user_type="seeker"
            )

    def test_create_user_invalid_password_no_digit(self, test_db: Session):
        """Test that passwords without digits are rejected"""
        with pytest.raises(ValueError, match="at least one digit"):
            UserService.create_user(
                db=test_db,
                email="test@example.com",
                password="SecurePass!",
                name="Test User",
                user_type="seeker"
            )

    def test_create_user_invalid_password_no_special_char(self, test_db: Session):
        """Test that passwords without special characters are rejected"""
        with pytest.raises(ValueError, match="at least one special character"):
            UserService.create_user(
                db=test_db,
                email="test@example.com",
                password="SecurePass123",
                name="Test User",
                user_type="seeker"
            )


class TestUserServiceGetByEmail:
    """Tests for UserService.get_by_email"""

    def test_get_user_by_email_success(self, test_db: Session):
        """Test retrieving user by email"""
        created_user = UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        user = UserService.get_user_by_email(db=test_db, email="test@example.com")
        assert user is not None
        assert user.id == created_user.id
        assert user.email == "test@example.com"

    def test_get_user_by_email_case_insensitive(self, test_db: Session):
        """Test that email lookup is case-insensitive"""
        created_user = UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        user = UserService.get_user_by_email(db=test_db, email="TEST@EXAMPLE.COM")
        assert user is not None
        assert user.id == created_user.id

    def test_get_user_by_email_not_found(self, test_db: Session):
        """Test that non-existent email returns None"""
        user = UserService.get_user_by_email(db=test_db, email="nonexistent@example.com")
        assert user is None


class TestUserServiceGetById:
    """Tests for UserService.get_by_id"""

    def test_get_user_by_id_success(self, test_db: Session):
        """Test retrieving user by ID"""
        created_user = UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        user = UserService.get_user_by_id(db=test_db, user_id=created_user.id)
        assert user is not None
        assert user.id == created_user.id
        assert user.email == "test@example.com"

    def test_get_user_by_id_not_found(self, test_db: Session):
        """Test that non-existent ID returns None"""
        import uuid
        user = UserService.get_user_by_id(db=test_db, user_id=uuid.uuid4())
        assert user is None


class TestUserServiceUpdate:
    """Tests for UserService.update_profile"""

    def test_update_user_name(self, test_db: Session):
        """Test updating user name"""
        user = UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        updated = UserService.update_profile(
            db=test_db,
            user_id=user.id,
            name="Updated Name"
        )

        assert updated.name == "Updated Name"

        # Verify in database
        retrieved = UserService.get_user_by_id(db=test_db, user_id=user.id)
        assert retrieved.name == "Updated Name"

    def test_deactivate_user(self, test_db: Session):
        """Test deactivating user account"""
        user = UserService.create_user(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        updated = UserService.deactivate_user(
            db=test_db,
            user_id=user.id
        )

        assert not updated.is_active
