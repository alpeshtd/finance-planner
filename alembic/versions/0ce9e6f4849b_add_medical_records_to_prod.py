"""add_medical_records_to_prod

Revision ID: 0ce9e6f4849b
Revises: 35e908883a1e
Create Date: 2026-03-21 17:11:00.771375
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0ce9e6f4849b'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'medical_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_name', sa.String(), nullable=True),
        sa.Column('report_type', sa.String(), nullable=True),
        sa.Column('tags', sa.String(), nullable=True),
        sa.Column('report_date', sa.Date(), nullable=True),
        sa.Column('doctor_name', sa.String(), nullable=True),
        sa.Column('cloudinary_url', sa.String(), nullable=True),
        sa.Column('public_id', sa.String(), nullable=True),
        sa.Column('is_critical', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_medical_records_id'), 'medical_records', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_medical_records_id'), table_name='medical_records')
    op.drop_table('medical_records')
