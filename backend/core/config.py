from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CryptoRent Dashboard"
    PROJECT_VERSION: str = "1.0.0"

    # Security - CHANGE THIS in production!
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-hex-code-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL: str = "sqlite:///./crypto.db"

    class Config:
        case_sensitive = True

settings = Settings()