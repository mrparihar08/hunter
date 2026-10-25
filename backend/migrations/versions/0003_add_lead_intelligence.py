"""add_lead_intelligence

Revision ID: 0003_add_lead_intelligence
Revises: 0002_add_query_presets
Create Date: 2026-10-24 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0003_add_lead_intelligence'
down_revision: Union[str, None] = '0002_add_query_presets'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('lead_records', sa.Column('intent_category', sa.String(50), nullable=True))
    op.add_column('lead_records', sa.Column('lead_score', sa.SmallInteger(), nullable=True))
    op.add_column('lead_records', sa.Column('confidence_score', sa.Float(), nullable=True))
    op.add_column('lead_records', sa.Column('positive_evidence', postgresql.JSONB(), nullable=True, server_default='[]'))
    op.add_column('lead_records', sa.Column('negative_evidence', postgresql.JSONB(), nullable=True, server_default='[]'))
    op.add_column('lead_records', sa.Column('explanation', sa.Text(), nullable=True))
    op.add_column('lead_records', sa.Column('feedback_label', sa.String(50), nullable=True))
    op.add_column('lead_records', sa.Column('search_group', sa.String(50), nullable=True))
    op.create_index('idx_leads_intent_score', 'lead_records', ['intent_category', 'lead_score'])


def downgrade() -> None:
    op.drop_index('idx_leads_intent_score', table_name='lead_records')
    op.drop_column('lead_records', 'search_group')
    op.drop_column('lead_records', 'feedback_label')
    op.drop_column('lead_records', 'explanation')
    op.drop_column('lead_records', 'negative_evidence')
    op.drop_column('lead_records', 'positive_evidence')
    op.drop_column('lead_records', 'confidence_score')
    op.drop_column('lead_records', 'lead_score')
    op.drop_column('lead_records', 'intent_category')
