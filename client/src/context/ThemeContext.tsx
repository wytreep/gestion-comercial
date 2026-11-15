import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Tema } from '../types';
import { aplicarTema, leerTema, TEMA_EVENT, temaEfectivo } from '../utils/theme';
import { authApi } from '../api/endpoints';

interface ThemeCtx {
  tema:    Tema;
  oscuro:  boolean;
  setTema: (tema: Tema) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(() => leerTema());
  const [oscuro, setOscuro] = useState(() => temaEfectivo(leerTema()) === 'oscuro');

  const sincronizar = useCallback((siguiente: Tema) => {
    setTemaState(siguiente);
    setOscuro(temaEfectivo(siguiente) === 'oscuro');
  }, []);

  // Cambios del selector y del login (la preferencia de la cuenta manda).
  useEffect(() => {
    const onTema = (e: Event) => {
      const detalle = (e as CustomEvent<Tema>).detail;
      if (detalle) sincronizar(detalle);
    };
    window.addEventListener(TEMA_EVENT, onTema);
    return () => window.removeEventListener(TEMA_EVENT, onTema);
  }, [sincronizar]);

  // En modo "sistema" se sigue el cambio de claro/oscuro del dispositivo.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onCambio = () => {
      if (leerTema() !== 'sistema') return;
      aplicarTema('sistema');
      setOscuro(temaEfectivo('sistema') === 'oscuro');
    };
    mq.addEventListener('change', onCambio);
    return () => mq.removeEventListener('change', onCambio);
  }, []);

  const setTema = useCallback((siguiente: Tema) => {
    sincronizar(siguiente);
    aplicarTema(siguiente);
    // Persistencia por cuenta; sin sesión queda solo en este dispositivo.
    if (localStorage.getItem('access_token')) {
      authApi.guardarTema(siguiente).catch(() => {});
    }
  }, [sincronizar]);

  return (
    <Ctx.Provider value={{ tema, oscuro, setTema }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTema() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTema fuera de ThemeProvider');
  return ctx;
}
