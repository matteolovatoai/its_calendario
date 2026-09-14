import uuid
from typing import Annotated

import models
import schemas
from auth import create_access_token, get_current_user, verify_password
from database import get_db
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

app = FastAPI(title="ITS Calendario API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://192.168.1.191:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = (
        db.query(models.User).filter(models.User.username == form_data.username).first()
    )
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password errati",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/health")
def read_root():
    return {"status": "ok", "message": "API backend funzionante"}


@app.get("/api/protected-test")
def protected_route(current_user: Annotated[str, Depends(get_current_user)]):
    return {"message": f"Ciao {current_user}, il token JWT funziona perfettamente!"}


# --- CRUD Entità Collegate ---


@app.get("/api/teachers", response_model=list[schemas.EntityResponse])
def get_teachers(db: Annotated[Session, Depends(get_db)]):
    return db.query(models.Teacher).all()


@app.post(
    "/api/teachers",
    response_model=schemas.EntityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_teacher(
    teacher: schemas.EntityCreate,
    current_user: Annotated[str, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    db_teacher = models.Teacher(**teacher.model_dump())
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher


@app.get("/api/subjects", response_model=list[schemas.EntityResponse])
def get_subjects(db: Annotated[Session, Depends(get_db)]):
    return db.query(models.Subject).all()


@app.post(
    "/api/subjects",
    response_model=schemas.EntityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subject(
    subject: schemas.EntityCreate,
    current_user: Annotated[str, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    db_subject = models.Subject(**subject.model_dump())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject


@app.get("/api/rooms", response_model=list[schemas.EntityResponse])
def get_rooms(db: Annotated[Session, Depends(get_db)]):
    return db.query(models.Room).all()


@app.post(
    "/api/rooms",
    response_model=schemas.EntityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_room(
    room: schemas.EntityCreate,
    current_user: Annotated[str, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    db_room = models.Room(**room.model_dump())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room


# --- CRUD Lezioni ---


@app.get("/api/lessons", response_model=list[schemas.LessonResponse])
def get_lessons(db: Annotated[Session, Depends(get_db)]):
    """Recupera tutte le lezioni (Accesso Pubblico per Studenti)"""
    return db.query(models.Lesson).all()


@app.get("/api/lessons/{lesson_id}", response_model=schemas.LessonResponse)
def get_lesson(lesson_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]):
    """Recupera singola lezione (Accesso Pubblico per Studenti)"""
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")
    return lesson


@app.post(
    "/api/lessons",
    response_model=schemas.LessonResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson(
    lesson: schemas.LessonCreate,
    current_user: Annotated[str, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Crea una nuova lezione (Solo Segreteria)"""
    
    # Controllo sovrapposizione
    overlapping = db.query(models.Lesson).filter(
        models.Lesson.start_time < lesson.end_time,
        models.Lesson.end_time > lesson.start_time
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La lezione si sovrappone a una lezione esistente in questo orario."
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
    current_user: Annotated[str, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Modifica una lezione esistente (Solo Segreteria)"""
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")

    update_data = lesson_update.model_dump(exclude_unset=True)
    
    new_start = update_data.get('start_time', db_lesson.start_time)
    new_end = update_data.get('end_time', db_lesson.end_time)
    
    # Controllo sovrapposizione (escludendo la lezione stessa)
    overlapping = db.query(models.Lesson).filter(
        models.Lesson.id != lesson_id,
        models.Lesson.start_time < new_end,
        models.Lesson.end_time > new_start
    ).first()

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La modifica causa una sovrapposizione con un'altra lezione esistente."
        )

    for key, value in update_data.items():
        setattr(db_lesson, key, value)

    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@app.delete("/api/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: uuid.UUID,
    current_user: Annotated[str, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Elimina una lezione (Solo Segreteria)"""
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")

    db.delete(db_lesson)
    db.commit()
