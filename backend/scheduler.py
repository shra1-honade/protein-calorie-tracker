import asyncio
import json
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from pywebpush import webpush, WebPushException

import database
from config import get_settings

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None

# Meal windows (local hour ranges, inclusive start, exclusive end)
MEAL_WINDOWS = {
    "breakfast": (5, 11),
    "lunch": (11, 16),
    "dinner": (16, 24),
}

MEAL_PAYLOADS = {
    "breakfast": {
        "title": "Time for Breakfast!",
        "body": "Start your day right — log your breakfast to hit your protein goal.",
        "tag": "breakfast-reminder",
    },
    "lunch": {
        "title": "Lunch Time!",
        "body": "Don't forget to log your lunch and keep your nutrition on track.",
        "tag": "lunch-reminder",
    },
    "dinner": {
        "title": "Dinner Reminder",
        "body": "Evening check-in — log your dinner to wrap up your daily goals.",
        "tag": "dinner-reminder",
    },
}


def _send_push_sync(endpoint: str, p256dh: str, auth: str, payload: dict, settings):
    """Synchronous pywebpush call, run in a thread via asyncio.to_thread."""
    webpush(
        subscription_info={
            "endpoint": endpoint,
            "keys": {"p256dh": p256dh, "auth": auth},
        },
        data=json.dumps(payload),
        vapid_private_key=settings.vapid_private_key,
        vapid_claims={"sub": f"mailto:{settings.vapid_contact_email}"},
    )


async def check_and_send_meal_notifications(meal_type: str):
    if not database.pool:
        return

    settings = get_settings()
    if not settings.vapid_private_key or not settings.vapid_public_key:
        return

    time_col = f"notif_{meal_type}_time"
    window_start, window_end = MEAL_WINDOWS[meal_type]
    payload_meta = MEAL_PAYLOADS[meal_type]

    now_utc = datetime.now(timezone.utc)

    async with database.pool.acquire() as db:
        rows = await db.fetch(
            f"""
            SELECT ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth, ps.timezone,
                   u.{time_col} AS reminder_time
            FROM push_subscriptions ps
            JOIN users u ON u.id = ps.user_id
            WHERE u.notif_enabled = TRUE
            """
        )

        stale_ids = []
        for row in rows:
            try:
                # Convert now to user's timezone
                try:
                    import zoneinfo
                    tz = zoneinfo.ZoneInfo(row["timezone"])
                except Exception:
                    tz = timezone.utc
                now_local = now_utc.astimezone(tz)
                current_hhmm = now_local.strftime("%H:%M")

                if current_hhmm != row["reminder_time"]:
                    continue

                # Check if any food logged in this meal's window today
                today_local = now_local.date()
                local_start = datetime(today_local.year, today_local.month, today_local.day,
                                       window_start, 0, 0, tzinfo=tz)
                if window_end == 24:
                    import datetime as dt_mod
                    local_end = datetime(today_local.year, today_local.month, today_local.day,
                                         23, 59, 59, tzinfo=tz)
                else:
                    local_end = datetime(today_local.year, today_local.month, today_local.day,
                                         window_end, 0, 0, tzinfo=tz)

                count = await db.fetchval(
                    """
                    SELECT COUNT(*) FROM food_entries
                    WHERE user_id = $1
                      AND logged_at >= $2
                      AND logged_at <= $3
                    """,
                    row["user_id"], local_start, local_end,
                )

                if count and count > 0:
                    continue

                # Send push notification
                payload = {
                    **payload_meta,
                    "data": {"url": "/log"},
                }
                try:
                    await asyncio.to_thread(
                        _send_push_sync,
                        row["endpoint"], row["p256dh"], row["auth"], payload, settings,
                    )
                except WebPushException as e:
                    resp = getattr(e, "response", None)
                    status = getattr(resp, "status_code", None) if resp else None
                    if status in (404, 410):
                        stale_ids.append(row["id"])
                    else:
                        logger.warning("Push failed for sub %s: %s", row["id"], e)
                except Exception as e:
                    logger.warning("Push error for sub %s: %s", row["id"], e)

            except Exception as e:
                logger.error("Error processing subscription %s: %s", row.get("id"), e)

        for sub_id in stale_ids:
            await db.execute("DELETE FROM push_subscriptions WHERE id = $1", sub_id)


def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    for meal in ("breakfast", "lunch", "dinner"):
        _scheduler.add_job(
            check_and_send_meal_notifications,
            CronTrigger(minute="*"),
            args=[meal],
            id=f"notif_{meal}",
            replace_existing=True,
        )
    _scheduler.start()
    logger.info("Notification scheduler started")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
