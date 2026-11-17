<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Response;
use App\Middleware\RoleMiddleware;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\RequestFactory;

/**
 * RoleMiddleware — jerarquía admin > vendedor > readonly.
 *
 * Es la primera línea de la matriz de acceso que se automatiza completa en la
 * semana 6. Aquí solo se prueba la pieza de autorización, sin HTTP ni BD.
 */
final class RoleMiddlewareTest extends TestCase
{
    /**
     * @return array<string, array{string, string, bool}>
     */
    public static function combinacionesDeRoles(): array
    {
        return [
            'admin sobre admin'        => ['admin', 'admin', true],
            'admin sobre vendedor'     => ['admin', 'vendedor', true],
            'admin sobre readonly'     => ['admin', 'readonly', true],
            'vendedor sobre vendedor'  => ['vendedor', 'vendedor', true],
            'vendedor sobre readonly'  => ['vendedor', 'readonly', true],
            'vendedor sobre admin'     => ['vendedor', 'admin', false],
            'readonly sobre readonly'  => ['readonly', 'readonly', true],
            'readonly sobre vendedor'  => ['readonly', 'vendedor', false],
            'readonly sobre admin'     => ['readonly', 'admin', false],
            'rol desconocido'          => ['contabilidad', 'readonly', false],
        ];
    }

    #[DataProvider('combinacionesDeRoles')]
    public function testLaJerarquiaDecideElAcceso(string $rolUsuario, string $rolRequerido, bool $permitido): void
    {
        $middleware = new RoleMiddleware();
        $request    = RequestFactory::autenticado($rolUsuario);
        $siguiente  = static fn (): Response => Response::ok('acceso concedido');

        $respuesta = $middleware->require($rolRequerido)($request, $siguiente);

        if ($permitido) {
            self::assertTrue($this->exitoDe($respuesta));
        } else {
            self::assertFalse($this->exitoDe($respuesta));
            self::assertSame(403, $this->codigoDe($respuesta));
        }
    }

    public function testSoloSeEjecutaElSiguienteCuandoElRolAlcanza(): void
    {
        $middleware = new RoleMiddleware();
        $llamado    = false;
        $siguiente  = static function () use (&$llamado): Response {
            $llamado = true;
            return Response::ok();
        };

        $middleware->require('admin')(RequestFactory::autenticado('vendedor'), $siguiente);
        self::assertFalse($llamado, 'El vendedor no debe llegar al controlador de administración.');

        $middleware->require('admin')(RequestFactory::autenticado('admin'), $siguiente);
        self::assertTrue($llamado);
    }

    public function testRequestSinUsuarioSeTrataComoReadonly(): void
    {
        $middleware = new RoleMiddleware();

        $respuesta = $middleware->require('vendedor')(
            RequestFactory::vacio(),
            static fn (): Response => Response::ok()
        );

        self::assertSame(403, $this->codigoDe($respuesta));
    }

    public function testCualquieraDeLosRolesDeLaListaConcedeAcceso(): void
    {
        $middleware = new RoleMiddleware();
        $regla      = $middleware->require('admin', 'vendedor');

        // El middleware real que protege ventas y clientes ($noReadonly).
        self::assertTrue($this->exitoDe($regla(RequestFactory::autenticado('vendedor'), static fn (): Response => Response::ok())));
        self::assertFalse($this->exitoDe($regla(RequestFactory::autenticado('readonly'), static fn (): Response => Response::ok())));
    }

    private function codigoDe(Response $respuesta): int
    {
        // Response no expone su estado; se lee por reflexión mientras no exista
        // un getter. Anotado como deuda de diseño para la semana 6.
        $propiedad = new \ReflectionProperty($respuesta, 'status');

        return (int) $propiedad->getValue($respuesta);
    }

    private function exitoDe(Response $respuesta): bool
    {
        $propiedad = new \ReflectionProperty($respuesta, 'success');

        return (bool) $propiedad->getValue($respuesta);
    }
}
