from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, AuditLog, UserLoginLog, AnonymousUser
from app.routers.auth import get_current_user, get_display_name
from app.routers.users import require_staff_or_above, require_super_admin
from app.schemas import StandardResponse

router = APIRouter()

@router.get("/login-logs", response_model=StandardResponse)
def get_login_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 100,
):
    """
    API สำหรับดึงประวัติการเข้าสู่ระบบ (Login Logs)
    เข้าได้เฉพาะ: บุคลากรขึ้นไป (Staff, Admin, Super Admin)
    การทำงาน: ดึงประวัติการล็อกอินทั้งหมดของระบบ รวมถึงของ Guest (แสดง IP)
    """
    require_staff_or_above(current_user, db)

    logs = (
        db.query(UserLoginLog, User)
        .join(User, UserLoginLog.user_id == User.user_id)
        .order_by(desc(UserLoginLog.login_time))
        .limit(limit)
        .all()
    )

    result = []
    for log, user in logs:
        from app.routers.auth import get_user_role
        role = get_user_role(user.user_id, db)
        display_name = get_display_name(user.user_id, db)

        ip_address = log.ip_address
        # Ensure anonymous users specifically highlight their IP or fallback if not stored directly in log
        if role == "anonymous" and not ip_address:
            anon = db.query(AnonymousUser).filter(AnonymousUser.user_id == user.user_id).first()
            if anon:
                ip_address = anon.raw_ip or anon.hashed_ip

        result.append({
            "log_id": log.log_id,
            "user_id": user.user_id,
            "display_name": display_name,
            "email": user.email,
            "role": role,
            "ip_address": ip_address,
            "device_type": log.device_type,
            "login_time": str(log.login_time),
            "logout_time": str(log.logout_time) if log.logout_time else None,
        })

    return StandardResponse(
        success=True, message="Login logs retrieved", data={"items": result}
    )


@router.get("/system-logs", response_model=StandardResponse)
def get_system_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 100,
):
    """
    API สำหรับดึงประวัติการทำงานของระบบ (System Audit Logs)
    เข้าได้เฉพาะ: Super Admin
    การทำงาน: ดึงประวัติการเปลี่ยนแปลงข้อมูลสำคัญๆ ที่ถูกบันทึกไว้ (เช่น การลบข้อมูล การเปลี่ยนสิทธิ์)
    """
    require_super_admin(current_user, db)

    logs = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.admin_id == User.user_id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
        .all()
    )

    result = []
    for log, user in logs:
        admin_name = get_display_name(user.user_id, db) if user else "System/Unknown"
        result.append({
            "audit_id": log.audit_log_id,
            "admin_name": admin_name,
            "admin_email": user.email if user else None,
            "action_type": log.action_type,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "created_at": str(log.created_at),
        })

    return StandardResponse(
        success=True, message="System audit logs retrieved", data={"items": result}
    )
