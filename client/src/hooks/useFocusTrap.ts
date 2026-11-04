import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Mantiene el foco dentro de un diálogo mientras está abierto.
 * - Enfoca el primer elemento útil (o el que ya traiga autoFocus).
 * - Cicla Tab y Shift+Tab sin salir del contenedor.
 * - Cierra con Escape y devuelve el foco al control que abrió el diálogo.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  containerRef: RefObject<T>,
  onEscape?: () => void,
) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  // El elemento que abrió el diálogo se captura durante el render, antes de
  // que un autoFocus interno mueva el foco. Así se puede devolver al cerrar.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef(false);

  if (active && !activeRef.current) {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }
  activeRef.current = active;

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => !el.hasAttribute('hidden') && el.getClientRects().length > 0);

    // Respeta un autoFocus declarado dentro del diálogo.
    if (!container.contains(document.activeElement)) {
      const first = focusables()[0] ?? container;
      first.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && container.contains(current);

      if (event.shiftKey) {
        if (!inside || current === first || current === container) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const target = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      target?.focus({ preventScroll: true });
    };
  }, [active, containerRef]);
}
