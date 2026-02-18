# Implementation Tasks: FormaconIA Marketplace MVP

**Branch**: `1-alquiler-mvp` | **Created**: 2026-02-18 | **Status**: Ready for Implementation  
**Source Spec**: `spec.md` | **Technical Plan**: `plan.md`

---

## Overview

Este documento contiene tareas técnicas granularizadas, independientemente testeables, y organizadas por dependencias. El MVP está dividido en **7 épicas** (un servicio por épica), cada una con tasks específicas.

**Total MVP Tasks**: 52 tareas (6-8 semanas de esfuerzo estimado)
**Prioridad**: MVP primero (P1 user stories), P2 complementarias, P3 admin/futures después

**Convención de Tareas**:
- `[AUTH]`, `[SEARCH]`, `[PROP]`, `[MSG]`, `[NOTIF]`, `[VERIF]`, `[USER]` = servicio responsable
- `[BLOCKED BY: TASK-ID]` = dependencias explícitas
- `[EPIC: X]` = parte de qué épica
- `[PRIORITY: P1/P2/P3]` = prioridad (P1 = bloqueante para MVP)

---

## Task Dependencies Graph

```
FOUNDATION (Week 1-2)
├── [AUTH-1] Setup & Database ← bloqueante para todo
├── [SEARCH-1] Setup Elasticsearch ← bloqueante para búsqueda
└── [PROP-1] Setup Database & Models ← bloqueante para propiedades

AUTHENTICATION (Week 2, depends on AUTH-1)
├── [AUTH-2] Implementar registro
├── [AUTH-3] Implementar login
└── [AUTH-4] Implementar JWT + refresh tokens

SEARCH (Week 3-4, depends on SEARCH-1, AUTH-4)
├── [SEARCH-2] Endpoint GET /search/properties
├── [SEARCH-3] Filtros (precio, ubicación, tipo)
├── [SEARCH-4] Geolocalización
├── [SEARCH-5] Paginación & ordenamiento
└── [SEARCH-6] Caching con Redis

PROPERTIES (Week 3-4, depends on PROP-1, AUTH-4)
├── [PROP-2] Endpoint POST /properties (crear)
├── [PROP-3] Endpoint GET /properties/:id (detalles)
├── [PROP-4] Endpoints PUT/DELETE (editar)
├── [PROP-5] Upload de fotos a S3
└── [PROP-6] Indexación en Elasticsearch

MESSAGING (Week 4-5, depends on AUTH-4, PROP-6)
├── [MSG-1] Setup WebSocket
├── [MSG-2] Endpoint POST mensaje
├── [MSG-3] WebSocket real-time
├── [MSG-4] Historial de mensajes
└── [MSG-5] Notificaciones en tiempo real

NOTIFICATIONS (Week 5, depends on NOTIF-1, PROP-6)
├── [NOTIF-2] Endpoint crear alerta
├── [NOTIF-3] Worker job para notificaciones
├── [NOTIF-4] Email transaccional
└── [NOTIF-5] Push notifications

VERIFICATION (Week 2-3, depends on AUTH-1, AUTH-4)
├── [VERIF-1] Setup & Database
├── [VERIF-2] Endpoint submit documento
├── [VERIF-3] Admin panel review
├── [VERIF-4] Badge de verificado
└── [VERIF-5] Filtro "solo verificados"

USERS (Week 5-6, depends on AUTH-4, PROP-6, MSG-5)
├── [USER-1] Setup & Database
├── [USER-2] Endpoint perfil usuario
├── [USER-3] Favoritos (GET/POST/DELETE)
├── [USER-4] Historial de búsqueda
└── [USER-5] Preferencias de notificación

FRONTEND (Week 4-6, depends on todos backends)
├── [FE-1] Setup React + Vite
├── [FE-2] Auth UI (login, register)
├── [FE-3] Search UI (formulario, mapa)
├── [FE-4] Property detail page
├── [FE-5] Chat interface
├── [FE-6] Dashboard propietario
└── [FE-7] E2E tests

INTEGRATION (Week 6-7)
├── [INT-1] API Gateway setup
├── [INT-2] CORS, rate limiting
├── [INT-3] Monitoring (Prometheus, logs)
└── [INT-4] Staging deployment
```

---

## Epic 1: Foundation & Infrastructure

### TASK AUTH-1: Setup Auth Service & Database
**Priority**: P1 **Effort**: 5 points | **Weeks**: 1-2  
**User Stories**: All (blocker)  
**Acceptance Criteria**:
- [ ] Node.js 20 + TypeScript project initialized
- [ ] PostgreSQL connection pooling configured (PgBouncer)
- [ ] Redis connection established
- [ ] Docker Compose con todos los servicios running
- [ ] Migration framework (Flyway/TypeORM) configurado
- [ ] Tabla `users` creada con schema correcto
- [ ] Password hashing utility (bcrypt) funcional
- [ ] JWT secrets generados y en .env
- [ ] Database backups automated (diario)
- [ ] Health check endpoint `/health` retorna 200

**Definition of Done**:
```
✅ docker-compose up -d && wait 30s && curl http://localhost:3001/health
✅ psql formacionia -c "SELECT COUNT(*) FROM users;" returns 0
✅ Redis PING returns PONG
✅ All services respond to health checks
```

**Technical Scope**:
- Express.js + TypeScript boilerplate
- Database migrations para user table
- Error handling middleware
- Logging configurado (Winston)
- CORS headers

**Blockers**: None (foundation task)

---

### TASK SEARCH-1: Setup Elasticsearch & Indexing Infrastructure
**Priority**: P1 **Effort**: 5 points | **Weeks**: 1-2  
**User Stories**: Story 1 (Búsqueda)  
**Acceptance Criteria**:
- [ ] Elasticsearch 8.11 running on localhost:9200
- [ ] Index `properties-v1` created con mapping correcto
- [ ] Geospatial mapping configurado (geo_point)
- [ ] Index lifecycle policy (ILM) para rotación diaria
- [ ] Elasticsearch health check implementado
- [ ] Index alias apuntando al índice actual
- [ ] Bulk ingestion endpoint para seedear datos
- [ ] Query testing (manual curl) funcionando
- [ ] Logging de queries lentas (>500ms)

**Definition of Done**:
```
✅ curl http://localhost:9200/_cluster/health returns green
✅ curl http://localhost:9200/properties-v1/_count returns {"count": 0}
✅ Index alias `properties-current` exists
✅ Bulk insert 100 test properties, verify indexed
```

**Technical Scope**:
- Elasticsearch mappings (text, keyword, geo_point, double, integer)
- Spanish analyzer configurado
- Query DSL examples (bool, range, geo_distance)
- Index warming strategy

---

### TASK PROP-1: Setup Properties Service & Database
**Priority**: P1 **Effort**: 4 points | **Weeks**: 1-2  
**User Stories**: Story 7 (Listar propiedades)  
**Acceptance Criteria**:
- [ ] Properties service proyecto creado
- [ ] PostgreSQL connection a database `formacionia`
- [ ] Tabla `properties` creada con schema
- [ ] Tabla `photos` creada (URLs, ordering)
- [ ] Foreign key a users (owner_id) funcional
- [ ] Soft delete campo (deleted_at) implementado
- [ ] Status enum (draft, active, paused, deleted) validado
- [ ] Indices creados (owner_id, city, status, price)
- [ ] Constraint validaciones (price > 0, bedrooms > 0)
- [ ] Health check endpoint funcional

**Definition of Done**:
```
✅ psql formacionia -c "SELECT * FROM properties LIMIT 1;" works
✅ Foreign key constraint validation tested
✅ INSERT property with invalid price rejected
✅ All indices exist: \d properties (shows indices)
```

**Technical Scope**:
- TypeORM entities (Property, Photo)
- Database constraints
- Migration versioning

---

### TASK VERIF-1: Setup Verification Service & Database
**Priority**: P1 **Effort**: 3 points | **Weeks**: 1-2  
**User Stories**: Story 8 (Verificación)  
**Acceptance Criteria**:
- [ ] Verification service proyecto creado
- [ ] Tabla `verifications` creada
- [ ] Foreign key a users funcional
- [ ] Status enum (pending, approved, rejected)
- [ ] Document URL storage (S3 path)
- [ ] Reviewed by admin tracking implementado
- [ ] Expiry date constraint (3 años)
- [ ] Health check endpoint

**Definition of Done**:
```
✅ Verification table structure correct
✅ Status transitions validated (pending → approved/rejected)
✅ Expired documents queryable
```

---

## Epic 2: Authentication & User Management

### TASK AUTH-2: Implement User Registration Endpoint
**Priority**: P1 **Effort**: 3 points | **Week**: 2  
**Blocked By**: AUTH-1  
**User Stories**: Story 2 (Registrarse)  
**Acceptance Criteria**:
- [ ] POST /auth/register endpoint implementado
- [ ] Email format validation (RFC 5322)
- [ ] Email uniqueness check (no duplicados)
- [ ] Password strength validation (min 8 chars, mixed case, numbers)
- [ ] Password hashing con bcrypt (cost 12)
- [ ] Nombre completo requerido
- [ ] Tipo de usuario (seeker, owner) selector
- [ ] User type persistence en database
- [ ] Error response para email duplicado (400)
- [ ] Success response retorna user object + JWT token
- [ ] Email confirmation requirement (opcional para MVP)

**Definition of Done**:
```
✅ curl -X POST http://localhost:3001/auth/register -d '{email, password, name, type}'
✅ Retorna 201 con {user, token}
✅ Password no retornado en response
✅ Segundo registro con mismo email retorna 400
✅ test:unit passes (50+ tests)
```

**Technical Scope**:
- Input validation middleware
- Error handling (validation, DB conflicts)
- JWT generation
- Type discrimination (seeker vs owner perms)

---

### TASK AUTH-3: Implement User Login Endpoint
**Priority**: P1 **Effort**: 2 points | **Week**: 2  
**Blocked By**: AUTH-2  
**User Stories**: Story 2 (Iniciar sesión)  
**Acceptance Criteria**:
- [ ] POST /auth/login endpoint implementado
- [ ] Email + password input validation
- [ ] Password comparison con bcrypt (secure timing)
- [ ] JWT token generation (HS256, 15min expiry)
- [ ] Refresh token generation (30 days, httpOnly cookie)
- [ ] Failed login attempt logging (seguridad)
- [ ] Rate limiting (5 intentos/15min por IP)
- [ ] Invalid credentials no revelan si email existe
- [ ] Success response retorna accessToken + refreshToken
- [ ] Session tracking (último login timestamp)

**Definition of Done**:
```
✅ curl -X POST http://localhost:3001/auth/login -d '{email, password}'
✅ Retorna 200 con {accessToken, refreshToken}
✅ accessToken valido en Authorization header
✅ Requests 6 en 15min retornan 429
✅ test:unit passes (password timing, rate limit tests)
```

**Technical Scope**:
- Token management (generation, validation)
- Rate limiting middleware (Redis-backed)
- Secure comparison (timing attacks prevention)
- Session storage

---

### TASK AUTH-4: Implement JWT Middleware & Token Refresh
**Priority**: P1 **Effort**: 3 points | **Week**: 2  
**Blocked By**: AUTH-3  
**User Stories**: All (required for auth)  
**Acceptance Criteria**:
- [ ] JWT verification middleware implementado
- [ ] Authorization header parsing (Bearer token)
- [ ] Token signature validation
- [ ] Expiration check (reject expired tokens)
- [ ] Token refresh endpoint POST /auth/refresh
- [ ] New access token generation on refresh
- [ ] New refresh token rotation (security)
- [ ] Logout endpoint POST /auth/logout
- [ ] Token blacklist (invalidar token en logout)
- [ ] Middleware aplicado a todos endpoints protegidos
- [ ] Unauthenticated requests retornan 401

**Definition of Done**:
```
✅ GET /search (without token) returns 401
✅ GET /search (with valid token) succeeds
✅ GET /search (with expired token) returns 401
✅ POST /auth/refresh (with valid refreshToken) returns new accessToken
✅ POST /auth/logout invalidates token immediately
✅ test:unit passes (all JWT scenarios)
```

**Technical Scope**:
- JWT validation library (jsonwebtoken)
- Token refresh flow
- Blacklist storage (Redis)
- Middleware composition

---

### TASK USER-1: Setup Users Service & Database
**Priority**: P2 **Effort**: 2 points | **Week**: 3  
**Blocked By**: AUTH-1  
**User Stories**: Story 2 (Perfil usuario)  
**Acceptance Criteria**:
- [ ] Users service proyecto creado
- [ ] Tabla `user_profiles` (extensión de users)
- [ ] Campos: phone, address, avatar_url, preferences
- [ ] Foreign key a users funcional
- [ ] Índices para queries frecuentes

**Definition of Done**:
```
✅ User profile table created and accessible
```

---

## Epic 3: Search & Discovery (P1 - Core MVP)

### TASK SEARCH-2: Implement GET /search/properties Endpoint
**Priority**: P1 **Effort**: 8 points | **Weeks**: 3-4  
**Blocked By**: SEARCH-1, AUTH-4, PROP-1  
**User Stories**: Story 1 (Buscar viviendas), Story 6 (Mapa)  
**Acceptance Criteria**:
- [ ] GET /search/properties endpoint implementado
- [ ] Query parameter parsing (city, price_min, price_max, etc.)
- [ ] Elasticsearch query construction (bool query)
- [ ] Basic filters: location, price, property_type
- [ ] Bedrooms/bathrooms filtering
- [ ] Amenities filtering (JSON array)
- [ ] Verified owners filter (solo verified)
- [ ] Results pagination (page, limit)
- [ ] Ordering: relevance, price_asc, price_desc, newest
- [ ] Response includes property details + distance (if geo-search)
- [ ] Empty results retornan 200 con array vacío
- [ ] Invalid params retornan 400 con mensaje claro
- [ ] Performance: p95 < 500ms para queries típicas

**Definition of Done**:
```
✅ curl "http://localhost:3002/search/properties?city=Madrid&price_max=1500" 
✅ Retorna {data: [{id, title, price, ...}], pagination: {...}, total: N}
✅ All filters work in combination
✅ Performance test: 1000 searches/min, p95 < 500ms
✅ test:unit passes (40+ test cases)
✅ test:integration with seeded data passes
```

**Technical Scope**:
- Elasticsearch DSL (bool, range, match, term queries)
- Query optimization
- Response serialization
- Error handling

---

### TASK SEARCH-3: Implement Advanced Filters (Price, Type, Rooms)
**Priority**: P1 **Effort**: 4 points | **Week**: 3  
**Blocked By**: SEARCH-2  
**User Stories**: Story 1 (Filtros inteligentes)  
**Acceptance Criteria**:
- [ ] Price range filter (inclusive: price >= min AND price <= max)
- [ ] Property type multi-select (piso, casa, habitacion, estudio)
- [ ] Bedrooms range filter (bedrooms_min, bedrooms_max)
- [ ] Bathrooms range filter (bathrooms_min, bathrooms_max)
- [ ] Surface area filter (square_meters_min, max)
- [ ] Amenities multi-select (aire_acondicionado, wifi, amueblado, etc.)
- [ ] Filters combinables (AND logic)
- [ ] Edge case: price_min > price_max retorna 400 con error claro
- [ ] Edge case: bedrooms_min > bedrooms_max handled gracefully

**Definition of Done**:
```
✅ GET /search?price_min=500&price_max=1500&property_type=piso&bedrooms_min=1
✅ Returns only matching properties
✅ Invalid filter combinations rejected
✅ test:unit (filter logic) passes
```

**Technical Scope**:
- Range query construction
- Multi-select parameter parsing
- Filter validation

---

### TASK SEARCH-4: Implement Geolocation Search
**Priority**: P1 **Effort**: 6 points | **Week**: 4  
**Blocked By**: SEARCH-1, SEARCH-3  
**User Stories**: Story 6 (Mapa interactivo), Story 1 (Cercano a ubicación)  
**Acceptance Criteria**:
- [ ] GET /search/nearby endpoint implementado (lat, lon, radius_km)
- [ ] Elasticsearch geo_distance query funcional
- [ ] Distance calculation en response (km)
- [ ] Radius validation (0.1 - 50 km)
- [ ] Results ordenados por distance (default)
- [ ] GET /search/suggestions endpoint para autocomplete
- [ ] Location suggestions retornan ciudades españolas + neighborhoods
- [ ] Geospatial index en Elasticsearch óptimo
- [ ] Performance: p95 < 500ms para radius searches

**Definition of Done**:
```
✅ GET /search/nearby?lat=40.4168&lon=-3.7038&radius_km=5
✅ Retorna propiedades ordenadas por distancia
✅ GET /search/suggestions?q=mad retorna ["Madrid", "Málaga", "Malasaña"]
✅ test:integration (geospatial queries) passes
```

**Technical Scope**:
- Elasticsearch geo_point mapping
- Haversine distance calculation
- Autocomplete suggester
- Location data (Spanish cities, neighborhoods)

---

### TASK SEARCH-5: Implement Pagination & Sorting
**Priority**: P1 **Effort**: 3 points | **Week**: 3  
**Blocked By**: SEARCH-2  
**User Stories**: Story 1 (Listar resultados)  
**Acceptance Criteria**:
- [ ] Pagination parameters: page, limit
- [ ] Default limit: 20, max limit: 100
- [ ] Page numbering: 1-indexed
- [ ] Response incluye: total, page, limit, total_pages, has_next, has_prev
- [ ] Sorting options: relevance (default), price_asc, price_desc, newest, oldest
- [ ] Offset calculation: (page - 1) * limit
- [ ] Out of range pages retornan última página válida o error 400
- [ ] Performance: no N+1 queries

**Definition of Done**:
```
✅ GET /search?page=2&limit=50 retorna correctos items
✅ Response pagination fields accurate
✅ Sorting works for all options
✅ test:unit (pagination logic) passes
```

**Technical Scope**:
- Elasticsearch from/size parameters
- Sorting implementation
- Pagination metadata calculation

---

### TASK SEARCH-6: Implement Caching with Redis
**Priority**: P2 **Effort**: 4 points | **Week**: 4  
**Blocked By**: SEARCH-5, SEARCH-4  
**User Stories**: Story 1 (Rendimiento)  
**Acceptance Criteria**:
- [ ] Redis cache para búsquedas frecuentes
- [ ] Cache key: hash of query parameters
- [ ] TTL: 1 hora para resultados normales
- [ ] Cache invalidation al publicar propiedad nueva
- [ ] Cache hit/miss logging
- [ ] Cache performance metrics (hit ratio)
- [ ] Graceful fallback si Redis unavailable
- [ ] Cache warming para top 100 búsquedas

**Definition of Done**:
```
✅ First search: ES query executed
✅ Second identical search: returned from cache (verified via logs)
✅ Cache invalidation works (publish property → cache cleared)
✅ Performance improvement: 10x faster for cached queries
✅ test:integration (cache invalidation) passes
```

**Technical Scope**:
- Redis client integration
- Key generation strategy
- Cache invalidation patterns
- Fallback handling

---

## Epic 4: Property Management

### TASK PROP-2: Implement POST /properties (Create Listing)
**Priority**: P1 **Effort**: 5 points | **Week**: 3  
**Blocked By**: PROP-1, AUTH-4, VERIF-4  
**User Stories**: Story 7 (Listar propiedad)  
**Acceptance Criteria**:
- [ ] POST /properties endpoint implementado
- [ ] Requiere JWT token (propietario autenticado)
- [ ] Requiere propietario verificado (check verification_status)
- [ ] Validación campos obligatorios: title, description, city, price, bedrooms
- [ ] Validación de datos: price > 0, bedrooms > 0, description >= 50 chars
- [ ] Description mínimo 50 caracteres (calidad)
- [ ] Property type enum validation (piso, casa, habitacion, estudio)
- [ ] Ubicación: city + neighborhood + postal_code o NULL
- [ ] Amenities: JSON array de strings válidos
- [ ] Property creada con status = 'draft' (no visible en búsqueda)
- [ ] Response retorna property object con id
- [ ] Error si propietario no verificado (403)

**Definition of Done**:
```
✅ curl -X POST /properties -H "Authorization: Bearer TOKEN" -d '{title, city, price, ...}'
✅ Retorna 201 con property object
✅ Status = 'draft', not visible in search
✅ Unverified owner gets 403
✅ test:unit (validation, permissions) passes
```

**Technical Scope**:
- Input validation
- Permission checking (owner verification)
- Database insert
- Response serialization

---

### TASK PROP-3: Implement GET /properties/:id (Property Details)
**Priority**: P1 **Effort**: 3 points | **Week**: 3  
**Blocked By**: PROP-2  
**User Stories**: Story 1 (Ver detalles)  
**Acceptance Criteria**:
- [ ] GET /properties/:id endpoint implementado
- [ ] Retorna property completo (todas las fields)
- [ ] Owner info incluida (id, name, verification_status, avatar)
- [ ] Photos array incluido
- [ ] Amenities array incluido
- [ ] Created/updated timestamps incluidos
- [ ] Only active properties visible (status = 'active')
- [ ] Soft-deleted propiedades no visible (404)
- [ ] 404 si propiedad no existe
- [ ] Performance: < 100ms (DB indexed)

**Definition of Done**:
```
✅ curl http://localhost:3003/properties/1
✅ Retorna 200 con complete property object
✅ Deleted property returns 404
✅ test:unit (property retrieval) passes
```

---

### TASK PROP-4: Implement PUT/DELETE for Property Management
**Priority**: P1 **Effort**: 4 points | **Week**: 3  
**Blocked By**: PROP-3  
**User Stories**: Story 7 (Editar propiedades)  
**Acceptance Criteria**:
- [ ] PUT /properties/:id endpoint (editar)
- [ ] DELETE /properties/:id endpoint (soft delete)
- [ ] Only owner puede editar/deletar (ownership check)
- [ ] 403 si no es propietario
- [ ] 404 si propiedad no existe
- [ ] PUT actualiza allowed fields (title, description, price, amenities)
- [ ] PUT NOT permite cambiar owner_id
- [ ] DELETE soft-deletes (sets deleted_at timestamp)
- [ ] Deleted properties no appear en búsqueda
- [ ] Soft-deleted pueden ser restauradas (status = 'paused' → 'active')
- [ ] Validaciones igual a POST /properties

**Definition of Done**:
```
✅ curl -X PUT /properties/1 -d '{title, price, ...}' updates property
✅ curl -X DELETE /properties/1 soft-deletes
✅ Deleted property invisible in search
✅ Owner check: non-owner gets 403
✅ test:unit (permissions, soft delete) passes
```

---

### TASK PROP-5: Implement Photo Upload to S3
**Priority**: P1 **Effort**: 5 points | **Week**: 4  
**Blocked By**: PROP-2  
**User Stories**: Story 7 (Fotos de propiedad)  
**Acceptance Criteria**:
- [ ] POST /properties/:id/photos endpoint implementado
- [ ] Multipart form data para upload
- [ ] File validation: JPEG/PNG only, max 5MB
- [ ] Photo limit: máximo 50 fotos por propiedad
- [ ] Error 400 si limite excedido
- [ ] Upload a S3 con prefix: properties/{property_id}/photos/{uuid}.jpg
- [ ] Encryption en S3 (AES-256)
- [ ] Metadata storage: URL, orden, uploaded_at
- [ ] Response retorna URL pública (CloudFront compatible)
- [ ] Soft-delete de fotos (logical delete)
- [ ] Performance: < 5s per 5MB upload

**Definition of Done**:
```
✅ curl -X POST /properties/1/photos -F "file=@image.jpg"
✅ Retorna 201 con {url, order}
✅ Photo visible en GET /properties/1
✅ Max 50 photos enforced
✅ S3 upload verified
✅ test:integration (S3 mock) passes
```

**Technical Scope**:
- File upload handling (multer)
- S3 integration (AWS SDK)
- File validation (MIME type, size)
- URL generation

---

### TASK PROP-6: Implement Property Indexing in Elasticsearch
**Priority**: P1 **Effort**: 4 points | **Week**: 4  
**Blocked By**: SEARCH-1, PROP-2, PROP-5  
**User Stories**: Story 1 (Búsqueda)  
**Acceptance Criteria**:
- [ ] Property index trigger: on POST/PUT /properties
- [ ] Index document structure: {id, title, description, city, price, bedrooms, amenities, location}
- [ ] Geospatial point: {lat, lon}
- [ ] Only active properties indexed (filter by status)
- [ ] Index update en tiempo real (< 100ms delay)
- [ ] Soft-deleted properties removed de index
- [ ] Bulk indexing para propiedades existentes
- [ ] Indexed_at timestamp tracking
- [ ] Error handling: ES unavailable → log warning, continue
- [ ] Versioning: use alias para zero-downtime reindexing

**Definition of Done**:
```
✅ POST /properties → property immediately searchable
✅ curl localhost:9200/properties-current/_search?q=madrid returns result
✅ Deleted property removed from index
✅ test:integration (indexing) passes
```

**Technical Scope**:
- Elasticsearch client integration
- Document mapping
- Real-time indexing
- Bulk operations

---

## Epic 5: Messaging & Real-time Communication

### TASK MSG-1: Setup Messaging Service & WebSocket Infrastructure
**Priority**: P2 **Effort**: 4 points | **Week**: 4  
**Blocked By**: AUTH-4  
**User Stories**: Story 5 (Contactar propietario)  
**Acceptance Criteria**:
- [ ] Messaging service proyecto creado
- [ ] WebSocket server con Socket.io configurado
- [ ] Socket.io authentication con JWT token
- [ ] Connection logging (connect, disconnect events)
- [ ] Error handling middleware (WebSocket)
- [ ] Tabla `messages` creada con schema
- [ ] Tabla `conversations` para agrupar messages
- [ ] Health check endpoint funcional

**Definition of Done**:
```
✅ WebSocket server running on port 3004
✅ Client can connect with JWT token
✅ Connection/disconnection logged
```

---

### TASK MSG-2: Implement POST /messages (Store Message)
**Priority**: P2 **Effort**: 3 points | **Week**: 4  
**Blocked By**: MSG-1  
**User Stories**: Story 5 (Chat)  
**Acceptance Criteria**:
- [ ] POST /messages endpoint implementado
- [ ] Body: {receiver_id, property_id, content}
- [ ] Sender extraído de JWT token
- [ ] Validación: content >= 1 char, <= 5000 chars
- [ ] Receiver debe existir (check users table)
- [ ] Property debe existir
- [ ] Message almacenado en DB con timestamp
- [ ] Response retorna message object con id
- [ ] Error 404 si receiver o property no existe

**Definition of Done**:
```
✅ curl -X POST /messages -d '{receiver_id, property_id, content}'
✅ Retorna 201 con message object
✅ test:unit (message storage) passes
```

---

### TASK MSG-3: Implement WebSocket Real-time Message Delivery
**Priority**: P2 **Effort**: 5 points | **Week**: 4  
**Blocked By**: MSG-2  
**User Stories**: Story 5 (Chat real-time)  
**Acceptance Criteria**:
- [ ] WebSocket endpoint: /chat/:property_id
- [ ] Client connect: emit {sender_id}
- [ ] Client send message: emit {type: 'message', content}
- [ ] Server receives → validate → store DB → broadcast
- [ ] Broadcast a receiver vía WebSocket (si conectado)
- [ ] Queue message en Redis si receiver offline
- [ ] Delivery confirmation retornada a sender
- [ ] Typing indicator (opcional): client emits {type: 'typing'}
- [ ] Delivery time: < 2 segundos P95

**Definition of Done**:
```
✅ ws.emit('message', {content}) → stored + delivered in <2s
✅ Message appears in receiver's inbox immediately
✅ Offline queuing verified
✅ test:integration (WebSocket) passes
```

**Technical Scope**:
- Socket.io room management
- Message queueing (Redis)
- Event emission
- Acknowledgments

---

### TASK MSG-4: Implement Message History Endpoint
**Priority**: P2 **Effort**: 3 points | **Week**: 5  
**Blocked By**: MSG-3  
**User Stories**: Story 5 (Historial)  
**Acceptance Criteria**:
- [ ] GET /messages/:conversation_id endpoint
- [ ] Retorna array de messages ordenados por timestamp (ASC)
- [ ] Pagination: page, limit
- [ ] Requiere autorización (user es parte de conversación)
- [ ] 403 si user no es sender/receiver
- [ ] Retorna: id, sender_id, content, created_at, is_read

**Definition of Done**:
```
✅ GET /messages/conv1?page=1&limit=20
✅ Retorna messages array, paginated
✅ Unauthorized user gets 403
```

---

### TASK MSG-5: Implement Real-time Notifications for New Messages
**Priority**: P2 **Effort**: 3 points | **Week**: 5  
**Blocked By**: MSG-3, NOTIF-4  
**User Stories**: Story 5 (Notificaciones)  
**Acceptance Criteria**:
- [ ] User receives push notification cuando mensaje llega
- [ ] Email notification option (opcional para MVP)
- [ ] Web notification (browser push)
- [ ] Badge count actualizado
- [ ] Notification contains: sender name, property title, preview of message

**Definition of Done**:
```
✅ Send message → receiver notified within 2s
✅ Browser notification appeared
```

---

## Epic 6: Notifications & Alerts

### TASK NOTIF-1: Setup Notifications Service & Queue
**Priority**: P2 **Effort**: 4 points | **Week**: 5  
**Blocked By**: AUTH-1  
**User Stories**: Story 4 (Alertas)  
**Acceptance Criteria**:
- [ ] Notifications service proyecto creado
- [ ] Bull job queue configurado (Redis-backed)
- [ ] Tabla `alerts` creada con schema
- [ ] Email service integrado (Mailhog dev, SendGrid prod)
- [ ] Health check endpoint

**Definition of Done**:
```
✅ Bull queue running
✅ Email sending tested locally (Mailhog)
```

---

### TASK NOTIF-2: Implement POST /alerts (Create Alert)
**Priority**: P2 **Effort**: 3 points | **Week**: 5  
**Blocked By**: NOTIF-1  
**User Stories**: Story 4 (Crear alerta)  
**Acceptance Criteria**:
- [ ] POST /alerts endpoint implementado
- [ ] Body: {criteria (JSON), notification_frequency}
- [ ] Criteria schema: {city, neighborhoods?, price_min?, price_max?, filters?}
- [ ] Frequency options: immediate, daily, weekly
- [ ] Alert almacenado con user_id (del token)
- [ ] Alert creada con status = 'active'
- [ ] Limit: máximo 20 alertas por usuario
- [ ] Response retorna alert object con id

**Definition of Done**:
```
✅ curl -X POST /alerts -d '{criteria, frequency}'
✅ Retorna 201 con alert object
✅ 20th alert succeeds, 21st returns 400
```

---

### TASK NOTIF-3: Implement Alert Matching Job
**Priority**: P2 **Effort**: 6 points | **Week**: 5  
**Blocked By**: NOTIF-2, PROP-6  
**User Stories**: Story 4 (Notificar propiedades)  
**Acceptance Criteria**:
- [ ] Bull job: "check_alerts" ejecutado cada 5 minutos
- [ ] For each active alert:
  - [ ] Load alert criteria
  - [ ] Query Elasticsearch con criteria
  - [ ] Compare con properties ya notificadas (avoid duplicates)
  - [ ] For each matching property: emit notification
- [ ] Notification stored en Redis queue
- [ ] Track notified_properties per alert (para no repetir)
- [ ] Handle false alarm: if alert_criteria changed, re-notify
- [ ] Performance: < 1 segundo por 100 alertas

**Definition of Done**:
```
✅ New property published → matching alerts notified within 5min
✅ Same property not notified twice
✅ test:integration (alert matching) passes
```

**Technical Scope**:
- Bull job scheduling
- Elasticsearch criteria matching
- Duplicate detection
- Notification queueing

---

### TASK NOTIF-4: Implement Email Notifications
**Priority**: P2 **Effort**: 3 points | **Week**: 5  
**Blocked By**: NOTIF-3  
**User Stories**: Story 4 (Email alert)  
**Acceptance Criteria**:
- [ ] Email template: "New property alert"
- [ ] Template variables: property title, city, price, URL, owner contact
- [ ] Email enviado dentro de 1 minuto de notification queued
- [ ] Sender: noreply@formacionia.es
- [ ] Recipient: user.email
- [ ] Unsubscribe link (comply with CAN-SPAM)
- [ ] Plain text + HTML version

**Definition of Done**:
```
✅ Alert matches property → email sent within 1min
✅ Email received at test inbox (Mailhog)
✅ Unsubscribe link works
```

**Technical Scope**:
- Email templating (Handlebars/EJS)
- Email sending (SendGrid/Mailhog)
- Queue job handling

---

### TASK NOTIF-5: Implement Push Notifications (Web)
**Priority**: P3 **Effort**: 4 points | **Week**: 6  
**Blocked By**: NOTIF-4  
**User Stories**: Story 4 (Push notification)  
**Acceptance Criteria**:
- [ ] Web push service worker registered
- [ ] User can allow/deny browser notifications
- [ ] Preference stored in user_preferences JSON
- [ ] Push sent when alert matches
- [ ] Notification includes: property preview, CTA button

**Definition of Done**:
```
✅ Browser notification appears for alert match
```

---

## Epic 7: Verification & Anti-fraud

### TASK VERIF-2: Implement POST /verification/submit (Upload Document)
**Priority**: P1 **Effort**: 4 points | **Week**: 2  
**Blocked By**: VERIF-1, AUTH-4  
**User Stories**: Story 8 (Verificación)  
**Acceptance Criteria**:
- [ ] POST /verification/submit endpoint implementado
- [ ] Body: {document_type, document_file}
- [ ] document_type: passport, dni, nie, driver_license
- [ ] File upload a S3 (encrypted)
- [ ] File validation: PDF/JPEG/PNG, max 10MB
- [ ] Verification record creado con status = 'pending'
- [ ] Requires authentication (from JWT)
- [ ] Limit: max 3 uploads per 24h
- [ ] Response retorna verification object

**Definition of Done**:
```
✅ POST /verification/submit -F "document=@passport.pdf"
✅ Retorna 201 con verification status=pending
✅ S3 document encrypted
✅ Rate limit enforced
```

---

### TASK VERIF-3: Implement Admin Verification Review
**Priority**: P1 **Effort**: 4 points | **Week**: 2  
**Blocked By**: VERIF-2  
**User Stories**: Story 8 (Admin review)  
**Acceptance Criteria**:
- [ ] Admin endpoint: GET /admin/verifications (list pending)
- [ ] Admin endpoint: PUT /admin/verifications/:id (approve/reject)
- [ ] Requires admin role (check user_type = 'admin')
- [ ] Admin can view document (presigned S3 URL)
- [ ] Admin can approve (status → 'approved')
- [ ] Admin can reject (status → 'rejected', include notes)
- [ ] Review timestamp tracking (reviewed_at)
- [ ] Email notification al usuario (approved o rejected)

**Definition of Done**:
```
✅ GET /admin/verifications returns pending verifications
✅ PUT /admin/verifications/1 -d '{status: approved}' updates
✅ User notified via email
✅ test:unit (admin permissions) passes
```

---

### TASK VERIF-4: Implement Verified Badge Display
**Priority**: P1 **Effort**: 2 points | **Week**: 3  
**Blocked By**: VERIF-3  
**User Stories**: Story 8 (Mostrar badge)  
**Acceptance Criteria**:
- [ ] Property response includes owner_verified flag
- [ ] User profile includes verification_status
- [ ] Badge visible in search results (UI)
- [ ] Badge visible on property detail (UI)
- [ ] Only approved users get badge (status = 'approved')

**Definition of Done**:
```
✅ GET /properties/1 includes owner_verified: true
✅ GET /search includes owner_verified flag per property
```

---

### TASK VERIF-5: Implement Verified-only Filter
**Priority**: P2 **Effort**: 2 points | **Week**: 3  
**Blocked By**: VERIF-4, SEARCH-3  
**User Stories**: Story 8 (Filtrar verificados)  
**Acceptance Criteria**:
- [ ] GET /search?verified_owners_only=true
- [ ] Filters results to only approved users
- [ ] Elasticsearch query includes filter: verification_status = 'approved'

**Definition of Done**:
```
✅ GET /search?verified_owners_only=true returns only verified owners
✅ test:unit (filter) passes
```

---

## Epic 8: User Favorites & Preferences

### TASK USER-2: Implement GET /users/:id (User Profile)
**Priority**: P2 **Effort**: 2 points | **Week**: 5  
**Blocked By**: USER-1  
**User Stories**: Story 2 (Perfil)  
**Acceptance Criteria**:
- [ ] GET /users/:id endpoint implementado
- [ ] Retorna: id, email, name, avatar, phone, verification_status
- [ ] Private fields (password, preferences) NOT retornadas
- [ ] 404 si usuario no existe

**Definition of Done**:
```
✅ GET /users/1 retorna public profile
✅ Password field not included
```

---

### TASK USER-3: Implement Favorites Management (GET/POST/DELETE)
**Priority**: P1 **Effort**: 4 points | **Week**: 5  
**Blocked By**: USER-1, AUTH-4, PROP-3  
**User Stories**: Story 3 (Favoritos)  
**Acceptance Criteria**:
- [ ] GET /users/favorites endpoint (list user's favorites)
- [ ] POST /users/favorites/{property_id} (add favorite)
- [ ] DELETE /users/favorites/{property_id} (remove favorite)
- [ ] Pagination en GET /users/favorites
- [ ] Favoritos ordenados por fecha creación (DESC)
- [ ] Error 404 si property no existe
- [ ] Error 409 si ya es favorito (POST)
- [ ] Idempotent DELETE (success si ya no es favorito)
- [ ] Requiresauth (JWT)

**Definition of Done**:
```
✅ POST /users/favorites/1 adds to favorites
✅ GET /users/favorites returns list
✅ DELETE /users/favorites/1 removes
✅ Duplicate POST returns 409
✅ test:unit (favorites logic) passes
```

**Technical Scope**:
- Favorites table management
- Duplicate prevention (unique constraint)
- Pagination

---

### TASK USER-4: Implement Search History Tracking
**Priority**: P3 **Effort**: 3 points | **Week**: 5  
**Blocked By**: SEARCH-2, USER-1  
**User Stories**: Story 1 (Historial búsqueda)  
**Acceptance Criteria**:
- [ ] Cada búsqueda trackeada (query parameters guardados)
- [ ] Tabla: `search_history` (user_id, query, created_at)
- [ ] GET /users/search-history endpoint
- [ ] Limit: últimos 50 búsquedas
- [ ] Ordenado por recencia (DESC)
- [ ] No duplicados: misma query en última hora → no log again
- [ ] Optional: Recomendaciones basadas en historial (futuro)

**Definition of Done**:
```
✅ Search executed → logged in search_history
✅ GET /users/search-history returns recent searches
✅ Duplicates de la misma hora no duplicados
```

---

### TASK USER-5: Implement Notification Preferences
**Priority**: P3 **Effort**: 2 points | **Week**: 6  
**Blocked By**: USER-1, NOTIF-2  
**User Stories**: Story 2 (Preferencias)  
**Acceptance Criteria**:
- [ ] User preferences JSON field (already in DB)
- [ ] PUT /users/preferences endpoint
- [ ] Body: {email: true/false, push: true/false, frequency: immediate/daily/weekly}
- [ ] Preferences used by NOTIF-3 y NOTIF-5
- [ ] Default: email=true, push=false, frequency=immediate

**Definition of Done**:
```
✅ PUT /users/preferences -d '{email: false}'
✅ Alerts respect frequency preference
```

---

## Epic 9: Frontend Implementation

### TASK FE-1: Setup React + Vite + TypeScript
**Priority**: P1 **Effort**: 3 points | **Week**: 4  
**Blocked By**: None (parallel to backends)  
**User Stories**: All (UI layer)  
**Acceptance Criteria**:
- [ ] Vite project initialized (npm create vite)
- [ ] TypeScript configured
- [ ] React 18 + React Router 6
- [ ] State management (Zustand o Redux Lite) configured
- [ ] HTTP client (Axios) configured
- [ ] ESLint + Prettier setup
- [ ] Build optimization (code splitting, lazy loading)
- [ ] Development server running on port 5173

**Definition of Done**:
```
✅ npm run dev → frontend loads on localhost:5173
✅ npm run build → bundles successfully
✅ npm run lint → no errors
```

---

### TASK FE-2: Implement Auth UI (Login & Register)
**Priority**: P1 **Effort**: 5 points | **Week**: 4  
**Blocked By**: FE-1, AUTH-2, AUTH-3  
**User Stories**: Story 2 (Registrarse, iniciar sesión)  
**Acceptance Criteria**:
- [ ] Register page: /register
  - [ ] Form: email, password, name, user_type (select)
  - [ ] Client-side validation (email format, password strength)
  - [ ] Submit button calls POST /auth/register
  - [ ] Error display (email duplicado, weak password)
  - [ ] Success redirect a /login
- [ ] Login page: /login
  - [ ] Form: email, password
  - [ ] Submit button calls POST /auth/login
  - [ ] Error handling (invalid credentials)
  - [ ] Success: token stored (localStorage o memory), redirect to /search
- [ ] Logout button (clears token)
- [ ] Protected routes (redirect to /login si no token)
- [ ] Token refresh on page load (si refreshToken disponible)

**Definition of Done**:
```
✅ Register new user → redirects to login
✅ Login with credentials → redirects to /search
✅ Token stored and used for requests
✅ Logout clears token
✅ Refreshing page maintains auth
```

**Technical Scope**:
- Form handling (React Hook Form o Formik)
- Client-side validation
- API integration
- Protected routes

---

### TASK FE-3: Implement Search UI (Form & Results)
**Priority**: P1 **Effort**: 8 points | **Weeks**: 4-5  
**Blocked By**: FE-1, SEARCH-2, SEARCH-4  
**User Stories**: Story 1 (Buscar)  
**Acceptance Criteria**:
- [ ] Search page: /search
- [ ] Search form:
  - [ ] Input: city (required, autocomplete via /search/suggestions)
  - [ ] Input: price_min, price_max (optional, sliders or text)
  - [ ] Select: property_type (multi-select)
  - [ ] Input: bedrooms_min, bedrooms_max
  - [ ] Checkboxes: amenities
  - [ ] Button: "Buscar" (calls GET /search/properties)
- [ ] Results section:
  - [ ] Card per property: photo, title, price, bedrooms, owner verified badge
  - [ ] Click card → property detail page
  - [ ] Favorite button (heart icon)
  - [ ] Contact button
- [ ] Pagination: prev/next, page numbers
- [ ] Sorting dropdown: relevance, price asc/desc
- [ ] Loading state (spinner)
- [ ] Empty state: "No properties found"
- [ ] Error state: API error message

**Definition of Done**:
```
✅ Form submits search query
✅ Results displayed as cards
✅ Pagination works
✅ Favorite button toggles
✅ Contact button visible
```

**Technical Scope**:
- Form state management
- API integration
- Component composition
- Responsive design

---

### TASK FE-4: Implement Property Detail Page
**Priority**: P1 **Effort**: 6 points | **Week**: 5  
**Blocked By**: FE-1, PROP-3, PROP-5  
**User Stories**: Story 1 (Ver detalles)  
**Acceptance Criteria**:
- [ ] Route: /property/:id
- [ ] Layout:
  - [ ] Photo carousel (first photo displayed, swipe/arrows for gallery)
  - [ ] Title, price, city, neighborhood
  - [ ] Owner info: avatar, name, verified badge, contact button
  - [ ] Details: bedrooms, bathrooms, surface, amenities
  - [ ] Description (full text)
  - [ ] Location on map (Google Maps integration)
- [ ] Actions:
  - [ ] Favorite button (toggle)
  - [ ] Contact button (opens chat modal)
  - [ ] Share button (copy URL)
  - [ ] Report button (optional)
- [ ] Loading state (skeleton)
- [ ] Error state (property not found)

**Definition of Done**:
```
✅ /property/1 loads property details
✅ Photos carousel works
✅ Map displays location
✅ Favorite button works
✅ Contact button opens chat
```

---

### TASK FE-5: Implement Chat Interface
**Priority**: P2 **Effort**: 6 points | **Week**: 5  
**Blocked By**: FE-1, MSG-3  
**User Stories**: Story 5 (Chat)  
**Acceptance Criteria**:
- [ ] Chat modal/page
- [ ] Message list: chronological order, sender/receiver distinction
- [ ] Message input: textarea + send button
- [ ] Real-time updates (WebSocket)
- [ ] Typing indicator (optional)
- [ ] Message timestamps
- [ ] Error handling (connection lost)
- [ ] Responsive (mobile-friendly)

**Definition of Done**:
```
✅ Chat messages appear in real-time
✅ Send message appears immediately
✅ WebSocket connection re-established on disconnect
```

**Technical Scope**:
- WebSocket client (Socket.io)
- Message list rendering
- Real-time updates

---

### TASK FE-6: Implement Property Owner Dashboard
**Priority**: P2 **Effort**: 8 points | **Week**: 6  
**Blocked By**: FE-1, PROP-2, PROP-4, PROP-5  
**User Stories**: Story 7 (Propietario)  
**Acceptance Criteria**:
- [ ] Route: /dashboard/owner (requiere user_type = owner)
- [ ] Features:
  - [ ] List my properties
  - [ ] Create new property button
  - [ ] Form: title, description, city, price, rooms, amenities
  - [ ] Upload photos
  - [ ] Publish button (creates property, status = active)
  - [ ] Edit/Delete buttons per property
  - [ ] View inquiries (list of interested users)
  - [ ] Message count badge
- [ ] Stats:
  - [ ] Total properties
  - [ ] Total inquiries
  - [ ] Response rate
- [ ] Actions:
  - [ ] Pause/reactivate listing
  - [ ] Message interested users

**Definition of Done**:
```
✅ Owner can create property
✅ Photos upload successfully
✅ Property visible in search after publish
✅ Owner can edit/delete own property
✅ Inquiries list displayed
```

---

### TASK FE-7: Implement E2E Tests (Cypress)
**Priority**: P3 **Effort**: 6 points | **Week**: 6  
**Blocked By**: All FE tasks  
**User Stories**: All  
**Acceptance Criteria**:
- [ ] Test: User registration flow
- [ ] Test: User login flow
- [ ] Test: Property search
- [ ] Test: Property detail view
- [ ] Test: Favorite property
- [ ] Test: Contact property owner (chat)
- [ ] Test: Owner publish property
- [ ] Test: Responsive design (mobile viewport)
- [ ] Test: Error states (network, validation)

**Definition of Done**:
```
✅ npm run test:e2e passes all tests
✅ Cypress dashboard shows test results
```

---

## Epic 10: Integration & Deployment

### TASK INT-1: Setup API Gateway
**Priority**: P2 **Effort**: 3 points | **Week**: 6  
**Blocked By**: Auth-4, SEARCH-2, PROP-2, MSG-1, NOTIF-1, VERIF-2  
**User Stories**: All (infrastructure)  
**Acceptance Criteria**:
- [ ] API Gateway (Kong o Express gateway) configured
- [ ] Routes:
  - [ ] /auth/* → Auth Service (port 3001)
  - [ ] /search/* → Search Service (port 3002)
  - [ ] /properties/* → Properties Service (port 3003)
  - [ ] /messages/* → Messaging Service (port 3004)
  - [ ] /alerts/* → Notifications Service (port 3005)
  - [ ] /verification/* → Verification Service (port 3006)
  - [ ] /users/* → Users Service (port 3007)
  - [ ] /admin/* → Admin Service (restricted to admin role)
- [ ] JWT validation en gateway
- [ ] Request logging
- [ ] Response compression (gzip)
- [ ] Gateway running on port 3000

**Definition of Done**:
```
✅ curl http://localhost:3000/search/properties works
✅ curl http://localhost:3000/auth/login works
✅ Logs show gateway routing
```

---

### TASK INT-2: Configure CORS, Rate Limiting & Security Headers
**Priority**: P1 **Effort**: 3 points | **Week**: 6  
**Blocked By**: INT-1  
**User Stories**: All (security)  
**Acceptance Criteria**:
- [ ] CORS configured: allow localhost:5173 (frontend), production domain
- [ ] Rate limiting:
  - [ ] 5 login attempts per 15 min per IP
  - [ ] 100 searches per min per user
  - [ ] 50 messages per min per user
- [ ] Security headers:
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] Content-Security-Policy
- [ ] HTTPS in production (TLS 1.3)

**Definition of Done**:
```
✅ CORS headers present
✅ Rate limit returns 429
✅ Security headers in responses
```

---

### TASK INT-3: Implement Monitoring (Prometheus, Logs, Distributed Tracing)
**Priority**: P2 **Effort**: 4 points | **Week**: 6  
**Blocked By**: INT-1  
**User Stories**: All (operations)  
**Acceptance Criteria**:
- [ ] Prometheus metrics:
  - [ ] Request latency (p50, p95, p99)
  - [ ] Error rate (4xx, 5xx)
  - [ ] Service health (up/down)
  - [ ] Database connections
  - [ ] Redis memory usage
- [ ] Logs aggregation (CloudWatch / ELK)
  - [ ] All requests logged (method, path, status, duration)
  - [ ] Error stacktraces logged
  - [ ] Security events logged
- [ ] Alerts configured:
  - [ ] Error rate > 1% → alert
  - [ ] Latency p95 > 1s → alert
  - [ ] Service down → alert
- [ ] Grafana dashboard (optional)

**Definition of Done**:
```
✅ Prometheus metrics accessible
✅ Logs viewable in CloudWatch/ELK
✅ Alerts configured and testable
```

---

### TASK INT-4: Staging Deployment & Smoke Tests
**Priority**: P2 **Effort**: 5 points | **Week**: 7  
**Blocked By**: INT-3  
**User Stories**: All (go-live prep)  
**Acceptance Criteria**:
- [ ] Staging environment setup (AWS RDS, K8s cluster)
- [ ] Docker images built for all services
- [ ] Kubernetes manifests created (deployment, service, ingress)
- [ ] Database migrations run on staging
- [ ] Data seeding (test users, test properties)
- [ ] Smoke tests automated:
  - [ ] Register user
  - [ ] Login
  - [ ] Search properties
  - [ ] Create property
  - [ ] Send message
  - [ ] Create alert
- [ ] Load testing (100 concurrent users)
- [ ] Performance testing (p95 latency recorded)
- [ ] Deploy process documented

**Definition of Done**:
```
✅ All smoke tests pass on staging
✅ Load test shows p95 < 500ms
✅ Deployment process repeatable
```

---

## Summary

**Total Tasks**: 52  
**Estimated Effort**: 130 story points (6-8 weeks with team of 4-5 developers)

### Task Dependencies Quick Reference

```
Week 1-2: Foundation
├─ AUTH-1 (5) → AUTH-2,3,4
├─ SEARCH-1 (5) → SEARCH-2,3,4,5,6
├─ PROP-1 (4) → PROP-2,3,4,5
├─ VERIF-1 (3) → VERIF-2,3,4,5
└─ USER-1 (2) → USER-2,3,4,5

Week 2-3: Authentication
├─ AUTH-2 (3) → AUTH-4
├─ AUTH-3 (2) → AUTH-4
└─ AUTH-4 (3) → SEARCH-2, PROP-2, MSG-1, VERIF-2, USER-2

Week 3-4: Core Features
├─ SEARCH-2 (8) → SEARCH-3,4,5,6
├─ PROP-2 (5) → PROP-3,4,5,6
├─ VERIF-2 (4) → VERIF-3,4,5
└─ VERIF-3 (4) → VERIF-4,5

Week 4-5: Messaging & Notifications
├─ MSG-1 (4) → MSG-2,3,4
├─ MSG-2 (3) → MSG-3,4
├─ NOTIF-1 (4) → NOTIF-2,3,4,5
└─ NOTIF-2 (3) → NOTIF-3

Week 5-6: User Features & Frontend
├─ USER-2,3,4,5 (9 points)
├─ FE-2,3,4,5,6 (29 points)
└─ Frontend integration

Week 6-7: Integration & Deployment
├─ INT-1,2,3,4 (15 points)
└─ Staging validation
```

**Recommended Development Pattern**:
1. Pair frontend + backend work (teams of 2)
2. Daily standups to track dependencies
3. Merge to main on completion of each task
4. Automated tests (Jest, Cypress) run on every merge
5. Staging deployments weekly for integration testing

