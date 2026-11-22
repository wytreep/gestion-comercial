<?php

declare(strict_types=1);

namespace App\Services;

use App\Domain\Money;
use App\Exceptions\ValidationException;
use App\Repositories\BaseRepository;
use InvalidArgumentException;

/**
 * Base para la capa de servicios.
 *
 * Un servicio concentra las reglas de negocio y valida la entrada antes de
 * tocar los repositorios. Los controladores no deben validar ni consultar la
 * base de datos directamente.
 *
 * Hereda de BaseRepository para que los servicios existentes que aún usan
 * consultas directas (PDO) compartan la misma conexión mientras se migran a
 * repositorios especializados. Los servicios nuevos deben depender de un
 * repositorio por composición.
 */
abstract class BaseService extends BaseRepository
{
    /**
     * Comprueba que los campos indicados tengan un valor no vacío.
     *
     * @param array<string,mixed> $data
     */
    protected function requireFields(array $data, string ...$fields): void
    {
        $errors = [];

        foreach ($fields as $field) {
            $value = $data[$field] ?? null;
            if ($value === null || (is_string($value) && trim($value) === '')) {
                $errors[$field] = "El campo '{$field}' es requerido.";
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }
    }

    /**
     * Texto obligatorio, recortado y con longitud máxima.
     *
     * @param array<string,mixed> $data
     */
    protected function texto(
        array $data,
        string $field,
        string $label,
        int $maxLength,
    ): string {
        $value = trim((string) ($data[$field] ?? ''));

        if ($value === '') {
            throw new ValidationException([$field => "{$label} es obligatorio."]);
        }

        if (mb_strlen($value) > $maxLength) {
            throw new ValidationException([
                $field => "{$label} admite máximo {$maxLength} caracteres.",
            ]);
        }

        return $value;
    }

    /**
     * Texto opcional. Devuelve null cuando llega vacío.
     *
     * @param array<string,mixed> $data
     */
    protected function textoOpcional(array $data, string $field, int $maxLength): ?string
    {
        $value = trim((string) ($data[$field] ?? ''));

        if ($value === '') {
            return null;
        }

        if (mb_strlen($value) > $maxLength) {
            throw new ValidationException([
                $field => "El campo admite máximo {$maxLength} caracteres.",
            ]);
        }

        return $value;
    }

    /**
     * Número válido. Se redondea a los decimales indicados.
     *
     * @param array<string,mixed> $data
     */
    protected function numero(
        array $data,
        string $field,
        string $label,
        int $decimals = 2,
    ): float {
        $raw = $data[$field] ?? null;

        if ($raw === null || $raw === '' || !is_numeric($raw)) {
            throw new ValidationException([$field => "{$label} debe ser un número."]);
        }

        return round((float) $raw, $decimals);
    }

    /**
     * Número estrictamente mayor que cero.
     *
     * @param array<string,mixed> $data
     */
    protected function positivo(
        array $data,
        string $field,
        string $label,
        int $decimals = 2,
    ): float {
        $value = $this->numero($data, $field, $label, $decimals);

        if ($value <= 0) {
            throw new ValidationException([$field => "{$label} debe ser mayor a cero."]);
        }

        return $value;
    }

    /**
     * Número mayor o igual que cero.
     *
     * @param array<string,mixed> $data
     */
    protected function noNegativo(
        array $data,
        string $field,
        string $label,
        int $decimals = 3,
    ): float {
        $value = $this->numero($data, $field, $label, $decimals);

        if ($value < 0) {
            throw new ValidationException([$field => "{$label} no puede ser negativo."]);
        }

        return $value;
    }

    /**
     * Valor restringido a una lista de opciones.
     *
     * @param array<int,string> $allowed
     */
    protected function enLista(
        string $value,
        array $allowed,
        string $field,
        string $label,
    ): string {
        if (!in_array($value, $allowed, true)) {
            throw new ValidationException([
                $field => "{$label} debe ser uno de: " . implode(', ', $allowed) . '.',
            ]);
        }

        return $value;
    }

    /**
     * Importe monetario: número decimal con hasta dos decimales.
     *
     * Devuelve `Money` en centavos para que sumas, restas y comparaciones de
     * dinero sean exactas. Rechaza tres o más decimales en lugar de redondear
     * en silencio: si un precio trae milésimas, el error está en quien lo
     * envía, y esconderlo con `round()` lo vuelve invisible.
     *
     * @param array<string,mixed> $data
     */
    protected function importe(
        array $data,
        string $field,
        string $label,
    ): Money {
        $raw = $data[$field] ?? null;

        if ($raw === null || $raw === '' || !is_numeric($raw)) {
            throw new ValidationException([$field => "{$label} debe ser un número."]);
        }

        try {
            return Money::fromDecimal(is_int($raw) ? $raw : (string) $raw);
        } catch (InvalidArgumentException) {
            throw new ValidationException([
                $field => "{$label} admite máximo dos decimales, con punto como separador.",
            ]);
        }
    }

    /**
     * Identificador numérico positivo recibido en el cuerpo o la ruta.
     *
     * @param array<string,mixed> $data
     */
    protected function id(
        array $data,
        string $field,
        string $label,
    ): int {
        $raw = $data[$field] ?? null;

        if (!is_numeric($raw) || (int) $raw <= 0) {
            throw new ValidationException([$field => "{$label} es obligatorio."]);
        }

        return (int) $raw;
    }
}
