/**
 * app.js — Router SPA y controladores de cada vista
 * Sistema de Gestión Comercial v1.0
 */
'use strict';

// Aliases locales desde Utils (var para evitar re-declaración en scope global)
var formatCOP   = Utils.formatCOP;
var parseCOP    = Utils.parseCOP;
var hoy         = Utils.hoy;
var fechaHumana = Utils.fechaHumana;
var badge       = Utils.badge;
var toast       = Utils.toast;
var openModal   = Utils.openModal;
var closeModal  = Utils.closeModal;
var btnLoading  = Utils.btnLoading;
var confirmar   = Utils.confirmar;
var fillSelect  = Utils.fillSelect;

// ═══════════════════════════════════════════════════════
// ROUTER SPA
// ═══════════════════════════════════════════════════════
const PAGES = {
  'dashboard':    renderDashboard,
  'ventas':       renderVentas,
  'nueva-venta':  renderNuevaVenta,
  'compras':      renderCompras,
  'nueva-compra': renderNuevaCompra,
  'cartera':      renderCartera,
  'caja':         renderCaja,
  'clientes':     renderClientes,
  'productos':    renderProductos,
};

function navigate(page) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  history.pushState({ page }, '', url);
  renderPage(page);
}

function renderPage(page = 'dashboard') {
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-spinner"><span></span></div>';
  const fn = PAGES[page] || renderDashboard;
  fn(main);
}

window.addEventListener('popstate', e => renderPage(e.state?.page || 'dashboard'));
document.addEventListener('DOMContentLoaded', () => {
  const page = new URLSearchParams(window.location.search).get('page') || 'dashboard';
  renderPage(page);
  registerSW();
});

// ─── Registro del Service Worker ─────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/pescaderia/sw.js')
      .then(() => {
        // Mostrar botón de instalación PWA si aplica
        window.addEventListener('beforeinstallprompt', e => {
          e.preventDefault();
          window._pwaPrompt = e;
          document.getElementById('btn-instalar')?.classList.remove('hidden');
        });
      });
  }
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderDashboard(el) {
  try {
    const d = await API.dashboard();
    const r = d.resumen_mes;
    el.innerHTML = `
    <div class="page-header"><h1>Dashboard</h1><span class="mes-label">${mesActual()}</span></div>
    <div class="kpi-grid">
      <div class="kpi kpi-azul">
        <div class="kpi-label">Ventas del mes</div>
        <div class="kpi-valor">${formatCOP(r.ventas_total)}</div>
        <div class="kpi-sub">${r.ventas_count} pedidos</div>
      </div>
      <div class="kpi kpi-verde">
        <div class="kpi-label">Dinero cobrado</div>
        <div class="kpi-valor">${formatCOP(r.ingresos_cobrados)}</div>
      </div>
      <div class="kpi kpi-naranja">
        <div class="kpi-label">Inversión (compras)</div>
        <div class="kpi-valor">${formatCOP(r.inversion)}</div>
      </div>
      <div class="kpi kpi-esmeralda">
        <div class="kpi-label">Ganancia bruta est.</div>
        <div class="kpi-valor" style="color:${r.ganancia_bruta >= 0 ? 'inherit' : 'var(--rojo)'}">${formatCOP(r.ganancia_bruta)}</div>
        <div class="kpi-sub">Ventas − Inversión compras | Margen: ${r.margen_bruto}%</div>
      </div>
      <div class="kpi kpi-rojo">
        <div class="kpi-label">Cartera pendiente</div>
        <div class="kpi-valor">${formatCOP(r.cartera_pendiente)}</div>
        <div class="kpi-sub"><a href="#" onclick="navigate('cartera');return false">Ver detalle →</a></div>
      </div>
    </div>

    <div class="dash-grid">
      <section class="card">
        <h2>Stock actual</h2>
        <table class="tabla-compacta">
          <thead><tr><th>Producto</th><th>Stock</th><th>Precio compra</th><th>Precio venta</th></tr></thead>
          <tbody>
            ${d.stock.map(p => `
              <tr>
                <td>${p.nombre}</td>
                <td>${parseFloat(p.stock_actual).toFixed(2)} ${p.unidad_medida}</td>
                <td>${formatCOP(p.precio_compra)}</td>
                <td>${formatCOP(p.precio_venta)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>

      <section class="card">
        <h2>Saldos por destino</h2>
        ${d.saldos_destino.length === 0 ? '<p class="empty">Sin movimientos</p>' :
          d.saldos_destino.map(s => `
            <div class="saldo-row">
              ${badge('destino', s.destino_dinero)}
              <span class="saldo-monto">${formatCOP(s.total)}</span>
            </div>`).join('')}
      </section>

      <section class="card span-full">
        <div class="card-header">
          <h2>Últimas ventas</h2>
          <button class="btn-sm btn-primario" onclick="navigate('nueva-venta')">+ Nueva venta</button>
        </div>
        <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado pago</th><th>Estado pedido</th><th></th></tr></thead>
          <tbody>
            ${d.ultimas_ventas.map(v => `
              <tr>
                <td>#${v.id}</td>
                <td>${v.cliente}</td>
                <td>${v.fecha}</td>
                <td>${formatCOP(v.total)}</td>
                <td>${badge('estado_pago', v.estado_pago)}</td>
                <td>${badge('estado_pedido', v.estado_pedido)}</td>
                <td><button class="btn-sm btn-secundario" onclick="navigate('ventas')">Ver</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        </div>
      </section>
    </div>`;
  } catch (e) {
    el.innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════
// VENTAS - Listado
// ═══════════════════════════════════════════════════════
async function renderVentas(el) {
  el.innerHTML = `
  <div class="page-header">
    <h1>Ventas</h1>
    <button class="btn-primario" onclick="navigate('nueva-venta')">+ Nueva venta</button>
  </div>
  <div class="filtros-barra">
    <select id="f-estado-pago" onchange="filtrarVentas()">
      <option value="">Todos los estados</option>
      <option value="pagado">Pagado</option>
      <option value="abono">Con abono</option>
      <option value="pendiente">Pendiente</option>
      <option value="fiado">Fiado</option>
    </select>
    <select id="f-estado-pedido" onchange="filtrarVentas()">
      <option value="">Todos los pedidos</option>
      <option value="nuevo">Nuevo</option>
      <option value="en_preparacion">En preparación</option>
      <option value="entregado">Entregado</option>
      <option value="cancelado">Cancelado</option>
    </select>
    <input type="date" id="f-desde" value="${primerDiaMes()}" onchange="filtrarVentas()">
    <input type="date" id="f-hasta" value="${hoy()}" onchange="filtrarVentas()">
  </div>
  <div id="ventas-tabla" class="tabla-scroll"></div>
  <div class="modal-overlay" id="modal-venta">
    <div class="modal modal-grande">
      <button class="modal-close" onclick="closeModal('modal-venta')">✕</button>
      <div id="modal-venta-body"></div>
    </div>
  </div>`;

  // ── Listar ventas ──────────────────────────────────────
  window.filtrarVentas = async () => {
    const params = {
      estado_pago:   document.getElementById('f-estado-pago').value,
      estado_pedido: document.getElementById('f-estado-pedido').value,
      fecha_desde:   document.getElementById('f-desde').value,
      fecha_hasta:   document.getElementById('f-hasta').value,
    };
    try {
      const ventas = await API.ventas.listar(params);
      const cont = document.getElementById('ventas-tabla');
      if (!ventas.length) { cont.innerHTML = '<p class="empty">Sin ventas en este período</p>'; return; }
      cont.innerHTML = `<table class="tabla">
        <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Pago</th><th>Pedido</th><th>Acciones</th></tr></thead>
        <tbody>
          ${ventas.map(v => `
            <tr class="${v.estado_pedido === 'cancelado' ? 'fila-cancelada' : ''}">
              <td>#${v.id}</td>
              <td>${v.cliente}</td>
              <td>${v.fecha}</td>
              <td>${formatCOP(v.total)}</td>
              <td class="verde">${formatCOP(v.total_pagado)}</td>
              <td class="${v.saldo_pendiente > 0 ? 'rojo' : ''}">${formatCOP(v.saldo_pendiente)}</td>
              <td>${badge('estado_pago', v.estado_pago)}</td>
              <td>${badge('estado_pedido', v.estado_pedido)}</td>
              <td class="acciones">
                <button class="btn-sm btn-secundario" onclick="verVenta(${v.id})">Ver</button>
                <button class="btn-sm btn-primario"   onclick="editarVenta(${v.id})">Editar</button>
                ${v.saldo_pendiente > 0 ? `<button class="btn-sm btn-verde" onclick="abonarVenta(${v.id})">Abonar</button>` : ''}
                ${v.estado_pedido !== 'cancelado' ? `<button class="btn-sm btn-rojo" onclick="eliminarVenta(${v.id},${v.total_pagado > 0})">
                  ${v.total_pagado > 0 ? 'Cancelar' : 'Eliminar'}
                </button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Ver detalle ────────────────────────────────────────
  window.verVenta = async (id) => {
    try {
      const v = await API.ventas.detalle(id);
      document.getElementById('modal-venta-body').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
          <h2 style="margin:0">Venta #${v.id} — ${v.cliente_nombre}</h2>
          <div style="display:flex;gap:.5rem">
            <button class="btn-sm btn-primario" onclick="closeModal('modal-venta');editarVenta(${v.id})">✏ Editar</button>
            ${v.estado_pedido !== 'cancelado' ? `<button class="btn-sm btn-rojo" onclick="closeModal('modal-venta');eliminarVenta(${v.id},${v.total_pagado > 0})">
              ${v.total_pagado > 0 ? 'Cancelar' : 'Eliminar'}
            </button>` : ''}
          </div>
        </div>
        <p class="meta">📅 ${v.fecha_fmt} | 📞 ${v.cliente_tel || '—'} | ${badge('estado_pedido', v.estado_pedido)}</p>
        <h3>Productos</h3>
        <table class="tabla-compacta">
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
          <tbody>${v.items.map(i => `<tr>
            <td>${i.producto}</td>
            <td>${parseFloat(i.cantidad).toFixed(3)} ${i.unidad_medida}</td>
            <td>${formatCOP(i.precio_unitario)}</td>
            <td>${formatCOP(i.subtotal)}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><th colspan="3">Total</th><th>${formatCOP(v.total)}</th></tr></tfoot>
        </table>
        <h3 style="margin-top:1rem">Pagos</h3>
        ${v.pagos.length === 0 ? '<p class="empty">Sin pagos registrados</p>' :
          `<table class="tabla-compacta">
            <thead><tr><th>Fecha</th><th>Monto</th><th>Medio</th><th>Destino</th><th>Ref.</th></tr></thead>
            <tbody>${v.pagos.map(p => `<tr>
              <td>${new Date(p.fecha_pago).toLocaleString('es-CO')}</td>
              <td>${formatCOP(p.monto)}</td>
              <td>${badge('medio_pago', p.medio_pago)}</td>
              <td>${badge('destino', p.destino_dinero)}</td>
              <td>${p.referencia || '—'}</td>
            </tr>`).join('')}</tbody>
            <tfoot><tr><th>Total pagado</th><th colspan="4" class="verde">${formatCOP(v.total_pagado)}</th></tr></tfoot>
          </table>`}
        <div class="resumen-pago" style="margin-top:.75rem">
          <span>Saldo: <strong class="${v.saldo_pendiente > 0 ? 'rojo' : 'verde'}">${formatCOP(v.saldo_pendiente)}</strong></span>
          ${badge('estado_pago', v.estado_pago)}
        </div>
        ${v.saldo_pendiente > 0 ? `<button class="btn-primario" style="margin-top:.75rem" onclick="closeModal('modal-venta');abonarVenta(${v.id})">Registrar abono / pago</button>` : ''}`;
      openModal('modal-venta');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Editar venta ───────────────────────────────────────
  window.editarVenta = async (id) => {
    try {
      const [v, productos, clientes] = await Promise.all([
        API.ventas.detalle(id), API.productos.listar(), API.clientes.listar()
      ]);

      document.getElementById('modal-venta-body').innerHTML = `
        <h2>Editar Venta #${v.id}</h2>
        <div class="form-grid" style="margin-bottom:1rem">
          <label>Cliente
            <select id="ev-cliente">
              <option value="">— Sin cliente —</option>
              ${clientes.map(c => `<option value="${c.id}" ${c.id == v.cliente_id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
            </select>
          </label>
          <label>Estado del pedido
            <select id="ev-estado">
              <option value="nuevo"          ${v.estado_pedido==='nuevo'          ?'selected':''}>Nuevo</option>
              <option value="en_preparacion" ${v.estado_pedido==='en_preparacion' ?'selected':''}>En preparación</option>
              <option value="entregado"      ${v.estado_pedido==='entregado'      ?'selected':''}>Entregado</option>
              <option value="cancelado"      ${v.estado_pedido==='cancelado'      ?'selected':''}>Cancelado</option>
            </select>
          </label>
          <label>Fecha de entrega
            <input type="date" id="ev-entrega" value="${v.fecha_entrega || ''}">
          </label>
          <label class="span-full">Observaciones
            <textarea id="ev-obs" rows="2">${v.observaciones || ''}</textarea>
          </label>
        </div>

        <h3>Productos</h3>
        <div class="item-row-header" style="grid-template-columns:2fr 90px 110px 100px 32px">
          <span>Producto</span><span>Cantidad</span><span>Precio venta</span><span>Subtotal</span><span></span>
        </div>
        <div id="ev-items">
          ${v.items.map((it, idx) => `
          <div class="item-row" id="evi-${idx}" style="grid-template-columns:2fr 90px 110px 100px 32px">
            <select class="ev-prod" onchange="onEVIProd(${idx},this)">
              <option value="">— Producto —</option>
              ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_venta}" ${p.id==it.producto_id?'selected':''}>${p.nombre}</option>`).join('')}
            </select>
            <input type="number" class="ev-cant"   value="${it.cantidad}"        min="0.001" step="0.01" oninput="onEVICant(${idx})">
            <input type="number" class="ev-precio" value="${it.precio_unitario}" min="0"     step="500"  oninput="onEVICant(${idx})">
            <span class="item-subtotal">${formatCOP(it.cantidad * it.precio_unitario)}</span>
            <button class="btn-icon-rojo" onclick="document.getElementById('evi-${idx}').remove();evRecalc()">🗑</button>
          </div>`).join('')}
        </div>
        <button class="btn-sm btn-secundario" style="margin:.5rem 0" onclick="evAgregarItem()">+ Agregar producto</button>

        <div class="totales-resumen" style="margin-top:.75rem">
          Total: <strong id="ev-total">${formatCOP(v.total)}</strong>
        </div>
        <div style="display:flex;gap:.75rem;margin-top:1rem">
          <button class="btn-primario" style="flex:1" id="btn-ev-guardar" onclick="guardarEdicionVenta(${v.id})">✓ Guardar cambios</button>
          <button class="btn-secundario" onclick="closeModal('modal-venta')">Cancelar</button>
        </div>`;

      var evCI = v.items.length;

      window.evRecalc = () => {
        var total = [...document.querySelectorAll('#ev-items .item-subtotal')]
          .reduce((s, e) => s + parseCOP(e.textContent), 0);
        document.getElementById('ev-total').textContent = formatCOP(total);
      };

      window.onEVIProd = (idx, sel) => {
        var opt = sel.options[sel.selectedIndex];
        document.getElementById('evi-'+idx).querySelector('.ev-precio').value = opt.dataset.precio || '';
        onEVICant(idx);
      };

      window.onEVICant = (idx) => {
        var row  = document.getElementById('evi-'+idx);
        var cant = parseFloat(row.querySelector('.ev-cant').value)   || 0;
        var prec = parseFloat(row.querySelector('.ev-precio').value) || 0;
        row.querySelector('.item-subtotal').textContent = formatCOP(cant * prec);
        evRecalc();
      };

      window.evAgregarItem = () => {
        var idx = evCI++;
        var div = document.createElement('div');
        div.className = 'item-row'; div.id = 'evi-'+idx;
        div.style.gridTemplateColumns = '2fr 90px 110px 100px 32px';
        div.innerHTML = `
          <select class="ev-prod" onchange="onEVIProd(${idx},this)">
            <option value="">— Producto —</option>
            ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_venta}">${p.nombre}</option>`).join('')}
          </select>
          <input type="number" class="ev-cant"   min="0.001" step="0.01" placeholder="Cant." oninput="onEVICant(${idx})">
          <input type="number" class="ev-precio" min="0"     step="500"  placeholder="$ venta" oninput="onEVICant(${idx})">
          <span class="item-subtotal">$0</span>
          <button class="btn-icon-rojo" onclick="document.getElementById('evi-${idx}').remove();evRecalc()">🗑</button>`;
        document.getElementById('ev-items').appendChild(div);
      };

      window.guardarEdicionVenta = async (id) => {
        var itemEls = [...document.querySelectorAll('#ev-items .item-row')];
        var items = itemEls.map(row => ({
          producto_id:     parseInt(row.querySelector('.ev-prod').value),
          cantidad:        parseFloat(row.querySelector('.ev-cant').value)   || 0,
          precio_unitario: parseFloat(row.querySelector('.ev-precio').value) || 0,
        })).filter(i => i.producto_id && i.cantidad > 0);

        if (!items.length) { toast('Agrega al menos un producto', 'error'); return; }

        var btn = document.getElementById('btn-ev-guardar');
        btnLoading(btn, true);
        try {
          await API.ventas.actualizar(id, {
            cliente_id:    parseInt(document.getElementById('ev-cliente').value) || null,
            estado_pedido: document.getElementById('ev-estado').value,
            fecha_entrega: document.getElementById('ev-entrega').value || null,
            observaciones: document.getElementById('ev-obs').value,
            items,
          });
          toast('Venta actualizada', 'ok');
          closeModal('modal-venta');
          filtrarVentas();
        } catch (e) { toast(e.message, 'error'); btnLoading(btn, false); }
      };

      openModal('modal-venta');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Eliminar / Cancelar venta ──────────────────────────
  window.eliminarVenta = async (id, tienePagos) => {
    var msg = tienePagos
      ? '⚠️ Esta venta tiene pagos registrados.\nSe marcará como CANCELADA (los pagos se conservan).\n¿Confirmar?'
      : '¿Eliminar esta venta? Se revertirá el stock descontado.\nEsta acción no se puede deshacer.';
    if (!await confirmar(msg)) return;
    try {
      var r = await API.ventas.eliminar(id);
      toast(r.accion === 'cancelada' ? 'Venta cancelada' : 'Venta eliminada y stock revertido', 'ok');
      filtrarVentas();
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Abonar ─────────────────────────────────────────────
  window.abonarVenta = async (ventaId) => {
    const v = await API.ventas.detalle(ventaId);
    document.getElementById('modal-venta-body').innerHTML = `
      <h2>Registrar pago — Venta #${ventaId}</h2>
      <p>Saldo pendiente: <strong class="rojo">${formatCOP(v.saldo_pendiente)}</strong></p>
      <div class="form-grid">
        <label>Monto *
          <input type="number" id="ab-monto" min="1" max="${v.saldo_pendiente}" value="${v.saldo_pendiente}" step="100">
        </label>
        <label>Medio de pago *
          <select id="ab-medio">
            <option value="efectivo">💵 Efectivo</option>
            <option value="transferencia">📲 Transferencia</option>
          </select>
        </label>
        <label>Destino del dinero *
          <select id="ab-destino">
            <option value="efectivo_caja">💵 Caja (efectivo)</option>
            <option value="billetera_nequi">📱 Nequi</option>
            <option value="billetera_daviplata">📱 Daviplata</option>
            <option value="billetera_bancolombia">📱 Bancolombia App</option>
            <option value="banco">🏦 Banco</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label>Referencia / Comprobante
          <input type="text" id="ab-ref" placeholder="Ej: TRX-123456">
        </label>
        <label>¿Pago fiado? Fecha límite
          <input type="date" id="ab-vence">
        </label>
        <label>Notas
          <input type="text" id="ab-notas">
        </label>
      </div>
      <button class="btn-primario" id="btn-abonar" onclick="guardarAbono(${ventaId})">Guardar pago</button>`;
    openModal('modal-venta');
  };

  window.guardarAbono = async (ventaId) => {
    const btn = document.getElementById('btn-abonar');
    btnLoading(btn, true);
    try {
      await API.pagos.registrar({
        venta_id:         ventaId,
        monto:            parseFloat(document.getElementById('ab-monto').value),
        medio_pago:       document.getElementById('ab-medio').value,
        destino_dinero:   document.getElementById('ab-destino').value,
        referencia:       document.getElementById('ab-ref').value,
        fecha_vencimiento:document.getElementById('ab-vence').value || null,
        notas:            document.getElementById('ab-notas').value,
      });
      toast('Pago registrado exitosamente', 'ok');
      closeModal('modal-venta');
      filtrarVentas();
    } catch (e) { toast(e.message, 'error'); }
    finally { btnLoading(btn, false); }
  };

  filtrarVentas();
}

// ═══════════════════════════════════════════════════════
// NUEVA VENTA
// ═══════════════════════════════════════════════════════
async function renderNuevaVenta(el) {
  const [productos, clientes, tiposGasto] = await Promise.all([API.productos.listar(), API.clientes.listar(), API.tiposGasto()]);
  const gastosReparto = tiposGasto.filter(t => t.categoria === 'transporte' && t.nombre.includes('reparto'));

  el.innerHTML = `
  <div class="page-header"><h1>Nueva Venta</h1></div>
  <div class="form-doble">
    <section class="card">
      <h2>1. Cliente</h2>
      <div class="form-grid">
        <label>Buscar cliente
          <div class="input-accion">
            <input type="text" id="buscar-cliente" placeholder="Nombre o teléfono…" oninput="buscarCliente()">
            <button class="btn-sm btn-secundario" onclick="openModal('modal-nuevo-cliente')">+ Nuevo</button>
          </div>
          <ul id="lista-clientes" class="autocomplete-list hidden"></ul>
        </label>
        <div id="cliente-seleccionado" class="cliente-chip hidden"></div>
      </div>
    </section>

    <section class="card">
      <h2>2. Productos</h2>
      <div id="items-venta" class="items-lista"></div>
      <button class="btn-sm btn-secundario" onclick="agregarItemVenta()">+ Agregar producto</button>
    </section>

    <section class="card">
      <h2>3. Costo de reparto (opcional)</h2>
      <div id="gastos-reparto-lista" class="items-lista"></div>
      <button class="btn-sm btn-secundario" onclick="agregarGastoReparto()">+ Agregar gasto de reparto</button>
    </section>

    <section class="card">
      <h2>4. Pago inicial</h2>
      <div class="form-grid">
        <label>Monto del pago inicial (0 = fiado / pendiente)
          <input type="number" id="pago-monto" min="0" step="1000" value="0">
        </label>
        <label>Medio de pago
          <select id="pago-medio">
            <option value="efectivo">💵 Efectivo</option>
            <option value="transferencia">📲 Transferencia</option>
          </select>
        </label>
        <label>Destino del dinero
          <select id="pago-destino">
            <option value="efectivo_caja">💵 Caja (efectivo)</option>
            <option value="billetera_nequi">📱 Nequi</option>
            <option value="billetera_daviplata">📱 Daviplata</option>
            <option value="billetera_bancolombia">📱 Bancolombia App</option>
            <option value="banco">🏦 Banco</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label>Referencia / Comprobante
          <input type="text" id="pago-ref" placeholder="Número de transacción">
        </label>
        <label>Si es fiado — fecha acordada de pago
          <input type="date" id="pago-vence">
        </label>
      </div>
    </section>

    <section class="card span-full">
      <div class="totales-resumen" id="totales-resumen">
        <span>Total: <strong id="total-venta">$0</strong></span>
      </div>
      <div class="form-grid">
        <label>Fecha de entrega
          <input type="date" id="fecha-entrega" value="${hoy()}">
        </label>
        <label>Observaciones
          <textarea id="observaciones" rows="2"></textarea>
        </label>
      </div>
      <button class="btn-primario btn-grande" id="btn-guardar-venta" onclick="guardarVenta()">✓ Registrar venta</button>
    </section>
  </div>

  <!-- Modal nuevo cliente -->
  <div class="modal-overlay" id="modal-nuevo-cliente">
    <div class="modal">
      <button class="modal-close" onclick="closeModal('modal-nuevo-cliente')">✕</button>
      <h2>Nuevo cliente</h2>
      <div class="form-grid">
        <label>Nombre * <input type="text" id="nc-nombre"></label>
        <label>Teléfono <input type="tel" id="nc-tel"></label>
        <label>Dirección <input type="text" id="nc-dir"></label>
        <label>Notas <input type="text" id="nc-notas"></label>
      </div>
      <button class="btn-primario" onclick="crearCliente()">Guardar cliente</button>
    </div>
  </div>`;

  // Estado local de la venta
  const estado = { clienteId: null, items: [], gastosReparto: [] };

  // ── Búsqueda de clientes ──
  let timeoutCliente;
  window.buscarCliente = async () => {
    clearTimeout(timeoutCliente);
    timeoutCliente = setTimeout(async () => {
      const q = document.getElementById('buscar-cliente').value.trim();
      if (!q) return;
      const lista = await API.clientes.listar(q);
      const ul    = document.getElementById('lista-clientes');
      ul.innerHTML = lista.map(c => `<li onclick="seleccionarCliente(${c.id},'${c.nombre}','${c.telefono||''}')">
        <strong>${c.nombre}</strong> ${c.telefono ? `· ${c.telefono}` : ''}
      </li>`).join('');
      ul.classList.toggle('hidden', lista.length === 0);
    }, 300);
  };

  window.seleccionarCliente = (id, nombre, tel) => {
    estado.clienteId = id;
    document.getElementById('lista-clientes').classList.add('hidden');
    document.getElementById('buscar-cliente').value = '';
    const chip = document.getElementById('cliente-seleccionado');
    chip.innerHTML = `<span class="chip-nombre">${nombre}</span>${tel ? `<span class="chip-tel">${tel}</span>` : ''}<button onclick="quitarCliente()">✕</button>`;
    chip.classList.remove('hidden');
  };

  window.quitarCliente = () => {
    estado.clienteId = null;
    document.getElementById('cliente-seleccionado').classList.add('hidden');
  };

  window.crearCliente = async () => {
    const nombre = document.getElementById('nc-nombre').value.trim();
    if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }
    const r = await API.clientes.crear({ nombre, telefono: document.getElementById('nc-tel').value, direccion: document.getElementById('nc-dir').value, notas: document.getElementById('nc-notas').value });
    seleccionarCliente(r.id, nombre, document.getElementById('nc-tel').value);
    closeModal('modal-nuevo-cliente');
    toast('Cliente creado', 'ok');
  };

  // ── Agregar items ──
  let itemIdx = 0;
  window.agregarItemVenta = () => {
    const idx = itemIdx++;
    estado.items.push({ idx, producto_id: null, cantidad: 0, precio_unitario: 0 });
    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = `item-${idx}`;
    div.innerHTML = `
      <select class="item-producto" onchange="onItemProducto(${idx},this)">
        <option value="">— Producto —</option>
        ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_venta}" data-unidad="${p.unidad_medida}">${p.nombre} (${formatCOP(p.precio_venta)}/${p.unidad_medida})</option>`).join('')}
      </select>
      <input type="number" class="item-cantidad" min="0.001" step="0.1" placeholder="Cantidad" oninput="onItemCantidad(${idx},this)">
      <input type="number" class="item-precio" min="0" step="500" placeholder="Precio unit." oninput="onItemPrecio(${idx},this)">
      <span class="item-subtotal" id="sub-${idx}">$0</span>
      <button class="btn-icon-rojo" onclick="quitarItem(${idx})">🗑</button>`;
    document.getElementById('items-venta').appendChild(div);
  };

  window.onItemProducto = (idx, sel) => {
    const opt = sel.options[sel.selectedIndex];
    const i   = estado.items.find(x => x.idx === idx);
    i.producto_id = parseInt(sel.value);
    i.precio_unitario = parseFloat(opt.dataset.precio);
    sel.closest('.item-row').querySelector('.item-precio').value = i.precio_unitario;
    recalcularItem(idx);
  };

  window.onItemCantidad = (idx, inp) => {
    estado.items.find(x => x.idx === idx).cantidad = parseFloat(inp.value) || 0;
    recalcularItem(idx);
  };

  window.onItemPrecio = (idx, inp) => {
    estado.items.find(x => x.idx === idx).precio_unitario = parseFloat(inp.value) || 0;
    recalcularItem(idx);
  };

  function recalcularItem(idx) {
    const i = estado.items.find(x => x.idx === idx);
    document.getElementById(`sub-${idx}`).textContent = formatCOP(i.cantidad * i.precio_unitario);
    actualizarTotal();
  }

  window.quitarItem = (idx) => {
    estado.items = estado.items.filter(x => x.idx !== idx);
    document.getElementById(`item-${idx}`)?.remove();
    actualizarTotal();
  };

  function actualizarTotal() {
    const total = estado.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
    document.getElementById('total-venta').textContent = formatCOP(total);
  }

  // ── Gastos de reparto ──
  let grIdx = 0;
  window.agregarGastoReparto = () => {
    const idx = grIdx++;
    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = `gr-${idx}`;
    div.innerHTML = `
      <select class="gr-tipo">
        ${tiposGasto.filter(t => t.categoria === 'transporte').map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
      </select>
      <input type="number" class="gr-monto" min="0" step="1000" placeholder="Monto">
      <input type="text"   class="gr-desc"  placeholder="Descripción">
      <button class="btn-icon-rojo" onclick="document.getElementById('gr-${idx}').remove()">🗑</button>`;
    document.getElementById('gastos-reparto-lista').appendChild(div);
  };

  // ── Guardar venta ──
  window.guardarVenta = async () => {
    const items = estado.items.filter(i => i.producto_id && i.cantidad > 0 && i.precio_unitario > 0);
    if (!items.length) { toast('Agrega al menos un producto válido', 'error'); return; }

    const btn = document.getElementById('btn-guardar-venta');
    btnLoading(btn, true);

    // Recoger gastos reparto
    const gastosRows = [...document.querySelectorAll('#gastos-reparto-lista .item-row')];
    const gastosReparto = gastosRows.map(row => ({
      tipo_gasto_id: parseInt(row.querySelector('.gr-tipo').value),
      monto:         parseFloat(row.querySelector('.gr-monto').value) || 0,
      descripcion:   row.querySelector('.gr-desc').value,
    })).filter(g => g.monto > 0);

    const pagoMonto = parseFloat(document.getElementById('pago-monto').value) || 0;
    const body = {
      cliente_id:    estado.clienteId,
      fecha_entrega: document.getElementById('fecha-entrega').value,
      observaciones: document.getElementById('observaciones').value,
      estado_pedido: 'nuevo',
      items:         items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
      gastos_reparto: gastosReparto,
      pago_inicial:  pagoMonto > 0 ? {
        monto:            pagoMonto,
        medio_pago:       document.getElementById('pago-medio').value,
        destino_dinero:   document.getElementById('pago-destino').value,
        referencia:       document.getElementById('pago-ref').value,
        fecha_vencimiento:document.getElementById('pago-vence').value || null,
      } : null,
    };

    try {
      const r = await API.ventas.crear(body);
      toast(`Venta #${r.id} registrada exitosamente`, 'ok');
      navigate('ventas');
    } catch (e) {
      toast(e.message, 'error');
      btnLoading(btn, false);
    }
  };

  agregarItemVenta(); // Agregar primer ítem por defecto
}

// ═══════════════════════════════════════════════════════
// COMPRAS
// ═══════════════════════════════════════════════════════
async function renderCompras(el) {
  el.innerHTML = `
  <div class="page-header">
    <h1>Compras</h1>
    <button class="btn-primario" onclick="navigate('nueva-compra')">+ Registrar compra</button>
  </div>
  <div id="compras-tabla" class="tabla-scroll"></div>
  <div class="modal-overlay" id="modal-compra">
    <div class="modal modal-grande">
      <button class="modal-close" onclick="closeModal('modal-compra')">✕</button>
      <div id="modal-compra-body"></div>
    </div>
  </div>`;

  var cargarCompras = async () => {
    try {
      var compras = await API.compras.listar();
      var tbl = document.getElementById('compras-tabla');
      if (!compras.length) { tbl.innerHTML = '<p class="empty">Sin compras registradas</p>'; return; }
      tbl.innerHTML = `<table class="tabla">
        <thead><tr><th>#</th><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Gastos op.</th><th>Total inversión</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${compras.map(c => `<tr>
            <td>#${c.id}</td>
            <td>${c.fecha}</td>
            <td>${c.proveedor || '—'}</td>
            <td>${formatCOP(c.total_productos)}</td>
            <td>${formatCOP(c.total_gastos)}</td>
            <td><strong>${formatCOP(c.total_inversion)}</strong></td>
            <td>
              <select class="estado-select" onchange="cambiarEstadoCompra(${c.id}, this.value)"
                style="border-color:${c.estado==='recibida'?'#22a05e':c.estado==='parcial'?'#c25b00':'#94a3b8'}">
                <option value="pendiente" ${c.estado==='pendiente'?'selected':''}>⏳ Pendiente</option>
                <option value="parcial"   ${c.estado==='parcial'  ?'selected':''}>📦 Parcial</option>
                <option value="recibida"  ${c.estado==='recibida' ?'selected':''}>✅ Recibida</option>
              </select>
            </td>
            <td class="acciones">
              <button class="btn-sm btn-secundario" onclick="verCompra(${c.id})">Ver</button>
              <button class="btn-sm btn-primario"   onclick="editarCompra(${c.id})">Editar</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    } catch (e) { toast(e.message, 'error'); }
  };

  window.cambiarEstadoCompra = async (id, estado) => {
    try {
      await API.compras.cambiarEstado(id, estado);
      toast('Estado actualizado', 'ok');
    } catch (e) { toast(e.message, 'error'); cargarCompras(); }
  };

  window.verCompra = async (id) => {
    try {
      var c = await API.compras.detalle(id);
      document.getElementById('modal-compra-body').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h2 style="margin:0">Compra #${c.id} — ${c.fecha_fmt}</h2>
          <button class="btn-sm btn-primario" onclick="closeModal('modal-compra');editarCompra(${c.id})">✏ Editar</button>
        </div>
        <p style="margin-bottom:1rem;color:var(--gris-600)">Proveedor: <strong>${c.proveedor || '—'}</strong></p>
        <h3>Productos comprados</h3>
        <table class="tabla-compacta">
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Kilos/Stock</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
          <tbody>${c.items.map(i => `<tr>
            <td>${i.producto}</td>
            <td>${parseFloat(i.cantidad).toFixed(2)} ${i.unidad_medida}</td>
            <td>${i.kilos_estimados ? parseFloat(i.kilos_estimados).toFixed(2)+' kg' : '—'}</td>
            <td>${formatCOP(i.precio_unitario)}</td>
            <td>${formatCOP(i.subtotal)}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><th colspan="4">Total productos</th><th>${formatCOP(c.total_productos)}</th></tr></tfoot>
        </table>
        <h3 style="margin-top:1rem">Gastos operativos</h3>
        ${c.gastos.length === 0 ? '<p class="empty">Sin gastos registrados</p>' :
          `<table class="tabla-compacta">
            <thead><tr><th>Tipo</th><th>Categoría</th><th>Monto</th><th>Descripción</th></tr></thead>
            <tbody>${c.gastos.map(g => `<tr><td>${g.tipo}</td><td>${g.categoria}</td><td>${formatCOP(g.monto)}</td><td>${g.descripcion||'—'}</td></tr>`).join('')}</tbody>
            <tfoot><tr><th colspan="2">Total gastos</th><th colspan="2">${formatCOP(c.total_gastos)}</th></tr></tfoot>
          </table>`}
        <div class="totales-resumen" style="margin-top:1rem">
          <span>Total inversión: <strong>${formatCOP(c.total_inversion)}</strong></span>
        </div>`;
      openModal('modal-compra');
    } catch (e) { toast(e.message, 'error'); }
  };

  window.editarCompra = async (id) => {
    try {
      var [c, productos, proveedores, tiposGasto] = await Promise.all([
        API.compras.detalle(id), API.productos.listar(),
        API.proveedores.listar(), API.tiposGasto()
      ]);

      document.getElementById('modal-compra-body').innerHTML = `
        <h2>Editar Compra #${c.id}</h2>
        <div class="form-grid" style="margin-bottom:1rem">
          <label>Fecha compra
            <input type="date" id="ec-fecha" value="${c.fecha_compra || ''}">
          </label>
          <label>Fecha llegada
            <input type="date" id="ec-llegada" value="${c.fecha_llegada || ''}">
          </label>
          <label>Proveedor
            <select id="ec-prov">
              <option value="">— Sin proveedor —</option>
              ${proveedores.map(p => `<option value="${p.id}" ${p.id==c.proveedor_id?'selected':''}>${p.nombre}</option>`).join('')}
            </select>
          </label>
          <label>Estado
            <select id="ec-estado">
              <option value="pendiente" ${c.estado==='pendiente'?'selected':''}>⏳ Pendiente</option>
              <option value="parcial"   ${c.estado==='parcial'  ?'selected':''}>📦 Parcial</option>
              <option value="recibida"  ${c.estado==='recibida' ?'selected':''}>✅ Recibida</option>
            </select>
          </label>
          <label class="span-full">Observaciones
            <textarea id="ec-obs" rows="2">${c.observaciones||''}</textarea>
          </label>
        </div>

        <h3>Productos</h3>
        <div class="item-row-header compra-header">
          <span>Producto</span><span>Cantidad</span><span>Precio compra</span><span>Kilos estimados</span><span>Subtotal</span><span></span>
        </div>
        <div id="ec-items">
          ${c.items.map((it, idx) => `
          <div class="item-row compra-row" id="eci-${idx}">
            <select class="ci-prod" onchange="onECIProd(${idx},this)">
              <option value="">— Producto —</option>
              ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_compra}" data-unidad="${p.unidad_medida}" ${p.id==it.producto_id?'selected':''}>${p.nombre}</option>`).join('')}
            </select>
            <input type="number" class="ci-cant"   value="${it.cantidad}"         min="0.001" step="0.01" oninput="onECICant(${idx})">
            <input type="number" class="ci-precio" value="${it.precio_unitario}"  min="0"     step="100"  oninput="onECICant(${idx})">
            <div>
              <input type="number" class="ci-kilos" value="${it.kilos_estimados||''}" min="0" step="0.1" placeholder="kg (solo pescado)">
              <div class="kilos-nota">↑ Define el stock en kg</div>
            </div>
            <span class="ci-subtotal">${formatCOP(it.cantidad * it.precio_unitario)}</span>
            <button class="btn-icon-rojo" onclick="document.getElementById('eci-${idx}').remove();ecRecalc()">🗑</button>
          </div>`).join('')}
        </div>
        <button class="btn-sm btn-secundario" style="margin:.5rem 0" onclick="ecAgregarItem()">+ Agregar producto</button>

        <h3 style="margin-top:1rem">Gastos operativos</h3>
        <div id="ec-gastos">
          ${c.gastos.map((g, idx) => `
          <div class="item-row" id="ecg-${idx}" style="grid-template-columns:2fr 1fr 1fr 32px">
            <select class="cg-tipo">
              ${tiposGasto.map(t => `<option value="${t.id}" ${t.id==g.tipo_gasto_id?'selected':''}>${t.nombre}</option>`).join('')}
            </select>
            <input type="number" class="cg-monto" value="${g.monto}" min="0" step="1000" oninput="ecRecalc()">
            <input type="text"   class="cg-desc"  value="${g.descripcion||''}" placeholder="Descripción">
            <button class="btn-icon-rojo" onclick="document.getElementById('ecg-${idx}').remove();ecRecalc()">🗑</button>
          </div>`).join('')}
        </div>
        <button class="btn-sm btn-secundario" style="margin:.5rem 0" onclick="ecAgregarGasto()">+ Agregar gasto</button>

        <div class="totales-resumen" style="margin-top:.75rem">
          Productos: <strong id="ec-tp">$0</strong> | Gastos: <strong id="ec-tg">$0</strong> | Total: <strong id="ec-ti">$0</strong>
        </div>
        <div style="display:flex;gap:.75rem;margin-top:1rem">
          <button class="btn-primario" style="flex:1" id="btn-ec-guardar" onclick="guardarEdicionCompra(${c.id})">✓ Guardar cambios</button>
          <button class="btn-secundario" onclick="closeModal('modal-compra')">Cancelar</button>
        </div>`;

      // contadores para nuevas filas
      var ecCI = c.items.length;
      var ecCG = c.gastos.length;

      window.ecRecalc = () => {
        var tp = [...document.querySelectorAll('#ec-items .ci-subtotal')].reduce((s,e) => s + parseCOP(e.textContent), 0);
        var tg = [...document.querySelectorAll('#ec-gastos .cg-monto')].reduce((s,e) => s + (parseFloat(e.value)||0), 0);
        document.getElementById('ec-tp').textContent = formatCOP(tp);
        document.getElementById('ec-tg').textContent = formatCOP(tg);
        document.getElementById('ec-ti').textContent = formatCOP(tp+tg);
      };

      window.onECIProd = (idx, sel) => {
        var opt = sel.options[sel.selectedIndex];
        document.getElementById('eci-'+idx).querySelector('.ci-precio').value = opt.dataset.precio || '';
        onECICant(idx);
      };
      window.onECICant = (idx) => {
        var row = document.getElementById('eci-'+idx);
        var cant = parseFloat(row.querySelector('.ci-cant').value)   || 0;
        var prec = parseFloat(row.querySelector('.ci-precio').value) || 0;
        row.querySelector('.ci-subtotal').textContent = formatCOP(cant * prec);
        ecRecalc();
      };

      window.ecAgregarItem = () => {
        var idx = ecCI++;
        var div = document.createElement('div');
        div.className = 'item-row compra-row'; div.id = 'eci-'+idx;
        div.innerHTML = `
          <select class="ci-prod" onchange="onECIProd(${idx},this)">
            <option value="">— Producto —</option>
            ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_compra}">${p.nombre}</option>`).join('')}
          </select>
          <input type="number" class="ci-cant"   min="0.001" step="0.01" placeholder="Cant." oninput="onECICant(${idx})">
          <input type="number" class="ci-precio" min="0"     step="100"  placeholder="Precio" oninput="onECICant(${idx})">
          <div>
            <input type="number" class="ci-kilos" min="0" step="0.1" placeholder="kg (solo pescado)">
            <div class="kilos-nota">↑ Define el stock en kg</div>
          </div>
          <span class="ci-subtotal">$0</span>
          <button class="btn-icon-rojo" onclick="document.getElementById('eci-${idx}').remove();ecRecalc()">🗑</button>`;
        document.getElementById('ec-items').appendChild(div);
      };

      window.ecAgregarGasto = () => {
        var idx = ecCG++;
        var div = document.createElement('div');
        div.className = 'item-row'; div.id = 'ecg-'+idx;
        div.style.gridTemplateColumns = '2fr 1fr 1fr 32px';
        div.innerHTML = `
          <select class="cg-tipo">${tiposGasto.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}</select>
          <input type="number" class="cg-monto" min="0" step="1000" placeholder="Monto" oninput="ecRecalc()">
          <input type="text"   class="cg-desc"  placeholder="Descripción">
          <button class="btn-icon-rojo" onclick="document.getElementById('ecg-${idx}').remove();ecRecalc()">🗑</button>`;
        document.getElementById('ec-gastos').appendChild(div);
      };

      window.guardarEdicionCompra = async (id) => {
        var itemEls = [...document.querySelectorAll('#ec-items .item-row')];
        var items = itemEls.map(row => ({
          producto_id:     parseInt(row.querySelector('.ci-prod').value),
          cantidad:        parseFloat(row.querySelector('.ci-cant').value)   || 0,
          precio_unitario: parseFloat(row.querySelector('.ci-precio').value) || 0,
          kilos_estimados: parseFloat(row.querySelector('.ci-kilos').value)  || null,
        })).filter(i => i.producto_id && i.cantidad > 0);

        var gastoEls = [...document.querySelectorAll('#ec-gastos .item-row')];
        var gastos = gastoEls.map(row => ({
          tipo_gasto_id: parseInt(row.querySelector('.cg-tipo').value),
          monto:         parseFloat(row.querySelector('.cg-monto').value) || 0,
          descripcion:   row.querySelector('.cg-desc').value,
          fecha:         hoy(),
        })).filter(g => g.monto > 0);

        var btn = document.getElementById('btn-ec-guardar');
        btnLoading(btn, true);
        try {
          await API.compras.actualizar(id, {
            estado:        document.getElementById('ec-estado').value,
            proveedor_id:  parseInt(document.getElementById('ec-prov').value) || null,
            fecha_llegada: document.getElementById('ec-llegada').value || null,
            observaciones: document.getElementById('ec-obs').value,
            items, gastos,
          });
          toast('Compra actualizada correctamente', 'ok');
          closeModal('modal-compra');
          cargarCompras();
        } catch (e) { toast(e.message, 'error'); btnLoading(btn, false); }
      };

      ecRecalc();
      openModal('modal-compra');
    } catch(e) { toast(e.message, 'error'); }
  };

  cargarCompras();
}

// ═══════════════════════════════════════════════════════
// NUEVA COMPRA
// ═══════════════════════════════════════════════════════
async function renderNuevaCompra(el) {
  const [productos, proveedores, tiposGasto] = await Promise.all([API.productos.listar(), API.proveedores.listar(), API.tiposGasto()]);

  el.innerHTML = `
  <div class="page-header"><h1>Registrar Compra</h1></div>
  <div class="form-doble">
    <section class="card">
      <h2>Información general</h2>
      <div class="form-grid">
        <label>Fecha de compra *
          <input type="date" id="c-fecha" value="${hoy()}">
        </label>
        <label>Fecha de llegada estimada
          <input type="date" id="c-llegada">
        </label>
        <label>Proveedor
          <div class="input-accion">
            <select id="c-proveedor">
              <option value="">— Sin proveedor —</option>
              ${proveedores.map(p => `<option value="${p.id}">${p.nombre} (${p.ciudad||''})</option>`).join('')}
            </select>
            <button class="btn-sm btn-secundario" onclick="openModal('modal-prov')">+ Nuevo</button>
          </div>
        </label>
        <label>Observaciones <textarea id="c-obs" rows="2"></textarea></label>
      </div>
    </section>

    <section class="card">
      <h2>Productos comprados</h2>
      <div id="c-items"></div>
      <button class="btn-sm btn-secundario" onclick="agregarItemCompra()">+ Agregar producto</button>
    </section>

    <section class="card">
      <h2>Gastos operativos</h2>
      <p class="hint">Incluye: flete desde origen, costo de recogida, cuarto frío, etc.</p>
      <div id="c-gastos"></div>
      <button class="btn-sm btn-secundario" onclick="agregarGastoCompra()">+ Agregar gasto</button>
    </section>

    <section class="card span-full">
      <div class="totales-resumen">
        Productos: <strong id="c-total-prod">$0</strong> |
        Gastos: <strong id="c-total-gastos">$0</strong> |
        Total inversión: <strong id="c-total-inv">$0</strong>
      </div>
      <button class="btn-primario btn-grande" id="btn-guardar-compra" onclick="guardarCompra()">✓ Registrar compra</button>
    </section>
  </div>

  <!-- Modal proveedor rápido -->
  <div class="modal-overlay" id="modal-prov">
    <div class="modal">
      <button class="modal-close" onclick="closeModal('modal-prov')">✕</button>
      <h2>Nuevo proveedor</h2>
      <div class="form-grid">
        <label>Nombre * <input type="text" id="pv-nombre"></label>
        <label>Ciudad <input type="text" id="pv-ciudad"></label>
        <label>Teléfono <input type="tel" id="pv-tel"></label>
      </div>
      <button class="btn-primario" onclick="crearProveedor()">Guardar</button>
    </div>
  </div>`;

  let ci = 0, cg = 0;

  const recalcTC = () => {
    const tp = [...document.querySelectorAll('#c-items .ci-subtotal')].reduce((s,e) => s + parseCOP(e.textContent.replace(/\./g,'')), 0);
    const tg = [...document.querySelectorAll('#c-gastos .cg-monto')].reduce((s,e) => s + (parseFloat(e.value)||0), 0);
    document.getElementById('c-total-prod').textContent   = formatCOP(tp);
    document.getElementById('c-total-gastos').textContent = formatCOP(tg);
    document.getElementById('c-total-inv').textContent    = formatCOP(tp + tg);
  };

  window.agregarItemCompra = () => {
    const idx = ci++;
    // Encabezado de columnas solo la primera vez
    if (idx === 0) {
      const hdr = document.createElement('div');
      hdr.className = 'item-row-header compra-header';
      hdr.innerHTML = '<span>Producto</span><span>Cantidad</span><span>Precio compra</span><span>Kilos est.</span><span>Subtotal</span><span></span>';
      const cont = document.getElementById('c-items');
      cont.insertBefore(hdr, cont.firstChild);
    }
    const div = document.createElement('div');
    div.className = 'item-row compra-row'; div.id = `ci-${idx}`;
    div.innerHTML = `
      <select class="ci-prod" onchange="onCIProd(${idx},this)">
        <option value="">— Producto —</option>
        ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_compra}" data-unidad="${p.unidad_medida}">${p.nombre}</option>`).join('')}
      </select>
      <input type="number" class="ci-cant"   min="0.001" step="0.01" placeholder="Cant." oninput="onCICant(${idx})">
      <input type="number" class="ci-precio" min="0"     step="100"  placeholder="$ compra" oninput="onCICant(${idx})">
      <div>
        <input type="number" class="ci-kilos" min="0" step="0.1" placeholder="kg">
        <div class="kilos-nota">↑ Solo para pescado</div>
      </div>
      <span class="ci-subtotal">$0</span>
      <button class="btn-icon-rojo" onclick="document.getElementById('ci-${idx}').remove();recalcTC()">🗑</button>`;
    document.getElementById('c-items').appendChild(div);
  };

  window.onCIProd = (idx, sel) => {
    const opt = sel.options[sel.selectedIndex];
    const row = document.getElementById(`ci-${idx}`);
    row.querySelector('.ci-precio').value = opt.dataset.precio || '';
    onCICant(idx);
  };

  window.onCICant = (idx) => {
    const row  = document.getElementById(`ci-${idx}`);
    const cant = parseFloat(row.querySelector('.ci-cant').value)   || 0;
    const prec = parseFloat(row.querySelector('.ci-precio').value) || 0;
    row.querySelector('.ci-subtotal').textContent = formatCOP(cant * prec);
    recalcTC();
  };

  window.agregarGastoCompra = () => {
    const idx = cg++;
    const div = document.createElement('div');
    div.className = 'item-row'; div.id = `cg-${idx}`;
    div.innerHTML = `
      <select class="cg-tipo">
        ${tiposGasto.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
      </select>
      <input type="number" class="cg-monto" min="0" step="1000" placeholder="Monto" oninput="recalcTC()">
      <input type="text"   class="cg-desc"  placeholder="Descripción">
      <input type="date"   class="cg-fecha" value="${hoy()}">
      <button class="btn-icon-rojo" onclick="document.getElementById('cg-${idx}').remove();recalcTC()">🗑</button>`;
    document.getElementById('c-gastos').appendChild(div);
  };

  window.crearProveedor = async () => {
    const nombre = document.getElementById('pv-nombre').value.trim();
    if (!nombre) { toast('Nombre obligatorio','error'); return; }
    const r = await API.proveedores.crear({ nombre, ciudad: document.getElementById('pv-ciudad').value, telefono: document.getElementById('pv-tel').value });
    const sel = document.getElementById('c-proveedor');
    sel.innerHTML += `<option value="${r.id}" selected>${nombre}</option>`;
    sel.value = r.id;
    closeModal('modal-prov');
    toast('Proveedor creado','ok');
  };

  window.guardarCompra = async () => {
    const itemRows = [...document.querySelectorAll('#c-items .item-row')];
    const items = itemRows.map(row => ({
      producto_id:     parseInt(row.querySelector('.ci-prod').value),
      cantidad:        parseFloat(row.querySelector('.ci-cant').value)   || 0,
      precio_unitario: parseFloat(row.querySelector('.ci-precio').value) || 0,
      kilos_estimados: parseFloat(row.querySelector('.ci-kilos').value)  || null,
    })).filter(i => i.producto_id && i.cantidad > 0);

    if (!items.length) { toast('Agrega al menos un producto','error'); return; }

    const gastoRows = [...document.querySelectorAll('#c-gastos .item-row')];
    const gastos = gastoRows.map(row => ({
      tipo_gasto_id: parseInt(row.querySelector('.cg-tipo').value),
      monto:         parseFloat(row.querySelector('.cg-monto').value) || 0,
      descripcion:   row.querySelector('.cg-desc').value,
      fecha:         row.querySelector('.cg-fecha').value || hoy(),
    })).filter(g => g.monto > 0);

    const btn = document.getElementById('btn-guardar-compra');
    btnLoading(btn, true);
    try {
      const r = await API.compras.crear({
        proveedor_id:  parseInt(document.getElementById('c-proveedor').value) || null,
        fecha_compra:  document.getElementById('c-fecha').value,
        fecha_llegada: document.getElementById('c-llegada').value || null,
        observaciones: document.getElementById('c-obs').value,
        estado:        'pendiente',
        items, gastos,
      });
      toast(`Compra #${r.id} registrada`, 'ok');
      navigate('compras');
    } catch (e) { toast(e.message,'error'); btnLoading(btn,false); }
  };

  window.recalcTC = recalcTC;
  agregarItemCompra();
}

// ═══════════════════════════════════════════════════════
// CARTERA
// ═══════════════════════════════════════════════════════
async function renderCartera(el) {
  el.innerHTML = `<div class="page-header"><h1>Cartera — Cuentas por cobrar</h1></div><div id="cartera-body" class="loading-spinner"><span></span></div>`;
  try {
    const d = await API.cartera();
    const { cartera, vencidas } = d;
    let html = '';

    if (vencidas.length) {
      html += `<section class="card alerta-roja">
        <h2>⚠️ Deudas vencidas (${vencidas.length})</h2>
        <table class="tabla">
          <thead><tr><th>Venta</th><th>Cliente</th><th>Vencimiento</th><th>Días vencida</th><th>Saldo</th><th></th></tr></thead>
          <tbody>${vencidas.map(v => `<tr>
            <td>#${v.venta_id}</td><td>${v.cliente}</td>
            <td>${fechaHumana(v.fecha_vencimiento)}</td>
            <td class="rojo">${v.dias_vencido} días</td>
            <td class="rojo">${formatCOP(v.saldo_pendiente)}</td>
            <td><button class="btn-sm btn-verde" onclick="abonarVenta(${v.venta_id})">Cobrar</button></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>`;
    }

    if (cartera.length) {
      html += `<section class="card">
        <h2>Clientes con saldo pendiente</h2>
        <table class="tabla">
          <thead><tr><th>Cliente</th><th>Teléfono</th><th>Pedidos</th><th>Total ventas</th><th>Total pagado</th><th>Saldo</th><th></th></tr></thead>
          <tbody>${cartera.map(c => `<tr>
            <td>${c.nombre}</td><td>${c.telefono||'—'}</td>
            <td>${c.pedidos_pendientes}</td>
            <td>${formatCOP(c.total_ventas)}</td>
            <td class="verde">${formatCOP(c.total_pagado)}</td>
            <td class="rojo"><strong>${formatCOP(c.saldo_total)}</strong></td>
            <td><button class="btn-sm btn-secundario" onclick="navigate('ventas')">Ver ventas</button></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>`;
    } else {
      html += '<p class="empty grande">🎉 ¡Sin cartera pendiente! Todo al día.</p>';
    }

    document.getElementById('cartera-body').outerHTML = html;
  } catch (e) { toast(e.message,'error'); }
}

// ═══════════════════════════════════════════════════════
// CAJA / FLUJO DE DINERO
// ═══════════════════════════════════════════════════════
async function renderCaja(el) {
  el.innerHTML = `
  <div class="page-header"><h1>Caja y flujo de dinero</h1></div>
  <div class="filtros-barra">
    <input type="date" id="cj-desde" value="${primerDiaMes()}">
    <input type="date" id="cj-hasta" value="${hoy()}">
    <button class="btn-primario" onclick="cargarCaja()">Consultar</button>
  </div>
  <div id="caja-body"></div>`;

  window.cargarCaja = async () => {
    const desde = document.getElementById('cj-desde').value;
    const hasta = document.getElementById('cj-hasta').value;
    const d     = await API.caja(desde, hasta);

    const html = `
    <div class="kpi-grid">
      <div class="kpi kpi-verde">
        <div class="kpi-label">Ingresos cobrados</div>
        <div class="kpi-valor">${formatCOP(d.flujo.ingresos)}</div>
      </div>
      <div class="kpi kpi-naranja">
        <div class="kpi-label">Inversiones (compras)</div>
        <div class="kpi-valor">${formatCOP(d.flujo.inversiones)}</div>
      </div>
      <div class="kpi kpi-esmeralda">
        <div class="kpi-label">Balance período</div>
        <div class="kpi-valor">${formatCOP(d.flujo.ingresos - d.flujo.inversiones)}</div>
      </div>
    </div>
    <div class="dash-grid">
      <section class="card">
        <h2>Saldos por destino (histórico)</h2>
        ${d.saldos.map(s => `
          <div class="saldo-row">
            ${badge('destino', s.destino_dinero)}
            <span class="saldo-monto">${formatCOP(s.total)}</span>
            <small>${s.transacciones} transacciones</small>
          </div>`).join('')}
      </section>
      <section class="card">
        <h2>Movimientos del período</h2>
        <table class="tabla-compacta">
          <thead><tr><th>Fecha</th><th>Medio</th><th>Destino</th><th>Transacciones</th><th>Total</th></tr></thead>
          <tbody>
            ${d.movimientos.map(m => `<tr>
              <td>${fechaHumana(m.fecha)}</td>
              <td>${badge('medio_pago', m.medio_pago)}</td>
              <td>${badge('destino', m.destino_dinero)}</td>
              <td>${m.num_pagos}</td>
              <td class="verde">${formatCOP(m.total)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </section>
    </div>`;
    document.getElementById('caja-body').innerHTML = html;
  };

  cargarCaja();
}

// ═══════════════════════════════════════════════════════
// CLIENTES - Listado
// ═══════════════════════════════════════════════════════
async function renderClientes(el) {
  el.innerHTML = `
  <div class="page-header"><h1>Clientes</h1>
    <button class="btn-primario" onclick="openModal('modal-cl')">+ Nuevo cliente</button>
  </div>
  <input type="text" id="busq-cl" placeholder="Buscar por nombre o teléfono…" class="busqueda" oninput="busqClientes()">
  <div id="cl-tabla" class="tabla-scroll"></div>
  <div class="modal-overlay" id="modal-cl">
    <div class="modal">
      <button class="modal-close" onclick="closeModal('modal-cl')">✕</button>
      <h2>Nuevo cliente</h2>
      <div class="form-grid">
        <label>Nombre * <input type="text" id="cl-nombre"></label>
        <label>Teléfono <input type="tel" id="cl-tel"></label>
        <label>Dirección <input type="text" id="cl-dir"></label>
        <label>Notas <input type="text" id="cl-notas"></label>
      </div>
      <button class="btn-primario" id="btn-crear-cl" onclick="crearClienteGL()">Guardar</button>
    </div>
  </div>`;

  const cargarClientes = async (q = '') => {
    const cls = await API.clientes.listar(q);
    const tbl = document.getElementById('cl-tabla');
    if (!cls.length) { tbl.innerHTML = '<p class="empty">Sin clientes registrados</p>'; return; }
    tbl.innerHTML = `<table class="tabla">
      <thead><tr><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Notas</th></tr></thead>
      <tbody>${cls.map(c => `<tr>
        <td>${c.nombre}</td><td>${c.telefono||'—'}</td>
        <td>${c.direccion||'—'}</td><td>${c.notas||'—'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  };

  window.busqClientes = () => cargarClientes(document.getElementById('busq-cl').value);
  window.crearClienteGL = async () => {
    const nombre = document.getElementById('cl-nombre').value.trim();
    if (!nombre) { toast('Nombre obligatorio','error'); return; }
    await API.clientes.crear({ nombre, telefono: document.getElementById('cl-tel').value, direccion: document.getElementById('cl-dir').value, notas: document.getElementById('cl-notas').value });
    toast('Cliente creado','ok');
    closeModal('modal-cl');
    cargarClientes();
  };

  cargarClientes();
}

// ═══════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════
async function renderProductos(el) {
  const productos = await API.productos.listar();

  // ── Calcular margen según tipo de producto ───────────
  // Para kilo/unidad: margen = (venta - compra) / venta
  // Para canasta (pescado): necesitamos saber cuántos kg rinde la canasta
  //   costo_por_kg = precio_compra_canasta / kilos_por_canasta
  //   margen = (precio_venta_kg - costo_por_kg) / precio_venta_kg
  function calcularMargen(p) {
    if (p.unidad_medida === 'canasta') {
      var kpc = parseFloat(p.kilos_por_canasta);
      if (!kpc || kpc <= 0) return { valor: null, txt: '— (configura kg/canasta)', cls: 'naranja' };
      var costoKg = parseFloat(p.precio_compra) / kpc;
      var pv      = parseFloat(p.precio_venta);
      var m       = ((pv - costoKg) / pv * 100);
      return { valor: m, txt: m.toFixed(1) + '%', cls: m > 30 ? 'verde' : m > 0 ? 'naranja' : 'rojo' };
    } else {
      var pc = parseFloat(p.precio_compra);
      var pv = parseFloat(p.precio_venta);
      if (!pv) return { valor: 0, txt: '0%', cls: 'naranja' };
      var m = ((pv - pc) / pv * 100);
      return { valor: m, txt: m.toFixed(1) + '%', cls: m > 30 ? 'verde' : m > 0 ? 'naranja' : 'rojo' };
    }
  }

  function stockLabel(p) {
    // Para pescado mostramos en kg (kilos reales), no canastas
    var s = parseFloat(p.stock_actual);
    if (p.unidad_medida === 'canasta') {
      return s.toFixed(2) + ' kg';
    }
    return s.toFixed(2) + ' kg';
  }

  function costoKgLabel(p) {
    if (p.unidad_medida === 'canasta') {
      var kpc = parseFloat(p.kilos_por_canasta);
      if (!kpc) return '—';
      return formatCOP(parseFloat(p.precio_compra) / kpc) + '/kg';
    }
    return formatCOP(p.precio_compra) + '/kg';
  }

  el.innerHTML = `
  <div class="page-header"><h1>Productos y precios</h1></div>
  <div class="card" style="margin-bottom:1rem;background:var(--gris-50);border:1px dashed var(--gris-200)">
    <p style="font-size:.82rem;color:var(--gris-600);margin:0">
      💡 <strong>Pescado:</strong> el margen se calcula como
      <code>(precio venta/kg − costo/kg)</code> donde <em>costo/kg = precio canasta ÷ kg por canasta</em>.
      Configura los <strong>kg por canasta</strong> en "Editar precio" para que el margen sea real.
    </p>
  </div>
  <div class="tabla-scroll">
  <table class="tabla">
    <thead><tr>
      <th>Producto</th><th>Unidad compra</th>
      <th>Precio compra</th><th>Costo real/kg</th>
      <th>Precio venta/kg</th><th>Stock (kg)</th>
      <th>Margen real</th><th></th>
    </tr></thead>
    <tbody>
      ${productos.map(p => {
        var mg = calcularMargen(p);
        return `<tr>
          <td><strong>${p.nombre}</strong><br><small style="color:var(--gris-400)">${p.categoria}</small></td>
          <td>${p.unidad_medida === 'canasta'
            ? 'Media canasta' + (p.kilos_por_canasta ? '<br><small style="color:var(--gris-400)">'+parseFloat(p.kilos_por_canasta).toFixed(1)+' kg/canasta</small>' : '<br><small class="naranja">⚠ sin kg/canasta</small>')
            : p.unidad_medida}</td>
          <td>${formatCOP(p.precio_compra)}<br><small style="color:var(--gris-400)">${p.unidad_medida==='canasta'?'por media canasta':'por kg'}</small></td>
          <td><strong>${costoKgLabel(p)}</strong></td>
          <td>${formatCOP(p.precio_venta)}/kg</td>
          <td>${stockLabel(p)}</td>
          <td class="${mg.cls}"><strong>${mg.txt}</strong></td>
          <td><button class="btn-sm btn-secundario"
            onclick="editarPrecio(${p.id},'${p.nombre.replace(/'/g,"\'")}',${p.precio_compra},${p.precio_venta},${p.kilos_por_canasta||'null'},'${p.unidad_medida}')">
            Editar
          </button></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  </div>
  <div class="modal-overlay" id="modal-precio">
    <div class="modal">
      <button class="modal-close" onclick="closeModal('modal-precio')">✕</button>
      <div id="modal-precio-body"></div>
    </div>
  </div>`;

  window.editarPrecio = (id, nombre, pc, pv, kpc, unidad) => {
    var esPescado = unidad === 'canasta';
    document.getElementById('modal-precio-body').innerHTML = `
      <h2>Actualizar precios — ${nombre}</h2>
      <div class="form-grid">
        <label>${esPescado ? 'Precio compra (por media canasta)' : 'Precio de compra (por kg)'} *
          <input type="number" id="ep-compra" value="${pc}" min="0" step="100">
        </label>
        <label>Precio de venta (por kg) *
          <input type="number" id="ep-venta" value="${pv}" min="0" step="100" oninput="epRecalc()">
        </label>
        ${esPescado ? `
        <label>Kilos por media canasta *
          <input type="number" id="ep-kpc" value="${kpc !== null ? kpc : ''}" min="0.1" step="0.5" placeholder="Ej: 15" oninput="epRecalc()">
          <small style="color:var(--gris-400)">¿Cuántos kg rinde una media canasta?</small>
        </label>` : ''}
        <label>Motivo del cambio
          <input type="text" id="ep-motivo" placeholder="Ej: Alza del proveedor">
        </label>
      </div>
      ${esPescado ? `
      <div class="totales-resumen" id="ep-preview" style="margin-top:.5rem">
        <span>Costo/kg: <strong id="ep-costo-kg">—</strong></span>
        <span>Margen estimado: <strong id="ep-margen">—</strong></span>
      </div>` : ''}
      <button class="btn-primario" style="margin-top:1rem" onclick="guardarPrecio(${id},'${unidad}')">Guardar</button>`;

    if (esPescado) {
      window.epRecalc = () => {
        var kpcV = parseFloat(document.getElementById('ep-kpc')?.value) || 0;
        var pcV  = parseFloat(document.getElementById('ep-compra').value) || 0;
        var pvV  = parseFloat(document.getElementById('ep-venta').value)  || 0;
        if (kpcV > 0 && pcV > 0) {
          var ckgV = pcV / kpcV;
          var mV   = pvV > 0 ? ((pvV - ckgV) / pvV * 100).toFixed(1) : '—';
          document.getElementById('ep-costo-kg').textContent = formatCOP(ckgV) + '/kg';
          document.getElementById('ep-margen').textContent   = mV + '%';
          document.getElementById('ep-margen').className     = parseFloat(mV) > 0 ? 'verde' : 'rojo';
        }
      };
      epRecalc();
    }
    openModal('modal-precio');
  };

  window.guardarPrecio = async (id, unidad) => {
    var kpcInput = document.getElementById('ep-kpc');
    try {
      await API.productos.actualizarPrecio(id, {
        precio_compra:    parseFloat(document.getElementById('ep-compra').value),
        precio_venta:     parseFloat(document.getElementById('ep-venta').value),
        kilos_por_canasta: kpcInput ? (parseFloat(kpcInput.value) || null) : null,
        motivo:           document.getElementById('ep-motivo').value,
      });
      toast('Precio actualizado', 'ok');
      closeModal('modal-precio');
      renderProductos(el);
    } catch (e) { toast(e.message, 'error'); }
  };
}

// ─── Helpers ─────────────────────────────────────────
function mesActual() {
  return new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}
function primerDiaMes() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0];
}
window.navigate = navigate;
