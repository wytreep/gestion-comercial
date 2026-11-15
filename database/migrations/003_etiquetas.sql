-- ============================================================
-- Gestión Comercial — Etiquetas QR (Fase 1.3)
-- Migración incremental para bases de datos existentes.
-- En una instalación nueva también se crea desde 001_schema.sql.
-- ============================================================

USE gestion_comercial;

CREATE TABLE IF NOT EXISTS etiquetas (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(32)  NOT NULL,
  tipo          ENUM('producto','canasta','lote') NOT NULL DEFAULT 'producto',
  producto_id   INT UNSIGNED NOT NULL,
  peso_kg       DECIMAL(10,3) NULL COMMENT 'Peso de la canasta o del lote etiquetado',
  lote          VARCHAR(40)  NULL COMMENT 'Identificador de lote (texto libre hasta Fase 3)',
  fecha_empaque DATE NOT NULL,
  estado        ENUM('activa','anulada') NOT NULL DEFAULT 'activa',
  usuario_id    INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_etiquetas_codigo (codigo),
  INDEX idx_etiquetas_producto_estado (producto_id, estado),
  INDEX idx_etiquetas_lote (lote),
  CONSTRAINT fk_etiquetas_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_etiquetas_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE SET NULL,
  CONSTRAINT chk_etiquetas_peso CHECK (tipo <> 'canasta' OR peso_kg > 0)
) ENGINE=InnoDB;
