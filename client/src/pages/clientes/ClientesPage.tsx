import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { clientesApi } from '../../api/endpoints';
import { Alert, Spinner, Empty, Modal } from '../../components/ui';
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
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Datos de contacto y notas de cada cliente</p>
        </div>
        <button onClick={() => setCreando(true)} className="btn-primary">
          <Plus size={15} aria-hidden="true" /> Nuevo cliente
        </button>
      </div>

      <div className="toolbar no-print">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="clientes-buscar" className="sr-only">Buscar clientes</label>
          <input
            id="clientes-buscar"
            type="search"
            placeholder="Buscar por nombre o teléfono…"
            className="input pl-8"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <span className="ml-auto chip">{clientes.length} cliente(s)</span>
      </div>

      {isLoading ? <Spinner /> : clientes.length === 0 ? (
        <div className="card">
          <Empty
            title={busqueda ? 'Sin coincidencias' : 'Aún no hay clientes'}
            description={busqueda ? 'Prueba con otro nombre o teléfono.' : 'Registra el primer cliente para asociarlo a tus ventas.'}
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Notas</th>
                  <th className="text-right"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-slate-800">{c.nombre}</td>
                    <td className="whitespace-nowrap text-muted">{c.telefono ?? '—'}</td>
                    <td className="text-muted">{c.direccion ?? '—'}</td>
                    <td className="max-w-[240px] truncate text-muted" title={c.notas ?? undefined}>{c.notas ?? '—'}</td>
                    <td>
                      <div className="flex justify-end">
                        <button onClick={() => setEditando(c)} className="btn-secondary btn-sm" aria-label={`Editar el cliente ${c.nombre}`} title="Editar cliente">
                          <Pencil size={12} aria-hidden="true" />
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
      {error && <Alert type="error" message={error} />}
      <div className="field">
        <label htmlFor="cliente-nombre" className="label">Nombre *</label>
        <input id="cliente-nombre" type="text" className="input" {...register('nombre', { required: true })} />
      </div>
      <div className="field">
        <label htmlFor="cliente-telefono" className="label">Teléfono</label>
        <input id="cliente-telefono" type="tel" className="input" {...register('telefono')} />
      </div>
      <div className="field">
        <label htmlFor="cliente-direccion" className="label">Dirección</label>
        <input id="cliente-direccion" type="text" className="input" {...register('direccion')} />
      </div>
      <div className="field">
        <label htmlFor="cliente-notas" className="label">Notas</label>
        <input id="cliente-notas" type="text" className="input" {...register('notas')} />
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">{isSubmitting ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Crear cliente'}</button>
    </form>
  );
}
