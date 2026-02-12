from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    google_client_id: str = ""
    google_client_secret: str = ""
    jwt_secret: str = "dev-secret-change-in-production"
    gemini_api_key: str = ""
    frontend_url: str = "http://localhost:5173"
    database_url: str = "postgresql://localhost:5432/tracker"
    jwt_expiry_days: int = 7

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
