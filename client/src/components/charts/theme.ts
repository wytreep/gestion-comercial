/**
 * Tema único para todos los gráficos (Recharts).
 * Evita paletas y tamaños distintos entre Dashboard, Finanzas y Caja.
 */
export const CHART = {
  color: {
    blue:  '#0b5cab',
    green: '#157347',
    teal:  '#0f766e',
    amber: '#b45309',
    red:   '#b42318',
    slate: '#94a3b8',
    grid:  '#e8eef4',
    axis:  '#5b6b7f',
  },
  axisTick: { fontSize: 11, fill: '#5b6b7f' },
  grid: { stroke: '#e8eef4', strokeDasharray: '3 3', vertical: false },
  tooltip: {
    contentStyle: {
      fontSize: 11.5,
      lineHeight: 1.45,
      borderRadius: 6,
      border: '1px solid #dfe4ea',
      boxShadow: '0 8px 24px rgba(16, 24, 40, 0.12)',
      padding: '8px 10px',
      color: '#1f2937',
    },
    labelStyle: { fontWeight: 600, color: '#1f2937', marginBottom: 3 },
    itemStyle: { padding: '1px 0' },
    cursor: { fill: 'rgba(11, 92, 171, 0.05)' },
  },
  legend: { wrapperStyle: { fontSize: 11, paddingTop: 6, color: '#5b6b7f' } },
  dot: { r: 3, strokeWidth: 2, fill: '#fff' },
  activeDot: { r: 5, strokeWidth: 2, fill: '#fff' },
  barRadius: [3, 3, 0, 0] as [number, number, number, number],
  barRadiusH: [0, 3, 3, 0] as [number, number, number, number],
  barSize: 18,
  barSizeNarrow: 10,
  /** Las vistas de gestión muestran los datos al instante: sin animación de entrada. */
  animation: false,
};
