import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react';
import clsx from 'clsx';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { EstadoPago, EstadoPedido, EstadoCompra, TipoMovimiento, TipoNotificacion } from '../../types';
import { BADGE_PAGO, BADGE_PEDIDO, BADGE_COMPRA, BADGE_MOVIMIENTO, BADGE_NOTIF, BADGE_DESTINO } from '../../utils/format';

// ── Badges ─────────────────────────────────────────────
export const BadgeEstadoPago    = ({ estado }: { estado: EstadoPago })       => { const b = BADGE_PAGO[estado]       ?? { label: estado, className: 'badge-gray' }; return <span className={b.className}>{b.label}</span>; };
export const BadgeEstadoPedido  = ({ estado }: { estado: EstadoPedido })     => { const b = BADGE_PEDIDO[estado]     ?? { label: estado, className: 'badge-gray' }; return <span className={b.className}>{b.label}</span>; };
export const BadgeEstadoCompra  = ({ estado }: { estado: EstadoCompra })     => { const b = BADGE_COMPRA[estado]     ?? { label: estado, className: 'badge-gray' }; return <span className={b.className}>{b.label}</span>; };
export const BadgeMovimiento    = ({ tipo }:   { tipo: TipoMovimiento })     => { const b = BADGE_MOVIMIENTO[tipo]   ?? { label: tipo,   className: 'badge-gray' }; return <span className={b.className}>{b.label}</span>; };
export const BadgeNotif         = ({ tipo }:   { tipo: TipoNotificacion })   => { const b = BADGE_NOTIF[tipo]        ?? { label: tipo,   className: 'badge-gray' }; return <span className={b.className}>{b.label}</span>; };
export const BadgeDestino       = ({ destino }:{ destino: string })           => { const b = BADGE_DESTINO[destino]  ?? { label: destino,className: 'badge-gray' }; return <span className={b.className}>{b.label}</span>; };
export const BadgeMedioPago     = ({ medio }:  { medio: 'efectivo' | 'transferencia' }) => {
  const b = medio === 'efectivo'
    ? { label: 'Efectivo', className: 'badge-green' }
    : { label: 'Transferencia', className: 'badge-blue' };
  return <span className={b.className}>{b.label}</span>;
};
export const BadgeRol = ({ rol }: { rol: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    admin:    { label: 'Administrador', className: 'badge-red'  },
    vendedor: { label: 'Vendedor',      className: 'badge-blue' },
    readonly: { label: 'Solo lectura',  className: 'badge-gray' },
  };
  const b = map[rol] ?? { label: rol, className: 'badge-gray' };
  return <span className={b.className}>{b.label}</span>;
};

// ── NumberInput ────────────────────────────────────────
// Input de dinero/cantidades que conserva el texto mientras se escribe
// ("1.", "1,5") y entrega un number al formulario. Evita que los DECIMAL
// de la API ("40000.00") se muestren con ".00" o se interpreten como miles.
export function NumberInput({
  value,
  onChange,
  parse = (raw: string) => Number(raw.replace(',', '.')) || 0,
  className = 'input',
  placeholder,
  inputMode = 'numeric',
  disabled,
  id,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  parse?: (raw: string) => number;
  className?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal';
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  const mostrar = (n: number) => (n ? String(n) : '');
  const [texto, setTexto] = useState(() => mostrar(value));

  // Resincroniza solo cuando el valor cambia desde fuera (p. ej. al elegir
  // un producto); mientras se escribe, el texto se conserva tal cual.
  useEffect(() => {
    if (parse(texto) !== value) setTexto(mostrar(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode={inputMode}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      aria-label={ariaLabel}
      value={texto}
      onChange={(e) => { const raw = e.target.value; setTexto(raw); onChange(parse(raw)); }}
      onBlur={() => { const n = parse(texto); setTexto(mostrar(n)); onChange(n); }}
    />
  );
}

// ── Spinner ────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }[size];
  return <div className="flex justify-center items-center py-8"><div className={clsx(s, 'border-2 border-slate-200 border-t-primary rounded-full animate-spin')} /></div>;
}

// ── Empty ──────────────────────────────────────────────
export function Empty({ message = 'Sin resultados' }: { message?: string }) {
  return <div className="text-center py-10 text-slate-400 text-[12px]">{message}</div>;
}

// ── Alert ──────────────────────────────────────────────
export function Alert({ type = 'error', message }: { type?: 'error' | 'warning' | 'info'; message: string }) {
  const s = {
    error:   'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-sky-50 border-sky-200 text-sky-800',
  };
  return <div className={clsx('border rounded-sm px-3 py-2.5 text-[12px]', s[type])}>{message}</div>;
}

// ── Modal ──────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, dialogRef, onClose);

  if (!open) return null;
  const w = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx('bg-white rounded-lg shadow-dropdown w-full max-h-[90vh] flex flex-col border border-line outline-none', w)}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 id={titleId} className="text-[13px] font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-sm p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm ────────────────────────────────────────────
export function Confirm({ open, title, message, onConfirm, onCancel, danger = false }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, dialogRef, onCancel);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-dropdown w-full max-w-sm border border-line p-5 outline-none"
      >
        <h3 id={titleId} className="text-[13px] font-semibold text-slate-900 mb-1.5">{title}</h3>
        <p className="text-[12px] text-slate-600 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────
const KPI_ACCENT: Record<string, string> = {
  blue:    'bg-primary',
  green:   'bg-success',
  orange:  'bg-warning',
  red:     'bg-danger',
  emerald: 'bg-emerald',
  teal:    'bg-teal',
  slate:   'bg-slate-400',
};
const KPI_ICON: Record<string, string> = {
  blue:    'bg-primary-50 text-primary border-primary/15',
  green:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  orange:  'bg-amber-50 text-amber-700 border-amber-200',
  red:     'bg-red-50 text-red-700 border-red-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teal:    'bg-teal-50 text-teal-700 border-teal-200',
  slate:   'bg-slate-50 text-slate-600 border-slate-200',
};

export function KpiCard({
  label, value, sub, color = 'blue', icon, trend, trendLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: ReactNode;
  trend?: number | null;
  trendLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-white px-4 py-3.5 shadow-panel">
      <div className={clsx('absolute inset-y-0 left-0 w-[3px]', KPI_ACCENT[color] ?? 'bg-primary')} />
      <div className="flex items-start justify-between gap-2">
        <p className="section-label leading-tight">{label}</p>
        {icon && (
          <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border', KPI_ICON[color] ?? KPI_ICON.blue)}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2.5 stat-value">{value}</p>
      <div className="mt-1.5 flex min-h-[15px] flex-wrap items-center gap-x-2 gap-y-0.5">
        {trend != null && (
          <span className={clsx('inline-flex items-center gap-0.5 text-[10.5px] font-semibold', trend >= 0 ? 'text-success' : 'text-danger')}>
            {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend).toFixed(1)}%
            {trendLabel && <span className="font-normal text-slate-400">{trendLabel}</span>}
          </span>
        )}
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}
