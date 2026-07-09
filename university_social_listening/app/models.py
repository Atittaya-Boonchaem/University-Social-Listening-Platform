# app/models.py
"""
26-Table SQLAlchemy ORM Schema — University Social Listening Platform v2
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, JSON, DECIMAL, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base  # Base is declared in app/database.py


# ==========================================
# 📁 Group 1: User Management
# ==========================================

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Faculty(Base):
    __tablename__ = "faculties"

    faculty_id = Column(Integer, primary_key=True, index=True)
    faculty_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    students = relationship("Student", back_populates="faculty")
    staff = relationship("Staff", back_populates="faculty")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="user", uselist=False)
    staff = relationship("Staff", back_populates="user", uselist=False)
    public_user = relationship("PublicUser", back_populates="user", uselist=False)
    anonymous_user = relationship("AnonymousUser", back_populates="user", uselist=False)
    
    # ระบุ FK ให้ชัดเจนป้องกัน Ambiguous Error
    problems = relationship("Problem", back_populates="author", foreign_keys="[Problem.user_id]")
    comments = relationship("ProblemComment", back_populates="author", foreign_keys="[ProblemComment.user_id]")
    likes = relationship("ProblemLike", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    bans = relationship("UserBan", back_populates="user", foreign_keys="[UserBan.user_id]")
    login_logs = relationship("UserLoginLog", back_populates="user")


class Student(Base):
    __tablename__ = "students"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    student_id = Column(String(20), unique=True, nullable=False)
    student_name = Column(String(100), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.faculty_id"), nullable=True)
    major = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    enrolled_date = Column(DateTime, nullable=True)
    is_graduated = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="student")
    faculty = relationship("Faculty", back_populates="students")


class Staff(Base):
    __tablename__ = "staff"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    staff_name = Column(String(100), nullable=False)
    staff_role = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    faculty_id = Column(Integer, ForeignKey("faculties.faculty_id"), nullable=True)
    office_location = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    allowed_visibility_control = Column(Boolean, default=True)
    hire_date = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="staff")
    faculty = relationship("Faculty", back_populates="staff")


class PublicUser(Base):
    __tablename__ = "public_users"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    user_type = Column(String(50), nullable=True)
    id_card_number = Column(String(20), nullable=True)
    registration_date = Column(DateTime, default=datetime.utcnow)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    is_suspended = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="public_user")


class AnonymousUser(Base):
    __tablename__ = "anonymous_users"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    hashed_ip = Column(String(255), nullable=False)
    raw_ip = Column(String(255), nullable=True)
    session_token = Column(String(255), nullable=True)
    user_agent = Column(Text, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    session_expires_at = Column(DateTime, nullable=True)
    is_session_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="anonymous_user")


class CategoryAdmin(Base):
    __tablename__ = "category_admins"

    admin_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=False)
    admin_level = Column(String(50), default="full")
    assigned_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("user_id", "category_id", name="_user_category_uc"),
    )


class SuperAdmin(Base):
    __tablename__ = "super_admins"

    super_admin_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, unique=True)
    super_admin_level = Column(Integer, default=1)
    can_manage_users = Column(Boolean, default=True)
    can_manage_categories = Column(Boolean, default=True)
    can_manage_settings = Column(Boolean, default=True)
    can_view_audit_logs = Column(Boolean, default=True)
    can_ban_users = Column(Boolean, default=True)
    assigned_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class UserInvite(Base):
    __tablename__ = "user_invites"

    invite_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(20), default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# 📁 Group 2: Categories
# ==========================================

class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    requires_location_privacy = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    problems = relationship("Problem", back_populates="category")
    category_admins = relationship("CategoryAdmin", foreign_keys="[CategoryAdmin.category_id]")


# ==========================================
# 📁 Group 2b: Buildings
# ==========================================

class Building(Base):
    __tablename__ = "buildings"

    building_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    latitude = Column(DECIMAL(10, 7), nullable=True)
    longitude = Column(DECIMAL(10, 7), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==========================================
# 📁 Group 3: Status & Visibility
# ==========================================

class Status(Base):
    __tablename__ = "statuses"

    status_id = Column(Integer, primary_key=True, index=True)
    status_name = Column(String(50), unique=True, nullable=False)
    color_code = Column(String(20), nullable=True)

    # Relationships
    problems = relationship("Problem", back_populates="status")
    status_histories = relationship("ProblemStatusHistory", back_populates="status")


class VisibilityType(Base):
    __tablename__ = "visibility_types"

    visibility_id = Column(Integer, primary_key=True, index=True)
    visibility_name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    problems = relationship("Problem", back_populates="visibility")


# ==========================================
# 📁 Group 4: Problems & Interactions
# ==========================================

class Problem(Base):
    __tablename__ = "problems"

    problem_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=False)
    visibility_id = Column(Integer, ForeignKey("visibility_types.visibility_id"), nullable=False)
    status_id = Column(Integer, ForeignKey("statuses.status_id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(DECIMAL(10, 8), nullable=True)
    longitude = Column(DECIMAL(11, 8), nullable=True)
    building_name = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    flagged_reason = Column(String(255), nullable=True)
    llm_analysis = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    author = relationship("User", back_populates="problems", foreign_keys="[Problem.user_id]")
    category = relationship("Category", back_populates="problems")
    status = relationship("Status", back_populates="problems")
    visibility = relationship("VisibilityType", back_populates="problems")
    likes = relationship("ProblemLike", back_populates="problem", cascade="all, delete-orphan")
    comments = relationship("ProblemComment", back_populates="problem", cascade="all, delete-orphan")
    attachments = relationship("ProblemAttachment", back_populates="problem", cascade="all, delete-orphan")
    status_histories = relationship("ProblemStatusHistory", back_populates="problem", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="problem")


class ProblemLike(Base):
    __tablename__ = "problem_likes"

    like_id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.problem_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("problem_id", "user_id", name="_problem_user_like_uc"),
    )

    # Relationships
    problem = relationship("Problem", back_populates="likes")
    user = relationship("User", back_populates="likes")


class ProblemComment(Base):
    __tablename__ = "problem_comments"

    comment_id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.problem_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    comment_text = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    problem = relationship("Problem", back_populates="comments")
    author = relationship("User", back_populates="comments", foreign_keys="[ProblemComment.user_id]")


class ProblemAttachment(Base):
    __tablename__ = "problem_attachments"

    attachment_id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.problem_id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)
    file_size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    problem = relationship("Problem", back_populates="attachments")


class ProblemStatusHistory(Base):
    __tablename__ = "problem_status_histories"

    history_id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.problem_id"), nullable=False)
    status_id = Column(Integer, ForeignKey("statuses.status_id"), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    notes = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    problem = relationship("Problem", back_populates="status_histories")
    status = relationship("Status", back_populates="status_histories")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.problem_id"), nullable=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")
    problem = relationship("Problem", back_populates="notifications")


# ==========================================
# 📁 Group 5: LLM & AI
# ==========================================

class LLMSetting(Base):
    __tablename__ = "llm_settings"

    setting_id = Column(Integer, primary_key=True, index=True)
    banned_words = Column(JSON, nullable=True)
    banned_patterns = Column(JSON, nullable=True)
    is_auto_ban_enabled = Column(Boolean, default=True)
    is_auto_routing_enabled = Column(Boolean, default=True)
    auto_ban_duration_days = Column(Integer, default=7)
    confidence_threshold = Column(DECIMAL(3, 2), default=0.85)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LLMVersion(Base):
    __tablename__ = "llm_versions"

    version_id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deprecated_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    analysis_logs = relationship("LLMAnalysisLog", back_populates="llm_version")
    performance_metrics = relationship("LLMPerformanceMetric", back_populates="llm_version")


class LLMAnalysisLog(Base):
    __tablename__ = "llm_analysis_logs"

    analysis_id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.problem_id"), nullable=False)
    llm_version_id = Column(Integer, ForeignKey("llm_versions.version_id"), nullable=False)
    confidence = Column(DECIMAL(3, 2), nullable=True)
    detected_category = Column(String(100), nullable=True)
    is_correctly_categorized = Column(Boolean, nullable=True)
    human_feedback = Column(Text, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    llm_version = relationship("LLMVersion", back_populates="analysis_logs")


class LLMPerformanceMetric(Base):
    __tablename__ = "llm_performance_metrics"

    metric_id = Column(Integer, primary_key=True, index=True)
    llm_version_id = Column(Integer, ForeignKey("llm_versions.version_id"), nullable=False)
    date = Column(DateTime, nullable=False)
    total_analyzed = Column(Integer, default=0)
    correctly_categorized = Column(Integer, default=0)
    false_positives = Column(Integer, default=0)
    false_negatives = Column(Integer, default=0)
    accuracy = Column(DECIMAL(4, 3), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    llm_version = relationship("LLMVersion", back_populates="performance_metrics")


# ==========================================
# 📁 Group 6: Audit & Tracking
# ==========================================

class UserBan(Base):
    __tablename__ = "user_bans"

    ban_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reason = Column(String(255), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.problem_id"), nullable=True)
    banned_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    banned_at = Column(DateTime, default=datetime.utcnow)
    unban_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="bans", foreign_keys="[UserBan.user_id]")


class UserDeletionLog(Base):
    __tablename__ = "user_deletion_logs"

    deletion_log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    deleted_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    reason = Column(String(255), nullable=True)
    deleted_at = Column(DateTime, default=datetime.utcnow)
    is_permanent = Column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_log_id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    action_type = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserLoginLog(Base):
    __tablename__ = "user_login_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    login_time = Column(DateTime, default=datetime.utcnow)
    logout_time = Column(DateTime, nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="login_logs")