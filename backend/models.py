import uuid

from database import Base
from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    subject = Column(String, nullable=False)
    teacher = Column(String, nullable=False)
    room = Column(String, nullable=False)
