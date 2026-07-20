import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.models import Category
from app.database import SessionLocal

db = SessionLocal()
db.query(Category).delete()
db.commit()

categories = [
    '\u0e1b\u0e31\u0e0d\u0e2b\u0e32\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e23\u0e16\u0e40\u0e21\u0e25\u0e4c', # ปัญหาเกี่ยวกับรถเมล์
    '\u0e1b\u0e31\u0e0d\u0e2b\u0e32\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e30\u0e2d\u0e32\u0e14', # ปัญหาเกี่ยวกับความสะอาด
    '\u0e1b\u0e31\u0e0d\u0e2b\u0e32\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48/\u0e2d\u0e32\u0e04\u0e32\u0e23', # ปัญหาสถานที่/อาคาร
    '\u0e1b\u0e31\u0e0d\u0e2b\u0e32\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e19', # ปัญหาเกี่ยวกับการเรียน
    '\u0e1b\u0e31\u0e0d\u0e2b\u0e32\u0e42\u0e23\u0e07\u0e2d\u0e32\u0e2b\u0e32\u0e23', # ปัญหาโรงอาหาร
    '\u0e04\u0e27\u0e32\u0e21\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22/\u0e08\u0e23\u0e32\u0e08\u0e23', # ความปลอดภัย/จราจร
    '\u0e23\u0e30\u0e1a\u0e1a\u0e40\u0e04\u0e23\u0e37\u0e2d\u0e02\u0e48\u0e32\u0e22/IT', # ระบบเครือข่าย/IT
    '\u0e2d\u0e37\u0e48\u0e19\u0e46' # อื่นๆ
]

for name in categories:
    db.add(Category(category_name=name, requires_location_privacy=(name != '\u0e1b\u0e31\u0e0d\u0e2b\u0e32\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e19')))

db.commit()
print('Categories seeded successfully.')
