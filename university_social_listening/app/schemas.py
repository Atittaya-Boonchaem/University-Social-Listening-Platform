# app/schemas.py
"""
Pydantic v2 schemas for the 26-table University Social Listening Platform.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


# ──────────────────────────────────────────────
# Standard Envelope
# ──────────────────────────────────────────────
class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────
# Auth / Registration
# ──────────────────────────────────────────────
class StudentRegisterCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    student_id: str = Field(..., min_length=2, max_length=20)
    student_name: str = Field(..., min_length=2, max_length=100)
    faculty_name: Optional[str] = None
    major: Optional[str] = None
    year: Optional[int] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class StaffRegisterCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    employee_id: str = Field(..., min_length=2, max_length=50)
    staff_name: str = Field(..., min_length=2, max_length=100)
    department: Optional[str] = None
    position: Optional[str] = None
    faculty_name: Optional[str] = None
    phone: Optional[str] = None
    office_location: Optional[str] = None


class PublicUserRegisterCreate(BaseModel):
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    age: int
    phone: Optional[str] = None
    address: Optional[str] = None
    public_user_type_id: Optional[int] = None
    pdpa_consent: bool = Field(..., description="Must be true to register")


class UserInviteCreate(BaseModel):
    email: EmailStr
    role: str
    category_id: Optional[int] = None


class RegisterInviteCreate(BaseModel):
    token: str
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    expected_role: Optional[str] = None   # "student" | "staff" | "public" | "super_admin"


# ──────────────────────────────────────────────
# User Responses
# ──────────────────────────────────────────────
class StudentProfile(BaseModel):
    student_id: str
    student_name: str
    faculty_id: Optional[int] = None
    major: Optional[str] = None
    year: Optional[int] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class StaffProfile(BaseModel):
    employee_id: str
    staff_name: str
    department: Optional[str] = None
    position: Optional[str] = None
    faculty_id: Optional[int] = None
    phone: Optional[str] = None
    office_location: Optional[str] = None
    allowed_visibility_control: bool = True

    class Config:
        from_attributes = True


class PublicUserProfile(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    public_user_type_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    user_id: int
    email: Optional[str] = None
    is_active: bool
    is_deleted: bool
    created_at: datetime
    role: Optional[str] = None          # populated by the router
    profile: Optional[Any] = None       # StudentProfile / StaffProfile / PublicUserProfile

    class Config:
        from_attributes = True


class UserListItem(BaseModel):
    user_id: int
    email: Optional[str] = None
    is_active: bool
    role: str
    display_name: str
    category_name: Optional[str] = None
    category_id: Optional[int] = None


# ──────────────────────────────────────────────
# Faculty
# ──────────────────────────────────────────────
class FacultyCreate(BaseModel):
    faculty_name: str = Field(..., max_length=100)
    description: Optional[str] = None


class FacultyResponse(BaseModel):
    faculty_id: int
    faculty_name: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Public User Types
# ──────────────────────────────────────────────
class PublicUserTypeCreate(BaseModel):
    name: str = Field(..., max_length=100)
    is_active: bool = True

class PublicUserTypeResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Category
# ──────────────────────────────────────────────
class CategoryCreate(BaseModel):
    category_name: str = Field(..., max_length=100)
    ticket_prefix: Optional[str] = Field(None, max_length=10)
    color_code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    icon_url: Optional[str] = None
    requires_location_privacy: bool = False


class CategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    ticket_prefix: Optional[str] = None
    color_code: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    requires_location_privacy: Optional[bool] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    ticket_prefix: Optional[str] = None
    color_code: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    requires_location_privacy: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Building
# ──────────────────────────────────────────────
class BuildingCreate(BaseModel):
    name: str = Field(..., max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class BuildingUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None


class BuildingResponse(BaseModel):
    building_id: int
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Status & Visibility
# ──────────────────────────────────────────────
class StatusResponse(BaseModel):
    status_id: int
    status_name: str
    color_code: Optional[str] = None

    class Config:
        from_attributes = True


class VisibilityTypeResponse(BaseModel):
    visibility_id: int
    visibility_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Problem
# ──────────────────────────────────────────────
class ProblemCreate(BaseModel):
    category_id: int
    visibility_name: str = "public"           # e.g. "public", "internal", "anonymous_only"
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    building_name: Optional[str] = None


class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    building_name: Optional[str] = None
    category_id: Optional[int] = None
    is_hidden: Optional[bool] = None


class AuthorInfo(BaseModel):
    user_id: int
    display_name: str
    role: str


class AttachmentInfo(BaseModel):
    attachment_id: int
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None


class ProblemResponse(BaseModel):
    problem_id: int
    ticket_id: Optional[str] = None
    parent_problem_id: Optional[int] = None
    user_id: int
    category_id: int
    category_name: Optional[str] = None
    visibility_id: int
    visibility_name: Optional[str] = None
    status_id: int
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    title: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    building_name: Optional[str] = None
    is_deleted: bool = False
    is_hidden: bool = False
    is_flagged: bool = False
    flagged_reason: Optional[str] = None
    llm_analysis: Optional[Any] = None
    sla_due_date: Optional[datetime] = None
    created_at: datetime
    like_count: int = 0
    is_liked_by_me: bool = False
    author: Optional[AuthorInfo] = None
    attachments: List[AttachmentInfo] = []


class ProblemListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProblemResponse]


class BulkStatusUpdate(BaseModel):
    problem_ids: List[int] = Field(..., min_length=1)
    status_name: str   # "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"


# ──────────────────────────────────────────────
# Comments
# ──────────────────────────────────────────────
class ProblemCommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=1, max_length=2000)


class ProblemCommentResponse(BaseModel):
    comment_id: int
    problem_id: int
    user_id: int
    comment_text: str
    is_deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Status History
# ──────────────────────────────────────────────
class StatusHistoryResponse(BaseModel):
    history_id: int
    problem_id: int
    status_id: int
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    changed_by: Optional[int] = None
    notes: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────
class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    problem_id: Optional[int] = None
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# User Bans
# ──────────────────────────────────────────────
class UserBanCreate(BaseModel):
    reason: str = Field(..., min_length=5, max_length=255)
    problem_id: Optional[int] = None
    unban_at: Optional[datetime] = None


class UserBanResponse(BaseModel):
    ban_id: int
    user_id: int
    reason: str
    problem_id: Optional[int] = None
    banned_by: Optional[int] = None
    banned_at: datetime
    unban_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# LLM Settings
# ──────────────────────────────────────────────
class LLMSettingUpdate(BaseModel):
    banned_words: Optional[List[str]] = None
    banned_patterns: Optional[List[str]] = None
    is_auto_ban_enabled: Optional[bool] = None
    is_auto_routing_enabled: Optional[bool] = None
    auto_ban_duration_days: Optional[int] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class LLMSettingResponse(BaseModel):
    setting_id: int
    banned_words: Optional[List[str]] = None
    banned_patterns: Optional[List[str]] = None
    is_auto_ban_enabled: bool
    is_auto_routing_enabled: bool
    auto_ban_duration_days: int
    confidence_threshold: Optional[float] = None
    updated_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Onboarding (kept for Flutter app compatibility)
# ──────────────────────────────────────────────
class OnboardingUpdate(BaseModel):
    display_name: Optional[str] = None