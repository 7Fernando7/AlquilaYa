"""UUID type for SQLAlchemy that works with both PostgreSQL and SQLite"""

import uuid
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as pg_UUID


class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = CHAR(32)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(pg_UUID())
        return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value

        # Ensure it's a UUID
        if not isinstance(value, uuid.UUID):
            value = uuid.UUID(value) if isinstance(value, str) else value

        # For PostgreSQL, return as string with hyphens
        if dialect.name == 'postgresql':
            return str(value)

        # For SQLite and others, return as hex string without hyphens
        return value.hex if hasattr(value, 'hex') else str(value).replace('-', '')

    def process_result_value(self, value, dialect):
        if value is None:
            return value

        # Always return a UUID object
        if not isinstance(value, uuid.UUID):
            try:
                # Try to interpret as hex (SQLite style)
                return uuid.UUID(hex=value) if len(value) == 32 else uuid.UUID(value)
            except (ValueError, TypeError):
                return value

        return value
