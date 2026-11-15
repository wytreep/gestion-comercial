import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toDataURL } from 'qrcode';
import { cobrosQrApi } from '../../api/endpoints';
import { Alert, NumberInput, Spinner } from '../ui';
import {
  formatCOP, num, parseMoneyInput,
  OPCIONES_MEDIO_PAGO, OPCIONES_DESTINO,
} from '../../utils/format';
import type { CobroQr, Venta } from '../../types';
import { CheckCircle2, Copy, Download, QrCode, RefreshCw, ShieldCheck, Timer } from 'lucide-react';

const mmss = (segundos: number) => {
  const s = Math.max(0, Math.floor(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const ETIQUETA_ESTADO: Record<CobroQr['estado'], string> = {
  pendiente: 'Pendiente',
  pagado:    'Pagado',
  expirado:  'Expirado',
  anulado:   'Anulado',
};

export default function CobroQrModal({
  venta,
  onSuccess,
  onClose,
}: {
  venta: Venta;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const saldo = num(venta.saldo_pendiente);
  const [monto, setMonto] = useState(saldo);
  const [cobro, setCobro] = useState<CobroQr | null>(null);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [exito, setExito] = useState<{ monto: number; referencia: string } | null>(null);
  const [restante, setRestante] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [modoConfirmar, setModoConfirmar] = useState(false);
  const [confirmarAnulacion, setConfirmarAnulacion] = useState(false);
  const [referencia, setReferencia] = useState('');
  const [medio, setMedio] = useState<'efectivo' | 'transferencia'>('transferencia');
  const [destino, setDestino] = useState('billetera_nequi');
  const [notas, setNotas] = useState('');

  const pendiente = cobro?.estado === 'pendiente';

  useEffect(() => {
    if (!cobro) return;
    let activo = true;
    setDataUrl('');
    toDataURL(cobro.contenido_qr, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => { if (activo) setDataUrl(url); })
      .catch(() => { if (activo) setError('No se pudo generar la imagen del QR.'); });
    return () => { activo = false; };
  }, [cobro?.codigo]);

  useEffect(() => {
    if (!pendiente || deadline <= 0) return;

    const tick = () => {
      const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRestante(s);
      if (s <= 0) {
        setCobro(prev => prev ? { ...prev, estado: 'expirado', expira_en: 0 } : prev);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pendiente, deadline]);

  const generar = async () => {
    setError('');
    setExito(null);
    setModoConfirmar(false);
    setConfirmarAnulacion(false);

    if (monto <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }
    if (monto > saldo + 0.01) {
      setError('El monto no puede superar el saldo pendiente de la venta.');
      return;
    }

    setCreando(true);
    try {
      const nuevo = await cobrosQrApi.crear(venta.id, { monto });
      setCobro(nuevo);
      setDeadline(Date.now() + nuevo.expira_en * 1000);
      setRestante(nuevo.expira_en);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  };

  const copiar = async () => {
    if (!cobro) return;
    try {
      await navigator.clipboard.writeText(cobro.codigo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar el código. Transcríbelo manualmente.');
    }
  };

  const anular = async () => {
    if (!cobro) return;
    setError('');
    setAnulando(true);
    try {
      await cobrosQrApi.anular(cobro.codigo);
      setCobro(null);
      setConfirmarAnulacion(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnulando(false);
    }
  };

  const confirmarPago = async (e: FormEvent) => {
    e.preventDefault();
    if (!cobro) return;
    setError('');

    const ref = referencia.trim();
    if (!ref) {
      setError('Escribe la referencia o número de transacción para conciliar el pago.');
      return;
    }

    setConfirmando(true);
    try {
      await cobrosQrApi.confirmar(cobro.codigo, {
        referencia:     ref,
        medio_pago:     medio,
        destino_dinero: destino,
        notas:          notas.trim() || null,
      });
      setCobro({ ...cobro, estado: 'pagado', referencia: ref });
      setExito({ monto: num(cobro.monto), referencia: ref });
      onSuccess();
    } catch (e: any) {
      setError(e.message);
      // Si otro usuario confirmó o el cobro venció, sincroniza el estado real.
      try { setCobro(await cobrosQrApi.detalle(cobro.codigo)); } catch { /* conserva el estado local */ }
    } finally {
      setConfirmando(false);
    }
  };

  if (exito) {
    return (
      <div className="space-y-5">
        <div className="rounded border border-success/25 bg-success-soft px-4 py-5 text-center" role="status">
          <CheckCircle2 size={36} className="mx-auto mb-2 text-success" aria-hidden="true" />
          <p className="text-sm font-semibold text-success">Pago confirmado</p>
          <p className="mt-1 text-xs text-slate-600">
            Se registraron {formatCOP(exito.monto)} en la venta #{venta.id}.
          </p>
          <p className="mt-1 font-mono text-tiny text-muted">Referencia: {exito.referencia}</p>
        </div>
        <div className="rounded border border-line bg-slate-50 px-3 py-2 text-tiny text-slate-600">
          El saldo de la venta y la cartera ya están actualizados. Puedes cerrar esta ventana.
        </div>
        <button type="button" onClick={onClose} className="btn-primary btn-lg">
          Cerrar
        </button>
      </div>
    );
  }

  if (!cobro) {
    return (
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div className="rounded border border-line bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Venta</p>
              <p className="text-[13px] font-semibold text-slate-800">#{venta.id} · {venta.cliente_nombre}</p>
            </div>
            <div className="text-right">
              <p className="section-label">Saldo pendiente</p>
              <p className="money text-[15px] font-bold text-danger">{formatCOP(saldo)}</p>
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="cobro-qr-monto" className="label">Monto a cobrar *</label>
          <NumberInput
            id="cobro-qr-monto"
            className="input"
            placeholder="Ej: 55000"
            value={monto}
            parse={parseMoneyInput}
            onChange={setMonto}
          />
          <p className="field-help mt-1">
            Puedes cobrar el saldo completo o un abono. El cobro vence a los 15 minutos.
          </p>
        </div>

        <button type="button" onClick={generar} disabled={creando || saldo <= 0} className="btn-primary btn-lg">
          <QrCode size={15} aria-hidden="true" />
          {creando ? 'Generando…' : 'Generar QR de cobro'}
        </button>

        <p className="text-tiny leading-relaxed text-muted">
          El QR identifica la venta, el monto y una referencia única. El pago se confirma
          manualmente después de verificarlo en la app del banco o la billetera.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[210px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-2 rounded border border-line bg-slate-50 p-3">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`Código QR para cobrar la venta ${venta.id} por ${formatCOP(num(cobro.monto))}`}
              className="h-[190px] w-[190px] rounded-sm bg-white"
            />
          ) : (
            <div className="flex h-[190px] w-[190px] items-center justify-center rounded-sm bg-white">
              <Spinner />
            </div>
          )}
          <p className="max-w-full break-all text-center font-mono text-2xs leading-tight text-muted">
            {cobro.codigo}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button type="button" onClick={copiar} className="btn-secondary btn-sm">
              <Copy size={12} aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar'}
            </button>
            {dataUrl && (
              <a href={dataUrl} download={`${cobro.codigo}.png`} className="btn-secondary btn-sm">
                <Download size={12} aria-hidden="true" /> Guardar
              </a>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="section-label">Monto del cobro</p>
              <p className="stat-value mt-1 text-[22px]">
                {formatCOP(num(cobro.monto))}
              </p>
              <p className="text-tiny text-muted">Venta #{venta.id} · {venta.cliente_nombre}</p>
            </div>
            <span className={pendiente ? 'badge-orange' : 'badge-gray'}>
              {ETIQUETA_ESTADO[cobro.estado]}
            </span>
          </div>

          {pendiente ? (
            <div className="flex items-center gap-2 rounded border border-line px-3 py-2">
              <Timer size={15} className={restante <= 60 ? 'text-danger' : 'text-primary'} aria-hidden="true" />
              <div>
                <p className="section-label">Vence en</p>
                <p className={`font-mono text-[15px] font-bold tabular-nums ${restante <= 60 ? 'text-danger' : 'text-slate-800'}`} aria-hidden="true">
                  {mmss(restante)}
                </p>
              </div>
              <p className="ml-auto max-w-[150px] text-right text-2xs leading-tight text-muted">
                Si vence, genera un QR nuevo.
              </p>
            </div>
          ) : (
            <div className="rounded border border-line bg-slate-50 px-3 py-2 text-tiny text-slate-600" aria-live="polite">
              {cobro.estado === 'expirado'
                ? 'Este cobro expiró y ya no se puede confirmar.'
                : cobro.estado === 'pagado'
                  ? 'Este cobro ya fue confirmado.'
                  : 'Este cobro fue anulado.'}
            </div>
          )}

          <div className="rounded border border-primary/15 bg-primary-50 px-3 py-2">
            <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck size={13} aria-hidden="true" /> Confirmación manual
            </p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-tiny leading-relaxed text-slate-600">
              <li>El cliente escanea el QR o usa el código.</li>
              <li>Verifica la transacción en tu banco o billetera.</li>
              <li>Registra la referencia para conciliar el pago.</li>
            </ol>
          </div>

          {pendiente && !modoConfirmar && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setModoConfirmar(true)} className="btn-success">
                Registrar pago recibido
              </button>
              {confirmarAnulacion ? (
                <>
                  <button type="button" onClick={anular} disabled={anulando} className="btn-danger">
                    {anulando ? 'Anulando…' : 'Sí, anular'}
                  </button>
                  <button type="button" onClick={() => setConfirmarAnulacion(false)} className="btn-secondary">
                    Cancelar
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmarAnulacion(true)} className="btn-secondary">
                  Anular cobro
                </button>
              )}
            </div>
          )}

          {!pendiente && (
            <button type="button" onClick={generar} disabled={creando} className="btn-primary">
              <RefreshCw size={14} aria-hidden="true" /> {creando ? 'Generando…' : 'Generar nuevo QR'}
            </button>
          )}

          {pendiente && modoConfirmar && (
            <form onSubmit={confirmarPago} className="space-y-3 border-t border-line pt-3">
              <div className="field">
                <label htmlFor="cobro-qr-referencia" className="label">Referencia o número de transacción *</label>
                <input
                  id="cobro-qr-referencia"
                  type="text"
                  className="input"
                  autoComplete="off"
                  placeholder="Ej: 88451203"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="field">
                  <label htmlFor="cobro-qr-medio" className="label">Medio</label>
                  <select id="cobro-qr-medio" className="input" value={medio} onChange={(e) => setMedio(e.target.value as 'efectivo' | 'transferencia')}>
                    {OPCIONES_MEDIO_PAGO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cobro-qr-destino" className="label">Destino</label>
                  <select id="cobro-qr-destino" className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>
                    {OPCIONES_DESTINO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="cobro-qr-notas" className="label">Notas</label>
                <input
                  id="cobro-qr-notas"
                  type="text"
                  className="input"
                  placeholder="Opcional"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={confirmando} className="btn-success">
                  {confirmando ? 'Confirmando…' : 'Confirmar y registrar pago'}
                </button>
                <button type="button" onClick={() => { setModoConfirmar(false); setError(''); }} className="btn-secondary">
                  Volver
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
