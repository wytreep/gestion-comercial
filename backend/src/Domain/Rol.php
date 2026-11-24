<?php

declare(strict_types=1);

namespace App\Domain;

use InvalidArgumentException;

/**
 * Rol de un usuario del sistema.
 *
 * Los valores coinciden con `usuarios.rol` (ENUM). La jerarquía vive aquí, en
 * un solo sitio: `admin` puede lo de `vendedor`, y `vendedor` lo de `readonly`.
 * Un rol desconocido no concede nada (nivel 0).
 */
enum Rol: string
{
    case Admin    = 'admin';
    case Vendedor = 'vendedor';
    case Readonly = 'readonly';

    /** Nivel jerárquico: a mayor nivel, más permisos. */
    public function nivel(): int
    {
        return match ($this) {
            self::Admin    => 3,
            self::Vendedor => 2,
            self::Readonly => 1,
        };
    }

    /** Nombre para la interfaz y los mensajes. */
    public function etiqueta(): string
    {
        return match ($this) {
            self::Admin    => 'Administrador',
            self::Vendedor => 'Vendedor',
            self::Readonly => 'Solo lectura',
        };
    }

    /**
     * Valores válidos tal como los guarda MySQL.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Convierte el valor recibido por la API en un rol.
     *
     * @throws InvalidArgumentException si el valor no es un rol conocido.
     */
    public static function desde(string $valor): self
    {
        return self::tryFrom($valor)
            ?? throw new InvalidArgumentException("Rol '{$valor}' no válido.");
    }
}
