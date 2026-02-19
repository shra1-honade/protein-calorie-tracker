import { useState } from 'react';
import { Check, Calendar } from 'lucide-react';

import api from '../api';
import { CommonFood, DetectedFood } from '../types';
import { MealType } from '../utils/mealHelpers';
import QuickAddGrid from '../components/QuickAddGrid';
import ManualFoodForm from '../components/ManualFoodForm';
import CameraFoodDetector from '../components/CameraFoodDetector';
import DetectedFoodsList from '../components/DetectedFoodsList';

type Tab = 'quick' | 'camera' | 'manual';

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function LogFoodPage() {
  const today = toLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [tab, setTab] = useState<Tab>('quick');
  const [toast, setToast] = useState('');
  const [detectedFoods, setDetectedFoods] = useState<DetectedFood[] | null>(null);
  const [detectedTotals, setDetectedTotals] = useState<{protein: number; calories: number; carbs: number} | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const logFood = async (data: {
    food_name: string;
    protein_g: number;
    calories: number;
    carbs_g?: number;
    meal_type?: string;
    fdc_id?: string;
    serving_qty?: number;
  }) => {
    // Combine selected date with current time
    const now = new Date();
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const combined = new Date(
      selectedDateObj.getFullYear(),
      selectedDateObj.getMonth(),
      selectedDateObj.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
    const localISO = new Date(combined.getTime() - combined.getTimezoneOffset() * 60000).toISOString().slice(0, -1);

    await api.post('/food/log', {
      food_name: data.food_name,
      protein_g: data.protein_g,
      calories: data.calories,
      carbs_g: data.carbs_g ?? 0,
      meal_type: data.meal_type ?? 'snack',
      fdc_id: data.fdc_id,
      serving_qty: data.serving_qty ?? 1,
      logged_at: localISO,
    });
    showToast(`Logged ${data.food_name}`);
  };

  const handleQuickAdd = (food: CommonFood, qty: number, mealType: MealType) => {
    logFood({
      food_name: food.name,
      protein_g: food.protein_g,
      calories: food.calories,
      carbs_g: food.carbs_g,
      serving_qty: qty,
      meal_type: mealType,
    });
  };

  const handleManual = (data: {
    food_name: string;
    protein_g: number;
    calories: number;
    carbs_g: number;
    meal_type: string;
  }) => {
    logFood(data);
  };

  const handleCameraDetect = (foods: DetectedFood[], totalProtein: number, totalCalories: number, totalCarbs: number) => {
    setDetectedFoods(foods);
    setDetectedTotals({ protein: totalProtein, calories: totalCalories, carbs: totalCarbs });
  };

  const handleConfirmDetection = async (mealType: MealType) => {
    if (!detectedTotals) return;
    await logFood({
      food_name: detectedFoods!.map(f => f.name).join(', '),
      protein_g: detectedTotals.protein,
      calories: detectedTotals.calories,
      carbs_g: detectedTotals.carbs,
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

      {/* Date Selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="inline-block mr-2" size={16} />
          Log for date
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-500 min-w-[100px]">
            {formatDateDisplay(selectedDate)}
          </span>
        </div>
      </div>

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
            totalCarbs={detectedTotals.carbs}
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
