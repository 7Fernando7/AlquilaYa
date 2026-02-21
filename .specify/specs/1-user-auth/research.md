# Phase 0 Research: Authentication System Technical Decisions

**Date**: 2026-02-19
**Status**: Complete (Tech stack decisions already made in TECH-STACK.md)

---

## Overview

This document consolidates research findings that informed the authentication system design. All major technical decisions were made during TECH-STACK.md alignment and are referenced below.

---

## 1. JWT Token Strategy: RS256 vs HS256

### Decision: RS256 (Asymmetric)

**Chosen Approach**: Use RS256 (RSA signing) with public/private key pair

**Rationale**:
- Microservices can verify tokens using public key without sharing secrets
- Private key stays secure on auth-service only
- Follows OAuth2 best practices
- Enables future token delegation (e.g., API keys)

**Implementation Details**:
- Auth-service signs tokens with private key
- Publish public key at `GET /.well-known/jwks.json` (JWKS endpoint)
- Other services verify signatures using public key
- Key rotation strategy: Generate new key pair, maintain both for 30 days

**Alternatives Considered**:
- **HS256** (Symmetric): Requires all services to have secret key. Increases attack surface and makes key rotation complex.
- **HMAC with rotating keys**: More complex without significant benefit.

**References**:
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [JWKS Specification](https://tools.ietf.org/html/rfc7517)

---

## 2. Rate Limiting: Redis vs In-Memory vs Database

### Decision: Redis-Backed Sliding Window

**Chosen Approach**: Use Redis for rate limiting with sliding window counter

**Rationale**:
- Works across multiple auth-service instances (stateless)
- Sub-millisecond latency (100+ checks per request)
- Atomic operations guarantee accuracy
- Supports sliding window (fairer than fixed windows)
- Redis TTL handles automatic cleanup

**Implementation Details**:
- Key: `rate_limit:{email}:login` with value = request count
- Window: 10 minutes (TTL = 600 seconds)
- Limit: 3 failed attempts
- Sliding window: Each request updates timestamp, window slides forward

**Lua Script** (atomic operation):
```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end
if current > limit then
    return 0  -- Rate limited
else
    return 1  -- OK
end
```

**Alternatives Considered**:
- **In-Memory**: Only works for single instance, fails under load balancing
- **Database**: Too slow (10-50ms per check), not suitable for rate limiting
- **Token Bucket**: More complex, similar results to sliding window
- **Leaky Bucket**: Complex state management, sliding window simpler

**References**:
- [Redis Rate Limiting](https://redis.io/commands/incr)
- [Sliding Window Algorithm](https://en.wikipedia.org/wiki/Sliding_window_protocol)

---

## 3. Password Hashing: bcrypt vs Argon2 vs PBKDF2

### Decision: bcrypt (with Argon2 future upgrade path)

**Chosen Approach**: bcrypt with cost factor 12 for MVP

**Rationale**:
- OWASP recommended and battle-tested
- Cost factor 12 provides good security/speed tradeoff (~100ms per hash)
- Available in Python via `passlib` library
- No external service needed
- Argon2 support available if performance bottleneck (just change cost factor)

**Implementation Details**:
```python
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # ~100ms per hash on modern hardware
)

# Hash password
hashed = pwd_context.hash(password)

# Verify password
is_correct = pwd_context.verify(password, hashed)
```

**Performance**:
- Hash time: ~100ms (acceptable for registration/password reset, rare events)
- Verify time: ~100ms (acceptable for login, <100ms margin in 500ms target)

**Upgrade Path**:
- Future: Switch to Argon2 by changing `schemes=["argon2"]`
- `passlib` supports both transparently

**Alternatives Considered**:
- **PBKDF2**: Older, requires more iterations (slower), less modern
- **scrypt**: Good but less standard library support
- **Argon2**: Better security but slower. Use if bcrypt becomes bottleneck (monitor metrics)
- **External service** (e.g., AWS Cognito): Reduces control, vendor lock-in

**References**:
- [OWASP Password Hashing](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [passlib Documentation](https://passlib.readthedocs.io/)

---

## 4. Email Verification Token: JWT vs Database

### Decision: Database-stored tokens (not JWT)

**Chosen Approach**: Short-lived tokens in PostgreSQL, one-time use

**Rationale**:
- Tokens must be revoked after use (can't revoke JWT without complex state)
- One-time use requirement requires server-side tracking
- Database sufficient for this flow (not latency-critical)
- Enables audit trail (who verified when)

**Implementation Details**:
- Token: 32 random bytes encoded as base64url
- Storage: `EmailVerification` table with `(user_id, token, created_at, expires_at, verified_at)`
- Verification: Check token exists, not expired, not used, then mark used
- Cleanup: Delete all records older than 7 days (nightly job)

**Token Generation**:
```python
import secrets
token = secrets.token_urlsafe(32)  # 32 bytes = 256 bits entropy
```

**Alternatives Considered**:
- **JWT for verification**: Stateless but can't revoke, wrong abstraction
- **Redis only**: Faster but data loss on crash, no compliance audit trail
- **Hybrid** (this choice): Redis cache + PostgreSQL audit trail (best of both)

---

## 5. Session Management: Redis vs Database vs Hybrid

### Decision: Redis (active sessions) + PostgreSQL (audit trail)

**Chosen Approach**: Hybrid approach for optimal performance and compliance

**Rationale**:
- **Redis**: Fast session lookup (is token still valid?), automatic expiration
- **PostgreSQL**: Audit trail for compliance, fraud detection, historical analysis
- Each request checks Redis first (fast path), PostgreSQL for analytics

**Implementation Details**:

Redis Key Structure:
```
session:{user_id}:{session_id} → { token_hash, created_at, expires_at }
Expiry: 7 days (refresh token TTL)
```

PostgreSQL Table:
```
sessions (id, user_id, access_token_hash, refresh_token_hash,
          ip_address, user_agent, created_at, expires_at, is_active)
```

Check on Every Request:
```python
# Fast path: Redis lookup
session = redis.get(f"session:{user_id}:{session_id}")
if session and not session.expired:
    return OK  # Request proceeds

# Slow path: Database (only if Redis miss)
session = db.query(Session).filter(...).first()
if session and not session.expired:
    redis.set(...)  # Repopulate cache
    return OK

# Fallback: Invalid session
return UNAUTHORIZED
```

**Alternatives Considered**:
- **Database-only**: 10-50ms per request, unacceptable for performance target
- **Redis-only**: No audit trail, data loss on crash, compliance issue
- **This choice**: Balances performance, reliability, and compliance

---

## 6. Email Service: SendGrid vs AWS SES vs In-House

### Decision: Abstracted via SendGrid (with AWS SES alternative)

**Chosen Approach**: SendGrid as default, AWS SES as alternative

**Rationale**:
- **SendGrid**: Good Python SDK, reliable, competitive pricing, excellent documentation
- **AWS SES**: Alternative for AWS-deployed projects (lower cost at scale)
- **Abstracted design**: Easy to switch providers in `.env`
- **No in-house SMTP**: Operational burden, less reliable than managed service

**Implementation Details**:

```python
# app/services/email.py
class EmailService:
    def __init__(self, provider: str = "sendgrid"):
        self.provider = provider

    def send_verification(self, email: str, token: str):
        link = f"https://app.formacion.ai/verify?token={token}"
        message = f"Click here to verify: {link}"

        if self.provider == "sendgrid":
            sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
            sg.send(Mail(to_emails=email, subject="Verify Email", plain_text_content=message))
        elif self.provider == "aws_ses":
            ses = boto3.client('ses')
            ses.send_email(Source="noreply@formacion.ai", Destinations=[email], ...)
```

**Configuration**:
```env
EMAIL_PROVIDER=sendgrid  # or aws_ses
SENDGRID_API_KEY=...
AWS_SES_REGION=eu-west-1  # For Spanish region
```

**Cost Estimation**:
- SendGrid: Free tier (100/day), then $0.0005 per email
- AWS SES: Free tier (62,000/month), then $0.0001 per email
- Estimate for 10k users: ~500 verification + password reset emails/month = <$1/month

**Alternatives Considered**:
- **In-house SMTP**: Operational complexity, require mail server, DKIM/SPF setup
- **Single provider lock-in**: Risk if provider goes down
- **This choice**: Flexibility + reliability

---

## 7. Session Concurrency: Allow Multiple vs Force Single

### Decision: Allow multiple concurrent sessions (with logout-all option)

**Chosen Approach**: User can have multiple active sessions across devices

**Rationale**:
- Better UX (login on desktop and mobile simultaneously)
- More secure (compromised mobile session doesn't force re-login everywhere)
- Matches modern app patterns (Gmail, GitHub)
- Logout-all for emergency security

**Implementation Details**:
```
Session ID: UUID per login event
User can have multiple active sessions
Redis key: session:{user_id}:{session_id}
Logout: Delete specific session
Logout-all: Delete all sessions for user
```

**Alternatives Considered**:
- **Single session per user**: Force logout elsewhere (bad UX, frustrating)
- **This choice**: More flexible, users prefer it

---

## 8. Token Expiry Times: 15min access / 7day refresh

### Decision: Short-lived access tokens (15 min), longer refresh tokens (7 days)

**Chosen Approach**: JWT tokens with two-tier expiry strategy

**Rationale**:
- **Access token 15 min**: Limits damage if token stolen (attacker has 15 min window)
- **Refresh token 7 days**: Balances security with UX (users don't re-login weekly)
- **Standard industry**: OAuth2 and OpenID Connect standard
- **Mitigates token theft**: Frequent rotation reduces exposure

**Implementation Details**:
```python
access_token = create_access_token(user_id, expires_delta=timedelta(minutes=15))
refresh_token = create_refresh_token(user_id, expires_delta=timedelta(days=7))
```

**Flow**:
1. User logs in → receive both tokens
2. Access token used for API requests
3. After 15 min, access token expires
4. Client uses refresh token → get new access token
5. Repeat step 3-4 for 7 days
6. After 7 days, refresh token expires → require full login

**Alternatives Considered**:
- **Longer access token (1 hour)**: Increases theft window
- **Shorter refresh token (1 day)**: Worse UX, more re-logins
- **Single token (no refresh)**: No way to handle expiry gracefully
- **This choice**: Industry standard balance

---

## 9. Password Requirements: Strength Rules

### Decision: 8 chars + uppercase + lowercase + number + special char

**Chosen Approach**: OWASP-aligned password rules

**Rationale**:
- **8 characters**: NIST minimum (previous 6-8 being phased out)
- **Uppercase + lowercase**: Increases entropy
- **Number + special char**: Further entropy increase
- **Total entropy**: ~50 bits (acceptable for authentication)

**Implementation Details**:
```python
PASSWORD_REQUIREMENTS = {
    'min_length': 8,
    'require_uppercase': True,
    'require_lowercase': True,
    'require_digit': True,
    'require_special': True,
    'special_chars': '!@#$%^&*()_+-=[]{}|;:,.<>?'
}

def validate_password(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain uppercase letter"
    # ... etc
```

**Alternatives Considered**:
- **No special char requirement**: Weaker passwords
- **Longer (12+ chars)**: Better security but worse UX
- **Entropy estimation**: More complex, subjective
- **This choice**: OWASP recommended, good balance

---

## 10. Audit Logging: What to Log

### Decision: All auth events with IP, user agent, outcome

**Chosen Approach**: Comprehensive audit trail for compliance and fraud detection

**Rationale**:
- **Compliance**: GDPR, financial regulations may require audit trail
- **Fraud detection**: Unusual login patterns (location, time, device)
- **Incident response**: Trace account compromise
- **Analytics**: Understand user behavior (failed login rate, etc.)

**Events Logged**:
- `login_success`: Successful authentication
- `login_failure`: Failed password, locked account, etc.
- `password_reset`: Password changed
- `token_refresh`: Token refreshed
- `logout`: User logged out
- `account_created`: Registration completed
- `email_verified`: Email verification completed
- `account_locked`: Too many login attempts

**Data Logged**:
```json
{
    "event_type": "login_success",
    "user_id": "uuid",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2026-02-19T10:30:00Z",
    "details": {
        "session_id": "uuid",
        "device_type": "desktop/mobile",
        "location": "Madrid, Spain"  // optional, if geo-lookup enabled
    }
}
```

**Retention**: 90 days default, 1 year for compliance audit, then delete

---

## Summary: Recommended Tech Stack for Auth

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Web Framework | FastAPI | 0.100+ | Async, modern, excellent for microservices |
| Database | PostgreSQL | 14+ | ACID, JSON support, reliability |
| Cache/Queue | Redis | 7+ | Session management, rate limiting |
| ORM | SQLAlchemy | 2.0+ | Type hints, async support |
| Data Validation | Pydantic | 2.0+ | FastAPI integrated, excellent DX |
| JWT | python-jose | 3.3+ | JWT creation/verification |
| Password Hashing | passlib | 1.7+ | bcrypt, Argon2 support |
| Testing | pytest | 7+ | Async support, fixtures |
| Email | SendGrid SDK | - | Reliable, good API |
| API Documentation | OpenAPI 3.1 | - | Auto-generated from FastAPI |

---

**Status**: ✅ Complete
**Next**: Phase 1 Design (data-model.md, API contracts)
