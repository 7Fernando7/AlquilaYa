# Tasks: User Authentication & Registration System

**Input**: Design documents from `/specs/1-user-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, research.md ✅, quickstart.md ✅
**Branch**: `1-user-auth`
**Status**: Ready for implementation

---

## Format Reference

- **[P]**: Task can run in parallel (different files, no dependencies on incomplete tasks)
- **[USx]**: User story this task belongs to (US1, US2, US3...)
- **File paths**: Absolute or relative to repo root

---

## Dependency Graph

```
Phase 1: Setup
    ↓
Phase 2: Foundational (Database, JWT, rate limiting, email service)
    ↓
├─ Phase 3: US1 (Registration + Email Verification) [P1] 🎯 MVP
│   ↓
├─ Phase 4: US2 (Login) [P1] 🎯 MVP
│   ↓
├─ Phase 5: US3 (Token Refresh) [P1] 🎯 MVP
│   ↓
├─ Phase 6: US4 (Password Reset) [P2] [PARALLEL with US6]
├─ Phase 7: US6 (Logout) [P2] [PARALLEL with US4, US5]
├─ Phase 8: US5 (Profile Management) [P2] [PARALLEL with US4, US6]
│   ↓
└─ Phase 9: US7 (Audit Logging) [P3]
    ↓
Phase 10: Polish & Documentation
```

**Parallel Execution Groups**:
- **Group A** (can run simultaneously after Phase 2): US1, US2, US3 (they don't depend on each other)
- **Group B** (can run simultaneously after US3): US4, US5, US6 (they don't depend on each other)
- **Group C** (after Group B): US7 (depends on all auth infrastructure)

---

## Phase 1: Setup & Project Structure

**Purpose**: Initialize project structure and configure build tools

- [ ] T001 Create project directory structure per plan.md in `backend/packages/auth-service/`
- [ ] T002 Initialize Python project with Poetry/pip, create `requirements.txt` with FastAPI, SQLAlchemy, Pydantic, uvicorn
- [ ] T003 [P] Create `.env.example` template in `backend/packages/auth-service/.env.example`
- [ ] T004 [P] Create `Makefile` in `backend/packages/auth-service/` with dev, test, lint, format targets
- [ ] T005 [P] Create `.gitignore` for Python project (venv, __pycache__, .env, *.pyc)
- [ ] T006 [P] Set up `app/` package structure: `__init__.py`, `main.py`, and subdirectories (api, models, services, schemas, middleware, database)
- [ ] T007 [P] Create `tests/` directory structure: unit/, integration/, contract/, conftest.py
- [ ] T008 [P] Set up `alembic/` for database migrations: `alembic init`
- [ ] T009 Create pytest configuration in `pytest.ini` with asyncio mode, markers, test discovery
- [ ] T010 [P] Set up linting tools: `.flake8`, `pyproject.toml` with black/isort config

**Checkpoint**: Project structure ready, dependencies installed

---

## Phase 2: Foundational Infrastructure (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story implementation

**⚠️ CRITICAL**: No user story work can begin until ALL Phase 2 tasks are complete

### Database & ORM Setup

- [ ] T011 Create database connection module in `backend/packages/auth-service/app/database/connection.py`
  - PostgreSQL connection pool using SQLAlchemy
  - Connection string from environment variable
  - Session factory for dependency injection
- [ ] T012 [P] Create SQLAlchemy Base and sessionmaker in `backend/packages/auth-service/app/database/__init__.py`
- [ ] T013 Create Alembic migration template in `alembic/versions/1_initial_schema.py`
  - SQL DDL for all 5 tables (User, Session, AuditLog, PasswordReset, EmailVerification)
  - Include all indexes from data-model.md
  - Include constraints and foreign keys
- [ ] T014 Run Alembic upgrade: `alembic upgrade head` to verify migration syntax

### Authentication Infrastructure

- [ ] T015 Create JWT utility module in `backend/packages/auth-service/app/utils/jwt.py`
  - Token creation (access + refresh)
  - Token validation and payload extraction
  - RS256 signing with private/public key pair
  - Key generation and JWKS endpoint
- [ ] T016 [P] Create password utility module in `backend/packages/auth-service/app/utils/password.py`
  - Password hashing with bcrypt (cost=12)
  - Password verification
  - Password strength validation (8 chars, uppercase, number, special char)
- [ ] T017 [P] Create token blacklist/session manager in `backend/packages/auth-service/app/utils/token_manager.py`
  - Redis integration for session storage
  - Session lookup by token
  - Session invalidation

### Redis & Rate Limiting Setup

- [ ] T018 Create Redis client module in `backend/packages/auth-service/app/database/redis.py`
  - Redis connection from environment variable
  - Connection pool
  - Error handling
- [ ] T019 [P] Create rate limiter module in `backend/packages/auth-service/app/middleware/rate_limiter.py`
  - Redis-backed sliding window counter
  - Lua script for atomic operations
  - Rate limit enforcement (3 attempts per 10 minutes per email)

### Email Service Setup

- [ ] T020 Create email service interface in `backend/packages/auth-service/app/services/email.py`
  - Abstract EmailService class
  - SendGrid implementation
  - Template support for verification, password reset emails
  - Error handling and retry logic

### API Framework Setup

- [ ] T021 Create FastAPI application in `backend/packages/auth-service/app/main.py`
  - FastAPI app initialization
  - CORS middleware configuration
  - Request/response logging
  - Health check endpoint: `GET /health`
- [ ] T022 [P] Create error handling middleware in `backend/packages/auth-service/app/middleware/error_handler.py`
  - Global exception handler
  - Standard error response format
  - HTTP status code mapping
- [ ] T023 [P] Create request/response logging middleware in `backend/packages/auth-service/app/middleware/audit_logger.py`
  - Log all requests/responses
  - Capture IP address, user agent
  - Time request duration

### Base Models & Schemas

- [ ] T024 Create Pydantic base schemas in `backend/packages/auth-service/app/schemas/__init__.py`
  - BaseRequest, BaseResponse classes
  - Error response schema
  - Pagination schemas (if needed)
- [ ] T025 [P] Create SQLAlchemy Base model in `backend/packages/auth-service/app/models/base.py`
  - Common fields (id, created_at, updated_at)
  - Base class for all models

### Configuration & Environment

- [ ] T026 Create configuration module in `backend/packages/auth-service/app/config.py`
  - Pydantic Settings for environment variables
  - Database URL, Redis URL, JWT secret, email provider config
  - Environment-specific settings (dev, test, prod)

**Checkpoint**: Foundation complete
- ✅ Database schema created and migrated
- ✅ JWT infrastructure ready
- ✅ Redis and rate limiting ready
- ✅ Email service abstraction ready
- ✅ FastAPI app with middleware ready
- ✅ Can now proceed to user story implementation

---

## Phase 3: User Story 1 - User Registration with Email Verification (Priority: P1) 🎯 MVP

**Goal**: New users can register with email/password, receive verification email, and activate account

**Independent Test**: Create account, receive verification email, click link, verify email successfully

**Use Case Flow**:
1. User submits registration form (email, password, name, user_type)
2. System validates inputs, checks email uniqueness
3. System creates unverified user account
4. System sends verification email with link
5. User clicks link with verification token
6. System marks email as verified
7. User can now log in

### User Story 1: Database Models

- [ ] T027 [P] [US1] Create User model in `backend/packages/auth-service/app/models/user.py`
  - Fields: id, email, password_hash, name, phone, bio, profile_photo_url, user_type, is_active, email_verified, email_verified_at, created_at, updated_at, last_login_at
  - Constraints: email UNIQUE, email NOT NULL, user_type enum
  - Indexes: email, user_type, created_at, is_active
  - Methods: verify_email(), set_password(), validate_password()
- [ ] T028 [P] [US1] Create EmailVerification model in `backend/packages/auth-service/app/models/email_verification.py`
  - Fields: id, user_id (FK), verification_token, created_at, expires_at, verified_at
  - Constraints: verification_token UNIQUE
  - Methods: is_valid(), mark_verified()

### User Story 1: Services

- [ ] T029 [US1] Create UserService in `backend/packages/auth-service/app/services/user.py` (depends on T027)
  - `create_user(email, password, name, user_type)` → User (unverified)
  - `get_user_by_email(email)` → User or None
  - `get_user_by_id(id)` → User or None
  - Error handling: EmailAlreadyExists, InvalidEmail, WeakPassword
- [ ] T030 [US1] Create AuthService in `backend/packages/auth-service/app/services/auth.py` (depends on T029, T016)
  - `register(email, password, name, user_type)` → User (sends verification email)
  - `verify_email(token)` → User (marks verified)
  - `resend_verification_email(email)` → User
  - Error handling: InvalidToken, TokenExpired, AlreadyVerified
- [ ] T031 [P] [US1] Implement EmailService integration in `backend/packages/auth-service/app/services/email.py`
  - `send_verification_email(user, token)` → success/failure
  - Template rendering for verification email
  - Error handling: SendGridError, EmailNotSent

### User Story 1: API Endpoints

- [ ] T032 [US1] Create auth routes module in `backend/packages/auth-service/app/api/routes/auth.py` (depends on T030, T031)
  - `POST /auth/register` - Request: {email, password, name, user_type}, Response: {id, email, name, user_type, created_at}
  - `POST /auth/verify-email` - Request: {verification_token}, Response: {message}
  - `POST /auth/resend-verification` - Request: {email}, Response: {message}
  - Rate limiting: 5 requests per minute per IP
  - Error responses: 400 (validation), 409 (email exists), 422 (invalid data)
- [ ] T033 [P] [US1] Create request/response schemas in `backend/packages/auth-service/app/schemas/auth.py`
  - RegisterRequest: email, password, name, user_type
  - RegisterResponse: id, email, name, user_type, created_at
  - VerifyEmailRequest: verification_token
  - VerifyEmailResponse: message

### User Story 1: Testing (OPTIONAL)

- [ ] T034 [P] [US1] Contract test for registration in `backend/packages/auth-service/tests/contract/test_auth_register.py`
  - Test POST /auth/register returns 201 with correct schema
  - Test email validation (invalid format, too long)
  - Test user_type validation (only seeker/owner)
- [ ] T035 [P] [US1] Integration test for registration flow in `backend/packages/auth-service/tests/integration/test_registration_flow.py`
  - Test: register → verify email → account is activated
  - Test: unverified user cannot login
  - Test: resend verification email
- [ ] T036 [P] [US1] Unit tests for UserService in `backend/packages/auth-service/tests/unit/test_user_service.py`
  - Test create_user with valid data
  - Test create_user with duplicate email
  - Test email verification token validation

**Checkpoint**: User Story 1 complete
- ✅ Users can register
- ✅ Verification emails sent
- ✅ Email verification tokens validated
- ✅ Can independently test registration flow

---

## Phase 4: User Story 2 - User Login with JWT Tokens (Priority: P1) 🎯 MVP

**Goal**: Registered users can log in and receive JWT access and refresh tokens

**Independent Test**: Login with valid credentials → receive tokens → use access token on protected endpoint

**Use Case Flow**:
1. User submits email and password
2. System authenticates (verify password hash)
3. System checks if email is verified
4. System creates session and issues JWT tokens
5. System returns access_token (15 min) and refresh_token (7 days)

### User Story 2: Database Models

- [ ] T037 [P] [US2] Create Session model in `backend/packages/auth-service/app/models/session.py`
  - Fields: id, user_id (FK), access_token, refresh_token, ip_address, user_agent, created_at, expires_at, is_active
  - Constraints: refresh_token UNIQUE
  - Methods: is_valid(), invalidate(), is_expired()

### User Story 2: Services

- [ ] T038 [US2] Create authentication logic in `backend/packages/auth-service/app/services/auth.py` (extends T030, depends on T015, T037)
  - `login(email, password, ip_address, user_agent)` → {access_token, refresh_token, expires_in}
  - `validate_credentials(email, password)` → User or raise InvalidCredentials
  - Error handling: InvalidCredentials, EmailNotVerified, AccountLocked, RateLimited
- [ ] T039 [P] [US2] Create SessionService in `backend/packages/auth-service/app/services/session.py`
  - `create_session(user, access_token, refresh_token, ip, user_agent)` → Session
  - `get_session(token)` → Session or None
  - `invalidate_session(token)` → None
  - Error handling: SessionNotFound, SessionExpired
- [ ] T040 [P] [US2] Integrate rate limiting into auth flow in `backend/packages/auth-service/app/middleware/rate_limiter.py`
  - Rate limit failed login attempts: 3 per 10 minutes per email
  - Lock account after 3 failures for 15 minutes
  - Log lock events to AuditLog

### User Story 2: API Endpoints

- [ ] T041 [US2] Create login endpoint in `backend/packages/auth-service/app/api/routes/auth.py` (depends on T038, T040)
  - `POST /auth/login` - Request: {email, password}, Response: {access_token, refresh_token, expires_in}
  - Capture IP address and user agent
  - Log successful/failed attempts
  - Return 401 (invalid credentials) or 403 (email not verified)
- [ ] T042 [P] [US2] Update schemas in `backend/packages/auth-service/app/schemas/auth.py`
  - LoginRequest: email, password
  - LoginResponse: access_token, refresh_token, expires_in, token_type
  - TokenPayload: user_id, exp, iat

### User Story 2: Authentication Middleware

- [ ] T043 [P] [US2] Create JWT verification middleware in `backend/packages/auth-service/app/api/dependencies.py`
  - `get_current_user(token)` → User (dependency for protected endpoints)
  - Extract and validate JWT payload
  - Check token expiration
  - Raise 401 if invalid/expired
- [ ] T044 [P] [US2] Create auth routes module structure in `backend/packages/auth-service/app/api/__init__.py`
  - Import all route modules
  - Attach to FastAPI router

### User Story 2: Testing (OPTIONAL)

- [ ] T045 [P] [US2] Contract test for login in `backend/packages/auth-service/tests/contract/test_auth_login.py`
  - Test POST /auth/login returns 200 with tokens
  - Test invalid credentials returns 401
  - Test unverified email returns 403
- [ ] T046 [P] [US2] Integration test for login flow in `backend/packages/auth-service/tests/integration/test_login_flow.py`
  - Test: register → verify → login → tokens received
  - Test: rate limiting after 3 failed attempts
  - Test: account lock after rate limit exceeded
- [ ] T047 [P] [US2] Unit tests for SessionService in `backend/packages/auth-service/tests/unit/test_session_service.py`
  - Test create_session
  - Test get_session
  - Test invalidate_session

**Checkpoint**: User Story 2 complete
- ✅ Users can log in
- ✅ JWT tokens issued
- ✅ Rate limiting prevents brute force
- ✅ Can independently test login flow

---

## Phase 5: User Story 3 - Refresh Token & Token Refresh (Priority: P1) 🎯 MVP

**Goal**: Access tokens can be refreshed using refresh tokens without re-entering credentials

**Independent Test**: Login → access token expires → use refresh token → get new access token

**Use Case Flow**:
1. User submits refresh_token
2. System validates token (not expired, valid signature)
3. System creates new access_token (same user_id)
4. System returns new access_token (and optionally new refresh_token)

### User Story 3: Services

- [ ] T048 [US3] Create token refresh logic in `backend/packages/auth-service/app/services/auth.py` (extends T038, depends on T015)
  - `refresh_access_token(refresh_token)` → {access_token, expires_in}
  - Validate refresh token signature and expiration
  - Create new access token
  - Error handling: InvalidToken, TokenExpired, UserNotFound

### User Story 3: API Endpoints

- [ ] T049 [US3] Create refresh endpoint in `backend/packages/auth-service/app/api/routes/auth.py` (depends on T048)
  - `POST /auth/refresh` - Request: {refresh_token}, Response: {access_token, expires_in}
  - No authorization header required
  - Invalidate old refresh token (optional, for extra security)
  - Return 401 if refresh token invalid/expired

### User Story 3: Testing (OPTIONAL)

- [ ] T050 [P] [US3] Contract test for token refresh in `backend/packages/auth-service/tests/contract/test_auth_refresh.py`
  - Test POST /auth/refresh returns 200 with new token
  - Test expired refresh token returns 401
- [ ] T051 [P] [US3] Integration test for token refresh flow in `backend/packages/auth-service/tests/integration/test_token_refresh.py`
  - Test: login → wait for access token expiry → refresh → get new token
  - Test: use expired token → refresh → new token works

**Checkpoint**: User Story 3 complete
- ✅ Access tokens can be refreshed
- ✅ Users don't need to re-login frequently
- ✅ Can independently test refresh flow

**MVP Checkpoint**: US1, US2, US3 complete = **MINIMUM VIABLE PRODUCT**
- ✅ Users can register, verify email, login
- ✅ JWT authentication working
- ✅ Token refresh working
- **Ready for MVP launch**

---

## Phase 6: User Story 4 - Password Reset (Priority: P2)

**Goal**: Users can reset forgotten passwords via email link

**Independent Test**: Request password reset → receive email → click link → set new password → login with new password

**Use Case Flow**:
1. User requests password reset with email
2. System generates reset token and sends email
3. User clicks reset link with token
4. User enters new password
5. System validates token and updates password
6. User can login with new password

### User Story 4: Database Models

- [ ] T052 [P] [US4] Create PasswordReset model in `backend/packages/auth-service/app/models/password_reset.py`
  - Fields: id, user_id (FK), reset_token, created_at, expires_at, used_at
  - Constraints: reset_token UNIQUE
  - Methods: is_valid(), mark_used()

### User Story 4: Services

- [ ] T053 [US4] Create password reset logic in `backend/packages/auth-service/app/services/auth.py` (extends T030, depends on T052)
  - `request_password_reset(email)` → sends reset email
  - `confirm_password_reset(token, new_password)` → updates password
  - Invalidate all existing reset tokens for user
  - Error handling: UserNotFound, InvalidToken, TokenExpired, WeakPassword
- [ ] T054 [P] [US4] Implement password reset email in EmailService

### User Story 4: API Endpoints

- [ ] T055 [US4] Create password reset endpoints in `backend/packages/auth-service/app/api/routes/password.py` (depends on T053)
  - `POST /auth/password/reset-request` - Request: {email}, Response: {message}
  - `POST /auth/password/confirm-reset` - Request: {reset_token, new_password}, Response: {message}
- [ ] T056 [P] [US4] Update schemas in `backend/packages/auth-service/app/schemas/auth.py`
  - PasswordResetRequest: email
  - PasswordResetConfirmRequest: reset_token, new_password

### User Story 4: Testing (OPTIONAL)

- [ ] T057 [P] [US4] Integration test for password reset in `backend/packages/auth-service/tests/integration/test_password_reset.py`
  - Test: request reset → verify email received → confirm reset → login with new password

---

## Phase 7: User Story 6 - Logout & Token Invalidation (Priority: P2)

**Goal**: Users can logout and invalidate their tokens for security

**Independent Test**: Login → logout → token no longer works on protected endpoints

**Use Case Flow**:
1. User submits logout request with access token
2. System invalidates session and tokens
3. System returns success message
4. Subsequent requests with old token are rejected

### User Story 6: Services

- [ ] T058 [US6] Create logout logic in `backend/packages/auth-service/app/services/session.py` (extends T039)
  - `logout(user_id)` → invalidates all sessions (logout-all option)
  - `logout_current_session(token)` → invalidates specific session
  - Remove tokens from Redis
  - Error handling: SessionNotFound

### User Story 6: API Endpoints

- [ ] T059 [US6] Create logout endpoint in `backend/packages/auth-service/app/api/routes/auth.py` (depends on T058)
  - `POST /auth/logout` - Response: {message}
  - Requires valid access token (Authorization header)
  - Invalidate all tokens for user
- [ ] T060 [P] [US6] Update schemas for logout response

### User Story 6: Testing (OPTIONAL)

- [ ] T061 [P] [US6] Integration test for logout in `backend/packages/auth-service/tests/integration/test_logout.py`
  - Test: login → logout → old token rejected on protected endpoint

---

## Phase 8: User Story 5 - User Profile Management (Priority: P2)

**Goal**: Users can view and update their profile information

**Independent Test**: Login → view profile → update profile → changes persisted

**Use Case Flow**:
1. User requests their profile (with access token)
2. System returns user data
3. User submits profile updates
4. System validates and persists changes
5. System returns updated profile

### User Story 5: Services

- [ ] T062 [US5] Create profile management in UserService in `backend/packages/auth-service/app/services/user.py` (extends T029)
  - `get_profile(user_id)` → User object
  - `update_profile(user_id, name, phone, bio, photo_url, preferences)` → User (updated)
  - Role-specific field validation (seeker vs owner)
  - Error handling: UserNotFound, ValidationError

### User Story 5: API Endpoints

- [ ] T063 [US5] Create profile routes in `backend/packages/auth-service/app/api/routes/profile.py` (depends on T062, T043)
  - `GET /users/{user_id}/profile` - Response: {id, email, name, phone, bio, photo_url, user_type, created_at}
  - `PUT /users/{user_id}/profile` - Request: {name, phone, bio, photo_url}, Response: updated user
  - `GET /users/{user_id}` (public) - Response: {id, name, bio, photo_url, user_type} (no email)
  - Requires valid access token for own profile
- [ ] T064 [P] [US5] Update schemas for profile endpoints

### User Story 5: Testing (OPTIONAL)

- [ ] T065 [P] [US5] Integration test for profile management in `backend/packages/auth-service/tests/integration/test_profile.py`
  - Test: get profile, update profile, verify changes

---

## Phase 9: User Story 7 - Security Audit Logging (Priority: P3)

**Goal**: All authentication events are logged for security monitoring and compliance

**Independent Test**: Perform login → verify audit log entry created with IP, user agent, timestamp

**Use Case Flow**:
1. Every auth event (login, logout, password reset, token refresh) creates AuditLog entry
2. Log includes: event type, user ID, IP address, user agent, timestamp, details (JSON)
3. Logs are queryable for security analysis

### User Story 7: Database Models

- [ ] T066 [P] [US7] Create AuditLog model in `backend/packages/auth-service/app/models/audit_log.py`
  - Fields: id, user_id (nullable), event_type (enum), ip_address, user_agent, details (JSONB), created_at
  - Indexes: user_id, event_type, created_at
  - Methods: log_event(event_type, user_id, ip, user_agent, details)

### User Story 7: Services

- [ ] T067 [US7] Create audit logging in `backend/packages/auth-service/app/services/audit.py`
  - `log_event(event_type, user_id, ip_address, user_agent, details)` → AuditLog
  - Auto-called from all auth services
  - Error handling: LoggingError (non-blocking)

### User Story 7: Middleware Integration

- [ ] T068 [P] [US7] Integrate audit logging into auth service calls
  - Modify AuthService, SessionService, UserService to call audit_log.log_event()
  - Log events: account_created, email_verified, login_success, login_failure, token_refresh, password_reset, logout
  - Capture request context (IP, user agent)

### User Story 7: Testing (OPTIONAL)

- [ ] T069 [P] [US7] Unit tests for audit logging in `backend/packages/auth-service/tests/unit/test_audit_log.py`
  - Test AuditLog creation
  - Test event_type enum validation
- [ ] T070 [P] [US7] Integration test for audit logging in `backend/packages/auth-service/tests/integration/test_audit_logging.py`
  - Test: login → audit log entry created
  - Test: password reset → audit log entry created

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Finalize implementation, documentation, and production readiness

- [ ] T071 Create comprehensive API documentation in `backend/packages/auth-service/README.md`
  - Setup instructions
  - Environment variables
  - API endpoint reference
  - Common workflows (register, login, refresh, reset password)
- [ ] T072 [P] Add type hints to all Python code (full type coverage)
- [ ] T073 [P] Add comprehensive docstrings to all modules, classes, and functions
- [ ] T074 [P] Run linter and fix style issues: `make lint`, `make format`
- [ ] T075 Create database backup/restore procedures in `backend/packages/auth-service/scripts/`
- [ ] T076 [P] Update Makefile with additional targets: `make migrations`, `make db-reset`
- [ ] T077 Create deployment guide in `DEPLOYMENT.md`
  - Docker build instructions
  - Environment configuration for production
  - Database initialization
  - Health check configuration
- [ ] T078 [P] Add monitoring metrics and logging configuration
  - Prometheus metrics (login rate, token refresh rate, error rate)
  - Structured logging (JSON format for parsing)
- [ ] T079 Review all code for security issues
  - No secrets in code or logs
  - Proper input validation
  - Secure defaults
- [ ] T080 [P] Performance testing
  - Test 1000 concurrent logins
  - Test token refresh rate
  - Load test password reset flow

---

## Testing Summary (OPTIONAL - Complete if TDD requested)

**Test Coverage Target**: 85%+

**Test Files** (if TDD approach used):
- `tests/unit/test_user_service.py` (T036)
- `tests/unit/test_session_service.py` (T047)
- `tests/unit/test_auth_service.py` (password hashing, token creation)
- `tests/unit/test_audit_log.py` (T069)
- `tests/contract/test_auth_register.py` (T034)
- `tests/contract/test_auth_login.py` (T045)
- `tests/contract/test_auth_refresh.py` (T050)
- `tests/integration/test_registration_flow.py` (T035)
- `tests/integration/test_login_flow.py` (T046)
- `tests/integration/test_token_refresh.py` (T051)
- `tests/integration/test_password_reset.py` (T057)
- `tests/integration/test_logout.py` (T061)
- `tests/integration/test_profile.py` (T065)
- `tests/integration/test_audit_logging.py` (T070)

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Phase 3, 4, 5 ONLY** (User Stories 1, 2, 3):
- ✅ User Registration with Email Verification
- ✅ User Login with JWT
- ✅ Token Refresh
- ✅ Protected Endpoints

**Estimated effort**: 80 hours
**Timeline**: 2-3 weeks (2-3 developers)
**Tests**: Recommended (adds 20-30% effort, saves debugging time)

### Incremental Addition After MVP

**Phase 6, 7, 8**: Add in any order (independent)
- Password Reset (10 hours)
- Logout (5 hours)
- Profile Management (10 hours)

**Phase 9**: Audit Logging (15 hours)

### Parallelization Example

**Scenario**: 3 developers available after Phase 2

```
Developer 1: Phase 3 (US1 - Registration) [T027-T036]
Developer 2: Phase 4 (US2 - Login) [T037-T047]
Developer 3: Phase 5 (US3 - Token Refresh) [T048-T051]

Then all 3 continue together on Phase 6-9 as needed
```

**Timeline**: ~12 weeks (1 developer), ~4-5 weeks (3 developers)

---

## Success Criteria (from spec.md)

Each task contributes to these measurable outcomes:

| Criterion | Target | Validated By |
|-----------|--------|--------------|
| Registration time | <2 minutes | Integration test (T035) |
| Login response time | <500ms | Performance test (T080) |
| Token refresh time | <100ms | Performance test (T080) |
| Brute-force prevention | 99% | Rate limiting test (T046) |
| Email delivery | <5 min | Integration test (T035) |
| Concurrent users | 1000+ | Load test (T080) |
| Registration success rate | 95% | Analytics from tests |
| System uptime | 99.9% | Production monitoring |

---

## Dependency Summary

**Critical Path**:
```
T001-T010 (Setup)
    ↓
T011-T026 (Foundation)
    ↓
T027-T036 (US1) + T037-T047 (US2) + T048-T051 (US3) [PARALLEL]
    ↓
T052-T070 (US4, US5, US6, US7) [MOSTLY PARALLEL]
    ↓
T071-T080 (Polish)
```

**Blocking Dependencies**:
- T011-T026 must complete before ANY user story starts
- Within user stories: Models (T027, T037, etc.) must complete before Services
- Services must complete before API endpoints

**No Blocking Between User Stories 1-3** (can implement in parallel after foundation)

---

**Status**: ✅ Ready for implementation
**Total Tasks**: 80
**Estimated Effort**: 140-180 hours (including tests)
**Recommended Team**: 2-3 developers
**Timeline**: 4-6 weeks

**Next Step**: Begin Phase 1 Setup tasks
