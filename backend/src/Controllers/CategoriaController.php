<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Request, Response};
use App\Services\CategoriaService;

final class CategoriaController extends BaseController
{
    public function __construct(private readonly CategoriaService $svc) {}

    public function index(Request $r): Response
    {
        return Response::ok($this->svc->listar());
    }

    public function store(Request $r): Response
    {
        return Response::created($this->svc->crear($r->all()), 'Categoría creada');
    }
}
