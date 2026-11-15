import { useQuery } from '@tanstack/react-query';
import { stockApi } from '../../api/endpoints';
import { Alert, Spinner, Empty, BadgeMovimiento } from '../../components/ui';
import { formatDateTime, formatCantidad, num, plural } from '../../utils/format';
import { Boxes } from 'lucide-react';

export default function StockPage() {
  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['stock-movimientos'],
    queryFn:  stockApi.movimientos,
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Movimientos de stock</h1>
          <p className="page-subtitle">Trazabilidad completa de entradas, salidas y ajustes</p>
        </div>
        {!isLoading && movimientos.length > 0 && (
          <span className="chip">{plural(movimientos.length, 'movimiento')}</span>
        )}
      </div>

      <Alert
        type="info"
        message="Registro completo de entradas y salidas de inventario. Positivo = entrada · Negativo = salida."
      />

      {isLoading ? <Spinner /> : movimientos.length === 0 ? (
        <div className="card">
          <Empty
            icon={<Boxes size={18} />}
            title="Sin movimientos registrados"
            description="Los movimientos aparecen cuando registras compras, ventas o ajustes de inventario."
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Historial de inventario</p>
              <p className="text-2xs text-muted">Ordenado del más reciente al más antiguo</p>
            </div>
          </div>
          <div className="scroll-slim max-h-[70vh] overflow-auto">
            <table className="table-base table-sticky">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">Stock anterior</th>
                  <th className="text-right">Stock nuevo</th>
                  <th>Motivo</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m: any) => (
                  <tr key={m.id}>
                    <td className="font-mono text-muted">#{m.id}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(m.created_at)}</td>
                    <td className="font-medium text-slate-800">{m.producto}</td>
                    <td><BadgeMovimiento tipo={m.tipo} /></td>
                    <td className={`num font-semibold ${num(m.cantidad) > 0 ? 'text-success' : 'text-danger'}`}>
                      {num(m.cantidad) > 0 ? '+' : ''}{formatCantidad(m.cantidad)}
                    </td>
                    <td className="num text-muted">{formatCantidad(m.stock_anterior)}</td>
                    <td className="num font-semibold text-slate-900">{formatCantidad(m.stock_nuevo)}</td>
                    <td className="max-w-[180px] truncate text-muted" title={m.motivo ?? undefined}>{m.motivo ?? '—'}</td>
                    <td className="text-muted">{m.usuario ?? '—'}</td>
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
