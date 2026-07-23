# 🚀 Project Handover: University Social Listening Platform (UP Voice)

> **Document Version:** 1.0  
> **Generated Date:** 2026-07-06  
> **Source:** Full codebase analysis of `d:\UP\min_app`  
> **Target Audience:** External Vendors, Incoming Developers  
> **Production Backend URL:** `https://university-social-listening-platform.onrender.com`  
> **Admin Dashboard (Netlify):** `https://up-social-listening.netlify.app`

---

## ⚠️ CRITICAL NOTICES FOR THE INCOMING VENDOR

> **[NOTICE 1 — Credentials Exposed]**  
> The file `university_social_listening/.env` contains **live database credentials** for an Aiven Cloud MySQL instance. These credentials are committed to the repository. **Rotate them immediately** before any new team member accesses the codebase.

> **[NOTICE 2 — Dead Code Pattern]**  
> Both `app/main.py` and `lib/navigation/main_navigation_screen.dart` contain the full implementation block **twice**: first as a commented-out version and then as the active live code. This is a sign that the codebase was iteratively evolved in-place. Do not delete the commented blocks without first confirming they are truly redundant.

> **[NOTICE 3 — Database Mismatch]**  
> The planned SQL schema (`01_database_schema.sql`) describes a significantly richer database than what is actually implemented in `app/models.py`. See Section 4 for the full gap analysis.

---

## 1. 📁 Workspace Architecture

### Overview

The workspace is structured as a **monorepo** containing three completely independent sub-projects under `d:\UP\min_app\`:

```
min_app/
├── university_social_app/          # 🟣 Flutter Mobile Application (User-facing)
├── university_social_listening/    # 🐍 FastAPI Backend + Database (API Server)
└── up_voice_admin_dashboard/       # ⚛️  React + Vite Web Dashboard (Admin-facing)
```

All three projects are **decoupled** — they do not share code. They communicate exclusively through the backend's REST API.

---

### 1.1 `university_social_app/` — Flutter Mobile Application

- **Who uses it:** University students (role 1), university staff (role 2), and members of the public (role 3).
- **Purpose:** The primary user-facing mobile app. Users can report problems (posts), browse a public feed, upvote reports from others, track the status of their own submissions, and manage their profile.
- **Platform:** Flutter (cross-platform: Android, iOS, Web, Windows, Linux, macOS targets are all present).
- **Communication:** Makes direct HTTP REST calls to the FastAPI backend. The production base URL is hardcoded in the service files: `https://university-social-listening-platform.onrender.com/api/v1`.

---

### 1.2 `university_social_listening/` — FastAPI Backend

- **Who uses it:** Nobody directly — it's the server. All three clients (mobile app, admin dashboard, and any future integrations) consume its REST API.
- **Purpose:** Serves as the single source of truth for all data. Handles authentication, problem CRUD, user management, analytics aggregation, image file uploads, and contains the Ollama LLM service integration.
- **Communication:** Exposes a REST API on port `8000`. CORS is configured to allow requests from `localhost:5173` (admin dev server) and the Netlify production URL.
- **Database:** MySQL (production on Aiven Cloud). Also ships with a local SQLite file (`university_social.db`) which appears to be a legacy development artifact.
- **LLM:** Integrates with a local [Ollama](https://ollama.com) instance at `http://localhost:11434` for NLP analysis (toxic content detection, auto-categorization, time-context extraction).

---

### 1.3 `up_voice_admin_dashboard/` — React + Vite Admin Dashboard

- **Who uses it:** Category Admins (role 2 / Staff) and Super Admins (role 4).
- **Purpose:** A web-based management console. Admins can view analytics dashboards, manage and change the status of problem reports, manage user accounts (ban/unban, promote roles), and generate date-range reports exportable as CSV.
- **Communication:** Uses Axios to call the same production FastAPI backend URL (`https://university-social-listening-platform.onrender.com/api/v1`). JWT token is stored in `localStorage` and injected into every request via an Axios interceptor.

---

### System Interaction Diagram

```
  ┌─────────────────────────┐      REST / HTTP
  │  university_social_app  │ ─────────────────────────────────┐
  │   (Flutter Mobile App)  │                                  ▼
  └─────────────────────────┘             ┌────────────────────────────────────┐
                                          │  university_social_listening        │
  ┌─────────────────────────┐             │  (FastAPI on Render.com / Port 8000)│
  │ up_voice_admin_dashboard│ ──REST──►  │                                    │
  │  (React + Vite on port  │             │  ┌─────────────────────────────┐  │
  │        5173)            │             │  │  MySQL (Aiven Cloud)        │  │
  └─────────────────────────┘             │  │  Database: defaultdb        │  │
                                          │  └─────────────────────────────┘  │
                                          │                                    │
                                          │  ┌─────────────────────────────┐  │
                                          │  │  Ollama (Local, Port 11434) │  │
                                          │  │  Model: neural-chat         │  │
                                          │  └─────────────────────────────┘  │
                                          └────────────────────────────────────┘
```

---

## 2. 🛠️ Tech Stack & Dependencies

### 2.1 Backend — `university_social_listening/`

**Primary Technology:** Python 3.9 / FastAPI

| Category | Technology | Version / Notes |
|---|---|---|
| **Framework** | FastAPI | Latest (from `requirements.txt`) |
| **Server** | Uvicorn | ASGI server |
| **ORM** | SQLAlchemy | v2-style (uses `declarative_base`) |
| **Database** | MySQL 8.0 | Via `pymysql` driver |
| **Data Validation** | Pydantic v2 | Full Pydantic v2 API (`model_validate`, `model_dump`) |
| **Authentication** | JWT (python-jose) | HS256 algorithm; 30-min expiry |
| **Password Hashing** | bcrypt | Via `bcrypt` package directly |
| **File Uploads** | python-multipart | Image uploads stored at `./uploads/images/` |
| **LLM Integration** | Ollama (local) | HTTP calls to `http://localhost:11434/api/generate` |
| **Environment** | python-dotenv | `.env` file loaded at startup |
| **Containerization** | Docker + Docker Compose | MySQL 8.0 + Ollama + Backend services |
| **Static Files** | FastAPI StaticFiles | Serves `/uploads` directory |

**Key Python packages (from `requirements.txt`):**
```
fastapi, uvicorn, sqlalchemy, pymysql, pydantic[email], 
python-jose[cryptography], bcrypt, python-multipart, 
pillow, requests, python-dotenv
```

> **Note:** The planned `02_project_structure.md` also lists `scikit-learn`, `numpy`, `opencv-python`, and `aiofiles` for clustering and image processing — these are **not yet integrated** into the actual codebase.

---

### 2.2 Flutter Mobile App — `university_social_app/`

**Primary Technology:** Flutter / Dart (SDK `>=3.0.0 <4.0.0`)

| Category | Package | Version |
|---|---|---|
| **HTTP Client** | `http` | ^1.6.0 |
| **Advanced HTTP** | `dio` | ^5.3.1 |
| **State Management** | `provider` | ^6.0.0 |
| **State Management** | `riverpod` + `flutter_riverpod` | ^2.3.0 |
| **Local Storage** | `shared_preferences` | ^2.5.5 |
| **Local Cache** | `hive` + `hive_flutter` | ^2.2.3 |
| **Secure Storage** | `flutter_secure_storage` | ^9.0.0 |
| **JWT Decoding** | `jwt_decoder` | ^2.0.1 |
| **Responsive UI** | `flutter_screenutil` | ^5.8.0 |
| **Typography** | `google_fonts` | ^6.0.0 |
| **Internationalization** | `intl` | ^0.18.0 |
| **Maps (Google)** | `google_maps_flutter` | ^2.5.0 |
| **Maps (OSM)** | `flutter_map` + `latlong2` | ^8.3.1 |
| **Geolocation** | `geolocator` | ^9.0.2 |
| **Geocoding** | `geocoding` | ^2.0.5 |
| **Image Picker** | `image_picker` | ^1.0.0 |
| **Permissions** | `permission_handler` | 12.0.3 |
| **Charts** | `fl_chart` | ^1.2.0 |
| **Logging** | `logger` | ^2.0.0 |

> **Important:** Both `provider` and `riverpod`/`flutter_riverpod` are listed as dependencies. This is contradictory — the codebase appears to use neither for global state (auth token is stored directly in `shared_preferences`). The vendor should pick one and standardize.

---

### 2.3 Admin Dashboard — `up_voice_admin_dashboard/`

**Primary Technology:** React 19 + Vite 8 + TailwindCSS 3

| Category | Package | Version |
|---|---|---|
| **Framework** | React + React DOM | ^19.2.7 |
| **Build Tool** | Vite | ^8.1.1 |
| **Routing** | react-router-dom | ^7.18.1 |
| **HTTP Client** | axios | ^1.18.1 |
| **Icons** | lucide-react | ^1.23.0 |
| **Charts** | recharts | ^3.9.1 |
| **Dropdowns** | react-select | ^5.10.2 |
| **Styling** | TailwindCSS | ^3.4.1 (with PostCSS + Autoprefixer) |
| **Linting** | oxlint | ^1.71.0 |

---

## 3. ✅ Current Progress (What is Actually Implemented)

### 3.1 Backend API — Implemented Endpoints

The active API is registered under the prefix `/api/v1`. All responses follow a `StandardResponse` envelope:
```json
{ "success": true, "message": "...", "data": {...}, "timestamp": "..." }
```

#### 🔐 Auth Router — `/api/v1/auth`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/register/student` | Register university student (role_id=1) using student ID + email | No |
| `POST` | `/register/staff` | Register university staff (role_id=2) using staff email | No |
| `POST` | `/register/public` | Register public member (role_id=3) using phone number | No |
| `POST` | `/login` | Unified login (email OR phone + password + optional expected_role_id) | No |
| `PATCH` | `/onboarding` | Update display_name after registration | Yes (Bearer) |

**Authentication Mechanism:**
- JWT tokens signed with HS256. Token payload contains `user_id` and `role_id`.
- Token expiry: 30 minutes (configurable via env var).
- Tokens are stored in `SharedPreferences` on the Flutter side.
- The login endpoint accepts an optional `expected_role_id` to enforce role-specific login screens.
- Super Admin (role_id=4) can log in from any role-specific entry point.

#### 📋 Problems Router — `/api/v1/problems`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/categories` | List all problem categories | No |
| `POST` | `/categories` | Create a new category | Yes |
| `PUT` | `/categories/{id}` | Update category name | Yes |
| `DELETE` | `/categories/{id}` | Delete a category | Yes |
| `GET` | `/buildings` | List all buildings with coordinates | No |
| `POST` | `/buildings` | Create a new building | Yes |
| `PUT` | `/buildings/{id}` | Update building details | Yes |
| `DELETE` | `/buildings/{id}` | Delete a building | Yes |
| `POST` | `/create` | Submit a new problem report (multipart/form-data, supports image upload) | Yes |
| `GET` | `/list` | List problems with pagination, category filter, status filter, visibility filter | Optional |
| `GET` | `/my-problems` | Get all problems posted by the authenticated user | Yes |
| `GET` | `/analytics` | Aggregate stats: totals by status, by category, by role, geo-points | No |
| `GET` | `/analytics/time-series` | Problem counts per day (last 30 days), per-category breakdown | No |
| `GET` | `/analytics/user-reputation` | Top 50 users ranked by posts + upvotes, with reputation label | No |
| `GET` | `/analytics/report` | Date-range report with full problem rows (for CSV export) | No |
| `PATCH` | `/bulk-update` | Bulk-update the status of multiple problems | No |
| `GET` | `/{problem_id}` | Get full detail of a single problem | Optional |
| `PATCH` | `/{problem_id}/status` | Update a single problem's status | Yes |
| `POST` | `/{problem_id}/comments` | Add a comment to a problem | Yes |
| `POST` | `/{problem_id}/upvote` | Toggle upvote on a problem (idempotent) | Yes |
| `DELETE` | `/{problem_id}` | Delete a problem | Yes |

#### 👤 Users Router — `/api/v1/users`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/list` | List all users (Staff/Admin only) | Yes (role 2 or 4) |
| `PATCH` | `/{user_id}/role` | Change a user's role (Super Admin can promote to role 4) | Yes (role 2 or 4) |
| `PATCH` | `/{user_id}/ban` | Toggle ban/unban a user | Yes (role 2 or 4) |

#### 🏥 Health Check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ "status": "healthy", "version": "1.0.0" }` |

---

### 3.2 Flutter Mobile App — Implemented Screens

The app uses a `BottomNavigationBar` with 4 tabs, protected behind a login flow.

| Screen | File | Status | Notes |
|---|---|---|---|
| **Login Screen** | `screens/auth/login_screen.dart` | ✅ Implemented | Role-based login tabs (Student/Staff/Public) |
| **Onboarding Screen** | `screens/auth/onboarding_screen.dart` | ✅ Implemented | Post-registration display name setup |
| **Register Screen** | `screens/auth/register_screen.dart` | ✅ Implemented | Umbrella screen routing to role-specific forms |
| **Student Registration Form** | `screens/auth/student_form.dart` | ✅ Implemented | Student ID, faculty, education level, gender, age |
| **Staff Registration Form** | `screens/auth/staff_form.dart` | ✅ Implemented | Staff email, age, display name |
| **Public Registration Form** | `screens/auth/public_form.dart` | ✅ Implemented | Phone number, relationship to university |
| **Home Screen (Feed)** | `screens/home/home_screen.dart` | ✅ Implemented | Public feed with role-aware visibility filter |
| **Problem Detail Screen** | `screens/home/problem_detail_screen.dart` | ✅ Implemented | Full problem details, upvote, comments |
| **Create Problem Screen** | `screens/problem_posting/create_problem_screen.dart` | ✅ Implemented | Title, description, category, building, image picker, location |
| **Tracking Screen** | `screens/tracking/tracking_screen.dart` | ✅ Implemented | User's own submitted problems with status display |
| **Profile Screen** | `screens/profile/profile_screen.dart` | ✅ Implemented | User profile view, logout |
| **Super Admin Screen** | `super_admin/super_admin_screen.dart` | ✅ Implemented | Admin panel entry point |
| **Category Management** | `super_admin/category_management_screen.dart` | ✅ Implemented | Full CRUD for categories |
| **Building Management** | `super_admin/building_management_screen.dart` | ✅ Implemented | Full CRUD for buildings |
| **Dashboard View** | `super_admin/dashboard_view.dart` | ✅ Implemented | Stats and charts (in-app admin view) |
| **Problems Management** | `super_admin/problems_management_view.dart` | ✅ Implemented | Admin problem list with status control |
| **User Management** | `super_admin/user_management_view.dart` | ✅ Implemented | Ban/unban, role change |
| **System Settings** | `super_admin/system_settings_view.dart` | ✅ Implemented | (Scaffolded, limited functionality) |
| **Main Navigation** | `navigation/main_navigation_screen.dart` | ✅ Implemented | BottomNavBar connecting all 4 main tabs |

**Flutter Services Implemented:**
- `AuthService` — Handles all auth API calls, saves token + user data to `SharedPreferences`.
- `ProblemService` — Handles problem listing, creation (multipart), upvoting.

---

### 3.3 Admin Dashboard — Implemented Pages

| Page | File | Route | Description |
|---|---|---|---|
| **Login** | `pages/Login.jsx` | `/login` | Admin login form with JWT storage in `localStorage` |
| **Dashboard** | `pages/Dashboard.jsx` | `/` | Analytics overview: stat cards, time-series line chart, category breakdown, user reputation table |
| **Manage Problems** | `pages/ManageProblems.jsx` | `/problems` | Problem list with multi-select filters (role, status, category), bulk status update, delete |
| **User Management** | `pages/UserManagement.jsx` | `/users` | (Scaffolded — needs full implementation) |
| **Reports** | `pages/Reports.jsx` | `/reports` | Date-range report with bar chart, pie chart, and CSV export |

**Admin Components:**
- `Sidebar.jsx` — Navigation sidebar with route links.
- `Navbar.jsx` — Top bar with username display and logout.
- `StatCard.jsx` — Reusable KPI card component.
- `AnalyticsChart.jsx` — Reusable Recharts wrapper.

**Route Protection:**
- `PrivateRoute` in `App.jsx` checks for a `token` key in `localStorage`. If absent, redirects to `/login`.

---

### 3.4 LLM / AI Service — Partially Implemented

The `OllamaService` in `app/services/ollama_service.py` is **written but not wired into any API endpoint**.

| Function | Status | Description |
|---|---|---|
| `categorize_problem()` | ✅ Written | Sends title + description to Ollama for category classification |
| `check_toxic_content()` | ✅ Written | Two-pass toxicity check: keyword match + Ollama scoring |
| `extract_time_context()` | ✅ Written | Extracts time-of-incident from free text |
| `analyze_problem_full()` | ✅ Written | Orchestrator calling all three functions |
| **Called from any router?** | ❌ NOT CONNECTED | No router calls `OllamaService`. It exists as a standalone service class. |

---

## 4. 🗄️ Database Implementation Status

### 4.1 Current SQLAlchemy Models (`app/models.py`)

The following tables are actively defined and managed by SQLAlchemy:

| Table | Model Class | Key Fields | Status |
|---|---|---|---|
| `users` | `User` | id, email, password_hash, display_name, student_id, role_id, is_active, faculty, education_level, age, gender, phone_number, relationship | ✅ Implemented |
| `categories` | `Category` | id, name | ✅ Implemented (minimal — no description/color_code) |
| `buildings` | `Building` | id, name, latitude, longitude | ✅ Implemented (minimal — no description) |
| `problems` | `Problem` | id, user_id, category_id, building_id, title, description, image_url, status, latitude, longitude, visibility, created_at | ✅ Implemented |
| `comments` | `Comment` | id, problem_id, user_id, content, is_admin_reply, created_at | ✅ Implemented |
| `upvotes` | `Upvote` | id, problem_id, user_id (unique constraint) | ✅ Implemented |

**Total tables in `models.py`: 6**

---

### 4.2 Gap Analysis: Planned Schema vs. Implemented Code

The file `01_database_schema.sql` represents the **full planned schema**. Below is a comparison:

| # | Planned Table (in SQL file) | Status in `models.py` | Gap / Notes |
|---|---|---|---|
| 1 | `roles` | ❌ **MISSING** | Role is stored as an integer `role_id` directly on the User. No separate `roles` table exists in the ORM. |
| 2 | `users` | ⚠️ **Partial** | Missing fields: `is_verified`, `staff_account`, `is_toxic_flagged`, `created_at`, `updated_at`. `relationship_to_university` is stored as `relationship` (shortened name). |
| 3 | `problem_categories` | ⚠️ **Partial** | Implemented as `categories`. Missing `description` and `color_code` fields. |
| 4 | `buildings` | ⚠️ **Partial** | Missing `description` and `created_at`. |
| 5 | `problems` | ⚠️ **Partial** | Missing `incident_date`, `incident_time_range`, `priority`, `is_anonymous`, `is_staff_only`, `is_ai_generated_spam`, `toxicity_score`, `upvote_count` (computed), `updated_at`. Uses `visibility` (string) instead of `is_staff_only` (boolean). |
| 6 | `images` | ❌ **MISSING** | Entire image metadata table is absent. Currently, only a single `image_url` string is stored on the Problem model. |
| 7 | `upvotes` | ✅ Implemented | Matches planned schema. |
| 8 | `status_updates` | ❌ **MISSING** | No status change history/audit trail for problems. |
| 9 | `user_clusters` | ❌ **MISSING** | AI/ML K-Means clustering table is entirely absent. |
| 10 | `audit_logs` | ❌ **MISSING** | No system-wide audit logging. |
| 11 | `analytics_cache` | ❌ **MISSING** | Analytics are computed on-the-fly; no caching layer exists. |
| 12 | `nlp_analysis` | ❌ **MISSING** | NLP results are not persisted. The `OllamaService` runs but saves nothing to the DB. |

**Summary:**
- **6 tables implemented** (partially)
- **6 planned tables completely missing** (`roles`, `images`, `status_updates`, `user_clusters`, `audit_logs`, `nlp_analysis`, `analytics_cache`)
- **Numerous fields missing** across the 6 implemented tables

---

## 5. 🚧 Pending Tasks (What the Vendor Needs to Do)

### Priority 1 — Critical / Blocking Issues

- [ ] **Rotate database credentials** — The `.env` file contains live Aiven Cloud credentials. Generate new credentials and update the `.env` file (do not commit it again).
- [ ] **Add `.env` to `.gitignore`** — It is already in the backend `.gitignore` but verify it is truly not tracked by Git.
- [ ] **Fix the `OllamaService` integration** — Wire the `OllamaService` into the `/create` problem endpoint so that NLP analysis runs on submission.

### Priority 2 — Database Schema Completion

- [ ] **Create `roles` table model** — Add a `Role` SQLAlchemy model and migrate `User.role_id` to a proper FK relationship. Seed the 4 default roles (student, staff, public, admin).
- [ ] **Extend `User` model** — Add `is_verified`, `staff_account`, `is_toxic_flagged`, `created_at`, `updated_at` fields.
- [ ] **Extend `Category` model** — Add `description` (Text) and `color_code` (String 7) fields.
- [ ] **Extend `Building` model** — Add `description` (Text) and `created_at` fields.
- [ ] **Extend `Problem` model** — Add `incident_date`, `incident_time_range`, `priority` (ENUM: LOW/MEDIUM/HIGH/CRITICAL), `is_anonymous`, `is_staff_only`, `is_ai_generated_spam`, `toxicity_score`, `updated_at`.
- [ ] **Create `Image` model & router** — Replace the single `image_url` on Problem with a proper `images` table supporting multiple images per problem, with `extracted_latitude`, `extracted_longitude`, `is_processed`, `file_size_bytes`.
- [ ] **Create `StatusUpdate` model** — Track all status changes with `old_status`, `new_status`, `updated_by_user_id`, `comment`, `created_at`. This powers a proper audit history on the tracking screen.
- [ ] **Create `NlpAnalysis` model** — Persist the results of each `OllamaService.analyze_problem_full()` call: `extracted_category`, `extracted_time_context`, `confidence_score`, `is_toxic`, `toxic_keywords`, `raw_response`.
- [ ] **Create `AuditLog` model** — Log admin actions (ban, role change, status update) with `user_id`, `action`, `resource_type`, `resource_id`, `ip_address`.
- [ ] **Create `AnalyticsCache` model** — (Optional but recommended) Cache expensive analytics queries with expiry timestamps.
- [ ] **Create `UserCluster` model** — Stub for future K-Means clustering integration: `user_id`, `cluster_id`, `behavior_score`, `risk_level`, `clustering_date`.
- [ ] **Set up Alembic** — There is no database migration tool. Add Alembic for version-controlled schema migrations instead of relying on `create_all()`.

### Priority 3 — Backend API Gaps

- [ ] **Add LLM auto-categorization to problem creation** — After calling `OllamaService.categorize_problem()`, use the result to set or suggest the `category_id`, and persist the result to the `nlp_analysis` table.
- [ ] **Add toxicity gate to problem creation** — If `OllamaService.check_toxic_content()` returns `recommendation == "FLAG"`, either block the submission or queue it for admin review.
- [ ] **Implement RBAC properly for analytics endpoints** — Currently `/analytics`, `/analytics/time-series`, `/analytics/user-reputation`, and `/analytics/report` are **unauthenticated** (no token required). These should require admin/staff roles.
- [ ] **Implement RBAC for bulk-update** — `/bulk-update` is also unauthenticated. It should require role 2 or 4.
- [ ] **Add priority field to problem creation** — The `POST /create` endpoint does not accept or store `priority`.
- [ ] **Add `is_anonymous` support** — The `visibility` field currently supports `"public"` and `"internal"`. The planned schema uses a separate `is_anonymous` flag. Reconcile this design decision.
- [ ] **Add status history endpoint** — Once `StatusUpdate` model exists, add `GET /{problem_id}/status-history` endpoint.
- [ ] **Add profile update endpoint** — There is no `PATCH /users/me/profile` endpoint. Users cannot update their own profile information from the app (only the display name during onboarding).
- [ ] **Implement proper image management** — Add `GET /{problem_id}/images` and `POST /{problem_id}/images` endpoints when the `Image` model is ready. Consider adding image deletion.
- [ ] **Add push notification service** — Planned in `02_project_structure.md` as `notification_service.py` but not implemented.

### Priority 4 — Flutter App Gaps

- [ ] **Standardize state management** — Both `provider` and `riverpod` are in `pubspec.yaml` but neither is actually used for global state. Auth token is read from `SharedPreferences` on every screen. Pick one pattern (recommend Riverpod) and refactor.
- [ ] **Complete `TrackingScreen`** — The tracking screen shows the user's problems but does not show status change history from `status_updates`. Implement timeline view once backend supports it.
- [ ] **Connect system settings screen** — `super_admin/system_settings_view.dart` is scaffolded but has no backend connection.
- [ ] **Add logout from all screens** — Token is only cleared in the Profile screen. Add a session expiry handler globally.
- [ ] **Add token refresh logic** — JWT tokens expire in 30 minutes. There is no refresh token mechanism. Implement refresh token flow or extend token lifetime.
- [ ] **Google Maps API Key** — `pubspec.yaml` includes `google_maps_flutter`. The Android manifest and iOS plist must have a Google Maps API key configured. Verify this is set correctly.
- [ ] **Add offline support** — Currently there is zero offline capability. Consider using `hive` (already a dependency) for local caching of the problem feed.
- [ ] **Smart Location Privacy Feature** — The SRS specifies stripping EXIF/GPS data from uploaded images before sending to the server. This is not implemented. Add image EXIF scrubbing in the `image_picker` flow before upload.

### Priority 5 — Admin Dashboard Gaps

- [ ] **Implement `UserManagement.jsx` fully** — The page file exists but is nearly empty (only ~70 lines). Connect it to `GET /users/list`, `PATCH /{user_id}/role`, and `PATCH /{user_id}/ban`.
- [ ] **Add category and building management to dashboard** — The Flutter super-admin panel has this, but the web dashboard does not.
- [ ] **Add role-based access within the dashboard** — Currently any valid JWT token grants access to all dashboard pages. Decode the token to check `role_id` and restrict category admin (role 2) from super-admin features.
- [ ] **Add problem status history view** — When `status_updates` backend is ready, add a detail modal to `ManageProblems.jsx` showing the full status timeline.
- [ ] **Add NLP analysis display** — When `nlp_analysis` backend is ready, show the toxicity score and auto-category suggestion on each problem card.
- [ ] **Improve error handling** — Most API error states show generic messages. Add proper error toasts/banners.

### Priority 6 — Infrastructure & Devops

- [ ] **Remove SQLite artifact** — The file `university_social_listening/university_social.db` is a development leftover and should not be in the repo.
- [ ] **Add Alembic migration scripts** — Create the initial migration to match the current `models.py` state, then add incremental migrations for new tables.
- [ ] **Set up CI/CD pipeline** — No CI/CD configuration exists. Add GitHub Actions or equivalent for auto-deploy to Render.com on push to `main`.
- [ ] **Add unit tests** — No tests exist. The planned structure in `02_project_structure.md` shows `tests/test_auth.py`, `test_problems.py`, `test_nlp.py` but none are written.
- [ ] **Implement K-Means user clustering service** — Planned as `services/clustering_service.py` using scikit-learn. Not yet started.

---

## 6. ⚙️ Local Setup & Environment

### 6.1 Backend — `university_social_listening/`

#### Prerequisites
- Python 3.9+
- MySQL 8.0 (or Docker)
- Ollama installed locally (optional, for LLM features)

#### Option A: Run with Docker Compose (Recommended)

```bash
# 1. Navigate to the backend folder
cd university_social_listening

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your local settings (see variables below)

# 3. Start all services (MySQL + Ollama + FastAPI backend)
docker-compose up -d

# 4. Pull the LLM model into Ollama (one-time step)
docker exec -it <ollama_container_name> ollama pull neural-chat

# 5. Verify the API is running
curl http://localhost:8000/health
# Expected: {"status":"healthy","version":"1.0.0","database":"connected"}

# 6. View auto-generated API docs
# Open in browser: http://localhost:8000/docs
```

> **Note:** Docker Compose maps MySQL to **port 3307** on your host (not 3306) to avoid conflicts.

---

#### Option B: Run Locally (Manual)

```bash
# 1. Navigate to the backend folder
cd university_social_listening

# 2. Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Create a .env file with the variables listed below

# 5. Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# The API will be available at http://localhost:8000
# Swagger UI: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
```

#### Required Environment Variables (Backend `.env`)

```dotenv
# ─── Database (MySQL) ───────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=university_social_listening

# ─── JWT Authentication ──────────────────────────────
SECRET_KEY=change_this_to_a_long_random_secret_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ─── Ollama LLM ──────────────────────────────────────
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=neural-chat

# ─── Image Uploads ───────────────────────────────────
MAX_IMAGE_SIZE_MB=200
IMAGE_UPLOAD_DIR=./uploads/images

# ─── Server ──────────────────────────────────────────
DEBUG=False
```

> **Production Note:** The production `.env` (currently in the repo) points to Aiven Cloud:
> - `DB_HOST=mysql-226103f-artitaya-42da.j.aivencloud.com`
> - `DB_PORT=13748`
> - `DB_NAME=defaultdb`
> ⚠️ These credentials must be rotated.

#### CORS Configuration (Backend)

The CORS whitelist is hardcoded in `app/main.py`. Allowed origins are:
```
http://localhost:5173      ← Admin dashboard dev server
http://127.0.0.1:5173
http://localhost
http://127.0.0.1
https://up-social-listening.netlify.app   ← Production dashboard
```
Any additional origins (e.g., a staging server) must be added to this list and redeployed.

---

### 6.2 Flutter App — `university_social_app/`

#### Prerequisites
- Flutter SDK `>=3.0.0` (run `flutter --version` to verify)
- Android Studio or VS Code with Flutter extension
- A connected Android/iOS device or emulator

```bash
# 1. Navigate to the Flutter app folder
cd university_social_app

# 2. Install Dart/Flutter dependencies
flutter pub get

# 3. Verify environment (checks for issues)
flutter doctor

# 4. Run the app on a connected device/emulator
flutter run

# To run on a specific device:
flutter run -d <device_id>

# To list connected devices:
flutter devices
```

#### API Base URL Configuration

The API base URL is **hardcoded** in two service files. To point to a local backend, change both:

- `lib/services/auth_service.dart`, line 6:
  ```dart
  static const String baseUrl = 'http://10.0.2.2:8000/api/v1/auth';
  // 10.0.2.2 is the Android Emulator's alias for localhost
  // For a real device on the same WiFi, use your machine's local IP
  ```
- `lib/services/problem_service.dart`, line 8:
  ```dart
  static const String baseUrl = 'http://10.0.2.2:8000/api/v1/problems';
  ```

> **Recommendation:** Refactor these to use a single `ApiConfig` class or Flutter environment variables (`--dart-define`) so the URL can be changed at build time without modifying source files.

#### Required Configuration (Flutter)

- **Google Maps API Key:** Required for `google_maps_flutter`. Add to:
  - Android: `android/app/src/main/AndroidManifest.xml` → `<meta-data android:name="com.google.android.maps.v2.API_KEY" android:value="YOUR_KEY"/>`
  - iOS: `ios/Runner/AppDelegate.swift` → `GMSServices.provideAPIKey("YOUR_KEY")`

---

### 6.3 Admin Dashboard — `up_voice_admin_dashboard/`

#### Prerequisites
- Node.js v18+ and npm

```bash
# 1. Navigate to the admin dashboard folder
cd up_voice_admin_dashboard

# 2. Install npm dependencies
npm install

# 3. Start the Vite development server
npm run dev
# Dashboard will be available at: http://localhost:5173

# To build for production:
npm run build

# To preview the production build locally:
npm run preview

# To lint the project:
npm run lint
```

#### API Base URL Configuration (Admin Dashboard)

The base URL is in `src/services/api.js`, line 4:
```javascript
baseURL: 'https://university-social-listening-platform.onrender.com/api/v1',
```
To point to a local backend, change this to `http://localhost:8000/api/v1`.

---

### 6.4 Seeding the Database

A seed script is provided for initial data population:

```bash
# From the university_social_listening/ directory:
python seed_up_data.py
```

The SQL schema file also contains `INSERT` statements for:
- Default roles (student, staff, public, admin)
- Sample problem categories (6 categories with Thai names and color codes)
- Sample buildings (5 UP university buildings with GPS coordinates)

---

## 7. 🔑 User Role Reference

| `role_id` | Role Name | Login Method | Access Level |
|---|---|---|---|
| `1` | **Student (นิสิต)** | Email (`@up.ac.th`) + password | Public feed, submit problems, upvote, comment |
| `2` | **Staff (บุคลากร)** | Email (`@up.ac.th`) + password | Student access + internal feed + admin panel |
| `3` | **Public (บุคคลทั่วไป)** | Phone number + password | Public feed only, submit problems |
| `4` | **Super Admin (ผู้ดูแลระบบ)** | Any email + password | Full access — all admin functions, user promotion |

> **Note:** Role 4 (Super Admin) can log in from any login tab — the login endpoint handles this via `expected_role_id` bypass logic.

---

## 8. 📂 Key File Reference

| File | Purpose |
|---|---|
| `university_social_listening/app/models.py` | **All SQLAlchemy ORM models** — the only source of truth for actual DB schema |
| `university_social_listening/app/schemas.py` | **Pydantic validation schemas** for all request/response bodies |
| `university_social_listening/app/main.py` | FastAPI app init, CORS config, DB connection, router registration |
| `university_social_listening/app/routers/auth.py` | Auth routes + JWT generation + password hashing helpers |
| `university_social_listening/app/routers/problems.py` | All problem/category/building routes + analytics endpoints (710 lines) |
| `university_social_listening/app/routers/users.py` | Admin user management routes |
| `university_social_listening/app/services/ollama_service.py` | LLM integration class (written but not wired) |
| `university_social_listening/01_database_schema.sql` | **Planned full schema** — 12 tables, use as the design specification |
| `university_social_listening/.env` | ⚠️ Live credentials — must be rotated |
| `university_social_listening/docker-compose.yml` | Docker setup for MySQL + Ollama + Backend |
| `university_social_app/lib/main.dart` | Flutter app entry point + route config |
| `university_social_app/lib/services/auth_service.dart` | All auth API calls from Flutter |
| `university_social_app/lib/services/problem_service.dart` | Problem listing, creation, upvoting from Flutter |
| `university_social_app/pubspec.yaml` | Flutter dependency manifest |
| `up_voice_admin_dashboard/src/App.jsx` | React app routing + PrivateRoute guard |
| `up_voice_admin_dashboard/src/services/api.js` | Axios instance + JWT interceptor |
| `up_voice_admin_dashboard/src/pages/Dashboard.jsx` | Main analytics dashboard |
| `up_voice_admin_dashboard/src/pages/Reports.jsx` | Date-range report + CSV export |
| `up_voice_admin_dashboard/package.json` | Node.js dependency manifest |

---

*End of Project Handover Document — UP Voice / University Social Listening Platform*
