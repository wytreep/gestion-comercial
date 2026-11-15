-- Migración 005: preferencia de tema por usuario
-- El tema se guarda por cuenta para conservarlo entre navegadores; mientras
-- no haya sesión, el cliente usa `localStorage`. Los valores coinciden con
-- el selector de Configuración: claro, oscuro o sistema.

USE gestion_comercial;

ALTER TABLE usuarios
  ADD COLUMN tema ENUM('claro','oscuro','sistema') NOT NULL DEFAULT 'sistema'
  AFTER rol;

SELECT id, email, rol, tema FROM usuarios ORDER BY id;
