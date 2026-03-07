from fastapi import APIRouter, Depends, HTTPException

from config import get_settings
from dependencies import get_db, get_current_user
from models import PushSubscriptionRequest, NotificationPrefsUpdate, NotificationPrefsResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"vapid_public_key": get_settings().vapid_public_key}


@router.post("/subscribe", status_code=204)
async def subscribe(
    sub: PushSubscriptionRequest,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    await db.execute(
        """
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, timezone)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, endpoint) DO UPDATE
            SET p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                timezone = EXCLUDED.timezone
        """,
        user["id"], sub.endpoint, sub.p256dh, sub.auth, sub.timezone,
    )


@router.delete("/unsubscribe", status_code=204)
async def unsubscribe(
    body: dict,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    endpoint = body.get("endpoint")
    if not endpoint:
        raise HTTPException(status_code=400, detail="endpoint required")
    await db.execute(
        "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
        user["id"], endpoint,
    )


@router.get("/prefs", response_model=NotificationPrefsResponse)
async def get_prefs(user: dict = Depends(get_current_user)):
    return NotificationPrefsResponse(
        notif_enabled=user.get("notif_enabled", False),
        notif_breakfast_time=user.get("notif_breakfast_time", "08:00"),
        notif_lunch_time=user.get("notif_lunch_time", "12:30"),
        notif_dinner_time=user.get("notif_dinner_time", "19:00"),
        vapid_public_key=get_settings().vapid_public_key,
    )


@router.put("/prefs", status_code=204)
async def update_prefs(
    prefs: NotificationPrefsUpdate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    updates = {}
    if prefs.notif_enabled is not None:
        updates["notif_enabled"] = prefs.notif_enabled
    if prefs.notif_breakfast_time is not None:
        updates["notif_breakfast_time"] = prefs.notif_breakfast_time
    if prefs.notif_lunch_time is not None:
        updates["notif_lunch_time"] = prefs.notif_lunch_time
    if prefs.notif_dinner_time is not None:
        updates["notif_dinner_time"] = prefs.notif_dinner_time

    if not updates:
        return

    set_parts = []
    params = []
    for i, (k, v) in enumerate(updates.items(), 1):
        set_parts.append(f"{k} = ${i}")
        params.append(v)
    params.append(user["id"])
    await db.execute(
        f"UPDATE users SET {', '.join(set_parts)} WHERE id = ${len(params)}",
        *params,
    )
