"""
Unit tests for audit logging functionality
"""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models import AuditLog, AuditEventType, Base
from app.services.audit import AuditService


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


class TestAuditServiceEventLogging:
    """Tests for audit service event logging"""

    def test_log_account_created(self, test_db: Session):
        """Test logging account creation event"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"
        email = "test@example.com"

        audit_log = AuditService.log_account_created(
            db=test_db,
            user_id=user_id,
            email=email,
            user_type="seeker",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        assert audit_log is not None
        assert audit_log.event_type == AuditEventType.ACCOUNT_CREATED
        assert str(audit_log.user_id) == user_id
        assert audit_log.details["email"] == email
        assert audit_log.details["user_type"] == "seeker"

    def test_log_email_verified(self, test_db: Session):
        """Test logging email verification event"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        audit_log = AuditService.log_email_verified(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        assert audit_log.event_type == AuditEventType.EMAIL_VERIFIED
        assert str(audit_log.user_id) == user_id

    def test_log_login_success(self, test_db: Session):
        """Test logging successful login"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        audit_log = AuditService.log_login_success(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
            ip_address="192.168.1.1",
            user_agent="Chrome",
        )

        assert audit_log.event_type == AuditEventType.LOGIN_SUCCESS
        assert str(audit_log.user_id) == user_id
        assert audit_log.ip_address == "192.168.1.1"

    def test_log_login_failure(self, test_db: Session):
        """Test logging failed login attempt"""
        audit_log = AuditService.log_login_failure(
            db=test_db,
            email="test@example.com",
            ip_address="203.0.113.1",
            user_agent="Firefox",
            reason="invalid_password",
        )

        assert audit_log.event_type == AuditEventType.LOGIN_FAILURE
        assert audit_log.user_id is None  # No user for failed login
        assert audit_log.details["email"] == "test@example.com"
        assert audit_log.details["reason"] == "invalid_password"

    def test_log_token_refresh(self, test_db: Session):
        """Test logging token refresh event"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        audit_log = AuditService.log_token_refresh(
            db=test_db,
            user_id=user_id,
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        assert audit_log.event_type == AuditEventType.TOKEN_REFRESH
        assert str(audit_log.user_id) == user_id

    def test_log_password_reset_requested(self, test_db: Session):
        """Test logging password reset request"""
        audit_log = AuditService.log_password_reset_requested(
            db=test_db,
            email="test@example.com",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        assert audit_log.event_type == AuditEventType.PASSWORD_RESET_REQUESTED
        assert audit_log.user_id is None  # No user for reset request
        assert audit_log.details["email"] == "test@example.com"

    def test_log_password_reset_confirmed(self, test_db: Session):
        """Test logging password reset confirmation"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        audit_log = AuditService.log_password_reset_confirmed(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        assert audit_log.event_type == AuditEventType.PASSWORD_RESET_CONFIRMED
        assert str(audit_log.user_id) == user_id

    def test_log_logout(self, test_db: Session):
        """Test logging logout event"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        audit_log = AuditService.log_logout(
            db=test_db,
            user_id=user_id,
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        assert audit_log.event_type == AuditEventType.LOGOUT
        assert str(audit_log.user_id) == user_id


class TestAuditEventTypes:
    """Tests for audit event type enum"""

    def test_audit_event_type_values(self, test_db: Session):
        """Test that all audit event types are available"""
        assert AuditEventType.ACCOUNT_CREATED.value == "account_created"
        assert AuditEventType.EMAIL_VERIFIED.value == "email_verified"
        assert AuditEventType.LOGIN_SUCCESS.value == "login_success"
        assert AuditEventType.LOGIN_FAILURE.value == "login_failure"
        assert AuditEventType.TOKEN_REFRESH.value == "token_refresh"
        assert AuditEventType.PASSWORD_RESET_REQUESTED.value == "password_reset_requested"
        assert AuditEventType.PASSWORD_RESET_CONFIRMED.value == "password_reset_confirmed"
        assert AuditEventType.LOGOUT.value == "logout"


class TestAuditLogPersistence:
    """Tests for audit log persistence"""

    def test_audit_log_persisted_to_database(self, test_db: Session):
        """Test that audit logs are persisted to database"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        audit_log = AuditService.log_login_success(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        # Query directly from database
        db_log = test_db.query(AuditLog).filter(
            AuditLog.id == audit_log.id
        ).first()

        assert db_log is not None
        assert db_log.event_type == AuditEventType.LOGIN_SUCCESS

    def test_multiple_audit_logs_created(self, test_db: Session):
        """Test that multiple audit logs can be created"""
        user_id1 = "550e8400-e29b-41d4-a716-446655440000"
        user_id2 = "660e8400-e29b-41d4-a716-446655440001"

        AuditService.log_login_success(
            db=test_db,
            user_id=user_id1,
            email="user1@example.com",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        AuditService.log_login_success(
            db=test_db,
            user_id=user_id2,
            email="user2@example.com",
            ip_address="192.168.1.1",
            user_agent="Chrome",
        )

        # Query all logs
        all_logs = test_db.query(AuditLog).all()
        assert len(all_logs) == 2

    def test_audit_log_created_at_timestamp(self, test_db: Session):
        """Test that audit logs have creation timestamp"""
        audit_log = AuditService.log_account_created(
            db=test_db,
            user_id="550e8400-e29b-41d4-a716-446655440000",
            email="test@example.com",
            user_type="seeker",
        )

        assert audit_log.created_at is not None
        assert isinstance(audit_log.created_at, datetime)


class TestAuditLogDetails:
    """Tests for audit log details"""

    def test_audit_log_with_empty_details(self, test_db: Session):
        """Test that audit logs can have empty details"""
        audit_log = AuditService.log_token_refresh(
            db=test_db,
            user_id="550e8400-e29b-41d4-a716-446655440000",
        )

        assert audit_log.details is not None
        assert isinstance(audit_log.details, dict)
        assert len(audit_log.details) == 0

    def test_audit_log_with_custom_details(self, test_db: Session):
        """Test logging with custom details"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"
        custom_details = {
            "email": "test@example.com",
            "user_type": "owner",
            "custom_field": "custom_value",
        }

        audit_log = AuditService.log_event(
            db=test_db,
            event_type=AuditEventType.ACCOUNT_CREATED,
            user_id=user_id,
            details=custom_details,
        )

        assert audit_log.details == custom_details


class TestAuditLogMetadata:
    """Tests for audit log metadata"""

    def test_audit_log_ip_address(self, test_db: Session):
        """Test that audit logs store IP address"""
        ip = "203.0.113.42"

        audit_log = AuditService.log_login_success(
            db=test_db,
            user_id="550e8400-e29b-41d4-a716-446655440000",
            email="test@example.com",
            ip_address=ip,
            user_agent="Mozilla/5.0",
        )

        assert audit_log.ip_address == ip

    def test_audit_log_user_agent(self, test_db: Session):
        """Test that audit logs store user agent"""
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

        audit_log = AuditService.log_login_success(
            db=test_db,
            user_id="550e8400-e29b-41d4-a716-446655440000",
            email="test@example.com",
            ip_address="127.0.0.1",
            user_agent=user_agent,
        )

        assert audit_log.user_agent == user_agent

    def test_audit_log_default_ip_address(self, test_db: Session):
        """Test that audit logs use default IP if not provided"""
        audit_log = AuditService.log_login_success(
            db=test_db,
            user_id="550e8400-e29b-41d4-a716-446655440000",
            email="test@example.com",
        )

        assert audit_log.ip_address == "unknown"

    def test_audit_log_default_user_agent(self, test_db: Session):
        """Test that audit logs use default user agent if not provided"""
        audit_log = AuditService.log_login_success(
            db=test_db,
            user_id="550e8400-e29b-41d4-a716-446655440000",
            email="test@example.com",
        )

        assert audit_log.user_agent == "unknown"


class TestAuditLogQueryability:
    """Tests for querying audit logs"""

    def test_query_audit_logs_by_event_type(self, test_db: Session):
        """Test querying audit logs by event type"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        # Log different event types
        AuditService.log_login_success(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
        )

        AuditService.log_login_success(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
        )

        AuditService.log_logout(
            db=test_db,
            user_id=user_id,
        )

        # Query by event type
        login_logs = test_db.query(AuditLog).filter(
            AuditLog.event_type == AuditEventType.LOGIN_SUCCESS
        ).all()

        logout_logs = test_db.query(AuditLog).filter(
            AuditLog.event_type == AuditEventType.LOGOUT
        ).all()

        assert len(login_logs) == 2
        assert len(logout_logs) == 1

    def test_query_audit_logs_by_user_id(self, test_db: Session):
        """Test querying audit logs by user ID"""
        from uuid import UUID

        user_id1_str = "550e8400-e29b-41d4-a716-446655440000"
        user_id2_str = "660e8400-e29b-41d4-a716-446655440001"
        user_id1 = UUID(user_id1_str)

        AuditService.log_login_success(
            db=test_db,
            user_id=user_id1_str,
            email="user1@example.com",
        )

        AuditService.log_login_success(
            db=test_db,
            user_id=user_id2_str,
            email="user2@example.com",
        )

        # Query by user ID
        user1_logs = test_db.query(AuditLog).filter(
            AuditLog.user_id == user_id1
        ).all()

        assert len(user1_logs) == 1
        assert str(user1_logs[0].user_id) == user_id1_str

    def test_query_audit_logs_by_ip_address(self, test_db: Session):
        """Test querying audit logs by IP address"""
        ip1 = "127.0.0.1"
        ip2 = "192.168.1.1"

        AuditService.log_login_success(
            db=test_db,
            user_id="550e8400-e29b-41d4-a716-446655440000",
            email="test@example.com",
            ip_address=ip1,
        )

        AuditService.log_login_success(
            db=test_db,
            user_id="660e8400-e29b-41d4-a716-446655440001",
            email="test2@example.com",
            ip_address=ip2,
        )

        # Query by IP address
        ip1_logs = test_db.query(AuditLog).filter(
            AuditLog.ip_address == ip1
        ).all()

        assert len(ip1_logs) == 1
        assert ip1_logs[0].ip_address == ip1

    def test_query_audit_logs_chronologically(self, test_db: Session):
        """Test querying audit logs in chronological order"""
        user_id = "550e8400-e29b-41d4-a716-446655440000"

        # Create multiple logs
        AuditService.log_account_created(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
            user_type="seeker",
        )

        AuditService.log_email_verified(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
        )

        AuditService.log_login_success(
            db=test_db,
            user_id=user_id,
            email="test@example.com",
        )

        # Query in reverse chronological order
        logs = test_db.query(AuditLog).order_by(
            AuditLog.created_at.desc()
        ).all()

        assert len(logs) == 3
        # Last should be login
        assert logs[0].event_type == AuditEventType.LOGIN_SUCCESS
        # First should be account created
        assert logs[2].event_type == AuditEventType.ACCOUNT_CREATED
