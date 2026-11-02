<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Repositories\VentaRepository;
use App\Repositories\ProductoRepository;
use App\Repositories\ClienteRepository;
use App\Exceptions\BusinessException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;

final class VentaService
{
    public function __construct(
        private readonly VentaRepository    $ventaRepo,
        private readonly ProductoRepository $productoRepo,
        private readonly ClienteRepository  $clienteRepo,
        private readonly StockService       $stockService,
        private readonly Database           $db,
    ) {}

    public function listar(array $filtros = []): array
    {
        return $this->ventaRepo->findAll($filtros);
    }

    public function detalle(int $id): array
    {
        $venta = $this->ventaRepo->findById($id);
        if ($venta === null) throw new NotFoundException('Venta');
        return $venta;
    }

    public function crear(array $data): int
    {
        $items = $data['items'] ?? [];
        if (empty($items)) {
            throw new ValidationException(['items' => 'Se requiere al menos un producto.']);
        }

        $usuarioId = isset($data['usuario_id']) ? (int) $data['usuario_id'] : null;

        return $this->db->transaction(function () use ($data, $items, $usuarioId) {
            // Cliente registrado o nombre libre ("cliente_nombre").
            $clienteId = $this->resolverClienteId($data);

            $total = 0.0;
            foreach ($items as $item) {
                $cantidad = (float) ($item['cantidad'] ?? 0);
                $precio   = (float) ($item['precio_unitario'] ?? 0);
                $prodId   = (int)   ($item['producto_id'] ?? 0);

                if ($cantidad <= 0 || $precio <= 0 || $prodId <= 0) {
                    throw new ValidationException(['items' => 'Cantidad y precio deben ser mayores a cero.']);
                }

                $producto = $this->productoRepo->findRaw($prodId);
                if ($producto === null || (int) $producto['activo'] !== 1) {
                    throw new NotFoundException('Producto');
                }

                $total += $cantidad * $precio;
            }

            $pagoInicial = (float) ($data['pago_inicial']['monto'] ?? 0);
            if ($pagoInicial > $total + 0.01) {
                throw new BusinessException('El pago inicial no puede superar el total de la venta.');
            }

            // 1. Crear la venta
            $ventaId = $this->ventaRepo->create([
                'cliente_id'    => $clienteId,
                'fecha_venta'   => $data['fecha_venta']   ?? date('Y-m-d H:i:s'),
                'fecha_entrega' => $data['fecha_entrega'] ?? null,
                'observaciones' => $data['observaciones'] ?? null,
                'estado_pedido' => $data['estado_pedido'] ?? 'nuevo',
            ]);

            // 2. Insertar items y descontar stock
            foreach ($items as $item) {
                $cantidad = (float) ($item['cantidad'] ?? 0);
                $precio   = (float) ($item['precio_unitario'] ?? 0);
                $prodId   = (int)   ($item['producto_id'] ?? 0);

                $producto = $this->productoRepo->findRaw($prodId);
                if ($producto === null) throw new NotFoundException('Producto');

                $this->ventaRepo->insertItem($ventaId, $prodId, $cantidad, $precio);

                $delta = -$this->stockService->cantidadEnStock($producto, $cantidad);

                $this->stockService->registrar(
                    $prodId, $delta, 'venta',
                    "Venta #{$ventaId}", $ventaId, $usuarioId
                );
            }

            // 3. Gastos de reparto
            foreach ($data['gastos_reparto'] ?? [] as $g) {
                $this->ventaRepo->insertGastoReparto($ventaId, $g);
            }

            // 4. Pago inicial
            if ($pagoInicial > 0) {
                $this->ventaRepo->insertPago($ventaId, $data['pago_inicial']);
            }

            return $ventaId;
        });
    }

    public function editar(int $id, array $data): void
    {
        $venta = $this->ventaRepo->findById($id);
        if ($venta === null) throw new NotFoundException('Venta');

        $usuarioId = isset($data['usuario_id']) ? (int) $data['usuario_id'] : null;

        $this->db->transaction(function () use ($id, $data, $venta, $usuarioId) {
            // Permite cambiar a un cliente libre por nombre y normaliza
            // "Sin cliente" ('' o null) para que MySQL no reciba un entero vacío.
            $datos     = $data;
            $clienteId = $this->resolverClienteId($data);
            if ($clienteId !== null) {
                $datos['cliente_id'] = $clienteId;
            } elseif (array_key_exists('cliente_id', $datos)) {
                $datos['cliente_id'] = null;
            }

            $nuevoTotal = null;

            if (!empty($data['items'])) {
                $nuevoTotal = 0.0;
                foreach ($data['items'] as $item) {
                    $cantidad = (float) ($item['cantidad'] ?? 0);
                    $precio   = (float) ($item['precio_unitario'] ?? 0);
                    $prodId   = (int)   ($item['producto_id'] ?? 0);

                    if ($cantidad <= 0 || $precio <= 0 || $prodId <= 0) {
                        throw new ValidationException(['items' => 'Datos de item inválidos.']);
                    }

                    $nuevoTotal += $cantidad * $precio;
                }

                if ($nuevoTotal + 0.01 < (float) $venta['total_pagado']) {
                    throw new BusinessException(
                        'El nuevo total no puede ser menor que el valor ya pagado de la venta.'
                    );
                }
            }

            // Actualizar campos de la venta
            $this->ventaRepo->update($id, $datos);

            // Si vienen nuevos items, reemplazar y ajustar stock.
            // Sin items solo se actualizan metadatos: no tocar el stock.
            if ($nuevoTotal !== null) {
                // Revertir stock de los items anteriores
                foreach ($venta['items'] as $item) {
                    $producto = $this->productoRepo->findRaw((int) $item['producto_id']);
                    if (!$producto) continue;

                    $delta = $this->stockService->cantidadEnStock($producto, (float) $item['cantidad']);

                    $this->stockService->registrar(
                        (int) $item['producto_id'], $delta, 'ajuste_manual',
                        "Reversión edición venta #{$id}", $id, $usuarioId
                    );
                }

                $this->ventaRepo->deleteItems($id);

                foreach ($data['items'] as $item) {
                    $cantidad = (float) ($item['cantidad'] ?? 0);
                    $precio   = (float) ($item['precio_unitario'] ?? 0);
                    $prodId   = (int)   ($item['producto_id'] ?? 0);

                    $producto = $this->productoRepo->findRaw($prodId);
                    if (!$producto) continue;

                    $this->ventaRepo->insertItem($id, $prodId, $cantidad, $precio);

                    $delta = -$this->stockService->cantidadEnStock($producto, $cantidad);

                    $this->stockService->registrar(
                        $prodId, $delta, 'venta',
                        "Edición venta #{$id}", $id, $usuarioId
                    );
                }
            }

            // Mantiene estado_pago coherente si cambió el total.
            $this->ventaRepo->recalcularEstadoPago($id);
        });
    }

    public function eliminar(int $id, ?int $usuarioId = null): array
    {
        $venta = $this->ventaRepo->findById($id);
        if ($venta === null) throw new NotFoundException('Venta');

        if ($venta['estado_pedido'] === 'cancelado') {
            throw new BusinessException('La venta ya está cancelada.');
        }

        $tienePagos = (float) ($venta['total_pagado'] ?? 0) > 0;

        $this->db->transaction(function () use ($id, $venta, $tienePagos, $usuarioId) {
            // Siempre devolver el stock, tenga pagos o no
            foreach ($venta['items'] as $item) {
                $producto = $this->productoRepo->findRaw((int) $item['producto_id']);
                if (!$producto) continue;

                $delta = $this->stockService->cantidadEnStock($producto, (float) $item['cantidad']);

                $this->stockService->registrar(
                    (int) $item['producto_id'], $delta, 'devolucion',
                    $tienePagos ? "Cancelación venta #{$id}" : "Eliminación venta #{$id}",
                    $id, $usuarioId
                );
            }

            if ($tienePagos) {
                $this->ventaRepo->cancelar($id);
            } else {
                // gastos_reparto no tiene ON DELETE CASCADE
                $this->ventaRepo->deleteGastosReparto($id);
                $this->ventaRepo->delete($id);
            }
        });

        return ['accion' => $tienePagos ? 'cancelada' : 'eliminada'];
    }

    public function registrarPago(int $ventaId, array $data): int
    {
        $monto = (float) ($data['monto'] ?? 0);
        if ($monto <= 0) {
            throw new BusinessException('El monto debe ser mayor a cero.');
        }

        return $this->db->transaction(function () use ($ventaId, $data, $monto) {
            $venta = $this->ventaRepo->findSaldoForUpdate($ventaId);
            if ($venta === null) throw new NotFoundException('Venta');

            if ($venta['estado_pedido'] === 'cancelado') {
                throw new BusinessException('No se puede registrar un pago en una venta cancelada.');
            }

            $saldo = (float) $venta['saldo_pendiente'];
            if ($monto > $saldo + 0.01) {
                throw new BusinessException(
                    "El monto ($" . number_format($monto, 0, ',', '.') . ") " .
                    "excede el saldo pendiente ($" . number_format($saldo, 0, ',', '.') . ")."
                );
            }

            return $this->ventaRepo->insertPago($ventaId, $data);
        });
    }

    /**
     * Devuelve el cliente_id de la venta.
     * Si no viene un id válido pero sí un nombre (cliente no registrado),
     * lo reutiliza o lo crea para que la venta no quede "sin cliente".
     */
    private function resolverClienteId(array $data): ?int
    {
        $clienteId = $data['cliente_id'] ?? null;
        if ($clienteId !== null && $clienteId !== '') {
            return (int) $clienteId;
        }

        $nombre = trim((string) ($data['cliente_nombre'] ?? ''));
        if ($nombre === '') {
            return null;
        }

        return $this->clienteRepo->obtenerOCrearPorNombre($nombre);
    }
}
