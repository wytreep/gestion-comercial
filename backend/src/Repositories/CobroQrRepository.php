<?php

declare(strict_types=1);

namespace App\Repositories;

final class CobroQrRepository extends BaseRepository
{
    public function crear(array $data): int
    {
        return $this->insert(
            'INSERT INTO cobros_qr (venta_id, codigo, monto, expira_at, usuario_id)
             VALUES (:venta_id, :codigo, :monto, :expira_at, :usuario_id)',
            [
                ':venta_id'   => $data['venta_id'],
                ':codigo'     => $data['codigo'],
                ':monto'      => $data['monto'],
                ':expira_at'  => $data['expira_at'],
                ':usuario_id' => $data['usuario_id'] ?? null,
            ]
        );
    }

    public function findById(int $id): ?array
    {
        return $this->queryOne('SELECT * FROM cobros_qr WHERE id = :id', [':id' => $id]);
    }

    public function findByCodigo(string $codigo): ?array
    {
        return $this->queryOne('SELECT * FROM cobros_qr WHERE codigo = :codigo', [':codigo' => $codigo]);
    }

    /** Bloquea el cobro para confirmar o anular sin carreras entre usuarios. */
    public function findForUpdate(string $codigo): ?array
    {
        return $this->queryOne(
            'SELECT * FROM cobros_qr WHERE codigo = :codigo FOR UPDATE',
            [':codigo' => $codigo]
        );
    }

    public function listarPorVenta(int $ventaId): array
    {
        return $this->query(
            'SELECT * FROM cobros_qr WHERE venta_id = :venta_id ORDER BY id DESC',
            [':venta_id' => $ventaId]
        );
    }

    public function anularPendientes(int $ventaId): void
    {
        $this->execute(
            "UPDATE cobros_qr SET estado = 'anulado'
             WHERE venta_id = :venta_id AND estado = 'pendiente'",
            [':venta_id' => $ventaId]
        );
    }

    public function marcarPagado(int $id, int $pagoId, string $referencia): void
    {
        $this->execute(
            "UPDATE cobros_qr
             SET estado = 'pagado', pagado_at = :pagado_at, pago_id = :pago_id, referencia = :referencia
             WHERE id = :id",
            [
                ':pagado_at'  => date('Y-m-d H:i:s'),
                ':pago_id'    => $pagoId,
                ':referencia' => $referencia,
                ':id'         => $id,
            ]
        );
    }

    public function marcarExpirados(string $ahora, ?int $ventaId = null): void
    {
        $sql    = "UPDATE cobros_qr SET estado = 'expirado'
                   WHERE estado = 'pendiente' AND expira_at <= :ahora";
        $params = [':ahora' => $ahora];

        if ($ventaId !== null) {
            $sql .= ' AND venta_id = :venta_id';
            $params[':venta_id'] = $ventaId;
        }

        $this->execute($sql, $params);
    }

    public function marcarExpirado(int $id): void
    {
        $this->execute(
            "UPDATE cobros_qr SET estado = 'expirado' WHERE id = :id AND estado = 'pendiente'",
            [':id' => $id]
        );
    }

    public function anular(int $id): void
    {
        $this->execute(
            "UPDATE cobros_qr SET estado = 'anulado' WHERE id = :id",
            [':id' => $id]
        );
    }
}
