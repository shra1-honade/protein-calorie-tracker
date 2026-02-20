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
    carb_goal: float
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    sex: Optional[str] = None
    activity_level: Optional[str] = None
    goal_type: Optional[str] = None
    dietary_preference: str = 'non_vegetarian'
    food_dislikes: Optional[str] = None


class GoalUpdate(BaseModel):
    protein_goal: Optional[float] = None
    calorie_goal: Optional[float] = None
    carb_goal: Optional[float] = None


class UserProfileUpdate(BaseModel):
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    sex: Optional[str] = None            # 'male' | 'female'
    activity_level: Optional[str] = None  # 'sedentary'|'light'|'moderate'|'active'|'very_active'
    goal_type: Optional[str] = None      # 'lose'|'maintain'|'gain'
    protein_goal: Optional[float] = None
    calorie_goal: Optional[float] = None
    carb_goal: Optional[float] = None
    dietary_preference: Optional[str] = None
    food_dislikes: Optional[str] = None


# --- Food ---
class CommonFoodResponse(BaseModel):
    id: int
    name: str
    protein_g: float
    calories: float
    carbs_g: float
    category: str
    icon: str
    sort_order: int


class FoodLogRequest(BaseModel):
    food_name: str
    protein_g: float
    calories: float
    carbs_g: float = 0.0
    fdc_id: Optional[str] = None
    meal_type: str = "snack"
    serving_qty: float = 1.0
    logged_at: Optional[str] = None  # ISO format, defaults to now


class FoodEntryResponse(BaseModel):
    id: int
    food_name: str
    protein_g: float
    calories: float
    carbs_g: float
    fdc_id: Optional[str] = None
    meal_type: str
    serving_qty: float
    logged_at: str


# --- Dashboard ---
class DailySummary(BaseModel):
    date: str
    total_protein: float
    total_calories: float
    total_carbs: float
    protein_goal: float
    calorie_goal: float
    carb_goal: float
    entries: list[FoodEntryResponse]


class WeeklyDay(BaseModel):
    date: str
    total_protein: float
    total_calories: float
    total_carbs: float


class WeeklyResponse(BaseModel):
    days: list[WeeklyDay]
    protein_goal: float
    calorie_goal: float
    carb_goal: float


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


# --- Meal Plan ---
class MealItem(BaseModel):
    food: str
    quantity: str
    protein_g: float
    calories: float
    carbs_g: float


class MealPlanMeal(BaseModel):
    meal_type: str
    already_eaten: bool
    items: list[MealItem]
    meal_protein: float
    meal_calories: float
    meal_carbs: float
    meal_tip: str


class MealPlanResponse(BaseModel):
    meal_plan: list[MealPlanMeal]
    day_summary: dict
    nutritionist_note: str
