import client from './client';
import type {
  AuthTokens, DashboardData, Producto, Venta, Compra,
  Cliente, Proveedor, TipoGasto, FiltrosVenta, ApiResponse,
  Notificacion, ReporteMensual, BackupLog, UsuarioAdmin, FinanzasData,
} from '../types';

async function get<T>(url: string, params?: object): Promise<T> {
  const { data } = await client.get<ApiResponse<T>>(url, { params });
  return data.data;
}
async function post<T>(url: string, body?: object): Promise<T> {
  const { data } = await client.post<ApiResponse<T>>(url, body);
  return data.data;
}
async function put<T>(url: string, body?: object): Promise<T> {
  const { data } = await client.put<ApiResponse<T>>(url, body);
  return data.data;
}
async function patch<T>(url: string, body?: object): Promise<T> {
  const { data } = await client.patch<ApiResponse<T>>(url, body);
  return data.data;
}
async function del<T>(url: string): Promise<T> {
  const { data } = await client.delete<ApiResponse<T>>(url);
  return data.data;
}

export const authApi = {
  login:           (email: string, password: string) => post<AuthTokens>('/auth/login', { email, password }),
  refresh:         (rt: string) => post<{ access_token: string }>('/auth/refresh', { refresh_token: rt }),
  register:        (body: object) => post<{ id: number }>('/auth/register', body),
  cambiarPassword: (body: object) => post<null>('/auth/cambiar-password', body),
  listarUsuarios:  () => get<UsuarioAdmin[]>('/usuarios'),
  cambiarRol:      (id: number, rol: string) => patch<null>(`/usuarios/${id}/rol`, { rol }),
  toggleActivo:    (id: number, activo: boolean) => patch<null>(`/usuarios/${id}/activo`, { activo }),
};

export const dashboardApi = {
  get: () => get<DashboardData>('/dashboard'),
};

export const productosApi = {
  listar:       ()           => get<Producto[]>('/productos'),
  detalle:      (id: number) => get<Producto>(`/productos/${id}`),
  porCodigo:    (codigo: string) => get<Producto>(`/productos/codigo/${encodeURIComponent(codigo)}`),
  historial:    (id: number) => get<any[]>(`/productos/${id}/historial`),
  updatePrecio: (id: number, body: object) => put<Producto>(`/productos/${id}/precio`, body),
  ajustarStock: (id: number, cantidad: number, motivo?: string) =>
    patch<null>(`/productos/${id}/stock`, { cantidad, motivo }),
};

export const stockApi = {
  movimientos: () => get<any[]>('/stock/movimientos'),
};

export const ventasApi = {
  listar:        (f: FiltrosVenta) => get<Venta[]>('/ventas', f),
  detalle:       (id: number)      => get<Venta>(`/ventas/${id}`),
  crear:         (body: object)    => post<{ id: number }>('/ventas', body),
  editar:        (id: number, body: object) => put<null>(`/ventas/${id}`, body),
  eliminar:      (id: number)      => del<{ accion: string }>(`/ventas/${id}`),
  registrarPago: (id: number, body: object) => post<{ id: number }>(`/ventas/${id}/pagos`, body),
};

export const comprasApi = {
  listar:        ()                => get<Compra[]>('/compras'),
  detalle:       (id: number)      => get<Compra>(`/compras/${id}`),
  crear:         (body: object)    => post<{ id: number }>('/compras', body),
  editar:        (id: number, b: object) => put<null>(`/compras/${id}`, b),
  cambiarEstado: (id: number, estado: string) => patch<null>(`/compras/${id}/estado`, { estado }),
};

export const clientesApi = {
  listar: (q?: string) => get<Cliente[]>('/clientes', q ? { q } : undefined),
  crear:  (body: object) => post<{ id: number }>('/clientes', body),
  editar: (id: number, body: object) => put<null>(`/clientes/${id}`, body),
};

export const proveedoresApi = {
  listar: () => get<Proveedor[]>('/proveedores'),
};

export const tiposGastoApi = {
  listar: () => get<TipoGasto[]>('/tipos_gasto'),
};

export const notifApi = {
  listar:      () => get<Notificacion[]>('/notificaciones'),
  count:       () => get<{ total: number }>('/notificaciones/count'),
  leer:        (id: number) => patch<null>(`/notificaciones/${id}/leer`),
  leerTodas:   () => post<null>('/notificaciones/leer-todas'),
};

export const reporteApi = {
  mensualJson: (mes: string) => get<ReporteMensual>('/reportes/mensual', { mes }),
  mensualPdf:  async (mes: string) => {
    const r = await client.get(`/reportes/mensual/pdf`, { params: { mes }, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `reporte_${mes}.pdf`; a.click();
    URL.revokeObjectURL(url);
  },
};

export const backupApi = {
  generar: async () => {
    const r = await client.get('/backup/generar', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([r.data], { type: 'application/sql' }));
    const a = document.createElement('a');
    a.href = url; a.download = `backup_${new Date().toISOString().slice(0,10)}.sql`; a.click();
    URL.revokeObjectURL(url);
  },
  historial: () => get<BackupLog[]>('/backup/historial'),
};

export const carteraApi = {
  get: () => get<{ cartera: any[]; vencidas: any[] }>('/cartera'),
};

export const cajaApi = {
  get: (desde: string, hasta: string) => get<any>('/caja', { desde, hasta }),
};

export const finanzasApi = {
  get: (mes: string) => get<FinanzasData>('/finanzas', { mes }),
};
