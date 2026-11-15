import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reporteApi } from '../../api/endpoints';
import { Alert, Spinner, KpiCard, Empty } from '../../components/ui';
import { formatCOP, formatCantidad, formatDate, plural } from '../../utils/format';
import { FileText, Download, Users, Wallet, Boxes } from 'lucide-react';

export default function ReportesPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(currentMonth);
  const [buscar, setBuscar] = useState(currentMonth);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reporte', buscar],
    queryFn:  () => reporteApi.mensualJson(buscar),
  });

  const handlePdf = async () => {
    setError('');
    setDownloading(true);
    try { await reporteApi.mensualPdf(buscar); }
    catch (e: any) { setError('Error al generar el PDF: ' + (e.message ?? 'intenta de nuevo.')); }
    finally { setDownloading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes mensuales</h1>
          <p className="page-subtitle">Resumen de ventas, cartera y stock por período</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div className="toolbar">
        <div className="field">
          <label htmlFor="reportes-periodo" className="label">Período</label>
          <input id="reportes-periodo" type="month" className="input w-auto" value={mes}
            onChange={e => setMes(e.target.value)} />
        </div>
        <button onClick={() => setBuscar(mes)} className="btn-primary">
          <FileText size={15} aria-hidden="true" /> Ver reporte
        </button>
        <button onClick={handlePdf} disabled={downloading || isLoading} className="btn-secondary">
          <Download size={15} aria-hidden="true" /> {downloading ? 'Generando PDF…' : 'Descargar PDF'}
        </button>
      </div>

      {isLoading ? <Spinner /> : data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Ventas del período" value={formatCOP(data.ventas.total)} sub={`${data.ventas.count} pedidos`} color="blue" />
            <KpiCard label="Dinero cobrado" value={formatCOP(data.ventas.cobrado)} color="green" />
            <KpiCard label="Inversión compras" value={formatCOP(data.compras.total)} color="orange" />
            <KpiCard label="Ganancia bruta est." value={formatCOP(data.ganancia)} sub={`Margen: ${data.margen}%`} color={data.ganancia >= 0 ? 'emerald' : 'red'} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card overflow-hidden p-0">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-muted" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-800">Top clientes del período</p>
                </div>
              </div>
              {data.top_clientes.length === 0 ? (
                <Empty message="Sin ventas de clientes en el período" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th className="text-right">Pedidos</th>
                        <th className="text-right">Total</th>
                        <th className="text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_clientes.map((c: any, i: number) => (
                        <tr key={i}>
                          <td className="font-medium text-slate-800">{c.nombre}</td>
                          <td className="num">{c.pedidos}</td>
                          <td className="num">{formatCOP(c.total)}</td>
                          <td className={`num ${c.saldo > 0 ? 'font-semibold text-danger' : ''}`}>{formatCOP(c.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card overflow-hidden p-0">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Wallet size={15} className="text-muted" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-800">Cartera pendiente</p>
                </div>
                <span className="font-mono text-xs font-semibold text-danger">{formatCOP(data.cartera.total)}</span>
              </div>
              {data.cartera.detalle.length === 0 ? (
                <Empty message="Sin cartera pendiente" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th className="text-right">Pedidos</th>
                        <th className="text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cartera.detalle.map((c: any, i: number) => (
                        <tr key={i}>
                          <td className="font-medium text-slate-800">{c.nombre}</td>
                          <td className="num">{c.pedidos_pendientes}</td>
                          <td className="num font-semibold text-danger">{formatCOP(c.saldo_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Boxes size={15} className="text-muted" aria-hidden="true" />
                <p className="text-xs font-semibold text-slate-800">Stock actual</p>
              </div>
              <span className="chip">{plural(data.stock.length, 'producto')}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Stock</th>
                    <th className="text-right">P. compra</th>
                    <th className="text-right">P. venta</th>
                    <th className="text-right">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock.map((p: any, i: number) => (
                    <tr key={i}>
                      <td className="font-medium text-slate-800">{p.nombre}</td>
                      <td className="num">{formatCantidad(p.stock_actual)}</td>
                      <td className="num">{formatCOP(p.precio_compra)}</td>
                      <td className="num">{formatCOP(p.precio_venta)}</td>
                      <td className={`num font-semibold ${p.margen_porcentaje > 0 ? 'text-success' : 'text-danger'}`}>
                        {p.margen_porcentaje !== null ? `${p.margen_porcentaje}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
