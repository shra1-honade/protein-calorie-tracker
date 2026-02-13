import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import date, timedelta

from dependencies import get_db, get_current_user
from models import (
    GroupCreateRequest,
    GroupJoinRequest,
    GroupResponse,
    LeaderboardEntry,
)

router = APIRouter(prefix="/groups", tags=["groups"])


def generate_invite_code() -> str:
    return secrets.token_urlsafe(6)[:8]


@router.post("/create", response_model=GroupResponse)
async def create_group(
    req: GroupCreateRequest,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    invite_code = generate_invite_code()
    async with db.transaction():
        group_id = await db.fetchval(
            "INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING id",
            req.name, invite_code, user["id"],
        )
        await db.execute(
            "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
            group_id, user["id"],
        )

    return GroupResponse(
        id=group_id,
        name=req.name,
        invite_code=invite_code,
        member_count=1,
        created_by=user["id"],
    )


@router.post("/join", response_model=GroupResponse)
async def join_group(
    req: GroupJoinRequest,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    group = await db.fetchrow(
        "SELECT * FROM groups WHERE invite_code = $1", req.invite_code
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group = dict(group)
    # Check if already a member
    existing = await db.fetchrow(
        "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2",
        group["id"], user["id"],
    )
    if not existing:
        try:
            await db.execute(
                "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
                group["id"], user["id"],
            )
        except Exception:
            pass  # Race condition: already joined between check and insert

    count = await db.fetchval(
        "SELECT COUNT(*) FROM group_members WHERE group_id = $1", group["id"]
    )

    return GroupResponse(
        id=group["id"],
        name=group["name"],
        invite_code=group["invite_code"],
        member_count=count,
        created_by=group["created_by"],
    )


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    rows = await db.fetch(
        """SELECT g.*, COUNT(gm2.id) as member_count
           FROM groups g
           JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
           JOIN group_members gm2 ON gm2.group_id = g.id
           GROUP BY g.id
           ORDER BY g.created_at DESC""",
        user["id"],
    )
    return [
        GroupResponse(
            id=r["id"],
            name=r["name"],
            invite_code=r["invite_code"],
            member_count=r["member_count"],
            created_by=r["created_by"],
        )
        for r in rows
    ]


@router.get("/{group_id}/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    group_id: int,
    period: str = Query("daily", regex="^(daily|weekly)$"),
    today_str: str = Query(None, alias="today", description="YYYY-MM-DD client local date"),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    # Verify user is in the group
    member = await db.fetchrow(
        "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2",
        group_id, user["id"],
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    today = date.fromisoformat(today_str) if today_str else date.today()

    if period == "daily":
        date_clause = "DATE(fe.logged_at) = $1"
        date_params = [today]
        group_param = "$2"
    else:
        start = today - timedelta(days=6)
        date_clause = "DATE(fe.logged_at) BETWEEN $1 AND $2"
        date_params = [start, today]
        group_param = "$3"

    rows = await db.fetch(
        f"""SELECT u.id as user_id, u.display_name, u.avatar_url,
                   COALESCE(SUM(fe.protein_g), 0) as total_protein
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            LEFT JOIN food_entries fe ON fe.user_id = u.id AND {date_clause}
            WHERE gm.group_id = {group_param}
            GROUP BY u.id, u.display_name, u.avatar_url
            ORDER BY total_protein DESC""",
        *date_params, group_id,
    )

    return [
        LeaderboardEntry(
            user_id=r["user_id"],
            display_name=r["display_name"],
            avatar_url=r["avatar_url"],
            total_protein=round(r["total_protein"], 1),
            rank=i + 1,
        )
        for i, r in enumerate(rows)
    ]
