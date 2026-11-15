<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Services\AuthService;
use App\Exceptions\HttpException;

/**
 * AuthMiddleware — verifica el JWT y que la sesión siga activa.
 *
 * Además de la firma y la expiración, comprueba que la sesión no haya sido
 * revocada y que la petición venga de la misma IP con la que se inició.
 * Inyecta el payload en $request como 'auth_user'.
 */
final class AuthMiddleware
{
    public function __construct(private readonly AuthService $authService) {}

    public function __invoke(Request $request, callable $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null) {
            return Response::unauthorized('Se requiere token de autenticación.');
        }

        try {
            $payload = $this->authService->verificarAcceso($token, $request->ip());
            $request->setParams(['auth_user' => $payload]);
        } catch (HttpException $e) {
            return Response::unauthorized($e->getMessage());
        }

        return $next($request);
    }
}
