import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Info, X } from 'lucide-react';
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
  const s = { sm: 'h-4 w-4', md: 'h-7 w-7', lg: 'h-10 w-10' }[size];
  return (
    <div className="flex items-center justify-center py-8" role="status">
      <div className={clsx(s, 'animate-spin rounded-full border-2 border-slate-200 border-t-primary')} />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

// ── Empty ──────────────────────────────────────────────
export function Empty({
  message = 'Sin resultados',
  title,
  description,
  icon,
  action,
}: {
  message?: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-subtle" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-tiny font-medium text-slate-600">{title ?? message}</p>
      {description && <p className="max-w-sm text-tiny text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ── Alert ──────────────────────────────────────────────
const ALERT_STYLE = {
  error:   { box: 'border-danger/25 bg-danger-soft text-danger',    Icon: AlertCircle,   role: 'alert'  as const },
  warning: { box: 'border-warning/25 bg-warning-soft text-warning', Icon: AlertTriangle, role: 'status' as const },
  info:    { box: 'border-primary/20 bg-primary-50 text-primary',   Icon: Info,          role: 'status' as const },
  success: { box: 'border-success/20 bg-success-soft text-success', Icon: CheckCircle2,  role: 'status' as const },
};

export function Alert({ type = 'error', message }: { type?: 'error' | 'warning' | 'info' | 'success'; message: string }) {
  const s = ALERT_STYLE[type];
  return (
    <div role={s.role} className={clsx('flex items-start gap-2 rounded border px-3 py-2.5 text-xs font-medium', s.box)}>
      <s.Icon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, dialogRef, onClose);

  // Bloquea el scroll del fondo mientras el diálogo está abierto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;
  const w = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx('flex w-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-dropdown outline-none', 'max-h-[calc(100vh-2rem)]', w)}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="btn-icon -mr-1">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="scroll-slim flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm ────────────────────────────────────────────
export function Confirm({ open, title, message, onConfirm, onCancel, danger = false }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();
  useFocusTrap(open, dialogRef, onCancel);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="w-full max-w-sm rounded-lg border border-line bg-white p-5 shadow-dropdown outline-none"
      >
        <div className="mb-2 flex items-start gap-2.5">
          <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', danger ? 'bg-danger-soft text-danger' : 'bg-primary-50 text-primary')} aria-hidden="true">
            <AlertTriangle size={16} aria-hidden="true" />
          </span>
          <h3 id={titleId} className="mt-1 text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
        </div>
        <p id={messageId} className="mb-5 pl-[42px] text-xs leading-relaxed text-muted">{message}</p>
        <div className="flex justify-end gap-2">
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
  green:   'bg-success-soft text-success border-success/20',
  orange:  'bg-warning-soft text-warning border-warning/20',
  red:     'bg-danger-soft text-danger border-danger/20',
  emerald: 'bg-success-soft text-success border-success/20',
  teal:    'bg-teal/10 text-teal border-teal/25',
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
      <div className={clsx('absolute inset-y-0 left-0 w-[3px]', KPI_ACCENT[color] ?? 'bg-primary')} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <p className="section-label leading-tight">{label}</p>
        {icon && (
          <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border', KPI_ICON[color] ?? KPI_ICON.blue)} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="stat-value mt-2.5" title={value}>{value}</p>
      <div className="mt-1.5 flex min-h-[16px] flex-wrap items-center gap-x-2 gap-y-0.5">
        {trend != null && (
          <span className={clsx('inline-flex items-center gap-0.5 text-2xs font-semibold', trend >= 0 ? 'text-success' : 'text-danger')}>
            {trend >= 0 ? <ArrowUpRight size={11} aria-hidden="true" /> : <ArrowDownRight size={11} aria-hidden="true" />}
            {Math.abs(trend).toFixed(1)}%
            {trendLabel && <span className="font-normal text-muted">{trendLabel}</span>}
          </span>
        )}
        {sub && <p className="text-tiny text-muted">{sub}</p>}
      </div>
    </div>
  );
}
