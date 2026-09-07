# Referencia API REST — GestiónComercial v1.0

Base URL: `http://localhost/pescaderia/api/index.php`

Todas las respuestas siguen el formato:
```json
{ "success": true|false, "message": "...", "data": <payload> }
```

---

## Dashboard

### `GET ?resource=dashboard`
Retorna todos los KPIs del mes actual.

**Respuesta:**
```json
{
  "resumen_mes": {
    "ingresos_cobrados": 90000,
    "ventas_count": 21,
    "ventas_total": 970000,
    "inversion": 690000,
    "ganancia_bruta": 280000,
    "margen_bruto": 28.9,
    "cartera_pendiente": 880000
  },
  "ultimas_ventas": [...],
  "saldos_destino": [...],
  "stock": [...]
}
```

---

## Productos

### `GET ?resource=productos`
Lista todos los productos activos con su categoría.

### `GET ?resource=productos&id={id}`
Detalle de un producto.

### `PUT ?resource=productos&action=precio&id={id}`
Actualiza precios con auditoría automática.

**Body:**
```json
{
  "precio_compra": 230000,
  "precio_venta": 30000,
  "kilos_por_canasta": 15,
  "motivo": "Alza del proveedor"
}
```
> `kilos_por_canasta` solo aplica para productos con `unidad_medida = 'canasta'` (pescado).

### `PUT ?resource=productos&action=stock&id={id}`
Ajuste manual de stock.

**Body:**
```json
{ "cantidad": 5.5 }
```

### `GET ?resource=productos&action=historial&id={id}`
Últimos 20 cambios de precio del producto.

---

## Clientes

### `GET ?resource=clientes`
Lista todos los clientes activos.

### `GET ?resource=clientes&q={texto}`
Búsqueda por nombre o teléfono.

### `GET ?resource=clientes&id={id}`
Detalle del cliente + últimas 10 ventas.

### `POST ?resource=clientes`
Crear cliente.

**Body:**
```json
{
  "nombre": "Doña Carmen",
  "telefono": "300-555-1234",
  "direccion": "Calle 5 # 12-34",
  "notas": "Cliente frecuente"
}
```

### `PUT ?resource=clientes&id={id}`
Actualizar datos del cliente. Mismo body que POST.

---

## Proveedores

### `GET ?resource=proveedores`
Lista todos los proveedores activos.

### `POST ?resource=proveedores`
Crear proveedor.

**Body:**
```json
{
  "nombre": "Pescadores del Pacífico",
  "ciudad": "Tumaco",
  "telefono": "310-123-4567",
  "notas": "Entrega los martes"
}
```

---

## Compras

### `GET ?resource=compras`
Últimas 50 compras con totales.

### `GET ?resource=compras&id={id}`
Detalle completo: cabecera + items + gastos.

### `POST ?resource=compras`
Registrar nueva compra. Actualiza precios y stock automáticamente.

**Body:**
```json
{
  "proveedor_id": 1,
  "fecha_compra": "2026-09-06",
  "fecha_llegada": "2026-09-07",
  "observaciones": "Pedido semanal",
  "estado": "pendiente",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 5,
      "precio_unitario": 230000,
      "kilos_estimados": 75
    }
  ],
  "gastos": [
    {
      "tipo_gasto_id": 1,
      "monto": 80000,
      "descripcion": "Flota Magdalena",
      "fecha": "2026-09-06"
    }
  ]
}
```

> **Importante:** para pescado, `kilos_estimados` define cuántos kg se suman al stock real, no `cantidad` (que es número de canastas).

### `PUT ?resource=compras&id={id}`
Editar compra. Si vienen `items`, revierte el stock anterior y aplica el nuevo.

**Body (todos los campos son opcionales):**
```json
{
  "estado": "recibida",
  "proveedor_id": 2,
  "fecha_llegada": "2026-09-08",
  "observaciones": "Llegó tarde pero completo",
  "items": [...],
  "gastos": [...]
}
```

**Estados válidos:** `pendiente` | `parcial` | `recibida`

---

## Ventas

### `GET ?resource=ventas`
Lista ventas con filtros opcionales.

**Query params:**
| Param | Valores |
|-------|---------|
| `estado_pago` | `pagado` \| `abono` \| `pendiente` \| `fiado` |
| `estado_pedido` | `nuevo` \| `en_preparacion` \| `entregado` \| `cancelado` |
| `cliente_id` | ID numérico |
| `fecha_desde` | `YYYY-MM-DD` |
| `fecha_hasta` | `YYYY-MM-DD` |

### `GET ?resource=ventas&id={id}`
Detalle: cabecera + items + pagos.

### `POST ?resource=ventas`
Registrar nueva venta. Descuenta stock automáticamente.

**Body:**
```json
{
  "cliente_id": 1,
  "fecha_entrega": "2026-09-07",
  "observaciones": "",
  "estado_pedido": "nuevo",
  "items": [
    { "producto_id": 2, "cantidad": 3.5, "precio_unitario": 10000 }
  ],
  "gastos_reparto": [
    { "tipo_gasto_id": 3, "monto": 15000, "descripcion": "Moto domicilio" }
  ],
  "pago_inicial": {
    "monto": 35000,
    "medio_pago": "efectivo",
    "destino_dinero": "efectivo_caja",
    "referencia": "",
    "fecha_vencimiento": null
  }
}
```

### `PUT ?resource=ventas&id={id}`
Editar venta. Si vienen `items`, revierte stock anterior y aplica nuevo.

**Body (todos opcionales):**
```json
{
  "cliente_id": 2,
  "estado_pedido": "entregado",
  "fecha_entrega": "2026-09-07",
  "observaciones": "Entregado a las 3pm",
  "items": [...]
}
```

### `DELETE ?resource=ventas&id={id}`
- **Sin pagos:** elimina la venta y revierte el stock
- **Con pagos:** marca como `cancelado` y conserva los pagos

**Respuesta:**
```json
{ "accion": "eliminada" | "cancelada" }
```

---

## Pagos

### `GET ?resource=pagos&venta_id={id}`
Todos los pagos de una venta.

### `GET ?resource=pagos&fecha={YYYY-MM-DD}`
Pagos registrados en una fecha específica.

### `POST ?resource=pagos`
Registrar abono o pago completo. Valida que no exceda el saldo pendiente.

**Body:**
```json
{
  "venta_id": 5,
  "monto": 50000,
  "medio_pago": "transferencia",
  "destino_dinero": "billetera_nequi",
  "referencia": "TRX-987654",
  "notas": "Segunda cuota",
  "fecha_vencimiento": null
}
```

**Valores `medio_pago`:** `efectivo` | `transferencia`

**Valores `destino_dinero`:** `efectivo_caja` | `billetera_nequi` | `billetera_daviplata` | `billetera_bancolombia` | `banco` | `otro`

---

## Cartera

### `GET ?resource=cartera`
Cuentas por cobrar pendientes y deudas vencidas.

**Respuesta:**
```json
{
  "cartera": [
    {
      "id": 1,
      "nombre": "Restaurante El Río",
      "telefono": "310-456-7890",
      "pedidos_pendientes": 2,
      "total_ventas": 900000,
      "total_pagado": 0,
      "saldo_total": 900000
    }
  ],
  "vencidas": [
    {
      "venta_id": 16,
      "cliente": "Restaurante El Río",
      "fecha_vencimiento": "2026-09-01",
      "abonado": 0,
      "saldo_pendiente": 900000,
      "dias_vencido": 5
    }
  ]
}
```

---

## Caja

### `GET ?resource=caja&desde={YYYY-MM-DD}&hasta={YYYY-MM-DD}`
Flujo de dinero del período.

**Respuesta:**
```json
{
  "movimientos": [...],
  "saldos": [
    { "destino_dinero": "efectivo_caja", "total": 840000, "transacciones": 12 }
  ],
  "flujo": {
    "ingresos": 2600000,
    "inversiones": 1100000
  },
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-06" }
}
```

---

## Tipos de gasto

### `GET ?resource=tipos_gasto`
Catálogo de tipos de gasto operativo.

**Respuesta:**
```json
[
  { "id": 1, "nombre": "Transporte origen→ciudad",     "categoria": "transporte"     },
  { "id": 2, "nombre": "Transporte recogida mercancía","categoria": "transporte"     },
  { "id": 3, "nombre": "Transporte reparto domicilios","categoria": "transporte"     },
  { "id": 4, "nombre": "Cuarto frío",                  "categoria": "almacenamiento" },
  { "id": 5, "nombre": "Otro gasto operativo",         "categoria": "otro"           }
]
```

---

## Categorías

### `GET ?resource=categorias`
Lista de categorías de productos activas.
