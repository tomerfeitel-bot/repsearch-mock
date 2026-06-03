import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

const MOCK_USER = {
  id: 'me',
  email: 'you@repsearch.app',
  username: 'tomer',
  onboarded: 1,
  is_private: 0,
  research_opt_in: 1,
  bio: 'Intermediate lifter chasing a 4-plate deadlift. PPL, 5x/week.',
  goal: 'hypertrophy',
  gender: 'man',
  experience_level: 'intermediate',
  split_type: 'Push/Pull/Legs',
  enhancement_status: 'natural',
  preferred_units: 'kg',
}

export function AuthProvider({ children }) {
  const isMock = !!import.meta.env.VITE_MOCK

  const [user, setUser] = useState(isMock ? MOCK_USER : null)
  const [token, setToken] = useState(isMock ? 'mock-token' : () => localStorage.getItem('token'))
  const [loading, setLoading] = useState(!isMock)

  const refresh = useCallback(async () => {
    if (isMock) return
    const t = localStorage.getItem('token')
    if (!t) { setLoading(false); return }
    try {
      const data = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [isMock])

  useEffect(() => { refresh() }, [refresh])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (email, username, password) => {
    const data = await api.post('/auth/register', { email, username, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((patch) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refresh, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
