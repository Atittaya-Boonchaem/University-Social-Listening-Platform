# app/routers/buildings.py
"""
Buildings router — CRUD for campus buildings and their center coordinates.
These coordinates are used as the default map center when a user selects a
building without providing their own GPS location.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Building, AuditLog
from app.schemas import BuildingCreate, BuildingUpdate, BuildingResponse, StandardResponse
from app.routers.auth import get_current_user
from app.routers.problems import require_admin_or_staff

router = APIRouter()


# ── List all active buildings ─────────────────────────────────
@router.get("/", response_model=StandardResponse)
def list_buildings(db: Session = Depends(get_db)):
    buildings = (
        db.query(Building)
        .filter(Building.is_active == True)
        .order_by(Building.name)
        .all()
    )
    return StandardResponse(
        success=True,
        message="Success",
        data={"items": [BuildingResponse.model_validate(b).model_dump() for b in buildings]},
    )


# ── Create a new building ─────────────────────────────────────
@router.post("/", response_model=StandardResponse, status_code=201)
def create_building(
    body: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    if db.query(Building).filter(Building.name == body.name).first():
        raise HTTPException(400, "A building with that name already exists.")
    new_bld = Building(**body.model_dump())
    db.add(new_bld)
    db.commit()
    db.refresh(new_bld)
    return StandardResponse(
        success=True,
        message="Building created",
        data={"item": BuildingResponse.model_validate(new_bld).model_dump()},
    )


# ── Update a building ─────────────────────────────────────────
@router.put("/{building_id}", response_model=StandardResponse)
def update_building(
    building_id: int,
    body: BuildingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    bld = db.query(Building).filter(Building.building_id == building_id).first()
    if not bld:
        raise HTTPException(404, "Building not found.")
    old_value = {
        "name": bld.name,
        "latitude": float(bld.latitude) if bld.latitude is not None else None,
        "longitude": float(bld.longitude) if bld.longitude is not None else None,
        "is_active": bld.is_active
    }
    
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(bld, field, value)
    db.commit()
    db.refresh(bld)
    
    new_value = {
        "name": bld.name,
        "latitude": float(bld.latitude) if bld.latitude is not None else None,
        "longitude": float(bld.longitude) if bld.longitude is not None else None,
        "is_active": bld.is_active
    }
    
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="UPDATE",
        table_name="buildings",
        record_id=bld.building_id,
        old_value=old_value,
        new_value=new_value
    )
    db.add(audit)
    db.commit()
    return StandardResponse(
        success=True,
        message="Building updated",
        data={"item": BuildingResponse.model_validate(bld).model_dump()},
    )


# ── Delete a building ─────────────────────────────────────────
@router.delete("/{building_id}", response_model=StandardResponse)
def delete_building(
    building_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_or_staff(current_user, db)
    bld = db.query(Building).filter(Building.building_id == building_id).first()
    if not bld:
        raise HTTPException(404, "Building not found.")
    db.delete(bld)
    db.commit()
    return StandardResponse(success=True, message="Building deleted")
