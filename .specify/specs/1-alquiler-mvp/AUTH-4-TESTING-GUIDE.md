# AUTH-4 Testing Guide: JWT Middleware & Token Refresh

**Quick Start**: 10 minutes | **Comprehensive**: 45 minutes

---

## Quick Start (10 minutes)

### 1. Verify Service is Running

```bash
# Check auth service is healthy
curl http://localhost:3001/health

# Expected:
# {
#   "status": "ok",
#   "timestamp": "2026-02-18T10:00:00Z",
#   "service": "auth-service"
# }
```

### 2. Test Complete User Flow

```bash
# Step 1: Register user
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!",
    "full_name": "JWT Tester",
    "user_type": "seeker"
  }')

# Extract tokens
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.tokens.accessToken')
REFRESH_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.tokens.refreshToken')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"

# Step 2: Use access token on protected endpoint
curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected: 200 OK with user info

# Step 3: Refresh token after 15 minutes (or immediately)
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.accessToken')
NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.refreshToken')

echo "New Access Token: $NEW_ACCESS_TOKEN"
echo "New Refresh Token: $NEW_REFRESH_TOKEN"

# Step 4: Logout (blacklist tokens)
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$NEW_REFRESH_TOKEN\"}"

# Expected: 200 OK - { "message": "Successfully logged out" }

# Step 5: Try to use blacklisted token (should fail)
curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN"

# Expected: 403 Forbidden - Token blacklisted
```

---

## Comprehensive Testing (45 minutes)

### Test 1: JWT Verification Middleware

#### Test 1.1: Missing Authorization Header

```bash
curl -X GET http://localhost:3001/protected

# Expected Response: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Authorization header is required",
#   "code": "MISSING_TOKEN"
# }
```

**Verification**: ✅ Pass if status 401

#### Test 1.2: Invalid Bearer Token Format

```bash
curl -X GET http://localhost:3001/protected \
  -H "Authorization: InvalidFormat token123"

# Expected Response: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Authorization header must be in format: Bearer <token>",
#   "code": "INVALID_TOKEN_FORMAT"
# }
```

**Verification**: ✅ Pass if status 401 and error code matches

#### Test 1.3: Invalid JWT Signature

```bash
curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"

# Expected Response: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Token is invalid",
#   "code": "INVALID_TOKEN"
# }
```

**Verification**: ✅ Pass if status 401

#### Test 1.4: Expired Token

```bash
# Create a token that expires immediately (for testing)
# Then wait a few seconds and try to use it

curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer <expired-token>"

# Expected Response: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Token has expired",
#   "code": "TOKEN_EXPIRED",
#   "expiredAt": "2026-02-18T10:15:00Z"
# }
```

**Verification**: ✅ Pass if status 401 and expiredAt present

#### Test 1.5: Valid Token with User Context

```bash
# Register and login to get valid token
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.tokens.accessToken')

# Use valid token
curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer $TOKEN"

# Expected Response: 200 OK
# {
#   "message": "This is a protected endpoint",
#   "user": {
#     "id": 1,
#     "email": "test-jwt@example.com",
#     "user_type": "seeker",
#     "iat": 1645099200,
#     "exp": 1645100100
#   },
#   "timestamp": "2026-02-18T10:00:00Z"
# }
```

**Verification**: ✅ Pass if:
- Status 200
- user.id matches registered user
- user.email matches registered email
- exp > current timestamp

### Test 2: Token Refresh Flow

#### Test 2.1: Refresh with Valid Token

```bash
# Get refresh token from login
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.tokens.refreshToken')

# Use refresh token to get new access token
NEW_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

echo $NEW_RESPONSE | jq .

# Expected Response: 200 OK
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }
```

**Verification**: ✅ Pass if:
- Status 200
- New accessToken present and valid
- New refreshToken present (different from old one - rotation)

#### Test 2.2: Refresh with Missing Token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected Response: 400 Bad Request
# {
#   "error": "Bad Request",
#   "message": "refreshToken is required",
#   "code": "VALIDATION_ERROR"
# }
```

**Verification**: ✅ Pass if status 400

#### Test 2.3: Refresh with Invalid Token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "invalid-token"}'

# Expected Response: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Invalid or expired refresh token",
#   "code": "UNAUTHORIZED"
# }
```

**Verification**: ✅ Pass if status 401

#### Test 2.4: Refresh Token Rotation

```bash
# Get initial tokens
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

INITIAL_REFRESH=$(echo $LOGIN_RESPONSE | jq -r '.tokens.refreshToken')

# First refresh
REFRESH1=$(curl -s -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$INITIAL_REFRESH\"}" | jq -r '.refreshToken')

# Second refresh (using token from first refresh)
REFRESH2=$(curl -s -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH1\"}" | jq -r '.refreshToken')

echo "Initial: $INITIAL_REFRESH" | head -c 50
echo "...different..."
echo "After 1st refresh: $REFRESH1" | head -c 50
echo "...different..."
echo "After 2nd refresh: $REFRESH2" | head -c 50

# All three should be different (token rotation)
```

**Verification**: ✅ Pass if all three tokens are different (rotation working)

### Test 3: Logout & Token Blacklist

#### Test 3.1: Logout with Access Token

```bash
# Get tokens
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.accessToken')

# Logout
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo $LOGOUT_RESPONSE | jq .

# Expected Response: 200 OK
# {
#   "message": "Successfully logged out"
# }
```

**Verification**: ✅ Pass if status 200

#### Test 3.2: Logout with Both Tokens

```bash
# Get tokens
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.refreshToken')

# Logout with both tokens
curl -s -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Expected: 200 OK
```

**Verification**: ✅ Pass if status 200

#### Test 3.3: Token Cannot Be Reused After Logout

```bash
# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.accessToken')

# Verify token works before logout
echo "BEFORE LOGOUT:"
curl -s -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer $TOKEN" | jq .status

# Logout
curl -s -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Try to use same token (should fail)
echo "AFTER LOGOUT:"
curl -s -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 403 Forbidden - Token blacklisted
```

**Verification**: ✅ Pass if:
- Before logout: 200 OK
- After logout: 403 Forbidden with "TOKEN_BLACKLISTED" code

#### Test 3.4: Refresh Token Cannot Be Used After Logout

```bash
# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.refreshToken')

# Logout (blacklists both tokens)
curl -s -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Try to refresh (should fail because token is blacklisted)
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

echo $REFRESH_RESPONSE | jq .

# Expected: 401 Unauthorized - Token has been invalidated
```

**Verification**: ✅ Pass if status 401

### Test 4: Security & Edge Cases

#### Test 4.1: User Enumeration Prevention

```bash
# Try login with non-existent user
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "does-not-exist@example.com",
    "password": "SomePassword123!"
  }')

echo $RESPONSE | jq .

# Should return generic error (not "user not found")
# {
#   "error": "Unauthorized",
#   "message": "Invalid email or password",  ← Generic message
#   "code": "UNAUTHORIZED"
# }

# Compare with wrong password
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "WrongPassword123!"
  }')

echo $RESPONSE | jq .

# Should return same generic error message
```

**Verification**: ✅ Pass if both return identical error message

#### Test 4.2: Token Blacklist Persistence (Redis)

```bash
# Verify Redis has blacklist entries
redis-cli KEYS "token_blacklist:*"

# Should return blacklisted tokens
redis-cli GET "token_blacklist:abc123..."

# Check TTL (should match token expiration)
redis-cli TTL "token_blacklist:abc123..."
```

**Verification**: ✅ Pass if:
- Tokens appear in Redis after logout
- TTL is positive (not -1 or -2)
- TTL roughly matches token expiration time

#### Test 4.3: Rate Limiting Interaction

```bash
# Make 5 login attempts (should all succeed with valid password)
for i in {1..5}; do
  curl -s -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test-jwt@example.com",
      "password": "TestJWT123!"
    }' | jq .code
  echo "Attempt $i"
done

# Make 6th attempt (should fail with rate limit)
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-jwt@example.com",
    "password": "TestJWT123!"
  }')

echo $RESPONSE | jq .

# Expected: 429 Too Many Requests
# {
#   "error": "Too Many Requests",
#   "message": "Maximum 5 login attempts per 15 minutes",
#   "code": "RATE_LIMITED",
#   "retryAfter": 600
# }
```

**Verification**: ✅ Pass if:
- First 5 attempts succeed
- 6th attempt returns 429
- retryAfter is positive number (seconds)

---

## Test Results Checklist

After running all tests, verify:

### JWT Middleware Tests
- [ ] Test 1.1: Missing header returns 401
- [ ] Test 1.2: Invalid format returns 401
- [ ] Test 1.3: Invalid signature returns 401
- [ ] Test 1.4: Expired token returns 401
- [ ] Test 1.5: Valid token returns 200 with user context

### Token Refresh Tests
- [ ] Test 2.1: Valid refresh returns new tokens
- [ ] Test 2.2: Missing refresh token returns 400
- [ ] Test 2.3: Invalid refresh token returns 401
- [ ] Test 2.4: Token rotation works (different tokens)

### Logout Tests
- [ ] Test 3.1: Logout with access token succeeds
- [ ] Test 3.2: Logout with both tokens succeeds
- [ ] Test 3.3: Cannot reuse access token after logout
- [ ] Test 3.4: Cannot use refresh token after logout

### Security Tests
- [ ] Test 4.1: User enumeration prevented (generic errors)
- [ ] Test 4.2: Tokens appear in Redis blacklist
- [ ] Test 4.3: Rate limiting prevents abuse

**Overall Result**: _______________

---

## Automated Test Run

```bash
# Run all unit tests
npm run test:unit -- auth*.test.ts

# Run all integration tests
npm run test:integration -- auth*.test.ts

# Run with coverage
npm run test:coverage -- auth*.test.ts

# Expected output: All tests pass, coverage > 90%
```

---

## Performance Benchmarks

Run these to verify AUTH-4 meets performance targets:

```bash
# JWT verification latency
npm run benchmark -- jwt-middleware.bench.ts

# Token refresh latency
npm run benchmark -- token-refresh.bench.ts

# Logout & blacklist latency
npm run benchmark -- logout.bench.ts

# Load test (100 concurrent users)
npm run load-test -- --users 100 --duration 60s auth-endpoints

# Expected results:
# - JWT middleware: < 10ms p95
# - Token refresh: < 50ms p95
# - Logout: < 50ms p95
# - Load test: > 1000 req/s
```

---

## Troubleshooting Failed Tests

### If Test 1.5 fails (valid token returns 401)

```bash
# Check JWT_SECRET
echo $JWT_SECRET

# Regenerate auth service
npm run dev:auth --force-rebuild

# Restart service
docker-compose restart auth-service
```

### If Test 3.3 fails (token still works after logout)

```bash
# Check Redis is running
docker-compose logs redis | tail -20

# Check blacklist entries exist
redis-cli KEYS "token_blacklist:*"

# Restart Redis
docker-compose restart redis
```

### If Test 4.3 fails (rate limit not working)

```bash
# Check rate limiter configuration
cat backend/packages/auth-service/src/middleware/rateLimitLogin.ts

# Check Redis connection
redis-cli PING

# Test rate limiter directly
curl -X GET http://localhost:6379 && echo "Redis OK"
```

---

## Document Control

**Version**: 1.0  
**Created**: 2026-02-18  
**Status**: READY FOR TESTING  
**Estimated Time**: 45 minutes comprehensive, 10 minutes quick start  
