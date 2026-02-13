import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Group, LeaderboardEntry } from '../types';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Group[]>('/groups');
      setGroups(data);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGroup = async (name: string) => {
    const { data } = await api.post<Group>('/groups/create', { name });
    setGroups((prev) => [data, ...prev]);
    return data;
  };

  const joinGroup = async (inviteCode: string) => {
    const { data } = await api.post<Group>('/groups/join', { invite_code: inviteCode });
    await refresh();
    return data;
  };

  return { groups, loading, refresh, createGroup, joinGroup };
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useLeaderboard(groupId: number | null, period: 'daily' | 'weekly') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const today = toLocalDateStr(new Date());
      const { data } = await api.get<LeaderboardEntry[]>(
        `/groups/${groupId}/leaderboard`,
        { params: { period, today } }
      );
      setEntries(data);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, [groupId, period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}
