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
import { KpiCard, Spinner, BadgeDestino, BadgeMedioPago, Empty } from '../../components/ui';
import {
  currentMonthKey, formatCantidad, formatCOP, formatPct,
} from '../../utils/format';
import type { FinanzasData, ProductoFinanciero } from '../../types';

const C = {
  blue:  '#0b5cab',
  green: '#157347',
  teal:  '#0f766e',
  red:   '#b42318',
  amber: '#b45309',
  slate: '#94a3b8',
};

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
    return (
      <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
        No fue posible cargar la información financiera del período.
      </div>
    );
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
            <label className="label">Período</label>
            <input
              type="month"
              className="input w-auto"
              value={mes}
              onChange={(e) => setMes(e.target.value || currentMonthKey())}
            />
          </div>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
          <button className="btn-secondary" onClick={() => navigate('/reportes')}>
            <FileText size={14} /> Reporte PDF
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
      <div className="tabs no-print">
        <button className={clsx('tab', tab === 'pyl' && 'tab-active')} onClick={() => setTab('pyl')}>
          <FileBarChart2 size={14} /> Estado de resultados
        </button>
        <button className={clsx('tab', tab === 'flujo' && 'tab-active')} onClick={() => setTab('flujo')}>
          <Landmark size={14} /> Flujo de caja
        </button>
        <button className={clsx('tab', tab === 'indicadores' && 'tab-active')} onClick={() => setTab('indicadores')}>
          <Gauge size={14} /> Indicadores
        </button>
      </div>

      {tab === 'pyl' && <VistaPyL data={data} />}
      {tab === 'flujo' && <VistaFlujo data={data} />}
      {tab === 'indicadores' && <VistaIndicadores data={data} />}

      <p className="pb-2 text-[10.5px] leading-relaxed text-slate-400">
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
    { name: 'Ventas',          value: er.ingresos_operacionales, fill: C.blue  },
    { name: 'Costo de ventas', value: er.costo_ventas,           fill: C.red   },
    { name: 'Gastos oper.',    value: er.gastos_operativos,      fill: C.amber },
    { name: 'Utilidad bruta',  value: er.utilidad_bruta,         fill: C.green },
    { name: 'Utilidad oper.',  value: er.utilidad_operativa,     fill: C.teal  },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Estado de resultados */}
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-[12px] font-semibold text-slate-800">Estado de resultados</p>
              <p className="text-[10.5px] text-slate-400">Del 1 al último día de {data.periodo_label}</p>
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
                    <td colSpan={3} className="px-3 py-2.5 text-[11.5px] text-slate-400">
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
                  <td className="text-right font-mono">
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
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="card-title">Composición del resultado</p>
                <p className="mt-0.5 text-[10.5px] text-slate-400">Valores del período</p>
              </div>
              <Scale size={15} className="text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={composicion} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f6" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: any) => [formatCOP(Number(v)), 'Valor']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={16}>
                  {composicion.map((c) => <Cell key={c.name} fill={c.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            <p className="card-title">Gastos por categoría</p>
            <Calculator size={15} className="text-slate-400" />
          </div>
          {er.gastos_por_categoria.length === 0 ? (
            <Empty message="Sin gastos en el período" />
          ) : (
            <div className="space-y-3">
              {er.gastos_por_categoria.map((g) => {
                const pct = er.gastos_operativos > 0 ? (g.monto / er.gastos_operativos) * 100 : 0;
                return (
                  <div key={g.categoria}>
                    <div className="mb-1 flex items-center justify-between text-[11.5px]">
                      <span className="text-slate-600">{CATEGORIA_GASTO[g.categoria] ?? g.categoria}</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCOP(g.monto)}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-bar bg-amber-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-line pt-2 text-[11.5px]">
                <span className="font-medium text-slate-500">Total gastos</span>
                <span className="font-mono font-semibold text-slate-900">{formatCOP(er.gastos_operativos)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-[12px] font-semibold text-slate-800">Rentabilidad por producto</p>
              <p className="text-[10.5px] text-slate-400">Ventas, costo y margen del período</p>
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
                        <p className="text-[10px] capitalize text-slate-400">{p.unidad_medida}</p>
                      </td>
                      <td className="text-right font-mono">{formatCantidad(p.unidades)}</td>
                      <td className="text-right font-mono">{formatCOP(p.ventas)}</td>
                      <td className="text-right font-mono text-slate-500">{formatCOP(p.costo)}</td>
                      <td className={clsx('text-right font-mono font-semibold', p.utilidad >= 0 ? 'text-success' : 'text-danger')}>
                        {formatCOP(p.utilidad)}
                      </td>
                      <td className={clsx('text-right font-mono font-semibold', p.margen >= 0 ? 'text-slate-700' : 'text-danger')}>
                        {formatPct(p.margen)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="progress-track w-12">
                            <div className="progress-bar" style={{ width: `${Math.min(100, p.participacion)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500">{formatPct(p.participacion)}</span>
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
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="card-title">Cobros vs. egresos por día</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">Caja real del período · línea = acumulado</p>
            </div>
            <LineChart size={15} className="text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart data={serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9.5, fill: '#94a3b8' }}
                tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}K`}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9.5, fill: '#94a3b8' }}
                tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}K`}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip formatter={(v: any, name: any) => [formatCOP(Number(v)), String(name)]} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} />
              <ReferenceLine y={0} yAxisId="left" stroke="#cbd5e1" />
              <Bar yAxisId="left" dataKey="ingresos" name="Cobros" fill={C.green} barSize={9} radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="egresos" name="Compras" fill={C.red} barSize={9} radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke={C.blue} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="card-title">Saldos por destino</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">Cobros del período</p>
            </div>
            <Landmark size={15} className="text-slate-400" />
          </div>
          {f.saldos_destino.length === 0 ? (
            <Empty message="Sin cobros en el período" />
          ) : (
            <div className="space-y-3">
              {f.saldos_destino.map((s) => (
                <div key={s.destino_dinero}>
                  <div className="mb-1 flex items-center justify-between">
                    <BadgeDestino destino={s.destino_dinero} />
                    <span className="font-mono text-[11.5px] font-semibold text-slate-800">{formatCOP(s.total)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar bg-teal" style={{ width: `${Math.min(100, (s.total / maxSaldo) * 100)}%` }} />
                  </div>
                  <p className="mt-0.5 text-[9.5px] text-slate-400">{s.transacciones} transacción(es)</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-line pt-3">
            <p className="section-label mb-2">Por medio de pago</p>
            {f.por_medio.length === 0 ? (
              <p className="text-[11px] text-slate-400">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {f.por_medio.map((m) => (
                  <div key={m.medio_pago} className="flex items-center justify-between">
                    <BadgeMedioPago medio={m.medio_pago as 'efectivo' | 'transferencia'} />
                    <span className="font-mono text-[11.5px] text-slate-700">{formatCOP(m.total)}</span>
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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Posición de caja</p>
            <Wallet size={15} className="text-slate-400" />
          </div>
          <p className={clsx('mt-2 font-mono text-[26px] font-semibold tabular-nums', f.posicion_caja >= 0 ? 'text-emerald-300' : 'text-red-300')}>
            {formatCOP(f.posicion_caja)}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-400">Cobros históricos − compras históricas</p>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-[11.5px]">
            <DarkRow label="Cobros del período" value={formatCOP(f.ingresos)} />
            <DarkRow label="Compras del período" value={formatCOP(f.egresos)} />
            <DarkRow label="Flujo neto" value={formatCOP(f.neto)} strong valueClass={f.neto >= 0 ? 'text-emerald-300' : 'text-red-300'} />
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel xl:col-span-2">
          <div className="card-header">
            <div>
              <p className="text-[12px] font-semibold text-slate-800">Compras y egresos del período</p>
              <p className="text-[10.5px] text-slate-400">{f.num_compras} compra(s) registrada(s)</p>
            </div>
            <Boxes size={15} className="text-slate-400" />
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
                      <td className="font-mono text-slate-400">#{c.id}</td>
                      <td className="text-slate-500">{formatFechaCorta(c.fecha_compra)}</td>
                      <td className="font-medium text-slate-700">{c.proveedor}</td>
                      <td className="text-right font-mono">{formatCOP(c.total_productos)}</td>
                      <td className="text-right font-mono text-slate-500">{formatCOP(c.total_gastos)}</td>
                      <td className="text-right font-mono font-semibold text-slate-900">{formatCOP(c.total_inversion)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>Total egresos</td>
                    <td className="text-right font-mono">{formatCOP(f.egresos)}</td>
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
            <p className="text-[12px] font-semibold text-slate-800">Detalle diario de caja</p>
            <p className="text-[10.5px] text-slate-400">Movimiento acumulado del período</p>
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
                  <td className="text-slate-500">{d.label}</td>
                  <td className="text-right font-mono text-success">{d.ingresos ? formatCOP(d.ingresos) : '—'}</td>
                  <td className="text-right font-mono text-danger">{d.egresos ? formatCOP(d.egresos) : '—'}</td>
                  <td className={clsx('text-right font-mono font-semibold', d.neto >= 0 ? 'text-slate-700' : 'text-danger')}>
                    {formatCOP(d.neto)}
                  </td>
                  <td className={clsx('text-right font-mono font-semibold', d.acumulado >= 0 ? 'text-slate-800' : 'text-danger')}>
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
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="card-title">Tendencia de los últimos 6 meses</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">Ventas, utilidad operativa y flujo de caja</p>
            </div>
            <TrendingUp size={15} className="text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <ComposedChart data={tendencia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Bar dataKey="ventas" name="Ventas" fill={C.blue} barSize={18} radius={[2, 2, 0, 0]} />
              <Bar dataKey="utilidad_operativa" name="Utilidad operativa" fill={C.teal} barSize={18} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="flujo" name="Flujo de caja" stroke={C.amber} strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="card-title">Lectura del período</p>
            <Gauge size={15} className="text-slate-400" />
          </div>
          <ul className="space-y-3 text-[11.5px] leading-relaxed text-slate-600">
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
              <p className="text-[12px] font-semibold text-slate-800">Ranking de productos por utilidad</p>
              <p className="text-[10.5px] text-slate-400">Margen y participación sobre ventas</p>
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
                      <td className={clsx('text-right font-mono font-semibold', p.utilidad >= 0 ? 'text-success' : 'text-danger')}>
                        {formatCOP(p.utilidad)}
                      </td>
                      <td className={clsx('text-right font-mono', p.margen >= 0 ? 'text-slate-700' : 'text-danger')}>
                        {formatPct(p.margen)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="progress-track w-14">
                            <div className="progress-bar" style={{ width: `${Math.min(100, p.participacion)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500">{formatPct(p.participacion)}</span>
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
              <p className="text-[12px] font-semibold text-slate-800">Comparativo mensual</p>
              <p className="text-[10.5px] text-slate-400">Mes actual vs. {data.comparativo.periodo_label}</p>
            </div>
            <Scale size={15} className="text-slate-400" />
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

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 4,
  border: '1px solid #dfe4ea',
  boxShadow: '0 8px 24px rgba(16,24,40,.12)',
};

function PylSection({ label }: { label: string }) {
  return (
    <tr className="bg-slate-50/80">
      <td colSpan={3} className="px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-slate-400">
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
      <td className={clsx('py-2 px-3', indent && 'pl-6', strong ? 'font-semibold text-slate-900' : 'text-slate-600')}>
        {label}
      </td>
      <td className={clsx('py-2 px-3 text-right money', isNegative ? 'text-danger' : strong ? 'font-semibold text-slate-900' : 'text-slate-700')}>
        {isNegative ? `(${formatCOP(Math.abs(value))})` : formatCOP(value)}
      </td>
      <td className="w-20 py-2 px-3 text-right text-[10.5px] text-slate-400">
        {formatPct(Math.abs(pct))}
      </td>
    </tr>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <div>
        <p className="text-[11.5px] font-medium text-slate-600">{label}</p>
        {sub && <p className="text-[9.5px] text-slate-400">{sub}</p>}
      </div>
      <p className="shrink-0 font-mono text-[13px] font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DarkRow({ label, value, strong, valueClass }: { label: string; value: string; strong?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={clsx('font-mono', strong ? 'font-semibold' : 'font-medium', valueClass ?? 'text-slate-100')}>{value}</span>
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
        <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-line bg-slate-50 text-slate-500">
          {icon}
        </span>
      </div>
      <p className={clsx('mt-2 font-mono text-[20px] font-semibold tabular-nums leading-none', accent)}>{value}</p>
      {sub && <p className="mt-1.5 text-[10.5px] text-slate-500">{sub}</p>}
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
    ? 'text-slate-400'
    : invertirColor
      ? (positivo ? 'text-danger' : 'text-success')
      : (positivo ? 'text-success' : 'text-danger');

  return (
    <tr>
      <td className="font-medium text-slate-700">{label}</td>
      <td className="text-right font-mono text-slate-800">{formatCOP(actual)}</td>
      <td className="text-right font-mono text-slate-500">{formatCOP(previo)}</td>
      <td className={clsx('text-right font-mono font-semibold', color)}>
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
