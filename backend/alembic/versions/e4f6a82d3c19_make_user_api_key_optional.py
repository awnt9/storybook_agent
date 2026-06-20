"""make user api key optional

Revision ID: e4f6a82d3c19
Revises: a901dbfb12fc
Create Date: 2026-06-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e4f6a82d3c19"
down_revision: Union[str, Sequence[str], None] = "a901dbfb12fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Allow users to be created before they configure an API key."""
    op.alter_column(
        "users",
        "api_key",
        existing_type=sa.String(length=512),
        nullable=True,
    )


def downgrade() -> None:
    """Restore the original required API key constraint."""
    op.alter_column(
        "users",
        "api_key",
        existing_type=sa.String(length=512),
        nullable=False,
    )
