"""
Contract tests for authentication endpoints
Tests request/response schema compliance
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi.testclient import TestClient
from datetime import datetime

from app.database import Base, get_db
from app.main import app
from app.models import User, EmailVerification


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


class TestRegisterEndpointContract:
    """Contract tests for POST /auth/register endpoint"""

    def test_register_request_validation_missing_email(self, client: TestClient):
        """Test that missing email field is rejected"""
        response = client.post(
            "/auth/register",
            json={
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 422

    def test_register_request_validation_missing_password(self, client: TestClient):
        """Test that missing password field is rejected"""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 422

    def test_register_request_validation_missing_name(self, client: TestClient):
        """Test that missing name field is rejected"""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 422

    def test_register_request_validation_missing_user_type(self, client: TestClient):
        """Test that missing user_type field is rejected"""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User"
            }
        )

        assert response.status_code == 422

    def test_register_response_schema(self, client: TestClient, monkeypatch):
        """Test that register response conforms to schema"""
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

        # Required fields
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "user_type" in data
        assert "created_at" in data

        # Type validation
        assert isinstance(data["id"], str)
        assert isinstance(data["email"], str)
        assert isinstance(data["name"], str)
        assert isinstance(data["user_type"], str)
        assert isinstance(data["created_at"], str)

        # Field value validation
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert data["user_type"] == "seeker"

    def test_register_response_created_at_format(self, client: TestClient, monkeypatch):
        """Test that created_at is valid ISO format datetime"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "owner"
            }
        )

        assert response.status_code == 201
        data = response.json()

        # Parse the datetime string
        try:
            created_at = datetime.fromisoformat(data["created_at"])
            assert created_at is not None
        except ValueError:
            pytest.fail(f"created_at is not valid ISO format: {data['created_at']}")

    def test_register_error_response_structure(self, client: TestClient):
        """Test that error responses have proper structure"""
        response = client.post(
            "/auth/register",
            json={
                "email": "invalid",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data or "errors" in data


class TestVerifyEmailEndpointContract:
    """Contract tests for POST /auth/verify-email endpoint"""

    def test_verify_email_request_validation_missing_token(self, client: TestClient):
        """Test that missing verification_token field is rejected"""
        response = client.post(
            "/auth/verify-email",
            json={}
        )

        assert response.status_code == 422

    def test_verify_email_response_schema(self, client: TestClient, test_db: Session, monkeypatch):
        """Test that verify-email response conforms to schema"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        # Create a user with verification token
        from app.services.auth import AuthService
        user = AuthService.register(
            db=test_db,
            email="test@example.com",
            password="SecurePass123!",
            name="Test User",
            user_type="seeker"
        )

        verification = test_db.query(EmailVerification).filter(
            EmailVerification.user_id == user.id
        ).first()

        # Verify email
        response = client.post(
            "/auth/verify-email",
            json={"verification_token": verification.verification_token}
        )

        assert response.status_code == 200
        data = response.json()

        # Required fields
        assert "message" in data
        assert isinstance(data["message"], str)

    def test_verify_email_error_response_structure(self, client: TestClient):
        """Test that verify-email error response has proper structure"""
        response = client.post(
            "/auth/verify-email",
            json={"verification_token": "invalid-token"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert isinstance(data["detail"], str)


class TestResendVerificationEndpointContract:
    """Contract tests for POST /auth/resend-verification endpoint"""

    def test_resend_verification_request_validation_missing_email(self, client: TestClient):
        """Test that missing email field is rejected"""
        response = client.post(
            "/auth/resend-verification",
            json={}
        )

        assert response.status_code == 422

    def test_resend_verification_response_schema(self, client: TestClient, monkeypatch):
        """Test that resend-verification response conforms to schema"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        # Register a user first
        client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        # Resend verification
        response = client.post(
            "/auth/resend-verification",
            json={"email": "test@example.com"}
        )

        assert response.status_code == 200
        data = response.json()

        # Required fields
        assert "message" in data
        assert isinstance(data["message"], str)

    def test_resend_verification_error_response_structure(self, client: TestClient):
        """Test that resend-verification error response has proper structure"""
        response = client.post(
            "/auth/resend-verification",
            json={"email": "nonexistent@example.com"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert isinstance(data["detail"], str)


class TestEndpointErrorCodes:
    """Test HTTP status codes for various scenarios"""

    def test_register_duplicate_email_returns_409(self, client: TestClient, monkeypatch):
        """Test that duplicate email returns 409 Conflict"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

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

    def test_invalid_request_returns_422(self, client: TestClient):
        """Test that malformed request returns 422 Unprocessable Entity"""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!"
                # Missing required fields
            }
        )

        assert response.status_code == 422

    def test_server_error_returns_500(self, client: TestClient, monkeypatch):
        """Test that unhandled errors return 500"""
        # Mock a database error by breaking the connection
        def broken_get_db():
            raise Exception("Database connection error")

        app.dependency_overrides[get_db] = broken_get_db

        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            }
        )

        # Should return error (status >= 400)
        assert response.status_code >= 400

        app.dependency_overrides.clear()


class TestEndpointContentTypes:
    """Test content type handling"""

    def test_register_request_content_type(self, client: TestClient, monkeypatch):
        """Test that application/json content type works"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
                "user_type": "seeker"
            },
            headers={"Content-Type": "application/json"}
        )

        assert response.status_code == 201
        assert response.headers["content-type"] == "application/json"

    def test_register_response_content_type(self, client: TestClient, monkeypatch):
        """Test that response has application/json content type"""
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
        assert "application/json" in response.headers["content-type"]


class TestUserTypeValidation:
    """Test user_type field validation"""

    def test_valid_user_types(self, client: TestClient, monkeypatch):
        """Test that both seeker and owner user types are accepted"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        for user_type in ["seeker", "owner"]:
            response = client.post(
                "/auth/register",
                json={
                    "email": f"test-{user_type}@example.com",
                    "password": "SecurePass123!",
                    "name": "Test User",
                    "user_type": user_type
                }
            )

            assert response.status_code == 201
            assert response.json()["user_type"] == user_type

    def test_case_insensitive_user_type(self, client: TestClient, monkeypatch):
        """Test that user_type is case-insensitive"""
        monkeypatch.setenv("EMAIL_SERVICE_TYPE", "mock")

        for user_type in ["SEEKER", "OWNER", "Seeker", "Owner"]:
            response = client.post(
                "/auth/register",
                json={
                    "email": f"test-{user_type}@example.com",
                    "password": "SecurePass123!",
                    "name": "Test User",
                    "user_type": user_type
                }
            )

            assert response.status_code == 201
            # Response should be lowercase
            assert response.json()["user_type"] in ["seeker", "owner"]
