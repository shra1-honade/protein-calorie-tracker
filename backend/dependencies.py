from fastapi import Depends, HTTPException, Header
import aiosqlite
from database import get_db_connection
from auth import decode_jwt


async def get_db():
    db = await get_db_connection()
    try:
        yield db
    finally:
        await db.close()


async def get_current_user(
    authorization: str = Header(None), db: aiosqlite.Connection = Depends(get_db)
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    payload = decode_jwt(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])
    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = await cursor.fetchone()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return dict(user)
