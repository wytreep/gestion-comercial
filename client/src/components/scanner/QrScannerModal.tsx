import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { Camera, FlipHorizontal, Keyboard, QrCode, RefreshCw } from 'lucide-react';
import { Alert, Modal } from '../ui';

type CameraState = 'idle' | 'starting' | 'active' | 'error';

interface Props {
  open: boolean;
  onClose: () => void;
  onCode: (codigo: string) => Promise<{ ok: boolean; message?: string }>;
}

export default function QrScannerModal({ open, onClose, onCode }: Props) {
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [espejo, setEspejo] = useState(() => {
    try {
      return localStorage.getItem('gcom-qr-espejo') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gcom-qr-espejo', espejo ? '1' : '0');
    } catch {
      // El navegador puede bloquear el almacenamiento; el control sigue funcionando.
    }
  }, [espejo]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handlingRef = useRef(false);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState('idle');
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setError('');
      setManual('');
      setBuscando(false);
      handlingRef.current = false;
    }
  }, [open, stopCamera]);

  useEffect(() => () => {
    controlsRef.current?.stop();
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
  }, []);

  const handleCode = async (raw: string) => {
    const codigo = raw.trim();
    if (!codigo || handlingRef.current) return;

    handlingRef.current = true;
    setBuscando(true);
    setError('');
    try {
      const result = await onCode(codigo);
      if (result.ok) {
        setManual('');
        onClose();
        return;
      }
      setError(result.message ?? 'Producto no encontrado.');
    } catch (e: any) {
      setError(e.message ?? 'No se pudo buscar el producto.');
    } finally {
      setBuscando(false);
      handlingRef.current = false;
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;
    setCameraState('starting');
    setError('');

    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _err, ctrl) => {
          if (!result) return;
          ctrl?.stop();
          controlsRef.current = null;
          setCameraState('idle');
          void handleCode(result.getText());
        },
      );
      controlsRef.current = controls;
      setCameraState('active');
    } catch {
      setCameraState('error');
      setError('No se pudo acceder a la cámara. Revisa el permiso o usa el código manual.');
    }
  };

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    void handleCode(manual);
  };

  return (
    <Modal open={open} onClose={onClose} title="Escanear producto" size="md">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-md border border-line bg-navy-950">
          <video
            ref={videoRef}
            className={`h-64 w-full object-cover ${cameraState === 'active' ? '' : 'opacity-20'} ${espejo ? '-scale-x-100' : ''}`}
            muted
            playsInline
            autoPlay
          />

          {cameraState !== 'active' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              {cameraState === 'error' ? <RefreshCw size={30} className="text-slate-400" /> : <QrCode size={34} className="text-slate-400" />}
              <p className="text-[12px] font-medium text-white">
                {cameraState === 'error' ? 'Cámara no disponible' : 'Cámara desactivada'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraState === 'starting'}
                className="btn-primary btn-sm mt-1"
              >
                <Camera size={14} />
                {cameraState === 'starting' ? 'Activando…' : cameraState === 'error' ? 'Reintentar' : 'Activar cámara'}
              </button>
            </div>
          )}

          {cameraState === 'active' && (
            <>
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,27,45,0.35)]" />
                <p className="absolute inset-x-0 bottom-3 text-center text-[11px] font-medium text-white">
                  Apunta al QR del producto
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEspejo(v => !v)}
                aria-pressed={espejo}
                aria-label="Voltear la imagen de la cámara"
                title={espejo ? 'Volver a la vista normal' : 'Voltear la imagen horizontalmente'}
                className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-sm border border-white/25 bg-navy-950/80 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-navy-950"
              >
                <FlipHorizontal size={13} aria-hidden="true" />
                Voltear
              </button>
            </>
          )}
        </div>

        {error && <Alert type="error" message={error} />}
        {buscando && <p className="text-[12px] text-slate-500">Buscando producto…</p>}

        <div className="rounded border border-line bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-slate-700">
            <Keyboard size={14} /> Código manual o lector USB
          </div>
          <form onSubmit={submitManual} className="flex gap-2">
            <input
              className="input font-mono"
              value={manual}
              onChange={e => setManual(e.target.value)}
              placeholder="GCOM-P-0001"
              autoFocus
            />
            <button type="submit" className="btn-primary" disabled={!manual.trim() || buscando}>
              Buscar
            </button>
          </form>
          <p className="mt-2 text-[11px] text-slate-500">
            El lector USB escribe el código y presiona Enter.
          </p>
        </div>

        <p className="text-[11px] text-slate-500">
          Si la cámara no está disponible, puedes escribir el código que aparece en la etiqueta.
        </p>
      </div>
    </Modal>
  );
}
