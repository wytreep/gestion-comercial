# Base de Datos — GestiónComercial v1.0

**Motor:** MySQL 8.x  
**Nombre:** `gestion_comercial`  
**Charset:** `utf8mb4` / `utf8mb4_unicode_ci`

---

## Diagrama de relaciones

```
categorias ──< productos >── historial_precios
                  │
         ┌────────┴────────┐
         │                 │
    detalle_compra    detalle_venta
         │                 │
       compras           ventas ──< pagos
         │                 │
    gastos_compra    gastos_reparto
         │                 │
    proveedores        clientes
         │
    tipos_gasto ──────────┘ (también en gastos_reparto)
```

---

## Tablas

### `categorias`
Clasificación de productos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `nombre` | VARCHAR(60) | Pescado, Queso, Carne Serrana |
| `descripcion` | TEXT | |
| `activo` | TINYINT(1) | Soft delete |
| `created_at` | DATETIME | |

---

### `productos`
Catálogo de productos con precios actuales y stock.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `categoria_id` | INT UNSIGNED FK | → categorias |
| `nombre` | VARCHAR(100) | |
| `unidad_medida` | ENUM | `kilo` \| `canasta` \| `unidad` |
| `precio_compra` | DECIMAL(12,2) | Último precio de compra registrado |
| `precio_venta` | DECIMAL(12,2) | Precio de venta por kg |
| `kilos_por_canasta` | DECIMAL(8,3) NULL | Solo pescado: kg promedio por media canasta |
| `stock_actual` | DECIMAL(10,3) | En kg (incluso para pescado) |
| `activo` | TINYINT(1) | Soft delete |
| `created_at` / `updated_at` | DATETIME | |

> **Nota pescado:** `precio_compra` es el precio de la media canasta completa. `kilos_por_canasta` permite calcular `costo_real_por_kg = precio_compra / kilos_por_canasta`.

---

### `historial_precios`
Auditoría de cambios de precio. Cada vez que se edita un precio se inserta un registro.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `producto_id` | INT UNSIGNED FK | → productos |
| `precio_compra` | DECIMAL(12,2) | Precio en el momento del cambio |
| `precio_venta` | DECIMAL(12,2) | |
| `motivo` | VARCHAR(200) | Razón del cambio |
| `fecha` | DATETIME | |

---

### `clientes`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `nombre` | VARCHAR(120) | |
| `telefono` | VARCHAR(20) NULL | |
| `direccion` | TEXT NULL | |
| `notas` | TEXT NULL | |
| `activo` | TINYINT(1) | Soft delete |
| `created_at` | DATETIME | |

---

### `proveedores`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `nombre` | VARCHAR(120) | |
| `ciudad` | VARCHAR(80) NULL | Ciudad de origen |
| `telefono` | VARCHAR(20) NULL | |
| `notas` | TEXT NULL | |
| `activo` | TINYINT(1) | |

---

### `tipos_gasto`
Catálogo fijo de tipos de gasto operativo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `nombre` | VARCHAR(100) | |
| `descripcion` | TEXT | |
| `categoria` | ENUM | `transporte` \| `almacenamiento` \| `otro` |

**Registros iniciales:**

| ID | Nombre | Categoría |
|----|--------|-----------|
| 1 | Transporte origen→ciudad | transporte |
| 2 | Transporte recogida mercancía | transporte |
| 3 | Transporte reparto domicilios | transporte |
| 4 | Cuarto frío | almacenamiento |
| 5 | Otro gasto operativo | otro |

---

### `compras`
Cabecera de cada lote de mercancía adquirida.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `proveedor_id` | INT UNSIGNED FK NULL | → proveedores |
| `fecha_compra` | DATE | |
| `fecha_llegada` | DATE NULL | |
| `observaciones` | TEXT NULL | |
| `total_productos` | DECIMAL(14,2) | Mantenido por trigger |
| `total_gastos` | DECIMAL(14,2) | Mantenido por trigger |
| `total_inversion` | DECIMAL(14,2) **GENERATED** | `total_productos + total_gastos` |
| `estado` | ENUM | `pendiente` \| `parcial` \| `recibida` |
| `created_at` | DATETIME | |

---

### `detalle_compra`
Ítems de cada compra.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `compra_id` | INT UNSIGNED FK | → compras (CASCADE DELETE) |
| `producto_id` | INT UNSIGNED FK | → productos |
| `cantidad` | DECIMAL(10,3) | Número de unidades (canastas para pescado) |
| `precio_unitario` | DECIMAL(12,2) | Precio al momento de la compra |
| `subtotal` | DECIMAL(14,2) **GENERATED** | `cantidad × precio_unitario` |
| `kilos_estimados` | DECIMAL(10,3) NULL | Para pescado: kg reales de esa canasta |

---

### `gastos_compra`
Costos operativos asociados a una compra.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `compra_id` | INT UNSIGNED FK | → compras (CASCADE DELETE) |
| `tipo_gasto_id` | INT UNSIGNED FK | → tipos_gasto |
| `monto` | DECIMAL(12,2) | |
| `descripcion` | VARCHAR(200) NULL | |
| `fecha` | DATE | |

---

### `ventas`
Cabecera de cada pedido/venta.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `cliente_id` | INT UNSIGNED FK NULL | → clientes |
| `fecha_venta` | DATETIME | Se autorrellena |
| `fecha_entrega` | DATE NULL | |
| `observaciones` | TEXT NULL | |
| `total` | DECIMAL(14,2) | Mantenido por trigger |
| `total_pagado` | DECIMAL(14,2) | Mantenido por trigger |
| `saldo_pendiente` | DECIMAL(14,2) **GENERATED** | `total - total_pagado` |
| `estado_pago` | ENUM | `pagado` \| `abono` \| `pendiente` \| `fiado` |
| `estado_pedido` | ENUM | `nuevo` \| `en_preparacion` \| `entregado` \| `cancelado` |
| `created_at` | DATETIME | |

---

### `detalle_venta`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `venta_id` | INT UNSIGNED FK | → ventas (CASCADE DELETE) |
| `producto_id` | INT UNSIGNED FK | → productos |
| `cantidad` | DECIMAL(10,3) | En kg para todos los productos |
| `precio_unitario` | DECIMAL(12,2) | Precio de venta al momento de vender |
| `subtotal` | DECIMAL(14,2) **GENERATED** | `cantidad × precio_unitario` |

---

### `pagos`
Abonos y pagos completos de ventas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `venta_id` | INT UNSIGNED FK | → ventas (CASCADE DELETE) |
| `monto` | DECIMAL(12,2) | |
| `fecha_pago` | DATETIME | Se autorrellena |
| `fecha_vencimiento` | DATE NULL | Para fiados: fecha acordada |
| `medio_pago` | ENUM | `efectivo` \| `transferencia` |
| `destino_dinero` | ENUM | `efectivo_caja` \| `billetera_nequi` \| `billetera_daviplata` \| `billetera_bancolombia` \| `banco` \| `otro` |
| `referencia` | VARCHAR(100) NULL | Número de transacción |
| `notas` | VARCHAR(200) NULL | |

---

### `gastos_reparto`
Costos de distribución asociados a una venta.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `venta_id` | INT UNSIGNED FK NULL | → ventas |
| `tipo_gasto_id` | INT UNSIGNED FK | → tipos_gasto |
| `monto` | DECIMAL(12,2) | |
| `descripcion` | VARCHAR(200) NULL | |
| `fecha` | DATE | |

---

## Triggers

```sql
-- Actualiza total_pagado y estado_pago al insertar un pago
trg_after_pago_insert

-- Actualiza total_productos en compras
trg_after_detalle_compra_insert
trg_after_detalle_compra_update

-- Actualiza total_gastos en compras
trg_after_gasto_compra_insert
trg_after_gasto_compra_update

-- Actualiza total en ventas
trg_after_detalle_venta_insert
trg_after_detalle_venta_update
```

---

## Vistas

### `v_rentabilidad_ventas`
Ganancia bruta estimada por venta, comparando total de venta vs costo de mercancía (precio_compra actual × cantidad).

### `v_cartera`
Clientes con saldo pendiente > 0, con número de pedidos y totales.

### `v_caja`
Movimientos de pagos agrupados por fecha, medio de pago y destino de dinero.

---

## Migración — Agregar kilos_por_canasta (si la BD ya existe)

```sql
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS kilos_por_canasta DECIMAL(8,3) NULL
  COMMENT 'Solo pescado: kg promedio por media canasta'
  AFTER precio_venta;

UPDATE productos
  SET kilos_por_canasta = 15
  WHERE unidad_medida = 'canasta';
```
