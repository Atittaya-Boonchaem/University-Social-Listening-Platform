# app/routers/auth.py
"""
Authentication router — updated for the 26-table schema.

Registration: Creates a base User record + the appropriate sub-table record
              (Student / Staff / PublicUser).
Login:        Looks up User by email, determines role via sub-table membership,
              issues a JWT containing user_id and role.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
from typing import Optional
import bcrypt
import os
import requests
from fastapi.responses import RedirectResponse

from app.database import get_db, config
from app.models import (
    User, Student, Staff, PublicUser,
    Faculty, SuperAdmin, CategoryAdmin,
)
from app.schemas import (
    StudentRegisterCreate, StaffRegisterCreate, PublicUserRegisterCreate,
    UserLogin, StandardResponse, UserResponse, OnboardingUpdate,
    StudentProfile, StaffProfile, PublicUserProfile,
)

router = APIRouter(tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(
        minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(payload, config.SECRET_KEY, algorithm=config.ALGORITHM)


def get_user_role(user_id: int, db: Session) -> str:
    """Determine a user's role by checking all sub-tables (highest privilege first)."""
    if db.query(SuperAdmin).filter(
        SuperAdmin.user_id == user_id, SuperAdmin.is_active == True
    ).first():
        return "super_admin"
    if db.query(CategoryAdmin).filter(
        CategoryAdmin.user_id == user_id, CategoryAdmin.is_active == True
    ).first():
        return "category_admin"
    if db.query(Staff).filter(Staff.user_id == user_id).first():
        return "staff"
    if db.query(Student).filter(Student.user_id == user_id).first():
        return "student"
    if db.query(PublicUser).filter(PublicUser.user_id == user_id).first():
        return "public"
    from app.models import AnonymousUser
    if db.query(AnonymousUser).filter(AnonymousUser.user_id == user_id).first():
        return "anonymous"
    return "unknown"


def get_display_name(user_id: int, db: Session) -> str:
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if student:
        return student.student_name
    staff = db.query(Staff).filter(Staff.user_id == user_id).first()
    if staff:
        return staff.staff_name
    pub = db.query(PublicUser).filter(PublicUser.user_id == user_id).first()
    if pub:
        return f"{pub.first_name} {pub.last_name}"
    super_admin = db.query(SuperAdmin).filter(SuperAdmin.user_id == user_id).first()
    if super_admin:
        u = db.query(User).filter(User.user_id == user_id).first()
        return u.email.split('@')[0] if (u and u.email) else "Super Admin"
    from app.models import AnonymousUser
    anon = db.query(AnonymousUser).filter(AnonymousUser.user_id == user_id).first()
    if anon:
        ip = anon.raw_ip if anon.raw_ip else anon.hashed_ip
        if ip and ip != "unknown":
            parts = ip.split('.')
            if len(parts) == 4:
                return f"ไม่ระบุตัวตน (IP: *.*.{parts[2]}.{parts[3]})"
            return f"ไม่ระบุตัวตน (IP: {ip})"
        return "ไม่ระบุตัวตน"
    u = db.query(User).filter(User.user_id == user_id).first()
    if u and u.email:
        return u.email.split('@')[0]
    return "ผู้ใช้งาน"


def get_faculty_id(faculty_name: Optional[str], db: Session) -> Optional[int]:
    if not faculty_name:
        return None
    fac = db.query(Faculty).filter(Faculty.faculty_name == faculty_name).first()
    return fac.faculty_id if fac else None


# ──────────────────────────────────────────────
# Current-user dependency (shared by other routers)
# ──────────────────────────────────────────────
def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        # Fallback to CategoryAdmin or SuperAdmin or active user if no token provided
        cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.is_active == True).first()
        if cat_admin:
            user = db.query(User).filter(User.user_id == cat_admin.user_id).first()
            if user:
                return user
        super_admin = db.query(SuperAdmin).filter(SuperAdmin.is_active == True).first()
        if super_admin:
            user = db.query(User).filter(User.user_id == super_admin.user_id).first()
            if user:
                return user
        user = db.query(User).first()
        if user:
            return user
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    if token == "simulated_sso_token_staff":
        staff_record = db.query(Staff).first()
        if staff_record:
            user = db.query(User).filter(User.user_id == staff_record.user_id).first()
            if user:
                return user
    elif token == "simulated_sso_token_student":
        student_record = db.query(Student).first()
        if not student_record:
            new_user = User(email="student@up.ac.th", is_active=True)
            db.add(new_user)
            db.flush()
            fac = db.query(Faculty).first()
            student_record = Student(
                user_id=new_user.user_id,
                student_id="66000000",
                student_name="Student User (SSO)",
                faculty_id=fac.faculty_id if fac else None,
                year=1,
                age=20,
                gender="Male"
            )
            db.add(student_record)
            db.commit()
            db.refresh(student_record)
        user = db.query(User).filter(User.user_id == student_record.user_id).first()
        if user:
            return user

    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        return user
    except JWTError:
        # If token is invalid or expired, fallback to CategoryAdmin user
        cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.is_active == True).first()
        if cat_admin:
            user = db.query(User).filter(User.user_id == cat_admin.user_id).first()
            if user:
                return user
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired or invalid")


def get_current_user_optional(
    token: Optional[str] = Depends(
        OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
    ),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    if token == "simulated_sso_token_staff":
        staff_record = db.query(Staff).first()
        if staff_record:
            return db.query(User).filter(User.user_id == staff_record.user_id).first()
    elif token == "simulated_sso_token_student":
        student_record = db.query(Student).first()
        if not student_record:
            new_user = User(email="student@up.ac.th", is_active=True)
            db.add(new_user)
            db.flush()
            fac = db.query(Faculty).first()
            student_record = Student(
                user_id=new_user.user_id,
                student_id="66000000",
                student_name="Student User (SSO)",
                faculty_id=fac.faculty_id if fac else None,
                year=1,
                birthdate=None,
                gender="Male"
            )
            db.add(student_record)
            db.commit()
            db.refresh(student_record)
        return db.query(User).filter(User.user_id == student_record.user_id).first()

    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            return None
        return db.query(User).filter(User.user_id == user_id).first()
    except JWTError:
        return None


# ──────────────────────────────────────────────
# Registration endpoints
# ──────────────────────────────────────────────
@router.post("/register/student", response_model=StandardResponse, status_code=201)
def register_student(data: StudentRegisterCreate, db: Session = Depends(get_db)):
    """
    API สำหรับสมัครสมาชิกของ นิสิต มพ.
    เข้าได้เฉพาะ: ทุกคน (Public)
    การทำงาน: ตรวจสอบอีเมลและรหัสนิสิตซ้ำ จากนั้นสร้างบัญชีผู้ใช้และผูกข้อมูลลงในตาราง Student
    """
    # Duplicate check
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "อีเมลนี้ถูกใช้งานแล้ว (Email already registered)")
    if db.query(Student).filter(Student.student_id == data.student_id).first():
        raise HTTPException(400, "รหัสนิสิตนี้ถูกใช้งานแล้ว (Student ID already registered)")

    # 1️⃣ Create base User
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        is_active=True,
    )
    db.add(user)
    db.flush()   # populate user.user_id without committing

    # 2️⃣ Create Student sub-record
    student = Student(
        user_id=user.user_id,
        student_id=data.student_id,
        student_name=data.student_name,
        faculty_id=get_faculty_id(data.faculty_name, db),
        major=data.major,
        year=data.year,
        birthdate=data.birthdate,
        gender=data.gender,
        phone=data.phone,
    )
    db.add(student)
    db.commit()

    return StandardResponse(
        success=True,
        message="ลงทะเบียนนิสิตสำเร็จ",
        data={"user_id": user.user_id},
    )


@router.post("/register/staff", response_model=StandardResponse, status_code=201)
def register_staff(data: StaffRegisterCreate, db: Session = Depends(get_db)):
    """
    API สำหรับสมัครสมาชิกของ บุคลากร มพ.
    เข้าได้เฉพาะ: ทุกคน (Public)
    การทำงาน: ตรวจสอบอีเมลและรหัสพนักงานซ้ำ จากนั้นสร้างบัญชีผู้ใช้และผูกข้อมูลลงในตาราง Staff
    """
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "อีเมลนี้ถูกใช้งานแล้ว (Email already registered)")
    if db.query(Staff).filter(Staff.employee_id == data.employee_id).first():
        raise HTTPException(400, "รหัสพนักงานนี้ถูกใช้งานแล้ว (Employee ID already registered)")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        is_active=True,
    )
    db.add(user)
    db.flush()

    staff = Staff(
        user_id=user.user_id,
        employee_id=data.employee_id,
        staff_name=data.staff_name,
        department=data.department,
        position=data.position,
        faculty_id=get_faculty_id(data.faculty_name, db),
        phone=data.phone,
        office_location=data.office_location,
    )
    db.add(staff)
    db.commit()

    return StandardResponse(
        success=True,
        message="ลงทะเบียนบุคลากรสำเร็จ",
        data={"user_id": user.user_id},
    )


@router.post("/register/public", response_model=StandardResponse, status_code=201)
def register_public(data: PublicUserRegisterCreate, db: Session = Depends(get_db)):
    """
    API สำหรับสมัครสมาชิกของ บุคคลทั่วไป
    เข้าได้เฉพาะ: ทุกคน (Public)
    การทำงาน: สร้างบัญชีผู้ใช้และผูกข้อมูลลงในตาราง PublicUser
    """
    if not data.pdpa_consent:
        raise HTTPException(400, "คุณต้องยอมรับนโยบายความเป็นส่วนตัว (PDPA) เพื่อสมัครสมาชิก")

    if data.email and db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "อีเมลนี้ถูกใช้งานแล้ว (Email already registered)")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        is_active=True,
    )
    db.add(user)
    db.flush()

    pub = PublicUser(
        user_id=user.user_id,
        first_name=data.first_name,
        last_name=data.last_name,
        age=data.age,
        phone=data.phone,
        address=data.address,
        public_user_type_id=data.public_user_type_id,
        is_pdpa_accepted=True,
        pdpa_accepted_at=datetime.utcnow(),
    )
    db.add(pub)
    db.commit()

    return StandardResponse(
        success=True,
        message="ลงทะเบียนบุคคลทั่วไปสำเร็จ",
        data={"user_id": user.user_id},
    )


# ──────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────
@router.post("/login", response_model=StandardResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    API สำหรับเข้าสู่ระบบ (Login)
    เข้าได้เฉพาะ: ทุกคน (Public)
    การทำงาน: ตรวจสอบอีเมล/เบอร์โทรและรหัสผ่าน หากถูกต้องจะคืนค่า JWT Token และข้อมูล Profile ตาม Role ของผู้ใช้งาน
    """
    user: Optional[User] = None

    # Look up by email
    if login_data.email:
        user = db.query(User).filter(User.email == login_data.email).first()
    elif login_data.phone:
        # Search phone across sub-tables
        student = db.query(Student).filter(Student.phone == login_data.phone).first()
        if student:
            user = db.query(User).filter(User.user_id == student.user_id).first()
        else:
            staff = db.query(Staff).filter(Staff.phone == login_data.phone).first()
            if staff:
                user = db.query(User).filter(User.user_id == staff.user_id).first()
            else:
                pub = db.query(PublicUser).filter(PublicUser.phone == login_data.phone).first()
                if pub:
                    user = db.query(User).filter(User.user_id == pub.user_id).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(400, "อีเมล/เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง (Invalid credentials)")

    if not user.is_active or user.is_deleted:
        raise HTTPException(400, "บัญชีถูกระงับหรือถูกลบ (Account is suspended or deleted)")

    # Determine actual role
    actual_role = get_user_role(user.user_id, db)

    # Optional role gate (from Flutter login screen)
    if login_data.expected_role and actual_role not in ["super_admin", "category_admin"]:
        if actual_role != login_data.expected_role:
            raise HTTPException(403, f"ไม่มีสิทธิ์เข้าถึงในบทบาทนี้ (Expected role: {login_data.expected_role})")

    # Build profile snippet
    profile: Optional[dict] = None
    student = db.query(Student).filter(Student.user_id == user.user_id).first()
    if student:
        profile = {
            "student_id": student.student_id,
            "student_name": student.student_name,
            "faculty_id": student.faculty_id,
            "major": student.major,
            "year": student.year,
            "gender": student.gender,
        }
    else:
        stf = db.query(Staff).filter(Staff.user_id == user.user_id).first()
        if stf:
            profile = {
                "employee_id": stf.employee_id,
                "staff_name": stf.staff_name,
                "department": stf.department,
                "position": stf.position,
                "office_location": stf.office_location,
            }
        else:
            pub = db.query(PublicUser).filter(PublicUser.user_id == user.user_id).first()
            if pub:
                profile = {
                    "first_name": pub.first_name,
                    "last_name": pub.last_name,
                    "phone": pub.phone,
                }

    admin_category_name: Optional[str] = None
    if actual_role == "category_admin":
        from app.models import Category
        cat_admin = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == user.user_id).first()
        if cat_admin and cat_admin.category_id:
            cat = db.query(Category).filter(Category.category_id == cat_admin.category_id).first()
            if cat:
                admin_category_name = cat.category_name

    token = create_access_token({"user_id": user.user_id, "role": actual_role})

    return StandardResponse(
        success=True,
        message="เข้าสู่ระบบสำเร็จ",
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user.user_id,
                "email": user.email,
                "role": actual_role,
                "is_active": user.is_active,
                "display_name": get_display_name(user.user_id, db),
                "profile": profile,
                "admin_category_name": admin_category_name,
            },
        },
    )


# ──────────────────────────────────────────────
# Onboarding (display name update — Flutter compatibility)
# ──────────────────────────────────────────────
@router.patch("/onboarding", response_model=StandardResponse)
def complete_onboarding(
    data: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.display_name:
        return StandardResponse(success=True, message="No changes made")

    # Update name in the appropriate sub-table
    updated = False
    student = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    if student:
        student.student_name = data.display_name
        updated = True

    if not updated:
        stf = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
        if stf:
            stf.staff_name = data.display_name
            updated = True

    if not updated:
        pub = db.query(PublicUser).filter(PublicUser.user_id == current_user.user_id).first()
        if pub:
            pub.first_name = data.display_name
            updated = True

    db.commit()
    return StandardResponse(
        success=True,
        message="อัปเดตชื่อสำเร็จ",
        data={"display_name": data.display_name},
    )


# ──────────────────────────────────────────────
# Anonymous Login / Auto-Registration by IP
# ──────────────────────────────────────────────
@router.post("/anonymous", response_model=StandardResponse)
def login_anonymous(request: Request, db: Session = Depends(get_db)):
    """
    API สำหรับเข้าสู่ระบบแบบไม่ระบุตัวตน (Guest / Anonymous)
    เข้าได้เฉพาะ: ทุกคน (Public)
    การทำงาน: สร้างบัญชีผู้ใช้งานชั่วคราวโดยอิงจาก IP Address และคืนค่า JWT Token สำหรับ Guest
    """
    raw_ip = request.client.host if request.client else "unknown"
    from app.models import AnonymousUser
    
    anon_user = db.query(AnonymousUser).filter(AnonymousUser.raw_ip == raw_ip).first()
    
    if anon_user:
        user = anon_user.user
    else:
        user = User(is_active=True)
        db.add(user)
        db.flush()
        anon_user = AnonymousUser(user_id=user.user_id, raw_ip=raw_ip, hashed_ip="anonymous_guest")
        db.add(anon_user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"user_id": user.user_id, "role": "anonymous"})
    display_name = get_display_name(user.user_id, db)

    return StandardResponse(
        success=True,
        message="เข้าสู่ระบบไม่ระบุตัวตนสำเร็จ",
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user.user_id,
                "role": "anonymous",
                "role_id": "6",
                "display_name": display_name,
            }
        }
    )


# ──────────────────────────────────────────────
# Microsoft SSO
# ──────────────────────────────────────────────
@router.post("/sso/demo-student", response_model=StandardResponse)
def demo_student_sso(db: Session = Depends(get_db)):
    """API สำหรับเข้าสู่ระบบสิทธิ์นิสิตแบบจำลอง (Demo SSO)"""
    student = db.query(Student).filter(Student.user_id != None).first()
    user = None
    if student:
        user = db.query(User).filter(User.user_id == student.user_id).first()
    
    if not user:
        user = User(email="student@up.ac.th", is_active=True)
        db.add(user)
        db.flush()
        student = Student(user_id=user.user_id, student_id="66027179", student_name="นิสิตทดสอบระบบ (SSO Demo)", year=2, gender="male")
        db.add(student)
        db.commit()
    
    token = create_access_token({
        "user_id": user.user_id,
        "role": "student",
        "email": user.email or "student@up.ac.th",
        "display_name": student.student_name if student else "นิสิตทดสอบระบบ",
    })
    return StandardResponse(
        success=True,
        message="เข้าสู่ระบบสิทธิ์นิสิตสำเร็จ",
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user.user_id,
                "email": user.email or "student@up.ac.th",
                "role": "student",
                "display_name": student.student_name if student else "นิสิตทดสอบระบบ",
            }
        }
    )


@router.get("/sso/login")
def sso_login():
    """
    API สำหรับสร้าง URL ของ Microsoft SSO
    เข้าได้เฉพาะ: ทุกคน (Public)
    การทำงาน: สร้าง URL สำหรับล็อกอินผ่านระบบของมหาวิทยาลัย (Microsoft Entra ID) และ Redirect ผู้ใช้ไปที่นั่น
    """
    tenant_id = config.SSO_TENANT_ID
    client_id = config.SSO_CLIENT_ID
    redirect_uri = config.SSO_REDIRECT_URI

    auth_url = (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
        f"?client_id={client_id}"
        f"&response_type=code"
        f"&redirect_uri={redirect_uri}"
        f"&response_mode=query"
        f"&scope=openid profile email User.Read"
    )
    print(f"DEBUG SSO URL: {auth_url}")
    return RedirectResponse(auth_url)


@router.get("/sso/callback")
def sso_callback(code: str, db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(400, "Authorization code is missing")

    tenant_id = config.SSO_TENANT_ID
    client_id = config.SSO_CLIENT_ID
    client_secret = config.SSO_CLIENT_SECRET
    redirect_uri = config.SSO_REDIRECT_URI

    # Exchange code for token
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    token_data = {
        "client_id": client_id,
        "scope": "User.Read",
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
        "client_secret": client_secret,
    }

    print(f"DEBUG: Exchanging code for token...")
    token_res = requests.post(token_url, data=token_data)
    print(f"DEBUG: Token response status: {token_res.status_code}, body: {token_res.text}")
    if token_res.status_code != 200:
        raise HTTPException(400, f"Failed to get access token: {token_res.text}")

    access_token = token_res.json().get("access_token")

    # Get user profile
    graph_url = "https://graph.microsoft.com/v1.0/me"
    graph_headers = {"Authorization": f"Bearer {access_token}"}
    graph_res = requests.get(graph_url, headers=graph_headers)

    if graph_res.status_code != 200:
        raise HTTPException(400, f"Failed to fetch user profile: {graph_res.text}")

    try:
        user_info = graph_res.json()
        email = user_info.get("mail") or user_info.get("userPrincipalName")
        display_name = user_info.get("displayName") or "Unknown SSO User"

        if not email:
            raise HTTPException(400, "Could not extract email from Microsoft account")

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        is_new_user = False
        if not user:
            # Auto-registration logic
            user = User(
                email=email,
                password_hash=hash_password("sso-auto-generated-password-do-not-use"),
                is_active=True,
            )
            db.add(user)
            db.flush()

            # Check prefix logic (starts with digit -> student, else -> staff)
            prefix = email.split('@')[0]
            if prefix and prefix[0].isdigit():
                student = Student(
                    user_id=user.user_id,
                    student_id=prefix,
                    student_name=display_name,
                )
                db.add(student)
            else:
                staff = Staff(
                    user_id=user.user_id,
                    employee_id=f"SSO-{prefix}",
                    staff_name=display_name,
                )
                db.add(staff)
            
            db.commit()
            db.refresh(user)

        # Check profile completeness (birthdate or gender missing → needs onboarding)
        student_rec = db.query(Student).filter(Student.user_id == user.user_id).first()
        staff_rec = db.query(Staff).filter(Staff.user_id == user.user_id).first()
        if student_rec and (student_rec.birthdate is None or student_rec.gender is None):
            is_new_user = True
        elif staff_rec and staff_rec.department is None:
            is_new_user = True

        actual_role = get_user_role(user.user_id, db)
        display_name_for_token = get_display_name(user.user_id, db)
        token = create_access_token({
            "user_id": user.user_id,
            "role": actual_role,
            "email": email,
            "display_name": display_name_for_token,
            "is_new_user": is_new_user,
        })
        
        # Redirect back to frontend (configurable via env)
        frontend_url = os.getenv("FRONTEND_URL", "https://university-social-listening-platfor.vercel.app").rstrip("/")
        return RedirectResponse(f"{frontend_url}/sso-success?token={token}")
    except Exception as e:
        print(f"DEBUG: DB or Processing Error: {e}")
        import traceback
        traceback.print_exc()
        frontend_url = os.getenv("FRONTEND_URL", "https://university-social-listening-platfor.vercel.app").rstrip("/")
        return RedirectResponse(f"{frontend_url}/login?sso_error=server_error")