<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Request, Response};
use App\Services\FinanzasService;

final class FinanzasController extends BaseController
{
    public function __construct(private readonly FinanzasService $svc) {}

    /** GET /api/v1/finanzas?mes=YYYY-MM */
    public function index(Request $r): Response
    {
        $mes = $r->query('mes') ?? date('Y-m');

        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $mes) !== 1) {
            return Response::error('El parámetro mes debe tener formato YYYY-MM.', 422);
        }

        return Response::ok($this->svc->getResumen($mes));
    }
}
