import uuid
from typing import Annotated

import models
import schemas
from auth import create_access_token, get_current_user, verify_password
from config import settings
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
):
    # Validazione hardcoded contro le credenziali di admin
    if form_data.username != settings.ADMIN_USERNAME or not verify_password(
        form_data.password, settings.ADMIN_PASSWORD_HASH
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password errati",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": settings.ADMIN_USERNAME})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/health")
def read_root():
    return {"status": "ok", "message": "API backend funzionante"}


@app.get("/api/protected-test")
def protected_route(current_user: Annotated[str, Depends(get_current_user)]):
    return {"message": f"Ciao {current_user}, il token JWT funziona perfettamente!"}


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
