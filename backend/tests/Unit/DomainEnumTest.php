<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\EstadoPago;
use App\Domain\EstadoPedido;
use App\Domain\Rol;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

/**
 * Enums de dominio — rol, estado de pedido y estado de pago.
 *
 * La regla que protege esta suite es la de siempre: un valor que existe en
 * PHP tiene que existir en MySQL, y viceversa. Si alguien añade un estado a
 * la migración y olvida el enum (o al revés), el test falla antes de que el
 * error llegue a producción como un 500 del ENUM.
 */
final class DomainEnumTest extends TestCase
{
    private const SCHEMA = __DIR__ . '/../../../database/migrations/001_schema.sql';

    public function testRolesCoincidenConElEsquema(): void
    {
        self::assertSame(
            $this->valoresEnum('rol'),
            Rol::values(),
            'usuarios.rol y App\Domain\Rol no coinciden.'
        );
    }

    public function testEstadosDePedidoCoincidenConElEsquema(): void
    {
        self::assertSame(
            $this->valoresEnum('estado_pedido'),
            EstadoPedido::values(),
            'ventas.estado_pedido y App\Domain\EstadoPedido no coinciden.'
        );
    }

    public function testEstadosDePagoCoincidenConElEsquema(): void
    {
        self::assertSame(
            $this->valoresEnum('estado_pago'),
            EstadoPago::values(),
            'ventas.estado_pago y App\Domain\EstadoPago no coinciden.'
        );
    }

    public function testJerarquiaDeRoles(): void
    {
        self::assertGreaterThan(Rol::Vendedor->nivel(), Rol::Admin->nivel());
        self::assertGreaterThan(Rol::Readonly->nivel(), Rol::Vendedor->nivel());
        self::assertSame(0, Rol::tryFrom('root')?->nivel() ?? 0);
    }

    public function testRolDesconocidoNoSeConvierte(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Rol::desde('superadmin');
    }

    public function testEtiquetasDeRol(): void
    {
        self::assertSame('Administrador', Rol::Admin->etiqueta());
        self::assertSame('Solo lectura', Rol::Readonly->etiqueta());
    }

    public function testCanceladoSeReconoceComoCancelado(): void
    {
        self::assertTrue(EstadoPedido::Cancelado->esCancelado());
        self::assertFalse(EstadoPedido::Entregado->esCancelado());
    }

    public function testSoloPagadoEstaSaldado(): void
    {
        self::assertTrue(EstadoPago::Pagado->estaSaldado());
        self::assertFalse(EstadoPago::Abono->estaSaldado());
        self::assertFalse(EstadoPago::Fiado->estaSaldado());
    }

    public function testValorInvalidoEnElEstadoDePedido(): void
    {
        $this->expectException(InvalidArgumentException::class);
        EstadoPedido::desde('enviado');
    }

    /**
     * Extrae los valores de un ENUM del esquema, en el orden en que MySQL los
     * declara. `str_getcsv` con comilla simple respeta el formato
     * 'a','b','c' de la migración.
     *
     * @return list<string>
     */
    private function valoresEnum(string $columna): array
    {
        if (!is_file(self::SCHEMA)) {
            self::markTestSkipped('El esquema no está disponible en este entorno.');
        }

        $sql = (string) file_get_contents(self::SCHEMA);

        if (preg_match('/' . preg_quote($columna, '/') . "\s+ENUM\(([^)]+)\)/i", $sql, $m) !== 1) {
            self::fail("No se encontró el ENUM de {$columna} en el esquema.");
        }

        // El cuarto argumento desactiva el escape de la barra inversa: sin él,
        // PHP 8.4 emite una deprecación por usar el valor por defecto.
        return str_getcsv($m[1], ',', "'", '');
    }
}
