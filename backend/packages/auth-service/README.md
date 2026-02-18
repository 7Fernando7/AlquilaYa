# Auth Service

Authentication and user management service for FormaconIA.

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15
- Redis 7

## Setup

```bash
# Install dependencies
npm install

# Create .env file from .env.example
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Architecture

- **Express.js** - HTTP server framework
- **TypeORM** - Object-relational mapping for database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token generation and verification
- **Redis** - Token blacklist and session storage

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /auth/register` - User registration (Coming in AUTH-2)
- `POST /auth/login` - User login (Coming in AUTH-3)
- `POST /auth/refresh` - Refresh access token (Coming in AUTH-4)
- `POST /auth/logout` - User logout (Coming in AUTH-4)

## Database Schema

### users table

```sql
- id: serial (primary key)
- email: varchar(255) unique
- password_hash: varchar(255)
- full_name: varchar(255)
- user_type: enum('seeker', 'owner', 'agency', 'admin')
- avatar_url: text
- phone: varchar(20)
- address: text
- verification_status: enum('unverified', 'pending', 'approved', 'rejected')
- verification_document_url: text
- verification_date: timestamp
- notification_preferences: jsonb
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp (soft delete)
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Build TypeScript
npm run build
```

## Deployment

```bash
# Build production image
npm run build

# Start production server
npm start
```

## Environment Variables

See `.env.example` for all available configuration options.

**Required for production:**
- `NODE_ENV=production`
- `DATABASE_URL=postgres://...`
- `REDIS_URL=redis://...`
- `JWT_SECRET=<strong-random-secret>`
- `CORS_ORIGIN=<frontend-domain>`
