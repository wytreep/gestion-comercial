<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Exceptions\NotFoundException;

final class ProductoRepository extends BaseRepository
{
    public function findAll(): array
    {
        return $this->query(
            "SELECT p.*, c.nombre AS categoria,
                    CASE
                      WHEN p.unidad_medida='canasta' AND p.kilos_por_canasta>0
                        THEN ROUND(p.precio_compra/p.kilos_por_canasta,2)
                      ELSE p.precio_compra
                    END AS costo_por_kg,
                    CASE
                      WHEN p.unidad_medida='canasta' AND p.kilos_por_canasta>0
                        THEN ROUND((p.precio_venta - p.precio_compra/p.kilos_por_canasta)/p.precio_venta*100,1)
                      WHEN p.precio_venta>0
                        THEN ROUND((p.precio_venta - p.precio_compra)/p.precio_venta*100,1)
                      ELSE NULL
                    END AS margen_porcentaje
             FROM productos p JOIN categorias c ON c.id = p.categoria_id
             WHERE p.activo = 1 ORDER BY c.id, p.nombre"
        );
    }

    public function findRaw(int $id): ?array
    {
        return $this->queryOne(
            'SELECT * FROM productos WHERE id = :id', [':id' => $id]
        );
    }

    public function findById(int $id): ?array
    {
        $p = $this->queryOne(
            "SELECT p.*, c.nombre AS categoria,
                    CASE
                      WHEN p.unidad_medida='canasta' AND p.kilos_por_canasta>0
                        THEN ROUND((p.precio_venta - p.precio_compra/p.kilos_por_canasta)/p.precio_venta*100,1)
                      WHEN p.precio_venta>0
                        THEN ROUND((p.precio_venta - p.precio_compra)/p.precio_venta*100,1)
                      ELSE NULL
                    END AS margen_porcentaje
             FROM productos p JOIN categorias c ON c.id = p.categoria_id
             WHERE p.id = :id",
            [':id' => $id]
        );
        return $p ?: null;
    }

    public function updatePrecio(int $id, float $pc, float $pv, ?float $kpc): void
    {
        if ($kpc !== null) {
            $this->execute(
                'UPDATE productos SET precio_compra=:pc,precio_venta=:pv,kilos_por_canasta=:kpc WHERE id=:id',
                [':pc'=>$pc,':pv'=>$pv,':kpc'=>$kpc,':id'=>$id]
            );
        } else {
            $this->execute(
                'UPDATE productos SET precio_compra=:pc,precio_venta=:pv WHERE id=:id',
                [':pc'=>$pc,':pv'=>$pv,':id'=>$id]
            );
        }
    }

    public function insertHistorialPrecio(int $id, float $pc, float $pv, ?string $motivo): void
    {
        $this->insert(
            'INSERT INTO historial_precios (producto_id,precio_compra,precio_venta,motivo) VALUES(:id,:pc,:pv,:m)',
            [':id'=>$id,':pc'=>$pc,':pv'=>$pv,':m'=>$motivo]
        );
    }

    public function historialPrecios(int $id): array
    {
        return $this->query(
            'SELECT * FROM historial_precios WHERE producto_id=:id ORDER BY fecha DESC LIMIT 20',
            [':id' => $id]
        );
    }

    public function ajustarStock(int $id, float $cantidad): void
    {
        $this->execute(
            'UPDATE productos SET stock_actual = stock_actual + :delta WHERE id = :id',
            [':delta' => $cantidad, ':id' => $id]
        );
    }
}
