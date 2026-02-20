#!/bin/bash

# FormaconIA Auth Service - Staging Deployment Script
# Usage: ./deploy-staging.sh [build|deploy|logs|health|rollback]

set -e

ENVIRONMENT=staging
SERVICE_NAME=formacionia-auth-service
IMAGE_NAME=formacionia/auth-service
REGISTRY=ghcr.io  # GitHub Container Registry

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    if [ ! -f ".env.staging" ]; then
        log_error ".env.staging file not found"
        exit 1
    fi

    log_info "Prerequisites check passed ✓"
}

# Build Docker image
build_image() {
    log_info "Building Docker image for staging..."

    docker build \
        -f backend/packages/auth-service/Dockerfile \
        -t ${IMAGE_NAME}:staging \
        -t ${IMAGE_NAME}:latest \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD) \
        .

    log_info "Docker image built successfully ✓"
    docker images | grep formacionia/auth-service
}

# Deploy to staging
deploy() {
    log_info "Deploying to staging environment..."

    # Load environment variables
    export $(cat .env.staging | grep -v '^#' | xargs)

    # Backup database
    log_info "Backing up database..."
    mkdir -p backups
    docker-compose exec -T postgres pg_dump -U postgres -d formacionia_staging > \
        "backups/formacionia_staging_$(date +%Y%m%d_%H%M%S).sql" || log_warn "Database backup skipped (DB may not exist)"

    # Start services
    log_info "Starting Docker Compose services..."
    docker-compose --env-file .env.staging up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check if auth service is healthy
    for i in {1..30}; do
        if curl -f http://localhost:8000/health > /dev/null 2>&1; then
            log_info "Auth service is healthy ✓"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Auth service health check failed after 30 attempts"
            exit 1
        fi
        log_info "Waiting for auth service... ($i/30)"
        sleep 2
    done

    # Run database migrations
    log_info "Running database migrations..."
    docker-compose exec -T auth-service alembic upgrade head || log_warn "Migrations skipped (may already be applied)"

    # Run tests
    log_info "Running test suite..."
    docker-compose exec -T auth-service pytest tests/unit/ -v --tb=short || {
        log_error "Tests failed! Rolling back..."
        rollback_deployment
        exit 1
    }

    log_info "Deployment completed successfully ✓"
    show_status
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo "===================="
    docker-compose ps
    echo ""
    log_info "Service URLs:"
    echo "  Auth Service:  http://localhost:8000/health"
    echo "  PostgreSQL:    localhost:5432"
    echo "  Redis:         localhost:6379"
    echo "  Mailhog:       http://localhost:8025"
}

# Show logs
show_logs() {
    log_info "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f auth-service
}

# Health check
health_check() {
    log_info "Performing health checks..."

    # Check auth service
    log_info "Checking auth service..."
    curl -s http://localhost:8000/health | python -m json.tool || log_error "Auth service health check failed"

    # Check database
    log_info "Checking database..."
    docker-compose exec -T postgres psql -U postgres -d formacionia_staging -c "SELECT NOW();" || log_error "Database health check failed"

    # Check Redis
    log_info "Checking Redis..."
    docker-compose exec -T redis redis-cli ping || log_error "Redis health check failed"

    log_info "Health checks completed ✓"
}

# Rollback deployment
rollback_deployment() {
    log_warn "Rolling back to previous deployment..."

    # Get latest backup
    LATEST_BACKUP=$(ls -t backups/*.sql 2>/dev/null | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup found for rollback"
        return 1
    fi

    log_info "Restoring from backup: $LATEST_BACKUP"
    docker-compose exec -T postgres psql -U postgres -d formacionia_staging < "$LATEST_BACKUP"

    log_info "Rollback completed ✓"
}

# Run commands based on argument
case "${1:-deploy}" in
    build)
        check_prerequisites
        build_image
        ;;
    deploy)
        check_prerequisites
        build_image
        deploy
        ;;
    logs)
        show_logs
        ;;
    health)
        health_check
        ;;
    rollback)
        rollback_deployment
        ;;
    *)
        echo "Usage: $0 {build|deploy|logs|health|rollback}"
        echo ""
        echo "Commands:"
        echo "  build       - Build Docker image"
        echo "  deploy      - Build and deploy to staging"
        echo "  logs        - Show real-time logs"
        echo "  health      - Check service health"
        echo "  rollback    - Rollback to previous deployment"
        exit 1
        ;;
esac

exit 0
