<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BaseRepository;

final class DashboardService extends BaseRepository
{
    public function getResumen(): array
    {
        $mes = date('Y-m');

        $resumenVentas = $this->getResumenVentas($mes);
        $inversion     = $this->getInversionMes($mes);
        $cobrado       = $this->getIngresosCobrados($mes);
        $cartera       = $this->getCarteraPendiente();
        $ganancia      = $resumenVentas['total'] - $inversion;
        $margen        = $resumenVentas['total'] > 0
                         ? round(($ganancia / $resumenVentas['total']) * 100, 1)
                         : 0.0;

        return [
            'resumen_mes'    => [
                'ingresos_cobrados' => $cobrado,
                'ventas_count'      => $resumenVentas['count'],
                'ventas_total'      => $resumenVentas['total'],
                'inversion'         => $inversion,
                'ganancia_bruta'    => $ganancia,
                'margen_bruto'      => $margen,
                'cartera_pendiente' => $cartera,
            ],
            'ultimas_ventas' => $this->getUltimasVentas(),
            'saldos_destino' => $this->getSaldosDestino(),
            'stock'          => $this->getStock(),
        ];
    }

    private function getResumenVentas(string $mes): array
    {
        $r = $this->queryOne(
            "SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS sum
             FROM ventas
             WHERE DATE_FORMAT(fecha_venta,'%Y-%m') = :mes AND estado_pedido != 'cancelado'",
            [':mes' => $mes]
        );
        return ['count' => (int)$r['cnt'], 'total' => (float)$r['sum']];
    }

    private function getInversionMes(string $mes): float
    {
        $r = $this->queryOne(
            "SELECT COALESCE(SUM(total_inversion),0) AS total FROM compras
             WHERE DATE_FORMAT(fecha_compra,'%Y-%m') = :mes",
            [':mes' => $mes]
        );
        return (float)$r['total'];
    }

    private function getIngresosCobrados(string $mes): float
    {
        $r = $this->queryOne(
            "SELECT COALESCE(SUM(monto),0) AS total FROM pagos
             WHERE DATE_FORMAT(fecha_pago,'%Y-%m') = :mes",
            [':mes' => $mes]
        );
        return (float)$r['total'];
    }

    private function getCarteraPendiente(): float
    {
        $r = $this->queryOne(
            "SELECT COALESCE(SUM(saldo_pendiente),0) AS total FROM ventas
             WHERE saldo_pendiente > 0 AND estado_pedido != 'cancelado'"
        );
        return (float)$r['total'];
    }

    private function getUltimasVentas(): array
    {
        return $this->query(
            "SELECT v.id, COALESCE(c.nombre,'Sin cliente') AS cliente,
                    DATE_FORMAT(v.fecha_venta,'%d/%m/%Y') AS fecha,
                    v.total, v.estado_pago, v.estado_pedido
             FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id
             ORDER BY v.id DESC LIMIT 5"
        );
    }

    private function getSaldosDestino(): array
    {
        return $this->query(
            "SELECT destino_dinero, COALESCE(SUM(monto),0) AS total
             FROM pagos GROUP BY destino_dinero ORDER BY total DESC"
        );
    }

    private function getStock(): array
    {
        return $this->query(
            "SELECT nombre, stock_actual, unidad_medida, precio_compra,
                    precio_venta, kilos_por_canasta FROM productos WHERE activo = 1"
        );
    }
}
