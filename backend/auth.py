from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import httpx
from config import get_settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def create_jwt(user_id: int) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc)
        + timedelta(days=settings.jwt_expiry_days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_jwt(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, get_settings().jwt_secret, algorithms=["HS256"]
        )
        return payload
    except JWTError:
        return None


def get_google_login_url() -> str:
    settings = get_settings()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": f"{settings.frontend_url}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_google_code(code: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": f"{settings.frontend_url}/api/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()

        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        user_resp.raise_for_status()
        return user_resp.json()
