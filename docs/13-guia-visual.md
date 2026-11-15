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

Las superficies, la jerarquía de texto y los semánticos leen **variables CSS**
declaradas en `client/src/index.css` (`:root` y `.dark`). Por eso cambiar de
tema no requiere duplicar clases: alcanza con alternar `class="dark"` en
`<html>`.

### Marca

| Token | Hex | Uso |
|---|---|---|
| `brand` | `#0b5cab` | Fondos sólidos de marca (botón primario, logo) |
| `brand-hover` | `#084a8c` | Hover del botón primario |
| `brand-dark` | `#083a6e` | Active del botón primario |
| `accent` | variable | Texto, enlaces, iconos activos y foco |
| `primary-50` | variable | Fondo suave de selección y badges azules |
| `navy` | `#16232f` | Sidebar |
| `navy-800` | `#1b2c3b` | Bordes de superficies oscuras |
| `navy-900` | `#121e29` | Panel oscuro (posición de caja) |
| `navy-950` | `#0c151d` | Header y footer del sidebar |

> `brand` se reserva para fondos con texto blanco; `accent` para texto sobre
> superficies. Nunca `text-brand` ni `bg-accent`: en modo oscuro el contraste
> se pierde.

### Superficies y texto

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `canvas` | `#eef1f5` | `#0b121a` | Fondo de la aplicación |
| `card` | `#ffffff` | `#151e29` | Tarjetas, modales, header de tabla |
| `surface` | `#f8fafc` | `#1b2632` | Franjas alternas, hover de fila |
| `surface-2` | `#f1f5f9` | `#222f3d` | Chips, tracks, badges neutros |
| `line` | `#dfe4ea` | `#2d3c4d` | Bordes, divisores, inputs |
| `ink` | `#1f2937` | `#e9eff6` | Títulos y cifras principales |
| `body` | `#334155` | `#cbd5e2` | Cuerpo de tabla |
| `soft` | `#475569` | `#b0bdcc` | Etiquetas y texto de apoyo |
| `muted` | `#5b6b7f` | `#9cabbc` | Texto secundario |
| `subtle` | `#8a99ab` | `#8293a5` | Solo iconos decorativos y deshabilitados |

### Semánticos de estado

| Token | Claro | Oscuro | Fondo suave | Uso |
|---|---|---|---|---|
| `success` | `#157347` | `#6ee7b7` | `success-soft` | Pagado, utilidad, flujo positivo |
| `warning` | `#b45309` | `#fcd34d` | `warning-soft` | Pendiente, abono, alertas |
| `danger` | `#b42318` | `#fca5a5` | `danger-soft` | Fiado, saldo, error, cancelado |
| `teal` | `#0f766e` | `#2dd4bf` | — | Serie secundaria de gráficos |
| `emerald` | `#047857` | — | — | Utilidad bruta en KPIs |

Los semánticos cambian con el tema para mantener contraste sobre superficies
oscuras. Para **fondos con texto blanco** (botones, contadores) usar la variante
sólida, que no cambia: `success-solid`, `warning-solid`, `danger-solid`.

Sobre superficies oscuras (navy) usar los tintes `*-invert`:

| Token | Hex |
|---|---|
| `success-invert` | `#6ee7b7` |
| `warning-invert` | `#fcd34d` |
| `danger-invert` | `#fca5a5` |
| `primary-invert` | `#7dd3fc` |

### Jerarquía de texto

| Token / clase | Uso |
|---|---|
| `text-ink` | Títulos, cifras principales, nombres en tablas |
| `text-body` | Cuerpo de tabla y formularios |
| `text-soft` | Etiquetas y texto de apoyo |
| `text-muted` | Texto secundario (metadatos, ayudas) |
| `text-subtle` | Solo iconos decorativos y estados deshabilitados |
| `text-accent` | Enlaces, acciones de texto, iconos activos |

**Nunca** usar `text-subtle` para texto legible ni `text-muted` sobre navy: ahí
va `text-slate-400`. Las clases `text-slate-*` solo se conservan en la barra
lateral y el header, que son superficies fijas.

---

## 1.b Modo oscuro

- Se activa con `class="dark"` en `<html>`; `tailwind.config.js` usa
  `darkMode: 'class'`.
- Preferencia por usuario en `usuarios.tema` (`claro` · `oscuro` · `sistema`),
  guardada por `PATCH /api/v1/auth/preferencias`. Sin sesión se guarda en
  `localStorage` (`tema`).
- `sistema` sigue `prefers-color-scheme` y se actualiza si el dispositivo
  cambia mientras la app está abierta.
- `client/index.html` aplica el tema antes del primer pintado para evitar el
  destello blanco.
- El selector `TemaMenu` de la cabecera expone `role="menu"` /
  `menuitemradio`, flechas, Escape y devuelve el foco al botón.
- Los gráficos leen variables `--chart-*`, así que heredan el tema sin
  recalcular series.
- `color-scheme` se ajusta para que los controles nativos (fecha, scrollbar)
  acompañen.

**Reglas al crear componentes**

- Usar siempre tokens (`bg-card`, `text-body`, `border-line`), nunca `bg-white`
  ni hex.
- Fondos con texto blanco: `brand`, `*-solid` o navy, nunca `bg-danger` (en
  oscuro se aclara y pierde contraste).
- Probar cada pantalla nueva en claro y oscuro antes de cerrar el cambio.

---

## 2. Escala tipográfica

Tipografía: **Source Sans 3** para toda la interfaz (400/500/600/700) e
**IBM Plex Mono** para cifras y códigos. Se cargan desde Google Fonts en
`index.css` y se declaran en `tailwind.config.js` (`font-sans` / `font-mono`).

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
- `.label` en mayúsculas, `text-2xs`, `text-soft`.
- `.input` 34 px de alto, borde `line`, foco con anillo de `accent` al 22 %,
  error con `aria-invalid="true"`.
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
      <td className="font-medium text-ink">Nombre</td>
      <td className="num font-semibold text-ink">$ 12.000</td>
    </tr>
  </tbody>
</table>
```

- Columnas numéricas: `className="num"` (alineación derecha + mono + tabular).
- Encabezados numéricos también `text-right`.
- Importes secundarios: `text-muted`; importes principales: `text-ink`.
- Filas canceladas o inactivas: `opacity-60` o `line-through`, no color rojo
  en toda la fila.
- Tablas dentro de tarjeta: contenedor `card overflow-hidden p-0` y
  `overflow-x-auto` para el scroll horizontal.
- Cabecera fija: `.table-sticky` (usa `z-sticky`, por debajo de menús y modales).

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

- Track `h-2` con `bg-surface-2`; barra con `bg-primary` por defecto.
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
    <Bar dataKey="ventas" fill={CHART.color.blue} barSize={CHART.barSize} radius={CHART.barRadius} isAnimationActive={CHART.animation} />
    <Line
      dataKey="utilidad_operativa"
      stroke={CHART.color.teal}
      strokeWidth={2}
      dot={{ ...CHART.dot, stroke: CHART.color.teal }}
      activeDot={{ ...CHART.activeDot, stroke: CHART.color.teal }}
      isAnimationActive={CHART.animation}
    />
  </ComposedChart>
</ResponsiveContainer>
```

Reglas:

- Envolver en `<div role="img" aria-label="…">`.
- Ejes sin línea ni ticks; `tick={CHART.axisTick}` (11 px, `#5b6b7f`).
- `formatCOPCompact` en el eje Y; `formatCOP` completo en el tooltip.
- Series: azul = ventas, verde = cobros, rojo = compras/gastos, teal =
  utilidad, ámbar = flujo.
- `CHART.animation` (hoy `false`): las vistas de gestión muestran los datos
  sin animación de entrada; la animación de Recharts puede dejar el gráfico
  vacío durante ~1,5 s al entrar o al cambiar de pestaña.
- Barras verticales: `radius={CHART.barRadius}`. Horizontales:
  `radius={CHART.barRadiusH}`.
- No usar más de 3 series por gráfico ni colores fuera de `CHART.color`.
- Alturas: 190–200 px (panel pequeño), 255–290 px (panel principal).

---

## 8. Iconografía

- `lucide-react`, tamaño 12–15 px en tablas y botones, 15–21 px en cabeceras.
- Decorativos: `aria-hidden="true"`.
- Con acción propia: `aria-label` en el botón, no en el icono.
- Sobre navy: `text-slate-400`; activo: `text-primary-invert`.

---

## 8.b Capas (z-index)

Escala única en `tailwind.config.js`; no usar valores arbitrarios salvo en
casos puntuales justificados.

| Token | Valor | Elemento |
|---|---|---|
| `z-sticky` | 10 | Header, cabecera fija de tablas |
| `z-dropdown` | 30 | Menús, sugerencias, overlay del drawer |
| `z-drawer` | 40 | Drawer móvil |
| `z-modal` | 50 | Modales y diálogos |
| `z-toast` | 60 | Avisos flotantes |
| `z-skip` | 70 | Enlace “Saltar al contenido” |

Reglas:

- Un modal nunca comparte capa con el drawer: si se abre un modal desde el
  drawer, el modal va por encima.
- El overlay del drawer usa `z-dropdown` para quedar debajo del panel.
- Los tooltips de gráficos (Recharts) viven dentro del SVG y no compiten.

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

## 11. Copy y formatos

- Fechas: `formatDate` → `dd/mm/aaaa`; con hora, `formatDateTime` →
  `dd/mm/aaaa · HH:mm` (24 h). No usar `toLocaleString` suelto.
- Conteos: `plural(n, 'pedido')` → “1 pedido” / “22 pedidos”. Nunca
  “22 pedido(s)”. Para frases: `plural(n, 'alerta pendiente', 'alertas pendientes')`.
- Dinero: `formatCOP` en tablas y fichas, `formatCOPCompact` solo en ejes.
- Cifras negativas entre paréntesis únicamente en el estado de resultados.

---

## 12. Checklist de revisión visual

Cada vez que un cambio altere la estructura visual, repasar:

**Color y contraste**
- [ ] No quedan colores crudos (`gray-*`, `red-*`, `sky-*`, `emerald-*`, `amber-*`).
- [ ] Nada de `bg-white` ni hex sueltos: todo vía tokens de superficie.
- [ ] Nada de `text-slate-500` sobre navy.
- [ ] Texto secundario en `text-muted`, no en `text-subtle`.
- [ ] Estados usan `success` / `warning` / `danger` y su `-soft`.
- [ ] Fondos con texto blanco usan `brand` o `*-solid`, no el semántico base.

**Modo oscuro**
- [ ] La pantalla se ve bien en claro y en oscuro.
- [ ] El tema persiste al recargar y sigue al dispositivo en “Sistema”.
- [ ] Gráficos, badges y scrollbar acompañan el tema.
- [ ] El selector de tema funciona con teclado (flechas, Escape, foco).

**Capas**
- [ ] Header con `z-sticky`; menús con `z-dropdown`; drawer con `z-drawer`.
- [ ] Modales con `z-modal`; ningún `z-50`/`z-[…]` suelto.

**Tipografía**
- [ ] Nada por debajo de 11 px.
- [ ] Cifras con `money`/`num` (mono + tabular).
- [ ] Etiquetas en mayúsculas con `text-2xs`.
- [ ] Un solo `page-title` por pantalla.
- [ ] Conteos con `plural()`, sin “(s)”.
- [ ] Fechas con `formatDate` / `formatDateTime`.

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

**Accesibilidad de teclado**
- [ ] Tab recorre la pantalla en orden lógico; el skip link aparece al enfocar.
- [ ] Drawer y modales atrapan el foco, cierran con Escape y lo devuelven.
- [ ] Menús (tema, sugerencias) se abren con Enter/Espacio y navegan con flechas.
- [ ] Todo control con solo icono tiene `aria-label` y `title`.
- [ ] El foco es visible en claro y en oscuro.

**Verificación técnica**
- [ ] `npm run build` en `client/` compila sin errores.
- [ ] Revisión a 1440, 1024 y 390 px.
- [ ] Impresión de etiquetas 50 × 30 mm correcta.
