<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Exceptions\BusinessException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Repositories\ProductoRepository;

/**
 * Reglas de negocio del catálogo de productos.
 *
 * El controlador solo traduce HTTP a llamadas de servicio. Toda validación y
 * decisión (categorías, precios, stock inicial, activación) vive aquí.
 */
final class ProductoService extends BaseService
{
    /** Unidades de medida admitidas por la tabla productos. */
    public const UNIDADES = ['kilo', 'canasta', 'unidad'];

    public function __construct(
        private readonly ProductoRepository $repo,
        private readonly CategoriaService   $categoriaSvc,
        private readonly StockService       $stockSvc,
        private readonly Database           $db,
    ) {}

    public function listar(bool $incluirInactivos = false): array
    {
        return $this->repo->findAll($incluirInactivos);
    }

    public function detalle(int $id): array
    {
        $producto = $this->repo->findById($id);

        if ($producto === null) {
            throw new NotFoundException('Producto');
        }

        return $producto;
    }

    /**
     * Resuelve un código GCOM-P-0001. Devuelve null si no corresponde a un
     * producto para que el controlador responda 404.
     */
    public function porCodigo(string $codigo): ?array
    {
        return $this->repo->findByCodigo($codigo);
    }

    /**
     * Crea un producto. El stock inicial se registra como movimiento de
     * ajuste para que el historial de inventario quede completo.
     */
    public function crear(array $data, ?int $usuarioId = null): array
    {
        $nombre = $this->texto($data, 'nombre', 'El nombre del producto', 100);

        if ($this->repo->existeNombre($nombre)) {
            throw new ValidationException([
                'nombre' => 'Ya existe un producto con ese nombre.',
            ]);
        }

        $categoriaId = $this->categoriaSvc->resolver($data);
        $unidad      = $this->enLista(
            (string) ($data['unidad_medida'] ?? 'kilo'),
            self::UNIDADES,
            'unidad_medida',
            'La unidad de medida'
        );

        $precioCompra = $this->positivo($data, 'precio_compra', 'El precio de compra');
        $precioVenta  = $this->positivo($data, 'precio_venta', 'El precio de venta');
        $kilos        = $this->kilosPorCanasta($data, $unidad);
        $stockInicial = $this->noNegativo($data, 'stock_inicial', 'El stock inicial');

        return $this->db->transaction(function () use (
            $categoriaId, $nombre, $unidad, $precioCompra, $precioVenta, $kilos, $stockInicial, $usuarioId
        ): array {
            $id = $this->repo->crear([
                'categoria_id'      => $categoriaId,
                'nombre'            => $nombre,
                'unidad_medida'     => $unidad,
                'precio_compra'     => $precioCompra,
                'precio_venta'      => $precioVenta,
                'kilos_por_canasta' => $kilos,
            ]);

            if ($stockInicial > 0) {
                $this->stockSvc->registrar(
                    $id,
                    $stockInicial,
                    'ajuste_manual',
                    'Stock inicial',
                    null,
                    $usuarioId
                );
            }

            return $this->detalle($id);
        });
    }

    /**
     * Actualiza los datos del producto. Si cambian los precios, se guarda una
     * fila en historial_precios igual que en la edición rápida de precios.
     */
    public function actualizar(int $id, array $data): array
    {
        $actual = $this->repo->findRaw($id);

        if ($actual === null) {
            throw new NotFoundException('Producto');
        }

        $nombre = $this->texto($data, 'nombre', 'El nombre del producto', 100);

        if ($this->repo->existeNombre($nombre, $id)) {
            throw new ValidationException([
                'nombre' => 'Ya existe otro producto con ese nombre.',
            ]);
        }

        $categoriaId  = $this->categoriaSvc->resolver($data);
        $unidad       = $this->enLista(
            (string) ($data['unidad_medida'] ?? 'kilo'),
            self::UNIDADES,
            'unidad_medida',
            'La unidad de medida'
        );
        $precioCompra = $this->positivo($data, 'precio_compra', 'El precio de compra');
        $precioVenta  = $this->positivo($data, 'precio_venta', 'El precio de venta');
        $kilos        = $this->kilosPorCanasta($data, $unidad);
        $motivo       = $this->textoOpcional($data, 'motivo', 200);

        $cambioPrecio = round((float) $actual['precio_compra'], 2) !== $precioCompra
            || round((float) $actual['precio_venta'], 2) !== $precioVenta;

        return $this->db->transaction(function () use (
            $id, $categoriaId, $nombre, $unidad, $precioCompra, $precioVenta, $kilos, $cambioPrecio, $motivo
        ): array {
            if ($cambioPrecio) {
                $this->repo->insertHistorialPrecio(
                    $id,
                    $precioCompra,
                    $precioVenta,
                    $motivo ?? 'Edición de producto'
                );
            }

            $this->repo->actualizar($id, [
                'categoria_id'      => $categoriaId,
                'nombre'            => $nombre,
                'unidad_medida'     => $unidad,
                'precio_compra'     => $precioCompra,
                'precio_venta'      => $precioVenta,
                'kilos_por_canasta' => $kilos,
            ]);

            return $this->detalle($id);
        });
    }

    /**
     * Actualiza únicamente precios (edición rápida).
     */
    public function actualizarPrecio(int $id, array $data): array
    {
        if ($this->repo->findRaw($id) === null) {
            throw new NotFoundException('Producto');
        }

        $precioCompra = $this->positivo($data, 'precio_compra', 'El precio de compra');
        $precioVenta  = $this->positivo($data, 'precio_venta', 'El precio de venta');
        $kilos        = (isset($data['kilos_por_canasta']) && $data['kilos_por_canasta'] !== '' && $data['kilos_por_canasta'] !== null)
            ? $this->positivo($data, 'kilos_por_canasta', 'Los kilos por canasta', 3)
            : null;
        $motivo       = $this->textoOpcional($data, 'motivo', 200);

        $this->repo->insertHistorialPrecio($id, $precioCompra, $precioVenta, $motivo);
        $this->repo->updatePrecio($id, $precioCompra, $precioVenta, $kilos);

        return $this->detalle($id);
    }

    public function historial(int $id): array
    {
        return $this->repo->historialPrecios($id);
    }

    /**
     * Desactiva el producto sin borrar su historial de ventas ni movimientos.
     */
    public function desactivar(int $id): array
    {
        $producto = $this->repo->findRaw($id);

        if ($producto === null) {
            throw new NotFoundException('Producto');
        }

        if ((int) $producto['activo'] === 0) {
            throw new BusinessException('El producto ya está inactivo.');
        }

        $this->repo->cambiarActivo($id, false);

        return $this->detalle($id);
    }

    public function reactivar(int $id): array
    {
        $producto = $this->repo->findRaw($id);

        if ($producto === null) {
            throw new NotFoundException('Producto');
        }

        if ((int) $producto['activo'] === 1) {
            throw new BusinessException('El producto ya está activo.');
        }

        $this->repo->cambiarActivo($id, true);

        return $this->detalle($id);
    }

    /**
     * En canasta los kilos son obligatorios porque el stock se lleva en kg.
     * En cualquier otra unidad se guarda NULL.
     */
    private function kilosPorCanasta(array $data, string $unidad): ?float
    {
        if ($unidad !== 'canasta') {
            return null;
        }

        return $this->positivo($data, 'kilos_por_canasta', 'Los kilos por canasta', 3);
    }
}
