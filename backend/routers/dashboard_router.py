from fastapi import APIRouter, Depends, Query
import aiosqlite
from datetime import date, timedelta

from dependencies import get_db, get_current_user
from models import DailySummary, FoodEntryResponse, WeeklyResponse, WeeklyDay

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/daily", response_model=DailySummary)
async def get_daily(
    date_str: str = Query(None, alias="date", description="YYYY-MM-DD"),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    target_date = date_str or date.today().isoformat()

    cursor = await db.execute(
        """SELECT * FROM food_entries
           WHERE user_id = ? AND DATE(logged_at) = ?
           ORDER BY logged_at DESC""",
        (user["id"], target_date),
    )
    rows = await cursor.fetchall()
    entries = [FoodEntryResponse(**dict(r)) for r in rows]

    total_protein = sum(e.protein_g for e in entries)
    total_calories = sum(e.calories for e in entries)

    return DailySummary(
        date=target_date,
        total_protein=round(total_protein, 1),
        total_calories=round(total_calories, 1),
        protein_goal=user["protein_goal"],
        calorie_goal=user["calorie_goal"],
        entries=entries,
    )


@router.get("/weekly", response_model=WeeklyResponse)
async def get_weekly(
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    today = date.today()
    days = []

    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        d_str = d.isoformat()
        cursor = await db.execute(
            """SELECT COALESCE(SUM(protein_g), 0) as total_protein,
                      COALESCE(SUM(calories), 0) as total_calories
               FROM food_entries
               WHERE user_id = ? AND DATE(logged_at) = ?""",
            (user["id"], d_str),
        )
        row = await cursor.fetchone()
        days.append(
            WeeklyDay(
                date=d_str,
                total_protein=round(row[0], 1),
                total_calories=round(row[1], 1),
            )
        )

    return WeeklyResponse(
        days=days,
        protein_goal=user["protein_goal"],
        calorie_goal=user["calorie_goal"],
    )
