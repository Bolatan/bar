'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, loadTokens, saveTokens, clearTokens, getAccessToken, type Profile } from './api';

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const tokens = loadTokens();
      if (!tokens) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api.auth.me();
        setUser(user);
      } catch {
        clearTokens();
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, refreshToken, user } = await api.auth.login(email, password);
    saveTokens(token, refreshToken);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { getAccessToken };
