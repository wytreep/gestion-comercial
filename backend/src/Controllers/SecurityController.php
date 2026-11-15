<?php declare(strict_types=1);
namespace App\Controllers;

use App\Core\{Request, Response};
use App\Exceptions\HttpException;
use App\Services\{AuthService, LoginThrottleService};

/**
 * Panel de seguridad: sesiones activas, IP bloqueadas y bitácora.
 *
 * El listado exige el JWT de administrador y, además, un token de seguridad
 * obtenido al confirmar la contraseña. Ese token dura 10 minutos y está atado
 * a la sesión y a la IP, de modo que las acciones sensibles (revocar sesiones,
 * desbloquear o enviar a lista negra) siempre piden credenciales de nuevo.
 */
final class SecurityController extends BaseController
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly LoginThrottleService $throttle,
    ) {}

    public function sesiones(Request $r): Response
    {
        $this->exigirSeguridad($r);
        return Response::ok($this->auth->listarSesiones());
    }

    public function revocarSesion(Request $r): Response
    {
        $admin = $this->exigirSeguridad($r);
        $this->auth->revocarSesion($this->routeId($r), (int) $admin['sub']);
        return Response::ok(null, 'Sesión revocada');
    }

    public function bloqueos(Request $r): Response
    {
        $this->exigirSeguridad($r);
        return Response::ok($this->throttle->listarBloqueos());
    }

    public function eventos(Request $r): Response
    {
        $this->exigirSeguridad($r);
        return Response::ok($this->throttle->listarEventos());
    }

    public function desbloquear(Request $r): Response
    {
        $admin = $this->exigirSeguridad($r);
        $this->requireFields($r, 'ip');
        $ip     = (string) $r->input('ip');
        $motivo = trim((string) $r->input('motivo', 'Desbloqueo manual'));

        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            throw new \App\Exceptions\ValidationException(['ip' => 'La IP no es válida.']);
        }

        $this->throttle->desbloquear($ip, (int) $admin['sub'], $motivo ?: 'Desbloqueo manual');
        return Response::ok(null, 'IP desbloqueada');
    }

    public function bloquear(Request $r): Response
    {
        $admin = $this->exigirSeguridad($r);
        $this->requireFields($r, 'ip');
        $ip     = (string) $r->input('ip');
        $motivo = trim((string) $r->input('motivo', 'Bloqueo manual'));

        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            throw new \App\Exceptions\ValidationException(['ip' => 'La IP no es válida.']);
        }

        $this->throttle->bloquearManual($ip, (int) $admin['sub'], $motivo ?: 'Bloqueo manual');
        return Response::ok(null, 'IP enviada a la lista negra');
    }

    /** @return array<string,mixed> */
    private function exigirSeguridad(Request $r): array
    {
        $token = $r->header('X-Security-Token') ?? (string) $r->input('security_token', '');
        if (trim($token) === '') {
            throw new HttpException('Confirma tu contraseña para acceder a la seguridad.', 401);
        }

        return $this->auth->verificarTokenSeguridad($token, $r->ip());
    }
}
