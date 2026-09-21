import uuid
from typing import Annotated

import models
import schemas
from auth import (
    create_access_token,
    get_current_admin,
    get_current_user,
    get_current_user_optional,
)
from database import get_db
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

app = FastAPI(title="ITS Calendario API")

from config import settings

origins = []

if settings.FRONTEND_URL:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/google", response_model=schemas.TokenResponse)
async def login_google(
    request: schemas.GoogleAuthRequest, db: Annotated[Session, Depends(get_db)]
):
    from auth import verify_google_token

    id_info = verify_google_token(request.token)
    if not id_info:
        raise HTTPException(status_code=401, detail="Token Google non valido")

    email = id_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email mancante nel token")

    email = email.strip().lower()

    user_in_db = (
        db.query(models.User)
        .filter(func.lower(models.User.email) == email)
        .first()
    )
    if user_in_db:
        role = user_in_db.role
    elif email.endswith(
        (
            "@allievi.itsdigitalacademy.com",
            "@itsdigitalacademy.com",
            "@allievi.scuola.com",
            "@scuola.com",
        )
    ):
        role = "student"
    else:
        raise HTTPException(status_code=403, detail="Dominio non autorizzato")

    access_token = create_access_token(data={"sub": email, "role": role})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/health")
def read_root():
    return {"status": "ok", "message": "API backend funzionante"}


@app.get("/api/protected-test")
def protected_route(current_user: Annotated[dict, Depends(get_current_user)]):
    return {"message": f"Ciao {current_user}, il token JWT funziona perfettamente!"}


# --- CRUD Entità Collegate ---


@app.get("/api/teachers", response_model=list[schemas.EntityResponse])
def get_teachers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return db.query(models.Teacher).all()


@app.post(
    "/api/teachers",
    response_model=schemas.EntityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_teacher(
    teacher: schemas.EntityCreate,
    current_admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    db_teacher = models.Teacher(**teacher.model_dump())
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher


@app.get("/api/subjects", response_model=list[schemas.EntityResponse])
def get_subjects(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return db.query(models.Subject).all()


@app.post(
    "/api/subjects",
    response_model=schemas.EntityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subject(
    subject: schemas.EntityCreate,
    current_admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    db_subject = models.Subject(**subject.model_dump())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject


@app.get("/api/rooms", response_model=list[schemas.EntityResponse])
def get_rooms(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return db.query(models.Room).all()


@app.post(
    "/api/rooms",
    response_model=schemas.EntityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_room(
    room: schemas.EntityCreate,
    current_admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    db_room = models.Room(**room.model_dump())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room


# --- CRUD Lezioni ---


@app.get("/api/lessons", response_model=list[schemas.LessonResponse])
def get_lessons(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict | None, Depends(get_current_user_optional)] = None,
):
    """Recupera tutte le lezioni. Oscura il docente per i non loggati (GDPR)."""
    lessons = db.query(models.Lesson).all()

    response_lessons = []
    for lesson in lessons:
        lesson_dto = schemas.LessonResponse.model_validate(lesson)
        if not current_user:
            lesson_dto.teacher = None
            lesson_dto.teacher_id = None
        response_lessons.append(lesson_dto)

    return response_lessons


@app.get("/api/lessons/{lesson_id}", response_model=schemas.LessonResponse)
def get_lesson(
    lesson_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict | None, Depends(get_current_user_optional)] = None,
):
    """Recupera singola lezione (Accesso Pubblico per Studenti)"""
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")

    lesson_dto = schemas.LessonResponse.model_validate(lesson)
    if not current_user:
        lesson_dto.teacher = None
        lesson_dto.teacher_id = None

    return lesson_dto


@app.post(
    "/api/lessons",
    response_model=schemas.LessonResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson(
    lesson: schemas.LessonCreate,
    current_admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """Crea una nuova lezione (Solo Segreteria)"""

    # Controllo sovrapposizione
    overlapping = (
        db.query(models.Lesson)
        .filter(
            models.Lesson.start_time < lesson.end_time,
            models.Lesson.end_time > lesson.start_time,
        )
        .first()
    )

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La lezione si sovrappone a una lezione esistente in questo orario.",
        )

    db_lesson = models.Lesson(**lesson.model_dump())
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@app.put("/api/lessons/{lesson_id}", response_model=schemas.LessonResponse)
def update_lesson(
    lesson_id: uuid.UUID,
    lesson_update: schemas.LessonCreate,
    current_admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """Modifica una lezione esistente (Solo Segreteria)"""
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")

    update_data = lesson_update.model_dump(exclude_unset=True)

    new_start = update_data.get("start_time", db_lesson.start_time)
    new_end = update_data.get("end_time", db_lesson.end_time)

    # Controllo sovrapposizione (escludendo la lezione stessa)
    overlapping = (
        db.query(models.Lesson)
        .filter(
            models.Lesson.id != lesson_id,
            models.Lesson.start_time < new_end,
            models.Lesson.end_time > new_start,
        )
        .first()
    )

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La modifica causa una sovrapposizione con un'altra lezione esistente.",
        )

    for key, value in update_data.items():
        setattr(db_lesson, key, value)

    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@app.delete("/api/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: uuid.UUID,
    current_admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """Elimina una lezione (Solo Segreteria)"""
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")

    db.delete(db_lesson)
    db.commit()
