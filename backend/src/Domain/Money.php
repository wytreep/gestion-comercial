<?php

declare(strict_types=1);

namespace App\Domain;

use InvalidArgumentException;
use Stringable;

/**
 * Importe de dinero exacto, almacenado en centavos.
 *
 * Por qué existe: el backend calcula totales, saldos y márgenes con `float`.
 * En coma flotante 0.1 + 0.2 no es 0.3, y por eso el código compara contra
 * 0.01 en lugar de contra cero (49 casts y 4 comparaciones detectadas en
 * docs/auditoria-2026-11-16.md). Con enteros esa clase de error desaparece.
 *
 * Es inmutable: `add`, `subtract` y `multiply` devuelven una instancia nueva.
 *
 * Límites deliberados:
 * - No hay operador de división. Para repartir se usa `allocate`, que no
 *   pierde centavos.
 * - `fromDecimal` rechaza más de dos decimales en lugar de redondear: si un
 *   llamador tiene tres decimales, el problema está antes, no aquí.
 * - El redondeo solo ocurre al multiplicar por una cantidad (peso, unidades),
 *   que es el único caso donde no puede dar exacto.
 */
final readonly class Money implements Stringable
{
    /** Decimales de la moneda. COP usa 2 en la base (DECIMAL(12,2)). */
    private const SCALE = 2;

    private function __construct(private int $cents)
    {
    }

    public static function zero(): self
    {
        return new self(0);
    }

    public static function fromCents(int $cents): self
    {
        return new self($cents);
    }

    /**
     * Construye desde el formato decimal de la BD o de la API: "120000",
     * "120000.5", "120000.50", "-0.50". Acepta int y string; **no** acepta
     * float a propósito: el float ya trae su error y su texto depende de
     * `precision` del php.ini (con precision=17, 0.1 + 0.2 se convierte en
     * "0.30000000000000004"). Convertir es responsabilidad del llamador.
     *
     * @throws InvalidArgumentException si el valor no es numérico, usa coma
     *         decimal o trae más de dos decimales.
     */
    public static function fromDecimal(string|int $amount): self
    {
        if (is_int($amount)) {
            if ($amount > intdiv(PHP_INT_MAX, 100) || $amount < intdiv(PHP_INT_MIN, 100)) {
                throw new InvalidArgumentException('Importe fuera de rango.');
            }

            return new self($amount * 100);
        }

        $string = trim($amount);

        if (str_contains($string, ',')) {
            throw new InvalidArgumentException(
                sprintf('Usa punto decimal, no coma: "%s".', $string)
            );
        }

        if (preg_match('/^([+-]?)(\d+)(?:\.(\d{1,2}))?$/', $string, $partes) !== 1) {
            throw new InvalidArgumentException(
                sprintf('Importe inválido: "%s". Se espera hasta dos decimales.', $string)
            );
        }

        [, $signo, $enteros] = $partes;

        if ((int) $enteros > intdiv(PHP_INT_MAX, 100)) {
            throw new InvalidArgumentException('Importe fuera de rango.');
        }

        $decimales = str_pad($partes[3] ?? '0', self::SCALE, '0', STR_PAD_RIGHT);
        $cents     = ((int) $enteros) * 100 + (int) $decimales;

        return new self($signo === '-' ? -$cents : $cents);
    }

    public function add(self $other): self
    {
        return new self($this->cents + $other->cents);
    }

    public function subtract(self $other): self
    {
        return new self($this->cents - $other->cents);
    }

    /**
     * Multiplica por una cantidad expresada en **milésimas** enteras:
     * 18,5 kg es 18_500 y 0,1 kg es 100.
     *
     * Se usa milésimas porque es la precisión de `detalle_venta.cantidad`
     * (DECIMAL(10,3)). La aritmética es toda entera; el resultado se redondea
     * al centavo más cercano, alejándose de cero en el medio centavo.
     */
    public function multiplyMilli(int $thousandths): self
    {
        if ($thousandths !== 0
            && abs($this->cents) > intdiv(PHP_INT_MAX, abs($thousandths))
        ) {
            throw new InvalidArgumentException('Importe fuera de rango.');
        }

        $producto = $this->cents * $thousandths;
        $redondeo = $producto >= 0 ? 500 : -500;

        return new self(intdiv($producto + $redondeo, 1000));
    }

    /**
     * Reparte el importe según proporciones, sin perder ni inventar centavos:
     * el resto se asigna de uno en uno a las primeras partes.
     *
     * @param  list<int|float> $ratios
     * @return list<self>
     */
    public function allocate(array $ratios): array
    {
        $ratios = array_values($ratios);

        if ($ratios === []) {
            throw new InvalidArgumentException('No hay proporciones para repartir.');
        }

        foreach ($ratios as $ratio) {
            if (!is_int($ratio) && !is_float($ratio)) {
                throw new InvalidArgumentException('Las proporciones deben ser numéricas.');
            }

            if ($ratio < 0) {
                throw new InvalidArgumentException('Las proporciones no pueden ser negativas.');
            }
        }

        $total = array_sum($ratios);

        if ($total <= 0) {
            throw new InvalidArgumentException('La suma de proporciones debe ser mayor que cero.');
        }

        $partes    = [];
        $repartido = 0;

        foreach ($ratios as $ratio) {
            $parte       = (int) round($this->cents * $ratio / $total);
            $partes[]    = $parte;
            $repartido  += $parte;
        }

        $resto = $this->cents - $repartido;
        $paso  = $resto <=> 0;
        $i     = 0;

        while ($resto !== 0) {
            $partes[$i] += $paso;
            $resto      -= $paso;
            $i           = ($i + 1) % count($partes);
        }

        return array_map(static fn (int $cents): self => new self($cents), $partes);
    }

    /**
     * Reparte en partes iguales.
     *
     * @return list<self>
     */
    public function allocateEvenly(int $parts): array
    {
        if ($parts < 1) {
            throw new InvalidArgumentException('Se necesita al menos una parte.');
        }

        return $this->allocate(array_fill(0, $parts, 1));
    }

    public function equals(self $other): bool
    {
        return $this->cents === $other->cents;
    }

    public function isZero(): bool
    {
        return $this->cents === 0;
    }

    public function isNegative(): bool
    {
        return $this->cents < 0;
    }

    public function toCents(): int
    {
        return $this->cents;
    }

    /** Formato decimal con dos decimales, listo para la API o la BD. */
    public function toDecimal(): string
    {
        $signo = $this->cents < 0 ? '-' : '';
        $abs   = abs($this->cents);

        return $signo
            . intdiv($abs, 100)
            . '.'
            . str_pad((string) ($abs % 100), self::SCALE, '0', STR_PAD_LEFT);
    }

    public function __toString(): string
    {
        return $this->toDecimal();
    }
}
