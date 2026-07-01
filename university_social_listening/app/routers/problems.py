# app/routers/problems.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import os
import uuid
import shutil
from jose import jwt, JWTError

from app.main import get_db, config
from app.models import Problem, Category, Building, User, Comment, Upvote
from app.schemas import (
    ProblemCreate, ProblemResponse, ProblemListResponse,
    ProblemUpdate, StandardResponse, CategoryResponse,
    BuildingResponse, ProblemAuthorResponse, BulkStatusUpdate,
    CommentCreate, CommentResponse,
    CategoryCreate, CategoryUpdate,
    BuildingCreate, BuildingUpdate
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Problems"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional)) -> Optional[int]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id = payload.get("user_id")
        return int(user_id) if user_id else None
    except JWTError:
        return None

def check_category_exists(db: Session, category_id: int) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail=f"Category {category_id} not found")
    return category

def check_building_exists(db: Session, building_id: int) -> Optional[Building]:
    if not building_id:
        return None
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building

def serialize_problem(p: Problem, current_user_id: Optional[int] = None) -> dict:
    base = ProblemResponse.model_validate(p).model_dump()
    u = p.author
    if u:
        base["author"] = ProblemAuthorResponse.model_validate(u).model_dump()
    else:
        base["author"] = None
        
    upvotes = p.upvotes if p.upvotes else []
    base["upvote_count"] = len(upvotes)
    if current_user_id:
        base["is_upvoted_by_me"] = any(uv.user_id == current_user_id for uv in upvotes)
    else:
        base["is_upvoted_by_me"] = False
        
    return base

# Categories
@router.get("/categories", response_model=StandardResponse)
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    categories_resp = [CategoryResponse.model_validate(c).model_dump() for c in categories]
    return StandardResponse(success=True, message="Success", data={"items": categories_resp})

@router.post("/categories", response_model=StandardResponse, status_code=201)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    new_cat = Category(name=category.name)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return StandardResponse(success=True, message="Category created", data={"item": CategoryResponse.model_validate(new_cat).model_dump()})

@router.put("/categories/{category_id}", response_model=StandardResponse)
async def update_category(
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    db_cat = db.query(Category).filter(Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.name:
        db_cat.name = category.name
    db.commit()
    db.refresh(db_cat)
    return StandardResponse(success=True, message="Category updated", data={"item": CategoryResponse.model_validate(db_cat).model_dump()})

@router.delete("/categories/{category_id}", response_model=StandardResponse)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    db_cat = db.query(Category).filter(Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(db_cat)
    db.commit()
    return StandardResponse(success=True, message="Category deleted")

# Buildings
@router.get("/buildings", response_model=StandardResponse)
def get_buildings(db: Session = Depends(get_db)):
    buildings = db.query(Building).all()
    buildings_resp = [BuildingResponse.model_validate(b).model_dump() for b in buildings]
    return StandardResponse(success=True, message="Success", data={"items": buildings_resp})

@router.post("/buildings", response_model=StandardResponse, status_code=201)
async def create_building(
    building: BuildingCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    new_bld = Building(name=building.name, latitude=building.latitude, longitude=building.longitude)
    db.add(new_bld)
    db.commit()
    db.refresh(new_bld)
    return StandardResponse(success=True, message="Building created", data={"item": BuildingResponse.model_validate(new_bld).model_dump()})

@router.put("/buildings/{building_id}", response_model=StandardResponse)
async def update_building(
    building_id: int,
    building: BuildingUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    db_bld = db.query(Building).filter(Building.id == building_id).first()
    if not db_bld:
        raise HTTPException(status_code=404, detail="Building not found")
    if building.name:
        db_bld.name = building.name
    if building.latitude is not None:
        db_bld.latitude = building.latitude
    if building.longitude is not None:
        db_bld.longitude = building.longitude
    db.commit()
    db.refresh(db_bld)
    return StandardResponse(success=True, message="Building updated", data={"item": BuildingResponse.model_validate(db_bld).model_dump()})

@router.delete("/buildings/{building_id}", response_model=StandardResponse)
async def delete_building(
    building_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    db_bld = db.query(Building).filter(Building.id == building_id).first()
    if not db_bld:
        raise HTTPException(status_code=404, detail="Building not found")
    db.delete(db_bld)
    db.commit()
    return StandardResponse(success=True, message="Building deleted")

# Problems
@router.post("/create", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    title: str = Form(...),
    description: str = Form(...),
    category_id: int = Form(...),
    building_id: Optional[int] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    visibility: str = Form("public"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    check_category_exists(db, category_id)
    if building_id:
        check_building_exists(db, building_id)
        
    image_url = None
    if image and image.filename:
        upload_dir = config.IMAGE_UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = os.path.splitext(image.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/uploads/images/{unique_filename}"
        
    db_problem = Problem(
        user_id=user_id,
        category_id=category_id,
        building_id=building_id,
        title=title,
        description=description,
        latitude=latitude,
        longitude=longitude,
        visibility=visibility,
        image_url=image_url,
        status="OPEN",
        created_at=datetime.utcnow()
    )
    
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    
    return StandardResponse(
        success=True,
        message="Problem reported successfully",
        data={"problem": serialize_problem(db_problem, current_user_id=user_id)}
    )

@router.get("/list", response_model=StandardResponse)
async def list_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    visibility: Optional[str] = Query("public"),
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(get_current_user_optional)
):
    query = (
        db.query(Problem)
        .options(joinedload(Problem.author), joinedload(Problem.category), joinedload(Problem.building), joinedload(Problem.upvotes))
        .filter(Problem.status != "CLOSED")
    )
    
    # RBAC logic for visibility
    if current_user_id:
        user = db.query(User).filter(User.id == current_user_id).first()
        if user and user.role_id in [2, 4]:
            if visibility == "internal":
                query = query.filter(Problem.visibility == "internal")
            else:
                query = query.filter(Problem.visibility == "public")
        else:
            query = query.filter(Problem.visibility == "public")
    else:
        query = query.filter(Problem.visibility == "public")
        
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
            "items": [serialize_problem(p, current_user_id) for p in problems]
        }
    )

@router.get("/my-problems", response_model=StandardResponse)
async def get_my_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user)
):
    query = (
        db.query(Problem)
        .options(joinedload(Problem.author), joinedload(Problem.category), joinedload(Problem.building), joinedload(Problem.upvotes))
        .filter(Problem.user_id == current_user_id)
    )
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
            "items": [serialize_problem(p, current_user_id) for p in problems]
        }
    )

@router.get("/analytics", response_model=StandardResponse)
async def get_analytics(db: Session = Depends(get_db)):
    from sqlalchemy import func
    
    total = db.query(func.count(Problem.id)).scalar() or 0

    status_counts = {}
    for s in ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]:
        count = db.query(func.count(Problem.id)).filter(Problem.status == s).scalar() or 0
        status_counts[s] = count

    cat_rows = (
        db.query(Category.name, func.count(Problem.id).label("count"))
        .join(Problem, Problem.category_id == Category.id)
        .group_by(Category.id, Category.name)
        .order_by(func.count(Problem.id).desc())
        .all()
    )
    by_category = [{"category_name": row[0], "count": row[1]} for row in cat_rows]

    role_rows = (
        db.query(User.role_id, func.count(Problem.id).label("count"))
        .join(Problem, Problem.user_id == User.id)
        .group_by(User.role_id)
        .all()
    )
    by_role = {row[0]: row[1] for row in role_rows}

    geo_problems = (
        db.query(Problem.id, Problem.latitude, Problem.longitude, Problem.status)
        .filter(Problem.latitude.isnot(None), Problem.longitude.isnot(None))
        .all()
    )
    geo_points = [{"id": r[0], "latitude": r[1], "longitude": r[2], "status": r[3]} for r in geo_problems]

    return StandardResponse(
        success=True,
        message="Analytics retrieved successfully",
        data={
            "total": total,
            "by_status": status_counts,
            "by_category": by_category,
            "by_role": by_role,
            "geo_points": geo_points,
        }
    )

@router.get("/analytics/time-series", response_model=StandardResponse)
async def get_time_series(db: Session = Depends(get_db)):
    """Returns problem counts grouped by day (last 30 days) and by category per day."""
    from sqlalchemy import func, cast, Date

    since = datetime.utcnow() - timedelta(days=29)

    # Daily totals
    daily_rows = (
        db.query(
            cast(Problem.created_at, Date).label("day"),
            func.count(Problem.id).label("count")
        )
        .filter(Problem.created_at >= since)
        .group_by(cast(Problem.created_at, Date))
        .order_by(cast(Problem.created_at, Date))
        .all()
    )

    # Per-category per-day counts (top 5 categories by volume)
    top_cats = (
        db.query(Category.name)
        .join(Problem, Problem.category_id == Category.id)
        .filter(Problem.created_at >= since)
        .group_by(Category.id, Category.name)
        .order_by(func.count(Problem.id).desc())
        .limit(5)
        .all()
    )
    top_cat_names = [r[0] for r in top_cats]

    cat_daily_rows = (
        db.query(
            cast(Problem.created_at, Date).label("day"),
            Category.name.label("category"),
            func.count(Problem.id).label("count")
        )
        .join(Category, Problem.category_id == Category.id)
        .filter(Problem.created_at >= since, Category.name.in_(top_cat_names))
        .group_by(cast(Problem.created_at, Date), Category.name)
        .order_by(cast(Problem.created_at, Date))
        .all()
    )

    # Build a date-keyed dict for easy frontend consumption
    series_map = {}
    for row in daily_rows:
        key = str(row.day)
        series_map[key] = {"date": key, "total": row.count}

    for row in cat_daily_rows:
        key = str(row.day)
        if key not in series_map:
            series_map[key] = {"date": key, "total": 0}
        series_map[key][row.category] = row.count

    series = sorted(series_map.values(), key=lambda x: x["date"])

    return StandardResponse(
        success=True,
        message="Time series retrieved",
        data={"series": series, "categories": top_cat_names}
    )


@router.get("/analytics/user-reputation", response_model=StandardResponse)
async def get_user_reputation(db: Session = Depends(get_db)):
    """Returns per-user posting stats: total posts, total upvotes received, and ratio."""
    from sqlalchemy import func

    rows = (
        db.query(
            User.id.label("user_id"),
            User.display_name.label("display_name"),
            User.role_id.label("role_id"),
            func.count(Problem.id).label("total_posts"),
            func.coalesce(func.sum(func.coalesce(
                db.query(func.count(Upvote.id))
                  .filter(Upvote.problem_id == Problem.id)
                  .correlate(Problem)
                  .scalar_subquery(),
                0
            )), 0).label("total_upvotes")
        )
        .join(Problem, Problem.user_id == User.id)
        .group_by(User.id, User.display_name, User.role_id)
        .order_by(func.count(Problem.id).desc())
        .limit(50)
        .all()
    )

    result = []
    for r in rows:
        total_posts   = r.total_posts   or 0
        total_upvotes = int(r.total_upvotes or 0)
        ratio = round(total_upvotes / total_posts, 2) if total_posts > 0 else 0.0

        if ratio >= 3.0:   reputation = "Trusted"
        elif ratio >= 1.0: reputation = "Active"
        elif ratio >= 0.3: reputation = "Regular"
        else:              reputation = "New"

        result.append({
            "user_id":      r.user_id,
            "display_name": r.display_name,
            "role_id":      r.role_id,
            "total_posts":  total_posts,
            "total_upvotes": total_upvotes,
            "upvote_ratio": ratio,
            "reputation":   reputation,
        })

    return StandardResponse(
        success=True,
        message="User reputation retrieved",
        data={"items": result}
    )


@router.get("/analytics/report", response_model=StandardResponse)
async def get_report(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date:   str = Query(..., description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """Generate a summarized analytics report for the given date range."""
    from sqlalchemy import func

    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d")
        dt_end   = datetime.strptime(end_date,   "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if dt_start > dt_end:
        raise HTTPException(status_code=400, detail="start_date must be before end_date.")

    base_q = db.query(Problem).filter(
        Problem.created_at >= dt_start,
        Problem.created_at <= dt_end
    )

    total = base_q.count()

    # Status breakdown
    status_counts = {}
    for s in ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]:
        status_counts[s] = base_q.filter(Problem.status == s).count()

    # By category
    cat_rows = (
        db.query(Category.name, func.count(Problem.id).label("count"))
        .join(Problem, Problem.category_id == Category.id)
        .filter(Problem.created_at >= dt_start, Problem.created_at <= dt_end)
        .group_by(Category.id, Category.name)
        .order_by(func.count(Problem.id).desc())
        .all()
    )
    by_category = [{"name": r[0], "count": r[1]} for r in cat_rows]

    # By role
    role_map = {1: "Student", 2: "Staff", 3: "Public", 4: "Admin"}
    role_rows = (
        db.query(User.role_id, func.count(Problem.id).label("count"))
        .join(Problem, Problem.user_id == User.id)
        .filter(Problem.created_at >= dt_start, Problem.created_at <= dt_end)
        .group_by(User.role_id)
        .all()
    )
    by_role = [{"name": role_map.get(r[0], f"Role {r[0]}"), "count": r[1]} for r in role_rows]

    # Detailed rows for CSV export — explicit outerjoin on Building ensures location is always populated
    problems = (
        base_q
        .options(
            joinedload(Problem.author),
            joinedload(Problem.category),
            joinedload(Problem.building),
        )
        .order_by(Problem.created_at.desc())
        .all()
    )
    rows = []
    for p in problems:
        author_role = role_map.get(p.author.role_id, f"Role {p.author.role_id}") if p.author else ""
        rows.append({
            "id":          p.id,
            "title":       p.title,
            "status":      p.status,
            "visibility":  p.visibility,
            "category":    p.category.name if p.category else "",
            "author":      p.author.display_name if p.author else "",
            "role":        author_role,
            "location":    p.building.name if p.building else "",   # renamed from 'building'
            "latitude":    p.latitude,
            "longitude":   p.longitude,
            "created_at":  p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else "",
        })

    resolved   = status_counts.get("CLOSED", 0) + status_counts.get("RESOLVED", 0)
    unresolved = total - resolved
    resolution_rate = round((resolved / total) * 100, 1) if total > 0 else 0.0

    return StandardResponse(
        success=True,
        message=f"Report generated: {total} problems from {start_date} to {end_date}",
        data={
            "summary": {
                "total":           total,
                "resolved":        resolved,
                "unresolved":      unresolved,
                "resolution_rate": resolution_rate,
                "by_status":       status_counts,
            },
            "by_category": by_category,
            "by_role":     by_role,
            "rows":        rows,
            "date_range":  {"start": start_date, "end": end_date},
        }
    )


@router.patch("/bulk-update", response_model=StandardResponse)
async def bulk_update_status(
    payload: BulkStatusUpdate,
    db: Session = Depends(get_db)
):
    updated = db.query(Problem).filter(Problem.id.in_(payload.problem_ids)).all()
    if not updated:
        raise HTTPException(status_code=404, detail="Posts not found")

    for p in updated:
        p.status = payload.new_status
    db.commit()
    
    return StandardResponse(
        success=True,
        message=f"Updated {len(updated)} posts to {payload.new_status}",
        data={"updated_count": len(updated), "new_status": payload.new_status}
    )

@router.get("/{problem_id}", response_model=StandardResponse)
async def get_problem_detail(
    problem_id: int, 
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(get_current_user_optional)
):
    problem = (
        db.query(Problem)
        .options(joinedload(Problem.author), joinedload(Problem.category), joinedload(Problem.building), joinedload(Problem.upvotes))
        .filter(Problem.id == problem_id).first()
    )
    if not problem: raise HTTPException(status_code=404, detail="Problem not found")
    return StandardResponse(success=True, message="Success", data={"problem": serialize_problem(problem, current_user_id)})

@router.patch("/{problem_id}/status", response_model=StandardResponse)
async def update_problem_status(
    problem_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    problem.status = new_status
    db.commit()
    db.refresh(problem)

    return StandardResponse(
        success=True,
        message=f"Status updated to {new_status}",
        data={"problem_id": problem_id, "new_status": new_status}
    )

@router.post("/{problem_id}/comments", response_model=StandardResponse, status_code=201)
async def add_comment(
    problem_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    new_comment = Comment(
        problem_id=problem_id,
        user_id=user_id,
        content=body.content,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return StandardResponse(
        success=True,
        message="Comment added successfully",
        data={"comment": CommentResponse.model_validate(new_comment).model_dump()}
    )

@router.post("/{problem_id}/upvote", response_model=StandardResponse)
async def toggle_upvote(
    problem_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    existing_upvote = db.query(Upvote).filter(Upvote.problem_id == problem_id, Upvote.user_id == user_id).first()
    
    if existing_upvote:
        db.delete(existing_upvote)
        db.commit()
        message = "Upvote removed"
        is_upvoted = False
    else:
        new_upvote = Upvote(problem_id=problem_id, user_id=user_id)
        db.add(new_upvote)
        db.commit()
        message = "Upvote added"
        is_upvoted = True
        
    upvote_count = db.query(Upvote).filter(Upvote.problem_id == problem_id).count()
        
    return StandardResponse(
        success=True,
        message=message,
        data={
            "problem_id": problem_id,
            "upvote_count": upvote_count,
            "is_upvoted_by_me": is_upvoted
        }
    )

@router.delete("/{problem_id}", response_model=StandardResponse)
async def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    db.delete(problem)
    db.commit()
    return StandardResponse(success=True, message="Problem deleted successfully")