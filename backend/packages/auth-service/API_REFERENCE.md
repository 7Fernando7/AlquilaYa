# API Reference - FormaconIA Authentication Service

Complete API documentation with request/response examples for all authentication endpoints.

## Base URL

```
Development:  http://localhost:8001
Staging:      https://staging.formacionia.ai/auth
Production:   https://api.formacionia.ai/auth
```

## Authentication

Most endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Replace `<access_token>` with the JWT token received from the login endpoint.

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

Common HTTP status codes:
- **400**: Bad request (validation error)
- **401**: Unauthorized (invalid/missing token)
- **409**: Conflict (resource already exists)
- **500**: Internal server error

## Endpoints

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Access Control**: Public (no authentication required)

**Rate Limit**: 5 requests per minute per IP

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "user_type": "seeker"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✓ | User email address (must be unique) |
| password | string | ✓ | Minimum 8 chars, uppercase, lowercase, digit, special char |
| name | string | ✓ | User's full name |
| user_type | string | ✓ | One of: "seeker" (renter) or "owner" (landlord) |

**Success Response (201)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "user_type": "seeker",
  "email_verified": false,
  "created_at": "2026-02-19T10:30:00Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid password | Password doesn't meet requirements |
| 400 | Invalid email format | Email is not a valid format |
| 409 | Email already registered | Email already exists in system |
| 500 | Internal server error | Unexpected server error |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "user_type": "seeker"
  }'
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Next Steps**:
1. Check email for verification link
2. Call `/auth/verify-email` with token from email
3. Can then call `/auth/login`

---

### POST /auth/verify-email

Verify user's email address using token from verification email.

**Access Control**: Public

**Rate Limit**: 10 requests per hour per IP

**Request Body**:

```json
{
  "verification_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| verification_token | string | ✓ | Token from verification email link |

**Success Response (200)**:

```json
{
  "message": "Email verified successfully",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid verification token | Token is malformed |
| 400 | Verification token expired | Token expired (48 hour limit) |
| 400 | Verification token already used | Token already verified once |
| 404 | User not found | Token doesn't match any user |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "verification_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Token Source**:
- Sent to user's email after registration
- Contained in verification email link: `https://app.formacionia.ai/verify?token=...`
- Can be resent using `/auth/resend-verification`

---

### POST /auth/resend-verification

Resend verification email if original email was lost or expired.

**Access Control**: Public

**Rate Limit**: 3 requests per hour per email

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✓ | Email address that needs verification |

**Success Response (200)**:

```json
{
  "message": "Verification email sent",
  "email": "user@example.com"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | User not found | Email not registered |
| 400 | Email already verified | User already verified |
| 429 | Too many requests | Rate limit exceeded |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

---

### POST /auth/login

Authenticate user and receive JWT tokens.

**Access Control**: Public

**Rate Limit**: 5 failed attempts per 10 minutes (15 min lockout after 3 failures)

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✓ | User's email address |
| password | string | ✓ | User's password |

**Success Response (200)**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "user_type": "seeker",
    "created_at": "2026-02-19T10:30:00Z"
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | User not found | Email not registered |
| 400 | Invalid password | Wrong password |
| 400 | Email not verified | Must verify email first |
| 400 | Account locked | Too many failed attempts |
| 500 | Internal error | Server error |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Token Usage**:
- **access_token**: Use in `Authorization: Bearer <access_token>` for API requests
- **refresh_token**: Use with `/auth/refresh` to get new access token before expiry
- **access_token expires**: 15 minutes
- **refresh_token expires**: 7 days

**Security Notes**:
- Store access_token in memory (not localStorage)
- Store refresh_token in HTTP-only, secure cookie
- Never expose tokens in logs
- Tokens are invalidated on logout

---

### POST /auth/refresh

Get a new access token using refresh token (without re-entering password).

**Access Control**: Public (refresh token only)

**Rate Limit**: 100 requests per hour per user

**Request Body**:

```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refresh_token | string | ✓ | Refresh token from login response |

**Success Response (200)**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid refresh token | Token malformed or invalid |
| 400 | Refresh token expired | Token older than 7 days |
| 401 | Session invalidated | User logged out |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Best Practices**:
- Refresh token before expiry (~14 min into 15 min access token lifespan)
- Handle 401 response by requiring user to login again
- Store new access_token and use for subsequent requests

---

### POST /auth/logout

Invalidate current session (logout user).

**Access Control**: Authenticated (JWT required)

**Rate Limit**: 10 requests per hour per user

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**: Empty

```json
{}
```

**Success Response (200)**:

```json
{
  "message": "Logged out successfully"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid token | Missing or malformed token |
| 401 | Session not found | Token already invalidated |
| 500 | Internal error | Database error |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**After Logout**:
- Current token is invalidated (won't work for API calls)
- Must login again to get new tokens
- For multi-device logout, use dedicated endpoint (see below)

---

### POST /auth/logout-all-devices

Logout from all devices (invalidate all sessions).

**Access Control**: Authenticated (JWT required)

**Rate Limit**: 5 requests per hour per user

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**: Empty

```json
{}
```

**Success Response (200)**:

```json
{
  "message": "Logged out from all devices",
  "sessions_invalidated": 3
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid token | Missing or malformed token |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/logout-all-devices \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Use Cases**:
- Security incident (suspect account compromise)
- Lost or stolen device
- Suspicion of unauthorized access
- User explicitly wants to disconnect all devices

---

## Password Management

### POST /auth/password/reset-request

Request password reset (sends email with reset link).

**Access Control**: Public

**Rate Limit**: 5 requests per hour per IP

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✓ | Email address for account |

**Success Response (200)**:

```json
{
  "message": "Password reset email sent",
  "email": "user@example.com"
}
```

**Notes**:
- Response is always 200 (doesn't reveal if email exists)
- Reset link sent to email with 24-hour validity
- User can request multiple times (old tokens invalidated)

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/password/reset-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

---

### POST /auth/password/confirm-reset

Complete password reset with new password and reset token.

**Access Control**: Public

**Rate Limit**: 10 requests per hour per IP

**Request Body**:

```json
{
  "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePass456!"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reset_token | string | ✓ | Token from reset email link |
| new_password | string | ✓ | New password (must meet requirements) |

**Success Response (200)**:

```json
{
  "message": "Password reset successfully",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid reset token | Token malformed |
| 400 | Reset token expired | Token older than 24 hours |
| 400 | Reset token already used | Token used for previous reset |
| 400 | Invalid password | Password doesn't meet requirements |
| 404 | User not found | Token doesn't match any user |

**Example Request**:

```bash
curl -X POST http://localhost:8001/auth/password/confirm-reset \
  -H "Content-Type: application/json" \
  -d '{
    "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "new_password": "NewSecurePass456!"
  }'
```

**After Password Reset**:
- All existing sessions invalidated (user must login again)
- Old password no longer works
- Can login with new password immediately

---

## User Profile Endpoints

### GET /users/{user_id}/profile

Get authenticated user's profile.

**Access Control**: Authenticated + Authorization (can only access own profile)

**Rate Limit**: 100 requests per hour per user

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | UUID | User's ID (must match authenticated user) |

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**Success Response (200)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "name": "John Doe",
  "phone": "+34600123456",
  "bio": "Looking for 2-bedroom apartment in Madrid",
  "photo_url": "https://cdn.formacionia.ai/photos/user-123.jpg",
  "user_type": "seeker",
  "created_at": "2026-02-19T10:30:00Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid token | Missing or malformed token |
| 403 | Unauthorized | Accessing other user's profile |
| 404 | User not found | User ID doesn't exist |

**Example Request**:

```bash
curl -X GET http://localhost:8001/users/550e8400-e29b-41d4-a716-446655440000/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### PUT /users/{user_id}/profile

Update authenticated user's profile.

**Access Control**: Authenticated + Authorization (can only update own profile)

**Rate Limit**: 50 requests per hour per user

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | UUID | User's ID (must match authenticated user) |

**Request Headers**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body** (all fields optional):

```json
{
  "name": "John Smith",
  "phone": "+34600987654",
  "bio": "Looking for apartment in Barcelona",
  "photo_url": "https://cdn.formacionia.ai/photos/user-123-new.jpg"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✗ | User's full name |
| phone | string | ✗ | Phone number (international format) |
| bio | string | ✗ | Short biography (max 500 chars) |
| photo_url | string | ✗ | Profile photo URL |

**Success Response (200)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "name": "John Smith",
  "phone": "+34600987654",
  "bio": "Looking for apartment in Barcelona",
  "photo_url": "https://cdn.formacionia.ai/photos/user-123-new.jpg",
  "user_type": "seeker",
  "created_at": "2026-02-19T10:30:00Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid input | Field validation failed |
| 401 | Invalid token | Missing or malformed token |
| 403 | Unauthorized | Accessing other user's profile |
| 404 | User not found | User ID doesn't exist |

**Example Request**:

```bash
curl -X PUT http://localhost:8001/users/550e8400-e29b-41d4-a716-446655440000/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "phone": "+34600987654"
  }'
```

**Immutable Fields**:
- `email`: Cannot be changed
- `user_type`: Cannot be changed (determined at registration)
- `created_at`: Read-only

---

### GET /users/{user_id}

Get public profile (limited information, no authentication required).

**Access Control**: Public (no authentication required)

**Rate Limit**: 200 requests per hour per IP

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | UUID | User's ID |

**Success Response (200)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "photo_url": "https://cdn.formacionia.ai/photos/user-123.jpg",
  "user_type": "seeker"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 404 | User not found | User ID doesn't exist |

**Example Request**:

```bash
curl -X GET http://localhost:8001/users/550e8400-e29b-41d4-a716-446655440000
```

**Use Cases**:
- Display user reputation/profile on property listings
- Show renter profile to property owners
- Public user directory

**Note**: Does NOT include email, phone, or bio (only public information)

---

## Health & Status

### GET /health

Health check endpoint for monitoring and load balancers.

**Access Control**: Public

**Rate Limit**: None (used by monitoring systems)

**Success Response (200)**:

```json
{
  "status": "healthy",
  "service": "FormaconIA Auth Service",
  "version": "0.1.0"
}
```

**Example Request**:

```bash
curl -X GET http://localhost:8001/health
```

**Usage**:
- Docker health checks
- Load balancer checks
- Monitoring systems (Kubernetes, etc.)

---

## Documentation Endpoints

Automatic OpenAPI documentation endpoints (generated by FastAPI):

- **Swagger UI**: `GET /docs` - Interactive API documentation
- **ReDoc**: `GET /redoc` - Alternative API documentation
- **OpenAPI JSON**: `GET /openapi.json` - Raw OpenAPI specification

```bash
# View Swagger UI
open http://localhost:8001/docs

# View ReDoc
open http://localhost:8001/redoc
```

---

## Common Workflows

### Workflow 1: User Registration & Login

```
1. POST /auth/register
   └─ Returns: user object with email_verified=false

2. User receives email with verification token

3. POST /auth/verify-email (with token from email)
   └─ Returns: success message

4. POST /auth/login (with email and password)
   └─ Returns: access_token, refresh_token, user object

5. Use access_token in "Authorization: Bearer <token>" header
```

### Workflow 2: Renewing Access Token

```
1. Access token about to expire

2. POST /auth/refresh (with refresh_token)
   └─ Returns: new access_token

3. Use new access_token for subsequent requests

4. Refresh token expires after 7 days → User must login again
```

### Workflow 3: Forgotten Password

```
1. POST /auth/password/reset-request (with email)
   └─ Sends email with reset token and link

2. User clicks link in email or provides reset token

3. POST /auth/password/confirm-reset (with token and new password)
   └─ Returns: success message

4. User must login again with new password
   └─ All previous sessions invalidated
```

### Workflow 4: Updating Profile

```
1. GET /users/{user_id}/profile (with access_token)
   └─ Returns: current profile

2. PUT /users/{user_id}/profile (with access_token and updates)
   └─ Can update: name, phone, bio, photo_url
   └─ Cannot update: email, user_type

3. Returns: updated profile object
```

---

## Rate Limiting

The API enforces rate limits to prevent abuse:

| Endpoint | Limit | Window | Response |
|----------|-------|--------|----------|
| POST /auth/register | 5 | 1 minute | 429 Too Many Requests |
| POST /auth/login | 3 failed | 10 min | 400 Account locked (15 min) |
| POST /auth/refresh | 100 | 1 hour | 429 Too Many Requests |
| POST /auth/password/reset-request | 5 | 1 hour | 429 Too Many Requests |
| GET /users/{id}/profile | 100 | 1 hour | 429 Too Many Requests |

**Rate Limit Headers** (if applicable):
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1708329400
```

---

## Authentication Schemes

### JWT Bearer Token

Standard OAuth 2.0 Bearer Token scheme:

```
Authorization: Bearer <access_token>
```

All authenticated endpoints accept this format.

**Token Claims**:
```json
{
  "sub": "user-id-uuid",
  "email": "user@example.com",
  "iat": 1708325400,
  "exp": 1708326300
}
```

---

## Deployment Notes

### Environment-Specific Endpoints

```bash
# Development
export BASE_URL=http://localhost:8001

# Staging
export BASE_URL=https://staging.formacionia.ai/auth

# Production
export BASE_URL=https://api.formacionia.ai/auth
```

### CORS Configuration

By default, the service accepts requests from configured origins:

```
https://staging.formacionia.ai
https://staging-app.formacionia.ai
http://localhost:3000
```

Add frontend origins to `.env.staging` or `.env`:
```
ALLOWED_ORIGINS=https://myapp.com,https://app.myapp.com
```

---

## Support & Resources

- **API Documentation**: Open `/docs` or `/redoc` endpoints for interactive docs
- **Architecture**: See ARCHITECTURE.md for system design
- **Deployment**: See DEPLOYMENT.md for server setup
- **Testing**: See TESTING.md for test suite overview
- **Issues**: https://github.com/7Fernando7/FormaconIA/issues

---

**Last Updated**: 2026-02-19
**API Version**: 0.1.0
