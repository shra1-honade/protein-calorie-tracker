from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from auth import get_google_login_url, exchange_google_code, create_jwt
from dependencies import get_db, get_current_user
from models import UserResponse, GoalUpdate, UserProfileUpdate
from config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
async def google_login():
    return {"url": get_google_login_url()}


@router.get("/google/callback")
async def google_callback(code: str, db=Depends(get_db)):
    try:
        google_user = await exchange_google_code(code)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google")

    google_id = google_user["id"]
    email = google_user["email"]
    display_name = google_user.get("name", email)
    avatar_url = google_user.get("picture")

    # Upsert user
    existing = await db.fetchrow(
        "SELECT id FROM users WHERE google_id = $1", google_id
    )

    if existing:
        user_id = existing['id']
        await db.execute(
            "UPDATE users SET display_name = $1, avatar_url = $2 WHERE id = $3",
            display_name, avatar_url, user_id,
        )
    else:
        user_id = await db.fetchval(
            """INSERT INTO users (google_id, email, display_name, avatar_url)
               VALUES ($1, $2, $3, $4) RETURNING id""",
            google_id, email, display_name, avatar_url,
        )

    token = create_jwt(user_id)
    frontend_url = get_settings().frontend_url
    redirect_url = f"{frontend_url}/auth/callback?token={token}"
    if not existing:
        redirect_url += "&new_user=1"
    return RedirectResponse(redirect_url)


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)


@router.put("/me/goals", response_model=UserResponse)
async def update_goals(
    goals: GoalUpdate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    updates = {}
    if goals.protein_goal is not None:
        updates["protein_goal"] = goals.protein_goal
    if goals.calorie_goal is not None:
        updates["calorie_goal"] = goals.calorie_goal
    if goals.carb_goal is not None:
        updates["carb_goal"] = goals.carb_goal

    if not updates:
        return UserResponse(**user)

    set_parts = []
    params = []
    for i, (k, v) in enumerate(updates.items(), 1):
        set_parts.append(f"{k} = ${i}")
        params.append(v)
    set_clause = ", ".join(set_parts)
    params.append(user["id"])
    await db.execute(
        f"UPDATE users SET {set_clause} WHERE id = ${len(params)}", *params
    )

    updated = await db.fetchrow("SELECT * FROM users WHERE id = $1", user["id"])
    return UserResponse(**dict(updated))


@router.put("/me/profile", response_model=UserResponse)
async def update_profile(
    profile: UserProfileUpdate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    updates = {}
    for field in ("age", "weight_kg", "height_cm", "sex", "activity_level", "goal_type",
                  "protein_goal", "calorie_goal", "carb_goal", "dietary_preference", "food_dislikes"):
        val = getattr(profile, field)
        if val is not None:
            updates[field] = val

    if not updates:
        return UserResponse(**user)

    set_parts = []
    params = []
    for i, (k, v) in enumerate(updates.items(), 1):
        set_parts.append(f"{k} = ${i}")
        params.append(v)
    set_clause = ", ".join(set_parts)
    params.append(user["id"])
    await db.execute(
        f"UPDATE users SET {set_clause} WHERE id = ${len(params)}", *params
    )

    updated = await db.fetchrow("SELECT * FROM users WHERE id = $1", user["id"])
    return UserResponse(**dict(updated))
