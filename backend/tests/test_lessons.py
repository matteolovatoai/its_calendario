import datetime
import os
import uuid

# Fix per variabili d'ambiente mancanti nei test
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from auth import get_current_admin, get_current_user, get_current_user_optional
from database import Base, get_db
from fastapi.testclient import TestClient
from main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup DB in-memory per i test (StaticPool per condividere la memoria tra connessioni)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Reset DB
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Dizionario per salvare id creati
test_data = {}


def mock_admin():
    return {"email": "admin@scuola.com", "role": "admin"}


def mock_student():
    return {"email": "studente@allievi.scuola.com", "role": "student"}


def test_admin_can_create_anagrafiche():
    app.dependency_overrides[get_current_admin] = mock_admin
    app.dependency_overrides[get_current_user] = mock_admin

    res_teacher = client.post("/api/teachers", json={"name": "Mario Rossi"})
    assert res_teacher.status_code == 201
    test_data["teacher_id"] = res_teacher.json()["id"]

    res_sub = client.post("/api/subjects", json={"name": "Matematica"})
    assert res_sub.status_code == 201
    test_data["subject_id"] = res_sub.json()["id"]

    res_room = client.post("/api/rooms", json={"name": "Aula 1"})
    assert res_room.status_code == 201
    test_data["room_id"] = res_room.json()["id"]

    app.dependency_overrides.pop(get_current_admin, None)
    app.dependency_overrides.pop(get_current_user, None)


def test_admin_can_add_lesson():
    app.dependency_overrides[get_current_admin] = mock_admin
    app.dependency_overrides[get_current_user] = mock_admin

    start_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
    end_time = (
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    ).isoformat()

    res = client.post(
        "/api/lessons",
        json={
            "start_time": start_time,
            "end_time": end_time,
            "teacher_id": test_data["teacher_id"],
            "subject_id": test_data["subject_id"],
            "room_id": test_data["room_id"],
        },
    )
    assert res.status_code == 201
    test_data["lesson_id"] = res.json()["id"]

    app.dependency_overrides.pop(get_current_admin, None)
    app.dependency_overrides.pop(get_current_user, None)


def test_anonymous_cannot_add_modify_delete():
    lesson_id = test_data.get("lesson_id", str(uuid.uuid4()))

    res = client.post("/api/lessons", json={})
    assert res.status_code == 401

    res = client.put(f"/api/lessons/{lesson_id}", json={})
    assert res.status_code == 401

    res = client.delete(f"/api/lessons/{lesson_id}")
    assert res.status_code == 401


def test_student_cannot_add_modify_delete():
    from fastapi import HTTPException

    # Lo studente è loggato ma non è admin
    app.dependency_overrides[get_current_user] = mock_student
    app.dependency_overrides[get_current_user_optional] = mock_student

    def fail_admin():
        raise HTTPException(status_code=403, detail="Forbidden")

    app.dependency_overrides[get_current_admin] = fail_admin

    lesson_id = test_data.get("lesson_id", str(uuid.uuid4()))

    res = client.post("/api/lessons", json={})
    assert res.status_code == 403

    res = client.put(f"/api/lessons/{lesson_id}", json={})
    assert res.status_code == 403

    res = client.delete(f"/api/lessons/{lesson_id}")
    assert res.status_code == 403

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = override_get_db


def test_anonymous_sees_masked_lesson():
    app.dependency_overrides[get_current_user_optional] = lambda: None

    res = client.get(f"/api/lessons/{test_data['lesson_id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == test_data["lesson_id"]
    assert data["subject_id"] == test_data["subject_id"]
    assert data["room_id"] == test_data["room_id"]
    assert data["teacher_id"] is None
    assert data["teacher"] is None

    res_list = client.get("/api/lessons")
    assert res_list.status_code == 200
    assert len(res_list.json()) > 0
    assert res_list.json()[0]["teacher_id"] is None

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = override_get_db


def test_student_sees_unmasked_lesson():
    app.dependency_overrides[get_current_user_optional] = mock_student

    res = client.get(f"/api/lessons/{test_data['lesson_id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == test_data["lesson_id"]
    assert data["subject_id"] == test_data["subject_id"]
    assert data["room_id"] == test_data["room_id"]
    assert data["teacher_id"] == test_data["teacher_id"]
    assert data["teacher"]["name"] == "Mario Rossi"

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = override_get_db
