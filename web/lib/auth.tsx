'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi, tokenStore } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (values: { username: string; password: string }) => Promise<void>;
  register: (values: { username: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 应用启动：若本地有 token，则拉取当前用户，恢复登录态
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (tokenStore.access) {
        try {
          const me = await authApi.me();
          if (active) setUser(me);
        } catch {
          tokenStore.clear();
          if (active) setUser(null);
        }
      }
      if (active) setLoading(false);
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function login(values: { username: string; password: string }) {
    const res = await authApi.login(values);
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
  }

  async function register(values: { username: string; password: string; name?: string }) {
    const res = await authApi.register(values);
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
