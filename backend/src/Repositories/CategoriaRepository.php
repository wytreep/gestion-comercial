<?php

declare(strict_types=1);

namespace App\Repositories;

final class CategoriaRepository extends BaseRepository
{
    /**
     * Categorías activas con el número de productos activos asociados.
     */
    public function findAll(): array
    {
        return $this->query(
            "SELECT c.id, c.nombre, c.descripcion, c.activo,
                    COUNT(p.id) AS productos
             FROM categorias c
             LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
             WHERE c.activo = 1
             GROUP BY c.id, c.nombre, c.descripcion, c.activo
             ORDER BY c.nombre"
        );
    }

    public function findById(int $id): ?array
    {
        return $this->queryOne(
            'SELECT id, nombre, descripcion, activo FROM categorias WHERE id = :id',
            [':id' => $id]
        );
    }

    public function findByNombre(string $nombre): ?array
    {
        return $this->queryOne(
            'SELECT id, nombre, descripcion, activo
             FROM categorias
             WHERE LOWER(TRIM(nombre)) = LOWER(:nombre)
             LIMIT 1',
            [':nombre' => trim($nombre)]
        );
    }

    public function crear(string $nombre, ?string $descripcion): int
    {
        return $this->insert(
            'INSERT INTO categorias (nombre, descripcion) VALUES (:nombre, :descripcion)',
            [':nombre' => $nombre, ':descripcion' => $descripcion]
        );
    }
}
