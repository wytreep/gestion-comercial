import { useQuery } from '@tanstack/react-query';
import { carteraApi } from '../../api/endpoints';
import { Spinner, Empty } from '../../components/ui';
import { formatCOP, formatDate } from '../../utils/format';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CarteraPage() {
  const { data, isLoading } = useQuery({ queryKey: ['cartera'], queryFn: carteraApi.get });

  if (isLoading) return <Spinner size="lg" />;

  const { cartera = [], vencidas = [] } = data ?? {};

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cartera — Cuentas por cobrar</h1>
          <p className="page-subtitle">Saldos pendientes por cliente y deudas vencidas</p>
        </div>
        {cartera.length > 0 && (
          <span className="chip">{cartera.length} cliente(s) con saldo</span>
        )}
      </div>

      {vencidas.length > 0 && (
        <div className="card overflow-hidden border-l-4 border-l-danger p-0">
          <div className="card-header border-b-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangle size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold text-danger">Deudas vencidas</p>
                <p className="text-2xs text-muted">{vencidas.length} venta(s) con pago atrasado</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Vencimiento</th>
                  <th className="text-right">Días de mora</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {vencidas.map((v: any) => (
                  <tr key={v.venta_id}>
                    <td className="font-mono text-muted">#{v.venta_id}</td>
                    <td className="font-medium text-slate-800">{v.cliente}</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(v.fecha_vencimiento)}</td>
                    <td className="text-right font-semibold text-danger">{v.dias_vencido} días</td>
                    <td className="num font-semibold text-danger">{formatCOP(v.saldo_pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cartera.length === 0 ? (
        <div className="card">
          <Empty
            icon={<CheckCircle2 size={20} />}
            title="¡Sin cartera pendiente! Todo al día."
            description="Cuando una venta quede con saldo, aparecerá aquí para gestionar el cobro."
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Clientes con saldo pendiente</p>
              <p className="text-2xs text-muted">Total vendido, pagado y saldo acumulado</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th className="text-right">Pedidos</th>
                  <th className="text-right">Total ventas</th>
                  <th className="text-right">Total pagado</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {cartera.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium text-slate-800">{c.nombre}</td>
                    <td className="text-muted">{c.telefono ?? '—'}</td>
                    <td className="num">{c.pedidos_pendientes}</td>
                    <td className="num">{formatCOP(c.total_ventas)}</td>
                    <td className="num text-success">{formatCOP(c.total_pagado)}</td>
                    <td className="num font-semibold text-danger">{formatCOP(c.saldo_total)}</td>
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
