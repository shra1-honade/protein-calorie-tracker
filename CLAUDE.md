# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Protein & Calorie Tracker PWA with social competition features. **Fully implemented and deployed to production.**

**Stack**: Python FastAPI + PostgreSQL (backend) | React + Vite + TypeScript (frontend) | Google OAuth | PWA

**Production URLs**:
- Frontend: https://protein-calorie-tracker.vercel.app (Vercel, auto-deploys from `master`)
- Backend: https://protein-calorie-tracker.onrender.com (Render, free tier with cold starts)
- Database: Neon PostgreSQL (free tier, 0.5 GB)
- GitHub: shra1-honade/protein-calorie-tracker

## Commands

**Important**: Always run backend commands from `/home/shravan/protein-calorie-tracker/backend` directory. Python is available as `python3` (not `python`).

### Backend
```bash
cd backend
pip install -r requirements.txt
python3 main.py                    # or: uvicorn main:app --reload
# Dev server runs on :8000
# API docs auto-generated at http://localhost:8000/docs
```

The database initializes and seeds automatically on first startup via FastAPI's lifespan handler — no manual migration step needed.

### Frontend
```bash
cd frontend
npm install
npm run dev                         # Vite dev server on :5173
npm run build                       # TypeScript check + production build
npm run preview                     # Preview production build locally
```

**Local dev API routing**: Vite proxy forwards `/api/*` → `http://localhost:8000/*` (strips `/api` prefix)
**Production API routing**: Vercel rewrites `/api/*` → Render backend, `/*` → SPA fallback to index.html

## Architecture

### Backend (`backend/`)

**Request flow**: Router → `dependencies.py` (get_current_user via JWT, get_db) → business logic → Pydantic response model

**5 modular routers** registered in `main.py`:
- `auth_router` — Google OAuth flow, JWT issuance, user profile/goals, dev login
- `food_router` — common foods, camera-based food detection, food entry CRUD
- `dashboard_router` — daily/weekly aggregation queries
- `group_router` — group create/join, protein leaderboards
- `admin_router` — platform statistics (total users, food entries, engagement metrics)

**Key modules**:
- `config.py` — Pydantic Settings singleton (LRU-cached), reads from `.env`
- `database.py` — async PostgreSQL via asyncpg, connection pooling, versioned schema migrations via `schema_version` table
- `auth.py` — Google OAuth token exchange + JWT encode/decode (HS256, 7-day expiry)
- `gemini_client.py` — Google Gemini Vision API (`gemini-2.5-flash` model); analyzes food images and estimates nutrition
- `seed.py` — populates `common_foods` table with 15 entries on first run

**Camera food detection**: Users can take photos of meals. Gemini Vision API identifies foods and estimates protein/calories. Images processed in-memory (not stored).

**Database**: PostgreSQL (asyncpg). Tables: `users`, `common_foods`, `food_entries` (indexed on user_id+logged_at), `groups`, `group_members`, `schema_version`. Foreign keys enabled.

**asyncpg patterns** (CRITICAL):
- Pass Python `datetime.date` objects for date params, NOT ISO strings
- Use `$1, $2, $3...` placeholders (not `?`)
- Use `RETURNING id` with `fetchval()` instead of `cursor.lastrowid`
- `fetchrow()` returns Record (dict-like), `fetch()` returns list of Records
- Datetimes returned as Python datetime objects — convert with `.isoformat()` for Pydantic str fields

**Auth flow**: Frontend → `/auth/google/login` (get URL) → Google → `/auth/google/callback` (exchange code, upsert user, issue JWT) → redirect to `frontend_url/auth/callback?token=JWT`. All protected endpoints require `Authorization: Bearer <token>` header.

### Frontend (`frontend/`)

**Implemented structure**:
- `pages/` — LoginPage, DashboardPage, LogFoodPage, GroupPage, LeaderboardPage, JoinGroupPage, AdminPage
- `components/` — Layout (uses `<Outlet />`), ProtectedRoute, FoodCard, InstallPWAPrompt, etc.
- `context/` — AuthContext for global auth state
- `hooks/` — useAuth, useDashboard, useFoodEntries, useGroups, useLeaderboard, useAdminStats
- `api.ts` — Axios instance with JWT interceptor (reads from `localStorage.getItem('token')`)

**Auth flow**:
- JWT stored in `localStorage` under key `'token'` (not `'authToken'`)
- Axios interceptor automatically adds `Authorization: Bearer <token>` header
- ProtectedRoute redirects to `/login` if not authenticated

**Layout pattern**:
- `Layout` component uses React Router's `<Outlet />` to render child routes
- Pages do NOT wrap content with `<Layout>` — Layout is already applied at route level in App.tsx
- New pages should return content directly without Layout wrapper

**Timezone handling**:
- Always pass client's local date to backend endpoints that filter by date
- Use format: `YYYY-MM-DD` (e.g., `today` query param)
- Prevents UTC/local timezone mismatches in daily/weekly aggregations

### Extensibility patterns

- New backend feature = new router file in `routers/` + register in `main.py`
- New DB changes = increment `CURRENT_SCHEMA_VERSION` in `database.py` + add migration function
- New frontend page = new file in `pages/` + route in `App.tsx`
- Common foods are DB-driven (not hardcoded), modifiable via `seed.py`

## Environment Variables

Required in `backend/.env` (see `.env.example`):
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `JWT_SECRET` — Secret key for JWT signing (change default!)
- `GEMINI_API_KEY` — Google Gemini API key for food detection
- `FRONTEND_URL` — Frontend URL for OAuth redirects (local: `http://localhost:5173`, prod: `https://protein-calorie-tracker.vercel.app`)
- `DATABASE_URL` — PostgreSQL connection string (format: `postgresql://user:pass@host/db` or `postgres://...` for Neon)

**Getting API keys**:
- Google OAuth: https://console.cloud.google.com/apis/credentials
- Gemini API: https://makersuite.google.com/app/apikey

## Deployment

**Frontend (Vercel)**:
- Auto-deploys from GitHub on push to `master` branch
- `vercel.json` lives in `frontend/` directory (Vercel root = frontend)
- Rewrites `/api/*` to Render backend, `/*` to SPA index.html

**Backend (Render)**:
- Free tier: spins down after 15 min inactivity (~30s cold start on next request)
- Set environment variables in Render dashboard
- Auto-redeploys on git push

**Database (Neon PostgreSQL)**:
- Free tier: 0.5 GB storage
- Connection string format: `postgres://user:pass@host/db`
- Set as `DATABASE_URL` in Render environment variables
