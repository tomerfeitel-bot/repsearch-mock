import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Auth() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    if (!email || !password) return 'Email and password are required'
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email'
    if (mode === 'register' && !username.trim()) return 'Username is required'
    if (mode === 'register' && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) return 'Username must be 3–24 letters, digits, or underscores'
    if (password.length < 6) return 'Password must be at least 6 characters'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setError('')
    setLoading(true)
    try {
      const u = mode === 'login'
        ? await login(email, password)
        : await register(email, username, password)
      navigate(u.onboarded ? '/community' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">RepSearch</h1>
          <p className="text-gray-400 text-sm">Real data from real lifters.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 text-white py-4 px-5 rounded-2xl outline-none transition-colors"
          />
          {mode === 'register' && (
            <input
              type="text"
              autoComplete="username"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 text-white py-4 px-5 rounded-2xl outline-none transition-colors"
            />
          )}
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 text-white py-4 px-5 rounded-2xl outline-none transition-colors"
          />

          {error && <p className="text-red-400 text-sm pl-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-all"
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
