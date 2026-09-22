"""add_restrict_on_delete_to_lessons

Revision ID: 9b8d9a6bf719
Revises: cece89f75896
Create Date: 2026-09-22 21:00:23.585197

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b8d9a6bf719'
down_revision: Union[str, Sequence[str], None] = 'cece89f75896'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint("fk_lessons_teacher_id", "lessons", type_="foreignkey")
    op.drop_constraint("fk_lessons_subject_id", "lessons", type_="foreignkey")
    op.drop_constraint("fk_lessons_room_id", "lessons", type_="foreignkey")

    op.create_foreign_key(
        "fk_lessons_teacher_id",
        "lessons",
        "teachers",
        ["teacher_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_lessons_subject_id",
        "lessons",
        "subjects",
        ["subject_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_lessons_room_id",
        "lessons",
        "rooms",
        ["room_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_lessons_teacher_id", "lessons", type_="foreignkey")
    op.drop_constraint("fk_lessons_subject_id", "lessons", type_="foreignkey")
    op.drop_constraint("fk_lessons_room_id", "lessons", type_="foreignkey")

    op.create_foreign_key(
        "fk_lessons_teacher_id",
        "lessons",
        "teachers",
        ["teacher_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_lessons_subject_id",
        "lessons",
        "subjects",
        ["subject_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_lessons_room_id",
        "lessons",
        "rooms",
        ["room_id"],
        ["id"],
    )
