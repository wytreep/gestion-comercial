<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Repositories\CompraRepository;
use App\Repositories\ProductoRepository;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Exceptions\BusinessException;

final class CompraService
{
    public function __construct(
        private readonly CompraRepository   $compraRepo,
        private readonly ProductoRepository $productoRepo,
        private readonly StockService       $stockService,
        private readonly Database           $db,
    ) {}

    public function listar(): array
    {
        return $this->compraRepo->findAll();
    }

    public function detalle(int $id): array
    {
        $compra = $this->compraRepo->findById($id);
        if ($compra === null) throw new NotFoundException('Compra');
        return $compra;
    }

    public function crear(array $data): int
    {
        $items = $data['items'] ?? [];
        if (empty($items)) {
            throw new ValidationException(['items' => 'Se requiere al menos un producto.']);
        }
        if (empty($data['fecha_compra'])) {
            throw new ValidationException(['fecha_compra' => 'La fecha de compra es requerida.']);
        }

        $usuarioId = isset($data['usuario_id']) ? (int) $data['usuario_id'] : null;

        return $this->db->transaction(function () use ($data, $items, $usuarioId) {
            $compraId = $this->compraRepo->create($data);

            foreach ($items as $item) {
                $cantidad = (float) ($item['cantidad'] ?? 0);
                $precio   = (float) ($item['precio_unitario'] ?? 0);
                $prodId   = (int)   ($item['producto_id'] ?? 0);
                $kilos    = isset($item['kilos_estimados']) && $item['kilos_estimados'] !== ''
                    ? (float) $item['kilos_estimados']
                    : null;

                if ($cantidad <= 0 || $precio <= 0 || $prodId <= 0) {
                    throw new ValidationException(['items' => 'Datos de item inválidos.']);
                }

                $producto = $this->productoRepo->findRaw($prodId);
                if (!$producto || (int) $producto['activo'] !== 1) throw new NotFoundException('Producto');

                $this->compraRepo->insertItem($compraId, $prodId, $cantidad, $precio, $kilos);

                // Stock: pescado usa kilos estimados; los demás usan cantidad.
                $delta = $producto['unidad_medida'] === 'canasta'
                    ? ($kilos !== null && $kilos > 0
                        ? $kilos
                        : $this->stockService->cantidadEnStock($producto, $cantidad))
                    : $cantidad;

                $this->stockService->registrar(
                    $prodId, $delta, 'compra',
                    "Compra #{$compraId}", $compraId, $usuarioId
                );
            }

            foreach ($data['gastos'] ?? [] as $g) {
                $this->compraRepo->insertGasto($compraId, $g);
            }

            return $compraId;
        });
    }

    public function editar(int $id, array $data): void
    {
        $compra = $this->compraRepo->findById($id);
        if ($compra === null) throw new NotFoundException('Compra');

        $usuarioId = isset($data['usuario_id']) ? (int) $data['usuario_id'] : null;

        $this->db->transaction(function () use ($id, $data, $compra, $usuarioId) {
            $this->compraRepo->update($id, $data);

            // Sin items solo se actualizan metadatos: no tocar el stock.
            if (!empty($data['items'])) {
                // Revertir stock de items anteriores
                foreach ($compra['items'] as $item) {
                    $producto = $this->productoRepo->findRaw((int) $item['producto_id']);
                    if (!$producto) continue;

                    $kilos = isset($item['kilos_estimados']) && $item['kilos_estimados'] !== null
                        ? (float) $item['kilos_estimados']
                        : null;

                    $delta = $producto['unidad_medida'] === 'canasta'
                        ? -($kilos !== null && $kilos > 0
                            ? $kilos
                            : $this->stockService->cantidadEnStock($producto, (float) $item['cantidad']))
                        : -(float) $item['cantidad'];

                    $this->stockService->registrar(
                        (int) $item['producto_id'], $delta, 'ajuste_manual',
                        "Reversión edición compra #{$id}", $id, $usuarioId
                    );
                }

                $this->compraRepo->deleteItems($id);
                $this->compraRepo->deleteGastos($id);

                foreach ($data['items'] as $item) {
                    $cantidad = (float) ($item['cantidad'] ?? 0);
                    $precio   = (float) ($item['precio_unitario'] ?? 0);
                    $prodId   = (int)   ($item['producto_id'] ?? 0);
                    $kilos    = isset($item['kilos_estimados']) && $item['kilos_estimados'] !== ''
                        ? (float) $item['kilos_estimados']
                        : null;

                    if ($cantidad <= 0 || $precio <= 0 || $prodId <= 0) {
                        throw new ValidationException(['items' => 'Datos de item inválidos.']);
                    }

                    $producto = $this->productoRepo->findRaw($prodId);
                    if (!$producto) throw new NotFoundException('Producto');

                    $this->compraRepo->insertItem($id, $prodId, $cantidad, $precio, $kilos);

                    $delta = $producto['unidad_medida'] === 'canasta'
                        ? ($kilos !== null && $kilos > 0
                            ? $kilos
                            : $this->stockService->cantidadEnStock($producto, $cantidad))
                        : $cantidad;

                    $this->stockService->registrar(
                        $prodId, $delta, 'compra',
                        "Edición compra #{$id}", $id, $usuarioId
                    );
                }

                foreach ($data['gastos'] ?? [] as $g) {
                    $this->compraRepo->insertGasto($id, $g);
                }
            }
        });
    }

    public function cambiarEstado(int $id, string $estado): void
    {
        $estados = ['pendiente', 'parcial', 'recibida'];
        if (!in_array($estado, $estados, true)) {
            throw new BusinessException("Estado '{$estado}' no válido.");
        }
        $this->compraRepo->updateEstado($id, $estado);
    }
}
