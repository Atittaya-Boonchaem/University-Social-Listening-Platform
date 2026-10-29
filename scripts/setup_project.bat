@echo off
chcp 65001 >nul
echo =====================================================================
echo  🎓 UP Voice Platform - Project Setup Script
echo  ระบบรับฟังเสียงและแจ้งปัญหา มหาวิทยาลัยพะเยา
echo =====================================================================
echo.

:: 1. Check Python
echo [1/4] ตรวจสอบ Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ Python ในระบบ กรุณาติดตั้ง Python 3.10 ขึ้นไป และติ๊ก 'Add Python to PATH'
    pause
    exit /b 1
)
python --version

:: 2. Check Node.js
echo.
echo [2/4] ตรวจสอบ Node.js ^& npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ Node.js ในระบบ กรุณาติดตั้ง Node.js 18 ขึ้นไป จาก https://nodejs.org
    pause
    exit /b 1
)
call npm --version

:: 3. Setup Backend
echo.
echo [3/4] ติดตั้งระบบ Backend (FastAPI)...
cd backend\university_social_listening

if not exist ".venv" (
    echo -> กำลังสร้าง Virtual Environment (.venv)...
    python -m venv .venv
)

echo -> กำลังเปิดใช้งาน Virtual Environment และติดตั้ง dependencies...
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

if not exist ".env" (
    echo -> กำลังคัดลอกไฟล์ .env จาก .env.example...
    copy .env.example .env >nul
)
cd ..\..

:: 4. Setup Frontend Packages
echo.
echo [4/4] ติดตั้ง Node modules สำหรับ Frontend...

echo -> ติดตั้ง Public Web (up_voice_public_web)...
cd frontend\up_voice_public_web
if not exist ".env" (
    copy .env.example .env >nul
)
call npm install
cd ..\..

echo -> ติดตั้ง Admin Dashboard (up_voice_admin_dashboard)...
cd frontend\up_voice_admin_dashboard
if not exist ".env" (
    copy .env.example .env >nul
)
call npm install
cd ..\..

echo -> ติดตั้ง Executive Dashboard (up_voice_executive_dashboard)...
cd frontend\up_voice_executive_dashboard
if not exist ".env" (
    copy .env.example .env >nul
)
call npm install
cd ..\..

echo.
echo =====================================================================
echo  🎉 การติดตั้ง Dependencies เสร็จสิ้นสมบูรณ์!
echo.
echo  ขั้นตอนถัดไป:
echo   1. ตรวจสอบและแก้ไขฐานข้อมูลใน backend\university_social_listening\.env
echo   2. สั่งรันสคริปต์เตรียมฐานข้อมูล:
echo      cd backend\university_social_listening
echo      .venv\Scripts\activate
echo      python scripts\init_demo_database.py
echo   3. รันระบบทั้งหมดด้วยคำสั่ง: scripts\start_all.bat
echo =====================================================================
echo.
pause
