<?php

declare(strict_types=1);

namespace App\Repositories;

/**
 * Búsqueda y creación de clientes por nombre.
 *
 * Se usa cuando en una venta se escribe el nombre de un cliente que no está
 * registrado: se reutiliza el existente o se crea uno nuevo. Así el nombre
 * queda asociado a la venta y cartera/reportes siguen funcionando.
 */
final class ClienteRepository extends BaseRepository
{
    public function buscarPorNombre(string $nombre): ?array
    {
        $nombre = $this->normalizar($nombre);
        if ($nombre === '') {
            return null;
        }

        return $this->queryOne(
            'SELECT id, nombre
             FROM clientes
             WHERE activo = 1 AND LOWER(TRIM(nombre)) = LOWER(:nombre)
             ORDER BY id
             LIMIT 1',
            [':nombre' => $nombre]
        );
    }

    public function crear(string $nombre): int
    {
        return $this->insert(
            'INSERT INTO clientes (nombre) VALUES (:nombre)',
            [':nombre' => $this->normalizar($nombre)]
        );
    }

    /**
     * Devuelve el id de un cliente con ese nombre o lo crea si no existe.
     */
    public function obtenerOCrearPorNombre(string $nombre): int
    {
        $existente = $this->buscarPorNombre($nombre);
        if ($existente !== null) {
            return (int) $existente['id'];
        }

        return $this->crear($nombre);
    }

    private function normalizar(string $nombre): string
    {
        $nombre = preg_replace('/\s+/u', ' ', trim($nombre)) ?? trim($nombre);
        return mb_substr($nombre, 0, 120);
    }
}
