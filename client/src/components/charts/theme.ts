/**
 * Tema único para todos los gráficos (Recharts).
 * Evita paletas y tamaños distintos entre Dashboard, Finanzas y Caja.
 *
 * Los colores leen variables CSS (`--chart-*`) definidas en `index.css`,
 * de modo que el modo oscuro se hereda sin recalcular los gráficos.
 */
const V = (name: string) => `var(--chart-${name})`;

export const CHART = {
  color: {
    blue:  V('blue'),
    green: V('green'),
    teal:  V('teal'),
    amber: V('amber'),
    red:   V('red'),
    slate: V('slate'),
    grid:  V('grid'),
    axis:  V('axis'),
  },
  axisTick: { fontSize: 11, fill: V('axis') },
  grid: { stroke: V('grid'), strokeDasharray: '3 3', vertical: false },
  tooltip: {
    contentStyle: {
      fontSize: 11.5,
      lineHeight: 1.45,
      borderRadius: 6,
      border: `1px solid ${V('tip-border')}`,
      background: V('tip-bg'),
      boxShadow: '0 8px 24px rgb(16 24 40 / 0.14)',
      padding: '8px 10px',
      color: V('tip-ink'),
    },
    labelStyle: { fontWeight: 600, color: V('tip-ink'), marginBottom: 3 },
    itemStyle: { padding: '1px 0', color: V('tip-ink') },
    cursor: { fill: V('cursor') },
  },
  legend: { wrapperStyle: { fontSize: 11, paddingTop: 6, color: V('axis') } },
  dot: { r: 3, strokeWidth: 2, fill: V('tip-bg') },
  activeDot: { r: 5, strokeWidth: 2, fill: V('tip-bg') },
  barRadius: [3, 3, 0, 0] as [number, number, number, number],
  barRadiusH: [0, 3, 3, 0] as [number, number, number, number],
  barSize: 18,
  barSizeNarrow: 10,
  /** Las vistas de gestión muestran los datos al instante: sin animación de entrada. */
  animation: false,
};
