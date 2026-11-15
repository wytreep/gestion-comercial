import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowLeftRight, Calculator, Clock3, FileBarChart2, FileText, Gauge,
  Landmark, LineChart, Percent, Printer, ReceiptText, Scale, TrendingUp,
  Wallet, Boxes, Target,
} from 'lucide-react';
import clsx from 'clsx';
import { finanzasApi } from '../../api/endpoints';
import { Alert, KpiCard, Spinner, BadgeDestino, BadgeMedioPago, Empty } from '../../components/ui';
import { CHART } from '../../components/charts/theme';
import {
  currentMonthKey, formatCantidad, formatCOP, formatCOPCompact, formatPct,
} from '../../utils/format';
import type { FinanzasData, ProductoFinanciero } from '../../types';

const CATEGORIA_GASTO: Record<string, string> = {
  transporte:     'Transporte',
  almacenamiento: 'Almacenamiento',
  otro:           'Otros',
};

type Tab = 'pyl' | 'flujo' | 'indicadores';

export default function FinanzasPage() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(currentMonthKey());
  const [tab, setTab] = useState<Tab>('pyl');

  const { data, isLoading, error } = useQuery({
    queryKey: ['finanzas', mes],
    queryFn:  () => finanzasApi.get(mes),
  });

  if (isLoading) return <Spinner size="lg" />;
  if (error || !data) {
    return <Alert type="error" message="No fue posible cargar la información financiera del período." />;
  }

  const { estado_resultados: er, flujo, indicadores, comparativo } = data;

  const variacion = (actual: number, previo: number) =>
    previo > 0 ? ((actual - previo) / previo) * 100 : null;

  const tendenciaVentas = variacion(er.ingresos_operacionales, comparativo.ventas);
  const tendenciaBruta  = variacion(er.utilidad_bruta, comparativo.utilidad_bruta);
  const tendenciaOper   = variacion(er.utilidad_operativa, comparativo.utilidad_operativa);

  return (
    <div className="space-y-4">
      {/* ── Encabezado ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">
            Estado de resultados, flujo de caja e indicadores · {data.periodo_label}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-end gap-2">
          <div className="field">
            <label htmlFor="finanzas-periodo" className="label">Período</label>
            <input
              id="finanzas-periodo"
              type="month"
              className="input w-auto"
              value={mes}
              onChange={(e) => setMes(e.target.value || currentMonthKey())}
            />
          </div>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={14} aria-hidden="true" /> Imprimir
          </button>
          <button className="btn-secondary" onClick={() => navigate('/reportes')}>
            <FileText size={14} aria-hidden="true" /> Reporte PDF
          </button>
        </div>
      </div>

      {/* ── KPIs del período ────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Ingresos del período"
          value={formatCOP(er.ingresos_operacionales)}
          sub={`${er.pedidos} pedido${er.pedidos === 1 ? '' : 's'} · ${formatCOP(indicadores.ticket_promedio)} ticket`}
          color="blue"
          icon={<ReceiptText size={14} />}
          trend={tendenciaVentas}
          trendLabel={`vs. ${comparativo.periodo_label}`}
        />
        <KpiCard
          label="Utilidad bruta"
          value={formatCOP(er.utilidad_bruta)}
          sub={`Margen bruto ${formatPct(er.margen_bruto)}`}
          color="emerald"
          icon={<TrendingUp size={14} />}
          trend={tendenciaBruta}
          trendLabel="vs. mes anterior"
        />
        <KpiCard
          label="Utilidad operativa"
          value={formatCOP(er.utilidad_operativa)}
          sub={`Margen operativo ${formatPct(er.margen_operativo)}`}
          color="teal"
          icon={<Wallet size={14} />}
          trend={tendenciaOper}
          trendLabel="vs. mes anterior"
        />
        <KpiCard
          label="Flujo neto de caja"
          value={formatCOP(flujo.neto)}
          sub={`Cobros ${formatCOP(flujo.ingresos)} · Compras ${formatCOP(flujo.egresos)}`}
          color={flujo.neto >= 0 ? 'green' : 'red'}
          icon={<ArrowLeftRight size={14} />}
        />
        <KpiCard
          label="Cartera pendiente"
          value={formatCOP(indicadores.cartera)}
          sub={`DSO ${indicadores.dso.toFixed(1)} días · ${formatPct(indicadores.cartera_sobre_ventas)} de ventas`}
          color="orange"
          icon={<Clock3 size={14} />}
        />
      </div>

      {/* ── Pestañas ────────────────────────────────── */}
      <div className="tabs no-print" role="tablist" aria-label="Vistas de finanzas">
        <button
          role="tab"
          aria-selected={tab === 'pyl'}
          className={clsx('tab', tab === 'pyl' && 'tab-active')}
          onClick={() => setTab('pyl')}
        >
          <FileBarChart2 size={14} aria-hidden="true" /> Estado de resultados
        </button>
        <button
          role="tab"
          aria-selected={tab === 'flujo'}
          className={clsx('tab', tab === 'flujo' && 'tab-active')}
          onClick={() => setTab('flujo')}
        >
          <Landmark size={14} aria-hidden="true" /> Flujo de caja
        </button>
        <button
          role="tab"
          aria-selected={tab === 'indicadores'}
          className={clsx('tab', tab === 'indicadores' && 'tab-active')}
          onClick={() => setTab('indicadores')}
        >
          <Gauge size={14} aria-hidden="true" /> Indicadores
        </button>
      </div>

      {tab === 'pyl' && <VistaPyL data={data} />}
      {tab === 'flujo' && <VistaFlujo data={data} />}
      {tab === 'indicadores' && <VistaIndicadores data={data} />}

      <p className="pb-2 text-2xs leading-relaxed text-muted">
        Criterio de cálculo: estado de resultados devengado sobre ventas no canceladas; costo de ventas con el costo
        unitario configurado (costo/kg para productos por canasta); gastos operativos = gastos de compra + reparto;
        flujo de caja = pagos cobrados − compras del período. No incluye IVA ni impuestos.
      </p>
    </div>
  );
}

// ── Vista: Estado de resultados ─────────────────────────

function VistaPyL({ data }: { data: FinanzasData }) {
  const er = data.estado_resultados;
  const base = er.ingresos_operacionales;

  const composicion = [
    { name: 'Ventas',          value: er.ingresos_operacionales, fill: CHART.color.blue  },
    { name: 'Costo de ventas', value: er.costo_ventas,           fill: CHART.color.red   },
    { name: 'Gastos oper.',    value: er.gastos_operativos,      fill: CHART.color.amber },
    { name: 'Utilidad bruta',  value: er.utilidad_bruta,         fill: CHART.color.green },
    { name: 'Utilidad oper.',  value: er.utilidad_operativa,     fill: CHART.color.teal  },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Estado de resultados */}
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Estado de resultados</p>
              <p className="text-2xs text-muted">Del 1 al último día de {data.periodo_label}</p>
            </div>
            <span className="chip">Devengado · sin IVA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th className="text-right">Valor</th>
                  <th className="w-20 text-right">% ventas</th>
                </tr>
              </thead>
              <tbody>
                <PylSection label="Ingresos operacionales" />
                <PylRow label="Ventas netas" value={er.ingresos_operacionales} base={base} strong />
                <PylSection label="Costo de ventas" />
                <PylRow label="Costo de los productos vendidos" value={er.costo_ventas} base={base} negative />
                <PylRow label="Utilidad bruta" value={er.utilidad_bruta} base={base} strong />
                <PylSection label="Gastos operativos" />
                {er.detalle_gastos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-tiny text-muted">
                      Sin gastos operativos registrados en el período.
                    </td>
                  </tr>
                )}
                {er.detalle_gastos.map((g) => (
                  <PylRow
                    key={`${g.categoria}-${g.nombre}`}
                    label={`${g.nombre} · ${CATEGORIA_GASTO[g.categoria] ?? g.categoria}`}
                    value={g.monto}
                    base={base}
                    negative
                    indent
                  />
                ))}
                <PylRow label="Total gastos operativos" value={er.gastos_operativos} base={base} negative strong />
                <PylRow label="Utilidad operativa" value={er.utilidad_operativa} base={base} strong />
              </tbody>
              <tfoot>
                <tr>
                  <td>Margen bruto / operativo</td>
                  <td className="num">
                    {formatPct(er.margen_bruto)} / {formatPct(er.margen_operativo)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Composición + resumen */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="card-title mb-0.5">Composición del resultado</p>
                <p className="text-2xs text-muted">Valores del período</p>
              </div>
              <Scale size={15} className="text-muted" aria-hidden="true" />
            </div>
            <div role="img" aria-label="Composición del resultado: ventas, costo de ventas, gastos, utilidad bruta y utilidad operativa">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={composicion} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.color.grid} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={CHART.axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => [formatCOP(Number(v)), 'Valor']}
                    {...CHART.tooltip}
                  />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={16}>
                    {composicion.map((c) => <Cell key={c.name} fill={c.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <p className="card-title mb-3">Lectura rápida</p>
            <div className="space-y-2.5">
              <MiniStat label="Margen bruto" value={formatPct(er.margen_bruto)} sub="Utilidad bruta / ventas" />
              <MiniStat label="Margen operativo" value={formatPct(er.margen_operativo)} sub="Después de gastos operativos" />
              <MiniStat
                label="Punto de equilibrio"
                value={formatCOP(data.indicadores.punto_equilibrio)}
                sub={`Ventas del mes ${formatCOP(er.ingresos_operacionales)}`}
              />
              <MiniStat
                label="Cobertura de gastos"
                value={`${data.indicadores.cobertura_gastos.toFixed(2)}x`}
                sub="Utilidad bruta / gastos operativos"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gastos por categoría + productos */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="card-title mb-0">Gastos por categoría</p>
            <Calculator size={15} className="text-muted" aria-hidden="true" />
          </div>
          {er.gastos_por_categoria.length === 0 ? (
            <Empty message="Sin gastos en el período" />
          ) : (
            <div className="space-y-3">
              {er.gastos_por_categoria.map((g) => {
                const pct = er.gastos_operativos > 0 ? (g.monto / er.gastos_operativos) * 100 : 0;
                return (
                  <div key={g.categoria}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-tiny">
                      <span className="text-slate-600">{CATEGORIA_GASTO[g.categoria] ?? g.categoria}</span>
                      <span className="money font-semibold text-slate-800">{formatCOP(g.monto)}</span>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(Math.min(100, pct))}
                      aria-label={`Participación de ${CATEGORIA_GASTO[g.categoria] ?? g.categoria} en los gastos`}
                    >
                      <div className="progress-bar bg-warning" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-line pt-2 text-tiny">
                <span className="font-medium text-muted">Total gastos</span>
                <span className="money font-semibold text-slate-900">{formatCOP(er.gastos_operativos)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Rentabilidad por producto</p>
              <p className="text-2xs text-muted">Ventas, costo y margen del período</p>
            </div>
            <span className="chip">{data.productos.length} producto(s)</span>
          </div>
          {data.productos.length === 0 ? (
            <Empty message="Sin ventas registradas en el período" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base table-dense">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Unidades</th>
                    <th className="text-right">Ventas</th>
                    <th className="text-right">Costo</th>
                    <th className="text-right">Utilidad</th>
                    <th className="text-right">Margen</th>
                    <th className="w-24">Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productos.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium text-slate-800">{p.nombre}</p>
                        <p className="text-2xs capitalize text-muted">{p.unidad_medida}</p>
                      </td>
                      <td className="num">{formatCantidad(p.unidades)}</td>
                      <td className="num">{formatCOP(p.ventas)}</td>
                      <td className="num text-muted">{formatCOP(p.costo)}</td>
                      <td className={clsx('num font-semibold', p.utilidad >= 0 ? 'text-success' : 'text-danger')}>
                        {formatCOP(p.utilidad)}
                      </td>
                      <td className={clsx('num font-semibold', p.margen >= 0 ? 'text-slate-700' : 'text-danger')}>
                        {formatPct(p.margen)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="progress-track w-12"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(Math.min(100, p.participacion))}
                            aria-label={`Participación de ${p.nombre}`}
                          >
                            <div className="progress-bar" style={{ width: `${Math.min(100, p.participacion)}%` }} />
                          </div>
                          <span className="text-2xs text-muted">{formatPct(p.participacion)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vista: Flujo de caja ───────────────────────────────

function VistaFlujo({ data }: { data: FinanzasData }) {
  const f = data.flujo;
  const serie = f.serie_diaria;
  const maxSaldo = Math.max(...f.saldos_destino.map((s) => s.total), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="card-title mb-0.5">Cobros vs. egresos por día</p>
              <p className="text-2xs text-muted">Caja real del período · línea = acumulado</p>
            </div>
            <LineChart size={15} className="text-muted" aria-hidden="true" />
          </div>
          <div role="img" aria-label="Gráfico diario de cobros, compras y caja acumulada del período">
            <ResponsiveContainer width="100%" height={270}>
              <ComposedChart data={serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...CHART.grid} />
                <XAxis
                  dataKey="label"
                  tick={CHART.axisTick}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={CHART.axisTick}
                  tickFormatter={formatCOPCompact}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={CHART.axisTick}
                  tickFormatter={formatCOPCompact}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <Tooltip formatter={(v: any, name: any) => [formatCOP(Number(v)), String(name)]} {...CHART.tooltip} />
                <Legend wrapperStyle={CHART.legend.wrapperStyle} />
                <ReferenceLine y={0} yAxisId="left" stroke={CHART.color.slate} />
                <Bar yAxisId="left" dataKey="ingresos" name="Cobros" fill={CHART.color.green} barSize={CHART.barSizeNarrow} radius={CHART.barRadius} />
                <Bar yAxisId="left" dataKey="egresos" name="Compras" fill={CHART.color.red} barSize={CHART.barSizeNarrow} radius={CHART.barRadius} />
                <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke={CHART.color.blue} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="card-title mb-0.5">Saldos por destino</p>
              <p className="text-2xs text-muted">Cobros del período</p>
            </div>
            <Landmark size={15} className="text-muted" aria-hidden="true" />
          </div>
          {f.saldos_destino.length === 0 ? (
            <Empty message="Sin cobros en el período" />
          ) : (
            <div className="space-y-3">
              {f.saldos_destino.map((s) => {
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
                      aria-label={`Participación de ${s.destino_dinero} en los cobros`}
                    >
                      <div className="progress-bar bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-2xs text-muted">{s.transacciones} transacción(es)</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 border-t border-line pt-3">
            <p className="section-label mb-2">Por medio de pago</p>
            {f.por_medio.length === 0 ? (
              <p className="text-tiny text-muted">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {f.por_medio.map((m) => (
                  <div key={m.medio_pago} className="flex items-center justify-between">
                    <BadgeMedioPago medio={m.medio_pago as 'efectivo' | 'transferencia'} />
                    <span className="money text-tiny text-slate-700">{formatCOP(m.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel-dark p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold uppercase tracking-widest text-slate-400">Posición de caja</p>
            <Wallet size={15} className="text-slate-400" aria-hidden="true" />
          </div>
          <p className={clsx('mt-2 font-mono text-[26px] font-semibold tabular-nums', f.posicion_caja >= 0 ? 'text-success-invert' : 'text-danger-invert')}>
            {formatCOP(f.posicion_caja)}
          </p>
          <p className="mt-1 text-2xs text-slate-400">Cobros históricos − compras históricas</p>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-tiny">
            <DarkRow label="Cobros del período" value={formatCOP(f.ingresos)} />
            <DarkRow label="Compras del período" value={formatCOP(f.egresos)} />
            <DarkRow label="Flujo neto" value={formatCOP(f.neto)} strong valueClass={f.neto >= 0 ? 'text-success-invert' : 'text-danger-invert'} />
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Compras y egresos del período</p>
              <p className="text-2xs text-muted">{f.num_compras} compra(s) registrada(s)</p>
            </div>
            <Boxes size={15} className="text-muted" />
          </div>
          {f.egresos_detalle.length === 0 ? (
            <Empty message="Sin compras en el período" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base table-dense">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th className="text-right">Productos</th>
                    <th className="text-right">Gastos</th>
                    <th className="text-right">Inversión</th>
                  </tr>
                </thead>
                <tbody>
                  {f.egresos_detalle.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-muted">#{c.id}</td>
                      <td className="whitespace-nowrap text-muted">{formatFechaCorta(c.fecha_compra)}</td>
                      <td className="font-medium text-slate-700">{c.proveedor}</td>
                      <td className="num">{formatCOP(c.total_productos)}</td>
                      <td className="num text-muted">{formatCOP(c.total_gastos)}</td>
                      <td className="num font-semibold text-slate-900">{formatCOP(c.total_inversion)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>Total egresos</td>
                    <td className="num">{formatCOP(f.egresos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel">
        <div className="card-header">
          <div>
            <p className="text-xs font-semibold text-slate-800">Detalle diario de caja</p>
            <p className="text-2xs text-muted">Movimiento acumulado del período</p>
          </div>
          <span className="chip">{serie.length} día(s)</span>
        </div>
        <div className="max-h-[340px] overflow-auto scroll-slim">
          <table className="table-base table-dense table-sticky">
            <thead>
              <tr>
                <th>Fecha</th>
                <th className="text-right">Cobros</th>
                <th className="text-right">Compras</th>
                <th className="text-right">Neto</th>
                <th className="text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((d) => (
                <tr key={d.fecha}>
                  <td className="whitespace-nowrap text-muted">{d.label}</td>
                  <td className="num text-success">{d.ingresos ? formatCOP(d.ingresos) : '—'}</td>
                  <td className="num text-danger">{d.egresos ? formatCOP(d.egresos) : '—'}</td>
                  <td className={clsx('num font-semibold', d.neto >= 0 ? 'text-slate-700' : 'text-danger')}>
                    {formatCOP(d.neto)}
                  </td>
                  <td className={clsx('num font-semibold', d.acumulado >= 0 ? 'text-slate-800' : 'text-danger')}>
                    {formatCOP(d.acumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Vista: Indicadores ─────────────────────────────────

function VistaIndicadores({ data }: { data: FinanzasData }) {
  const i = data.indicadores;
  const tendencia = data.tendencia;
  const porEncima = i.ventas - i.punto_equilibrio;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <IndicadorCard
          icon={<ReceiptText size={14} />}
          label="Ticket promedio"
          value={formatCOP(i.ticket_promedio)}
          sub={`${i.pedidos} pedido(s) en el período`}
        />
        <IndicadorCard
          icon={<Percent size={14} />}
          label="Margen bruto"
          value={formatPct(i.margen_bruto)}
          sub="Utilidad bruta / ventas"
          accent={i.margen_bruto >= 0 ? 'text-success' : 'text-danger'}
        />
        <IndicadorCard
          icon={<TrendingUp size={14} />}
          label="Margen operativo"
          value={formatPct(i.margen_operativo)}
          sub="Después de gastos operativos"
          accent={i.margen_operativo >= 0 ? 'text-success' : 'text-danger'}
        />
        <IndicadorCard
          icon={<Target size={14} />}
          label="Punto de equilibrio"
          value={formatCOP(i.punto_equilibrio)}
          sub={porEncima >= 0 ? `Superado por ${formatCOP(porEncima)}` : `Faltan ${formatCOP(Math.abs(porEncima))}`}
          accent={porEncima >= 0 ? 'text-slate-900' : 'text-danger'}
        />
        <IndicadorCard
          icon={<Clock3 size={14} />}
          label="Días de cartera (DSO)"
          value={`${i.dso.toFixed(1)} días`}
          sub={`Cartera ${formatCOP(i.cartera)}`}
        />
        <IndicadorCard
          icon={<Boxes size={14} />}
          label="Rotación de inventario"
          value={`${i.rotacion_inventario.toFixed(2)}x`}
          sub={`Inventario valorizado ${formatCOP(i.valor_inventario)}`}
        />
        <IndicadorCard
          icon={<Scale size={14} />}
          label="Cobertura de gastos"
          value={`${i.cobertura_gastos.toFixed(2)}x`}
          sub="Utilidad bruta / gastos operativos"
          accent={i.cobertura_gastos >= 1 ? 'text-success' : 'text-danger'}
        />
        <IndicadorCard
          icon={<Wallet size={14} />}
          label="Cartera sobre ventas"
          value={formatPct(i.cartera_sobre_ventas)}
          sub={`Saldo de caja ${formatCOP(i.saldo_caja)}`}
          accent={i.cartera_sobre_ventas <= 30 ? 'text-slate-900' : 'text-warning'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="card-title mb-0.5">Tendencia de los últimos 6 meses</p>
              <p className="text-2xs text-muted">Ventas, utilidad operativa y flujo de caja</p>
            </div>
            <TrendingUp size={15} className="text-muted" aria-hidden="true" />
          </div>
          <div role="img" aria-label="Gráfico de tendencia de ventas, utilidad operativa y flujo de caja de los últimos seis meses">
            <ResponsiveContainer width="100%" height={290}>
              <ComposedChart data={tendencia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...CHART.grid} />
                <XAxis dataKey="label" tick={CHART.axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  tick={CHART.axisTick}
                  tickFormatter={formatCOPCompact}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip formatter={(v: any, name: any) => [formatCOP(Number(v)), String(name)]} {...CHART.tooltip} />
                <Legend wrapperStyle={CHART.legend.wrapperStyle} />
                <ReferenceLine y={0} stroke={CHART.color.slate} />
                <Bar dataKey="ventas" name="Ventas" fill={CHART.color.blue} barSize={CHART.barSize} radius={CHART.barRadius} />
                <Bar dataKey="utilidad_operativa" name="Utilidad operativa" fill={CHART.color.teal} barSize={CHART.barSize} radius={CHART.barRadius} />
                <Line
                  type="monotone"
                  dataKey="flujo"
                  name="Flujo de caja"
                  stroke={CHART.color.amber}
                  strokeWidth={2}
                  dot={{ ...CHART.dot, stroke: CHART.color.amber }}
                  activeDot={{ ...CHART.activeDot, stroke: CHART.color.amber }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="card-title mb-0">Lectura del período</p>
            <Gauge size={15} className="text-muted" aria-hidden="true" />
          </div>
          <ul className="space-y-3 text-tiny leading-relaxed text-slate-600">
            <Insight>
              {i.crecimiento_ventas == null
                ? 'No hay ventas del mes anterior para comparar el crecimiento.'
                : `Las ventas ${i.crecimiento_ventas >= 0 ? 'crecieron' : 'cayeron'} ${formatPct(Math.abs(i.crecimiento_ventas))} frente a ${data.comparativo.periodo_label}.`}
            </Insight>
            <Insight>
              El margen bruto fue <strong>{formatPct(i.margen_bruto)}</strong> y el margen operativo{' '}
              <strong>{formatPct(i.margen_operativo)}</strong>.
            </Insight>
            <Insight>
              {porEncima >= 0
                ? `Las ventas superaron el punto de equilibrio por ${formatCOP(porEncima)}.`
                : `Faltaron ${formatCOP(Math.abs(porEncima))} en ventas para alcanzar el punto de equilibrio.`}
            </Insight>
            <Insight>
              La cartera pendiente es <strong>{formatCOP(i.cartera)}</strong>, equivalente a{' '}
              <strong>{i.dso.toFixed(1)} días</strong> de ventas.
            </Insight>
            <Insight>
              El flujo neto del período fue{' '}
              <strong className={i.flujo_neto >= 0 ? 'text-success' : 'text-danger'}>
                {formatCOP(i.flujo_neto)}
              </strong>{' '}
              y la posición de caja histórica es <strong>{formatCOP(i.saldo_caja)}</strong>.
            </Insight>
            <Insight>
              La rotación de inventario fue <strong>{i.rotacion_inventario.toFixed(2)} veces</strong> en el mes.
            </Insight>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Ranking de productos por utilidad</p>
              <p className="text-2xs text-muted">Margen y participación sobre ventas</p>
            </div>
            <span className="chip">{data.productos.length} producto(s)</span>
          </div>
          {data.productos.length === 0 ? (
            <Empty message="Sin ventas registradas" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base table-dense">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Utilidad</th>
                    <th className="text-right">Margen</th>
                    <th className="w-28">Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.productos].sort((a, b) => b.utilidad - a.utilidad).map((p: ProductoFinanciero) => (
                    <tr key={p.id}>
                      <td className="font-medium text-slate-800">{p.nombre}</td>
                      <td className={clsx('num font-semibold', p.utilidad >= 0 ? 'text-success' : 'text-danger')}>
                        {formatCOP(p.utilidad)}
                      </td>
                      <td className={clsx('num', p.margen >= 0 ? 'text-slate-700' : 'text-danger')}>
                        {formatPct(p.margen)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="progress-track w-14"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(Math.min(100, p.participacion))}
                            aria-label={`Participación de ${p.nombre}`}
                          >
                            <div className="progress-bar" style={{ width: `${Math.min(100, p.participacion)}%` }} />
                          </div>
                          <span className="text-2xs text-muted">{formatPct(p.participacion)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel">
          <div className="card-header">
            <div>
              <p className="text-xs font-semibold text-slate-800">Comparativo mensual</p>
              <p className="text-2xs text-muted">Mes actual vs. {data.comparativo.periodo_label}</p>
            </div>
            <Scale size={15} className="text-muted" />
          </div>
          <table className="table-base table-dense">
            <thead>
              <tr>
                <th>Concepto</th>
                <th className="text-right">{data.periodo_label}</th>
                <th className="text-right">{data.comparativo.periodo_label}</th>
                <th className="text-right">Variación</th>
              </tr>
            </thead>
            <tbody>
              <ComparativoRow label="Ventas" actual={data.indicadores.ventas} previo={data.comparativo.ventas} />
              <ComparativoRow label="Utilidad bruta" actual={data.estado_resultados.utilidad_bruta} previo={data.comparativo.utilidad_bruta} />
              <ComparativoRow label="Utilidad operativa" actual={data.estado_resultados.utilidad_operativa} previo={data.comparativo.utilidad_operativa} />
              <ComparativoRow label="Cobros" actual={data.flujo.ingresos} previo={data.comparativo.cobros} />
              <ComparativoRow label="Compras" actual={data.flujo.egresos} previo={data.comparativo.compras} invertirColor />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ─────────────────────────────

function PylSection({ label }: { label: string }) {
  return (
    <tr className="bg-slate-50/80">
      <td colSpan={3} className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </td>
    </tr>
  );
}

function PylRow({
  label, value, base, strong, negative, indent,
}: {
  label: string;
  value: number;
  base: number;
  strong?: boolean;
  negative?: boolean;
  indent?: boolean;
}) {
  const pct = base > 0 ? (value / base) * 100 : 0;
  const isNegative = negative || value < 0;
  return (
    <tr className={strong ? 'bg-slate-50/40' : undefined}>
      <td className={clsx('py-2', indent && 'pl-6', strong ? 'font-semibold text-slate-900' : 'text-slate-600')}>
        {label}
      </td>
      <td className={clsx('num py-2', isNegative ? 'text-danger' : strong ? 'font-semibold text-slate-900' : 'text-slate-700')}>
        {isNegative ? `(${formatCOP(Math.abs(value))})` : formatCOP(value)}
      </td>
      <td className="w-20 py-2 text-right font-mono text-2xs tabular-nums text-muted">
        {formatPct(Math.abs(pct))}
      </td>
    </tr>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <div>
        <p className="text-tiny font-medium text-slate-600">{label}</p>
        {sub && <p className="text-2xs text-muted">{sub}</p>}
      </div>
      <p className="money shrink-0 text-[13px] font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DarkRow({ label, value, strong, valueClass }: { label: string; value: string; strong?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className={clsx('font-mono tabular-nums', strong ? 'font-semibold' : 'font-medium', valueClass ?? 'text-slate-100')}>{value}</span>
    </div>
  );
}

function IndicadorCard({
  icon, label, value, sub, accent = 'text-slate-900',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-3.5 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <p className="section-label leading-tight">{label}</p>
        <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-line bg-slate-50 text-slate-500" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className={clsx('stat-value mt-2 text-[20px]', accent)}>{value}</p>
      {sub && <p className="mt-1.5 text-2xs text-muted">{sub}</p>}
    </div>
  );
}

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

function ComparativoRow({
  label, actual, previo, invertirColor = false,
}: {
  label: string;
  actual: number;
  previo: number;
  invertirColor?: boolean;
}) {
  const diff = previo !== 0 ? ((actual - previo) / Math.abs(previo)) * 100 : null;
  const positivo = diff != null && diff >= 0;
  const color = diff == null
    ? 'text-muted'
    : invertirColor
      ? (positivo ? 'text-danger' : 'text-success')
      : (positivo ? 'text-success' : 'text-danger');

  return (
    <tr>
      <td className="font-medium text-slate-700">{label}</td>
      <td className="num text-slate-800">{formatCOP(actual)}</td>
      <td className="num text-muted">{formatCOP(previo)}</td>
      <td className={clsx('num font-semibold', color)}>
        {diff == null ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`}
      </td>
    </tr>
  );
}

function formatFechaCorta(iso: string) {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
