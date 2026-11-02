<?php

declare(strict_types=1);

namespace App\Repositories;

final class CompraRepository extends BaseRepository
{
    public function findAll(): array
    {
        return $this->query(
            "SELECT c.*, COALESCE(p.nombre,'—') AS proveedor
             FROM compras c LEFT JOIN proveedores p ON p.id = c.proveedor_id
             ORDER BY c.id DESC LIMIT 100"
        );
    }

    public function findById(int $id): ?array
    {
        $compra = $this->queryOne(
            "SELECT c.*, COALESCE(p.nombre,'—') AS proveedor
             FROM compras c LEFT JOIN proveedores p ON p.id = c.proveedor_id
             WHERE c.id = :id",
            [':id' => $id]
        );
        if (!$compra) return null;

        $compra['items'] = $this->query(
            "SELECT dc.*, pr.nombre AS producto, pr.unidad_medida
             FROM detalle_compra dc JOIN productos pr ON pr.id = dc.producto_id
             WHERE dc.compra_id = :id",
            [':id' => $id]
        );
        $compra['gastos'] = $this->query(
            "SELECT gc.*, tg.nombre AS tipo, tg.categoria
             FROM gastos_compra gc JOIN tipos_gasto tg ON tg.id = gc.tipo_gasto_id
             WHERE gc.compra_id = :id",
            [':id' => $id]
        );
        return $compra;
    }

    public function create(array $data): int
    {
        return $this->insert(
            "INSERT INTO compras (proveedor_id,fecha_compra,fecha_llegada,observaciones,estado)
             VALUES (:prov,:fc,:fl,:obs,:est)",
            [
                ':prov' => $data['proveedor_id']  ?? null,
                ':fc'   => $data['fecha_compra'],
                ':fl'   => $data['fecha_llegada'] ?? null,
                ':obs'  => $data['observaciones'] ?? null,
                ':est'  => $data['estado']         ?? 'pendiente',
            ]
        );
    }

    public function update(int $id, array $data): void
    {
        $sets = []; $params = [':id' => $id];
        foreach (['proveedor_id','fecha_compra','fecha_llegada','observaciones','estado'] as $f) {
            if (array_key_exists($f, $data)) {
                $sets[] = "{$f} = :{$f}"; $params[":{$f}"] = $data[$f];
            }
        }
        if ($sets) $this->execute("UPDATE compras SET " . implode(',', $sets) . " WHERE id=:id", $params);
    }

    public function updateEstado(int $id, string $estado): void
    {
        $this->execute('UPDATE compras SET estado=:est WHERE id=:id', [':est'=>$estado,':id'=>$id]);
    }

    public function insertItem(int $compraId, int $prodId, float $cant, float $precio, ?float $kilos): void
    {
        $this->insert(
            'INSERT INTO detalle_compra (compra_id,producto_id,cantidad,precio_unitario,kilos_estimados)
             VALUES(:cid,:pid,:c,:p,:k)',
            [':cid'=>$compraId,':pid'=>$prodId,':c'=>$cant,':p'=>$precio,':k'=>$kilos]
        );
    }

    public function deleteItems(int $id): void
    {
        $this->execute('DELETE FROM detalle_compra WHERE compra_id=:id', [':id'=>$id]);
    }

    public function insertGasto(int $compraId, array $g): void
    {
        $this->insert(
            'INSERT INTO gastos_compra (compra_id,tipo_gasto_id,monto,descripcion,fecha)
             VALUES(:cid,:tg,:m,:d,:f)',
            [
                ':cid' => $compraId,
                ':tg'  => $g['tipo_gasto_id'],
                ':m'   => $g['monto'],
                ':d'   => $g['descripcion'] ?? null,
                ':f'   => $g['fecha'] ?? date('Y-m-d'),
            ]
        );
    }

    public function deleteGastos(int $id): void
    {
        $this->execute('DELETE FROM gastos_compra WHERE compra_id=:id', [':id'=>$id]);
    }
}
