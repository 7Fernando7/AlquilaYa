# AUTH-4 Local Testing - Quick Start

**Time Required**: 15-20 minutes  
**Prerequisites**: Docker Desktop running  
**Status**: Ready to test  

---

## Step 1: Start Docker Services

```bash
# Start all services (PostgreSQL, Redis, Elasticsearch, Auth Service)
docker-compose up -d

# Expected output:
# [+] Running 5/5
# ✓ formacionia-postgres (health: starting)
# ✓ formacionia-redis (health: starting)
# ✓ formacionia-elasticsearch (health: starting)
# ✓ formacionia-mailhog (health: starting)
# ✓ formacionia-auth-service (health: starting)
```

### Verify Services Are Running

```bash
# Check all containers
docker-compose ps

# Expected: All containers should show "Up" status and healthy
# NAME                          COMMAND                 SERVICE      STATUS
# formacionia-postgres          postgres ...            postgres     Up (healthy)
# formacionia-redis             redis-server ...        redis        Up (healthy)
# formacionia-elasticsearch     /bin/tini ...           elasticsearch Up (healthy)
# formacionia-mailhog           MailHog ...             mailhog      Up
# formacionia-auth-service      docker-entrypoint.sh    auth-service Up (health: starting)
```

## Step 2: Wait for Auth Service

Wait about 30-60 seconds for the auth service to fully start:

```bash
# Watch auth service logs
docker-compose logs -f auth-service

# Expected: Should see these messages after ~30 seconds:
# [Server] Auth Service running on port 3001
# [Server] ✓ Auth Service started successfully
# [Server] Ready to accept requests
```

## Step 3: Verify Health Check

```bash
# Quick health check
curl http://localhost:3001/health

# Expected response (200 OK):
# {
#   "status": "ok",
#   "timestamp": "2026-02-18T10:00:00Z",
#   "service": "auth-service"
# }
```

If you get a connection error, wait another 10-20 seconds and try again.

## Step 4: Run Automated Tests

```bash
# Make script executable
chmod +x scripts/test-auth4.sh

# Run comprehensive testing
bash scripts/test-auth4.sh

# The script will:
# 1. Register a test user
# 2. Test JWT middleware on protected endpoints
# 3. Test token refresh flow
# 4. Test logout and token blacklist
# 5. Test rate limiting
# 6. Test user enumeration prevention
# 7. Verify health check
```

## Step 5: Interpret Results

### Success (All Green ✓)

```
TEST SUMMARY
✓ Passed: 25
✗ Failed: 0
Total: 25

🎉 ALL TESTS PASSED - AUTH-4 IS WORKING CORRECTLY!
```

**Next Steps**: Proceed to service integration

### Failures (Some Red ✗)

```
TEST SUMMARY
✓ Passed: 20
✗ Failed: 5
Total: 25

⚠ SOME TESTS FAILED - CHECK OUTPUT ABOVE
```

**Troubleshooting**: See "Troubleshooting Failed Tests" section below

---

## Manual Testing (10 minutes)

If you prefer to test manually with curl:

### Test 1: Register

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User",
    "user_type": "seeker"
  }'

# Expected: 201 Created with tokens
```

### Test 2: Use Protected Endpoint with Token

```bash
# Extract token from register response (or login)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Access protected endpoint
curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with user info
```

### Test 3: Try Without Token

```bash
curl -X GET http://localhost:3001/protected

# Expected: 401 Unauthorized
```

### Test 4: Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123!"
  }'

# Expected: 200 OK with tokens
```

### Test 5: Refresh Token

```bash
# Extract refresh token from login response
REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Expected: 200 OK with new tokens
```

### Test 6: Logout

```bash
# Extract tokens
ACCESS_TOKEN="..."
REFRESH_TOKEN="..."

curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Expected: 200 OK - Successfully logged out
```

### Test 7: Try Blacklisted Token (After Logout)

```bash
# Use the access token from before logout
curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected: 403 Forbidden - Token blacklisted
```

---

## Troubleshooting Failed Tests

### Issue: "Cannot connect to auth service"

**Cause**: Auth service not ready

**Solution**:
```bash
# Check service logs
docker-compose logs auth-service

# Wait a bit longer and check health
curl -v http://localhost:3001/health

# If still failing, restart
docker-compose restart auth-service
```

### Issue: "Registration failed"

**Cause**: Database not initialized

**Solution**:
```bash
# Check database connection
docker-compose logs postgres

# Check database is running
psql -h localhost -U postgres -c "SELECT 1"

# If issues, rebuild services
docker-compose down
docker-compose up -d
```

### Issue: "Token blacklist not working"

**Cause**: Redis connection issue

**Solution**:
```bash
# Check Redis
redis-cli PING

# Check Redis logs
docker-compose logs redis

# Verify Redis is accessible
redis-cli KEYS "token_blacklist:*"

# Restart Redis if needed
docker-compose restart redis
```

### Issue: "Rate limiting not working"

**Cause**: Redis not storing rate limit keys

**Solution**:
```bash
# Check Redis keys
redis-cli KEYS "ratelimit:*"

# If empty, Redis might be cleared on restart
# This is expected - rate limiter will work after first few requests

# Run test again
bash scripts/test-auth4.sh
```

### Issue: "User enumeration test showing different errors"

**Cause**: Generic error message not implemented

**Solution**:
```bash
# Check login endpoint implementation
cat backend/packages/auth-service/src/controllers/auth.controller-auth4.ts | grep -A5 "Invalid email or password"

# Should show same generic message for both cases
# If different, check the controller was updated correctly
```

---

## Viewing Logs

```bash
# Real-time auth service logs
docker-compose logs -f auth-service

# Real-time all service logs
docker-compose logs -f

# See last 100 lines of postgres
docker-compose logs postgres | tail -100

# See last 50 lines of redis
docker-compose logs redis | tail -50
```

---

## Stopping Services

```bash
# Stop all services (keep data)
docker-compose stop

# Stop and remove containers (keep data in volumes)
docker-compose down

# Stop and remove everything (delete all data)
docker-compose down -v
```

---

## Monitoring Services

### Check Database

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d formacionia

# View users table
SELECT id, email, full_name, user_type, created_at FROM users LIMIT 5;

# View sessions (if tracking login)
SELECT id, user_id, last_login FROM users WHERE last_login IS NOT NULL;

# Exit
\q
```

### Check Redis

```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View token blacklist
KEYS "token_blacklist:*"

# Get a specific value
GET "token_blacklist:abc..."

# View stats
INFO

# Exit
EXIT
```

### Check Auth Service

```bash
# View logs
docker-compose logs auth-service

# Check metrics (if enabled)
curl http://localhost:3001/metrics

# Health status
curl http://localhost:3001/health | jq .
```

---

## Expected Performance

These are typical latencies on a local machine:

| Operation | Latency |
|-----------|---------|
| Register | 50-100ms |
| Login | 80-150ms |
| Protected endpoint | 2-5ms |
| Token refresh | 40-80ms |
| Logout | 30-50ms |
| Rate limit check | 1-3ms |

If you see significantly higher latencies, check:
- CPU usage (`top` or Task Manager)
- Disk I/O
- Docker resource limits

---

## Postman Testing (Alternative)

If you prefer using Postman/Thunder Client:

1. **Import OpenAPI spec**
   ```
   File → Import → Select /contracts/auth.openapi.yaml
   ```

2. **Create environment variable**
   ```
   Variable: token
   Value: <your JWT token from register/login>
   ```

3. **Test endpoints**
   ```
   POST /auth/register
   POST /auth/login
   GET /protected (with {{token}} in Authorization header)
   POST /auth/refresh
   POST /auth/logout
   ```

---

## Summary

✅ **All tests passing** → AUTH-4 is working correctly  
✅ **Ready for** → Service integration, frontend development, staging deployment  

**Next Phase**:
1. Integrate auth middleware with search/properties/messaging services
2. Begin frontend implementation
3. Deploy to staging environment
4. Load testing (1000+ concurrent users)

---

## Quick Commands Reference

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f auth-service

# Run tests
bash scripts/test-auth4.sh

# Health check
curl http://localhost:3001/health

# Stop services
docker-compose stop

# Full cleanup
docker-compose down -v
```

---

**Status**: Ready to test  
**Last Updated**: 2026-02-18  
**Questions?**: See AUTH-4-TESTING-GUIDE.md for comprehensive testing procedures
