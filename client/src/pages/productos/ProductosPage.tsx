import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toDataURL } from 'qrcode';
import { categoriasApi, productosApi } from '../../api/endpoints';
import { Alert, Spinner, Empty, Modal, Confirm } from '../../components/ui';
import { formatCOP, formatCantidad, num, parseMoneyInput, parseDecimalInput } from '../../utils/format';
import type { Producto } from '../../types';
import { Check, Copy, Download, Info, PackageX, Pencil, Plus, QrCode, RotateCcw, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProductosPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [precioProducto, setPrecioProducto] = useState<Producto | null>(null);
  const [qrProducto, setQrProducto] = useState<Producto | null>(null);
  const [desactivando, setDesactivando] = useState<Producto | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [accionError, setAccionError] = useState('');

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos', mostrarInactivos],
    queryFn: () => productosApi.listarAdmin(mostrarInactivos),
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['productos'] });
    qc.invalidateQueries({ queryKey: ['categorias'] });
  };

  const desactivar = async () => {
    if (!desactivando) return;
    setAccionError('');
    try {
      await productosApi.desactivar(desactivando.id);
      setDesactivando(null);
      refrescar();
    } catch (e: any) {
      setAccionError(e.message);
      setDesactivando(null);
    }
  };

  const reactivar = async (producto: Producto) => {
    setAccionError('');
    try {
      await productosApi.reactivar(producto.id);
      refrescar();
    } catch (e: any) {
      setAccionError(e.message);
    }
  };

  const margenColor = (m: number | null) => {
    if (m === null) return 'text-muted';
    if (m > 30) return 'text-success font-semibold';
    if (m > 0) return 'text-warning font-semibold';
    return 'text-danger font-semibold';
  };

  const unidadVenta = (p: Producto) => (p.unidad_medida === 'unidad' ? 'unidad' : 'kg');
  const unidadStock = (p: Producto) => (p.unidad_medida === 'unidad' ? 'u' : 'kg');

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos y precios</h1>
          <p className="page-subtitle">Catálogo, precio de venta y stock disponible</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreando(true)} className="btn-primary">
            <Plus size={15} aria-hidden="true" /> Nuevo producto
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-start gap-2 rounded border border-primary/20 bg-primary-50 px-3 py-2 text-tiny text-slate-600">
          <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            <strong className="text-slate-800">Pescado:</strong> el margen se calcula con el precio y el costo por kg
            (costo/kg ÷ precio venta/kg). Define los kg por canasta para ver el margen real.
          </p>
        </div>
      )}

      {accionError && <Alert type="error" message={accionError} />}

      {isAdmin && (
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded border border-line bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          Mostrar productos inactivos
        </label>
      )}

      {isLoading ? <Spinner /> : productos.length === 0 ? (
        <div className="card">
          <Empty title="Sin productos registrados" description="Crea el primer producto para empezar a vender." />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidad de compra</th>
                  {isAdmin && <th className="text-right">Precio compra</th>}
                  {isAdmin && <th className="text-right">Costo real/kg</th>}
                  <th className="text-right">Precio venta</th>
                  <th className="text-right">Stock</th>
                  {isAdmin && <th className="text-right">Margen real</th>}
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className={!p.activo ? 'opacity-60' : undefined}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            {p.nombre}
                            {!p.activo && <span className="badge-gray ml-2">Inactivo</span>}
                          </p>
                          <p className="text-2xs text-muted">{p.categoria} · <span className="font-mono">{p.codigo}</span></p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQrProducto(p)}
                          className="btn-icon shrink-0"
                          title={`Ver QR ${p.codigo}`}
                          aria-label={`Ver código QR de ${p.nombre}`}
                        >
                          <QrCode size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <p className="text-slate-700">{p.unidad_medida === 'canasta' ? 'Media canasta' : p.unidad_medida}</p>
                      {p.unidad_medida === 'canasta' && (
                        <p className={p.kilos_por_canasta ? 'text-2xs text-muted' : 'text-2xs font-medium text-warning'}>
                          {p.kilos_por_canasta ? `${p.kilos_por_canasta} kg/canasta` : 'sin kg/canasta'}
                        </p>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="num">
                        {formatCOP(p.precio_compra ?? 0)}
                        <p className="text-2xs font-normal text-muted">
                          {p.unidad_medida === 'canasta' ? '/canasta' : p.unidad_medida === 'unidad' ? '/unidad' : '/kg'}
                        </p>
                      </td>
                    )}
                    {isAdmin && <td className="num whitespace-nowrap font-semibold">{p.costo_por_kg ? `${formatCOP(p.costo_por_kg)}/kg` : '—'}</td>}
                    <td className="num whitespace-nowrap">{formatCOP(p.precio_venta)}<span className="text-2xs text-muted">/{unidadVenta(p)}</span></td>
                    <td className="num whitespace-nowrap">{formatCantidad(p.stock_actual)} <span className="text-2xs text-muted">{unidadStock(p)}</span></td>
                    {isAdmin && <td className={`num ${margenColor(p.margen_porcentaje ?? null)}`}>{p.margen_porcentaje != null ? `${Number(p.margen_porcentaje).toFixed(1)}%` : '—'}</td>}
                    <td>
                      <div className="flex justify-end gap-1">
                        {p.activo && (
                          <Link
                            to={`/etiquetas?producto=${p.id}`}
                            className="btn-secondary btn-sm"
                            title={`Generar etiqueta QR de ${p.nombre}`}
                          >
                            <QrCode size={12} aria-hidden="true" /> Etiqueta
                          </Link>
                        )}
                        {isAdmin && p.activo && (
                          <button onClick={() => setPrecioProducto(p)} className="btn-secondary btn-sm" title="Editar solo precios">
                            <Tag size={12} aria-hidden="true" /> Precios
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setEditando(p)} className="btn-secondary btn-sm" title="Editar producto">
                            <Pencil size={12} aria-hidden="true" /> Editar
                          </button>
                        )}
                        {isAdmin && (p.activo ? (
                          <button
                            onClick={() => setDesactivando(p)}
                            className="btn-secondary btn-sm text-danger hover:border-danger/30 hover:bg-danger-soft"
                            title="Desactivar producto"
                            aria-label={`Desactivar ${p.nombre}`}
                          >
                            <PackageX size={12} aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivar(p)}
                            className="btn-secondary btn-sm"
                            title="Reactivar producto"
                            aria-label={`Reactivar ${p.nombre}`}
                          >
                            <RotateCcw size={12} aria-hidden="true" /> Reactivar
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo producto" size="lg">
        <FormProducto onSuccess={() => { setCreando(false); refrescar(); }} />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar producto — ${editando?.nombre ?? ''}`} size="lg">
        {editando && <FormProducto producto={editando} onSuccess={() => { setEditando(null); refrescar(); }} />}
      </Modal>

      <Modal open={!!precioProducto} onClose={() => setPrecioProducto(null)} title={`Precios — ${precioProducto?.nombre}`}>
        {isAdmin && precioProducto && <EditarPrecio producto={precioProducto} onSuccess={() => { setPrecioProducto(null); refrescar(); }} />}
      </Modal>

      <Modal open={!!qrProducto} onClose={() => setQrProducto(null)} title={`Código QR — ${qrProducto?.nombre ?? ''}`} size="sm">
        {qrProducto && <QrProducto producto={qrProducto} />}
      </Modal>

      <Confirm
        open={!!desactivando}
        title="Desactivar producto"
        message={`${desactivando?.nombre ?? 'El producto'} dejará de aparecer para nuevas ventas y compras, pero su historial se conserva. Podrás reactivarlo cuando quieras.`}
        onConfirm={desactivar}
        onCancel={() => setDesactivando(null)}
        danger
      />
    </div>
  );
}

function FormProducto({ producto, onSuccess }: { producto?: Producto; onSuccess: () => void }) {
  const [error, setError] = useState('');
  const [crearCategoria, setCrearCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  const { data: categorias = [], isLoading: cargandoCategorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasApi.listar,
  });

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      nombre: producto?.nombre ?? '',
      categoria_id: producto?.categoria_id ? String(producto.categoria_id) : '',
      unidad_medida: producto?.unidad_medida ?? 'kilo',
      precio_compra: num(producto?.precio_compra),
      precio_venta: num(producto?.precio_venta),
      kilos_por_canasta: producto?.kilos_por_canasta != null ? num(producto.kilos_por_canasta) : '',
      stock_inicial: 0,
      motivo: '',
    },
  });

  const unidad = watch('unidad_medida');

  const onSubmit = async (data: any) => {
    setError('');

    try {
      let categoriaId = Number(data.categoria_id);

      if (crearCategoria) {
        const nombre = nuevaCategoria.trim();
        if (!nombre) {
          setError('Escribe el nombre de la nueva categoría.');
          return;
        }
        const categoria = await categoriasApi.crear({ nombre });
        categoriaId = categoria.id;
      }

      if (!categoriaId) {
        setError('Selecciona una categoría.');
        return;
      }

      const payload: Record<string, unknown> = {
        nombre: data.nombre,
        categoria_id: categoriaId,
        unidad_medida: data.unidad_medida,
        precio_compra: Number(data.precio_compra),
        precio_venta: Number(data.precio_venta),
        kilos_por_canasta: data.unidad_medida === 'canasta' ? Number(data.kilos_por_canasta) : null,
      };

      if (producto) {
        payload.motivo = data.motivo || null;
        await productosApi.editar(producto.id, payload);
      } else {
        payload.stock_inicial = Number(data.stock_inicial) || 0;
        await productosApi.crear(payload);
      }

      onSuccess();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (cargandoCategorias) return <Spinner />;

  const etiquetaPrecio = unidad === 'canasta'
    ? 'por canasta'
    : unidad === 'unidad'
      ? 'por unidad'
      : 'por kg';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="field col-span-2">
          <label htmlFor="producto-nombre" className="label">Nombre *</label>
          <input
            id="producto-nombre"
            type="text"
            className="input"
            placeholder="Ej: Queso campesino"
            {...register('nombre', { required: true })}
          />
        </div>

        <div className="field col-span-2">
          <label htmlFor="producto-categoria" className="label">Categoría *</label>
          {crearCategoria ? (
            <div className="flex gap-2">
              <input
                id="producto-nueva-categoria"
                type="text"
                className="input"
                placeholder="Ej: Frutas"
                value={nuevaCategoria}
                onChange={e => setNuevaCategoria(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="btn-secondary btn-sm shrink-0"
                onClick={() => { setCrearCategoria(false); setNuevaCategoria(''); }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select id="producto-categoria" className="input" {...register('categoria_id')}>
                <option value="">Selecciona…</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button
                type="button"
                className="btn-secondary btn-sm shrink-0"
                onClick={() => setCrearCategoria(true)}
                title="Crear nueva categoría"
              >
                <Plus size={12} /> Categoría
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="producto-unidad" className="label">Unidad de medida *</label>
          <select id="producto-unidad" className="input" {...register('unidad_medida')}>
            <option value="kilo">Kilo (kg)</option>
            <option value="canasta">Canasta</option>
            <option value="unidad">Unidad</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="producto-stock" className="label">{producto ? 'Stock actual' : 'Stock inicial'}</label>
          {producto ? (
            <input
              id="producto-stock"
              type="text"
              className="input bg-slate-50"
              value={`${formatCantidad(producto.stock_actual)} ${producto.unidad_medida === 'unidad' ? 'u' : 'kg'}`}
              disabled
            />
          ) : (
            <input
              id="producto-stock"
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="0"
              {...register('stock_inicial', { setValueAs: (v) => v ? parseDecimalInput(v) : 0 })}
            />
          )}
        </div>

        <div className="field">
          <label htmlFor="producto-precio-compra" className="label">Precio compra ({etiquetaPrecio}) *</label>
          <input
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
          />
        </div>

        <div className="field">
          <label htmlFor="producto-precio-venta" className="label">Precio venta ({etiquetaPrecio}) *</label>
          <input
            id="producto-precio-venta"
            type="text"
            inputMode="numeric"
            className="input"
            placeholder="Ej: 40000"
            {...register('precio_venta', {
              required: true,
              setValueAs: parseMoneyInput,
              validate: (v) => Number(v) > 0 || 'Debe ser mayor a cero',
            })}
          />
        </div>

        {unidad === 'canasta' && (
          <div className="field col-span-2">
            <label htmlFor="producto-kilos" className="label">Kilos por canasta *</label>
            <input
              id="producto-kilos"
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="Ej: 18"
              {...register('kilos_por_canasta', {
                setValueAs: (v) => v ? parseDecimalInput(v) : '',
              })}
            />
            <p className="field-help mt-1">¿Cuántos kg rinde una canasta en promedio?</p>
          </div>
        )}

        {producto && (
          <div className="field col-span-2">
            <label htmlFor="producto-motivo" className="label">Motivo del cambio de precio</label>
            <input id="producto-motivo" type="text" className="input" placeholder="Ej: Alza del proveedor" {...register('motivo')} />
          </div>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">
        {isSubmitting ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
      </button>
    </form>
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
        <p className="mt-1 font-mono text-xs text-muted">{producto.codigo}</p>
        <p className="mt-1 text-tiny text-muted">
          {formatCOP(producto.precio_venta)} / {producto.unidad_medida === 'canasta' ? 'canasta' : producto.unidad_medida === 'unidad' ? 'unidad' : 'kg'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={copiar} className="btn-secondary">
          {copiado ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copiado ? 'Copiado' : 'Copiar código'}
        </button>
        {dataUrl && (
          <a href={dataUrl} download={`${producto.codigo}.png`} className="btn-primary">
            <Download size={14} aria-hidden="true" /> Descargar QR
          </a>
        )}
      </div>

      <p className="text-center text-2xs leading-relaxed text-muted">
        Imprime o guarda esta imagen y pégala en el producto. El escáner de ventas la lee desde la cámara o un lector USB.
      </p>
    </div>
  );
}

function EditarPrecio({ producto, onSuccess }: { producto: Producto; onSuccess: () => void }) {
  const [error, setError] = useState('');
  const esPescado = producto.unidad_medida === 'canasta';
  const esUnidad = producto.unidad_medida === 'unidad';
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

  const sufijo = esUnidad ? 'por unidad' : 'por kg';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="field"><label htmlFor="producto-precio-compra" className="label">{esPescado ? 'Precio compra (por canasta)' : `Precio compra (${sufijo})`} *</label><input
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
        <div className="field"><label htmlFor="producto-precio-venta" className="label">Precio venta ({sufijo}) *</label><input
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
        /><p className="field-help mt-1">¿Cuántos kg rinde una media canasta en promedio?</p></div>}
        <div className="field col-span-2"><label htmlFor="producto-motivo" className="label">Motivo del cambio</label><input id="producto-motivo" type="text" className="input" placeholder="Ej: Alza del proveedor" {...register('motivo')} /></div>
      </div>
      {margen !== null && (
        <div className={`flex flex-wrap gap-x-5 gap-y-1 rounded-md px-3.5 py-2.5 text-xs ${+margen > 0 ? 'bg-success-soft' : 'bg-danger-soft'}`}>
          {esPescado && num(vals.kilos_por_canasta) > 0 && <span>Costo/kg: <strong className="font-mono">{formatCOP(num(vals.precio_compra) / num(vals.kilos_por_canasta))}/kg</strong></span>}
          <span>Margen estimado: <strong className={+margen > 0 ? 'text-success' : 'text-danger'}>{margen}%</strong></span>
        </div>
      )}
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">{isSubmitting ? 'Guardando…' : 'Guardar precios'}</button>
    </form>
  );
}
