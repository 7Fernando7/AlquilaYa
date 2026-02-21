# Auth Service Deployment Guide

## Prerequisites

- Docker & Docker Compose
- PostgreSQL 15+ (for production)
- Redis 7+ (for session/cache)
- SendGrid API key (for production email)
- JWT RSA key pair (private.pem and public.pem)

## Local Development

### Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Generate JWT keys (if not exists)
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Create .env file
cp .env.example .env

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Test

```bash
# Run all tests
pytest tests/ -v

# Run specific test suite
pytest tests/unit/test_auth_service.py -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

## Docker Deployment

### Build Image

```bash
# Build auth-service image
docker build -f backend/packages/auth-service/Dockerfile \
  -t formacionia/auth-service:latest \
  -t formacionia/auth-service:v1.0.0 \
  .

# Build with staging tag
docker build -f backend/packages/auth-service/Dockerfile \
  -t formacionia/auth-service:staging \
  .
```

### Run with Docker Compose

```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f auth-service

# Run tests in container
docker-compose exec auth-service pytest tests/ -v
```

## Staging Deployment

### Environment Setup

```bash
# Create .env.staging
cat > .env.staging <<EOF
APP_ENV=staging
DEBUG=false
DATABASE_URL=postgresql://user:password@postgres-staging:5432/formacionia_staging
REDIS_URL=redis://redis-staging:6379/0
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=YOUR_SENDGRID_KEY
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem
CORS_ORIGIN=https://staging.formacionia.ai
LOG_LEVEL=INFO
EOF
```

### Deploy to Staging

**Option 1: Using Docker Compose**

```bash
# Start services with staging configuration
docker-compose -f docker-compose.yml \
  --env-file .env.staging \
  up -d

# Verify health
curl http://localhost:8000/health
```

**Option 2: Using Docker Swarm or Kubernetes**

```bash
# For Docker Swarm
docker stack deploy -c docker-compose.yml formacionia-staging

# For Kubernetes (requires docker-compose to K8s conversion)
# Install kompose: https://kompose.io/
kompose convert -f docker-compose.yml -o k8s-manifests/
kubectl apply -f k8s-manifests/
```

### Database Migration on Staging

```bash
# Apply migrations
docker-compose exec auth-service alembic upgrade head

# Create enums if not exists
docker-compose exec postgres psql -U postgres -d formacionia_staging <<SQL
  CREATE TYPE user_type_enum AS ENUM ('seeker', 'owner', 'agency', 'admin');
  CREATE TYPE audit_event_type_enum AS ENUM (
    'account_created', 'email_verified', 'login_success', 'login_failure',
    'token_refresh', 'password_reset_requested', 'password_reset_confirmed', 'logout'
  );
SQL
```

## Health Checks

```bash
# Check service health
curl http://localhost:8000/health

# Response:
# {
#   "status": "healthy",
#   "service": "FormaconIA Auth Service",
#   "version": "0.1.0"
# }

# Check database connectivity
curl http://localhost:8000/health

# Check Redis
docker-compose exec redis redis-cli ping
# Response: PONG

# Check PostgreSQL
docker-compose exec postgres psql -U postgres -d formacionia -c "SELECT NOW();"
```

## Monitoring

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100 auth-service

# Log level filtering (from app logs)
# ERROR, WARNING, INFO, DEBUG
```

### Metrics

The application logs structured information that can be collected by:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Prometheus (with instrumentation)
- CloudWatch (AWS)
- GCP Logging
- Datadog

### Audit Logs

View audit logs in the database:

```sql
-- Recent login attempts
SELECT * FROM audit_logs
WHERE event_type = 'login_success'
ORDER BY created_at DESC
LIMIT 10;

-- Failed login attempts
SELECT * FROM audit_logs
WHERE event_type = 'login_failure'
ORDER BY created_at DESC
LIMIT 10;

-- Password resets
SELECT * FROM audit_logs
WHERE event_type IN ('password_reset_requested', 'password_reset_confirmed')
ORDER BY created_at DESC
LIMIT 10;

-- Suspicious activity (multiple failed logins from same IP)
SELECT ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM audit_logs
WHERE event_type = 'login_failure'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
```

## Performance Tuning

### Database Connection Pooling

```python
# In app/database/connection.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,          # Connections to keep in pool
    max_overflow=40,       # Additional connections when pool exhausted
    pool_pre_ping=True,    # Verify connections before using
    pool_recycle=3600,     # Recycle connections after 1 hour
)
```

### Redis Caching

Session tokens and verification tokens are cached in Redis for fast lookup.

```bash
# Monitor Redis memory usage
docker-compose exec redis redis-cli INFO memory

# Monitor key count
docker-compose exec redis redis-cli DBSIZE

# Flush cache (if needed)
docker-compose exec redis redis-cli FLUSHDB
```

### Rate Limiting

Rate limiting is implemented at the authentication layer:
- 5 registration requests per minute per IP
- 3 failed login attempts per 10 minutes per email → 15 min lockout
- 10 password reset requests per hour per IP

## Security Checklist

- [ ] JWT keys secured (not in git)
- [ ] Environment variables configured
- [ ] Database password changed (not default)
- [ ] Redis password configured (if exposed)
- [ ] CORS origins restricted
- [ ] HTTPS enabled (in production)
- [ ] Audit logging enabled and monitored
- [ ] Rate limiting configured
- [ ] Database backups configured
- [ ] Email service credentials secured

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres -d formacionia > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres -d formacionia < backup.sql

# Automated backups (cron)
# 0 2 * * * docker-compose exec -T postgres pg_dump -U postgres -d formacionia > /backups/formacionia-$(date +\%Y\%m\%d).sql
```

### Restore Procedure

```bash
# 1. Stop services
docker-compose down

# 2. Reset database
docker volume rm formacionia_postgres_data

# 3. Restart services
docker-compose up -d

# 4. Restore data
docker-compose exec -T postgres psql -U postgres -d formacionia < backup.sql

# 5. Verify
docker-compose exec postgres psql -U postgres -d formacionia -c "SELECT COUNT(*) as users FROM users;"
```

## Troubleshooting

### Auth Service fails to start

```bash
# Check logs
docker-compose logs auth-service

# Common issues:
# 1. Database not ready: Wait 10s and restart
docker-compose restart auth-service

# 2. JWT keys missing:
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# 3. Port already in use:
docker-compose down
docker-compose up -d
```

### Database connection issues

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# Check database exists
docker-compose exec postgres psql -U postgres -l

# Check Redis connectivity
docker-compose exec redis redis-cli ping
```

### High memory usage

```bash
# Check memory per container
docker stats

# Reduce connection pool size
# Reduce Redis maxmemory
docker-compose exec redis redis-cli CONFIG SET maxmemory 256mb
```

## Upgrade Procedure

1. **Backup database**
   ```bash
   docker-compose exec postgres pg_dump -U postgres -d formacionia > backup-pre-upgrade.sql
   ```

2. **Build new image**
   ```bash
   docker build -f backend/packages/auth-service/Dockerfile -t formacionia/auth-service:v1.1.0 .
   ```

3. **Update docker-compose.yml** to reference new image version

4. **Run migrations** (if any)
   ```bash
   docker-compose exec auth-service alembic upgrade head
   ```

5. **Restart service**
   ```bash
   docker-compose up -d auth-service
   ```

6. **Verify**
   ```bash
   curl http://localhost:8000/health
   docker-compose logs auth-service
   ```

7. **Rollback if needed** (restore from backup)

## Support & Issues

For issues or questions:
1. Check logs: `docker-compose logs auth-service`
2. Check health endpoint: `curl http://localhost:8000/health`
3. Review audit logs: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;`
4. Check GitHub issues: https://github.com/7Fernando7/AlquilaYa/issues
