<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Repositories\CategoriaRepository;

final class CategoriaService extends BaseService
{
    public function __construct(private readonly CategoriaRepository $repo) {}

    public function listar(): array
    {
        return array_map(
            fn(array $categoria): array => $this->formatear($categoria),
            $this->repo->findAll()
        );
    }

    public function crear(array $data): array
    {
        $nombre = $this->texto($data, 'nombre', 'El nombre de la categoría', 60);

        if ($this->repo->findByNombre($nombre) !== null) {
            throw new BusinessException("Ya existe una categoría llamada '{$nombre}'.");
        }

        $descripcion = $this->textoOpcional($data, 'descripcion', 255);
        $id = $this->repo->crear($nombre, $descripcion);

        $categoria = $this->repo->findById($id);
        if ($categoria === null) {
            throw new NotFoundException('Categoría');
        }

        return $this->formatear($categoria);
    }

    /**
     * Resuelve la categoría de un producto a partir de `categoria_id` o,
     * como comodidad, de `categoria_nombre` (la crea si no existe).
     */
    public function resolver(array $data): int
    {
        $categoriaId = (int) ($data['categoria_id'] ?? 0);

        if ($categoriaId > 0) {
            $categoria = $this->repo->findById($categoriaId);

            if ($categoria === null || (int) $categoria['activo'] !== 1) {
                throw new ValidationException([
                    'categoria_id' => 'Selecciona una categoría activa.',
                ]);
            }

            return $categoriaId;
        }

        $nombre = trim((string) ($data['categoria_nombre'] ?? ''));

        if ($nombre === '') {
            throw new ValidationException([
                'categoria_id' => 'Selecciona o crea una categoría.',
            ]);
        }

        $existente = $this->repo->findByNombre($nombre);

        if ($existente !== null) {
            return (int) $existente['id'];
        }

        return $this->repo->crear(mb_substr($nombre, 0, 60), null);
    }

    private function formatear(array $categoria): array
    {
        return [
            'id'          => (int) $categoria['id'],
            'nombre'      => (string) $categoria['nombre'],
            'descripcion' => $categoria['descripcion'] !== null ? (string) $categoria['descripcion'] : null,
            'activo'      => (int) $categoria['activo'] === 1,
            'productos'   => (int) ($categoria['productos'] ?? 0),
        ];
    }
}
