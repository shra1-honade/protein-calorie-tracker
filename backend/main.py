from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import create_pool, close_pool, init_db
from seed import seed_common_foods
from routers import auth_router, food_router, dashboard_router, group_router, admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    await init_db()
    await seed_common_foods()
    yield
    await close_pool()


app = FastAPI(title="Protein & Calorie Tracker", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(food_router.router)
app.include_router(dashboard_router.router)
app.include_router(group_router.router)
app.include_router(admin_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
