# UP Voice Admin Dashboard

## 1. Project Overview
UP Voice is a comprehensive platform designed for university social listening and problem reporting. This repository contains the **FastAPI Backend** and the **React Admin Dashboard**. The system allows users (students, staff, and the general public) to report issues around the campus, while administrators can track, manage, and analyze these reports in real-time through a modern, responsive web dashboard.

## 2. Tech Stack
- **Backend**: Python 3, FastAPI, SQLAlchemy (ORM)
- **Frontend (Admin Dashboard)**: React.js, Vite, Tailwind CSS, Recharts
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens) & bcrypt

## 3. Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Python** (3.8 or higher)
- **Node.js** (v16 or higher) & **npm**
- **MySQL Server** (8.0 or higher) and a client like **MySQL Workbench** or DBeaver
- **Git**

## 4. Installation
Follow these steps to set up the project locally.

### Clone the Repository
```bash
git clone <repository-url>
cd university_social_listening
```

### Backend Setup (FastAPI)
1. Create and activate a virtual environment:
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate
   
   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure Environment Variables:
   - Create a `.env` file in the `app` directory.
   - Add your database connection string and JWT secret. Example:
     ```env
     DATABASE_URL=mysql+pymysql://root:password@localhost:3306/university_social_listening
     SECRET_KEY=your_super_secret_key
     ALGORITHM=HS256
     ```

### Frontend Setup (React Admin Dashboard)
1. Navigate to the frontend directory:
   ```bash
   cd ../up_voice_admin_dashboard
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```

## 5. Database Setup
1. Open **MySQL Workbench** (or your preferred client).
2. Create a new database named `university_social_listening`:
   ```sql
   CREATE DATABASE university_social_listening CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import the initial database schema using the provided SQL file (e.g., `01_database_schema.sql`).
4. **CRITICAL STEP**: You must run the migration script to apply the latest architectural improvements (like the `roles` table, precise GPS coordinates, and upvote triggers). 
   - Open and execute the `migration_v2.sql` script located in your project artifacts/scripts directory against the database. This ensures the dashboard's analytics and features work correctly.

## 6. How to Run

You will need two terminal windows open to run the full stack.

### Start the FastAPI Backend
Open a terminal in the `university_social_listening` directory (ensure your virtual environment is active):
```bash
python -m uvicorn app.main:app --reload --port 8000
```
- The API will be available at `http://localhost:8000/api/v1`
- Swagger UI Documentation: `http://localhost:8000/docs`

### Start the React Frontend
Open a new terminal in the `up_voice_admin_dashboard` directory:
```bash
npm run dev
```
- The Admin Dashboard will be available at `http://localhost:5173`

## 7. Architecture Structure

Here is a brief overview of how the project is organized:

```
├── university_social_listening/       # Backend (FastAPI)
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point, CORS config, and router aggregation
│   │   ├── models.py                  # SQLAlchemy Database Models (Tables)
│   │   ├── schemas.py                 # Pydantic Schemas for Request/Response validation
│   │   ├── routers/                   # API Endpoints (problems, auth, users, etc.)
│   │   └── services/                  # Business logic (e.g., AI integration, external APIs)
│   ├── requirements.txt               # Python dependencies
│   └── .env                           # Backend environment variables (DB URL, Secrets)
│
└── up_voice_admin_dashboard/          # Frontend (React + Vite)
    ├── src/
    │   ├── App.jsx                    # React Router configuration
    │   ├── components/                # Reusable UI components (StatCards, Sidebar, Navbar, Charts)
    │   ├── pages/                     # Full page views (Dashboard, ManageProblems, Reports, Login)
    │   └── services/                  # Axios API client setup and interceptors
    ├── package.json                   # Node dependencies and scripts
    └── vite.config.js                 # Vite bundler configuration
```