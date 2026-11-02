<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\VentaService;

final class VentaController extends BaseController
{
    public function __construct(private readonly VentaService $svc) {}

    public function index(Request $r): Response
    {
        $filtros = array_filter([
            'estado_pago'   => $r->query('estado_pago'),
            'estado_pedido' => $r->query('estado_pedido'),
            'cliente_id'    => $r->query('cliente_id'),
            'fecha_desde'   => $r->query('fecha_desde'),
            'fecha_hasta'   => $r->query('fecha_hasta'),
        ], fn($v) => $v !== null && $v !== '');
        return Response::ok($this->svc->listar($filtros));
    }

    public function show(Request $r): Response
    {
        return Response::ok($this->svc->detalle($this->routeId($r)));
    }

    public function store(Request $r): Response
    {
        $this->requireFields($r, 'items');
        $data = $r->all();
        $data['usuario_id'] = $r->authUser()['sub'] ?? null;
        $id = $this->svc->crear($data);
        return Response::created(['id' => $id], 'Venta registrada exitosamente');
    }

    public function update(Request $r): Response
    {
        $data = $r->all();
        $data['usuario_id'] = $r->authUser()['sub'] ?? null;
        $this->svc->editar($this->routeId($r), $data);
        return Response::ok(null, 'Venta actualizada');
    }

    public function destroy(Request $r): Response
    {
        $result = $this->svc->eliminar(
            $this->routeId($r),
            isset($r->authUser()['sub']) ? (int) $r->authUser()['sub'] : null
        );
        return Response::ok($result, $result['accion'] === 'cancelada' ? 'Venta cancelada' : 'Venta eliminada');
    }

    public function storePago(Request $r): Response
    {
        $this->requireFields($r, 'monto', 'medio_pago', 'destino_dinero');
        $id = $this->svc->registrarPago($this->routeId($r), $r->all());
        return Response::created(['id' => $id], 'Pago registrado');
    }
}
