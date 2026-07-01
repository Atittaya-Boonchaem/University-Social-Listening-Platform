# app/schemas.py
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ========================================
# Response Schemas
# ========================================
class StandardResponse(BaseModel):
    """Standard API Response"""
    success: bool
    message: str
    data: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ========================================
# User Schemas
# ========================================
class UserBase(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None

class StudentUserCreate(UserBase):
    """นิสิต - สร้าง Account"""
    email: EmailStr
    password: str
    student_id: str = Field(..., min_length=2, max_length=10)
    faculty: str
    education_level: str
    
    @validator('student_id')
    def validate_student_id(cls, v):
        if not v.isalnum():
            raise ValueError('Student ID must be alphanumeric')
        return v

class StaffUserCreate(UserBase):
    """บุคลากร - สร้าง Account"""
    email: EmailStr
    password: str
    staff_account: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v

class PublicUserCreate(UserBase):
    """บุคคลทั่วไป - สร้าง Account"""
    # แก้ไข regex เป็น pattern แล้ว
    phone_number: str = Field(..., pattern=r'^\d{10}$')
    password: str
    relationship_to_university: str

class UserLogin(BaseModel):
    """Login Request"""
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str

class UserResponse(BaseModel):
    """User Response"""
    id: int
    role_id: int
    email: Optional[str]
    phone_number: Optional[str]
    is_verified: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========================================
# Problem Schemas
# ========================================
class ProblemCategoryResponse(BaseModel):
    """Problem Category Response"""
    id: int
    name: str
    description: Optional[str]
    color_code: Optional[str]
    
    class Config:
        from_attributes = True

class BuildingResponse(BaseModel):
    """Building Response"""
    id: int
    name: str
    latitude: Optional[float]
    longitude: Optional[float]
    description: Optional[str]
    
    class Config:
        from_attributes = True

class ProblemCreate(BaseModel):
    """สร้าง Problem/Post"""
    category_id: int
    building_id: Optional[int] = None
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    incident_date: Optional[datetime] = None
    incident_time_range: Optional[str] = None
    
    is_anonymous: bool = False
    is_staff_only: bool = False
    
    @validator('title')
    def validate_title(cls, v):
        if len(v.strip()) < 5:
            raise ValueError('Title must be at least 5 characters')
        return v.strip()
    
    @validator('description')
    def validate_description(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Description must be at least 10 characters')
        return v.strip()

class ProblemUpdate(BaseModel):
    """อัปเดต Problem"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None

class ProblemAuthorResponse(BaseModel):
    """ข้อมูลผู้โพสต์ (ใช้แสดงใน Feed)"""
    id: int
    role_id: int
    email: Optional[str] = None
    phone_number: Optional[str] = None
    student_id: Optional[str] = None
    staff_account: Optional[str] = None

    class Config:
        from_attributes = True

class ProblemResponse(BaseModel):
    """Problem Response"""
    id: int
    user_id: int
    category_id: int
    title: str
    description: str
    status: str
    priority: str
    is_anonymous: bool
    is_staff_only: bool
    upvote_count: int
    latitude: Optional[float]
    longitude: Optional[float]
    incident_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Nested relationships
    category: Optional[ProblemCategoryResponse] = None
    building: Optional[BuildingResponse] = None
    author: Optional[ProblemAuthorResponse] = None  # ผู้โพสต์ (None ถ้า is_anonymous=True)
    
    class Config:
        from_attributes = True

class ProblemListResponse(BaseModel):
    """Problem List Response"""
    total: int
    page: int
    page_size: int
    items: List[ProblemResponse]

# ========================================
# Image Schemas
# ========================================
class ImageCreate(BaseModel):
    """สร้าง Image Entry"""
    problem_id: int

class ImageResponse(BaseModel):
    """Image Response"""
    id: int
    problem_id: int
    file_path: str
    file_size_bytes: Optional[int]
    extracted_latitude: Optional[float]
    extracted_longitude: Optional[float]
    extraction_confidence: Optional[float]
    is_processed: bool
    processing_status: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========================================
# Upvote Schemas
# ========================================
class UpvoteCreate(BaseModel):
    """สร้าง Upvote"""
    problem_id: int

class UpvoteResponse(BaseModel):
    """Upvote Response"""
    id: int
    problem_id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========================================
# Status Update Schemas
# ========================================
class StatusUpdateCreate(BaseModel):
    """สร้าง Status Update"""
    # แก้ไข regex เป็น pattern แล้ว
    new_status: str = Field(..., pattern='^(OPEN|IN_PROGRESS|RESOLVED|CLOSED)$')
    comment: Optional[str] = None

class StatusUpdateResponse(BaseModel):
    """Status Update Response"""
    id: int
    problem_id: int
    old_status: Optional[str]
    new_status: str
    comment: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========================================
# NLP Analysis Schemas
# ========================================
class NLPAnalysisResponse(BaseModel):
    """NLP Analysis Response"""
    id: int
    problem_id: int
    extracted_category: Optional[str]
    extracted_time_context: Optional[str]
    confidence_score: Optional[float]
    is_toxic: bool
    toxic_keywords: Optional[str]
    analysis_date: datetime
    
    class Config:
        from_attributes = True

# ========================================
# Dashboard/Analytics Schemas
# ========================================
class ProblemStatsResponse(BaseModel):
    """ปัญหา Statistics"""
    total_problems: int
    open_problems: int
    in_progress_problems: int
    resolved_problems: int
    avg_resolution_time_hours: float

class CategoryStatsResponse(BaseModel):
    """สถิติตามหมวดหมู่"""
    category_name: str
    count: int
    percentage: float

class HeatMapDataResponse(BaseModel):
    """ข้อมูล Heat Map"""
    latitude: float
    longitude: float
    problem_count: int
    intensity: float

# ========================================
# Pagination Schema
# ========================================
class PaginationParams(BaseModel):
    """Pagination Parameters"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        return self.page_size