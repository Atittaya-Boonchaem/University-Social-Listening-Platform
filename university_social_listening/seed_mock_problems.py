# seed_mock_problems.py
import random
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Problem, User, Category, Status, VisibilityType

def seed_problems():
    db = SessionLocal()
    try:
        # ตรวจสอบว่ามี User ในระบบหรือยัง ถ้ายังให้สร้างจำลอง 1 คน
        user = db.query(User).first()
        if not user:
            user = User(email="mock_student@up.ac.th", is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)

        # ดึงข้อมูลหมวดหมู่ สถานะ และสิทธิ์การมองเห็น
        categories = db.query(Category).all()
        statuses = db.query(Status).all()
        visibilities = db.query(VisibilityType).all()

        if not categories or not statuses or not visibilities:
            print("❌ Error: ไม่พบข้อมูล Category, Status หรือ Visibility ในระบบ (กรุณารัน python reset_db.py ก่อน)")
            return

        # พิกัดกลางของ ม.พะเยา (ประมาณการ)
        base_lat = 19.0280
        base_lon = 99.8940

        print("🌱 กำลังสร้างข้อมูลปัญหาจำลอง 30 รายการ...")
        
        for i in range(1, 31):
            category = random.choice(categories)
            status = random.choice(statuses)
            visibility = random.choice(visibilities)
            
            # สุ่มพิกัดรอบๆ ม.พะเยา
            lat = base_lat + random.uniform(-0.005, 0.005)
            lon = base_lon + random.uniform(-0.005, 0.005)

            # 💡 Smart Location Privacy: ถ้าเป็นหมวด 'การเรียนการสอน' (หรือหมวดที่ตั้งค่าไว้) ให้ซ่อนพิกัด
            if category.requires_location_privacy or category.category_name == "การเรียนการสอน":
                lat = None
                lon = None

            # สุ่มวันที่ย้อนหลังไปไม่เกิน 30 วัน
            random_days = random.randint(0, 30)
            created_date = datetime.utcnow() - timedelta(days=random_days)

            problem = Problem(
                user_id=user.user_id,
                category_id=category.category_id,
                visibility_id=visibility.visibility_id,
                status_id=status.status_id,
                title=f"ปัญหาจำลองการทดสอบระบบ #{i}",
                description=f"นี่คือรายละเอียดจำลองของปัญหาที่ {i} สำหรับทดสอบการแสดงผลบน Heatmap แดชบอร์ด",
                latitude=lat,
                longitude=lon,
                building_name=f"อาคารจำลอง {random.choice(['A', 'B', 'C', 'PKY'])}",
                is_deleted=False,
                created_at=created_date
            )
            db.add(problem)
        
        db.commit()
        print("✅ สร้างข้อมูลปัญหาจำลองสำเร็จ 30 รายการ! ลองรีเฟรชหน้า Global Heatmap ดูได้เลยครับ")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_problems()