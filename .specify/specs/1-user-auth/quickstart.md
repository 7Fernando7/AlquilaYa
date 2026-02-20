# Quick Start: Local Development Setup

**Duration**: 5 minutes (first time), 1 minute (subsequent times)
**OS**: Linux/Mac/Windows (with WSL2)
**Requirements**: Docker, Docker Compose, Git

---

## One-Command Setup

```bash
# From repository root
cd backend/packages/auth-service
make dev
```

This starts all services and runs the app. See `Makefile` section below.

---

## Step-by-Step Setup

### 1. Start Infrastructure Services (PostgreSQL, Redis)

```bash
cd /path/to/FormaconIA
docker-compose up -d postgres redis elasticsearch
```

**Verify services running**:
```bash
docker-compose ps
# Should show: postgres, redis, elasticsearch all "Up"
```

### 2. Install Python Dependencies

```bash
cd backend/packages/auth-service
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows PowerShell
```

Install packages:
```bash
pip install -r requirements.txt
pip install -e .[dev]  # Install dev dependencies too
```

### 3. Run Database Migrations

```bash
alembic upgrade head
```

**Verify migration**:
```bash
psql -U postgres -h localhost -d formacion_auth -c "\dt"
# Should list: users, sessions, audit_logs, password_resets, email_verifications
```

### 4. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/formacion_auth

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-256-chars-or-more
JWT_ALGORITHM=RS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email
EMAIL_PROVIDER=sendgrid  # or aws_ses
SENDGRID_API_KEY=sg_...  # Get from SendGrid dashboard

# App
APP_ENV=development
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### 5. Start Auth Service

```bash
# Terminal 1: Start server
uvicorn app.main:app --reload --port 8000

# Should see:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
```

Access interactive docs:
```
http://localhost:8000/docs         # Swagger UI
http://localhost:8000/redoc        # ReDoc
```

---

## Test Registration & Login

### Using cURL

**1. Register User**:
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "user_type": "seeker"
  }'

# Response:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "email": "test@example.com",
#   "name": "Test User",
#   "user_type": "seeker",
#   "created_at": "2026-02-19T10:30:00Z"
# }
```

**2. Get Verification Token** (in development, check logs):
```bash
# Look for: "Verification token: <TOKEN>" in server logs
# In test mode: Token is also returned in response
```

**3. Verify Email**:
```bash
VERIFICATION_TOKEN="<token-from-logs>"
curl -X POST http://localhost:8000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"verification_token\": \"$VERIFICATION_TOKEN\"}"

# Response: { "message": "Email verified successfully" }
```

**4. Login**:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Response:
# {
#   "access_token": "eyJhbGciOiJSUzI1NiIs...",
#   "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
#   "token_type": "bearer",
#   "expires_in": 900
# }
```

**5. Access Protected Endpoint**:
```bash
ACCESS_TOKEN="<token-from-login>"
curl -X GET http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Response: User profile data
```

### Using Swagger UI (Easier)

1. Open http://localhost:8000/docs
2. Click "Register" endpoint
3. Click "Try it out"
4. Fill in: email, password, name, user_type
5. Click "Execute"
6. Copy the `id` from response
7. Verify email (same process)
8. Login (same process)
9. Use access_token in "Authorize" button (top right)
10. Test other endpoints

---

## Makefile Commands

Create `backend/packages/auth-service/Makefile`:

```makefile
.PHONY: dev test lint format clean help install

help:
	@echo "Available commands:"
	@echo "  make dev          - Start development server (requires Docker)"
	@echo "  make test         - Run all tests"
	@echo "  make test-unit    - Run unit tests only"
	@echo "  make test-int     - Run integration tests only"
	@echo "  make lint         - Run linter"
	@echo "  make format       - Format code"
	@echo "  make clean        - Remove __pycache__, .pyc files"
	@echo "  make install      - Install dependencies"

install:
	pip install -r requirements.txt
	pip install -e .[dev]

dev:
	python -m uvicorn app.main:app --reload --port 8000

test:
	pytest -v

test-unit:
	pytest tests/unit -v

test-int:
	pytest tests/integration -v

test-cov:
	pytest --cov=app --cov-report=html

lint:
	flake8 app tests
	mypy app

format:
	black app tests
	isort app tests

clean:
	find . -type d -name __pycache__ -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .mypy_cache
```

### Common Commands

```bash
# Development
make dev                # Start server with auto-reload
make test              # Run all tests
make test-cov          # Run tests with coverage report
make lint              # Check code quality
make format            # Auto-format code
make clean             # Clean up build artifacts
```

---

## Troubleshooting

### PostgreSQL Connection Error
```
Error: could not connect to server: Connection refused
```

**Solution**:
```bash
docker-compose up -d postgres
docker-compose logs postgres  # Check if it's running
psql -U postgres -h localhost -d postgres -c "SELECT 1"
```

### Redis Connection Error
```
Error: ConnectionError: Error 111 connecting to localhost:6379
```

**Solution**:
```bash
docker-compose up -d redis
docker-compose logs redis
redis-cli ping  # Should return PONG
```

### Port Already in Use
```
OSError: [Errno 98] Address already in use
```

**Solution**:
```bash
# Find process on port 8000
lsof -i :8000

# Kill it
kill -9 <PID>

# Or use different port
uvicorn app.main:app --port 8002
```

### Database Migration Error
```
ERROR [alembic.util.messaging] Can't locate revision identified by 'abc123'
```

**Solution**:
```bash
# Reset database
dropdb formacion_auth
createdb formacion_auth
alembic upgrade head
```

### Email Not Sending
```
SMTPAuthenticationError: SMTP authentication failed
```

**Solution**:
```bash
# Check SendGrid API key in .env
echo $SENDGRID_API_KEY

# Verify key is valid (first 6 chars should be "SG_")
# Test with curl:
curl -X GET https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
```

---

## Project Structure After Setup

```
auth-service/
├── venv/                    # Virtual environment
├── app/
│   ├── main.py             # FastAPI app
│   ├── api/
│   │   └── routes/
│   ├── models/
│   ├── services/
│   ├── schemas/
│   └── ...
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── alembic/
│   └── versions/           # Migration files
├── requirements.txt
├── .env                    # CREATED during setup
├── .env.example
├── Makefile
└── README.md
```

---

## Next Steps

### Run Tests
```bash
make test
# All tests should pass (implement in Phase 2)
```

### Create First User
```bash
# See "Test Registration & Login" section above
```

### Read API Documentation
```bash
# Navigate to http://localhost:8000/docs
```

### Explore Code
```bash
# Start with: app/main.py
# Then: app/api/routes/auth.py
# Then: app/services/auth.py
```

### Common Development Tasks

**Add a new endpoint**:
```python
# In app/api/routes/auth.py
@router.post("/new-endpoint")
async def new_endpoint(request: NewRequest, db: Session = Depends(get_db)):
    # Implementation
    return NewResponse()
```

**Add a new database model**:
```python
# In app/models/user.py
class NewModel(Base):
    __tablename__ = "new_models"
    id = Column(UUID, primary_key=True, default=uuid4)
    # ... fields
```

**Run tests during development**:
```bash
pytest tests/unit/test_auth_service.py -v -s
# -s shows print statements
# -v shows verbose output
```

---

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/auth-service-tests.yml`):

```yaml
name: Auth Service Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: formacion_auth_test
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - run: pip install -r backend/packages/auth-service/requirements.txt
      - run: cd backend/packages/auth-service && make test
```

---

## Production Deployment

See `deployment.md` (created during Phase 3 implementation)

For now, focus on:
1. Local development works
2. Tests pass
3. API contracts verified

---

**Status**: ✅ Ready for implementation
**Next**: Generate tasks with `/speckit.tasks`
