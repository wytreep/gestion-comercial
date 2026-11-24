<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Domain\EstadoPago;
use App\Domain\EstadoPedido;
use App\Domain\Money;
use App\Repositories\VentaRepository;
use App\Repositories\ProductoRepository;
use App\Repositories\ClienteRepository;
use App\Exceptions\BusinessException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;

final class VentaService extends BaseService
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
        // Un filtro con un estado que no existe devolvía una lista vacía, que
        // parece "no hay ventas". Ahora se rechaza en la frontera.
        foreach (['estado_pedido' => EstadoPedido::class, 'estado_pago' => EstadoPago::class] as $campo => $enum) {
            $valor = $filtros[$campo] ?? '';
            if ($valor === '') {
                continue;
            }
            if ($enum::tryFrom((string) $valor) === null) {
                throw new ValidationException([
                    $campo => "Valor de {$campo} no válido. Permitidos: " . implode(', ', $enum::values()) . '.',
                ]);
            }
        }

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

            $total = Money::zero();
            foreach ($items as $item) {
                $cantidad = (float) ($item['cantidad'] ?? 0);
                $prodId   = (int)   ($item['producto_id'] ?? 0);
                $precio   = $this->importe($item, 'precio_unitario', 'El precio unitario');

                if ($cantidad <= 0 || $precio->toCents() <= 0 || $prodId <= 0) {
                    throw new ValidationException(['items' => 'Cantidad y precio deben ser mayores a cero.']);
                }

                $producto = $this->productoRepo->findRaw($prodId);
                if ($producto === null || (int) $producto['activo'] !== 1) {
                    throw new NotFoundException('Producto');
                }

                // Se suma en centavos: cantidad × precio no es exacto en coma
                // flotante y el error se arrastraba hasta el saldo del cliente.
                $total = $total->add($precio->multiplyMilli($this->milesimas($cantidad)));
            }

            $pagoInicial = Money::zero();
            if (isset($data['pago_inicial']['monto']) && $data['pago_inicial']['monto'] !== '') {
                $pagoInicial = $this->importe($data['pago_inicial'], 'monto', 'El monto del pago inicial');
            }

            // Sin tolerancia de 0,01: antes se podía pagar un centavo de más.
            if ($pagoInicial->toCents() > $total->toCents()) {
                throw new BusinessException('El pago inicial no puede superar el total de la venta.');
            }

            // 1. Crear la venta
            $ventaId = $this->ventaRepo->create([
                'cliente_id'    => $clienteId,
                'fecha_venta'   => $data['fecha_venta']   ?? date('Y-m-d H:i:s'),
                'fecha_entrega' => $data['fecha_entrega'] ?? null,
                'observaciones' => $data['observaciones'] ?? null,
                'estado_pedido' => $this->estadoPedido($data)->value,
            ]);

            // 2. Insertar items y descontar stock
            foreach ($items as $item) {
                $cantidad = (float) ($item['cantidad'] ?? 0);
                $prodId   = (int)   ($item['producto_id'] ?? 0);
                $precio   = $this->importe($item, 'precio_unitario', 'El precio unitario');

                $producto = $this->productoRepo->findRaw($prodId);
                if ($producto === null) throw new NotFoundException('Producto');

                $this->ventaRepo->insertItem($ventaId, $prodId, $cantidad, $precio->toDecimal());

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
            if ($pagoInicial->toCents() > 0) {
                $pago            = $data['pago_inicial'];
                $pago['monto']   = $pagoInicial->toDecimal();
                $this->ventaRepo->insertPago($ventaId, $pago);
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

            // Un estado de pedido inventado llegaba hasta el ENUM de MySQL y
            // salía como error 500. Se valida antes de tocar la base.
            if (array_key_exists('estado_pedido', $datos)) {
                if ((string) $datos['estado_pedido'] === '') {
                    unset($datos['estado_pedido']);
                } else {
                    $datos['estado_pedido'] = $this->estadoPedido($datos, false)->value;
                }
            }

            $nuevoTotal = null;

            if (!empty($data['items'])) {
                $nuevoTotal = Money::zero();
                foreach ($data['items'] as $item) {
                    $cantidad = (float) ($item['cantidad'] ?? 0);
                    $prodId   = (int)   ($item['producto_id'] ?? 0);
                    $precio   = $this->importe($item, 'precio_unitario', 'El precio unitario');

                    if ($cantidad <= 0 || $precio->toCents() <= 0 || $prodId <= 0) {
                        throw new ValidationException(['items' => 'Datos de item inválidos.']);
                    }

                    $nuevoTotal = $nuevoTotal->add($precio->multiplyMilli($this->milesimas($cantidad)));
                }

                $pagado = Money::fromDecimal($venta['total_pagado']);

                // Comparación exacta: la tolerancia de 0,01 dejaba bajar el
                // total un centavo por debajo de lo ya cobrado.
                if ($nuevoTotal->toCents() < $pagado->toCents()) {
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
                    $prodId   = (int)   ($item['producto_id'] ?? 0);
                    $precio   = $this->importe($item, 'precio_unitario', 'El precio unitario');

                    $producto = $this->productoRepo->findRaw($prodId);
                    if (!$producto) continue;

                    $this->ventaRepo->insertItem($id, $prodId, $cantidad, $precio->toDecimal());

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

        if ($venta['estado_pedido'] === EstadoPedido::Cancelado->value) {
            throw new BusinessException('La venta ya está cancelada.');
        }

        $tienePagos = Money::fromDecimal($venta['total_pagado'] ?? '0')->toCents() > 0;

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
        $monto = $this->importe($data, 'monto', 'El monto');
        if ($monto->toCents() <= 0) {
            throw new BusinessException('El monto debe ser mayor a cero.');
        }

        return $this->db->transaction(function () use ($ventaId, $data, $monto) {
            $venta = $this->ventaRepo->findSaldoForUpdate($ventaId);
            if ($venta === null) throw new NotFoundException('Venta');

            if ($venta['estado_pedido'] === EstadoPedido::Cancelado->value) {
                throw new BusinessException('No se puede registrar un pago en una venta cancelada.');
            }

            $saldo = Money::fromDecimal($venta['saldo_pendiente']);

            // Sin tolerancia: antes se aceptaba cobrar un centavo de más.
            if ($monto->toCents() > $saldo->toCents()) {
                throw new BusinessException(
                    'El monto (' . $this->pesos($monto) . ') ' .
                    'excede el saldo pendiente (' . $this->pesos($saldo) . ').'
                );
            }

            $pago          = $data;
            $pago['monto'] = $monto->toDecimal();

            return $this->ventaRepo->insertPago($ventaId, $pago);
        });
    }

    /**
     * Formato de pesos para los mensajes de error: "$100" o "$99,99".
     * Solo presentación; los decimales aparecen únicamente si existen.
     */
    private function pesos(Money $monto): string
    {
        $decimales = $monto->toCents() % 100 === 0 ? 0 : 2;

        return '$' . number_format($monto->toCents() / 100, $decimales, ',', '.');
    }

    /**
     * Estado de pedido recibido en el cuerpo.
     *
     * En el alta, si no viene, se usa `nuevo`; en la edición solo se valida
     * lo que venga. Un valor fuera del enum se rechaza con 422 en lugar de
     * llegar al ENUM de MySQL y salir como 500.
     */
    private function estadoPedido(array $data, bool $porDefecto = true): EstadoPedido
    {
        $valor = $data['estado_pedido'] ?? null;

        if ($valor === null || $valor === '') {
            if ($porDefecto) {
                return EstadoPedido::Nuevo;
            }
            throw new ValidationException(['estado_pedido' => 'Estado de pedido no válido.']);
        }

        try {
            return EstadoPedido::desde((string) $valor);
        } catch (\InvalidArgumentException) {
            throw new ValidationException([
                'estado_pedido' => 'Estado de pedido no válido. Permitidos: '
                    . implode(', ', EstadoPedido::values()) . '.',
            ]);
        }
    }

    /**
     * Cantidad decimal a milésimas enteras: `detalle_venta.cantidad` es
     * DECIMAL(10,3), así que 18,5 kg son 18_500 y 0,1 kg son 100. Es la única
     * conversión de cantidad que queda en el servicio; de ahí en adelante el
     * cálculo es entero.
     */
    private function milesimas(float $cantidad): int
    {
        return (int) round($cantidad * 1000);
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
