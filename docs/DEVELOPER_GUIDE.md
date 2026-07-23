# 📘 คู่มือนักพัฒนา (Developer Cheat Sheet)
คู่มือนี้จัดทำขึ้นเพื่อให้ทีมพัฒนา หรือผู้ที่มารับช่วงต่อ (รวมถึงใช้สำหรับนำเสนออาจารย์) สามารถทำความเข้าใจ **โครงสร้างของระบบทั้งหมด** ได้อย่างรวดเร็ว โดยอธิบายด้วยภาษาที่เข้าใจง่าย แบ่งตามระบบหลักๆ ของแอปพลิเคชัน

---

## 1. 🔐 ระบบยืนยันตัวตนและการล็อกอิน (Authentication & SSO Flow)
ระบบนี้จัดการการเข้าสู่ระบบทั้งหมด ทั้งบัญชีนิสิต บุคลากร บุคคลทั่วไป การเข้าแบบไม่ระบุตัวตน (Guest) และการเชื่อมต่อกับระบบ SSO ของมหาวิทยาลัย (Microsoft Entra ID)

* **ไฟล์ที่เกี่ยวข้อง:**
  * **Backend:** `app/routers/auth.py` (จัดการ API ลงทะเบียน, ล็อกอิน, สร้าง JWT Token)
  * **Frontend:** `up_voice_public_web/src/pages/LoginPage.tsx` (หน้าจอ UI)

* **💡 วิธีการแก้ไข (Modification Scenarios):**
  * **ถ้าอาจารย์ต้องการเปลี่ยนปุ่ม SSO ไปใช้ Google แทน ➔** ให้ไปที่ไฟล์ Backend `app/routers/auth.py` (ค้นหาฟังก์ชัน `sso_login`) เปลี่ยน URL จาก `login.microsoftonline.com` เป็น URL ของ Google OAuth2 และเปลี่ยนค่า Client ID ใน `.env`
  * **ถ้าต้องการเก็บข้อมูลผู้ใช้เพิ่มตอนล็อกอิน (เช่น คณะ, สาขา) ➔** ให้ไปที่ `app/routers/auth.py` ฟังก์ชัน `login` ตรงส่วนที่เขียนว่า `profile = { ... }` เพื่อยัดข้อมูลเพิ่มลงไปใน Token/Response จากนั้นไปอัปเดตฝั่ง Frontend ที่ `LoginPage.tsx` ฟังก์ชัน `LS.saveUser` ให้บันทึกข้อมูลนั้นลง `localStorage`

---

## 2. 🛡️ ระบบจัดการสิทธิ์และการเข้าถึง (Role Management)
ระบบนี้คอยควบคุมว่าใครสามารถเข้าถึงหน้าไหนได้บ้าง หรือเห็นปุ่มอะไรบ้าง (Role มี 6 ระดับ: Student=1, Staff=2, Public=3, SuperAdmin=4, CategoryAdmin=5, Anonymous=6)

* **ไฟล์ที่เกี่ยวข้อง:**
  * **Backend:** `app/routers/users.py`, `app/models.py`, `app/schemas.py`
  * **Frontend (Public):** `up_voice_public_web/src/pages/ProfilePage.tsx`
  * **Frontend (Admin):** `up_voice_admin_dashboard/src/pages/Login.jsx`

* **💡 วิธีการแก้ไข (Modification Scenarios):**
  * **ถ้าอาจารย์ต้องการสร้างสิทธิ์ใหม่ (เช่น สิทธิ์ "ศิษย์เก่า") ➔** ต้องเริ่มแก้ที่ Backend ก่อน โดยไปสร้างตารางใหม่ใน `app/models.py` จากนั้นไปเพิ่มสิทธิ์นี้ใน `app/schemas.py` และ `auth.py`
  * **ถ้าต้องการซ่อนเมนูบางอย่างจากนิสิตในฝั่งหน้าเว็บ ➔** ไปที่ Frontend หาไฟล์ UI นั้นๆ (เช่น Sidebar) เช็คค่า `roleId` จาก `localStorage` แล้วใช้คำสั่ง `if (roleId !== 1)` ครอบปุ่มนั้นไว้

---

## 3. 📝 ระบบแจ้งปัญหาและวิเคราะห์เนื้อหาด้วย AI (Problem Reporting System)
ระบบฟอร์มสำหรับแจ้งปัญหา มีการจัดการอัปโหลดรูปภาพ การซ่อนตัวตนผู้แจ้ง และการใช้ AI เข้ามาช่วยวิเคราะห์ข้อความ (เช่น กรองคำหยาบ และแนะนำหมวดหมู่อัตโนมัติ)

* **ไฟล์ที่เกี่ยวข้อง:**
  * **Backend:** `app/routers/problems.py` (ฟังก์ชัน `create_problem`), `app/services/ai_service.py`
  * **Frontend:** ฟอร์มแจ้งปัญหาในแอป Public Web

* **💡 วิธีการแก้ไข (Modification Scenarios):**
  * **ถ้าอาจารย์อยากให้เพิ่มฟิลด์ "พิกัดที่เกิดเหตุแบบละเอียด (ละติจูด/ลองจิจูด)" ลงในฟอร์ม ➔** ไปแก้ Backend ให้รับค่าตัวแปรนี้ที่ `problems.py` (ตอน insert ข้อมูล) จากนั้นมาเพิ่ม Input Field ในฟอร์มฝั่ง Frontend แล้วจับยัดใส่ API Payload
  * **ถ้าต้องการปิดระบบ AI กรองคำหยาบคายชั่วคราว ➔** ไปที่ไฟล์ `problems.py` ค้นหาฟังก์ชัน `create_problem` และทำการ Comment โค้ดบรรทัดที่เรียกใช้ฟังก์ชัน `check_profanity()` ทิ้งไป

---

## 4. 📰 ระบบฟีดและการแสดงโพสต์ (Home Feed & Display)
ระบบดึงข้อมูลปัญหามาแสดงผลในหน้าแรก มีฟังก์ชันการกรอง (Filter) ตามหมวดหมู่ แบ่งแท็บระหว่าง ฟีดสาธารณะ และ ฟีดข่าวสารภายใน รวมถึงการกดโหวต (Upvote)

* **ไฟล์ที่เกี่ยวข้อง:**
  * **Backend:** `app/routers/problems.py` (ฟังก์ชัน `list_problems`)
  * **Frontend:** `up_voice_public_web/src/pages/HomeFeed.tsx`

* **💡 วิธีการแก้ไข (Modification Scenarios):**
  * **ถ้าอาจารย์อยากให้นิสิตมองเห็นโพสต์แบบ "ข่าวสารภายใน (Internal)" ได้ด้วย ➔** ไปที่ Backend `app/routers/problems.py` ในฟังก์ชัน `list_problems` ค้นหาตรงส่วน `Visibility gate` แล้วนำเงื่อนไขที่กีดกันผู้ใช้ทั่วไปออก (เอา `if not is_privileged:` ออก)
  * **ถ้าต้องการเปลี่ยนสีพื้นหลังหรือหน้าตาการ์ดในหน้าฟีด ➔** ให้ไปแก้ที่ Frontend `HomeFeed.tsx` ตรงส่วนที่มีคำสั่งแสดงผล `div` ของการ์ด และแก้ไขคลาส Tailwind CSS

---

## 5. 📊 ระบบ Dashboard และสถิติ (Data Visualization)
ระบบแสดงผลข้อมูลในฝั่งแอดมิน (Super Admin & Category Admin) ประกอบไปด้วยกราฟ แผนที่แสดงพิกัดปัญหา (Heatmap) และตัวเลขสถิติต่างๆ

* **ไฟล์ที่เกี่ยวข้อง:**
  * **Backend:** `app/routers/problems.py` (ค้นหา Endpoint ที่ขึ้นต้นด้วย `/analytics/...`)
  * **Frontend:** `up_voice_admin_dashboard/src/pages/Dashboard.jsx` และ `Reports.jsx`

* **💡 วิธีการแก้ไข (Modification Scenarios):**
  * **ถ้าอาจารย์อยากได้กราฟวงกลมแสดงสัดส่วนปัญหาที่แก้เสร็จแล้ว vs ยังไม่แก้ ➔** ไปเขียน API ดึงข้อมูลสถิติใหม่ที่ Backend `problems.py` ภายใต้ Route `/analytics` จากนั้นไปที่ Frontend `Dashboard.jsx` นำเข้า Component กราฟจากไลบรารีอย่าง `recharts` มาเชื่อมต่อกับ API นั้น
  * **ถ้าจุดบนแผนที่ (Map) ไม่ขึ้นหรือแสดงผิดพิกัด ➔** ตรวจสอบ API ว่าส่งค่า `latitude` และ `longitude` ออกมาครบไหม และตรวจสอบใน Frontend (เช่น `react-leaflet`) ว่าดึงค่าตัวแปรมาใส่ถูกชื่อหรือไม่

---

## 6. 👮 ระบบสำหรับผู้ดูแลระบบ (Super Admin Systems)
ระบบหลังบ้านสำหรับเจ้าหน้าที่ระดับสูงสุด ใช้จัดการข้อมูลผู้ใช้ จัดการปัญหาที่ถูก Report และตรวจสอบประวัติการทำงานของระบบ (Audit Logs)

* **ไฟล์ที่เกี่ยวข้อง:**
  * **Backend:** `app/routers/users.py`, `app/routers/audit.py`
  * **Frontend:** `up_voice_admin_dashboard/src/pages/UserManagement.jsx`, `ManageProblems.jsx`

* **💡 วิธีการแก้ไข (Modification Scenarios):**
  * **ถ้าอาจารย์ต้องการตรวจสอบว่าใครเป็นคนลบโพสต์ไปเมื่อวาน ➔** ระบบนี้มีบันทึกไว้อยู่แล้ว! สามารถตรวจสอบได้ที่หน้า System Logs หรือให้แอดมินเรียก API `get_system_audit_logs` จากไฟล์ `audit.py`
  * **ถ้าอยากเพิ่มปุ่มแบนผู้ใช้ (Ban User) ➔** ไปที่ Backend `users.py` สร้าง API สร้างคำสั่ง Update ฐานข้อมูลให้ `is_active = False` และไปที่ Frontend `UserManagement.jsx` เพื่อเพิ่มปุ่มกดสั่งแบนในตารางรายชื่อ
