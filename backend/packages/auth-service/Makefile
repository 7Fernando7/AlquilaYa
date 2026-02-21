.PHONY: help install dev test test-unit test-int test-cov lint format clean migrate db-reset migrations

help:
	@echo "Auth Service - Available Commands"
	@echo "=================================="
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start development server (requires Docker)"
	@echo "  make test         - Run all tests"
	@echo "  make test-unit    - Run unit tests only"
	@echo "  make test-int     - Run integration tests only"
	@echo "  make test-cov     - Run tests with coverage report"
	@echo "  make lint         - Run linter (flake8, mypy)"
	@echo "  make format       - Format code (black, isort)"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make migrate      - Run database migrations"
	@echo "  make db-reset     - Reset database (drop and recreate)"
	@echo "  make migrations   - Create new migration"

install:
	pip install -r requirements.txt

dev:
	python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

test:
	pytest -v

test-unit:
	pytest tests/unit -v

test-int:
	pytest tests/integration -v

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term

lint:
	flake8 app tests
	mypy app --ignore-missing-imports

format:
	black app tests
	isort app tests

clean:
	find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .mypy_cache
	rm -rf .coverage

migrate:
	alembic upgrade head

db-reset:
	dropdb formacion_auth || true
	createdb formacion_auth
	alembic upgrade head

migrations:
	@read -p "Migration name: " name; \
	alembic revision --autogenerate -m "$$name"
