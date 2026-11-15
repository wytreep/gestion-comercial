<?php declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Request, Response};
use App\Services\EtiquetaService;

final class EtiquetaController extends BaseController
{
    public function __construct(private readonly EtiquetaService $svc) {}

    public function index(Request $r): Response
    {
        return Response::ok($this->svc->listar([
            'producto_id' => $r->query('producto_id'),
            'tipo'        => $r->query('tipo'),
            'estado'      => $r->query('estado'),
            'lote'        => $r->query('lote'),
            'q'           => $r->query('q'),
        ]));
    }

    public function store(Request $r): Response
    {
        $this->requireFields($r, 'producto_id');

        $usuarioId = isset($r->authUser()['sub']) ? (int) $r->authUser()['sub'] : null;

        return Response::created(
            $this->svc->crear($r->all(), $usuarioId),
            'Etiqueta generada'
        );
    }

    public function show(Request $r): Response
    {
        return Response::ok($this->svc->obtener($this->codigo($r)));
    }

    public function anular(Request $r): Response
    {
        return Response::ok($this->svc->anular($this->codigo($r)), 'Etiqueta anulada');
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
