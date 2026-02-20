import { useState } from 'react';
import api from '../api';
import { MealPlanResponse } from '../types';

export function useMealPlan() {
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMealPlan = async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<MealPlanResponse>(`/food/meal-plan?date=${date}`);
      setMealPlan(response.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate meal plan';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMealPlan = () => {
    setMealPlan(null);
    setError(null);
  };

  return { mealPlan, isLoading, error, fetchMealPlan, clearMealPlan };
}
