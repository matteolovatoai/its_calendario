import datetime
import os
import uuid

# Fix per variabili d'ambiente mancanti nei test
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import models
from auth import get_current_admin, get_current_user, get_current_user_optional
from database import Base, get_db
from fastapi.testclient import TestClient
from main import app
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup DB in-memory per i test (StaticPool per condividere la memoria tra connessioni)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Reset DB
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Dizionario per salvare id creati
test_data = {}


def mock_admin():
    return {"email": "admin@itsdigitalacademy.com", "role": "admin"}


def mock_student():
    return {"email": "studente@allievi.itsdigitalacademy.com", "role": "student"}


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

    res_class = client.post("/api/classes", json={"name": "LAMBDA"})
    assert res_class.status_code == 201
    test_data["class_id"] = res_class.json()["id"]

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
            "class_id": test_data["class_id"],
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

    now = datetime.datetime.now(datetime.timezone.utc)
    res_list = client.get(
        "/api/lessons",
        params={
            "start_date": (now - datetime.timedelta(days=1)).isoformat(),
            "end_date": (now + datetime.timedelta(days=1)).isoformat(),
        },
    )
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


def test_login_google_student_domains(monkeypatch):
    import auth
    import jwt
    from config import settings

    monkeypatch.setattr(
        auth,
        "verify_google_token",
        lambda token: {"email": "mario@allievi.itsdigitalacademy.com"},
    )
    res = client.post("/api/auth/google", json={"token": "valid_token"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    assert payload["role"] == "student"


def test_login_google_staff_not_in_whitelist(monkeypatch):
    import auth
    import jwt
    from config import settings

    monkeypatch.setattr(
        auth,
        "verify_google_token",
        lambda token: {"email": "docente@itsdigitalacademy.com"},
    )
    res = client.post("/api/auth/google", json={"token": "valid_token"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    assert payload["role"] == "student"


def test_login_google_whitelist_admin_case_insensitive(monkeypatch):
    import auth
    import jwt
    from config import settings

    db = TestingSessionLocal()
    admin_user = models.User(id=uuid.uuid4(), email="Admin.Teo@gmail.com", role="admin")
    db.add(admin_user)
    db.commit()
    db.close()

    monkeypatch.setattr(
        auth, "verify_google_token", lambda token: {"email": "admin.teo@gmail.com"}
    )
    res = client.post("/api/auth/google", json={"token": "valid_token"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    assert payload["role"] == "admin"


def test_login_google_unauthorized_domain(monkeypatch):
    import auth

    monkeypatch.setattr(
        auth, "verify_google_token", lambda token: {"email": "random@gmail.com"}
    )
    res = client.post("/api/auth/google", json={"token": "valid_token"})
    assert res.status_code == 403


def test_token_expiration_matches_settings(monkeypatch):
    import auth
    import jwt
    from config import settings

    token = auth.create_access_token(data={"sub": "test@test.com", "role": "student"})
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    exp = payload["exp"]
    now = datetime.datetime.now(datetime.timezone.utc).timestamp()
    days_diff = (exp - now) / 86400
    assert 59 <= days_diff <= 61


def test_get_lessons_requires_start_and_end_date():
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Nessun parametro
    res = client.get("/api/lessons")
    assert res.status_code == 422

    # Solo start_date
    res = client.get("/api/lessons", params={"start_date": now})
    assert res.status_code == 422

    # Solo end_date
    res = client.get("/api/lessons", params={"end_date": now})
    assert res.status_code == 422


def test_get_lessons_start_after_end_returns_400():
    now = datetime.datetime.now(datetime.timezone.utc)
    start_date = (now + datetime.timedelta(days=2)).isoformat()
    end_date = now.isoformat()

    res = client.get(
        "/api/lessons", params={"start_date": start_date, "end_date": end_date}
    )
    assert res.status_code == 400
    assert "start_date non può essere successiva a end_date" in res.json()["detail"]


def test_get_lessons_filters_by_date_range():
    app.dependency_overrides[get_current_admin] = mock_admin
    app.dependency_overrides[get_current_user] = mock_admin

    base_time = datetime.datetime(2026, 10, 15, 10, 0, 0, tzinfo=datetime.timezone.utc)

    # Lezione 1: passata (10 ottobre)
    res_1 = client.post(
        "/api/lessons",
        json={
            "start_time": (base_time - datetime.timedelta(days=5)).isoformat(),
            "end_time": (
                base_time - datetime.timedelta(days=5) + datetime.timedelta(hours=2)
            ).isoformat(),
            "teacher_id": test_data["teacher_id"],
            "subject_id": test_data["subject_id"],
            "room_id": test_data["room_id"],
            "class_id": test_data["class_id"],
        },
    )
    assert res_1.status_code == 201
    past_id = res_1.json()["id"]

    # Lezione 2: target (15 ottobre)
    res_2 = client.post(
        "/api/lessons",
        json={
            "start_time": base_time.isoformat(),
            "end_time": (base_time + datetime.timedelta(hours=2)).isoformat(),
            "teacher_id": test_data["teacher_id"],
            "subject_id": test_data["subject_id"],
            "room_id": test_data["room_id"],
            "class_id": test_data["class_id"],
        },
    )
    assert res_2.status_code == 201
    target_id = res_2.json()["id"]

    # Lezione 3: futura (20 ottobre)
    res_3 = client.post(
        "/api/lessons",
        json={
            "start_time": (base_time + datetime.timedelta(days=5)).isoformat(),
            "end_time": (
                base_time + datetime.timedelta(days=5) + datetime.timedelta(hours=2)
            ).isoformat(),
            "teacher_id": test_data["teacher_id"],
            "subject_id": test_data["subject_id"],
            "room_id": test_data["room_id"],
            "class_id": test_data["class_id"],
        },
    )
    assert res_3.status_code == 201
    future_id = res_3.json()["id"]

    # Filtra solo la settimana del 15 ottobre (dal 14 al 16)
    query_start = (base_time - datetime.timedelta(days=1)).isoformat()
    query_end = (base_time + datetime.timedelta(days=1)).isoformat()

    res_filter = client.get(
        "/api/lessons", params={"start_date": query_start, "end_date": query_end}
    )
    assert res_filter.status_code == 200
    returned_ids = [item["id"] for item in res_filter.json()]

    assert target_id in returned_ids
    assert past_id not in returned_ids
    assert future_id not in returned_ids

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = override_get_db


def test_get_lessons_naive_datetime_handling():
    # Passaggio di date ISO naive senza 'Z' o offset esplicito
    start_date = "2026-10-14T00:00:00"
    end_date = "2026-10-16T23:59:59"

    res = client.get(
        "/api/lessons", params={"start_date": start_date, "end_date": end_date}
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_rate_limiting_get_lessons():
    from config import settings
    from main import limiter

    original_rate = settings.RATE_LIMIT_LESSONS
    settings.RATE_LIMIT_LESSONS = "2/minute"
    limiter.reset()

    try:
        start_date = "2026-10-14T00:00:00Z"
        end_date = "2026-10-16T23:59:59Z"

        # Prime due richieste consentite
        res1 = client.get(
            "/api/lessons", params={"start_date": start_date, "end_date": end_date}
        )
        assert res1.status_code == 200

        res2 = client.get(
            "/api/lessons", params={"start_date": start_date, "end_date": end_date}
        )
        assert res2.status_code == 200

        # Terza richiesta supera il limite (2/minute)
        res3 = client.get(
            "/api/lessons", params={"start_date": start_date, "end_date": end_date}
        )
        assert res3.status_code == 429
        assert "Rate limit exceeded" in res3.json().get("error", "")
    finally:
        settings.RATE_LIMIT_LESSONS = original_rate
        limiter.reset()


def test_delete_unused_anagrafiche():
    app.dependency_overrides[get_current_admin] = mock_admin
    app.dependency_overrides[get_current_user] = mock_admin

    # Crea entità temporanee non usate in lezioni
    res_t = client.post("/api/teachers", json={"name": "Docente Da Eliminare"})
    assert res_t.status_code == 201
    t_id = res_t.json()["id"]

    res_s = client.post("/api/subjects", json={"name": "Materia Da Eliminare"})
    assert res_s.status_code == 201
    s_id = res_s.json()["id"]

    res_r = client.post("/api/rooms", json={"name": "Aula Da Eliminare"})
    assert res_r.status_code == 201
    r_id = res_r.json()["id"]

    # Cancellazione consentita
    del_t = client.delete(f"/api/teachers/{t_id}")
    assert del_t.status_code == 204

    del_s = client.delete(f"/api/subjects/{s_id}")
    assert del_s.status_code == 204

    del_r = client.delete(f"/api/rooms/{r_id}")
    assert del_r.status_code == 204

    # Verifica che non esistano più (404)
    assert client.delete(f"/api/teachers/{t_id}").status_code == 404
    assert client.delete(f"/api/subjects/{s_id}").status_code == 404
    assert client.delete(f"/api/rooms/{r_id}").status_code == 404

    app.dependency_overrides.pop(get_current_admin, None)
    app.dependency_overrides.pop(get_current_user, None)


def test_graceful_delete_restricted_anagrafiche_in_use():
    app.dependency_overrides[get_current_admin] = mock_admin
    app.dependency_overrides[get_current_user] = mock_admin

    # Crea entità
    res_t = client.post("/api/teachers", json={"name": "Docente In Uso"})
    t_id = res_t.json()["id"]
    res_s = client.post("/api/subjects", json={"name": "Materia In Uso"})
    s_id = res_s.json()["id"]
    res_r = client.post("/api/rooms", json={"name": "Aula In Uso"})
    r_id = res_r.json()["id"]

    # Crea una lezione che usa queste entità (usando un orario dedicato per evitare sovrapposizioni)
    start_time = datetime.datetime(
        2027, 5, 10, 9, 0, tzinfo=datetime.timezone.utc
    ).isoformat()
    end_time = datetime.datetime(
        2027, 5, 10, 11, 0, tzinfo=datetime.timezone.utc
    ).isoformat()
    res_lesson = client.post(
        "/api/lessons",
        json={
            "start_time": start_time,
            "end_time": end_time,
            "teacher_id": t_id,
            "subject_id": s_id,
            "room_id": r_id,
            "class_id": test_data["class_id"],
        },
    )
    assert res_lesson.status_code == 201
    lesson_id = res_lesson.json()["id"]

    # Tentativo di cancellazione del docente in uso -> 400 (Client Error) anziché 500
    del_t = client.delete(f"/api/teachers/{t_id}")
    assert del_t.status_code == 400
    assert "associat" in del_t.json()["detail"].lower() or "uso" in del_t.json()["detail"].lower()

    # Tentativo di cancellazione della materia in uso -> 400 anziché 500
    del_s = client.delete(f"/api/subjects/{s_id}")
    assert del_s.status_code == 400
    assert "associat" in del_s.json()["detail"].lower() or "uso" in del_s.json()["detail"].lower()

    # Tentativo di cancellazione dell'aula in uso -> 400 anziché 500
    del_r = client.delete(f"/api/rooms/{r_id}")
    assert del_r.status_code == 400
    assert "associat" in del_r.json()["detail"].lower() or "uso" in del_r.json()["detail"].lower()

    # Eliminiamo la lezione
    del_lesson = client.delete(f"/api/lessons/{lesson_id}")
    assert del_lesson.status_code == 204

    # Ora le entità non sono più in uso e possono essere cancellate con successo
    assert client.delete(f"/api/teachers/{t_id}").status_code == 204
    assert client.delete(f"/api/subjects/{s_id}").status_code == 204
    assert client.delete(f"/api/rooms/{r_id}").status_code == 204

    app.dependency_overrides.pop(get_current_admin, None)
    app.dependency_overrides.pop(get_current_user, None)


def test_anonymous_and_student_cannot_delete_anagrafiche():
    # Anonimo (401 Unauthorized)
    res_t = client.delete(f"/api/teachers/{uuid.uuid4()}")
    assert res_t.status_code == 401

    res_s = client.delete(f"/api/subjects/{uuid.uuid4()}")
    assert res_s.status_code == 401

    res_r = client.delete(f"/api/rooms/{uuid.uuid4()}")
    assert res_r.status_code == 401

    # Studente (403 Forbidden)
    app.dependency_overrides[get_current_user] = mock_student
    res_stud = client.delete(f"/api/teachers/{uuid.uuid4()}")
    assert res_stud.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)



# --- Multi-classe ---


def _as_admin():
    app.dependency_overrides[get_current_admin] = mock_admin
    app.dependency_overrides[get_current_user] = mock_admin


def _reset_overrides():
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = override_get_db


def _lesson_payload(start, end, class_id, room_id, teacher_id):
    return {
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "teacher_id": teacher_id,
        "subject_id": test_data["subject_id"],
        "room_id": room_id,
        "class_id": class_id,
    }


def test_classes_list_is_public_and_write_is_admin_only():
    from fastapi import HTTPException

    # Anonimo: può leggere l'elenco (serve al selettore), non può scrivere
    res = client.get("/api/classes")
    assert res.status_code == 200
    assert "Lambda" in [c["name"] for c in res.json()]
    assert client.post("/api/classes", json={"name": "Beta"}).status_code == 401
    assert client.delete(f"/api/classes/{uuid.uuid4()}").status_code == 401

    # Studente: 403
    def fail_admin():
        raise HTTPException(status_code=403, detail="Forbidden")

    app.dependency_overrides[get_current_admin] = fail_admin
    assert client.post("/api/classes", json={"name": "Beta"}).status_code == 403
    _reset_overrides()


def test_lesson_response_includes_class():
    res = client.get(f"/api/lessons/{test_data['lesson_id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["class_id"] == test_data["class_id"]
    assert data["school_class"]["name"] == "Lambda"


def test_lesson_requires_class_id():
    _as_admin()
    start = datetime.datetime(2027, 6, 1, 9, 0, tzinfo=datetime.timezone.utc)
    payload = _lesson_payload(
        start,
        start + datetime.timedelta(hours=1),
        test_data["class_id"],
        test_data["room_id"],
        test_data["teacher_id"],
    )
    del payload["class_id"]
    assert client.post("/api/lessons", json=payload).status_code == 422
    _reset_overrides()


def test_class_in_use_cannot_be_deleted_unused_can():
    _as_admin()
    res = client.delete(f"/api/classes/{test_data['class_id']}")
    assert res.status_code == 400
    assert "associata" in res.json()["detail"]

    res_new = client.post("/api/classes", json={"name": "Classe Da Eliminare"})
    assert res_new.status_code == 201
    new_id = res_new.json()["id"]
    assert client.delete(f"/api/classes/{new_id}").status_code == 204
    assert client.delete(f"/api/classes/{new_id}").status_code == 404
    _reset_overrides()


def test_multi_class_filter_and_conflicts():
    _as_admin()
    class_b = client.post("/api/classes", json={"name": "Beta"}).json()["id"]
    room_b = client.post("/api/rooms", json={"name": "Aula Beta"}).json()["id"]
    teacher_b = client.post("/api/teachers", json={"name": "Luigi Verdi"}).json()["id"]

    start = datetime.datetime(2027, 3, 1, 9, 0, tzinfo=datetime.timezone.utc)
    end = start + datetime.timedelta(hours=2)
    overlap_start = start + datetime.timedelta(hours=1)
    overlap_end = overlap_start + datetime.timedelta(hours=2)

    a = test_data["class_id"]
    room_a, teacher_a = test_data["room_id"], test_data["teacher_id"]

    res_a = client.post("/api/lessons", json=_lesson_payload(start, end, a, room_a, teacher_a))
    assert res_a.status_code == 201
    lesson_a = res_a.json()["id"]

    # Classi diverse, aula e docente diversi, stesso orario: consentito
    res_b = client.post(
        "/api/lessons",
        json=_lesson_payload(overlap_start, overlap_end, class_b, room_b, teacher_b),
    )
    assert res_b.status_code == 201
    lesson_b = res_b.json()["id"]

    # Stessa classe sovrapposta: bloccato
    res = client.post(
        "/api/lessons",
        json=_lesson_payload(overlap_start, overlap_end, a, room_b, teacher_b),
    )
    assert res.status_code == 400
    assert "classe" in res.json()["detail"].lower()

    # Aula già occupata da un'altra classe: bloccato
    other_teacher = client.post("/api/teachers", json={"name": "Anna Neri"}).json()["id"]
    class_c = client.post("/api/classes", json={"name": "Gamma"}).json()["id"]
    res = client.post(
        "/api/lessons",
        json=_lesson_payload(overlap_start, overlap_end, class_c, room_a, other_teacher),
    )
    assert res.status_code == 400
    assert "aula" in res.json()["detail"].lower()

    # Docente già impegnato con un'altra classe: bloccato
    other_room = client.post("/api/rooms", json={"name": "Aula Gamma"}).json()["id"]
    res = client.post(
        "/api/lessons",
        json=_lesson_payload(overlap_start, overlap_end, class_c, other_room, teacher_a),
    )
    assert res.status_code == 400
    assert "docente" in res.json()["detail"].lower()

    # Lezioni adiacenti (fine == inizio) non sono conflitti
    res = client.post(
        "/api/lessons",
        json=_lesson_payload(end, end + datetime.timedelta(hours=1), a, room_a, teacher_a),
    )
    assert res.status_code == 201

    # PUT: modificare la lezione senza cambiarne l'orario non va in conflitto con sé stessa
    res = client.put(
        f"/api/lessons/{lesson_a}",
        json=_lesson_payload(start, end, a, room_a, teacher_a),
    )
    assert res.status_code == 200

    # PUT: spostare la lezione B nell'aula di A in orario sovrapposto è bloccato
    res = client.put(
        f"/api/lessons/{lesson_b}",
        json=_lesson_payload(overlap_start, overlap_end, class_b, room_a, teacher_b),
    )
    assert res.status_code == 400
    assert "aula" in res.json()["detail"].lower()

    _reset_overrides()

    # Filtro per classe (anonimo, docente oscurato)
    params = {
        "start_date": (start - datetime.timedelta(hours=1)).isoformat(),
        "end_date": (end + datetime.timedelta(hours=1)).isoformat(),
    }
    ids_a = [x["id"] for x in client.get("/api/lessons", params={**params, "class_id": a}).json()]
    ids_b_resp = client.get("/api/lessons", params={**params, "class_id": class_b}).json()
    ids_b = [x["id"] for x in ids_b_resp]
    ids_all = [x["id"] for x in client.get("/api/lessons", params=params).json()]

    assert lesson_a in ids_a and lesson_b not in ids_a
    assert ids_b == [lesson_b]
    assert all(x["teacher"] is None for x in ids_b_resp)
    assert lesson_a in ids_all and lesson_b in ids_all
