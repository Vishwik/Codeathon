from functools import lru_cache
import os

from pydantic import BaseModel


class Settings(BaseModel):
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 4000
    database_url: str = "sqlite:///./data/riskops.db"
    cors_allowed_origins: str = "http://localhost:5173"
    ml_model_dir: str = "./models"
    ml_fallback_enabled: bool = True
    log_level: str = "INFO"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    values = {
        "app_env": os.getenv("APP_ENV", "development"),
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": os.getenv("PORT", "4000"),
        "database_url": os.getenv("DATABASE_URL", "sqlite:///./data/riskops.db"),
        "cors_allowed_origins": os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
        "ml_model_dir": os.getenv("ML_MODEL_DIR", "./models"),
        "ml_fallback_enabled": os.getenv("ML_FALLBACK_ENABLED", "true"),
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
    }
    return Settings.model_validate(values)