import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { comprasApi, productosApi, proveedoresApi, tiposGastoApi } from '../../api/endpoints';
import { Spinner, Empty, Modal, NumberInput } from '../../components/ui';
import { formatCOP, formatCantidad, formatDate, OPCIONES_ESTADO_COMPRA, today, num, parseMoneyInput, parseDecimalInput } from '../../utils/format';
import type { Compra, Producto } from '../../types';
import { ArrowLeft, Check, Eye, Pencil, Plus, X } from 'lucide-react';

export function ComprasPage() {
  const qc = useQueryClient();
  const [detalle, setDetalle] = useState<Compra | null>(null);
  const [editando, setEditando] = useState<Compra | null>(null);
  const { data: compras = [], isLoading } = useQuery({ queryKey: ['compras'], queryFn: comprasApi.listar });
  const estadoMut = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => comprasApi.cambiarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compras'] }),
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Compras</h1>
        <a href="/compras/nueva" className="btn-primary flex items-center gap-2"><Plus size={15} /> Registrar compra</a>
      </div>
      {isLoading ? <Spinner /> : compras.length === 0 ? <Empty message="Sin compras" /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>#</th><th>Fecha</th><th>Proveedor</th><th>Costo productos</th><th>Gastos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {compras.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-gray-400">#{c.id}</td>
                    <td className="text-xs text-gray-500">{formatDate(c.fecha_compra)}</td>
                    <td className="font-medium">{c.proveedor ?? '—'}</td>
                    <td className="font-mono">{formatCOP(c.total_productos)}</td>
                    <td className="font-mono">{formatCOP(c.total_gastos)}</td>
                    <td className="font-mono font-bold">{formatCOP(c.total_inversion)}</td>
                    <td>
                      <select className="text-xs border border-gray-200 rounded-full px-2 py-1 bg-white" value={c.estado} onChange={e => estadoMut.mutate({ id: c.id, estado: e.target.value })}>
                        {OPCIONES_ESTADO_COMPRA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => comprasApi.detalle(c.id).then(setDetalle)} className="btn-secondary btn-sm"><Eye size={13} /></button>
                        <button onClick={() => comprasApi.detalle(c.id).then(setEditando)} className="btn-secondary btn-sm"><Pencil size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Compra #${detalle?.id}`} size="lg">
        {detalle && <DetalleCompra compra={detalle} />}
      </Modal>
      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar Compra #${editando?.id}`} size="xl">
        {editando && <FormCompra compraExistente={editando} onSuccess={() => { setEditando(null); qc.invalidateQueries({ queryKey: ['compras'] }); }} />}
      </Modal>
    </div>
  );
}

function DetalleCompra({ compra }: { compra: Compra }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Proveedor: <strong>{compra.proveedor ?? '—'}</strong></p>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Productos comprados</p>
        <table className="table-base">
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Kilos</th><th>Precio</th><th>Subtotal</th></tr></thead>
          <tbody>
            {compra.items.map(i => (
              <tr key={i.id}>
                <td>{i.producto}</td>
                <td className="font-mono">{formatCantidad(i.cantidad)} {i.unidad_medida}</td>
                <td className="font-mono">{num(i.kilos_estimados) ? `${formatCantidad(i.kilos_estimados)} kg` : '—'}</td>
                <td className="font-mono">{formatCOP(i.precio_unitario)}</td>
                <td className="font-mono font-semibold">{formatCOP(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compra.gastos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Gastos operativos</p>
          <table className="table-base">
            <thead><tr><th>Tipo</th><th>Monto</th><th>Descripción</th></tr></thead>
            <tbody>{compra.gastos.map(g => <tr key={g.id}><td>{g.tipo}</td><td className="font-mono">{formatCOP(g.monto)}</td><td className="text-gray-400 text-xs">{g.descripcion ?? '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="flex justify-between pt-2 border-t text-sm font-semibold">
        <span>Total inversión:</span>
        <span className="font-mono font-bold text-primary">{formatCOP(compra.total_inversion)}</span>
      </div>
    </div>
  );
}

interface LineaC { productoId: number; nombre: string; cantidad: number; precio: number; kilos: number | null; }
interface LineaG { tipoId: number; monto: number; descripcion: string; fecha: string; }

export function FormCompra({ compraExistente, onSuccess, conResumen = false }: { compraExistente?: Compra; onSuccess: () => void; conResumen?: boolean }) {
  const { data: productos   = [] } = useQuery({ queryKey: ['productos'],   queryFn: productosApi.listar });
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: proveedoresApi.listar });
  const { data: tiposGasto  = [] } = useQuery({ queryKey: ['tipos_gasto'], queryFn: tiposGastoApi.listar });
  const [lineas, setLineas] = useState<LineaC[]>(
    compraExistente?.items.map(i => ({ productoId: i.producto_id, nombre: i.producto, cantidad: num(i.cantidad), precio: num(i.precio_unitario), kilos: i.kilos_estimados != null ? num(i.kilos_estimados) : null })) ?? []
  );
  const [gastos, setGastos] = useState<LineaG[]>(
    compraExistente?.gastos.map(g => ({ tipoId: g.tipo_gasto_id, monto: num(g.monto), descripcion: g.descripcion ?? '', fecha: g.fecha })) ?? []
  );
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const { register, watch } = useForm({
    defaultValues: {
      proveedor_id:  compraExistente?.proveedor_id  ?? '',
      fecha_compra:  compraExistente?.fecha_compra  ?? today(),
      fecha_llegada: compraExistente?.fecha_llegada ?? '',
      estado:        compraExistente?.estado        ?? 'pendiente',
      observaciones: compraExistente?.observaciones ?? '',
    },
  });
  const fv = watch();
  const totalProd  = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const totalGasto = gastos.reduce((s, g) => s + g.monto, 0);
  const totalInversion = totalProd + totalGasto;

  const addLinea = (p: Producto) =>
    setLineas(prev => prev.find(l => l.productoId === p.id) ? prev
      : [...prev, { productoId: p.id, nombre: p.nombre, cantidad: 1, precio: num(p.precio_compra), kilos: p.unidad_medida === 'canasta' ? 15 : null }]);

  const updateLinea = (idx: number, field: string, val: any) =>
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const guardar = async () => {
    setError('');
    const items = lineas.filter(l => l.productoId && l.cantidad > 0 && l.precio > 0);
    if (!items.length) { setError('Agrega al menos un producto'); return; }
    setSaving(true);
    try {
      const payload = {
        proveedor_id:  fv.proveedor_id  || null,
        fecha_compra:  fv.fecha_compra,
        fecha_llegada: fv.fecha_llegada || null,
        estado:        fv.estado,
        observaciones: fv.observaciones || null,
        items: items.map(l => ({ producto_id: l.productoId, cantidad: l.cantidad, precio_unitario: l.precio, kilos_estimados: l.kilos || null })),
        gastos: gastos.filter(g => g.monto > 0).map(g => ({ tipo_gasto_id: g.tipoId, monto: g.monto, descripcion: g.descripcion || null, fecha: g.fecha })),
      };
      if (compraExistente) await comprasApi.editar(compraExistente.id, payload);
      else await comprasApi.crear(payload);
      onSuccess();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const contenido = (
    <div className="space-y-4">
      <div className="card">
        <p className="card-title">1. Datos de la compra</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="field">
            <label className="label">Proveedor</label>
            <select className="input" {...register('proveedor_id')}>
              <option value="">— Sin proveedor —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Estado</label>
            <select className="input" {...register('estado')}>
              {OPCIONES_ESTADO_COMPRA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Fecha compra *</label>
            <input type="date" className="input" {...register('fecha_compra')} />
          </div>
          <div className="field">
            <label className="label">Fecha llegada estimada</label>
            <input type="date" className="input" {...register('fecha_llegada')} />
          </div>
          <div className="field sm:col-span-2">
            <label className="label">Observaciones</label>
            <input type="text" className="input" placeholder="Opcional" {...register('observaciones')} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="card-title mb-0">2. Productos</p>
          <span className="text-[11px] text-slate-500">{lineas.length} producto(s)</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {productos.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => addLinea(p)}
              className="group flex items-center justify-between gap-2 rounded border border-line bg-white px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-slate-800">{p.nombre}</span>
                <span className="block text-[11px] text-slate-500">{formatCOP(p.precio_compra)} / {p.unidad_medida}</span>
              </span>
              <Plus size={14} className="shrink-0 text-slate-400 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>

        {lineas.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="min-w-[160px]">Producto</th>
                  <th className="w-[120px]">Cantidad</th>
                  <th className="w-[160px]">Precio unitario</th>
                  <th className="w-[130px]">Kg para stock</th>
                  <th className="w-[140px] text-right">Subtotal</th>
                  <th className="w-[46px]"></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, idx) => {
                  const esPescado = productos.find((p: Producto) => p.id === l.productoId)?.unidad_medida === 'canasta';
                  return (
                    <tr key={idx}>
                      <td>
                        <select
                          className="input"
                          value={l.productoId}
                          onChange={e => {
                            const p = productos.find((p: Producto) => p.id === +e.target.value);
                            updateLinea(idx, 'productoId', +e.target.value);
                            if (p) updateLinea(idx, 'precio', num(p.precio_compra));
                          }}
                        >
                          <option value={0}>— Producto —</option>
                          {productos.map((p: Producto) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td>
                        <NumberInput
                          inputMode="decimal"
                          className="input"
                          placeholder="Ej: 1.5"
                          value={l.cantidad}
                          parse={parseDecimalInput}
                          onChange={v => updateLinea(idx, 'cantidad', v)}
                        />
                      </td>
                      <td>
                        <NumberInput
                          inputMode="numeric"
                          className="input"
                          placeholder="Ej: 30000"
                          value={l.precio}
                          parse={parseMoneyInput}
                          onChange={v => updateLinea(idx, 'precio', v)}
                        />
                      </td>
                      <td>
                        <NumberInput
                          inputMode="decimal"
                          className="input"
                          placeholder="Ej: 18.5"
                          value={l.kilos ?? 0}
                          parse={parseDecimalInput}
                          onChange={v => updateLinea(idx, 'kilos', v || null)}
                        />
                        {esPescado && <p className="mt-0.5 text-[10px] font-medium text-primary">Kilos reales para stock</p>}
                      </td>
                      <td className="text-right font-mono font-semibold tabular-nums text-slate-900">{formatCOP(l.cantidad * l.precio)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setLineas(prev => prev.filter((_, i) => i !== idx))}
                          className="rounded-sm p-1 text-slate-400 hover:bg-red-50 hover:text-danger"
                          title="Quitar producto"
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {lineas.length === 0 && (
          <div className="mt-4 rounded border border-dashed border-line bg-slate-50/60 py-8 text-center">
            <p className="text-[12.5px] font-medium text-slate-500">Selecciona un producto para agregarlo a la compra</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Puedes ajustar cantidad, precio y kilos en la tabla</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="card-title mb-0">3. Gastos operativos</p>
          <button
            type="button"
            onClick={() => setGastos(prev => [...prev, { tipoId: tiposGasto[0]?.id ?? 1, monto: 0, descripcion: '', fecha: today() }])}
            className="btn-secondary btn-sm"
          >
            <Plus size={12} /> Agregar gasto
          </button>
        </div>

        {gastos.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-slate-400">Sin gastos asociados a esta compra</p>
        ) : (
          <div className="space-y-2">
            {gastos.map((g, idx) => (
              <div key={idx} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px]">
                <select className="input" value={g.tipoId} onChange={e => setGastos(prev => prev.map((x, i) => i === idx ? { ...x, tipoId: +e.target.value } : x))}>
                  {tiposGasto.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
                <NumberInput
                  className="input"
                  placeholder="Monto"
                  value={g.monto}
                  parse={parseMoneyInput}
                  onChange={v => setGastos(prev => prev.map((x, i) => i === idx ? { ...x, monto: v } : x))}
                />
                <input type="text" className="input" placeholder="Descripción (opcional)" value={g.descripcion} onChange={e => setGastos(prev => prev.map((x, i) => i === idx ? { ...x, descripcion: e.target.value } : x))} />
                <button
                  type="button"
                  onClick={() => setGastos(prev => prev.filter((_, i) => i !== idx))}
                  className="justify-self-end rounded-sm p-1 text-slate-400 hover:bg-red-50 hover:text-danger"
                  title="Quitar gasto"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const resumen = (
    <div className="space-y-3">
      <p className="card-title mb-0">Resumen de la compra</p>
      <dl className="space-y-2 text-[12.5px]">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Costo de productos</dt>
          <dd className="font-mono tabular-nums text-slate-800">{formatCOP(totalProd)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Gastos operativos</dt>
          <dd className="font-mono tabular-nums text-slate-800">{formatCOP(totalGasto)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2">
          <dt className="font-medium text-slate-600">Total inversión</dt>
          <dd className="font-mono text-[15px] font-bold tabular-nums text-slate-900">{formatCOP(totalInversion)}</dd>
        </div>
      </dl>
      <div className="rounded border border-line bg-slate-50/70 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Líneas</p>
        <p className="text-[12.5px] font-medium text-slate-800">{lineas.length} producto(s) · {gastos.length} gasto(s)</p>
      </div>
      <button onClick={guardar} disabled={saving} className="btn-primary btn-lg">
        <Check size={15} /> {saving ? 'Guardando…' : compraExistente ? 'Guardar cambios' : 'Registrar compra'}
      </button>
      <p className="text-[10.5px] leading-relaxed text-slate-400">
        Los gastos se prorratean por producto y alimentan el estado de resultados en Finanzas.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-danger/25 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}
      {conResumen ? (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          {contenido}
          <aside className="card xl:sticky xl:top-3">{resumen}</aside>
        </div>
      ) : (
        <>
          {contenido}
          <div className="rounded border border-line bg-slate-50 p-3">{resumen}</div>
        </>
      )}
    </div>
  );
}

export function NuevaCompraPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar compra</h1>
          <p className="page-subtitle">Proveedor, productos y gastos operativos</p>
        </div>
        <button onClick={() => navigate('/compras')} className="btn-secondary">
          <ArrowLeft size={14} /> Volver a compras
        </button>
      </div>
      <FormCompra conResumen onSuccess={() => navigate('/compras')} />
    </div>
  );
}

export default ComprasPage;
