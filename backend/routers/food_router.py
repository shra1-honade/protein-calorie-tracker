from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from datetime import datetime, timezone
import json

from dependencies import get_db, get_current_user
from models import (
    CommonFoodResponse,
    FoodLogRequest,
    FoodEntryResponse,
    MealPlanResponse,
    WeeklyMealPlanResponse,
    WeeklyDayPlan,
    GenerateWeeklyPlanRequest,
    RefineWeeklyPlanRequest,
    RefineWeeklyPlanResponse,
)
from gemini_client import detect_food_from_image, generate_meal_plan, generate_weekly_meal_plan, refine_weekly_meal_plan

router = APIRouter(prefix="/food", tags=["food"])

_MEAL_ORDER = {"breakfast": 0, "lunch": 1, "dinner": 2, "snack": 3}

def _sort_meals(plan_days: list) -> list:
    for day in plan_days:
        if hasattr(day, "meal_plan"):
            day.meal_plan.sort(key=lambda m: _MEAL_ORDER.get(m.meal_type, 99))
        elif isinstance(day, dict):
            day["meal_plan"].sort(key=lambda m: _MEAL_ORDER.get(m.get("meal_type", ""), 99))
    return plan_days


@router.get("/common", response_model=list[CommonFoodResponse])
async def get_common_foods(db=Depends(get_db)):
    rows = await db.fetch("SELECT * FROM common_foods ORDER BY sort_order")
    return [CommonFoodResponse(**dict(r)) for r in rows]


@router.post("/detect", response_model=dict)
async def detect_food(
    image: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
):
    """Upload food image for AI detection."""
    contents = await image.read()
    result = await detect_food_from_image(contents)
    return result


@router.post("/log", response_model=FoodEntryResponse)
async def log_food(
    entry: FoodLogRequest,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if entry.logged_at:
        logged_at = datetime.fromisoformat(entry.logged_at)
    else:
        logged_at = datetime.now(timezone.utc)

    new_id = await db.fetchval(
        """INSERT INTO food_entries
           (user_id, food_name, protein_g, calories, carbs_g, fdc_id, meal_type, serving_qty, logged_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id""",
        user["id"],
        entry.food_name,
        entry.protein_g * entry.serving_qty,
        entry.calories * entry.serving_qty,
        entry.carbs_g * entry.serving_qty,
        entry.fdc_id,
        entry.meal_type,
        entry.serving_qty,
        logged_at,
    )

    row = await db.fetchrow("SELECT * FROM food_entries WHERE id = $1", new_id)
    return FoodEntryResponse(**_row_to_dict(row))


@router.get("/entries", response_model=list[FoodEntryResponse])
async def get_entries(
    date: str = Query(..., description="YYYY-MM-DD"),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    from datetime import date as date_type
    target = date_type.fromisoformat(date)
    rows = await db.fetch(
        """SELECT * FROM food_entries
           WHERE user_id = $1 AND DATE(logged_at) = $2
           ORDER BY logged_at DESC""",
        user["id"], target,
    )
    return [FoodEntryResponse(**_row_to_dict(r)) for r in rows]


@router.delete("/entries/{entry_id}")
async def delete_entry(
    entry_id: int,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    entry = await db.fetchrow(
        "SELECT * FROM food_entries WHERE id = $1 AND user_id = $2",
        entry_id, user["id"],
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    await db.execute("DELETE FROM food_entries WHERE id = $1", entry_id)
    return {"ok": True}


@router.get("/meal-plan", response_model=MealPlanResponse)
async def get_meal_plan(
    date: str = Query(..., description="YYYY-MM-DD"),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Generate a personalized AI meal plan based on today's logged entries."""
    from datetime import date as date_type
    target = date_type.fromisoformat(date)
    rows = await db.fetch(
        """SELECT food_name, protein_g, calories, carbs_g, meal_type
           FROM food_entries
           WHERE user_id = $1 AND DATE(logged_at) = $2
           ORDER BY logged_at""",
        user["id"], target,
    )
    entries = [dict(r) for r in rows]

    from datetime import timedelta
    history_rows = await db.fetch(
        """SELECT food_name, protein_g, calories, carbs_g, meal_type,
                  DATE(logged_at) AS log_date
           FROM food_entries
           WHERE user_id = $1
             AND DATE(logged_at) < $2
             AND DATE(logged_at) >= $2 - INTERVAL '7 days'
           ORDER BY logged_at""",
        user["id"], target,
    )
    history_entries = [dict(r) for r in history_rows]

    try:
        result = await generate_meal_plan(user, entries, history_entries)
    except Exception as e:
        msg = str(e)
        print(f"[meal-plan] Gemini error: {msg}")
        if "429" in msg or "quota" in msg.lower() or "exhausted" in msg.lower():
            raise HTTPException(status_code=503, detail="AI service quota reached. Please try again later.")
        raise HTTPException(status_code=500, detail="Failed to generate meal plan. Please try again.")
    return MealPlanResponse(**result)


@router.post("/weekly-meal-plan/generate", response_model=WeeklyMealPlanResponse)
async def generate_weekly_plan(
    body: GenerateWeeklyPlanRequest,
    user: dict = Depends(get_current_user),
):
    """Generate a fresh 7-day meal plan (not saved automatically)."""
    try:
        plan_days = await generate_weekly_meal_plan(user, body.week_start)
    except Exception as e:
        msg = str(e)
        print(f"[weekly-meal-plan] Gemini error: {msg}")
        if "429" in msg or "quota" in msg.lower() or "exhausted" in msg.lower():
            raise HTTPException(status_code=503, detail="AI service quota reached. Please try again later.")
        raise HTTPException(status_code=500, detail="Failed to generate weekly meal plan. Please try again.")
    return WeeklyMealPlanResponse(week_start=body.week_start, plan=_sort_meals(plan_days), saved=False)


@router.get("/weekly-meal-plan", response_model=WeeklyMealPlanResponse)
async def get_weekly_plan(
    week_start: str = Query(..., description="YYYY-MM-DD (Monday of the week)"),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Load the saved weekly meal plan for a given week."""
    from datetime import date as date_type
    week_date = date_type.fromisoformat(week_start)
    row = await db.fetchrow(
        "SELECT plan_data, conversation_history FROM weekly_meal_plans WHERE user_id = $1 AND week_start = $2",
        user["id"], week_date,
    )
    if not row:
        raise HTTPException(status_code=404, detail="No saved plan for this week.")
    plan_data = row["plan_data"]
    if isinstance(plan_data, str):
        plan_data = json.loads(plan_data)
    return WeeklyMealPlanResponse(week_start=week_start, plan=plan_data, saved=True)


@router.post("/weekly-meal-plan/save")
async def save_weekly_plan(
    body: WeeklyMealPlanResponse,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Upsert a weekly meal plan into the database."""
    from datetime import date as date_type
    week_date = date_type.fromisoformat(body.week_start)
    plan_json = json.dumps([d.model_dump() for d in body.plan])
    await db.execute(
        """INSERT INTO weekly_meal_plans (user_id, week_start, plan_data, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (user_id, week_start)
           DO UPDATE SET plan_data = EXCLUDED.plan_data, updated_at = NOW()""",
        user["id"], week_date, plan_json,
    )
    return {"saved": True}


@router.post("/weekly-meal-plan/refine", response_model=RefineWeeklyPlanResponse)
async def refine_weekly_plan(
    body: RefineWeeklyPlanRequest,
    user: dict = Depends(get_current_user),
):
    """Refine an existing weekly plan via a natural language prompt."""
    current_plan_dicts = [d.model_dump() for d in body.current_plan]
    history_dicts = [m.model_dump() for m in body.conversation_history]
    try:
        result = await refine_weekly_meal_plan(user, current_plan_dicts, body.prompt, history_dicts)
    except Exception as e:
        msg = str(e)
        print(f"[weekly-meal-plan/refine] Gemini error: {msg}")
        if "429" in msg or "quota" in msg.lower() or "exhausted" in msg.lower():
            raise HTTPException(status_code=503, detail="AI service quota reached. Please try again later.")
        raise HTTPException(status_code=500, detail="Failed to refine meal plan. Please try again.")
    for day in result["plan"]:
        day["meal_plan"].sort(key=lambda m: _MEAL_ORDER.get(m.get("meal_type", ""), 99))
    return RefineWeeklyPlanResponse(
        week_start=body.week_start,
        plan=result["plan"],
        saved=False,
        assistant_message=result["assistant_message"],
    )


def _row_to_dict(row):
    """Convert asyncpg Record to dict, converting datetimes to ISO strings."""
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d
