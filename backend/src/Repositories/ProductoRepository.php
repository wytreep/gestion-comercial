<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Exceptions\NotFoundException;

final class ProductoRepository extends BaseRepository
{
    public function findAll(bool $incluirInactivos = false): array
    {
        $where = $incluirInactivos ? '' : 'WHERE p.activo = 1';

        return $this->query(
            "SELECT p.*, c.nombre AS categoria,
                    CONCAT('GCOM-P-', LPAD(p.id, 4, '0')) AS codigo,
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
             {$where}
             ORDER BY c.id, p.nombre"
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
                    CONCAT('GCOM-P-', LPAD(p.id, 4, '0')) AS codigo,
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

    /**
     * Código interno visible en la etiqueta QR: GCOM-P-0001.
     * Se deriva del ID para no duplicar el dato ni exigir una columna extra.
     */
    public function findByCodigo(string $codigo): ?array
    {
        $codigo = strtoupper(trim($codigo));
        if (!preg_match('/^(?:GCOM-P-)?0*(\d+)$/', $codigo, $m)) {
            return null;
        }

        $id = (int) $m[1];
        return $id > 0 ? $this->findById($id) : null;
    }

    /**
     * Crea el producto con stock en cero. El stock inicial, si existe, se
     * registra como movimiento para conservar la trazabilidad.
     */
    public function crear(array $data): int
    {
        return $this->insert(
            'INSERT INTO productos
                (categoria_id, nombre, unidad_medida, precio_compra, precio_venta,
                 kilos_por_canasta, stock_actual, activo)
             VALUES
                (:categoria_id, :nombre, :unidad_medida, :precio_compra, :precio_venta,
                 :kilos_por_canasta, 0, 1)',
            [
                ':categoria_id'      => $data['categoria_id'],
                ':nombre'            => $data['nombre'],
                ':unidad_medida'     => $data['unidad_medida'],
                ':precio_compra'     => $data['precio_compra'],
                ':precio_venta'      => $data['precio_venta'],
                ':kilos_por_canasta' => $data['kilos_por_canasta'],
            ]
        );
    }

    public function actualizar(int $id, array $data): void
    {
        $this->execute(
            'UPDATE productos SET
                categoria_id      = :categoria_id,
                nombre            = :nombre,
                unidad_medida     = :unidad_medida,
                precio_compra     = :precio_compra,
                precio_venta      = :precio_venta,
                kilos_por_canasta = :kilos_por_canasta
             WHERE id = :id',
            [
                ':categoria_id'      => $data['categoria_id'],
                ':nombre'            => $data['nombre'],
                ':unidad_medida'     => $data['unidad_medida'],
                ':precio_compra'     => $data['precio_compra'],
                ':precio_venta'      => $data['precio_venta'],
                ':kilos_por_canasta' => $data['kilos_por_canasta'],
                ':id'                => $id,
            ]
        );
    }

    public function cambiarActivo(int $id, bool $activo): void
    {
        $this->execute(
            'UPDATE productos SET activo = :activo WHERE id = :id',
            [':activo' => $activo ? 1 : 0, ':id' => $id]
        );
    }

    public function existeNombre(string $nombre, ?int $excluirId = null): bool
    {
        $sql = 'SELECT 1 FROM productos WHERE LOWER(TRIM(nombre)) = LOWER(:nombre)';
        $params = [':nombre' => trim($nombre)];

        if ($excluirId !== null) {
            $sql .= ' AND id <> :id';
            $params[':id'] = $excluirId;
        }

        return $this->queryOne($sql . ' LIMIT 1', $params) !== null;
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
