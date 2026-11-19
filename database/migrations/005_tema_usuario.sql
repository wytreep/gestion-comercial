-- Migración 005: preferencia de tema por usuario
-- El tema se guarda por cuenta para conservarlo entre navegadores; mientras
-- no haya sesión, el cliente usa `localStorage`. Los valores coinciden con
-- el selector de Configuración: claro, oscuro o sistema.
--
-- Idempotente: en una instalación nueva el esquema ya puede traer la columna,
-- y repetir este archivo no debe abortar la inicialización de MySQL.

USE gestion_comercial;

SET @existe_columna := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name   = 'usuarios'
    AND column_name  = 'tema'
);
SET @sql_columna := IF(
  @existe_columna = 0,
  "ALTER TABLE usuarios ADD COLUMN tema ENUM('claro','oscuro','sistema') NOT NULL DEFAULT 'sistema' AFTER rol",
  'DO 0'
);
PREPARE stmt_columna FROM @sql_columna;
EXECUTE stmt_columna;
DEALLOCATE PREPARE stmt_columna;

SELECT id, email, rol, tema FROM usuarios ORDER BY id;
