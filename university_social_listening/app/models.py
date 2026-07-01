# app/models/
from sqlalchemy import Column, Integer, String, Text, Boolean, Enum as SQLEnum, Float, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

# ========================================
# Enums
# ========================================
class RoleEnum(str, enum.Enum):
    STUDENT = "student"
    STAFF = "staff"
    PUBLIC = "public"
    ADMIN = "admin"

class ProblemStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class PriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class GenderEnum(str, enum.Enum):
    MALE = "M"
    FEMALE = "F"
    OTHER = "Other"

class RiskLevelEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

# ========================================
# Models
# ========================================

class Role(Base):
    """บทบาทผู้ใช้"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="role")

class User(Base):
    """ผู้ใช้งาน"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    email = Column(String(255), unique=True)
    phone_number = Column(String(20), unique=True)
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Student fields
    student_id = Column(String(10), unique=True)
    faculty = Column(String(100))
    education_level = Column(String(50))
    
    # Staff fields
    staff_account = Column(String(100), unique=True)
    
    # Common fields
    age = Column(Integer)
    gender = Column(SQLEnum(GenderEnum))
    relationship_to_university = Column(String(100))
    is_toxic_flagged = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    role = relationship("Role", back_populates="users")
    problems = relationship("Problem", back_populates="user")
    upvotes = relationship("Upvote", back_populates="user")
    status_updates = relationship("StatusUpdate", back_populates="updated_by_user")
    clusters = relationship("UserCluster", back_populates="user")

class ProblemCategory(Base):
    """หมวดหมู่ปัญหา"""
    __tablename__ = "problem_categories"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color_code = Column(String(7))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    problems = relationship("Problem", back_populates="category")

class Building(Base):
    """ตึก/อาคาร"""
    __tablename__ = "buildings"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    problems = relationship("Problem", back_populates="building")
    
    __table_args__ = (
        UniqueConstraint('latitude', 'longitude', name='unique_location'),
    )

class Problem(Base):
    """ปัญหา/โพสต์"""
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("problem_categories.id"), nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.id"))
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Time information
    incident_date = Column(DateTime)
    incident_time_range = Column(String(100))
    
    # Status tracking
    status = Column(SQLEnum(ProblemStatusEnum), default=ProblemStatusEnum.OPEN)
    priority = Column(SQLEnum(PriorityEnum), default=PriorityEnum.MEDIUM)
    
    # Privacy settings
    is_anonymous = Column(Boolean, default=False)
    is_staff_only = Column(Boolean, default=False)
    
    # Metadata
    upvote_count = Column(Integer, default=0)
    is_ai_generated_spam = Column(Boolean, default=False)
    toxicity_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="problems")
    category = relationship("ProblemCategory", back_populates="problems")
    building = relationship("Building", back_populates="problems")
    images = relationship("Image", back_populates="problem")
    upvotes = relationship("Upvote", back_populates="problem")
    status_updates = relationship("StatusUpdate", back_populates="problem")
    nlp_analysis = relationship("NLPAnalysis", back_populates="problem", uselist=False)

class Image(Base):
    """ภาพถ่าย (⚠️ ห้ามเก็บ Email/Phone)"""
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer)
    
    # ⚠️ IMPORTANT: Only store coordinates, NOT personal data
    extracted_latitude = Column(Float)
    extracted_longitude = Column(Float)
    extraction_confidence = Column(Float)
    
    is_processed = Column(Boolean, default=False)
    processing_status = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    problem = relationship("Problem", back_populates="images")

class Upvote(Base):
    """เห็นด้วย"""
    __tablename__ = "upvotes"
    
    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    problem = relationship("Problem", back_populates="upvotes")
    user = relationship("User", back_populates="upvotes")
    
    __table_args__ = (
        UniqueConstraint('problem_id', 'user_id', name='unique_upvote'),
    )

class StatusUpdate(Base):
    """อัปเดตสถานะ"""
    __tablename__ = "status_updates"
    
    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    old_status = Column(SQLEnum(ProblemStatusEnum))
    new_status = Column(SQLEnum(ProblemStatusEnum), nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    problem = relationship("Problem", back_populates="status_updates")
    updated_by_user = relationship("User", back_populates="status_updates")

class UserCluster(Base):
    """ผลการ Clustering (K-Means)"""
    __tablename__ = "user_clusters"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cluster_id = Column(Integer, nullable=False)
    behavior_score = Column(Float)
    risk_level = Column(SQLEnum(RiskLevelEnum), default=RiskLevelEnum.LOW)
    clustering_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="clusters")

class NLPAnalysis(Base):
    """ผลการวิเคราะห์ NLP (Ollama)"""
    __tablename__ = "nlp_analysis"
    
    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    extracted_category = Column(String(100))
    extracted_time_context = Column(String(255))
    confidence_score = Column(Float)
    is_toxic = Column(Boolean, default=False)
    toxic_keywords = Column(Text)
    raw_response = Column(Text)
    analysis_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    problem = relationship("Problem", back_populates="nlp_analysis")

class AuditLog(Base):
    """บันทึกการตรวจสอบ"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(255), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(Integer)
    old_value = Column(Text)
    new_value = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class AnalyticsCache(Base):
    """แคชข้อมูล Analytics"""
    __tablename__ = "analytics_cache"
    
    id = Column(Integer, primary_key=True)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(JSON)
    calculation_date = Column(DateTime)
    cache_expiry = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('metric_name', 'calculation_date', name='unique_metric_date'),
    )
