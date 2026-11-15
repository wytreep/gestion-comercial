<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Services\CryptoService;

/**
 * Búsqueda y creación de clientes por nombre.
 *
 * Se usa cuando en una venta se escribe el nombre de un cliente que no está
 * registrado: se reutiliza el existente o se crea uno nuevo. Así el nombre
 * queda asociado a la venta y cartera/reportes siguen funcionando.
 *
 * Dirección y notas se cifran en reposo; el teléfono queda en claro porque la
 * búsqueda lo usa y solo contiene un dato de contacto acotado.
 */
final class ClienteRepository extends BaseRepository
{
    private CryptoService $crypto;

    public function __construct(?CryptoService $crypto = null)
    {
        parent::__construct();
        $this->crypto = $crypto ?? new CryptoService();
    }

    /**
     * Listado con búsqueda opcional por nombre o teléfono.
     */
    public function findAll(?string $q = null): array
    {
        $q = trim((string) $q);

        if ($q === '') {
            $filas = $this->query(
                'SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre'
            );
        } else {
            $like = "%{$q}%";

            $filas = $this->query(
                'SELECT * FROM clientes
                 WHERE activo = 1 AND (nombre LIKE :nombre OR telefono LIKE :telefono)
                 ORDER BY nombre',
                [':nombre' => $like, ':telefono' => $like]
            );
        }

        return array_map(fn (array $fila) => $this->descifrarFila($fila), $filas);
    }

    public function findById(int $id): ?array
    {
        $fila = $this->queryOne(
            'SELECT * FROM clientes WHERE id = :id',
            [':id' => $id]
        );

        return $fila === null ? null : $this->descifrarFila($fila);
    }

    public function crearCompleto(array $data): int
    {
        return $this->insert(
            'INSERT INTO clientes (nombre, telefono, direccion, notas)
             VALUES (:nombre, :telefono, :direccion, :notas)',
            [
                ':nombre'    => $data['nombre'],
                ':telefono'  => $data['telefono'] ?? null,
                ':direccion' => $this->crypto->cifrar($data['direccion'] ?? null),
                ':notas'     => $this->crypto->cifrar($data['notas'] ?? null),
            ]
        );
    }

    public function actualizar(int $id, array $data): void
    {
        $this->execute(
            'UPDATE clientes
             SET nombre = :nombre, telefono = :telefono, direccion = :direccion, notas = :notas
             WHERE id = :id',
            [
                ':nombre'    => $data['nombre'],
                ':telefono'  => $data['telefono'] ?? null,
                ':direccion' => $this->crypto->cifrar($data['direccion'] ?? null),
                ':notas'     => $this->crypto->cifrar($data['notas'] ?? null),
                ':id'        => $id,
            ]
        );
    }

    public function proveedores(): array
    {
        return array_map(
            fn (array $fila) => $this->descifrarFila($fila),
            $this->query('SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre')
        );
    }

    public function tiposGasto(): array
    {
        return $this->query('SELECT * FROM tipos_gasto ORDER BY id');
    }

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

    private function descifrarFila(array $fila): array
    {
        foreach (['direccion', 'notas'] as $campo) {
            if (isset($fila[$campo])) {
                $fila[$campo] = $this->crypto->descifrar((string) $fila[$campo]);
            }
        }

        return $fila;
    }

    private function normalizar(string $nombre): string
    {
        $nombre = preg_replace('/\s+/u', ' ', trim($nombre)) ?? trim($nombre);
        return mb_substr($nombre, 0, 120);
    }
}
