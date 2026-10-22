"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-22 22:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(100), nullable=False),
        sa.Column('role', sa.Enum('OWNER_ADMIN', 'COLLABORATOR', name='user_role'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # 2. lead_records table
    op.create_table(
        'lead_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('business_or_title', sa.String(255), nullable=False),
        sa.Column('lead_type', sa.Enum('LOCAL_BUSINESS', 'FREELANCE_PROJECT', 'SOCIAL_OPPORTUNITY', name='lead_type'), nullable=False),
        sa.Column('current_status', sa.Enum('NEW', 'NEEDS_REVIEW', 'QUALIFIED', 'CONTACTED', 'REPLIED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST', 'NOT_RELEVANT', name='lead_status'), nullable=False, server_default='NEW'),
        sa.Column('canonical_domain', sa.String(255), nullable=True),
        sa.Column('normalized_phone', sa.String(50), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('estimated_budget', sa.String(100), nullable=True),
        sa.Column('ai_fit_score', sa.SmallInteger(), nullable=True),
        sa.Column('ai_qualification_category', sa.Enum('EXPLICIT_NEED', 'INFERRED_OPPORTUNITY', 'SPECULATIVE', name='ai_category'), nullable=True),
        sa.Column('ai_qualification_reason', sa.Text(), nullable=True),
        sa.Column('assigned_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('idx_leads_canonical_domain', 'lead_records', ['canonical_domain'], postgresql_where=sa.text('canonical_domain IS NOT NULL'))
    op.create_index('idx_leads_normalized_phone', 'lead_records', ['normalized_phone'], postgresql_where=sa.text('normalized_phone IS NOT NULL'))
    op.create_index('idx_leads_status_assigned', 'lead_records', ['current_status', 'assigned_user_id'])

    # 3. lead_sources table
    op.create_table(
        'lead_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lead_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('external_id', sa.String(255), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=False),
        sa.Column('raw_payload', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('discovered_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('platform', 'external_id', name='uq_platform_external_id'),
    )

    # 4. website_audits table
    op.create_table(
        'website_audits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lead_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_url', sa.Text(), nullable=False),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('is_https', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('has_mobile_viewport', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('page_load_ms', sa.Integer(), nullable=True),
        sa.Column('meta_title', sa.Text(), nullable=True),
        sa.Column('meta_description', sa.Text(), nullable=True),
        sa.Column('detected_technologies', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('identified_issues', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('audited_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )

    # 5. outreach_drafts table
    op.create_table(
        'outreach_drafts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lead_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('subject_line', sa.String(255), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=False),
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )

    # 6. follow_up_tasks table
    op.create_table(
        'follow_up_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lead_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assigned_to_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('task_note', sa.Text(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('idx_followups_due_assigned', 'follow_up_tasks', ['assigned_to_user_id', 'due_date'], postgresql_where=sa.text('is_completed = false'))

    # 7. lead_activities table
    op.create_table(
        'lead_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lead_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('activity_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )


def downgrade() -> None:
    op.drop_table('lead_activities')
    op.drop_table('follow_up_tasks')
    op.drop_table('outreach_drafts')
    op.drop_table('website_audits')
    op.drop_table('lead_sources')
    op.drop_table('lead_records')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS ai_category')
    op.execute('DROP TYPE IF EXISTS lead_status')
    op.execute('DROP TYPE IF EXISTS lead_type')
    op.execute('DROP TYPE IF EXISTS user_role')
