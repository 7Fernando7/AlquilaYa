# Data Model: User Authentication System

**Date**: 2026-02-19
**Status**: Complete
**Database**: PostgreSQL 14+

---

## Entity Relationship Diagram

```
┌─────────────┐
│    User     │
├─────────────┤
│ id (PK)     │◄─────────┐
│ email       │          │
│ password    │          ├─── 1:N ──► Session
│ name        │          │
│ user_type   │          │
│ created_at  │          │
│ ...         │          ├─── 1:N ──► AuditLog
│             │          │
│             │          ├─── 1:N ──► PasswordReset
│             │          │
│             │          └─── 1:N ──► EmailVerification
└─────────────┘
```

---

## Entity Definitions

### User

Represents a registered user on the platform.

**Fields**:

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | UUID | PK, auto | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, indexed | Login identifier, must be verified |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hash of password (never store plaintext) |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `phone` | VARCHAR(20) | NULLABLE | User phone number |
| `bio` | TEXT | NULLABLE | User biography (for public profile) |
| `profile_photo_url` | VARCHAR(500) | NULLABLE | URL to profile photo (stored in S3/CDN) |
| `user_type` | ENUM('seeker', 'owner') | NOT NULL, indexed | Distinguish renter vs landlord |
| `is_active` | BOOLEAN | NOT NULL, default=true | Soft delete flag |
| `email_verified` | BOOLEAN | NOT NULL, default=false | Has email been verified? |
| `email_verified_at` | TIMESTAMP | NULLABLE | When was email verified |
| `created_at` | TIMESTAMP | NOT NULL, default=now() | Account creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, default=now() | Last profile update |
| `last_login_at` | TIMESTAMP | NULLABLE | Last successful login |

**Indexes**:
- `email` (UNIQUE)
- `user_type` (for analytics queries)
- `created_at` (for user growth analytics)
- `is_active` (for filtering active users)

**Validation Rules**:
- `email`: Valid email format, unique, lowercase normalized
- `password_hash`: Never NULL, bcrypt format
- `name`: 1-255 characters, not blank
- `user_type`: Only 'seeker' or 'owner'
- `email_verified`: Must be true to allow login (FR-004)
- `phone`: Optional but if present, valid format

**State Transitions**:
```
NEW ACCOUNT
    ↓ (register)
UNVERIFIED EMAIL (created_at set, email_verified=false)
    ↓ (click verification link)
ACTIVE (email_verified=true, email_verified_at set)
    ↓ (admin action)
INACTIVE (is_active=false, soft delete)
```

---

### Session

Represents an active login session (per device).

**Fields**:

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | UUID | PK, auto | Session identifier |
| `user_id` | UUID | FK→User, NOT NULL, indexed | Which user |
| `access_token` | TEXT | NOT NULL | JWT access token (signed) |
| `refresh_token` | TEXT | NOT NULL, unique indexed | JWT refresh token (signed) |
| `ip_address` | VARCHAR(45) | NOT NULL | Client IP (IPv4/IPv6) |
| `user_agent` | VARCHAR(500) | NOT NULL | Browser/app identifier |
| `created_at` | TIMESTAMP | NOT NULL, default=now() | Login time |
| `expires_at` | TIMESTAMP | NOT NULL, indexed | Refresh token expiry (7 days) |
| `is_active` | BOOLEAN | NOT NULL, default=true | Session still valid? |

**Indexes**:
- `(user_id, id)` - Find all sessions for user
- `refresh_token` - UNIQUE, fast lookup for token refresh
- `expires_at` - Find expired sessions for cleanup
- `user_id` - Analytics: sessions per user

**Validation Rules**:
- `access_token`: Valid JWT format, signed by auth-service
- `refresh_token`: Valid JWT format, signed, unique
- `ip_address`: Valid IPv4 or IPv6
- `user_agent`: Not empty
- `expires_at`: >= created_at, typically 7 days later

**Relationships**:
- FK `user_id` → User(id) (delete user cascades to sessions)

**Cleanup**:
- Delete sessions with `expires_at < now()` daily
- Delete sessions with `is_active = false` and `updated_at < 30 days ago`

---

### AuditLog

Records all security-relevant authentication events.

**Fields**:

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | UUID | PK, auto | Log entry ID |
| `user_id` | UUID | FK→User, NULLABLE, indexed | Which user (null for pre-auth events) |
| `event_type` | ENUM(...) | NOT NULL, indexed | Event classification |
| `ip_address` | VARCHAR(45) | NOT NULL | Source IP |
| `user_agent` | VARCHAR(500) | NOT NULL | Client identifier |
| `details` | JSONB | NULLABLE | Event-specific data |
| `created_at` | TIMESTAMP | NOT NULL, default=now(), indexed | Event timestamp |

**Event Types** (ENUM values):
- `account_created` - New user registration
- `email_verified` - Email verification successful
- `login_success` - Successful login
- `login_failure` - Failed login (wrong password, account locked, etc.)
- `token_refresh` - Refresh token used
- `password_reset_requested` - Password reset initiated
- `password_reset_confirmed` - Password reset completed
- `logout` - User logout
- `account_locked` - Too many login attempts
- `account_unlocked` - Account lock released

**Details (JSONB Examples)**:

```json
// login_success
{
    "session_id": "uuid",
    "user_type": "seeker",
    "device_type": "desktop"
}

// login_failure
{
    "reason": "invalid_password",
    "attempt_number": 1
}

// account_locked
{
    "failed_attempts": 3,
    "until": "2026-02-19T11:00:00Z"
}

// password_reset_confirmed
{
    "method": "email"
}
```

**Indexes**:
- `user_id` - Audit trail for specific user
- `event_type` - Analytics by event type
- `created_at` - Time-series queries
- `(user_id, created_at)` - User's recent activity

**Retention Policy**:
- Keep for 90 days (configurable)
- Quarterly archive to cold storage
- Delete after 1 year

---

### PasswordReset

Manages pending password reset requests.

**Fields**:

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | UUID | PK, auto | Record ID |
| `user_id` | UUID | FK→User, NOT NULL, indexed | Which user |
| `reset_token` | VARCHAR(255) | UNIQUE, NOT NULL, indexed | Reset link token |
| `created_at` | TIMESTAMP | NOT NULL, default=now() | Request time |
| `expires_at` | TIMESTAMP | NOT NULL, indexed | Token expiry (24 hours) |
| `used_at` | TIMESTAMP | NULLABLE | When was reset completed? |

**Validation Rules**:
- `reset_token`: 32 random bytes, base64url encoded, unique
- `expires_at`: 24 hours after created_at
- `used_at`: Must be NULL until reset is used, then set to now()

**Constraints**:
- Only one valid reset per user (previous ones invalidated on new request)
- Token is single-use (can't reset twice with same token)

**Usage Flow**:
1. User requests reset → create PasswordReset with reset_token
2. Email reset_token to user
3. User clicks link with reset_token → validate token, allow password change
4. On password change → set used_at = now(), delete all other resets for user
5. Cleanup: Delete all resets with used_at < 7 days ago or expires_at < now()

---

### EmailVerification

Manages pending email verification requests.

**Fields**:

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | UUID | PK, auto | Record ID |
| `user_id` | UUID | FK→User, NOT NULL, indexed | Which user |
| `verification_token` | VARCHAR(255) | UNIQUE, NOT NULL, indexed | Verification link token |
| `created_at` | TIMESTAMP | NOT NULL, default=now() | Request time |
| `expires_at` | TIMESTAMP | NOT NULL, indexed | Token expiry (48 hours) |
| `verified_at` | TIMESTAMP | NULLABLE | When verified? |

**Validation Rules**:
- `verification_token`: 32 random bytes, base64url encoded, unique
- `expires_at`: 48 hours after created_at
- `verified_at`: Must be NULL until verified

**Usage Flow**:
1. User registers → create EmailVerification with token, set User.email_verified=false
2. Email verification_token to user
3. User clicks link → validate token (not expired, not used)
4. On verification success → set User.email_verified=true, User.email_verified_at=now(), EmailVerification.verified_at=now()
5. Auto-cleanup: Delete all unverified accounts with created_at > 48 hours and verified_at IS NULL

---

## Database Schema (SQL)

```sql
-- Create ENUM types
CREATE TYPE user_type_enum AS ENUM ('seeker', 'owner');
CREATE TYPE audit_event_enum AS ENUM (
    'account_created', 'email_verified', 'login_success', 'login_failure',
    'token_refresh', 'password_reset_requested', 'password_reset_confirmed',
    'logout', 'account_locked', 'account_unlocked'
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    bio TEXT,
    profile_photo_url VARCHAR(500),
    user_type user_type_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- AuditLog table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type audit_event_enum NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500) NOT NULL,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);

-- PasswordReset table
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP
);

CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);

-- EmailVerification table
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP
);

CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);
```

---

## Data Constraints & Validation

### User Data
- Email must be valid format and unique (case-insensitive stored)
- Password never stored plaintext, only bcrypt hash
- name must not be empty
- user_type must be one of: seeker, owner

### Session Data
- user_id must reference existing user
- expires_at must be in future (checked at login)
- refresh_token must be cryptographically unique

### Audit Log Data
- event_type must be valid enum
- user_id nullable for pre-auth events
- details must be valid JSON

### PasswordReset Data
- reset_token must be cryptographically unique
- expires_at typically 24 hours from created_at
- Can only be used once (used_at must be null)

---

## Migration Strategy

**Approach**: Alembic migrations (SQLAlchemy)

**Initial Migration** (1_initial_schema.py):
- Create all tables, indexes, enums, sequences

**Subsequent Migrations**:
- Version each change
- Include rollback logic
- Test on staging before production

**Example Migration**:
```python
# alembic/versions/2_add_user_phone.py
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))

def downgrade():
    op.drop_column('users', 'phone')
```

---

## Performance Considerations

### Indexes Strategy
- Every foreign key is indexed
- Email indexed (login lookup)
- user_type indexed (statistics queries)
- created_at indexed (time-series queries)
- refresh_token unique indexed (login refresh)
- Composite indexes for common queries (user_id, created_at)

### Query Optimization
- Batch operations where possible (delete expired tokens)
- Use EXPLAIN ANALYZE for slow queries
- Monitor slow query log

### Scaling
- Partition audit_logs by month if > 1GB
- Archive old audit logs to cold storage
- Connection pooling (pgbouncer) for multiple services

---

**Status**: ✅ Complete
**Next**: API Contracts (OpenAPI schemas)
