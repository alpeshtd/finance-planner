"""add_diabetes_records

Revision ID: 3f2e1d4c5b6a
Revises: 0ce9e6f4849b
Create Date: 2026-03-31 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3f2e1d4c5b6a'
down_revision = '0ce9e6f4849b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'diabetes_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_name', sa.String(), nullable=False),
        sa.Column('record_date', sa.Date(), nullable=False),
        sa.Column('reading_type', sa.String(), nullable=False),
        sa.Column('reading_value', sa.Float(), nullable=False),
        sa.Column('reading_time', sa.String(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('insulin_action', sa.String(), nullable=True),
        sa.Column('insulin_dosage', sa.String(), nullable=True),
        sa.Column('needle_changed', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_diabetes_records_id'), 'diabetes_records', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_diabetes_records_id'), table_name='diabetes_records')
    op.drop_table('diabetes_records')
