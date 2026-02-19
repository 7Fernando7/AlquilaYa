# Data Model: FormaconIA Marketplace

**Document**: Phase 1 Design Artifact  
**Created**: 2026-02-18  
**Status**: Design

---

## Entity Relationship Diagram (Conceptual)

```
┌──────────────┐
│ users        │
├──────────────┤
│ id (PK)      │
│ email        │
│ password     │
│ type         │
│ verified     │
└──────┬───────┘
       │
       ├─────────────────────────┬─────────────────┐
       │                         │                 │
       ↓                         ↓                 ↓
┌──────────────┐         ┌──────────────┐    ┌──────────────┐
│ properties   │         │ messages     │    │ alerts       │
├──────────────┤         ├──────────────┤    ├──────────────┤
│ id (PK)      │         │ id (PK)      │    │ id (PK)      │
│ owner_id (FK)│         │ sender_id(FK)│    │ user_id (FK) │
│ title        │         │ receiver_id  │    │ criteria     │
│ location     │         │ property_id  │    │ frequency    │
│ price        │         │ content      │    └──────────────┘
└──────┬───────┘         │ created_at   │
       │                 └──────────────┘
       │
       ├─────────────────┐
       │                 │
       ↓                 ↓
┌──────────────┐    ┌──────────────┐
│ favorites    │    │ verifications│
├──────────────┤    ├──────────────┤
│ id (PK)      │    │ id (PK)      │
│ user_id (FK) │    │ user_id (FK) │
│ property_id  │    │ document_url │
│ created_at   │    │ status       │
└──────────────┘    └──────────────┘
```

---

## Database Schema (PostgreSQL 15)

### Table: users
**Purpose**: Usuarios de la plataforma (buscadores, propietarios, agencias, admin)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  user_type ENUM('seeker', 'owner', 'agency', 'admin') NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  address TEXT,
  
  -- Verificación
  verification_status ENUM('unverified', 'pending', 'approved', 'rejected') DEFAULT 'unverified',
  verification_document_url TEXT,
  verification_date TIMESTAMP,
  
  -- Preferencias y auditoría
  notification_preferences JSONB DEFAULT '{"email": true, "push": false}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,  -- Soft delete para GDPR right to deletion
  
  -- Índices para queries frecuentes
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  INDEX idx_email (email),
  INDEX idx_user_type (user_type),
  INDEX idx_verification_status (verification_status),
  INDEX idx_created_at (created_at)
);
```

**Key Constraints**:
- Email único y válido (formato)
- Password hasheado con bcrypt (nunca plaintext)
- user_type determina permisos (enum, no string)
- deleted_at para cumplir GDPR right to deletion

---

### Table: properties
**Purpose**: Listados de propiedades (pisos, casas, habitaciones)

```sql
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Ubicación (crítico para búsqueda)
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  neighborhood VARCHAR(100),
  postal_code VARCHAR(20),
  street_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Características
  property_type ENUM('piso', 'casa', 'habitacion', 'estudio') NOT NULL,
  bedrooms INTEGER NOT NULL CHECK (bedrooms > 0),
  bathrooms DECIMAL(2, 1) NOT NULL CHECK (bathrooms > 0),
  square_meters DECIMAL(7, 2),
  monthly_price DECIMAL(10, 2) NOT NULL CHECK (monthly_price > 0),
  
  -- Amenidades (JSON para flexibilidad)
  amenities JSONB DEFAULT '[]',  -- ["aire acondicionado", "amueblado", "balcon", ...]
  
  -- Availability
  available_from DATE,
  lease_duration_months INTEGER,
  
  -- Media
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0 AND photo_count <= 50),
  
  -- Estado y auditoría
  status ENUM('draft', 'active', 'paused', 'deleted') DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,  -- Soft delete
  
  -- Indexación para Elasticsearch
  indexed_at TIMESTAMP,
  
  -- Índices críticos
  INDEX idx_owner_id (owner_id),
  INDEX idx_city (city),
  INDEX idx_status (status),
  INDEX idx_price (monthly_price),
  INDEX idx_created_at (created_at),
  SPATIAL INDEX idx_location (latitude, longitude)
);
```

**Key Constraints**:
- owner_id referencia a users (propietario debe existir)
- property_type enum (evita valores inválidos)
- Bedrooms/bathrooms/price validados > 0
- photo_count limitado a 50 (evita abuse)
- Índices geoespaciales para búsqueda por ubicación

---

### Table: favorites
**Purpose**: Propiedades guardadas por usuario

```sql
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Evitar duplicados
  UNIQUE(user_id, property_id),
  
  INDEX idx_user_id (user_id),
  INDEX idx_property_id (property_id),
  INDEX idx_created_at (created_at)
);
```

**Key Constraints**:
- CASCADE delete para que si usuario es eliminado, favoritos se borren
- UNIQUE constraint: un usuario no puede guardar misma propiedad 2 veces
- Índices para queries por usuario y por propiedad

---

### Table: alerts
**Purpose**: Alertas de búsqueda personalizadas

```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Criterios de búsqueda guardados
  criteria JSONB NOT NULL,  -- {
                            --   "city": "Madrid",
                            --   "neighborhoods": ["Malasaña", "Chueca"],
                            --   "price_min": 500,
                            --   "price_max": 1500,
                            --   "bedrooms": 1,
                            --   "filters": ["transporte_publico", "zona_tranquila"]
                            -- }
  
  -- Notificación
  notification_frequency ENUM('immediate', 'daily', 'weekly') DEFAULT 'immediate',
  last_notified_at TIMESTAMP,
  
  -- Estado
  status ENUM('active', 'paused', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Auditoría
  notification_count INTEGER DEFAULT 0,
  last_property_notified_id INTEGER,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_notification_frequency (notification_frequency)
);
```

**Key Constraints**:
- Criterios en JSONB para flexibilidad (no requiere schema changes si agregan filtros)
- notification_frequency enum previene valores inválidos
- Índices para queries por usuario y estado

---

### Table: messages
**Purpose**: Mensajería entre usuarios (bidireccional)

```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Contenido
  content TEXT NOT NULL,
  
  -- Estado de entrega
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Auditoría
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para queries rápidas
  INDEX idx_sender_id (sender_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_property_id (property_id),
  INDEX idx_created_at (created_at),
  -- Composite index para historial de conversación
  INDEX idx_conversation (sender_id, receiver_id, property_id, created_at)
);
```

**Key Constraints**:
- Ambos sender y receiver deben existir
- property_id enlaza mensaje con propiedad específica
- Índice composite para recuperar historial de conversación rápidamente
- created_at permite ordenar por cronología

---

### Table: verifications
**Purpose**: Proceso de verificación anti-fraude

```sql
CREATE TABLE verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Documento
  document_type ENUM('passport', 'dni', 'nie', 'driver_license') NOT NULL,
  document_url TEXT NOT NULL,  -- S3 URL, encriptada
  document_hash VARCHAR(64),  -- SHA-256 para detectar tampering
  
  -- Revisión
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by_admin_id INTEGER REFERENCES users(id),
  review_notes TEXT,
  
  -- Auditoría (para compliance)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  expires_at TIMESTAMP,  -- Documentos expiran después de 3 años
  
  -- Índices
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

**Key Constraints**:
- document_url apunta a S3 (encriptada en reposo)
- document_hash para verificar integridad
- reviewed_by_admin_id para auditoria
- expires_at para política de retención (GDPR)

---

## Data Integrity Rules

### Foreign Key Relationships

| Table | References | On Delete | Purpose |
|-------|-----------|-----------|---------|
| properties | users (owner_id) | RESTRICT | Propietario no se puede eliminar si tiene activo propiedades |
| favorites | users | CASCADE | Favoritos se borran si usuario se borra |
| favorites | properties | CASCADE | Favoritos se borran si propiedad se borra |
| alerts | users | CASCADE | Alertas se borran si usuario se borra |
| messages | users (sender_id) | CASCADE | Mensajes se borran si usuario se borra |
| messages | users (receiver_id) | CASCADE | Mensajes se borran si usuario se borra |
| messages | properties | CASCADE | Mensajes se borran si propiedad se borra |
| verifications | users | CASCADE | Verificaciones se borran si usuario se borra |

### Validation Constraints

```sql
-- Passwords deben ser hasheados nunca en texto plano
ALTER TABLE users ADD CONSTRAINT ck_password_length CHECK (LENGTH(password_hash) > 50);

-- Precios deben ser positivos
ALTER TABLE properties ADD CONSTRAINT ck_price_positive CHECK (monthly_price > 0);

-- Ubicación debe tener latitud y longitud juntas o ninguna
ALTER TABLE properties ADD CONSTRAINT ck_location_both_or_none 
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL));

-- Email no puede ser vacio o whitespace
ALTER TABLE users ADD CONSTRAINT ck_email_not_empty CHECK (TRIM(email) != '');

-- Descripción debe tener mínimo 50 caracteres (calidad)
ALTER TABLE properties ADD CONSTRAINT ck_description_length CHECK (LENGTH(description) >= 50);

-- Mínimo 3 fotos
ALTER TABLE properties ADD CONSTRAINT ck_min_photos CHECK (photo_count >= 3);
```

---

## State Machines

### User Verification State Diagram

```
┌──────────────┐
│  unverified  │ ← New user registered
└──────┬───────┘
       │ submit document
       ↓
┌──────────────┐
│   pending    │ ← Waiting admin review
└──────┬────┬──────┘
       │    │
   approved  rejected
       │    │
       ↓    ↓
  ┌──────┐ ┌────────┐
  │auto- │ │ can   │
  │matic │ │ resubmit
  │badge │ │
  └──────┘ └────────┘
```

**Transitions**:
- `unverified` → `pending` (user submits document)
- `pending` → `approved` (admin verifies)
- `pending` → `rejected` (admin rejects)
- `rejected` → `pending` (user resubmits)

### Property Status Lifecycle

```
┌──────────┐
│  draft   │ ← Created, not yet published
└──────┬───┘
       │ publish (after owner verified)
       ↓
┌──────────┐
│  active  │ ← Visible in search
└──────┬───┴─────┐
       │         │
     pause    delete
       │         │
       ↓         ↓
┌──────────┐  ┌──────────┐
│  paused  │  │ deleted  │ (soft delete)
└──────────┘  └──────────┘
```

---

## Indexing Strategy

### Critical Indexes for Performance

| Table | Index | Type | Reason |
|-------|-------|------|--------|
| properties | (city, status, monthly_price) | B-Tree | Búsqueda por ciudad + filtro precio |
| properties | (latitude, longitude) | Spatial | Búsqueda geolocalizada |
| users | (email) | B-Tree Unique | Login rápido, previene duplicados |
| favorites | (user_id, created_at) | Composite | Listar favoritos de usuario ordenados |
| messages | (sender_id, receiver_id, created_at) | Composite | Historial de conversación |
| alerts | (user_id, status) | Composite | Alertas activas de usuario |

### Elasticsearch Indexing

Properties se indexan en Elasticsearch para búsqueda full-text:

```json
{
  "index_name": "properties-v1",
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "spanish" },
      "description": { "type": "text", "analyzer": "spanish" },
      "city": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "monthly_price": { "type": "double" },
      "bedrooms": { "type": "integer" },
      "amenities": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

**Indexing Strategy**:
- Índice diario (`properties-2026-02-18`, `properties-2026-02-19`, etc.)
- Alias que apunta al índice actual
- Switchover al nuevo índice a las 00:00 UTC
- Retención de 90 días de índices viejos

---

## Data Retention & GDPR

### Retention Policy

| Data Type | Retention | Justification |
|-----------|-----------|----------------|
| User Account (deleted) | 30 days | Grace period en caso de accidental deletion |
| Messages | Until account deletion | Historial para usuario |
| Verification Docs | 3 years | Tax/compliance requirement |
| Alerts (inactive) | 1 year | Purge inactivos automáticamente |
| Logs (error) | 90 days | Debugging, security audit |
| Logs (access) | 30 days | Compliance audit trail |
| Backups | 30 days | Point-in-time recovery |

### GDPR Compliance

**Right to Access**: 
- User puede solicitar export de sus datos
- Script genera ZIP con: profile, messages, favorites, alerts, transactions
- Entregado en < 30 días

**Right to Deletion**:
- Soft delete inmediato (user data flagged as deleted)
- Hard delete después de 30 días (irreversible)
- Documentos de verificación hard deleted después de 3 años

**Right to Rectification**:
- Usuario puede editar: email, nombre, teléfono, dirección
- Cambios se auditan (who, when, old_value, new_value)

**Data Portability**:
- Export en JSON+CSV format
- Incluye toda información relacionada con usuario

---

## Scalability Considerations

### Sharding Strategy (Future)

Cuando properties > 10M (año 2+), shard por city:

```
users → shard by user_id (hash)
properties → shard by city (consistent hash)
messages → shard by (sender_id + receiver_id) hash

Shard key ensures:
- All messages of conversation on same shard
- Locality for notifications
- Balanced distribution
```

### Archival Strategy

Propiedades > 2 años sin actualizaciones → move to archive table:

```sql
CREATE TABLE properties_archive LIKE properties;

-- Quarterly archival job
INSERT INTO properties_archive
SELECT * FROM properties 
WHERE status IN ('deleted', 'paused')
AND updated_at < CURRENT_DATE - INTERVAL 2 YEAR;

DELETE FROM properties 
WHERE id IN (SELECT id FROM properties_archive);
```

---

## Document Control

**Version**: 1.0 (initial design)  
**Created**: 2026-02-18  
**Status**: Ready for implementation  
**Next Review**: After first 100 records in production

