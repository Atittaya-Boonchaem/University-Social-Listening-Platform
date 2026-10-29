@echo off
chcp 65001 >nul
echo =====================================================================
echo  🚀 UP Voice Platform - Starting All Services...
echo =====================================================================
echo.

:: Get workspace directory
set "ROOT_DIR=%~dp0.."

:: 1. Start Backend Server
echo [1/3] กำลังเริ่ม Backend Server (FastAPI Port 8000)...
start "UP Voice Backend (FastAPI)" cmd /k "cd /d "%ROOT_DIR%\backend\university_social_listening" && if exist .venv\Scripts\activate (call .venv\Scripts\activate) else (if exist venv\Scripts\activate call venv\Scripts\activate) && python -m uvicorn app.main:app --reload --port 8000"

:: 2. Start Admin Dashboard
echo [2/3] กำลังเริ่ม Admin Dashboard (Port 5173)...
start "UP Voice Admin Dashboard (Port 5173)" cmd /k "cd /d "%ROOT_DIR%\frontend\up_voice_admin_dashboard" && npm run dev"

:: 3. Start Public Web
echo [3/3] กำลังเริ่ม Public Web (Port 5174)...
start "UP Voice Public Web (Port 5174)" cmd /k "cd /d "%ROOT_DIR%\frontend\up_voice_public_web" && npm run dev"

echo.
echo =====================================================================
echo  กำลังรอ 5 วินาทีเพื่อให้เซอร์วิสทั้งหมดพร้อมทำงาน...
echo =====================================================================
timeout /t 5 >nul

:: Open browser tabs
echo กำลังเปิดหน้าเว็บในเบราว์เซอร์...
start http://localhost:5174
start http://localhost:5173
start http://localhost:8000/docs

echo.
echo =====================================================================
echo  ✅ ระบบเปิดทำงานเรียบร้อยแล้ว!
echo.
echo  - Public Web (นิสิต/ประชาชน) : http://localhost:5174
echo  - Admin Dashboard (เจ้าหน้าที่) : http://localhost:5173
echo  - API Swagger Docs         : http://localhost:8000/docs
echo.
echo  🔑 บัญชีทดสอบสำหรับล็อกอิน:
echo    - Super Admin    : superadmin@up.ac.th       (Pass: 123456)
echo    - Facilities Admin: admin.facilities@up.ac.th(Pass: 123456)
echo    - Student User   : student@up.ac.th         (Pass: 123456)
echo =====================================================================
echo.
pause
