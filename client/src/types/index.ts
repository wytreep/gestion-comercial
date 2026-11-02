// ── Auth ──────────────────────────────────────────────
export type Rol = 'admin' | 'vendedor' | 'readonly';

export interface User {
  id:     number;
  nombre: string;
  email:  string;
  rol:    Rol;
}

export interface AuthTokens {
  access_token:   string;
  refresh_token?: string;
  expires_in:     number;
  user:           User;
}

export interface UsuarioAdmin {
  id:         number;
  nombre:     string;
  email:      string;
  rol:        Rol;
  activo:     boolean;
  created_at: string;
}

// ── Producto ──────────────────────────────────────────
export interface Producto {
  id:                number;
  categoria_id:      number;
  nombre:            string;
  unidad_medida:     'kilo' | 'canasta' | 'unidad';
  /** Solo se envía a administración. */
  precio_compra?:    number;
  precio_venta:      number;
  kilos_por_canasta: number | null;
  stock_actual:      number;
  /** Solo se envía a administración. */
  costo_por_kg?:     number | null;
  /** Solo se envía a administración. */
  margen_porcentaje?: number | null;
  categoria:         string;
  activo:            boolean;
}

// ── Stock movimiento ──────────────────────────────────
export type TipoMovimiento = 'compra' | 'venta' | 'ajuste_manual' | 'devolucion';

export interface StockMovimiento {
  id:             number;
  producto_id:    number;
  producto:       string;
  tipo:           TipoMovimiento;
  cantidad:       number;
  stock_anterior: number;
  stock_nuevo:    number;
  motivo:         string | null;
  referencia_id:  number | null;
  usuario:        string | null;
  created_at:     string;
}

// ── Cliente ───────────────────────────────────────────
export interface Cliente {
  id:        number;
  nombre:    string;
  telefono:  string | null;
  direccion: string | null;
  notas:     string | null;
  activo:    boolean;
}

// ── Proveedor ─────────────────────────────────────────
export interface Proveedor {
  id:       number;
  nombre:   string;
  ciudad:   string | null;
  telefono: string | null;
}

// ── Tipos gasto ───────────────────────────────────────
export interface TipoGasto {
  id:          number;
  nombre:      string;
  descripcion: string;
  categoria:   'transporte' | 'almacenamiento' | 'otro';
}

// ── Venta ─────────────────────────────────────────────
export type EstadoPago   = 'pagado' | 'abono' | 'pendiente' | 'fiado';
export type EstadoPedido = 'nuevo' | 'en_preparacion' | 'entregado' | 'cancelado';

export interface ItemVenta {
  id:              number;
  producto_id:     number;
  producto:        string;
  unidad_medida:   string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
}

export interface Pago {
  id:                number;
  venta_id:          number;
  monto:             number;
  fecha_pago:        string;
  fecha_vencimiento: string | null;
  medio_pago:        'efectivo' | 'transferencia';
  destino_dinero:    string;
  referencia:        string | null;
  notas:             string | null;
}

export interface Venta {
  id:               number;
  cliente_id:       number | null;
  cliente_nombre:   string;
  cliente_telefono: string | null;
  total:            number;
  total_pagado:     number;
  saldo_pendiente:  number;
  estado_pago:      EstadoPago;
  estado_pedido:    EstadoPedido;
  fecha_venta:      string;
  fecha_entrega:    string | null;
  observaciones:    string | null;
  items:            ItemVenta[];
  pagos:            Pago[];
}

export interface FiltrosVenta {
  estado_pago?:   EstadoPago | '';
  estado_pedido?: EstadoPedido | '';
  cliente_id?:    number | '';
  fecha_desde?:   string;
  fecha_hasta?:   string;
}

// ── Compra ────────────────────────────────────────────
export type EstadoCompra = 'pendiente' | 'parcial' | 'recibida';

export interface ItemCompra {
  id:              number;
  producto_id:     number;
  producto:        string;
  unidad_medida:   string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
  kilos_estimados: number | null;
}

export interface GastoCompra {
  id:            number;
  tipo_gasto_id: number;
  tipo:          string;
  categoria:     string;
  monto:         number;
  descripcion:   string | null;
  fecha:         string;
}

export interface Compra {
  id:              number;
  proveedor_id:    number | null;
  proveedor:       string | null;
  fecha_compra:    string;
  fecha_llegada:   string | null;
  observaciones:   string | null;
  total_productos: number;
  total_gastos:    number;
  total_inversion: number;
  estado:          EstadoCompra;
  items:           ItemCompra[];
  gastos:          GastoCompra[];
}

// ── Dashboard ─────────────────────────────────────────
export interface ResumenMes {
  ingresos_cobrados:       number;
  ventas_count:            number;
  ventas_total:            number;
  /** Solo para administración. */
  inversion?:              number;
  /** Solo para administración. */
  ganancia_bruta?:         number;
  /** Solo para administración. */
  margen_bruto?:           number;
  cartera_pendiente:       number;
}

export interface DashboardData {
  resumen_mes:               ResumenMes;
  ultimas_ventas:            Partial<Venta>[];
  /** Solo para administración. */
  saldos_destino?:           { destino_dinero: string; total: number }[];
  stock:                     { nombre: string; stock_actual: number; unidad_medida: string; precio_venta: number; kilos_por_canasta: number | null }[];
  notificaciones_pendientes: number;
}

// ── Notificación ──────────────────────────────────────
export type TipoNotificacion = 'deuda_vencida' | 'stock_bajo' | 'sistema';

export interface Notificacion {
  id:              number;
  tipo:            TipoNotificacion;
  titulo:          string;
  mensaje:         string;
  referencia_id:   number | null;
  referencia_tipo: string | null;
  leida:           boolean;
  created_at:      string;
}

// ── Reporte ───────────────────────────────────────────
export interface ReporteMensual {
  periodo:      string;
  ventas:       { count: number; total: number; cobrado: number };
  compras:      { total: number };
  ganancia:     number;
  margen:       number;
  cartera:      { total: number; detalle: any[] };
  stock:        any[];
  top_clientes: any[];
}

// ── Backup ────────────────────────────────────────────
export interface BackupLog {
  id:               number;
  nombre_archivo:   string;
  tamanio_bytes:    number;
  tablas_incluidas: string;
  created_at:       string;
}

// ── Finanzas ──────────────────────────────────────────
export interface GastoFinanciero {
  nombre:    string;
  categoria: 'transporte' | 'almacenamiento' | 'otro';
  monto:     number;
}

export interface EstadoResultados {
  ingresos_operacionales: number;
  pedidos:                number;
  cobrado:                number;
  costo_ventas:           number;
  utilidad_bruta:         number;
  gastos_operativos:      number;
  utilidad_operativa:     number;
  margen_bruto:           number;
  margen_operativo:       number;
  detalle_gastos:         GastoFinanciero[];
  gastos_por_categoria:   { categoria: string; monto: number }[];
}

export interface SerieCajaDia {
  fecha:     string;
  label:     string;
  ingresos:  number;
  egresos:   number;
  neto:      number;
  acumulado: number;
}

export interface FlujoCaja {
  ingresos:        number;
  egresos:         number;
  neto:            number;
  num_cobros:      number;
  num_compras:     number;
  posicion_caja:   number;
  saldos_destino:  { destino_dinero: string; total: number; transacciones: number }[];
  por_medio:       { medio_pago: string; total: number; transacciones: number }[];
  serie_diaria:    SerieCajaDia[];
  egresos_detalle: {
    id: number; fecha_compra: string; proveedor: string;
    total_productos: number; total_gastos: number; total_inversion: number;
    estado: string;
  }[];
}

export interface IndicadoresFinancieros {
  ticket_promedio:      number;
  margen_bruto:         number;
  margen_operativo:     number;
  punto_equilibrio:     number;
  cartera:              number;
  dso:                  number;
  rotacion_inventario:  number;
  valor_inventario:     number;
  crecimiento_ventas:   number | null;
  cartera_sobre_ventas: number;
  cobertura_gastos:     number;
  compras_mes:          number;
  flujo_neto:           number;
  saldo_caja:           number;
  pedidos:              number;
  ventas:               number;
  productos_con_venta:  number;
}

export interface ProductoFinanciero {
  id:            number;
  nombre:        string;
  unidad_medida: string;
  unidades:      number;
  ventas:        number;
  costo:         number;
  utilidad:      number;
  margen:        number;
  participacion: number;
}

export interface TendenciaFinanciera {
  mes:                string;
  label:              string;
  ventas:             number;
  costo:              number;
  utilidad_bruta:     number;
  gastos:             number;
  utilidad_operativa: number;
  cobros:             number;
  compras:            number;
  flujo:              number;
}

export interface ComparativoFinanciero {
  periodo:            string;
  periodo_label:      string;
  ventas:             number;
  utilidad_bruta:     number;
  utilidad_operativa: number;
  cobros:             number;
  compras:            number;
}

export interface FinanzasData {
  periodo:           string;
  periodo_label:     string;
  estado_resultados: EstadoResultados;
  flujo:             FlujoCaja;
  indicadores:       IndicadoresFinancieros;
  productos:         ProductoFinanciero[];
  tendencia:         TendenciaFinanciera[];
  comparativo:       ComparativoFinanciero;
}

// ── API Response ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data:    T;
}
