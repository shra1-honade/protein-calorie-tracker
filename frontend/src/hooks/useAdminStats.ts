import { useState, useEffect } from 'react';
import api from '../api';

export interface AdminStats {
  total_users: number;
  new_users_last_24h: number;
  new_users_last_7_days: number;
  total_food_entries: number;
  total_groups: number;
  active_users_last_7_days: number;
  total_protein_logged_all_time: number;
  total_calories_logged_all_time: number;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<AdminStats>('/admin/stats');
        setStats(data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load stats');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}
