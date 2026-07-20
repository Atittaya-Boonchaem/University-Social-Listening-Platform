import sys
import os
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from app.models import Category

def add_other():
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        exists = db.query(Category).filter(Category.category_name == "อื่นๆ").first()
        if not exists:
            cat = Category(
                category_name="อื่นๆ", 
                description="หมวดหมู่นี้ใช้สำหรับปัญหาที่ไม่ตรงกับหมวดหมู่อื่นๆ (เตรียมพร้อมให้ LLM เข้ามาช่วยจัดหมวดหมู่ในอนาคต)"
            )
            db.add(cat)
            db.commit()
            print("Category 'อื่นๆ' added successfully!")
        else:
            print("Category 'อื่นๆ' already exists!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    add_other()
