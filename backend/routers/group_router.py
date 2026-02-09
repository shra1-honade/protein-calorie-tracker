import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite
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
    db: aiosqlite.Connection = Depends(get_db),
):
    invite_code = generate_invite_code()
    cursor = await db.execute(
        "INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?)",
        (req.name, invite_code, user["id"]),
    )
    group_id = cursor.lastrowid

    await db.execute(
        "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
        (group_id, user["id"]),
    )
    await db.commit()

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
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT * FROM groups WHERE invite_code = ?", (req.invite_code,)
    )
    group = await cursor.fetchone()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group = dict(group)
    # Check if already a member
    cursor = await db.execute(
        "SELECT id FROM group_members WHERE group_id = ? AND user_id = ?",
        (group["id"], user["id"]),
    )
    if await cursor.fetchone():
        pass  # Already a member, just return
    else:
        try:
            await db.execute(
                "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
                (group["id"], user["id"]),
            )
            await db.commit()
        except Exception:
            # Race condition: already joined between check and insert
            await db.rollback()

    cursor = await db.execute(
        "SELECT COUNT(*) FROM group_members WHERE group_id = ?", (group["id"],)
    )
    count = (await cursor.fetchone())[0]

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
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        """SELECT g.*, COUNT(gm2.id) as member_count
           FROM groups g
           JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
           JOIN group_members gm2 ON gm2.group_id = g.id
           GROUP BY g.id
           ORDER BY g.created_at DESC""",
        (user["id"],),
    )
    rows = await cursor.fetchall()
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
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    # Verify user is in the group
    cursor = await db.execute(
        "SELECT id FROM group_members WHERE group_id = ? AND user_id = ?",
        (group_id, user["id"]),
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    if period == "daily":
        date_filter = date.today().isoformat()
        date_clause = "DATE(fe.logged_at) = ?"
        date_params = [date_filter]
    else:
        start = (date.today() - timedelta(days=6)).isoformat()
        end = date.today().isoformat()
        date_clause = "DATE(fe.logged_at) BETWEEN ? AND ?"
        date_params = [start, end]

    cursor = await db.execute(
        f"""SELECT u.id as user_id, u.display_name, u.avatar_url,
                   COALESCE(SUM(fe.protein_g), 0) as total_protein
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            LEFT JOIN food_entries fe ON fe.user_id = u.id AND {date_clause}
            WHERE gm.group_id = ?
            GROUP BY u.id
            ORDER BY total_protein DESC""",
        (*date_params, group_id),
    )
    rows = await cursor.fetchall()

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
