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
import { Alert, KpiCard, Spinner, BadgeEstadoPago, BadgeEstadoPedido, BadgeDestino } from '../../components/ui';
import { CHART } from '../../components/charts/theme';
import { currentMonthKey, formatCOP, formatCOPCompact, formatCantidad, formatPct } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import PanelVendedor from './PanelVendedor';

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
    return <Alert type="error" message="No fue posible cargar el panel de control. Intenta recargar la página." />;
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
  const pctEquilibrio = ind.punto_equilibrio > 0 ? (ind.ventas / ind.punto_equilibrio) * 100 : 100;

  return (
    <div className="space-y-5">
      {/* ── Encabezado ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-subtitle">Resumen operativo y financiero · {f.periodo_label}</p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/finanzas')} className="btn-secondary">
            <Wallet size={14} aria-hidden="true" /> Ver finanzas
          </button>
          <button onClick={() => navigate('/ventas/nueva')} className="btn-primary">
            <PlusCircle size={14} aria-hidden="true" /> Nueva venta
          </button>
        </div>
      </div>

      {/* ── Alertas ─────────────────────────────────── */}
      {data.notificaciones_pendientes > 0 && (
        <button
          onClick={() => navigate('/notificaciones')}
          className="flex w-full items-center gap-2.5 rounded border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-left text-xs text-warning transition-colors hover:bg-warning/10"
        >
          <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
          <span className="font-medium">
            {data.notificaciones_pendientes} alerta{data.notificaciones_pendientes === 1 ? '' : 's'} pendiente{data.notificaciones_pendientes === 1 ? '' : 's'}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-tiny underline">
            Revisar <ArrowRight size={11} aria-hidden="true" />
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
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="card-title mb-0.5">Evolución de ventas y utilidad</p>
              <p className="text-2xs text-muted">Últimos 6 meses · utilidad operativa</p>
            </div>
            <TrendingUp size={15} className="text-muted" aria-hidden="true" />
          </div>
          <div role="img" aria-label="Gráfico de evolución de ventas y utilidad operativa de los últimos seis meses">
            <ResponsiveContainer width="100%" height={255}>
              <ComposedChart data={f.tendencia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...CHART.grid} />
                <XAxis dataKey="label" tick={CHART.axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  tick={CHART.axisTick}
                  tickFormatter={formatCOPCompact}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(v: any, name: any) => [formatCOP(Number(v)), String(name)]}
                  {...CHART.tooltip}

                />
                <Legend wrapperStyle={CHART.legend.wrapperStyle} />
                <Bar dataKey="ventas" name="Ventas" fill={CHART.color.blue} barSize={20} radius={CHART.barRadius} />
                <Line
                  type="monotone"
                  dataKey="utilidad_operativa"
                  name="Utilidad operativa"
                  stroke={CHART.color.teal}
                  strokeWidth={2}
                  dot={{ ...CHART.dot, stroke: CHART.color.teal }}
                  activeDot={{ ...CHART.activeDot, stroke: CHART.color.teal }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Estado de resultados</p>
              <p className="text-2xs text-muted">Resumen del período</p>
            </div>
            <button onClick={() => navigate('/finanzas')} className="btn-ghost">
              Detalle <ArrowRight size={12} aria-hidden="true" />
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
                <td>Márgenes (bruto / operativo)</td>
                <td className="text-right font-mono text-tiny tabular-nums">
                  {formatPct(er.margen_bruto)} / {formatPct(er.margen_operativo)}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-center justify-between text-tiny">
              <span className="text-muted">Punto de equilibrio</span>
              <span className="money font-semibold text-slate-800">{formatCOP(ind.punto_equilibrio)}</span>
            </div>
            <div
              className="progress-track mt-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(100, pctEquilibrio))}
              aria-label="Avance sobre el punto de equilibrio"
            >
              <div
                className={clsx('progress-bar', ind.ventas >= ind.punto_equilibrio ? 'bg-success' : 'bg-danger')}
                style={{ width: `${Math.min(100, pctEquilibrio)}%` }}
              />
            </div>
            <p className="mt-1.5 text-2xs text-muted">
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
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="card-title mb-0.5">Cobros vs. compras del mes</p>
              <p className="text-2xs text-muted">Flujo diario de caja</p>
            </div>
            <Banknote size={15} className="text-muted" aria-hidden="true" />
          </div>
          <div role="img" aria-label="Gráfico de cobros, compras y acumulado diario del mes">
            <ResponsiveContainer width="100%" height={190}>
              <ComposedChart data={serieFlujo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...CHART.grid} />
                <XAxis
                  dataKey="label"
                  tick={CHART.axisTick}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={CHART.axisTick}
                  tickFormatter={formatCOPCompact}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <Tooltip
                  formatter={(v: any, name: any) => [formatCOP(Number(v)), String(name)]}
                  {...CHART.tooltip}

                />
                <Legend wrapperStyle={CHART.legend.wrapperStyle} />
                <Bar dataKey="ingresos" name="Cobros" fill={CHART.color.green} barSize={CHART.barSizeNarrow} radius={CHART.barRadius} />
                <Bar dataKey="egresos" name="Compras" fill={CHART.color.red} barSize={CHART.barSizeNarrow} radius={CHART.barRadius} />
                <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke={CHART.color.blue} strokeWidth={1.8} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="card-title mb-0">Saldos por destino</p>
            <Wallet size={15} className="text-muted" aria-hidden="true" />
          </div>
          {data.saldos_destino?.length === 0 ? (
            <p className="py-6 text-center text-tiny text-muted">Sin cobros registrados</p>
          ) : (
            <div className="space-y-3">
              {(data.saldos_destino ?? []).map((s) => {
                const pct = Math.min(100, (s.total / maxSaldo) * 100);
                return (
                  <div key={s.destino_dinero}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <BadgeDestino destino={s.destino_dinero} />
                      <span className="money text-tiny font-semibold text-slate-800">{formatCOP(s.total)}</span>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(pct)}
                      aria-label={`Participación de ${s.destino_dinero} en los saldos`}
                    >
                      <div className="progress-bar bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-tiny">
            <span className="text-muted">Posición de caja</span>
            <span className={clsx('money font-semibold', flujo.posicion_caja >= 0 ? 'text-success' : 'text-danger')}>
              {formatCOP(flujo.posicion_caja)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stock + últimas ventas ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="card-title mb-0">Stock actual</p>
            <Boxes size={15} className="text-muted" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {data.stock.map((p) => (
              <div key={p.nombre} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-700">{p.nombre}</p>
                  <p className="text-2xs text-muted">{formatCOP(p.precio_venta)} / {p.unidad_medida === 'unidad' ? 'unidad' : 'kg'}</p>
                </div>
                <div className="text-right">
                  <p className="money text-xs font-semibold text-slate-900">{formatCantidad(p.stock_actual)}</p>
                  <p className="text-2xs text-muted">{p.unidad_medida === 'canasta' ? 'kg en stock' : p.unidad_medida}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/productos')} className="btn-ghost mt-3 w-full justify-between border-t border-line pt-2.5">
            Gestionar inventario <ArrowUpRight size={12} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Últimas ventas</p>
              <p className="text-2xs text-muted">Movimientos recientes</p>
            </div>
            <button onClick={() => navigate('/ventas')} className="btn-ghost">
              Ver todas <ArrowRight size={12} aria-hidden="true" />
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
                    <td className="font-mono text-muted">#{v.id}</td>
                    <td className="font-medium text-slate-700">{v.cliente}</td>
                    <td className="whitespace-nowrap text-muted">{v.fecha}</td>
                    <td className="num font-semibold text-slate-900">{formatCOP(v.total)}</td>
                    <td><BadgeEstadoPago estado={v.estado_pago} /></td>
                    <td><BadgeEstadoPedido estado={v.estado_pedido} /></td>
                  </tr>
                ))}
                {data.ultimas_ventas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-tiny text-muted">Sin ventas registradas</td>
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
    <tr className={strong ? 'bg-slate-50/60' : undefined}>
      <td className={clsx('py-2', strong ? 'font-semibold text-slate-900' : 'text-slate-600', muted && 'text-muted')}>
        {label}
      </td>
      <td className={clsx(
        'num py-2',
        strong ? 'font-semibold' : 'font-medium',
        positive === true ? 'text-success' : positive === false ? 'text-danger' : 'text-slate-800',
      )}>
        {value}
      </td>
    </tr>
  );
}
