import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toDataURL } from 'qrcode';
import { useSearchParams } from 'react-router-dom';
import { etiquetasApi, productosApi } from '../../api/endpoints';
import { Alert, Empty, Modal, Spinner } from '../../components/ui';
import {
  formatCOP, formatCantidad, formatDate, formatDateTime, num, today,
} from '../../utils/format';
import type { Etiqueta, TipoEtiqueta } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Ban, Check, Download, Info, Printer, QrCode, Search, Tag,
} from 'lucide-react';

const TIPOS: { value: TipoEtiqueta; label: string; ayuda: string }[] = [
  { value: 'producto', label: 'Producto', ayuda: 'Código del producto para conteo rápido' },
  { value: 'canasta',  label: 'Canasta',  ayuda: 'Incluye el peso y la fecha de empaque' },
  { value: 'lote',     label: 'Lote',     ayuda: 'Trazabilidad por lote (texto libre)' },
];

const ETIQUETA_TIPO: Record<TipoEtiqueta, string> = {
  producto: 'Producto',
  canasta:  'Canasta',
  lote:     'Lote',
};

export default function EtiquetasPage() {
  const { isAdmin, isVendedor } = useAuth();
  const puedeEscribir = isAdmin || isVendedor;
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: productosApi.listar,
  });

  const [productoId, setProductoId] = useState<number>(() => Number(params.get('producto')) || 0);
  const [tipo, setTipo] = useState<TipoEtiqueta>('producto');
  const [peso, setPeso] = useState('');
  const [lote, setLote] = useState('');
  const [fecha, setFecha] = useState(today());
  const [copias, setCopias] = useState(1);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [generadas, setGeneradas] = useState<Etiqueta[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activa');
  const [anulando, setAnulando] = useState<Etiqueta | null>(null);
  const [detalle, setDetalle] = useState<Etiqueta | null>(null);
  const [aviso, setAviso] = useState('');

  const producto = useMemo(
    () => productos.find(p => p.id === productoId) ?? null,
    [productos, productoId],
  );

  const { data: etiquetas = [], isLoading } = useQuery({
    queryKey: ['etiquetas', busqueda, filtroTipo, filtroEstado],
    queryFn: () => etiquetasApi.listar({
      q: busqueda.trim() || undefined,
      tipo: filtroTipo || undefined,
      estado: filtroEstado || undefined,
    }),
  });

  // El peso sugerido sale de kilos_por_canasta; el usuario puede cambiarlo.
  useEffect(() => {
    if (tipo === 'canasta' && producto?.kilos_por_canasta) {
      setPeso(String(producto.kilos_por_canasta));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId, tipo]);

  useEffect(() => {
    if (!generadas.length) { setQrs({}); return; }

    let activo = true;
    Promise.all(generadas.map(async (e) => {
      const url = await toDataURL(e.codigo, {
        width: 320,
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      });
      return [e.codigo, url] as const;
    })).then(pares => {
      if (activo) setQrs(Object.fromEntries(pares));
    });

    return () => { activo = false; };
  }, [generadas]);

  // Si llegamos desde Productos con ?producto=ID, limpiamos el parámetro.
  useEffect(() => {
    if (params.get('producto')) {
      const next = new URLSearchParams(params);
      next.delete('producto');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarTipo = (valor: TipoEtiqueta) => {
    setTipo(valor);
    if (valor !== 'canasta') setPeso('');
    if (valor !== 'lote') setLote('');
  };

  const generar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAviso('');

    if (!puedeEscribir) { setError('Tu rol no permite generar etiquetas.'); return; }
    if (!productoId) { setError('Selecciona un producto.'); return; }
    if (tipo === 'canasta' && num(peso) <= 0) { setError('Indica el peso de la canasta en kg.'); return; }
    if (tipo === 'lote' && !lote.trim()) { setError('Indica el identificador del lote.'); return; }

    setGenerando(true);
    try {
      const nuevas = await etiquetasApi.crear({
        producto_id:   productoId,
        tipo,
        peso_kg:       tipo === 'canasta' ? num(peso) : null,
        lote:          tipo === 'lote' ? lote.trim() : null,
        fecha_empaque: fecha,
        copias,
      });
      setGeneradas(nuevas);
      setAviso(nuevas.length === 1 ? 'Etiqueta generada. Lista para imprimir.' : `${nuevas.length} etiquetas generadas.`);
      qc.invalidateQueries({ queryKey: ['etiquetas'] });
    } catch (err: any) {
      setError(err.message ?? 'No se pudo generar la etiqueta.');
    } finally {
      setGenerando(false);
    }
  };

  const imprimir = () => {
    if (!generadas.length) return;
    document.body.classList.add('printing-etiquetas');
    const limpiar = () => {
      document.body.classList.remove('printing-etiquetas');
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);
    window.print();
  };

  const anular = async () => {
    if (!anulando) return;
    setError('');
    try {
      await etiquetasApi.anular(anulando.codigo);
      setAnulando(null);
      setAviso('Etiqueta anulada.');
      if (detalle?.codigo === anulando.codigo) setDetalle(null);
      qc.invalidateQueries({ queryKey: ['etiquetas'] });
    } catch (err: any) {
      setError(err.message ?? 'No se pudo anular la etiqueta.');
    }
  };

  const imprimirUna = (etiqueta: Etiqueta) => {
    setGeneradas([etiqueta]);
    setDetalle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const qrListo = generadas.length > 0 && generadas.every(e => !!qrs[e.codigo]);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Etiquetas QR</h1>
          <p className="page-subtitle">Producto, canasta con peso y lote · impresión 50 × 30 mm</p>
        </div>
      </div>

      {(error || aviso) && (
        <div className="space-y-2">
          {error && <Alert type="error" message={error} />}
          {aviso && (
            <div className="flex items-center justify-between rounded border border-success/25 bg-success-soft px-3 py-2 text-xs font-medium text-success" role="status">
              <span className="flex items-center gap-1.5"><Check size={14} aria-hidden="true" /> {aviso}</span>
              <button onClick={() => setAviso('')} className="rounded-sm p-1 text-success/70 transition-colors hover:bg-card" aria-label="Cerrar aviso">
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Generador ─────────────────────────────── */}
        <form onSubmit={generar} className="card space-y-4">
          <p className="card-title flex items-center gap-1.5"><Tag size={14} aria-hidden="true" /> Generar etiqueta</p>

          {!puedeEscribir && (
            <Alert
              type="info"
              message="Tu rol es de solo lectura: puedes consultar e imprimir etiquetas, pero no generarlas ni anularlas."
            />
          )}

          <div className="field">
            <label htmlFor="etiqueta-producto" className="label">Producto *</label>
            <select
              id="etiqueta-producto"
              className="input"
              value={productoId || ''}
              onChange={(e) => setProductoId(Number(e.target.value))}
            >
              <option value="">Selecciona un producto</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} · {p.codigo}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="etiqueta-tipo" className="label">Tipo de etiqueta *</label>
            <select
              id="etiqueta-tipo"
              className="input"
              value={tipo}
              onChange={(e) => cambiarTipo(e.target.value as TipoEtiqueta)}
            >
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="field-help mt-1">{TIPOS.find(t => t.value === tipo)?.ayuda}</p>
          </div>

          {tipo === 'canasta' && (
            <div className="field">
              <label htmlFor="etiqueta-peso" className="label">Peso de la canasta (kg) *</label>
              <input
                id="etiqueta-peso"
                type="text"
                inputMode="decimal"
                className="input"
                placeholder="Ej: 18,5"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
              {!producto?.kilos_por_canasta && (
                <p className="mt-1 text-2xs font-medium text-warning">
                  Este producto no tiene kilos por canasta configurados; escribe el peso.
                </p>
              )}
            </div>
          )}

          {tipo === 'lote' && (
            <div className="field">
              <label htmlFor="etiqueta-lote" className="label">Identificador del lote *</label>
              <input
                id="etiqueta-lote"
                type="text"
                className="input"
                maxLength={40}
                placeholder="Ej: L-2026-1104-A"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
              />
              <p className="field-help mt-1">
                Texto libre hasta que exista el módulo de lotes de la Fase 3.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="etiqueta-fecha" className="label">Fecha de empaque *</label>
              <input
                id="etiqueta-fecha"
                type="date"
                className="input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="etiqueta-copias" className="label">Copias</label>
              <input
                id="etiqueta-copias"
                type="number"
                min={1}
                max={50}
                className="input"
                value={copias}
                onChange={(e) => setCopias(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </div>
          </div>

          <button type="submit" disabled={generando || !puedeEscribir} className="btn-primary btn-lg w-full">
            <QrCode size={15} aria-hidden="true" />
            {generando ? 'Generando…' : 'Generar etiqueta'}
          </button>
        </form>

        {/* ── Vista previa ──────────────────────────── */}
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="card-title mb-0 flex items-center gap-1.5"><Printer size={14} aria-hidden="true" /> Vista previa</p>
            <div className="flex items-center gap-2">
              <span className="text-tiny text-muted">50 × 30 mm</span>
              <button
                type="button"
                onClick={imprimir}
                disabled={!qrListo}
                className="btn-primary btn-sm"
              >
                <Printer size={13} aria-hidden="true" /> Imprimir {generadas.length > 1 ? `${generadas.length} etiquetas` : ''}
              </button>
            </div>
          </div>

          {generadas.length === 0 ? (
            <div className="rounded border border-dashed border-line bg-surface/60 px-4 py-10 text-center">
              <QrCode size={26} className="mx-auto text-subtle" aria-hidden="true" />
              <p className="mt-2 text-xs text-muted">
                Genera una etiqueta para ver el QR y los datos que se imprimen.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {generadas.map(e => (
                <EtiquetaVista key={e.id} etiqueta={e} qr={qrs[e.codigo]} />
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 rounded border border-accent/25 bg-primary-50 px-3 py-2 text-tiny text-soft">
            <Info size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <p>
              La etiqueta de canasta lleva el peso en el QR: al escanearla en una venta,
              el sistema agrega esa cantidad de kilos en lugar de 1.
            </p>
          </div>
        </div>
      </div>

      {/* ── Historial ───────────────────────────────── */}
      <div className="card space-y-3 p-0">
        <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
          <div className="field min-w-[220px] flex-1">
            <label htmlFor="etiqueta-buscar" className="label">Buscar</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="etiqueta-buscar"
                type="search"
                className="input pl-8"
                placeholder="Código, producto o lote"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="etiqueta-filtro-tipo" className="label">Tipo</label>
            <select id="etiqueta-filtro-tipo" className="input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="etiqueta-filtro-estado" className="label">Estado</label>
            <select id="etiqueta-filtro-estado" className="input" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todas</option>
              <option value="activa">Activas</option>
              <option value="anulada">Anuladas</option>
            </select>
          </div>
        </div>

        {isLoading ? <Spinner /> : etiquetas.length === 0 ? <Empty message="Aún no hay etiquetas con estos filtros." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th>Empaque</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {etiquetas.map(e => (
                  <tr key={e.id}>
                    <td className="font-mono text-tiny">{e.codigo}</td>
                    <td>
                      <p className="font-medium">{e.producto}</p>
                      <p className="font-mono text-tiny text-muted">{e.codigo_producto}</p>
                    </td>
                    <td><span className="badge-gray">{ETIQUETA_TIPO[e.tipo]}</span></td>
                    <td className="text-xs">
                      {e.tipo === 'canasta' && e.peso_kg != null && <span className="font-semibold">{formatCantidad(e.peso_kg)} kg</span>}
                      {e.tipo === 'lote' && (e.lote ? `Lote ${e.lote}` : '—')}
                      {e.tipo === 'producto' && '—'}
                    </td>
                    <td className="text-xs">{formatDate(e.fecha_empaque)}</td>
                    <td>
                      <span className={e.estado === 'activa' ? 'badge-green' : 'badge-red'}>
                        {e.estado === 'activa' ? 'Activa' : 'Anulada'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetalle(e)}
                          className="btn-secondary btn-sm"
                          title="Ver etiqueta"
                          aria-label={`Ver etiqueta ${e.codigo}`}
                        >
                          <QrCode size={12} aria-hidden="true" /> Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => imprimirUna(e)}
                          className="btn-secondary btn-sm"
                          title="Imprimir etiqueta"
                          aria-label={`Imprimir etiqueta ${e.codigo}`}
                        >
                          <Printer size={12} aria-hidden="true" />
                        </button>
                        {(isAdmin || isVendedor) && e.estado === 'activa' && (
                          <button
                            type="button"
                            onClick={() => setAnulando(e)}
                            className="btn-secondary btn-sm text-danger hover:border-danger/30 hover:bg-danger-soft"
                            title="Anular etiqueta"
                            aria-label={`Anular etiqueta ${e.codigo}`}
                          >
                            <Ban size={12} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detalle ─────────────────────────────────── */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Etiqueta — ${detalle?.codigo ?? ''}`} size="sm">
        {detalle && (
          <div className="space-y-4">
            <div className="flex justify-center rounded border border-line bg-surface p-3">
              {qrs[detalle.codigo]
                ? <img src={qrs[detalle.codigo]} alt={`QR ${detalle.codigo}`} className="h-52 w-52" />
                : <QrResumen codigo={detalle.codigo} />}
            </div>

            <div className="space-y-1 text-center">
              <p className="text-[13px] font-semibold text-ink">{detalle.producto}</p>
              <p className="font-mono text-xs text-muted">{detalle.codigo}</p>
              <p className="text-tiny text-muted">
                {ETIQUETA_TIPO[detalle.tipo]}
                {detalle.peso_kg != null && ` · ${formatCantidad(detalle.peso_kg)} kg`}
                {detalle.lote && ` · Lote ${detalle.lote}`}
                {` · ${formatDate(detalle.fecha_empaque)}`}
              </p>
              <p className="text-tiny text-muted">Creada {formatDateTime(detalle.created_at)}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => imprimirUna(detalle)} className="btn-primary">
                <Printer size={14} aria-hidden="true" /> Imprimir
              </button>
              {qrs[detalle.codigo] && (
                <a href={qrs[detalle.codigo]} download={`${detalle.codigo}.png`} className="btn-secondary">
                  <Download size={14} aria-hidden="true" /> Descargar QR
                </a>
              )}
              {(isAdmin || isVendedor) && detalle.estado === 'activa' && (
                <button type="button" onClick={() => setAnulando(detalle)} className="btn-secondary text-danger">
                  <Ban size={14} aria-hidden="true" /> Anular
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!anulando} onClose={() => setAnulando(null)} title="Anular etiqueta" size="sm">
        {anulando && (
          <div className="space-y-4">
            <Alert
              type="warning"
              message={`La etiqueta ${anulando.codigo} dejará de resolver al escanearla. Esta acción no se puede deshacer.`}
            />
            <div className="flex gap-2">
              <button type="button" onClick={anular} className="btn-danger flex-1">Anular etiqueta</button>
              <button type="button" onClick={() => setAnulando(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        )}
      </Modal>

      {generadas.length > 0 && createPortal(
        <div className="etiquetas-print" aria-hidden="true">
          {generadas.map(e => (
            <EtiquetaImpresa key={e.id} etiqueta={e} qr={qrs[e.codigo]} />
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Etiqueta para pantalla ──────────────────────────────
function EtiquetaVista({ etiqueta, qr }: { etiqueta: Etiqueta; qr?: string }) {
  return (
    <div className="flex h-[144px] w-[240px] items-center gap-2 rounded border border-line bg-card p-2 shadow-sm">
      <div className="flex h-[110px] w-[110px] shrink-0 items-center justify-center bg-card">
        {qr
          ? <img src={qr} alt={`QR ${etiqueta.codigo}`} className="h-full w-full" />
          : <div className="h-full w-full animate-pulse bg-surface-2" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-tiny font-bold leading-tight text-ink">{etiqueta.producto}</p>
        <p className="mt-0.5 truncate font-mono text-2xs text-muted">{etiqueta.codigo}</p>
        {etiqueta.tipo === 'canasta' && etiqueta.peso_kg != null && (
          <p className="mt-1 text-xs font-bold text-ink">{formatCantidad(etiqueta.peso_kg)} kg</p>
        )}
        {etiqueta.tipo === 'lote' && etiqueta.lote && (
          <p className="mt-1 truncate text-2xs font-semibold text-ink">Lote {etiqueta.lote}</p>
        )}
        <p className="mt-0.5 text-2xs text-muted">{formatDate(etiqueta.fecha_empaque)}</p>
        {etiqueta.tipo !== 'lote' && etiqueta.precio_venta != null && (
          <p className="text-2xs text-muted">{formatCOP(etiqueta.precio_venta)}/kg</p>
        )}
      </div>
    </div>
  );
}

// ── Etiqueta para impresión (50 × 30 mm) ────────────────
function EtiquetaImpresa({ etiqueta, qr }: { etiqueta: Etiqueta; qr?: string }) {
  return (
    <div className="etiqueta-impresa">
      <div className="etq-qr">
        {qr && <img src={qr} alt="" />}
      </div>
      <div className="etq-datos">
        <p className="etq-nombre">{etiqueta.producto}</p>
        <p className="etq-codigo">{etiqueta.codigo}</p>
        {etiqueta.tipo === 'canasta' && etiqueta.peso_kg != null && (
          <p className="etq-fuerte">{formatCantidad(etiqueta.peso_kg)} kg</p>
        )}
        {etiqueta.tipo === 'lote' && etiqueta.lote && (
          <p className="etq-dato">Lote {etiqueta.lote}</p>
        )}
        <p className="etq-dato">{formatDate(etiqueta.fecha_empaque)}</p>
        {etiqueta.tipo !== 'lote' && etiqueta.precio_venta != null && (
          <p className="etq-dato">{formatCOP(etiqueta.precio_venta)}/kg</p>
        )}
      </div>
    </div>
  );
}

function QrResumen({ codigo }: { codigo: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let activo = true;
    toDataURL(codigo, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(u => { if (activo) setUrl(u); });
    return () => { activo = false; };
  }, [codigo]);

  return url
    ? <img src={url} alt={`QR ${codigo}`} className="h-52 w-52" />
    : <div className="h-52 w-52 animate-pulse rounded bg-surface-2" />;
}
