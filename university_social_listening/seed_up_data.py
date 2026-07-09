import os
import sys

# Add the root directory to sys.path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import Category, Building
from app.database import SessionLocal

def seed_data():
    db = SessionLocal()
    try:
        # Clear existing data to avoid duplicates (optional, but requested by user)
        print("Clearing existing categories and buildings...")
        db.query(Category).delete()
        db.query(Building).delete()
        db.commit()

        print("Inserting Categories...")
        categories = [
            "ปัญหาเกี่ยวกับรถเมล์",
            "ปัญหาเกี่ยวกับความสะอาด",
            "ปัญหาสถานที่/อาคาร",
            "ปัญหาเกี่ยวกับการเรียน",
            "ปัญหาโรงอาหาร",
            "ความปลอดภัย/จราจร",
            "ระบบเครือข่าย/IT"
        ]
        
        for name in categories:
            cat = Category(category_name=name)
            db.add(cat)
            
        print("Inserting Buildings...")
        # Approximate UP coordinates: Lat 19.0286, Lng 99.8958
        # We vary them slightly so they don't stack on top of each other.
        buildings_data = [
            ("คณะเทคโนโลยีสารสนเทศและการสื่อสาร", 19.0286, 99.8958),
            ("หอประชุมพญางำเมือง", 19.0290, 99.8950),
            ("อาคารสำนักงานอธิการบดี", 19.0295, 99.8960),
            ("ศูนย์การแพทย์และโรงพยาบาล มหาวิทยาลัยพะเยา", 19.0270, 99.8940),
            ("คณะทันตแพทยศาสตร์", 19.0275, 99.8945),
            ("คณะพลังงานและสิ่งแวดล้อม", 19.0280, 99.8970),
            ("คณะวิศวกรรมศาสตร์", 19.0285, 99.8975),
            ("คณะสหเวชศาสตร์", 19.0290, 99.8980),
            ("คณะเภสัชศาสตร์", 19.0295, 99.8985),
            ("คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์", 19.0300, 99.8955),
            ("คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ", 19.0305, 99.8965),
            ("คณะแพทยศาสตร์", 19.0310, 99.8975),
            ("คณะพยาบาลศาสตร์", 19.0315, 99.8985),
            ("คณะวิทยาศาสตร์", 19.0320, 99.8995),
            ("คณะวิทยาศาสตร์การแพทย์", 19.0325, 99.9005),
            ("คณะศิลปศาสตร์", 19.0330, 99.8930),
            ("ศูนย์บรรณสารและการเรียนรู้", 19.0335, 99.8940),
            ("อาคาร 99 ปี พระอุบาลีคุณูปมาจารย์", 19.0340, 99.8950),
            ("คณะนิติศาสตร์", 19.0345, 99.8960),
            ("คณะวิทยาการจัดการและสารสนเทศศาสตร์", 19.0350, 99.8970),
            ("วิทยาลัยการศึกษา", 19.0355, 99.8980),
            ("ศูนย์หนังสือจุฬา", 19.0360, 99.8990),
            ("คณะรัฐศาสตร์และสังคมศาสตร์", 19.0365, 99.9000),
            ("หอพักนิสิต UP Dorm", 19.0370, 99.8935),
            ("หอพักนิสิต (มพ. 1-18)", 19.0375, 99.8945),
            ("สนามกีฬา", 19.0380, 99.8955),
            ("อาคารสงวนเสริมศรี", 19.0385, 99.8965),
            ("โรงเรียนสาธิตมหาวิทยาลัยพะเยา", 19.0390, 99.8975),
            ("พระพุทธภุชคารักษ์", 19.0395, 99.8985),
        ]
        
        for b_name, lat, lng in buildings_data:
            bld = Building(name=b_name, latitude=lat, longitude=lng)
            db.add(bld)
            
        db.commit()
        print("Master data seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
