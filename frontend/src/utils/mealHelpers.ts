export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealConfig {
  type: MealType;
  label: string;
  emoji: string;
  bgColor: string;      // Tailwind bg class
  borderColor: string;  // Tailwind border class
  textColor: string;    // Tailwind text class
}

export const MEAL_CONFIGS: Record<MealType, MealConfig> = {
  breakfast: {
    type: 'breakfast',
    label: 'Breakfast',
    emoji: '🌅',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
  },
  lunch: {
    type: 'lunch',
    label: 'Lunch',
    emoji: '🌞',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
  },
  dinner: {
    type: 'dinner',
    label: 'Dinner',
    emoji: '🌙',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
  },
  snack: {
    type: 'snack',
    label: 'Snack',
    emoji: '🍎',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
  },
};

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Format ISO timestamp to readable time (e.g., "8:30 AM")
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Smart default: guess meal type based on time of day
export function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}
