import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import api from '../api';
import { CommonFood, DetectedFood } from '../types';
import { MealType } from '../utils/mealHelpers';
import QuickAddGrid from '../components/QuickAddGrid';
import ManualFoodForm from '../components/ManualFoodForm';
import CameraFoodDetector from '../components/CameraFoodDetector';
import DetectedFoodsList from '../components/DetectedFoodsList';

type Tab = 'quick' | 'camera' | 'manual';

export default function LogFoodPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('quick');
  const [toast, setToast] = useState('');
  const [detectedFoods, setDetectedFoods] = useState<DetectedFood[] | null>(null);
  const [detectedTotals, setDetectedTotals] = useState<{protein: number; calories: number} | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const logFood = async (data: {
    food_name: string;
    protein_g: number;
    calories: number;
    meal_type?: string;
    fdc_id?: string;
    serving_qty?: number;
  }) => {
    await api.post('/food/log', {
      food_name: data.food_name,
      protein_g: data.protein_g,
      calories: data.calories,
      meal_type: data.meal_type ?? 'snack',
      fdc_id: data.fdc_id,
      serving_qty: data.serving_qty ?? 1,
    });
    showToast(`Logged ${data.food_name}`);
  };

  const handleQuickAdd = (food: CommonFood, qty: number, mealType: MealType) => {
    logFood({
      food_name: food.name,
      protein_g: food.protein_g,
      calories: food.calories,
      serving_qty: qty,
      meal_type: mealType,
    });
  };

  const handleManual = (data: {
    food_name: string;
    protein_g: number;
    calories: number;
    meal_type: string;
  }) => {
    logFood(data);
  };

  const handleCameraDetect = (foods: DetectedFood[], totalProtein: number, totalCalories: number) => {
    setDetectedFoods(foods);
    setDetectedTotals({ protein: totalProtein, calories: totalCalories });
  };

  const handleConfirmDetection = async (mealType: MealType) => {
    if (!detectedTotals) return;
    await logFood({
      food_name: detectedFoods!.map(f => f.name).join(', '),
      protein_g: detectedTotals.protein,
      calories: detectedTotals.calories,
      fdc_id: 'camera-detected',
      meal_type: mealType,
    });
    setDetectedFoods(null);
    setDetectedTotals(null);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'quick', label: 'Quick Add' },
    { key: 'camera', label: 'Camera' },
    { key: 'manual', label: 'Manual' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold">Log Food</h1>

      {/* Tab bar */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'quick' && <QuickAddGrid onAdd={handleQuickAdd} />}

      {tab === 'camera' && (
        detectedFoods && detectedTotals ? (
          <DetectedFoodsList
            foods={detectedFoods}
            totalProtein={detectedTotals.protein}
            totalCalories={detectedTotals.calories}
            onConfirm={handleConfirmDetection}
            onRetry={() => {
              setDetectedFoods(null);
              setDetectedTotals(null);
            }}
          />
        ) : (
          <CameraFoodDetector onDetect={handleCameraDetect} />
        )
      )}

      {tab === 'manual' && <ManualFoodForm onSubmit={handleManual} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg animate-pulse">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
