<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Core\Request;
use ReflectionClass;

/**
 * Construye objetos Request para los tests.
 *
 * Request solo se puede instanciar desde globals (`fromGlobals`) y su
 * constructor privado depende de `getallheaders()` y `$_SERVER`, que no
 * existen en CLI. Mientras se añade una fábrica `Request::fake()` al Core,
 * esta factoría crea la instancia sin constructor y le inyecta solo los
 * parámetros que el test necesita.
 *
 * Semana 5-6 del plan: sustituir esta clase por una fábrica real en
 * App\Core\Request y borrar la reflexión.
 */
final class RequestFactory
{
    /**
     * Request autenticado con el rol indicado.
     */
    public static function autenticado(string $rol, int $usuarioId = 1): Request
    {
        $request = self::vacio();
        $request->setParams([
            'auth_user' => [
                'sub' => $usuarioId,
                'rol' => $rol,
            ],
        ]);

        return $request;
    }

    /**
     * Request sin usuario autenticado.
     */
    public static function vacio(): Request
    {
        $reflection = new ReflectionClass(Request::class);

        /** @var Request $request */
        $request = $reflection->newInstanceWithoutConstructor();

        return $request;
    }
}
