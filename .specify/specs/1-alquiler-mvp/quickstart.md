# QuickStart: FormaconIA Local Development

**Document**: Phase 1 Design Artifact  
**Created**: 2026-02-18  
**Target**: Developer setup (1-2 hours)

---

## Prerequisites

Ensure you have installed:
- Docker Desktop 4.13+ (with Docker Compose V2)
- Node.js 20 LTS + npm 10+
- Git
- VS Code (recommended) with extensions:
  - TypeScript
  - Prettier
  - ESLint
  - Thunder Client or Postman (for API testing)

**System Requirements**:
- 8GB RAM minimum (Docker containers: PostgreSQL, Redis, Elasticsearch)
- 5GB disk space for images and dependencies
- macOS, Linux, or Windows with WSL2

---

## Part 1: Clone & Install (5 minutes)

```bash
# Clone repository
git clone https://github.com/formacon/formacionia.git
cd formacionia

# Install root dependencies (monorepo)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

---

## Part 2: Start Services Locally (10 minutes)

### Option A: Using Docker Compose (Recommended)

```bash
# From repository root
docker-compose up -d

# Watch services starting
docker-compose logs -f

# Wait for Elasticsearch to be ready (message: "started successfully")
# Takes 30-60 seconds...
```

**Services started**:
- PostgreSQL 15: `localhost:5432` (user: postgres, password: postgres)
- Redis: `localhost:6379`
- Elasticsearch: `localhost:9200`
- Mailhog (fake SMTP): `localhost:1025` → UI at `localhost:8025`

### Option B: Manual Start (Advanced)

If you prefer running services locally without Docker:

```bash
# Terminal 1: PostgreSQL
brew install postgresql@15
pg_ctl -D /usr/local/var/postgres start

# Terminal 2: Redis
redis-server

# Terminal 3: Elasticsearch
cd elasticsearch-8.11.0
./bin/elasticsearch

# Wait for all to start...
```

---

## Part 3: Initialize Database (5 minutes)

```bash
# Create database
psql -U postgres -c "CREATE DATABASE formacionia;"

# Run migrations (creates tables)
cd backend
npm run db:migrate

# Seed test data (users, properties, etc.)
npm run db:seed

# Verify (should see users table with ~10 rows)
psql formacionia -c "SELECT COUNT(*) FROM users;"
```

**Expected output**:
```
 count
-------
    10
(1 row)
```

---

## Part 4: Start Backend Services (5 minutes)

```bash
# From backend directory
# Terminal 1: Auth Service
npm run dev:auth

# Terminal 2: Search Service
npm run dev:search

# Terminal 3: Properties Service
npm run dev:properties

# Terminal 4: Messaging Service
npm run dev:messaging

# Terminal 5: Notifications Service
npm run dev:notifications

# All services should print:
# ✓ Service running on port XXXX
# ✓ Connected to PostgreSQL
# ✓ Connected to Redis
```

**Services URLs**:
- Auth Service: `http://localhost:3001`
- Search Service: `http://localhost:3002`
- Properties Service: `http://localhost:3003`
- Messaging Service: `http://localhost:3004`
- Notifications Service: `http://localhost:3005`

---

## Part 5: Start Frontend (5 minutes)

```bash
cd frontend
npm run dev

# Browser should open to http://localhost:5173
# If not, open manually

# Watch for build output:
# ✓ VITE v5.0.0 ready in XXX ms
# ➜  Local:   http://localhost:5173
```

**Frontend is now running**. Try:
- Register new account: `http://localhost:5173/register`
- Search properties: `http://localhost:5173/search`
- View map: `http://localhost:5173/map`

---

## Part 6: Test API Endpoints (10 minutes)

### Option A: Using cURL

```bash
# 1. Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "MyPassword123!",
    "full_name": "Test User"
  }'

# Expected response:
# {
#   "user": { "id": 1, "email": "test@example.com", ... },
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }

# 2. Login (save the token from response)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "MyPassword123!"}'

# 3. Search properties (using token from above)
curl -X GET "http://localhost:3002/search/properties?city=Madrid&price_max=1500" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Expected response: array of property objects matching criteria
```

### Option B: Using Postman / Thunder Client

1. Import OpenAPI specs:
   - File → Import → Select `contracts/auth.openapi.yaml`
   - Repeat for all contract files

2. Create environment variable:
   - Variable: `token`
   - Set to JWT from login response

3. Test endpoints:
   - POST /auth/register
   - POST /auth/login (use {{token}} in subsequent requests)
   - GET /search/properties
   - POST /properties (create listing)

---

## Part 7: Verify Elasticsearch Indexing (5 minutes)

```bash
# Check if properties are indexed in Elasticsearch
curl -X GET "localhost:9200/properties-v1/_count" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match_all": {}}}'

# Expected response:
# {
#   "count": 25,
#   "_shards": { ... }
# }

# Search example:
curl -X POST "localhost:9200/properties-v1/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "city": "madrid" } },
          { "range": { "monthly_price": { "lte": 1500 } } }
        ]
      }
    }
  }'
```

---

## Part 8: Test Real-time Chat (Bonus)

Open WebSocket connection to Messaging Service:

```javascript
// In browser console (Frontend):
const ws = new WebSocket('ws://localhost:3004/chat/property/1');

ws.onopen = () => {
  console.log('Connected to chat');
  ws.send(JSON.stringify({
    type: 'message',
    content: 'Hello, is this property available?',
    sender_id: 1,
    receiver_id: 2
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};

ws.onerror = (error) => console.error('WebSocket error:', error);
```

---

## Common Issues & Troubleshooting

### PostgreSQL fails to start

```bash
# Kill any existing processes
pkill postgres

# If using Docker, check logs
docker-compose logs postgres

# If using local PostgreSQL
brew reinstall postgresql@15
pg_ctl -D /usr/local/var/postgres start
```

### Elasticsearch fails to start

```bash
# Check memory (ES needs 2GB+)
docker stats

# If using Docker, increase memory allocation
# Docker Desktop Settings → Resources → Memory: 4GB

# If using local ES
# ulimit -n 65535  # Increase file descriptors
# ./bin/elasticsearch
```

### Port already in use

```bash
# Find process using port 3001
lsof -i :3001

# Kill it
kill -9 <PID>

# Or use different port:
PORT=3011 npm run dev:auth
```

### Node/npm version mismatch

```bash
# Check versions
node --version  # Should be 20.x
npm --version   # Should be 10.x

# If old versions, upgrade
# macOS: brew upgrade node
# Ubuntu: sudo apt-get install nodejs npm
# Windows: Download from nodejs.org
```

### Dependencies installation fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock files
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

## Development Workflow

### Making Changes to Backend

```bash
# 1. Edit code (e.g., auth-service/src/routes/login.ts)
# 2. Service auto-reloads (thanks to nodemon)
# 3. Test endpoint:
curl -X POST http://localhost:3001/auth/login ...

# 4. View logs in terminal where service is running
```

### Making Changes to Frontend

```bash
# 1. Edit code (e.g., src/pages/SearchPage.tsx)
# 2. Vite hot-reloads in browser (instant)
# 3. Test in browser at http://localhost:5173

# 4. View build errors in terminal where npm run dev is running
```

### Running Tests

```bash
# Unit tests (from backend directory)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (full stack, slower)
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Linting & Formatting

```bash
# Check for issues
npm run lint

# Auto-fix formatting
npm run format
```

---

## Database Inspection

### Using psql (CLI)

```bash
# Connect to database
psql formacionia

# List tables
\dt

# View users
SELECT id, email, user_type, created_at FROM users LIMIT 5;

# View properties
SELECT id, title, city, monthly_price FROM properties LIMIT 5;

# Exit
\q
```

### Using DBeaver (GUI)

1. Download DBeaver Community Edition
2. File → New Database Connection → PostgreSQL
3. Host: localhost, Port: 5432, Username: postgres, Password: postgres
4. Test Connection → Finish
5. Browse tables visually

---

## Environment Configuration

### .env files

```bash
# Backend services (.env in backend directory)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/formacionia
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=dev-secret-never-use-in-production
NODE_ENV=development
LOG_LEVEL=debug

# Frontend (.env in frontend directory)
VITE_API_URL=http://localhost:3000  # API Gateway (to be setup)
VITE_APP_NAME=FormaconIA Dev
```

---

## Next Steps

1. **Explore codebase**:
   - Backend structure: `backend/packages/`
   - Frontend structure: `frontend/src/`
   - Database: `backend/migrations/`

2. **Read API docs**:
   - OpenAPI specs: `contracts/`
   - Generate client: `npm run codegen:api`

3. **Contribute**:
   - Pick an issue from GitHub
   - Create feature branch: `git checkout -b feature/my-feature`
   - Make changes, test locally
   - Push and create PR

4. **Learn the architecture**:
   - Read `docs/ARCHITECTURE.md`
   - Read `docs/DATABASE.md`
   - Understand microservices pattern

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker-compose up -d` | Start all services |
| `docker-compose down` | Stop all services |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Load test data |
| `npm run dev:auth` | Start Auth Service |
| `npm run test:unit` | Run unit tests |
| `npm run lint` | Check code quality |
| `npm run format` | Auto-format code |

---

## Support

- **Questions?** Ask in Discord #dev channel
- **Bug?** File issue on GitHub
- **Want to pair?** Schedule pairing session with team lead

**Happy coding! 🚀**

