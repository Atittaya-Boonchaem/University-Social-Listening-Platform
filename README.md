# 🎓 UP Voice — University Social Listening & Problem Reporting Platform
### ระบบรับฟังเสียงและบริหารจัดการเรื่องร้องเรียนอัจฉริยะ มหาวิทยาลัยพะเยา
*โครงงานปริญญานิพนธ์ / Senior Research Project — มหาวิทยาลัยพะเยา (UP)*

---

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![MySQL](https://img.shields.io/badge/Database-MySQL_8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![NLP](https://img.shields.io/badge/AI-WangchanBERTa-purple)](https://github.com/vistec-AI/wangchanberta)

---

## 📖 เกี่ยวกับโครงงาน (About the Project)

**UP Voice** เป็นระบบรับฟังเสียงและรวบรวมเรื่องร้องเรียน ปัญหาโครงสร้างพื้นฐาน การเรียนการสอน และการจราจรภายในมหาวิทยาลัยพะเยา โดยใช้ปัญญาประดิษฐ์ (AI) ในการจำแนกหมวดหมู่ข้อร้องเรียน 7 ด้าน และจับคู่พิกัดสถานที่อัตโนมัติ เพื่อส่งมอบงานให้แก่เจ้าหน้าที่ผู้รับผิดชอบได้อย่างถูกต้อง รวดเร็ว และโปร่งใส

### 🌟 ฟีเจอร์หลักของระบบ (Key Features)
1. **Public Web (สำหรับนิสิตและบุคคลทั่วไป)**:
   - ฟอร์มแจ้งปัญหาพร้อมระบบ AI แนะนำหมวดหมู่และพิกัดอาคาร 45 แห่งใน มพ. แบบ Real-time
   - ระบบติดตามสถานะเรื่องร้องเรียน (Ticket Tracking System) พร้อมประวัติการดำเนินงาน 4 ขั้นตอน (OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED)
   - หน้าฟีดสาธารณะสำหรับอ่านและโหวต (Upvote) เพื่อผลักดันประเด็นสำคัญ
2. **Admin Dashboard (สำหรับเจ้าหน้าที่และผู้ดูแล)**:
   - แดชบอร์ดสรุปสถิติภาพรวม กราฟแท่ง กราฟวงกลม และแนวโน้มปัญหา
   - ระบบแผนที่พิกัดปัญหา (Campus Live Map & Heatmap)
   - ระบบบริหารจัดการตั๋วงาน (Ticket Management) การมอบหมายงาน และอัปเดตสถานะ
   - ระบบบริหารจัดการผู้ใช้ กำหนดสิทธิ์ Super Admin และ Category Admin
3. **Executive Dashboard (สำหรับผู้บริหาร)**:
   - ระบบแสดงตัวชี้วัดสำคัญ (Key Performance Indicators) สถิติเวลาเฉลี่ยในการแก้ไขปัญหา (MTTR) และการจัดอันดับปัญหาตามหมวดหมู่
4. **AI & NLP Engine**:
   - ตรวจจับและคัดกรองคำหยาบคาย (Profanity Filter)
   - โมเดลประมวลผลภาษาไทย **WangchanBERTa Multi-Label Classification** จำแนก 7 หมวดหมู่หลัก

---

## 🚀 เริ่มต้นใช้งานด่วน (Quick Start)

> 💡 สำหรับคู่มือการติดตั้งฉบับสมบูรณ์ โปรดอ่านที่ [คู่มือการติดตั้งระบบ (INSTALLATION_GUIDE.md)](./INSTALLATION_GUIDE.md)

### วิธีเปิดระบบบน Windows (One-Click)

1. **ติดตั้งไลบรารีทั้งหมด**:
   ```cmd
   scripts\setup_project.bat
   ```
2. **เตรียมฐานข้อมูลและบัญชีทดสอบ**:
   ```cmd
   cd backend\university_social_listening
   .venv\Scripts\activate
   python scripts\init_demo_database.py
   cd ..\..
   ```
3. **รันระบบทั้งหมด**:
   ```cmd
   scripts\start_all.bat
   ```

ระบบจะเปิดหน้าต่างเบราว์เซอร์ให้โดยอัตโนมัติ:
- **Public Web**: [http://localhost:5174](http://localhost:5174)
- **Admin Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔑 บัญชีสำหรับทดสอบระบบ (Default Test Accounts)

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) |
|---|---|---|
| **Super Admin** | `superadmin@up.ac.th` | `123456` |
| **Category Admin (อาคาร)** | `admin.facilities@up.ac.th` | `123456` |
| **Category Admin (ขนส่ง)** | `admin.traffic@up.ac.th` | `123456` |
| **Student (นิสิต)** | `student@up.ac.th` | `123456` |
| **Staff (บุคลากร)** | `staff@up.ac.th` | `123456` |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
├── backend/
│   └── university_social_listening/   # FastAPI Application & AI Engine
├── frontend/
│   ├── up_voice_public_web/           # Student & Public Web (Port 5174)
│   ├── up_voice_admin_dashboard/      # Admin Management Portal (Port 5173)
│   └── up_voice_executive_dashboard/  # Executive Analytics Portal (Port 5175)
├── scripts/
│   ├── setup_project.bat              # สคริปต์ติดตั้งระบบอัตโนมัติ
│   ├── start_all.bat                  # สคริปต์รันระบบทั้งหมด
│   └── package_source_code.bat        # สคริปต์เตรียม ZIP Source Code ส่งอาจารย์
├── docs/                              # เอกสารทางเทคนิคและสถาปัตยกรรม
├── INSTALLATION_GUIDE.md              # คู่มือการติดตั้งระบบฉบับสมบูรณ์
└── README.md                          # เอกสารนี้
```

---

## 📦 การส่งมอบโครงงาน (Deliverables)

สคริปต์บีบอัด Source Code สำหรับส่งอาจารย์:
```cmd
scripts\package_source_code.bat
```
*(จะคัดแยกเฉพาะโค้ดที่จำเป็น โดยตัด `node_modules` และ `venv` ออก เพื่อให้ไฟล์มีขนาดกะทัดรัดและพร้อมส่งมอบทันที)*
