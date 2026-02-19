# Security Guide - FormaconIA Auth Service

This document outlines the security practices and considerations for the authentication service.

## Overview

The auth service implements industry-standard security measures:

- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT authentication (RS256 asymmetric signing)
- ✅ Rate limiting on sensitive endpoints
- ✅ Email verification for new accounts
- ✅ Session tracking and logout
- ✅ Comprehensive audit logging
- ✅ HTTPS/TLS enforcement (production)
- ✅ CORS configuration
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ CSRF protection (stateless JWT)

## Password Security

### Password Hashing Algorithm

**Algorithm**: bcrypt with 12 rounds
- **Cost Factor**: 12 rounds (~100ms per hash)
- **Salt**: Automatically generated and included
- **Adaptive**: Becomes slower as hardware improves

### Why bcrypt?

1. **Slow by Design**: Prevents brute-force attacks
   - 100ms per hash = 10 hashes per second
   - Cracking 1 million passwords takes ~28 hours
2. **Salting**: Prevents rainbow table attacks
3. **Adaptive Cost**: Cost factor can increase as hardware improves
4. **Industry Standard**: Used by major platforms

### Password Requirements

Enforced at registration:
```
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
```

**Rationale**: NIST guidelines recommend length + complexity over forced special characters, but we use both for maximum security.

### Password Handling

```python
# Never log passwords
logger.info(f"Login for {email}")  # Good
logger.info(f"Login with password {password}")  # NEVER

# Never store plaintext
user.password = "plaintext"  # WRONG
user.password = bcrypt_hash(password)  # Correct

# Always use constant-time comparison
if bcrypt.checkpw(input_password, stored_hash):  # Correct
if input_password == stored_password:  # WRONG (timing attack)
```

### Long Password Handling

Passwords longer than 72 bytes are pre-hashed:

```python
if len(password.encode()) > 72:
    # bcrypt truncates at 72 bytes, so we pre-hash to preserve entropy
    password = hashlib.sha256(password.encode()).hexdigest()
return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

## JWT Token Security

### Token Algorithm

**Algorithm**: RS256 (RSA Signature with SHA-256)
- **Key Size**: 2048-bit RSA keys
- **Signing**: Private key only (on auth server)
- **Verification**: Public key (can be distributed)

### Why RS256?

1. **Asymmetric**: Private key never leaves auth server
2. **Distributed**: Public key can be shared with other services
3. **Microservices**: Any service can verify tokens without sharing secrets
4. **Signature**: Proves token wasn't tampered with

### Token Structure

```
Header: {
  "alg": "RS256",
  "typ": "JWT"
}

Payload: {
  "sub": "user-id-uuid",           // Subject (user ID)
  "email": "user@example.com",     // Email claim
  "iat": 1708325400,                // Issued at time
  "exp": 1708326300                 // Expiration time
}

Signature: HMAC(base64(header) + "." + base64(payload), private_key)
```

### Token Expiry Strategy

**Access Token**:
- **Expiry**: 15 minutes
- **Usage**: Authorization header (`Authorization: Bearer <token>`)
- **Rotation**: Refresh before expiry using refresh token
- **Compromise**: Limited damage if leaked (15 min window)

**Refresh Token**:
- **Expiry**: 7 days
- **Usage**: Only in `/auth/refresh` endpoint
- **Storage**: HTTP-only, secure cookie (not accessible to JavaScript)
- **Compromise**: User must be present to obtain new tokens

### Token Validation

```python
# 1. Signature verification (using public key)
# 2. Expiration check (exp claim)
# 3. Session active check (database lookup)
# 4. User still exists check

# All must pass for token to be valid
```

### Key Rotation

Current implementation:
- Private/public keys generated once and committed to repo (development)
- Production: Load keys from secure key management service

Future implementation:
- Automated key rotation (quarterly)
- Multiple key versions (support old tokens during rotation)
- Key versioning in JWT header

## Rate Limiting

### Implementation

Redis-based distributed rate limiting with exponential backoff:

```python
# Example: Failed login attempts
if rate_limiter.check_rate_limit(f"login:{email}", max_attempts=3, window=600):
    # Lock account for 15 minutes
    rate_limiter.lock(f"login:{email}", duration=900)
    raise RateLimitError("Account locked due to failed login attempts")
```

### Rate Limits Applied

| Endpoint | Limit | Window | Action |
|----------|-------|--------|--------|
| POST /auth/register | 5 requests | 1 minute/IP | 429 Too Many Requests |
| POST /auth/login | 3 failures | 10 minutes/email | 15 min account lock |
| POST /auth/refresh | 100 requests | 1 hour/user | 429 Too Many Requests |
| POST /auth/password/reset-request | 5 requests | 1 hour/IP | 429 Too Many Requests |
| POST /auth/resend-verification | 3 requests | 1 hour/email | 429 Too Many Requests |

### Bypass Considerations

Rate limiting is applied client-side and server-side:
- **Client**: Debounce button clicks to prevent accidental spam
- **Server**: Hard limits regardless of client behavior
- **Distributed**: Redis ensures limits across all service instances

### False Positive Handling

Shared IP address (corporate network, VPN):
```python
# User can request IP whitelist via support
# Or use device-specific credentials (API keys)
```

## Email Verification

### Purpose

1. **Validate Email**: Ensure user controls email
2. **Account Creation**: Prevent spam registrations
3. **Account Recovery**: Proof of ownership for password reset

### Implementation

1. **Token Generation**: Cryptographically random (UUID.hex)
2. **Token Storage**: Database with `is_used` flag
3. **Token Expiry**: 48 hours
4. **One-Time Use**: Token marked as used after verification

### Email Verification Link Format

```
https://app.formacionia.ai/verify?token=<UUID_HEX>
```

### Security Considerations

```python
# GOOD: Token is random and unique
token = uuid4().hex

# BAD: Token is guessable
token = user_id + timestamp  # Attacker could enumerate

# GOOD: Token expires
if datetime.utcnow() > token.expires_at:
    raise ExpiredToken()

# BAD: Token never expires
# User could keep using old verification link
```

## Session Management

### Session Tracking

Sessions stored in database to enable stateless logout:

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  access_token VARCHAR UNIQUE,
  refresh_token VARCHAR UNIQUE,
  ip_address VARCHAR,         -- For compromise detection
  user_agent VARCHAR,         -- For device tracking
  is_active BOOLEAN,          -- For logout
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### Logout Mechanism

**Logout**: Mark session `is_active = False`

```python
# GET /users/{id}/profile with Authorization header
# 1. Extract token
# 2. Verify JWT signature
# 3. Check Session.is_active == True (if False, reject with 401)
# 4. Return data
```

### Multi-Device Logout

```python
# Logout all sessions for user (e.g., after password reset)
sessions = db.query(Session).filter(
    Session.user_id == user_id,
    Session.is_active == True
)
sessions.update({"is_active": False})
db.commit()

# User must login again on all devices
```

### Session Expiry Cleanup

Automatic cleanup of expired sessions (via scheduled task):

```python
# Remove sessions older than 7 days
db.query(Session).filter(
    Session.expires_at < datetime.utcnow()
).delete()
```

## Audit Logging

### Purpose

1. **Compliance**: Meet regulatory requirements (GDPR, HIPAA, etc.)
2. **Forensics**: Investigate security incidents
3. **Fraud Detection**: Identify suspicious patterns
4. **Performance**: Monitor endpoint usage

### Events Logged

| Event | Logged Data | Purpose |
|-------|-------------|---------|
| account_created | user_id, email, user_type | Track user creation |
| email_verified | user_id, email | Compliance |
| login_success | user_id, ip, user_agent | Usage tracking |
| login_failure | email, ip, reason | Fraud detection |
| token_refresh | user_id, ip | Session tracking |
| password_reset_requested | email, ip | Compliance |
| password_reset_confirmed | user_id, ip | Compliance |
| logout | user_id, ip | Session tracking |

### Query Examples

Detect brute force attacks:
```sql
SELECT ip_address, COUNT(*) as attempts
FROM audit_logs
WHERE event_type = 'login_failure'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY attempts DESC;
```

Detect unauthorized access:
```sql
SELECT user_id, ip_address, COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs
WHERE event_type = 'login_success'
AND created_at > NOW() - INTERVAL '1 day'
GROUP BY user_id
HAVING COUNT(DISTINCT ip_address) > 5;  -- Unusual for normal user
```

### Privacy Considerations

Audit logs contain:
- ❌ NOT passwords, tokens, or sensitive data
- ✅ Event type, user ID, IP, user-agent, timestamp
- ✅ Reason for failure (e.g., "invalid password")

Retention policy:
- **Default**: Keep indefinitely (for forensics)
- **GDPR**: Retention per compliance requirements
- **User Deletion**: Anonymize audit logs after user deletion

## HTTPS/TLS (Production)

### Requirement

✅ HTTPS must be enforced in production.

### Configuration

```python
# Redirect HTTP to HTTPS
@app.middleware("http")
async def https_redirect(request: Request, call_next):
    if request.url.scheme == "http" and not settings.debug:
        url = request.url.replace(scheme="https")
        return RedirectResponse(url=url, status_code=301)
    return await call_next(request)
```

### TLS Version

Minimum TLS 1.2 (recommend TLS 1.3):
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
```

### Certificate Management

- **Staging**: Self-signed or Let's Encrypt
- **Production**: Let's Encrypt or commercial CA
- **Renewal**: Automated with certbot

## CORS (Cross-Origin Resource Sharing)

### Configuration

Restrict requests to known origins:

```python
# .env.staging
ALLOWED_ORIGINS=https://staging.formacionia.ai,https://staging-app.formacionia.ai,http://localhost:3000

# Production
ALLOWED_ORIGINS=https://formacionia.ai,https://app.formacionia.ai
```

### Why Restrict CORS?

1. **Prevents CSRF**: Only allows known origins
2. **API Protection**: Prevents abuse from unknown sites
3. **Data Leakage**: Prevents accidental exposure

### CORS Configuration Code

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # Explicit list
    allow_credentials=True,                   # Allow cookies
    allow_methods=["GET", "POST", "PUT"],    # Explicit methods
    allow_headers=["Authorization", "Content-Type"],  # Explicit headers
)
```

## SQL Injection Prevention

### ORM Protection

SQLAlchemy ORM automatically parameterizes queries:

```python
# SAFE: Using ORM
user = db.query(User).filter(User.email == email).first()

# SAFE: Using parameterized query
query = "SELECT * FROM users WHERE email = ?"
db.execute(query, [email])

# DANGEROUS: String concatenation (NEVER do this)
query = f"SELECT * FROM users WHERE email = '{email}'"
db.execute(query)
```

### Best Practices

- Always use ORM or parameterized queries
- Never concatenate user input into queries
- Use `.filter()` for WHERE clauses
- Use `.values()` for column selection

## CSRF Protection

### How JWT Protects Against CSRF

Traditional CSRF:
1. Attacker tricks user into clicking link
2. Browser automatically includes cookies
3. Request succeeds without user knowledge

JWT is immune:
1. Attacker tricks user into clicking link
2. Browser doesn't automatically include JWT
3. Request fails (no Authorization header)

### No CSRF Token Needed

Because we use JWT (not session cookies), CSRF tokens are not required:
```python
# Using JWT = CSRF protected automatically
Authorization: Bearer <jwt_token>

# Not using session cookies = Safe from CSRF
```

## Authentication Middleware

### Token Validation

```python
async def get_current_user(
    credentials: HTTPAuthenticationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    # 1. Extract token from Authorization header
    token = credentials.credentials

    # 2. Verify JWT signature (public key)
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
    except jwt.InvalidSignatureError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 3. Check token not expired
    try:
        exp = payload["exp"]
        if datetime.utcfromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Token expired")
    except KeyError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 4. Check session still active
    session = db.query(Session).filter(
        Session.access_token == token,
        Session.is_active == True  # Critical check
    ).first()

    if not session:
        raise HTTPException(status_code=401, detail="Session invalidated")

    # 5. Return user info from token
    return {
        "user_id": payload["sub"],
        "email": payload["email"]
    }
```

## Authorization (Access Control)

### User Can Only Access Own Data

```python
@router.get("/users/{user_id}/profile")
async def get_profile(
    user_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    # Authorization check
    if user_id != UUID(current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Return profile
    return profile
```

### Public vs. Private Data

```python
# GET /users/{user_id}/profile → Private (auth required)
# Returns: email, phone, bio, photo (all data)

# GET /users/{user_id} → Public (no auth required)
# Returns: id, name, photo_url, user_type (only public data)
```

## Error Handling & Information Leakage

### Safe Error Messages

```python
# GOOD: Doesn't reveal if email exists
@router.post("/auth/password/reset-request")
async def reset_request(email: str):
    return {
        "message": "Password reset email sent",
        "email": email  # Always return, even if user doesn't exist
    }

# BAD: Reveals if email is registered
@router.post("/auth/password/reset-request")
async def reset_request(email: str):
    if user_exists(email):
        send_email()
        return {"message": "Email sent"}
    else:
        return {"message": "Email not found"}  # Information leak!
```

### Logging Sensitive Data

```python
# GOOD: Don't log passwords or tokens
logger.info(f"Login attempt for {email}")

# BAD: Leaks credentials
logger.info(f"Login: {email}:{password}")
logger.error(f"Invalid token: {token}")
```

### Exception Details

```python
# GOOD: Generic error for client
try:
    result = operation()
except Exception as e:
    logger.error(f"Operation failed: {e}", exc_info=True)  # Log details
    raise HTTPException(
        status_code=500,
        detail="Internal server error"  # Generic for client
    )
```

## Dependency Vulnerabilities

### Dependency Scanning

```bash
# Check for known vulnerabilities
pip install pip-audit
pip-audit

# Or use GitHub's dependency scanner
# Enable in: Settings → Security & analysis
```

### Regular Updates

```bash
# Check for updates
pip list --outdated

# Update all packages
pip install --upgrade -r requirements.txt

# Pin specific versions for production stability
# requirements.txt: package==1.2.3 (exact version)
```

## Secret Management

### Secrets

```python
# Private Key: Never commit to repo
# - Generate locally during setup
# - Store in secure key management (production)
# - Listed in .gitignore

# Environment Variables: Never commit
# - SENDGRID_API_KEY
# - SECRET_KEY
# - DATABASE_URL (with credentials)
# - REDIS_PASSWORD

# Loaded from: .env file (in .gitignore)
```

### How to Handle

```bash
# Good: Use environment variables
export SENDGRID_API_KEY="your-key"
python -m uvicorn app.main:app

# Bad: Hardcode in code
SENDGRID_API_KEY = "your-key"  # NEVER

# Bad: Commit to git
git add .env  # NEVER

# Good: .gitignore prevents this
.env
*.pem
```

## Security Checklist

Before deploying to production:

- [ ] HTTPS/TLS enabled
- [ ] All secrets in environment variables
- [ ] Database password changed from default
- [ ] JWT keys generated and secured
- [ ] CORS origins restricted to known domains
- [ ] Rate limiting configured and enabled
- [ ] Audit logging enabled and monitored
- [ ] Error messages don't leak information
- [ ] Passwords hashed with bcrypt
- [ ] Tokens use RS256 (asymmetric)
- [ ] Sessions invalidated on logout
- [ ] Email verification required
- [ ] Password reset tokens one-time use
- [ ] Monitoring and alerting configured
- [ ] Regular backups tested
- [ ] Incident response plan documented
- [ ] Security headers configured
- [ ] Dependencies scanned for vulnerabilities

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT create a public GitHub issue**
2. Email: `security@formacionia.ai`
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

We will:
1. Acknowledge receipt within 24 hours
2. Confirm the vulnerability
3. Develop a fix
4. Release a patched version
5. Credit you in release notes (if desired)

## References

- **NIST Password Guidelines**: https://pages.nist.gov/800-63-3/sp800-63b.html
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **JWT Best Practices**: https://tools.ietf.org/html/rfc8949
- **bcrypt Guide**: https://en.wikipedia.org/wiki/Bcrypt
- **CWE/SANS Top 25**: https://cwe.mitre.org/top25/

---

**Last Updated**: 2026-02-19
**Version**: 0.1.0
**Security Level**: Production-Ready
