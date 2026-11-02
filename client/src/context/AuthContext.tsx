import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User, AuthTokens, Rol } from '../types';
import { authApi } from '../api/endpoints';

interface AuthCtx {
  user:      User | null;
  isLoading: boolean;
  isAuth:    boolean;
  login:     (email: string, password: string) => Promise<void>;
  logout:    () => void;
  isAdmin:   boolean;
  isVendedor:boolean;
  can:       (minRol: Rol) => boolean;
}

const ROL_LEVEL: Record<Rol, number> = { admin: 3, vendedor: 2, readonly: 1 };

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const saved = localStorage.getItem('auth_user');
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch { clearStorage(); }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const tokens: AuthTokens = await authApi.login(email, password);
    queryClient.clear();
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('auth_user',    JSON.stringify(tokens.user));
    if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
    setUser(tokens.user);
  };

  const logout = () => { clearStorage(); queryClient.clear(); setUser(null); };

  const can = (minRol: Rol): boolean => {
    if (!user) return false;
    return ROL_LEVEL[user.rol] >= ROL_LEVEL[minRol];
  };

  return (
    <Ctx.Provider value={{
      user, isLoading, login, logout,
      isAuth:    user !== null,
      isAdmin:   user?.rol === 'admin',
      isVendedor:user?.rol === 'vendedor' || user?.rol === 'admin',
      can,
    }}>
      {children}
    </Ctx.Provider>
  );
}

function clearStorage() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
