# University Social Listening Platform - Backend Structure

## 📁 โครงสร้างโปรเจกต์

```
university_social_platform/
│
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI main application
│   ├── config.py               # Configuration & Environment
│   ├── database.py             # Database connection & session
│   ├── security.py             # JWT, Password hashing, Authentication
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # User models
│   │   ├── problem.py          # Problem/Post models
│   │   ├── image.py            # Image models
│   │   └── nlp.py              # NLP Analysis models
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py             # Pydantic schemas for users
│   │   ├── problem.py          # Pydantic schemas for problems
│   │   ├── image.py            # Pydantic schemas for images
│   │   └── response.py         # Standard response schemas
│   │
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── user_crud.py        # User CRUD operations
│   │   ├── problem_crud.py     # Problem CRUD operations
│   │   ├── image_crud.py       # Image CRUD operations
│   │   └── upvote_crud.py      # Upvote CRUD operations
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py             # Login, Register endpoints
│   │   ├── problems.py         # Problem posting & retrieval
│   │   ├── images.py           # Image upload & processing
│   │   ├── admin.py            # Admin dashboard endpoints
│   │   └── analytics.py        # Analytics & insights endpoints
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ollama_service.py   # Ollama NLP integration
│   │   ├── image_processor.py  # Image processing & OCR
│   │   ├── clustering_service.py # K-Means clustering
│   │   └── notification_service.py # Email/Push notifications
│   │
│   └── utils/
│       ├── __init__.py
│       ├── validators.py       # Custom validators
│       ├── logger.py           # Logging setup
│       └── helpers.py          # Utility functions
│
├── tests/
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_problems.py
│   └── test_nlp.py
│
├── requirements.txt
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 📦 Dependencies (requirements.txt)

```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pymysql==1.1.0
pydantic==2.4.2
pydantic-settings==2.0.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pillow==10.0.1
scikit-learn==1.3.2
numpy==1.24.3
opencv-python==4.8.1.78
requests==2.31.0
aiofiles==23.2.1
python-dotenv==1.0.0
pytz==2023.3
```

## 🔧 Environment Setup (.env.example)

```
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=university_social_listening

# JWT
SECRET_KEY=your_super_secret_key_change_me_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=neural-chat

# Image Processing
MAX_IMAGE_SIZE_MB=200
IMAGE_UPLOAD_DIR=./uploads/images

# Server
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"]
```

## 🐳 Docker Compose Setup

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: university_social_listening
    volumes:
      - mysql_data:/var/lib/mysql
      - ./01_database_schema.sql:/docker-entrypoint-initdb.d/init.sql

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    command: serve

  backend:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - mysql
      - ollama
    environment:
      - DB_HOST=mysql
      - OLLAMA_HOST=http://ollama:11434
    volumes:
      - ./uploads:/app/uploads

volumes:
  mysql_data:
  ollama_data:
```

---

## ⚡ ใช้ Docker Compose เพื่อรัน

```bash
# Clone project
git clone <repo_url>
cd university_social_platform

# Setup environment
cp .env.example .env

# Run containers
docker-compose up -d

# Pull Ollama model
docker exec <ollama_container> ollama pull neural-chat

# Run migrations (if needed)
docker exec <backend_container> alembic upgrade head

# API will be available at http://localhost:8000
# Swagger docs: http://localhost:8000/docs
```
