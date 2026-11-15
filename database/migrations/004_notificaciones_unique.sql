-- Migración 004: evitar notificaciones duplicadas
-- Una sola notificación por (tipo, referencia_id). Las alertas leídas se
-- conservan mientras la condición siga vigente y se eliminan cuando se
-- resuelve (ver NotificacionService::resolverNotificaciones).

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
ALTER TABLE notificaciones
  ADD UNIQUE KEY uq_notificaciones_tipo_ref (tipo, referencia_id);

-- 3. Reporte final.
SELECT tipo, leida, COUNT(*) AS n FROM notificaciones GROUP BY tipo, leida ORDER BY tipo, leida;
