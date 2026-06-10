import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

// Port of src/hooks/useDailyCheckin.js. The web persisted the "seen today"
// marker in localStorage; here it lives in AsyncStorage (async reads, hence the
// await inside scheduleModalIfNeeded).
const SEEN_STORAGE_KEY = 'repsearch:daily-checkin-seen';

async function readSeenDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeenDate(date: string) {
  // Ignore storage failures; the modal can safely appear again later.
  AsyncStorage.setItem(SEEN_STORAGE_KEY, date).catch(() => {});
}

type ToastFn = ((message: string, type?: 'info' | 'success' | 'error') => void) | null | undefined;

export function useDailyCheckin(toast: ToastFn) {
  const [todayLog, setTodayLog] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const loadToday = useCallback(async () => {
    try {
      const data = await api.get(`/daily-log/${today}`);
      setTodayLog(data.log || null);
      return data.log;
    } catch {
      setTodayLog(null);
      return null;
    }
  }, [today]);

  // Called when the user lands on Community — schedule the modal only on the
  // first visit of the day. Once shown/dismissed/submitted the date persists so
  // remounts don't re-trigger it until tomorrow.
  const scheduleModalIfNeeded = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (todayLog) return;
    if ((await readSeenDate()) === today) return;
    timerRef.current = setTimeout(() => {
      writeSeenDate(today);
      setShowModal(true);
    }, 1200);
  }, [todayLog, today]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const submitCheckin = useCallback(
    async (payload: Record<string, unknown>) => {
      setLoading(true);
      try {
        const data = await api.post('/daily-log', { ...payload, date: today });
        setTodayLog(data.log);
        setShowModal(false);
        writeSeenDate(today);
        return data.log;
      } catch (err: any) {
        toast?.(err.message || 'Failed to save check-in', 'error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [today, toast],
  );

  const dismissModal = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowModal(false);
    writeSeenDate(today);
  }, [today]);

  return {
    todayLog,
    showModal,
    loading,
    loadToday,
    scheduleModalIfNeeded,
    submitCheckin,
    dismissModal,
  };
}
