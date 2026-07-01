from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
from typing import Optional
import bcrypt
from app.main import get_db, config
from app.models import User, Role, GenderEnum
from app.schemas import (
    StudentUserCreate, StaffUserCreate, PublicUserCreate, 
    UserLogin, StandardResponse, UserResponse, OnboardingUpdate
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
        
    prefix = user_data.student_id[:2] if len(user_data.student_id) >= 2 else "xx"
    display_name = f"นิสิต มพ. {prefix}"

    new_user = User(
        role_id=1, # Role 1 = Student ตามตาราง roles
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        student_id=user_data.student_id,
        student_id_prefix=prefix,
        faculty=user_data.faculty,
        education_level=user_data.education_level,
        age=user_data.age,
        gender=user_data.gender,
        display_name=display_name,
        onboarding_complete=True,
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
        faculty=user_data.faculty,
        age=user_data.age,
        gender=user_data.gender,
        display_name="บุคลากร มพ.",
        onboarding_complete=True,
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
        display_name="บุคคลทั่วไป",
        onboarding_complete=True,
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
        raise HTTPException(status_code=400, detail="ไม่พบบัญชีนี้ หรือ รหัสผ่านไม่ถูกต้อง")
        
    if login_data.expected_role_id is not None:
        # EXPLICITLY ALLOW Super Admins (role_id == 4) to log in successfully
        if int(user.role_id) == 4:
            pass
        elif int(user.role_id) != int(login_data.expected_role_id):
            raise HTTPException(status_code=403, detail="บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานในบทบาทนี้")
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


# ========================================
# 🎚️ 5. Onboarding — อัพเดตข้อมูลหลัง Login ครั้งแรก
# ========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ไม่ถูกต้อง")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token หมดอายุ")

@router.patch("/onboarding", response_model=StandardResponse)
def complete_onboarding(
    data: OnboardingUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """🎟️ อัพเดตข้อมูลเพิ่มเติมหลัง login ครั้งแรก"""
    if data.student_id_prefix:
        current_user.student_id_prefix = data.student_id_prefix
    if data.faculty:
        current_user.faculty = data.faculty
    if data.age:
        current_user.age = data.age
    if data.gender:
        try:
            current_user.gender = GenderEnum(data.gender)
        except ValueError:
            pass  # เพิกเฉยถ้าค่าไม่ถูก

    if current_user.role_id == 1:
        prefix = current_user.student_id_prefix or "ทั่วไป"
        current_user.display_name = f"นิสิต มพ. {prefix}"
    elif current_user.role_id == 2:
        current_user.display_name = "บุคลากร มพ."
    else:
        current_user.display_name = "บุคคลทั่วไป"

    current_user.onboarding_complete = True
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return StandardResponse(
        success=True,
        message="อัพเดตข้อมูลสำเร็จ 🎉",
        data={
            "display_name": current_user.display_name,
            "onboarding_complete": True
        }
    )