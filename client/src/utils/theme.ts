import type { Tema } from '../types';

const CLAVE = 'tema';
export const TEMA_EVENT = 'gcom:tema';

/** Preferencia guardada en este dispositivo (la de la cuenta manda al entrar). */
export function leerTema(): Tema {
  if (typeof window === 'undefined') return 'sistema';
  const guardado = localStorage.getItem(CLAVE);
  return guardado === 'claro' || guardado === 'oscuro' || guardado === 'sistema' ? guardado : 'sistema';
}

/** Tema efectivo: "sistema" se resuelve con la preferencia del dispositivo. */
export function temaEfectivo(tema: Tema = leerTema()): 'claro' | 'oscuro' {
  if (tema !== 'sistema') return tema;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

/**
 * Aplica el tema al documento. Centralizar el cambio evita que el script
 * anti-flash, el selector y el login apliquen clases distintas.
 */
export function aplicarTema(tema: Tema, persistir = true): void {
  if (typeof document === 'undefined') return;
  if (persistir) localStorage.setItem(CLAVE, tema);

  const oscuro = temaEfectivo(tema) === 'oscuro';
  document.documentElement.classList.toggle('dark', oscuro);
  document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', oscuro ? '#0c151d' : '#0b5cab');

  window.dispatchEvent(new CustomEvent(TEMA_EVENT, { detail: tema }));
}

/** Etiqueta legible para lectores de pantalla y menús. */
export const ETIQUETA_TEMA: Record<Tema, string> = {
  claro: 'Claro',
  oscuro: 'Oscuro',
  sistema: 'Sistema',
};
