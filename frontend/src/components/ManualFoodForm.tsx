import { useState } from 'react';

interface Props {
  onSubmit: (data: {
    food_name: string;
    protein_g: number;
    calories: number;
    carbs_g: number;
    meal_type: string;
  }) => void;
}

export default function ManualFoodForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [mealType, setMealType] = useState('snack');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !protein || !calories) return;
    onSubmit({
      food_name: name,
      protein_g: parseFloat(protein),
      calories: parseFloat(calories),
      carbs_g: carbs ? parseFloat(carbs) : 0,
      meal_type: mealType,
    });
    setName('');
    setProtein('');
    setCalories('');
    setCarbs('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Food name"
        className="input"
        required
      />
      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="Protein (g)"
          className="input"
          step="0.1"
          min="0"
          required
        />
        <input
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Calories"
          className="input"
          step="1"
          min="0"
          required
        />
        <input
          type="number"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="Carbs (g)"
          className="input"
          step="0.1"
          min="0"
        />
      </div>
      <select
        value={mealType}
        onChange={(e) => setMealType(e.target.value)}
        className="input"
      >
        <option value="breakfast">Breakfast</option>
        <option value="lunch">Lunch</option>
        <option value="dinner">Dinner</option>
        <option value="snack">Snack</option>
      </select>
      <button type="submit" className="btn-primary w-full">
        Log Food
      </button>
    </form>
  );
}
