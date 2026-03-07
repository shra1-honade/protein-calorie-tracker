import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import api from '../api';
import { WeeklyDayPlan } from '../types';

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🍱',
  dinner: '🌙',
  snack: '🍎',
};

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  date: string;
}

export default function WeeklyPlanDayPreview({ date }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dayPlan, setDayPlan] = useState<WeeklyDayPlan | null>(null);
  const [noPlan, setNoPlan] = useState(false);

  const load = useCallback(async () => {
    const weekStart = getMondayOfWeek(date);
    try {
      const res = await api.get<{ plan: WeeklyDayPlan[] }>('/food/weekly-meal-plan', {
        params: { week_start: weekStart },
      });
      const dayName = DAY_NAMES[new Date(date + 'T00:00:00').getDay()];
      const found = res.data.plan.find(d => d.date === date || d.day === dayName) ?? null;
      setDayPlan(found);
      setNoPlan(false);
    } catch (e: any) {
      setDayPlan(null);
      setNoPlan(true);
    }
  }, [date]);

  useEffect(() => {
    setOpen(false);
    setDayPlan(null);
    setNoPlan(false);
    load();
  }, [date, load]);

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-2"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-primary-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">Today's Plan</span>
          {noPlan && (
            <span className="text-xs text-gray-400 font-normal">(no weekly plan saved)</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {noPlan || !dayPlan ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-gray-500">No weekly plan for this week yet.</p>
              <button
                onClick={() => navigate('/weekly-plan')}
                className="text-sm text-primary-600 font-medium hover:underline"
              >
                Create a week plan →
              </button>
            </div>
          ) : (
            <>
              {dayPlan.meal_plan.map((meal, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-1.5">
                  <span className="text-xs font-semibold capitalize text-gray-700">
                    {MEAL_EMOJI[meal.meal_type] ?? '🍽️'} {meal.meal_type}
                    <span className="ml-2 text-gray-400 font-normal">
                      {meal.meal_protein.toFixed(0)}g P · {meal.meal_calories.toFixed(0)} cal
                    </span>
                  </span>
                  {meal.items.map((item, j) => (
                    <div key={j} className="flex justify-between gap-2 text-xs min-w-0">
                      <span className="text-gray-600 break-words min-w-0">{item.food}</span>
                      <span className="text-gray-400 shrink-0">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              ))}
              <p className="text-xs text-center">
                <button
                  onClick={() => navigate('/weekly-plan')}
                  className="text-primary-500 hover:underline"
                >
                  Edit in Week Plan →
                </button>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
