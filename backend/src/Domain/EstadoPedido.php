<?php

declare(strict_types=1);

namespace App\Domain;

use InvalidArgumentException;

/**
 * Estado del pedido de una venta.
 *
 * Los valores coinciden con `ventas.estado_pedido` (ENUM). Se llama
 * `EstadoPedido` y no `EstadoVenta` porque ese es el nombre de la columna y
 * del campo de la API: dos nombres para lo mismo confunden más de lo que
 * aclaran.
 */
enum EstadoPedido: string
{
    case Nuevo         = 'nuevo';
    case EnPreparacion = 'en_preparacion';
    case Entregado     = 'entregado';
    case Cancelado     = 'cancelado';

    public function etiqueta(): string
    {
        return match ($this) {
            self::Nuevo         => 'Nuevo',
            self::EnPreparacion => 'En preparación',
            self::Entregado     => 'Entregado',
            self::Cancelado     => 'Cancelado',
        };
    }

    /**
     * Una venta cancelada no admite pagos ni ediciones: la comprobación se
     * hace contra el enum, no contra un string repetido en cada servicio.
     */
    public function esCancelado(): bool
    {
        return $this === self::Cancelado;
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
            ?? throw new InvalidArgumentException("Estado de pedido '{$valor}' no válido.");
    }
}
