"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-27
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "applicants",
        sa.Column("id", sa.String(100), primary_key=True, index=True),
        sa.Column("phone", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("pan", sa.String(50), nullable=True, unique=True, index=True),
        sa.Column("aadhaar", sa.String(50), nullable=True, unique=True, index=True),
        sa.Column("face_photo_path", sa.String(512), nullable=True),
        sa.Column("liveness_score", sa.Float(), nullable=True),
        sa.Column("risk_profile", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "consent",
        sa.Column("id", sa.String(100), primary_key=True, index=True),
        sa.Column("user_id", sa.String(100), sa.ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("consented_sources", sa.JSON(), nullable=False),
        sa.Column("granted_at", sa.DateTime(), nullable=False),
        sa.Column("withdrawn_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(100), sa.ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("balance_after", sa.Float(), nullable=False),
        sa.Column("source", sa.String(50), nullable=False),
    )

    op.create_table(
        "scores",
        sa.Column("id", sa.String(100), primary_key=True, index=True),
        sa.Column("user_id", sa.String(100), sa.ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("risk_band", sa.String(50), nullable=False),
        sa.Column("tier", sa.String(50), nullable=False),
        sa.Column("model_version", sa.String(100), nullable=False),
        sa.Column("shap_details", sa.JSON(), nullable=False),
        sa.Column("signal_conflicts", sa.JSON(), nullable=False),
        sa.Column("hard_caps_applied", sa.JSON(), nullable=False),
        sa.Column("has_conflicts", sa.Boolean(), nullable=False),
        sa.Column("has_hard_cap", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "audit_trail",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(100), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_trail")
    op.drop_table("scores")
    op.drop_table("transactions")
    op.drop_table("consent")
    op.drop_table("applicants")
