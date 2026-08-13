# UP AI Chat Only — เริ่มโปรเจกต์ใหม่จากศูนย์

โปรเจกต์นี้มีเฉพาะ "แชท AI รวบรวมข้อมูลแจ้งปัญหา" ก่อน
ยังไม่มีฐานข้อมูล, ระบบ Login, ระบบ Ticket, Dashboard หรือแผนที่

## โครงสร้าง

```text
up-ai-chat-only/
├─ backend/
│  ├─ main.py
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  ├─ package.json
│  ├─ index.html
│  ├─ .env.example
│  └─ src/
│     ├─ App.tsx
│     ├─ main.tsx
│     └─ styles.css
└─ README.md
```

## สิ่งที่ต้องติดตั้งก่อน

1. Python 3.11 หรือใหม่กว่า
2. Node.js 20 หรือใหม่กว่า
3. API Key ของ Typhoon ถ้าต้องการใช้ LLM จริง

## 1. เปิด Backend

เปิด Terminal ที่โฟลเดอร์ `backend`

### Windows

```powershell
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

เปิด `.env` แล้วใส่:

```env
TYPHOON_API_KEY=YOUR_REAL_API_KEY
TYPHOON_MODEL=typhoon-v2.5-30b-a3b-instruct
```

จากนั้น:

```powershell
uvicorn main:app --reload --port 8000
```

ถ้าสำเร็จจะเห็นประมาณ:

```text
Uvicorn running on http://127.0.0.1:8000
```

ทดสอบเปิด:

```text
http://localhost:8000/
```

ควรเห็น:

```json
{"ok":true,"service":"UP AI Chat Only"}
```

## 2. เปิด Frontend

เปิด Terminal อีกหน้าหนึ่ง แล้วเข้าโฟลเดอร์ `frontend`

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Vite จะบอก URL เช่น:

```text
http://localhost:5173
```

เปิด URL นั้นใน Browser

## 3. Flow ที่ต้องทดสอบ

พิมพ์:

```text
เก้าอี้บางตัวในห้องเรียนเสียงดังเวลาใช้งาน ทำให้รบกวนการเรียนการสอน
```

AI ต้องถาม:

```text
รับทราบปัญหาแล้วครับ แต่ตอนนี้ยังระบุจุดเกิดเหตุไม่ได้ชัดเจน
ขอชื่อคณะ/อาคาร และหมายเลขห้องที่เกิดปัญหาด้วยครับ
เช่น อาคาร ICT ห้อง 1102
```

พิมพ์:

```text
ห้อง 1102
```

AI ต้องถามต่อ:

```text
รับทราบหมายเลขห้องแล้วครับ ขอชื่อคณะหรืออาคารของห้องนี้เพิ่มเติมด้วยครับ
```

พิมพ์:

```text
อาคาร ICT
```

จึงจะสร้าง:

```text
พบปัญหาเก้าอี้บางตัวมีเสียงดังขณะใช้งาน ณ อาคาร ICT ห้อง 1102
ส่งผลรบกวนการเรียนการสอน จึงขอแจ้งเจ้าหน้าที่เข้าตรวจสอบและแก้ไข
```

## สำคัญ

ถ้าไม่ใส่ `TYPHOON_API_KEY` ระบบยังสามารถทำงานด้วย fallback แบบ rule-based ได้
แต่จะไม่ใช่ LLM จริง

Backend จะเป็นคนตรวจว่า:
- ปัญหาคืออะไร
- ถ้าเป็นปัญหาในห้อง ต้องรู้ "อาคาร/คณะ"
- ต้องรู้ "เลขห้อง"
- ข้อมูลยังไม่ครบ = ห้ามสร้าง description

Frontend จะไม่ใส่ข้อความลง "รายละเอียดปัญหา" จนกว่า Backend จะส่ง:
`is_complete=true` และ `ready_for_ticket=true`

## หากแก้โค้ด

Backend:
```text
backend/main.py
```

Frontend:
```text
frontend/src/App.tsx
frontend/src/styles.css
```
