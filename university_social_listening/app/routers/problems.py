
# app/routers/problems.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import logging
import os
import uuid
import shutil
from jose import jwt, JWTError

from app.main import get_db, config
from app.models import Problem, ProblemCategory, Building, User, NLPAnalysis
from app.schemas import (
    ProblemCreate, ProblemResponse, ProblemListResponse,
    ProblemUpdate, StandardResponse, ProblemCategoryResponse,
    BuildingResponse, ProblemAuthorResponse, BulkStatusUpdate,
    CommentCreate, CommentResponse,
    ProblemCategoryCreate, ProblemCategoryUpdate,
    BuildingCreate, BuildingUpdate
)
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Problems"])

# ========================================
# JWT Dependency: ดึง user_id จาก Token
# ========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
    """ดึง user_id จาก JWT Bearer token"""
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ไม่ถูกต้อง")
        return int(user_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token หมดอายุหรือไม่ถูกต้อง",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ========================================
# Helper Functions
# ========================================
async def get_ollama_service() -> OllamaService:
    """Initialize Ollama service"""
    return OllamaService(
        ollama_host=config.OLLAMA_HOST,
        model_name=config.OLLAMA_MODEL
    )

def check_category_exists(db: Session, category_id: int) -> ProblemCategory:
    """ตรวจสอบหมวดหมู่มีอยู่"""
    category = db.query(ProblemCategory).filter(ProblemCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail=f"Category with ID {category_id} not found")
    return category

def check_building_exists(db: Session, building_id: int) -> Optional[Building]:
    """ตรวจสอบตึก/อาคารมีอยู่"""
    if not building_id:
        return None
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building

def serialize_problem(p: Problem) -> dict:
    """แปลง Problem ORM เป็น dict พร้อม author (None ถ้า is_anonymous)"""
    base = ProblemResponse.from_orm(p).dict()
    if p.is_anonymous or p.user is None:
        base["user"] = None
    else:
        u = p.user
        # สร้าง display_name fallback: display_name > email > phone_number > 'ผู้ใช้งานทั่วไป'
        computed_display = u.display_name
        if not computed_display:
            if u.email:
                computed_display = u.email.split('@')[0]
            elif u.phone_number:
                computed_display = u.phone_number
            else:
                computed_display = 'ผู้ใช้งานทั่วไป'
        base["user"] = ProblemAuthorResponse(
            id=u.id,
            role_id=u.role_id,
            display_name=computed_display,
            email=u.email,
            phone_number=u.phone_number,
            student_id=u.student_id,
            staff_account=u.staff_account,
        ).dict()
    return base

# ========================================
# 🌟 ADDED: API ดึงข้อมูลหมวดหมู่สำหรับดรอปดาวน์
# ========================================
@router.get("/categories", response_model=StandardResponse)
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(ProblemCategory).all()
    categories_resp = [ProblemCategoryResponse.from_orm(c).dict() for c in categories]
    return StandardResponse(
        success=True,
        message="Retrieve categories successfully",
        data={"items": categories_resp}
    )

# ========================================
# 🌟 ADDED: API ดึงข้อมูลตึก/อาคารสำหรับดรอปดาวน์
# ========================================
@router.get("/buildings", response_model=StandardResponse)
def get_buildings(db: Session = Depends(get_db)):
    buildings = db.query(Building).all()
    buildings_resp = [BuildingResponse.from_orm(b).dict() for b in buildings]
    return StandardResponse(
        success=True,
        message="Retrieve buildings successfully",
        data={"items": buildings_resp}
    )

# ========================================
# CREATE Problem (หลักของระบบ)
# ========================================
@router.post("/create", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    title: str = Form(..., min_length=5, max_length=255),
    description: str = Form(..., min_length=10),
    category_id: int = Form(...),
    building_id: Optional[int] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    is_anonymous: bool = Form(False),
    is_staff_only: bool = Form(False),
    incident_date: Optional[str] = Form(None),
    incident_time_range: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> StandardResponse:
    try:
        # 1️⃣ ตรวจสอบผู้ใช้มีอยู่
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # 2️⃣ ตรวจสอบหมวดหมู่มีอยู่
        category = check_category_exists(db, category_id)
        
        # 3️⃣ ตรวจสอบตึก/อาคารมีอยู่ (ถ้ามี)
        building = None
        if building_id:
            building = check_building_exists(db, building_id)
        
        logger.info(f"📝 Creating problem from user {user_id}: {title}")
        
        # 4️⃣ 🤖 วิเคราะห์ด้วย Ollama
        logger.info("🤖 Running Ollama analysis...")
        
        analysis = await ollama_service.analyze_problem_full(
            title=title,
            description=description
        )
        
        # ตรวจสอบ Toxicity
        toxicity_result = analysis.get("toxicity", {})
        toxicity_score = toxicity_result.get("score", 0.0)
        is_toxic = toxicity_result.get("is_toxic", False)
        recommendation = toxicity_result.get("recommendation", "APPROVE")
        
        logger.info(f"✅ Analysis complete: toxicity={toxicity_score:.2f}, action={recommendation}")
        
        if recommendation == "FLAG":
            logger.warning(f"🚫 Problem flagged as toxic: {title}")
            return StandardResponse(
                success=False,
                message="Your post contains inappropriate content and cannot be published",
                data={
                    "reason": "TOXIC_CONTENT",
                    "toxicity_score": toxicity_score,
                    "action": "FLAGGED"
                }
            )
        
        # Save image if provided
        image_url = None
        if image and image.filename:
            upload_dir = config.IMAGE_UPLOAD_DIR
            os.makedirs(upload_dir, exist_ok=True)
            file_ext = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            file_path = os.path.join(upload_dir, unique_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            # URL สำหรับ access
            image_url = f"/uploads/images/{unique_filename}"
            
        parsed_date = None
        if incident_date:
            try:
                parsed_date = datetime.fromisoformat(incident_date.replace('Z', '+00:00'))
            except Exception:
                parsed_date = None

        # 5️⃣ สร้าง Problem object
        db_problem = Problem(
            user_id=user_id,
            category_id=category_id,
            building_id=building_id,
            title=title,
            description=description,
            latitude=latitude,
            longitude=longitude,
            image_url=image_url,
            incident_date=parsed_date,
            incident_time_range=incident_time_range,
            is_anonymous=is_anonymous,
            is_staff_only=is_staff_only,
            toxicity_score=toxicity_score,
            status="OPEN",
            priority="MEDIUM",
            upvote_count=0,
            is_ai_generated_spam=(recommendation == "FLAG"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(db_problem)
        db.flush() 
        
        # 6️⃣ บันทึก NLP Analysis ลงฐานข้อมูล
        nlp_record = NLPAnalysis(
            problem_id=db_problem.id,
            extracted_category=analysis.get("category", {}).get("category", "อื่น ๆ"),
            extracted_time_context=analysis.get("time_context", {}).get("time_context", "unknown"),
            confidence_score=analysis.get("category", {}).get("confidence", 0.0),
            is_toxic=is_toxic,
            toxic_keywords=", ".join(toxicity_result.get("keywords", [])),
            raw_response=str(analysis),
            analysis_date=datetime.utcnow()
        )
        
        db.add(nlp_record)
        db.commit()
        db.refresh(db_problem)
        
        logger.info(f"✅ Problem created successfully: ID={db_problem.id}")
        
        problem_response = ProblemResponse.from_orm(db_problem)
        
        return StandardResponse(
            success=True,
            message="Problem reported successfully",
            data={
                "problem": problem_response.dict(),
                "nlp_analysis": {
                    "category": analysis.get("category", {}).get("category"),
                    "toxicity_score": toxicity_score,
                    "time_context": analysis.get("time_context", {}).get("time_context"),
                    "action": recommendation
                }
            }
        )
    
    except HTTPException as http_exc:
        logger.error(f"❌ HTTP Exception: {http_exc.detail}")
        raise http_exc
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating problem: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating problem: {str(e)}"
        )

# ========================================
# POST Upload Image
# ========================================
@router.post("/upload", response_model=StandardResponse)
async def upload_image(
    file: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user)
) -> StandardResponse:
    """อัพโหลดรูปภาพประกอบปัญหา"""
    try:
        # ตรวจสอบประเภทไฟล์
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="ไฟล์ที่อัพโหลดต้องเป็นรูปภาพเท่านั้น")
            
        # สร้างชื่อไฟล์ใหม่เพื่อป้องกันชื่อซ้ำ
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        
        # ตรวจสอบและสร้างโฟลเดอร์ถ้ายังไม่มี
        upload_dir = config.IMAGE_UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, unique_filename)
        
        # บันทึกไฟล์
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # สร้าง URL สำหรับเข้าถึงรูปภาพ
        image_url = f"/uploads/images/{unique_filename}"
        
        return StandardResponse(
            success=True,
            message="Upload successful",
            data={"image_url": image_url}
        )
    except Exception as e:
        logger.error(f"❌ Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# GET Problems (List) - ทุกปัญหาในระบบ
# ========================================
@router.get("/list", response_model=StandardResponse)
async def list_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    feed_type: Optional[str] = None,
    db: Session = Depends(get_db)
) -> StandardResponse:
    try:
        query = (
            db.query(Problem)
            .options(joinedload(Problem.user), joinedload(Problem.category), joinedload(Problem.building))
            .filter(Problem.status != "CLOSED")
        )
        if category_id: query = query.filter(Problem.category_id == category_id)
        if status: query = query.filter(Problem.status == status)
        
        if feed_type == "internal":
            query = query.filter(Problem.is_staff_only == True)
        elif feed_type == "public":
            query = query.filter(Problem.is_staff_only == False)
        
        total = query.count()
        skip = (page - 1) * page_size
        problems = query.order_by(Problem.created_at.desc()).offset(skip).limit(page_size).all()
        
        return StandardResponse(
            success=True,
            message=f"Retrieved {len(problems)} problems",
            data={
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": [serialize_problem(p) for p in problems]
            }
        )
    except Exception as e:
        logger.error(f"❌ Error listing problems: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ========================================
# GET My Problems - เฉพาะปัญหาของผู้ใช้ปัจจุบัน
# ========================================
@router.get("/my-problems", response_model=StandardResponse)
async def get_my_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user)
) -> StandardResponse:
    """📋 ดึงรายการปัญหาเฉพาะของผู้ใช้ที่เข้าสู่ระบบอยู่"""
    try:
        query = (
            db.query(Problem)
            .options(joinedload(Problem.user), joinedload(Problem.category), joinedload(Problem.building))
            .filter(Problem.user_id == current_user_id)
        )
        total = query.count()
        skip = (page - 1) * page_size
        problems = query.order_by(Problem.created_at.desc()).offset(skip).limit(page_size).all()

        return StandardResponse(
            success=True,
            message=f"Retrieved {len(problems)} problems for user {current_user_id}",
            data={
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": [serialize_problem(p) for p in problems]
            }
        )
    except Exception as e:
        logger.error(f"❌ Error listing my problems: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ========================================
# GET Analytics — สำหรับ Super Admin Dashboard
# ========================================
@router.get("/analytics", response_model=StandardResponse)
async def get_analytics(db: Session = Depends(get_db)) -> StandardResponse:
    """📊 ดึงข้อมูลสถิติสรุปสำหรับ Super Admin Dashboard"""
    from sqlalchemy import func
    from app.models import User, ProblemCategory, Role
    from datetime import timedelta

    try:
        # รวมทั้งหมด
        total = db.query(func.count(Problem.id)).scalar() or 0

        # โพสต์สัปดาห์นี้
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        this_week = db.query(func.count(Problem.id)).filter(Problem.created_at >= one_week_ago).scalar() or 0

        # แบ่งตาม Status
        status_counts = {}
        for s in ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]:
            count = db.query(func.count(Problem.id)).filter(Problem.status == s).scalar() or 0
            status_counts[s] = count

        # แบ่งตามหมวดหมู่
        cat_rows = (
            db.query(ProblemCategory.name, func.count(Problem.id).label("count"))
            .join(Problem, Problem.category_id == ProblemCategory.id)
            .group_by(ProblemCategory.id, ProblemCategory.name)
            .order_by(func.count(Problem.id).desc())
            .all()
        )
        by_category = [{"category_name": row[0], "count": row[1]} for row in cat_rows]

        # แบ่งตาม Role ของผู้โพสต์
        role_rows = (
            db.query(Role.name, func.count(Problem.id).label("count"))
            .join(User, User.id == Problem.user_id)
            .join(Role, Role.id == User.role_id)
            .group_by(Role.id, Role.name)
            .all()
        )
        by_role = {row[0]: row[1] for row in role_rows}

        # โพสต์พิกัด (lat/lng) สำหรับ map
        geo_problems = (
            db.query(Problem.id, Problem.latitude, Problem.longitude, Problem.status)
            .filter(Problem.latitude.isnot(None), Problem.longitude.isnot(None))
            .all()
        )
        geo_points = [
            {"id": r[0], "latitude": r[1], "longitude": r[2], "status": r[3]}
            for r in geo_problems
        ]

        return StandardResponse(
            success=True,
            message="Analytics retrieved successfully",
            data={
                "total": total,
                "this_week": this_week,
                "by_status": status_counts,
                "by_category": by_category,
                "by_role": by_role,
                "geo_points": geo_points,
            }
        )
    except Exception as e:
        logger.error(f"❌ Error getting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# PATCH Bulk Update — อัพเดตหลายโพสต์พร้อมกัน
# ========================================
@router.patch("/bulk-update", response_model=StandardResponse)
async def bulk_update_status(
    payload: BulkStatusUpdate,
    db: Session = Depends(get_db)
) -> StandardResponse:
    """🔧 Super Admin: อัพเดตสถานะหลายโพสต์พร้อมกัน"""
    try:
        updated = (
            db.query(Problem)
            .filter(Problem.id.in_(payload.problem_ids))
            .all()
        )
        if not updated:
            raise HTTPException(status_code=404, detail="ไม่พบโพสต์ที่ระบุ")

        for p in updated:
            p.status = payload.new_status
            p.updated_at = datetime.utcnow()

        db.commit()
        return StandardResponse(
            success=True,
            message=f"อัพเดต {len(updated)} โพสต์เป็น {payload.new_status} สำเร็จ",
            data={"updated_count": len(updated), "new_status": payload.new_status}
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Bulk update error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# GET Problem Detail
# ========================================
@router.get("/{problem_id}", response_model=StandardResponse)
async def get_problem_detail(problem_id: int, db: Session = Depends(get_db)) -> StandardResponse:
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem: raise HTTPException(status_code=404, detail="Problem not found")
        return StandardResponse(success=True, message="Problem retrieved successfully", data={"problem": serialize_problem(problem)})
    except HTTPException as http_exc: raise http_exc
    except Exception as e: 
        logger.error(f"❌ Error getting problem detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# PATCH /{problem_id}/status — อัพเดตสถานะโพสต์รายชิ้น (Staff/Admin only)
# ========================================
@router.patch("/{problem_id}/status", response_model=StandardResponse)
async def update_problem_status(
    problem_id: int,
    new_status: str,
    comment: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    """🔧 Staff/Admin: อัพเดตสถานะโพสต์รายชิ้น พร้อมบันทึก StatusUpdate log"""
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")

        acting_user = db.query(User).filter(User.id == user_id).first()
        if not acting_user or acting_user.role_id not in [2, 4]:
            raise HTTPException(status_code=403, detail="Only Staff or Admin can update status")

        valid_statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

        from app.models import StatusUpdate
        old_status = str(problem.status.value) if hasattr(problem.status, 'value') else str(problem.status)
        problem.status = new_status
        problem.updated_at = datetime.utcnow()

        # บันทึก StatusUpdate log
        status_log = StatusUpdate(
            problem_id=problem_id,
            updated_by_user_id=user_id,
            old_status=old_status,
            new_status=new_status,
            comment=comment,
        )
        db.add(status_log)
        db.commit()
        db.refresh(problem)

        return StandardResponse(
            success=True,
            message=f"Status updated to {new_status}",
            data={"problem_id": problem_id, "new_status": new_status, "old_status": old_status}
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating problem status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# POST /{problem_id}/comments — เพิ่มความคิดเห็น / Admin Reply
# ========================================
@router.post("/{problem_id}/comments", response_model=StandardResponse, status_code=201)
async def add_comment(
    problem_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    """💬 เพิ่มความคิดเห็น — is_admin_reply=True ถ้าผู้โพสต์เป็น Staff/Admin"""
    from app.models import Comment

    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")

        acting_user = db.query(User).filter(User.id == user_id).first()
        if not acting_user:
            raise HTTPException(status_code=404, detail="User not found")

        is_admin = acting_user.role_id in [2, 4]

        new_comment = Comment(
            problem_id=problem_id,
            user_id=user_id,
            content=body.content,
            is_admin_reply=is_admin,
        )
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)

        return StandardResponse(
            success=True,
            message="Comment added successfully",
            data={"comment": CommentResponse.from_orm(new_comment).dict()}
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error adding comment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# POST, PUT, DELETE for Categories
# ========================================
@router.post("/categories", response_model=StandardResponse, status_code=201)
async def create_category(
    category: ProblemCategoryCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    acting_user = db.query(User).filter(User.id == user_id).first()
    if not acting_user or acting_user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can manage categories")
    
    new_cat = ProblemCategory(**category.dict())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    
    return StandardResponse(success=True, message="Category created", data={"item": ProblemCategoryResponse.from_orm(new_cat).dict()})

@router.put("/categories/{category_id}", response_model=StandardResponse)
async def update_category(
    category_id: int,
    category: ProblemCategoryUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    acting_user = db.query(User).filter(User.id == user_id).first()
    if not acting_user or acting_user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can manage categories")
    
    db_cat = db.query(ProblemCategory).filter(ProblemCategory.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    update_data = category.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cat, key, value)
        
    db.commit()
    db.refresh(db_cat)
    return StandardResponse(success=True, message="Category updated", data={"item": ProblemCategoryResponse.from_orm(db_cat).dict()})

@router.delete("/categories/{category_id}", response_model=StandardResponse)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    acting_user = db.query(User).filter(User.id == user_id).first()
    if not acting_user or acting_user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can manage categories")
    
    db_cat = db.query(ProblemCategory).filter(ProblemCategory.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(db_cat)
    db.commit()
    return StandardResponse(success=True, message="Category deleted")

# ========================================
# POST, PUT, DELETE for Buildings
# ========================================
@router.post("/buildings", response_model=StandardResponse, status_code=201)
async def create_building(
    building: BuildingCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    acting_user = db.query(User).filter(User.id == user_id).first()
    if not acting_user or acting_user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can manage buildings")
    
    new_bld = Building(**building.dict())
    db.add(new_bld)
    db.commit()
    db.refresh(new_bld)
    
    return StandardResponse(success=True, message="Building created", data={"item": BuildingResponse.from_orm(new_bld).dict()})

@router.put("/buildings/{building_id}", response_model=StandardResponse)
async def update_building(
    building_id: int,
    building: BuildingUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    acting_user = db.query(User).filter(User.id == user_id).first()
    if not acting_user or acting_user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can manage buildings")
    
    db_bld = db.query(Building).filter(Building.id == building_id).first()
    if not db_bld:
        raise HTTPException(status_code=404, detail="Building not found")
        
    update_data = building.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bld, key, value)
        
    db.commit()
    db.refresh(db_bld)
    return StandardResponse(success=True, message="Building updated", data={"item": BuildingResponse.from_orm(db_bld).dict()})

@router.delete("/buildings/{building_id}", response_model=StandardResponse)
async def delete_building(
    building_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
) -> StandardResponse:
    acting_user = db.query(User).filter(User.id == user_id).first()
    if not acting_user or acting_user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can manage buildings")
    
    db_bld = db.query(Building).filter(Building.id == building_id).first()
    if not db_bld:
        raise HTTPException(status_code=404, detail="Building not found")
        
    db.delete(db_bld)
    db.commit()
    return StandardResponse(success=True, message="Building deleted")