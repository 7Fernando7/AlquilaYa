# AUTH-4 Manual Testing Guide

**Status**: Ready for local testing  
**Environment**: Windows 11 with Docker Desktop  
**Time Required**: 20-30 minutes  

---

## Prerequisites Checklist

Before starting, verify you have:

- [ ] Docker Desktop installed and running
- [ ] Terminal/PowerShell with access to `docker` command
- [ ] `curl` or Postman/Thunder Client for API testing
- [ ] `jq` (optional, for JSON parsing) or use Postman
- [ ] Port 3001 available (auth-service)
- [ ] Port 5432 available (PostgreSQL)
- [ ] Port 6379 available (Redis)

---

## Step-by-Step Testing

### SETUP: Start Docker Services

#### Option 1: Using Docker Desktop UI (Easiest)

1. **Open Docker Desktop**
   - Should see Docker icon in system tray
   - Click to open Docker Dashboard

2. **Navigate to project directory**
   ```
   cd C:\Users\Admin\Documents\FormaconIA
   ```

3. **Open PowerShell/Terminal in this directory**

4. **Start all services**
   ```powershell
   docker-compose up -d
   ```

5. **Monitor startup (in Docker Desktop UI)**
   - Should see 5 containers starting
   - Wait for all to show "Healthy" (30-60 seconds)

#### Option 2: Using Command Line

```powershell
# Navigate to project
cd C:\Users\Admin\Documents\FormaconIA

# Start services in background
docker-compose up -d

# Monitor progress
docker-compose logs -f auth-service

# When you see this, it's ready:
# [Server] Auth Service running on port 3001
# [Server] ✓ Auth Service started successfully
```

---

## Testing Procedure

### TEST 1: Health Check (Verify Service is Running)

**Purpose**: Confirm auth service is accessible

**Using curl in PowerShell**:
```powershell
curl http://localhost:3001/health

# Expected: 200 OK
# {
#   "status": "ok",
#   "timestamp": "2026-02-18T...",
#   "service": "auth-service"
# }
```

**Using Postman**:
1. Create new GET request
2. URL: `http://localhost:3001/health`
3. Click Send
4. Should see 200 OK

**If you get connection error**:
- Wait another 30 seconds
- Check `docker-compose ps` - all should be "healthy"
- Check Docker Desktop logs
- Try `docker-compose restart auth-service`

---

### TEST 2: User Registration

**Purpose**: Test POST /auth/register endpoint and verify JWT token generation

**Using curl**:
```powershell
$body = @{
    email = "testuser-$(Get-Random)@example.com"
    password = "TestPassword123!"
    full_name = "Test User"
    user_type = "seeker"
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/register `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 201 Created
# {
#   "user": {
#     "id": 1,
#     "email": "testuser@example.com",
#     "full_name": "Test User",
#     "user_type": "seeker",
#     "verification_status": "unverified",
#     "created_at": "2026-02-18T10:00:00Z"
#   },
#   "tokens": {
#     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   }
# }
```

**Using Postman**:
1. Create new POST request
2. URL: `http://localhost:3001/auth/register`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "email": "testuser@example.com",
     "password": "TestPassword123!",
     "full_name": "Test User",
     "user_type": "seeker"
   }
   ```
5. Click Send
6. Should see 201 Created with user and tokens

**✅ PASS if**:
- Status is 201
- user.id is returned
- accessToken is provided
- refreshToken is provided

---

### TEST 3: Access Protected Endpoint with Token

**Purpose**: Test JWT middleware verification (authMiddleware)

**Using curl (save token from previous test)**:
```powershell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # From TEST 2

curl -X GET http://localhost:3001/protected `
  -H "Authorization: Bearer $token"

# Expected: 200 OK
# {
#   "message": "This is a protected endpoint",
#   "user": {
#     "id": 1,
#     "email": "testuser@example.com",
#     "user_type": "seeker",
#     "iat": 1645099200,
#     "exp": 1645100100
#   },
#   "timestamp": "2026-02-18T10:00:00Z"
# }
```

**Using Postman**:
1. Create new GET request
2. URL: `http://localhost:3001/protected`
3. Headers tab → Add header
   - Key: `Authorization`
   - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your token)
4. Click Send
5. Should see 200 OK with user context

**✅ PASS if**:
- Status is 200
- user object is in response
- user.id matches registered user

---

### TEST 4: Protected Endpoint Without Token

**Purpose**: Verify middleware rejects requests without token

**Using curl**:
```powershell
curl -X GET http://localhost:3001/protected

# Expected: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Authorization header is required",
#   "code": "MISSING_TOKEN"
# }
```

**Using Postman**:
1. Create new GET request
2. URL: `http://localhost:3001/protected`
3. **Do NOT add Authorization header**
4. Click Send
5. Should see 401 Unauthorized

**✅ PASS if**:
- Status is 401
- error message says "Authorization header is required"

---

### TEST 5: User Login

**Purpose**: Test POST /auth/login endpoint with rate limiting

**Using curl**:
```powershell
$body = @{
    email = "testuser@example.com"
    password = "TestPassword123!"
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 200 OK
# {
#   "tokens": {
#     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   }
# }
```

**Using Postman**:
1. Create new POST request
2. URL: `http://localhost:3001/auth/login`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "email": "testuser@example.com",
     "password": "TestPassword123!"
   }
   ```
5. Click Send
6. Should see 200 OK with tokens

**✅ PASS if**:
- Status is 200
- accessToken provided
- refreshToken provided

---

### TEST 6: Token Refresh

**Purpose**: Test POST /auth/refresh and verify token rotation

**Save refresh token from TEST 5 or TEST 2**:

**Using curl**:
```powershell
$refreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # From login/register

$body = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/refresh `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 200 OK
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }
```

**Using Postman**:
1. Create new POST request
2. URL: `http://localhost:3001/auth/refresh`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```
5. Click Send
6. Should see 200 OK with new tokens

**Verify Token Rotation** (KEY TEST):
- Compare the new tokens with old ones
- Should be DIFFERENT strings
- This proves rotation is working (security feature)

**✅ PASS if**:
- Status is 200
- New accessToken different from old one
- New refreshToken different from old one

---

### TEST 7: Logout

**Purpose**: Test POST /auth/logout and token blacklist

**Using curl** (use access token from TEST 5 or TEST 6):
```powershell
$accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
$refreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

$body = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/logout `
  -H "Authorization: Bearer $accessToken" `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 200 OK
# {
#   "message": "Successfully logged out"
# }
```

**Using Postman**:
1. Create new POST request
2. URL: `http://localhost:3001/auth/logout`
3. Headers tab:
   - Key: `Authorization`
   - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Body (raw JSON):
   ```json
   {
     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```
5. Click Send
6. Should see 200 OK with success message

**✅ PASS if**:
- Status is 200
- Message says "Successfully logged out"

---

### TEST 8: Cannot Reuse Blacklisted Token

**Purpose**: Verify token blacklist prevents reuse after logout (KEY SECURITY TEST)

**Using curl** (use access token from TEST 7 - should be blacklisted now):
```powershell
$blacklistedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Token from before logout

curl -X GET http://localhost:3001/protected `
  -H "Authorization: Bearer $blacklistedToken"

# Expected: 403 Forbidden
# {
#   "error": "Forbidden",
#   "message": "Token has been invalidated (you may have logged out)",
#   "code": "TOKEN_BLACKLISTED"
# }
```

**Using Postman**:
1. Create new GET request
2. URL: `http://localhost:3001/protected`
3. Headers:
   - Key: `Authorization`
   - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (blacklisted token)
4. Click Send
5. Should see 403 Forbidden with "TOKEN_BLACKLISTED" code

**⚠️ CRITICAL TEST**:
- If this fails (shows 200 instead of 403), token blacklist is not working
- Logout would not be secure

**✅ PASS if**:
- Status is 403
- error code is "TOKEN_BLACKLISTED"
- Cannot access endpoint with logout token

---

### TEST 9: Cannot Refresh with Blacklisted Refresh Token

**Purpose**: Verify blacklist works for refresh tokens too

**Using curl** (use refresh token from TEST 7 - should be blacklisted now):
```powershell
$blacklistedRefreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

$body = @{
    refreshToken = $blacklistedRefreshToken
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/refresh `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Invalid or expired refresh token",
#   "code": "UNAUTHORIZED"
# }
```

**Using Postman**:
1. Create new POST request
2. URL: `http://localhost:3001/auth/refresh`
3. Body (raw JSON):
   ```json
   {
     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```
4. Click Send
5. Should see 401 Unauthorized

**✅ PASS if**:
- Status is 401
- Cannot get new tokens with blacklisted refresh token

---

### TEST 10: User Enumeration Prevention

**Purpose**: Verify error messages don't leak user existence info

**Test A: Non-existent user login**:
```powershell
$body = @{
    email = "doesnotexist-$(Get-Random)@example.com"
    password = "SomePassword123!"
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Invalid email or password",
#   "code": "UNAUTHORIZED"
# }
```

**Test B: Wrong password login** (same email as registered user):
```powershell
$body = @{
    email = "testuser@example.com"
    password = "WrongPassword123!"
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 401 Unauthorized
# {
#   "error": "Unauthorized",
#   "message": "Invalid email or password",  ← SAME message as Test A!
#   "code": "UNAUTHORIZED"
# }
```

**✅ PASS if**:
- Test A and Test B return IDENTICAL error messages
- Cannot determine if user exists by observing error

**🚨 FAIL if**:
- Test A says "User not found"
- Test B says "Invalid password"
- Different messages leak user existence

---

## Test Results Summary

| Test # | Test Name | Expected | Your Result | Status |
|--------|-----------|----------|------------|--------|
| 1 | Health Check | 200 OK | | ✅/❌ |
| 2 | Registration | 201 Created | | ✅/❌ |
| 3 | Protected Endpoint (with token) | 200 OK | | ✅/❌ |
| 4 | Protected Endpoint (no token) | 401 Unauthorized | | ✅/❌ |
| 5 | Login | 200 OK | | ✅/❌ |
| 6 | Token Refresh | 200 OK + rotation | | ✅/❌ |
| 7 | Logout | 200 OK | | ✅/❌ |
| 8 | Blacklisted Token | 403 Forbidden | | ✅/❌ |
| 9 | Blacklisted Refresh Token | 401 Unauthorized | | ✅/❌ |
| 10 | User Enumeration Prevention | Generic errors | | ✅/❌ |

**Total Passed**: ___ / 10  
**Overall Status**: ______ (✅ READY / ⚠️ ISSUES)

---

## Troubleshooting

### "Cannot connect to http://localhost:3001"

**Cause**: Auth service not running

**Fix**:
```powershell
# Check if running
docker-compose ps

# If not running, start it
docker-compose up -d auth-service

# Check logs
docker-compose logs auth-service

# Wait 30 seconds and try again
```

### "401 Unauthorized - Invalid email or password" on LOGIN

**Possible causes**:
1. Wrong email/password
2. User not registered yet
3. User deleted

**Fix**:
```powershell
# Register a new user first (TEST 2)
# Then try login with same credentials

# If still failing, check database
docker exec formacionia-postgres psql -U postgres -d formacionia -c "SELECT email FROM users LIMIT 5;"
```

### "403 Forbidden - TOKEN_BLACKLISTED" on protected endpoint (BEFORE logout)

**Cause**: Token already blacklisted somehow

**Fix**:
1. Register new user (TEST 2)
2. Use new token immediately

### "Cannot refresh - Invalid or expired refresh token" (before logout)

**Cause**: Refresh token expired or Redis not working

**Fix**:
```powershell
# Check Redis
docker-compose logs redis

# Restart Redis if needed
docker-compose restart redis

# Register new user and try again
```

### "Rate limited after 1 attempt" (TEST 5/6)

**Cause**: Previous failed login attempts counted

**Fix**:
1. Use different email each time
2. Or wait 15 minutes
3. Check Redis keys:
   ```powershell
   docker exec formacionia-redis redis-cli KEYS "ratelimit:*"
   ```

---

## Cleanup

```powershell
# Stop all services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data in volumes)
docker-compose down

# Complete cleanup (deletes all data)
docker-compose down -v

# View removed containers
docker ps -a
```

---

## Summary

✅ **If all 10 tests pass**: AUTH-4 is production-ready  
⚠️ **If some fail**: Review troubleshooting and check logs  

**Next Steps After Passing**:
1. ✅ Proceed to service integration
2. ✅ Update search/properties services with authMiddleware
3. ✅ Begin frontend integration
4. ✅ Deploy to staging

---

**Document**: AUTH-4 Manual Testing Guide  
**Date**: 2026-02-18  
**Status**: Ready for testing  
