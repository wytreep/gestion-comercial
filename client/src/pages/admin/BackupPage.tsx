import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backupApi } from '../../api/endpoints';
import { Spinner, Empty } from '../../components/ui';
import { formatDateTime, formatBytes } from '../../utils/format';
import { Download, Shield } from 'lucide-react';

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false);

  const { data: historial = [], isLoading, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn:  backupApi.historial,
  });

  const handleBackup = async () => {
    setDownloading(true);
    try {
      await backupApi.generar();
      refetch();
    } catch (e: any) {
      alert('Error al generar backup: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Backup de base de datos</h1>
      </div>

      <div className="card border-l-4 border-l-primary">
        <div className="flex items-center gap-3 mb-3">
          <Shield size={20} className="text-primary" />
          <p className="text-sm font-semibold text-primary">Genera un backup de toda la información</p>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Se exportará un archivo SQL con todos los datos del negocio: ventas, compras, clientes, proveedores, pagos y stock.
          El archivo se descargará automáticamente.
        </p>
        <button onClick={handleBackup} disabled={downloading}
          className="btn-primary flex items-center gap-2">
          <Download size={15} />
          {downloading ? 'Generando backup…' : 'Generar y descargar backup'}
        </button>
      </div>

      <div className="card">
        <p className="card-title">Historial de backups</p>
        {isLoading ? <Spinner /> : historial.length === 0 ? (
          <Empty message="Sin backups generados" />
        ) : (
          <table className="table-base">
            <thead>
              <tr><th>Archivo</th><th>Tamaño</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {historial.map((b: any) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.nombre_archivo}</td>
                  <td className="text-xs">{formatBytes(b.tamanio_bytes)}</td>
                  <td className="text-xs text-gray-500">{formatDateTime(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
