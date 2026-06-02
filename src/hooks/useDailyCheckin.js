import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'

const SEEN_STORAGE_KEY = 'repsearch:daily-checkin-seen'

function readSeenDate() {
  try { return localStorage.getItem(SEEN_STORAGE_KEY) } catch { return null }
}
function writeSeenDate(date) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, date)
  } catch {
    // Ignore storage failures; the modal can safely appear again later.
  }
}

export function useDailyCheckin(toast) {
  const [todayLog, setTodayLog] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  const today = new Date().toISOString().slice(0, 10)

  const loadToday = useCallback(async () => {
    try {
      const data = await api.get(`/daily-log/${today}`)
      setTodayLog(data.log || null)
      return data.log
    } catch {
      setTodayLog(null)
      return null
    }
  }, [today])

  // Called when user lands on /community — schedule modal only on the first
  // visit of the day. Once shown/dismissed/submitted we persist the date so
  // remounts of /community don't re-trigger it until tomorrow.
  const scheduleModalIfNeeded = useCallback(() => {
    clearTimeout(timerRef.current)
    if (todayLog) return
    if (readSeenDate() === today) return
    timerRef.current = setTimeout(() => {
      writeSeenDate(today)
      setShowModal(true)
    }, 1200)
  }, [todayLog, today])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const submitCheckin = useCallback(async (payload) => {
    setLoading(true)
    try {
      const data = await api.post('/daily-log', { ...payload, date: today })
      setTodayLog(data.log)
      setShowModal(false)
      writeSeenDate(today)
      return data.log
    } catch (err) {
      if (toast) toast(err.message || 'Failed to save check-in', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [today, toast])

  const dismissModal = useCallback(() => {
    clearTimeout(timerRef.current)
    setShowModal(false)
    writeSeenDate(today)
  }, [today])

  return {
    todayLog,
    showModal,
    loading,
    loadToday,
    scheduleModalIfNeeded,
    submitCheckin,
    dismissModal,
  }
}
