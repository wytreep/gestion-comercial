<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\NotificacionService;

final class NotificacionController extends BaseController
{
    public function __construct(private readonly NotificacionService $svc) {}

    public function index(Request $r): Response    { return Response::ok($this->svc->pendientes()); }
    public function count(Request $r): Response    { return Response::ok(['total' => $this->svc->contarPendientes()]); }
    public function leer(Request $r): Response     { $this->svc->marcarLeida($this->routeId($r)); return Response::ok(null, 'Marcada como leída'); }
    public function leerTodas(Request $r): Response{ $this->svc->marcarTodasLeidas(); return Response::ok(null, 'Todas marcadas como leídas'); }
}
