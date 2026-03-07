import { useState, useEffect, useCallback } from 'react';
import api from '../api';

interface NotifPrefs {
  notif_enabled: boolean;
  notif_breakfast_time: string;
  notif_lunch_time: string;
  notif_dinner_time: string;
  vapid_public_key: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function useNotifications() {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const loadPrefs = useCallback(async () => {
    try {
      const { data } = await api.get<NotifPrefs>('/notifications/prefs');
      setPrefs(data);
    } catch {
      // ignore — user may not be logged in yet
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission denied.');
        return;
      }

      const { data: keyData } = await api.get<{ vapid_public_key: string }>('/notifications/vapid-public-key');
      const applicationServerKey = urlBase64ToUint8Array(keyData.vapid_public_key);

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subJson = sub.toJSON();
      const keys = subJson.keys as { p256dh: string; auth: string };

      await api.post('/notifications/subscribe', {
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      await api.put('/notifications/prefs', { notif_enabled: true });
      await loadPrefs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  }, [isSupported, loadPrefs]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/notifications/unsubscribe', { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      await api.put('/notifications/prefs', { notif_enabled: false });
      await loadPrefs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  }, [isSupported, loadPrefs]);

  const updatePrefs = useCallback(
    async (updates: Partial<Pick<NotifPrefs, 'notif_breakfast_time' | 'notif_lunch_time' | 'notif_dinner_time'>>) => {
      try {
        await api.put('/notifications/prefs', updates);
        setPrefs((p) => (p ? { ...p, ...updates } : p));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update prefs');
      }
    },
    [],
  );

  return { prefs, permission, loading, error, isSupported, requestPermissionAndSubscribe, unsubscribe, updatePrefs };
}
