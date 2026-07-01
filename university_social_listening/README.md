university_social_listening/
├── app/                      # โฟลเดอร์หลักที่เก็บ Source Code ของแอปพลิเคชัน
│   ├── routers/              # จัดการ API Endpoints (เส้นทางการเข้าถึงข้อมูล)
│   │   ├── __init__.py
│   │   └── problems.py       # API สำหรับจัดการเรื่องร้องเรียน (เช่น ดึงรายการปัญหา, สร้างปัญหาใหม่)
│   ├── services/             # เก็บ Business Logic และการเชื่อมต่อระบบภายนอก/AI
│   │   ├── __init__.py
│   │   └── ollama_service.py # ไฟล์จัดการการเชื่อมต่อกับ Ollama AI (สำหรับใช้วิเคราะห์ข้อความ, กรองคำหยาบ หรือสรุปปัญหา)
│   ├── __init__.py
│   ├── main.py               # จุดเริ่มต้นของโปรแกรม (Entry Point) ใช้ตั้งค่าเซิร์ฟเวอร์, CORS และดึง Router ต่างๆ มารวมกัน
│   ├── models.py             # กำหนดโครงสร้างตารางฐานข้อมูล (Database Models / ORM)
│   └── schemas.py            # กำหนดรูปแบบและตรวจสอบความถูกต้องของข้อมูลเข้า-ออก (Pydantic Models / Data Validation)
├── uploads/                  # โฟลเดอร์สำหรับเก็บไฟล์รูปภาพหรือเอกสารที่ผู้ใช้แนบมาพร้อมกับการแจ้งปัญหา
├── 01_database_schema.sql    # ไฟล์คำสั่ง SQL สำหรับสร้างตารางและโครงสร้างฐานข้อมูลเริ่มต้น
├── 02_project_structure.md   # ไฟล์เอกสารอธิบายโครงสร้างโปรเจกต์
├── 08_flutter_structure.md   # ไฟล์เอกสารอ้างอิงโครงสร้างฝั่งแอปพลิเคชันมือถือ (Frontend)
├── 09_flutter_login_screen.dart # ไฟล์โค้ดสำรองหรืออ้างอิงของหน้า Login ฝั่งแอปพลิเคชันมือถือ
├── 10_README_COMPLETE.md     # คู่มืออธิบายโปรเจกต์แบบสมบูรณ์
├── docker-compose.yml        # ไฟล์ตั้งค่า Docker สำหรับรันหลาย Container พร้อมกัน (เช่น รัน Backend คู่กับ Database)
├── Dockerfile                # ไฟล์คำสั่งสำหรับสร้าง Docker Image ของแอปพลิเคชันนี้
└── requirements.txt          # รายการ Library หรือ Packages ของ Python ที่โปรเจกต์นี้ต้องใช้งาน