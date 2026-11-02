-- ============================================================
-- Gestión Comercial — Schema MySQL 8.x
-- Nuevas tablas: stock_movimientos, notificaciones, backups_log
-- ============================================================

CREATE DATABASE IF NOT EXISTS gestion_comercial
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE gestion_comercial;

-- ── Usuarios ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           ENUM('admin','vendedor','readonly') NOT NULL DEFAULT 'vendedor',
  activo        TINYINT(1)  NOT NULL DEFAULT 1,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- No se crea un usuario por defecto: las credenciales conocidas son un riesgo.
-- Tras inicializar la base de datos, crea el administrador con:
--   docker compose exec php php bin/reset-admin-password.php admin@gcom.local --create

-- ── Intentos de login (rate limiting) ─────────────────
CREATE TABLE IF NOT EXISTS login_intentos (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(160) NOT NULL,
  ip         VARCHAR(45)  NOT NULL,
  exitoso    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_intentos_email_ip (email, ip, created_at),
  INDEX idx_intentos_ip (ip, created_at),
  INDEX idx_intentos_fecha (created_at)
) ENGINE=InnoDB;

-- ── Categorías ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(60) NOT NULL,
  descripcion TEXT,
  activo     TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Pescado',       'Pescado fresco vendido por canastas o kilos'),
  ('Queso',         'Queso blanco vendido por kilo'),
  ('Carne Serrana', 'Carne de res serrana vendida por kilo');

-- ── Productos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id      INT UNSIGNED NOT NULL,
  nombre            VARCHAR(100) NOT NULL,
  unidad_medida     ENUM('kilo','canasta','unidad') NOT NULL DEFAULT 'kilo',
  precio_compra     DECIMAL(12,2) NOT NULL,
  precio_venta      DECIMAL(12,2) NOT NULL,
  kilos_por_canasta DECIMAL(8,3) NULL,
  stock_actual      DECIMAL(10,3) NOT NULL DEFAULT 0,
  activo            TINYINT(1) NOT NULL DEFAULT 1,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- Precios de demostración. Reemplázalos por los de tu operación antes de usar
-- el sistema en producción; no corresponden a ningún negocio real.
INSERT INTO productos (categoria_id, nombre, unidad_medida, precio_compra, precio_venta, kilos_por_canasta) VALUES
  (1, 'Pescado (media canasta)', 'canasta', 120000, 15000, 20),
  (2, 'Queso',                   'kilo',    4000,   8000,  NULL),
  (3, 'Carne Serrana',           'kilo',    15000,  25000, NULL);

-- ── Historial precios ─────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_precios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id   INT UNSIGNED NOT NULL,
  precio_compra DECIMAL(12,2) NOT NULL,
  precio_venta  DECIMAL(12,2) NOT NULL,
  motivo        VARCHAR(200),
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- ── Stock movimientos (NUEVO) ──────────────────────
CREATE TABLE IF NOT EXISTS stock_movimientos (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id    INT UNSIGNED NOT NULL,
  tipo           ENUM('compra','venta','ajuste_manual','devolucion') NOT NULL,
  cantidad       DECIMAL(10,3) NOT NULL COMMENT 'Positivo=entrada, Negativo=salida',
  stock_anterior DECIMAL(10,3) NOT NULL,
  stock_nuevo    DECIMAL(10,3) NOT NULL,
  motivo         VARCHAR(200),
  referencia_id  INT UNSIGNED NULL COMMENT 'ID de la venta o compra',
  usuario_id     INT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ── Clientes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  telefono   VARCHAR(20),
  direccion  TEXT,
  notas      TEXT,
  activo     TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Proveedores ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  ciudad     VARCHAR(80),
  telefono   VARCHAR(20),
  notas      TEXT,
  activo     TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Tipos de gasto ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipos_gasto (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  categoria   ENUM('transporte','almacenamiento','otro') NOT NULL DEFAULT 'otro'
) ENGINE=InnoDB;

INSERT INTO tipos_gasto (nombre, descripcion, categoria) VALUES
  ('Transporte origen→ciudad',      'Flete desde la ciudad de origen',          'transporte'),
  ('Transporte recogida mercancía', 'Costo de ir a recoger la mercancía',       'transporte'),
  ('Transporte reparto domicilios', 'Costo de distribuir pedidos a clientes',   'transporte'),
  ('Cuarto frío',                   'Almacenamiento en cuarto frío',            'almacenamiento'),
  ('Otro gasto operativo',          'Gastos varios asociados a la operación',   'otro');

-- ── Compras ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proveedor_id    INT UNSIGNED,
  fecha_compra    DATE NOT NULL,
  fecha_llegada   DATE,
  observaciones   TEXT,
  total_productos DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_gastos    DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_inversion DECIMAL(14,2) GENERATED ALWAYS AS (total_productos + total_gastos) STORED,
  estado          ENUM('pendiente','recibida','parcial') NOT NULL DEFAULT 'pendiente',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_compra (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id       INT UNSIGNED NOT NULL,
  producto_id     INT UNSIGNED NOT NULL,
  cantidad        DECIMAL(10,3) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal        DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  kilos_estimados DECIMAL(10,3),
  FOREIGN KEY (compra_id)   REFERENCES compras(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gastos_compra (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id     INT UNSIGNED NOT NULL,
  tipo_gasto_id INT UNSIGNED NOT NULL,
  monto         DECIMAL(12,2) NOT NULL,
  descripcion   VARCHAR(200),
  fecha         DATE NOT NULL,
  FOREIGN KEY (compra_id)     REFERENCES compras(id)    ON DELETE CASCADE,
  FOREIGN KEY (tipo_gasto_id) REFERENCES tipos_gasto(id)
) ENGINE=InnoDB;

-- ── Ventas ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id      INT UNSIGNED,
  fecha_venta     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega   DATE,
  observaciones   TEXT,
  total           DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_pagado    DECIMAL(14,2) NOT NULL DEFAULT 0,
  saldo_pendiente DECIMAL(14,2) GENERATED ALWAYS AS (total - total_pagado) STORED,
  estado_pago     ENUM('pagado','abono','pendiente','fiado') NOT NULL DEFAULT 'pendiente',
  estado_pedido   ENUM('nuevo','en_preparacion','entregado','cancelado') NOT NULL DEFAULT 'nuevo',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_venta (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id        INT UNSIGNED NOT NULL,
  producto_id     INT UNSIGNED NOT NULL,
  cantidad        DECIMAL(10,3) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal        DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagos (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id          INT UNSIGNED NOT NULL,
  monto             DECIMAL(12,2) NOT NULL,
  fecha_pago        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento DATE,
  medio_pago        ENUM('efectivo','transferencia') NOT NULL DEFAULT 'efectivo',
  destino_dinero    ENUM('efectivo_caja','billetera_nequi','billetera_daviplata','billetera_bancolombia','banco','otro') NOT NULL DEFAULT 'efectivo_caja',
  referencia        VARCHAR(100),
  notas             VARCHAR(200),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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

-- ── Notificaciones (NUEVO) ─────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo            ENUM('deuda_vencida','stock_bajo','sistema') NOT NULL DEFAULT 'sistema',
  titulo          VARCHAR(150) NOT NULL,
  mensaje         TEXT NOT NULL,
  referencia_id   INT UNSIGNED NULL,
  referencia_tipo VARCHAR(50)  NULL,
  leida           TINYINT(1)   NOT NULL DEFAULT 0,
  leida_at        DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Backups log (NUEVO) ────────────────────────────
CREATE TABLE IF NOT EXISTS backups_log (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_archivo     VARCHAR(100) NOT NULL,
  tamanio_bytes      INT UNSIGNED NOT NULL,
  tablas_incluidas   TEXT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Triggers ──────────────────────────────────────────
DELIMITER $$

CREATE TRIGGER trg_pago_insert AFTER INSERT ON pagos FOR EACH ROW
BEGIN
  UPDATE ventas SET
    total_pagado = (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE venta_id=NEW.venta_id),
    estado_pago  = CASE
      WHEN (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE venta_id=NEW.venta_id) >= total THEN 'pagado'
      WHEN (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE venta_id=NEW.venta_id) > 0     THEN 'abono'
      ELSE 'pendiente'
    END
  WHERE id=NEW.venta_id;
END$$

CREATE TRIGGER trg_dc_insert AFTER INSERT ON detalle_compra FOR EACH ROW
BEGIN
  UPDATE compras SET total_productos=(SELECT COALESCE(SUM(subtotal),0) FROM detalle_compra WHERE compra_id=NEW.compra_id) WHERE id=NEW.compra_id;
END$$

CREATE TRIGGER trg_gc_insert AFTER INSERT ON gastos_compra FOR EACH ROW
BEGIN
  UPDATE compras SET total_gastos=(SELECT COALESCE(SUM(monto),0) FROM gastos_compra WHERE compra_id=NEW.compra_id) WHERE id=NEW.compra_id;
END$$

CREATE TRIGGER trg_dv_insert AFTER INSERT ON detalle_venta FOR EACH ROW
BEGIN
  UPDATE ventas SET total=(SELECT COALESCE(SUM(subtotal),0) FROM detalle_venta WHERE venta_id=NEW.venta_id) WHERE id=NEW.venta_id;
END$$

CREATE TRIGGER trg_dv_delete AFTER DELETE ON detalle_venta FOR EACH ROW
BEGIN
  UPDATE ventas SET total=(SELECT COALESCE(SUM(subtotal),0) FROM detalle_venta WHERE venta_id=OLD.venta_id) WHERE id=OLD.venta_id;
END$$

DELIMITER ;

-- ── Vistas ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_cartera AS
SELECT cl.id, cl.nombre, cl.telefono,
       COUNT(v.id) AS pedidos_pendientes,
       SUM(v.total) AS total_ventas,
       SUM(v.total_pagado) AS total_pagado,
       SUM(v.saldo_pendiente) AS saldo_total
FROM clientes cl
JOIN ventas v ON v.cliente_id=cl.id
WHERE v.saldo_pendiente>0 AND v.estado_pedido!='cancelado'
GROUP BY cl.id, cl.nombre, cl.telefono;

CREATE OR REPLACE VIEW v_caja AS
SELECT DATE(p.fecha_pago) AS fecha, p.medio_pago, p.destino_dinero,
       COUNT(*) AS num_pagos, SUM(p.monto) AS total
FROM pagos p
GROUP BY DATE(p.fecha_pago), p.medio_pago, p.destino_dinero;
