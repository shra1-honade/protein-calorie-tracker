from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
import aiosqlite

from auth import get_google_login_url, exchange_google_code, create_jwt
from dependencies import get_db, get_current_user
from models import UserResponse, GoalUpdate
from config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
async def google_login():
    return {"url": get_google_login_url()}


@router.get("/google/callback")
async def google_callback(code: str, db: aiosqlite.Connection = Depends(get_db)):
    try:
        google_user = await exchange_google_code(code)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google")

    google_id = google_user["id"]
    email = google_user["email"]
    display_name = google_user.get("name", email)
    avatar_url = google_user.get("picture")

    # Upsert user
    cursor = await db.execute(
        "SELECT id FROM users WHERE google_id = ?", (google_id,)
    )
    existing = await cursor.fetchone()

    if existing:
        user_id = existing[0]
        await db.execute(
            "UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?",
            (display_name, avatar_url, user_id),
        )
    else:
        cursor = await db.execute(
            """INSERT INTO users (google_id, email, display_name, avatar_url)
               VALUES (?, ?, ?, ?)""",
            (google_id, email, display_name, avatar_url),
        )
        user_id = cursor.lastrowid

    await db.commit()
    token = create_jwt(user_id)
    frontend_url = get_settings().frontend_url
    return RedirectResponse(f"{frontend_url}/auth/callback?token={token}")


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)


@router.put("/me/goals", response_model=UserResponse)
async def update_goals(
    goals: GoalUpdate,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    updates = {}
    if goals.protein_goal is not None:
        updates["protein_goal"] = goals.protein_goal
    if goals.calorie_goal is not None:
        updates["calorie_goal"] = goals.calorie_goal

    if not updates:
        return UserResponse(**user)

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [user["id"]]
    await db.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
    await db.commit()

    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user["id"],))
    updated = await cursor.fetchone()
    return UserResponse(**dict(updated))
