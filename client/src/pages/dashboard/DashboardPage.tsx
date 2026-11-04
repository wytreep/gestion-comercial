import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, Banknote, Boxes, Clock3,
  HandCoins, PlusCircle, ReceiptText, TrendingUp, Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { dashboardApi, finanzasApi } from '../../api/endpoints';
import { KpiCard, Spinner, BadgeEstadoPago, BadgeEstadoPedido, BadgeDestino } from '../../components/ui';
import { currentMonthKey, formatCOP, formatCantidad, formatPct } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import PanelVendedor from './PanelVendedor';

const C = { blue: '#0b5cab', green: '#157347', teal: '#0f766e', amber: '#b45309', red: '#b42318', slate: '#94a3b8' };

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 4,
  border: '1px solid #dfe4ea',
  boxShadow: '0 8px 24px rgba(16,24,40,.12)',
};

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <PanelAdmin /> : <PanelVendedor />;
}

function PanelAdmin() {
  const navigate = useNavigate();
  const mes = currentMonthKey();

  const dash = useQuery({
    queryKey: ['dashboard'],
    queryFn:  dashboardApi.get,
    refetchInterval: 60_000,
  });
  const fin = useQuery({
    queryKey: ['finanzas', mes],
    queryFn:  () => finanzasApi.get(mes),
    refetchInterval: 60_000,
  });

  if (dash.isLoading || fin.isLoading) return <Spinner size="lg" />;
  if (dash.error || fin.error || !dash.data || !fin.data) {
    return (
      <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
        No fue posible cargar el panel de control.
      </div>
    );
  }

  const data = dash.data;
  const f = fin.data;
  const er = f.estado_resultados;
  const ind = f.indicadores;
  const flujo = f.flujo;
  const comparativo = f.comparativo;

  const variacion = (actual: number, previo: number) =>
    previo > 0 ? ((actual - previo) / previo) * 100 : null;

  const maxSaldo = Math.max(...(data.saldos_destino ?? []).map((s) => s.total), 1);
  const serieFlujo = flujo.serie_diaria;

  return (
    <div className="space-y-4">
      {/* ── Encabezado ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-subtitle">
            Resumen operativo y financiero · {f.periodo_label}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/finanzas')} className="btn-secondary">
            <Wallet size={14} /> Ver finanzas
          </button>
          <button onClick={() => navigate('/ventas/nueva')} className="btn-primary">
            <PlusCircle size={14} /> Nueva venta
          </button>
        </div>
      </div>

      {/* ── Alertas ─────────────────────────────────── */}
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

      {/* ── KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Ventas del mes"
          value={formatCOP(er.ingresos_operacionales)}
          sub={`${er.pedidos} pedido${er.pedidos === 1 ? '' : 's'}`}
          color="blue"
          icon={<ReceiptText size={14} />}
          trend={ind.crecimiento_ventas}
          trendLabel="vs. mes anterior"
        />
        <KpiCard
          label="Utilidad bruta"
          value={formatCOP(er.utilidad_bruta)}
          sub={`Margen ${formatPct(er.margen_bruto)}`}
          color="emerald"
          icon={<TrendingUp size={14} />}
          trend={variacion(er.utilidad_bruta, comparativo.utilidad_bruta)}
          trendLabel="vs. mes anterior"
        />
        <KpiCard
          label="Flujo neto de caja"
          value={formatCOP(flujo.neto)}
          sub={`Cobros ${formatCOP(flujo.ingresos)}`}
          color={flujo.neto >= 0 ? 'green' : 'red'}
          icon={<Banknote size={14} />}
        />
        <KpiCard
          label="Cartera pendiente"
          value={formatCOP(ind.cartera)}
          sub={`DSO ${ind.dso.toFixed(1)} días`}
          color="orange"
          icon={<Clock3 size={14} />}
        />
        <KpiCard
          label="Ticket promedio"
          value={formatCOP(ind.ticket_promedio)}
          sub={`${formatPct(ind.cartera_sobre_ventas)} de cartera sobre ventas`}
          color="teal"
          icon={<HandCoins size={14} />}
        />
      </div>

      {/* ── Tendencia + estado de resultados ────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="card-title">Evolución de ventas y utilidad</p>
              <p className="mt-0.5 text-[10.5px] text-slate-500">Últimos 6 meses · utilidad operativa</p>
            </div>
            <TrendingUp size={15} className="text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={255}>
            <ComposedChart data={f.tendencia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 9.5, fill: '#94a3b8' }}
                tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}K`}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip formatter={(v: any, name: any) => [formatCOP(Number(v)), String(name)]} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} />
              <Bar dataKey="ventas" name="Ventas" fill={C.blue} barSize={20} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="utilidad_operativa" name="Utilidad operativa" stroke={C.teal} strokeWidth={2} dot={{ r: 2.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel">
          <div className="card-header">
            <div>
              <p className="text-[12px] font-semibold text-slate-800">Estado de resultados</p>
              <p className="text-[10.5px] text-slate-500">Resumen del período</p>
            </div>
            <button onClick={() => navigate('/finanzas')} className="btn-ghost">
              Detalle <ArrowRight size={12} />
            </button>
          </div>
          <table className="table-base table-dense">
            <tbody>
              <MiniRow label="Ventas netas" value={formatCOP(er.ingresos_operacionales)} strong />
              <MiniRow label="Costo de ventas" value={`(${formatCOP(er.costo_ventas)})`} muted />
              <MiniRow label="Utilidad bruta" value={formatCOP(er.utilidad_bruta)} strong positive />
              <MiniRow label="Gastos operativos" value={`(${formatCOP(er.gastos_operativos)})`} muted />
              <MiniRow
                label="Utilidad operativa"
                value={formatCOP(er.utilidad_operativa)}
                strong
                positive={er.utilidad_operativa >= 0}
              />
            </tbody>
            <tfoot>
              <tr>
                <td>Márgenes</td>
                <td className="text-right font-mono text-[11px]">
                  {formatPct(er.margen_bruto)} / {formatPct(er.margen_operativo)}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Punto de equilibrio</span>
              <span className="font-mono font-semibold text-slate-800">{formatCOP(ind.punto_equilibrio)}</span>
            </div>
            <div className="mt-2 progress-track">
              <div
                className={clsx('progress-bar', ind.ventas >= ind.punto_equilibrio ? 'bg-success' : 'bg-danger')}
                style={{ width: `${Math.min(100, ind.punto_equilibrio > 0 ? (ind.ventas / ind.punto_equilibrio) * 100 : 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[9.5px] text-slate-500">
              {ind.ventas >= ind.punto_equilibrio
                ? `Superado por ${formatCOP(ind.ventas - ind.punto_equilibrio)}`
                : `Faltan ${formatCOP(ind.punto_equilibrio - ind.ventas)}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Caja + destinos ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="card-title">Cobros vs. compras del mes</p>
              <p className="mt-0.5 text-[10.5px] text-slate-500">Flujo diario de caja</p>
            </div>
            <Banknote size={15} className="text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={serieFlujo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}K`}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip formatter={(v: any, name: any) => [formatCOP(Number(v)), String(name)]} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} />
              <Bar dataKey="ingresos" name="Cobros" fill={C.green} barSize={9} radius={[2, 2, 0, 0]} />
              <Bar dataKey="egresos" name="Compras" fill={C.red} barSize={9} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke={C.blue} strokeWidth={1.8} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="card-title">Saldos por destino</p>
            <Wallet size={15} className="text-slate-400" />
          </div>
          {data.saldos_destino?.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-slate-500">Sin cobros registrados</p>
          ) : (
            <div className="space-y-3">
              {(data.saldos_destino ?? []).map((s) => (
                <div key={s.destino_dinero}>
                  <div className="mb-1 flex items-center justify-between">
                    <BadgeDestino destino={s.destino_dinero} />
                    <span className="font-mono text-[11.5px] font-semibold text-slate-800">{formatCOP(s.total)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar bg-teal" style={{ width: `${Math.min(100, (s.total / maxSaldo) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px]">
            <span className="text-slate-500">Posición de caja</span>
            <span className={clsx('font-mono font-semibold', flujo.posicion_caja >= 0 ? 'text-success' : 'text-danger')}>
              {formatCOP(flujo.posicion_caja)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stock + últimas ventas ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="card-title">Stock actual</p>
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
          </div>
          <button onClick={() => navigate('/productos')} className="btn-ghost mt-3 w-full justify-between border-t border-line pt-2.5">
            Gestionar inventario <ArrowUpRight size={12} />
          </button>
        </div>

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
      </div>
    </div>
  );
}

function MiniRow({
  label, value, strong, muted, positive,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  positive?: boolean;
}) {
  return (
    <tr className={strong ? 'bg-slate-50/50' : undefined}>
      <td className={clsx('py-2 px-3', strong ? 'font-semibold text-slate-900' : 'text-slate-600', muted && 'text-slate-500')}>
        {label}
      </td>
      <td className={clsx(
        'py-2 px-3 text-right font-mono',
        strong ? 'font-semibold' : 'font-medium',
        positive === true ? 'text-success' : positive === false ? 'text-danger' : 'text-slate-800',
      )}>
        {value}
      </td>
    </tr>
  );
}
