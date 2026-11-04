import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toDataURL } from 'qrcode';
import { productosApi } from '../../api/endpoints';
import { Spinner, Empty, Modal } from '../../components/ui';
import { formatCOP, formatCantidad, num, parseMoneyInput, parseDecimalInput } from '../../utils/format';
import type { Producto } from '../../types';
import { Check, Copy, Download, Info, Pencil, QrCode } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProductosPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Producto | null>(null);
  const [qrProducto, setQrProducto] = useState<Producto | null>(null);
  const { data: productos = [], isLoading } = useQuery({ queryKey: ['productos'], queryFn: productosApi.listar });

  const margenColor = (m: number | null) => {
    if (m === null) return 'text-gray-400';
    if (m > 30) return 'text-success font-semibold';
    if (m > 0) return 'text-warning font-semibold';
    return 'text-danger font-semibold';
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos y precios</h1>
          <p className="page-subtitle">Catálogo, precio de venta y stock disponible</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-start gap-2 rounded border border-primary/20 bg-primary-50 px-3 py-2 text-[11.5px] text-slate-600">
          <Info size={14} className="mt-0.5 shrink-0 text-primary" />
          <p>
            <strong className="text-slate-800">Pescado:</strong> el margen se calcula como{' '}
            <code className="rounded bg-white px-1 font-mono text-[10.5px]">(precio venta/kg − costo/kg) / precio venta</code>.
            Configura los kg por canasta para ver el margen real.
          </p>
        </div>
      )}

      {isLoading ? <Spinner /> : productos.length === 0 ? <Empty /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidad de compra</th>
                  {isAdmin && <th>Precio compra</th>}
                  {isAdmin && <th>Costo real/kg</th>}
                  <th>Precio venta/kg</th>
                  <th>Stock</th>
                  {isAdmin && <th>Margen real</th>}
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{p.nombre}</p>
                          <p className="text-xs text-gray-400">{p.categoria} · <span className="font-mono">{p.codigo}</span></p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQrProducto(p)}
                          className="shrink-0 rounded-sm p-1 text-slate-400 hover:bg-primary-50 hover:text-primary"
                          title={`Ver QR ${p.codigo}`}
                          aria-label={`Ver código QR de ${p.nombre}`}
                        >
                          <QrCode size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    <td><p>{p.unidad_medida === 'canasta' ? 'Media canasta' : p.unidad_medida}</p>{p.unidad_medida === 'canasta' && <p className={`text-xs ${p.kilos_por_canasta ? 'text-gray-400' : 'text-warning'}`}>{p.kilos_por_canasta ? `${p.kilos_por_canasta} kg/canasta` : 'sin kg/canasta'}</p>}</td>
                    {isAdmin && <td className="font-mono">{formatCOP(p.precio_compra ?? 0)}<p className="text-xs text-gray-400">{p.unidad_medida === 'canasta' ? '/canasta' : '/kg'}</p></td>}
                    {isAdmin && <td className="font-mono font-semibold">{p.costo_por_kg ? formatCOP(p.costo_por_kg) + '/kg' : '—'}</td>}
                    <td className="font-mono">{formatCOP(p.precio_venta)}/kg</td>
                    <td className="font-mono">{formatCantidad(p.stock_actual)} kg</td>
                    {isAdmin && <td className={margenColor(p.margen_porcentaje ?? null)}>{p.margen_porcentaje != null ? `${Number(p.margen_porcentaje).toFixed(1)}%` : '—'}</td>}
                    {isAdmin && <td><button onClick={() => setEditando(p)} className="btn-secondary btn-sm flex items-center gap-1"><Pencil size={12} /> Editar</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Precios — ${editando?.nombre}`}>
        {isAdmin && editando && <EditarPrecio producto={editando} onSuccess={() => { setEditando(null); qc.invalidateQueries({ queryKey: ['productos'] }); }} />}
      </Modal>

      <Modal open={!!qrProducto} onClose={() => setQrProducto(null)} title={`Código QR — ${qrProducto?.nombre ?? ''}`} size="sm">
        {qrProducto && <QrProducto producto={qrProducto} />}
      </Modal>
    </div>
  );
}

function QrProducto({ producto }: { producto: Producto }) {
  const [dataUrl, setDataUrl] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let activo = true;
    toDataURL(producto.codigo, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(url => { if (activo) setDataUrl(url); });
    return () => { activo = false; };
  }, [producto.codigo]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(producto.codigo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* El navegador puede bloquear el portapapeles; el código sigue visible. */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center rounded border border-line bg-slate-50 p-3">
        {dataUrl
          ? <img src={dataUrl} alt={`QR ${producto.codigo}`} className="h-56 w-56" />
          : <div className="h-56 w-56 animate-pulse rounded bg-slate-200" />}
      </div>

      <div className="text-center">
        <p className="text-[13px] font-semibold text-slate-800">{producto.nombre}</p>
        <p className="mt-1 font-mono text-[12px] text-slate-500">{producto.codigo}</p>
        <p className="mt-1 text-[11.5px] text-slate-500">
          {formatCOP(producto.precio_venta)} / {producto.unidad_medida === 'canasta' ? 'canasta' : 'kg'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={copiar} className="btn-secondary">
          {copiado ? <Check size={14} /> : <Copy size={14} />}
          {copiado ? 'Copiado' : 'Copiar código'}
        </button>
        {dataUrl && (
          <a href={dataUrl} download={`${producto.codigo}.png`} className="btn-primary">
            <Download size={14} /> Descargar QR
          </a>
        )}
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Imprime o guarda esta imagen y pégala en el producto. El escáner de ventas la lee desde la cámara o un lector USB.
      </p>
    </div>
  );
}

function EditarPrecio({ producto, onSuccess }: { producto: Producto; onSuccess: () => void }) {
  const [error, setError] = useState('');
  const esPescado = producto.unidad_medida === 'canasta';
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({ defaultValues: { precio_compra: num(producto.precio_compra), precio_venta: num(producto.precio_venta), kilos_por_canasta: producto.kilos_por_canasta != null ? num(producto.kilos_por_canasta) : '', motivo: '' } });
  const vals = watch();

  const previewMargen = () => {
    const pc = num(vals.precio_compra), pv = num(vals.precio_venta), kpc = num(vals.kilos_por_canasta);
    if (!pv) return null;
    const costoKg = esPescado && kpc > 0 ? pc / kpc : pc;
    if (!pv || pv === 0) return null;
    return ((pv - costoKg) / pv * 100).toFixed(1);
  };
  const margen = previewMargen();

  const onSubmit = async (data: any) => {
    setError('');
    try { await productosApi.updatePrecio(producto.id, { precio_compra: +data.precio_compra, precio_venta: +data.precio_venta, kilos_por_canasta: data.kilos_por_canasta ? +data.kilos_por_canasta : null, motivo: data.motivo || null }); onSuccess(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="field"><label htmlFor="producto-precio-compra" className="label">{esPescado ? 'Precio compra (por media canasta)' : 'Precio compra (por kg)'} *</label><input
          id="producto-precio-compra"
          type="text"
          inputMode="numeric"
          className="input"
          placeholder="Ej: 30000"
          {...register('precio_compra', {
            required: true,
            setValueAs: parseMoneyInput,
            validate: (v) => Number(v) > 0 || 'Debe ser mayor a cero',
          })}
        /></div>
        <div className="field"><label htmlFor="producto-precio-venta" className="label">Precio venta (por kg) *</label><input
          id="producto-precio-venta"
          type="text"
          inputMode="numeric"
          className="input"
          placeholder="Ej: 30000"
          {...register('precio_venta', {
            required: true,
            setValueAs: parseMoneyInput,
            validate: (v) => Number(v) > 0 || 'Debe ser mayor a cero',
          })}
        /></div>
        {esPescado && <div className="field col-span-2"><label htmlFor="producto-kilos" className="label">Kilos por media canasta *</label><input
          id="producto-kilos"
          type="text"
          inputMode="decimal"
          className="input"
          placeholder="Ej: 18"
          {...register('kilos_por_canasta', {
            setValueAs: (v) => v ? parseDecimalInput(v) : '',
          })}
        /><p className="text-xs text-slate-500 mt-1">¿Cuántos kg rinde una media canasta en promedio?</p></div>}
        <div className="field col-span-2"><label htmlFor="producto-motivo" className="label">Motivo del cambio</label><input id="producto-motivo" type="text" className="input" placeholder="Ej: Alza del proveedor" {...register('motivo')} /></div>
      </div>
      {margen !== null && (
        <div className={`rounded-lg px-4 py-3 text-sm flex gap-6 ${+margen > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          {esPescado && num(vals.kilos_por_canasta) > 0 && <span>Costo/kg: <strong className="font-mono">{formatCOP(num(vals.precio_compra) / num(vals.kilos_por_canasta))}/kg</strong></span>}
          <span>Margen estimado: <strong className={+margen > 0 ? 'text-success' : 'text-danger'}>{margen}%</strong></span>
        </div>
      )}
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">{isSubmitting ? 'Guardando…' : 'Guardar precios'}</button>
    </form>
  );
}
