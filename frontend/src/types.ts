export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  protein_goal: number;
  calorie_goal: number;
  carb_goal: number;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  sex?: string;
  activity_level?: string;
  goal_type?: string;
}

export interface CommonFood {
  id: number;
  name: string;
  protein_g: number;
  calories: number;
  carbs_g: number;
  category: string;
  icon: string;
  sort_order: number;
}

export interface FoodEntry {
  id: number;
  food_name: string;
  protein_g: number;
  calories: number;
  carbs_g: number;
  fdc_id: string | null;
  meal_type: string;
  serving_qty: number;
  logged_at: string;
}

export interface DetectedFood {
  name: string;
  protein_g: number;
  calories: number;
  carbs_g: number;
  confidence: number;
}

export interface DailySummary {
  date: string;
  total_protein: number;
  total_calories: number;
  total_carbs: number;
  protein_goal: number;
  calorie_goal: number;
  carb_goal: number;
  entries: FoodEntry[];
}

export interface WeeklyDay {
  date: string;
  total_protein: number;
  total_calories: number;
  total_carbs: number;
}

export interface WeeklyResponse {
  days: WeeklyDay[];
  protein_goal: number;
  calorie_goal: number;
  carb_goal: number;
}

export interface Group {
  id: number;
  name: string;
  invite_code: string;
  member_count: number;
  created_by: number;
}

export interface LeaderboardEntry {
  user_id: number;
  display_name: string;
  avatar_url: string | null;
  total_protein: number;
  rank: number;
}
