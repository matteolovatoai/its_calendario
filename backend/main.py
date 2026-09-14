from auth import create_access_token, get_current_user, verify_password
from config import settings
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

app = FastAPI(title="ITS Calendario API")


@app.post("/api/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
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
def protected_route(current_user: str = Depends(get_current_user)):
    return {"message": f"Ciao {current_user}, il token JWT funziona perfettamente!"}
