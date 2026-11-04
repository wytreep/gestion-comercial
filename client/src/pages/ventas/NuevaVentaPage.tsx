import { lazy, Suspense, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ventasApi, productosApi, clientesApi } from '../../api/endpoints';
import { NumberInput } from '../../components/ui';
import { formatCOP, today, OPCIONES_MEDIO_PAGO, OPCIONES_DESTINO, num, parseMoneyInput, parseDecimalInput } from '../../utils/format';
import type { Producto, Cliente } from '../../types';
import { ArrowLeft, Check, Plus, QrCode, Search, X } from 'lucide-react';

const QrScannerModal = lazy(() => import('../../components/scanner/QrScannerModal'));

interface L { productoId: number; nombre: string; cantidad: number; precio: number; }

export default function NuevaVentaPage() {
  const navigate = useNavigate();
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: productosApi.listar });
  const [busqueda, setBusqueda] = useState('');
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes', busqueda], queryFn: () => clientesApi.listar(busqueda), enabled: busqueda.length >= 1 });
  const [cliente, setCliente]       = useState<Cliente | null>(null);
  const [clienteLibre, setClienteLibre] = useState('');
  const [showCli, setShowCli]       = useState(false);
  const cliBoxRef                   = useRef<HTMLDivElement>(null);
  const [lineas, setLineas]         = useState<L[]>([]);
  const [pagoInicial, setPagoInicial] = useState(0);
  const [error, setError]           = useState('');
  const [scanOk, setScanOk]         = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const { register, watch }         = useForm({ defaultValues: { fecha_entrega: today(), observaciones: '', medio_pago: 'efectivo', destino_dinero: 'efectivo_caja', referencia: '', fecha_vencimiento: '' } });
  const fv = watch();
  const total = lineas.reduce((s,l) => s + l.cantidad*l.precio, 0);
  const saldo = Math.max(0, total - pagoInicial);
  const nombreCliente = cliente?.nombre ?? (clienteLibre || busqueda.trim()) ?? '';

  const addLinea = (p: Producto) => setLineas(prev => prev.find(l => l.productoId===p.id) ? prev : [...prev, { productoId:p.id, nombre:p.nombre, cantidad:1, precio:num(p.precio_venta) }]);

  const addLineaEscaneada = (p: Producto) => setLineas(prev => {
    const existe = prev.find(l => l.productoId === p.id);
    if (existe) {
      return prev.map(l => l.productoId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l);
    }
    return [...prev, { productoId: p.id, nombre: p.nombre, cantidad: 1, precio: num(p.precio_venta) }];
  });

  const buscarPorCodigo = async (codigo: string) => {
    try {
      const p = await productosApi.porCodigo(codigo);
      addLineaEscaneada(p);
      setScanOk(`${p.nombre} agregado al pedido`);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e.message ?? 'Producto no encontrado.' };
    }
  };

  const guardar = async () => {
    setError('');
    const items = lineas.filter(l => l.cantidad>0 && l.precio>0);
    if (!items.length) { setError('Agrega al menos un producto'); return; }
    setSaving(true);
    try {
      // Si no se eligió un cliente registrado, el nombre escrito se envía
      // como cliente_nombre: el backend lo crea y la venta queda asociada.
      const nombreLibre = !cliente ? (clienteLibre || busqueda).trim() : '';
      await ventasApi.crear({
        cliente_id:     cliente?.id ?? null,
        cliente_nombre: nombreLibre || null,
        fecha_entrega: fv.fecha_entrega  || null,
        observaciones: fv.observaciones  || null,
        estado_pedido: 'nuevo',
        items: items.map(l => ({ producto_id: l.productoId, cantidad: l.cantidad, precio_unitario: l.precio })),
        pago_inicial: pagoInicial > 0 ? {
          monto:             pagoInicial,
          medio_pago:        fv.medio_pago,
          destino_dinero:    fv.destino_dinero,
          referencia:        fv.referencia        || null,
          fecha_vencimiento: fv.fecha_vencimiento || null,
        } : null,
      });
      navigate('/ventas');
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva venta</h1>
          <p className="page-subtitle">Pedido, cliente, pago inicial y productos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setScanOk(''); setScannerOpen(true); }}
            className="btn-secondary"
          >
            <QrCode size={14} /> Escanear QR
          </button>
          <button onClick={() => navigate('/ventas')} className="btn-secondary">
            <ArrowLeft size={14} /> Volver a ventas
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger/25 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      {scanOk && (
        <div className="flex items-center justify-between rounded border border-success/25 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-success">
          <span className="flex items-center gap-1.5"><Check size={14} /> {scanOk}</span>
          <button onClick={() => setScanOk('')} className="rounded-sm p-1 text-success/70 hover:bg-white hover:text-success" title="Cerrar aviso" aria-label="Cerrar aviso de escaneo">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* ── Columna principal ─────────────────────── */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <p className="card-title">1. Cliente</p>
              {cliente ? (
                <div className="flex items-center justify-between rounded border border-primary/20 bg-primary-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{cliente.nombre}</p>
                    {cliente.telefono && <p className="text-[11px] text-slate-500">{cliente.telefono}</p>}
                  </div>
                  <button onClick={() => setCliente(null)} className="rounded-sm p-1 text-slate-400 hover:bg-white hover:text-slate-700" title="Quitar cliente" aria-label="Quitar cliente">
                    <X size={15} />
                  </button>
                </div>
              ) : clienteLibre ? (
                <div className="flex items-center justify-between rounded border border-warning/25 bg-amber-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{clienteLibre}</p>
                    <p className="text-[11px] font-medium text-warning">Cliente no registrado</p>
                  </div>
                  <button onClick={() => setClienteLibre('')} className="rounded-sm p-1 text-slate-400 hover:bg-white hover:text-slate-700" title="Quitar cliente" aria-label="Quitar cliente">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={cliBoxRef}>
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono…"
                    className="input pl-8"
                    aria-label="Buscar cliente por nombre o teléfono"
                    autoComplete="off"
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setShowCli(true); }}
                    onFocus={() => setShowCli(true)}
                    onBlur={(e) => {
                      if (cliBoxRef.current?.contains(e.relatedTarget as Node)) return;
                      setTimeout(() => setShowCli(false), 150);
                    }}
                  />
                  {showCli && (clientes.length > 0 || busqueda.trim().length >= 2) && (
                    <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-line bg-white shadow-dropdown" aria-label="Sugerencias de cliente">
                      {clientes.map(c => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-slate-50 focus:bg-slate-50"
                            onClick={() => { setCliente(c); setBusqueda(''); setShowCli(false); }}
                          >
                            <p className="font-medium text-slate-800">{c.nombre}</p>
                            {c.telefono && <p className="text-[11px] text-slate-500">{c.telefono}</p>}
                          </button>
                        </li>
                      ))}
                      {busqueda.trim().length >= 2 && (
                        <li className="border-t border-line">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-amber-50 focus:bg-amber-50"
                            onClick={() => { setClienteLibre(busqueda.trim()); setBusqueda(''); setShowCli(false); }}
                          >
                            <p className="flex items-center gap-1.5 font-medium text-warning">
                              <Plus size={13} aria-hidden="true" /> Usar «{busqueda.trim()}»
                            </p>
                            <p className="text-[11px] text-slate-500">Se registrará como cliente nuevo</p>
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                  {busqueda.trim().length >= 2 && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Si no seleccionas un cliente, se usará «{busqueda.trim()}» como cliente no registrado.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="field">
                  <label htmlFor="venta-fecha-entrega" className="label">Fecha de entrega</label>
                  <input id="venta-fecha-entrega" type="date" className="input" {...register('fecha_entrega')} />
                </div>
                <div className="field">
                  <label htmlFor="venta-observaciones" className="label">Observaciones</label>
                  <input id="venta-observaciones" type="text" className="input" placeholder="Opcional" {...register('observaciones')} />
                </div>
              </div>
            </div>

            <div className="card">
              <p className="card-title">2. Pago inicial</p>
              <div className="field">
                <label htmlFor="venta-pago-inicial" className="label">Monto abonado (0 = fiado)</label>
                <NumberInput
                  id="venta-pago-inicial"
                  className="input"
                  placeholder="Ej: 55.000"
                  value={pagoInicial}
                  parse={parseMoneyInput}
                  onChange={setPagoInicial}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="field">
                  <label htmlFor="venta-medio" className="label">Medio</label>
                  <select id="venta-medio" className="input" {...register('medio_pago')}>
                    {OPCIONES_MEDIO_PAGO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="venta-destino" className="label">Destino</label>
                  <select id="venta-destino" className="input" {...register('destino_dinero')}>
                    {OPCIONES_DESTINO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="venta-referencia" className="label">Referencia</label>
                  <input id="venta-referencia" type="text" className="input" placeholder="Opcional" {...register('referencia')} />
                </div>
                <div className="field">
                  <label htmlFor="venta-vencimiento" className="label">Fecha límite si es fiado</label>
                  <input id="venta-vencimiento" type="date" className="input" {...register('fecha_vencimiento')} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="card-title mb-0">3. Productos</p>
              <span className="text-[11px] text-slate-500">{lineas.length} producto(s) en el pedido</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {productos.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addLinea(p)}
                  className="group flex items-center justify-between gap-2 rounded border border-line bg-white px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium text-slate-800">{p.nombre}</span>
                    <span className="block text-[11px] text-slate-500">{formatCOP(p.precio_venta)} / kg</span>
                  </span>
                  <Plus size={14} className="shrink-0 text-slate-400 transition-colors group-hover:text-primary" />
                </button>
              ))}
            </div>

            {lineas.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="w-[130px]">Cantidad</th>
                      <th className="w-[170px]">Precio unitario</th>
                      <th className="w-[150px] text-right">Subtotal</th>
                      <th className="w-[46px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, idx) => (
                      <tr key={idx}>
                        <td className="font-medium text-slate-800">{l.nombre}</td>
                        <td>
                          <NumberInput
                            inputMode="decimal"
                            className="input w-24"
                            placeholder="Ej: 1.5"
                            value={l.cantidad}
                            parse={parseDecimalInput}
                            onChange={v => setLineas(prev => prev.map((x,i) => i===idx ? { ...x, cantidad: v } : x))}
                          />
                        </td>
                        <td>
                          <NumberInput
                            inputMode="numeric"
                            className="input w-32"
                            placeholder="Ej: 30000"
                            value={l.precio}
                            parse={parseMoneyInput}
                            onChange={v => setLineas(prev => prev.map((x,i) => i===idx ? { ...x, precio: v } : x))}
                          />
                        </td>
                        <td className="text-right font-mono font-semibold tabular-nums text-slate-900">{formatCOP(l.cantidad*l.precio)}</td>
                        <td>
                          <button
                            onClick={() => setLineas(prev => prev.filter((_,i) => i!==idx))}
                            className="rounded-sm p-1 text-slate-400 hover:bg-red-50 hover:text-danger"
                            title="Quitar producto"
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total del pedido</td>
                      <td className="text-right font-mono text-[15px] font-bold tabular-nums text-slate-900">{formatCOP(total)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded border border-dashed border-line bg-slate-50/60 py-8 text-center">
                <p className="text-[12.5px] font-medium text-slate-500">Selecciona un producto para agregarlo al pedido</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Puedes ajustar cantidad y precio en la tabla</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Resumen lateral ───────────────────────── */}
        <aside className="card space-y-3 xl:sticky xl:top-3">
          <p className="card-title mb-0">Resumen del pedido</p>

          <div className="rounded border border-line bg-slate-50/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cliente</p>
            <p className="truncate text-[12.5px] font-medium text-slate-800">{nombreCliente || 'Sin asignar'}</p>
          </div>

          <dl className="space-y-2 text-[12.5px]">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Líneas</dt>
              <dd className="font-mono tabular-nums text-slate-800">{lineas.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Unidades</dt>
              <dd className="font-mono tabular-nums text-slate-800">
                {lineas.reduce((s,l) => s + (l.cantidad || 0), 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <dt className="font-medium text-slate-600">Total</dt>
              <dd className="font-mono text-[15px] font-bold tabular-nums text-slate-900">{formatCOP(total)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Abono inicial</dt>
              <dd className="font-mono tabular-nums text-slate-800">{formatCOP(pagoInicial)}</dd>
            </div>
          </dl>

          <div className={saldo > 0 ? 'rounded border border-warning/25 bg-amber-50 px-3 py-2' : 'rounded border border-success/25 bg-emerald-50 px-3 py-2'}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Saldo pendiente</p>
            <p className={saldo > 0 ? 'font-mono text-[18px] font-bold tabular-nums text-warning' : 'font-mono text-[18px] font-bold tabular-nums text-success'}>
              {formatCOP(saldo)}
            </p>
            <p className="text-[11px] text-slate-500">{saldo > 0 ? 'Queda registrado en cartera' : 'Pedido pagado en su totalidad'}</p>
          </div>

          <button onClick={guardar} disabled={saving || lineas.length === 0} className="btn-primary btn-lg">
            <Check size={15} /> {saving ? 'Registrando…' : 'Registrar venta'}
          </button>
          <p className="text-[10.5px] leading-relaxed text-slate-500">
            Si no abonas el total, el saldo pendiente queda en Cartera y se puede cobrar después.
          </p>
        </aside>
      </div>

      {scannerOpen && (
        <Suspense fallback={null}>
          <QrScannerModal
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onCode={buscarPorCodigo}
          />
        </Suspense>
      )}
    </div>
  );
}
