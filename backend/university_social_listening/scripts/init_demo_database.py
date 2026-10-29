#!/usr/bin/env python3
"""
init_demo_database.py
=====================
Initialize and safely seed the database for the University Social Listening Platform (UP Voice).
Sets up:
  - Table schemas
  - Lookup tables (Roles, Statuses, Visibility Types, Faculties)
  - 7 Master Categories
  - Campus Buildings & GPS Coordinates
  - Default Test Accounts (Super Admin, Category Admins, Student, Staff)
  - Sample Demo Tickets (for realistic dashboard and map demonstration)

Usage:
  cd backend/university_social_listening
  python scripts/init_demo_database.py
"""
import sys
import os
import bcrypt
from datetime import datetime, timedelta

# Ensure parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal, Base
from app.models import (
    User, Role, Student, Staff, SuperAdmin, CategoryAdmin,
    Category, Building, Status, VisibilityType, Faculty,
    Problem, ProblemStatusHistory
)

def hash_pw(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def init_demo_db():
    print("=" * 65)
    print(" 🚀 UP Voice Platform - Database Initialization & Demo Seeder")
    print("=" * 65)

    # 1. Create tables if not present
    print("\n[1/6] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("      -> Tables verified/created successfully.")

    db = SessionLocal()
    try:
        # 2. Roles
        print("\n[2/6] Seeding System Roles...")
        roles_data = [
            ("student", "นิสิตมหาวิทยาลัยพะเยา"),
            ("staff", "บุคลากรมหาวิทยาลัยพะเยา"),
            ("public", "บุคคลทั่วไป"),
            ("anonymous", "ผู้ใช้ไม่ระบุตัวตน"),
            ("category_admin", "ผู้ดูแลหมวดหมู่ปัญหา"),
            ("super_admin", "ผู้ดูแลระบบสูงสุด"),
        ]
        for name, desc in roles_data:
            if not db.query(Role).filter(Role.role_name == name).first():
                db.add(Role(role_name=name, description=desc))
        db.commit()
        print("      -> Roles ready.")

        # 3. Statuses & Visibility
        print("\n[3/6] Seeding Statuses & Visibility Types...")
        statuses_data = [
            ("OPEN", "#F59E0B"),
            ("IN_PROGRESS", "#3B82F6"),
            ("RESOLVED", "#10B981"),
            ("CLOSED", "#6B7280"),
        ]
        for name, color in statuses_data:
            if not db.query(Status).filter(Status.status_name == name).first():
                db.add(Status(status_name=name, color_code=color))

        visibilities_data = [
            ("public", "แสดงบนฟีดสาธารณะ ทุกคนมองเห็นได้"),
            ("internal", "มองเห็นเฉพาะเจ้าหน้าที่และผู้ดูแลระบบ"),
            ("anonymous_only", "ซ่อนชื่อผู้แจ้ง ปรากฏเฉพาะเนื้อหา"),
        ]
        for name, desc in visibilities_data:
            if not db.query(VisibilityType).filter(VisibilityType.visibility_name == name).first():
                db.add(VisibilityType(visibility_name=name, description=desc))
        db.commit()
        print("      -> Statuses & Visibility ready.")

        # 4. Master Categories (7 categories synced with WangchanBERTa)
        print("\n[4/6] Seeding 7 Master Categories...")
        categories_data = [
            ("facilities", "สิ่งอำนวยความสะดวกและอาคารสถานที่", "FAC", "#2563EB", "อาคาร ห้องเรียน แอร์ ไฟฟ้า ห้องน้ำ ลิฟต์ ชำรุด"),
            ("traffic", "การเดินทางและระบบขนส่ง", "TRF", "#059669", "รถเมล์ มพ. วินมอเตอร์ไซค์ การจราจร ทางม้าลาย"),
            ("safety", "ความปลอดภัยและจราจร", "SAF", "#DC2626", "จุดเปลี่ยว ไฟทางดับ สัตว์มีพิษ อุบัติเหตุ"),
            ("cleaning", "ภูมิทัศน์และความสะอาด", "CLN", "#D97706", "ขยะล้น ทางเดินรก กลิ่นไม่พึงประสงค์ หญ้ารก"),
            ("education", "การเรียนการสอนและวิชาการ", "EDU", "#7C3AED", "ระบบลงทะเบียน ห้องสอบ ตารางเรียน อุปกรณ์การสอน"),
            ("network", "ระบบเครือข่ายและเทคโนโลยี", "NET", "#0284C7", "UP-WiFi ระบบอินเทอร์เน็ต เครือข่ายล่ม เว็บไซต์มหาวิทยาลัย"),
            ("other", "บริการทั่วไป / อื่นๆ", "OTH", "#6B7280", "สวัสดิการ โรงอาหาร ร้านค้า และบริการทั่วไปอื่นๆ"),
        ]
        cat_map = {}
        for code, name, prefix, color, desc in categories_data:
            cat = db.query(Category).filter(
                (Category.category_name == name) | (Category.ticket_prefix == prefix)
            ).first()
            if not cat:
                cat = Category(
                    category_name=name,
                    ticket_prefix=prefix,
                    description=desc,
                    color_code=color,
                    is_active=True
                )
                db.add(cat)
                db.flush()
            cat_map[code] = cat
        db.commit()
        print("      -> 7 Categories ready.")

        # 5. Campus Buildings & Coordinates
        print("\n[5/6] Seeding Campus Buildings & Coordinates...")
        buildings_data = [
            ("คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)", 19.0286, 99.8958),
            ("หอประชุมพญางำเมือง", 19.0290, 99.8950),
            ("อาคารสำนักงานอธิการบดี", 19.0295, 99.8960),
            ("ศูนย์การแพทย์และโรงพยาบาลมหาวิทยาลัยพะเยา", 19.0270, 99.8940),
            ("คณะวิศวกรรมศาสตร์", 19.0285, 99.8975),
            ("คณะแพทยศาสตร์", 19.0310, 99.8975),
            ("คณะวิทยาศาสตร์", 19.0320, 99.8995),
            ("ศูนย์บรรณสารและการเรียนรู้ (หอสมุด)", 19.0335, 99.8940),
            ("อาคาร 99 ปี พระอุบาลีคุณูปมาจารย์", 19.0340, 99.8950),
            ("คณะนิติศาสตร์", 19.0345, 99.8960),
            ("คณะรัฐศาสตร์และสังคมศาสตร์", 19.0365, 99.9000),
            ("ประตู 1 มหาวิทยาลัยพะเยา (หน้ามอ)", 19.0245, 99.8920),
            ("ประตู 2 มหาวิทยาลัยพะเยา", 19.0255, 99.8935),
            ("หอพัก 12", 19.0312, 99.8988),
            ("หอพักสงวนเสริมศรี", 19.0322, 99.8972),
            ("โรงอาหารกลาง (PK)", 19.0298, 99.8962),
            ("อาคารกิจกรรมนิสิต (เวียงพะเยา)", 19.0305, 99.8952),
        ]
        bldg_map = {}
        for name, lat, lng in buildings_data:
            bldg = db.query(Building).filter(Building.name == name).first()
            if not bldg:
                bldg = Building(name=name, latitude=lat, longitude=lng, is_active=True)
                db.add(bldg)
                db.flush()
            bldg_map[name] = bldg
        db.commit()
        print(f"      -> {len(buildings_data)} Campus Buildings ready.")

        # 6. Default Test Accounts
        print("\n[6/6] Creating Default Test Accounts & Demo Tickets...")
        default_pwd = hash_pw("123456")

        # 6.1 Super Admin
        sa_email = "superadmin@up.ac.th"
        sa_user = db.query(User).filter(User.email == sa_email).first()
        if not sa_user:
            sa_user = User(email=sa_email, password_hash=default_pwd, is_active=True)
            db.add(sa_user)
            db.flush()
        sa_entry = db.query(SuperAdmin).filter(SuperAdmin.user_id == sa_user.user_id).first()
        if not sa_entry:
            db.add(SuperAdmin(user_id=sa_user.user_id, super_admin_level=1, is_active=True))

        # 6.2 Category Admin - Facilities
        fac_email = "admin.facilities@up.ac.th"
        fac_user = db.query(User).filter(User.email == fac_email).first()
        if not fac_user:
            fac_user = User(email=fac_email, password_hash=default_pwd, is_active=True)
            db.add(fac_user)
            db.flush()
        fac_staff = db.query(Staff).filter(Staff.user_id == fac_user.user_id).first()
        if not fac_staff:
            db.add(Staff(user_id=fac_user.user_id, employee_id="STF001", staff_name="สมศักดิ์ ดูแลอาคาร", department="กองอาคารสถานที่"))
        fac_cat_id = cat_map["facilities"].category_id
        if not db.query(CategoryAdmin).filter(CategoryAdmin.user_id == fac_user.user_id, CategoryAdmin.category_id == fac_cat_id).first():
            db.add(CategoryAdmin(user_id=fac_user.user_id, category_id=fac_cat_id, is_active=True))

        # 6.3 Category Admin - Traffic
        trf_email = "admin.traffic@up.ac.th"
        trf_user = db.query(User).filter(User.email == trf_email).first()
        if not trf_user:
            trf_user = User(email=trf_email, password_hash=default_pwd, is_active=True)
            db.add(trf_user)
            db.flush()
        trf_staff = db.query(Staff).filter(Staff.user_id == trf_user.user_id).first()
        if not trf_staff:
            db.add(Staff(user_id=trf_user.user_id, employee_id="STF002", staff_name="วิชัย การจราจร", department="กองยานพาหนะ"))
        trf_cat_id = cat_map["traffic"].category_id
        if not db.query(CategoryAdmin).filter(CategoryAdmin.user_id == trf_user.user_id, CategoryAdmin.category_id == trf_cat_id).first():
            db.add(CategoryAdmin(user_id=trf_user.user_id, category_id=trf_cat_id, is_active=True))

        # 6.4 Student User
        std_email = "student@up.ac.th"
        std_user = db.query(User).filter(User.email == std_email).first()
        if not std_user:
            std_user = User(email=std_email, password_hash=default_pwd, is_active=True)
            db.add(std_user)
            db.flush()
        std_entry = db.query(Student).filter(Student.user_id == std_user.user_id).first()
        if not std_entry:
            db.add(Student(user_id=std_user.user_id, student_id="66020001", student_name="นิสิต ทดสอบระบบ", year=3))

        # 6.5 Staff User
        stf_email = "staff@up.ac.th"
        stf_user = db.query(User).filter(User.email == stf_email).first()
        if not stf_user:
            stf_user = User(email=stf_email, password_hash=default_pwd, is_active=True)
            db.add(stf_user)
            db.flush()
        stf_entry = db.query(Staff).filter(Staff.user_id == stf_user.user_id).first()
        if not stf_entry:
            db.add(Staff(user_id=stf_user.user_id, employee_id="STF003", staff_name="บุคลากร ทดสอบ", department="สำนักงานอธิการบดี"))

        db.commit()
        print("      -> Test Accounts created successfully.")

        # 6.6 Seed Sample Tickets if table is empty or has few tickets
        existing_problems_count = db.query(Problem).count()
        if existing_problems_count < 5:
            print("      -> Generating sample demo tickets for dashboard visualization...")
            open_st = db.query(Status).filter(Status.status_name == "OPEN").first()
            prog_st = db.query(Status).filter(Status.status_name == "IN_PROGRESS").first()
            res_st = db.query(Status).filter(Status.status_name == "RESOLVED").first()
            pub_vis = db.query(VisibilityType).filter(VisibilityType.visibility_name == "public").first()

            demo_tickets = [
                {
                    "title": "แอร์ห้อง ICT 1204 ไม่เย็นและมีน้ำหยดลงโต๊ะเรียน",
                    "description": "เวลาเข้าเรียนช่วงบ่ายห้องร้อนมาก แอร์มีเสียงดังและมีน้ำหยดใส่เอกสารการเรียน ขอความกรุณาช่างเข้ามาตรวจสอบด้วยครับ",
                    "category": cat_map["facilities"],
                    "building": bldg_map.get("คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)"),
                    "status": open_st,
                    "lat": 19.0286,
                    "lng": 99.8958,
                    "author": std_user,
                    "days_ago": 1,
                },
                {
                    "title": "รถเมล์ มพ. สาย 1 รอนานมากช่วงเช้า 08.00 น.",
                    "description": "ช่วงชั่วโมงเร่งด่วนคนต่อแถวยาวจากหน้าหอ 12 จนล้นถนน รถวิ่งไม่เพียงพอต่อนิสิตที่ต้องไปเรียนให้ทัน 8 โมง",
                    "category": cat_map["traffic"],
                    "building": bldg_map.get("หอพัก 12"),
                    "status": prog_st,
                    "lat": 19.0312,
                    "lng": 99.8988,
                    "author": std_user,
                    "days_ago": 3,
                },
                {
                    "title": "ไฟทางเดินระหว่างหอประชุมพญางำเมืองดับ มืดและอันตราย",
                    "description": "ช่วงค่ำหลัง 19.00 น. ทางเดินมืดสนิท นิสิตเดินผ่านคนเดียวกลัวเกิดอันตราย อยากให้ซ่อมไฟส่องสว่างด่วนครับ",
                    "category": cat_map["safety"],
                    "building": bldg_map.get("หอประชุมพญางำเมือง"),
                    "status": open_st,
                    "lat": 19.0290,
                    "lng": 99.8950,
                    "author": std_user,
                    "days_ago": 2,
                },
                {
                    "title": "แก้ไขแล้ว: ท่อน้ำรั่วหน้าโรงอาหารกลาง (PK)",
                    "description": "น้ำไหลนองขวางทางเดินเข้าโรงอาหาร ลื่นและส่งกลิ่นชื้น เจ้าหน้าที่กองอาคารได้เข้าเปลี่ยนท่อและทำความสะอาดแล้ว",
                    "category": cat_map["facilities"],
                    "building": bldg_map.get("โรงอาหารกลาง (PK)"),
                    "status": res_st,
                    "lat": 19.0298,
                    "lng": 99.8962,
                    "author": stf_user,
                    "days_ago": 5,
                },
                {
                    "title": "สัญญาณ WiFi @UP-Connect ในหอสมุดชั้น 2 หลุดบ่อยมาก",
                    "description": "สัญญาณขึ้นเต็มแต่เชื่อมต่ออินเทอร์เน็ตไม่ได้ พอต่อได้สัก 5 นาทีก็หลุด ส่งผลกระทบต่อการค้นคว้างานวิจัย",
                    "category": cat_map["network"],
                    "building": bldg_map.get("ศูนย์บรรณสารและการเรียนรู้ (หอสมุด)"),
                    "status": prog_st,
                    "lat": 19.0335,
                    "lng": 99.8940,
                    "author": std_user,
                    "days_ago": 4,
                },
            ]

            for idx, item in enumerate(demo_tickets):
                created_dt = datetime.utcnow() - timedelta(days=item["days_ago"])
                p = Problem(
                    user_id=item["author"].user_id,
                    category_id=item["category"].category_id,
                    status_id=item["status"].status_id if item["status"] else 1,
                    visibility_id=pub_vis.visibility_id if pub_vis else 1,
                    title=item["title"],
                    description=item["description"],
                    ticket_number=f"{item['category'].ticket_prefix}-{datetime.now().strftime('%Y%m')}-{idx+1:04d}",
                    latitude=item["lat"],
                    longitude=item["lng"],
                    location_description=item["building"].name if item["building"] else "มหาวิทยาลัยพะเยา",
                    building_id=item["building"].building_id if item["building"] else None,
                    is_location_confirmed=True,
                    location_confidence=0.95,
                    upvote_count=5 + idx * 3,
                    view_count=20 + idx * 10,
                    created_at=created_dt,
                    updated_at=created_dt,
                )
                db.add(p)
            db.commit()
            print("      -> Seeded 5 realistic demo tickets.")

        print("\n" + "=" * 65)
        print(" 🎉 Database Initialization Completed Successfully!")
        print("=" * 65)
        print("\n🔑 บัญชีทดสอบระบบ (Default Test Accounts):")
        print("  ┌──────────────────────────────────────────────────────────┐")
        print("  │ Super Admin    : superadmin@up.ac.th       (Pass: 123456)│")
        print("  │ Facilities Admin: admin.facilities@up.ac.th(Pass: 123456)│")
        print("  │ Traffic Admin  : admin.traffic@up.ac.th   (Pass: 123456)│")
        print("  │ Student User   : student@up.ac.th         (Pass: 123456)│")
        print("  │ Staff User     : staff@up.ac.th           (Pass: 123456)│")
        print("  └──────────────────────────────────────────────────────────┘\n")

    except Exception as e:
        db.rollback()
        print(f"\n❌ [ERROR] An error occurred: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_demo_db()
