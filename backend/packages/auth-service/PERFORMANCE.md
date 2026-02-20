# Performance Guide - FormaconIA Auth Service

Guidelines for optimizing, benchmarking, and monitoring auth service performance.

## Performance Characteristics

Current service performance metrics:

| Metric | Value | Notes |
|--------|-------|-------|
| **Login Response** | <200ms | Local environment, PostgreSQL |
| **Token Refresh** | <100ms | No password validation needed |
| **Email Verification** | <150ms | Database + token validation |
| **Password Reset Confirm** | <200ms | Password hashing |
| **Profile Retrieval** | <50ms | Single DB query |
| **Profile Update** | <100ms | Single UPDATE query |
| **Health Check** | <10ms | No database access |

## Optimization Strategies

### 1. Database Connection Pooling

```python
# In app/database/connection.py

from sqlalchemy.pool import QueuePool

engine = create_engine(
    settings.database_url,
    poolclass=QueuePool,
    pool_size=20,          # Keep 20 connections ready
    max_overflow=40,       # Allow up to 40 additional connections
    pool_pre_ping=True,    # Test connections before using (prevents stale)
    pool_recycle=3600,     # Recycle after 1 hour (prevents idle disconnect)
)
```

**Why This Matters**:
- Without pooling: 10-50ms overhead to create new connection
- With pooling: <1ms to get existing connection
- Across 1000 requests/second: 10-50s vs <1s

**Tuning**:
```bash
# Monitor pool usage
# pool_size=20 good for typical deployment
# Increase to 50 if: lots of concurrent requests, long operations
# Decrease to 10 if: limited database connections available

# Each instance should use: (cpu_cores * 2) + spare_connections
# Example: 4-core machine = (4*2) + 2 = 10 connections
```

### 2. Database Query Optimization

#### Indexes

Ensure these indexes exist for fast lookups:

```sql
-- User lookups (login, profile)
CREATE INDEX idx_users_email ON users(email);

-- Token lookups (logout)
CREATE INDEX idx_sessions_access_token ON sessions(access_token);

-- Session queries (multi-device logout)
CREATE INDEX idx_sessions_user_id_is_active ON sessions(user_id, is_active);

-- Token expiry cleanup
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);

-- Audit log queries
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
```

**Verify Indexes**:
```sql
-- List all indexes
SELECT * FROM pg_indexes WHERE tablename = 'users';

-- Check if index is being used
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
-- Look for "Index Scan" in output
```

#### Query Optimization

```python
# GOOD: Fetch only needed columns
user = db.query(User.id, User.email, User.name).filter(
    User.email == email
).first()

# BAD: Fetch entire object including large columns
user = db.query(User).filter(User.email == email).first()

# GOOD: Use single query with join
user_with_profile = db.query(User, UserProfile).join(
    UserProfile, User.id == UserProfile.user_id
).filter(User.email == email).first()

# BAD: N+1 queries (fetch user, then fetch profile)
user = db.query(User).filter(User.email == email).first()
profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
```

### 3. Caching Strategy

#### In-Memory Cache (Redis)

```python
# In app/database/redis.py

import redis

redis_client = redis.Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    db=settings.redis_db,
    decode_responses=True
)

# Cache user session (used in logout check)
# Reduces database hits for frequently accessed sessions
redis_client.set(f"session:{token}", session_id, ex=900)  # 15 min TTL

# Rate limiting counters
redis_client.incr(f"login_attempts:{email}:{window}")

# Cached user profiles (future optimization)
redis_client.set(f"user_profile:{user_id}", json.dumps(profile), ex=3600)
```

**Benefits**:
- Session lookup: ~100µs vs 5ms (50x faster)
- Rate limit check: ~1ms vs 10ms
- Cache hit rate: 70-80% typical

**Cache Invalidation**:
```python
# Invalidate on profile update
redis_client.delete(f"user_profile:{user_id}")

# Invalidate all on logout
redis_client.delete(f"session:{token}")
```

### 4. Async Operations

FastAPI is built on async, enabling concurrent request handling:

```python
# GOOD: Uses async, non-blocking
@router.post("/auth/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Handles multiple concurrent requests
    user = await AuthService.register_async(db, request)
    await EmailService.send_email_async(user.email)
    return user

# BAD: Blocks other requests
@router.post("/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Each request blocks until complete
    user = AuthService.register(db, request)
    EmailService.send_email(user.email)  # Blocking wait
    return user
```

**Impact**:
- With async: Can handle 1000+ concurrent requests
- Without async: Limited to CPU core count (4-8 typical)

### 5. Email Service Async

Email sending is slow (network I/O). Make it async:

```python
# GOOD: Fire and forget (doesn't block request)
@router.post("/auth/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    user = AuthService.register(db, request)
    # Send email in background (non-blocking)
    asyncio.create_task(
        EmailService.send_verification_email(user.email, token)
    )
    return user

# BAD: Wait for email (blocks response)
@router.post("/auth/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    user = AuthService.register(db, request)
    await EmailService.send_verification_email(user.email, token)  # Blocking
    return user
```

**Impact**:
- Without async: 500-1000ms per request (email latency)
- With async: 100-200ms per request (no email latency)

## Load Testing

### Setup Load Testing

```bash
# Install Apache Bench
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Or use Python: pip install locust
```

### Apache Bench (ab)

```bash
# Warm up (establish connections)
ab -n 100 -c 10 http://localhost:8000/health

# Actual load test: 1000 requests, 50 concurrent
ab -n 1000 -c 50 http://localhost:8000/health

# With POST body
ab -n 1000 -c 50 -p credentials.json \
   -T "application/json" \
   http://localhost:8000/auth/login
```

**Understanding Output**:
```
This is ApacheBench, Version 2.3
Benchmarking localhost (be patient)...done

Server Software:        uvicorn
Server Port:            8000

Requests per second:    500 [#/sec]      # Throughput
Time per request:       100 [ms]         # Average latency
Failed requests:        0                # Errors
```

### Locust (Python)

```python
# locustfile.py

from locust import HttpUser, task, between

class AuthUser(HttpUser):
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests

    @task(1)
    def login(self):
        self.client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "TestPass123!"
        })

    @task(2)
    def get_profile(self):
        self.client.get(
            "/users/550e8400-e29b-41d4-a716-446655440000/profile",
            headers={"Authorization": "Bearer token"}
        )

# Run:
# locust -f locustfile.py --host=http://localhost:8000
```

### Test Scenarios

**Scenario 1: Normal Load**
- 100 concurrent users
- 1-5 second think time
- Mix of endpoints

**Scenario 2: Peak Load**
- 500 concurrent users
- Sustained for 5 minutes
- Monitor for errors/slowdown

**Scenario 3: Stress Test**
- 1000+ concurrent users
- Find breaking point
- Identify bottlenecks

## Monitoring & Profiling

### Application Performance Monitoring (APM)

```python
# Integration with monitoring services

# Example: Datadog APM
from ddtrace import tracer

@tracer.wrap()
def process_login(email, password):
    # Automatically traced
    pass

# Example: New Relic APM
import newrelic.agent
newrelic.agent.initialize('newrelic.ini')

@newrelic.agent.function_trace()
def process_login(email, password):
    # Automatically traced
    pass
```

### Request Timing

Add timing headers to responses:

```python
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    response.headers["X-Process-Time"] = str(duration)
    return response

# Response header:
# X-Process-Time: 0.125
```

### Database Query Logging

```python
# Enable SQL query logging (development only)
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# See all queries:
# SELECT * FROM users WHERE email = 'test@example.com'
# SELECT * FROM sessions WHERE access_token = '...'
```

### Flame Graphs

Profile CPU usage to find bottlenecks:

```bash
# Using py-spy (pip install py-spy)
py-spy record -o profile.svg python -m uvicorn app.main:app

# Analyze the SVG output to find hot functions
# Larger boxes = more CPU time
```

## Scaling Strategies

### Vertical Scaling (Single Instance)

**Increase Hardware**:
- More CPU cores → More concurrent requests
- More RAM → Larger connection pools, caching
- Faster disk → Faster database connections

**Limitations**:
- Single point of failure
- Expensive hardware
- Can't handle unlimited load

### Horizontal Scaling (Multiple Instances)

```
┌──────────────────────────────────────────┐
│         Load Balancer (Nginx)            │
│    (Round-robin, health checks)          │
└───────┬──────────────┬──────────┬────────┘
        │              │          │
   ┌────▼───┐      ┌────▼───┐  ┌─▼────┐
   │Instance│      │Instance│  │ ...  │
   │   1    │      │   2    │  │      │
   └────┬───┘      └────┬───┘  └─┬────┘
        │              │        │
        └──────────────┴────────┘
                 │
        ┌────────▼────────┐
        │   PostgreSQL    │
        │   (Single DB)   │
        └─────────────────┘
```

**Benefits**:
- Fault tolerance (one instance down = others handle traffic)
- Gradual scaling (add instances as needed)
- Load distribution

**Implementation**:
```yaml
# docker-compose.yml or Kubernetes

services:
  auth-1:
    image: formacionia/auth-service:latest
    environment:
      - DATABASE_URL=postgresql://...
    ports:
      - "8000:8000"

  auth-2:
    image: formacionia/auth-service:latest
    environment:
      - DATABASE_URL=postgresql://...
    ports:
      - "8002:8000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

**nginx.conf**:
```nginx
upstream auth_backend {
    server auth-1:8000;
    server auth-2:8000;
    server auth-3:8000;
}

server {
    listen 80;
    location / {
        proxy_pass http://auth_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Scaling

**Current**: Single PostgreSQL instance
- Suitable for: <1000 concurrent users
- Latency: <10ms per query

**Future Options**:
1. **Read Replicas** (for scaling reads)
   - Primary: Write queries
   - Replicas: Read queries (user profiles, audit logs)

2. **Connection Pooling** (PgBouncer)
   - Reduces database connection overhead
   - Can handle 10,000+ application connections

3. **Sharding** (only if > 100 million users)
   - Split data by user ID
   - Each shard has subset of users

### Caching Strategy

**Current**: No application-level caching
- Pro: Always fresh data
- Con: More database load

**With Redis Caching**:
```python
def get_user(user_id):
    # Check cache first
    cached = redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)

    # Cache miss: fetch from database
    user = db.query(User).filter(User.id == user_id).first()

    # Store in cache (1 hour TTL)
    redis.set(f"user:{user_id}", json.dumps(user.dict()), ex=3600)

    return user
```

**Cache Invalidation**:
- Time-based: Expire after 1 hour
- Event-based: Delete on update/delete
- Manual: Admin clears cache

## Bottleneck Analysis

Common bottlenecks and solutions:

### Bottleneck: Slow Database Queries

**Symptoms**:
- Response time > 500ms
- "Waiting for database" in logs
- Database CPU at 100%

**Solutions**:
1. Add indexes (fastest fix)
2. Optimize query structure
3. Add caching (Redis)
4. Increase database resources
5. Use read replicas

**Diagnosis**:
```sql
-- Find slow queries
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Profile execution
SELECT query, mean_exec_time FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;
```

### Bottleneck: Password Hashing

**Symptoms**:
- Login endpoint slow (200-500ms)
- CPU at 100%
- Hashing takes significant time

**Solutions**:
1. Reduce bcrypt rounds (only if load critical)
2. Move to separate service (async task queue)
3. Increase instance count

**Impact**: bcrypt is intentionally slow (security feature)
- Current: 12 rounds = ~100ms per hash
- Can't reduce without weakening security

### Bottleneck: Rate Limiting

**Symptoms**:
- Random 429 errors
- Redis connection issues
- Memory high

**Solutions**:
1. Increase Redis memory (`redis-cli CONFIG SET maxmemory 1gb`)
2. Adjust rate limit windows (shorter = less memory)
3. Use distributed rate limiting (multiple Redis nodes)

### Bottleneck: Email Service

**Symptoms**:
- Registration endpoint slow (500ms+)
- Email delivery delays
- Network timeouts

**Solutions**:
1. Make email sending async (don't wait for response)
2. Use background job queue (Celery)
3. Switch to faster email provider

## Performance Checklist

Before deploying to production:

- [ ] Database connection pooling configured
- [ ] Indexes created on frequently queried columns
- [ ] Async operations used where possible
- [ ] Email sending is non-blocking
- [ ] Redis configured for rate limiting
- [ ] Load testing done (100+ concurrent users)
- [ ] Monitoring/APM tools integrated
- [ ] Database query logging enabled (development)
- [ ] Slow query logs monitored
- [ ] Caching strategy defined
- [ ] Scaling strategy documented
- [ ] Health checks configured
- [ ] Load balancer configured

## Performance Targets

### Service Level Objectives (SLOs)

| Metric | Target | Threshold |
|--------|--------|-----------|
| **Availability** | 99.9% | 43 min/month downtime |
| **Latency (p50)** | <100ms | 50th percentile |
| **Latency (p99)** | <500ms | 99th percentile |
| **Error Rate** | <0.1% | 1 in 1000 requests |
| **Throughput** | 1000 req/s | Per instance |

### Infrastructure

| Resource | Minimum | Recommended | Maximum |
|----------|---------|-------------|---------|
| **CPU** | 2 cores | 4 cores | 16 cores |
| **RAM** | 1GB | 4GB | 16GB |
| **Database CPU** | 2 cores | 8 cores | 32 cores |
| **Database RAM** | 4GB | 16GB | 64GB |
| **Disk** | 20GB | 100GB | 1TB |

## References

- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Optimization**: https://redis.io/topics/optimization
- **FastAPI Performance**: https://fastapi.tiangolo.com/deployment/
- **Load Testing Tools**: https://locust.io
- **APM Solutions**: Datadog, New Relic, Elastic APM

---

**Last Updated**: 2026-02-19
**Version**: 0.1.0
