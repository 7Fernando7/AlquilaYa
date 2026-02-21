# FormaconIA Tech Stack Decisions

**Decided**: 2026-02-19
**Status**: ✅ Approved and locked in for MVP development

---

## Architecture Overview

FormaconIA uses a **microservices architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│               React + TypeScript + Vite                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  API Gateway Layer                          │
│                   (FastAPI + OpenAPI)                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Auth       │   Properties │   Search     │   Messaging    │
│   Service    │   Service    │   Service    │   Service      │
│ (FastAPI)    │ (FastAPI)    │ (FastAPI)    │ (FastAPI)      │
└────────┬─────┴──────┬───────┴──────┬───────┴────────┬───────┘
         │            │              │                │
    ┌────▼────┬───────▼──────┬───────▼────┬──────────▼──────┐
    │PostgreSQL│   Redis      │Elasticsearch│   MinIO/S3     │
    │(Main DB) │ (Cache/Realtime)│(Search)  │ (File Storage) │
    └──────────┴──────────────┴────────────┴────────────────┘
         │
    ┌────▼──────────────────────┐
    │  Claude API (LLM)          │
    │  Python ML Services        │
    │  (Fraud, Pricing, Recs)    │
    └────────────────────────────┘
```

---

## Stack by Layer

### 1. **Frontend**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18+ | UI framework, component-based architecture |
| **TypeScript** | 5+ | Type safety, better DX |
| **Vite** | 5+ | Build tool, fast HMR |
| **TailwindCSS** | 3+ | Styling, utility-first approach |
| **React Router** | 6+ | Client-side routing |
| **Axios/SWR** | Latest | HTTP client & data fetching |
| **Redux Toolkit** | Latest | State management (optional, consider Context first) |
| **Socket.io Client** | Latest | Real-time chat & notifications |

**Rationale**:
- React ecosystem is mature and has strong real-time support (Socket.io, Redux, etc.)
- TypeScript ensures type safety in complex marketplace logic
- Vite provides fast development experience for MVP iteration
- TailwindCSS enables rapid UI iteration without custom CSS

**Dev Tools**:
- **ESLint + Prettier**: Code quality and formatting
- **Vitest + React Testing Library**: Unit & component testing
- **Storybook**: Component documentation

---

### 2. **Backend API**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Main language |
| **FastAPI** | 0.100+ | Web framework, auto-documentation |
| **Pydantic** | 2.0+ | Data validation |
| **SQLAlchemy** | 2.0+ | ORM |
| **Alembic** | 1.10+ | Database migrations |
| **Uvicorn** | Latest | ASGI server |
| **Celery** | 5.3+ | Async task queue (optional for MVP+) |
| **pytest** | Latest | Testing framework |

**Rationale**:
- Python is ideal for ML/AI integration (fraud detection, pricing)
- FastAPI is modern, fast, and has excellent async support
- Strong ecosystem for data science (numpy, pandas, scikit-learn)
- Easy integration with Claude API via Python SDK
- Excellent testing culture

**Microservices**:
Each service (Auth, Properties, Search, Messaging) is a separate FastAPI application:
- Independent scaling
- Isolated dependencies
- Clear API contracts (OpenAPI/Swagger)

---

### 3. **Database & Caching**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL** | 14+ | Primary relational database |
| **Redis** | 7+ | Cache, realtime data, session store |

**PostgreSQL Schema** (main responsibilities):
- `users` - User profiles and authentication
- `properties` - Property listings and details
- `favorites` - User saved listings
- `messages` - Chat messages and history
- `verification_records` - Owner/property verification status
- `search_history` - User search patterns (for personalization)
- `pricing_history` - Historical property prices (for ML training)

**Redis Usage**:
- Session management
- Rate limiting (login attempts, API calls)
- Cache for expensive queries (neighborhood data, search results)
- Pub/Sub for real-time notifications
- Chat message queue (before persisting to PostgreSQL)

**Rationale**:
- PostgreSQL: ACID compliance, JSON support, mature full-text search
- Redis: Sub-millisecond latency for chat, perfect for cache layer

---

### 4. **Search Engine**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Elasticsearch** | 8+ | Full-text search, NLP, vector embeddings |

**Indexing Strategy**:
- Index properties with enriched metadata (location, amenities, neighborhood info)
- Support vector embeddings for semantic search (e.g., "quiet area near metro")
- Real-time indexing: Updates in PostgreSQL → async sync to Elasticsearch
- Query expansion: "apartment" → includes "flat", "studio", "1BR"

**Rationale**:
- Mature NLP capabilities (analyzers, tokenizers)
- Vector search enables ML-powered recommendations
- Separate from database allows complex faceted queries without blocking primary DB
- Scalable: Can index millions of properties

---

### 5. **ML/AI Services**

#### Claude API (Anthropic)
**Use cases**:
- Contract analysis and explanation (Principle II: Trust)
- Listing recommendations based on user preferences
- Fraud detection reasoning (explain suspicious patterns)
- Natural language search parsing

**Integration**:
- Python SDK in backend microservices
- Async calls via Celery (don't block API responses)
- Prompt engineering for consistent outputs
- Token tracking for cost management

**Cost**: Usage-based, $0.003 input / $0.015 output per 1K tokens (estimated)

#### Python ML Services
**Use cases**:
- **Fraud Detection**: Train model on listing features (price anomalies, suspicious landlords)
- **Price Prediction**: Regression model for fair price estimates
- **Recommendation Engine**: Collaborative filtering + content-based

**Technologies**:
- **Scikit-learn**: Fraud detection classifier, price prediction
- **XGBoost**: Gradient boosting for better accuracy
- **Pandas/NumPy**: Data preprocessing
- **MLflow**: Model versioning and experiment tracking (optional)

**Rationale**:
- Hybrid approach leverages Claude for NLP understanding + Python for statistical models
- Cost-effective: Python models run locally, no per-call costs
- Full control over training data and model improvements

---

### 6. **Infrastructure & DevOps**

| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization of services |
| **Docker Compose** | Local development orchestration |
| **GitHub Actions** | CI/CD pipeline |
| **AWS/GCP/DigitalOcean** | Cloud hosting (decision deferred to deployment phase) |
| **Kubernetes** | Orchestration (post-MVP if needed) |

**Local Development** (Docker Compose):
```yaml
services:
  postgres
  redis
  elasticsearch
  auth-service (FastAPI)
  properties-service (FastAPI)
  search-service (FastAPI)
  messaging-service (FastAPI)
  frontend (React Vite dev server)
```

**CI/CD Pipeline**:
- Unit tests on every commit
- Docker image builds
- Push to registry
- Deploy to staging on PR merge
- Manual approval for production

---

## File Structure

```
FormaconIA/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/ (API clients)
│   │   ├── hooks/
│   │   ├── stores/ (Redux/Context)
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/
│   ├── packages/
│   │   ├── auth-service/
│   │   │   ├── app/
│   │   │   │   ├── api/
│   │   │   │   ├── models/
│   │   │   │   ├── schemas/
│   │   │   │   ├── services/
│   │   │   │   └── main.py
│   │   │   ├── requirements.txt
│   │   │   ├── Dockerfile
│   │   │   └── tests/
│   │   ├── properties-service/ (same structure)
│   │   ├── search-service/ (same structure)
│   │   └── messaging-service/ (same structure)
│   │
│   └── shared/
│       ├── models/ (shared Pydantic models)
│       ├── utils/ (common utilities)
│       └── auth/ (JWT validation, etc.)
│
├── ml/
│   ├── fraud_detection/
│   │   ├── model.pkl
│   │   ├── train.py
│   │   └── predict.py
│   ├── price_prediction/
│   │   ├── model.pkl
│   │   ├── train.py
│   │   └── predict.py
│   └── requirements.txt
│
├── docker-compose.yml
├── Makefile
└── TECH-STACK.md (this file)
```

---

## Key Integration Points

### Frontend ↔ Backend
- **API Protocol**: RESTful + WebSocket (for chat)
- **Authentication**: JWT tokens (issued by auth-service)
- **Real-time**: Socket.io for chat and live updates

### Backend Services ↔ Each Other
- **Service Discovery**: Environment variables (MVP), service mesh (future)
- **Communication**: HTTP REST (async via Celery)
- **Data Consistency**: Transactional outbox pattern (prevent race conditions)

### Backend ↔ External APIs
- **Claude API**: Async calls via Python SDK
- **Elasticsearch**: Sync with batch updates, async on write
- **Redis**: Cluster for high availability (optional for MVP)

---

## Security Considerations

1. **API Security**:
   - JWT tokens with short expiry (15 min), refresh tokens (7 days)
   - Rate limiting on all endpoints (Redis-backed)
   - CORS configured for frontend domain only
   - Input validation via Pydantic

2. **Database Security**:
   - Connection pooling with encrypted credentials
   - Row-level security for user data (users only see their own data)
   - Regular backups (automated)

3. **Frontend Security**:
   - Content Security Policy (CSP) headers
   - XSS protection via React's default escaping
   - HTTPS only (enforce in production)

4. **AI/ML Security**:
   - Claude API: Use API keys from environment (never hardcoded)
   - ML models: Version and audit training data
   - Fraud detection: Transparent scoring (explain why listing flagged)

---

## Testing Strategy

| Layer | Framework | Strategy |
|-------|-----------|----------|
| **Frontend** | Vitest + React Testing Library | Component testing, integration tests |
| **Backend API** | pytest + pytest-asyncio | Unit tests, API integration tests |
| **ML Models** | pytest | Data validation, model performance tests |
| **End-to-End** | Playwright | User workflows (search, chat, signup) |

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API response time | <200ms p95 | Without search queries |
| Search query time | <500ms p95 | Full-text search in Elasticsearch |
| Chat message delivery | <1s | Via Socket.io + Redis |
| Frontend load | <3s | FCP on 4G throttled |
| Concurrent users | 1000+ | For MVP launch |

---

## Cost Estimation (Monthly)

| Service | MVP Cost | Notes |
|---------|----------|-------|
| **Cloud Hosting** | $50-100 | 1-2 VMs for MVP |
| **Database** (PostgreSQL) | $15 | Managed service |
| **Redis** | $10 | Cache layer |
| **Elasticsearch** | $20-30 | 1-2 nodes |
| **Claude API** | $50-200 | Usage-based, depends on features |
| **Domain + SSL** | $15 | Automatic renewal |
| **CDN** (optional) | $5-10 | For static assets |
| **Monitoring** (DataDog/New Relic) | $20-50 | Optional for MVP |
| **Total MVP** | **~$185-415/month** | Scales with users |

---

## Technology Decision Log

| Decision | Date | Rationale | Owner |
|----------|------|-----------|-------|
| React + TypeScript | 2026-02-19 | Real-time requirements (chat), ecosystem maturity | User |
| Python + FastAPI | 2026-02-19 | ML/AI integration, developer productivity | User |
| PostgreSQL + Redis | 2026-02-19 | ACID + performance, realtime data needs | User |
| Elasticsearch | 2026-02-19 | NLP search, vector embeddings, scalability | User |
| Hybrid Claude + Python ML | 2026-02-19 | Cost-effective, full control, NLP capabilities | User |

---

## Next Steps

1. ✅ Stack decided and documented
2. ⏭️ Specify first feature (Authentication & Registration)
3. ⏭️ Plan technical architecture (API contracts, DB schema)
4. ⏭️ Generate implementation tasks
5. ⏭️ Set up project structure and Docker Compose
6. ⏭️ Begin MVP implementation

---

**Version**: 1.0.0 | **Last Updated**: 2026-02-19 | **Status**: Locked for MVP
