# app/tags.py
"""
Central OpenAPI Tags for Swagger UI categorization.
Organized logically by User Role and System Function.
"""

TAG_AUTH = "1. Authentication & Access Control (ระบบยืนยันตัวตนและสิทธิ์)"
TAG_USER_PROBLEMS = "2. User / Public Issues & Community (ระบบสำหรับผู้ใช้งานทั่วไป / นิสิต)"
TAG_AI_SERVICES = "3. AI & Intelligent Services (ระบบปัญญาประดิษฐ์)"
TAG_CATEGORY_ADMIN = "4. Category Admin & Staff Operations (ระบบสำหรับเจ้าหน้าที่และแอดมินหมวด)"
TAG_SUPER_ADMIN = "5. Super Admin & System Management (ระบบสำหรับผู้ดูแลระบบสูงสุด)"
TAG_MASTER_DATA = "6. Master Data & Public Reference (ข้อมูลอ้างอิงและพิกัด มพ.)"

OPENAPI_TAGS = [
    {
        "name": TAG_AUTH,
        "description": "🔑 API สำหรับเข้าสู่ระบบ, สมัครสมาชิก (นิสิต / เจ้าหน้าที่ / ประชาชน / Guest ไม่ระบุตัวตน), Microsoft SSO และการจัดการสิทธิ์",
    },
    {
        "name": TAG_USER_PROBLEMS,
        "description": "📢 API สำหรับนิสิตและประชาชนทั่วไป: แจ้งปัญหาใหม่, ฟีดปัญหาชุมชน, ประวัติการแจ้งของฉัน, กดถูกใจ (Like), แสดงความคิดเห็น (Comment), ติดตามสถานะ (Timeline) และข้อมูลโปรไฟล์",
    },
    {
        "name": TAG_AI_SERVICES,
        "description": "🧠 API บริการ AI อัจฉริยะ: โมเดลจำแนกหมวดหมู่ปัญหา มพ. (Custom ML), โมเดลเรียบเรียงสรุปรายงานเป็นทางการ (Typhoon 2.5), AI Chatbot Assist, ตรวจสอบปัญหาซ้ำ และระบบจัดกลุ่มปัญหา (Auto-Clustering)",
    },
    {
        "name": TAG_CATEGORY_ADMIN,
        "description": "🛠️ API สำหรับเจ้าหน้าที่และผู้ดูแลหมวดหมู่: อัปเดตสถานะปัญหา (Open / In Progress / Resolved / Closed), มอบหมายงาน (Assign), จัดการปัญหาเฉพาะหมวดหมู่ และอัปเดตแบบกลุ่ม (Bulk Actions)",
    },
    {
        "name": TAG_SUPER_ADMIN,
        "description": "👑 API สำหรับ Super Admin: จัดการผู้ใช้งานทั้งหมด (Users & Roles), ระงับ/ปลดระงับบัญชี (Strikes), จัดการหมวดหมู่ปัญหา (Categories CRUD), ตั้งค่าระบบ & SLA, ตรวจสอบประวัติการทำงาน (Audit Logs)",
    },
    {
        "name": TAG_MASTER_DATA,
        "description": "🏛️ API ข้อมูลอ้างอิงของมหาวิทยาลัย: พิกัดอาคาร มพ. (Campus Buildings & GPS), ข้อมูลสถานะ (Statuses), ข้อมูลระดับการมองเห็น (Visibilities), ประเภทประชาชน และ Health Check",
    },
]
