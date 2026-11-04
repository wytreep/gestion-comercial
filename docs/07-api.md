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
    "user": {
      "id": 1,
      "nombre": "Administrador",
      "email": "admin@dominio.com",
      "rol": "admin"
    }
  }
}
```

### Renovar token

```http
POST /api/v1/auth/refresh
```

### Cambiar contraseña

```http
POST /api/v1/auth/cambiar-password
Authorization: Bearer <token>

{
  "password_actual": "...",
  "password_nueva": "..."
}
```

### Rate limiting

- 5 intentos fallidos por email e IP.
- 20 intentos fallidos por IP.
- Ventana de 15 minutos.
- Bloqueo de 15 minutos.
- Respuesta `429` con cabecera `Retry-After`.

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
| GET | `/productos` | Todos | Listado con stock y margen |
| GET | `/productos/{id}` | Todos | Detalle |
| GET | `/productos/codigo/{codigo}` | Todos | Busca un producto activo por su código QR o de barras |
| PUT | `/productos/{id}/precio` | Admin | Actualiza precios y kilos por canasta |
| GET | `/productos/{id}/historial` | Admin | Historial de precios |
| PATCH | `/productos/{id}/stock` | Admin | Ajuste manual de stock |
| GET | `/stock/movimientos` | Todos | Movimientos de inventario |

El código de cada producto se deriva de su identificador con el formato
`GCOM-P-0001`. La búsqueda por código devuelve `404` si el producto no existe o
está inactivo. Para roles distintos de `admin`, la respuesta omite
`precio_compra`, `margen` y cualquier dato de costo.

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
