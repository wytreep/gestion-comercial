<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\{DashboardService, NotificacionService};

final class DashboardController extends BaseController
{
    public function __construct(
        private readonly DashboardService    $svc,
        private readonly NotificacionService $notifSvc,
    ) {}

    public function index(Request $r): Response
    {
        // Generar notificaciones automáticamente al cargar el dashboard
        $this->notifSvc->generarNotificaciones();
        $data = $this->svc->getResumen();

        // El rol vendedor no debe recibir información de costos ni utilidades.
        if ($r->authRol() !== 'admin') {
            unset(
                $data['resumen_mes']['inversion'],
                $data['resumen_mes']['ganancia_bruta'],
                $data['resumen_mes']['margen_bruto'],
                $data['saldos_destino'],
            );
            $data['stock'] = array_map(static function (array $p): array {
                unset($p['precio_compra']);
                return $p;
            }, $data['stock']);
        }

        $data['notificaciones_pendientes'] = $this->notifSvc->contarPendientes();
        return Response::ok($data);
    }
}
