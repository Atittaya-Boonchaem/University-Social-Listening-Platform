from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship as orm_relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255))
    display_name = Column(String(100))
    student_id = Column(String(20), nullable=True)
    role_id = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Extended profile fields
    faculty = Column(String(100), nullable=True)
    education_level = Column(String(50), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    phone_number = Column(String(20), unique=True, index=True, nullable=True)
    relationship = Column(String(50), nullable=True)
    
    problems = orm_relationship("Problem", back_populates="author", cascade="all, delete-orphan")
    comments = orm_relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    upvotes = orm_relationship("Upvote", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True)
    
    problems = orm_relationship("Problem", back_populates="category")


class Building(Base):
    __tablename__ = "buildings"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    problems = orm_relationship("Problem", back_populates="building")


class Problem(Base):
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    building_id = Column(Integer, ForeignKey("buildings.id"))
    title = Column(String(255))
    description = Column(Text)
    image_url = Column(String(500), nullable=True)
    status = Column(String(50), default='OPEN')
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    visibility = Column(String(50), default='public')
    created_at = Column(DateTime, default=func.now())
    
    author = orm_relationship("User", back_populates="problems")
    category = orm_relationship("Category", back_populates="problems")
    building = orm_relationship("Building", back_populates="problems")
    comments = orm_relationship("Comment", back_populates="problem", cascade="all, delete-orphan")
    upvotes = orm_relationship("Upvote", back_populates="problem", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(Text)
    is_admin_reply = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    author = orm_relationship("User", back_populates="comments")
    problem = orm_relationship("Problem", back_populates="comments")


class Upvote(Base):
    __tablename__ = "upvotes"
    
    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    
    user = orm_relationship("User", back_populates="upvotes")
    problem = orm_relationship("Problem", back_populates="upvotes")
    
    __table_args__ = (
        UniqueConstraint('problem_id', 'user_id', name='uq_problem_user_upvote'),
    )
