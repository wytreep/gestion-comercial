<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Services\AuthService;
use App\Exceptions\HttpException;

/**
 * AuthMiddleware — verifica el JWT en el header Authorization.
 * Inyecta el payload del token en $request como 'auth_user'.
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
            $payload = $this->authService->verificarToken($token);
            $request->setParams(['auth_user' => $payload]);
        } catch (HttpException $e) {
            return Response::unauthorized($e->getMessage());
        }

        return $next($request);
    }
}
