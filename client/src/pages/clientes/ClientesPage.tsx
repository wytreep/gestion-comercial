import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { clientesApi } from '../../api/endpoints';
import { Spinner, Empty, Modal } from '../../components/ui';
import type { Cliente } from '../../types';
import { Plus, Search, Pencil } from 'lucide-react';

export default function ClientesPage() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [creando,  setCreando]  = useState(false);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', busqueda],
    queryFn:  () => clientesApi.listar(busqueda || undefined),
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <button onClick={() => setCreando(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar por nombre o teléfono…" className="input pl-9"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>
      {isLoading ? <Spinner /> : clientes.length === 0 ? <Empty message="Sin clientes" /> : (
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id}>
                  <td className="font-medium">{c.nombre}</td>
                  <td className="text-gray-500">{c.telefono ?? '—'}</td>
                  <td className="text-gray-500 text-xs">{c.direccion ?? '—'}</td>
                  <td className="text-gray-400 text-xs">{c.notas ?? '—'}</td>
                  <td><button onClick={() => setEditando(c)} className="btn-secondary btn-sm" aria-label={`Editar el cliente ${c.nombre}`} title="Editar cliente"><Pencil size={12} aria-hidden="true"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo cliente" size="sm">
        <FormCliente onSuccess={() => { setCreando(false); qc.invalidateQueries({ queryKey: ['clientes'] }); }} />
      </Modal>
      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar cliente" size="sm">
        {editando && <FormCliente cliente={editando} onSuccess={() => { setEditando(null); qc.invalidateQueries({ queryKey: ['clientes'] }); }} />}
      </Modal>
    </div>
  );
}

function FormCliente({ cliente, onSuccess }: { cliente?: Cliente; onSuccess: () => void }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { nombre: cliente?.nombre ?? '', telefono: cliente?.telefono ?? '', direccion: cliente?.direccion ?? '', notas: cliente?.notas ?? '' },
  });
  const onSubmit = async (d: any) => {
    setError('');
    try { if (cliente) await clientesApi.editar(cliente.id, d); else await clientesApi.crear(d); onSuccess(); }
    catch (e: any) { setError(e.message); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded">{error}</div>}
      <div className="field"><label htmlFor="cliente-nombre" className="label">Nombre *</label><input id="cliente-nombre" type="text" className="input" {...register('nombre', { required: true })} /></div>
      <div className="field"><label htmlFor="cliente-telefono" className="label">Teléfono</label><input id="cliente-telefono" type="tel" className="input" {...register('telefono')} /></div>
      <div className="field"><label htmlFor="cliente-direccion" className="label">Dirección</label><input id="cliente-direccion" type="text" className="input" {...register('direccion')} /></div>
      <div className="field"><label htmlFor="cliente-notas" className="label">Notas</label><input id="cliente-notas" type="text" className="input" {...register('notas')} /></div>
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">{isSubmitting ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Crear cliente'}</button>
    </form>
  );
}
