# Auth Service Architecture

This document describes the high-level architecture of the FormaconIA Authentication Service.

## System Overview

The authentication service is a **stateless, horizontally scalable** microservice that handles:
- User registration and email verification
- Login with JWT token issuance
- Token refresh without re-authentication
- Secure logout with session invalidation
- Password reset with email verification
- User profile management
- Comprehensive audit logging

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Application                        │
│               (Web / Mobile / Internal Service)             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Layer (Routes)                        │ │
│  │  ├─ /auth/register ─────────────────────────────┐     │ │
│  │  ├─ /auth/login ───────────────────────────────┤     │ │
│  │  ├─ /auth/refresh ─────────────────────────────┤────►│ │
│  │  ├─ /auth/logout ──────────────────────────────┤     │ │
│  │  ├─ /auth/verify-email ────────────────────────┤     │ │
│  │  ├─ /auth/password/* ──────────────────────────┤     │ │
│  │  ├─ /users/{id}/profile ──────────────────────┤     │ │
│  │  └─ /health ───────────────────────────────────┘     │ │
│  │                                                        │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │ Middleware                                     │   │ │
│  │  │ ├─ CORS (Cross-Origin Resource Sharing)       │   │ │
│  │  │ ├─ Error Handling (Global Exception Handler)  │   │ │
│  │  │ ├─ Logging (Request/Response)                 │   │ │
│  │  │ └─ Rate Limiting                              │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │ Authentication & Authorization                │   │ │
│  │  │ ├─ JWT Token Validation (RS256)               │   │ │
│  │  │ ├─ HTTPBearer Authentication                  │   │ │
│  │  │ ├─ Session Status Checking                    │   │ │
│  │  │ └─ Cross-User Access Prevention               │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Service Layer (Business Logic)                │ │
│  │  ├─ AuthService                                       │ │
│  │  │  ├─ register() → User + send email                │ │
│  │  │  ├─ login() → JWT tokens + Session record         │ │
│  │  │  ├─ refresh() → New access token                  │ │
│  │  │  ├─ logout() → Invalidate session                 │ │
│  │  │  └─ logout_all_sessions() → Multi-device logout   │ │
│  │  │                                                    │ │
│  │  ├─ UserService                                       │ │
│  │  │  ├─ create_user() → User with hashed password    │ │
│  │  │  ├─ get_user_by_id() / get_user_by_email()       │ │
│  │  │  └─ update_profile() → Profile changes           │ │
│  │  │                                                    │ │
│  │  ├─ PasswordService                                  │ │
│  │  │  ├─ hash_password() → bcrypt hash                │ │
│  │  │  └─ verify_password() → Boolean                  │ │
│  │  │                                                    │ │
│  │  ├─ EmailService (Abstract + Implementations)        │ │
│  │  │  ├─ SendGridEmailService → Production email      │ │
│  │  │  ├─ MockEmailService → Development/Testing       │ │
│  │  │  └─ AWS SES (future) → Alternative provider      │ │
│  │  │                                                    │ │
│  │  └─ AuditService                                     │ │
│  │     ├─ log_event() → Generic audit log              │ │
│  │     ├─ log_login_*() → Login events                 │ │
│  │     └─ log_password_*() → Password reset events     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Data Access Layer (SQLAlchemy ORM)          │ │
│  │                                                        │ │
│  │  Models:                                              │ │
│  │  ├─ User → Accounts with hashed passwords            │ │
│  │  ├─ EmailVerification → One-time tokens              │ │
│  │  ├─ PasswordReset → One-time reset tokens            │ │
│  │  ├─ Session → Active sessions for logout tracking    │ │
│  │  └─ AuditLog → Security event history                │ │
│  │                                                        │ │
│  │  Query Helpers:                                       │ │
│  │  ├─ get_db() → Database session                      │ │
│  │  └─ init_db() → Initialize on startup                │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         External Services & Integrations              │ │
│  │  ├─ PostgreSQL (Primary Data Store)                  │ │
│  │  ├─ Redis (Session Cache, Rate Limiting)            │ │
│  │  ├─ SendGrid (Email Delivery)                       │ │
│  │  └─ File System (JWT Keys: private.pem, public.pem) │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Principles

### 1. **Stateless Service**
- No session state stored in memory
- All state in database (PostgreSQL) or cache (Redis)
- Enables horizontal scaling (multiple instances)
- Requests can be routed to any instance

### 2. **Separation of Concerns**
- **Routes**: HTTP request handling only
- **Services**: Business logic (validation, token generation, etc.)
- **Models**: Data persistence (database representation)
- **Schemas**: Data validation (request/response contracts)

### 3. **Security by Default**
- Passwords hashed with bcrypt (slow, salted)
- JWT tokens signed with RSA (asymmetric)
- Sessions tracked to enable stateless logout
- Audit logging for forensics and compliance
- Rate limiting on sensitive endpoints

### 4. **Dependency Injection**
- Using FastAPI's `Depends()` mechanism
- Database sessions injected into routes
- Email service abstraction for flexibility
- Easy to mock for testing

## Data Flow Examples

### Registration Flow

```
User Registration Request
        ↓
POST /auth/register
├─ Validate request (email format, password strength)
├─ Hash password (bcrypt)
├─ Create User record (PostgreSQL)
├─ Create EmailVerification token
├─ Send email via SendGrid
└─ Return 201 Created with User object
```

### Login Flow

```
User Login Request
        ↓
POST /auth/login
├─ Fetch User by email
├─ Verify password (bcrypt check)
├─ Check email_verified flag
├─ Generate Access Token (RS256, 15 min)
├─ Generate Refresh Token (RS256, 7 days)
├─ Create Session record (PostgreSQL)
└─ Return tokens + user info
```

### Protected Endpoint Request

```
GET /users/{id}/profile with Authorization header
        ↓
Authorization Middleware (get_current_user)
├─ Extract token from "Authorization: Bearer <token>"
├─ Verify JWT signature using public key
├─ Check Session.is_active == True (not logged out)
├─ Extract user_id from JWT claims
├─ Return user info to route handler
        ↓
Route Handler
├─ Verify user can access this resource
├─ Fetch and return user profile
└─ Log audit event (if sensitive operation)
```

### Logout Flow

```
User Logout Request with Token
        ↓
POST /auth/logout with Authorization header
├─ Extract access token from header
├─ Find Session record with this token
├─ Set Session.is_active = False
├─ Commit to database
└─ Return success
        ↓
Future Requests with Same Token
├─ Authorization Middleware checks Session.is_active
├─ Finds is_active == False
├─ Rejects request with 401 Unauthorized
└─ User must login again
```

## Authentication Mechanisms

### JWT (JSON Web Token) - RS256

**Why RS256 (asymmetric)?**
- Private key stays on auth server (signing)
- Public key can be distributed (verification)
- Enables verification in other microservices
- Better security in distributed systems

**Token Structure**:
```
Header: {
  "alg": "RS256",
  "typ": "JWT"
}

Payload: {
  "sub": "user-id-uuid",
  "email": "user@example.com",
  "iat": 1708325400,           // Issued at
  "exp": 1708326300            // Expires in 15 minutes
}

Signature: HMAC(base64(header) + "." + base64(payload), private_key)
```

**Token Expiry Strategy**:
- Access Token: 15 minutes (short-lived, limited damage if leaked)
- Refresh Token: 7 days (longer-lived, used to get new access tokens)
- User must provide refresh token to get new access token
- Prevents infinite access from single token leak

### Session Management

**Problem**: JWT is stateless, but we need to revoke access on logout.

**Solution**: Session table tracks active tokens
```
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  access_token VARCHAR UNIQUE,
  refresh_token VARCHAR UNIQUE,
  ip_address VARCHAR,         -- Detect compromised accounts
  user_agent VARCHAR,         -- Detect device changes
  is_active BOOLEAN,          -- Revoked on logout
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

**Logout Mechanism**:
1. User logs out → Mark session `is_active = False`
2. Future request with same token → Middleware checks `is_active`
3. If `is_active = False` → Reject request with 401 Unauthorized

**Multi-Device Logout**:
- User can logout all sessions simultaneously
- Set `is_active = False` for all Session records where `user_id = ?`
- User cannot use any device until re-login

## Error Handling

### Global Exception Handler

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for unexpected errors"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

**Why this approach?**
- Never leak sensitive info in error messages
- Log full details server-side for debugging
- Return generic message to client
- Consistent error format

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET /health |
| 201 | Created | POST /register |
| 400 | Bad Request | Invalid password format |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Accessing other user's data |
| 409 | Conflict | Email already registered |
| 500 | Server Error | Database connection failed |

## Database Schema

### Core Tables

**users**:
- Stores user accounts
- email: Unique, indexed for fast login lookups
- hashed_password: Bcrypt hash (never store plaintext)
- email_verified: Boolean flag (required to login)
- user_type: ENUM (seeker, owner, agency, admin)

**email_verifications**:
- Stores verification tokens
- token: Cryptographically random, unique
- is_used: Boolean (prevent token reuse)
- expires_at: Time-based validity (48 hours default)
- Deleted after use (cleanup via scheduled task)

**password_resets**:
- Stores password reset tokens
- token: Unique per reset request
- is_used: Boolean (one-time use)
- expires_at: Time-based validity (24 hours)
- Deleted after use (cleanup via scheduled task)

**sessions**:
- Stores active sessions for logout tracking
- access_token: JWT token (unique, indexed)
- refresh_token: For token refresh (unique)
- is_active: Boolean (False = logged out)
- ip_address: Client IP (security: detect account takeover)
- user_agent: Browser/client info (security: detect device changes)
- Cleaned up when expired

**audit_logs**:
- Stores security events for compliance and forensics
- event_type: One of (account_created, email_verified, login_success, etc.)
- user_id: Nullable (login_failure may not have user ID yet)
- ip_address: Client IP (indexed for analysis)
- user_agent: Client info
- details: JSON (custom data for each event type)
- created_at: Timestamp (indexed for time-range queries)
- Never deleted (immutable audit trail)

### Indexes for Performance

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Token cleanup (find expired)
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);

-- Session tracking
CREATE INDEX idx_sessions_user_id_is_active ON sessions(user_id, is_active);
CREATE INDEX idx_sessions_access_token ON sessions(access_token);

-- Audit analysis
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
```

## Scalability Considerations

### Horizontal Scaling

The service can scale horizontally (multiple instances) because:

1. **No in-memory state**: All state in PostgreSQL/Redis
2. **Load balancing**: Any instance can handle any request
3. **Stateless routes**: No session affinity required
4. **Database handles concurrency**: ACID transactions, connection pooling

```
┌─────────────────────────────────────┐
│      Load Balancer (Nginx)          │
│     (Round-robin, health checks)    │
└────────┬────────────────────────────┘
         │
    ┌────┴────┬────────────┬────────┐
    ▼         ▼            ▼        ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│Instance│Instance│Instance│Instance│
│   1    │   2    │   3    │   N    │
└────────┘└────────┘└────────┘└────────┘
    │         │         │        │
    └─────────┴────────┬────────┘
                       ▼
                ┌─────────────────┐
                │   PostgreSQL    │
                │   (Primary)     │
                └─────────────────┘
                       │
                       ▼
                ┌─────────────────┐
                │     Redis       │
                │   (Cache)       │
                └─────────────────┘
```

### Performance Optimization

**Connection Pooling** (PostgreSQL):
```python
engine = create_engine(
    database_url,
    pool_size=20,          # Keep 20 connections ready
    max_overflow=40,       # Allow up to 40 additional connections
    pool_pre_ping=True,    # Test connections before use
    pool_recycle=3600,     # Recycle after 1 hour (prevents idle disconnect)
)
```

**Caching** (Redis):
- Session lookups cached for fast logout checks
- Rate limit counters in Redis (atomic increment operations)
- Could cache user profiles (future optimization)

**Database Indexes**:
- Fast email lookups for login (~O(1))
- Fast token lookups for refresh/logout (~O(1))
- Fast audit log queries by event type, time range

## Security Architecture

### Password Security

**Algorithm**: bcrypt with 12 rounds
- ~100ms per hash (intentionally slow)
- Automatic salt generation
- Adaptive cost (becomes slower as hardware improves)

**Long Password Handling**:
```python
# Passwords > 72 bytes: pre-hash with SHA256
if len(password.encode()) > 72:
    password = hashlib.sha256(password.encode()).hexdigest()
return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

### Token Security

**Access Token**:
- Short-lived (15 minutes)
- Contains user ID and email claims
- Signed with private key (RS256)
- Should be stored in memory (not localStorage) by frontend

**Refresh Token**:
- Longer-lived (7 days)
- Used only to get new access tokens
- Stored in HTTP-only, secure cookie (httpOnly flag prevents JS access)
- Cannot be used directly as access token

### Rate Limiting

**Implementation**: Redis-based counters with exponential backoff

```
Failed Login Attempts:
├─ 1 failed: Wait 0 seconds
├─ 2 failed: Wait 0 seconds
├─ 3 failed: Lock for 15 minutes (prevent brute force)

Registration Attempts (per IP):
├─ 5 per minute (prevent spam)

Password Reset Requests (per IP):
├─ 10 per hour (prevent email spam)
```

## Observability

### Logging Strategy

**Levels**:
- **ERROR**: Login failures, database errors, exceptions
- **WARNING**: Rate limits reached, token near expiration
- **INFO**: Successful operations, startup/shutdown
- **DEBUG**: Request/response details, SQL queries

**Structured Logging**:
```python
logger.info(
    "User login successful",
    extra={
        "user_id": user.id,
        "email": user.email,
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
    }
)
```

### Audit Logging

**Purpose**: Security compliance, forensics, fraud detection

**Events Tracked**:
- account_created: New user registered
- email_verified: Email verification completed
- login_success: Successful login
- login_failure: Failed login (email/password wrong, rate limit, etc.)
- token_refresh: Token refresh operation
- password_reset_requested: Password reset initiated
- password_reset_confirmed: Password reset completed
- logout: User logout

**Data Captured**:
- Event type
- User ID (if authenticated)
- IP address
- User-agent (browser/device)
- Custom details (reason for failure, etc.)
- Timestamp

### Health Checks

**Endpoint**: `GET /health`

```json
{
  "status": "healthy",
  "service": "FormaconIA Auth Service",
  "version": "0.1.0"
}
```

**Usage**: Docker health checks, load balancer checks, monitoring

## Future Enhancements

### Phase Roadmap

1. **OAuth2 / OpenID Connect** (federation with external providers)
2. **Multi-factor Authentication** (2FA, TOTP)
3. **Social Login** (Google, GitHub, Facebook)
4. **API Keys** (for service-to-service auth)
5. **Role-Based Access Control (RBAC)** (fine-grained permissions)
6. **Single Sign-On (SSO)** (centralized auth across platform)
7. **SAML Support** (enterprise authentication)

### Potential Integrations

- **Monitoring**: Prometheus metrics, ELK Stack for logs
- **Analytics**: User behavior tracking, heatmaps
- **Fraud Detection**: Machine learning for suspicious patterns
- **Notifications**: SMS 2FA, push notifications
- **Identity Verification**: Third-party KYC/AML providers

---

**Architecture Last Updated**: 2026-02-19
**Version**: 0.1.0
