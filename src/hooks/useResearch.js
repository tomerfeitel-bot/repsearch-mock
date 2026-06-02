import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useResearch(toast) {
  const [featuredQuestions, setFeaturedQuestions] = useState([])
  const [findings, setFindings] = useState([])
  const [findingsLoading, setFindingsLoading] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [compareResult, setCompareResult] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [compareScanResult, setCompareScanResult] = useState(null)
  const [compareScanLoading, setCompareScanLoading] = useState(false)
  const [previewResult, setPreviewResult] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [savedQuestions, setSavedQuestions] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)

  const loadFeaturedQuestions = useCallback(async () => {
    try {
      const data = await api.get('/research/featured-questions')
      setFeaturedQuestions(data.questions || [])
    } catch (err) {
      if (toast) toast(err.message || 'Failed to load questions', 'error')
    }
  }, [toast])

  const loadFindings = useCallback(async () => {
    setFindingsLoading(true)
    try {
      const data = await api.get('/research/findings')
      setFindings(data.findings || [])
    } catch (err) {
      if (toast) toast(err.message || 'Failed to load findings', 'error')
    } finally {
      setFindingsLoading(false)
    }
  }, [toast])

  const runQuery = useCallback(async (params) => {
    setQueryLoading(true)
    setQueryResult(null)
    try {
      const data = await api.post('/research/query', params)
      setQueryResult(data)
      return data
    } catch (err) {
      if (toast) toast(err.message || 'Query failed', 'error')
      return null
    } finally {
      setQueryLoading(false)
    }
  }, [toast])

  const compareCohorts = useCallback(async (params) => {
    setCompareLoading(true)
    setCompareResult(null)
    try {
      const data = await api.post('/research/compare-cohorts', params)
      setCompareResult(data)
      return data
    } catch (err) {
      if (toast) toast(err.message || 'Comparison failed', 'error')
      return null
    } finally {
      setCompareLoading(false)
    }
  }, [toast])

  const runScan = useCallback(async (params) => {
    setScanLoading(true)
    setScanResult(null)
    try {
      const data = await api.post('/research/scan', params)
      setScanResult(data)
      return data
    } catch (err) {
      if (toast) toast(err.message || 'Scan failed', 'error')
      return null
    } finally {
      setScanLoading(false)
    }
  }, [toast])

  const compareScan = useCallback(async (params) => {
    setCompareScanLoading(true)
    setCompareScanResult(null)
    try {
      const data = await api.post('/research/compare-scan', params)
      setCompareScanResult(data)
      return data
    } catch (err) {
      if (toast) toast(err.message || 'Comparison scan failed', 'error')
      return null
    } finally {
      setCompareScanLoading(false)
    }
  }, [toast])

  const previewStudy = useCallback(async (params) => {
    setPreviewLoading(true)
    try {
      const data = await api.post('/research/preview', params)
      setPreviewResult(data)
      return data
    } catch (err) {
      if (toast) toast(err.message || 'Preview failed', 'error')
      return null
    } finally {
      setPreviewLoading(false)
    }
  }, [toast])

  const loadSavedQuestions = useCallback(async () => {
    setSavedLoading(true)
    try {
      const data = await api.get('/research/saved-questions')
      setSavedQuestions(data.savedQuestions || [])
    } catch (err) {
      if (toast) toast(err.message || 'Failed to load saved questions', 'error')
    } finally {
      setSavedLoading(false)
    }
  }, [toast])

  const saveQuestion = useCallback(async (payload) => {
    try {
      const data = await api.post('/research/saved-questions', payload)
      setSavedQuestions(items => [data.savedQuestion, ...items.filter(item => item.id !== data.savedQuestion.id)])
      if (toast) toast('Question saved', 'success')
      return data.savedQuestion
    } catch (err) {
      if (toast) toast(err.message || 'Failed to save question', 'error')
      return null
    }
  }, [toast])

  const deleteSavedQuestion = useCallback(async (id) => {
    try {
      await api.del(`/research/saved-questions/${id}`)
      setSavedQuestions(items => items.filter(item => item.id !== id))
      if (toast) toast('Question deleted', 'success')
      return true
    } catch (err) {
      if (toast) toast(err.message || 'Failed to delete question', 'error')
      return false
    }
  }, [toast])

  const runFeaturedQuery = useCallback(async (question) => {
    if (question.type === 'compare') {
      return compareCohorts(question.query)
    }
    return runQuery(question.query)
  }, [runQuery, compareCohorts])

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
  }
}
