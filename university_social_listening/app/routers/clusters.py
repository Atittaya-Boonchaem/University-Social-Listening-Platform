# app/routers/clusters.py
"""
AI Problem Clusters router
GET  /api/v1/clusters        — list all clusters (staff/admin only)
GET  /api/v1/clusters/{id}   — cluster detail with all problems
PATCH /api/v1/clusters/{id}/status — update cluster + all problems status
POST /api/v1/clusters/recluster  — re-run clustering on all existing problems
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import ProblemCluster, Problem, Status, Category, CategoryAdmin, SuperAdmin, Staff, User
from app.schemas import StandardResponse
from app.routers.auth import get_current_user
from app.routers.problems import get_status_by_name, serialize_problem

router = APIRouter(tags=["AI Clusters"])


def require_staff_or_admin(user: User, db: Session):
    is_staff    = db.query(Staff).filter(Staff.user_id == user.user_id).first()
    is_cat_adm  = db.query(CategoryAdmin).filter(CategoryAdmin.user_id == user.user_id, CategoryAdmin.is_active == True).first()
    is_super    = db.query(SuperAdmin).filter(SuperAdmin.user_id == user.user_id, SuperAdmin.is_active == True).first()
    if not (is_staff or is_cat_adm or is_super):
        raise HTTPException(403, "Only staff or admin can access clusters")


def serialize_cluster(c: ProblemCluster, db: Session) -> dict:
    cat_name  = c.category.category_name if c.category else None
    stat_name = c.status.status_name if c.status else "OPEN"
    stat_color = c.status.color_code if c.status else None
    return {
        "cluster_id":    c.cluster_id,
        "ai_summary":    c.ai_summary,
        "category_id":   c.category_id,
        "category_name": cat_name,
        "location_label": c.location_label,
        "ai_confidence_score": c.ai_confidence_score or 0.95,
        "post_count":    c.post_count,
        "status_name":   stat_name,
        "status_color":  stat_color,
        "first_posted_at": c.first_posted_at,
        "last_posted_at":  c.last_posted_at,
        "created_at":    c.created_at,
    }


@router.get("", response_model=StandardResponse)
def list_clusters(
    category_id: Optional[int] = None,
    status_name: Optional[str] = None,
    page: int = 1,
    page_size: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List AI-grouped problem clusters. Staff/Admin only."""
    require_staff_or_admin(current_user, db)

    q = db.query(ProblemCluster)
    if category_id:
        q = q.filter(ProblemCluster.category_id == category_id)
    if status_name:
        st = db.query(Status).filter(Status.status_name == status_name).first()
        if st:
            q = q.filter(ProblemCluster.status_id == st.status_id)

    total = q.count()
    clusters = q.order_by(ProblemCluster.last_posted_at.desc()).offset((page-1)*page_size).limit(page_size).all()

    return StandardResponse(
        success=True,
        message="Clusters retrieved",
        data={
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [serialize_cluster(c, db) for c in clusters],
        },
    )


@router.get("/{cluster_id}", response_model=StandardResponse)
def get_cluster_detail(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get cluster with all problem posts. Staff/Admin only."""
    require_staff_or_admin(current_user, db)

    cluster = db.query(ProblemCluster).filter(ProblemCluster.cluster_id == cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Cluster not found")

    problems = db.query(Problem).filter(
        Problem.cluster_id == cluster_id,
        Problem.is_deleted == False,
    ).order_by(Problem.created_at).all()

    return StandardResponse(
        success=True,
        message="Cluster detail retrieved",
        data={
            "cluster": serialize_cluster(cluster, db),
            "problems": [serialize_problem(p, db, current_user) for p in problems],
        },
    )


@router.patch("/{cluster_id}/status", response_model=StandardResponse)
def update_cluster_status(
    cluster_id: int,
    status_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update status for a cluster and all its problems. Staff/Admin only."""
    require_staff_or_admin(current_user, db)

    cluster = db.query(ProblemCluster).filter(ProblemCluster.cluster_id == cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Cluster not found")

    status_obj = get_status_by_name(db, status_name)

    # Update cluster status
    cluster.status_id = status_obj.status_id
    cluster.updated_at = datetime.utcnow()

    # Update all problems in cluster
    problems = db.query(Problem).filter(
        Problem.cluster_id == cluster_id,
        Problem.is_deleted == False,
    ).all()

    from app.models import ProblemStatusHistory
    for p in problems:
        p.status_id = status_obj.status_id
        hist = ProblemStatusHistory(
            problem_id=p.problem_id,
            status_id=status_obj.status_id,
            changed_by=current_user.user_id,
            notes=f"Updated via cluster #{cluster_id}",
        )
        db.add(hist)

    db.commit()

    return StandardResponse(
        success=True,
        message=f"Cluster and {len(problems)} problems updated to '{status_name}'",
        data={"cluster": serialize_cluster(cluster, db), "updated_count": len(problems)},
    )


@router.post("/recluster", response_model=StandardResponse)
def recluster_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-run clustering on all existing unclassified problems. SuperAdmin only."""
    is_super = db.query(SuperAdmin).filter(
        SuperAdmin.user_id == current_user.user_id, SuperAdmin.is_active == True
    ).first()
    if not is_super:
        raise HTTPException(403, "SuperAdmin only")

    from app.services.ai_service import auto_cluster_problem

    unclassified = db.query(Problem).filter(
        Problem.cluster_id == None,
        Problem.is_deleted == False,
    ).all()

    clustered = 0
    for p in unclassified:
        cid = auto_cluster_problem(p.problem_id, db)
        if cid:
            clustered += 1

    return StandardResponse(
        success=True,
        message=f"Re-clustered {clustered} problems",
        data={"clustered": clustered, "total_unclassified": len(unclassified)},
    )
