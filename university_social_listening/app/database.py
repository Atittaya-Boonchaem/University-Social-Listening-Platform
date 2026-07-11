# app/database.py
"""
Central database configuration module.
All other app modules import Base, engine, config, and get_db from here.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()


# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
class Config:
    # Database
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "123456")
    DB_NAME: str = os.getenv("DB_NAME", "university_social_listening")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

    # Ollama LLM
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "neural-chat")

    # File uploads
    MAX_IMAGE_SIZE_MB: int = int(os.getenv("MAX_IMAGE_SIZE_MB", "200"))
    IMAGE_UPLOAD_DIR: str = os.getenv("IMAGE_UPLOAD_DIR", "./uploads/images")

    # Server
    DEBUG: bool = os.getenv("DEBUG", "False") == "True"

    # Microsoft SSO
    SSO_TENANT_ID: str = os.getenv("SSO_TENANT_ID", "").strip()
    SSO_CLIENT_ID: str = os.getenv("SSO_CLIENT_ID", "").strip()
    SSO_CLIENT_SECRET: str = os.getenv("SSO_CLIENT_SECRET", "").strip()
    SSO_REDIRECT_URI: str = os.getenv("SSO_REDIRECT_URI", "http://localhost:8000/api/v1/auth/sso/callback").strip()

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


config = Config()

# ──────────────────────────────────────────────
# SQLAlchemy core objects
# ──────────────────────────────────────────────
Base = declarative_base()

engine = create_engine(
    config.DATABASE_URL,
    echo=config.DEBUG,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ──────────────────────────────────────────────
# FastAPI dependency
# ──────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
