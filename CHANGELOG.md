# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.  
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)  
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] — 2026-09-06

### ✨ Añadido — Primera versión completa

#### Módulo Dashboard
- KPIs del mes: ventas totales, dinero cobrado, inversión en compras, ganancia bruta estimada, cartera pendiente
- Cálculo de ganancia bruta correcto: `ventas del mes − inversión total en compras del mes`
- Margen bruto porcentual calculado sobre ventas del mes
- Stock actual de los 3 productos con precios de compra y venta
- Saldos por destino de dinero (caja efectivo, Nequi, Daviplata, Bancolombia, banco)
- Últimas 5 ventas con estado de pago y pedido
- Indicador de conexión a la base de datos en tiempo real

#### Módulo Ventas
- Registro de nueva venta con búsqueda de cliente en tiempo real
- Creación rápida de clientes desde el formulario de venta
- Múltiples productos por venta con precio editable al momento de vender
- Gastos de reparto/domicilio asociados a la venta
- Pago inicial configurable: monto, medio (efectivo/transferencia), destino del dinero
- Soporte para ventas a crédito (fiado) con fecha de vencimiento
- Edición completa de ventas: cliente, estado, productos, fecha de entrega
- Reversión automática de stock al editar o eliminar productos de una venta
- Eliminación de venta sin pagos: elimina registro y revierte stock
- Cancelación de venta con pagos: conserva pagos, marca como cancelada
- Filas canceladas visualmente diferenciadas (tachadas + opacidad reducida)
- Filtros por estado de pago, estado de pedido y rango de fechas

#### Módulo Abonos y Pagos
- Registro de abonos parciales con validación de saldo disponible
- Seguimiento del medio de pago: efectivo o transferencia
- Rastreo del destino del dinero: caja, Nequi, Daviplata, Bancolombia App, banco, otro
- Campo de referencia/comprobante para transferencias
- Actualización automática del estado de pago via triggers MySQL
- Historial completo de pagos por venta

#### Módulo Compras
- Registro de lote de mercancía con proveedor opcional
- Múltiples productos por compra
- Actualización automática del precio de compra y stock al registrar
- Campo de kilos estimados por media canasta de pescado
- Stock de pescado suma kilos reales (kilos_estimados), no número de canastas
- Gastos operativos desglosados por tipo:
  - Transporte origen → ciudad (flete del proveedor)
  - Transporte recogida (ir a recoger mercancía)
  - Transporte reparto domicilios
  - Cuarto frío (almacenamiento refrigerado)
  - Otros gastos operativos
- Estado editable inline en la tabla: pendiente / parcial / recibida
- Edición completa de compras: reversión de stock anterior y aplicación del nuevo
- Modal de detalle con resumen de productos, gastos y total de inversión

#### Módulo Cartera
- Listado de clientes con saldo pendiente de cobro
- Alerta visual de deudas vencidas (fiados sin pagar después de la fecha acordada)
- Días de mora calculados automáticamente
- Acceso directo al cobro desde la vista de cartera

#### Módulo Caja y Flujo de Dinero
- Balance del período: ingresos cobrados vs inversiones en compras
- Saldos históricos acumulados por destino de dinero
- Movimientos diarios desglosados por medio de pago y destino
- Filtro por rango de fechas personalizable

#### Módulo Clientes
- CRUD completo con búsqueda en tiempo real por nombre o teléfono
- Historial de compras por cliente

#### Módulo Productos y Precios
- Margen real por producto:
  - Kilo/unidad: `(precio_venta - precio_compra) / precio_venta`
  - Canasta (pescado): `(precio_venta_kg - costo_kg) / precio_venta_kg` donde `costo_kg = precio_canasta / kg_por_canasta`
- Campo configurable de **kilos por media canasta** para calcular costo real por kg del pescado
- Preview en tiempo real del costo/kg y margen estimado al editar precios
- Historial de cambios de precio con fecha y motivo
- Columna de costo real por kg para comparación directa

#### PWA (Progressive Web App)
- Instalable en el escritorio de Windows desde Chrome o Edge
- Service Worker con estrategia cache-first para assets y network-first para la API
- Manifiesto PWA completo con shortcuts de acceso rápido
- Botón de instalación integrado en la barra superior
- Datos conservados al instalar (base de datos MySQL local independiente)

#### Infraestructura
- API REST en PHP 8 con PDO y transacciones
- SPA vanilla JS con router hash-based sin dependencias externas
- Base de datos MySQL con triggers automáticos para totales, saldos y estados
- Vistas SQL: `v_rentabilidad_ventas`, `v_cartera`, `v_caja`
- `.htaccess` con MIME types explícitos, headers de seguridad y rewrite correcto
- Instalador automático para Windows (`instalar.bat`)
- Generador de iconos PWA (`generate_icons.php`)

### 🐛 Corregido — Durante desarrollo

- `SyntaxError: Identifier 'formatCOP' already declared`: `utils.js` refactorizado con IIFE; `app.js` usa `var` en lugar de `const` para aliases de `Utils`
- MIME type error CSS/JS: reglas `RewriteCond -f` y `-d` reubicadas correctamente en `.htaccess`
- Margen de pescado calculado con unidades incomparables (canasta vs kilo): corregido con campo `kilos_por_canasta`
- Ganancia bruta negativa (`-$2.5M`): reemplazado cálculo `cantidad × precio_compra` (incompatible con pescado) por `ventas_mes − inversión_mes`
- Stock de pescado contaba canastas en lugar de kilos
- Puerto MySQL hardcodeado a 3306; corregido a 3307 (XAMPP del cliente)

---

## [Próximas versiones — Roadmap]

### [1.1.0] — Planificado
- [ ] Reportes exportables a PDF (resumen mensual, estado de cartera)
- [ ] Historial de movimientos de stock (entradas y salidas)
- [ ] Notificaciones de deudas vencidas al abrir la app

### [1.2.0] — Planificado
- [ ] Múltiples usuarios con roles (admin / vendedor / solo lectura)
- [ ] Backup automático de la base de datos
- [ ] Soporte para más productos/categorías configurables
