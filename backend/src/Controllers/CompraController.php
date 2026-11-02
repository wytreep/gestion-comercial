<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\CompraService;

final class CompraController extends BaseController
{
    public function __construct(private readonly CompraService $svc) {}

    public function index(Request $r): Response    { return Response::ok($this->svc->listar()); }
    public function show(Request $r): Response     { return Response::ok($this->svc->detalle($this->routeId($r))); }
    public function store(Request $r): Response
    {
        $this->requireFields($r, 'fecha_compra', 'items');
        $data = $r->all();
        $data['usuario_id'] = $r->authUser()['sub'] ?? null;
        return Response::created(['id' => $this->svc->crear($data)], 'Compra registrada');
    }

    public function update(Request $r): Response
    {
        $data = $r->all();
        $data['usuario_id'] = $r->authUser()['sub'] ?? null;
        $this->svc->editar($this->routeId($r), $data);
        return Response::ok(null, 'Compra actualizada');
    }
    public function cambiarEstado(Request $r): Response { $this->requireFields($r, 'estado'); $this->svc->cambiarEstado($this->routeId($r), (string)$r->input('estado')); return Response::ok(null, 'Estado actualizado'); }
}
