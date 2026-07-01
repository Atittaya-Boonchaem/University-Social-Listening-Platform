# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import os
from dotenv import load_dotenv
import logging

# 🌟 เพิ่มการดึง Base และ Role มาจาก models
from app.models import Base, Role

load_dotenv()

# ========================================
# Configuration
# ========================================
class Config:
    # Database
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_USER = os.getenv("DB_USER", "root")
    
    # 🔴🔴🔴 แก้ไขรหัสผ่านตรงนี้ 🔴🔴🔴
    # พิมพ์รหัสผ่าน MySQL ของคุณลงไปในเครื่องหมายคำพูด (เช่น "123456")
    # แต่ถ้าตอนเข้า MySQL คุณไม่ได้ใส่รหัสผ่าน ให้ปล่อยเป็น "" แบบนี้ไว้เลยครับ
    DB_PASSWORD = os.getenv("DB_PASSWORD", "123456") 
    
    DB_NAME = os.getenv("DB_NAME", "university_social_listening")
    
    # JWT
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Ollama
    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "neural-chat")
    
    # Image Processing
    MAX_IMAGE_SIZE_MB = int(os.getenv("MAX_IMAGE_SIZE_MB", "200"))
    IMAGE_UPLOAD_DIR = os.getenv("IMAGE_UPLOAD_DIR", "./uploads/images")
    
    # Server
    DEBUG = os.getenv("DEBUG", "False") == "True"
    
    @property
    def DATABASE_URL(self):
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

config = Config()

# ========================================
# Logging Setup
# ========================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========================================
# Database Engine & Session
# ========================================
engine = create_engine(
    config.DATABASE_URL,
    echo=config.DEBUG,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """Dependency injection for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========================================
# FastAPI Application
# ========================================
app = FastAPI(
    title="University Social Listening Platform API",
    description="AI-powered platform for university problem reporting and analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ========================================
# CORS Middleware
# ========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================================
# Health Check Endpoint
# ========================================
@app.get("/health", tags=["Health"])
async def health_check():
    """ตรวจสอบสถานะระบบ"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected"
    }

# ========================================
# Import Routers
# ========================================
# 🌟 นำเข้า auth และ problems เข้ามาพร้อมกัน
from app.routers import problems, auth 

# 🌟 เปิดการใช้งาน API สำหรับ Problems
app.include_router(problems.router, prefix="/api/v1/problems", tags=["Problems"])

# 🌟 เปิดการใช้งาน API สำหรับ Authentication (ระบบยืนยันตัวตน)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])


# ========================================
# Exception Handlers
# ========================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )

# ========================================
# Startup & Shutdown Events
# ========================================
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 FastAPI Application Starting...")
    logger.info(f"Database: {config.DATABASE_URL.split('/')[-1]}")
    logger.info(f"Ollama Host: {config.OLLAMA_HOST}")
    
    # 🌟 1. สั่งสร้างตารางทั้งหมดในฐานข้อมูลอัตโนมัติ
    Base.metadata.create_all(bind=engine)
    
    # 🌟 2. เติมข้อมูล Role พื้นฐานลงไปเพื่อป้องกัน Error
    db = SessionLocal()
    try:
        if not db.query(Role).first():
            logger.info("⚙️ Creating default roles...")
            db.add_all([
                Role(id=1, name="student", description="นิสิต"),
                Role(id=2, name="staff", description="บุคลากร"),
                Role(id=3, name="public", description="บุคคลทั่วไป"),
                Role(id=4, name="admin", description="ผู้ดูแลระบบ"),
            ])
            db.commit()
            logger.info("✅ Default roles created successfully!")
    except Exception as e:
        logger.error(f"❌ Error setting up database: {e}")
    finally:
        db.close()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("⛔ FastAPI Application Shutting Down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=config.DEBUG
    )