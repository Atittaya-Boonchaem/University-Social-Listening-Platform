# 🎓 University Social Listening Platform - Complete Setup Guide

## 📋 Project Overview

**University Social Listening Platform** เป็นระบบแบบครบวงจรสำหรับรับฟังและวิเคราะห์ปัญหาภายในมหาวิทยาลัย 

### 🎯 ขอบเขตหลัก:
1. **Reporting System** - นิสิต/บุคลากร/บุคคลทั่วไป สามารถแจ้งปัญหาได้
2. **AI Analysis** - ตรวจสอบคำหยาบ, จัดหมวดหมู่, สกัดพิกัด
3. **Status Tracking** - เจ้าหน้าที่อัปเดตสถานะการแก้ไข
4. **Analytics Dashboard** - Heat Map, Time Series, Clustering Analysis
5. **Privacy & Security** - Role-based access, Encryption, Audit logs

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend (Mobile)** | Flutter |
| **Backend/API** | FastAPI (Python) |
| **Database** | MySQL |
| **AI/NLP** | Ollama (Local LLM) |
| **Analytics** | Scikit-learn (K-Means) |
| **Image Processing** | OpenCV, Pillow |
| **Deployment** | Docker, On-premise Server |

---

## 📥 Installation & Setup

### 1️⃣ Prerequisites

```bash
# Required software
- Docker & Docker Compose
- Python 3.9+
- Node.js (optional, for frontend build)
- MySQL 8.0+ (or use Docker)
- Flutter SDK (latest stable)
- Git

# Check versions
docker --version
python --version
mysql --version
```

### 2️⃣ Backend Setup (FastAPI + Database)

#### 🐳 Using Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/your-org/university-social-platform.git
cd university_social_platform

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# DB_PASSWORD=your_secure_password
# SECRET_KEY=your_secret_key_here

# Start services (MySQL + Ollama + Backend)
docker-compose up -d

# Verify containers running
docker ps

# Check backend health
curl http://localhost:8000/health

# View API docs
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

#### 📝 Manual Setup (Local Development)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database
mysql -u root -p < 01_database_schema.sql

# Run migrations (if using Alembic)
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3️⃣ Ollama Setup (Local LLM)

```bash
# Install Ollama (from https://ollama.ai)
# or use Docker image

# Pull neural-chat model
docker exec <ollama_container> ollama pull neural-chat

# Or manually
ollama pull neural-chat

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

### 4️⃣ Frontend Setup (Flutter)

```bash
# Navigate to flutter app directory
cd university_social_app

# Get dependencies
flutter pub get

# Setup environment
cp .env.example .env
# Edit .env with backend API URL

# Run on Android emulator
flutter run -d emulator-5554

# Run on iOS simulator (macOS only)
flutter run -d iphone

# Build for production
flutter build apk      # Android
flutter build ios      # iOS (macOS only)
```

---

## 🚀 Running the Application

### Local Development

```bash
# Terminal 1: Start Docker services
docker-compose up

# Terminal 2: Start FastAPI (if not using Docker)
python -m uvicorn app.main:app --reload

# Terminal 3: Run Flutter app
cd university_social_app
flutter run

# Access points:
# - Flutter App: http://localhost:8081 (if running on web)
# - Backend API: http://localhost:8000
# - API Documentation: http://localhost:8000/docs
# - MySQL: localhost:3306
# - Ollama: http://localhost:11434
```

### Production Deployment

```bash
# Build Docker images
docker-compose build

# Deploy to server
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose logs -f backend
docker-compose logs -f mysql

# Backup database
docker exec <mysql_container> \
  mysqldump -u root -p<password> university_social_listening > backup.sql
```

---

## 🔐 Security Checklist

### Before Production:

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Update CORS origins (remove `*`)
- [ ] Enable HTTPS/TLS
- [ ] Set strong `DB_PASSWORD`
- [ ] Enable rate limiting
- [ ] Setup email verification
- [ ] Enable 2FA for admin accounts
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity
- [ ] Update dependencies regularly

### Important:

```
❌ NEVER store Email/Phone in images table
❌ NEVER commit .env with real credentials
❌ NEVER use DEBUG=True in production
❌ NEVER allow CORS from * in production
```

---

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/register/student
POST   /api/v1/auth/register/staff
POST   /api/v1/auth/register/public
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
```

### Problems (Issues)
```
POST   /api/v1/problems/create          # 🔥 Create new problem
GET    /api/v1/problems/list            # List all problems
GET    /api/v1/problems/{id}            # Get problem detail
PATCH  /api/v1/problems/{id}/status    # Update status
DELETE /api/v1/problems/{id}            # Delete problem
```

### Images
```
POST   /api/v1/images/upload            # Upload image
GET    /api/v1/images/{id}              # Get image
DELETE /api/v1/images/{id}              # Delete image
```

### Admin & Analytics
```
GET    /api/v1/admin/dashboard         # Dashboard stats
GET    /api/v1/admin/heatmap           # Location heatmap
GET    /api/v1/analytics/trends        # Problem trends
GET    /api/v1/analytics/clustering    # User clustering
```

---

## 🧪 Testing

### Backend Tests

```bash
# Unit tests
pytest tests/unit/

# Integration tests
pytest tests/integration/

# Coverage report
pytest --cov=app tests/

# Test specific endpoint
pytest tests/test_problems.py::test_create_problem
```

### Frontend Tests

```bash
# Unit tests
flutter test test/unit/

# Widget tests
flutter test test/widget/

# Integration tests
flutter test integration_test/
```

---

## 📊 Database Schema Overview

### Core Tables:

1. **users** - ผู้ใช้งาน (นิสิต/บุคลากร/บุคคลทั่วไป)
2. **problems** - ปัญหาที่รายงาน
3. **problem_categories** - หมวดหมู่ปัญหา
4. **buildings** - ตึก/อาคาร
5. **images** - ภาพถ่าย (⚠️ ห้ามเก็บ Email/Phone)
6. **upvotes** - เห็นด้วย
7. **status_updates** - อัปเดตสถานะ
8. **nlp_analysis** - ผลการวิเคราะห์ (Ollama)
9. **user_clusters** - ผลการ Clustering
10. **audit_logs** - บันทึกการตรวจสอบ

ดูรายละเอียด: [01_database_schema.sql](01_database_schema.sql)

---

## 🤖 AI/ML Features

### 1. NLP Analysis (Ollama)
- **Categorization**: จัดหมวดหมู่ปัญหา
- **Toxicity Detection**: ตรวจสอบคำหยาบ
- **Time Extraction**: สกัดเวลาเกิดเหตุ

### 2. Image Processing
- **Location Extraction**: ดึงพิกัดจากรูปภาพ
- **OCR**: อักษรรู้จำ (ถ้าจำเป็น)
- **Data Sanitization**: ลบข้อมูลส่วนตัว

### 3. Clustering (K-Means)
- **User Behavior Clustering**: จัดกลุ่มพฤติกรรมผู้ใช้
- **Risk Assessment**: ประเมินความเสี่ยง

### 4. Predictive Analytics
- **Problem Forecasting**: คาดการณ์ปัญหาในอนาคต
- **Trend Analysis**: วิเคราะห์แนวโน้ม

---

## 📱 Flutter App Structure

### Screens:
1. **Login** - เข้าระบบ (นิสิต/บุคลากร/บุคคลทั่วไป)
2. **Home Feed** - ดูปัญหาทั้งหมด
3. **Create Problem** - แจ้งปัญหา
4. **Problem Detail** - ดูรายละเอียด
5. **Admin Dashboard** - สำหรับ Admin
6. **Profile** - ข้อมูลผู้ใช้

### Key Features:
- ✅ Google Maps integration
- ✅ Image capture & upload
- ✅ Location services
- ✅ Offline support (cached)
- ✅ Internationalization (TH/EN)
- ✅ Dark mode support

---

## 🐛 Troubleshooting

### Ollama Connection Error
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
docker restart <ollama_container>

# Or reinstall
ollama serve
```

### Database Connection Error
```bash
# Check MySQL is running
docker ps | grep mysql

# View logs
docker logs <mysql_container>

# Rebuild and restart
docker-compose down
docker-compose up -d mysql
```

### Flutter Build Error
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter pub upgrade

# For specific platform
flutter clean --no-shrink
flutter run
```

### API 500 Error
```bash
# Check backend logs
docker logs <backend_container>

# Verify database is healthy
docker exec <mysql_container> mysql -u root -p<password> -e "SELECT 1"

# Restart backend
docker restart <backend_container>
```

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `01_database_schema.sql` | MySQL Database Schema |
| `02_project_structure.md` | Backend Project Structure |
| `03_app_main.py` | FastAPI Configuration |
| `04_models.py` | SQLAlchemy ORM Models |
| `05_schemas.py` | Pydantic Request/Response Schemas |
| `06_ollama_service.py` | Ollama NLP Service |
| `07_problems_router.py` | Problems API Endpoints |
| `08_flutter_structure.md` | Flutter Project Structure |
| `09_flutter_login_screen.dart` | Flutter Login UI |
| `README.md` | This file |

---

## 👥 Team & Roles

### Development Team:
- **Backend Developer**: FastAPI, Python, Database design
- **Mobile Developer**: Flutter, UI/UX, API integration
- **DevOps Engineer**: Docker, Server deployment
- **AI/ML Engineer**: Ollama setup, NLP/Clustering models

### Project Manager:
- Monitor timeline & deliverables
- Coordinate with stakeholders
- Handle scope changes

---

## 📅 Project Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Planning & Design** | Week 1-2 | Requirements, DB schema, API design |
| **Backend Development** | Week 3-5 | FastAPI setup, Auth, Problem endpoints |
| **Frontend Development** | Week 3-6 | Flutter UI, API integration |
| **AI & Analytics** | Week 5-6 | Ollama setup, Clustering, Predictions |
| **Testing & QA** | Week 7 | Unit tests, Integration tests, UAT |
| **Deployment** | Week 8 | Production deployment, Documentation |

---

## 💬 Support & Contact

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See `/docs` folder
- **Questions**: Post in Discussion board
- **Email**: support@university.ac.th

---

## 📄 License

MIT License - See LICENSE file

---

## ✅ Checklist Before Launch

- [ ] All tests passing (100% coverage)
- [ ] API documentation complete
- [ ] Flutter app tested on devices
- [ ] Database backed up
- [ ] Security audit completed
- [ ] Performance tested (load test)
- [ ] User documentation ready
- [ ] Training completed for staff
- [ ] Monitoring & alerting setup
- [ ] Disaster recovery plan ready

---

**Happy coding! 🚀**
