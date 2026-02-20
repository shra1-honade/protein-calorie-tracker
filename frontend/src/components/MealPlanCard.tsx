import { RefreshCw, Utensils, Sparkles } from 'lucide-react';
import { MealPlanMeal, MealPlanResponse } from '../types';

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🍱',
  dinner: '🌙',
  snack: '🍎',
};

interface MealRowProps {
  meal: MealPlanMeal;
}

function MealRow({ meal }: MealRowProps) {
  const emoji = MEAL_EMOJI[meal.meal_type] ?? '🍽️';
  const label = meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1);

  return (
    <div className={`space-y-1.5 ${meal.already_eaten ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{meal.already_eaten ? '✅' : emoji}</span>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {meal.already_eaten && (
          <span className="text-xs text-gray-400 ml-1">already eaten</span>
        )}
        <span className="ml-auto text-xs text-gray-500">
          {meal.meal_protein.toFixed(0)}g P · {meal.meal_calories.toFixed(0)} cal
        </span>
      </div>

      {!meal.already_eaten && (
        <div className="pl-6 space-y-1">
          {meal.items.map((item, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-gray-700">
                {item.food}
                <span className="text-gray-400 ml-1 text-xs">({item.quantity})</span>
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {item.protein_g.toFixed(0)}g P · {item.calories.toFixed(0)} cal
              </span>
            </div>
          ))}
          {meal.meal_tip && (
            <p className="text-xs text-primary-600 italic mt-1">💡 {meal.meal_tip}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  date: string;
  mealPlan: MealPlanResponse | null;
  isLoading: boolean;
  error: string | null;
  onFetch: (date: string) => void;
}

export default function MealPlanCard({ date, mealPlan, isLoading, error, onFetch }: Props) {
  const remaining = mealPlan
    ? {
        protein: Math.max(0, mealPlan.day_summary.total_protein - (mealPlan.meal_plan.reduce((s, m) => s + (m.already_eaten ? 0 : m.meal_protein), 0))),
        calories: Math.max(0, mealPlan.day_summary.total_calories - (mealPlan.meal_plan.reduce((s, m) => s + (m.already_eaten ? 0 : m.meal_calories), 0))),
        carbs: Math.max(0, mealPlan.day_summary.total_carbs - (mealPlan.meal_plan.reduce((s, m) => s + (m.already_eaten ? 0 : m.meal_carbs), 0))),
      }
    : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary-600" />
          <h3 className="text-sm font-semibold">Smart Meal Plan</h3>
        </div>
        {mealPlan && (
          <button
            onClick={() => onFetch(date)}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-primary-100 border-t-primary-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={18} className="text-primary-500" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-gray-700">Crafting your meal plan</p>
            <p className="text-xs text-gray-400">Analysing your goals & history...</p>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <button onClick={() => onFetch(date)} className="text-xs text-primary-600 underline">
            Try again
          </button>
        </div>
      )}

      {!isLoading && !mealPlan && !error && (
        <button
          onClick={() => onFetch(date)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Sparkles size={15} />
          Get Today's Meal Plan
        </button>
      )}

      {!isLoading && mealPlan && (
        <div className="space-y-4">
          {mealPlan.meal_plan.map((meal, i) => (
            <div key={i}>
              <MealRow meal={meal} />
              {i < mealPlan.meal_plan.length - 1 && (
                <div className="border-t border-gray-100 mt-3" />
              )}
            </div>
          ))}

          {mealPlan.nutritionist_note && (
            <div className="bg-primary-50 rounded-lg p-3 mt-2">
              <p className="text-xs text-primary-700">💬 {mealPlan.nutritionist_note}</p>
            </div>
          )}

          {remaining && (
            <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
              <span>Suggested remaining:</span>
              <span>
                {mealPlan.day_summary.total_protein.toFixed(0)}g P ·{' '}
                {mealPlan.day_summary.total_calories.toFixed(0)} cal ·{' '}
                {mealPlan.day_summary.total_carbs.toFixed(0)}g C
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
