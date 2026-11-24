"""add school_classes and lessons.class_id

Crea la tabella delle classi, inserisce la classe esistente "lambda" e le
assegna tutte le lezioni già presenti, poi rende class_id obbligatorio.

Revision ID: a1c3e5f7b9d2
Revises: 9b8d9a6bf719
Create Date: 2026-11-24 12:00:00.000000

"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1c3e5f7b9d2"
down_revision: str | Sequence[str] | None = "9b8d9a6bf719"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Le anagrafiche sono salvate in minuscolo (vedi schemas.EntityCreate).
DEFAULT_CLASS_NAME = "lambda"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "school_classes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(
        op.f("ix_school_classes_id"), "school_classes", ["id"], unique=False
    )

    # 1. Classe di default per i dati esistenti
    default_class_id = uuid.uuid4()
    school_classes = sa.table(
        "school_classes",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
    )
    op.bulk_insert(
        school_classes, [{"id": default_class_id, "name": DEFAULT_CLASS_NAME}]
    )

    # 2. Colonna facoltativa, backfill, poi NOT NULL
    op.add_column(
        "lessons",
        sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.execute(
        sa.text("UPDATE lessons SET class_id = :cid WHERE class_id IS NULL").bindparams(
            sa.bindparam("cid", value=default_class_id, type_=postgresql.UUID(as_uuid=True))
        )
    )
    op.alter_column("lessons", "class_id", nullable=False)

    op.create_index(op.f("ix_lessons_class_id"), "lessons", ["class_id"], unique=False)
    op.create_foreign_key(
        "fk_lessons_class_id",
        "lessons",
        "school_classes",
        ["class_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    """Downgrade schema (perde l'assegnazione delle lezioni alle classi)."""
    op.drop_constraint("fk_lessons_class_id", "lessons", type_="foreignkey")
    op.drop_index(op.f("ix_lessons_class_id"), table_name="lessons")
    op.drop_column("lessons", "class_id")
    op.drop_index(op.f("ix_school_classes_id"), table_name="school_classes")
    op.drop_table("school_classes")
