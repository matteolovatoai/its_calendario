from datetime import datetime, timedelta, timezone

import jwt
from config import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer


def verify_google_token(token: str):
    from google.auth.transport import requests
    from google.oauth2 import id_token
    try:
        id_info = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
        return id_info
    except ValueError:
        return None

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=1440)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

from typing import Annotated

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/google")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/google", auto_error=False)

async def get_current_user_optional(token: Annotated[str | None, Depends(oauth2_scheme_optional)]):
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        email = payload.get("sub")
        role = payload.get("role")
        if email is None or role is None:
            return None
        return {"email": email, "role": role}
    except jwt.PyJWTError:
        return None

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenziali non valide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        email = payload.get("sub")
        role = payload.get("role")
        if email is None or role is None:
            raise credentials_exception
        return {"email": email, "role": role}
    except jwt.PyJWTError:
        raise credentials_exception

async def get_current_admin(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operazione consentita solo agli amministratori",
        )
    return current_user
