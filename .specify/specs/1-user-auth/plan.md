# Implementation Plan: User Authentication & Registration System

**Branch**: `1-user-auth` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/1-user-auth/spec.md`

---

## Summary

FormaconIA's authentication system is the foundation for all marketplace features. This plan delivers secure, stateless JWT-based authentication with email verification, rate limiting, and audit logging. The system supports two user types (seekers and owners) with role-specific profile management. Built with Python/FastAPI backend and PostgreSQL persistence, it integrates with Redis for session management and rate limiting. This phased approach delivers P1 features (registration, login, token refresh) in MVP, with P2/P3 features (password reset, audit logging) added iteratively.

**Key Design Decisions**:
- **JWT-based**: Stateless tokens enable microservice architecture (Principle IV)
- **Email verification**: Ensures legitimate users (Principle II)
- **Rate limiting**: Redis-backed to prevent brute force (Principle II)
- **Audit logging**: All auth events logged for compliance (Principle II)
- **Two user types**: Schema supports seekers and owners with extensible role system

---

## Technical Context

**Language/Version**: Python 3.11+ (from TECH-STACK.md)
**Primary Dependencies**: FastAPI 0.100+, SQLAlchemy 2.0+, Pydantic 2.0+, python-jose (JWT), passlib (password hashing), redis
**Storage**: PostgreSQL 14+ (relational schema) + Redis 7+ (cache, session, rate limiting)
**Testing**: pytest + pytest-asyncio (unit and integration tests)
**Target Platform**: Linux server (Docker containerized)
**Project Type**: Microservice (independent FastAPI service)
**Performance Goals**: Login <500ms p95, token refresh <100ms, support 1000 concurrent users
**Constraints**: JWT expiry 15min (access) / 7 days (refresh), password reset link valid 24h, rate limit 3 attempts per 10 minutes
**Scale/Scope**: MVP supports 10k users in first 6 months, designed to scale to 100k+ with database optimization

---

## Constitution Check

**Status**: ✅ PASS (All principles aligned)

| Principle | Requirement | Compliance | Evidence |
|-----------|------------|-----------|----------|
| **I. Intelligence-First** | Features must use AI/ML | ✅ N/A for auth | Not applicable - auth is foundational |
| **II. Trust & Security First** | Verify, validate, provide transparency | ✅ YES | Email verification, audit logging, rate limiting, secure token management |
| **III. User-Centric Problem Solving** | Address documented pain points | ✅ YES | Solves "users need secure way to access marketplace" + "prevent fraudulent access" |
| **IV. Marketplace Ecosystem** | Support multiple stakeholders | ✅ YES | Two user types (seeker/owner) with role-specific profiles |
| **V. MVP + WOW Philosophy** | MVP first, WOW later | ✅ YES | P1: registration, login, tokens (MVP); P2: password reset; P3: audit logging (WOW) |

**Gate Result**: ✅ APPROVED for implementation

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/1-user-auth/
├── spec.md              # Feature specification ✅ CREATED
├── plan.md              # This file (implementation plan) ✅ CREATING
├── research.md          # Phase 0: research findings (see below)
├── data-model.md        # Phase 1: database schema
├── quickstart.md        # Phase 1: local dev setup
├── contracts/           # Phase 1: API contracts (OpenAPI)
│   ├── auth.openapi.yaml
│   └── profiles.openapi.yaml
├── checklists/
│   └── requirements.md   # Quality checklist ✅ CREATED
└── tasks.md             # Phase 2: implementation tasks (via /speckit.tasks)
```

### Source Code (repository root - microservice structure)

```text
backend/
├── packages/
│   ├── auth-service/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py              # FastAPI app initialization
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── routes/
│   │   │   │   │   ├── auth.py      # POST /auth/register, /auth/login, /auth/refresh
│   │   │   │   │   ├── password.py  # POST /auth/reset-password, /auth/confirm-reset
│   │   │   │   │   ├── profile.py   # GET/PUT /users/{id}/profile
│   │   │   │   │   └── health.py    # GET /health (for k8s probes)
│   │   │   │   └── dependencies.py  # JWT validation, rate limiting middleware
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py          # User SQLAlchemy model
│   │   │   │   ├── session.py       # Session model
│   │   │   │   ├── audit_log.py     # AuditLog model
│   │   │   │   └── password_reset.py # PasswordReset model
│   │   │   ├── schemas/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py          # Pydantic: RegisterRequest, LoginRequest, etc.
│   │   │   │   └── user.py          # Pydantic: UserResponse, ProfileUpdate, etc.
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py          # Auth business logic (hash, verify, issue tokens)
│   │   │   │   ├── user.py          # User management (create, update, get)
│   │   │   │   ├── email.py         # Email sending (verification, reset)
│   │   │   │   ├── token.py         # JWT token creation/validation
│   │   │   │   └── audit.py         # Audit log recording
│   │   │   ├── middleware/
│   │   │   │   ├── error_handler.py # Global exception handling
│   │   │   │   ├── rate_limiter.py  # Redis-backed rate limiting
│   │   │   │   └── audit_logger.py  # Request/response logging
│   │   │   ├── utils/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── password.py      # Password validation, hashing
│   │   │   │   ├── jwt.py           # JWT helpers
│   │   │   │   └── email.py         # Email validation
│   │   │   └── database/
│   │   │       ├── __init__.py
│   │   │       ├── connection.py    # PostgreSQL connection pool
│   │   │       ├── redis.py         # Redis client
│   │   │       ├── models.py        # SQLAlchemy Base
│   │   │       └── migrations/      # Alembic migrations
│   │   ├── requirements.txt         # Python dependencies
│   │   ├── .env.example             # Environment variables template
│   │   ├── Dockerfile               # Docker image
│   │   ├── pytest.ini               # Pytest configuration
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── conftest.py          # Pytest fixtures
│   │       ├── unit/
│   │       │   ├── test_auth_service.py
│   │       │   ├── test_user_service.py
│   │       │   ├── test_password_utils.py
│   │       │   └── test_token_service.py
│   │       ├── integration/
│   │       │   ├── test_auth_flow.py        # Full registration → login flow
│   │       │   ├── test_token_refresh.py    # Refresh token flow
│   │       │   ├── test_password_reset.py   # Password reset flow
│   │       │   └── test_rate_limiting.py    # Rate limit enforcement
│   │       └── contract/
│   │           └── test_auth_api.py         # OpenAPI contract tests
│   │
│   └── shared/  (used by all services)
│       ├── __init__.py
│       ├── models/
│       │   └── auth.py              # Shared auth models (Token, TokenPayload)
│       ├── middleware/
│       │   └── auth.py              # JWT validation for other services
│       └── exceptions.py            # Common exception classes
│
├── docker-compose.yml               # Local dev environment
└── Makefile                         # Build/test commands

frontend/                           # Will be added in next feature
mobile/                             # Will be added in future
```

**Structure Decision**: Microservice pattern with independent auth-service under `backend/packages/`. Shared utilities in `backend/shared/` for reuse across services. Follows layered architecture: routes → services → models, with clear separation of concerns.

---

## Implementation Phases

### Phase 0: Research & Technical Decisions ✅

**Status**: COMPLETE (Tech stack already decided in TECH-STACK.md)

**Resolved Items**:
- ✅ JWT library choice: `python-jose[cryptography]` (industry standard)
- ✅ Password hashing: `passlib[bcrypt]` with Argon2 fallback
- ✅ Email delivery: SendGrid or AWS SES (deferred to .env configuration)
- ✅ Rate limiting: Redis with sliding window counter
- ✅ Token management: JWT with RS256 algorithm (asymmetric) for better security
- ✅ Session tracking: Redis + PostgreSQL (Redis for active sessions, PostgreSQL for audit)

**Research Output**: See `research.md` file (below)

### Phase 1: Design & Contracts (THIS PHASE)

**Artifacts to Create**:

1. **data-model.md** (Entity schema, validation rules)
2. **contracts/auth.openapi.yaml** (REST API endpoints)
3. **contracts/profiles.openapi.yaml** (Profile management endpoints)
4. **quickstart.md** (Local development setup)

### Phase 2: Task Generation (next phase via `/speckit.tasks`)

**Output**: tasks.md with:
- User story → implementation task mapping
- Dependency ordering (database setup → models → services → routes → tests)
- Acceptance criteria for each task
- Estimated complexity

---

## Research Findings (Phase 0 Output)

### Decision 1: JWT Secret Management

**Decision**: Use RS256 (RSA signing) instead of HS256 (symmetric)
**Rationale**:
- Allows microservices to verify tokens without sharing secret
- Public key can be distributed to all services
- Private key secured on auth-service only
- Better separation of concerns

**Alternatives Considered**:
- HS256: Simpler but requires all services to have secret key (worse security)
- HMAC with rotating keys: Adds complexity without benefits

---

### Decision 2: Rate Limiting Implementation

**Decision**: Redis-backed sliding window counter
**Rationale**:
- Atomic operations across distributed instances
- Sub-millisecond latency
- Supports sliding window (more fair than fixed)
- Clean distributed system design

**Alternatives Considered**:
- In-memory (single instance only, not scalable)
- Database-backed (too slow for rate limiting)
- Token bucket algorithm (more complex, similar results)

---

### Decision 3: Password Hashing Algorithm

**Decision**: bcrypt with cost factor 12 (Argon2 as future upgrade)
**Rationale**:
- bcrypt battle-tested, OWASP recommended
- Cost factor 12 = ~100ms per hash (security/speed tradeoff)
- Argon2 support via passlib if performance bottleneck
- No third-party service needed

**Alternatives Considered**:
- PBKDF2: Good but older than bcrypt
- scrypt: Good but less tested
- Argon2: Better but slower (use for critical paths)

---

### Decision 4: Email Verification Token Storage

**Decision**: Short-lived tokens in PostgreSQL (24-48h), not JWT
**Rationale**:
- Tokens need to be revoked (JWT can't be revoked easily)
- One-time use (must track in DB)
- PostgreSQL sufficient for verification flow (not latency-critical)

**Alternatives Considered**:
- JWT for verification: Can't revoke, wrong abstraction
- Redis only: Data loss on crash
- Hybrid: Redis cache + PostgreSQL audit trail

---

### Decision 5: Session Management

**Decision**: Sessions in Redis (active) + PostgreSQL (audit trail)
**Rationale**:
- Redis for fast session lookup (is token valid?)
- PostgreSQL for audit trail (compliance, fraud detection)
- Sessions expire automatically in Redis (TTL)
- Can query PostgreSQL for historical sessions

**Alternatives Considered**:
- Database-only: Too slow for every request
- Redis-only: Data loss on crash, no audit trail

---

### Decision 6: Email Service Integration

**Decision**: Abstracted via environment-based provider (SendGrid default)
**Rationale**:
- SendGrid has Python SDK, reliable, good DX
- AWS SES alternative for cost-sensitive deployments
- Abstracted in `EmailService` class for testing

**Alternatives Considered**:
- In-house SMTP: Operational burden
- Multiple providers: Over-engineering for MVP

---

## Data Model

### Entities

**User**
- id (UUID, primary key)
- email (string, unique, indexed)
- password_hash (string, bcrypt)
- name (string)
- phone (string, optional)
- bio (string, optional)
- profile_photo_url (string, optional)
- user_type (enum: "seeker" | "owner")
- created_at (timestamp)
- updated_at (timestamp)
- email_verified (boolean, default=false)
- email_verified_at (timestamp, nullable)
- is_active (boolean, default=true)
- last_login_at (timestamp, nullable)

**Session**
- id (UUID, primary key)
- user_id (UUID, foreign key → User)
- access_token (string, JWT)
- refresh_token (string, JWT)
- ip_address (string)
- user_agent (string)
- created_at (timestamp)
- expires_at (timestamp)
- is_active (boolean)

**AuditLog**
- id (UUID, primary key)
- user_id (UUID, nullable - some events pre-auth)
- event_type (enum: "login_success" | "login_failure" | "logout" | "password_reset" | "token_refresh" | "account_created")
- ip_address (string)
- user_agent (string)
- details (JSON, for event-specific data)
- created_at (timestamp)

**PasswordReset**
- id (UUID, primary key)
- user_id (UUID, foreign key → User)
- reset_token (string, unique, 32-byte random)
- created_at (timestamp)
- expires_at (timestamp)
- used_at (timestamp, nullable)

**EmailVerification**
- id (UUID, primary key)
- user_id (UUID, foreign key → User)
- verification_token (string, unique, 32-byte random)
- created_at (timestamp)
- expires_at (timestamp)
- verified_at (timestamp, nullable)

---

## API Contracts

### Authentication Endpoints

**POST /auth/register**
- Request: `{ email, password, name, user_type }`
- Response: `{ id, email, name, user_type, created_at }`
- Returns: 201 Created
- Side effect: Sends verification email

**POST /auth/login**
- Request: `{ email, password }`
- Response: `{ access_token, refresh_token, expires_in, user: { id, email, name } }`
- Returns: 200 OK
- Rate limit: 3 attempts per 10 minutes per email

**POST /auth/refresh**
- Request: `{ refresh_token }`
- Response: `{ access_token, refresh_token, expires_in }`
- Returns: 200 OK
- Authorization: No auth header needed (uses refresh_token in body)

**POST /auth/logout**
- Request: (empty body)
- Response: `{ message: "Logged out successfully" }`
- Returns: 200 OK
- Authorization: Bearer token required

**POST /auth/password/reset-request**
- Request: `{ email }`
- Response: `{ message: "Password reset link sent to email" }`
- Returns: 200 OK (always, even if email not found - security)

**POST /auth/password/confirm-reset**
- Request: `{ reset_token, new_password }`
- Response: `{ message: "Password reset successful" }`
- Returns: 200 OK

**POST /auth/verify-email**
- Request: `{ verification_token }`
- Response: `{ message: "Email verified successfully" }`
- Returns: 200 OK

### Profile Endpoints

**GET /users/{user_id}/profile**
- Authorization: Bearer token (own user or admin)
- Response: User object with all fields
- Returns: 200 OK

**PUT /users/{user_id}/profile**
- Request: `{ name, phone, bio, profile_photo_url, preferences }`
- Response: Updated user object
- Returns: 200 OK
- Authorization: Bearer token (own user only)

**GET /users/{user_id}** (public profile)
- Response: `{ id, name, user_type, created_at, bio, profile_photo_url }`
- Returns: 200 OK
- Note: No auth required (public profile data only)

---

## Local Development Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (local dev optional)
- Git

### Setup (2 minutes)

```bash
# 1. Clone and navigate
git clone <repo>
cd FormaconIA

# 2. Start services (PostgreSQL, Redis)
docker-compose up -d postgres redis

# 3. Install Python dependencies
cd backend/packages/auth-service
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# 4. Run database migrations
alembic upgrade head

# 5. Start auth service
python -m uvicorn app.main:app --reload --port 8000
```

### Test Registration Flow

```bash
# 1. Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","name":"Test User","user_type":"seeker"}'

# 2. Check email (mock: check logs for verification token)
# In test: verification token is logged

# 3. Verify email
curl -X POST http://localhost:8000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"verification_token":"<token-from-logs>"}'

# 4. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
# Response: { "access_token": "...", "refresh_token": "...", "expires_in": 900 }

# 5. Access protected endpoint
curl -X GET http://localhost:8000/users/1/profile \
  -H "Authorization: Bearer <access_token>"
```

---

## Testing Strategy

### Unit Tests
- Password validation and hashing
- Token generation and validation
- Rate limiter counter logic
- Email validation

### Integration Tests
- Full registration → login → access → logout flow
- Token refresh flow
- Password reset flow
- Rate limiting enforcement
- Audit log creation

### Contract Tests
- OpenAPI compliance (all responses match schema)
- Status codes correct
- Error messages consistent

### Manual Testing (Postman/curl)
- Happy path workflows
- Edge cases (expired tokens, rate limiting)
- Security scenarios (brute force, invalid tokens)

---

## Deployment & Scalability

### Docker Deployment

The auth-service will be containerized:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Scaling Considerations
- **Horizontal**: Multiple auth-service instances behind load balancer (stateless, JWT)
- **Vertical**: Token caching in Redis reduces PostgreSQL queries
- **Monitoring**: Prometheus metrics (login rate, token refresh rate, error rate)

---

## Next Steps

1. ✅ Phase 0 complete: Research and technical decisions
2. ⏭️ Phase 1: Generate data-model.md, API contracts, quickstart.md
3. ⏭️ Phase 2: Run `/speckit.tasks` to generate implementation tasks
4. ⏭️ Phase 3: Implementation via `/speckit.implement`

**Ready for Task Generation**: Run `/speckit.tasks` to generate implementation tasks.

---

**Status**: ✅ Complete | **Next Phase**: `/speckit.tasks` | **Date**: 2026-02-19
