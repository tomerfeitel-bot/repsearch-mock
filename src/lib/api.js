import { mockRequest } from './mockApi.js'
import { supabase } from './supabase.js'

const BASE = '/api'
const USE_MOCK = !!import.meta.env.VITE_MOCK

async function currentToken() {
  if (USE_MOCK) return localStorage.getItem('token')
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

async function request(method, path, body) {
  if (USE_MOCK) return mockRequest(method, path, body)
  const token = await currentToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let data = {}
  if (text) {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html') || text.trimStart().toLowerCase().startsWith('<!doctype')) {
      data = { error: 'API server returned an HTML page. Make sure the backend is running and the route exists.' }
    } else {
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text }
      }
    }
  }
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed')
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path, body) => request('DELETE', path, body),
}
