<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\NotFoundException;
use App\Repositories\ClienteRepository;

final class ClienteService extends BaseService
{
    public function __construct(private readonly ClienteRepository $repo) {}

    public function listar(?string $q = null): array
    {
        return $this->repo->findAll($q);
    }

    public function crear(array $data): array
    {
        $payload = $this->normalizar($data);
        $id = $this->repo->crearCompleto($payload);

        return $this->detalle($id);
    }

    public function actualizar(int $id, array $data): array
    {
        if ($this->repo->findById($id) === null) {
            throw new NotFoundException('Cliente');
        }

        $this->repo->actualizar($id, $this->normalizar($data));

        return $this->detalle($id);
    }

    public function proveedores(): array
    {
        return $this->repo->proveedores();
    }

    public function tiposGasto(): array
    {
        return $this->repo->tiposGasto();
    }

    private function detalle(int $id): array
    {
        $cliente = $this->repo->findById($id);

        if ($cliente === null) {
            throw new NotFoundException('Cliente');
        }

        return $cliente;
    }

    private function normalizar(array $data): array
    {
        return [
            'nombre'    => $this->texto($data, 'nombre', 'El nombre del cliente', 120),
            'telefono'  => $this->textoOpcional($data, 'telefono', 20),
            'direccion' => $this->textoOpcional($data, 'direccion', 255),
            'notas'     => $this->textoOpcional($data, 'notas', 500),
        ];
    }
}
