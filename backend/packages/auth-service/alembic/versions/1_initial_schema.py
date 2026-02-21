"""Initial schema creation

Revision ID: 001
Revises:
Create Date: 2026-02-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all initial tables"""

    # Create enum types
    user_type_enum = postgresql.ENUM('seeker', 'owner', name='user_type_enum')
    user_type_enum.create(op.get_bind(), checkfirst=True)

    audit_event_type_enum = postgresql.ENUM(
        'account_created', 'email_verified', 'login_success', 'login_failure',
        'token_refresh', 'password_reset_requested', 'password_reset_confirmed',
        'logout', 'account_locked', 'account_unlocked',
        name='audit_event_type_enum'
    )
    audit_event_type_enum.create(op.get_bind(), checkfirst=True)

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('bio', sa.String(500), nullable=True),
        sa.Column('profile_photo_url', sa.String(500), nullable=True),
        sa.Column('user_type', user_type_enum, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'])
    op.create_index(op.f('ix_users_user_type'), 'users', ['user_type'])
    op.create_index(op.f('ix_users_created_at'), 'users', ['created_at'])
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'])

    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('access_token', sa.String(), nullable=False),
        sa.Column('refresh_token', sa.String(), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('user_agent', sa.String(500), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('refresh_token'),
    )
    op.create_index(op.f('ix_sessions_user_id'), 'sessions', ['user_id'])
    op.create_index(op.f('ix_sessions_refresh_token'), 'sessions', ['refresh_token'])
    op.create_index(op.f('ix_sessions_expires_at'), 'sessions', ['expires_at'])

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', audit_event_type_enum, nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('user_agent', sa.String(500), nullable=False),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'])
    op.create_index(op.f('ix_audit_logs_event_type'), 'audit_logs', ['event_type'])
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_user_created', 'audit_logs', ['user_id', 'created_at'])

    # Create password_resets table
    op.create_table(
        'password_resets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reset_token', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reset_token'),
    )
    op.create_index(op.f('ix_password_resets_user_id'), 'password_resets', ['user_id'])
    op.create_index(op.f('ix_password_resets_reset_token'), 'password_resets', ['reset_token'])
    op.create_index(op.f('ix_password_resets_expires_at'), 'password_resets', ['expires_at'])

    # Create email_verifications table
    op.create_table(
        'email_verifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('verification_token', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('verification_token'),
    )
    op.create_index(op.f('ix_email_verifications_user_id'), 'email_verifications', ['user_id'])
    op.create_index(op.f('ix_email_verifications_verification_token'), 'email_verifications', ['verification_token'])
    op.create_index(op.f('ix_email_verifications_expires_at'), 'email_verifications', ['expires_at'])


def downgrade() -> None:
    """Drop all tables"""
    op.drop_index('ix_email_verifications_expires_at', 'email_verifications')
    op.drop_index('ix_email_verifications_verification_token', 'email_verifications')
    op.drop_index('ix_email_verifications_user_id', 'email_verifications')
    op.drop_table('email_verifications')

    op.drop_index('ix_password_resets_expires_at', 'password_resets')
    op.drop_index('ix_password_resets_reset_token', 'password_resets')
    op.drop_index('ix_password_resets_user_id', 'password_resets')
    op.drop_table('password_resets')

    op.drop_index('ix_audit_logs_user_created', 'audit_logs')
    op.drop_index('ix_audit_logs_created_at', 'audit_logs')
    op.drop_index('ix_audit_logs_event_type', 'audit_logs')
    op.drop_index('ix_audit_logs_user_id', 'audit_logs')
    op.drop_table('audit_logs')

    op.drop_index('ix_sessions_expires_at', 'sessions')
    op.drop_index('ix_sessions_refresh_token', 'sessions')
    op.drop_index('ix_sessions_user_id', 'sessions')
    op.drop_table('sessions')

    op.drop_index('ix_users_is_active', 'users')
    op.drop_index('ix_users_created_at', 'users')
    op.drop_index('ix_users_user_type', 'users')
    op.drop_index('ix_users_email', 'users')
    op.drop_table('users')

    # Drop enums
    op.execute('DROP TYPE audit_event_type_enum')
    op.execute('DROP TYPE user_type_enum')
