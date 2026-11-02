<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BaseRepository;
use App\Exceptions\BusinessException;
use App\Exceptions\NotFoundException;

final class StockService extends BaseRepository
{
    /**
     * Convierte una cantidad "de venta/compra" a la unidad del stock.
     * Para canastas el stock se guarda en kilos, por lo que exige
     * kilos_por_canasta configurado.
     */
    public function cantidadEnStock(array $producto, float $cantidad): float
    {
        if (($producto['unidad_medida'] ?? '') === 'canasta') {
            $kilosPorCanasta = (float) ($producto['kilos_por_canasta'] ?? 0);

            if ($kilosPorCanasta <= 0) {
                throw new BusinessException(
                    "El producto '{$producto['nombre']}' no tiene configurado kilos_por_canasta."
                );
            }

            return $cantidad * $kilosPorCanasta;
        }

        return $cantidad;
    }

    /**
     * Registra un movimiento de stock y ajusta el stock_actual del producto.
     *
     * @param int    $productoId
     * @param float  $cantidad   Positivo = entrada, Negativo = salida
     * @param string $tipo       'compra' | 'venta' | 'ajuste_manual' | 'devolucion'
     * @param string $motivo     Descripción del movimiento
     * @param int|null $referenciaId  ID de la venta o compra que genera el movimiento
     * @param int|null $usuarioId     ID del usuario que realiza el ajuste
     */
    public function registrar(
        int    $productoId,
        float  $cantidad,
        string $tipo,
        string $motivo,
        ?int   $referenciaId = null,
        ?int   $usuarioId    = null,
    ): int {
        if (abs($cantidad) < 0.0001) {
            throw new BusinessException('La cantidad del movimiento no puede ser cero.');
        }

        $tiposValidos = ['compra', 'venta', 'ajuste_manual', 'devolucion'];
        if (!in_array($tipo, $tiposValidos, true)) {
            throw new BusinessException("Tipo de movimiento '{$tipo}' no válido.");
        }

        // Si el llamador ya abrió una transacción, la respetamos.
        $ownTransaction = !$this->pdo->inTransaction();
        if ($ownTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            // FOR UPDATE evita que dos ventas simultáneas pisen el mismo stock.
            // No se filtra por activo: las reversiones deben funcionar aunque
            // el producto se haya desactivado después de la venta original.
            $producto = $this->queryOne(
                'SELECT id, nombre, stock_actual FROM productos WHERE id = :id FOR UPDATE',
                [':id' => $productoId]
            );

            if ($producto === null) {
                throw new NotFoundException('Producto');
            }

            $stockAnterior = (float) $producto['stock_actual'];
            $stockNuevo    = round($stockAnterior + $cantidad, 3);

            if ($stockNuevo < 0) {
                throw new BusinessException(
                    "Stock insuficiente para '{$producto['nombre']}'. " .
                    "Disponible: {$stockAnterior}, solicitado: " . abs($cantidad) . '.'
                );
            }

            $this->execute(
                'UPDATE productos SET stock_actual = :stock WHERE id = :id',
                [':stock' => $stockNuevo, ':id' => $productoId]
            );

            $id = $this->insert(
                'INSERT INTO stock_movimientos
                 (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
                 VALUES (:producto_id, :tipo, :cantidad, :stock_anterior, :stock_nuevo, :motivo, :ref_id, :user_id)',
                [
                    ':producto_id'    => $productoId,
                    ':tipo'           => $tipo,
                    ':cantidad'       => $cantidad,
                    ':stock_anterior' => $stockAnterior,
                    ':stock_nuevo'    => $stockNuevo,
                    ':motivo'         => mb_substr($motivo, 0, 200),
                    ':ref_id'         => $referenciaId,
                    ':user_id'        => $usuarioId,
                ]
            );

            if ($ownTransaction) {
                $this->pdo->commit();
            }

            return $id;
        } catch (\Throwable $e) {
            if ($ownTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function historial(int $productoId, int $limit = 50): array
    {
        $limit = max(1, min(500, $limit));

        return $this->query(
            "SELECT sm.*, p.nombre AS producto, u.nombre AS usuario
             FROM stock_movimientos sm
             JOIN productos p ON p.id = sm.producto_id
             LEFT JOIN usuarios u ON u.id = sm.usuario_id
             WHERE sm.producto_id = :id
             ORDER BY sm.created_at DESC
             LIMIT {$limit}",
            [':id' => $productoId]
        );
    }

    public function historialGeneral(int $limit = 100): array
    {
        $limit = max(1, min(500, $limit));

        return $this->query(
            "SELECT sm.*, p.nombre AS producto, u.nombre AS usuario
             FROM stock_movimientos sm
             JOIN productos p ON p.id = sm.producto_id
             LEFT JOIN usuarios u ON u.id = sm.usuario_id
             ORDER BY sm.created_at DESC
             LIMIT {$limit}"
        );
    }

    public function resumenStock(): array
    {
        return $this->query(
            "SELECT p.id, p.nombre, p.unidad_medida, p.stock_actual,
                    p.precio_compra, p.precio_venta, p.kilos_por_canasta,
                    COUNT(sm.id) AS total_movimientos,
                    MAX(sm.created_at) AS ultimo_movimiento
             FROM productos p
             LEFT JOIN stock_movimientos sm ON sm.producto_id = p.id
             WHERE p.activo = 1
             GROUP BY p.id
             ORDER BY p.nombre"
        );
    }
}
