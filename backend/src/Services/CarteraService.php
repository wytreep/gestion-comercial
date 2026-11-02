<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BaseRepository;

final class CarteraService extends BaseRepository
{
    public function getCartera(): array
    {
        return [
            'cartera'  => $this->getClientesConSaldo(),
            'vencidas' => $this->getDeudasVencidas(),
        ];
    }

    private function getClientesConSaldo(): array
    {
        return $this->query(
            "SELECT cl.id, cl.nombre, cl.telefono,
                    COUNT(v.id)           AS pedidos_pendientes,
                    SUM(v.total)          AS total_ventas,
                    SUM(v.total_pagado)   AS total_pagado,
                    SUM(v.saldo_pendiente)AS saldo_total
             FROM clientes cl
             JOIN ventas v ON v.cliente_id = cl.id
             WHERE v.saldo_pendiente > 0
               AND v.estado_pedido != 'cancelado'
             GROUP BY cl.id, cl.nombre, cl.telefono
             ORDER BY saldo_total DESC"
        );
    }

    private function getDeudasVencidas(): array
    {
        // Una fila por venta: el saldo real es v.saldo_pendiente (no el monto
        // de un pago individual) y se toma el vencimiento más antiguo.
        return $this->query(
            "SELECT v.id AS venta_id,
                    MIN(p.fecha_vencimiento)                  AS fecha_vencimiento,
                    v.saldo_pendiente,
                    COALESCE(cl.nombre, 'Sin cliente')        AS cliente,
                    DATEDIFF(CURDATE(), MIN(p.fecha_vencimiento)) AS dias_vencido
             FROM ventas v
             JOIN pagos p ON p.venta_id = v.id
             LEFT JOIN clientes cl ON cl.id = v.cliente_id
             WHERE p.fecha_vencimiento IS NOT NULL
               AND p.fecha_vencimiento < CURDATE()
               AND v.saldo_pendiente > 0
               AND v.estado_pedido != 'cancelado'
             GROUP BY v.id, v.saldo_pendiente, cl.nombre
             ORDER BY dias_vencido DESC"
        );
    }
}
