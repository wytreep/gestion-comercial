import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { authApi } from '../../api/endpoints';
import { Spinner, Empty, Modal, BadgeRol, Confirm } from '../../components/ui';
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
        <h1 className="page-title">Administración de usuarios</h1>
        <button onClick={() => setCreando(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="card bg-blue-50 border-blue-200 text-xs text-blue-700">
        <strong>Roles:</strong> Admin puede todo · Vendedor crea ventas y cobra cartera · Solo lectura solo consulta
      </div>

      {isLoading ? <Spinner /> : usuarios.length === 0 ? <Empty /> : (
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className={!u.activo ? 'opacity-50' : ''}>
                  <td className="font-medium">{u.nombre}</td>
                  <td className="text-gray-500 text-xs">{u.email}</td>
                  <td><BadgeRol rol={u.rol} /></td>
                  <td><span className={u.activo ? 'badge-green' : 'badge-gray'}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="text-xs text-gray-400">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditando(u)} className="btn-secondary btn-sm flex items-center gap-1">
                        <Pencil size={12} /> Rol
                      </button>
                      <button
                        onClick={() => setConfirm({ id: u.id, activo: !u.activo })}
                        className={u.activo ? 'btn-danger btn-sm' : 'btn-success btn-sm'}
                        title={u.activo ? 'Desactivar' : 'Activar'}>
                        <Power size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded">{error}</div>}
      <div className="field"><label className="label">Nombre *</label><input type="text" className="input" {...register('nombre', { required: true })} /></div>
      <div className="field"><label className="label">Correo *</label><input type="email" className="input" {...register('email', { required: true })} /></div>
      <div className="field"><label className="label">Contraseña *</label><input type="password" className="input" {...register('password', { required: true, minLength: 8 })} /></div>
      <div className="field">
        <label className="label">Rol *</label>
        <select className="input" {...register('rol')}>
          {OPCIONES_ROL.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
      {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded">{error}</div>}
      <div className="field">
        <label className="label">Nuevo rol para {usuario.nombre}</label>
        <select className="input" {...register('rol')}>
          {OPCIONES_ROL.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">
        {isSubmitting ? 'Guardando…' : 'Cambiar rol'}
      </button>
    </form>
  );
}
