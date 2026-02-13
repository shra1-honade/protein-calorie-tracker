# Architecture Diagrams

This directory contains detailed Excalidraw architecture diagrams for the Protein & Calorie Tracker PWA.

## How to View

1. **Online**: Go to [excalidraw.com](https://excalidraw.com) and use File → Open to load any `.excalidraw.json` file
2. **VS Code**: Install the [Excalidraw extension](https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor)
3. **Desktop**: Download [Excalidraw Desktop](https://github.com/excalidraw/excalidraw-desktop/releases)

## Diagrams

### 1. architecture-overview.excalidraw.json
**High-level system architecture**
- User → Vercel (frontend) → Render (backend) → Neon (PostgreSQL)
- Google OAuth & Gemini Vision API integrations
- Total cost: $0/month (all free tiers)
- Auto-deploy on git push to master

### 2. backend-architecture.excalidraw.json
**FastAPI backend structure**
- 4 modular routers: auth, food, dashboard, groups
- Core modules: database.py, dependencies.py, auth.py, gemini_client.py, seed.py
- Request flow: Router → Depends(get_current_user) → Depends(get_db) → Business logic → PostgreSQL
- asyncpg connection pooling with numbered parameters ($1, $2...)

### 3. frontend-architecture.excalidraw.json
**React + Vite PWA structure**
- Pages: Login, Dashboard, LogFood, Groups, Leaderboard
- Components: Layout, Camera, QuickAdd, GoalModal, ShareLink
- Hooks & Context: AuthContext, useDashboard, api.ts (Axios + JWT interceptor)
- Data flow: Page → Hook → api.ts → Vite proxy → Backend

### 4. database-schema.excalidraw.json
**PostgreSQL database design**
- Tables: users, food_entries, common_foods, groups, group_members, schema_version
- Foreign key relationships and indexes
- TIMESTAMPTZ for all timestamps (timezone-aware)
- asyncpg type requirements (date objects, not ISO strings)

### 5. auth-flow.excalidraw.json
**OAuth + JWT authentication flow**
- 10-step flow from login click to authenticated dashboard
- Google OAuth code exchange
- JWT generation (HS256, 7-day expiry)
- Protected route validation via Depends(get_current_user)
- Logout flow

### 6. deployment-flow.excalidraw.json
**CI/CD and production architecture**
- Local dev: Vite proxy /api → localhost:8000
- Git push → GitHub webhook → Vercel + Render auto-deploy
- Production request flow with cold-start behavior
- Environment variables setup
- vercel.json rewrites for API proxy and SPA fallback

## Key Technologies

**Frontend**
- React 18 + TypeScript
- Vite (build tool + dev server)
- React Router (client-side routing)
- Tailwind CSS (styling)
- Axios (HTTP client with JWT interceptor)
- PWA (manifest.json + service worker)

**Backend**
- FastAPI (Python async web framework)
- asyncpg (PostgreSQL async driver)
- Pydantic (data validation)
- Google OAuth 2.0
- JWT (HS256)
- Google Gemini Vision API

**Infrastructure**
- Vercel (frontend hosting, CDN)
- Render (backend hosting, Docker)
- Neon (serverless PostgreSQL)
- GitHub (source control + webhooks)

## Notable Patterns

1. **Timezone handling**: Frontend sends local datetime/date, backend uses TIMESTAMPTZ and date objects
2. **JWT flow**: OAuth callback → JWT issue → localStorage → Axios interceptor → Bearer header
3. **Dependency injection**: FastAPI Depends() for db connection pooling and auth
4. **PWA**: Service worker + manifest for installable app experience
5. **Zero-cost deployment**: All free tier services with auto-deploy
6. **asyncpg gotchas**: $1 params, date objects, RETURNING id, Record.isoformat()

## Project Structure

```
protein-calorie-tracker/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Route components
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React Context (AuthContext)
│   │   ├── api.ts          # Axios instance + interceptor
│   │   └── main.tsx        # Entry point
│   ├── vercel.json         # Vercel rewrites config
│   └── vite.config.ts      # Vite proxy + PWA plugin
├── backend/
│   ├── routers/            # 4 API route modules
│   ├── main.py             # FastAPI app + lifespan
│   ├── database.py         # asyncpg pool + migrations
│   ├── dependencies.py     # get_db, get_current_user
│   ├── auth.py             # JWT + OAuth
│   ├── gemini_client.py    # Vision API
│   └── seed.py             # Common foods seeder
└── docs/                   # This directory
    └── *.excalidraw.json   # Architecture diagrams
```

## Links

- **Live App**: https://protein-calorie-tracker.vercel.app
- **Backend**: https://protein-calorie-tracker.onrender.com
- **GitHub**: https://github.com/shra1-honade/protein-calorie-tracker
