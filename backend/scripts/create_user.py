import argparse

# Aggiungiamo la root del backend al path per poter importare i moduli
import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import get_password_hash
from database import SessionLocal

# L'import seguente funzionerà non appena avrai creato la classe User in models.py come da issue
try:
    from models import User
except ImportError:
    print(
        "Errore: Il modello 'User' non esiste ancora in 'models.py'. Completa prima il task della Issue."
    )
    sys.exit(1)


def create_user(username, password, role="teacher"):
    db = SessionLocal()

    # Controlla se l'utente esiste già
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        print(f"Errore: L'utente '{username}' esiste già.")
        db.close()
        return

    # Genera l'hash della password in modo sicuro usando la funzione già esistente in auth.py
    hashed_password = get_password_hash(password)

    # Crea la nuova istanza dell'utente
    new_user = User(
        id=uuid.uuid4(),
        username=username,
        password_hash=hashed_password,
        role=role,
        # created_at verrà probabilmente gestito di default da SQLAlchemy a seconda di come definirai il modello
    )

    from sqlalchemy.exc import SQLAlchemyError

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(
            f"✅ Utente '{username}' (ruolo: {role}) creato con successo! (ID: {new_user.id})"
        )
    except SQLAlchemyError as e:
        db.rollback()
        print(f"❌ Errore del database durante la creazione dell'utente: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Crea un nuovo utente nel database in modo sicuro."
    )
    parser.add_argument(
        "--username", required=True, help="Lo username del nuovo account"
    )
    parser.add_argument(
        "--password",
        required=True,
        help="La password in chiaro (verrà hashata prima del salvataggio)",
    )
    parser.add_argument(
        "--role",
        default="teacher",
        help="Il ruolo dell'utente (es. teacher, admin). Default: teacher",
    )

    args = parser.parse_args()

    create_user(args.username, args.password, args.role)
