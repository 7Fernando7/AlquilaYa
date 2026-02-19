"""
Integration tests for the complete user registration flow
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import User, EmailVerification
from app.services.auth import AuthService


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def client(test_db):
    """Create a FastAPI test client with test database"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestRegistrationFlow:
    """Integration tests for user registration flow"""

    def test_complete_registration_and_verification_flow(self, test_db: Session, client: TestClient, monkeypatch):
        """Test complete registration -> email verification flow"""
        import os
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        # Step 1: Register user
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePass123!",
                "name": "New User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["name"] == "New User"
        assert data["user_type"] == "seeker"
        user_id = data["id"]

        # Step 2: Verify user not verified yet
        user = test_db.query(User).filter(User.id == user_id).first()
        assert not user.email_verified

        # Step 3: Get verification token
        verification = test_db.query(EmailVerification).filter(
            EmailVerification.user_id == user_id
        ).first()
        assert verification is not None

        # Step 4: Verify email
        response = client.post(
            "/auth/verify-email",
            json={"verification_token": verification.verification_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert "verified successfully" in data["message"]

        # Step 5: Confirm user is verified
        test_db.refresh(user)
        assert user.email_verified
        assert user.email_verified_at is not None

    def test_registration_with_invalid_email(self, test_db: Session, client: TestClient):
        """Test registration with invalid email"""
        response = client.post(
            "/auth/register",
            json={
                "email": "invalid-email",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 422  # Validation error

    def test_registration_with_invalid_password(self, test_db: Session, client: TestClient):
        """Test registration with password not meeting requirements"""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "weak",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 400
        data = response.json()
        assert "Password must" in data["detail"]

    def test_registration_duplicate_email(self, test_db: Session, client: TestClient, monkeypatch):
        """Test registration with already-used email"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        # Register first user
        client.post(
            "/auth/register",
            json={
                "email": "existing@example.com",
                "password": "SecurePass123!",
                "name": "First User",
                "user_type": "seeker"
            }
        )

        # Try to register with same email
        response = client.post(
            "/auth/register",
            json={
                "email": "existing@example.com",
                "password": "DifferentPass123!",
                "name": "Second User",
                "user_type": "owner"
            }
        )

        assert response.status_code == 409
        data = response.json()
        assert "already registered" in data["detail"]

    def test_verify_email_with_invalid_token(self, test_db: Session, client: TestClient):
        """Test email verification with invalid token"""
        response = client.post(
            "/auth/verify-email",
            json={"verification_token": "invalid-token-xyz"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "Invalid or expired" in data["detail"]

    def test_resend_verification_email(self, test_db: Session, client: TestClient, monkeypatch):
        """Test resending verification email"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        # Register user
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )
        assert response.status_code == 201

        # Resend verification
        response = client.post(
            "/auth/resend-verification",
            json={"email": "test@example.com"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "sent" in data["message"].lower()

    def test_resend_verification_nonexistent_email(self, test_db: Session, client: TestClient):
        """Test resending verification to non-existent email"""
        response = client.post(
            "/auth/resend-verification",
            json={"email": "nonexistent@example.com"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_resend_verification_already_verified(self, test_db: Session, client: TestClient, monkeypatch):
        """Test resending verification for already-verified user"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        # Register and verify
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )
        user_id = response.json()["id"]

        # Get verification token and verify
        verification = test_db.query(EmailVerification).filter(
            EmailVerification.user_id == user_id
        ).first()

        client.post(
            "/auth/verify-email",
            json={"verification_token": verification.verification_token}
        )

        # Try to resend
        response = client.post(
            "/auth/resend-verification",
            json={"email": "test@example.com"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "already verified" in data["detail"].lower()

    def test_multiple_users_registration(self, test_db: Session, client: TestClient, monkeypatch):
        """Test registering multiple users simultaneously"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        users_data = [
            {
                "email": "user1@example.com",
                "password": "SecurePass123!",
                "name": "User 1",
                "user_type": "seeker"
            },
            {
                "email": "user2@example.com",
                "password": "SecurePass456!",
                "name": "User 2",
                "user_type": "owner"
            },
            {
                "email": "user3@example.com",
                "password": "SecurePass789!",
                "name": "User 3",
                "user_type": "seeker"
            }
        ]

        for user_data in users_data:
            response = client.post(
                "/auth/register",
                json=user_data
            )
            assert response.status_code == 201

        # Verify all users exist
        all_users = test_db.query(User).all()
        assert len(all_users) == 3
        emails = [user.email for user in all_users]
        assert "user1@example.com" in emails
        assert "user2@example.com" in emails
        assert "user3@example.com" in emails

    def test_registration_response_structure(self, test_db: Session, client: TestClient, monkeypatch):
        """Test that registration response has all required fields"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 201
        data = response.json()

        # Verify all required fields
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "user_type" in data
        assert "created_at" in data

        # Verify types
        assert isinstance(data["id"], str)
        assert isinstance(data["email"], str)
        assert isinstance(data["name"], str)
        assert isinstance(data["user_type"], str)
        assert isinstance(data["created_at"], str)

    def test_email_case_insensitivity_in_flow(self, test_db: Session, client: TestClient, monkeypatch):
        """Test that email case doesn't affect registration flow"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        response = client.post(
            "/auth/register",
            json={
                "email": "Test@EXAMPLE.COM",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"

        # Try to register with different case
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "DifferentPass123!",
                "name": "Different User",
                "user_type": "owner"
            }
        )

        assert response.status_code == 409
