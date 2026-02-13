from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from dependencies import get_db, get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStats(BaseModel):
    total_users: int
    new_users_today: int
    new_users_this_week: int
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
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    # Total users
    total_users = await db.fetchval("SELECT COUNT(*) FROM users")

    # New users today
    new_users_today = await db.fetchval(
        "SELECT COUNT(*) FROM users WHERE created_at >= $1", today_start
    )

    # New users this week
    new_users_this_week = await db.fetchval(
        "SELECT COUNT(*) FROM users WHERE created_at >= $1", week_start
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
        week_start,
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
        new_users_today=new_users_today,
        new_users_this_week=new_users_this_week,
        total_food_entries=total_food_entries,
        total_groups=total_groups,
        active_users_last_7_days=active_users_last_7_days,
        total_protein_logged_all_time=round(nutrition_totals["total_protein"], 1),
        total_calories_logged_all_time=round(nutrition_totals["total_calories"], 1),
    )
