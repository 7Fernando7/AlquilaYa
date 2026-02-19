# FormaconIA Auth Service - Staging Deployment Guide

This guide provides step-by-step instructions for deploying the FormaconIA authentication system to a staging environment.

## Prerequisites

- ✅ Git repository cloned
- ✅ Docker & Docker Compose installed
- ✅ Python 3.14+ (for local development/testing)
- ✅ OpenSSL (for JWT key generation)
- ✅ SendGrid API key (for email)
- ✅ PostgreSQL 15+ credentials
- ✅ Redis credentials

## Quick Start (Automated Deployment)

### 1. Prepare Environment

```bash
# Clone repository
git clone https://github.com/7Fernando7/AlquilaYa.git
cd AlquilaYa

# Checkout auth branch
git checkout 1-user-auth

# Copy staging environment file
cp .env.staging .env.staging
```

### 2. Configure Staging Environment

Edit `.env.staging` with your staging credentials:

```bash
# Edit these required fields:
# - SENDGRID_API_KEY: Your SendGrid API key
# - STAGING_SECRET_KEY: A secure random string (min 256 chars)
# - Database credentials if using external PostgreSQL
```

### 3. Generate JWT Keys

```bash
# Generate RSA key pair for JWT signing
openssl genrsa -out backend/packages/auth-service/private.pem 2048
openssl rsa -in backend/packages/auth-service/private.pem -pubout -out backend/packages/auth-service/public.pem

# Verify keys were created
ls -la backend/packages/auth-service/*.pem
```

### 4. Deploy to Staging

```bash
# Make deployment script executable
chmod +x deploy-staging.sh

# Run full deployment (build + deploy + test)
./deploy-staging.sh deploy

# Or build first, then deploy separately
./deploy-staging.sh build
./deploy-staging.sh deploy
```

### 5. Verify Deployment

```bash
# Check service health
curl http://localhost:8001/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "FormaconIA Auth Service",
#   "version": "0.1.0"
# }

# View logs
./deploy-staging.sh logs

# Run health checks
./deploy-staging.sh health
```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Build Docker Image

```bash
docker build \
  -f backend/packages/auth-service/Dockerfile \
  -t formacionia/auth-service:staging \
  .
```

### 2. Start Services

```bash
# Using docker-compose with staging environment
docker-compose --env-file .env.staging up -d

# Or with explicit override
docker-compose \
  -f docker-compose.yml \
  --env-file .env.staging \
  up -d
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose exec auth-service alembic upgrade head

# Create enums if needed
docker-compose exec postgres psql -U postgres -d formacionia_staging <<EOF
  CREATE TYPE user_type_enum AS ENUM ('seeker', 'owner', 'agency', 'admin');
  CREATE TYPE audit_event_type_enum AS ENUM (
    'account_created', 'email_verified', 'login_success', 'login_failure',
    'token_refresh', 'password_reset_requested', 'password_reset_confirmed', 'logout'
  );
EOF
```

### 4. Run Tests

```bash
# Run full test suite
docker-compose exec auth-service pytest tests/unit/ -v

# Expected: 104+ tests passing
```

## Deployment Verification

### Health Endpoints

```bash
# Service health
curl http://localhost:8001/health

# All services status
docker-compose ps

# Service logs
docker-compose logs auth-service
```

### Database Verification

```bash
# Check users table
docker-compose exec postgres psql -U postgres -d formacionia_staging \
  -c "SELECT COUNT(*) as total_users FROM users;"

# Check audit logs
docker-compose exec postgres psql -U postgres -d formacionia_staging \
  -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```

### Redis Verification

```bash
# Check Redis connectivity
docker-compose exec redis redis-cli ping

# Monitor keys
docker-compose exec redis redis-cli KEYS '*'

# Check memory usage
docker-compose exec redis redis-cli INFO memory
```

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staging@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "user_type": "seeker"
  }'

# Response: User object with id
```

### 2. Verify Email

```bash
# Get verification token from email or logs
# docker-compose logs auth-service | grep "verification_token"

curl -X POST http://localhost:8001/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "verification_token": "YOUR_TOKEN_HERE"
  }'

# Response: {"message": "Email verified successfully"}
```

### 3. Login

```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staging@example.com",
    "password": "SecurePass123!"
  }'

# Response: access_token, refresh_token, and user info
```

### 4. Access Protected Resource

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8001/users/{user_id}/profile

# Response: User profile data
```

### 5. Refresh Token

```bash
curl -X POST http://localhost:8001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'

# Response: New access_token
```

## Monitoring & Logs

### Real-time Logs

```bash
# Follow auth service logs
./deploy-staging.sh logs

# Or manually
docker-compose logs -f auth-service

# Follow all service logs
docker-compose logs -f
```

### Log Levels

Adjust log verbosity in `.env.staging`:

```bash
LOG_LEVEL=DEBUG    # Verbose - all messages
LOG_LEVEL=INFO     # Standard - important messages (default for staging)
LOG_LEVEL=WARNING  # Warning and errors only
LOG_LEVEL=ERROR    # Errors only
```

### Audit Logs

```bash
# View all login events
docker-compose exec postgres psql -U postgres -d formacionia_staging \
  -c "SELECT user_id, event_type, ip_address, created_at FROM audit_logs WHERE event_type = 'login_success' ORDER BY created_at DESC LIMIT 20;"

# View failed login attempts
docker-compose exec postgres psql -U postgres -d formacionia_staging \
  -c "SELECT email, ip_address, COUNT(*) as attempts FROM audit_logs WHERE event_type = 'login_failure' AND created_at > NOW() - INTERVAL '1 hour' GROUP BY email, ip_address ORDER BY attempts DESC;"
```

## Scaling & Performance

### Adjust Connection Pooling

Edit `backend/packages/auth-service/app/database/connection.py`:

```python
engine = create_engine(
    database_url,
    pool_size=20,          # Increase for more concurrent connections
    max_overflow=40,       # Additional overflow connections
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

### Increase Redis Memory

```bash
docker-compose exec redis redis-cli CONFIG SET maxmemory 1gb
```

### Load Testing

```bash
# Install Apache Bench (ab)
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test login endpoint
ab -n 1000 -c 10 -p credentials.json \
  -T application/json \
  http://localhost:8001/auth/login
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
./deploy-staging.sh logs

# Common issues:
# 1. Port already in use
docker lsof -i :8001
# Kill process: lsof -ti :8001 | xargs kill -9

# 2. Missing database
docker-compose restart postgres
sleep 10
docker-compose restart auth-service

# 3. JWT keys missing
ls -la backend/packages/auth-service/*.pem
# Regenerate if missing: see step 3 above
```

### Database Connection Errors

```bash
# Test database connectivity
docker-compose exec postgres psql -U postgres -c "SELECT NOW();"

# Check environment variables
docker-compose config | grep DATABASE_URL

# Reset database
docker volume rm formacionia_postgres_data
docker-compose restart postgres
```

### Email Not Sending

```bash
# Check SendGrid configuration
docker-compose logs auth-service | grep -i sendgrid

# Verify API key
echo $SENDGRID_API_KEY

# Test with Mailhog (development only)
# Check: http://localhost:8025
```

## Rollback Procedure

If deployment fails or issues are discovered:

```bash
# Automatic rollback (if using deployment script)
./deploy-staging.sh rollback

# Manual rollback:
# 1. Stop services
docker-compose down

# 2. Restore from backup (if available)
docker-compose exec postgres psql -U postgres -d formacionia_staging < \
  backups/formacionia_staging_LATEST.sql

# 3. Restart services
docker-compose --env-file .env.staging up -d
```

## Backup & Recovery

### Automated Backups

```bash
# Create backup before deployment
mkdir -p backups
docker-compose exec -T postgres pg_dump -U postgres -d formacionia_staging > \
  "backups/formacionia_staging_$(date +%Y%m%d_%H%M%S).sql"

# Schedule with cron:
# 0 2 * * * cd /path/to/AlquilaYa && \
#   docker-compose exec -T postgres pg_dump -U postgres -d formacionia_staging > \
#   backups/formacionia_staging_$(date +\%Y\%m\%d).sql
```

### Restore from Backup

```bash
# List available backups
ls -lh backups/

# Restore specific backup
docker-compose exec postgres psql -U postgres -d formacionia_staging < \
  backups/formacionia_staging_20260219.sql

# Verify restoration
docker-compose exec postgres psql -U postgres -d formacionia_staging \
  -c "SELECT COUNT(*) as users FROM users;"
```

## Security Checklist

Before deploying to production:

- [ ] Change default database password
- [ ] Set strong SECRET_KEY (min 256 random chars)
- [ ] Enable HTTPS/TLS
- [ ] Restrict CORS_ORIGIN to production domain only
- [ ] Set DEBUG=False in production
- [ ] Configure production email provider (SendGrid)
- [ ] Enable audit logging and monitoring
- [ ] Set up automated backups
- [ ] Configure rate limiting appropriately
- [ ] Review and rotate JWT keys quarterly
- [ ] Monitor audit logs for suspicious activity
- [ ] Set up alerts for error rates

## Next Steps

1. **Monitor in Staging**
   - Run load tests
   - Monitor performance metrics
   - Test email delivery
   - Verify audit logging

2. **Production Deployment**
   - Use similar process with production credentials
   - Enable HTTPS
   - Configure production database
   - Set up monitoring and alerting

3. **Post-Deployment**
   - Monitor logs and metrics
   - Review audit logs daily
   - Test regular backup/restore
   - Plan quarterly security updates

## Support

For issues or questions:

1. Check logs: `./deploy-staging.sh logs`
2. Check health: `./deploy-staging.sh health`
3. Review DEPLOYMENT.md in auth-service directory
4. Create GitHub issue: https://github.com/7Fernando7/AlquilaYa/issues

---

**Last Updated**: 2026-02-19
**Deployment Script Version**: 1.0.0
**Auth Service Version**: 0.1.0
**Tests Passing**: 104+
