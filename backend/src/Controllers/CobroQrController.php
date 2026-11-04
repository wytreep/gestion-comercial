<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\CobroQrService;

final class CobroQrController extends BaseController
{
    public function __construct(private readonly CobroQrService $svc) {}

    public function index(Request $r): Response
    {
        return Response::ok($this->svc->listar($this->routeId($r)));
    }

    public function store(Request $r): Response
    {
        $usuarioId = isset($r->authUser()['sub']) ? (int) $r->authUser()['sub'] : null;
        return Response::created(
            $this->svc->crear($this->routeId($r), $r->all(), $usuarioId),
            'Cobro QR generado'
        );
    }

    public function show(Request $r): Response
    {
        return Response::ok($this->svc->obtener($this->codigo($r)));
    }

    public function confirmar(Request $r): Response
    {
        $this->requireFields($r, 'referencia');
        return Response::ok(
            $this->svc->confirmar($this->codigo($r), $r->all()),
            'Pago confirmado y registrado en la venta'
        );
    }

    public function anular(Request $r): Response
    {
        return Response::ok($this->svc->anular($this->codigo($r)), 'Cobro anulado');
    }

    private function codigo(Request $r): string
    {
        $codigo = trim((string) $r->param('codigo'));
        if ($codigo === '') {
            throw new \InvalidArgumentException("Parámetro 'codigo' inválido.");
        }
        return $codigo;
    }
}
