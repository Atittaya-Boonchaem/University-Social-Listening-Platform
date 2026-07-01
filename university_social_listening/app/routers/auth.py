from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
from typing import Optional
import bcrypt

from app.main import get_db, config
from app.models import User
from app.schemas import (
    StudentUserCreate, StaffUserCreate, PublicUserCreate, 
    UserLogin, StandardResponse, UserResponse, OnboardingUpdate
)

router = APIRouter(tags=["Authentication"])

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)

@router.post("/register/student", response_model=StandardResponse, status_code=201)
def register_student(user_data: StudentUserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว (Email already used)")
        
    display_name = user_data.display_name or f"Student {user_data.student_id}"

    new_user = User(
        role_id=1,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        student_id=user_data.student_id,
        display_name=display_name,
        faculty=user_data.faculty,
        education_level=user_data.education_level,
        age=user_data.age,
        gender=user_data.gender,
        phone_number=user_data.phone_number,
        relationship=user_data.relationship,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return StandardResponse(success=True, message="Success", data={"user_id": new_user.id})

@router.post("/register/staff", response_model=StandardResponse, status_code=201)
def register_staff(user_data: StaffUserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว (Email already used)")

    new_user = User(
        role_id=2,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        display_name=user_data.display_name or "Staff",
        faculty=user_data.faculty,
        education_level=user_data.education_level,
        age=user_data.age,
        gender=user_data.gender,
        phone_number=user_data.phone_number,
        relationship=user_data.relationship,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return StandardResponse(success=True, message="Success", data={"user_id": new_user.id})

@router.post("/register/public", response_model=StandardResponse, status_code=201)
def register_public(user_data: PublicUserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone_number == user_data.phone_number).first():
        raise HTTPException(status_code=400, detail="เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว (Phone number already used)")

    new_user = User(
        role_id=3,
        phone_number=user_data.phone_number,
        password_hash=get_password_hash(user_data.password),
        display_name=user_data.display_name or "Public",
        faculty=user_data.faculty,
        education_level=user_data.education_level,
        age=user_data.age,
        gender=user_data.gender,
        relationship=user_data.relationship,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return StandardResponse(success=True, message="Success", data={"user_id": new_user.id})

@router.post("/login", response_model=StandardResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = None
    if login_data.email:
        user = db.query(User).filter(User.email == login_data.email).first()
    elif login_data.phone_number:
        user = db.query(User).filter(User.phone_number == login_data.phone_number).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="อีเมล/เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง (Invalid credentials)")
        
    if login_data.expected_role_id is not None:
        if int(user.role_id) == 4:
            pass
        elif int(user.role_id) != int(login_data.expected_role_id):
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงในบทบาทนี้ (Invalid role access)")
            
    if not user.is_active:
        raise HTTPException(status_code=400, detail="บัญชีถูกระงับการใช้งาน (Account is banned)")

    access_token = create_access_token(data={"user_id": user.id, "role_id": user.role_id})
    user_info = UserResponse.model_validate(user)

    return StandardResponse(
        success=True,
        message="Login successful",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_info.model_dump()
        }
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

@router.patch("/onboarding", response_model=StandardResponse)
def complete_onboarding(
    data: OnboardingUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if data.display_name:
        current_user.display_name = data.display_name

    db.commit()
    db.refresh(current_user)
    
    return StandardResponse(
        success=True,
        message="Onboarding complete",
        data={"display_name": current_user.display_name}
    )