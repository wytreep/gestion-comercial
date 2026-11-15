import { lazy, Suspense, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ventasApi, productosApi, clientesApi } from '../../api/endpoints';
import { Alert, NumberInput } from '../../components/ui';
import { formatCOP, formatCantidad, today, OPCIONES_MEDIO_PAGO, OPCIONES_DESTINO, num, parseMoneyInput, parseDecimalInput, plural } from '../../utils/format';
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

  const addLineaEscaneada = (p: Producto) => {
    // Una etiqueta de canasta o de lote aporta su peso real en kg.
    const peso = p.etiqueta?.peso_kg && p.etiqueta.peso_kg > 0 ? p.etiqueta.peso_kg : null;
    const cantidad = peso ?? 1;

    setLineas(prev => {
      const existe = prev.find(l => l.productoId === p.id);
      if (existe) {
        return prev.map(l => l.productoId === p.id ? { ...l, cantidad: l.cantidad + cantidad } : l);
      }
      return [...prev, { productoId: p.id, nombre: p.nombre, cantidad, precio: num(p.precio_venta) }];
    });
  };

  const buscarPorCodigo = async (codigo: string) => {
    try {
      const p = await productosApi.porCodigo(codigo);
      addLineaEscaneada(p);

      const e = p.etiqueta;
      const detalle = !e
        ? ''
        : e.tipo === 'canasta' && e.peso_kg
          ? ` · ${formatCantidad(e.peso_kg)} kg`
          : e.tipo === 'lote' && e.lote
            ? ` · lote ${e.lote}`
            : ' · etiqueta';

      setScanOk(`${p.nombre}${detalle} agregado al pedido`);
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setScanOk(''); setScannerOpen(true); }}
            className="btn-secondary"
          >
            <QrCode size={14} aria-hidden="true" /> Escanear QR
          </button>
          <button onClick={() => navigate('/ventas')} className="btn-secondary">
            <ArrowLeft size={14} aria-hidden="true" /> Volver a ventas
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {scanOk && (
        <div className="flex items-center justify-between rounded border border-success/25 bg-success-soft px-3 py-2 text-xs font-medium text-success">
          <span className="flex items-center gap-1.5"><Check size={14} aria-hidden="true" /> {scanOk}</span>
          <button onClick={() => setScanOk('')} className="rounded-sm p-1 text-success/70 hover:bg-card hover:text-success" title="Cerrar aviso" aria-label="Cerrar aviso de escaneo">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* ── Columna principal ─────────────────────── */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <div className="card">
              <p className="card-title">1. Cliente</p>
              {cliente ? (
                <div className="flex items-center justify-between rounded border border-accent/25 bg-primary-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{cliente.nombre}</p>
                    {cliente.telefono && <p className="text-tiny text-muted">{cliente.telefono}</p>}
                  </div>
                  <button onClick={() => setCliente(null)} className="btn-icon hover:bg-card" title="Quitar cliente" aria-label="Quitar cliente">
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              ) : clienteLibre ? (
                <div className="flex items-center justify-between rounded border border-warning/25 bg-warning-soft px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{clienteLibre}</p>
                    <p className="text-tiny font-medium text-warning">Cliente no registrado</p>
                  </div>
                  <button onClick={() => setClienteLibre('')} className="btn-icon hover:bg-card" title="Quitar cliente" aria-label="Quitar cliente">
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={cliBoxRef}>
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
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
                    <ul className="absolute z-dropdown mt-1 max-h-56 w-full overflow-y-auto rounded border border-line bg-card shadow-dropdown" aria-label="Sugerencias de cliente">
                      {clientes.map(c => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-surface focus:bg-surface"
                            onClick={() => { setCliente(c); setBusqueda(''); setShowCli(false); }}
                          >
                            <p className="font-medium text-ink">{c.nombre}</p>
                            {c.telefono && <p className="text-tiny text-muted">{c.telefono}</p>}
                          </button>
                        </li>
                      ))}
                      {busqueda.trim().length >= 2 && (
                        <li className="border-t border-line">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-warning-soft focus:bg-warning-soft"
                            onClick={() => { setClienteLibre(busqueda.trim()); setBusqueda(''); setShowCli(false); }}
                          >
                            <p className="flex items-center gap-1.5 font-medium text-warning">
                              <Plus size={13} aria-hidden="true" /> Usar «{busqueda.trim()}»
                            </p>
                            <p className="text-tiny text-muted">Se registrará como cliente nuevo</p>
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                  {busqueda.trim().length >= 2 && (
                    <p className="field-help mt-1">
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
              <span className="chip">{plural(lineas.length, 'producto', 'productos')} en el pedido</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {productos.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addLinea(p)}
                  className="group flex items-center justify-between gap-2 rounded border border-line bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-ink">{p.nombre}</span>
                    <span className="block text-2xs text-muted">
                      {formatCOP(p.precio_venta)} / {p.unidad_medida === 'unidad' ? 'unidad' : p.unidad_medida === 'canasta' ? 'canasta' : 'kg'}
                    </span>
                  </span>
                  <Plus size={14} className="shrink-0 text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
                </button>
              ))}
            </div>

            {lineas.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="w-[130px] text-right">Cantidad</th>
                      <th className="w-[170px] text-right">Precio unitario</th>
                      <th className="w-[150px] text-right">Subtotal</th>
                      <th className="w-[46px]"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, idx) => (
                      <tr key={idx}>
                        <td className="font-medium text-ink">{l.nombre}</td>
                        <td>
                          <NumberInput
                            inputMode="decimal"
                            className="input w-24 text-right"
                            placeholder="Ej: 1.5"
                            ariaLabel={`Cantidad de la línea ${idx + 1}`}
                            value={l.cantidad}
                            parse={parseDecimalInput}
                            onChange={(v) => setLineas((prev) => prev.map((x, i) => i === idx ? { ...x, cantidad: v } : x))}
                          />
                        </td>
                        <td>
                          <NumberInput
                            inputMode="numeric"
                            className="input w-32 text-right"
                            placeholder="Ej: 30000"
                            ariaLabel={`Precio unitario de la línea ${idx + 1}`}
                            value={l.precio}
                            parse={parseMoneyInput}
                            onChange={(v) => setLineas((prev) => prev.map((x, i) => i === idx ? { ...x, precio: v } : x))}
                          />
                        </td>
                        <td className="num font-semibold text-ink">{formatCOP(l.cantidad * l.precio)}</td>
                        <td>
                          <button
                            onClick={() => setLineas((prev) => prev.filter((_, i) => i !== idx))}
                            className="btn-icon text-muted hover:bg-danger-soft hover:text-danger"
                            title="Quitar producto"
                            aria-label={`Quitar producto de la línea ${idx + 1}`}
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right text-2xs font-semibold uppercase tracking-wide text-muted">Total del pedido</td>
                      <td className="num text-[15px] font-bold text-ink">{formatCOP(total)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded border border-dashed border-line bg-surface/60 px-4 py-8 text-center">
                <p className="text-xs font-medium text-soft">Selecciona un producto para agregarlo al pedido</p>
                <p className="mt-0.5 text-2xs text-muted">Puedes ajustar cantidad y precio en la tabla</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Resumen lateral ───────────────────────── */}
        <aside className="card space-y-3 xl:sticky xl:top-3">
          <p className="card-title mb-0">Resumen del pedido</p>

          <div className="rounded border border-line bg-surface/70 px-3 py-2">
            <p className="section-label">Cliente</p>
            <p className="truncate text-xs font-medium text-ink">{nombreCliente || 'Sin asignar'}</p>
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Líneas</dt>
              <dd className="money text-ink">{lineas.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Unidades</dt>
              <dd className="money text-ink">
                {lineas.reduce((s, l) => s + (l.cantidad || 0), 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
              <dt className="font-medium text-soft">Total</dt>
              <dd className="money text-[15px] font-bold text-ink">{formatCOP(total)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Abono inicial</dt>
              <dd className="money text-ink">{formatCOP(pagoInicial)}</dd>
            </div>
          </dl>

          <div className={saldo > 0 ? 'rounded border border-warning/25 bg-warning-soft px-3 py-2' : 'rounded border border-success/25 bg-success-soft px-3 py-2'}>
            <p className="section-label">Saldo pendiente</p>
            <p className={saldo > 0 ? 'mt-0.5 font-mono text-[18px] font-bold tabular-nums text-warning' : 'mt-0.5 font-mono text-[18px] font-bold tabular-nums text-success'}>
              {formatCOP(saldo)}
            </p>
            <p className="text-tiny text-soft">{saldo > 0 ? 'Queda registrado en cartera' : 'Pedido pagado en su totalidad'}</p>
          </div>

          <button onClick={guardar} disabled={saving || lineas.length === 0} className="btn-primary btn-lg">
            <Check size={15} aria-hidden="true" /> {saving ? 'Registrando…' : 'Registrar venta'}
          </button>
          <p className="text-2xs leading-relaxed text-muted">
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
