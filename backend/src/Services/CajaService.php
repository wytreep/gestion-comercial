<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BaseRepository;

final class CajaService extends BaseRepository
{
    public function getFlujo(string $desde, string $hasta): array
    {
        $ingresos    = $this->getIngresos($desde, $hasta);
        $inversiones = $this->getInversiones($desde, $hasta);
        $saldos      = $this->getSaldosPorDestino($desde, $hasta);
        $movimientos = $this->getMovimientos($desde, $hasta);

        return [
            'flujo' => [
                'ingresos'    => $ingresos,
                'inversiones' => $inversiones,
            ],
            'saldos'      => $saldos,
            'movimientos' => $movimientos,
        ];
    }

    private function getIngresos(string $desde, string $hasta): float
    {
        $r = $this->queryOne(
            "SELECT COALESCE(SUM(monto), 0) AS total
             FROM pagos
             WHERE DATE(fecha_pago) BETWEEN :d AND :h",
            [':d' => $desde, ':h' => $hasta]
        );
        return (float) $r['total'];
    }

    private function getInversiones(string $desde, string $hasta): float
    {
        $r = $this->queryOne(
            "SELECT COALESCE(SUM(total_inversion), 0) AS total
             FROM compras
             WHERE fecha_compra BETWEEN :d AND :h",
            [':d' => $desde, ':h' => $hasta]
        );
        return (float) $r['total'];
    }

    private function getSaldosPorDestino(string $desde, string $hasta): array
    {
        return $this->query(
            "SELECT destino_dinero,
                    COALESCE(SUM(monto), 0) AS total,
                    COUNT(*) AS transacciones
             FROM pagos
             WHERE DATE(fecha_pago) BETWEEN :d AND :h
             GROUP BY destino_dinero
             ORDER BY total DESC",
            [':d' => $desde, ':h' => $hasta]
        );
    }

    private function getMovimientos(string $desde, string $hasta): array
    {
        return $this->query(
            "SELECT DATE(fecha_pago)  AS fecha,
                    medio_pago,
                    destino_dinero,
                    COUNT(*)          AS num_pagos,
                    SUM(monto)        AS total
             FROM pagos
             WHERE DATE(fecha_pago) BETWEEN :d AND :h
             GROUP BY DATE(fecha_pago), medio_pago, destino_dinero
             ORDER BY fecha DESC",
            [':d' => $desde, ':h' => $hasta]
        );
    }
}
