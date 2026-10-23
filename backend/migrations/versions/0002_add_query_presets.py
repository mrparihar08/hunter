"""add_query_presets

Revision ID: 0002_add_query_presets
Revises: 0001_initial_schema
Create Date: 2026-10-23 09:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0002_add_query_presets'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'query_presets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('preset_name', sa.String(100), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('location_target', sa.String(100), nullable=True),
        sa.Column('positive_keywords', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('negative_keywords', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('language', sa.String(20), nullable=False, server_default='en'),
        sa.Column('intent_level', sa.String(50), nullable=False, server_default='HIGH'),
        sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('idx_presets_user_id', 'query_presets', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_presets_user_id', table_name='query_presets')
    op.drop_table('query_presets')
