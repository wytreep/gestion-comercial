-- Migración 006: capas de seguridad
--
-- Sesiones revocables, refresh de un solo uso, bloqueo de IP escalonado con
-- lista negra y bitácora de eventos. Los tokens nunca se guardan en claro:
-- el refresh se almacena como SHA-256 y el access solo lleva identificadores.

USE gestion_comercial;

-- ── Sesiones ─────────────────────────────────────────────
-- Una fila por inicio de sesión. El access y el refresh apuntan aquí, de modo
-- que revocar la sesión invalida ambos de inmediato.
CREATE TABLE IF NOT EXISTS sesiones (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id        INT UNSIGNED NOT NULL,
  jti               CHAR(36)     NOT NULL,
  ip                VARCHAR(45)  NOT NULL,
  user_agent        VARCHAR(255) NOT NULL DEFAULT '',
  creada            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_actividad  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira            DATETIME     NOT NULL,
  revocada          TINYINT(1)   NOT NULL DEFAULT 0,
  motivo_revocacion VARCHAR(160) NULL,
  UNIQUE KEY uq_sesiones_jti (jti),
  KEY idx_sesiones_usuario (usuario_id, revocada, expira),
  KEY idx_sesiones_actividad (ultima_actividad),
  CONSTRAINT fk_sesiones_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Refresh tokens ───────────────────────────────────────
-- Rotación de un solo uso: cada refresh se marca `usado` al canjearse. Si
-- vuelve a aparecer, se interpreta como robo y se revoca la sesión.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sesion_id      BIGINT UNSIGNED NOT NULL,
  token_hash     CHAR(64) NOT NULL,
  ip             VARCHAR(45) NOT NULL,
  creado         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira         DATETIME NOT NULL,
  usado          TINYINT(1) NOT NULL DEFAULT 0,
  usado_en       DATETIME NULL,
  reemplazado_por CHAR(64) NULL,
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_sesion (sesion_id, usado),
  CONSTRAINT fk_refresh_sesion
    FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Bloqueo de IP ────────────────────────────────────────
-- `nivel` cuenta los bloqueos acumulados; cada nivel aplica una espera mayor.
-- Al llegar al máximo, `permanente` actúa como lista negra.
CREATE TABLE IF NOT EXISTS ip_bloqueos (
  ip              VARCHAR(45) PRIMARY KEY,
  intentos        INT UNSIGNED NOT NULL DEFAULT 0,
  nivel           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  permanente      TINYINT(1) NOT NULL DEFAULT 0,
  motivo          VARCHAR(160) NULL,
  ultimo_fallo    DATETIME NULL,
  ultimo_bloqueo  DATETIME NULL,
  creado          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bloqueos_estado (permanente, bloqueado_hasta)
) ENGINE=InnoDB;

-- ── Eventos de seguridad ─────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos_seguridad (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo       VARCHAR(40)  NOT NULL,
  ip         VARCHAR(45)  NOT NULL,
  email      VARCHAR(160) NULL,
  usuario_id INT UNSIGNED NULL,
  detalle    VARCHAR(255) NULL,
  creado     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_eventos_fecha (creado),
  KEY idx_eventos_ip (ip),
  KEY idx_eventos_tipo (tipo)
) ENGINE=InnoDB;

-- Reporte final.
SELECT
  (SELECT COUNT(*) FROM sesiones)         AS sesiones,
  (SELECT COUNT(*) FROM refresh_tokens)   AS refresh_tokens,
  (SELECT COUNT(*) FROM ip_bloqueos)      AS ip_bloqueos,
  (SELECT COUNT(*) FROM eventos_seguridad) AS eventos;
