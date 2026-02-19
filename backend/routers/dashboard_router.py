from fastapi import APIRouter, Depends, Query
from datetime import date, timedelta

from dependencies import get_db, get_current_user
from models import DailySummary, FoodEntryResponse, WeeklyResponse, WeeklyDay
from routers.food_router import _row_to_dict

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/daily", response_model=DailySummary)
async def get_daily(
    date_str: str = Query(None, alias="date", description="YYYY-MM-DD"),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    target_date = date.fromisoformat(date_str) if date_str else date.today()

    rows = await db.fetch(
        """SELECT * FROM food_entries
           WHERE user_id = $1 AND DATE(logged_at) = $2
           ORDER BY logged_at DESC""",
        user["id"], target_date,
    )
    entries = [FoodEntryResponse(**_row_to_dict(r)) for r in rows]

    total_protein = sum(e.protein_g for e in entries)
    total_calories = sum(e.calories for e in entries)
    total_carbs = sum(e.carbs_g for e in entries)

    return DailySummary(
        date=target_date.isoformat(),
        total_protein=round(total_protein, 1),
        total_calories=round(total_calories, 1),
        total_carbs=round(total_carbs, 1),
        protein_goal=user["protein_goal"],
        calorie_goal=user["calorie_goal"],
        carb_goal=user["carb_goal"],
        entries=entries,
    )


@router.get("/weekly", response_model=WeeklyResponse)
async def get_weekly(
    today_str: str = Query(None, alias="today", description="YYYY-MM-DD client local date"),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    today = date.fromisoformat(today_str) if today_str else date.today()
    days = []

    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        row = await db.fetchrow(
            """SELECT COALESCE(SUM(protein_g), 0) as total_protein,
                      COALESCE(SUM(calories), 0) as total_calories,
                      COALESCE(SUM(carbs_g), 0) as total_carbs
               FROM food_entries
               WHERE user_id = $1 AND DATE(logged_at) = $2""",
            user["id"], d,
        )
        days.append(
            WeeklyDay(
                date=d.isoformat(),
                total_protein=round(row['total_protein'], 1),
                total_calories=round(row['total_calories'], 1),
                total_carbs=round(row['total_carbs'], 1),
            )
        )

    return WeeklyResponse(
        days=days,
        protein_goal=user["protein_goal"],
        calorie_goal=user["calorie_goal"],
        carb_goal=user["carb_goal"],
    )
