import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { authApi } from '../../api/endpoints';
import { Alert, Spinner, Empty, Modal, BadgeRol, Confirm } from '../../components/ui';
import { formatDate, OPCIONES_ROL } from '../../utils/format';
import type { UsuarioAdmin } from '../../types';
import { Plus, Pencil, Power } from 'lucide-react';

export default function AdminPage() {
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
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administración de usuarios</h1>
          <p className="page-subtitle">Cuentas, roles y acceso al sistema</p>
        </div>
        <button onClick={() => setCreando(true)} className="btn-primary">
          <Plus size={15} aria-hidden="true" /> Nuevo usuario
        </button>
      </div>

      <Alert
        type="info"
        message="Admin puede todo · Vendedor crea ventas y cobra cartera · Solo lectura únicamente consulta."
      />

      {isLoading ? <Spinner /> : usuarios.length === 0 ? (
        <div className="card"><Empty title="Sin usuarios" description="Crea la primera cuenta para dar acceso al sistema." /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={!u.activo ? 'opacity-60' : undefined}>
                    <td className="font-medium text-slate-800">{u.nombre}</td>
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

      {/* Modal crear */}
      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo usuario">
        <FormUsuario onSuccess={() => { setCreando(false); qc.invalidateQueries({ queryKey: ['usuarios'] }); }} />
      </Modal>

      {/* Modal cambiar rol */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Cambiar rol — ${editando?.nombre}`} size="sm">
        {editando && (
          <CambiarRol usuario={editando}
            onSuccess={() => { setEditando(null); qc.invalidateQueries({ queryKey: ['usuarios'] }); }} />
        )}
      </Modal>

      {/* Confirm toggle */}
      <Confirm
        open={!!confirm}
        title={confirm?.activo ? 'Activar usuario' : 'Desactivar usuario'}
        message={confirm?.activo ? 'El usuario podrá iniciar sesión de nuevo.' : 'El usuario no podrá iniciar sesión.'}
        onConfirm={() => confirm && toggleMut.mutate(confirm)}
        onCancel={() => setConfirm(null)}
        danger={!confirm?.activo}
      />
    </div>
  );
}

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
