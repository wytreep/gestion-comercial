/**
 * utils.js — Utilidades globales
 * Sistema de Gestión Comercial v1.0
 */

(function() {

const _COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

function formatCOP(n) { return _COP.format(Number(n) || 0); }
function parseCOP(str){ return parseFloat((str || '').replace(/[^0-9.-]/g, '')) || 0; }

function hoy() { return new Date().toISOString().split('T')[0]; }
function fechaHumana(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const BADGE = {
  estado_pago: {
    pagado:    { cls: 'badge-verde',  lbl: 'Pagado'    },
    abono:     { cls: 'badge-azul',   lbl: 'Abono'     },
    pendiente: { cls: 'badge-naranja',lbl: 'Pendiente' },
    fiado:     { cls: 'badge-rojo',   lbl: 'Fiado'     },
  },
  estado_pedido: {
    nuevo:          { cls: 'badge-azul',   lbl: 'Nuevo'          },
    en_preparacion: { cls: 'badge-naranja',lbl: 'En preparación' },
    entregado:      { cls: 'badge-verde',  lbl: 'Entregado'      },
    cancelado:      { cls: 'badge-rojo',   lbl: 'Cancelado'      },
  },
  medio_pago: {
    efectivo:      { cls: 'badge-verde',lbl: 'Efectivo'     },
    transferencia: { cls: 'badge-azul', lbl: 'Transferencia'},
  },
  destino: {
    efectivo_caja:         { cls: 'badge-verde',  lbl: '💵 Caja'        },
    billetera_nequi:       { cls: 'badge-azul',   lbl: '📱 Nequi'       },
    billetera_daviplata:   { cls: 'badge-naranja', lbl: '📱 Daviplata'   },
    billetera_bancolombia: { cls: 'badge-azul',   lbl: '📱 Bancolombia' },
    banco:                 { cls: 'badge-azul',   lbl: '🏦 Banco'       },
    otro:                  { cls: 'badge-gris',   lbl: 'Otro'           },
  },
};

function badge(tipo, val) {
  const map = BADGE[tipo]?.[val];
  if (!map) return `<span class="badge badge-gris">${val ?? '—'}</span>`;
  return `<span class="badge ${map.cls}">${map.lbl}</span>`;
}

function toast(msg, tipo = 'ok', duracion = 3500) {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 350);
  }, duracion);
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

function btnLoading(btn, state) {
  if (state) { btn._txt = btn.textContent; btn.disabled = true; btn.textContent = 'Procesando…'; }
  else        { btn.disabled = false; btn.textContent = btn._txt; }
}

async function confirmar(msg) { return window.confirm(msg); }

function fillSelect(selectEl, items, { valueKey, labelKey, placeholder = 'Selecciona…' } = {}) {
  selectEl.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i => `<option value="${i[valueKey]}">${i[labelKey]}</option>`).join('');
}

// Exponer SOLO a través de window.Utils — sin contaminar scope global con const
window.Utils = {
  formatCOP, parseCOP, hoy, fechaHumana,
  badge, toast, openModal, closeModal,
  btnLoading, confirmar, fillSelect
};

})();
