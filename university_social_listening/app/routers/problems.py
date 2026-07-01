
# app/routers/problems.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import logging
from jose import jwt, JWTError

from app.main import get_db, config
from app.models import Problem, ProblemCategory, Building, User, NLPAnalysis
from app.schemas import (
    ProblemCreate, ProblemResponse, ProblemListResponse,
    ProblemUpdate, StandardResponse, ProblemCategoryResponse,
    BuildingResponse, ProblemAuthorResponse
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
        base["author"] = None
    else:
        u = p.user
        base["author"] = ProblemAuthorResponse(
            id=u.id,
            role_id=u.role_id,
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
    problem_data: ProblemCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),  # ✅ ดึง user_id จาก JWT Token จริง
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> StandardResponse:
    try:
        # 1️⃣ ตรวจสอบผู้ใช้มีอยู่
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # 2️⃣ ตรวจสอบหมวดหมู่มีอยู่
        category = check_category_exists(db, problem_data.category_id)
        
        # 3️⃣ ตรวจสอบตึก/อาคารมีอยู่ (ถ้ามี)
        building = None
        if problem_data.building_id:
            building = check_building_exists(db, problem_data.building_id)
        
        logger.info(f"📝 Creating problem from user {user_id}: {problem_data.title}")
        
        # 4️⃣ 🤖 วิเคราะห์ด้วย Ollama
        logger.info("🤖 Running Ollama analysis...")
        
        analysis = await ollama_service.analyze_problem_full(
            title=problem_data.title,
            description=problem_data.description
        )
        
        # ตรวจสอบ Toxicity
        toxicity_result = analysis.get("toxicity", {})
        toxicity_score = toxicity_result.get("score", 0.0)
        is_toxic = toxicity_result.get("is_toxic", False)
        recommendation = toxicity_result.get("recommendation", "APPROVE")
        
        logger.info(f"✅ Analysis complete: toxicity={toxicity_score:.2f}, action={recommendation}")
        
        if recommendation == "FLAG":
            logger.warning(f"🚫 Problem flagged as toxic: {problem_data.title}")
            return StandardResponse(
                success=False,
                message="Your post contains inappropriate content and cannot be published",
                data={
                    "reason": "TOXIC_CONTENT",
                    "toxicity_score": toxicity_score,
                    "action": "FLAGGED"
                }
            )
        
        # 5️⃣ สร้าง Problem object
        db_problem = Problem(
            user_id=user_id,
            category_id=problem_data.category_id,
            building_id=problem_data.building_id,
            title=problem_data.title,
            description=problem_data.description,
            latitude=problem_data.latitude,
            longitude=problem_data.longitude,
            incident_date=problem_data.incident_date,
            incident_time_range=problem_data.incident_time_range,
            is_anonymous=problem_data.is_anonymous,
            is_staff_only=problem_data.is_staff_only,
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
# GET Problems (List) - ทุกปัญหาในระบบ
# ========================================
@router.get("/list", response_model=StandardResponse)
async def list_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    status: Optional[str] = None,
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
# GET Problem Detail
# ========================================
@router.get("/{problem_id}", response_model=StandardResponse)
async def get_problem_detail(problem_id: int, db: Session = Depends(get_db)) -> StandardResponse:
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem: raise HTTPException(status_code=404, detail="Problem not found")
        return StandardResponse(success=True, message="Problem retrieved successfully", data={"problem": ProblemResponse.from_orm(problem).dict()})
    except HTTPException as http_exc: raise http_exc
    except Exception as e: 
        logger.error(f"❌ Error getting problem detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# UPDATE Problem Status
# ========================================
@router.patch("/{problem_id}/status", response_model=StandardResponse)
async def update_problem_status(problem_id: int, new_status: str, comment: Optional[str] = None, db: Session = Depends(get_db), user_id: int = 1) -> StandardResponse:
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem: raise HTTPException(status_code=404, detail="Problem not found")
        user = db.query(User).filter(User.id == user_id).first()
        if user.role_id not in [2, 4]: raise HTTPException(status_code=403, detail="Not authorized")
        old_status = problem.status
        problem.status = new_status
        problem.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(problem)
        return StandardResponse(success=True, message="Problem status updated successfully", data={"problem": ProblemResponse.from_orm(problem).dict()})
    except HTTPException as http_exc: raise http_exc
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating problem status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))