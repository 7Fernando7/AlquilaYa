# Contributing to FormaconIA Auth Service

Thank you for contributing to the FormaconIA authentication service! This guide explains our development workflow and standards.

## Development Setup

### 1. Clone and Branch

```bash
git clone https://github.com/7Fernando7/FormaconIA.git
cd FormaconIA/backend/packages/auth-service

# Create feature branch from main
git checkout -b feature/your-feature-name
```

### 2. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development/testing
```

### 3. Generate JWT Keys (Development)

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with local PostgreSQL/Redis credentials
```

### 5. Set Up Database

```bash
make db-reset  # Drop and recreate database
make migrate   # Apply all migrations
```

## Development Workflow

### Creating a New Feature

Follow this workflow for any new feature:

#### 1. Test-Driven Development (TDD)

Always write tests before implementing:

```bash
# Create test file in tests/unit/
vim tests/unit/test_my_feature.py

# Write failing test
def test_my_feature_does_something():
    result = do_something()
    assert result == expected
```

#### 2. Implement Feature

```bash
# Create service/model/route files as needed
vim app/services/my_feature.py

# Implement the feature to make tests pass
```

#### 3. Run Tests

```bash
# Run your specific test
make test-unit TEST=tests/unit/test_my_feature.py

# Run all unit tests
make test-unit

# Check coverage
make test-cov
```

#### 4. Code Quality

```bash
# Format code
make format

# Lint code (check for issues)
make lint

# Both together
make quality
```

#### 5. Commit Changes

```bash
# Stage changes
git add app/ tests/

# Commit with clear message
git commit -m "feat: Add my feature (close #123)

- Describe what the feature does
- Explain why it was needed
- Note any breaking changes

Co-Authored-By: Name <email@example.com>"
```

#### 6. Push and Create PR

```bash
git push -u origin feature/your-feature-name

# Create PR on GitHub with:
# - Clear title: "Add my feature"
# - Description from PULL_REQUEST_TEMPLATE.md
# - Reference related issues: "Closes #123"
# - Link to deployment docs if applicable
```

### Modifying Database Schema

When adding/changing database models:

```bash
# 1. Update model in app/models/
vim app/models/my_model.py

# 2. Create migration
make migrations

# Alembic will prompt for description:
# "Add my_column to my_table"

# 3. Review generated migration
vim alembic/versions/XXX_add_my_column_to_my_table.py

# 4. Apply migration
make migrate

# 5. Test database operations
make test-unit
```

### Adding New Endpoints

When creating new API endpoints:

```bash
# 1. Create schema (request/response models)
vim app/schemas/my_feature.py

class MyRequest(BaseModel):
    field1: str
    field2: int

class MyResponse(BaseModel):
    id: UUID
    field1: str
    created_at: datetime

# 2. Create service (business logic)
vim app/services/my_feature.py

class MyFeatureService:
    @staticmethod
    def do_something(db: Session, input: MyRequest):
        """Business logic here"""
        pass

# 3. Create route (API endpoint)
vim app/api/routes/my_feature.py

@router.post(
    "/my-endpoint",
    response_model=MyResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Invalid input"},
        409: {"description": "Conflict"},
    }
)
async def my_endpoint(
    request: MyRequest,
    db: Session = Depends(get_db),
):
    """
    Clear description of what endpoint does

    **Parameters**:
    - field1: Description
    - field2: Description

    **Returns**: Response object

    **Errors**:
    - 400: Invalid input validation failed
    - 409: Resource already exists
    """
    result = MyFeatureService.do_something(db, request)
    return result

# 4. Include router in main.py
from app.api.routes import my_feature
app.include_router(my_feature.router)

# 5. Write comprehensive tests
vim tests/unit/test_my_feature.py

# 6. Run full test suite
make test-unit
```

## Code Style

### Python Style Guide

We follow **PEP 8** with these preferences:

**Imports** - Organized in groups:
```python
# Standard library
import os
import json
from datetime import datetime

# Third-party
from fastapi import FastAPI
from sqlalchemy import Column, String

# Local
from app.services.auth import AuthService
```

**Type Hints** - Always use type hints:
```python
# Good
def register_user(db: Session, email: str, password: str) -> User:
    pass

# Bad
def register_user(db, email, password):
    pass
```

**Docstrings** - Use Google-style docstrings:
```python
def process_payment(amount: float, currency: str = "EUR") -> bool:
    """Process a payment transaction.

    Args:
        amount: Payment amount
        currency: Currency code (default: EUR)

    Returns:
        True if payment succeeded, False otherwise

    Raises:
        ValueError: If amount is negative
        ConnectionError: If payment gateway unavailable
    """
    pass
```

**Naming** - Be explicit:
```python
# Good
def get_user_by_email(db: Session, email: str) -> User:
    pass

# Avoid
def get_user(db: Session, e: str):
    pass
```

### Error Handling

Always handle errors gracefully:

```python
@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = AuthService.register(db, request.email, request.password)
        return RegisterResponse.from_orm(user)
    except ValueError as e:
        # Validation errors (bad input)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except IntegrityError as e:
        # Database constraint violations
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    except Exception as e:
        # Unexpected errors
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
```

## Testing Standards

### Test Structure

```python
# tests/unit/test_my_feature.py

import pytest
from unittest.mock import Mock, patch

class TestMyFeature:
    """Test group for related functionality"""

    def test_feature_success_case(self, db_session):
        """Test normal operation (should be most common)"""
        result = MyFeatureService.do_something(db_session)
        assert result.success == True

    def test_feature_error_case(self, db_session):
        """Test error handling"""
        with pytest.raises(ValueError) as exc_info:
            MyFeatureService.do_something(db_session, invalid_input)
        assert "Invalid input" in str(exc_info.value)

    def test_feature_edge_case(self, db_session):
        """Test boundary conditions"""
        result = MyFeatureService.do_something(db_session, edge_case_input)
        assert result.handled == True
```

### Test Coverage Expectations

- **Minimum 80%** overall code coverage
- **100%** for critical auth functions (login, token validation)
- **100%** for security-sensitive operations (password hashing, logout)
- All error paths must be tested

### Running Tests

```bash
# Run all tests
make test

# Run specific test file
make test-unit TEST=tests/unit/test_auth.py

# Run specific test class
pytest tests/unit/test_auth.py::TestLoginFlow -v

# Run with coverage report
make test-cov

# Run with specific markers
pytest -m "not slow" -v
```

## Documentation Standards

### Endpoint Documentation

Every endpoint must have clear documentation:

```python
@router.post(
    "/endpoint",
    response_model=ResponseModel,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Validation error"},
        409: {"description": "Conflict with existing resource"},
    }
)
async def endpoint(request: RequestModel, db: Session = Depends(get_db)):
    """
    Clear summary of what this endpoint does.

    **Access Control**: [Public/Authenticated/Admin]

    **Rate Limit**: [If applicable, e.g., 5 requests/minute]

    **Request Body**:
    - field1: Description
    - field2: Description (optional)

    **Success Response (201)**:
    ```json
    {
        "id": "uuid",
        "field1": "value",
        "created_at": "2026-02-19T10:30:00Z"
    }
    ```

    **Error Responses**:
    - 400: Invalid input - field validation failed
    - 409: Conflict - resource already exists
    - 500: Internal server error

    **Examples**:

    ```bash
    curl -X POST http://localhost:8000/endpoint \\
      -H "Content-Type: application/json" \\
      -d '{"field1": "value", "field2": "value"}'
    ```
    """
    pass
```

### Inline Comments

Comment the "why", not the "what":

```python
# Good - explains rationale
if user.failed_attempts >= 3:
    # Lock account after 3 failed attempts to prevent brute force
    user.is_locked = True

# Bad - obvious from code
if user.failed_attempts >= 3:
    # Set is_locked to True
    user.is_locked = True
```

## Security Checklist

Before submitting a PR with security-related changes:

- [ ] No hardcoded secrets or API keys
- [ ] All user inputs validated
- [ ] SQL injection prevented (using parameterized queries)
- [ ] Cross-site scripting (XSS) prevented
- [ ] CSRF tokens handled properly
- [ ] Rate limiting applied to sensitive endpoints
- [ ] Sensitive data not logged (passwords, tokens)
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS enforced in production
- [ ] Authentication required on protected endpoints
- [ ] Authorization checks prevent cross-user access
- [ ] Audit logging tracks sensitive operations

## Review Process

### Before Submitting PR

1. **Run all checks locally**:
   ```bash
   make quality  # Format + Lint
   make test-cov # Test with coverage
   ```

2. **Self-review your code**:
   - Does it solve the problem?
   - Are there edge cases handled?
   - Is error handling comprehensive?
   - Are tests covering all paths?
   - Is documentation clear?

3. **Write clear PR description**:
   - What problem does this solve?
   - How is it solved?
   - Are there breaking changes?
   - What testing was done?

### During Review

- Be open to feedback
- Explain decisions clearly
- Mark conversations as resolved when addressed
- Update PR description if scope changes

### After Approval

1. Rebase on main (if needed):
   ```bash
   git fetch origin
   git rebase origin/main
   git push --force-with-lease
   ```

2. Merge to main:
   ```bash
   # GitHub: Use "Squash and merge" or "Rebase and merge"
   # Avoid "Create a merge commit" unless multiple logical commits
   ```

3. Delete branch:
   ```bash
   git branch -d feature/your-feature-name
   ```

## Common Issues & Solutions

### Tests Failing in CI but Passing Locally

Usually a database state issue:
```bash
# Reset test database
make db-reset
make test-unit
```

### Import Errors

Check Python path and virtual environment:
```bash
# Ensure venv is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Formatting Differences

Run formatter before committing:
```bash
make format
git add .
git commit -m "style: Format code"
```

### Flaky Tests

If a test passes sometimes and fails sometimes:
1. Check for database state dependencies
2. Check for timing-dependent logic
3. Check for uninitialized variables
4. Consider using pytest markers: `@pytest.mark.slow`

## Getting Help

- **Questions about code**: Comment on the issue or PR
- **Architecture decisions**: Check ARCHITECTURE.md or ask in PR discussion
- **Security concerns**: Email security team or comment privately on PR
- **Performance issues**: See PERFORMANCE.md

## Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org
- **Pytest Docs**: https://docs.pytest.org
- **PEP 8 Style Guide**: https://www.python.org/dev/peps/pep-0008
- **Auth Service Architecture**: See ARCHITECTURE.md

---

**Thank you for contributing! 🎉**
