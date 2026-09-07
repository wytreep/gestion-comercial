/**
 * api.js — Cliente HTTP para la API REST interna
 * Sistema de Gestión Comercial v1.0
 */

const API_BASE = 'api/index.php';

/**
 * Petición genérica con manejo de errores centralizado.
 */
async function apiRequest(resource, { method = 'GET', action = 'list', id = null, body = null, params = {} } = {}) {
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set('resource', resource);
  url.searchParams.set('action',   action);
  if (id)   url.searchParams.set('id', id);
  Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v); });

  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res  = await fetch(url.toString(), opts);
  const json = await res.json();

  if (!json.success) throw new Error(json.message || 'Error desconocido');
  return json.data;
}

// ── Recursos ────────────────────────────────────────
const API = {
  // Dashboard
  dashboard:    ()          => apiRequest('dashboard'),

  // Productos
  productos:    {
    listar:     ()          => apiRequest('productos'),
    detalle:    (id)        => apiRequest('productos', { id }),
    actualizarPrecio: (id, body) => apiRequest('productos', { method: 'PUT', action: 'precio', id, body }),
    actualizarStock:  (id, body) => apiRequest('productos', { method: 'PUT', action: 'stock',  id, body }),
    historialPrecios: (id)  => apiRequest('productos', { action: 'historial', id }),
  },

  // Clientes
  clientes: {
    listar:     (q = '')    => apiRequest('clientes', { params: { q } }),
    detalle:    (id)        => apiRequest('clientes', { id }),
    crear:      (body)      => apiRequest('clientes', { method: 'POST', body }),
    actualizar: (id, body)  => apiRequest('clientes', { method: 'PUT', id, body }),
  },

  // Proveedores
  proveedores: {
    listar:     ()          => apiRequest('proveedores'),
    crear:      (body)      => apiRequest('proveedores', { method: 'POST', body }),
  },

  // Compras
  compras: {
    listar:     ()              => apiRequest('compras'),
    detalle:    (id)            => apiRequest('compras', { id }),
    crear:      (body)          => apiRequest('compras', { method: 'POST', body }),
    actualizar: (id, body)      => apiRequest('compras', { method: 'PUT', id, body }),
    cambiarEstado: (id, estado) => apiRequest('compras', { method: 'PUT', id, body: { estado } }),
  },

  // Ventas
  ventas: {
    listar:     (params)    => apiRequest('ventas', { params }),
    detalle:    (id)        => apiRequest('ventas', { id }),
    crear:      (body)      => apiRequest('ventas', { method: 'POST', body }),
    actualizar: (id, body)  => apiRequest('ventas', { method: 'PUT', id, body }),
    eliminar:   (id)        => apiRequest('ventas', { method: 'DELETE', id }),
  },

  // Pagos
  pagos: {
    porVenta:   (ventaId)   => apiRequest('pagos', { params: { venta_id: ventaId } }),
    porFecha:   (fecha)     => apiRequest('pagos', { params: { fecha } }),
    registrar:  (body)      => apiRequest('pagos', { method: 'POST', body }),
  },

  // Cuentas
  cartera:    ()                              => apiRequest('cartera'),
  caja:       (desde, hasta)                 => apiRequest('caja', { params: { desde, hasta } }),
  tiposGasto: ()                             => apiRequest('tipos_gasto'),
  categorias: ()                             => apiRequest('categorias'),
};

window.API = API;
