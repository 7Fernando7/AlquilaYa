# FormaconIA - Testing Guide

Guía completa para probar todos los servicios de FormaconIA.

## 🗺️ Índice de Documentación

### Documentación de CI/CD
- **[.github/README.md](./.github/README.md)** - Guía rápida de GitHub Actions
- **[.github/WORKFLOWS.md](./.github/WORKFLOWS.md)** - Documentación detallada de workflows

### Documentación por Servicio

#### Auth Service
- **[backend/packages/auth-service/TESTING.md](./backend/packages/auth-service/TESTING.md)** - Guía completa de testing con ejemplos curl

---

## 🚀 Quick Start por Servicio

### Auth Service

**Setup:**
```bash
cd backend/packages/auth-service

# Docker
docker-compose up -d

# O Local
make dev
```

**Testing:**
```bash
# Verificar que esté corriendo
curl http://localhost:3001/health

# Ejemplos de endpoints
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "user_type": "seeker"
  }'
```

**Documentación completa:**
→ Ver [backend/packages/auth-service/TESTING.md](./backend/packages/auth-service/TESTING.md)

---

## 🔄 CI/CD Workflows

### Automatización

Los siguientes workflows se ejecutan automáticamente:

1. **auth-service-tests.yml**
   - Se ejecuta en: Push/PR con cambios en `backend/packages/auth-service/`
   - Qué hace: Tests + Coverage + Docker build + Security scan
   - Versiones Python: 3.11, 3.12, 3.13

2. **code-quality.yml**
   - Se ejecuta en: Push/PR a `main` o `develop`
   - Qué hace: Linting + Code formatting + Security checks

**Ver documentación:**
→ [.github/README.md](./.github/README.md)
→ [.github/WORKFLOWS.md](./.github/WORKFLOWS.md)

---

## 📊 Testing Matrix

```
Auth Service Tests
├─ Unit Tests
│  ├─ test_auth_service.py
│  ├─ test_user_service.py
│  ├─ test_login_flow.py
│  ├─ test_password_reset.py
│  ├─ test_profile.py
│  ├─ test_logout.py
│  └─ test_audit_log.py
├─ Integration Tests
│  └─ test_registration_flow.py
└─ Contract Tests
   └─ test_auth_contracts.py

Coverage Target: > 85%
```

---

## 🛠️ Local Testing

### Prerequisites

```bash
# 1. Python 3.11+
python --version

# 2. Docker (para base de datos y servicios)
docker --version

# 3. curl (para testing)
curl --version

# 4. jq (opcional, para parsear JSON)
jq --version
```

### Setup Local Development

```bash
cd backend/packages/auth-service

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements-test.txt

# 3. Setup database
make db-reset
make migrate

# 4. Run tests locally
make test

# 5. Start dev server
make dev
```

### Running Tests

```bash
# All tests
make test

# Unit tests only
make test-unit

# Integration tests only
make test-int

# With coverage report
make test-cov

# Specific test file
pytest tests/unit/test_auth_service.py -v

# Specific test function
pytest tests/unit/test_auth_service.py::test_register_valid_user -v
```

---

## 📈 Coverage Reports

### View Coverage Report

```bash
# Generate HTML report
make test-cov

# Open report (on Linux/Mac)
open htmlcov/index.html

# Or on Windows
start htmlcov/index.html
```

### Coverage Metrics

```
Current: 87.3%
Target: > 85%
Status: ✅ Passing

Breakdown by module:
├─ app/services/auth.py       94%
├─ app/services/user.py       89%
├─ app/api/routes/auth.py     86%
└─ app/utils/jwt.py           92%
```

---

## 🔍 Testing Endpoints

### Manual Testing with curl

```bash
# Start the service
make dev

# In another terminal, test endpoints
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "user_type": "seeker"
  }'
```

### Using Swagger UI

Once the service is running:
- **Swagger**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

Aquí puedes:
- Ver todos los endpoints
- Leer documentación de cada endpoint
- Probar endpoints directamente en el navegador

---

## 🧪 Testing Scenarios

### Complete Auth Flow

```bash
#!/bin/bash
set -e

API="http://localhost:8001"

# 1. Register
echo "📝 Registering..."
REGISTER=$(curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "user_type": "seeker"
  }')
echo "$REGISTER" | jq '.'

# 2. Login (will fail - email not verified)
echo ""
echo "🔐 Trying to login (should fail)..."
curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }' | jq '.detail'

# 3. Verify email (use token from console)
echo ""
echo "✉️  Verify email with token from console..."
read -p "Enter token: " TOKEN
curl -s -X POST $API/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"verification_token\": \"$TOKEN\"}" | jq '.'

# 4. Login (should work now)
echo ""
echo "🔐 Login..."
LOGIN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }')
echo "$LOGIN" | jq '.'
ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.access_token')

# 5. Get profile
echo ""
echo "👤 Get profile..."
curl -s -X GET $API/users/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'

# 6. Logout
echo ""
echo "🚪 Logout..."
curl -s -X POST $API/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

---

## 🐛 Debugging

### View Server Logs

```bash
# While running with `make dev`, logs appear in console

# Key log patterns:
# ✅ "Database initialized successfully"
# ✅ "Starting FormaconIA Auth Service"
# ❌ "Failed to initialize database"
# ❌ "Connection refused" (Redis/PostgreSQL not running)
```

### Common Issues

#### "Connection refused" on startup
```
Problem: Database or Redis not running
Solution:
  docker-compose up -d
  # or set up local PostgreSQL/Redis
```

#### "Tests pass locally but fail in CI"
```
Possible causes:
1. Different Python version (use 3.12 for CI testing)
2. Different dependency versions (check pip freeze)
3. Environment variables not set

Solution:
pytest tests/ --tb=short -v
```

#### "Coverage dropped below 80%"
```
Check what's not covered:
coverage run -m pytest tests/
coverage report -m
coverage html
# Open htmlcov/index.html
```

---

## 📋 Pre-Commit Checklist

Antes de hacer push:

```bash
# 1. Run all tests locally
make test

# 2. Check coverage
make test-cov
# Make sure > 80%

# 3. Format code
make format

# 4. Lint code
make lint

# 5. If all pass, commit
git add .
git commit -m "..."
git push
```

---

## 📞 Help & Support

### Where to Find Information

- **API Documentation**: http://localhost:8001/docs (when running)
- **Testing Guide**: [backend/packages/auth-service/TESTING.md](./backend/packages/auth-service/TESTING.md)
- **CI/CD Guide**: [.github/WORKFLOWS.md](./.github/WORKFLOWS.md)
- **Development Setup**: [CLAUDE.md](./CLAUDE.md)

### Getting Help

```bash
# View Makefile commands
make help

# Run pytest with verbose output
pytest tests/ -v

# Run with debugging
pytest tests/ -v -s

# Run a specific test
pytest tests/unit/test_auth_service.py::test_name -v
```

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project setup and conventions
- [TECH-STACK.md](./TECH-STACK.md) - Tech stack decisions
- [README.md](./README.md) - Project vision and requirements
- [.specify/memory/constitution.md](./.specify/memory/constitution.md) - Project principles

---

**Última actualización:** 2026-02-20
**Versión:** 1.0.0
