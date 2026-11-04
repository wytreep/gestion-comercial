<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BaseRepository;

final class NotificacionService extends BaseRepository
{
    /**
     * Ventana de silencio después de marcar una alerta como leída.
     * Evita que una alerta ya reconocida reaparezca cuando se genera otra
     * notificación distinta; pasada la ventana, la condición se recuerda.
     */
    private const HORAS_REAVISO = 24;

    /**
     * Genera y persiste las notificaciones pendientes.
     * Se puede llamar en un cron o al inicio de sesión.
     */
    public function generarNotificaciones(): int
    {
        $total = 0;
        $total += $this->generarDeudasVencidas();
        $total += $this->generarStockBajo();
        return $total;
    }

    /**
     * Retorna notificaciones activas (no leídas) del sistema.
     */
    public function pendientes(): array
    {
        return $this->query(
            "SELECT * FROM notificaciones
             WHERE leida = 0
             ORDER BY created_at DESC
             LIMIT 50"
        );
    }

    public function contarPendientes(): int
    {
        $row = $this->queryOne("SELECT COUNT(*) AS total FROM notificaciones WHERE leida = 0");
        return (int) ($row['total'] ?? 0);
    }

    public function marcarLeida(int $id): void
    {
        $this->execute(
            'UPDATE notificaciones SET leida = 1, leida_at = NOW() WHERE id = :id',
            [':id' => $id]
        );
    }

    public function marcarTodasLeidas(): void
    {
        $this->execute('UPDATE notificaciones SET leida = 1, leida_at = NOW() WHERE leida = 0');
    }

    // ── Generadores privados ──────────────────────────

    private function generarDeudasVencidas(): int
    {
        // Una fila por venta (no por pago) para no inflar la deuda, y se usa
        // el saldo real de la venta en lugar del monto de un pago individual.
        $vencidas = $this->query(
            "SELECT v.id AS venta_id,
                    MIN(p.fecha_vencimiento) AS fecha_vencimiento,
                    v.saldo_pendiente,
                    COALESCE(cl.nombre, 'Sin cliente') AS cliente,
                    DATEDIFF(CURDATE(), MIN(p.fecha_vencimiento)) AS dias_mora
             FROM ventas v
             JOIN pagos p ON p.venta_id = v.id
             LEFT JOIN clientes cl ON cl.id = v.cliente_id
             WHERE p.fecha_vencimiento IS NOT NULL
               AND p.fecha_vencimiento < CURDATE()
               AND v.saldo_pendiente > 0
               AND v.estado_pedido != 'cancelado'
               AND NOT EXISTS (
                   SELECT 1 FROM notificaciones n
                   WHERE n.tipo = 'deuda_vencida'
                     AND n.referencia_id = v.id
                     AND (
                       n.leida = 0
                       OR n.created_at >= NOW() - INTERVAL " . self::HORAS_REAVISO . " HOUR
                     )
               )
             GROUP BY v.id, v.saldo_pendiente, cl.nombre"
        );

        $count = 0;
        foreach ($vencidas as $v) {
            $saldo = '$' . number_format((float) $v['saldo_pendiente'], 0, ',', '.');
            $this->insert(
                "INSERT INTO notificaciones (tipo, titulo, mensaje, referencia_id, referencia_tipo)
                 VALUES ('deuda_vencida', :titulo, :mensaje, :ref_id, 'venta')",
                [
                    ':titulo' => "Deuda vencida — {$v['cliente']}",
                    ':mensaje' => "La venta #{$v['venta_id']} lleva {$v['dias_mora']} día(s) de mora. Saldo: {$saldo}.",
                    ':ref_id' => $v['venta_id'],
                ]
            );
            $count++;
        }
        return $count;
    }

    private function generarStockBajo(): int
    {
        // Stock negativo o por debajo del mínimo (0 para todos los productos)
        $bajos = $this->query(
            "SELECT id, nombre, stock_actual, unidad_medida
             FROM productos
             WHERE activo = 1 AND stock_actual <= 0
               AND NOT EXISTS (
                   SELECT 1 FROM notificaciones n
                   WHERE n.tipo = 'stock_bajo'
                     AND n.referencia_id = productos.id
                     AND (
                       n.leida = 0
                       OR n.created_at >= NOW() - INTERVAL " . self::HORAS_REAVISO . " HOUR
                     )
               )"
        );

        $count = 0;
        foreach ($bajos as $p) {
            $this->insert(
                "INSERT INTO notificaciones (tipo, titulo, mensaje, referencia_id, referencia_tipo)
                 VALUES ('stock_bajo', :titulo, :mensaje, :ref_id, 'producto')",
                [
                    ':titulo' => "Stock bajo — {$p['nombre']}",
                    ':mensaje' => "El stock de {$p['nombre']} es {$p['stock_actual']} {$p['unidad_medida']}.",
                    ':ref_id' => $p['id'],
                ]
            );
            $count++;
        }
        return $count;
    }
}
