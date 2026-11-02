<?php

declare(strict_types=1);

namespace App\Repositories;

final class VentaRepository extends BaseRepository
{
    public function findAll(array $filtros = []): array
    {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filtros['estado_pago'])) {
            $where[] = 'v.estado_pago = :ep';
            $params[':ep'] = $filtros['estado_pago'];
        }
        if (!empty($filtros['estado_pedido'])) {
            $where[] = 'v.estado_pedido = :eped';
            $params[':eped'] = $filtros['estado_pedido'];
        }
        if (!empty($filtros['cliente_id'])) {
            $where[] = 'v.cliente_id = :cid';
            $params[':cid'] = $filtros['cliente_id'];
        }
        if (!empty($filtros['fecha_desde'])) {
            $where[] = 'DATE(v.fecha_venta) >= :fd';
            $params[':fd'] = $filtros['fecha_desde'];
        }
        if (!empty($filtros['fecha_hasta'])) {
            $where[] = 'DATE(v.fecha_venta) <= :fh';
            $params[':fh'] = $filtros['fecha_hasta'];
        }

        return $this->query(
            "SELECT v.*, COALESCE(c.nombre,'Sin cliente') AS cliente_nombre, c.telefono AS cliente_telefono
             FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id
             WHERE " . implode(' AND ', $where) . " ORDER BY v.id DESC",
            $params
        );
    }

    public function findById(int $id): ?array
    {
        $venta = $this->queryOne(
            "SELECT v.*, COALESCE(c.nombre,'Sin cliente') AS cliente_nombre, c.telefono AS cliente_telefono
             FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE v.id = :id",
            [':id' => $id]
        );
        if (!$venta) return null;

        $venta['items'] = $this->query(
            "SELECT dv.*, p.nombre AS producto, p.unidad_medida
             FROM detalle_venta dv JOIN productos p ON p.id = dv.producto_id
             WHERE dv.venta_id = :id ORDER BY dv.id",
            [':id' => $id]
        );
        $venta['pagos'] = $this->query(
            'SELECT * FROM pagos WHERE venta_id = :id ORDER BY id',
            [':id' => $id]
        );
        return $venta;
    }

    public function create(array $data): int
    {
        return $this->insert(
            "INSERT INTO ventas (cliente_id, fecha_venta, fecha_entrega, observaciones, estado_pedido)
             VALUES (:cliente_id, :fecha_venta, :fecha_entrega, :observaciones, :estado_pedido)",
            [
                ':cliente_id'    => $data['cliente_id'],
                ':fecha_venta'   => $data['fecha_venta'],
                ':fecha_entrega' => $data['fecha_entrega'],
                ':observaciones' => $data['observaciones'],
                ':estado_pedido' => $data['estado_pedido'],
            ]
        );
    }

    public function update(int $id, array $data): void
    {
        $sets   = [];
        $params = [':id' => $id];

        foreach (['cliente_id','estado_pedido','fecha_entrega','observaciones'] as $field) {
            if (array_key_exists($field, $data)) {
                $sets[]          = "{$field} = :{$field}";
                $params[":{$field}"] = $data[$field];
            }
        }
        if (empty($sets)) return;

        $this->execute("UPDATE ventas SET " . implode(', ', $sets) . " WHERE id = :id", $params);
    }

    public function insertItem(int $ventaId, int $prodId, float $cant, float $precio): int
    {
        return $this->insert(
            'INSERT INTO detalle_venta (venta_id,producto_id,cantidad,precio_unitario) VALUES(:v,:p,:c,:pr)',
            [':v'=>$ventaId,':p'=>$prodId,':c'=>$cant,':pr'=>$precio]
        );
    }

    public function deleteItems(int $ventaId): void
    {
        $this->execute('DELETE FROM detalle_venta WHERE venta_id = :id', [':id' => $ventaId]);
    }

    public function insertPago(int $ventaId, array $data): int
    {
        return $this->insert(
            "INSERT INTO pagos (venta_id,monto,fecha_pago,fecha_vencimiento,medio_pago,destino_dinero,referencia,notas)
             VALUES(:vid,:monto,NOW(),:fv,:medio,:destino,:ref,:notas)",
            [
                ':vid'     => $ventaId,
                ':monto'   => $data['monto'],
                ':fv'      => (isset($data['fecha_vencimiento']) && $data['fecha_vencimiento'] !== '')
                              ? $data['fecha_vencimiento']
                              : null,
                ':medio'   => $data['medio_pago']        ?? 'efectivo',
                ':destino' => $data['destino_dinero']    ?? 'efectivo_caja',
                ':ref'     => $data['referencia']        ?? null,
                ':notas'   => $data['notas']             ?? null,
            ]
        );
    }

    public function insertGastoReparto(int $ventaId, array $g): void
    {
        $this->insert(
            'INSERT INTO gastos_reparto (venta_id,tipo_gasto_id,monto,descripcion,fecha)
             VALUES(:vid,:tg,:monto,:desc,:fecha)',
            [
                ':vid'   => $ventaId,
                ':tg'    => $g['tipo_gasto_id'],
                ':monto' => $g['monto'],
                ':desc'  => $g['descripcion'] ?? null,
                ':fecha' => $g['fecha'] ?? date('Y-m-d'),
            ]
        );
    }

    public function cancelar(int $id): void
    {
        $this->execute(
            "UPDATE ventas SET estado_pedido='cancelado' WHERE id=:id", [':id'=>$id]
        );
    }

    public function deleteGastosReparto(int $id): void
    {
        $this->execute('DELETE FROM gastos_reparto WHERE venta_id=:id', [':id'=>$id]);
    }

    public function delete(int $id): void
    {
        $this->execute('DELETE FROM ventas WHERE id=:id', [':id'=>$id]);
    }

    /** Bloquea la fila de la venta para validar pagos concurrentes. */
    public function findSaldoForUpdate(int $id): ?array
    {
        return $this->queryOne(
            "SELECT id, total, total_pagado, saldo_pendiente, estado_pago, estado_pedido
             FROM ventas WHERE id = :id FOR UPDATE",
            [':id' => $id]
        );
    }

    public function recalcularEstadoPago(int $id): void
    {
        $this->execute(
            "UPDATE ventas
             SET estado_pago = CASE
                 WHEN total_pagado >= total THEN 'pagado'
                 WHEN total_pagado > 0 THEN 'abono'
                 ELSE 'pendiente'
             END
             WHERE id = :id",
            [':id' => $id]
        );
    }
}
