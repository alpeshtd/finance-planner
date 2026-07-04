"""add_baby_movement_entries

Revision ID: 0f3a1b2c3d4e
Revises: 3f2e1d4c5b6a
Create Date: 2026-07-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0f3a1b2c3d4e'
down_revision = '3f2e1d4c5b6a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'baby_movement_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entry_date', sa.Date(), nullable=False),
        sa.Column('entry_time', sa.String(), nullable=False),
        sa.Column('meal_or_snack', sa.String(), nullable=False),
        sa.Column('movement_types', sa.Text(), nullable=False),
        sa.Column('other_movement', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_baby_movement_entries_id'), 'baby_movement_entries', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_baby_movement_entries_id'), table_name='baby_movement_entries')
    op.drop_table('baby_movement_entries')
