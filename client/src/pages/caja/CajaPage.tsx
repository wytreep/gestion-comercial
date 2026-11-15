import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, Landmark, TrendingUp } from 'lucide-react';
import { cajaApi } from '../../api/endpoints';
import { KpiCard, Spinner, BadgeMedioPago, BadgeDestino, Empty } from '../../components/ui';
import { CHART } from '../../components/charts/theme';
import { formatCOP, formatCOPCompact, formatDate, firstDayOfMonth, plural, today } from '../../utils/format';

type Movimiento = {
  fecha: string;
  medio_pago: 'efectivo' | 'transferencia';
  destino_dinero: string;
  num_pagos: number;
  total: number;
};

export default function CajaPage() {
  const [desde, setDesde] = useState(firstDayOfMonth());
  const [hasta, setHasta] = useState(today());
  const [buscar, setBuscar] = useState({ desde: firstDayOfMonth(), hasta: today() });

  const { data, isLoading } = useQuery({
    queryKey: ['caja', buscar.desde, buscar.hasta],
    queryFn:  () => cajaApi.get(buscar.desde, buscar.hasta),
  });

  const flujo    = data?.flujo ?? { ingresos: 0, inversiones: 0 };
  const saldos   = data?.saldos ?? [];
  const movs: Movimiento[] = data?.movimientos ?? [];
  const balance  = flujo.ingresos - flujo.inversiones;
  const positivo = balance >= 0;

  const maxSaldo = Math.max(...saldos.map((s: any) => Number(s.total) || 0), 1);

  const porFecha = movs.reduce<Record<string, { fecha: string; ingresos: number }>>((acc, m) => {
    if (!acc[m.fecha]) acc[m.fecha] = { fecha: formatDate(m.fecha), ingresos: 0 };
    acc[m.fecha].ingresos += Number(m.total) || 0;
    return acc;
  }, {});
  // Los movimientos llegan del más reciente al más antiguo: ordenar por fecha
  // para que el eje del gráfico avance en el tiempo.
  const serie = Object.keys(porFecha).sort().slice(-14).map((k) => porFecha[k]);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Caja y flujo de dinero</h1>
          <p className="page-subtitle">Cobros recibidos, inversiones y saldo del período</p>
        </div>
        {!isLoading && movs.length > 0 && <span className="chip">{plural(movs.length, 'movimiento')}</span>}
      </div>

      <div className="toolbar no-print">
        <div className="field">
          <label htmlFor="caja-desde" className="label">Desde</label>
          <input id="caja-desde" type="date" className="input w-auto" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="caja-hasta" className="label">Hasta</label>
          <input id="caja-hasta" type="date" className="input w-auto" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setBuscar({ desde, hasta })}>
          <CalendarRange size={14} aria-hidden="true" /> Consultar
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard label="Ingresos cobrados" value={formatCOP(flujo.ingresos)} sub="Pagos recibidos" color="green" icon={<TrendingUp size={14} />} />
            <KpiCard label="Inversiones (compras)" value={formatCOP(flujo.inversiones)} sub="Egresos del período" color="orange" />
            <KpiCard
              label="Balance del período"
              value={formatCOP(balance)}
              sub={positivo ? 'Flujo positivo' : 'Flujo negativo'}
              color={positivo ? 'emerald' : 'red'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="card-title mb-0.5">Saldos por destino</p>
                  <p className="text-2xs text-muted">Distribución del dinero cobrado</p>
                </div>
                <Landmark size={15} className="text-muted" aria-hidden="true" />
              </div>
              {saldos.length === 0 ? (
                <Empty message="Sin movimientos en el período" />
              ) : (
                <div className="space-y-3">
                  {saldos.map((s: any) => {
                    const pct = Math.min(100, ((Number(s.total) || 0) / maxSaldo) * 100);
                    return (
                      <div key={s.destino_dinero}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <BadgeDestino destino={s.destino_dinero} />
                          <div className="text-right">
                            <p className="money text-tiny font-semibold text-slate-900">{formatCOP(s.total)}</p>
                            <p className="text-2xs text-muted">{plural(s.transacciones, 'transacción', 'transacciones')}</p>
                          </div>
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
            </div>

            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="card-title mb-0.5">Ingresos por día</p>
                  <p className="text-2xs text-muted">Últimos 14 días con cobros</p>
                </div>
                <TrendingUp size={15} className="text-muted" aria-hidden="true" />
              </div>
              {serie.length > 0 ? (
                <div role="img" aria-label="Gráfico de ingresos cobrados por día en el período consultado">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={serie} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...CHART.grid} />
                      <XAxis dataKey="fecha" tick={CHART.axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={CHART.axisTick} tickFormatter={formatCOPCompact} axisLine={false} tickLine={false} width={46} />
                      <Tooltip formatter={(v: any) => [formatCOP(Number(v)), 'Cobrado']} {...CHART.tooltip} cursor={{ fill: 'rgba(11, 92, 171, 0.06)' }} />
                      <Bar
                        dataKey="ingresos"
                        name="Cobrado"
                        fill={CHART.color.green}
                        radius={CHART.barRadius}
                        maxBarSize={34}
                        isAnimationActive={CHART.animation}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty message="Sin movimientos en el período" />
              )}
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="card-header">
              <div>
                <p className="text-xs font-semibold text-slate-800">Movimientos del período</p>
                <p className="text-2xs text-muted">Cobros agrupados por fecha, medio y destino</p>
              </div>
              <span className="chip">{plural(movs.length, 'registro')}</span>
            </div>
            {movs.length === 0 ? (
              <Empty message="Sin movimientos en el período" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Medio</th>
                      <th>Destino</th>
                      <th className="text-right">Transacciones</th>
                      <th className="text-right">Total cobrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movs.map((m, i) => (
                      <tr key={`${m.fecha}-${m.medio_pago}-${m.destino_dinero}-${i}`}>
                        <td className="whitespace-nowrap text-muted">{formatDate(m.fecha)}</td>
                        <td><BadgeMedioPago medio={m.medio_pago} /></td>
                        <td><BadgeDestino destino={m.destino_dinero} /></td>
                        <td className="num">{m.num_pagos}</td>
                        <td className="num font-semibold text-success">{formatCOP(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
