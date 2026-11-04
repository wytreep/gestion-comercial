import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ventasApi, productosApi, clientesApi } from '../../api/endpoints';
import { Spinner, Empty, Modal, Confirm, BadgeEstadoPago, BadgeEstadoPedido, BadgeMedioPago, BadgeDestino, NumberInput } from '../../components/ui';
import { formatCOP, formatCantidad, formatDate, formatDateTime, today, firstDayOfMonth, OPCIONES_MEDIO_PAGO, OPCIONES_DESTINO, OPCIONES_ESTADO_PEDIDO, num, parseMoneyInput, parseDecimalInput } from '../../utils/format';
import type { FiltrosVenta, Venta, EstadoPago, EstadoPedido } from '../../types';
import { Eye, Pencil, Trash2, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EP: { value: EstadoPago | ''; label: string }[] = [{ value: '', label: 'Todos' }, { value: 'pagado', label: 'Pagado' }, { value: 'abono', label: 'Abono' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'fiado', label: 'Fiado' }];
const EPed: { value: EstadoPedido | ''; label: string }[] = [{ value: '', label: 'Todos' }, { value: 'nuevo', label: 'Nuevo' }, { value: 'en_preparacion', label: 'En prep.' }, { value: 'entregado', label: 'Entregado' }, { value: 'cancelado', label: 'Cancelado' }];

export default function VentasPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<FiltrosVenta>({ fecha_desde: firstDayOfMonth(), fecha_hasta: today(), estado_pago: '', estado_pedido: '' });
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const [editando, setEditando] = useState<Venta | null>(null);
  const [abonando, setAbonando] = useState<Venta | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; tienePagos: boolean } | null>(null);

  const { data: ventas = [], isLoading } = useQuery({ queryKey: ['ventas', filtros], queryFn: () => ventasApi.listar(filtros) });

  const eliminarMut = useMutation({
    mutationFn: (id: number) => ventasApi.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ventas'] }); setConfirm(null); },
  });

  const verDetalle = async (id: number) => setDetalle(await ventasApi.detalle(id));

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Ventas</h1>
        <a href="/ventas/nueva" className="btn-primary flex items-center gap-2"><Plus size={15} /> Nueva venta</a>
      </div>
      <div className="card flex flex-wrap gap-3">
        <select className="input w-auto" aria-label="Filtrar por estado de pago" value={filtros.estado_pago} onChange={e => setFiltros(f => ({ ...f, estado_pago: e.target.value as any }))}>
          {EP.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="input w-auto" aria-label="Filtrar por estado del pedido" value={filtros.estado_pedido} onChange={e => setFiltros(f => ({ ...f, estado_pedido: e.target.value as any }))}>
          {EPed.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" className="input w-auto" aria-label="Filtrar desde la fecha" value={filtros.fecha_desde} onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))} />
        <input type="date" className="input w-auto" aria-label="Filtrar hasta la fecha" value={filtros.fecha_hasta} onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))} />
      </div>
      {isLoading ? <Spinner /> : ventas.length === 0 ? <Empty message="Sin ventas en este período" /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Pago</th><th>Pedido</th><th>Acciones</th></tr></thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id} className={v.estado_pedido === 'cancelado' ? 'opacity-50 line-through' : ''}>
                    <td className="font-mono text-gray-400">#{v.id}</td>
                    <td className="font-medium">{v.cliente_nombre}</td>
                    <td className="text-gray-500 text-xs">{formatDate(v.fecha_venta)}</td>
                    <td className="font-mono font-semibold">{formatCOP(v.total)}</td>
                    <td className="font-mono text-success">{formatCOP(v.total_pagado)}</td>
                    <td className={`font-mono font-semibold ${v.saldo_pendiente > 0 ? 'text-danger' : ''}`}>{formatCOP(v.saldo_pendiente)}</td>
                    <td><BadgeEstadoPago estado={v.estado_pago} /></td>
                    <td><BadgeEstadoPedido estado={v.estado_pedido} /></td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => verDetalle(v.id)} className="btn-secondary btn-sm" aria-label={`Ver detalle de la venta ${v.id}`} title="Ver detalle"><Eye size={13} aria-hidden="true" /></button>
                        <button onClick={() => ventasApi.detalle(v.id).then(full => setEditando(full))} className="btn-secondary btn-sm" aria-label={`Editar la venta ${v.id}`} title="Editar"><Pencil size={13} aria-hidden="true" /></button>
                        {v.saldo_pendiente > 0 && <button onClick={() => setAbonando(v)} className="btn-success btn-sm">Abonar</button>}
                        {isAdmin && v.estado_pedido !== 'cancelado' && <button onClick={() => setConfirm({ id: v.id, tienePagos: v.total_pagado > 0 })} className="btn-danger btn-sm" aria-label={`Cancelar la venta ${v.id}`} title="Cancelar venta"><Trash2 size={13} aria-hidden="true" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Venta #${detalle?.id}`} size="lg">
        {detalle && <DetalleVenta venta={detalle} onAbonar={() => setAbonando(detalle)} />}
      </Modal>
      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar Venta #${editando?.id}`} size="lg">
        {editando && <EditarVenta venta={editando} onSuccess={() => { setEditando(null); qc.invalidateQueries({ queryKey: ['ventas'] }); }} />}
      </Modal>
      <Modal open={!!abonando} onClose={() => setAbonando(null)} title={`Registrar pago — #${abonando?.id}`}>
        {abonando && <AbonarVenta venta={abonando} onSuccess={() => { setAbonando(null); qc.invalidateQueries(); }} />}
      </Modal>
      <Confirm open={!!confirm} danger title={confirm?.tienePagos ? 'Cancelar venta' : 'Eliminar venta'} message={confirm?.tienePagos ? 'Tiene pagos. Se marcará como cancelada.' : 'Se eliminará y revertirá el stock.'} onConfirm={() => confirm && eliminarMut.mutate(confirm.id)} onCancel={() => setConfirm(null)} />
    </div>
  );
}

function DetalleVenta({ venta, onAbonar }: { venta: Venta; onAbonar: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">{formatDateTime(venta.fecha_venta)}</span>
        {venta.cliente_telefono && <span className="text-sm text-gray-500">{venta.cliente_telefono}</span>}
        <BadgeEstadoPedido estado={venta.estado_pedido} />
        <BadgeEstadoPago estado={venta.estado_pago} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Productos</p>
        <table className="table-base">
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
          <tbody>{venta.items.map(i => (<tr key={i.id}><td>{i.producto}</td><td className="font-mono">{formatCantidad(i.cantidad)} {i.unidad_medida}</td><td className="font-mono">{formatCOP(num(i.precio_unitario))}</td><td className="font-mono font-semibold">{formatCOP(num(i.subtotal))}</td></tr>))}</tbody>
          <tfoot><tr><td colSpan={3} className="font-semibold text-right pr-4">Total</td><td className="font-mono font-bold">{formatCOP(venta.total)}</td></tr></tfoot>
        </table>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pagos</p>
        {venta.pagos.length === 0 ? <p className="text-xs text-gray-400">Sin pagos</p> : (
          <table className="table-base">
            <thead><tr><th>Fecha</th><th>Monto</th><th>Medio</th><th>Destino</th></tr></thead>
            <tbody>{venta.pagos.map(p => (<tr key={p.id}><td className="text-xs">{formatDateTime(p.fecha_pago)}</td><td className="font-mono font-semibold">{formatCOP(p.monto)}</td><td><BadgeMedioPago medio={p.medio_pago} /></td><td><BadgeDestino destino={p.destino_dinero} /></td></tr>))}</tbody>
          </table>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="text-sm">Saldo: <span className={`font-mono font-bold ${venta.saldo_pendiente > 0 ? 'text-danger' : 'text-success'}`}>{formatCOP(venta.saldo_pendiente)}</span></div>
        {venta.saldo_pendiente > 0 && <button onClick={onAbonar} className="btn-success">Registrar pago</button>}
      </div>
    </div>
  );
}

function EditarVenta({ venta, onSuccess }: { venta: Venta; onSuccess: () => void }) {
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: productosApi.listar });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => clientesApi.listar() });
  const [items, setItems] = useState(venta.items.map(i => ({
    ...i,
    cantidad:        num(i.cantidad),
    precio_unitario: num(i.precio_unitario),
    subtotal:        num(i.subtotal),
  })));
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { cliente_id: venta.cliente_id ?? '', estado_pedido: venta.estado_pedido, fecha_entrega: venta.fecha_entrega ?? '', observaciones: venta.observaciones ?? '' } });

  const onSubmit = async (data: any) => {
    setError('');
    const validItems = items.filter(i => i.producto_id && i.cantidad > 0 && i.precio_unitario > 0);
    // Solo envía items si el usuario los modificó (evita requerir productos para solo cambiar estado)
    const hayItemsModificados = items.some(i => i.producto_id && i.producto_id !== 0);
    try {
      await ventasApi.editar(venta.id, {
        ...data,
        ...(hayItemsModificados ? { items: validItems } : {}),
      });
      onSuccess();
    }
    catch (e: any) { setError(e.message); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="field"><label htmlFor="venta-edit-cliente" className="label">Cliente</label><select id="venta-edit-cliente" className="input" {...register('cliente_id')}><option value="">— Sin cliente —</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
        <div className="field"><label htmlFor="venta-edit-estado" className="label">Estado pedido</label><select id="venta-edit-estado" className="input" {...register('estado_pedido')}>{OPCIONES_ESTADO_PEDIDO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div className="field"><label htmlFor="venta-edit-entrega" className="label">Fecha entrega</label><input id="venta-edit-entrega" type="date" className="input" {...register('fecha_entrega')} /></div>
        <div className="field"><label htmlFor="venta-edit-observaciones" className="label">Observaciones</label><input id="venta-edit-observaciones" type="text" className="input" {...register('observaciones')} /></div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Productos</p>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[2fr_80px_110px_100px_32px] gap-2 items-center">
              <select className="input" aria-label={`Producto de la línea ${idx + 1}`} value={item.producto_id} onChange={e => { const p = productos.find(p => p.id === +e.target.value); setItems(prev => prev.map((it, i) => i === idx ? { ...it, producto_id: +e.target.value, precio_unitario: p ? num(p.precio_venta) : it.precio_unitario } : it)); }}>
                <option value={0}>— Producto —</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <NumberInput
                inputMode="decimal"
                className="input"
                placeholder="Ej: 1.5"
                value={item.cantidad}
                parse={parseDecimalInput}
                onChange={v => setItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: v } : it))}
              />
              <NumberInput
                inputMode="numeric"
                className="input"
                placeholder="Ej: 30000"
                value={item.precio_unitario}
                parse={parseMoneyInput}
                onChange={v => setItems(prev => prev.map((it, i) => i === idx ? { ...it, precio_unitario: v } : it))}
              />
              <span className="font-mono text-sm font-semibold text-primary">{formatCOP(item.cantidad * item.precio_unitario)}</span>
              <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="text-danger hover:opacity-70" aria-label={`Quitar producto de la línea ${idx + 1}`}><X size={15} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setItems(prev => [...prev, { id: 0, producto_id: 0, producto: '', unidad_medida: 'kilo', cantidad: 0, precio_unitario: 0, subtotal: 0 }])} className="btn-secondary btn-sm mt-2">+ Producto</button>
        <div className="mt-2 text-right text-sm">Total: <span className="font-mono font-bold text-primary">{formatCOP(items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0))}</span></div>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 btn-lg">{isSubmitting ? 'Guardando…' : 'Guardar cambios'}</button>
    </form>
  );
}

function AbonarVenta({ venta, onSuccess }: { venta: Venta; onSuccess: () => void }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { monto: num(venta.saldo_pendiente), medio_pago: 'efectivo', destino_dinero: 'efectivo_caja', referencia: '', fecha_vencimiento: '', notas: '' } });
  const onSubmit = async (data: any) => {
    setError('');
    const payload = {
      ...data,
      fecha_vencimiento: data.fecha_vencimiento || null,
      referencia:        data.referencia        || null,
      notas:             data.notas             || null,
    };
    try { await ventasApi.registrarPago(venta.id, payload); onSuccess(); }
    catch (e: any) { setError(e.message); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded">{error}</div>}
      <p className="text-sm text-gray-600">Saldo pendiente: <span className="font-mono font-bold text-danger">{formatCOP(venta.saldo_pendiente)}</span></p>
      <div className="grid grid-cols-2 gap-4">
        <div className="field"><label htmlFor="pago-monto" className="label">Monto *</label><input
  id="pago-monto"
  type="text"
  inputMode="numeric"
  className="input"
  placeholder="Ej: 55000"
  {...register('monto', {
    required: true,
    setValueAs: parseMoneyInput,
    validate: (v) => Number(v) > 0 || 'El monto debe ser mayor a cero',
  })}
/> </div>
        <div className="field"><label htmlFor="pago-medio" className="label">Medio *</label><select id="pago-medio" className="input" {...register('medio_pago')}>{OPCIONES_MEDIO_PAGO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div className="field col-span-2"><label htmlFor="pago-destino" className="label">Destino *</label><select id="pago-destino" className="input" {...register('destino_dinero')}>{OPCIONES_DESTINO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div className="field"><label htmlFor="pago-referencia" className="label">Referencia</label><input id="pago-referencia" type="text" className="input" {...register('referencia')} /></div>
        <div className="field"><label htmlFor="pago-vencimiento" className="label">¿Fiado? Fecha límite</label><input id="pago-vencimiento" type="date" className="input" {...register('fecha_vencimiento')} /></div>
        <div className="field col-span-2"><label htmlFor="pago-notas" className="label">Notas</label><input id="pago-notas" type="text" className="input" {...register('notas')} /></div>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">{isSubmitting ? 'Guardando…' : 'Guardar pago'}</button>
    </form>
  );
}
