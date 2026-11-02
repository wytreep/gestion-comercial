import { useQuery } from '@tanstack/react-query';
import { carteraApi } from '../../api/endpoints';
import { Spinner } from '../../components/ui';
import { formatCOP, formatDate } from '../../utils/format';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function CarteraPage() {
  const { data, isLoading } = useQuery({ queryKey: ['cartera'], queryFn: carteraApi.get });
  if (isLoading) return <Spinner size="lg" />;
  const { cartera = [], vencidas = [] } = data ?? {};
  return (
    <div className="space-y-6">
      <div className="page-header"><h1 className="page-title">Cartera — Cuentas por cobrar</h1></div>
      {vencidas.length > 0 && (
        <div className="card border-l-4 border-l-danger bg-red-50">
          <div className="flex items-center gap-2 mb-4"><AlertTriangle size={18} className="text-danger" /><p className="text-sm font-semibold text-danger">Deudas vencidas ({vencidas.length})</p></div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Venta</th><th>Cliente</th><th>Vencimiento</th><th>Días mora</th><th>Saldo</th></tr></thead>
              <tbody>
                {vencidas.map((v: any) => (
                  <tr key={v.venta_id}>
                    <td className="font-mono text-gray-400">#{v.venta_id}</td>
                    <td className="font-medium">{v.cliente}</td>
                    <td className="text-xs">{formatDate(v.fecha_vencimiento)}</td>
                    <td className="font-semibold text-danger">{v.dias_vencido} días</td>
                    <td className="font-mono font-bold text-danger">{formatCOP(v.saldo_pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {cartera.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3"><CheckCircle size={40} className="text-success" /><p className="text-success font-semibold">¡Sin cartera pendiente! Todo al día.</p></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><p className="text-sm font-semibold text-gray-700">Clientes con saldo pendiente</p></div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Cliente</th><th>Teléfono</th><th>Pedidos</th><th>Total ventas</th><th>Total pagado</th><th>Saldo</th></tr></thead>
              <tbody>
                {cartera.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.nombre}</td>
                    <td className="text-gray-400 text-sm">{c.telefono ?? '—'}</td>
                    <td className="text-center">{c.pedidos_pendientes}</td>
                    <td className="font-mono">{formatCOP(c.total_ventas)}</td>
                    <td className="font-mono text-success">{formatCOP(c.total_pagado)}</td>
                    <td className="font-mono font-bold text-danger">{formatCOP(c.saldo_total)}</td>
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
