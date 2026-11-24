<?php

declare(strict_types=1);

namespace App\Domain;

use InvalidArgumentException;

/**
 * Estado de pago de una venta.
 *
 * Los valores coinciden con `ventas.estado_pago` (ENUM). MySQL lo calcula en
 * el trigger `trg_pago_insert` a partir de `total_pagado`; PHP lo usa para
 * filtrar y para no repetir los mismos strings en cada consulta.
 *
 * No confundir con el estado de un cobro QR (`cobros_qr.estado`), que es otro
 * ciclo de vida: pendiente → pagado / expirado / anulado.
 */
enum EstadoPago: string
{
    case Pagado    = 'pagado';
    case Abono     = 'abono';
    case Pendiente = 'pendiente';
    case Fiado     = 'fiado';

    public function etiqueta(): string
    {
        return match ($this) {
            self::Pagado    => 'Pagado',
            self::Abono     => 'Abono',
            self::Pendiente => 'Pendiente',
            self::Fiado     => 'Fiado',
        };
    }

    /** Solo `pagado` significa que la venta quedó saldada. */
    public function estaSaldado(): bool
    {
        return $this === self::Pagado;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @throws InvalidArgumentException si el valor no es un estado conocido.
     */
    public static function desde(string $valor): self
    {
        return self::tryFrom($valor)
            ?? throw new InvalidArgumentException("Estado de pago '{$valor}' no válido.");
    }
}
