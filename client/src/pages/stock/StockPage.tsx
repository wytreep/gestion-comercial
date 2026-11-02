import { useQuery } from '@tanstack/react-query';
import { stockApi } from '../../api/endpoints';
import { Spinner, Empty, BadgeMovimiento } from '../../components/ui';
import { formatDate, formatDateTime, formatCantidad, num } from '../../utils/format';

export default function StockPage() {
  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['stock-movimientos'],
    queryFn:  stockApi.movimientos,
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Movimientos de stock</h1>
      </div>

      <div className="card bg-blue-50 border-blue-200 text-xs text-blue-700">
        Registro completo de entradas y salidas de inventario. Positivo = entrada · Negativo = salida.
      </div>

      {isLoading ? <Spinner /> : movimientos.length === 0 ? (
        <Empty message="Sin movimientos registrados" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>#</th><th>Fecha</th><th>Producto</th><th>Tipo</th>
                  <th>Cantidad</th><th>Stock anterior</th><th>Stock nuevo</th>
                  <th>Motivo</th><th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m: any) => (
                  <tr key={m.id}>
                    <td className="font-mono text-gray-400 text-xs">#{m.id}</td>
                    <td className="text-xs text-gray-500">{formatDateTime(m.created_at)}</td>
                    <td className="font-medium">{m.producto}</td>
                    <td><BadgeMovimiento tipo={m.tipo} /></td>
                    <td className={`font-mono font-semibold ${num(m.cantidad) > 0 ? 'text-success' : 'text-danger'}`}>
                      {num(m.cantidad) > 0 ? '+' : ''}{formatCantidad(m.cantidad)} kg
                    </td>
                    <td className="font-mono text-gray-500">{formatCantidad(m.stock_anterior)}</td>
                    <td className="font-mono font-semibold">{formatCantidad(m.stock_nuevo)}</td>
                    <td className="text-xs text-gray-400 max-w-[150px] truncate">{m.motivo ?? '—'}</td>
                    <td className="text-xs text-gray-400">{m.usuario ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
