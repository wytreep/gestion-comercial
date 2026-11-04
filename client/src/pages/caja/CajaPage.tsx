import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { cajaApi } from '../../api/endpoints';
import { KpiCard, Spinner, BadgeMedioPago, BadgeDestino } from '../../components/ui';
import { formatCOP, formatDate, firstDayOfMonth, today } from '../../utils/format';

export default function CajaPage() {
  const [desde, setDesde] = useState(firstDayOfMonth());
  const [hasta, setHasta] = useState(today());
  const [buscar, setBuscar] = useState({ desde: firstDayOfMonth(), hasta: today() });
  const { data, isLoading } = useQuery({ queryKey: ['caja', buscar.desde, buscar.hasta], queryFn: () => cajaApi.get(buscar.desde, buscar.hasta) });

  const flujo  = data?.flujo       ?? { ingresos: 0, inversiones: 0 };
  const saldos = data?.saldos      ?? [];
  const movs   = data?.movimientos ?? [];
  const balance = flujo.ingresos - flujo.inversiones;
  const pos     = balance >= 0;

  const movPorFecha = movs.reduce((acc: any, m: any) => { const k = m.fecha; if (!acc[k]) acc[k] = { fecha: formatDate(k), ingresos: 0 }; acc[k].ingresos += Number(m.total) || 0; return acc; }, {});
  const chartLine = Object.values(movPorFecha).slice(-14) as any[];

  return (
    <div className="space-y-6">
      <div className="page-header"><h1 className="page-title">Caja y flujo de dinero</h1></div>
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="field"><label htmlFor="caja-desde" className="label">Desde</label><input id="caja-desde" type="date" className="input w-auto" value={desde} onChange={e => setDesde(e.target.value)} /></div>
        <div className="field"><label htmlFor="caja-hasta" className="label">Hasta</label><input id="caja-hasta" type="date" className="input w-auto" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
        <button className="btn-primary" onClick={() => setBuscar({ desde, hasta })}>Consultar</button>
      </div>
      {isLoading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard label="Ingresos cobrados" value={formatCOP(flujo.ingresos)} color="green" />
            <KpiCard label="Inversiones (compras)" value={formatCOP(flujo.inversiones)} color="orange" />
            <KpiCard label="Balance del período" value={formatCOP(balance)} sub={pos ? 'Positivo' : 'Negativo'} color={pos ? 'emerald' : 'red'} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card">
              <p className="card-title">Saldos por destino</p>
              <div className="space-y-2.5 mb-4">
                {saldos.map((s: any) => (
                  <div key={s.destino_dinero} className="flex items-center justify-between">
                    <BadgeDestino destino={s.destino_dinero} />
                    <div className="text-right"><p className="font-mono font-semibold text-sm">{formatCOP(s.total)}</p><p className="text-xs text-gray-400">{s.transacciones} transac.</p></div>
                  </div>
                ))}
                {saldos.length === 0 && <p className="text-xs text-gray-400">Sin movimientos</p>}
              </div>
              {saldos.length > 0 && (
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={saldos.map((s: any) => ({ name: s.destino_dinero.replace('billetera_','').replace('_',' '), total: s.total }))} margin={{ top:0, right:0, left:0, bottom:0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis hide />
                    <Tooltip formatter={(v: any) => [formatCOP(v), 'Total']} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="total" radius={[3,3,0,0]}>
                      {saldos.map((_: any, i: number) => <Cell key={i} fill={['#1b6ca8','#22a05e','#c25b00','#047857','#94a3b8'][i%5]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="card">
              <p className="card-title">Ingresos por día</p>
              {chartLine.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartLine} margin={{ top:5, right:10, left:0, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: any) => [formatCOP(v), 'Cobrado']} contentStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="ingresos" stroke="#1b6ca8" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-gray-400 text-center py-8">Sin movimientos en el período</p>}
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><p className="text-sm font-semibold text-gray-700">Movimientos del período ({movs.length})</p></div>
            {movs.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin movimientos</p> : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th>Fecha</th><th>Medio</th><th>Destino</th><th>Transacciones</th><th>Total cobrado</th></tr></thead>
                  <tbody>
                    {movs.map((m: any, i: number) => (
                      <tr key={i}>
                        <td className="text-xs text-gray-500">{formatDate(m.fecha)}</td>
                        <td><BadgeMedioPago medio={m.medio_pago} /></td>
                        <td><BadgeDestino destino={m.destino_dinero} /></td>
                        <td className="text-center">{m.num_pagos}</td>
                        <td className="font-mono font-semibold text-success">{formatCOP(m.total)}</td>
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
