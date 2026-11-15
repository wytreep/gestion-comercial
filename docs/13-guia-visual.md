# 13 · Guía visual

Sistema de diseño del ERP: tokens, escala tipográfica y patrones de interfaz.
Sirve como referencia para mantener consistencia cuando se agreguen pantallas y
como checklist de revisión cada vez que un cambio altere la estructura visual.

> Regla base: **densidad de 13 px**. No se baja de 11 px en ningún texto de
> interfaz. Si un dato necesita más énfasis, se sube el peso o el tamaño, nunca
> se reduce el contraste.

---

## 1. Tokens de color

Definidos en `client/tailwind.config.js`. **No se usan colores crudos de
Tailwind** (`gray-*`, `red-*`, `emerald-*`, `amber-*`, `sky-*`, `teal-*`); todo
pasa por estos tokens.

### Marca y superficies

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#0b5cab` | Acción principal, enlaces, foco, acento de gráficos |
| `primary-light` | `#2f7fc1` | Borde de foco en inputs |
| `primary-hover` | `#084a8c` | Hover de botón primario |
| `primary-dark` | `#083a6e` | Active de botón primario |
| `primary-50` | `#eef5fd` | Fondo suave de selección |
| `primary-invert` | `#7dd3fc` | Acento sobre navy (sidebar, header) |
| `navy` | `#16232f` | Sidebar |
| `navy-800` | `#1b2c3b` | Bordes de superficies oscuras |
| `navy-900` | `#121e29` | Panel oscuro (posición de caja) |
| `navy-950` | `#0c151d` | Header y footer del sidebar |
| `canvas` | `#eef1f5` | Fondo de la aplicación |
| `line` | `#dfe4ea` | Bordes, divisores, inputs |
| `surface` | `#f8fafc` | Franjas y fondos alternos |

### Semánticos de estado

| Token | Hex | Fondo suave | Uso |
|---|---|---|---|
| `success` | `#157347` | `success-soft` `#e9f5ef` | Pagado, utilidad, flujo positivo |
| `warning` | `#b45309` | `warning-soft` `#fdf3e4` | Pendiente, abono, alertas |
| `danger` | `#b42318` | `danger-soft` `#fdeceb` | Fiado, saldo, error, cancelado |
| `teal` | `#0f766e` | — | Serie secundaria de gráficos |
| `emerald` | `#047857` | — | Utilidad bruta en KPIs |

Sobre superficies oscuras (navy) usar los tintes `*-invert`:

| Token | Hex |
|---|---|
| `success-invert` | `#6ee7b7` |
| `warning-invert` | `#fcd34d` |
| `danger-invert` | `#fca5a5` |
| `primary-invert` | `#7dd3fc` |

### Jerarquía de texto

| Token / clase | Hex | Uso |
|---|---|---|
| `ink` / `text-slate-900` | `#1f2937` | Títulos y cifras principales |
| `text-slate-800` | — | Nombres propios en tablas |
| `text-slate-700` | — | Cuerpo de tabla |
| `text-slate-600` | — | Etiquetas y texto de apoyo |
| `text-muted` | `#5b6b7f` | Texto secundario (5.4:1 sobre blanco) |
| `text-subtle` | `#8a99ab` | Solo iconos decorativos y estados deshabilitados |
| `text-slate-400` | — | Iconos y texto sobre fondos oscuros |

**Nunca** usar `text-slate-500` sobre fondos oscuros: se pierde legibilidad.
Ahí va `text-slate-400`.

---

## 2. Escala tipográfica

| Clase | Tamaño / interlineado | Uso |
|---|---|---|
| `text-2xs` | 11 / 15 px | Etiquetas, encabezados de tabla, metadatos |
| `text-tiny` | 11.5 / 16 px | Texto de apoyo, chips, ayudas de campo |
| `text-xs` | 12 / 16 px | Cuerpo de tabla y formularios compactos |
| `text-[13px]` / base | 13 px | Cuerpo por defecto (botones, inputs) |
| `text-sm` | 14 px | Botón grande, énfasis puntual |
| `text-[15px]` | 15 px | Totales en resumen lateral |
| `text-[17px]–[22px]` | — | `stat-value`, cifras de KPI |
| `text-[20px]` | 20 px | `page-title` |

Reglas:

- Las **cifras monetarias** siempre con `font-mono tabular-nums` (clases
  `.money` o `.num`).
- Las **etiquetas** de sección y de tabla van en mayúsculas con
  `tracking-wide` y `text-2xs` (`.section-label`, `.card-title`).
- No introducir tamaños por debajo de 11 px ni interlineados menores a 1.15.

---

## 3. Espaciado y radios

- Radios: `rounded` (4 px) base, `sm` 3 px, `md` 5 px, `lg` 7 px.
- Tarjetas: `.card` = `p-4` + `border-line` + `shadow-panel`.
- Páginas de lista: `space-y-5` entre bloques.
- Paneles densos y modales: `space-y-4`.
- Grillas de KPIs: `gap-3`; contenido: `gap-4`.
- Cifras y metadatos dentro de una tarjeta: `space-y-3`.
- Tubería de tablas densas: `.table-dense` reduce a `px-2.5 py-1.5`.

---

## 4. Componentes base

Todos viven en `client/src/index.css` (clases) o
`client/src/components/ui/index.tsx` (React).

### Botones

| Clase | Altura | Uso |
|---|---|---|
| `.btn-primary` | 34 px | Acción principal (una por vista) |
| `.btn-secondary` | 34 px | Acción secundaria |
| `.btn-success` | 34 px | Registrar pago |
| `.btn-danger` | 34 px | Eliminar / cancelar |
| `.btn-ghost` | 30 px | Enlaces de tarjeta y cabeceras |
| `.btn-icon` | 32 × 32 | Icono suelto |

Modificadores: `.btn-sm` (28 px), `.btn-lg` (42 px, ancho completo).
Los botones **no llevan sombra**; solo cambio de color en hover/active.

### Formularios

- `.field` agrupa `label` + control + ayuda.
- `.label` en mayúsculas, `text-2xs`, `text-slate-600`.
- `.input` 34 px de alto, borde `line`, foco con anillo
  `primary` al 12 %, error con `aria-invalid="true"`.
- Los `select` llevan chevron SVG incrustado desde CSS.
- Ayuda contextual: `.field-help`; error: `.input-error`.

### Alertas

`<Alert type="error" | "warning" | "info" | "success" message="…" />` en
`components/ui`. Sustituye cualquier `div` rojo/verde escrito a mano.

### Estados vacíos

`<Empty title description />`. Siempre dentro de una `.card` cuando la tabla
está vacía; nunca un texto suelto.

### Badges

`.badge-green`, `.badge-blue`, `.badge-orange`, `.badge-red`, `.badge-gray`.
Se generan desde `BADGE_PAGO`, `BADGE_PEDIDO`, `BADGE_COMPRA`,
`BADGE_MOVIMIENTO` en `utils/format.ts` mediante `BadgeEstado*`.

---

## 5. Tablas

```tsx
<table className="table-base">
  <thead><tr><th>Cliente</th><th className="text-right">Total</th></tr></thead>
  <tbody>
    <tr>
      <td className="font-medium text-slate-800">Nombre</td>
      <td className="num font-semibold text-slate-900">$ 12.000</td>
    </tr>
  </tbody>
</table>
```

- Columnas numéricas: `className="num"` (alineación derecha + mono + tabular).
- Encabezados numéricos también `text-right`.
- Importes secundarios: `text-muted`; importes principales: `text-slate-900`.
- Filas canceladas o inactivas: `opacity-60` o `line-through`, no color rojo
  en toda la fila.
- Tablas dentro de tarjeta: contenedor `card overflow-hidden p-0` y
  `overflow-x-auto` para el scroll horizontal.

---

## 6. Barras de progreso y puntos

No existe `input[type="range"]` en el producto: los “sliders” son barras de
participación.

```tsx
<div
  className="progress-track"
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(pct)}
  aria-label="Participación de caja"
>
  <div className="progress-bar bg-teal" style={{ width: `${pct}%` }} />
</div>
```

- Track `h-2` con `bg-slate-100`; barra con `bg-primary` por defecto.
- Colores: `bg-success` (positivo), `bg-warning` (gastos), `bg-danger`
  (negativo), `bg-teal` (destinos).
- Siempre con `aria-valuenow` y `aria-label` descriptivo.
- La etiqueta y el valor van arriba de la barra, no dentro.

---

## 7. Gráficos

Tema único en `client/src/components/charts/theme.ts` (`CHART`). Dashboard,
Finanzas y Caja lo importan; **no se declaran paletas locales**.

```tsx
import { CHART } from '../../components/charts/theme';

<ResponsiveContainer width="100%" height={240}>
  <ComposedChart data={data}>
    <CartesianGrid {...CHART.grid} />
    <XAxis dataKey="label" tick={CHART.axisTick} axisLine={false} tickLine={false} />
    <YAxis tick={CHART.axisTick} tickFormatter={formatCOPCompact} axisLine={false} tickLine={false} />
    <Tooltip {...CHART.tooltip} formatter={(v: any) => formatCOP(Number(v))} />
    <Legend wrapperStyle={CHART.legend.wrapperStyle} />
    <Bar dataKey="ventas" fill={CHART.color.blue} barSize={CHART.barSize} radius={CHART.barRadius} />
    <Line
      dataKey="utilidad_operativa"
      stroke={CHART.color.teal}
      strokeWidth={2}
      dot={{ ...CHART.dot, stroke: CHART.color.teal }}
      activeDot={{ ...CHART.activeDot, stroke: CHART.color.teal }}
    />
  </ComposedChart>
</ResponsiveContainer>
```

Reglas:

- Envolver en `<div role="img" aria-label="…">`.
- Ejes sin línea ni ticks; `tick={CHART.axisTick}` (10.5 px, `#5b6b7f`).
- `formatCOPCompact` en el eje Y; `formatCOP` completo en el tooltip.
- Series: azul = ventas, verde = cobros, rojo = compras/gastos, teal =
  utilidad, ámbar = flujo.
- No usar más de 3 series por gráfico ni colores fuera de `CHART.color`.
- Alturas: 190–200 px (panel pequeño), 255–290 px (panel principal).

---

## 8. Iconografía

- `lucide-react`, tamaño 12–15 px en tablas y botones, 15–21 px en cabeceras.
- Decorativos: `aria-hidden="true"`.
- Con acción propia: `aria-label` en el botón, no en el icono.
- Sobre navy: `text-slate-400`; activo: `text-primary-invert`.

---

## 9. Responsive

- Rejilla de KPIs: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-5`.
- Layout de contenido: `grid-cols-1 xl:grid-cols-3` (2 + 1).
- Formularios de dos columnas: `grid-cols-1 gap-4 sm:grid-cols-2`.
- Toolbars: `flex flex-wrap items-end gap-3`.
- Tablas anchas dentro de `overflow-x-auto`; el body no debe desplazarse
  horizontalmente.
- Puntos de revisión: **1440**, **1024** y **390 px** de ancho.

---

## 10. Impresión

- `.no-print` oculta controles; `aside` y `header` se ocultan en `@media print`.
- `.card` sin sombra y con `break-inside: avoid`.
- Etiquetas QR: página de `50 mm × 30 mm`, QR de 22 mm, nombre a 8 pt,
  código a 5 pt, precio a 10 pt (`variante canasta`).
- Probar siempre con “Vista previa de impresión” y escala 100 %.

---

## 11. Checklist de revisión visual

Cada vez que un cambio altere la estructura visual, repasar:

**Color y contraste**
- [ ] No quedan colores crudos (`gray-*`, `red-*`, `sky-*`, `emerald-*`, `amber-*`).
- [ ] Nada de `text-slate-500` sobre navy.
- [ ] Texto secundario en `text-muted`, no en `text-slate-400` sobre blanco.
- [ ] Estados usan `success` / `warning` / `danger` y su `-soft`.

**Tipografía**
- [ ] Nada por debajo de 11 px.
- [ ] Cifras con `money`/`num` (mono + tabular).
- [ ] Etiquetas en mayúsculas con `text-2xs`.
- [ ] Un solo `page-title` por pantalla.

**Espaciado y estructura**
- [ ] Páginas de lista con `space-y-5`.
- [ ] Modales y paneles densos con `space-y-4`.
- [ ] Tarjetas con `p-4`, sin sombras duras.
- [ ] Sin scroll horizontal del body en 1440/1024/390 px.

**Componentes**
- [ ] Errores vía `<Alert>`, vacíos vía `<Empty>`.
- [ ] Barras con `role="progressbar"` y `aria-valuenow`.
- [ ] Gráficos con `CHART` y `role="img"`.
- [ ] Botones sin sombra; una sola acción `btn-primary` por vista.
- [ ] Iconos decorativos con `aria-hidden="true"`.

**Verificación técnica**
- [ ] `npm run build` en `client/` compila sin errores.
- [ ] Revisión a 1440, 1024 y 390 px.
- [ ] Impresión de etiquetas 50 × 30 mm correcta.
