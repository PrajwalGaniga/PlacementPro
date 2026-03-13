# PlacementPro: Comprehensive Codebase Audit & Technical Overview 

## 1. Executive Summary
PlacementPro is a multi-tenant, AI-powered College Placement Management System. The platform serves three primary actors:
- **Super Admin**: Manages colleges and TPO (Training & Placement Officer) accounts.
- **TPOs (College Admins)**: Manage student records via Excel upload, create placement drives using AI JD parsing, utilize AI scheduling, and analyze data via the React Dashboard.
- **Students**: Use a Flutter mobile app to check their placement readiness score, view eligible drives, build resumes, track applications, and interact with an AI career counselor (PlacementBot V2).

---

## 2. Directory Structure
```text
PlacementPro/
├── backend/                   # FastAPI Python server
│   ├── app/
│   │   ├── models/            # Pydantic schema models
│   │   ├── routes/            # API endpoints (auth, drive, student, bot, etc.)
│   │   └── utils/             # Helper tools (Gemini interface, pdf/excel parsing)
│   ├── ml_model/              # ML assets (placement_model.pkl for chatbot)
│   └── main.py                # FastAPI entry point & CORS
├── frontend/                  # React.js TPO & Admin Dashboard (Vite)
│   └── src/
│       ├── api/               # Axios API bindings
│       ├── components/        # Reusable UI components (Layout wrapper)
│       └── pages/             # Route views (AdminDashboard, DriveCreator, AIAnalyzer, etc.)
└── flutter-app/               # Flutter Student Mobile App
    └── lib/
        ├── screens/           # UI Views (Login, Home, Chat, Profile, DriveDetail)
        └── services/          # HTTP networking wrapper (ApiService)
```

---

## 3. Tech Stack & Dependencies

### Backend (Python)
- **Framework:** FastAPI
- **Database:** MongoDB (Motor async driver)
- **Authentication:** JWT (PyJWT), Passlib (bcrypt)
- **AI/ML:** Google Gemini API (`google-generativeai`), Scikit-learn (`joblib` for `.pkl` models)
- **Data Engineering:** `pandas`, `openpyxl` (Excel), `PyPDF2` (JD text extraction)

### Frontend (React.js)
- **Framework:** React + Vite
- **Routing:** React Router v6
- **Networking:** Axios
- **Styling/UI:** Internal CSS + inline styles (Dark SaaS aesthetics, Lucide-React icons)

### Mobile App (Flutter)
- **Framework:** Flutter (Dart)
- **Networking:** `http` package
- **Storage:** `shared_preferences` (KV token storage)
- **UI Elements:** `circular_percent_indicator`

---

## 4. Database Schema (MongoDB)
The backend manages data via specific MongoDB collections. The primary schemas are:
- **`colleges`**: `{ college_id (unique), name, place, state, country }`
- **`tpos`**: `{ email (unique), college_id, name, password (hashed), is_super_admin }`
- **`students`**: Massive document storing core details `{ usn (unique), email, name, college_id, db_password, cgpa, backlogs, branch, graduation_year, placed, application_logs, etc. }` plus nested Objects for `Experiences`, `Projects`, `Education`, `StudentProfile`.
- **`drives`**: `{ _id, college_id, company_name, job_role, package_ctc, work_location, active, min_cgpa, max_backlogs, eligible_branches, required_skills, ... }`
- **`applications`**: `{ application_id, usn, drive_id, applied_at, status, resume_url, ats_score }`
- **`interviews`** (or schedule slots): Tracks AI-scheduled interview times mapped to USNs.

---

## 5. API Routes Inventory

**Auth & Users (`/tpo`, `/admin`, `/student`)**
- `POST /admin/login`, `POST /tpo/login`, `POST /student/login` -> Returns JWT token
- `POST /admin/tpo/add`, `GET /admin/tpo/list` -> Super admin CRUD
- `GET /student/list` -> Used by TPO dashboard

**Drive Management (`/drive`)**
- `POST /drive/create`, `GET /drive/list`, `DELETE /drive/{drive_id}`
- `POST /drive/parse-jd` -> AI endpoint converting PDF to JSON schema
- `POST /drive/check-eligibility` -> Live calculator for drive target counts

**Student Mobile Actions (`/student`)**
- `GET /student/colleges` -> For login dropdown
- `GET /student/my-eligible-drives` -> Filtered feed based on Student profile
- `POST /student/apply` -> Applies to a drive
- `POST /student/calculate-score` -> ML/Algorithm based placement readiness %
- `POST /student/analyze-resume` -> Calculates ATS match against specific drive

**AI & Analytics (`/bot`, `/scheduler`, `/tpo`)**
- `POST /bot/chat` -> PlacementBot V2 endpoint handling chat messages
- `POST /tpo/analyze-excel` -> TPO dashboard endpoint generating "Winning Edges" & Action Plans
- `POST /scheduler/generate` -> AI auto-assigns interview time slots

---

## 6. Frontend / Mobile Architecture

### React Dashboard (`frontend/src`)
- **State Management:** Functional components with React Hooks (`useState`, `useEffect`). No Redux/Zustand is used; state is highly localized per page.
- **Routing Structure:**
  - `/` -> `LoginPage` (Role split)
  - `/admin/dashboard` -> `AdminDashboard` (Protected: SuperAdmin only)
  - `/dashboard/*` -> Wrapped in `<Layout>`, accessible by TPOs. Pages include `Dashboard`, `DriveCreator`, `DriveList`, `StudentList`, `SchedulerView`, `AIAnalyzer`, etc.
- **Design:** Aggressive Neumorphic / SaaS Dark Mode aesthetic. Heavy use of absolute gradients, blurred backdrops (`backdrop-filter: blur`), CSS grid, and `lucide-react` icons.

### Flutter Mobile App (`flutter-app/lib`)
- **State Management:** StatefulWidgets (`setState`). Local caching via `SharedPreferences` (stores `token`, `student_json`, `score`).
- **Networking:** Pure `http` requests configured via `api_service.dart`. Uses Ngrok bypass headers (`ngrok-skip-browser-warning: true`).
- **Core Screens:**
  1. `LoginScreen`: Fetches colleges dynamically, authenticates USN.
  2. `HomeScreen`: Displays circular readiness score gauge, fetches `my-eligible-drives`.
  3. `ChatScreen`: "PlacementBot V2" interface rendering Markdown text bubbles, Prediction gauge cards, and Comparison cards dynamically from backend.

---

## 7. AI Integration Audit (Google Gemini)
AI is heavily intertwined throughout the entire stack, utilizing Google's `gemini-1.5-pro` & `flash` models:

1. **Intelligent JD Parsing (`parse_jd`):** Extracts `company_name`, `ctc`, `cgpa` cutoffs, `branches` automatically from raw PDF texts using JSON format enforcing.
2. **PlacementBot V2 Hybrid Agent (`/bot/chat`):** A dual-pipeline chatbot.
   - Classification Pipeline: Gemini decides if the user intent is `predict`, `compare`, or `general`.
   - Analytical Engine: If intent is `predict`, it queries a local `placement_model.pkl` (Scikit-learn) and sends metrics to the Flutter UI to render a GUI gauge element.
3. **Resume ATS Matcher (`analyze_resume`):** Reads text from student-uploaded PDFs, compares to `drive` details, and returns a percentage score (0-100) reflecting curriculum match contextually.
4. **TPO Excel Analyzer (`analyze_excel`):** The TPO uploads an Excel file with all student details. Gemini identifies trends automatically returning insights as "Winning Edge" and "Critical Gaps".
5. **AI Interview Scheduler (`ai_smart_sort`):** Given a pool of applicants and available time windows, Gemini logically ranks and sorts applicants by relevance to create optimal panel intervals.

---

## 8. Authentication & Authorization Flow
1. **Token Provisioning:** All login forms post to specific auth endpoints. The backend `utils/auth.py` hashes passwords with `bcrypt` and generates a PyJWT payload containing `sub (email/usn)` and `role`.
2. **Persistence:** React uses `localStorage` (`token`, `role`, `college_id`). Flutter uses `SharedPreferences`.
3. **Route Protection (React):** `PrivateRoute` and `SuperAdminRoute` wrappers check `localStorage` tokens. Invalid/Missing tokens bounce users to `/`.
4. **Endpoint Protection (FastAPI):** `Depends(get_current_user)` or `Depends(get_current_student)` verifies the Authorization Bearer header.

---

## 9. Known Issues, Limitations & TODOs
1. **Model Hardcoding:** `placement_model.pkl` paths might throw errors if executed from a different working directory. Relative path logic inside `bot.py` uses `os.path.join(os.path.dirname(__file__), ...)`, which is safe.
2. **Missing Env Validation:** The backend spins up even if `GEMINI_API_KEY` or `MONGO_URL` config is missing, leading to crash-on-request rather than crash-at-boot.
3. **File System Bloat:** The server currently stores logos (`/logos`) and resumes (`/submitted_resumes`) on the local disk. In a multi-tenant production system, this risks filling the ephemeral disk limit. It should migrate to AWS S3.
4. **Flutter Error Suppressions:** Some REST errors in the API service use `.toString().replaceAll('Exception: ', '')` rather than proper strongly-typed exception mapping.
5. **Scalability (Polling):** The Flutter app does not use WebSockets for real-time status changes. Students must pull-to-refresh to see if they were shortlisted for a drive.

---

## 10. Prioritized Backlog for Next Phase
1. **Phase 1: Security & Cloud Migration (High Priority)**
   * Migrate static file handlers (`upload_logo`, `analyze_resume` saves) to AWS S3/Cloud Storage.
   * Enforce password constraints and implement email/OTP based "Forgot Password" logic.
2. **Phase 2: Real-time Comms (Medium Priority)**
   * Implement WebSockets (`socket.io` or FastAPI native websockets) for Live Application Status updates dynamically pushing to the Flutter App and React Dashboard.
3. **Phase 3: Production Analytics (Medium Priority)**
   * Store TPO Excel Analysis outputs in MongoDB so TPOs don't have to re-evaluate `.xlsx` files repeatedly every time they reload the "AI Analyzer" dashboard page.
4. **Phase 4: Resume Parsing Optimization (Low Priority)**
   * Switch the resume extracting service to a multi-stage approach or Langchain text-chunking to handle multi-page resumes more robustly before sending to Gemini context limits.
