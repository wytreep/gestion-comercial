<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\ReporteService;

final class ReporteController extends BaseController
{
    public function __construct(private readonly ReporteService $svc) {}

    public function mensualJson(Request $r): Response
    {
        $mes = $r->query('mes') ?? date('Y-m');
        return Response::ok($this->svc->generarMensual($mes));
    }

    public function mensualPdf(Request $r): void
    {
        $mes  = $r->query('mes') ?? date('Y-m');
        $pdf  = $this->svc->generarPdfMensual($mes);
        $name = "reporte_{$mes}.pdf";
        header('Content-Type: application/pdf');
        header("Content-Disposition: attachment; filename=\"{$name}\"");
        header('Content-Length: ' . strlen($pdf));
        echo $pdf;
        exit;
    }
}
