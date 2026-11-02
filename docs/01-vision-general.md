# 01 · Visión general

## Qué es Gestión Comercial

Gestión Comercial es un sistema de gestión comercial (ERP ligero) para un
negocio de distribución de pescado, queso y carne. Cubre el ciclo completo de
operación:

1. Compra de mercancía a proveedores, con gastos de transporte y almacenamiento.
2. Recepción y control de inventario por kilos y canastas.
3. Venta a clientes, con pago total, abono o crédito.
4. Cobro de cartera y registro de pagos por medio y destino.
5. Cierre mensual con estado de resultados, flujo de caja y reportes.

El sistema separa dos experiencias: **administración** (dueño del negocio) y
**vendedor** (fuerza de ventas). El vendedor opera el día a día sin acceso a
costos, márgenes, utilidades ni compras.

## Ficha del proyecto

| Campo | Valor |
|---|---|
| Nombre | Gestión Comercial |
| Versión | 3.0.0 |
| Tipo | ERP ligero de distribución y comercialización |
| Sector | Distribución de pescado, queso y carne |
| Mercado | Colombia |
| Moneda | COP |
| Idioma | Español (Colombia) |
| Inicio del proyecto | Septiembre de 2026 |
| Versión documentada | Noviembre de 2026 |
| Estado | Operativo en local; listo para despliegue controlado |
| Repositorio | <https://github.com/wytreep/gestion-comercial> |

## Alcance funcional

### Incluido en esta versión

| Módulo | Funcionalidad |
|---|---|
| Panel | Indicadores operativos y financieros según el rol |
| Ventas | Registro, edición, detalle, pagos y abonos |
| Compras | Proveedores, detalle, gastos y recepción |
| Inventario | Stock por producto, movimientos y ajustes |
| Clientes | Datos de contacto y consulta de saldo |
| Cartera | Cuentas por cobrar por cliente y cobro de abonos |
| Caja | Cobros por medio y destino, egresos por compras |
| Finanzas | Estado de resultados, flujo de caja e indicadores |
| Reportes | Resumen mensual en JSON y PDF |
| Alertas | Deudas vencidas y stock bajo |
| Administración | Usuarios, roles y estado de la cuenta |
| Copias de seguridad | Generación y descarga de respaldos SQL |

### Fuera de alcance en esta versión

- Facturación electrónica ante la DIAN.
- IVA, retenciones y obligaciones tributarias.
- Nómina y contabilidad formal.
- Multiempresa y multi-bodega.
- Aplicación móvil nativa.
- Escáner de códigos QR (previsto en el roadmap).

## Tecnologías utilizadas

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18.3.1 | Interfaz de usuario |
| TypeScript | 5.5.3 | Tipado estático |
| Vite | 5.4.8 | Empaquetado y desarrollo |
| React Router | 6.26.2 | Navegación SPA |
| TanStack Query | 5.56.2 | Estado del servidor y caché |
| React Hook Form | 7.53.0 | Formularios |
| Axios | 1.7.7 | Cliente HTTP |
| Tailwind CSS | 3.4.12 | Sistema de diseño |
| Recharts | 2.12.7 | Gráficas |
| Lucide React | 0.447.0 | Iconografía |

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| PHP | 8.4.27 | API REST |
| MySQL | 8.0 | Base de datos |
| nginx | 1.27 | Servidor web y proxy |
| firebase/php-jwt | 6.10 | Autenticación JWT |
| TCPDF | 6.7 | Reportes PDF |
| PHPUnit | 11.0 | Pruebas |

### Infraestructura

| Tecnología | Uso |
|---|---|
| Docker | Contenedores de nginx, PHP-FPM y MySQL |
| Docker Compose | Orquestación local |
| Git | Control de versiones |
| OpenCode | Asistencia de desarrollo con IA |

### Decisiones de diseño

- **Arquitectura por capas** en el backend: controlador, servicio, repositorio.
- **SPA con proxy inverso**: nginx sirve el frontend y enruta `/api/*` a PHP-FPM.
  No hay CORS ni URLs absolutas en el cliente.
- **Base de datos relacional** con llaves foráneas, vistas y triggers para
  totales y estados de pago.
- **Diseño visual tipo ERP financiero**: azul corporativo, navy oscuro, tipografía
  IBM Plex Sans y Mono, tablas densas, radios pequeños y sin elementos decorativos.
- **Navegación híbrida**: barra superior para módulos principales y riel lateral
  para acciones y datos maestros.

## Fechas del proyecto

| Etapa | Periodo | Entregable |
|---|---|---|
| Definición | Septiembre de 2026 | Alcance, modelo de datos y esquema base |
| Construcción base | Septiembre – octubre de 2026 | API, ventas, compras, stock, cartera y caja |
| Consolidación | Octubre de 2026 | Reportes, alertas, respaldos y seguridad |
| Rediseño y control | Noviembre de 2026 | Interfaz ERP, finanzas, roles y documentación |
| Publicación | Noviembre de 2026 | Repositorio y documentación en GitHub |

Las fechas corresponden al periodo de construcción registrado en el entorno de
desarrollo y en los datos operativos del sistema. No se incluyen fechas de
compromisos comerciales ni cronogramas de terceros.

## Uso de inteligencia artificial

La inteligencia artificial se utilizó como **asistente de implementación**, no
como sustituto de las decisiones del negocio. El criterio comercial, las reglas
de permisos y la validación funcional fueron definidos por el responsable del
proyecto.

| Frente | Aporte de la IA | Validación humana |
|---|---|---|
| Diseño de interfaz | Propuesta de sistema visual, componentes y jerarquía | Revisión de uso real y ajustes de negocio |
| Backend | Estructura de capas, validaciones y consultas | Pruebas con datos reales y revisión de reglas |
| Finanzas | Implementación de fórmulas y consultas | Definición del criterio devengado y de caja |
| Permisos | Separación de vistas y endpoints por rol | Decisión de qué información ve el vendedor |
| Documentación | Redacción, diagramas y mockups | Revisión de exactitud y alcance |
| Calidad | Revisión de errores, permisos y consistencia | Pruebas de extremo a extremo |

### Buenas prácticas aplicadas

- La IA trabajó sobre el código del proyecto, no sobre bases de datos reales.
- No se compartieron datos personales de clientes con servicios de IA.
- Las credenciales y los secretos permanecieron fuera del repositorio.
- Toda sugerencia de la IA se probó en el entorno local antes de aceptarse.
- Las reglas contables y de permisos se documentaron para que puedan auditarse.

### Herramientas

- **OpenCode** como entorno de desarrollo asistido.
- Modelos de lenguaje para análisis de código, refactorización y redacción.
- Revisión manual del responsable del proyecto en cada cambio funcional.

## Principios del producto

1. **Operación primero:** cada pantalla responde a una tarea concreta.
2. **Datos confiables:** totales calculados en base de datos y validados en el servidor.
3. **Permisos reales:** no basta con ocultar botones; la API también restringe.
4. **Trazabilidad:** movimientos de stock, historial de precios y bitácora de respaldos.
5. **Simplicidad:** sin funciones decorativas ni jerga innecesaria.
6. **Continuidad:** respaldos descargables y restauración documentada.

## Métricas de referencia

Datos operativos del entorno de validación al cierre de la documentación:

| Indicador | Valor |
|---|---|
| Ventas registradas | 25 |
| Clientes registrados | 23 |
| Productos activos | 3 |
| Usuarios | 2 (administrador y vendedor de prueba) |

Estos valores son de un entorno de prueba y no representan el volumen real del
negocio.
