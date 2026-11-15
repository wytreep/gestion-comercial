import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { authApi, seguridadApi } from '../../api/endpoints';
import { Alert, Spinner, Empty, Modal, BadgeRol, Confirm } from '../../components/ui';
import { formatDate, formatDateTime, OPCIONES_ROL } from '../../utils/format';
import type { IpBloqueo, SesionActiva, UsuarioAdmin } from '../../types';
import {
  Plus, Pencil, Power, ShieldCheck, Lock, LogOut, Ban, KeyRound, Monitor,
} from 'lucide-react';

type Pestana = 'usuarios' | 'seguridad';

const PESTANAS: Array<{ id: Pestana; label: string }> = [
  { id: 'usuarios',  label: 'Usuarios' },
  { id: 'seguridad', label: 'Seguridad' },
];

export default function AdminPage() {
  const [pestana, setPestana] = useState<Pestana>('usuarios');

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administración</h1>
          <p className="page-subtitle">Usuarios del sistema y control de acceso.</p>
        </div>
      </div>

      <Tabs pestana={pestana} onChange={setPestana} />

      <div
        role="tabpanel"
        id="panel-usuarios"
        aria-labelledby="tab-usuarios"
        tabIndex={0}
        hidden={pestana !== 'usuarios'}
        className="focus-visible:outline-none"
      >
        {pestana === 'usuarios' && <UsuariosTab />}
      </div>

      <div
        role="tabpanel"
        id="panel-seguridad"
        aria-labelledby="tab-seguridad"
        tabIndex={0}
        hidden={pestana !== 'seguridad'}
        className="focus-visible:outline-none"
      >
        {pestana === 'seguridad' && <SeguridadTab />}
      </div>
    </div>
  );
}

/** Pestañas con teclado: flechas, Inicio y Fin. */
function Tabs({ pestana, onChange }: { pestana: Pestana; onChange: (p: Pestana) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const mover = (delta: number) => {
    const i  = PESTANAS.findIndex((p) => p.id === pestana);
    const next = (i + delta + PESTANAS.length) % PESTANAS.length;
    onChange(PESTANAS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Secciones de administración" className="flex gap-1 border-b border-line">
      {PESTANAS.map((p, i) => {
        const activa = p.id === pestana;
        return (
          <button
            key={p.id}
            ref={(el) => { refs.current[i] = el; }}
            id={`tab-${p.id}`}
            role="tab"
            type="button"
            aria-selected={activa}
            aria-controls={`panel-${p.id}`}
            tabIndex={activa ? 0 : -1}
            onClick={() => onChange(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
              if (e.key === 'ArrowLeft')  { e.preventDefault(); mover(-1); }
              if (e.key === 'Home')       { e.preventDefault(); onChange('usuarios'); refs.current[0]?.focus(); }
              if (e.key === 'End')        { e.preventDefault(); onChange('seguridad'); refs.current[1]?.focus(); }
            }}
            className={[
              '-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
              activa
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-body',
            ].join(' ')}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Usuarios ─────────────────────────────────────────────
function UsuariosTab() {
  const qc = useQueryClient();
  const [creando,  setCreando]  = useState(false);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [confirm,  setConfirm]  = useState<{ id: number; activo: boolean } | null>(null);

  const { data: usuarios = [], isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: authApi.listarUsuarios });

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => authApi.toggleActivo(id, activo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setConfirm(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Admin puede todo · Vendedor crea ventas y cobra cartera · Solo lectura únicamente consulta.
        </p>
        <button onClick={() => setCreando(true)} className="btn-primary btn-sm">
          <Plus size={14} aria-hidden="true" /> Nuevo usuario
        </button>
      </div>

      {isLoading ? <Spinner /> : usuarios.length === 0 ? (
        <div className="card"><Empty title="Sin usuarios" description="Crea la primera cuenta para dar acceso al sistema." /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Creado</th>
                  <th scope="col" className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={!u.activo ? 'opacity-60' : undefined}>
                    <td className="font-medium text-ink">{u.nombre}</td>
                    <td className="text-muted">{u.email}</td>
                    <td><BadgeRol rol={u.rol} /></td>
                    <td><span className={u.activo ? 'badge-green' : 'badge-gray'}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="whitespace-nowrap text-muted">{formatDate(u.created_at)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditando(u)} className="btn-secondary btn-sm">
                          <Pencil size={12} aria-hidden="true" /> Rol
                        </button>
                        <button
                          onClick={() => setConfirm({ id: u.id, activo: !u.activo })}
                          className={u.activo ? 'btn-danger btn-sm' : 'btn-success btn-sm'}
                          title={u.activo ? 'Desactivar' : 'Activar'}
                          aria-label={`${u.activo ? 'Desactivar' : 'Activar'} al usuario ${u.nombre}`}
                        >
                          <Power size={12} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo usuario">
        <FormUsuario onSuccess={() => { setCreando(false); qc.invalidateQueries({ queryKey: ['usuarios'] }); }} />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Cambiar rol — ${editando?.nombre}`} size="sm">
        {editando && (
          <CambiarRol usuario={editando}
            onSuccess={() => { setEditando(null); qc.invalidateQueries({ queryKey: ['usuarios'] }); }} />
        )}
      </Modal>

      <Confirm
        open={!!confirm}
        title={confirm?.activo ? 'Activar usuario' : 'Desactivar usuario'}
        message={confirm?.activo
          ? 'El usuario podrá iniciar sesión de nuevo.'
          : 'El usuario no podrá iniciar sesión y sus sesiones abiertas se cierran.'}
        onConfirm={() => confirm && toggleMut.mutate(confirm)}
        onCancel={() => setConfirm(null)}
        danger={!confirm?.activo}
      />
    </div>
  );
}

// ── Seguridad ────────────────────────────────────────────
function SeguridadTab() {
  const [token,   setToken]   = useState('');
  const [caduca,  setCaduca]  = useState(0);
  const [restante, setRestante] = useState(0);
  const [aviso,   setAviso]   = useState('');

  const abrir = (nuevo: string, segundos: number) => {
    setToken(nuevo);
    setCaduca(Date.now() + segundos * 1000);
    setRestante(segundos);
    setAviso('');
  };

  /** Retira el permiso temporal y vuelve a pedir la contraseña. */
  const caducar = useCallback((mensaje = 'La verificación ya no es válida. Confirma tu contraseña otra vez.') => {
    setToken('');
    setCaduca(0);
    setRestante(0);
    setAviso(mensaje);
  }, []);

  useEffect(() => {
    if (!token) return;
    const t = window.setInterval(() => {
      const seg = Math.max(0, Math.round((caduca - Date.now()) / 1000));
      setRestante(seg);
      if (seg === 0) caducar('La verificación caducó. Confirma tu contraseña otra vez.');
    }, 1000);
    return () => window.clearInterval(t);
  }, [token, caduca, caducar]);

  if (!token) {
    return (
      <div className="space-y-3">
        {aviso && <Alert type="warning" message={aviso} />}
        <GateSeguridad onToken={abrir} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-body">
          <ShieldCheck size={15} className="text-success" aria-hidden="true" />
          <span>
            Verificado · la autorización caduca en{' '}
            <span className="num font-semibold text-ink">{mmss(restante)}</span>
          </span>
        </p>
        <button onClick={() => { setToken(''); setCaduca(0); setRestante(0); setAviso(''); }} className="btn-secondary btn-sm">
          <Lock size={12} aria-hidden="true" /> Cerrar panel
        </button>
      </div>

      {aviso && <Alert type="error" message={aviso} />}

      <Sesiones token={token} onCaducar={caducar} onAviso={setAviso} />
      <Bloqueos token={token} onCaducar={caducar} onAviso={setAviso} />
      <Eventos token={token} onCaducar={caducar} />
    </div>
  );
}

function GateSeguridad({ onToken }: { onToken: (token: string, segundos: number) => void }) {
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { security_token, expires_in } = await authApi.verificarSeguridad(password);
      setPassword('');
      onToken(security_token, expires_in);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo verificar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="card mx-auto max-w-[440px] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary-50 text-accent">
          <KeyRound size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">Verificación de seguridad</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Las sesiones activas, los bloqueos de IP y la bitácora son datos sensibles.
            Confirma tu contraseña para consultarlos o modificarlos. La autorización dura 10 minutos.
          </p>
        </div>
      </div>

      <form onSubmit={enviar} className="mt-4 space-y-3">
        {error && <Alert type="error" message={error} />}
        <div className="field">
          <label htmlFor="seg-password" className="label">Contraseña de administrador</label>
          <input
            id="seg-password"
            type="password"
            autoComplete="current-password"
            className="input"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="seg-password-help"
          />
          <p id="seg-password-help" className="field-help">No se guarda: solo se usa para emitir el permiso temporal.</p>
        </div>
        <button type="submit" className="btn-primary btn-lg" disabled={cargando || password.length === 0}>
          <ShieldCheck size={14} aria-hidden="true" /> {cargando ? 'Verificando…' : 'Verificar y entrar'}
        </button>
      </form>
    </div>
  );
}

function Sesiones({ token, onCaducar, onAviso }: { token: string; onCaducar: () => void; onAviso: (m: string) => void }) {
  const qc = useQueryClient();
  const [revocar, setRevocar] = useState<SesionActiva | null>(null);

  const { data: sesiones = [], isLoading, error } = useQuery({
    queryKey: ['seg-sesiones', token],
    queryFn: () => seguridadApi.sesiones(token),
    retry: false,
    refetchInterval: 30_000,
  });

  const mut = useMutation({
    mutationFn: (id: number) => seguridadApi.revocarSesion(id, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seg-sesiones'] }); setRevocar(null); },
    onError: (e: any) => {
      setRevocar(null);
      if (e?.status === 401) onCaducar();
      else onAviso(e?.message ?? 'No se pudo revocar la sesión.');
    },
  });

  useEffect(() => {
    const e: any = error;
    if (!e) return;
    if (e.status === 401) onCaducar();
    else onAviso(e.message ?? 'No se pudieron cargar las sesiones.');
  }, [error, onCaducar, onAviso]);

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="sesiones-titulo">
      <div className="card-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="sesiones-titulo" className="card-title">Sesiones activas</h2>
          <p className="text-2xs text-muted">Cada inicio de sesión queda atado a una IP y a un refresh de un solo uso.</p>
        </div>
        <span className="badge-blue">{sesiones.length}</span>
      </div>

      {isLoading ? <Spinner /> : sesiones.length === 0 ? (
        <Empty title="Sin sesiones" description="No hay sesiones abiertas en este momento." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">IP</th>
                <th scope="col">Dispositivo</th>
                <th scope="col">Última actividad</th>
                <th scope="col">Expira</th>
                <th scope="col" className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sesiones.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="block font-medium text-ink">{s.nombre}</span>
                    <span className="block text-2xs text-muted">{s.email}</span>
                  </td>
                  <td className="num text-body">{s.ip}</td>
                  <td className="max-w-[190px]">
                    <span className="flex items-center gap-1.5 truncate text-2xs text-muted" title={s.user_agent}>
                      <Monitor size={11} aria-hidden="true" className="shrink-0" />
                      <span className="truncate">{s.user_agent || 'Sin identificar'}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-muted">{formatDateTime(s.ultima_actividad)}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateTime(s.expira)}</td>
                  <td>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setRevocar(s)}
                        className="btn-danger btn-sm"
                        aria-label={`Revocar la sesión de ${s.nombre} desde ${s.ip}`}
                      >
                        <LogOut size={12} aria-hidden="true" /> Revocar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Confirm
        open={revocar !== null}
        title="Revocar sesión"
        message={`${revocar?.nombre ?? ''} tendrá que iniciar sesión de nuevo desde ${revocar?.ip ?? ''}.`}
        onConfirm={() => revocar && mut.mutate(revocar.id)}
        onCancel={() => setRevocar(null)}
        danger
      />
    </section>
  );
}

function Bloqueos({ token, onCaducar, onAviso }: { token: string; onCaducar: () => void; onAviso: (m: string) => void }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ tipo: 'bloquear' | 'desbloquear'; ip: string } | null>(null);
  const [nuevaIp, setNuevaIp] = useState('');

  const { data: bloqueos = [], isLoading, error } = useQuery({
    queryKey: ['seg-bloqueos', token],
    queryFn: () => seguridadApi.bloqueos(token),
    retry: false,
    refetchInterval: 30_000,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['seg-bloqueos'] });

  const desbloquear = useMutation({
    mutationFn: (ip: string) => seguridadApi.desbloquear(ip, token, 'Desbloqueo manual'),
    onSuccess: () => { invalidar(); setConfirm(null); },
    onError: (e: any) => {
      setConfirm(null);
      if (e?.status === 401) onCaducar();
      else onAviso(e?.message ?? 'No se pudo desbloquear la IP.');
    },
  });

  const bloquear = useMutation({
    mutationFn: (ip: string) => seguridadApi.bloquear(ip, token, 'Lista negra manual'),
    onSuccess: () => { invalidar(); setConfirm(null); setNuevaIp(''); },
    onError: (e: any) => {
      setConfirm(null);
      if (e?.status === 401) onCaducar();
      else onAviso(e?.message ?? 'No se pudo bloquear la IP.');
    },
  });

  useEffect(() => {
    const e: any = error;
    if (!e) return;
    if (e.status === 401) onCaducar();
    else onAviso(e.message ?? 'No se pudieron cargar los bloqueos.');
  }, [error, onCaducar, onAviso]);

  const activos = bloqueos.filter((b) => b.bloqueado).length;

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="bloqueos-titulo">
      <div className="card-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="bloqueos-titulo" className="card-title">Bloqueos de IP</h2>
          <p className="text-2xs text-muted">
            5 fallos bloquean la conexión. El castigo escala 5 min → 30 min → 24 h → 7 días → lista negra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={activos > 0 ? 'badge-red' : 'badge-gray'}>{activos} activos</span>
        </div>
      </div>

      <form
        className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          const ip = nuevaIp.trim();
          if (ip) setConfirm({ tipo: 'bloquear', ip });
        }}
      >
        <label htmlFor="nueva-ip" className="section-label">Bloquear IP</label>
        <input
          id="nueva-ip"
          className="input h-8 w-[170px]"
          placeholder="203.0.113.9"
          value={nuevaIp}
          onChange={(e) => setNuevaIp(e.target.value)}
          inputMode="numeric"
        />
        <button type="submit" className="btn-danger btn-sm" disabled={nuevaIp.trim() === '' || bloquear.isPending}>
          <Ban size={12} aria-hidden="true" /> Lista negra
        </button>
      </form>

      {isLoading ? <Spinner /> : bloqueos.length === 0 ? (
        <Empty title="Sin registros" description="Ninguna IP ha fallado el inicio de sesión todavía." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col">IP</th>
                <th scope="col">Estado</th>
                <th scope="col" className="text-right">Nivel</th>
                <th scope="col" className="text-right">Intentos</th>
                <th scope="col">Motivo</th>
                <th scope="col">Último bloqueo</th>
                <th scope="col" className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bloqueos.map((b) => (
                <tr key={b.ip}>
                  <td className="num font-medium text-ink">{b.ip}</td>
                  <td><EstadoBloqueo bloqueo={b} /></td>
                  <td className="num text-right text-body">{b.nivel}</td>
                  <td className="num text-right text-body">{b.intentos}</td>
                  <td className="max-w-[190px] truncate text-2xs text-muted" title={b.motivo ?? ''}>{b.motivo ?? '—'}</td>
                  <td className="whitespace-nowrap text-muted">{b.ultimo_bloqueo ? formatDateTime(b.ultimo_bloqueo) : '—'}</td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {b.bloqueado ? (
                        <button
                          onClick={() => setConfirm({ tipo: 'desbloquear', ip: b.ip })}
                          className="btn-secondary btn-sm"
                          aria-label={`Desbloquear ${b.ip}`}
                        >
                          <ShieldCheck size={12} aria-hidden="true" /> Desbloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirm({ tipo: 'bloquear', ip: b.ip })}
                          className="btn-danger btn-sm"
                          aria-label={`Enviar ${b.ip} a la lista negra`}
                        >
                          <Ban size={12} aria-hidden="true" /> Lista negra
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

      <Confirm
        open={confirm !== null}
        title={confirm?.tipo === 'bloquear' ? 'Enviar a la lista negra' : 'Desbloquear IP'}
        message={confirm?.tipo === 'bloquear'
          ? `${confirm?.ip} no podrá iniciar sesión hasta que se desbloquee manualmente.`
          : `${confirm?.ip} podrá volver a intentarlo y su escalada vuelve a cero.`}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.tipo === 'bloquear') bloquear.mutate(confirm.ip);
          else desbloquear.mutate(confirm.ip);
        }}
        onCancel={() => setConfirm(null)}
        danger={confirm?.tipo === 'bloquear'}
      />
    </section>
  );
}

function EstadoBloqueo({ bloqueo }: { bloqueo: IpBloqueo }) {
  if (!bloqueo.bloqueado && Number(bloqueo.nivel) === 0) return <span className="badge-gray">Libre</span>;
  if (Number(bloqueo.permanente) === 1)                       return <span className="badge-red">Lista negra</span>;
  if (!bloqueo.bloqueado)                                     return <span className="badge-blue">Nivel {bloqueo.nivel}</span>;
  return (
    <span className="badge-orange" title={bloqueo.bloqueado_hasta ?? ''}>
      Bloqueada · {duracion(bloqueo.restante)}
    </span>
  );
}

/** Segundos → "45 s", "5 min", "3 h", "2 d". */
function duracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  if (s >= 86_400) return `${Math.ceil(s / 86_400)} d`;
  if (s >= 3_600)  return `${Math.ceil(s / 3_600)} h`;
  if (s >= 60)     return `${Math.ceil(s / 60)} min`;
  return `${s} s`;
}

const ETIQUETA_EVENTO: Record<string, { label: string; clase: string }> = {
  bloqueo_ip:         { label: 'Bloqueo',          clase: 'badge-orange' },
  ip_lista_negra:     { label: 'Lista negra',      clase: 'badge-red' },
  bloqueo_manual:     { label: 'Lista negra',      clase: 'badge-red' },
  desbloqueo_manual:  { label: 'Desbloqueo',       clase: 'badge-green' },
  sesion_revocada:    { label: 'Sesión revocada',  clase: 'badge-gray' },
  refresh_reutilizado:{ label: 'Token reutilizado', clase: 'badge-red' },
  refresh_invalido:   { label: 'Token inválido',   clase: 'badge-orange' },
  ip_cambiada:        { label: 'IP distinta',      clase: 'badge-orange' },
  reautenticacion:    { label: 'Verificación',     clase: 'badge-blue' },
  reautenticacion_fallida: { label: 'Verificación fallida', clase: 'badge-red' },
};

function Eventos({ token, onCaducar }: { token: string; onCaducar: () => void }) {
  const { data: eventos = [], isLoading, error } = useQuery({
    queryKey: ['seg-eventos', token],
    queryFn: () => seguridadApi.eventos(token),
    retry: false,
  });

  useEffect(() => {
    const e: any = error;
    if (e?.status === 401) onCaducar();
  }, [error, onCaducar]);

  const visibles = eventos.slice(0, 60);

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="eventos-titulo">
      <div className="card-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="eventos-titulo" className="card-title">Bitácora de seguridad</h2>
          <p className="text-2xs text-muted">Bloqueos, revocaciones y verificaciones recientes.</p>
        </div>
        <span className="badge-gray">{eventos.length}</span>
      </div>

      {isLoading ? <Spinner /> : eventos.length === 0 ? (
        <Empty title="Sin eventos" description="Aún no hay actividad de seguridad registrada." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col">Evento</th>
                <th scope="col">IP</th>
                <th scope="col">Cuenta</th>
                <th scope="col">Detalle</th>
                <th scope="col">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((ev) => {
                const etiqueta = ETIQUETA_EVENTO[ev.tipo] ?? { label: ev.tipo, clase: 'badge-gray' };
                return (
                  <tr key={ev.id}>
                    <td><span className={etiqueta.clase}>{etiqueta.label}</span></td>
                    <td className="num text-body">{ev.ip}</td>
                    <td className="text-muted">{ev.usuario ?? ev.email ?? '—'}</td>
                    <td className="max-w-[260px] truncate text-2xs text-muted" title={ev.detalle ?? ''}>{ev.detalle ?? '—'}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(ev.creado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {eventos.length > visibles.length && (
        <p className="border-t border-line px-4 py-2 text-2xs text-muted">
          Se muestran los últimos {visibles.length} de {eventos.length} eventos.
        </p>
      )}
    </section>
  );
}

/** Segundos → mm:ss. */
function mmss(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── Formularios ──────────────────────────────────────────
function FormUsuario({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { nombre: '', email: '', password: '', rol: 'vendedor' },
  });
  const onSubmit = async (data: any) => {
    setError('');
    try { await authApi.register(data); onSuccess(); }
    catch (e: any) { setError(e.message); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}
      <div className="field">
        <label htmlFor="admin-nombre" className="label">Nombre *</label>
        <input id="admin-nombre" type="text" className="input" {...register('nombre', { required: true })} />
      </div>
      <div className="field">
        <label htmlFor="admin-email" className="label">Correo *</label>
        <input id="admin-email" type="email" className="input" {...register('email', { required: true })} />
      </div>
      <div className="field">
        <label htmlFor="admin-password" className="label">Contraseña *</label>
        <input id="admin-password" type="password" className="input" {...register('password', { required: true, minLength: 8 })} />
        <p className="field-help">Mínimo 8 caracteres.</p>
      </div>
      <div className="field">
        <label htmlFor="admin-rol" className="label">Rol *</label>
        <select id="admin-rol" className="input" {...register('rol')}>
          {OPCIONES_ROL.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">
        {isSubmitting ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  );
}

function CambiarRol({ usuario, onSuccess }: { usuario: UsuarioAdmin; onSuccess: () => void }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { rol: usuario.rol } });
  const onSubmit = async (data: any) => {
    setError('');
    try { await authApi.cambiarRol(usuario.id, data.rol); onSuccess(); }
    catch (e: any) { setError(e.message); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}
      <div className="field">
        <label htmlFor="admin-nuevo-rol" className="label">Nuevo rol para {usuario.nombre}</label>
        <select id="admin-nuevo-rol" className="input" {...register('rol')}>
          {OPCIONES_ROL.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">
        {isSubmitting ? 'Guardando…' : 'Cambiar rol'}
      </button>
    </form>
  );
}
