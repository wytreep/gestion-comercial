-- Migración 004: evitar notificaciones duplicadas
-- Una sola notificación por (tipo, referencia_id). Las alertas leídas se
-- conservan mientras la condición siga vigente y se eliminan cuando se
-- resuelve (ver NotificacionService::resolverNotificaciones).
--
-- Idempotente a propósito: 001_schema.sql ya crea el índice en instalaciones
-- nuevas y MySQL 8 no admite `ADD UNIQUE KEY IF NOT EXISTS`. Sin esta guarda,
-- el entrypoint de MySQL aborta la inicialización y las migraciones 005 y 006
-- no se ejecutan nunca.

USE gestion_comercial;

-- 1. Eliminar duplicados conservando la fila más reciente de cada grupo.
DELETE n FROM notificaciones n
JOIN (
    SELECT tipo, referencia_id, MAX(id) AS keep_id
    FROM notificaciones
    WHERE referencia_id IS NOT NULL
    GROUP BY tipo, referencia_id
) d
  ON d.tipo = n.tipo
 AND d.referencia_id = n.referencia_id
WHERE n.referencia_id IS NOT NULL
  AND n.id < d.keep_id;

-- 2. Índice único que impide volver a duplicar por concurrencia.
--    MySQL permite múltiples NULL, así que las notificaciones de tipo
--    'sistema' sin referencia no se ven afectadas.
SET @existe_indice := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name   = 'notificaciones'
    AND index_name   = 'uq_notificaciones_tipo_ref'
);
SET @sql_indice := IF(
  @existe_indice = 0,
  'ALTER TABLE notificaciones ADD UNIQUE KEY uq_notificaciones_tipo_ref (tipo, referencia_id)',
  'DO 0'
);
PREPARE stmt_indice FROM @sql_indice;
EXECUTE stmt_indice;
DEALLOCATE PREPARE stmt_indice;

-- 3. Reporte final.
SELECT tipo, leida, COUNT(*) AS n FROM notificaciones GROUP BY tipo, leida ORDER BY tipo, leida;
