import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, Boxes, Clock3, HandCoins,
  PlusCircle, ReceiptText, Users,
} from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import { KpiCard, Spinner, BadgeEstadoPago, BadgeEstadoPedido } from '../../components/ui';
import { currentMonthKey, formatCOP, formatCantidad, formatMes } from '../../utils/format';

export default function PanelVendedor() {
  const navigate = useNavigate();
  const mes = currentMonthKey();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  dashboardApi.get,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Spinner size="lg" />;
  if (error || !data) {
    return (
      <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
        No fue posible cargar el panel de control.
      </div>
    );
  }

  const r = data.resumen_mes;
  const ticket = r.ventas_count > 0 ? r.ventas_total / r.ventas_count : 0;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-subtitle">Resumen operativo · {formatMes(mes)}</p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/cartera')} className="btn-secondary">
            <HandCoins size={14} /> Cobrar cartera
          </button>
          <button onClick={() => navigate('/ventas/nueva')} className="btn-primary">
            <PlusCircle size={14} /> Nueva venta
          </button>
        </div>
      </div>

      {data.notificaciones_pendientes > 0 && (
        <button
          onClick={() => navigate('/notificaciones')}
          className="flex w-full items-center gap-2.5 rounded-sm border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-left text-[12px] text-amber-800 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle size={15} className="shrink-0" />
          <span className="font-medium">
            {data.notificaciones_pendientes} alerta{data.notificaciones_pendientes === 1 ? '' : 's'} pendiente{data.notificaciones_pendientes === 1 ? '' : 's'}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] underline">
            Revisar <ArrowRight size={11} />
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas del mes"
          value={formatCOP(r.ventas_total)}
          sub={`${r.ventas_count} pedido${r.ventas_count === 1 ? '' : 's'}`}
          color="blue"
          icon={<ReceiptText size={14} />}
        />
        <KpiCard
          label="Cobrado en el mes"
          value={formatCOP(r.ingresos_cobrados)}
          sub="Pagos recibidos"
          color="green"
          icon={<HandCoins size={14} />}
        />
        <KpiCard
          label="Cartera pendiente"
          value={formatCOP(r.cartera_pendiente)}
          sub="Saldo por cobrar"
          color="orange"
          icon={<Clock3 size={14} />}
        />
        <KpiCard
          label="Ticket promedio"
          value={formatCOP(ticket)}
          sub="Por pedido"
          color="teal"
          icon={<ReceiptText size={14} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-[12px] font-semibold text-slate-800">Últimas ventas</p>
              <p className="text-[10.5px] text-slate-500">Movimientos recientes</p>
            </div>
            <button onClick={() => navigate('/ventas')} className="btn-ghost">
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base table-dense">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th className="text-right">Total</th>
                  <th>Pago</th>
                  <th>Pedido</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimas_ventas.map((v: any) => (
                  <tr key={v.id}>
                    <td className="font-mono text-slate-500">#{v.id}</td>
                    <td className="font-medium text-slate-700">{v.cliente}</td>
                    <td className="text-slate-500">{v.fecha}</td>
                    <td className="text-right font-mono font-semibold text-slate-900">{formatCOP(v.total)}</td>
                    <td><BadgeEstadoPago estado={v.estado_pago} /></td>
                    <td><BadgeEstadoPedido estado={v.estado_pedido} /></td>
                  </tr>
                ))}
                {data.ultimas_ventas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[11.5px] text-slate-500">Sin ventas registradas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="card-title mb-0">Stock disponible</p>
              <Boxes size={15} className="text-slate-400" />
            </div>
            <div className="space-y-3">
              {data.stock.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-700">{p.nombre}</p>
                    <p className="text-[10px] text-slate-500">{formatCOP(p.precio_venta)} / {p.unidad_medida === 'unidad' ? 'unidad' : 'kg'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[12.5px] font-semibold text-slate-900">{formatCantidad(p.stock_actual)}</p>
                    <p className="text-[9.5px] text-slate-500">{p.unidad_medida === 'canasta' ? 'kg en stock' : p.unidad_medida}</p>
                  </div>
                </div>
              ))}
              {data.stock.length === 0 && <p className="py-4 text-center text-[11.5px] text-slate-500">Sin productos activos</p>}
            </div>
            <button onClick={() => navigate('/productos')} className="btn-ghost mt-3 w-full justify-between border-t border-line pt-2.5">
              Ver productos <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="card">
            <p className="card-title">Accesos rápidos</p>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction label="Nueva venta" icon={<PlusCircle size={16} />} onClick={() => navigate('/ventas/nueva')} />
              <QuickAction label="Clientes" icon={<Users size={16} />} onClick={() => navigate('/clientes')} />
              <QuickAction label="Cartera" icon={<HandCoins size={16} />} onClick={() => navigate('/cartera')} />
              <QuickAction label="Ventas" icon={<ReceiptText size={16} />} onClick={() => navigate('/ventas')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 rounded border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary-50"
    >
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11.5px] font-medium text-slate-700">{label}</span>
    </button>
  );
}
