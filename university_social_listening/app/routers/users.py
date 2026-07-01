from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging
from jose import jwt, JWTError

from app.main import get_db, config
from app.models import User
from app.schemas import StandardResponse
from fastapi.security import OAuth2PasswordBearer

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Users"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_admin(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role_id not in [2, 4]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can perform this action")
    return user

@router.get("/list", response_model=StandardResponse)
def list_users(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    require_admin(current_user_id, db)
    users = db.query(User).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name,
            "student_id": u.student_id,
            "role_id": u.role_id,
            "is_active": u.is_active,
        })
    return StandardResponse(success=True, message=f"Retrieved {len(result)} users", data={"items": result})

@router.patch("/{user_id}/role", response_model=StandardResponse)
def update_user_role(
    user_id: int,
    new_role_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    current_user = require_admin(current_user_id, db)

    try:
        new_role_id = int(new_role_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role_id")

    valid_role_ids = [1, 2, 3, 4]
    if new_role_id not in valid_role_ids:
        raise HTTPException(status_code=400, detail=f"Invalid role_id, must be in {valid_role_ids}")

    if new_role_id == 4 and current_user.role_id != 4:
        raise HTTPException(status_code=403, detail="Only Super Admins can promote other users to Super Admin")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target.id == current_user_id and target.role_id == new_role_id:
        raise HTTPException(status_code=400, detail="Role already set")
    elif target.id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    old_role_id = target.role_id
    target.role_id = new_role_id
    db.commit()

    return StandardResponse(
        success=True,
        message=f"User #{user_id} role changed to {new_role_id}",
        data={"user_id": user_id, "old_role_id": old_role_id, "new_role_id": new_role_id}
    )

@router.patch("/{user_id}/ban", response_model=StandardResponse)
def toggle_ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    require_admin(current_user_id, db)

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")

    target.is_active = not target.is_active
    db.commit()

    action = "banned" if not target.is_active else "unbanned"
    return StandardResponse(
        success=True,
        message=f"User #{user_id} has been {action}",
        data={"user_id": user_id, "is_active": target.is_active, "action": action}
    )
