<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Exceptions\TooManyRequestsException;
use App\Repositories\BaseRepository;

/**
 * Rate limiting del login.
 *
 * Los contadores viven en MySQL (no en memoria) para que el límite se respete
 * con varios workers de PHP-FPM. Se limita por email+IP y, además, por IP
 * para frenar el ataque de diccionario rotando correos.
 */
final class LoginThrottleService extends BaseRepository
{
    private int $maxIntentos;
    private int $maxIntentosIp;
    private int $ventanaMinutos;
    private int $bloqueoMinutos;

    public function __construct()
    {
        parent::__construct();
        $cfg = Config::getInstance();

        $this->maxIntentos    = max(1, $cfg->getInt('LOGIN_MAX_ATTEMPTS', 5));
        $this->maxIntentosIp  = max($this->maxIntentos, $cfg->getInt('LOGIN_MAX_IP_ATTEMPTS', 20));
        $this->ventanaMinutos = max(1, $cfg->getInt('LOGIN_WINDOW_MINUTES', 15));
        $this->bloqueoMinutos = max(1, $cfg->getInt('LOGIN_LOCKOUT_MINUTES', 15));
    }

    /**
     * @throws TooManyRequestsException si el email+IP o la IP están bloqueados.
     */
    public function assertAllowed(string $email, string $ip): void
    {
        $this->limpiarAntiguos();

        $email = $this->normalizarEmail($email);

        $restanteEmail = $this->segundosDeBloqueo(
            'email = :email AND ip = :ip',
            [':email' => $email, ':ip' => $ip],
            $this->maxIntentos
        );

        if ($restanteEmail > 0) {
            $this->registrarBloqueo($email, $ip, $restanteEmail);
            throw new TooManyRequestsException(
                'Demasiados intentos fallidos. Intenta de nuevo en ' . $this->formatearEspera($restanteEmail) . '.',
                $restanteEmail
            );
        }

        $restanteIp = $this->segundosDeBloqueo(
            'ip = :ip',
            [':ip' => $ip],
            $this->maxIntentosIp
        );

        if ($restanteIp > 0) {
            $this->registrarBloqueo($email, $ip, $restanteIp);
            throw new TooManyRequestsException(
                'Demasiados intentos fallidos desde esta conexión. Intenta de nuevo en ' . $this->formatearEspera($restanteIp) . '.',
                $restanteIp
            );
        }
    }

    public function registrarFallo(string $email, string $ip): void
    {
        $email = $this->normalizarEmail($email);

        $this->execute(
            'INSERT INTO login_intentos (email, ip, exitoso) VALUES (:email, :ip, 0)',
            [':email' => $email, ':ip' => $ip]
        );

        error_log(sprintf('[LOGIN] Intento fallido email=%s ip=%s', $email, $ip));
    }

    public function registrarExito(string $email, string $ip): void
    {
        // Un login correcto limpia los fallos acumulados de ese email+IP.
        $this->execute(
            'DELETE FROM login_intentos WHERE email = :email AND ip = :ip AND exitoso = 0',
            [':email' => $this->normalizarEmail($email), ':ip' => $ip]
        );
    }

    /**
     * Devuelve los segundos que faltan para que expire el bloqueo, o 0 si
     * todavía no se alcanzó el límite.
     */
    private function segundosDeBloqueo(string $condicion, array $params, int $limite): int
    {
        // Los minutos se interpolan como enteros ya validados en el constructor.
        $ventana = $this->ventanaMinutos;
        $bloqueo = $this->bloqueoMinutos;

        $fila = $this->queryOne(
            "SELECT COUNT(*) AS total,
                    TIMESTAMPDIFF(
                        SECOND,
                        NOW(),
                        MAX(created_at) + INTERVAL {$bloqueo} MINUTE
                    ) AS restante
             FROM login_intentos
             WHERE {$condicion}
               AND exitoso = 0
               AND created_at >= NOW() - INTERVAL {$ventana} MINUTE",
            $params
        );

        if ($fila === null || (int) $fila['total'] < $limite) {
            return 0;
        }

        return max(0, (int) $fila['restante']);
    }

    private function registrarBloqueo(string $email, string $ip, int $segundos): void
    {
        error_log(sprintf(
            '[LOGIN] Bloqueo activo email=%s ip=%s restante=%ds',
            $email,
            $ip,
            $segundos
        ));
    }

    private function formatearEspera(int $segundos): string
    {
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

    private function limpiarAntiguos(): void
    {
        // Limpieza probabilística: no vale la pena borrar en cada petición.
        if (random_int(1, 100) !== 1) {
            return;
        }

        $this->execute('DELETE FROM login_intentos WHERE created_at < NOW() - INTERVAL 7 DAY');
    }
}
