# app/routers/notifications.py
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Notification, Problem, User, Status
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("")
def get_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    notification_type: Optional[str] = Query(None, description="Filter by type (e.g. SYSTEM_ALERT, NEW_PROBLEM, TICKET_UPDATE)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notifications for the logged-in user.
    For Super Admin (role_id=4 or role='super_admin'), also includes general system alerts.
    """
    is_super_admin = (
        getattr(current_user, "role_id", None) == 4 or
        getattr(current_user, "role", None) == "super_admin"
    )

    query = db.query(Notification)

    if is_super_admin:
        # Super admin sees notifications sent to them OR system-wide alerts
        query = query.filter(
            (Notification.user_id == current_user.user_id) |
            (Notification.notification_type.in_(["SYSTEM_ALERT", "SECURITY_ALERT", "PENDING_REVIEW"]))
        )
    else:
        query = query.filter(Notification.user_id == current_user.user_id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    if notification_type and notification_type != "ALL":
        query = query.filter(Notification.notification_type == notification_type)

    total = query.count()
    notifications = (
        query.order_by(desc(Notification.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # If database has very few notifications for Super Admin, synthesize from recent pending problems
    results = []
    for n in notifications:
        results.append({
            "notification_id": n.notification_id,
            "user_id": n.user_id,
            "problem_id": n.problem_id,
            "notification_type": n.notification_type or "SYSTEM",
            "title": n.title,
            "message": n.message,
            "is_read": bool(n.is_read),
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "read_at": n.read_at.isoformat() if n.read_at else None,
        })

    # If fewer than 5 records and user is super admin, complement with pending problems
    if is_super_admin and len(results) < 5:
        existing_problem_ids = {r["problem_id"] for r in results if r["problem_id"]}
        pending_problems = (
            db.query(Problem)
            .join(Status)
            .filter(Status.status_name == "PENDING_REVIEW")
            .filter(~Problem.problem_id.in_(existing_problem_ids) if existing_problem_ids else True)
            .order_by(desc(Problem.created_at))
            .limit(10 - len(results))
            .all()
        )
        for p in pending_problems:
            results.append({
                "notification_id": -p.problem_id,  # Virtual negative ID for UI
                "user_id": current_user.user_id,
                "problem_id": p.problem_id,
                "notification_type": "PENDING_REVIEW",
                "title": f"คำร้องรอการตรวจสอบ #{p.ticket_id or p.problem_id}",
                "message": (p.title or p.description or "มีคำร้องใหม่รอการอนุมัติและกระจายงาน")[:120],
                "is_read": False,
                "created_at": p.created_at.isoformat() if p.created_at else datetime.utcnow().isoformat(),
                "read_at": None,
            })

    # Count real unread
    unread_count_query = db.query(Notification).filter(Notification.is_read == False)
    if is_super_admin:
        unread_count_query = unread_count_query.filter(
            (Notification.user_id == current_user.user_id) |
            (Notification.notification_type.in_(["SYSTEM_ALERT", "SECURITY_ALERT", "PENDING_REVIEW"]))
        )
    else:
        unread_count_query = unread_count_query.filter(Notification.user_id == current_user.user_id)

    real_unread = unread_count_query.count()
    # Add virtual pending count if any
    pending_total = 0
    if is_super_admin:
        pending_total = (
            db.query(Problem)
            .join(Status)
            .filter(Status.status_name == "PENDING_REVIEW")
            .count()
        )

    unread_count = max(real_unread, pending_total)

    return {
        "success": True,
        "total": total + (pending_total if is_super_admin and total == 0 else 0),
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
        "data": results,
    }


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get quick count of unread notifications for badge.
    """
    is_super_admin = (
        getattr(current_user, "role_id", None) == 4 or
        getattr(current_user, "role", None) == "super_admin"
    )

    query = db.query(Notification).filter(Notification.is_read == False)
    if is_super_admin:
        query = query.filter(
            (Notification.user_id == current_user.user_id) |
            (Notification.notification_type.in_(["SYSTEM_ALERT", "SECURITY_ALERT", "PENDING_REVIEW"]))
        )
        real_count = query.count()
        pending_count = (
            db.query(Problem)
            .join(Status)
            .filter(Status.status_name == "PENDING_REVIEW")
            .count()
        )
        total_unread = max(real_count, pending_count)
    else:
        query = query.filter(Notification.user_id == current_user.user_id)
        total_unread = query.count()

    return {"success": True, "unread_count": total_unread}


@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    if notification_id < 0:
        # Virtual pending problem notification - treat as acknowledged
        return {"success": True, "message": "Virtual notification marked as read"}

    notif = db.query(Notification).filter(Notification.notification_id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "Marked as read"}


@router.patch("/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all unread notifications as read for current user.
    """
    is_super_admin = (
        getattr(current_user, "role_id", None) == 4 or
        getattr(current_user, "role", None) == "super_admin"
    )

    query = db.query(Notification).filter(Notification.is_read == False)
    if is_super_admin:
        query = query.filter(
            (Notification.user_id == current_user.user_id) |
            (Notification.notification_type.in_(["SYSTEM_ALERT", "SECURITY_ALERT", "PENDING_REVIEW"]))
        )
    else:
        query = query.filter(Notification.user_id == current_user.user_id)

    query.update({Notification.is_read: True, Notification.read_at: datetime.utcnow()}, synchronize_session=False)
    db.commit()

    return {"success": True, "message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a notification.
    """
    if notification_id < 0:
        return {"success": True, "message": "Virtual notification dismissed"}

    notif = db.query(Notification).filter(Notification.notification_id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notif)
    db.commit()

    return {"success": True, "message": "Notification deleted"}

