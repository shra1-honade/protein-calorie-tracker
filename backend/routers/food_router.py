from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from datetime import datetime, timezone

from dependencies import get_db, get_current_user
from models import (
    CommonFoodResponse,
    FoodLogRequest,
    FoodEntryResponse,
)
from gemini_client import detect_food_from_image

router = APIRouter(prefix="/food", tags=["food"])


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
           (user_id, food_name, protein_g, calories, fdc_id, meal_type, serving_qty, logged_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id""",
        user["id"],
        entry.food_name,
        entry.protein_g * entry.serving_qty,
        entry.calories * entry.serving_qty,
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
    rows = await db.fetch(
        """SELECT * FROM food_entries
           WHERE user_id = $1 AND DATE(logged_at) = $2::date
           ORDER BY logged_at DESC""",
        user["id"], date,
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


def _row_to_dict(row):
    """Convert asyncpg Record to dict, converting datetimes to ISO strings."""
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d
