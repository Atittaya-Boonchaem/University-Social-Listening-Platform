# app/database.py
"""
Central database configuration module.
All other app modules import Base, engine, config, and get_db from here.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Priority: Render Dashboard Environment Variables always take highest precedence!
# Only use .env or /etc/secrets/.env as fallback when variables are not set in the environment.
load_dotenv(override=False)
if os.path.exists("/etc/secrets/.env"):
    load_dotenv("/etc/secrets/.env", override=False)


# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
class Config:
    # Database
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "university_social_listening")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

    # Ollama LLM
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "neural-chat")

    WANGCHAN_MODEL_DIR: str = os.getenv(
        "WANGCHAN_MODEL_DIR",
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "finetuned_model")),
    )

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

    # DB SSL
    DB_SSL: bool = os.getenv("DB_SSL", "true" if "tidbcloud" in os.getenv("DB_HOST", "") else "false").lower() in ("true", "1", "t")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


import logging
_logger = logging.getLogger("app.database")

config = Config()
_logger.info(f"Database active config: host={config.DB_HOST}, port={config.DB_PORT}, user={config.DB_USER}, db={config.DB_NAME}")

# ──────────────────────────────────────────────
# SQLAlchemy core objects
# ──────────────────────────────────────────────
Base = declarative_base()

connect_args = {}
if config.DB_SSL or "tidbcloud" in config.DB_HOST:
    try:
        import certifi
        import ssl as _ssl
        ssl_ctx = _ssl.create_default_context(cafile=certifi.where())
        ssl_ctx.check_hostname = True
        ssl_ctx.verify_mode = _ssl.CERT_REQUIRED
        connect_args["ssl"] = ssl_ctx
    except Exception:
        # Fallback: minimal SSL without cert verification
        connect_args["ssl"] = {"check_hostname": False}

engine = create_engine(
    config.DATABASE_URL,
    connect_args=connect_args,
    echo=config.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300,
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
