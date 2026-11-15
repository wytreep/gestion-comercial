<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Request, Response};
use App\Services\ClienteService;

final class ClienteController extends BaseController
{
    public function __construct(private readonly ClienteService $svc) {}

    public function index(Request $r): Response
    {
        return Response::ok($this->svc->listar($r->query('q')));
    }

    public function store(Request $r): Response
    {
        return Response::created($this->svc->crear($r->all()), 'Cliente creado');
    }

    public function update(Request $r): Response
    {
        return Response::ok(
            $this->svc->actualizar($this->routeId($r), $r->all()),
            'Cliente actualizado'
        );
    }

    public function getProveedores(Request $r): Response
    {
        return Response::ok($this->svc->proveedores());
    }

    public function getTiposGasto(Request $r): Response
    {
        return Response::ok($this->svc->tiposGasto());
    }
}
