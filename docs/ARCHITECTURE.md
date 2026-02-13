# Architecture Documentation

This document provides visual architecture diagrams for the Protein & Calorie Tracker PWA using Mermaid diagrams that render directly on GitHub.

## 1. System Overview

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e3f2fd','primaryTextColor':'#000','primaryBorderColor':'#1976d2','lineColor':'#424242','secondaryColor':'#f3e5f5','tertiaryColor':'#e8f5e9'}}}%%
graph LR
    User["👤 User<br/>(Browser/Mobile)"] -->|HTTPS| Vercel["🌐 Vercel<br/>React + Vite PWA<br/>vercel.app"]
    Vercel -->|"/api/* proxy"| Render["🐍 Render<br/>FastAPI Backend<br/>.onrender.com<br/>(15min sleep)"]
    Render -->|asyncpg pool| Neon["🗄️ Neon<br/>PostgreSQL<br/>0.5GB Free"]
    Render -.->|OAuth + Vision API| Google["🔐 Google<br/>OAuth<br/>Gemini Vision"]

    style User fill:#E3F2FD,stroke:#1976D2,stroke-width:3px,color:#000
    style Vercel fill:#E8F5E9,stroke:#388E3C,stroke-width:3px,color:#000
    style Render fill:#FFF9C4,stroke:#F57C00,stroke-width:3px,color:#000
    style Neon fill:#FFEBEE,stroke:#D32F2F,stroke-width:3px,color:#000
    style Google fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
```

**💰 Total Cost: $0/month** (All free tiers)
**⚡ Auto-deploy:** Git push to master → Vercel + Render webhooks

---

## 2. Backend Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#fff9c4','primaryTextColor':'#000','primaryBorderColor':'#f57c00','lineColor':'#616161'}}}%%
graph TD
    Main["main.py<br/>FastAPI App<br/>Lifespan Manager"] --> Auth["auth_router<br/>/auth/*<br/>OAuth + JWT"]
    Main --> Food["food_router<br/>/food/*<br/>Log/Camera/Detect"]
    Main --> Dashboard["dashboard_router<br/>/dashboard/*<br/>Daily/Weekly"]
    Main --> Groups["group_router<br/>/groups/*<br/>Create/Join/Leaderboard"]

    Auth -.->|"Depends()"| Deps["dependencies.py<br/>get_db()<br/>get_current_user()"]
    Food -.->|"Depends()"| Deps
    Dashboard -.->|"Depends()"| Deps
    Groups -.->|"Depends()"| Deps

    Deps --> DB["database.py<br/>asyncpg pool<br/>init_db()<br/>migrations"]
    DB --> Postgres[("PostgreSQL<br/>(Neon)")]

    style Main fill:#FFF9C4,stroke:#F57C00,stroke-width:4px,color:#000
    style Auth fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    style Food fill:#E8F5E9,stroke:#388E3C,stroke-width:2px,color:#000
    style Dashboard fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#000
    style Groups fill:#FFEBEE,stroke:#D32F2F,stroke-width:2px,color:#000
    style Deps fill:#FFE0B2,stroke:#EF6C00,stroke-width:2px,color:#000
    style DB fill:#FFCDD2,stroke:#C62828,stroke-width:4px,color:#000
    style Postgres fill:#F5F5F5,stroke:#424242,stroke-width:2px,color:#000
```

**Request Flow:**
```
Client → Router → Depends(get_current_user) [JWT validate] →
Depends(get_db) [pool.acquire()] → Business Logic →
DB Query ($1, $2... params) → Pydantic Response → JSON
```

---

## 3. Database Schema

```mermaid
erDiagram
    users ||--o{ food_entries : "has many"
    users ||--o{ groups : "creates"
    users ||--o{ group_members : "joins"
    groups ||--o{ group_members : "has many"

    users {
        SERIAL id PK
        VARCHAR google_id UK
        VARCHAR email
        VARCHAR display_name
        VARCHAR avatar_url
        FLOAT protein_goal
        FLOAT calorie_goal
        TIMESTAMPTZ created_at
    }

    food_entries {
        SERIAL id PK
        INT user_id FK
        VARCHAR food_name
        FLOAT protein_g
        FLOAT calories
        VARCHAR fdc_id
        VARCHAR meal_type
        FLOAT serving_qty
        TIMESTAMPTZ logged_at
    }

    groups {
        SERIAL id PK
        VARCHAR name
        VARCHAR invite_code UK
        INT created_by FK
        TIMESTAMPTZ created_at
    }

    group_members {
        SERIAL id PK
        INT group_id FK
        INT user_id FK
        TIMESTAMPTZ joined_at
    }
```

**Key Notes:**
- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- Indexed columns: `google_id`, `(user_id, logged_at)`, `invite_code`, `(group_id, user_id)`
- asyncpg requires **date objects** (not ISO strings) for DATE queries
- Auto-initialized via `database.py` on FastAPI startup

---

## 4. Authentication Flow

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'actorBkg':'#E3F2FD','actorBorder':'#1976D2','actorTextColor':'#000','signalColor':'#424242','signalTextColor':'#000','labelBoxBkgColor':'#FFF9C4','labelBoxBorderColor':'#F57C00','labelTextColor':'#000','loopTextColor':'#000','noteBkgColor':'#FFEBEE','noteBorderColor':'#D32F2F','noteTextColor':'#000'}}}%%
sequenceDiagram
    participant U as 👤 User
    participant F as 🌐 Frontend
    participant B as 🐍 Backend
    participant G as 🔐 Google OAuth
    participant D as 🗄️ Database

    U->>F: Click "Continue with Google"
    F->>B: GET /auth/google/login
    B->>F: Return OAuth URL
    F->>G: Redirect to Google
    G->>U: Sign in prompt
    U->>G: Authenticate
    G->>B: Redirect with auth code
    B->>G: Exchange code for tokens
    G->>B: Access token + User profile
    B->>D: Upsert user (google_id, email, etc)
    B->>B: Generate JWT (HS256, 7d expiry)
    B->>F: Redirect /auth/callback?token=JWT
    F->>F: Store in localStorage
    F->>F: Axios interceptor adds Bearer header
    F->>B: API requests with Authorization: Bearer JWT
    B->>B: Depends(get_current_user) validates JWT
    B->>D: SELECT user WHERE id = decoded_user_id
    D->>B: User data
    B->>F: Protected resource (JSON)
```

**Protected Route Flow:**
```
Every API request → Axios adds "Authorization: Bearer <JWT>" →
Backend Depends(get_current_user) → decode_jwt() validates signature & expiry →
Extract user_id from payload → SELECT user from DB → Return user dict →
Route handler receives authenticated user
```

---

## 5. Frontend Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e8f5e9','primaryTextColor':'#000','primaryBorderColor':'#388e3c','lineColor':'#616161'}}}%%
graph TD
    App["App.tsx<br/>React Router<br/>AuthProvider"] --> Routes{{"Routes"}}

    Routes -->|"/login"| Login["LoginPage<br/>Google OAuth<br/>Dark gradient"]
    Routes -->|"/"| Dashboard["DashboardPage<br/>Daily summary<br/>Weekly chart"]
    Routes -->|"/log"| LogFood["LogFoodPage<br/>Quick/Camera/Manual<br/>tabs"]
    Routes -->|"/groups"| Groups["GroupPage<br/>Create/Join<br/>Share link"]
    Routes -->|"/groups/:id/leaderboard"| Leader["LeaderboardPage<br/>Daily/Weekly<br/>Ranked list"]

    Dashboard --> Hooks["useDashboard()<br/>daily, weekly<br/>refresh()"]
    LogFood --> API["api.ts<br/>Axios instance<br/>JWT interceptor"]
    Hooks --> API

    API -->|"/api/*"| Vite["Vite Proxy<br/>(dev: localhost:8000)<br/>(prod: Render)"]

    style App fill:#FFF9C4,stroke:#F57C00,stroke-width:4px,color:#000
    style Routes fill:#F5F5F5,stroke:#9E9E9E,stroke-width:2px,color:#000
    style Login fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    style Dashboard fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#000
    style LogFood fill:#E8F5E9,stroke:#388E3C,stroke-width:2px,color:#000
    style Groups fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#000
    style Leader fill:#FFEBEE,stroke:#D32F2F,stroke-width:2px,color:#000
    style Hooks fill:#E0F2F1,stroke:#00796B,stroke-width:2px,color:#000
    style API fill:#FFE0B2,stroke:#EF6C00,stroke-width:4px,color:#000
    style Vite fill:#E8EAF6,stroke:#3F51B5,stroke-width:2px,color:#000
```

**Data Flow:**
```
Page → useAuth/useDashboard → api.ts (Axios) → JWT interceptor adds Bearer token →
Vite proxy /api → Render backend → asyncpg → PostgreSQL → JSON response →
Pydantic types → React state update → UI re-render
```

---

## 6. Deployment & CI/CD

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e8f5e9','primaryTextColor':'#000','primaryBorderColor':'#388e3c','lineColor':'#424242'}}}%%
graph LR
    Dev["💻 Local Dev<br/>npm run dev :5173<br/>uvicorn :8000"] -->|git push| GitHub["📦 GitHub<br/>master branch"]

    GitHub -->|webhook| Vercel["🌐 Vercel Deploy<br/>npm install<br/>npm run build<br/>~60s"]
    GitHub -->|webhook| Render["🐍 Render Deploy<br/>pip install<br/>Docker build<br/>~3-5min"]

    Vercel -.->|vercel.json rewrites| User["👤 User Request"]
    User -->|"/api/*"| Render
    User -->|"/*"| Vercel

    Render --> Neon["🗄️ Neon PostgreSQL<br/>Always-on<br/>No deploys"]

    style Dev fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#000
    style GitHub fill:#FFF9C4,stroke:#F57C00,stroke-width:4px,color:#000
    style Vercel fill:#E8F5E9,stroke:#388E3C,stroke-width:4px,color:#000
    style Render fill:#FFE0B2,stroke:#EF6C00,stroke-width:4px,color:#000
    style User fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    style Neon fill:#FFEBEE,stroke:#D32F2F,stroke-width:2px,color:#000
```

**Production Request Flow:**
```
User → https://protein-calorie-tracker.vercel.app
  ↳ Static assets (HTML/JS/CSS) → Vercel CDN (instant)
  ↳ API calls /api/* → Vercel rewrites to Render backend
    ↳ Render (may cold-start ~30s if sleeping)
      ↳ asyncpg pool → Neon PostgreSQL (serverless, instant)
        ↳ JSON response → Vercel → User

SPA routes (/, /log, /groups) → Vercel serves index.html → React Router handles routing
```

**Environment Variables (Render):**
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
GEMINI_API_KEY=...
FRONTEND_URL=https://protein-calorie-tracker.vercel.app
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
```

---

## Technology Stack

### Frontend
- **React 18** + TypeScript
- **Vite** (build tool + dev server)
- **React Router** (client-side routing)
- **Tailwind CSS** (styling)
- **Axios** (HTTP client with JWT interceptor)
- **PWA** (manifest.json + service worker)

### Backend
- **FastAPI** (Python async web framework)
- **asyncpg** (PostgreSQL async driver)
- **Pydantic** (data validation)
- **Google OAuth 2.0**
- **JWT** (HS256 algorithm)
- **Google Gemini Vision API**

### Infrastructure
- **Vercel** (frontend hosting, CDN)
- **Render** (backend hosting, Docker)
- **Neon** (serverless PostgreSQL)
- **GitHub** (source control + webhooks)

---

## Key Patterns & Gotchas

### 1. Timezone Handling
- Frontend sends **local datetime/date** to backend
- Backend uses `TIMESTAMPTZ` for all timestamps
- asyncpg requires Python `date` objects (not ISO strings) for DATE queries
- Frontend: `toLocalDateStr()` helper converts Date → YYYY-MM-DD

### 2. JWT Flow
- OAuth callback → JWT issue → `localStorage` → Axios interceptor → Bearer header
- 7-day expiry, HS256 algorithm
- Payload: `{user_id: int, exp: timestamp}`

### 3. Dependency Injection
- FastAPI `Depends()` for db connection pooling and auth
- `get_db()` → `pool.acquire()` → yields connection
- `get_current_user()` → JWT validation → returns user dict

### 4. PWA Features
- Service worker + manifest for installable app
- iOS: Manual "Add to Home Screen" (Safari only)
- Android: Automatic install prompt

### 5. asyncpg Gotchas
- Numbered params: `$1, $2, $3...` (not `?`)
- Date objects: `date.fromisoformat(str)` for queries
- `RETURNING id` with `fetchval()` instead of `lastrowid`
- `Record` objects: dict-like, use `.isoformat()` for datetimes

---

## File Structure

```
protein-calorie-tracker/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Route components
│   │   ├── components/     # Reusable UI
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # AuthContext
│   │   ├── api.ts          # Axios + JWT interceptor
│   │   └── main.tsx
│   ├── vercel.json         # Vercel rewrites
│   └── vite.config.ts      # Vite proxy + PWA
├── backend/
│   ├── routers/            # 4 API route modules
│   │   ├── auth_router.py
│   │   ├── food_router.py
│   │   ├── dashboard_router.py
│   │   └── group_router.py
│   ├── main.py             # FastAPI app + lifespan
│   ├── database.py         # asyncpg pool + migrations
│   ├── dependencies.py     # get_db, get_current_user
│   ├── auth.py             # JWT + OAuth
│   ├── gemini_client.py    # Vision API
│   ├── seed.py             # Common foods seeder
│   └── models.py           # Pydantic models
└── docs/
    ├── ARCHITECTURE.md     # This file
    └── *.excalidraw        # Editable diagrams
```

---

## Links

- **Live App**: https://protein-calorie-tracker.vercel.app
- **Backend**: https://protein-calorie-tracker.onrender.com
- **GitHub**: https://github.com/shra1-honade/protein-calorie-tracker
- **API Docs**: https://protein-calorie-tracker.onrender.com/docs
