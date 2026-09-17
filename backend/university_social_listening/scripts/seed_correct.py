
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.models import Category
from app.database import SessionLocal

db = SessionLocal()
db.query(Category).delete()
db.commit()

categories = [
    "ปัญหาเกี่ยวกับรถเมล์",
    "ปัญหาเกี่ยวกับความสะอาด",
    "ปัญหาสถานที่/อาคาร",
    "ปัญหาเกี่ยวกับการเรียน",
    "ปัญหาโรงอาหาร",
    "ความปลอดภัย/จราจร",
    "ระบบเครือข่าย/IT",
    "อื่นๆ"
]

for name in categories:
    db.add(Category(category_name=name))
    
db.commit()
print("Fixed categories")

