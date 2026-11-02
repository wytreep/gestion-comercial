import type { EstadoPago, EstadoPedido, EstadoCompra, TipoMovimiento, TipoNotificacion } from '../types';

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
export const formatCOP  = (n: number | null | undefined) => COP.format(Number(n) || 0);

/**
 * Convierte un DECIMAL que llega de la API a number.
 * PDO devuelve los DECIMAL como string ("40000.00", "1.500"); si ese texto
 * entra a un formulario, los parsers confunden el punto decimal con el
 * separador de miles. Normalizar aquí evita el bug del ".00".
 */
export const num = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parser para valores de dinero escritos por el usuario.
 * Acepta "55.000" (miles), "40000.00" (decimal) y "1,5" (coma decimal).
 */
export const parseMoneyInput = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  const hasComma = s.includes(',');
  const hasDot   = s.includes('.');

  if (hasComma && hasDot) {
    // 1.234,56 → el punto es de miles y la coma decimal.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  } else if (hasDot) {
    const partes = s.split('.');
    const ultima = partes[partes.length - 1];
    // "55.000" o "1.234.567" son separadores de miles; "40000.00" es decimal.
    if (partes.length > 2 || ultima.length === 3) s = partes.join('');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parser para cantidades (kg, unidades). El punto y la coma son decimales:
 * "1.5", "1,5" y "1.500" (que en la API significa 1,5) dan 1.5.
 */
export const parseDecimalInput = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  const hasComma = s.includes(',');
  const hasDot   = s.includes('.');

  if (hasComma && hasDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  } else if (hasDot) {
    const partes = s.split('.');
    // Varios puntos solo pueden ser separadores de miles.
    if (partes.length > 2) s = partes.join('');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** Muestra cantidades sin ceros sobrantes: 1.500 → "1,5", 2.00 → "2". */
export const formatCantidad = (v: unknown, maxDecimales = 3): string =>
  num(v).toLocaleString('es-CO', { maximumFractionDigits: maxDecimales });

// Fecha local en formato YYYY-MM-DD. No usar toISOString(): convierte a UTC
// y en Colombia (UTC-5) devuelve el día siguiente por la noche.
const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const today = () => toLocalISO(new Date());
export const firstDayOfMonth = () => { const d = new Date(); d.setDate(1); return toLocalISO(d); };
export const currentMonth    = () => new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
export const currentMonthKey = () => toLocalISO(new Date()).slice(0, 7);
export const formatMes = (mes: string | null | undefined) => {
  if (!mes) return '—';
  return new Date(`${mes}-01T00:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};
export const formatPct = (n: number | null | undefined, decimales = 1) =>
  `${(Number(n) || 0).toFixed(decimales)}%`;

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
    .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO');
};

type Badge = { label: string; className: string };

export const BADGE_PAGO: Record<EstadoPago, Badge> = {
  pagado:    { label: 'Pagado',    className: 'badge-green'  },
  abono:     { label: 'Abono',     className: 'badge-blue'   },
  pendiente: { label: 'Pendiente', className: 'badge-orange' },
  fiado:     { label: 'Fiado',     className: 'badge-red'    },
};
export const BADGE_PEDIDO: Record<EstadoPedido, Badge> = {
  nuevo:          { label: 'Nuevo',          className: 'badge-blue'   },
  en_preparacion: { label: 'En preparación', className: 'badge-orange' },
  entregado:      { label: 'Entregado',      className: 'badge-green'  },
  cancelado:      { label: 'Cancelado',      className: 'badge-red'    },
};
export const BADGE_COMPRA: Record<EstadoCompra, Badge> = {
  pendiente: { label: 'Pendiente', className: 'badge-orange' },
  parcial:   { label: 'Parcial',   className: 'badge-blue'   },
  recibida:  { label: 'Recibida',  className: 'badge-green'  },
};
export const BADGE_MOVIMIENTO: Record<TipoMovimiento, Badge> = {
  compra:        { label: 'Compra',     className: 'badge-green'  },
  venta:         { label: 'Venta',      className: 'badge-blue'   },
  ajuste_manual: { label: 'Ajuste',     className: 'badge-orange' },
  devolucion:    { label: 'Devolución', className: 'badge-gray'   },
};
export const BADGE_NOTIF: Record<TipoNotificacion, Badge> = {
  deuda_vencida: { label: 'Deuda',   className: 'badge-red'    },
  stock_bajo:    { label: 'Stock',   className: 'badge-orange' },
  sistema:       { label: 'Sistema', className: 'badge-gray'   },
};
export const BADGE_DESTINO: Record<string, Badge> = {
  efectivo_caja:         { label: 'Caja',        className: 'badge-green'  },
  billetera_nequi:       { label: 'Nequi',       className: 'badge-blue'   },
  billetera_daviplata:   { label: 'Daviplata',   className: 'badge-orange' },
  billetera_bancolombia: { label: 'Bancolombia', className: 'badge-blue'   },
  banco:                 { label: 'Banco',       className: 'badge-blue'   },
  otro:                  { label: 'Otro',        className: 'badge-gray'   },
};

export const OPCIONES_MEDIO_PAGO = [
  { value: 'efectivo',      label: 'Efectivo'      },
  { value: 'transferencia', label: 'Transferencia' },
];
export const OPCIONES_DESTINO = [
  { value: 'efectivo_caja',         label: 'Caja (efectivo)'   },
  { value: 'billetera_nequi',       label: 'Nequi'             },
  { value: 'billetera_daviplata',   label: 'Daviplata'         },
  { value: 'billetera_bancolombia', label: 'Bancolombia App'   },
  { value: 'banco',                 label: 'Banco'             },
  { value: 'otro',                  label: 'Otro'              },
];
export const OPCIONES_ESTADO_PEDIDO = [
  { value: 'nuevo',          label: 'Nuevo'          },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'entregado',      label: 'Entregado'      },
  { value: 'cancelado',      label: 'Cancelado'      },
];
export const OPCIONES_ESTADO_COMPRA = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial',   label: 'Parcial'   },
  { value: 'recibida',  label: 'Recibida'  },
];
export const OPCIONES_ROL = [
  { value: 'admin',    label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor'      },
  { value: 'readonly', label: 'Solo lectura'  },
];

export const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};
