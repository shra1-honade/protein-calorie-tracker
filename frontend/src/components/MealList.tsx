import { Trash2, Edit2 } from 'lucide-react';
import { FoodEntry } from '../types';
import { MEAL_ORDER, MEAL_CONFIGS, formatTime } from '../utils/mealHelpers';

interface Props {
  entries: FoodEntry[];
  onDelete: (id: number) => void;
  onEdit: (entry: FoodEntry) => void;
}

export default function MealList({ entries, onDelete, onEdit }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        No food logged yet today. Tap "Log Food" to get started!
      </p>
    );
  }

  const grouped = MEAL_ORDER
    .map((type) => ({
      type,
      items: entries.filter((e) => e.meal_type === type),
      config: MEAL_CONFIGS[type],
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(({ type, items, config }) => (
        <div
          key={type}
          className={`rounded-2xl border-2 p-4 ${config.bgColor} ${config.borderColor}`}
        >
          <h3 className={`text-base font-bold flex items-center gap-2 mb-3 ${config.textColor}`}>
            <span className="text-2xl">{config.emoji}</span>
            {config.label}
          </h3>
          <div className="space-y-2">
            {items.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-start justify-between"
              >
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">
                    {formatTime(entry.logged_at)}
                  </p>
                  <p className="text-sm font-medium">{entry.food_name}</p>
                  <p className="text-xs text-gray-500">
                    {entry.protein_g}g protein · {entry.calories} cal
                    {entry.serving_qty !== 1 && ` · ${entry.serving_qty}x`}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => onEdit(entry)}
                    className="text-gray-400 hover:text-primary-500 transition-colors p-1"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
