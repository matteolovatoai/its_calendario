from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class EntityBase(BaseModel):
    name: str

class EntityCreate(EntityBase):
    @field_validator('*', mode='after', check_fields=False)
    @classmethod
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            if not v.strip():
                raise ValueError("Il campo non può essere vuoto")
            return v.strip().lower()
        return v

class EntityResponse(EntityBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

    @field_validator('*', mode='after', check_fields=False)
    @classmethod
    def format_strings(cls, v):
        if isinstance(v, str):
            return v.strip().title()
        return v


class LessonBase(BaseModel):
    start_time: datetime
    end_time: datetime
    teacher_id: UUID
    subject_id: UUID
    room_id: UUID


class LessonCreate(LessonBase):
    @field_validator('*', mode='after', check_fields=False)
    @classmethod
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            if not v.strip():
                raise ValueError("Il campo non può essere vuoto")
            return v.strip().lower()
        return v

    @model_validator(mode='after')
    def validate_times(self) -> 'LessonCreate':
        if self.end_time <= self.start_time:
            raise ValueError("L'orario di fine deve essere successivo all'orario di inizio")
        
        # We need to make sure the date is the same. Note that datetimes are timezone aware.
        # But `.date()` gives the local date for that timezone, which is correct.
        if self.start_time.date() != self.end_time.date():
            raise ValueError("La lezione deve iniziare e finire nello stesso giorno")
        
        return self


class LessonResponse(LessonBase):
    id: UUID
    
    teacher: EntityResponse
    subject: EntityResponse
    room: EntityResponse

    model_config = ConfigDict(from_attributes=True)

    @field_validator('*', mode='after', check_fields=False)
    @classmethod
    def format_strings(cls, v):
        if isinstance(v, str):
            return v.strip().title()
        return v
