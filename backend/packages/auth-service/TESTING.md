# Auth Service - Testing Guide

Guía completa para probar la API de autenticación de FormaconIA usando curl.

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Terminal/PowerShell con curl
# 2. jq para parsear JSON (opcional pero recomendado)
# 3. Base de datos y servicios corriendo
```

### Setup (Docker)

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Espera a que los servicios se inicialicen (~30s)
docker-compose ps

# Verifica que auth-service esté healthy
curl http://localhost:3001/health
```

### Setup (Local)

```bash
cd backend/packages/auth-service

# 1. Environment
cp .env.example .env

# 2. Database
make db-reset
make migrate

# 3. Run server
make dev
# Escucha en http://localhost:8001
```

---

## 📚 API Endpoints

### Health Check

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "FormaconIA Auth Service",
  "version": "1.0.0"
}
```

---

## 🔑 Authentication Flow

### 1. Register (Crear cuenta)

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "user_type": "seeker"
  }'
```

**Password Requirements:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 minúscula
- Al menos 1 número
- Al menos 1 carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "name": "John Doe",
  "user_type": "seeker",
  "created_at": "2026-02-19T10:30:00Z"
}
```

---

### 2. Verify Email

Después del registro, usa el token de verificación:

```bash
VERIFICATION_TOKEN="your_token_here"

curl -X POST http://localhost:3001/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"verification_token\": \"$VERIFICATION_TOKEN\"}"
```

**Response (200):**
```json
{"message": "Email verified successfully"}
```

---

### 3. Login

Una vez verificado el email:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe",
    "user_type": "seeker",
    "created_at": "2026-02-19T10:30:00Z"
  }
}
```

---

### 4. Refresh Token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}"
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

### 5. Logout

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Response (200):**
```json
{"message": "Successfully logged out"}
```

---

## 👤 User Profile

### Get Profile (Privado)

```bash
curl -X GET http://localhost:3001/users/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "name": "John Doe",
  "phone": "+34912345678",
  "bio": "Looking for apartments in Madrid",
  "profile_photo_url": null,
  "user_type": "seeker",
  "created_at": "2026-02-19T10:30:00Z"
}
```

---

### Update Profile

```bash
curl -X PUT http://localhost:3001/users/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "phone": "+34912345678",
    "bio": "Property owner in Madrid"
  }'
```

---

### Get Public Profile

```bash
curl -X GET http://localhost:3001/users/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "bio": "Property owner in Madrid",
  "profile_photo_url": null,
  "user_type": "owner"
}
```

---

## 🔐 Password Reset

### Request Reset

```bash
curl -X POST http://localhost:3001/auth/password/reset-request \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

### Confirm Reset

```bash
curl -X POST http://localhost:3001/auth/password/confirm-reset \
  -H "Content-Type: application/json" \
  -d "{
    \"reset_token\": \"token_from_email\",
    \"new_password\": \"NewSecurePass123!\"
  }"
```

---

## 🧪 Complete Registration Flow Script

```bash
#!/bin/bash
set -e

API="http://localhost:3001"
EMAIL="alice@example.com"
PASSWORD="AlicePass123!"
NAME="Alice Johnson"

echo "1️⃣  Register..."
REGISTER=$(curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\",
    \"user_type\": \"seeker\"
  }")

echo "$REGISTER" | jq '.'
USER_ID=$(echo "$REGISTER" | jq -r '.id')

echo ""
echo "2️⃣  Get verification token from logs/Mailhog..."
read -p "Enter verification token: " VERIFY_TOKEN

echo ""
echo "3️⃣  Verify email..."
curl -s -X POST $API/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"verification_token\": \"$VERIFY_TOKEN\"}" | jq '.'

echo ""
echo "4️⃣  Login..."
LOGIN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

echo "$LOGIN" | jq '.'
ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.access_token')

echo ""
echo "5️⃣  Get profile..."
curl -s -X GET $API/users/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'

echo ""
echo "✅ Complete flow done!"
```

---

## 📖 Interactive API Documentation

Una vez el servidor está corriendo:

- **Swagger UI**: http://localhost:3001/docs
- **ReDoc**: http://localhost:3001/redoc

---

## 🔗 Integration Example (JavaScript/Fetch)

```javascript
const API = 'http://localhost:3001';

async function register(email, password, name, userType) {
  const response = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, user_type: userType })
  });
  return response.json();
}

async function login(email, password) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

async function getProfile(accessToken) {
  const response = await fetch(`${API}/users/profile`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return response.json();
}

// Usage
const user = await register('john@example.com', 'SecurePass123!', 'John', 'seeker');
const login = await login('john@example.com', 'SecurePass123!');
const profile = await getProfile(login.access_token);
```

---

**Última actualización:** 2026-02-20
