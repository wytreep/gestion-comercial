<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Domain\Rol;
use App\Services\AuthService;

final class AuthController extends BaseController
{
    public function __construct(private readonly AuthService $svc) {}

    public function login(Request $r): Response
    {
        $this->requireFields($r, 'email', 'password');
        return Response::ok(
            $this->svc->login(
                (string) $r->input('email'),
                (string) $r->input('password'),
                $r->ip(),
                (string) ($r->header('User-Agent') ?? '')
            ),
            'Autenticado correctamente'
        );
    }

    public function refresh(Request $r): Response
    {
        $this->requireFields($r, 'refresh_token');
        return Response::ok($this->svc->refresh(
            (string) $r->input('refresh_token'),
            $r->ip(),
            (string) ($r->header('User-Agent') ?? '')
        ));
    }

    /** Estado del bloqueo de la IP actual (pantalla de login). */
    public function estadoIp(Request $r): Response
    {
        return Response::ok($this->svc->estadoIp($r->ip()));
    }

    public function logout(Request $r): Response
    {
        $this->svc->logout($r->authUser() ?? []);
        return Response::ok(null, 'Sesión cerrada');
    }

    /**
     * Re-autenticación del panel de seguridad: exige contraseña y devuelve un
     * token de 10 minutos atado a la sesión y a la IP.
     */
    public function verificarSeguridad(Request $r): Response
    {
        $this->requireFields($r, 'password');
        $payload = $r->authUser() ?? [];
        $userId  = (int) ($payload['sub'] ?? 0);

        if (!$this->svc->verificarPassword($userId, (string) $r->input('password'))) {
            $this->svc->registrarReautenticacionFallida($userId, $r->ip());
            return Response::error('Contraseña incorrecta.', 401);
        }

        return Response::ok($this->svc->crearTokenSeguridad($userId, $payload, $r->ip()));
    }

    public function register(Request $r): Response
    {
        $this->requireFields($r, 'nombre', 'email', 'password');
        $id = $this->svc->crearUsuario((string)$r->input('nombre'), (string)$r->input('email'), (string)$r->input('password'), (string)$r->input('rol', Rol::Vendedor->value));
        return Response::created(['id' => $id], 'Usuario creado');
    }

    public function listarUsuarios(Request $r): Response
    {
        return Response::ok($this->svc->listarUsuarios());
    }

    public function cambiarRol(Request $r): Response
    {
        $this->requireFields($r, 'rol');
        $this->svc->cambiarRol($this->routeId($r), (string)$r->input('rol'));
        return Response::ok(null, 'Rol actualizado');
    }

    public function toggleActivo(Request $r): Response
    {
        $this->requireFields($r, 'activo');
        $this->svc->toggleActivo($this->routeId($r), (bool)$r->input('activo'));
        return Response::ok(null, 'Estado actualizado');
    }

    public function cambiarPassword(Request $r): Response
    {
        $this->requireFields($r, 'password_actual', 'password_nueva');
        $userId = $r->authUser()['sub'] ?? 0;
        $this->svc->cambiarPassword((int)$userId, (string)$r->input('password_actual'), (string)$r->input('password_nueva'));
        return Response::ok(null, 'Contraseña actualizada');
    }

    /** Preferencia de tema de la cuenta: claro · oscuro · sistema. */
    public function preferencias(Request $r): Response
    {
        $this->requireFields($r, 'tema');
        $userId = (int) ($r->authUser()['sub'] ?? 0);
        $this->svc->guardarTema($userId, (string) $r->input('tema'));
        return Response::ok(null, 'Preferencias guardadas');
    }
}
