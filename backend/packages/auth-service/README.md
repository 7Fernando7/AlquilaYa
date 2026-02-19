# Auth Service - FormaconIA

FastAPI-based authentication and user registration service for the FormaconIA marketplace platform.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration (database URL, JWT secrets, email provider, etc.)

### 3. Generate JWT Keys

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem
```

Update `.env`:
```env
JWT_PRIVATE_KEY_PATH=private.pem
JWT_PUBLIC_KEY_PATH=public.pem
```

### 4. Set Up Database

```bash
make migrate
```

Or manually:
```bash
dropdb formacion_auth || true
createdb formacion_auth
alembic upgrade head
```

### 5. Run Development Server

```bash
make dev
```

Server starts at `http://localhost:8001`

API Documentation:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Project Structure

```
auth-service/
├── app/                          # Application code
│   ├── __init__.py
│   ├── main.py                  # FastAPI app initialization
│   ├── config.py                # Settings and configuration
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/              # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # Registration, login, refresh
│   │   │   ├── password.py      # Password reset
│   │   │   └── profile.py       # User profile management
│   │   └── dependencies.py      # JWT validation, DB sessions
│   ├── models/                  # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py              # User model
│   │   ├── session.py           # Session model
│   │   ├── audit_log.py         # AuditLog model
│   │   ├── password_reset.py    # PasswordReset model
│   │   └── email_verification.py # EmailVerification model
│   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   └── auth.py              # Auth request/response models
│   ├── services/                # Business logic
│   │   ├── __init__.py
│   │   ├── auth.py              # Authentication service
│   │   ├── user.py              # User management
│   │   ├── session.py           # Session management
│   │   ├── email.py             # Email service
│   │   └── audit.py             # Audit logging
│   ├── middleware/              # Request/response middleware
│   │   ├── __init__.py
│   │   ├── error_handler.py     # Global exception handler
│   │   ├── rate_limiter.py      # Rate limiting
│   │   └── audit_logger.py      # Request logging
│   ├── utils/                   # Utility functions
│   │   ├── __init__.py
│   │   ├── jwt.py               # JWT utilities
│   │   ├── password.py          # Password utilities
│   │   └── token_manager.py     # Token/session management
│   └── database/                # Database configuration
│       ├── __init__.py
│       ├── connection.py        # DB engine and session factory
│       └── redis.py             # Redis client
├── tests/                       # Test suite
│   ├── __init__.py
│   ├── conftest.py              # Pytest fixtures
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── contract/                # API contract tests
├── alembic/                     # Database migrations
│   ├── versions/                # Individual migration files
│   ├── env.py                   # Migration environment
│   ├── script.py.mako           # Migration template
│   └── __init__.py
├── alembic.ini                  # Alembic configuration
├── requirements.txt             # Python dependencies
├── pyproject.toml               # Tool configuration
├── pytest.ini                   # Pytest configuration
├── .flake8                      # Flake8 linting configuration
├── .env.example                 # Environment variables template
├── .env                         # Environment variables (gitignored)
├── .gitignore                   # Git ignore rules
├── Makefile                     # Common commands
└── README.md                    # This file
```

## Common Tasks

### Run Tests

```bash
# All tests
make test

# Unit tests only
make test-unit

# Integration tests only
make test-int

# With coverage report
make test-cov
```

### Code Quality

```bash
# Lint code
make lint

# Format code
make format

# Clean build artifacts
make clean
```

### Database Management

```bash
# Apply migrations
make migrate

# Reset database (drop and recreate)
make db-reset

# Create new migration
make migrations
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `POST /auth/verify-email` - Verify email address
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/password/reset-request` - Request password reset
- `POST /auth/password/confirm-reset` - Confirm password reset

### User Profile

- `GET /users/{user_id}/profile` - Get user profile
- `PUT /users/{user_id}/profile` - Update user profile
- `GET /users/{user_id}` - Get public user profile

### Health

- `GET /health` - Health check endpoint

## Configuration

See `.env.example` for all available configuration options:

- **Database**: PostgreSQL connection string
- **Redis**: Redis connection for caching and rate limiting
- **JWT**: Token expiry times, algorithm, secret keys
- **Email**: SendGrid API key or AWS SES configuration
- **Security**: Password requirements, rate limiting rules
- **CORS**: Allowed origins for frontend

## Security Considerations

- All passwords are hashed with bcrypt (cost factor 12)
- JWT tokens use RS256 (asymmetric signing)
- Refresh tokens are invalidated on logout
- Rate limiting prevents brute-force attacks
- All auth events are logged for audit trail
- HTTPS should be enforced in production

## Development

### Adding New Endpoints

1. Create schema in `app/schemas/`
2. Create route in `app/api/routes/`
3. Create/update service in `app/services/`
4. Add tests in `tests/`

### Database Changes

1. Create migration: `make migrations`
2. Describe your changes
3. Run: `make migrate`
4. Update models if needed

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 8001
lsof -i :8001

# Kill it
kill -9 <PID>

# Or use different port
uvicorn app.main:app --port 8002
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -U postgres -h localhost

# Check database exists
psql -U postgres -h localhost -l | grep formacion_auth
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

## Deployment

See `DEPLOYMENT.md` for production deployment instructions.

## Contributing

1. Create feature branch from `main`
2. Write tests first (TDD)
3. Implement feature
4. Run: `make lint`, `make test`, `make format`
5. Submit PR

## License

Proprietary - FormaconIA
