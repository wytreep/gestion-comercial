<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * RoleMiddleware — verifica que el usuario tenga uno de los roles requeridos.
 *
 * Jerarquía de roles:
 *   admin    → puede todo
 *   vendedor → puede crear/editar ventas y compras, NO gestión de usuarios ni reportes avanzados
 *   readonly → solo lectura (GET)
 *
 * Uso en rutas:
 *   $adminOnly    = $roleMiddleware->require('admin')
 *   $noReadonly   = $roleMiddleware->require('admin', 'vendedor')
 */
final class RoleMiddleware
{
    /** Jerarquía: un rol hereda los permisos de los que están debajo */
    private const HIERARCHY = ['admin' => 3, 'vendedor' => 2, 'readonly' => 1];

    /**
     * Devuelve un closure que actúa como middleware y verifica que
     * el usuario tenga AL MENOS UNO de los roles pasados.
     */
    public function require(string ...$roles): callable
    {
        return function (Request $request, callable $next) use ($roles): Response {
            $userRol = $request->authRol();

            foreach ($roles as $required) {
                if ($this->hasRole($userRol, $required)) {
                    return $next($request);
                }
            }

            return Response::forbidden(
                "Tu rol '{$userRol}' no tiene permisos para esta acción."
            );
        };
    }

    /**
     * Verifica si el rol del usuario cumple con el rol requerido.
     * admin puede hacer lo que vendedor puede, y vendedor lo que readonly puede.
     */
    private function hasRole(string $userRol, string $required): bool
    {
        $userLevel     = self::HIERARCHY[$userRol]     ?? 0;
        $requiredLevel = self::HIERARCHY[$required]    ?? 999;
        return $userLevel >= $requiredLevel;
    }
}
