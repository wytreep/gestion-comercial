-- ============================================================
-- Gestión Comercial — Cobro con QR (Fase 1.2)
-- Migración incremental para bases de datos existentes.
-- En una instalación nueva también se crea desde 001_schema.sql.
-- ============================================================

USE gestion_comercial;

CREATE TABLE IF NOT EXISTS cobros_qr (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id   INT UNSIGNED NOT NULL,
  codigo     VARCHAR(64)  NOT NULL,
  monto      DECIMAL(12,2) NOT NULL,
  estado     ENUM('pendiente','pagado','expirado','anulado') NOT NULL DEFAULT 'pendiente',
  expira_at  DATETIME     NOT NULL,
  pagado_at  DATETIME     NULL,
  referencia VARCHAR(100) NULL,
  pago_id    INT UNSIGNED NULL,
  usuario_id INT UNSIGNED NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cobros_qr_codigo (codigo),
  INDEX idx_cobros_qr_venta_estado (venta_id, estado),
  CONSTRAINT fk_cobros_qr_venta   FOREIGN KEY (venta_id)   REFERENCES ventas(id)   ON DELETE CASCADE,
  CONSTRAINT fk_cobros_qr_pago    FOREIGN KEY (pago_id)    REFERENCES pagos(id)    ON DELETE SET NULL,
  CONSTRAINT fk_cobros_qr_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;
