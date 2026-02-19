import { useState } from 'react';
import { Check } from 'lucide-react';
import { MEAL_ORDER, MEAL_CONFIGS, MealType, getDefaultMealType } from '../utils/mealHelpers';

interface DetectedFood {
  name: string;
  protein_g: number;
  calories: number;
  carbs_g: number;
  confidence: number;
}

interface Props {
  foods: DetectedFood[];
  totalProtein: number;
  totalCalories: number;
  totalCarbs: number;
  onConfirm: (mealType: MealType) => void;
  onRetry: () => void;
}

export default function DetectedFoodsList({
  foods,
  totalProtein,
  totalCalories,
  totalCarbs,
  onConfirm,
  onRetry,
}: Props) {
  const [selectedMeal, setSelectedMeal] = useState<MealType>(getDefaultMealType);
  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Detected Foods</h3>
        <div className="space-y-2">
          {foods.map((food, i) => (
            <div key={i} className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">{food.name}</p>
                <p className="text-xs text-gray-500">
                  {food.protein_g}g protein · {food.carbs_g}g carbs · {food.calories} cal
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {Math.round(food.confidence * 100)}% sure
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>
              {Math.round(totalProtein)}g protein · {Math.round(totalCarbs)}g carbs · {Math.round(totalCalories)} cal
            </span>
          </div>
        </div>
      </div>

      {/* Meal Selector */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-2">Select Meal Type</h3>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_ORDER.map((mealType) => {
            const config = MEAL_CONFIGS[mealType];
            return (
              <button
                key={mealType}
                onClick={() => setSelectedMeal(mealType)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  selectedMeal === mealType
                    ? `${config.bgColor} ${config.borderColor} border-2 ${config.textColor}`
                    : 'bg-gray-50 border border-gray-200 text-gray-600'
                }`}
              >
                <span className="text-xl">{config.emoji}</span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onConfirm(selectedMeal)} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Check size={18} />
          Log This Meal
        </button>
        <button onClick={onRetry} className="btn-secondary">
          Retake
        </button>
      </div>
    </div>
  );
}
