<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\BackupService;

final class BackupController extends BaseController
{
    public function __construct(private readonly BackupService $svc) {}

    public function generar(Request $r): void
    {
        $sql  = $this->svc->generarSql();
        $name = 'backup_' . date('Ymd_His') . '.sql';
        header('Content-Type: application/sql');
        header("Content-Disposition: attachment; filename=\"{$name}\"");
        header('Content-Length: ' . strlen($sql));
        echo $sql;
        exit;
    }

    public function historial(Request $r): Response
    {
        return Response::ok($this->svc->historialBackups());
    }
}
