import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { BarChart3, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/endpoints';
import { Alert } from '../../components/ui';
import type { EstadoIp } from '../../types';

interface F { email: string; password: string; }

/** Segundos → "4 min 32 s" o "02:14:09" cuando pasa de una hora. */
function formatearEspera(segundos: number): string {
  if (segundos >= 3600) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  }

  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<F>();

  const [bloqueo,  setBloqueo]  = useState<EstadoIp | null>(null);
  const [restante, setRestante] = useState(0);
  const [expirada, setExpirada] = useState('');
  const avisoRef = useRef<HTMLDivElement>(null);

  /**
   * Si el cliente llegó aquí porque su sesión murió, `clearSession()` dejó el
   * motivo en `sessionStorage`. Se muestra una vez y se retira: al recargar ya
   * no hay nada que contar.
   */
  useEffect(() => {
    const motivo = sessionStorage.getItem('sesion_expirada');
    if (!motivo) return;
    sessionStorage.removeItem('sesion_expirada');
    setExpirada(motivo);
  }, []);

  /**
   * El bloqueo vive en el servidor (por IP). Al entrar se consulta para que un
   * F5 no permita volver a escribir en el formulario.
   */
  const consultarEstado = useCallback(async () => {
    try {
      const estado = await authApi.estadoIp();
      if (estado.bloqueo) {
        setBloqueo(estado);
        setRestante(Math.max(0, estado.restante));
      } else {
        setBloqueo(null);
        setRestante(0);
      }
    } catch {
      // Sin respuesta del servidor se deja intentar: el login validará igual.
    }
  }, []);

  useEffect(() => { void consultarEstado(); }, [consultarEstado]);

  // Cuenta atrás mientras el bloqueo sea temporal.
  useEffect(() => {
    if (!bloqueo || bloqueo.permanente) return;
    const t = window.setInterval(() => setRestante((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [bloqueo]);

  // Al llegar a cero se vuelve a preguntar: puede ser el siguiente escalón.
  useEffect(() => {
    if (!bloqueo || bloqueo.permanente || restante > 0) return;
    const t = window.setTimeout(() => { void consultarEstado(); }, 1500);
    return () => window.clearTimeout(t);
  }, [bloqueo, restante, consultarEstado]);

  // Mueve el foco al aviso para que se anuncie al aparecer.
  useEffect(() => {
    if (bloqueo) avisoRef.current?.focus();
  }, [bloqueo]);

  const onSubmit = async (d: F) => {
    setErr('');
    setExpirada('');
    try {
      await login(d.email, d.password);
      navigate('/');
    } catch (e: any) {
      // 429 con `data.bloqueo`: el quinto fallo ya cierra el formulario.
      if (e?.status === 429 && e?.data?.bloqueo) {
        setBloqueo({
          bloqueo:    true,
          permanente: Boolean(e.data.permanente),
          nivel:      Number(e.data.nivel ?? 1),
          restante:   Number(e.data.restante ?? 0),
          hasta:      e.data.hasta ?? null,
          mensaje:    e.message ?? '',
        });
        setRestante(Math.max(0, Number(e.data.restante ?? 0)));
        return;
      }
      setErr(e?.message ?? 'Credenciales incorrectas');
    }
  };

  const bloqueado = bloqueo !== null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="h-[3px] w-full bg-brand" />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-[370px]">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-brand shadow-panel">
              <BarChart3 size={21} className="text-white" strokeWidth={2.4} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight tracking-tight text-ink">Gestión Comercial</p>
              <p className="text-2xs font-medium uppercase tracking-widest text-muted">ERP de distribución</p>
            </div>
          </div>

          <div className="rounded-md border border-line bg-card shadow-panel">
            <div className="border-b border-line px-5 py-4">
              <h1 className="text-[15px] font-semibold text-ink">Iniciar sesión</h1>
              <p className="mt-0.5 text-tiny text-muted">
                {bloqueado ? 'El acceso desde esta conexión está en espera.' : 'Accede con tu cuenta corporativa.'}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 p-5">
              {expirada && !bloqueo && <Alert type="warning" message={expirada} />}
              {err && <Alert type="error" message={err} />}

              {bloqueo && (
                <div
                  ref={avisoRef}
                  tabIndex={-1}
                  role="alert"
                  id="login-bloqueo"
                  className="rounded border border-danger/25 bg-danger-soft px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-danger">
                        {bloqueo.permanente ? 'Conexión bloqueada' : 'Acceso bloqueado temporalmente'}
                      </p>
                      <p className="text-xs leading-relaxed text-body">{bloqueo.mensaje}</p>
                      {!bloqueo.permanente && bloqueo.nivel > 0 && (
                        <p className="text-2xs text-muted">
                          Bloqueo {bloqueo.nivel} de 5. La espera aumenta con cada bloqueo.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {bloqueo && !bloqueo.permanente && (
                <p className="flex items-baseline gap-2" aria-live="off">
                  <span className="sr-only">Tiempo de espera:</span>
                  <span className="num text-[15px] font-semibold text-ink">{formatearEspera(restante)}</span>
                  <span className="text-2xs text-muted">restantes</span>
                </p>
              )}

              <fieldset disabled={bloqueado} className="space-y-3.5 border-0 p-0">
                <div className="field">
                  <label htmlFor="login-email" className="label">Correo electrónico</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    autoFocus={!bloqueado}
                    className="input"
                    placeholder="nombre@empresa.com"
                    aria-describedby={bloqueado ? 'login-bloqueo' : undefined}
                    {...register('email', { required: true })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="login-password" className="label">Contraseña</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    className="input"
                    placeholder="••••••••"
                    aria-describedby={bloqueado ? 'login-bloqueo' : undefined}
                    {...register('password', { required: true })}
                  />
                </div>
                <button type="submit" disabled={isSubmitting || bloqueado} className="btn-primary btn-lg mt-1">
                  <LockKeyhole size={14} aria-hidden="true" />
                  {bloqueado
                    ? bloqueo.permanente ? 'Acceso bloqueado' : 'Acceso en espera'
                    : isSubmitting ? 'Verificando…' : 'Ingresar'}
                </button>
              </fieldset>

              {bloqueado && !bloqueo.permanente && (
                <p className="text-2xs leading-relaxed text-muted">
                  El formulario se habilita solo cuando termina la espera. Si necesitas entrar antes,
                  contacta al administrador.
                </p>
              )}
            </form>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-2xs text-muted">
            <LockKeyhole size={11} aria-hidden="true" />
            <span>Acceso restringido · Gestión Comercial</span>
          </div>
        </div>
      </div>
    </div>
  );
}
