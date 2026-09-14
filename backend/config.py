from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Autenticazione (preparati per l'Issue #2)
    ADMIN_USERNAME: str = "segreteria"
    ADMIN_PASSWORD_HASH: str = ""  # da sovrascrivere nel .env
    JWT_SECRET: str = "cambiami-in-produzione-con-chiave-lunga-di-almeno-32-byte"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()  # type: ignore
