# Production Deployment Guide (FREE Hosting)

> **Current Status:** App is running locally via ngrok (good for testing, but requires your computer to stay on)
>
> **Goal:** Deploy to free hosting platforms for permanent 24/7 access

## 📋 Overview

This guide will help you deploy your Protein Tracker app to free hosting platforms.

---

## 🎯 Recommended Free Hosting Stack

### 1. **Frontend (React + Vite)**
**Vercel** (Recommended) or **Netlify**
- ✅ Free tier: Unlimited deployments
- ✅ Auto-deploy from GitHub
- ✅ Custom domain support
- ✅ Built-in HTTPS
- ✅ Global CDN

### 2. **Backend (FastAPI)**
**Railway** (Recommended), **Render**, or **Fly.io**
- ✅ Free tier: 500 hours/month (Railway)
- ✅ PostgreSQL database included
- ✅ Auto-deploy from GitHub
- ✅ Environment variables support

### 3. **Database**
**PostgreSQL** (included with Railway/Render)
- Migrate from SQLite to PostgreSQL
- Free tier includes database storage

---

## 🚀 Deployment Steps (High-Level)

### Step 1: Prepare Code
- [ ] Push code to GitHub repository
- [ ] Add `.gitignore` for `.env` files
- [ ] Create production environment configs

### Step 2: Deploy Backend (Railway)
- [ ] Sign up for Railway account
- [ ] Create new project from GitHub repo
- [ ] Add environment variables (GOOGLE_CLIENT_ID, etc.)
- [ ] Provision PostgreSQL database
- [ ] Update database connection code for PostgreSQL
- [ ] Deploy and get production URL

### Step 3: Deploy Frontend (Vercel)
- [ ] Sign up for Vercel account
- [ ] Import GitHub repository
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Add environment variable: `VITE_API_URL` (Railway backend URL)
- [ ] Deploy and get production URL

### Step 4: Update OAuth Settings
- [ ] Go to Google Cloud Console
- [ ] Add new redirect URIs:
  - `https://your-backend.railway.app/auth/google/callback`
- [ ] Update `FRONTEND_URL` in Railway env vars

### Step 5: Test Production
- [ ] Test Google login
- [ ] Test camera food detection (requires HTTPS)
- [ ] Test groups and leaderboards
- [ ] Invite friends to test

---

## 📝 Code Changes Needed

### Database Migration (SQLite → PostgreSQL)

**Install PostgreSQL driver:**
```bash
pip install asyncpg
```

**Update `database.py`:**
```python
# Change from aiosqlite to asyncpg
import asyncpg
# Update connection logic for PostgreSQL
```

**Update environment variable:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Frontend API URL

**Update `vite.config.ts`:**
Remove proxy (only needed for local dev), use environment variable:

```typescript
// Remove proxy in production
// API calls will go to VITE_API_URL
```

**Update `api.ts`:**
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
```

---

## 💰 Cost Breakdown (All FREE)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Vercel (Frontend) | ✅ Free forever | 100 GB bandwidth/month |
| Railway (Backend) | ✅ $5 credit/month | ~500 hours runtime |
| PostgreSQL (Railway) | ✅ Included | 1 GB storage |
| Google OAuth | ✅ Free | Unlimited |
| Gemini API | ✅ Free tier | 15 requests/min |

**Total monthly cost: $0** (within free tier limits)

---

## 🔗 Useful Links

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Railway Deployment Guide](https://docs.railway.app/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Vite Production Build](https://vitejs.dev/guide/build.html)

---

## 📌 Notes

- Keep `.env` files in `.gitignore` (never commit secrets!)
- Use environment variables for all sensitive data
- Free tiers have usage limits but are plenty for personal projects
- Can upgrade to paid tiers later if needed

---

**When you're ready to deploy, just ask Claude to help with the detailed step-by-step process!**
