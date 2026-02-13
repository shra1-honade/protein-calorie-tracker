from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from dependencies import get_db, get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStats(BaseModel):
    total_users: int
    new_users_last_24h: int
    new_users_last_7_days: int
    total_food_entries: int
    total_groups: int
    active_users_last_7_days: int
    total_protein_logged_all_time: float
    total_calories_logged_all_time: float


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get platform-wide statistics (requires authentication)"""

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7_days = now - timedelta(days=7)

    # Debug: Check if db connection is working
    try:
        test_query = await db.fetchval("SELECT 1")
        print(f"DEBUG: DB connection test: {test_query}")
    except Exception as e:
        print(f"DEBUG: DB connection error: {e}")

    # Total users
    total_users = await db.fetchval("SELECT COUNT(*) FROM users")
    print(f"DEBUG: total_users query result: {total_users}")

    # New users in last 24 hours
    new_users_last_24h = await db.fetchval(
        "SELECT COUNT(*) FROM users WHERE created_at >= $1", last_24h
    )

    # New users in last 7 days
    new_users_last_7_days = await db.fetchval(
        "SELECT COUNT(*) FROM users WHERE created_at >= $1", last_7_days
    )

    # Total food entries
    total_food_entries = await db.fetchval("SELECT COUNT(*) FROM food_entries")

    # Total groups
    total_groups = await db.fetchval("SELECT COUNT(*) FROM groups")

    # Active users (logged food in last 7 days)
    active_users_last_7_days = await db.fetchval(
        """SELECT COUNT(DISTINCT user_id)
           FROM food_entries
           WHERE logged_at >= $1""",
        last_7_days,
    )

    # Total nutrition logged all time
    nutrition_totals = await db.fetchrow(
        """SELECT
           COALESCE(SUM(protein_g), 0) as total_protein,
           COALESCE(SUM(calories), 0) as total_calories
           FROM food_entries"""
    )

    return AdminStats(
        total_users=total_users,
        new_users_last_24h=new_users_last_24h,
        new_users_last_7_days=new_users_last_7_days,
        total_food_entries=total_food_entries,
        total_groups=total_groups,
        active_users_last_7_days=active_users_last_7_days,
        total_protein_logged_all_time=round(nutrition_totals["total_protein"], 1),
        total_calories_logged_all_time=round(nutrition_totals["total_calories"], 1),
    )
