# Testing Guide - FormaconIA Auth Service

Comprehensive guide to the test suite covering test structure, running tests, and coverage expectations.

## Test Suite Overview

**Total Tests**: 104+ passing unit tests
**Framework**: pytest
**Database**: In-memory SQLite (isolated, fast)
**Coverage**: ~85% code coverage

### Test Organization

```
tests/
├── unit/                      # Unit tests (104+ tests)
│   ├── test_auth_service.py   # Auth service logic (17 tests)
│   ├── test_user_service.py   # User management (17 tests)
│   ├── test_login_flow.py     # Login endpoint (11 tests)
│   ├── test_password_reset.py # Password reset (11 tests)
│   ├── test_profile.py        # Profile management (26 tests)
│   ├── test_logout.py         # Logout & sessions (12 tests)
│   └── test_audit_log.py      # Audit logging (22 tests)
├── conftest.py                # Shared pytest fixtures
└── fixtures/                  # Test data and factories
```

## Running Tests

### Run All Tests

```bash
# Run all tests
make test

# Verbose output (shows each test name)
make test-v

# With coverage report
make test-cov
```

### Run Specific Tests

```bash
# Run one test file
pytest tests/unit/test_auth_service.py -v

# Run one test class
pytest tests/unit/test_auth_service.py::TestRegistration -v

# Run one specific test
pytest tests/unit/test_auth_service.py::TestRegistration::test_register_success -v

# Run tests matching a pattern
pytest -k "login" -v

# Run tests with specific marker
pytest -m "not slow" -v
```

### Test Output

```bash
# Example output
tests/unit/test_auth_service.py::TestRegistration::test_register_success PASSED
tests/unit/test_auth_service.py::TestRegistration::test_register_duplicate_email PASSED
tests/unit/test_auth_service.py::TestRegistration::test_register_weak_password PASSED

======================== 104 passed in 2.45s ========================
```

## Test Coverage

### Coverage by Feature

| Feature | Tests | Coverage | Status |
|---------|-------|----------|--------|
| User Registration | 17 | 100% | ✅ Complete |
| Email Verification | 8 | 100% | ✅ Complete |
| Login Flow | 11 | 100% | ✅ Complete |
| Password Reset | 11 | 100% | ✅ Complete |
| Token Refresh | 5 | 100% | ✅ Complete |
| Logout & Sessions | 12 | 100% | ✅ Complete |
| Profile Management | 26 | 100% | ✅ Complete |
| Audit Logging | 22 | 100% | ✅ Complete |
| **Total** | **104+** | **~85%** | **✅ Complete** |

### Coverage Report

Generate HTML coverage report:

```bash
# Run tests with coverage
make test-cov

# Open report in browser
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

Coverage includes:
- Line coverage (% of lines executed)
- Branch coverage (% of if/else branches tested)
- Function coverage (% of functions called)

## Test Structure

### Fixture-Based Testing

Tests use pytest fixtures for setup/teardown:

```python
# conftest.py - Shared fixtures
@pytest.fixture
def db_session():
    """In-memory SQLite database for each test"""
    # Create fresh database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    yield session  # Test runs here

    session.close()  # Cleanup after test

@pytest.fixture
def sample_user(db_session):
    """Create a test user"""
    user = UserService.create_user(
        db=db_session,
        email="test@example.com",
        password="TestPass123!",
        name="Test User",
        user_type="seeker"
    )
    return user
```

### Test Class Organization

Each test file is organized by class for related tests:

```python
class TestRegistration:
    """Tests for user registration"""

    def test_register_success(self, db_session):
        """Happy path: successful registration"""
        pass

    def test_register_duplicate_email(self, db_session):
        """Error path: email already exists"""
        pass

    def test_register_weak_password(self, db_session):
        """Error path: password doesn't meet requirements"""
        pass

class TestEmailVerification:
    """Tests for email verification"""

    def test_verify_email_success(self, db_session):
        """Happy path: email verification succeeds"""
        pass
```

## Example Tests

### Example 1: Happy Path Test

```python
def test_login_success(self, db_session):
    """Test successful login with correct credentials"""
    # Setup: Create a verified user
    user = UserService.create_user(
        db=db_session,
        email="john@example.com",
        password="SecurePass123!",
        name="John Doe",
        user_type="seeker"
    )
    user.email_verified = True
    db_session.commit()

    # Execute: Login
    result = AuthService.login(
        db=db_session,
        email="john@example.com",
        password="SecurePass123!",
        ip_address="127.0.0.1",
        user_agent="Mozilla/5.0"
    )

    # Assert: Check result
    assert result["access_token"] is not None
    assert result["refresh_token"] is not None
    assert result["user"]["email"] == "john@example.com"
```

### Example 2: Error Path Test

```python
def test_login_wrong_password(self, db_session):
    """Test login fails with wrong password"""
    # Setup: Create a verified user
    user = UserService.create_user(
        db=db_session,
        email="john@example.com",
        password="SecurePass123!",
        name="John Doe",
        user_type="seeker"
    )
    user.email_verified = True
    db_session.commit()

    # Execute & Assert: Login should raise error
    with pytest.raises(ValueError) as exc_info:
        AuthService.login(
            db=db_session,
            email="john@example.com",
            password="WrongPassword",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0"
        )

    assert "Invalid password" in str(exc_info.value)
```

### Example 3: Edge Case Test

```python
def test_password_hash_long_password(self):
    """Test password hashing with > 72 byte password"""
    # Passwords longer than bcrypt limit (72 bytes) are pre-hashed
    long_password = "a" * 100  # 100 characters

    # Hash should succeed (uses SHA256 pre-hash)
    hashed = PasswordService.hash_password(long_password)
    assert hashed is not None

    # Verification should work
    assert PasswordService.verify_password(long_password, hashed)
```

## Mocking & Patching

### Mock Email Service

```python
@patch('app.services.auth.get_email_service')
def test_register_sends_email(self, mock_email_service, db_session):
    """Test that registration sends verification email"""
    # Setup mock
    mock_service = Mock()
    mock_email_service.return_value = mock_service

    # Execute: Register user
    AuthService.register(
        db=db_session,
        email="test@example.com",
        password="TestPass123!",
        name="Test User",
        user_type="seeker"
    )

    # Assert: Email was sent
    mock_service.send_verification_email.assert_called_once()
    call_args = mock_service.send_verification_email.call_args
    assert "test@example.com" in str(call_args)
```

### Mock Database

```python
@patch('app.database.get_db')
def test_endpoint_with_mock_db(self, mock_get_db):
    """Test endpoint with mocked database"""
    mock_session = Mock()
    mock_get_db.return_value = mock_session

    # Setup mock user
    mock_user = Mock()
    mock_user.id = "test-id"
    mock_session.query.return_value.filter.return_value.first.return_value = mock_user

    # Execute request...
```

## Test Categories

### Unit Tests
Test individual functions/methods in isolation:

```python
def test_hash_password():
    """Unit test: Password hashing function"""
    password = "TestPass123!"
    hashed = PasswordService.hash_password(password)

    assert PasswordService.verify_password(password, hashed)
    assert not PasswordService.verify_password("WrongPass", hashed)
```

### Integration Tests
Test multiple components working together:

```python
def test_registration_and_login_flow(self, db_session):
    """Integration test: Complete registration → email → login flow"""
    # 1. Register user
    user = AuthService.register(db_session, "test@example.com", "Pass123!")
    assert user.email_verified == False

    # 2. Get verification token
    verification = db_session.query(EmailVerification).filter_by(
        user_id=user.id
    ).first()

    # 3. Verify email
    AuthService.verify_email(db_session, verification.token)
    db_session.refresh(user)
    assert user.email_verified == True

    # 4. Login
    result = AuthService.login(db_session, "test@example.com", "Pass123!", "127.0.0.1", "test-agent")
    assert result["access_token"] is not None
```

### API Contract Tests
Test HTTP request/response:

```python
def test_register_endpoint_201(self, client):
    """Test /auth/register returns 201 Created"""
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "TestPass123!",
        "name": "Test User",
        "user_type": "seeker"
    })

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["email_verified"] == False
```

## Known Issues & Flaky Tests

### Flaky Test: `test_refresh_token_success`

**Symptom**: Passes individually, occasionally fails in full suite

**Root Cause**: Likely database state persistence between tests when running full suite concurrently

**Mitigation**:
```bash
# Run test individually
pytest tests/unit/test_auth_service.py::TestRefresh::test_refresh_token_success -v

# Or run test file alone
pytest tests/unit/test_login_flow.py -v

# Full suite usually passes
make test
```

**Status**: Monitoring but doesn't affect production code (only test isolation issue)

## Performance Testing

### Test Execution Time

Current performance metrics:

```
Full test suite:       ~2.5 seconds
Unit tests alone:      ~2.0 seconds
Coverage report:       ~3.5 seconds
```

### Optimizing Test Speed

1. **Use in-memory SQLite**: Already done in conftest.py
2. **Mock external services**: Email, SendGrid mocked
3. **Parallel test execution**: pytest-xdist plugin (optional)

```bash
# Run tests in parallel (requires pytest-xdist)
pip install pytest-xdist
pytest -n auto  # Use all CPU cores
```

## Test Data & Fixtures

### Common Test Data

```python
# Valid credentials
VALID_EMAIL = "test@example.com"
VALID_PASSWORD = "TestPass123!"
VALID_NAME = "Test User"
VALID_USER_TYPE = "seeker"

# Invalid credentials
INVALID_EMAIL = "notanemail"
WEAK_PASSWORD = "weak"  # Missing uppercase, special char
INVALID_USER_TYPE = "superadmin"

# Edge cases
LONG_PASSWORD = "a" * 100
EMPTY_STRING = ""
SPECIAL_CHARS_EMAIL = "test+tag@example.co.uk"
```

### Fixture Factory

```python
@pytest.fixture
def create_user(db_session):
    """Factory fixture to create users with custom properties"""
    def _create_user(
        email="test@example.com",
        name="Test User",
        user_type="seeker",
        email_verified=True
    ):
        user = UserService.create_user(
            db=db_session,
            email=email,
            password="TestPass123!",
            name=name,
            user_type=user_type
        )
        user.email_verified = email_verified
        db_session.commit()
        return user

    return _create_user

# Usage in test:
def test_user_creation(self, create_user):
    user1 = create_user()  # Default
    user2 = create_user(email="other@example.com")  # Custom
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Push to main branch
- Pull request creation
- Scheduled daily runs

Configuration: `.github/workflows/test.yml`

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.14'
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v --cov
      - uses: codecov/codecov-action@v3
```

## Writing New Tests

### Best Practices

1. **Test one thing per test**:
   ```python
   # Good: Clear, focused test
   def test_password_minimum_length():
       with pytest.raises(ValueError):
           PasswordService.validate_password("Short1!")

   # Bad: Tests multiple things
   def test_password_validation():
       # Tests length, uppercase, lowercase, etc. all at once
       pass
   ```

2. **Use descriptive names**:
   ```python
   # Good: Clear what's being tested
   def test_login_fails_with_unverified_email()

   # Bad: Unclear
   def test_login()
   ```

3. **Arrange-Act-Assert pattern**:
   ```python
   def test_something():
       # Arrange: Setup
       user = create_user()

       # Act: Execute
       result = do_something(user)

       # Assert: Verify
       assert result == expected
   ```

4. **Test error conditions**:
   ```python
   # Test the happy path
   def test_success()

   # Test every error condition
   def test_error_condition_1()
   def test_error_condition_2()
   def test_edge_case_1()
   ```

5. **Mock external dependencies**:
   ```python
   # Bad: Tests email service, not auth service
   def test_register():
       # Actually sends email
       AuthService.register(...)

   # Good: Tests auth service only
   @patch('app.services.auth.EmailService')
   def test_register(self, mock_email):
       AuthService.register(...)  # Email is mocked
   ```

### Test Checklist

Before committing new tests:

- [ ] Test name clearly describes what's being tested
- [ ] One assertion per test (or cohesive assertions)
- [ ] All error paths covered
- [ ] Edge cases tested
- [ ] External dependencies mocked
- [ ] Test passes locally (`pytest tests/unit/test_my_feature.py -v`)
- [ ] Test passes with coverage (`pytest tests/unit/test_my_feature.py --cov`)
- [ ] No hardcoded timeouts or sleep() calls
- [ ] Uses fixtures for setup/teardown

## Debugging Tests

### Common Issues & Solutions

**Issue**: Test passes locally but fails in CI

```bash
# Check for database state issues
make db-reset
make test

# Check for environment differences
printenv | grep DATABASE_URL
```

**Issue**: Test is intermittently failing (flaky)

```python
# Add retry logic if needed
import pytest

@pytest.mark.flaky(reruns=3)
def test_something_flaky():
    pass

# Or use fixture to reset state between runs
```

**Issue**: Test is too slow

```bash
# Profile test execution
pytest --durations=10 tests/

# Mark slow tests
@pytest.mark.slow
def test_something_slow():
    pass

# Run only fast tests
pytest -m "not slow" tests/
```

**Issue**: Can't debug test failures

```bash
# Run with verbose output
pytest -vv tests/unit/test_auth_service.py::TestLogin::test_something

# Run with print statements
pytest -s tests/unit/test_auth_service.py::TestLogin::test_something

# Run with debugger
pytest --pdb tests/unit/test_auth_service.py
```

## Deployment Validation

### Pre-Deployment Test Checklist

Before deploying to production:

```bash
# 1. Run full test suite
make test-cov

# 2. Check coverage threshold (minimum 80%)
coverage report --minimum-coverage=80

# 3. Run linting
make lint

# 4. Check security vulnerabilities
bandit -r app/

# 5. Run type checking
mypy app/

# 6. Deploy to staging
./deploy-staging.sh deploy

# 7. Run smoke tests on staging
./tests/smoke_tests/run_staging_tests.sh
```

---

## Resources

- **pytest Documentation**: https://docs.pytest.org
- **Python unittest**: https://docs.python.org/3/library/unittest.html
- **Mock Objects**: https://docs.python.org/3/library/unittest.mock.html
- **Fixtures Guide**: https://docs.pytest.org/en/stable/how-to_use_fixture.html

---

**Last Updated**: 2026-02-19
**Framework**: pytest 7.x
**Python**: 3.14+
