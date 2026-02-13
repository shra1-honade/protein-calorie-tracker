import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { DailySummary, WeeklyResponse } from '../types';

export function useDashboard(date: string) {
  const [daily, setDaily] = useState<DailySummary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        api.get<DailySummary>('/dashboard/daily', { params: { date } }),
        api.get<WeeklyResponse>('/dashboard/weekly', { params: { today: date } }),
      ]);
      setDaily(dailyRes.data);
      setWeekly(weeklyRes.data);
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { daily, weekly, loading, refresh };
}
