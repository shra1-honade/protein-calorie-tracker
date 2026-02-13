# Architecture Documentation

This directory contains architecture documentation for the Protein & Calorie Tracker PWA.

## 📖 Main Documentation

**[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprehensive architecture guide with Mermaid diagrams that render on GitHub:
- System overview
- Backend architecture (FastAPI routers)
- Database schema (PostgreSQL)
- Authentication flow (OAuth + JWT)
- Frontend architecture (React + Vite)
- Deployment & CI/CD
- Technology stack
- Key patterns & gotchas

## 🎨 Excalidraw Diagrams (Editable)

For **editable** diagrams in VS Code:
1. Install the [Excalidraw extension](https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor)
2. Open any `.excalidraw` file in the docs folder

## Diagrams

### 1. [1-system-overview.excalidraw](1-system-overview.excalidraw)
System architecture: User → Vercel → Render → Neon + Google APIs

### 2. [2-backend-routers.excalidraw](2-backend-routers.excalidraw)
FastAPI routers, dependencies, and database connection pool

### 3. [3-database-schema.excalidraw](3-database-schema.excalidraw)
PostgreSQL tables, relationships, and foreign keys

### 4. [4-auth-flow.excalidraw](4-auth-flow.excalidraw)
Google OAuth + JWT authentication flow (6 steps)

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
