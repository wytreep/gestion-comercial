# 07 · API REST

## Convenciones

- Base: `/api/v1`
- Formato: JSON UTF-8
- Autenticación: `Authorization: Bearer <token>`
- Fechas: `YYYY-MM-DD` o `YYYY-MM-DD HH:MM:SS`
- Moneda: COP como número decimal

### Respuesta estándar

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

### Error estándar

```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": {}
}
```

### Códigos HTTP

| Código | Significado |
|---|---|
| `200` | Consulta o actualización correcta |
| `201` | Recurso creado |
| `400` | Datos inválidos |
| `401` | Token ausente o vencido |
| `403` | Rol sin permiso |
| `404` | Recurso no encontrado |
| `409` | Conflicto de negocio |
| `422` | Error de validación |
| `429` | Demasiados intentos de login |
| `500` | Error interno |

## Autenticación

### Iniciar sesión

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "usuario@dominio.com",
  "password": "contraseña"
}
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 900,
    "user": {
      "id": 1,
      "nombre": "Administrador",
      "email": "admin@dominio.com",
      "rol": "admin",
      "tema": "sistema"
    }
  }
}
```

### Renovar token

```http
POST /api/v1/auth/refresh

{ "refresh_token": "..." }
```

El refresh es **de un solo uso**: cada canje devuelve un par nuevo y el anterior
queda marcado como usado. Reutilizarlo se interpreta como robo y revoca la
sesión completa (todos sus access y refresh). El canje tambien falla si la
peticion llega desde otra IP distinta a la del inicio de sesion.

### Estado del bloqueo de la IP

```http
GET /api/v1/auth/estado-ip
```

```json
{ "success": true, "data": {
  "bloqueo": true, "permanente": false, "nivel": 2,
  "restante": 1800, "hasta": "2026-11-15 03:48:23",
  "mensaje": "Demasiados intentos fallidos. Intenta de nuevo en 30 minutos."
} }
```

La pantalla de login lo consulta al cargar para deshabilitar el formulario
aunque se recargue la pagina.

### Cerrar sesión

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

Revoca la sesión en el servidor: el access y su refresh dejan de servir.

### Cambiar contraseña

```http
POST /api/v1/auth/cambiar-password
Authorization: Bearer <token>

{
  "password_actual": "...",
  "password_nueva": "..."
}
```

Al cambiarla se revocan las demás sesiones abiertas de ese usuario.

### Re-autenticación para el panel de seguridad

```http
POST /api/v1/auth/seguridad
Authorization: Bearer <token>

{ "password": "..." }
```

Devuelve `security_token` (10 minutos, atado a la sesión y a la IP). Ese token
viaja en la cabecera `X-Security-Token` en las rutas de `/admin/seguridad/*`.

### Panel de seguridad (solo admin + `X-Security-Token`)

| Método | Ruta | Acción |
|---|---|---|
| GET | `/admin/seguridad/sesiones` | Sesiones activas |
| DELETE | `/admin/seguridad/sesiones/{id}` | Revoca una sesión |
| GET | `/admin/seguridad/bloqueos` | IPs con fallos o bloqueos |
| GET | `/admin/seguridad/eventos` | Bitácora de seguridad |
| POST | `/admin/seguridad/desbloquear` | `{ ip, motivo }` |
| POST | `/admin/seguridad/bloquear` | `{ ip, motivo }` envía a lista negra |

### Bloqueo por fuerza bruta

- 5 intentos fallidos seguidos por IP cierran el formulario de login.
- Cada bloqueo sube de nivel: 5 min, 30 min, 24 h, 7 días y lista negra
  permanente en el quinto.
- Un inicio de sesión correcto limpia los intentos, pero no el nivel; la
  escalada vuelve a cero tras 30 días sin bloqueos.
- La respuesta es `429` con `Retry-After` y `data.bloqueo`, `data.nivel`,
  `data.restante`, `data.permanente`.

## Dashboard

```http
GET /api/v1/dashboard
```

Devuelve el resumen del mes, últimas ventas, stock y alertas pendientes.

Para roles distintos de `admin`, el servidor omite:

- `resumen_mes.inversion`
- `resumen_mes.ganancia_bruta`
- `resumen_mes.margen_bruto`
- `saldos_destino`
- `precio_compra` en el stock

## Productos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/productos` | Todos | Listado con stock y margen. `?incluir_inactivos=1` (solo admin) incluye desactivados |
| GET | `/productos/{id}` | Todos | Detalle |
| GET | `/productos/codigo/{codigo}` | Todos | Busca un producto activo por su código QR, de barras o de etiqueta |
| POST | `/productos` | Admin | Crea un producto (con stock inicial opcional) |
| PUT | `/productos/{id}` | Admin | Edita nombre, categoría, unidad y precios |
| DELETE | `/productos/{id}` | Admin | Desactiva el producto (no borra su historial) |
| PATCH | `/productos/{id}/reactivar` | Admin | Vuelve a activar el producto |
| PUT | `/productos/{id}/precio` | Admin | Actualiza precios y kilos por canasta |
| GET | `/productos/{id}/historial` | Admin | Historial de precios |
| PATCH | `/productos/{id}/stock` | Admin | Ajuste manual de stock |
| GET | `/stock/movimientos` | Todos | Movimientos de inventario |

El código de cada producto se deriva de su identificador con el formato
`GCOM-P-0001`. La búsqueda por código devuelve `404` si el producto no existe o
está inactivo. Para roles distintos de `admin`, la respuesta omite
`precio_compra`, `margen` y cualquier dato de costo.

Si el código corresponde a una etiqueta (`GCOM-E-…`), la respuesta incluye el
objeto `etiqueta` con su tipo, peso, lote y fecha de empaque. El escáner de
ventas usa ese peso para agregar la cantidad correcta de kilos.

```http
GET /api/v1/productos/codigo/GCOM-P-0001
Authorization: Bearer <token>
```

Ejemplo de actualización de precio:

```http
PUT /api/v1/productos/1/precio
Authorization: Bearer <token>

{
  "precio_compra": 120000,
  "precio_venta": 15000,
  "kilos_por_canasta": 20
}
```

Ejemplo de creación:

```http
POST /api/v1/productos
Authorization: Bearer <token>

{
  "nombre": "Queso campesino",
  "categoria_id": 2,
  "unidad_medida": "kilo",
  "precio_compra": 9000,
  "precio_venta": 14000,
  "kilos_por_canasta": null,
  "stock_inicial": 10
}
```

`unidad_medida` acepta `kilo`, `canasta` o `unidad`. Si es `canasta`,
`kilos_por_canasta` es obligatorio. El `stock_inicial` se registra como un
movimiento de ajuste para conservar la trazabilidad.

## Categorías

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/categorias` | Todos | Categorías activas con número de productos |
| POST | `/categorias` | Admin | Crea una categoría |

La creación de producto también acepta `categoria_nombre` en lugar de
`categoria_id`; si la categoría no existe, se crea automáticamente.

## Etiquetas QR

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/etiquetas` | Todos | Listado con filtros `q`, `tipo`, `estado`, `lote`, `producto_id` |
| POST | `/etiquetas` | Admin, vendedor | Genera una o varias etiquetas |
| GET | `/etiquetas/{codigo}` | Todos | Detalle de una etiqueta |
| POST | `/etiquetas/{codigo}/anular` | Admin, vendedor | Anula la etiqueta |

Tipos válidos: `producto`, `canasta` y `lote`. Las etiquetas de canasta exigen
`peso_kg` (si el producto tiene `kilos_por_canasta`, se usa como valor por
defecto); las de lote exigen `lote`. `copias` admite de 1 a 50.

```http
POST /api/v1/etiquetas
Authorization: Bearer <token>

{
  "producto_id": 3,
  "tipo": "canasta",
  "peso_kg": 18.5,
  "fecha_empaque": "2026-11-04",
  "copias": 2
}
```

La respuesta es siempre una lista, incluso cuando se genera una sola copia:

```json
{
  "success": true,
  "message": "Etiqueta generada",
  "data": [
    {
      "id": 1,
      "codigo": "GCOM-E-1A2B3C4D5E",
      "tipo": "canasta",
      "producto_id": 3,
      "producto": "Pescado entero",
      "peso_kg": 18.5,
      "lote": null,
      "fecha_empaque": "2026-11-04",
      "estado": "activa",
      "contenido_qr": "GCOM-E-1A2B3C4D5E"
    }
  ]
}
```

El QR contiene el código de la etiqueta. Al escanearlo desde Ventas se resuelve
al producto; en etiquetas de canasta se agrega el peso indicado en kg.

## Ventas

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/ventas` | Todos | Listado con filtros |
| POST | `/ventas` | Admin, vendedor | Crea venta |
| GET | `/ventas/{id}` | Todos | Detalle |
| PUT | `/ventas/{id}` | Admin, vendedor | Actualiza venta |
| DELETE | `/ventas/{id}` | Admin | Elimina y restaura stock |
| POST | `/ventas/{id}/pagos` | Admin, vendedor | Registra abono |

Ejemplo de venta:

```http
POST /api/v1/ventas
Authorization: Bearer <token>

{
  "cliente_id": 12,
  "fecha_venta": "2026-11-02 10:30:00",
  "estado_pedido": "nuevo",
  "observaciones": "",
  "items": [
    { "producto_id": 2, "cantidad": 2, "precio_unitario": 8000 }
  ],
  "abono_inicial": 5000,
  "medio_pago": "efectivo",
  "destino_dinero": "efectivo_caja"
}
```

### Filtros de ventas

| Parámetro | Ejemplo |
|---|---|
| `desde` | `2026-11-01` |
| `hasta` | `2026-11-30` |
| `estado_pago` | `pendiente` |
| `estado_pedido` | `nuevo` |
| `cliente_id` | `12` |

### Cobro con QR

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/ventas/{id}/cobros-qr` | Todos | Cobros generados para la venta |
| POST | `/ventas/{id}/cobros-qr` | Admin, vendedor | Genera un cobro pendiente |
| GET | `/cobros-qr/{codigo}` | Todos | Consulta estado y vencimiento |
| POST | `/cobros-qr/{codigo}/confirmar` | Admin, vendedor | Registra el pago confirmado |
| POST | `/cobros-qr/{codigo}/anular` | Admin, vendedor | Anula un cobro pendiente |

El monto es opcional al crear: si se omite, se cobra el saldo pendiente. El
cobro vence a los 15 minutos y solo puede existir uno activo por venta. Al
generar uno nuevo, el anterior queda anulado.

```http
POST /api/v1/ventas/49/cobros-qr
Authorization: Bearer <token>

{ "monto": 20000 }
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "codigo": "GCOM-C-94DA5354E0DC",
    "monto": 20000,
    "estado": "pendiente",
    "expira_en": 900,
    "contenido_qr": "GCOM-COBRO|GCOM-C-94DA5354E0DC|VENTA:49|MONTO:20000.00"
  }
}
```

Confirmación manual:

```http
POST /api/v1/cobros-qr/GCOM-C-94DA5354E0DC/confirmar
Authorization: Bearer <token>

{
  "referencia": "88451203",
  "medio_pago": "transferencia",
  "destino_dinero": "billetera_nequi"
}
```

La confirmación exige `referencia`, registra el pago en `pagos` y actualiza el
saldo de la venta y la cartera en una sola transacción. Un cobro vencido o
anulado no se puede confirmar.

## Compras

Solo administración.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/compras` | Listado |
| POST | `/compras` | Crea compra |
| GET | `/compras/{id}` | Detalle |
| PUT | `/compras/{id}` | Actualiza |
| PATCH | `/compras/{id}/estado` | Cambia estado |

Ejemplo:

```json
{
  "proveedor_id": 3,
  "fecha_compra": "2026-11-02",
  "fecha_llegada": "2026-11-03",
  "observaciones": "Compra semanal",
  "items": [
    { "producto_id": 1, "cantidad": 2, "precio_unitario": 120000 }
  ],
  "gastos": [
    { "tipo_gasto_id": 1, "monto": 30000, "descripcion": "Flete" }
  ]
}
```

## Clientes y proveedores

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/clientes` | Todos | Listado |
| POST | `/clientes` | Admin, vendedor | Crea cliente |
| PUT | `/clientes/{id}` | Admin, vendedor | Actualiza |
| GET | `/proveedores` | Todos | Listado |
| GET | `/tipos_gasto` | Todos | Catálogo de gastos |

## Cartera

```http
GET /api/v1/cartera
```

Devuelve clientes con saldo pendiente y totales.

## Caja

Solo administración.

```http
GET /api/v1/caja?mes=2026-11
```

Devuelve cobros, egresos, saldos por destino y serie diaria.

## Finanzas

Solo administración.

```http
GET /api/v1/finanzas?mes=2026-11
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "periodo": "2026-11",
    "periodo_label": "noviembre 2026",
    "estado_resultados": {},
    "flujo": {},
    "indicadores": {},
    "productos": [],
    "tendencia": [],
    "comparativo": {}
  }
}
```

Las fórmulas se documentan en [08 · Finanzas](08-finanzas.md).

## Notificaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/notificaciones` | Listado |
| GET | `/notificaciones/count` | Pendientes |
| POST | `/notificaciones/leer-todas` | Marca todas |
| PATCH | `/notificaciones/{id}/leer` | Marca una |

Las alertas se generan automáticamente al abrir el dashboard. Una alerta marcada
como leída **no vuelve a crearse** mientras la condición siga vigente (stock bajo
o deuda vencida); se elimina cuando la condición se resuelve y puede reaparecer
si vuelve a ocurrir. Existe una sola alerta por `(tipo, referencia_id)`.

## Reportes

Solo administración.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reportes/mensual?mes=YYYY-MM` | Resumen JSON |
| GET | `/reportes/mensual/pdf?mes=YYYY-MM` | PDF descargable |

## Usuarios

Solo administración.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/usuarios` | Listado |
| POST | `/auth/register` | Crea usuario |
| PATCH | `/usuarios/{id}/rol` | Cambia rol |
| PATCH | `/usuarios/{id}/activo` | Activa o desactiva |

## Respaldos

Solo administración.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/backup/generar` | Genera y descarga SQL |
| GET | `/backup/historial` | Bitácora de respaldos |

## Ejemplo de cliente

```ts
const res = await fetch('/api/v1/ventas', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
});

const { data } = await res.json();
```

## Versionado

La versión actual es `v1`. Los cambios incompatibles deben publicarse en una
ruta nueva (`/api/v2`) y mantener `v1` durante una transición documentada.
