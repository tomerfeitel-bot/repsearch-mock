// Port of src/hooks/useResearch.js — the Study page's data layer over the
// server's whitelisted /research endpoints.
import { useCallback, useState } from 'react';
import type { ToastFn } from '@/components/ui/Toast';
import { api } from '@/lib/api';

export function useResearch(toast?: ToastFn) {
  const [featuredQuestions, setFeaturedQuestions] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [compareScanResult, setCompareScanResult] = useState<any>(null);
  const [compareScanLoading, setCompareScanLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const loadFeaturedQuestions = useCallback(async () => {
    try {
      const data = await api.get('/research/featured-questions');
      setFeaturedQuestions(data.questions || []);
    } catch (err: any) {
      if (toast) toast(err.message || 'Failed to load questions', 'error');
    }
  }, [toast]);

  const loadFindings = useCallback(async () => {
    setFindingsLoading(true);
    try {
      const data = await api.get('/research/findings');
      setFindings(data.findings || []);
    } catch (err: any) {
      if (toast) toast(err.message || 'Failed to load findings', 'error');
    } finally {
      setFindingsLoading(false);
    }
  }, [toast]);

  const runQuery = useCallback(async (params: any) => {
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const data = await api.post('/research/query', params);
      setQueryResult(data);
      return data;
    } catch (err: any) {
      if (toast) toast(err.message || 'Query failed', 'error');
      return null;
    } finally {
      setQueryLoading(false);
    }
  }, [toast]);

  const compareCohorts = useCallback(async (params: any) => {
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const data = await api.post('/research/compare-cohorts', params);
      setCompareResult(data);
      return data;
    } catch (err: any) {
      if (toast) toast(err.message || 'Comparison failed', 'error');
      return null;
    } finally {
      setCompareLoading(false);
    }
  }, [toast]);

  const runScan = useCallback(async (params: any) => {
    setScanLoading(true);
    setScanResult(null);
    try {
      const data = await api.post('/research/scan', params);
      setScanResult(data);
      return data;
    } catch (err: any) {
      if (toast) toast(err.message || 'Scan failed', 'error');
      return null;
    } finally {
      setScanLoading(false);
    }
  }, [toast]);

  const compareScan = useCallback(async (params: any) => {
    setCompareScanLoading(true);
    setCompareScanResult(null);
    try {
      const data = await api.post('/research/compare-scan', params);
      setCompareScanResult(data);
      return data;
    } catch (err: any) {
      if (toast) toast(err.message || 'Comparison scan failed', 'error');
      return null;
    } finally {
      setCompareScanLoading(false);
    }
  }, [toast]);

  const previewStudy = useCallback(async (params: any) => {
    setPreviewLoading(true);
    try {
      const data = await api.post('/research/preview', params);
      setPreviewResult(data);
      return data;
    } catch (err: any) {
      if (toast) toast(err.message || 'Preview failed', 'error');
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }, [toast]);

  const loadSavedQuestions = useCallback(async () => {
    setSavedLoading(true);
    try {
      const data = await api.get('/research/saved-questions');
      setSavedQuestions(data.savedQuestions || []);
    } catch (err: any) {
      if (toast) toast(err.message || 'Failed to load saved questions', 'error');
    } finally {
      setSavedLoading(false);
    }
  }, [toast]);

  const saveQuestion = useCallback(async (payload: any) => {
    try {
      const data = await api.post('/research/saved-questions', payload);
      setSavedQuestions((items) => [data.savedQuestion, ...items.filter((item) => item.id !== data.savedQuestion.id)]);
      if (toast) toast('Question saved', 'success');
      return data.savedQuestion;
    } catch (err: any) {
      if (toast) toast(err.message || 'Failed to save question', 'error');
      return null;
    }
  }, [toast]);

  const deleteSavedQuestion = useCallback(async (id: string) => {
    try {
      await api.del(`/research/saved-questions/${id}`);
      setSavedQuestions((items) => items.filter((item) => item.id !== id));
      if (toast) toast('Question deleted', 'success');
      return true;
    } catch (err: any) {
      if (toast) toast(err.message || 'Failed to delete question', 'error');
      return false;
    }
  }, [toast]);

  const runFeaturedQuery = useCallback(async (question: any) => {
    if (question.type === 'compare') {
      return compareCohorts(question.query);
    }
    return runQuery(question.query);
  }, [runQuery, compareCohorts]);

  return {
    featuredQuestions,
    loadFeaturedQuestions,
    findings,
    findingsLoading,
    loadFindings,
    queryResult,
    queryLoading,
    runQuery,
    compareResult,
    compareLoading,
    compareCohorts,
    scanResult,
    scanLoading,
    runScan,
    compareScanResult,
    compareScanLoading,
    compareScan,
    previewResult,
    previewLoading,
    previewStudy,
    savedQuestions,
    savedLoading,
    loadSavedQuestions,
    saveQuestion,
    deleteSavedQuestion,
    runFeaturedQuery,
  };
}
