"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("consented_sources", ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("risk_band", sa.String(50), nullable=False),
        sa.Column("tier", sa.String(50), nullable=False),
        sa.Column("consented_sources", ARRAY(sa.String), nullable=False),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("raw_input", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "shap_values",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("score_id", UUID(as_uuid=True), sa.ForeignKey("scores.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("feature_name", sa.String(100), nullable=False),
        sa.Column("shap_value", sa.Float, nullable=False),
        sa.Column("feature_value", sa.Float, nullable=False),
    )

    op.create_table(
        "feedback",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("score_id", UUID(as_uuid=True), sa.ForeignKey("scores.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("officer_id", sa.String(100), nullable=False),
        sa.Column("decision", sa.String(20), nullable=False),
        sa.Column("override_reason", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_check_constraint("ck_scores_range", "scores", "score >= 0 AND score <= 850")
    op.create_check_constraint("ck_feedback_decision", "feedback", "decision IN ('approve', 'reject', 'override_approve', 'override_reject', 'refer')")


def downgrade() -> None:
    op.drop_table("feedback")
    op.drop_table("shap_values")
    op.drop_table("scores")
    op.drop_table("users")
