import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Port of src/hooks/useAuth.jsx with the mock/localStorage branches dropped:
// Supabase Auth owns the session (persisted by the secure storage adapter in
// lib/supabase.ts); the Express server profile is fetched via /auth/me.
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  onboarded: boolean | number;
  [key: string]: unknown;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token || null;
      if (!accessToken) {
        setToken(null);
        setUser(null);
        return;
      }
      setToken(accessToken);
      const profile = await api.get('/auth/me');
      setUser(profile.user);
    } catch {
      await supabase.auth.signOut();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessToken = session?.access_token || null;
      setToken(accessToken);
      if (!accessToken) setUser(null);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    setToken(data.session?.access_token || null);
    const profile = await api.get('/auth/me');
    setUser(profile.user);
    return profile.user as AuthUser;
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error('Check your email to confirm your account, then sign in.');
    }
    setToken(data.session.access_token);
    const profile = await api.post('/auth/profile', { username });
    setUser(profile.user);
    return profile.user as AuthUser;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refresh, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
