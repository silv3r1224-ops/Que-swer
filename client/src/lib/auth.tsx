import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiGet, apiPost, setAccessToken } from './api';
import type { Me } from './types';

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<Me>;
  register: (data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }) => Promise<Me>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiGet<{ user: Me }>('/api/v1/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session on mount.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Global: token expired & refresh failed → clear session.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    const onUserUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      setUser((prev) => (prev ? { ...prev, ...detail } : prev));
    };
    window.addEventListener('qs:unauthorized', onUnauthorized);
    window.addEventListener('qs:user-updated', onUserUpdated);
    return () => {
      window.removeEventListener('qs:unauthorized', onUnauthorized);
      window.removeEventListener('qs:user-updated', onUserUpdated);
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await apiPost<{ accessToken: string; user: Me }>('/api/v1/auth/login', {
      identifier,
      password,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (fields: { email: string; username: string; displayName: string; password: string }) => {
      const data = await apiPost<{ accessToken: string; user: Me }>(
        '/api/v1/auth/register',
        fields,
      );
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiPost('/api/v1/auth/logout');
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
