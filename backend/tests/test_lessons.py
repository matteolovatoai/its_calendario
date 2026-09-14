import bcrypt
from config import settings

settings.ADMIN_PASSWORD_HASH = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode(
    "utf-8"
)

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    response = client.post(
        "/api/token", data={"username": settings.ADMIN_USERNAME, "password": "password"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# Dizionario per mantenere lo stato (l'ID della lezione) tra un test e l'altro
test_state = {}


def test_1_student_cannot_add_lesson():
    response = client.post(
        "/api/lessons",
        json={
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "subject": "Test Subject",
            "teacher": "test-docente",
            "room": "Test Room",
        },
    )
    assert response.status_code == 401


def test_2_segreteria_can_add_lesson(admin_headers):
    response = client.post(
        "/api/lessons",
        json={
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "subject": "Matematica",
            "teacher": "test-docente",
            "room": "Aula Magna",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["teacher"] == "test-docente"
    test_state["lesson_id"] = data["id"]


def test_3_segreteria_can_modify_lesson(admin_headers):
    lesson_id = test_state.get("lesson_id")
    assert lesson_id is not None
    response = client.put(
        f"/api/lessons/{lesson_id}",
        json={
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "subject": "Fisica",
            "teacher": "test-docente",
            "room": "Laboratorio",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["subject"] == "Fisica"


def test_4_student_cannot_modify_lesson():
    lesson_id = test_state.get("lesson_id")
    response = client.put(
        f"/api/lessons/{lesson_id}",
        json={
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "subject": "Hacked",
            "teacher": "test-docente",
            "room": "Hacked",
        },
    )
    assert response.status_code == 401


def test_5_student_cannot_delete_lesson():
    lesson_id = test_state.get("lesson_id")
    response = client.delete(f"/api/lessons/{lesson_id}")
    assert response.status_code == 401


def test_6_segreteria_can_view_lesson(admin_headers):
    lesson_id = test_state.get("lesson_id")
    response = client.get(f"/api/lessons/{lesson_id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["id"] == lesson_id


def test_7_student_can_view_lesson():
    lesson_id = test_state.get("lesson_id")
    response = client.get(f"/api/lessons/{lesson_id}")
    assert response.status_code == 200
    assert response.json()["id"] == lesson_id


def test_8_segreteria_can_delete_lesson(admin_headers):
    lesson_id = test_state.get("lesson_id")
    response = client.delete(f"/api/lessons/{lesson_id}", headers=admin_headers)
    assert response.status_code == 204

    # Verifica che sia stata effettivamente eliminata (404)
    check_response = client.get(f"/api/lessons/{lesson_id}")
    assert check_response.status_code == 404
