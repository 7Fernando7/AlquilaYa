# Development Setup Guide

## Quick Start (5 minutes)

```bash
# 1. Install dependencies
make install

# 2. Start all services (Docker)
make up

# 3. Verify health checks
curl http://localhost:3001/health
curl http://localhost:5432 # Should timeout (normal - just testing connection)
curl http://localhost:9200/_cluster/health
redis-cli -p 6379 ping

# 4. Services are ready!
```

## Detailed Setup

### Prerequisites
- Docker 4.13+ with Docker Compose V2
- Node.js 20 LTS
- npm 10+
- git

### Step 1: Clone & Install

```bash
git clone https://github.com/formacion/formacionia.git
cd formacionia
npm install
```

### Step 2: Configure Environment

```bash
# Copy development environment
cp .env.example .env.development

# Review and customize if needed
cat .env.development
```

### Step 3: Start Services

```bash
# Option A: Using Makefile (recommended)
make dev

# Option B: Using docker-compose directly
docker-compose up -d

# Wait for services to be healthy
sleep 10
docker-compose ps
```

### Step 4: Verify Health

```bash
# Check all services
make ps

# Or individually:
curl http://localhost:3001/health          # Auth Service
curl http://localhost:9200/_cluster/health # Elasticsearch
redis-cli -p 6379 ping                     # Redis
psql -U postgres -h localhost -d formacionia -c "SELECT 1"  # PostgreSQL
```

**Expected output:**
```json
{
  "status": "ok",
  "uptime": 12.34,
  "services": {
    "database": "up",
    "redis": "up"
  }
}
```

## Service URLs & Ports

| Service | URL | Port | Credentials |
|---------|-----|------|-------------|
| Auth Service | http://localhost:3001 | 3001 | - |
| Search Service | http://localhost:3002 | 3002 | - |
| Properties Service | http://localhost:3003 | 3003 | - |
| Messaging Service | http://localhost:3004 | 3004 | - |
| Notifications Service | http://localhost:3005 | 3005 | - |
| Verification Service | http://localhost:3006 | 3006 | - |
| Users Service | http://localhost:3007 | 3007 | - |
| PostgreSQL | localhost:5432 | 5432 | postgres/postgres |
| Redis | localhost:6379 | 6379 | - |
| Elasticsearch | http://localhost:9200 | 9200 | - |
| Mailhog (SMTP) | localhost:1025 | 1025 | - |
| Mailhog (Web) | http://localhost:8025 | 8025 | - |
| API Gateway | http://localhost:3000 | 3000 | - (future) |
| Frontend | http://localhost:5173 | 5173 | - |

## Common Commands

### Service Management

```bash
# Start services
make up

# Stop services
make down

# View logs
make logs

# View running containers
make ps

# Full reset (remove volumes)
make clean
```

### Database Management

```bash
# Run migrations
make db-migrate

# Seed test data
make db-seed

# Access PostgreSQL directly
psql -U postgres -h localhost -d formacionia

# Run a query
psql -U postgres -h localhost -d formacionia -c "SELECT COUNT(*) FROM users;"
```

### Development

```bash
# Install dependencies
make install

# Start development server for a specific service
cd backend/packages/auth-service
npm run dev

# Run tests
make test

# Run unit tests only
make test-unit

# Run integration tests
make test-int

# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### PostgreSQL Won't Connect

```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Wait for healthy status
docker-compose ps postgres
```

### Redis Connection Failed

```bash
# Test Redis connection
redis-cli -p 6379 ping

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Elasticsearch Not Responding

```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Check memory allocation
docker stats elasticsearch

# If memory issue, increase in docker-compose.yml:
#   ES_JAVA_OPTS=-Xms1g -Xmx1g

# Restart Elasticsearch
docker-compose restart elasticsearch
```

### Port Already in Use

```bash
# Find what's using the port (macOS/Linux)
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3011 npm run dev:auth
```

### Docker Volume Issues

```bash
# Clean up all volumes
docker-compose down -v

# Rebuild containers
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

## Next Steps

1. **Frontend Setup** (optional for backend-only work)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Access at http://localhost:5173

2. **Start Developing**
   - Pick a task from `.specify/specs/1-alquiler-mvp/tasks.md`
   - Follow the acceptance criteria
   - Make commits with clear messages
   - Create a PR when ready

3. **Testing**
   ```bash
   npm run test:unit
   npm run test:integration
   npm run test:e2e
   ```

4. **API Testing**
   - Import OpenAPI specs into Postman/Thunder Client
   - Specs location: `.specify/specs/1-alquiler-mvp/contracts/`
   - Create environment with base URL: `http://localhost:3000`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 18)                      │
│                    http://localhost:5173                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│           API Gateway (Kong / Express Gateway)               │
│                  http://localhost:3000                       │
└──────┬─────────┬──────────┬──────────┬──────────┬────────────┘
       │         │          │          │          │
   ┌───▼───┐ ┌──▼───┐ ┌────▼────┐ ┌──▼───┐ ┌───▼────┐
   │ Auth  │ │Search│ │Properties│ │Msgs  │ │Notifs  │
   │ :3001 │ │ :3002 │ │  :3003   │ │:3004 │ │ :3005  │
   └───┬───┘ └──┬───┘ └────┬────┘ └──┬───┘ └───┬────┘
       │        │          │         │         │
   ┌───▼────────▼──────────▼─────────▼─────────▼──────┐
   │            PostgreSQL (5432)                      │
   │              8 Services, 1 DB                     │
   └──────────────────┬──────────────────────────────┘
                      │
   ┌──────────────────┼───────────────────┐
   │                  │                   │
┌──▼──┐        ┌─────▼────┐        ┌─────▼──┐
│Redis│        │Elasticsearch│      │Mailhog │
│6379 │        │  9200      │      │1025/UI │
└─────┘        └────────────┘      └────────┘
```

## Performance Tips

1. **Increase Docker memory** (Elasticsearch needs 2GB+)
   - Docker Desktop → Settings → Resources → Memory: 4GB

2. **Use read replicas for database** (staging/production only)
   - Configured in `plan.md` deployment section

3. **Enable Redis caching** for frequent queries
   - SEARCH-6 task implements Redis caching

4. **Index optimization** in Elasticsearch
   - Data model includes optimal indices
   - Alias strategy for zero-downtime reindexing

## Security Notes

**Development Only:**
- JWT_SECRET is weak (regenerate for production)
- Elasticsearch has no authentication enabled
- All CORS origins allowed
- Debug endpoints enabled

**For Production:**
- Use strong JWT_SECRET (use `openssl rand -base64 32`)
- Enable Elasticsearch X-Pack security
- Restrict CORS origins
- Disable debug endpoints
- Use HTTPS/TLS everywhere
- Enable database SSL connections
- Rotate credentials regularly

See `plan.md` security section for complete hardening checklist.

## Getting Help

1. Check logs: `make logs`
2. Check health: `curl http://localhost:3001/health`
3. Review `.specify/specs/1-alquiler-mvp/quickstart.md`
4. Check CLAUDE.md for project conventions
5. Ask in Discord #dev channel

Happy coding! 🚀
