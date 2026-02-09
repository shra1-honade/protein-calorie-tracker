from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import aiosqlite
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
async def get_common_foods(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM common_foods ORDER BY sort_order")
    rows = await cursor.fetchall()
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
    db: aiosqlite.Connection = Depends(get_db),
):
    logged_at = entry.logged_at or datetime.now(timezone.utc).isoformat()
    cursor = await db.execute(
        """INSERT INTO food_entries
           (user_id, food_name, protein_g, calories, fdc_id, meal_type, serving_qty, logged_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user["id"],
            entry.food_name,
            entry.protein_g * entry.serving_qty,
            entry.calories * entry.serving_qty,
            entry.fdc_id,
            entry.meal_type,
            entry.serving_qty,
            logged_at,
        ),
    )
    await db.commit()

    cursor = await db.execute(
        "SELECT * FROM food_entries WHERE id = ?", (cursor.lastrowid,)
    )
    row = await cursor.fetchone()
    return FoodEntryResponse(**dict(row))


@router.get("/entries", response_model=list[FoodEntryResponse])
async def get_entries(
    date: str = Query(..., description="YYYY-MM-DD"),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        """SELECT * FROM food_entries
           WHERE user_id = ? AND DATE(logged_at) = ?
           ORDER BY logged_at DESC""",
        (user["id"], date),
    )
    rows = await cursor.fetchall()
    return [FoodEntryResponse(**dict(r)) for r in rows]


@router.delete("/entries/{entry_id}")
async def delete_entry(
    entry_id: int,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT * FROM food_entries WHERE id = ? AND user_id = ?",
        (entry_id, user["id"]),
    )
    entry = await cursor.fetchone()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    await db.execute("DELETE FROM food_entries WHERE id = ?", (entry_id,))
    await db.commit()
    return {"ok": True}
