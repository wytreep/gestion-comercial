-- ============================================================
-- SISTEMA DE GESTIÓN COMERCIAL - PESCADO, QUESO, CARNE SERRANA
-- Schema v1.0.0 | Creado para XAMPP / MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS gestion_comercial
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gestion_comercial;

-- ─────────────────────────────────────────────
-- TABLA: Categorías de productos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(60)  NOT NULL,
  descripcion TEXT,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Pescado',        'Pescado fresco vendido por canastas o kilos'),
  ('Queso',          'Queso blanco vendido por kilo'),
  ('Carne Serrana',  'Carne de res serrana vendida por kilo');

-- ─────────────────────────────────────────────
-- TABLA: Productos (precio variable en el tiempo)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id    INT UNSIGNED NOT NULL,
  nombre          VARCHAR(100) NOT NULL,
  unidad_medida   ENUM('kilo','canasta','unidad') NOT NULL DEFAULT 'kilo',
  -- Para pescado: precio_compra = precio media canasta
  precio_compra      DECIMAL(12,2) NOT NULL COMMENT 'Último precio de compra',
  precio_venta       DECIMAL(12,2) NOT NULL COMMENT 'Último precio de venta',
  kilos_por_canasta  DECIMAL(8,3)  NULL     COMMENT 'Solo pescado: kg promedio por media canasta',
  stock_actual       DECIMAL(10,3) NOT NULL DEFAULT 0,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

INSERT INTO productos (categoria_id, nombre, unidad_medida, precio_compra, precio_venta, kilos_por_canasta, stock_actual) VALUES
  (1, 'Pescado (media canasta)', 'canasta', 230000, 30000, 15, 0),  -- 15 kg estimado inicial por media canasta
  (2, 'Queso',                   'kilo',    5000,   10000, NULL, 0),
  (3, 'Carne Serrana',           'kilo',    23000,  40000, NULL, 0);

-- ─────────────────────────────────────────────
-- TABLA: Historial de precios (auditoría)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_precios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id    INT UNSIGNED NOT NULL,
  precio_compra  DECIMAL(12,2) NOT NULL,
  precio_venta   DECIMAL(12,2) NOT NULL,
  motivo         VARCHAR(200),
  fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Clientes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  telefono    VARCHAR(20),
  direccion   TEXT,
  notas       TEXT,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Proveedores
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  ciudad      VARCHAR(80),
  telefono    VARCHAR(20),
  notas       TEXT,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Tipos de gasto (transporte, almacenamiento, etc.)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipos_gasto (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  categoria   ENUM('transporte','almacenamiento','otro') NOT NULL DEFAULT 'otro'
) ENGINE=InnoDB;

INSERT INTO tipos_gasto (nombre, descripcion, categoria) VALUES
  ('Transporte origen→ciudad',    'Flete desde la ciudad de origen hasta nuestra ciudad',      'transporte'),
  ('Transporte recogida mercancía','Costo de ir a recoger la mercancía al punto de llegada',    'transporte'),
  ('Transporte reparto domicilios','Costo de distribuir pedidos a los clientes',                'transporte'),
  ('Cuarto frío',                  'Almacenamiento en cuarto frío por día o evento',            'almacenamiento'),
  ('Otro gasto operativo',         'Gastos varios asociados a la operación',                    'otro');

-- ─────────────────────────────────────────────
-- TABLA: Compras (lote de mercancía adquirida)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proveedor_id    INT UNSIGNED,
  fecha_compra    DATE         NOT NULL,
  fecha_llegada   DATE,
  observaciones   TEXT,
  total_productos DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Suma costo productos',
  total_gastos    DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Suma costos operativos',
  total_inversion DECIMAL(14,2) GENERATED ALWAYS AS (total_productos + total_gastos) STORED,
  estado          ENUM('pendiente','recibida','parcial') NOT NULL DEFAULT 'pendiente',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Detalle de compra (ítems por compra)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_compra (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id       INT UNSIGNED NOT NULL,
  producto_id     INT UNSIGNED NOT NULL,
  cantidad        DECIMAL(10,3) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL COMMENT 'Precio de compra en ese momento',
  subtotal        DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  -- Pescado: cantidad = número de medias canastas
  kilos_estimados DECIMAL(10,3) COMMENT 'Para pescado: kilos estimados de la canasta',
  FOREIGN KEY (compra_id)    REFERENCES compras(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id)  REFERENCES productos(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Gastos operativos de una compra
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gastos_compra (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id       INT UNSIGNED NOT NULL,
  tipo_gasto_id   INT UNSIGNED NOT NULL,
  monto           DECIMAL(12,2) NOT NULL,
  descripcion     VARCHAR(200),
  fecha           DATE         NOT NULL,
  FOREIGN KEY (compra_id)     REFERENCES compras(id)       ON DELETE CASCADE,
  FOREIGN KEY (tipo_gasto_id) REFERENCES tipos_gasto(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Ventas / Pedidos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id      INT UNSIGNED,
  fecha_venta     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega   DATE,
  observaciones   TEXT,
  total           DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_pagado    DECIMAL(14,2) NOT NULL DEFAULT 0,
  saldo_pendiente DECIMAL(14,2) GENERATED ALWAYS AS (total - total_pagado) STORED,
  estado_pago     ENUM('pagado','abono','pendiente','fiado') NOT NULL DEFAULT 'pendiente',
  estado_pedido   ENUM('nuevo','en_preparacion','entregado','cancelado') NOT NULL DEFAULT 'nuevo',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Detalle de venta
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_venta (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id        INT UNSIGNED NOT NULL,
  producto_id     INT UNSIGNED NOT NULL,
  cantidad        DECIMAL(10,3) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL COMMENT 'Precio de venta en ese momento',
  subtotal        DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Pagos (abonos y pagos completos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id            INT UNSIGNED NOT NULL,
  monto               DECIMAL(12,2) NOT NULL,
  fecha_pago          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento   DATE         COMMENT 'Si es fiado: fecha acordada de pago',
  medio_pago          ENUM('efectivo','transferencia') NOT NULL DEFAULT 'efectivo',
  -- Rastreo del destino del dinero
  destino_dinero      ENUM('efectivo_caja','billetera_nequi','billetera_daviplata','billetera_bancolombia','banco','otro') NOT NULL DEFAULT 'efectivo_caja',
  referencia          VARCHAR(100) COMMENT 'Número de transacción o referencia',
  notas               VARCHAR(200),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TABLA: Gastos de reparto por venta
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gastos_reparto (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id      INT UNSIGNED,
  tipo_gasto_id INT UNSIGNED NOT NULL,
  monto         DECIMAL(12,2) NOT NULL,
  descripcion   VARCHAR(200),
  fecha         DATE NOT NULL,
  FOREIGN KEY (venta_id)      REFERENCES ventas(id),
  FOREIGN KEY (tipo_gasto_id) REFERENCES tipos_gasto(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- TRIGGER: Actualizar total_pagado en ventas tras insertar pago
-- ─────────────────────────────────────────────
DELIMITER $$

CREATE TRIGGER trg_after_pago_insert
AFTER INSERT ON pagos
FOR EACH ROW
BEGIN
  UPDATE ventas
  SET total_pagado = (
    SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE venta_id = NEW.venta_id
  ),
  estado_pago = CASE
    WHEN (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE venta_id = NEW.venta_id) >= total
      THEN 'pagado'
    WHEN (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE venta_id = NEW.venta_id) > 0
      THEN 'abono'
    ELSE 'pendiente'
  END
  WHERE id = NEW.venta_id;
END$$

-- ─────────────────────────────────────────────
-- TRIGGER: Actualizar total de compra tras insertar detalle
-- ─────────────────────────────────────────────
CREATE TRIGGER trg_after_detalle_compra_insert
AFTER INSERT ON detalle_compra
FOR EACH ROW
BEGIN
  UPDATE compras
  SET total_productos = (
    SELECT COALESCE(SUM(subtotal), 0) FROM detalle_compra WHERE compra_id = NEW.compra_id
  )
  WHERE id = NEW.compra_id;
END$$

CREATE TRIGGER trg_after_detalle_compra_update
AFTER UPDATE ON detalle_compra
FOR EACH ROW
BEGIN
  UPDATE compras
  SET total_productos = (
    SELECT COALESCE(SUM(subtotal), 0) FROM detalle_compra WHERE compra_id = NEW.compra_id
  )
  WHERE id = NEW.compra_id;
END$$

-- ─────────────────────────────────────────────
-- TRIGGER: Actualizar gastos totales en compra
-- ─────────────────────────────────────────────
CREATE TRIGGER trg_after_gasto_compra_insert
AFTER INSERT ON gastos_compra
FOR EACH ROW
BEGIN
  UPDATE compras
  SET total_gastos = (
    SELECT COALESCE(SUM(monto), 0) FROM gastos_compra WHERE compra_id = NEW.compra_id
  )
  WHERE id = NEW.compra_id;
END$$

CREATE TRIGGER trg_after_gasto_compra_update
AFTER UPDATE ON gastos_compra
FOR EACH ROW
BEGIN
  UPDATE compras
  SET total_gastos = (
    SELECT COALESCE(SUM(monto), 0) FROM gastos_compra WHERE compra_id = NEW.compra_id
  )
  WHERE id = NEW.compra_id;
END$$

-- ─────────────────────────────────────────────
-- TRIGGER: Actualizar total de venta
-- ─────────────────────────────────────────────
CREATE TRIGGER trg_after_detalle_venta_insert
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
  UPDATE ventas
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0) FROM detalle_venta WHERE venta_id = NEW.venta_id
  )
  WHERE id = NEW.venta_id;
END$$

CREATE TRIGGER trg_after_detalle_venta_update
AFTER UPDATE ON detalle_venta
FOR EACH ROW
BEGIN
  UPDATE ventas
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0) FROM detalle_venta WHERE venta_id = NEW.venta_id
  )
  WHERE id = NEW.venta_id;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────
-- VISTAS útiles para el dashboard
-- ─────────────────────────────────────────────

-- Vista: Rentabilidad por venta
CREATE OR REPLACE VIEW v_rentabilidad_ventas AS
SELECT
  v.id            AS venta_id,
  c.nombre        AS cliente,
  v.fecha_venta,
  v.total         AS ingresos,
  v.total_pagado,
  v.saldo_pendiente,
  v.estado_pago,
  v.estado_pedido,
  COALESCE(SUM(dv.cantidad * p.precio_compra), 0) AS costo_mercancia,
  v.total - COALESCE(SUM(dv.cantidad * p.precio_compra), 0) AS ganancia_bruta
FROM ventas v
LEFT JOIN clientes c       ON c.id = v.cliente_id
LEFT JOIN detalle_venta dv ON dv.venta_id = v.id
LEFT JOIN productos p      ON p.id = dv.producto_id
GROUP BY v.id, c.nombre, v.fecha_venta, v.total, v.total_pagado, v.saldo_pendiente, v.estado_pago, v.estado_pedido;

-- Vista: Resumen de cartera (cuentas por cobrar)
CREATE OR REPLACE VIEW v_cartera AS
SELECT
  cl.id,
  cl.nombre,
  cl.telefono,
  COUNT(v.id)        AS pedidos_pendientes,
  SUM(v.total)       AS total_ventas,
  SUM(v.total_pagado) AS total_pagado,
  SUM(v.saldo_pendiente) AS saldo_total
FROM clientes cl
JOIN ventas v ON v.cliente_id = cl.id
WHERE v.saldo_pendiente > 0
GROUP BY cl.id, cl.nombre, cl.telefono;

-- Vista: Resumen de caja (ingresos por destino)
CREATE OR REPLACE VIEW v_caja AS
SELECT
  DATE(p.fecha_pago)   AS fecha,
  p.medio_pago,
  p.destino_dinero,
  COUNT(*)             AS num_pagos,
  SUM(p.monto)         AS total
FROM pagos p
GROUP BY DATE(p.fecha_pago), p.medio_pago, p.destino_dinero;

-- ─────────────────────────────────────────────
-- MIGRACIÓN: Agregar kilos_por_canasta si la BD ya existe
-- Ejecutar solo si la columna no existe aún
-- ─────────────────────────────────────────────
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS kilos_por_canasta DECIMAL(8,3) NULL
  COMMENT 'Solo pescado: kg promedio por media canasta'
  AFTER precio_venta;

-- Valor inicial para pescado (ajustar según lo real)
UPDATE productos SET kilos_por_canasta = 15 WHERE unidad_medida = 'canasta';
