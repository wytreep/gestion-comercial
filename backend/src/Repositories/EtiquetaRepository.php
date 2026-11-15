<?php

declare(strict_types=1);

namespace App\Repositories;

final class EtiquetaRepository extends BaseRepository
{
    private const SELECT_BASE =
        "SELECT e.*,
                p.nombre AS producto,
                p.unidad_medida,
                p.precio_venta,
                CONCAT('GCOM-P-', LPAD(p.id, 4, '0')) AS codigo_producto,
                u.nombre AS usuario
         FROM etiquetas e
         JOIN productos p ON p.id = e.producto_id
         LEFT JOIN usuarios u ON u.id = e.usuario_id";

    public function crear(array $data): int
    {
        return $this->insert(
            'INSERT INTO etiquetas
               (codigo, tipo, producto_id, peso_kg, lote, fecha_empaque, usuario_id)
             VALUES
               (:codigo, :tipo, :producto_id, :peso_kg, :lote, :fecha_empaque, :usuario_id)',
            [
                ':codigo'        => $data['codigo'],
                ':tipo'          => $data['tipo'],
                ':producto_id'   => $data['producto_id'],
                ':peso_kg'       => $data['peso_kg'] ?? null,
                ':lote'          => $data['lote'] ?? null,
                ':fecha_empaque' => $data['fecha_empaque'],
                ':usuario_id'    => $data['usuario_id'] ?? null,
            ]
        );
    }

    public function findById(int $id): ?array
    {
        return $this->queryOne(self::SELECT_BASE . ' WHERE e.id = :id', [':id' => $id]);
    }

    public function findByCodigo(string $codigo): ?array
    {
        return $this->queryOne(
            self::SELECT_BASE . ' WHERE e.codigo = :codigo',
            [':codigo' => strtoupper(trim($codigo))]
        );
    }

    public function existeCodigo(string $codigo): bool
    {
        $row = $this->queryOne(
            'SELECT 1 AS existe FROM etiquetas WHERE codigo = :codigo',
            [':codigo' => $codigo]
        );
        return $row !== null;
    }

    public function listar(array $filtros = [], int $limit = 100): array
    {
        $limit = max(1, min(500, $limit));
        $where = [];
        $params = [];

        if (!empty($filtros['producto_id'])) {
            $where[] = 'e.producto_id = :producto_id';
            $params[':producto_id'] = (int) $filtros['producto_id'];
        }

        if (!empty($filtros['tipo'])) {
            $where[] = 'e.tipo = :tipo';
            $params[':tipo'] = (string) $filtros['tipo'];
        }

        if (!empty($filtros['estado'])) {
            $where[] = 'e.estado = :estado';
            $params[':estado'] = (string) $filtros['estado'];
        }

        if (!empty($filtros['lote'])) {
            $where[] = 'e.lote = :lote';
            $params[':lote'] = (string) $filtros['lote'];
        }

        if (!empty($filtros['q'])) {
            $where[] = '(e.codigo LIKE :q1 OR p.nombre LIKE :q2 OR e.lote LIKE :q3)';
            $params[':q1'] = '%' . trim((string) $filtros['q']) . '%';
            $params[':q2'] = $params[':q1'];
            $params[':q3'] = $params[':q1'];
        }

        $sql = self::SELECT_BASE;
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= " ORDER BY e.created_at DESC, e.id DESC LIMIT {$limit}";

        return $this->query($sql, $params);
    }

    public function anular(int $id): void
    {
        $this->execute(
            "UPDATE etiquetas SET estado = 'anulada' WHERE id = :id AND estado = 'activa'",
            [':id' => $id]
        );
    }
}
