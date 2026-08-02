# app/main.py
"""
FastAPI application entry point — v2 (26-table schema).
Configuration, engine, and Base are now in app/database.py.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import os

from app.database import engine, config, Base
import app.models  # noqa: F401 — registers all 26 models with Base metadata

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────
app = FastAPI(
    title="University Social Listening Platform API",
    description="AI-powered platform for university problem reporting and analysis — v2",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ──────────────────────────────────────────────
# Static file serving (uploaded images)
# ──────────────────────────────────────────────
os.makedirs(config.IMAGE_UPLOAD_DIR, exist_ok=True)
os.makedirs("./static", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")
app.mount("/static", StaticFiles(directory="./static"), name="static")

# ──────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://university-social-listening-platfor.vercel.app",
        "https://university-social-listening-public.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────
from app.routers import problems, auth, users, settings, audit, buildings, public_user_types, clusters  # noqa: E402

app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Authentication"])
app.include_router(problems.router,  prefix="/api/v1/problems",  tags=["Problems"])
app.include_router(users.router,     prefix="/api/v1/users",     tags=["Users"])
app.include_router(settings.router,  prefix="/api/v1/settings",  tags=["Settings"])
app.include_router(audit.router,     prefix="/api/v1/audit",     tags=["Audit"])
app.include_router(buildings.router, prefix="/api/v1/buildings", tags=["Buildings"])
app.include_router(public_user_types.router, prefix="/api/v1",  tags=["Public User Types"])
app.include_router(clusters.router,  prefix="/api/v1/clusters",  tags=["AI Clusters"])

# ──────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": "2.0.0", "schema": "26-table"}


# ──────────────────────────────────────────────
# Exception handlers
# ──────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
        },
    )

# ──────────────────────────────────────────────
# Lifecycle events
# ──────────────────────────────────────────────
def seed_initial_data():
    from app.database import SessionLocal
    from app.models import Faculty, Role
    db = SessionLocal()
    try:
        if db.query(Role).count() == 0:
            roles = [
                Role(role_id=1, role_name="SuperAdmin", description="Super Administrator"),
                Role(role_id=2, role_name="CategoryAdmin", description="Category Administrator"),
                Role(role_id=3, role_name="Staff", description="University Staff"),
                Role(role_id=4, role_name="Student", description="University Student"),
                Role(role_id=5, role_name="PublicUser", description="General Public User"),
                Role(role_id=6, role_name="AnonymousUser", description="Anonymous User"),
            ]
            db.add_all(roles)
            db.commit()

        if db.query(Faculty).count() == 0:
            faculties_data = [
                (1, 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร'),
                (2, 'คณะวิศวกรรมศาสตร์'),
                (3, 'คณะวิทยาศาสตร์'),
                (4, 'คณะแพทยศาสตร์'),
                (5, 'คณะศิลปศาสตร์'),
                (6, 'คณะบริหารธุรกิจและนิเทศศาสตร์'),
                (7, 'คณะนิติศาสตร์'),
                (8, 'คณะสหเวชศาสตร์และสาธารณสุขศาสตร์'),
                (9, 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ'),
                (10, 'คณะทันตแพทยศาสตร์'),
                (11, 'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์'),
                (12, 'คณะพยาบาลศาสตร์'),
                (13, 'คณะเภสัชศาสตร์'),
            ]
            faculties = [Faculty(faculty_id=fid, faculty_name=fname) for fid, fname in faculties_data]
            db.add_all(faculties)
            db.commit()

        # Seed Problem Categories
        from app.models import ProblemCategory, Building, User, SuperAdmin, Staff
        if db.query(ProblemCategory).count() == 0:
            cats = [
                ProblemCategory(category_id=1, category_name="สิ่งอำนวยความสะดวกและอาคารสถานที่", description="ปัญหาอาคาร ชำรุด โต๊ะเก้าอี้ ไฟฟ้า ประปา"),
                ProblemCategory(category_id=2, category_name="ระบบเครือข่ายและเทคโนโลยี", description="ปัญหาสัญญาณ Wi-Fi อินเทอร์เน็ต ระบบลงทะเบียน"),
                ProblemCategory(category_id=3, category_name="การเรียนการสอนและหลักสูตร", description="ปัญหาเกี่ยวกับการเรียน ตารางเรียน การสอบ"),
                ProblemCategory(category_id=4, category_name="สุขอนามัยและความสะอาด", description="ปัญหาขยะ โรงอาหาร ห้องน้ำ ความสะอาด"),
                ProblemCategory(category_id=5, category_name="ความปลอดภัยและจราจร", description="ปัญหารถเมล์ มพ. การจราจร ทางข้าม ไฟส่องสว่าง"),
                ProblemCategory(category_id=6, category_name="บริการและสวัสดิการนิสิต", description="ทุนการศึกษา สวัสดิการ หอพักนิสิต"),
            ]
            db.add_all(cats)
            db.commit()

        # Seed Buildings
        if db.query(Building).count() == 0:
            blds = [
                Building(building_id=1, building_name="อาคารเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)", latitude=19.0275, longitude=99.8965),
                Building(building_id=2, building_name="อาคารเรียนรวม PKY", latitude=19.0280, longitude=99.8970),
                Building(building_id=3, building_name="อาคารสำนักงานอธิการบดี", latitude=19.0260, longitude=99.8950),
                Building(building_id=4, building_name="อาคารหอประชุมมหาวิทยาลัยพะเยา", latitude=19.0290, longitude=99.8980),
                Building(building_id=5, building_name="กลุ่มอาคารหอพักนิสิต UP DORM", latitude=19.0250, longitude=99.8930),
            ]
            db.add_all(blds)
            db.commit()

        # Seed Super Admin Account
        admin_email = "superadmin@up.ac.th"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            import bcrypt
            hashed = bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode()
            admin_user = User(email=admin_email, password_hash=hashed, is_active=True)
            db.add(admin_user)
            db.flush()

            db.add(SuperAdmin(user_id=admin_user.user_id, is_active=True))
            db.add(Staff(user_id=admin_user.user_id, employee_id="ADM-001", staff_name="Super Administrator", staff_role="SuperAdmin"))
            db.commit()
            logger.info("🔑 Seeded default SuperAdmin (superadmin@up.ac.th / 123456) successfully.")

        logger.info("🌱 All initial seed data verified successfully.")
    except Exception as e:
        logger.error(f"Error seeding initial data: {e}")
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 FastAPI v2 — 26-table schema starting...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ All tables verified/created.")
    seed_initial_data()


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("⛔ FastAPI Application Shutting Down.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=config.DEBUG)