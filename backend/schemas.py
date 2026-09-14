from datetime import datetime
from typing import Optional
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


class LessonUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    subject: Optional[str] = None
    teacher: Optional[str] = None
    room: Optional[str] = None


class LessonResponse(LessonBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
