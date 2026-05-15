import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { enviarBibliotecaLocalParaNuvem } from '../utils/studyLibrarySync';
export type AuthUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUserFromCredentials: (u: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(user);
  userRef.current = user;

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      const data = (await r.json().catch(() => ({}))) as { user?: AuthUser | null };
      if (!r.ok) {
        setUser(null);
        return;
      }
      const u = data.user;
      setUser(u && typeof u.id === 'string' && typeof u.email === 'string' ? u : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    if (userRef.current) {
      await enviarBibliotecaLocalParaNuvem();
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const setUserFromCredentials = useCallback((u: AuthUser | null) => {
    setUser(u);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      logout,
      setUserFromCredentials,
    }),
    [user, loading, refresh, logout, setUserFromCredentials],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
