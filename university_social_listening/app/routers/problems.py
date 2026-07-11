# app/routers/problems.py
"""
Problems router — updated for the 26-table schema.

Key changes from v1:
  - problem_id  (was: id)
  - status_id   (was: status string)  — looked up via Status table
  - visibility_id (was: visibility string) — looked up via VisibilityType table
  - building_name  (was: building_id FK)  — plain string field
  - ProblemLike  (was: Upvote)
  - ProblemComment.comment_text (was: Comment.content)
  - ProblemAttachment  (was: single image_url on Problem)
  - Category.category_id / category_name  (was: id / name)
"""
from fastapi import (
    APIRouter, Depends, HTTPException, Query,
    status as http_status, File, UploadFile, Form, Request
)
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import func, cast, Date
from typing import List, Optional
from datetime import datetime, timedelta
import logging, os, uuid, shutil

from app.database import get_db, config
from app.models import (
    User, Student, Staff, PublicUser,
    Problem, ProblemLike, ProblemComment, ProblemAttachment,
    ProblemStatusHistory, Category, Status, VisibilityType,
    SuperAdmin, CategoryAdmin, Building,
)
from app.schemas import (
    ProblemCreate, ProblemUpdate, ProblemResponse,
    BulkStatusUpdate, StandardResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse,
    StatusResponse, VisibilityTypeResponse,
    ProblemCommentCreate, ProblemCommentResponse,
    StatusHistoryResponse,
)
from app.routers.auth import (
    get_current_user,
    get_current_user_optional,
    get_user_role,
    get_display_name,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Problems"])


# ──────────────────────────────────────────────
# Lookup helpers
# ──────────────────────────────────────────────
def get_status_by_name(db: Session, name: str) -> Status:
    s = db.query(Status).filter(Status.status_name == name).first()
    if not s:
        raise HTTPException(400, f"Unknown status '{name}'. Run reset_db.py to seed defaults.")
    return s


def get_visibility_by_name(db: Session, name: str) -> VisibilityType:
    v = db.query(VisibilityType).filter(VisibilityType.visibility_name == name).first()
    if not v:
        raise HTTPException(400, f"Unknown visibility '{name}'. Run reset_db.py to seed defaults.")
    return v


def get_author_info(user_id: int, db: Session) -> Optional[dict]:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if student:
        return {"user_id": user_id, "display_name": student.student_name, "role": "student"}
    stf = db.query(Staff).filter(Staff.user_id == user_id).first()
    if stf:
        return {"user_id": user_id, "display_name": stf.staff_name, "role": "staff"}
    pub = db.query(PublicUser).filter(PublicUser.user_id == user_id).first()
    if pub:
        return {"user_id": user_id, "display_name": f"{pub.first_name} {pub.last_name}", "role": "public"}
    from app.models import AnonymousUser
    anon = db.query(AnonymousUser).filter(AnonymousUser.user_id == user_id).first()
    if anon:
        ip = anon.raw_ip or anon.hashed_ip
        if ip and ip != "anonymous_guest":
            parts = ip.split(".")
            if len(parts) == 4:
                display = f"ไม่ระบุตัวตน (IP: *.*.{parts[2]}.{parts[3]})"
            else:
                display = f"ไม่ระบุตัวตน (IP: {ip[:8]}...)"
        else:
            display = "ไม่ระบุตัวตน (IP: *.*.0.0)"
        return {"user_id": user_id, "display_name": display, "role": "anonymous"}
    return {"user_id": user_id, "display_name": user.email or "Unknown", "role": "unknown"}


def require_admin_or_staff(user: User, db: Session) -> None:
    """Raise 403 if the user is neither staff, category_admin, nor super_admin."""
    is_staff = db.query(Staff).filter(Staff.user_id == user.user_id).first()
    is_cat_admin = db.query(CategoryAdmin).filter(
        CategoryAdmin.user_id == user.user_id, CategoryAdmin.is_active == True
    ).first()
    is_super = db.query(SuperAdmin).filter(
        SuperAdmin.user_id == user.user_id, SuperAdmin.is_active == True
    ).first()
    if not (is_staff or is_cat_admin or is_super):
        raise HTTPException(403, "Only staff or admin users can perform this action")


def serialize_problem(p: Problem, db: Session, current_user: Optional[User] = None) -> dict:
    """Convert a Problem ORM object into a serialisable dict."""
    # Status & visibility (use ORM relationships if loaded, else query)
    status_name = p.status.status_name if p.status else "UNKNOWN"
    status_color = p.status.color_code if p.status else None
    visibility_name = p.visibility.visibility_name if p.visibility else "public"
    category_name = p.category.category_name if p.category else ""

    # Likes
    like_count = db.query(func.count(ProblemLike.like_id)).filter(
        ProblemLike.problem_id == p.problem_id
    ).scalar() or 0

    is_liked = False
    if current_user:
        is_liked = (
            db.query(ProblemLike)
            .filter(
                ProblemLike.problem_id == p.problem_id,
                ProblemLike.user_id == current_user.user_id,
            )
            .first() is not None
        )

    # Attachments
    attachments = [
        {"attachment_id": a.attachment_id, "file_url": a.file_url,
         "file_type": a.file_type, "file_size": a.file_size}
        for a in (p.attachments or [])
    ]

    author_data = get_author_info(p.user_id, db)
    return {
        "id": p.problem_id,
        "problem_id": p.problem_id,
        "user_id": p.user_id,
        "category_id": p.category_id,
        "category_name": category_name,
        "visibility_id": p.visibility_id,
        "visibility_name": visibility_name,
        "status_id": p.status_id,
        "status_name": status_name,
        "status_color": status_color,
        "title": p.title,
        "description": p.description,
        "latitude": float(p.latitude) if p.latitude is not None else None,
        "longitude": float(p.longitude) if p.longitude is not None else None,
        "building_name": p.building_name,
        "is_deleted": p.is_deleted,
        "is_flagged": p.is_flagged,
        "flagged_reason": p.flagged_reason,
        "llm_analysis": p.llm_analysis,
        "created_at": p.created_at,
        "like_count": like_count,
        "is_liked_by_me": is_liked,
        "author": author_data,
        "author_name": author_data.get("display_name", "Unknown") if author_data else "Unknown",
        "attachments": attachments,
    }


# ──────────────────────────────────────────────
# Category endpoints
# ──────────────────────────────────────────────
@router.get("/categories", response_model=StandardResponse)
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).filter(Category.is_active == True).all()
    return StandardResponse(
        success=True, message="Success",
        data={"items": [CategoryResponse.model_validate(c).model_dump() for c in cats]},
    )


@router.post("/categories", response_model=StandardResponse, status_code=201)
def create_category(
    cat: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    if db.query(Category).filter(Category.category_name == cat.category_name).first():
        raise HTTPException(400, "Category name already exists")
    new_cat = Category(**cat.model_dump())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return StandardResponse(
        success=True, message="Category created",
        data={"item": CategoryResponse.model_validate(new_cat).model_dump()},
    )


@router.put("/categories/{category_id}", response_model=StandardResponse)
def update_category(
    category_id: int,
    cat: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    db_cat = db.query(Category).filter(Category.category_id == category_id).first()
    if not db_cat:
        raise HTTPException(404, "Category not found")
    for field, value in cat.model_dump(exclude_none=True).items():
        setattr(db_cat, field, value)
    db.commit()
    db.refresh(db_cat)
    return StandardResponse(
        success=True, message="Category updated",
        data={"item": CategoryResponse.model_validate(db_cat).model_dump()},
    )


@router.delete("/categories/{category_id}", response_model=StandardResponse)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    db_cat = db.query(Category).filter(Category.category_id == category_id).first()
    if not db_cat:
        raise HTTPException(404, "Category not found")
    db.delete(db_cat)
    db.commit()
    return StandardResponse(success=True, message="Category deleted")


# ──────────────────────────────────────────────
# Status & Visibility reference endpoints
# ──────────────────────────────────────────────
@router.get("/statuses", response_model=StandardResponse)
def list_statuses(db: Session = Depends(get_db)):
    statuses = db.query(Status).all()
    return StandardResponse(
        success=True, message="Success",
        data={"items": [StatusResponse.model_validate(s).model_dump() for s in statuses]},
    )


@router.get("/visibility-types", response_model=StandardResponse)
def list_visibility_types(db: Session = Depends(get_db)):
    types = db.query(VisibilityType).all()
    return StandardResponse(
        success=True, message="Success",
        data={"items": [VisibilityTypeResponse.model_validate(v).model_dump() for v in types]},
    )


# ──────────────────────────────────────────────
# Problem CRUD
# ──────────────────────────────────────────────
@router.post("/create", response_model=StandardResponse, status_code=201)
async def create_problem(
    request: Request,
    title: str = Form(...),
    description: str = Form(...),
    category_id: int = Form(...),
    visibility_name: str = Form("public"),
    building_name: Optional[str] = Form(None),
    building_id: Optional[int] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    API สำหรับแจ้งปัญหา/ข้อร้องเรียนใหม่
    เข้าได้เฉพาะ: ผู้ที่เข้าสู่ระบบแล้ว (นิสิต, บุคลากร, บุคคลทั่วไป, หรือ Guest)
    การทำงาน: 
    1. รับข้อมูลเรื่องที่แจ้งพร้อมรูปภาพ 
    2. มีระบบ AI กรองคำหยาบ 
    3. บันทึกข้อมูลลงฐานข้อมูลและผูกเข้ากับหมวดหมู่
    """
    # AI Profanity Check
    from app.services.ai_service import check_profanity, suggest_category
    if check_profanity(description):
        raise HTTPException(status_code=400, detail="เนื้อหาไม่เหมาะสมเนื่องจากมีคำหยาบคาย")

    # Validate category
    cat = db.query(Category).filter(Category.category_id == category_id).first()
    if not cat:
        raise HTTPException(404, f"Category {category_id} not found")

    # AI Category Suggestion if category is "อื่นๆ"
    if cat.category_name == "อื่นๆ" or cat.category_name == "อื่น ๆ":
        categories = db.query(Category).all()
        categories_list = [{"id": c.category_id, "name": c.category_name} for c in categories]
        suggested_id = suggest_category(description, categories_list)
        if suggested_id:
            category_id = suggested_id
            cat = db.query(Category).filter(Category.category_id == category_id).first() or cat

    # Resolve FK lookups
    status_obj = get_status_by_name(db, "OPEN")
    
    # Ensure students/anonymous cannot create internal visibility problems
    if visibility_name == "internal":
        is_privileged = bool(
            db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
            or db.query(SuperAdmin).filter(SuperAdmin.user_id == current_user.user_id).first()
            or db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id).first()
        )
        if not is_privileged:
            visibility_name = "public"
            
    vis_obj = get_visibility_by_name(db, visibility_name)
    
    if not building_name and building_id:
        b = db.query(Building).filter(Building.building_id == building_id).first()
        if b:
            building_name = b.name

    # Handle image upload
    attachment_url: Optional[str] = None
    if image and image.filename:
        os.makedirs(config.IMAGE_UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(config.IMAGE_UPLOAD_DIR, filename)
        with open(filepath, "wb") as buf:
            shutil.copyfileobj(image.file, buf)
        attachment_url = f"/uploads/images/{filename}"

    # User mapping
    problem_user_id = current_user.user_id

    # Create problem
    problem = Problem(
        user_id=problem_user_id,
        category_id=category_id,
        status_id=status_obj.status_id,
        visibility_id=vis_obj.visibility_id,
        title=title,
        description=description,
        latitude=latitude,
        longitude=longitude,
        building_name=building_name,
    )
    db.add(problem)
    db.flush()   # get problem_id

    # Attach image if uploaded
    if attachment_url:
        att = ProblemAttachment(
            problem_id=problem.problem_id,
            file_url=attachment_url,
            file_type=image.content_type if image else None,
        )
        db.add(att)

    # Record initial status history
    history = ProblemStatusHistory(
        problem_id=problem.problem_id,
        status_id=status_obj.status_id,
        changed_by=problem_user_id,
        notes="Problem created",
    )
    db.add(history)
    db.commit()

    # Eager-load for serialization
    problem = (
        db.query(Problem)
        .options(
            joinedload(Problem.category),
            joinedload(Problem.status),
            joinedload(Problem.visibility),
            joinedload(Problem.attachments),
        )
        .filter(Problem.problem_id == problem.problem_id)
        .first()
    )

    return StandardResponse(
        success=True,
        message="Problem reported successfully",
        data={"problem": serialize_problem(problem, db, current_user)},
    )


@router.get("/list", response_model=StandardResponse)
async def list_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    status_name: Optional[str] = None,
    user_id: Optional[int] = None,
    visibility_name: str = Query("public"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    API สำหรับดึงรายการปัญหาทั้งหมด (หน้า Feed)
    เข้าได้เฉพาะ: ทุกคน (Public) ยกเว้นฟีดภายใน
    การทำงาน: 
    1. ดึงข้อมูลโพสต์ปัญหาแบบแบ่งหน้า (Pagination)
    2. ตรวจสอบสิทธิ์ Visibility: ถ้าขอเรียกฟีด 'internal' จะต้องเป็น บุคลากร หรือ Admin เท่านั้น
    """
    query = (
        db.query(Problem)
        .join(Category, Problem.category_id == Category.category_id)
        .options(
            contains_eager(Problem.category),
            joinedload(Problem.status),
            joinedload(Problem.visibility),
            joinedload(Problem.attachments),
        )
        .filter(Problem.is_deleted == False)
    )

    # Visibility gate: only staff/admin can see internal problems
    vis = db.query(VisibilityType).filter(
        VisibilityType.visibility_name == visibility_name
    ).first()
    if vis:
        is_privileged = False
        if current_user:
            is_privileged = bool(
                db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
                or db.query(SuperAdmin).filter(
                    SuperAdmin.user_id == current_user.user_id, SuperAdmin.is_active == True
                ).first()
            )
        if visibility_name == "internal" and not is_privileged:
            # Fall back to public for unprivileged users
            vis = db.query(VisibilityType).filter(
                VisibilityType.visibility_name == "public"
            ).first()
        if vis:
            query = query.filter(Problem.visibility_id == vis.visibility_id)

    if category_id:
        query = query.filter(Problem.category_id == category_id)
    if status_name:
        status_obj = db.query(Status).filter(Status.status_name == status_name).first()
        if status_obj:
            query = query.filter(Problem.status_id == status_obj.status_id)

    if user_id:
        query = query.filter(Problem.user_id == user_id)

    # Category Admin RBAC filter
    if current_user:
        cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id, CategoryAdmin.is_active == True).first()
        if cat_admin and cat_admin.category_id:
            query = query.filter(Problem.category_id == cat_admin.category_id)

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
            "items": [serialize_problem(p, db, current_user) for p in problems],
        },
    )


@router.get("/my-problems", response_model=StandardResponse)
async def get_my_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Problem)
        .options(
            joinedload(Problem.category),
            joinedload(Problem.status),
            joinedload(Problem.visibility),
            joinedload(Problem.attachments),
        )
        .filter(Problem.user_id == current_user.user_id, Problem.is_deleted == False)
    )
    total = query.count()
    problems = query.order_by(Problem.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return StandardResponse(
        success=True,
        message=f"Retrieved {len(problems)} problems",
        data={
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [serialize_problem(p, db, current_user) for p in problems],
        },
    )


@router.get("/analytics", response_model=StandardResponse)
async def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_admin_or_staff(current_user, db)
    base_filters = [Problem.is_deleted == False]
    cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id, CategoryAdmin.is_active == True).first()
    if cat_admin and cat_admin.category_id:
        base_filters.append(Problem.category_id == cat_admin.category_id)

    total = db.query(func.count(Problem.problem_id)).filter(*base_filters).scalar() or 0

    # By status
    status_rows = (
        db.query(Status.status_name, func.count(Problem.problem_id).label("cnt"))
        .join(Problem, Problem.status_id == Status.status_id)
        .filter(*base_filters)
        .group_by(Status.status_id, Status.status_name)
        .all()
    )
    by_status = {row[0]: row[1] for row in status_rows}

    # By category
    cat_rows = (
        db.query(Category.category_name, func.count(Problem.problem_id).label("cnt"))
        .join(Problem, Problem.category_id == Category.category_id)
        .filter(*base_filters)
        .group_by(Category.category_id, Category.category_name)
        .order_by(func.count(Problem.problem_id).desc())
        .all()
    )
    by_category = [{"category_name": r[0], "count": r[1]} for r in cat_rows]

    # By role (separate sub-table counts)
    student_count = (
        db.query(func.count(Problem.problem_id))
        .join(Student, Student.user_id == Problem.user_id)
        .filter(*base_filters)
        .scalar() or 0
    )
    staff_count = (
        db.query(func.count(Problem.problem_id))
        .join(Staff, Staff.user_id == Problem.user_id)
        .filter(*base_filters)
        .scalar() or 0
    )
    public_count = (
        db.query(func.count(Problem.problem_id))
        .join(PublicUser, PublicUser.user_id == Problem.user_id)
        .filter(*base_filters)
        .scalar() or 0
    )
    by_role = {"student": student_count, "staff": staff_count, "public": public_count}

    # Geo points
    geo_rows = (
        db.query(Problem.problem_id, Problem.latitude, Problem.longitude, Status.status_name)
        .join(Status, Status.status_id == Problem.status_id)
        .filter(Problem.latitude.isnot(None), Problem.longitude.isnot(None), *base_filters)
        .all()
    )
    geo_points = [
        {"id": r[0], "latitude": float(r[1]), "longitude": float(r[2]), "status": r[3]}
        for r in geo_rows
    ]

    return StandardResponse(
        success=True,
        message="Analytics retrieved",
        data={"total": total, "by_status": by_status, "by_category": by_category,
              "by_role": by_role, "geo_points": geo_points},
    )


@router.get("/analytics/time-series", response_model=StandardResponse)
async def get_time_series(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_admin_or_staff(current_user, db)
    since = datetime.utcnow() - timedelta(days=29)

    base_filters = [Problem.created_at >= since, Problem.is_deleted == False]
    cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id, CategoryAdmin.is_active == True).first()
    if cat_admin and cat_admin.category_id:
        base_filters.append(Problem.category_id == cat_admin.category_id)

    daily_rows = (
        db.query(cast(Problem.created_at, Date).label("day"), func.count(Problem.problem_id).label("cnt"))
        .filter(*base_filters)
        .group_by(cast(Problem.created_at, Date))
        .order_by(cast(Problem.created_at, Date))
        .all()
    )

    top_cats = (
        db.query(Category.category_name)
        .join(Problem, Problem.category_id == Category.category_id)
        .filter(*base_filters)
        .group_by(Category.category_id, Category.category_name)
        .order_by(func.count(Problem.problem_id).desc())
        .limit(5)
        .all()
    )
    top_cat_names = [r[0] for r in top_cats]

    cat_daily_rows = (
        db.query(
            cast(Problem.created_at, Date).label("day"),
            Category.category_name.label("category"),
            func.count(Problem.problem_id).label("cnt"),
        )
        .join(Category, Problem.category_id == Category.category_id)
        .filter(*base_filters, Category.category_name.in_(top_cat_names) if top_cat_names else True)
        .group_by(cast(Problem.created_at, Date), Category.category_name)
        .order_by(cast(Problem.created_at, Date))
        .all()
    )

    series_map: dict = {}
    for row in daily_rows:
        key = str(row.day)
        series_map[key] = {"date": key, "total": row.cnt}
    for row in cat_daily_rows:
        key = str(row.day)
        if key not in series_map:
            series_map[key] = {"date": key, "total": 0}
        series_map[key][row.category] = row.cnt

    series = sorted(series_map.values(), key=lambda x: x["date"])
    return StandardResponse(
        success=True, message="Time series retrieved",
        data={"series": series, "categories": top_cat_names},
    )


@router.get("/analytics/user-reputation", response_model=StandardResponse)
async def get_user_reputation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_admin_or_staff(current_user, db)
    base_filters = [Problem.is_deleted == False]
    cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id, CategoryAdmin.is_active == True).first()
    if cat_admin and cat_admin.category_id:
        base_filters.append(Problem.category_id == cat_admin.category_id)

    stats = (
        db.query(
            Problem.user_id,
            func.count(Problem.problem_id.distinct()).label("total_posts"),
            func.count(ProblemLike.like_id).label("total_upvotes")
        )
        .outerjoin(ProblemLike, ProblemLike.problem_id == Problem.problem_id)
        .filter(*base_filters)
        .group_by(Problem.user_id)
        .all()
    )

    items = []
    for row in stats:
        if not row.user_id:
            continue
        user_id = row.user_id
        posts = row.total_posts
        upvotes = row.total_upvotes
        ratio = round(upvotes / posts, 2) if posts > 0 else 0
        
        rep = "New"
        if ratio >= 5: rep = "Trusted"
        elif ratio >= 2: rep = "Active"
        elif ratio > 0: rep = "Regular"
        
        role = get_user_role(user_id, db)
        role_map = {"student": 1, "staff": 2, "public": 3, "super_admin": 4, "category_admin": 4, "anonymous": 5}
        
        items.append({
            "user_id": user_id,
            "display_name": get_display_name(user_id, db),
            "role": role_map.get(role, 5),
            "total_posts": posts,
            "total_upvotes": upvotes,
            "ratio": ratio,
            "reputation_status": rep,
        })
        
    items = sorted(items, key=lambda x: x["total_posts"], reverse=True)

    return StandardResponse(
        success=True, message="User reputation retrieved",
        data={"items": items}
    )


@router.get("/analytics/report", response_model=StandardResponse)
async def get_report(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_admin_or_staff(current_user, db)
    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d")
        dt_end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

    if dt_start > dt_end:
        raise HTTPException(400, "start_date must be before end_date.")

    base_filters = [
        Problem.created_at >= dt_start,
        Problem.created_at <= dt_end,
        Problem.is_deleted == False,
    ]
    cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id, CategoryAdmin.is_active == True).first()
    if cat_admin and cat_admin.category_id:
        base_filters.append(Problem.category_id == cat_admin.category_id)

    base_q = db.query(Problem).filter(*base_filters)
    total = base_q.count()

    status_rows = (
        db.query(Status.status_name, func.count(Problem.problem_id))
        .join(Problem, Problem.status_id == Status.status_id)
        .filter(*base_filters)
        .group_by(Status.status_id, Status.status_name)
        .all()
    )
    by_status = {r[0]: r[1] for r in status_rows}

    cat_rows = (
        db.query(Category.category_name, func.count(Problem.problem_id))
        .join(Problem, Problem.category_id == Category.category_id)
        .filter(*base_filters)
        .group_by(Category.category_id, Category.category_name)
        .order_by(func.count(Problem.problem_id).desc())
        .all()
    )
    by_category = [{"name": r[0], "count": r[1]} for r in cat_rows]

    resolved = by_status.get("RESOLVED", 0) + by_status.get("CLOSED", 0)
    unresolved = total - resolved
    resolution_rate = round((resolved / total) * 100, 1) if total > 0 else 0.0

    problems = (
        base_q
        .options(joinedload(Problem.category), joinedload(Problem.status), joinedload(Problem.visibility))
        .order_by(Problem.created_at.desc())
        .all()
    )
    rows = [
        {
            "id": p.problem_id,
            "title": p.title,
            "status": p.status.status_name if p.status else "",
            "visibility": p.visibility.visibility_name if p.visibility else "",
            "category": p.category.category_name if p.category else "",
            "author": get_author_info(p.user_id, db),
            "building_name": p.building_name,
            "latitude": float(p.latitude) if p.latitude else None,
            "longitude": float(p.longitude) if p.longitude else None,
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else "",
        }
        for p in problems
    ]

    student_count = db.query(func.count(Problem.problem_id)).join(Student, Student.user_id == Problem.user_id).filter(*base_filters).scalar() or 0
    staff_count = db.query(func.count(Problem.problem_id)).join(Staff, Staff.user_id == Problem.user_id).filter(*base_filters).scalar() or 0
    public_count = db.query(func.count(Problem.problem_id)).join(PublicUser, PublicUser.user_id == Problem.user_id).filter(*base_filters).scalar() or 0
    by_role = [
        {"name": "Student", "count": student_count},
        {"name": "Staff", "count": staff_count},
        {"name": "Public", "count": public_count}
    ]

    return StandardResponse(
        success=True,
        message=f"Report generated: {total} problems ({start_date} → {end_date})",
        data={
            "summary": {
                "total": total, "resolved": resolved,
                "unresolved": unresolved, "resolution_rate": resolution_rate,
                "by_status": by_status,
            },
            "by_category": by_category,
            "by_role": by_role,
            "rows": rows,
            "date_range": {"start": start_date, "end": end_date},
        },
    )


@router.patch("/bulk-update", response_model=StandardResponse)
async def bulk_update_status(
    payload: BulkStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    status_obj = get_status_by_name(db, payload.status_name)
    problems = db.query(Problem).filter(Problem.problem_id.in_(payload.problem_ids)).all()
    if not problems:
        raise HTTPException(404, "No matching problems found")

    for p in problems:
        p.status_id = status_obj.status_id
        history = ProblemStatusHistory(
            problem_id=p.problem_id,
            status_id=status_obj.status_id,
            changed_by=current_user.user_id,
            notes=f"Bulk update to {payload.status_name}",
        )
        db.add(history)

    db.commit()
    return StandardResponse(
        success=True,
        message=f"Updated {len(problems)} problems to {payload.status_name}",
        data={"updated_count": len(problems), "new_status": payload.status_name},
    )


@router.get("/{problem_id}", response_model=StandardResponse)
async def get_problem_detail(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    problem = (
        db.query(Problem)
        .options(
            joinedload(Problem.category),
            joinedload(Problem.status),
            joinedload(Problem.visibility),
            joinedload(Problem.attachments),
        )
        .filter(Problem.problem_id == problem_id, Problem.is_deleted == False)
        .first()
    )
    if not problem:
        raise HTTPException(404, "Problem not found")
    return StandardResponse(
        success=True, message="Success",
        data={"problem": serialize_problem(problem, db, current_user)},
    )


@router.patch("/{problem_id}/status", response_model=StandardResponse)
async def update_problem_status(
    problem_id: int,
    new_status_name: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(404, "Problem not found")

    cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id, CategoryAdmin.is_active == True).first()
    if cat_admin and cat_admin.category_id and problem.category_id != cat_admin.category_id:
        raise HTTPException(403, "You can only update problems in your assigned category")

    status_obj = get_status_by_name(db, new_status_name)
    problem.status_id = status_obj.status_id

    history = ProblemStatusHistory(
        problem_id=problem_id,
        status_id=status_obj.status_id,
        changed_by=current_user.user_id,
        notes=notes,
    )
    db.add(history)
    db.commit()

    return StandardResponse(
        success=True,
        message=f"Status updated to {new_status_name}",
        data={"problem_id": problem_id, "new_status": new_status_name},
    )


@router.get("/{problem_id}/status-history", response_model=StandardResponse)
async def get_status_history(
    problem_id: int, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(404, "Problem not found")
        
    is_privileged = False
    if current_user:
        is_privileged = bool(
            db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
            or db.query(SuperAdmin).filter(SuperAdmin.user_id == current_user.user_id).first()
            or db.query(CategoryAdmin).filter(CategoryAdmin.user_id == current_user.user_id).first()
        )

    histories = (
        db.query(ProblemStatusHistory)
        .options(joinedload(ProblemStatusHistory.status))
        .filter(ProblemStatusHistory.problem_id == problem_id)
        .order_by(ProblemStatusHistory.changed_at.asc())
        .all()
    )
    result = [
        {
            "history_id": h.history_id,
            "problem_id": h.problem_id,
            "status_id": h.status_id,
            "status_name": h.status.status_name if h.status else "",
            "status_color": h.status.color_code if h.status else None,
            "changed_by": h.changed_by,
            "notes": h.notes if is_privileged else None,
            "changed_at": h.changed_at,
        }
        for h in histories
    ]
    return StandardResponse(success=True, message="Status history retrieved", data={"items": result})


@router.post("/{problem_id}/comments", response_model=StandardResponse, status_code=201)
async def add_comment(
    problem_id: int,
    body: ProblemCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = db.query(Problem).filter(Problem.problem_id == problem_id, Problem.is_deleted == False).first()
    if not problem:
        raise HTTPException(404, "Problem not found")

    comment = ProblemComment(
        problem_id=problem_id,
        user_id=current_user.user_id,
        comment_text=body.comment_text,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return StandardResponse(
        success=True, message="Comment added",
        data={"comment": ProblemCommentResponse.model_validate(comment).model_dump()},
    )


@router.get("/{problem_id}/comments", response_model=StandardResponse)
async def list_comments(problem_id: int, db: Session = Depends(get_db)):
    comments = (
        db.query(ProblemComment)
        .filter(ProblemComment.problem_id == problem_id, ProblemComment.is_deleted == False)
        .order_by(ProblemComment.created_at.asc())
        .all()
    )
    return StandardResponse(
        success=True, message=f"Retrieved {len(comments)} comments",
        data={"items": [ProblemCommentResponse.model_validate(c).model_dump() for c in comments]},
    )


@router.post("/{problem_id}/like", response_model=StandardResponse)
async def toggle_like(
    problem_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = db.query(Problem).filter(Problem.problem_id == problem_id, Problem.is_deleted == False).first()
    if not problem:
        raise HTTPException(404, "Problem not found")

    # User mapping
    action_user_id = current_user.user_id

    existing = db.query(ProblemLike).filter(
        ProblemLike.problem_id == problem_id, ProblemLike.user_id == action_user_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        is_liked, msg = False, "Like removed"
    else:
        db.add(ProblemLike(problem_id=problem_id, user_id=action_user_id))
        db.commit()
        is_liked, msg = True, "Like added"

    like_count = db.query(func.count(ProblemLike.like_id)).filter(
        ProblemLike.problem_id == problem_id
    ).scalar() or 0

    return StandardResponse(
        success=True, message=msg,
        data={"problem_id": problem_id, "like_count": like_count, "is_liked_by_me": is_liked},
    )


@router.delete("/{problem_id}", response_model=StandardResponse)
async def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(404, "Problem not found")

    # Owners can soft-delete their own; admins/staff can hard-delete
    is_owner = problem.user_id == current_user.user_id
    is_privileged = bool(
        db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
        or db.query(SuperAdmin).filter(SuperAdmin.user_id == current_user.user_id).first()
    )

    if not (is_owner or is_privileged):
        raise HTTPException(403, "Not authorized to delete this problem")

    # Soft delete
    problem.is_deleted = True
    problem.deleted_at = datetime.utcnow()
    db.commit()

    return StandardResponse(success=True, message="Problem deleted successfully")