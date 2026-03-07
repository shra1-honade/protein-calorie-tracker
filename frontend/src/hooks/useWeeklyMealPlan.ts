import { useState, useCallback } from 'react';
import api from '../api';
import { WeeklyMealPlanResponse, WeeklyDayPlan, ConversationMessage } from '../types';

export function useWeeklyMealPlan() {
  const [plan, setPlan] = useState<WeeklyMealPlanResponse | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (weekStart: string) => {
    setIsGenerating(true);
    setError(null);
    setConversationHistory([]);
    try {
      const res = await api.post<WeeklyMealPlanResponse>('/food/weekly-meal-plan/generate', {
        week_start: weekStart,
      });
      setPlan(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to generate weekly plan.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const loadSavedPlan = useCallback(async (weekStart: string) => {
    setError(null);
    try {
      const res = await api.get<WeeklyMealPlanResponse>('/food/weekly-meal-plan', {
        params: { week_start: weekStart },
      });
      setPlan(res.data);
      setConversationHistory([]);
    } catch (e: any) {
      if (e.response?.status !== 404) {
        setError(e.response?.data?.detail ?? 'Failed to load saved plan.');
      }
      // 404 is expected — no plan for this week yet
    }
  }, []);

  const refinePlan = async (prompt: string) => {
    if (!plan) return;
    setIsRefining(true);
    setError(null);
    const newUserMessage: ConversationMessage = { role: 'user', content: prompt };
    const updatedHistory = [...conversationHistory, newUserMessage];
    setConversationHistory(updatedHistory);
    try {
      const res = await api.post<{
        week_start: string;
        plan: WeeklyDayPlan[];
        saved: boolean;
        assistant_message: string;
      }>('/food/weekly-meal-plan/refine', {
        week_start: plan.week_start,
        prompt,
        current_plan: plan.plan,
        conversation_history: updatedHistory,
      });
      setPlan({ week_start: res.data.week_start, plan: res.data.plan, saved: false });
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: res.data.assistant_message },
      ]);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to refine plan.');
      // Remove the optimistic user message on error
      setConversationHistory(conversationHistory);
    } finally {
      setIsRefining(false);
    }
  };

  const savePlan = async () => {
    if (!plan) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.post('/food/weekly-meal-plan/save', plan);
      setPlan({ ...plan, saved: true });
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to save plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    plan,
    conversationHistory,
    isGenerating,
    isRefining,
    isSaving,
    error,
    generatePlan,
    loadSavedPlan,
    refinePlan,
    savePlan,
  };
}
