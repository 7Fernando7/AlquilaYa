# AUTH-4 Service - Local Development Setup

**Status**: Ready for local development  
**Time to Setup**: 15-20 minutes  
**Skip Docker**: Using npm dev scripts  

---

## Prerequisites

You need these installed on your Windows 11 machine:

### Required
- [ ] **Node.js 20 LTS** or higher - [Download](https://nodejs.org/)
  - Verify: `node --version` (should show v20.x or higher)
  - Verify: `npm --version` (should show 10.x or higher)

- [ ] **PostgreSQL 15** - [Download](https://www.postgresql.org/download/windows/)
  - Running locally on port 5432
  - Username: `postgres`
  - Password: `postgres`
  - Database: `formacionia` (create if needed)

- [ ] **Redis 7** - [Download](https://github.com/microsoftarchive/redis/releases) or use Windows Subsystem for Linux
  - Running locally on port 6379
  - Or use online Redis playground during testing

### Optional
- Git (for version control)
- VS Code (for development)
- Postman/Thunder Client (for API testing instead of curl)

---

## Step 1: Verify Prerequisites

```powershell
# Check Node.js version
node --version
# Expected: v20.x.x or higher

# Check npm version  
npm --version
# Expected: 10.x.x or higher

# Check PostgreSQL (if installed)
psql --version
# Expected: psql (PostgreSQL) 15.x or higher

# Check if PostgreSQL is running
psql -U postgres -c "SELECT 1"
# Expected: Returns "1" if PostgreSQL is running
# If fails, PostgreSQL is not running - start it first

# Check if Redis is running
redis-cli ping
# Expected: PONG
# If fails, Redis is not running - start it first
```

---

## Step 2: Set Up Database

### Option A: Using psql (Command Line)

```powershell
# Connect to PostgreSQL
psql -U postgres

# Inside psql, create the database
CREATE DATABASE formacionia;

# List databases to verify
\l

# Exit psql
\q
```

### Option B: Using pgAdmin (GUI)

1. Open pgAdmin (installed with PostgreSQL)
2. Right-click "Databases" → Create → Database
3. Name: `formacionia`
4. Click Save

### Verify Database Created

```powershell
# Connect to the new database
psql -U postgres -d formacionia -c "SELECT 1"

# Expected: Returns "1"
```

---

## Step 3: Set Up Auth Service

### Step 3a: Navigate to Auth Service Directory

```powershell
cd C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service
```

### Step 3b: Install Dependencies

```powershell
# Install npm packages
npm install

# This will install all dependencies from package.json
# Takes 2-5 minutes depending on internet speed

# Verify installation
npm list express typescript
# Should show versions for express and typescript
```

### Step 3c: Verify Environment Setup

The `.env` file has been created with these key settings:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/formacionia
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-never-use-in-production-change-this-value
PORT=3001
NODE_ENV=development
```

**If you use different credentials**, edit `.env`:

```powershell
# Open and edit .env file
code .env

# Update these if needed:
# DATABASE_URL=postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/formacionia
# REDIS_URL=redis://localhost:YOUR_PORT
```

---

## Step 4: Run Database Migrations

Before starting the service, set up the database schema:

```powershell
# From auth-service directory
npm run db:migrate

# Expected output:
# Migration "InitialMigration" has been executed successfully
# Tables created: users, verifications, etc.

# Verify tables were created
psql -U postgres -d formacionia -c "\dt"

# Expected: Should show users table and other tables
```

### Troubleshooting Migrations

**If migration fails with "no such table":**
```powershell
# TypeORM should auto-create tables, but if it doesn't:
# 1. Verify PostgreSQL is running
# 2. Check DATABASE_URL in .env
# 3. Delete database and recreate it
```

---

## Step 5: Start the Auth Service

### Option A: Development Mode (Recommended)

```powershell
# From auth-service directory: C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service

npm run dev

# Expected output (after 5-10 seconds):
# [Server] Auth Service running on port 3001
# [Server] ✓ Auth Service started successfully
# [Server] Ready to accept requests
# 
# API documentation:
#   - Health check: GET http://localhost:3001/health
#   - Register: POST http://localhost:3001/auth/register
#   - Login: POST http://localhost:3001/auth/login
#   - Refresh: POST http://localhost:3001/auth/refresh
#   - Logout: POST http://localhost:3001/auth/logout
#   - Protected: GET http://localhost:3001/protected
```

**Features**:
- ✅ Hot-reload on file changes (via nodemon)
- ✅ TypeScript compilation on-the-fly
- ✅ Full debug logging
- ✅ Best for development

### Option B: Production Mode

```powershell
# Build TypeScript to JavaScript
npm run build

# Then start
npm start

# Expected: Same output as dev mode, but without hot-reload
```

---

## Step 6: Verify Service is Running

In a **new PowerShell window** (keep auth service running in first window):

```powershell
# Test health check
curl http://localhost:3001/health

# Expected response (200 OK):
# {
#   "status": "ok",
#   "timestamp": "2026-02-18T...",
#   "service": "auth-service"
# }
```

If you get a connection error:
1. Verify auth service is running in first window
2. Check for error messages in the service logs
3. Verify port 3001 is not in use: `netstat -ano | findstr :3001`

---

## Step 7: Run Tests Locally

### Test 1: Manual Registration (Using curl in PowerShell)

```powershell
$email = "testuser-$(Get-Random)@example.com"
$body = @{
    email = $email
    password = "TestPassword123!"
    full_name = "Test User"
    user_type = "seeker"
} | ConvertTo-Json

curl -X POST http://localhost:3001/auth/register `
  -H "Content-Type: application/json" `
  -d $body

# Expected: 201 Created with user and tokens
```

### Test 2: Access Protected Endpoint

```powershell
# Extract token from register response (or login)
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/protected `
  -H "Authorization: Bearer $token"

# Expected: 200 OK with user context
```

### Test 3: Run Full Test Suite (If available)

```powershell
# From auth-service directory
npm run test

# Runs all Jest tests
# Shows coverage report
```

---

## Running AUTH-4 Tests Locally

### With npm scripts

```powershell
# From project root: C:\Users\Admin\Documents\FormaconIA

# Run automated tests (requires bash/git-bash)
bash scripts/test-auth4.sh

# Or follow manual testing guide
# See: AUTH4-MANUAL-TESTING.md
```

---

## Troubleshooting

### Issue: "ECONNREFUSED - PostgreSQL connection failed"

**Cause**: PostgreSQL not running

**Solution**:
```powershell
# On Windows, PostgreSQL runs as a service
# Start it via Services:
# 1. Press Win+R, type "services.msc"
# 2. Find "PostgreSQL" service
# 3. Right-click → Start

# Or via command line:
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
```

### Issue: "ECONNREFUSED - Redis connection failed"

**Cause**: Redis not running

**Solution**:
```powershell
# If Redis installed locally, start it:
redis-server

# If not installed, you have options:
# 1. Install Redis (via WSL or GitHub releases)
# 2. Use online Redis playground
# 3. Update .env REDIS_URL to skip it temporarily

# Skip Redis (for testing without rate limiting):
# Comment out REDIS_URL in .env (though rate limiting will fail)
```

### Issue: Port 3001 already in use

**Cause**: Another process using port 3001

**Solution**:
```powershell
# Find process on port 3001
netstat -ano | findstr :3001

# Kill the process
taskkill /PID <PID> /F

# Or use different port
$env:PORT=3011
npm run dev
```

### Issue: "Module not found" errors

**Cause**: Dependencies not installed

**Solution**:
```powershell
# Clean install
rm -r node_modules
npm cache clean --force
npm install

# Then try again
npm run dev
```

### Issue: "ENOENT: no such file or directory .env"

**Cause**: .env file missing

**Solution**:
```powershell
# .env has been created, verify it exists:
ls .env

# If missing, create it from .env.example:
copy .env.example .env
```

---

## Development Workflow

### Making Changes

1. **Edit source files** in `src/` directory
2. **Service auto-reloads** (nodemon watches for changes)
3. **Check service logs** for TypeScript compilation errors
4. **Test endpoint** with curl or Postman

### Example: Adding a New Endpoint

```bash
# 1. Edit src/routes/auth.ts - add new route
# 2. Edit src/controllers/auth.controller.ts - add handler
# 3. Service auto-reloads
# 4. Test new endpoint:
curl http://localhost:3001/new-endpoint
```

### Viewing Logs

The service logs everything to console. For specific info:

```powershell
# All logs are shown in the running service window
# Filter by searching for specific text in your terminal

# For file-based logs (if configured):
# Check logs/ directory
```

---

## Database Inspection

### Via psql

```powershell
# Connect to database
psql -U postgres -d formacionia

# View all tables
\dt

# View users
SELECT id, email, full_name, user_type, created_at FROM users;

# View user count
SELECT COUNT(*) FROM users;

# Exit
\q
```

### Via GUI (pgAdmin)

1. Open pgAdmin
2. Servers → PostgreSQL → Databases → formacionia
3. Tables → Browse data

---

## Performance Tips

### For Development

- **Use dev mode** (`npm run dev`) - better debugging
- **Keep service running** in dedicated terminal window
- **Use another terminal** for testing/development
- **Watch logs** for errors and performance issues

### For Production Testing

- **Build first**: `npm run build`
- **Run production**: `npm start`
- **Monitor startup time**: Should be < 2 seconds
- **Check memory usage**: Should be < 100MB idle

---

## Common Commands Reference

```powershell
# Navigate to auth service
cd C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm run test

# Run tests with watch
npm run test:watch

# Database migrations
npm run db:migrate

# Linting
npm run lint

# Format code
npm run format
```

---

## What's Running on Each Port

When service is running locally:

| Port | Service | URL |
|------|---------|-----|
| 3001 | Auth Service | http://localhost:3001 |
| 5432 | PostgreSQL | localhost:5432 |
| 6379 | Redis | localhost:6379 |
| 5173 | Frontend (when running) | http://localhost:5173 |

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| NODE_ENV | Environment | development, production |
| PORT | Service port | 3001 |
| DATABASE_URL | PostgreSQL connection | postgres://user:pass@host:port/db |
| REDIS_URL | Redis connection | redis://localhost:6379 |
| JWT_SECRET | Token signing key | dev-secret-... |
| CORS_ORIGIN | Allowed frontend origin | http://localhost:5173 |

---

## Next Steps

### Immediate
1. ✅ Install Node.js and npm
2. ✅ Install PostgreSQL and create database
3. ✅ Install Redis (optional for full testing)
4. ✅ Run `npm install` in auth-service
5. ✅ Run `npm run dev`
6. ✅ Test health check at http://localhost:3001/health

### Short Term
1. Run manual tests (AUTH4-MANUAL-TESTING.md)
2. Verify all endpoints working
3. Review implementation code
4. Make test requests with curl/Postman

### Next Phase
1. Integrate with Search service
2. Integrate with Properties service
3. Build frontend login/register
4. Deploy to staging

---

## Support

**If something breaks:**

1. Check logs in service window
2. Review troubleshooting section above
3. Verify prerequisites are installed
4. Check .env file settings
5. Try stopping and restarting service

**Files for reference:**
- `.env.example` - Template for environment variables
- `package.json` - All npm scripts and dependencies
- `src/index-auth4.ts` - Service entry point
- `AUTH-4-IMPLEMENTATION.md` - Technical details

---

## Summary

✅ **Local Development Ready**:
- Service runs on port 3001
- Development mode with hot-reload
- Full database support
- Redis integration
- All endpoints functional

✅ **Testing**:
- Manual testing with curl
- Automated test script available
- Unit tests via Jest
- Full test coverage

✅ **Next Step**:
```powershell
npm run dev
```

---

**Status**: 🟢 Ready for local development  
**Time to Start**: < 20 minutes  
**Expected Result**: Service running on http://localhost:3001
