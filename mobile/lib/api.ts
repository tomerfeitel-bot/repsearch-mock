import Constants from 'expo-constants';
import { supabase } from './supabase';

// The Express server (server/ in the repo root) serves all data routes; on web
// Vite proxies /api to localhost:3002. A phone can't use that proxy, so in
// development the dev machine's LAN address is derived from the Expo dev-server
// host (e.g. "192.168.1.5:8081") and the server port substituted in.
function resolveBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) {
    const base = explicit.replace(/\/+$/, '');
    if (!__DEV__ && !base.startsWith('https://')) {
      // Store builds must not talk cleartext HTTP (ATS blocks it on iOS anyway).
      throw new Error(`EXPO_PUBLIC_API_URL must be https:// in release builds (got "${base}")`);
    }
    return base;
  }
  if (!__DEV__) {
    throw new Error('EXPO_PUBLIC_API_URL is required in release builds — the LAN-IP fallback is dev-only.');
  }
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:3002/api` : 'http://localhost:3002/api';
}

// Lazy so a misconfigured release build surfaces the error on the first
// request (toast) instead of crashing at module load.
let cachedBase: string | null = null;
export function apiBase(): string {
  if (cachedBase === null) cachedBase = resolveBase();
  return cachedBase;
}

async function request(method: string, path: string, body?: unknown) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || null;
  let res: Response;
  const API_BASE = apiBase();
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      `Can't reach the RepSearch server at ${API_BASE}. Make sure "npm run dev" is running on your computer and the phone is on the same Wi-Fi.`,
    );
  }
  const text = await res.text();
  let data: any = {};
  if (text) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html') || text.trimStart().toLowerCase().startsWith('<!doctype')) {
      data = { error: 'API server returned an HTML page. Make sure the backend is running and the route exists.' };
    } else {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }
  }
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data;
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  put: (path: string, body?: unknown) => request('PUT', path, body),
  patch: (path: string, body?: unknown) => request('PATCH', path, body),
  del: (path: string, body?: unknown) => request('DELETE', path, body),
};
