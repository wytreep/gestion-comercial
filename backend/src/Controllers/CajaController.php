<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Request, Response};
use App\Services\CajaService;

final class CajaController extends BaseController
{
    public function __construct(private readonly CajaService $svc) {}

    /** GET /api/v1/caja?desde=YYYY-MM-DD&hasta=YYYY-MM-DD */
    public function index(Request $r): Response
    {
        $desde = $r->query('desde') ?? date('Y-m-01');
        $hasta = $r->query('hasta') ?? date('Y-m-d');
        return Response::ok($this->svc->getFlujo($desde, $hasta));
    }
}
