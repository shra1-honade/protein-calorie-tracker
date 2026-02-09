# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Protein & Calorie Tracker PWA with social competition features. Backend is complete; frontend is scaffolded but not yet implemented.

**Stack**: Python FastAPI + SQLite (backend) | React + Vite + TypeScript (frontend) | Google OAuth | PWA

## Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload          # dev server on :8000
# API docs auto-generated at /docs
```

The database initializes and seeds automatically on first startup via FastAPI's lifespan handler — no manual migration step needed.

### Frontend (not yet set up)
```bash
cd frontend
npm install
npm run dev                         # Vite dev server on :5173
```

## Architecture

### Backend (`backend/`)

**Request flow**: Router → `dependencies.py` (get_current_user via JWT, get_db) → business logic → Pydantic response model

**4 modular routers** registered in `main.py`:
- `auth_router` — Google OAuth flow, JWT issuance, user profile/goals, dev login
- `food_router` — common foods, camera-based food detection, food entry CRUD
- `dashboard_router` — daily/weekly aggregation queries
- `group_router` — group create/join, protein leaderboards

**Key modules**:
- `config.py` — Pydantic Settings singleton (LRU-cached), reads from `.env`
- `database.py` — async SQLite (aiosqlite) with WAL mode, versioned schema migrations via `schema_version` table
- `auth.py` — Google OAuth token exchange + JWT encode/decode (HS256, 7-day expiry)
- `gemini_client.py` — Google Gemini Vision API; analyzes food images and estimates nutrition
- `seed.py` — populates `common_foods` table with 15 entries on first run

**Camera food detection**: Users can take photos of meals. Gemini Vision API identifies foods and estimates protein/calories. Images processed in-memory (not stored).

**Database**: SQLite file (`tracker.db`). Tables: `users`, `common_foods`, `food_entries` (indexed on user_id+logged_at), `groups`, `group_members`, `schema_version`. Foreign keys and WAL enabled.

**Auth flow**: Frontend → `/auth/google/login` (get URL) → Google → `/auth/google/callback` (exchange code, upsert user, issue JWT) → redirect to `frontend_url/auth/callback?token=JWT`. All protected endpoints require `Authorization: Bearer <token>` header.

### Frontend (`frontend/`)

Planned structure: React Router pages (`pages/`), shared components (`components/`), React Context for auth (`context/`), custom hooks for API calls (`hooks/`), Axios wrapper with JWT interceptor (`api.ts`).

### Extensibility patterns

- New backend feature = new router file in `routers/` + register in `main.py`
- New DB changes = increment `CURRENT_SCHEMA_VERSION` in `database.py` + add migration function
- New frontend page = new file in `pages/` + route in `App.tsx`
- Common foods are DB-driven (not hardcoded), modifiable via `seed.py`

## Environment Variables

Required in `backend/.env` (see `.env.example`):
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`, `DATABASE_URL`

**Getting API keys**:
- Google OAuth: https://console.cloud.google.com/apis/credentials
- Gemini API: https://makersuite.google.com/app/apikey
