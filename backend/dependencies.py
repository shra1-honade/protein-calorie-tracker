from fastapi import Depends, HTTPException, Header
import database
from auth import decode_jwt


async def get_db():
    async with database.pool.acquire() as conn:
        yield conn


async def get_current_user(
    authorization: str = Header(None), db=Depends(get_db)
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    payload = decode_jwt(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])
    user = await db.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return dict(user)
