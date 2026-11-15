import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backupApi } from '../../api/endpoints';
import { Alert, Spinner, Empty } from '../../components/ui';
import { formatDateTime, formatBytes } from '../../utils/format';
import { Download, Shield, Database } from 'lucide-react';

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const { data: historial = [], isLoading, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn:  backupApi.historial,
  });

  const handleBackup = async () => {
    setError('');
    setDownloading(true);
    try {
      await backupApi.generar();
      refetch();
    } catch (e: any) {
      setError('Error al generar el backup: ' + (e.message ?? 'intenta de nuevo.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Copias de seguridad</h1>
          <p className="page-subtitle">Exporta toda la información del negocio en un archivo SQL</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div className="card border-l-4 border-l-primary">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary">
            <Shield size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-800">Genera un backup de toda la información</p>
            <p className="text-2xs text-muted">Ventas, compras, clientes, proveedores, pagos y stock</p>
          </div>
        </div>
        <p className="mb-4 text-tiny leading-relaxed text-muted">
          Se exportará un archivo SQL con todos los datos del negocio y se descargará automáticamente.
        </p>
        <button onClick={handleBackup} disabled={downloading} className="btn-primary">
          <Download size={15} aria-hidden="true" />
          {downloading ? 'Generando backup…' : 'Generar y descargar backup'}
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-muted" aria-hidden="true" />
            <p className="text-xs font-semibold text-slate-800">Historial de backups</p>
          </div>
          {historial.length > 0 && <span className="chip">{historial.length} archivo(s)</span>}
        </div>
        {isLoading ? <Spinner /> : historial.length === 0 ? (
          <Empty
            icon={<Database size={18} />}
            title="Sin backups generados"
            description="Genera el primero para tener un respaldo de la base de datos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th className="text-right">Tamaño</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((b: any) => (
                  <tr key={b.id}>
                    <td className="font-mono text-muted">{b.nombre_archivo}</td>
                    <td className="num">{formatBytes(b.tamanio_bytes)}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
