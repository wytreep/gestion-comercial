<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Request, Response};
use App\Services\CarteraService;

final class CarteraController extends BaseController
{
    public function __construct(private readonly CarteraService $svc) {}

    /** GET /api/v1/cartera */
    public function index(Request $r): Response
    {
        return Response::ok($this->svc->getCartera());
    }
}
