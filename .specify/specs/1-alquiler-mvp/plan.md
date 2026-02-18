# Implementation Plan: FormaconIA Marketplace de Alquiler de Viviendas (MVP)

**Branch**: `1-alquiler-mvp` | **Date**: 2026-02-18 | **Spec**: spec.md  
**Input**: Feature specification from `.specify/specs/1-alquiler-mvp/spec.md`

**Status**: Draft - Planning Phase

---

## Summary

FormaconIA es un marketplace inteligente de alquiler de viviendas diseñado para escalar desde España hacia Europa. El MVP establece la base confiable con autenticación segura, búsqueda performante, y sistema de verificación anti-fraude. La arquitectura usa microservicios para soportar crecimiento futuro, con énfasis en seguridad GDPR, escalabilidad horizontal, y rendimiento de búsqueda suburganos.

Principios de diseño:
- **Seguridad First**: GDPR compliance, verificación de propietarios, protección de datos de usuario
- **Rendimiento**: Búsquedas indexadas, cachés distribuidas, CDN para contenido estático
- **Escalabilidad**: Microservicios, estadelessness, con capacidad de desplegarse en múltiples regiones
- **Confiabilidad**: Circuit breakers, retry logic, fallbacks para servicios externos

---

## Technical Context

**Architecture Style**: Microservicios (6 servicios independientes)  
**Backend Language/Version**: Node.js 20 LTS + TypeScript 5.3 (escalable, ecosystem rico, performance)  
**API Protocol**: REST con OpenAPI 3.0 (GraphQL evaluado pero pospuesto a Fase 2)  
**Storage Primary**: PostgreSQL 15 (multiregión con replicación, GDPR-ready)  
**Cache Layer**: Redis 7 (sesiones, caché de búsqueda, task queue)  
**Search Engine**: Elasticsearch 8.11 (búsqueda full-text, faceted search, geolocalización)  
**Real-time**: WebSocket + Socket.io (para chat y notificaciones en tiempo real)  
**File Storage**: AWS S3 o MinIO (fotos, documentos de verificación, escalable)  
**Message Queue**: Bull/Redis (notificaciones, processing asincrónico)  
**Testing**: Jest (unit/integration), Cypress (E2E), Artillery (performance)  
**Container**: Docker + Docker Compose (local), Kubernetes (production)  
**Deployment**: GitHub Actions (CI/CD), con rollout canary  
**Target Platform**: Linux servers (cloud-agnostic: AWS, GCP, Azure)  
**Performance Goals**:
  - Búsquedas: p95 < 500ms, p99 < 1s
  - Mapas: renderización de 100+ propiedades < 2s
  - Chat: mensajes entregados < 2s
  - Upload de fotos: < 5s para imagen 5MB
**Constraints**:
  - GDPR compliance obligatorio (EU data residency, right to deletion)
  - Uptime: 99.5% SLA para MVP
  - Costo: Optimizado para margen bruto positivo en Fase 2
  - Escalabilidad: Soportar 10x crecimiento sin refactoring arquitectural
**Scale/Scope**:
  - MVP: 100-1000 propiedades iniciales, 100-10k usuarios en 60 días
  - Año 1: 50k propiedades, 100k usuarios en múltiples ciudades españolas
  - Año 2: Expansión a Portugal/Francia, 500k propiedades, 1M usuarios

---

## Constitution Check

*GATE: Must pass before Phase 1 design proceeds.*

### Principle I: Intelligence-First
**Status**: ✅ **RESOLVED IN FUTURE PHASES**

- **MVP cumple**: Búsqueda con filtros inteligentes (geolocalización, criterios de barrio)
- **Fase 2+**: NLP para búsqueda por lenguaje natural ("busco piso tranquilo cerca del metro")
- **Fase 2+**: ML para detección de fraude, predicción de precios, reputación
- **Decisión**: MVP no incluye IA avanzada pero arquitectura permite agregar servicios ML sin refactoring

### Principle II: Trust & Security First
**Status**: ✅ **APPROVED**

Implementado en MVP:
- ✅ Verificación manual de propietarios (documento de identidad, badge visible)
- ✅ Contraseñas hashed con bcrypt + salt
- ✅ HTTPS en todas las conexiones
- ✅ GDPR compliance (right to deletion, data residency)
- ✅ Rate limiting para prevenir abuse
- ✅ Auditoria de operaciones sensibles (verificación, publicación)
- ✅ Encriptación de datos sensibles en tránsito y reposo

Futuro (Fase 2+):
- ✅ Sistema de reputación de propietarios/inquilinos basado en reviews
- ✅ ML para detección automática de listados sospechosos
- ✅ Firma digital de contratos

### Principle III: User-Centric Problem Solving
**Status**: ✅ **APPROVED**

Cada user story resuelve pain point específico del README:
- ✅ "Dificultad para encontrar piso rápido" → Story 1 (búsqueda con filtros)
- ✅ "Contacto lento con propietarios" → Story 5 (chat/messaging)
- ✅ "Falta de información real del barrio" → Story 6 (mapa + info barrio)
- ✅ "Estafas en alquileres" → Story 8 (verificación anti-fraude)
- ✅ "Precios inflados" → Visión Futura (predicción de precios)
- ✅ "Poca transparencia en contratos" → Visión Futura (contratos digitales)

### Principle IV: Marketplace Ecosystem
**Status**: ✅ **APPROVED**

Arquitectura soporta múltiples stakeholders desde MVP:
- ✅ Buscadores: interfaz de búsqueda, favoritos, alertas
- ✅ Propietarios/Agencias: dashboard de publicación, gestión de propiedades
- ✅ Admin: panel de verificación de propietarios
- ✅ Futuro: Monetización partners (bancos, seguros, empresas relocación)

### Principle V: MVP + WOW Philosophy
**Status**: ✅ **APPROVED**

MVP (Fase 1 - 6-8 semanas):
- Búsqueda, autenticación, favoritos, alertas, chat, mapa, verificación
- Sin IA avanzada, sin pago, sin servicios auxiliares

WOW (Fase 2+ - semanas 9+):
- IA, reputación, contratos digitales, pago, servicios auxiliares

**GATE RESULT**: ✅ **PASS** - Todas las 5 principles cumplidas. MVP enfocado en problemas reales, arquitectura escalable para WOW futuro.

---

## Project Structure

### Documentation (Feature Artifacts)

```
.specify/specs/1-alquiler-mvp/
├── spec.md                    ✅ Especificación completada
├── plan.md                    📍 Este archivo (planning)
├── research.md                📌 A generar (Phase 0)
├── data-model.md              📌 A generar (Phase 1)
├── quickstart.md              📌 A generar (Phase 1)
├── contracts/                 📌 A generar (Phase 1)
│   ├── auth.openapi.yaml
│   ├── search.openapi.yaml
│   ├── properties.openapi.yaml
│   ├── messaging.openapi.yaml
│   ├── notifications.openapi.yaml
│   └── verification.openapi.yaml
├── checklists/
│   └── requirements.md         ✅ Checklist completado
└── tasks.md                   📌 A generar con /speckit.tasks
```

### Source Code Structure (Monorepo)

```
formaconIA/                               # Raíz del monorepo
│
├── backend/                              # Todos los servicios Node.js
│   ├── packages/
│   │   ├── shared/                       # Código compartido (tipos, utils, constants)
│   │   │   ├── src/types/                # TypeScript interfaces
│   │   │   ├── src/utils/                # Utilidades compartidas
│   │   │   └── src/constants.ts          # Constantes globales
│   │   │
│   │   ├── auth-service/                 # Autenticación, sesiones, JWT
│   │   │   ├── src/
│   │   │   │   ├── routes/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── middleware/
│   │   │   │   └── db/migrations/
│   │   │   ├── tests/
│   │   │   └── Dockerfile
│   │   │\n│   │   ├── search-service/              # Búsqueda, filtros, indexación\n│   │   │   ├── src/\n│   │   │   │   ├── routes/\n│   │   │   │   ├── elasticsearch/\n│   │   │   │   ├── services/\n│   │   │   │   └── db/migrations/\n│   │   │   ├── tests/\n│   │   │   └── Dockerfile\n│   │   │\n│   │   ├── properties-service/          # Propiedades, publicación, listados\n│   │   │   ├── src/\n│   │   │   │   ├── routes/\n│   │   │   │   ├── controllers/\n│   │   │   │   ├── services/\n│   │   │   │   └── db/migrations/\n│   │   │   ├── tests/\n│   │   │   └── Dockerfile\n│   │   │\n│   │   ├── messaging-service/           # Chat, mensajes, notificaciones\n│   │   │   ├── src/\n│   │   │   │   ├── routes/\n│   │   │   │   ├── websocket/\n│   │   │   │   ├── services/\n│   │   │   │   └── db/migrations/\n│   │   │   ├── tests/\n│   │   │   └── Dockerfile\n│   │   │\n│   │   ├── notifications-service/       # Alertas, emails, push\n│   │   │   ├── src/\n│   │   │   │   ├── routes/\n│   │   │   │   ├── workers/             # Bull job processing\n│   │   │   │   ├── services/\n│   │   │   │   └── templates/           # Email templates\n│   │   │   ├── tests/\n│   │   │   └── Dockerfile\n│   │   │\n│   │   ├── verification-service/        # Verificación anti-fraude\n│   │   │   ├── src/\n│   │   │   │   ├── routes/\n│   │   │   │   ├── controllers/\n│   │   │   │   ├── services/\n│   │   │   │   └── db/migrations/\n│   │   │   ├── tests/\n│   │   │   └── Dockerfile\n│   │   │\n│   │   └── users-service/               # Perfiles de usuario, preferencias\n│   │       ├── src/\n│   │       │   ├── routes/\n│   │       │   ├── controllers/\n│   │       │   ├── services/\n│   │       │   └── db/migrations/\n│   │       ├── tests/\n│   │       └── Dockerfile\n│   │\n│   ├── docker-compose.yml                # Stack local (PostgreSQL, Redis, Elasticsearch)\n│   ├── package.json                      # Dependencies compartidas\n│   └── .env.example                      # Variables de entorno\n│\n├── frontend/                             # Aplicación web React\n│   ├── src/\n│   │   ├── components/                   # Componentes reutilizables\n│   │   │   ├── SearchForm/\n│   │   │   ├── PropertyCard/\n│   │   │   ├── Map/\n│   │   │   ├── Chat/\n│   │   │   └── ...\n│   │   ├── pages/                        # Páginas de routes\n│   │   │   ├── SearchPage/\n│   │   │   ├── PropertyDetail/\n│   │   │   ├── Dashboard/\n│   │   │   ├── ChatPage/\n│   │   │   └── ...\n│   │   ├── services/                     # API clients\n│   │   │   ├── api.ts\n│   │   │   ├── auth.ts\n│   │   │   ├── search.ts\n│   │   │   └── ...\n│   │   ├── hooks/                        # Custom React hooks\n│   │   ├── store/                        # State management (Redux/Zustand)\n│   │   ├── styles/                       # Global styles\n│   │   ├── utils/                        # Utilidades\n│   │   ├── App.tsx\n│   │   └── index.tsx\n│   ├── public/\n│   ├── tests/\n│   │   ├── unit/\n│   │   ├── integration/\n│   │   └── e2e/ (Cypress)\n│   ├── Dockerfile\n│   ├── .env.example\n│   └── package.json\n│\n├── infra/                                # Configuración de infraestructura\n│   ├── docker-compose.yml                # Stack completo (todos servicios)\n│   ├── kubernetes/                       # Manifests K8s para production\n│   │   ├── backend/                      # Deployments, services\n│   │   ├── frontend/                     # Deployment web\n│   │   ├── ingress.yaml                  # Routing HTTP/HTTPS\n│   │   └── configmaps/                   # Configuraciones\n│   ├── terraform/                        # IaC para cloud (AWS/GCP/Azure)\n│   ├── scripts/                          # Scripts de setup, migrations\n│   └── monitoring/                       # Prometheus, Grafana configs\n│\n├── docs/                                 # Documentación\n│   ├── ARCHITECTURE.md\n│   ├── DATABASE.md\n│   ├── API.md\n│   ├── DEPLOYMENT.md\n│   ├── DEVELOPMENT.md\n│   └── SECURITY.md\n│\n├── .github/\n│   ├── workflows/\n│   │   ├── ci.yml                        # Test & build en cada commit\n│   │   ├── deploy.yml                    # Deploy a staging/production\n│   │   └── security.yml                  # SAST, dependency scanning\n│   └── ...\n│\n├── docker-compose.yml                    # Stack local (raíz)\n├── .env.example\n├── .gitignore\n├── README.md\n└── package.json (workspace root)\n```

**Structure Decision**: **Monorepo con microservicios en Node.js**

Rationale:
- ✅ Compartir tipos TypeScript y utilidades entre servicios
- ✅ CI/CD centralizado, testing coordinado
- ✅ Facilita refactoring de servicios a medida que escala
- ✅ Desarrollo local simplificado con docker-compose
- ✅ Escalabilidad clara: cada servicio puede deployarse independientemente en K8s

---

## Microservices Architecture

### 6 Servicios Independientes (MVP + Futuro)

**1. Auth Service** (3 endpoints core)
- POST /auth/register → validación email, hashed password
- POST /auth/login → JWT token generado, session creada
- POST /auth/refresh → token rotation para seguridad

**2. Search Service** (Elasticsearch indexing)
- GET /search/properties?filters → búsqueda faceted
- GET /search/suggestions → autocomplete de ubicaciones
- Indexación en tiempo real de nuevas propiedades
- Geolocalización y cálculo de distancias

**3. Properties Service** (CRUD de listados)
- POST /properties → crear (requiere verificación)
- GET /properties/:id → detalles de propiedad
- PUT /properties/:id → editar (solo propietario)
- DELETE /properties/:id → soft delete
- Almacenamiento de fotos en S3

**4. Messaging Service** (Chat real-time)
- WebSocket /chat/:propertyId → bidireccional
- GET /messages/:conversationId → historial
- Notificaciones en tiempo real

**5. Notifications Service** (Alertas, emails)
- POST /alerts → crear alerta con criterios
- Worker jobs → notificar cuando propiedades coinciden
- Email transaccional para confirmaciones

**6. Verification Service** (Anti-fraude)
- POST /verification/submit → propietario sube documento
- Admin endpoint → revisar y aprobar/rechazar
- Badge de verificado en propietario

**7. Users Service** (Perfiles)
- GET /users/:id → perfil público
- PUT /users/profile → editar datos personales
- GET /users/favorites → mis favoritos
- GET /users/search-history → historial

### Service Communication

```
Auth Service
    ↓ (verifica JWT)
    ↓
[All other services require valid token]

Search Service ← Properties Service (indexación)
              ← Cache (Redis)

Messaging Service
    ↓ (WebSocket)
    ↓ (notificación)
Notifications Service

Verification Service
    ↓ (auditoria)
    ↓
Logs Centralizados
```

### Data Layer Design

**PostgreSQL (Primary storage)**
- 1 database por servicio (database-per-service pattern)
- Replicación master-replica para alta disponibilidad
- Backups diarios, retención 30 días
- Migrations versionadas (Flyway o similar)

**Redis (Cache + Sessions)**
- Sesiones de usuario (TTL 30 días)
- Caché de búsquedas frecuentes
- Rate limiting (tokens bucket)
- Task queue (Bull jobs)

**Elasticsearch (Full-text search)**
- Índice de propiedades con geospatial
- Actualización en tiempo real
- Clustering para alta disponibilidad

**S3/MinIO (File storage)**
- Fotos de propiedades (con CDN CloudFront/similar)
- Documentos de verificación (encriptados)
- Logs y backups

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────┐
│  Frontend       │
│  (React)        │
└────────┬────────┘
         │ 1. POST /auth/login (email, password)
         ↓
┌─────────────────────────────┐
│ Auth Service                │
│ ├─ bcrypt password check    │
│ ├─ JWT generation           │
│ └─ Session creation         │
└────────┬────────────────────┘
         │ 2. Returns JWT token + refresh token
         ↓
┌─────────────────────────────┐
│  Frontend Storage           │
│  ├─ accessToken (memory)    │ (expires 15min)
│  └─ refreshToken (httpOnly) │ (expires 30 days)
└────────┬────────────────────┘
         │ 3. GET /search with Authorization header
         ↓
┌─────────────────────────────┐
│ API Gateway / Middleware    │
│ ├─ Extract JWT from header  │
│ ├─ Verify signature         │
│ └─ Check expiration         │
└────────┬────────────────────┘
         │ 4. Token valid, allow request
         ↓
     [Service]
```

**Key Security Measures**:
- ✅ Passwords: bcrypt (cost 12), salted
- ✅ Tokens: JWT con HS256 + exp claim (15min)
- ✅ Refresh: Token rotation (new refresh on use)
- ✅ Storage: refreshToken en httpOnly cookie (no XSS risk)
- ✅ HTTPS: TLS 1.3 obligatorio en todos endpoints
- ✅ CORS: Whitelist de dominios permitidos

### Data Protection (GDPR)

**At Rest**:
- AES-256 encriptación de datos sensibles (teléfono, documentos)
- Passwords nunca almacenados en plaintext
- Backups encriptados

**In Transit**:
- HTTPS/TLS 1.3 en todas conexiones
- WebSocket Secure (WSS) para chat

**Right to Deletion**:
- Soft delete de usuarios (campo deleted_at)
- Hard delete de datos asociados (mensajes, alertas, favoritos) después de 30 días
- Documentos de verificación eliminados en 90 días post-aprobación

**Data Residency**:
- EU data centers únicamente (GDPR compliance)
- Replicación dentro de EU (Espña + Portugal para redundancia)

### Rate Limiting & Abuse Prevention

```
Rules by Endpoint:
- Login: 5 attempts/15min por IP
- Search: 100 searches/min por usuario
- Message: 50 messages/min por usuario
- Property Creation: 10/day por propietario
- Verification Upload: 3 uploads/day
```

**Implementation**:
- Redis-backed rate limiter (token bucket)
- Middleware que rechaza con 429 Too Many Requests
- Admin console para excepciones

---

## Performance Strategy

### Search Performance (Critical Path)

**Goal**: p95 < 500ms, p99 < 1s

```
User Query
    ↓
Frontend validates filters (client-side)
    ↓
GET /search/properties?filters
    ↓
    ├─ Check cache (Redis) [5ms]
    ├─ If cache hit → return [FAST PATH]
    │
    └─ Cache miss → Elasticsearch query [50-100ms]
        ├─ Filter by location (geo)
        ├─ Filter by price range (range)
        ├─ Filter by amenities (bool)
        ├─ Sort by relevance (score)
        └─ Limit results (pagination)
    ↓
Cache result for 1 hour [SET Redis]
    ↓
Return to frontend + frontend renders [<100ms]
```

**Optimizations**:
- ✅ Elasticsearch indexing pre-warmth (índices creados daily)
- ✅ Redis caching para top 100 búsquedas
- ✅ Pagination (max 50 results per page)
- ✅ Frontend infinite scroll con lazy loading

### Map Rendering (100+ propiedades)

**Goal**: renderización < 2 segundos

```
- Cluster markers si zoom ≤ 12
- Load only visible markers (viewport-based)
- Vector tiles para map base layer (Mapbox)
- Lazy load detailed info on click
```

### Chat Performance (Real-time)

**Goal**: mensajes entregados < 2s

```
User A types message
    ↓
Frontend: emit via WebSocket [<10ms]
    ↓
Messaging Service: 
    ├─ Validate message
    ├─ Store in DB [5-20ms]
    ├─ Publish to Redis (pub/sub) [<5ms]
    ├─ Emit to User B via WebSocket [<10ms]
    │
    └─ Push notification trigger [async]
```

### Database Performance

**Query Optimization**:
- ✅ Índices en fields frecuentes (user_id, property_id, created_at)
- ✅ Query analysis (EXPLAIN ANALYZE)
- ✅ Connection pooling (PgBouncer)
- ✅ Read replicas para queries intensivos (reporting)

---

## Deployment & Operations

### Environments

```
Development (Local)
    ├─ docker-compose.yml
    └─ Fake data seeded

Staging (Cloud)
    ├─ K8s cluster + RDS PostgreSQL
    ├─ Same config as production
    └─ Pre-prod testing

Production (Multi-region future)
    ├─ Spain: AWS eu-west-1 (primary)
    ├─ Portugal: AWS eu-west-2 (future)
    ├─ France: AWS eu-west-1 (future)
    └─ RTO: 1h, RPO: 15min
```

### CI/CD Pipeline

```
git push to main/develop
    ↓
GitHub Actions triggered:
    ├─ Run tests (Jest + Cypress)
    ├─ SAST security scan (Snyk/SonarQube)
    ├─ Build Docker images
    ├─ Push to registry
    │
    └─ [Auto-deploy to Staging]
        └─ Run smoke tests
        └─ Manual approval for Production
            └─ Canary deploy (10% traffic)
            └─ Monitor metrics 5min
            └─ Gradually shift 100% traffic
            └─ Rollback automatic on errors
```

### Monitoring & Observability

```
Application Metrics (Prometheus):
├─ Request latency (p50, p95, p99)
├─ Error rate (4xx, 5xx)
├─ Service dependencies (circuit breaker status)
├─ Database query performance

Infrastructure Metrics:
├─ CPU, memory, disk usage
├─ Network I/O
├─ Database connections

Logs (CloudWatch / ELK):
├─ All requests (request/response)
├─ Errors con stack trace
├─ Security events (login failure, verification)

Alerts:
├─ Error rate > 1%
├─ Latency p95 > 1s
├─ Database replication lag > 1s
├─ Disk usage > 80%
```

---

## Phase 0: Research Tasks (To Be Completed)

El planning debe resolver los siguientes unknowns:

### Technology Selection

- [ ] **Node.js vs Python vs Go**: Validar performance de búsqueda comparando benchmarks
- [ ] **React vs Vue vs Svelte**: Evaluar developer experience y bundle size
- [ ] **PostgreSQL vs MongoDB**: Trade-off relational vs document (decisión: PostgreSQL para GDPR)
- [ ] **Elasticsearch vs Milvus**: Search vector capabilities para future NLP

### Infrastructure

- [ ] **AWS vs GCP vs Azure**: Cost modeling para 1000 requests/segundo
- [ ] **Kubernetes vs Heroku vs Railway**: Trade-off between control y simplicity
- [ ] **Database replication strategy**: Multi-region setup para Europa

### Security

- [ ] **JWT vs OAuth2**: Decisión de auth mechanism
- [ ] **Data encryption key management**: Donde almacenar/rotar keys
- [ ] **GDPR data residency proof**: Compliance audit checklist

### Performance

- [ ] **Elasticsearch tuning**: Configuración óptima para geosearch
- [ ] **Redis memory limits**: Eviction policy y cache busting strategy
- [ ] **CDN selection**: CloudFront vs Bunny vs KeyCDN para imágenes

### Cost

- [ ] **Infrastructure cost forecast**: Proyección para 10k, 100k, 1M usuarios
- [ ] **Data transfer costs**: Especialmente para región Spain (AWS pricing)

---

## Phase 1: Design Artifacts (To Be Generated)

### Artifact 1: data-model.md
Documento detallado con:
- ERD (Entity Relationship Diagram)
- Schema SQL para cada tabla
- Índices y constraints
- Data lifecycle (retention policies)

### Artifact 2: contracts/
OpenAPI 3.0 specifications:
- `auth.openapi.yaml` - POST /auth/login, POST /auth/register
- `search.openapi.yaml` - GET /search/properties, GET /search/suggestions
- `properties.openapi.yaml` - CRUD endpoints
- `messaging.openapi.yaml` - WebSocket + REST
- `notifications.openapi.yaml` - POST /alerts
- `verification.openapi.yaml` - POST /verification/submit

### Artifact 3: quickstart.md
Developer guide con:
- Setup local environment (docker-compose up)
- Seed de datos para testing
- Ejemplos de API calls (curl/Postman)
- Deployment a staging

### Artifact 4: research.md
Consolidación de hallazgos Phase 0:
- Technology choices + rationale
- Cost estimates
- Risk assessment
- Alternatives rejected + por qué

---

## Complexity Tracking

No hay violaciones de constitución. La arquitectura es straightforward:
- MVP enfocado en 3 componentes críticos (search, auth, messaging)
- Microservicios dan escalabilidad sin prematura complexity
- Cada servicio es independientemente deployable

---

## Next Steps

1. **Phase 0 - Research** (1-2 days):
   - Resolver unknowns identificados arriba
   - Generar research.md con decisions y rationales

2. **Phase 1 - Design** (3-5 days):
   - Crear data-model.md (ERD, SQL schema)
   - Generar OpenAPI contracts
   - Escribir quickstart.md
   - Update agent context con tech stack

3. **Phase 2 - Tasks** (`/speckit.tasks`):
   - Convertir design a user stories granulares
   - Establecer dependencies entre servicios
   - Estimar esfuerzo por story

4. **Implementation** (`/speckit.implement`):
   - Ejecutar tasks en orden de dependency
   - MVP target: 6-8 semanas

---

## Document Control

**Status**: Draft - Ready for Phase 0 research  
**Version**: 1.0 (initial plan)  
**Last Updated**: 2026-02-18  
**Next Review**: After Phase 0 complete

