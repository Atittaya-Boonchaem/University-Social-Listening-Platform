from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
import bcrypt
from app.main import get_db, config
from app.models import User, Role
from app.schemas import (
    StudentUserCreate, StaffUserCreate, PublicUserCreate, 
    UserLogin, StandardResponse, UserResponse
)

router = APIRouter(tags=["Authentication (ระบบยืนยันตัวตน)"])

# ========================================
# Helper Functions สำหรับจัดการความปลอดภัย
# ========================================
def get_password_hash(password: str) -> str:
    # เข้ารหัสผ่านด้วย bcrypt โดยตรง (แก้ปัญหา passlib บั๊ก)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # ตรวจสอบความถูกต้องของรหัสผ่าน
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)


# 🎓 1. ลงทะเบียนสำหรับ "นิสิต มพ."
@router.post("/register/student", response_model=StandardResponse, status_code=201)
def register_student(user_data: StudentUserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")
    if db.query(User).filter(User.student_id == user_data.student_id).first():
        raise HTTPException(status_code=400, detail="รหัสนิสิตนี้ถูกใช้งานแล้ว")
        
    new_user = User(
        role_id=1, # Role 1 = Student ตามตาราง roles
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        student_id=user_data.student_id,
        faculty=user_data.faculty,
        education_level=user_data.education_level,
        age=user_data.age,
        gender=user_data.gender,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return StandardResponse(success=True, message="ลงทะเบียนนิสิตสำเร็จ 🎉", data={"user_id": new_user.id})


# 💼 2. ลงทะเบียนสำหรับ "บุคลากร มพ."
@router.post("/register/staff", response_model=StandardResponse, status_code=201)
def register_staff(user_data: StaffUserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")
    if db.query(User).filter(User.staff_account == user_data.staff_account).first():
        raise HTTPException(status_code=400, detail="บัญชีบุคลากรนี้ถูกใช้งานแล้ว")

    new_user = User(
        role_id=2, # Role 2 = Staff
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        staff_account=user_data.staff_account,
        age=user_data.age,
        gender=user_data.gender,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return StandardResponse(success=True, message="ลงทะเบียนบุคลากรสำเร็จ 🎉", data={"user_id": new_user.id})


# 🌍 3. ลงทะเบียนสำหรับ "บุคคลทั่วไป"
@router.post("/register/public", response_model=StandardResponse, status_code=201)
def register_public(user_data: PublicUserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone_number == user_data.phone_number).first():
        raise HTTPException(status_code=400, detail="เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว")

    new_user = User(
        role_id=3, # Role 3 = Public
        phone_number=user_data.phone_number,
        password_hash=get_password_hash(user_data.password),
        relationship_to_university=user_data.relationship_to_university,
        age=user_data.age,
        gender=user_data.gender,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return StandardResponse(success=True, message="ลงทะเบียนบุคคลทั่วไปสำเร็จ 🎉", data={"user_id": new_user.id})


# 🔑 4. API เข้าสู่ระบบ (Login) รองรับทั้ง Email และ เบอร์โทรศัพท์
@router.post("/login", response_model=StandardResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = None
    # ตรวจสอบว่าล็อกอินด้วยอีเมลหรือเบอร์โทรศัพท์
    if login_data.email:
        user = db.query(User).filter(User.email == login_data.email).first()
    elif login_data.phone_number:
        user = db.query(User).filter(User.phone_number == login_data.phone_number).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง")
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="บัญชีนี้ถูกระงับการใช้งาน")

    # สร้าง JWT Token ส่งกลับไปให้แอปเก็บไว้ในเครื่อง
    access_token = create_access_token(data={"user_id": user.id, "role_id": user.role_id})
    user_info = UserResponse.from_orm(user)

    return StandardResponse(
        success=True,
        message="เข้าสู่ระบบสำเร็จ",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_info.dict()
        }
    )