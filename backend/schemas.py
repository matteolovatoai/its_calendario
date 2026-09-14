from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LessonBase(BaseModel):
    start_time: datetime
    end_time: datetime
    subject: str
    teacher: str
    room: str


class LessonCreate(LessonBase):
    pass


class LessonResponse(LessonBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
