from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EntityBase(BaseModel):
    name: str

class EntityCreate(EntityBase):
    pass

class EntityResponse(EntityBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class LessonBase(BaseModel):
    start_time: datetime
    end_time: datetime
    teacher_id: UUID
    subject_id: UUID
    room_id: UUID


class LessonCreate(LessonBase):
    pass


class LessonResponse(LessonBase):
    id: UUID
    
    teacher: EntityResponse
    subject: EntityResponse
    room: EntityResponse

    model_config = ConfigDict(from_attributes=True)
