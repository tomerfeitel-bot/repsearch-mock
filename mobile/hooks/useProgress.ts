// Port of src/hooks/useProgress.js — one idle/loading/error resource per
// Progress surface, loaded lazily as tabs open.
import { useCallback, useState } from 'react';
import type { ToastFn } from '@/components/ui/Toast';
import { api } from '@/lib/api';

export type Resource<T = any> = { data: T | null; loading: boolean; error: string };

const idleResource: Resource = { data: null, loading: false, error: '' };

function asMessage(err: any, fallback: string): string {
  return err?.message || fallback;
}

export function useProgress(toast?: ToastFn) {
  const [summary, setSummary] = useState<Resource>(idleResource);
  const [history, setHistory] = useState<Resource>(idleResource);
  const [lifts, setLifts] = useState<Resource>(idleResource);
  const [body, setBody] = useState<Resource>(idleResource);
  const [records, setRecords] = useState<Resource>(idleResource);
  const [compare, setCompare] = useState<Resource>(idleResource);
  const [lifestyle, setLifestyle] = useState<Resource>(idleResource);

  const loadSummary = useCallback(async () => {
    setSummary((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await api.get('/progress/summary');
      setSummary({ data: data.summary || {}, loading: false, error: '' });
      return data.summary || {};
    } catch (err) {
      const error = asMessage(err, 'Failed to load progress summary');
      setSummary((prev) => ({ ...prev, loading: false, error }));
      if (toast) toast(error, 'error');
      return null;
    }
  }, [toast]);

  const loadHistory = useCallback(async (opts: Record<string, string> = {}) => {
    setHistory((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const qs = new URLSearchParams(opts);
      const data = await api.get(`/progress/history?${qs}`);
      setHistory({ data: data.workouts || [], loading: false, error: '' });
      return data.workouts || [];
    } catch (err) {
      const error = asMessage(err, 'Failed to load workout history');
      setHistory((prev) => ({ ...prev, loading: false, error }));
      if (toast) toast(error, 'error');
      return null;
    }
  }, [toast]);

  const loadLifts = useCallback(async (opts: Record<string, string> = {}) => {
    setLifts((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const qs = new URLSearchParams(opts);
      const data = await api.get(`/progress/lifts?${qs}`);
      setLifts({ data, loading: false, error: '' });
      return data;
    } catch (err) {
      const error = asMessage(err, 'Failed to load lift progress');
      setLifts((prev) => ({ ...prev, loading: false, error }));
      if (toast) toast(error, 'error');
      return null;
    }
  }, [toast]);

  const loadBody = useCallback(async (opts: Record<string, string> = {}) => {
    setBody((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const qs = new URLSearchParams(opts);
      const data = await api.get(`/progress/body?${qs}`);
      setBody({ data: { history: data.history || [], summary: data.summary || {} }, loading: false, error: '' });
      return data;
    } catch (err) {
      const error = asMessage(err, 'Failed to load body metrics');
      setBody((prev) => ({ ...prev, loading: false, error }));
      if (toast) toast(error, 'error');
      return null;
    }
  }, [toast]);

  const loadRecords = useCallback(async () => {
    setRecords((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await api.get('/progress/records');
      setRecords({ data: { records: data.records || [], defaultPins: data.defaultPins || [] }, loading: false, error: '' });
      return data;
    } catch (err) {
      const error = asMessage(err, 'Failed to load records');
      setRecords((prev) => ({ ...prev, loading: false, error }));
      if (toast) toast(error, 'error');
      return null;
    }
  }, [toast]);

  const loadCompare = useCallback(async (series: any[], opts: Record<string, string> = {}) => {
    setCompare((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const qs = new URLSearchParams({ ...opts, series: JSON.stringify(series.slice(0, 3)) });
      const data = await api.get(`/progress/compare?${qs}`);
      setCompare({ data: data.series || [], loading: false, error: '' });
      return data.series || [];
    } catch (err) {
      const error = asMessage(err, 'Failed to load comparison');
      setCompare((prev) => ({ ...prev, loading: false, error }));
      if (toast) toast(error, 'error');
      return null;
    }
  }, [toast]);

  const loadLifestyle = useCallback(async () => {
    setLifestyle((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await api.get('/daily-log?limit=90');
      setLifestyle({ data: data.logs || [], loading: false, error: '' });
      return data.logs || [];
    } catch (err) {
      const error = asMessage(err, 'Failed to load lifestyle logs');
      setLifestyle((prev) => ({ ...prev, loading: false, error }));
      if (toast) toast(error, 'error');
      return null;
    }
  }, [toast]);

  const logBodyMetric = useCallback(async (payload: Record<string, number>) => {
    try {
      const data = await api.post('/body-metrics', payload);
      await loadBody();
      return data.entry;
    } catch (err) {
      if (toast) toast(asMessage(err, 'Failed to log body metric'), 'error');
      return null;
    }
  }, [loadBody, toast]);

  return {
    summary,
    history,
    lifts,
    body,
    records,
    compare,
    lifestyle,
    loadSummary,
    loadHistory,
    loadLifts,
    loadBody,
    loadRecords,
    loadCompare,
    loadLifestyle,
    logBodyMetric,
  };
}
