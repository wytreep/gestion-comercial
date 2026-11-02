<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Request, Response};
use App\Repositories\BaseRepository;

final class ClienteController extends BaseController
{
    private $repo;

    public function __construct()
    {
        $this->repo = new class extends BaseRepository {
            public function __construct()
            {
                parent::__construct();
            }

            public function listar(?string $q): array
            {
                $where = $q ? "WHERE (nombre LIKE :q OR telefono LIKE :q2) AND activo = 1" : "WHERE activo = 1";
                $params = $q ? [':q' => "%{$q}%", ':q2' => "%{$q}%"] : [];
                return $this->query("SELECT * FROM clientes {$where} ORDER BY nombre", $params);
            }

            public function crear(array $d): int
            {
                return $this->insert(
                    'INSERT INTO clientes (nombre, telefono, direccion, notas) VALUES (:n, :t, :dir, :notes)',
                    [':n' => $d['nombre'], ':t' => $d['telefono'] ?? null, ':dir' => $d['direccion'] ?? null, ':notes' => $d['notas'] ?? null]
                );
            }

            public function editar(int $id, array $d): void
            {
                $this->execute(
                    'UPDATE clientes SET nombre=:n, telefono=:t, direccion=:dir, notas=:notes WHERE id=:id',
                    [':n' => $d['nombre'], ':t' => $d['telefono'] ?? null, ':dir' => $d['direccion'] ?? null, ':notes' => $d['notas'] ?? null, ':id' => $id]
                );
            }

            public function proveedores(): array
            {
                return $this->query('SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre');
            }

            public function tiposGasto(): array
            {
                return $this->query('SELECT * FROM tipos_gasto ORDER BY id');
            }
        };
    }

    public function index(Request $r): Response
    {
        return Response::ok($this->repo->listar($r->query('q')));
    }

    public function store(Request $r): Response
    {
        $this->requireFields($r, 'nombre');
        return Response::created(['id' => $this->repo->crear($r->all())], 'Cliente creado');
    }

    public function update(Request $r): Response
    {
        $this->repo->editar($this->routeId($r), $r->all());
        return Response::ok(null, 'Cliente actualizado');
    }

    public function getProveedores(Request $r): Response
    {
        return Response::ok($this->repo->proveedores());
    }

    public function getTiposGasto(Request $r): Response
    {
        return Response::ok($this->repo->tiposGasto());
    }
}