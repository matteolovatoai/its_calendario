import argparse
import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User
from sqlalchemy.exc import SQLAlchemyError


def add_user(email: str, role: str = "admin"):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"ℹ️ L'utente '{email}' esiste già con ruolo: {existing.role}")
            return existing

        user = User(id=uuid.uuid4(), email=email, role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ Utente '{email}' inserito con successo come {role}!")
        return user
    except SQLAlchemyError as e:
        db.rollback()
        print(f"❌ Errore durante l'inserimento: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Aggiunge un utente/email alla whitelist degli amministratori."
    )
    parser.add_argument("--email", required=True, help="Email dell'utente Google")
    parser.add_argument(
        "--role",
        default="admin",
        help="Ruolo dell'utente (admin, student). Default: admin",
    )
    args = parser.parse_args()
    add_user(args.email, args.role)
