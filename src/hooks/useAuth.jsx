import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { api } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)
const USE_MOCK = !!import.meta.env.VITE_MOCK

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      if (USE_MOCK) {
        const t = localStorage.getItem('token')
        if (!t) {
          setToken(null)
          setUser(null)
          return
        }
        const data = await api.get('/auth/me')
        setToken(t)
        setUser(data.user)
        return
      }

      if (!supabase) throw new Error('Supabase is not configured')
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token || null
      if (!accessToken) {
        setToken(null)
        setUser(null)
        return
      }
      setToken(accessToken)
      const profile = await api.get('/auth/me')
      setUser(profile.user)
    } catch {
      if (!USE_MOCK && supabase) await supabase.auth.signOut()
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    if (USE_MOCK || !supabase) return undefined
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessToken = session?.access_token || null
      setToken(accessToken)
      if (!accessToken) setUser(null)
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    if (USE_MOCK) {
      const data = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data.user
    }
    if (!supabase) throw new Error('Supabase is not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    setToken(data.session?.access_token || null)
    const profile = await api.get('/auth/me')
    setUser(profile.user)
    return profile.user
  }, [])

  const register = useCallback(async (email, username, password) => {
    if (USE_MOCK) {
      const data = await api.post('/auth/register', { email, username, password })
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data.user
    }
    if (!supabase) throw new Error('Supabase is not configured')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    if (!data.session) {
      throw new Error('Check your email to confirm your account, then sign in.')
    }
    setToken(data.session.access_token)
    const profile = await api.post('/auth/profile', { username })
    setUser(profile.user)
    return profile.user
  }, [])

  const logout = useCallback(async () => {
    if (!USE_MOCK && supabase) await supabase.auth.signOut()
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
