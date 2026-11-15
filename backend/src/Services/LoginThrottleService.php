<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Exceptions\TooManyRequestsException;

/**
 * Bloqueo de IP por fuerza bruta, con escalado y lista negra.
 *
 * El contador vive en MySQL para respetarse entre workers de PHP-FPM. Cada
 * bloqueo sube de nivel y aplica una espera mayor:
 *
 *   1.º  5 minutos
 *   2.º  30 minutos
 *   3.º  24 horas
 *   4.º  7 días
 *   5.º  permanente (lista negra)
 *
 * Un inicio de sesión correcto limpia los intentos, pero no el nivel: así un
 * atacante no reinicia la escalada alternando intentos válidos.
 */
final class LoginThrottleService extends BaseService
{
    private int $maxIntentos;
    private int $ventanaMinutos;
    private int $maxBloqueos;
    private int $resetDias;

    /** @var list<int> minutos de espera por nivel */
    private array $duraciones;

    public function __construct()
    {
        parent::__construct();
        $cfg = Config::getInstance();

        $this->maxIntentos    = max(1, $cfg->getInt('LOGIN_MAX_ATTEMPTS', 5));
        $this->ventanaMinutos = max(1, $cfg->getInt('LOGIN_WINDOW_MINUTES', 15));
        $this->maxBloqueos    = max(1, $cfg->getInt('LOGIN_MAX_BLOCKS', 5));
        $this->resetDias      = max(1, $cfg->getInt('LOGIN_RESET_DAYS', 30));

        $duraciones = array_filter(array_map(
            'intval',
            explode(',', $cfg->get('LOGIN_BLOCK_MINUTES', '5,30,1440,10080'))
        ), static fn (int $m) => $m > 0);

        $this->duraciones = array_values($duraciones) ?: [5, 30, 1440, 10080];
    }

    /**
     * Estado actual del bloqueo para una IP.
     *
     * @return array{
     *   ip:string, bloqueado:bool, permanente:bool, nivel:int, intentos:int,
     *   restante:int, bloqueado_hasta:?string, motivo:?string
     * }
     */
    public function estado(string $ip): array
    {
        $fila = $this->queryOne('SELECT * FROM ip_bloqueos WHERE ip = :ip', [':ip' => $ip]);

        if ($fila === null) {
            return $this->estadoVacio($ip);
        }

        $permanente = (int) $fila['permanente'] === 1;
        $restante   = 0;

        if ($permanente) {
            $restante = -1;
        } elseif ($fila['bloqueado_hasta'] !== null) {
            $restante = max(0, strtotime((string) $fila['bloqueado_hasta']) - time());
        }

        return [
            'ip'              => $ip,
            'bloqueado'       => $permanente || $restante > 0,
            'permanente'      => $permanente,
            'nivel'           => (int) $fila['nivel'],
            'intentos'        => (int) $fila['intentos'],
            'restante'        => $restante,
            'bloqueado_hasta' => $fila['bloqueado_hasta'],
            'motivo'          => $fila['motivo'],
        ];
    }

    /**
     * @throws TooManyRequestsException si la IP está bloqueada.
     */
    public function assertAllowed(string $email, string $ip): void
    {
        $this->limpiarAntiguos();

        $estado = $this->estado($ip);
        if (!$estado['bloqueado']) {
            return;
        }

        throw new TooManyRequestsException(
            $this->mensaje($estado),
            $estado['permanente'] ? 86400 : max(1, $estado['restante']),
            $this->datosBloqueo($estado)
        );
    }

    /**
     * Registra un fallo y, si se alcanza el umbral, aplica el siguiente nivel
     * de bloqueo. Devuelve el estado resultante.
     */
    public function registrarFallo(string $email, string $ip): array
    {
        $email = $this->normalizarEmail($email);

        $this->execute(
            'INSERT INTO login_intentos (email, ip, exitoso) VALUES (:email, :ip, 0)',
            [':email' => $email, ':ip' => $ip]
        );

        error_log(sprintf('[LOGIN] Fallo email=%s ip=%s', $email, $ip));

        $fila = $this->queryOne('SELECT * FROM ip_bloqueos WHERE ip = :ip', [':ip' => $ip]);

        if ($fila !== null && (int) $fila['permanente'] === 1) {
            return $this->estado($ip);
        }

        $nivel    = (int) ($fila['nivel'] ?? 0);
        $intentos = (int) ($fila['intentos'] ?? 0);
        $ultimo   = $fila['ultimo_fallo'] !== null ? strtotime((string) $fila['ultimo_fallo']) : 0;

        // Los fallos fuera de la ventana no cuentan para el siguiente bloqueo.
        if ($ultimo === 0 || $ultimo < time() - $this->ventanaMinutos * 60) {
            $intentos = 0;
        }

        $intentos++;

        if ($intentos < $this->maxIntentos) {
            $this->execute(
                'INSERT INTO ip_bloqueos (ip, intentos, ultimo_fallo)
                 VALUES (:ip, :intentos, NOW())
                 ON DUPLICATE KEY UPDATE intentos = VALUES(intentos), ultimo_fallo = NOW()',
                [':ip' => $ip, ':intentos' => $intentos]
            );

            return $this->estado($ip);
        }

        $nivel++;
        $permanente = $nivel >= $this->maxBloqueos || !isset($this->duraciones[$nivel - 1]);
        $hasta      = $permanente
            ? null
            : date('Y-m-d H:i:s', time() + $this->duraciones[$nivel - 1] * 60);

        $this->execute(
            'INSERT INTO ip_bloqueos
                (ip, intentos, nivel, bloqueado_hasta, permanente, motivo, ultimo_fallo, ultimo_bloqueo)
             VALUES (:ip, 0, :nivel, :hasta, :permanente, :motivo, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                intentos = 0,
                nivel = VALUES(nivel),
                bloqueado_hasta = VALUES(bloqueado_hasta),
                permanente = VALUES(permanente),
                motivo = VALUES(motivo),
                ultimo_fallo = NOW(),
                ultimo_bloqueo = NOW()',
            [
                ':ip'         => $ip,
                ':nivel'      => $nivel,
                ':hasta'      => $hasta,
                ':permanente' => $permanente ? 1 : 0,
                ':motivo'     => $permanente ? 'Lista negra tras ' . $nivel . ' bloqueos' : 'Fuerza bruta',
            ]
        );

        $this->registrarEvento(
            $permanente ? 'ip_lista_negra' : 'bloqueo_ip',
            $ip,
            $email,
            null,
            $permanente
                ? 'Bloqueo permanente tras ' . $nivel . ' bloqueos'
                : 'Bloqueo nivel ' . $nivel . ' durante ' . $this->duraciones[$nivel - 1] . ' min'
        );

        return $this->estado($ip);
    }

    public function registrarExito(string $email, string $ip): void
    {
        $this->execute(
            'DELETE FROM login_intentos WHERE email = :email AND ip = :ip AND exitoso = 0',
            [':email' => $this->normalizarEmail($email), ':ip' => $ip]
        );

        // Tras un periodo sin bloqueos, la escalada vuelve a cero.
        $this->execute(
            "UPDATE ip_bloqueos
                SET intentos = 0,
                    ultimo_fallo = NULL,
                    nivel = CASE
                        WHEN ultimo_bloqueo IS NULL
                          OR ultimo_bloqueo < NOW() - INTERVAL {$this->resetDias} DAY
                        THEN 0 ELSE nivel END
              WHERE ip = :ip",
            [':ip' => $ip]
        );
    }

    /** @return list<array<string,mixed>> */
    public function listarBloqueos(bool $soloActivos = false): array
    {
        $sql = 'SELECT * FROM ip_bloqueos';
        if ($soloActivos) {
            $sql .= ' WHERE permanente = 1 OR bloqueado_hasta > NOW()';
        }
        $sql .= ' ORDER BY actualizado DESC LIMIT 200';

        return array_map(function (array $fila): array {
            $estado = $this->estado((string) $fila['ip']);
            return $fila + [
                'bloqueado' => $estado['bloqueado'],
                'restante'  => $estado['restante'],
            ];
        }, $this->query($sql));
    }

    /** @return list<array<string,mixed>> */
    public function listarEventos(int $limite = 300): array
    {
        $limite = max(1, min(1000, $limite));

        return $this->query(
            "SELECT e.*, u.nombre AS usuario
               FROM eventos_seguridad e
               LEFT JOIN usuarios u ON u.id = e.usuario_id
              ORDER BY e.creado DESC, e.id DESC
              LIMIT {$limite}"
        );
    }

    /** Quita el bloqueo y reinicia la escalada. */
    public function desbloquear(string $ip, int $adminId, string $motivo = 'Desbloqueo manual'): void
    {
        $this->execute(
            'UPDATE ip_bloqueos
                SET permanente = 0, nivel = 0, intentos = 0,
                    bloqueado_hasta = NULL, motivo = :motivo
              WHERE ip = :ip',
            [':ip' => $ip, ':motivo' => $motivo]
        );

        $this->registrarEvento('desbloqueo_manual', $ip, null, $adminId, $motivo);
    }

    /** Envía una IP a la lista negra de forma permanente. */
    public function bloquearManual(string $ip, int $adminId, string $motivo = 'Bloqueo manual'): void
    {
        $this->execute(
            'INSERT INTO ip_bloqueos
                (ip, intentos, nivel, bloqueado_hasta, permanente, motivo, ultimo_bloqueo)
             VALUES (:ip, 0, :nivel, NULL, 1, :motivo, NOW())
             ON DUPLICATE KEY UPDATE
                intentos = 0,
                nivel = GREATEST(nivel, :nivel2),
                bloqueado_hasta = NULL,
                permanente = 1,
                motivo = VALUES(motivo),
                ultimo_bloqueo = NOW()',
            [
                ':ip'     => $ip,
                ':nivel'  => $this->maxBloqueos,
                ':nivel2' => $this->maxBloqueos,
                ':motivo' => $motivo,
            ]
        );

        $this->registrarEvento('bloqueo_manual', $ip, null, $adminId, $motivo);
    }

    public function registrarEvento(
        string $tipo,
        string $ip,
        ?string $email = null,
        ?int $usuarioId = null,
        ?string $detalle = null,
    ): void {
        $this->execute(
            'INSERT INTO eventos_seguridad (tipo, ip, email, usuario_id, detalle)
             VALUES (:tipo, :ip, :email, :usuario_id, :detalle)',
            [
                ':tipo'       => mb_substr($tipo, 0, 40),
                ':ip'         => $ip,
                ':email'      => $email === null ? null : $this->normalizarEmail($email),
                ':usuario_id' => $usuarioId,
                ':detalle'    => $detalle === null ? null : mb_substr($detalle, 0, 255),
            ]
        );
    }

    /** @param array<string,mixed> $estado */
    public function mensaje(array $estado): string
    {
        if ($estado['permanente']) {
            return 'Esta conexión está bloqueada permanentemente por demasiados intentos fallidos. Contacta al administrador.';
        }

        return 'Demasiados intentos fallidos. Intenta de nuevo en '
            . $this->formatearEspera((int) $estado['restante']) . '.';
    }

    /** @param array<string,mixed> $estado */
    public function datosBloqueo(array $estado): array
    {
        return [
            'bloqueo'    => true,
            'permanente' => (bool) $estado['permanente'],
            'nivel'      => (int) $estado['nivel'],
            'restante'   => (int) $estado['restante'],
            'hasta'      => $estado['bloqueado_hasta'],
        ];
    }

    private function formatearEspera(int $segundos): string
    {
        if ($segundos >= 3600) {
            $horas = (int) ceil($segundos / 3600);
            return $horas === 1 ? '1 hora' : "{$horas} horas";
        }

        if ($segundos >= 60) {
            $minutos = (int) ceil($segundos / 60);
            return $minutos === 1 ? '1 minuto' : "{$minutos} minutos";
        }

        return $segundos === 1 ? '1 segundo' : "{$segundos} segundos";
    }

    private function normalizarEmail(string $email): string
    {
        return mb_substr(mb_strtolower(trim($email)), 0, 160);
    }

    /** @return array<string,mixed> */
    private function estadoVacio(string $ip): array
    {
        return [
            'ip'              => $ip,
            'bloqueado'       => false,
            'permanente'      => false,
            'nivel'           => 0,
            'intentos'        => 0,
            'restante'        => 0,
            'bloqueado_hasta' => null,
            'motivo'          => null,
        ];
    }

    private function limpiarAntiguos(): void
    {
        if (random_int(1, 100) !== 1) {
            return;
        }

        $this->execute('DELETE FROM login_intentos WHERE created_at < NOW() - INTERVAL 7 DAY');
        $this->execute('DELETE FROM eventos_seguridad WHERE creado < NOW() - INTERVAL 180 DAY');
        $this->execute(
            'DELETE FROM refresh_tokens WHERE expira < NOW() - INTERVAL 30 DAY'
        );
    }
}
