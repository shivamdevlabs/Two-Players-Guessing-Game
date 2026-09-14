from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "two_player_guessing_game"
    
    # Security
    SECRET_KEY: str = "default_dev_secret_key_guessing_game"
    
    # Game rules defaults
    MIN_NUMBER: int = 1
    MAX_NUMBER: int = 100
    DEFAULT_TIME_LIMIT_SECONDS: int = 300
    RECONNECT_GRACE_PERIOD_SECONDS: int = 60
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
