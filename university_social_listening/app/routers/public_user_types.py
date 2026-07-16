from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import PublicUserType, SuperAdmin
from app.schemas import StandardResponse, PublicUserTypeCreate, PublicUserTypeResponse
from app.routers.users import get_current_user

router = APIRouter(prefix="/public-user-types", tags=["Public User Types"])

def require_super_admin(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    super_admin = db.query(SuperAdmin).filter(SuperAdmin.user_id == current_user.user_id, SuperAdmin.is_active == True).first()
    if not super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="เฉพาะ Super Admin เท่านั้นที่สามารถจัดการประเภทบุคคลทั่วไปได้"
        )
    return current_user

@router.get("", response_model=StandardResponse)
def get_active_public_user_types(db: Session = Depends(get_db)):
    """
    ดึงรายการประเภทบุคคลทั่วไปทั้งหมดที่ใช้งานอยู่ (สำหรับหน้าสมัครสมาชิก)
    """
    types = db.query(PublicUserType).filter(PublicUserType.is_active == True).all()
    return StandardResponse(
        success=True,
        message="ดึงข้อมูลสำเร็จ",
        data=[PublicUserTypeResponse.model_validate(t).model_dump() for t in types]
    )

@router.post("", response_model=StandardResponse, status_code=201)
def create_public_user_type(data: PublicUserTypeCreate, db: Session = Depends(get_db), current_user = Depends(require_super_admin)):
    """
    สร้างประเภทบุคคลทั่วไปใหม่ (Super Admin เท่านั้น)
    """
    existing = db.query(PublicUserType).filter(PublicUserType.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="ประเภทบุคคลทั่วไปนี้มีอยู่แล้ว")
    
    new_type = PublicUserType(name=data.name, is_active=data.is_active)
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    
    return StandardResponse(
        success=True,
        message="สร้างประเภทบุคคลทั่วไปสำเร็จ",
        data=PublicUserTypeResponse.model_validate(new_type).model_dump()
    )

@router.put("/{type_id}", response_model=StandardResponse)
def update_public_user_type(type_id: int, data: PublicUserTypeCreate, db: Session = Depends(get_db), current_user = Depends(require_super_admin)):
    """
    อัปเดตประเภทบุคคลทั่วไป (Super Admin เท่านั้น)
    """
    type_obj = db.query(PublicUserType).filter(PublicUserType.id == type_id).first()
    if not type_obj:
        raise HTTPException(status_code=404, detail="ไม่พบประเภทบุคคลทั่วไป")
    
    existing = db.query(PublicUserType).filter(PublicUserType.name == data.name, PublicUserType.id != type_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="ประเภทบุคคลทั่วไปนี้มีอยู่แล้ว")
        
    type_obj.name = data.name
    type_obj.is_active = data.is_active
    db.commit()
    db.refresh(type_obj)
    
    return StandardResponse(
        success=True,
        message="อัปเดตประเภทบุคคลทั่วไปสำเร็จ",
        data=PublicUserTypeResponse.model_validate(type_obj).model_dump()
    )

@router.delete("/{type_id}", response_model=StandardResponse)
def delete_public_user_type(type_id: int, db: Session = Depends(get_db), current_user = Depends(require_super_admin)):
    """
    ลบประเภทบุคคลทั่วไป (Soft delete) (Super Admin เท่านั้น)
    """
    type_obj = db.query(PublicUserType).filter(PublicUserType.id == type_id).first()
    if not type_obj:
        raise HTTPException(status_code=404, detail="ไม่พบประเภทบุคคลทั่วไป")
        
    type_obj.is_active = False
    db.commit()
    
    return StandardResponse(
        success=True,
        message="ปิดการใช้งานประเภทบุคคลทั่วไปสำเร็จ"
    )
