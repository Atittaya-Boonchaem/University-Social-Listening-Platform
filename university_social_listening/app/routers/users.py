# app/routers/users.py
"""
Users router — updated for the 26-table schema.

Key changes from v1:
  - user.id → user.user_id
  - role_id on User removed → role determined by sub-table membership
  - Ban via UserBan model (creates a record + sets User.is_active=False)
  - Unban clears the active UserBan and restores User.is_active=True
  - List endpoint includes role and display_name from sub-tables
  - SuperAdmin promotion via super_admins table
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import logging
import uuid

from app.database import get_db
from app.models import (
    User, Student, Staff, PublicUser,
    SuperAdmin, CategoryAdmin, UserInvite,
    UserBan, AuditLog,
)
from app.schemas import StandardResponse, UserBanCreate, UserListItem, UserInviteCreate, RegisterInviteCreate
from app.routers.auth import get_current_user, get_user_role, get_display_name, hash_password
from app.services.email_service import send_invitation_email

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Users"])


# ──────────────────────────────────────────────
# Role-gate helpers
# ──────────────────────────────────────────────
def require_super_admin(current_user: User, db: Session) -> None:
    if not db.query(SuperAdmin).filter(
        SuperAdmin.user_id == current_user.user_id, SuperAdmin.is_active == True
    ).first():
        raise HTTPException(403, "Only Super Admins can perform this action")


def require_staff_or_above(current_user: User, db: Session) -> None:
    is_staff = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
    is_cat_admin = db.query(CategoryAdmin).filter(
        CategoryAdmin.user_id == current_user.user_id, CategoryAdmin.is_active == True
    ).first()
    is_super = db.query(SuperAdmin).filter(
        SuperAdmin.user_id == current_user.user_id, SuperAdmin.is_active == True
    ).first()
    if not (is_staff or is_cat_admin or is_super):
        raise HTTPException(403, "Only Staff or Admin users can perform this action")


# ──────────────────────────────────────────────
# List all users (Staff+ only)
# ──────────────────────────────────────────────
@router.get("/list", response_model=StandardResponse)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_staff_or_above(current_user, db)
    
    query = db.query(User).filter(User.is_deleted == False)
    
    actual_role = get_user_role(current_user.user_id, db)
    if actual_role == "category_admin":
        from app.models import CategoryAdmin, Problem
        cat_admin = db.query(CategoryAdmin).filter(
            CategoryAdmin.user_id == current_user.user_id,
            CategoryAdmin.is_active == True
        ).first()
        if cat_admin and cat_admin.category_id:
            query = query.join(Problem, Problem.user_id == User.user_id).filter(
                Problem.category_id == cat_admin.category_id
            ).distinct()
            
    users = query.all()

    result = []
    from app.models import AnonymousUser, CategoryAdmin, Category
    for u in users:
        role = get_user_role(u.user_id, db)
        display_name = get_display_name(u.user_id, db)
        ip_address = None
        category_name = None
        category_id = None
        
        if role == "anonymous":
            anon = db.query(AnonymousUser).filter(AnonymousUser.user_id == u.user_id).first()
            if anon:
                ip_address = anon.raw_ip or anon.hashed_ip
        elif role == "category_admin":
            cat_admin = db.query(CategoryAdmin).filter(
                CategoryAdmin.user_id == u.user_id,
                CategoryAdmin.is_active == True
            ).first()
            if cat_admin and cat_admin.category_id:
                category_id = cat_admin.category_id
                cat = db.query(Category).filter(Category.category_id == category_id).first()
                if cat:
                    category_name = cat.category_name
                
        result.append({
            "user_id": u.user_id,
            "email": u.email,
            "is_active": u.is_active,
            "role": role,
            "display_name": display_name,
            "ip_address": ip_address,
            "category_name": category_name,
            "category_id": category_id,
        })

    return StandardResponse(
        success=True,
        message=f"Retrieved {len(result)} users",
        data={"items": result},
    )


# ──────────────────────────────────────────────
# List Category Admins (must be BEFORE /{user_id} wildcard)
# ──────────────────────────────────────────────
@router.get("/category-admins", response_model=StandardResponse)
def list_category_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_staff_or_above(current_user, db)
    from app.models import CategoryAdmin, Category

    admins = (
        db.query(CategoryAdmin, User.email, Category.category_name)
        .join(User, User.user_id == CategoryAdmin.user_id)
        .join(Category, Category.category_id == CategoryAdmin.category_id)
        .filter(CategoryAdmin.is_active == True, User.is_deleted == False)
        .all()
    )

    result = []
    for admin, email, category_name in admins:
        display_name = get_display_name(admin.user_id, db)
        result.append({
            "admin_id": admin.admin_id,
            "user_id": admin.user_id,
            "display_name": display_name,
            "email": email,
            "category_id": admin.category_id,
            "category_name": category_name,
            "admin_level": "full",
            "assigned_at": str(admin.assigned_at) if admin.assigned_at else None,
        })

    return StandardResponse(
        success=True, message="Category admins retrieved", data={"items": result}
    )


# ──────────────────────────────────────────────
# Create an Invite (Super Admin only)
# ──────────────────────────────────────────────
@router.post("/invites", response_model=StandardResponse)
def create_invite(
    payload: UserInviteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    # Generate random token
    token = str(uuid.uuid4())
    
    new_invite = UserInvite(
        email=payload.email,
        role=payload.role,
        category_id=payload.category_id,
        token=token,
        status="Pending"
    )
    
    db.add(new_invite)
    db.flush()
    
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="CREATE_INVITE",
        table_name="user_invites",
        record_id=new_invite.invite_id,
        new_value={"email": payload.email, "role": payload.role}
    )
    db.add(audit)
    
    category_name = None
    if payload.category_id:
        from app.models import Category
        cat = db.query(Category).filter(Category.category_id == payload.category_id).first()
        if cat:
            category_name = cat.category_name

    background_tasks.add_task(
        send_invitation_email,
        email=payload.email,
        role=payload.role,
        category_name=category_name,
        token=token
    )
    
    db.commit()
    
    return StandardResponse(
        success=True, 
        message=f"Invitation created for {payload.email}",
        data={"token": token}
    )


# ──────────────────────────────────────────────
# List Pending Invites (Super Admin only)
# ──────────────────────────────────────────────
@router.get("/invites", response_model=StandardResponse)
def get_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    from app.models import Category
    
    invites = db.query(UserInvite, Category.category_name).outerjoin(
        Category, UserInvite.category_id == Category.category_id
    ).filter(UserInvite.status == "Pending").all()
    
    items = []
    for inv, cat_name in invites:
        items.append({
            "invite_id": inv.invite_id,
            "email": inv.email,
            "role": inv.role,
            "category_id": inv.category_id,
            "category_name": cat_name,
            "status": inv.status,
            "created_at": inv.created_at
        })
        
    return StandardResponse(
        success=True,
        message="Fetched pending invites",
        data={"items": items}
    )


# ──────────────────────────────────────────────
# Delete/Revoke an Invite (Super Admin only)
# ──────────────────────────────────────────────
@router.delete("/invites/{invite_id}", response_model=StandardResponse)
def delete_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    invite = db.query(UserInvite).filter(UserInvite.invite_id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
        
    email_revoked = invite.email
    db.delete(invite)
    
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="DELETE_INVITE",
        table_name="user_invites",
        record_id=invite_id,
        new_value={"email": email_revoked}
    )
    db.add(audit)
    db.commit()
    
    return StandardResponse(
        success=True,
        message=f"Invite revoked for {email_revoked}"
    )


# ──────────────────────────────────────────────
# Register via Invite
# ──────────────────────────────────────────────
@router.post("/register-invite", response_model=StandardResponse)
def register_invite(
    payload: RegisterInviteCreate,
    db: Session = Depends(get_db)
):
    print(f"--- DEBUG /register-invite ---")
    print(f"Received Token: {payload.token}")
    print(f"Payload: {payload.model_dump()}")
    
    # 1. Look up token
    invite = db.query(UserInvite).filter(UserInvite.token == payload.token).first()
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token.")
        
    if invite.status != "Pending":
        raise HTTPException(status_code=400, detail="Invitation has already been accepted or revoked.")
        
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
        
    # 2. Create Base User
    new_user = User(
        email=invite.email,
        password_hash=hash_password(payload.password),
        is_active=True
    )
    db.add(new_user)
    db.flush()
    
    # 3. Create Staff profile for admins (so they have a name/display_name)
    dummy_emp_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    new_staff = Staff(
        user_id=new_user.user_id,
        employee_id=dummy_emp_id,
        staff_name=f"{payload.first_name} {payload.last_name}",
        staff_role=invite.role.replace("_", " ").title()
    )
    db.add(new_staff)
    db.flush()
    
    # 4. Assign role sub-tables
    if invite.role == "super_admin":
        sa = SuperAdmin(user_id=new_user.user_id)
        db.add(sa)
    elif invite.role == "category_admin":
        if not invite.category_id:
            raise HTTPException(status_code=400, detail="Category Admin invite missing category_id.")
        ca = CategoryAdmin(
            user_id=new_user.user_id,
            category_id=invite.category_id,
            admin_level="full"
        )
        db.add(ca)
        
    # 5. Mark invite as Accepted
    invite.status = "Accepted"
    
    db.commit()
    
    return StandardResponse(
        success=True,
        message="Account created successfully."
    )


# ──────────────────────────────────────────────
# Get current user profile (Must be BEFORE /{user_id})
# ──────────────────────────────────────────────
@router.get("/me", response_model=StandardResponse)
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = get_user_role(current_user.user_id, db)
    display_name = get_display_name(current_user.user_id, db)
    
    category_name = None
    category_id = None
    
    if role == "category_admin":
        from app.models import CategoryAdmin, Category
        cat_admin = db.query(CategoryAdmin).filter(
            CategoryAdmin.user_id == current_user.user_id,
            CategoryAdmin.is_active == True
        ).first()
        if cat_admin and cat_admin.category_id:
            category_id = cat_admin.category_id
            cat = db.query(Category).filter(Category.category_id == cat_admin.category_id).first()
            if cat:
                category_name = cat.category_name
                
    # Faculty & Year Name Mapping
    FACULTY_NAMES = {
        1: 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร',
        2: 'คณะวิศวกรรมศาสตร์',
        3: 'คณะวิทยาศาสตร์',
        4: 'คณะแพทยศาสตร์',
        5: 'คณะศิลปศาสตร์',
        6: 'คณะบริหารธุรกิจและนิเทศศาสตร์',
        7: 'คณะนิติศาสตร์',
        8: 'คณะสหเวชศาสตร์และสาธารณสุขศาสตร์',
        9: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ',
        10: 'คณะทันตแพทยศาสตร์',
        11: 'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์',
        12: 'คณะพยาบาลศาสตร์',
        13: 'คณะเภสัชศาสตร์',
        14: 'วิทยาลัยการศึกษา',
    }
    YEAR_NAMES = {
        1: 'ระดับปริญญาตรี',
        2: 'ระดับปริญญาโท',
        3: 'ระดับปริญญาเอก',
    }

    # Fetch sub-profile details (Student / Staff / Public)
    profile: Optional[dict] = None
    student = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    if student:
        f_name = FACULTY_NAMES.get(student.faculty_id) if student.faculty_id else 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร'
        y_name = YEAR_NAMES.get(student.year) if student.year else 'ระดับปริญญาตรี'
        profile = {
            "student_id": student.student_id,
            "student_name": student.student_name,
            "faculty_id": student.faculty_id,
            "faculty_name": f_name,
            "year": student.year,
            "year_name": y_name,
            "birthdate": student.birthdate,
            "gender": student.gender,
        }
    else:
        stf = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
        if stf:
            profile = {
                "employee_id": stf.employee_id,
                "staff_name": stf.staff_name,
                "department": stf.department,
                "position": stf.position,
                "office_location": stf.office_location,
            }
        else:
            pub = db.query(PublicUser).filter(PublicUser.user_id == current_user.user_id).first()
            if pub:
                profile = {
                    "first_name": pub.first_name,
                    "last_name": pub.last_name,
                    "user_type": pub.user_type,
                }

    return StandardResponse(
        success=True,
        message="Current user profile retrieved successfully",
        data={
            "user_id": current_user.user_id,
            "email": current_user.email,
            "display_name": display_name,
            "role": role,
            "category_id": category_id,
            "category_name": category_name,
            "is_active": current_user.is_active,
            "profile": profile,
        }
    )


# ──────────────────────────────────────────────
# Get single user profile
# ──────────────────────────────────────────────
@router.get("/{user_id}", response_model=StandardResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Users can view their own profile; staff+ can view anyone
    if current_user.user_id != user_id:
        require_staff_or_above(current_user, db)

    user = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(404, "User not found")

    role = get_user_role(user_id, db)
    profile: Optional[dict] = None

    student = db.query(Student).filter(Student.user_id == user_id).first()
    if student:
        f_name = FACULTY_NAMES.get(student.faculty_id) if student.faculty_id else 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร'
        y_name = YEAR_NAMES.get(student.year) if student.year else 'ระดับปริญญาตรี'
        profile = {
            "student_id": student.student_id,
            "student_name": student.student_name,
            "faculty_id": student.faculty_id,
            "faculty_name": f_name,
            "year": student.year,
            "year_name": y_name,
            "birthdate": student.birthdate,
            "gender": student.gender,
        }
    else:
        stf = db.query(Staff).filter(Staff.user_id == user_id).first()
        if stf:
            profile = {
                "employee_id": stf.employee_id,
                "staff_name": stf.staff_name,
                "department": stf.department,
                "position": stf.position,
                "phone": stf.phone,
                "office_location": stf.office_location,
            }
        else:
            pub = db.query(PublicUser).filter(PublicUser.user_id == user_id).first()
            if pub:
                profile = {
                    "first_name": pub.first_name,
                    "last_name": pub.last_name,
                    "phone": pub.phone,
                    "user_type": pub.user_type,
                }

    return StandardResponse(
        success=True,
        message="User retrieved",
        data={
            "user_id": user.user_id,
            "email": user.email,
            "is_active": user.is_active,
            "role": role,
            "created_at": user.created_at,
            "profile": profile,
        },
    )


# ──────────────────────────────────────────────
# Ban a user
# ──────────────────────────────────────────────
@router.post("/{user_id}/ban", response_model=StandardResponse, status_code=201)
def ban_user(
    user_id: int,
    ban_data: UserBanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_staff_or_above(current_user, db)

    if user_id == current_user.user_id:
        raise HTTPException(400, "Cannot ban yourself")

    target = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not target:
        raise HTTPException(404, "User not found")

    # Prevent banning admins unless you're super_admin
    target_role = get_user_role(user_id, db)
    if target_role in ("super_admin", "category_admin"):
        require_super_admin(current_user, db)

    # Check existing active ban
    existing_ban = db.query(UserBan).filter(
        UserBan.user_id == user_id, UserBan.is_active == True
    ).first()
    if existing_ban:
        raise HTTPException(400, "User already has an active ban")

    ban = UserBan(
        user_id=user_id,
        reason=ban_data.reason,
        problem_id=ban_data.problem_id,
        banned_by=current_user.user_id,
        unban_at=ban_data.unban_at,
        is_active=True,
    )
    db.add(ban)

    # Deactivate the account
    target.is_active = False

    # Audit log
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="BAN_USER",
        table_name="users",
        record_id=user_id,
        new_value={"reason": ban_data.reason, "unban_at": str(ban_data.unban_at)},
    )
    db.add(audit)
    db.commit()

    return StandardResponse(
        success=True,
        message=f"User #{user_id} has been banned",
        data={"user_id": user_id, "is_active": target.is_active, "reason": ban_data.reason},
    )


# ──────────────────────────────────────────────
# Unban a user
# ──────────────────────────────────────────────
@router.patch("/{user_id}/unban", response_model=StandardResponse)
def unban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_staff_or_above(current_user, db)

    target = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not target:
        raise HTTPException(404, "User not found")

    active_ban = db.query(UserBan).filter(
        UserBan.user_id == user_id, UserBan.is_active == True
    ).first()
    if not active_ban:
        raise HTTPException(400, "User does not have an active ban")

    active_ban.is_active = False
    target.is_active = True
    target.strike_count = 0

    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="UNBAN_USER",
        table_name="users",
        record_id=user_id,
        old_value={"ban_id": active_ban.ban_id},
        new_value={"is_active": True},
    )
    db.add(audit)
    db.commit()

    return StandardResponse(
        success=True,
        message=f"User #{user_id} has been unbanned",
        data={"user_id": user_id, "is_active": True},
    )


# ──────────────────────────────────────────────
# Promote to Super Admin (Super Admin only)
# ──────────────────────────────────────────────
@router.post("/{user_id}/promote/super-admin", response_model=StandardResponse, status_code=201)
def promote_to_super_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)

    target = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not target:
        raise HTTPException(404, "User not found")

    existing = db.query(SuperAdmin).filter(SuperAdmin.user_id == user_id).first()
    if existing:
        if existing.is_active:
            raise HTTPException(400, "User is already a Super Admin")
        existing.is_active = True
        existing.assigned_by = current_user.user_id
        existing.assigned_at = datetime.utcnow()
    else:
        db.add(SuperAdmin(
            user_id=user_id,
            assigned_by=current_user.user_id,
            is_active=True,
        ))

    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="PROMOTE_SUPER_ADMIN",
        table_name="super_admins",
        record_id=user_id,
        new_value={"promoted_by": current_user.user_id},
    )
    db.add(audit)
    db.commit()

    return StandardResponse(
        success=True,
        message=f"User #{user_id} promoted to Super Admin",
        data={"user_id": user_id, "new_role": "super_admin"},
    )


class ResetPasswordPayload(BaseModel):
    new_password: str

@router.post("/{user_id}/reset-password", response_model=StandardResponse)
def reset_user_password(
    user_id: int,
    payload: ResetPasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)

    target = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not target:
        raise HTTPException(404, "User not found")

    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    target.password_hash = hash_password(payload.new_password)

    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="RESET_PASSWORD",
        table_name="users",
        record_id=user_id,
        new_value={"reset_by": current_user.user_id},
    )
    db.add(audit)
    db.commit()

    return StandardResponse(
        success=True,
        message=f"Password for User #{user_id} has been reset successfully",
        data={"user_id": user_id, "new_password": payload.new_password}
    )


class ChangePasswordPayload(BaseModel):
    current_password: Optional[str] = None
    new_password: str

@router.post("/change-password", response_model=StandardResponse)
def change_my_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    
    if payload.current_password and current_user.password_hash:
        from app.routers.auth import verify_password
        if not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(400, "รหัสผ่านปัจจุบันไม่ถูกต้อง")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return StandardResponse(
        success=True,
        message="เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
        data=None
    )


# ──────────────────────────────────────────────
# Assign Category Admin
# ──────────────────────────────────────────────
@router.post("/{user_id}/assign/category-admin", response_model=StandardResponse, status_code=201)
def assign_category_admin(
    user_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)

    target = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not target:
        raise HTTPException(404, "User not found")

    existing = db.query(CategoryAdmin).filter(
        CategoryAdmin.user_id == user_id, CategoryAdmin.category_id == category_id
    ).first()
    if existing:
        if existing.is_active:
            raise HTTPException(400, "User is already a Category Admin for this category")
        existing.is_active = True
        existing.assigned_by = current_user.user_id
        existing.assigned_at = datetime.utcnow()
        existing.revoked_at = None
    else:
        db.add(CategoryAdmin(
            user_id=user_id,
            category_id=category_id,
            assigned_by=current_user.user_id,
        ))

    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="ASSIGN_CATEGORY_ADMIN",
        table_name="category_admins",
        record_id=user_id,
        new_value={"category_id": category_id},
    )
    db.add(audit)
    db.commit()

    return StandardResponse(
        success=True,
        message=f"User #{user_id} assigned as Category Admin for category {category_id}",
        data={"user_id": user_id, "category_id": category_id},
    )


# ──────────────────────────────────────────────
# Revoke Category Admin
# ──────────────────────────────────────────────
@router.patch("/{user_id}/revoke/category-admin", response_model=StandardResponse)
def revoke_category_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    from app.models import CategoryAdmin
    
    existing = db.query(CategoryAdmin).filter(
        CategoryAdmin.user_id == user_id, CategoryAdmin.is_active == True
    ).first()
    
    if not existing:
        raise HTTPException(404, "Active category admin assignment not found for this user")
        
    existing.is_active = False
    existing.revoked_at = datetime.utcnow()
    
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="REVOKE_CATEGORY_ADMIN",
        table_name="category_admins",
        record_id=user_id,
        new_value={"is_active": False},
    )
    db.add(audit)
    db.commit()
    
    return StandardResponse(success=True, message=f"Revoked category admin role for user #{user_id}")

# ──────────────────────────────────────────────
# Soft delete a user (Super Admin only)
# ──────────────────────────────────────────────
@router.delete("/{user_id}", response_model=StandardResponse)
def delete_user(
    user_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)

    if user_id == current_user.user_id:
        raise HTTPException(400, "Cannot delete your own account via this endpoint")

    target = db.query(User).filter(User.user_id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")

    target.is_deleted = True
    target.is_active = False

    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="DELETE_USER",
        table_name="users",
        record_id=user_id,
        new_value={"reason": reason, "is_deleted": True},
    )
    db.add(audit)
    db.commit()

    return StandardResponse(
        success=True,
        message=f"User #{user_id} has been deleted",
        data={"user_id": user_id},
    )



# ──────────────────────────────────────────────
# Onboarding – save first-time SSO profile data
# ──────────────────────────────────────────────
@router.post("/me/onboarding", response_model=StandardResponse)
def complete_onboarding(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called once after SSO login for new users.
    Student:  faculty_id, education_level (year), birthdate, gender, student_prefix (2-char)
    Staff:    gender
    """
    student = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    if student:
        if "faculty_id" in payload and payload["faculty_id"]:
            student.faculty_id = int(payload["faculty_id"])
        if "education_level" in payload and payload["education_level"]:
            try:
                student.year = int(payload["education_level"])
            except (ValueError, TypeError):
                pass
        if "birthdate" in payload and payload["birthdate"]:
            try:
                from datetime import datetime
                student.birthdate = datetime.strptime(payload["birthdate"], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass
        if "gender" in payload and payload["gender"]:
            student.gender = payload["gender"]
        # Update student_id prefix if provided
        if "student_prefix" in payload and payload["student_prefix"]:
            prefix = str(payload["student_prefix"])[:2]
            existing_id = student.student_id or ""
            if len(existing_id) >= 2:
                student.student_id = prefix + existing_id[2:]
            else:
                student.student_id = prefix + existing_id
        db.commit()
        return StandardResponse(success=True, message="Onboarding complete", data={"role": "student"})

    stf = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
    if stf:
        if "birthdate" in payload and payload["birthdate"]:
            pass  # Staff model has no birthdate column — store in a note or skip
        if "gender" in payload and payload["gender"]:
            pass  # Staff model has no gender column — extend model later if needed
        db.commit()
        return StandardResponse(success=True, message="Onboarding complete", data={"role": "staff"})

    raise HTTPException(404, "User profile not found")


@router.put("/{user_id}", response_model=StandardResponse)
def update_user(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    target = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not target:
        raise HTTPException(404, "User not found")
        
    if "is_active" in payload:
        target.is_active = bool(payload["is_active"])
        
    new_role = payload.get("role")
    if new_role:
        db.query(SuperAdmin).filter(SuperAdmin.user_id == user_id).delete()
        db.query(CategoryAdmin).filter(CategoryAdmin.user_id == user_id).delete()
        db.query(Student).filter(Student.user_id == user_id).delete()
        db.query(Staff).filter(Staff.user_id == user_id).delete()
        db.query(PublicUser).filter(PublicUser.user_id == user_id).delete()
        
        if new_role == "super_admin":
            db.add(SuperAdmin(user_id=user_id, is_active=True))
            db.add(Staff(user_id=user_id, employee_id=f"EMP-{user_id}", staff_name="System Administrator", staff_role="Super Admin"))
        elif new_role == "category_admin":
            cat_id = payload.get("category_id")
            if not cat_id and payload.get("categories"):
                cat_id = payload["categories"][0]
            db.add(CategoryAdmin(user_id=user_id, category_id=cat_id, is_active=True))
            db.add(Staff(user_id=user_id, employee_id=f"EMP-{user_id}", staff_name="Category Admin", staff_role="Category Admin"))
        elif new_role == "staff":
            db.add(Staff(user_id=user_id, employee_id=f"EMP-{user_id}", staff_name="Staff User", staff_role="Staff"))
        elif new_role == "student":
            from datetime import date
            db.add(Student(user_id=user_id, student_id=f"6600{user_id:04d}", student_name="Student User", year=1, birthdate=date(2000, 1, 1), gender="Male"))
        elif new_role == "public":
            db.add(PublicUser(user_id=user_id, first_name="Public", last_name="User"))
            
    if new_role == "category_admin" or (get_user_role(user_id, db) == "category_admin"):
        cat_id = payload.get("category_id")
        if not cat_id and payload.get("categories"):
            cat_id = payload["categories"][0]
        if cat_id:
            cat_adm = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == user_id).first()
            if cat_adm:
                cat_adm.category_id = cat_id
                cat_adm.is_active = True
                
    db.commit()
    return StandardResponse(success=True, message="User updated successfully")


@router.post("/{user_id}/reset-password", response_model=StandardResponse)
def reset_password(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    target = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not target:
        raise HTTPException(404, "User not found")
        
    new_password = payload.get("password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters long")
        
    target.password_hash = hash_password(new_password)
    
    audit = AuditLog(
        admin_id=current_user.user_id,
        action_type="RESET_PASSWORD",
        table_name="users",
        record_id=user_id,
        new_value={"message": "Password reset successfully"}
    )
    db.add(audit)
    db.commit()
    return StandardResponse(success=True, message="Password reset successfully")

