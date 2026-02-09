import { useState, useEffect } from 'react';
import api from '../api';
import { CommonFood } from '../types';
import { MEAL_ORDER, MEAL_CONFIGS, MealType, getDefaultMealType } from '../utils/mealHelpers';

interface Props {
  onAdd: (food: CommonFood, qty: number, mealType: MealType) => void;
}

export default function QuickAddGrid({ onAdd }: Props) {
  const [foods, setFoods] = useState<CommonFood[]>([]);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(getDefaultMealType);

  useEffect(() => {
    api.get<CommonFood[]>('/food/common').then(({ data }) => setFoods(data));
  }, []);

  const categories = [...new Set(foods.map((f) => f.category))];

  const handleTap = (food: CommonFood) => {
    if (adjusting === food.id) {
      onAdd(food, qty, selectedMeal);
      setAdjusting(null);
      setQty(1);
    } else {
      onAdd(food, 1, selectedMeal);
    }
  };

  const handleLongPress = (food: CommonFood) => {
    setAdjusting(food.id);
    setQty(1);
  };

  return (
    <div className="space-y-4">
      {/* Meal Selector */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-3">
        <div className="flex gap-2 overflow-x-auto">
          {MEAL_ORDER.map((mealType) => {
            const config = MEAL_CONFIGS[mealType];
            return (
              <button
                key={mealType}
                onClick={() => setSelectedMeal(mealType)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedMeal === mealType
                    ? `${config.bgColor} ${config.borderColor} border-2 ${config.textColor}`
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Food Categories */}
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {cat}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {foods
              .filter((f) => f.category === cat)
              .map((food) => (
                <button
                  key={food.id}
                  onClick={() => handleTap(food)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleLongPress(food);
                  }}
                  className={`card flex flex-col items-center gap-1 p-3 text-center transition-all active:scale-95 ${
                    adjusting === food.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <span className="text-2xl">{food.icon}</span>
                  <span className="text-xs font-medium leading-tight line-clamp-2">
                    {food.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {food.protein_g}p · {food.calories}cal
                  </span>
                  {adjusting === food.id && (
                    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="w-6 h-6 rounded-full bg-gray-200 text-sm font-bold"
                        onClick={(e) => { e.stopPropagation(); setQty(Math.max(0.5, qty - 0.5)); }}
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold">{qty}x</span>
                      <button
                        className="w-6 h-6 rounded-full bg-gray-200 text-sm font-bold"
                        onClick={(e) => { e.stopPropagation(); setQty(qty + 0.5); }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
