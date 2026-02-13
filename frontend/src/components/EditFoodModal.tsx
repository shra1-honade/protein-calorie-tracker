import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FoodEntry } from '../types';
import { MEAL_CONFIGS, MealType } from '../utils/mealHelpers';

interface Props {
  entry: FoodEntry | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: number, data: {
    food_name: string;
    protein_g: number;
    calories: number;
    meal_type: string;
    serving_qty: number;
    logged_at: string;
  }) => void;
}

export default function EditFoodModal({ entry, open, onClose, onSave }: Props) {
  const [foodName, setFoodName] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [calories, setCalories] = useState('');
  const [servingQty, setServingQty] = useState('1');
  const [mealType, setMealType] = useState<MealType>('snack');

  useEffect(() => {
    if (entry) {
      setFoodName(entry.food_name);
      // Divide by serving_qty to get per-serving values
      setProteinG(String(entry.protein_g / entry.serving_qty));
      setCalories(String(entry.calories / entry.serving_qty));
      setServingQty(String(entry.serving_qty));
      setMealType(entry.meal_type as MealType);
    }
  }, [entry]);

  if (!open || !entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(entry.id, {
      food_name: foodName,
      protein_g: parseFloat(proteinG),
      calories: parseFloat(calories),
      serving_qty: parseFloat(servingQty),
      meal_type: mealType,
      logged_at: entry.logged_at, // Keep original timestamp
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4">Edit Food Entry</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Food Name</label>
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Protein (g)</label>
              <input
                type="number"
                step="0.1"
                value={proteinG}
                onChange={(e) => setProteinG(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Calories</label>
              <input
                type="number"
                step="1"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Servings</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={servingQty}
              onChange={(e) => setServingQty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              inputMode="decimal"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Meal Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MEAL_CONFIGS).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMealType(key as MealType)}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    mealType === key
                      ? `${config.borderColor} ${config.bgColor} ${config.textColor}`
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {config.emoji} {config.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
