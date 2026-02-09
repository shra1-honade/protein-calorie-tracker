from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Auth ---
class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    protein_goal: float
    calorie_goal: float


class GoalUpdate(BaseModel):
    protein_goal: Optional[float] = None
    calorie_goal: Optional[float] = None


# --- Food ---
class CommonFoodResponse(BaseModel):
    id: int
    name: str
    protein_g: float
    calories: float
    category: str
    icon: str
    sort_order: int


class FoodLogRequest(BaseModel):
    food_name: str
    protein_g: float
    calories: float
    fdc_id: Optional[str] = None
    meal_type: str = "snack"
    serving_qty: float = 1.0
    logged_at: Optional[str] = None  # ISO format, defaults to now


class FoodEntryResponse(BaseModel):
    id: int
    food_name: str
    protein_g: float
    calories: float
    fdc_id: Optional[str] = None
    meal_type: str
    serving_qty: float
    logged_at: str


# --- Dashboard ---
class DailySummary(BaseModel):
    date: str
    total_protein: float
    total_calories: float
    protein_goal: float
    calorie_goal: float
    entries: list[FoodEntryResponse]


class WeeklyDay(BaseModel):
    date: str
    total_protein: float
    total_calories: float


class WeeklyResponse(BaseModel):
    days: list[WeeklyDay]
    protein_goal: float
    calorie_goal: float


# --- Groups ---
class GroupCreateRequest(BaseModel):
    name: str


class GroupJoinRequest(BaseModel):
    invite_code: str


class GroupResponse(BaseModel):
    id: int
    name: str
    invite_code: str
    member_count: int
    created_by: int


class LeaderboardEntry(BaseModel):
    user_id: int
    display_name: str
    avatar_url: Optional[str] = None
    total_protein: float
    rank: int
