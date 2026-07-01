# app/schemas.py
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime

# ========================================
# Response Schemas
# ========================================
class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ========================================
# User Schemas
# ========================================
class UserBase(BaseModel):
    display_name: Optional[str] = None
    student_id: Optional[str] = None
    faculty: Optional[str] = None
    education_level: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    relationship: Optional[str] = None

class StudentUserCreate(UserBase):
    email: EmailStr
    password: str
    student_id: str = Field(..., min_length=2, max_length=20)
    
class StaffUserCreate(UserBase):
    email: EmailStr
    password: str

class PublicUserCreate(UserBase):
    phone_number: str
    password: str

class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str
    expected_role_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    role_id: int
    email: Optional[str] = None
    display_name: Optional[str] = None
    student_id: Optional[str] = None
    is_active: bool
    
    faculty: Optional[str] = None
    education_level: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    relationship: Optional[str] = None
    
    class Config:
        from_attributes = True

class OnboardingUpdate(BaseModel):
    display_name: Optional[str] = None

# ========================================
# Category Schemas
# ========================================
class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

# ========================================
# Building Schemas
# ========================================
class BuildingCreate(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class BuildingResponse(BaseModel):
    id: int
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    class Config:
        from_attributes = True

# ========================================
# Comment Schemas
# ========================================
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class CommentResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    content: str
    is_admin_reply: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ========================================
# Upvote Schemas
# ========================================
class UpvoteCreate(BaseModel):
    problem_id: int

class UpvoteResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    
    class Config:
        from_attributes = True

# ========================================
# Problem Schemas
# ========================================
class ProblemCreate(BaseModel):
    category_id: int
    building_id: Optional[int] = None
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = Field(None, max_length=500)
    visibility: Optional[str] = "public"
    
class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None

class ProblemAuthorResponse(BaseModel):
    id: int
    role_id: int
    display_name: Optional[str] = None
    email: Optional[str] = None
    student_id: Optional[str] = None

    class Config:
        from_attributes = True

class ProblemResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    building_id: Optional[int] = None
    title: str
    description: str
    status: str
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    visibility: str
    created_at: datetime
    upvote_count: int = 0
    is_upvoted_by_me: bool = False
    
    # Nested relationships
    category: Optional[CategoryResponse] = None
    building: Optional[BuildingResponse] = None
    author: Optional[ProblemAuthorResponse] = None
    
    class Config:
        from_attributes = True

class ProblemListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProblemResponse]

# ========================================
# Admin & Dashboard Schemas
# ========================================
class BulkStatusUpdate(BaseModel):
    problem_ids: List[int] = Field(..., min_items=1)
    new_status: str

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        return self.page_size