# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging
from jose import jwt, JWTError

from app.main import get_db, config
from app.models import User, Role
from app.schemas import StandardResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Users"])

# ── JWT Auth ──────────────────────────────────────────────────────────────────
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
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

def require_admin(user_id: int, db: Session) -> User:
    """Ensure caller is Staff (role_id=2) or Admin (role_id=4)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can perform this action")
    return user

# ── GET /list — All Users ─────────────────────────────────────────────────────
@router.get("/list", response_model=StandardResponse)
def list_users(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> StandardResponse:
    """📋 Super Admin: ดึงรายชื่อผู้ใช้ทั้งหมด"""
    require_admin(current_user_id, db)
    users = db.query(User).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "phone_number": u.phone_number,
            "display_name": u.display_name,
            "role_id": u.role_id,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "faculty": u.faculty,
            "age": u.age,
            "gender": u.gender,
            "relationship_to_university": u.relationship_to_university,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return StandardResponse(success=True, message=f"Retrieved {len(result)} users", data={"items": result})


# ── PATCH /{id}/role — Change Role ───────────────────────────────────────────
@router.patch("/{user_id}/role", response_model=StandardResponse)
def update_user_role(
    user_id: int,
    new_role_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> StandardResponse:
    """🔧 Admin: เปลี่ยน Role ของผู้ใช้"""
    require_admin(current_user_id, db)

    valid_role_ids = [1, 2, 3, 4]
    if new_role_id not in valid_role_ids:
        raise HTTPException(status_code=400, detail=f"Invalid role_id. Must be one of {valid_role_ids}")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    old_role_id = target.role_id
    target.role_id = new_role_id
    target.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"✅ User #{user_id} role changed: {old_role_id} → {new_role_id} by admin #{current_user_id}")
    return StandardResponse(
        success=True,
        message=f"User #{user_id} role updated to {new_role_id}",
        data={"user_id": user_id, "old_role_id": old_role_id, "new_role_id": new_role_id}
    )


# ── PATCH /{id}/ban — Toggle Ban ─────────────────────────────────────────────
@router.patch("/{user_id}/ban", response_model=StandardResponse)
def toggle_ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> StandardResponse:
    """🚫 Admin: แบน / ปลดแบน ผู้ใช้ (toggle is_active)"""
    require_admin(current_user_id, db)

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")

    target.is_active = not target.is_active
    target.updated_at = datetime.utcnow()
    db.commit()

    action = "banned" if not target.is_active else "unbanned"
    logger.info(f"✅ User #{user_id} {action} by admin #{current_user_id}")
    return StandardResponse(
        success=True,
        message=f"User #{user_id} has been {action}",
        data={"user_id": user_id, "is_active": target.is_active, "action": action}
    )
