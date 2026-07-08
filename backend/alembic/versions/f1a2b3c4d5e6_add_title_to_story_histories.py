"""add title to story histories

Revision ID: f1a2b3c4d5e6
Revises: e4f6a82d3c19
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "c3a8f1d92b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "story_histories",
        sa.Column("title", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("story_histories", "title")
