# AUTH-4 Local Quick Start (No Docker)

**Status**: ✅ Ready to run locally  
**Time to First Test**: 5 minutes  
**Full Testing**: 15 minutes  

---

## What You Have

✅ **Production-Ready Code**:
- JWT middleware (protects endpoints)
- Token blacklist (logout security)
- Complete auth controller (register, login, refresh, logout)
- Express server setup with all middleware

✅ **Configuration**:
- `.env` file created with all required settings
- Package.json configured with dev scripts
- TypeScript ready for hot-reload

✅ **Testing Guides**:
- Local setup instructions
- 10 complete manual tests
- Troubleshooting guide

---

## Prerequisites (60 seconds to verify)

```powershell
# Verify Node.js
node --version
# Must be: v20.x.x or higher

# Verify npm
npm --version
# Must be: 10.x.x or higher

# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"
# Expected: Returns "1"
# If fails: Start PostgreSQL from Windows Services

# Verify Redis is running (optional but recommended)
redis-cli ping
# Expected: PONG
# If fails: Start Redis (optional for this test)
```

---

## 5-Minute Quick Start

### Step 1: Install Dependencies (2 minutes)

```powershell
cd C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service
npm install
```

### Step 2: Start Service (1 minute)

```powershell
npm run dev

# Wait for:
# [Server] Auth Service running on port 3001
# [Server] Ready to accept requests
```

### Step 3: Test in New Terminal (2 minutes)

```powershell
# Open new PowerShell window
curl http://localhost:3001/health

# Expected: 200 OK
# {
#   "status": "ok",
#   "service": "auth-service"
# }
```

✅ **If you see 200 OK, service is running!**

---

## Complete Testing (15 Minutes)

Once service is running, use **new PowerShell terminal** to run all tests:

```powershell
# See AUTH4-LOCAL-TESTING-GUIDE.md for full details
# Or run quick versions below:

# 1. Register user
curl -X POST http://localhost:3001/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test","user_type":"seeker"}'

# 2. Login
curl -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test123!"}'

# 3. Access protected endpoint (replace TOKEN with actual token)
curl -X GET http://localhost:3001/protected `
  -H "Authorization: Bearer TOKEN"

# 4. Refresh token (replace REFRESH_TOKEN)
curl -X POST http://localhost:3001/auth/refresh `
  -H "Content-Type: application/json" `
  -d '{"refreshToken":"REFRESH_TOKEN"}'

# 5. Logout
curl -X POST http://localhost:3001/auth/logout `
  -H "Authorization: Bearer TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"refreshToken":"REFRESH_TOKEN"}'
```

---

## File Guide

### Setup & Configuration
| File | Purpose |
|------|---------|
| `AUTH-SERVICE-LOCAL-SETUP.md` | Detailed setup instructions |
| `backend/packages/auth-service/.env` | Environment config (created) |
| `backend/packages/auth-service/package.json` | npm scripts and dependencies |

### Testing
| File | Purpose |
|------|---------|
| `AUTH4-LOCAL-TESTING-GUIDE.md` | 10 complete manual tests |
| `AUTH4-LOCAL-QUICK-START.md` | This file (quick reference) |
| `scripts/test-auth4.sh` | Automated test script (if using bash) |

### Implementation Details
| File | Purpose |
|------|---------|
| `AUTH-4-IMPLEMENTATION.md` | Complete technical guide |
| `AUTH-4-FILES-CREATED.md` | Integration for other services |
| `AUTH-FOUNDATION-COMPLETE.md` | Executive summary |

---

## What's Running

### Service URL
- **Auth Service**: http://localhost:3001

### Available Endpoints
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/health` | Health check | No |
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Get new access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/protected` | Example protected endpoint | Yes |

---

## Common Issues & Fixes

### Issue: Port 3001 already in use

```powershell
# Find process
netstat -ano | findstr :3001

# Kill it
taskkill /PID <PID> /F

# Or use different port
$env:PORT=3011
npm run dev
```

### Issue: "Cannot connect to database"

```powershell
# Start PostgreSQL
# Windows Services → Find PostgreSQL → Start

# Verify
psql -U postgres -d formacionia -c "SELECT 1"
```

### Issue: "Redis connection failed"

```powershell
# Start Redis (optional)
redis-server

# Or ignore for basic testing
```

### Issue: "Module not found"

```powershell
npm install
```

---

## Development Workflow

1. **Edit code** in `src/` directory
2. **Service auto-reloads** (nodemon watches files)
3. **Test changes** with curl or Postman
4. **Check logs** in service terminal

### Example: Making a change

```powershell
# 1. Edit src/controllers/auth.controller-auth4.ts
# 2. Service auto-reloads (watch the terminal)
# 3. Test the endpoint:
curl http://localhost:3001/...
```

---

## Testing with Postman (Alternative to curl)

1. **Create new request** in Postman
2. **Set method** to POST (or GET)
3. **Set URL** to http://localhost:3001/auth/login
4. **Add headers**:
   - Key: `Content-Type`
   - Value: `application/json`
5. **Add body** (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "Test123!"
   }
   ```
6. **Send request**
7. **View response**

---

## Success Indicators

✅ **Service is running if**:
- No errors in terminal window
- Message shows "Ready to accept requests"
- Health check returns 200 OK

✅ **Tests are passing if**:
- All endpoints return expected status codes
- Tokens are being generated
- Protected endpoints require authentication

✅ **Everything working if**:
- All 10 manual tests pass
- No errors in service logs
- Tokens expire correctly
- Rate limiting triggers

---

## Next Steps

### Immediate
```powershell
# 1. Install dependencies
npm install

# 2. Start service
npm run dev

# 3. Test health check
curl http://localhost:3001/health

# 4. Run tests from AUTH4-LOCAL-TESTING-GUIDE.md
```

### Short Term
1. Complete all 10 tests
2. Review implementation code
3. Make test changes
4. Verify hot-reload works

### Next Phase
1. Integrate with Search service
2. Integrate with Properties service
3. Begin frontend development
4. Deploy to staging

---

## Command Reference

```powershell
# Navigate to auth service
cd C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm run test

# Format code
npm run format

# Lint code
npm run lint
```

---

## Environment Variables

Located in `.env` (created for you):

```env
PORT=3001                                          # Service port
NODE_ENV=development                               # Environment
DATABASE_URL=postgres://...@localhost:5432/...     # PostgreSQL
REDIS_URL=redis://localhost:6379                   # Redis
JWT_SECRET=dev-secret-...                          # Token signing key
CORS_ORIGIN=http://localhost:5173                  # Frontend origin
RATE_LIMIT_MAX_REQUESTS=5                          # Rate limit (5 per 15min)
```

**To modify**: Edit `.env` file and restart service

---

## Database Setup

The database is created automatically when you start the service (TypeORM migrations).

### Verify Database

```powershell
# Connect to database
psql -U postgres -d formacionia

# View tables
\dt

# View users
SELECT id, email, full_name, user_type FROM users;

# Exit
\q
```

---

## Performance Expectations

When running locally, you should see:

| Operation | Time |
|-----------|------|
| Health check | 1-2ms |
| Registration | 80-150ms |
| Login | 100-200ms |
| Protected endpoint | 5-10ms |
| Token refresh | 50-100ms |

If slower, check PostgreSQL/Redis performance.

---

## Troubleshooting Flow

```
Problem?
├─ Port already in use → Kill process or use different port
├─ Database error → Start PostgreSQL, verify .env
├─ Redis error → Start Redis (optional)
├─ Module error → npm install
├─ TypeScript error → Check service logs
└─ Connection refused → Verify service is running
```

Full troubleshooting: See **AUTH-SERVICE-LOCAL-SETUP.md**

---

## Summary

| Step | Time | Command |
|------|------|---------|
| Install dependencies | 2 min | `npm install` |
| Start service | 1 min | `npm run dev` |
| Health check | 1 min | `curl http://localhost:3001/health` |
| Run 10 tests | 10 min | See AUTH4-LOCAL-TESTING-GUIDE.md |
| **Total** | **15 min** | ✅ Complete testing |

---

## Files Available

```
📁 Root
├── AUTH-SERVICE-LOCAL-SETUP.md          ← Full setup guide
├── AUTH4-LOCAL-TESTING-GUIDE.md         ← 10 tests with curl
├── AUTH4-LOCAL-QUICK-START.md           ← This file
├── AUTH4-TESTING-START-HERE.md          ← Overview
├── AUTH4-MANUAL-TESTING.md              ← Alternative testing
├── backend/packages/auth-service/
│   ├── .env                             ← Config (created)
│   ├── package.json                     ← npm scripts
│   ├── src/
│   │   ├── middleware/authMiddleware.ts ← JWT verification
│   │   ├── utils/tokenBlacklist.ts      ← Blacklist management
│   │   ├── controllers/auth.controller-auth4.ts ← All endpoints
│   │   ├── routes/auth-auth4.ts         ← Routes
│   │   └── index-auth4.ts               ← Server setup
│   └── ...other files...
└── .specify/specs/1-alquiler-mvp/
    ├── AUTH-4-IMPLEMENTATION.md         ← Technical details
    ├── AUTH-4-FILES-CREATED.md          ← Integration guide
    └── AUTH-FOUNDATION-COMPLETE.md      ← Summary
```

---

## Getting Started Now

### Option A: Quick Test (5 minutes)
```powershell
cd backend\packages\auth-service
npm install
npm run dev
# In another terminal: curl http://localhost:3001/health
```

### Option B: Full Testing (15 minutes)
```powershell
# Start service (as above)
# Then follow AUTH4-LOCAL-TESTING-GUIDE.md for 10 tests
```

### Option C: Deep Dive (30 minutes)
```powershell
# 1. Read AUTH-SERVICE-LOCAL-SETUP.md
# 2. Start service with npm run dev
# 3. Run 10 tests
# 4. Review AUTH-4-IMPLEMENTATION.md
# 5. Explore src/ code
```

---

**Status**: 🟢 **READY TO START**

**Next Action**:
```powershell
cd C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service
npm install
npm run dev
```

Then open **AUTH4-LOCAL-TESTING-GUIDE.md** for testing!

---

🚀 **Let's go!**
