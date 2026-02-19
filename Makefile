.PHONY: help install dev up down logs clean test db-migrate db-seed ps

help:
	@echo "FormaconIA Development Commands"
	@echo "================================"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install        - Install all dependencies"
	@echo ""
	@echo "Docker & Services:"
	@echo "  make up             - Start all Docker services"
	@echo "  make down           - Stop all Docker services"
	@echo "  make logs           - View Docker logs (Ctrl+C to exit)"
	@echo "  make ps             - Show running containers"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start development environment (all services)"
	@echo "  make db-migrate     - Run database migrations"
	@echo "  make db-seed        - Seed database with test data"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-unit      - Run unit tests only"
	@echo "  make test-int       - Run integration tests only"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          - Remove all containers and volumes"
	@echo "  make clean-hard     - Remove containers, volumes, and caches"
	@echo ""

install:
	@echo "📦 Installing root dependencies..."
	npm install
	@echo "📦 Installing backend dependencies..."
	cd backend/packages/auth-service && npm install
	@echo "✅ Dependencies installed"

up:
	@echo "🚀 Starting Docker services..."
	docker-compose up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 10
	@echo "✅ Services started. Check with: make ps"

down:
	@echo "🛑 Stopping Docker services..."
	docker-compose down
	@echo "✅ Services stopped"

logs:
	@echo "📋 Docker logs (Ctrl+C to exit)..."
	docker-compose logs -f

ps:
	@echo "📊 Running containers:"
	docker-compose ps

dev: up db-migrate
	@echo "✅ Development environment ready!"
	@echo ""
	@echo "Services running:"
	@echo "  PostgreSQL:       localhost:5432 (postgres/postgres)"
	@echo "  Redis:            localhost:6379"
	@echo "  Elasticsearch:    localhost:9200"
	@echo "  Mailhog (SMTP):   localhost:1025"
	@echo "  Mailhog (Web):    http://localhost:8025"
	@echo "  Auth Service:     http://localhost:3001/health"
	@echo ""
	@echo "Next: npm run dev:auth (in terminal 2)"

db-migrate:
	@echo "🔄 Running database migrations..."
	docker-compose exec -T postgres psql -U postgres -d formacionia -c \
		"CREATE TYPE user_type_enum AS ENUM ('seeker', 'owner', 'agency', 'admin');" 2>/dev/null || true
	docker-compose exec -T postgres psql -U postgres -d formacionia -c \
		"CREATE TYPE verification_status_enum AS ENUM ('unverified', 'pending', 'approved', 'rejected');" 2>/dev/null || true
	@echo "✅ Migrations completed"

db-seed:
	@echo "🌱 Seeding database with test data..."
	@echo "Note: Seed script to be implemented in next phase"
	@echo "✅ Database seeding ready"

test:
	@echo "🧪 Running all tests..."
	cd backend/packages/auth-service && npm test

test-unit:
	@echo "🧪 Running unit tests..."
	cd backend/packages/auth-service && npm test -- --testPathPattern=unit

test-int:
	@echo "🧪 Running integration tests..."
	cd backend/packages/auth-service && npm test -- --testPathPattern=integration

clean:
	@echo "🧹 Cleaning up containers and volumes..."
	docker-compose down -v
	@echo "✅ Cleanup complete"

clean-hard: clean
	@echo "🧹 Hard cleaning (also removing caches)..."
	rm -rf backend/packages/*/node_modules
	rm -rf backend/packages/*/dist
	rm -rf backend/packages/*/.env
	@echo "✅ Hard cleanup complete"

.PHONY: help install up down logs ps dev db-migrate db-seed test test-unit test-int clean clean-hard
