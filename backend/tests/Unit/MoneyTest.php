<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

/**
 * Money — importes en centavos, aritmética exacta.
 *
 * Es el primer paso de la semana 1 del plan: hoy el backend hace sumas y
 * restas de dinero con floats y comparaciones contra 0.01 (ver
 * docs/auditoria-2026-11-16.md). Este value object es la base para quitar
 * ambos olores sin cambiar todavía ningún servicio.
 *
 * Reglas que fija esta suite:
 * - La unidad interna es el centavo (int). No se opera con float.
 * - `fromDecimal` acepta como máximo dos decimales: lo que la BD guarda en
 *   DECIMAL(12,2). Más precisión es un error del llamador, no algo que se
 *   redondee en silencio.
 * - `multiply` sí redondea (half-up) porque el resultado de multiplicar por
 *   una cantidad no tiene por qué caer en el centavo.
 * - `allocate` reparte sin perder ni inventar un centavo.
 */
final class MoneyTest extends TestCase
{
    // ── Construcción ─────────────────────────────────────

    public function testFromDecimalConImporteEntero(): void
    {
        self::assertSame(12000000, Money::fromDecimal('120000')->toCents());
    }

    public function testFromDecimalConDosDecimales(): void
    {
        self::assertSame(12000050, Money::fromDecimal('120000.50')->toCents());
    }

    public function testFromDecimalConUnDecimalRellenaElCentavo(): void
    {
        self::assertSame(12000050, Money::fromDecimal('120000.5')->toCents());
    }

    public function testFromDecimalConIntYString(): void
    {
        self::assertSame(150000, Money::fromDecimal(1500)->toCents());
        self::assertSame(150050, Money::fromDecimal('1500.50')->toCents());
    }

    public function testFromDecimalRechazaFloatPorDiseno(): void
    {
        // El texto de un float depende de `precision` del php.ini, así que el
        // value object no lo acepta: quien convierte es el llamador.
        $this->expectException(\TypeError::class);
        Money::fromDecimal(0.3);
    }

    public function testFromDecimalNegativo(): void
    {
        self::assertSame(-50, Money::fromDecimal('-0.50')->toCents());
    }

    public function testFromDecimalIgnoraEspaciosAlrededor(): void
    {
        self::assertSame(800000, Money::fromDecimal('  8000.00  ')->toCents());
    }

    public function testFromDecimalRechazaTexto(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromDecimal('ocho mil');
    }

    public function testFromDecimalRechazaMasDeDosDecimales(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromDecimal('120000.505');
    }

    public function testFromDecimalRechazaComaDecimal(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromDecimal('120000,50');
    }

    public function testFromCentsEsLaViaDirecta(): void
    {
        self::assertSame(1, Money::fromCents(1)->toCents());
        self::assertSame(0, Money::zero()->toCents());
    }

    // ── Aritmética ───────────────────────────────────────

    public function testSuma(): void
    {
        $total = Money::fromDecimal('1500.25')->add(Money::fromDecimal('250.25'));

        self::assertSame(175050, $total->toCents());
    }

    public function testResta(): void
    {
        $saldo = Money::fromDecimal('1500.00')->subtract(Money::fromDecimal('1500.01'));

        self::assertSame(-1, $saldo->toCents());
        self::assertTrue($saldo->isNegative());
    }

    public function testOperarNoModificaElOriginal(): void
    {
        $base = Money::fromDecimal('100');
        $base->add(Money::fromDecimal('50'));

        self::assertSame(10000, $base->toCents());
    }

    public function testMultiplicarPorUnidadesEnteras(): void
    {
        self::assertSame(3750000, Money::fromDecimal('12500')->multiplyMilli(3_000)->toCents());
    }

    public function testMultiplicarPorCantidadConDecimales(): void
    {
        // 18,5 kg a 2.500 el kilo = 46.250
        self::assertSame(4625000, Money::fromDecimal('2500')->multiplyMilli(18_500)->toCents());
    }

    public function testMultiplicarRedondeaAlCentavoMasCercano(): void
    {
        // 0,05 × 0,5 = 0,025 -> 0,03 (half-up, no truncar)
        self::assertSame(3, Money::fromDecimal('0.05')->multiplyMilli(500)->toCents());
    }

    public function testMultiplicarRedondeaNegativosAlejandoseDeCero(): void
    {
        self::assertSame(-3, Money::fromDecimal('-0.05')->multiplyMilli(500)->toCents());
    }

    public function testMultiplicarPorMilesima(): void
    {
        // 1,00 × 0,001 = 0,001 -> 0,00
        self::assertSame(0, Money::fromDecimal('1')->multiplyMilli(1)->toCents());
        // 5,00 × 0,001 = 0,005 -> 0,01
        self::assertSame(1, Money::fromDecimal('5')->multiplyMilli(1)->toCents());
    }

    public function testMultiplicarRechazaDesbordamiento(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromCents(PHP_INT_MAX)->multiplyMilli(1_000_000);
    }

    // ── Reparto ──────────────────────────────────────────

    public function testRepartirEnPartesIgualesNoPierdeCentavos(): void
    {
        $partes = Money::fromDecimal('1.00')->allocateEvenly(3);

        self::assertCount(3, $partes);
        self::assertSame([34, 33, 33], array_map(static fn (Money $m): int => $m->toCents(), $partes));
        self::assertSame(100, array_sum(array_map(static fn (Money $m): int => $m->toCents(), $partes)));
    }

    public function testRepartirConProporciones(): void
    {
        // 10.000 entre 1:1:2 -> 2.500 / 2.500 / 5.000
        $partes = Money::fromDecimal('10000')->allocate([1, 1, 2]);

        self::assertSame([250000, 250000, 500000], array_map(static fn (Money $m): int => $m->toCents(), $partes));
    }

    public function testRepartirConProporcionesQueNoSonExactasConservaElTotal(): void
    {
        $partes = Money::fromDecimal('0.10')->allocate([1, 1, 1]);
        $centavos = array_map(static fn (Money $m): int => $m->toCents(), $partes);

        self::assertSame(10, array_sum($centavos));
        self::assertSame([4, 3, 3], $centavos);
    }

    public function testRepartirRechazaProporcionesVacias(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromDecimal('100')->allocate([]);
    }

    public function testRepartirRechazaProporcionesNegativasOEnCero(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromDecimal('100')->allocate([1, -1]);
    }

    // ── Comparación y formato ────────────────────────────

    public function testIgualdadPorValor(): void
    {
        self::assertTrue(Money::fromDecimal('100')->equals(Money::fromDecimal('100.00')));
        self::assertFalse(Money::fromDecimal('100')->equals(Money::fromDecimal('100.01')));
    }

    public function testSigno(): void
    {
        self::assertTrue(Money::zero()->isZero());
        self::assertFalse(Money::fromDecimal('0.01')->isZero());
        self::assertFalse(Money::fromDecimal('0.01')->isNegative());
        self::assertTrue(Money::fromDecimal('-0.01')->isNegative());
    }

    /** @return array<string, array{string, string}> */
    public static function formatosEsperados(): array
    {
        return [
            'cero'              => ['0', '0.00'],
            'centavos sueltos'  => ['0.05', '0.05'],
            'un peso'           => ['1', '1.00'],
            'negativo'          => ['-0.50', '-0.50'],
            'miles'             => ['120000', '120000.00'],
            'con decimales'     => ['120000.5', '120000.50'],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('formatosEsperados')]
    public function testToDecimalDevuelveSiempreDosDecimales(string $entrada, string $esperado): void
    {
        self::assertSame($esperado, Money::fromDecimal($entrada)->toDecimal());
    }

    public function testToStringEsElFormatoDecimal(): void
    {
        self::assertSame('120000.50', (string) Money::fromDecimal('120000.50'));
    }
}
