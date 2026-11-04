import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reporteApi } from '../../api/endpoints';
import { Spinner, KpiCard } from '../../components/ui';
import { formatCOP, formatCantidad, formatDate } from '../../utils/format';
import { FileText, Download } from 'lucide-react';

export default function ReportesPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(currentMonth);
  const [buscar, setBuscar] = useState(currentMonth);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reporte', buscar],
    queryFn:  () => reporteApi.mensualJson(buscar),
  });

  const handlePdf = async () => {
    setDownloading(true);
    try { await reporteApi.mensualPdf(buscar); }
    catch (e: any) { alert('Error al generar PDF: ' + e.message); }
    finally { setDownloading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Reportes mensuales</h1>
      </div>

      {/* Selector de mes */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="field">
          <label htmlFor="reportes-periodo" className="label">Período</label>
          <input id="reportes-periodo" type="month" className="input w-auto" value={mes}
            onChange={e => setMes(e.target.value)} />
        </div>
        <button onClick={() => setBuscar(mes)} className="btn-primary flex items-center gap-2">
          <FileText size={15} /> Ver reporte
        </button>
        <button onClick={handlePdf} disabled={downloading || isLoading}
          className="btn-secondary flex items-center gap-2">
          <Download size={15} /> {downloading ? 'Generando PDF…' : 'Descargar PDF'}
        </button>
      </div>

      {isLoading ? <Spinner /> : data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Ventas del período"   value={formatCOP(data.ventas.total)}  sub={`${data.ventas.count} pedidos`} color="blue" />
            <KpiCard label="Dinero cobrado"        value={formatCOP(data.ventas.cobrado)} color="green" />
            <KpiCard label="Inversión compras"     value={formatCOP(data.compras.total)}  color="orange" />
            <KpiCard label="Ganancia bruta est."   value={formatCOP(data.ganancia)}       sub={`Margen: ${data.margen}%`} color={data.ganancia >= 0 ? 'emerald' : 'red'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top clientes */}
            {data.top_clientes.length > 0 && (
              <div className="card">
                <p className="card-title">Top clientes del período</p>
                <table className="table-base">
                  <thead><tr><th>Cliente</th><th>Pedidos</th><th>Total</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {data.top_clientes.map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="font-medium">{c.nombre}</td>
                        <td className="text-center">{c.pedidos}</td>
                        <td className="font-mono">{formatCOP(c.total)}</td>
                        <td className={`font-mono ${c.saldo > 0 ? 'text-danger font-semibold' : ''}`}>{formatCOP(c.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cartera */}
            <div className="card">
              <p className="card-title">
                Cartera pendiente{' '}
                <span className="font-mono text-danger">{formatCOP(data.cartera.total)}</span>
              </p>
              {data.cartera.detalle.length === 0 ? (
                <p className="text-xs font-medium text-success">Sin cartera pendiente</p>
              ) : (
                <table className="table-base">
                  <thead><tr><th>Cliente</th><th>Pedidos</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {data.cartera.detalle.map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="font-medium">{c.nombre}</td>
                        <td className="text-center">{c.pedidos_pendientes}</td>
                        <td className="font-mono font-semibold text-danger">{formatCOP(c.saldo_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Stock */}
          <div className="card">
            <p className="card-title">Stock actual</p>
            <table className="table-base">
              <thead><tr><th>Producto</th><th>Stock</th><th>P. Compra</th><th>P. Venta/kg</th><th>Margen</th></tr></thead>
              <tbody>
                {data.stock.map((p: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium">{p.nombre}</td>
                    <td className="font-mono">{formatCantidad(p.stock_actual)} kg</td>
                    <td className="font-mono">{formatCOP(p.precio_compra)}</td>
                    <td className="font-mono">{formatCOP(p.precio_venta)}</td>
                    <td className={`font-semibold ${p.margen_porcentaje > 0 ? 'text-success' : 'text-danger'}`}>
                      {p.margen_porcentaje !== null ? `${p.margen_porcentaje}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
