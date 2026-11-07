# app/routers/policies.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.database import get_db
from app.models import SystemPolicy, User, SuperAdmin, AuditLog
from app.schemas import StandardResponse, PolicyCreate, PolicyUpdate, PolicyResponse
from app.routers.auth import get_current_user
from app.tags import TAG_SUPER_ADMIN

logger = logging.getLogger(__name__)
router = APIRouter()


def require_super_admin(current_user: User, db: Session) -> None:
    sa = db.query(SuperAdmin).filter(
        SuperAdmin.user_id == current_user.user_id, SuperAdmin.is_active == True
    ).first()
    if not sa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can manage system policies"
        )


# ──────────────────────────────────────────────
# Public: Get Active Policies
# ──────────────────────────────────────────────
@router.get("", response_model=StandardResponse)
def get_active_policies(
    policy_type: Optional[str] = None,
    target_role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get active policies for public/client consumption (e.g. registration, onboarding, issue report).
    """
    query = db.query(SystemPolicy).filter(SystemPolicy.is_active == True)
    if policy_type:
        query = query.filter(SystemPolicy.policy_type == policy_type)
    if target_role and target_role != "all":
        query = query.filter(SystemPolicy.target_role.in_(["all", target_role]))
    
    policies = query.order_by(SystemPolicy.policy_id.asc()).all()
    items = [PolicyResponse.model_validate(p) for p in policies]
    
    return StandardResponse(
        success=True,
        message="Active policies retrieved successfully",
        data={"items": items, "total": len(items)}
    )


# ──────────────────────────────────────────────
# Super Admin: Get All Policies (including inactive)
# ──────────────────────────────────────────────
@router.get("/all", response_model=StandardResponse, tags=[TAG_SUPER_ADMIN])
def get_all_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user, db)
    policies = db.query(SystemPolicy).order_by(SystemPolicy.policy_id.desc()).all()
    items = [PolicyResponse.model_validate(p) for p in policies]
    
    return StandardResponse(
        success=True,
        message="All policies retrieved",
        data={"items": items, "total": len(items)}
    )


# ──────────────────────────────────────────────
# Super Admin: Get Policy by ID
# ──────────────────────────────────────────────
@router.get("/{policy_id}", response_model=StandardResponse, tags=[TAG_SUPER_ADMIN])
def get_policy_detail(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user, db)
    policy = db.query(SystemPolicy).filter(SystemPolicy.policy_id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    return StandardResponse(
        success=True,
        message="Policy detail retrieved",
        data=PolicyResponse.model_validate(policy)
    )


# ──────────────────────────────────────────────
# Super Admin: Create Policy
# ──────────────────────────────────────────────
@router.post("", response_model=StandardResponse, tags=[TAG_SUPER_ADMIN])
def create_policy(
    payload: PolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user, db)
    
    new_policy = SystemPolicy(
        title=payload.title.strip(),
        policy_type=payload.policy_type.strip().lower(),
        version=payload.version.strip(),
        content=payload.content.strip(),
        summary=payload.summary.strip() if payload.summary else None,
        is_mandatory=payload.is_mandatory,
        is_active=payload.is_active,
        target_role=payload.target_role.strip().lower(),
        created_by=current_user.user_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_policy)
    db.flush()
    
    # Audit log
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="CREATE_POLICY",
        table_name="system_policies",
        record_id=new_policy.policy_id,
        new_value={
            "title": new_policy.title,
            "policy_type": new_policy.policy_type,
            "version": new_policy.version,
            "is_active": new_policy.is_active,
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(new_policy)
    
    return StandardResponse(
        success=True,
        message=f"สร้างนโยบาย '{new_policy.title}' สำเร็จแล้ว",
        data=PolicyResponse.model_validate(new_policy)
    )


# ──────────────────────────────────────────────
# Super Admin: Update Policy
# ──────────────────────────────────────────────
@router.put("/{policy_id}", response_model=StandardResponse, tags=[TAG_SUPER_ADMIN])
def update_policy(
    policy_id: int,
    payload: PolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user, db)
    policy = db.query(SystemPolicy).filter(SystemPolicy.policy_id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    old_val = {
        "title": policy.title,
        "policy_type": policy.policy_type,
        "version": policy.version,
        "is_active": policy.is_active,
        "is_mandatory": policy.is_mandatory
    }
    
    if payload.title is not None:
        policy.title = payload.title.strip()
    if payload.policy_type is not None:
        policy.policy_type = payload.policy_type.strip().lower()
    if payload.version is not None:
        policy.version = payload.version.strip()
    if payload.content is not None:
        policy.content = payload.content.strip()
    if payload.summary is not None:
        policy.summary = payload.summary.strip()
    if payload.is_mandatory is not None:
        policy.is_mandatory = payload.is_mandatory
    if payload.is_active is not None:
        policy.is_active = payload.is_active
    if payload.target_role is not None:
        policy.target_role = payload.target_role.strip().lower()
        
    policy.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="UPDATE_POLICY",
        table_name="system_policies",
        record_id=policy.policy_id,
        old_value=old_val,
        new_value={
            "title": policy.title,
            "policy_type": policy.policy_type,
            "version": policy.version,
            "is_active": policy.is_active,
            "is_mandatory": policy.is_mandatory
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(policy)
    
    return StandardResponse(
        success=True,
        message=f"อัปเดตนโยบาย '{policy.title}' เรียบร้อยแล้ว",
        data=PolicyResponse.model_validate(policy)
    )


# ──────────────────────────────────────────────
# Super Admin: Toggle Active Status
# ──────────────────────────────────────────────
@router.patch("/{policy_id}/toggle-active", response_model=StandardResponse, tags=[TAG_SUPER_ADMIN])
def toggle_policy_active(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user, db)
    policy = db.query(SystemPolicy).filter(SystemPolicy.policy_id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    policy.is_active = not policy.is_active
    policy.updated_at = datetime.utcnow()
    
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="TOGGLE_POLICY_ACTIVE",
        table_name="system_policies",
        record_id=policy.policy_id,
        new_value={"is_active": policy.is_active}
    )
    db.add(audit)
    db.commit()
    db.refresh(policy)
    
    status_str = "เปิดใช้งาน" if policy.is_active else "ปิดการใช้งาน"
    return StandardResponse(
        success=True,
        message=f"{status_str} นโยบาย '{policy.title}' เรียบร้อยแล้ว",
        data={"policy_id": policy.policy_id, "is_active": policy.is_active}
    )


# ──────────────────────────────────────────────
# Super Admin: Delete Policy
# ──────────────────────────────────────────────
@router.delete("/{policy_id}", response_model=StandardResponse, tags=[TAG_SUPER_ADMIN])
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user, db)
    policy = db.query(SystemPolicy).filter(SystemPolicy.policy_id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    title = policy.title
    db.delete(policy)
    
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="DELETE_POLICY",
        table_name="system_policies",
        record_id=policy_id,
        old_value={"title": title}
    )
    db.add(audit)
    db.commit()
    
    return StandardResponse(
        success=True,
        message=f"ลบนโยบาย '{title}' เรียบร้อยแล้ว"
    )

