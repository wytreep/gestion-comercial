<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Domain\EstadoPedido;
use App\Domain\Money;
use App\Exceptions\BusinessException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Repositories\CobroQrRepository;
use App\Repositories\VentaRepository;

final class CobroQrService extends BaseService
{
    private const VIGENCIA_MINUTOS = 15;

    private const MEDIOS_PAGO = ['efectivo', 'transferencia'];

    private const DESTINOS = [
        'efectivo_caja',
        'billetera_nequi',
        'billetera_daviplata',
        'billetera_bancolombia',
        'banco',
        'otro',
    ];

    public function __construct(
        private readonly CobroQrRepository $cobroRepo,
        private readonly VentaRepository   $ventaRepo,
        private readonly VentaService      $ventaService,
        private readonly Database          $db,
    ) {}

    public function crear(int $ventaId, array $data, ?int $usuarioId = null): array
    {
        $venta = $this->ventaRepo->findById($ventaId);
        if ($venta === null) throw new NotFoundException('Venta');

        if ($venta['estado_pedido'] === EstadoPedido::Cancelado->value) {
            throw new BusinessException('No se puede cobrar una venta cancelada.');
        }

        $saldo = Money::fromDecimal($venta['saldo_pendiente']);
        if ($saldo->toCents() <= 0) {
            throw new BusinessException('La venta no tiene saldo pendiente.');
        }

        $monto = (isset($data['monto']) && $data['monto'] !== '')
            ? $this->importe($data, 'monto', 'El monto')
            : $saldo;

        if ($monto->toCents() <= 0) {
            throw new BusinessException('El monto debe ser mayor a cero.');
        }

        // Sin tolerancia: antes se aceptaba un cobro un centavo mayor al saldo.
        if ($monto->toCents() > $saldo->toCents()) {
            throw new BusinessException(
                'El monto (' . $this->pesos($monto) . ') ' .
                'excede el saldo pendiente (' . $this->pesos($saldo) . ').'
            );
        }

        $this->cobroRepo->marcarExpirados($this->ahora());

        $id = $this->db->transaction(function () use ($ventaId, $monto, $usuarioId): int {
            // Solo puede existir un cobro activo por venta.
            $this->cobroRepo->anularPendientes($ventaId);

            return $this->cobroRepo->crear([
                'venta_id'   => $ventaId,
                'codigo'     => $this->generarCodigo(),
                'monto'      => $monto->toDecimal(),
                'expira_at'  => date('Y-m-d H:i:s', strtotime('+' . self::VIGENCIA_MINUTOS . ' minutes')),
                'usuario_id' => $usuarioId,
            ]);
        });

        return $this->obtenerPorId($id);
    }

    public function listar(int $ventaId): array
    {
        $venta = $this->ventaRepo->findById($ventaId);
        if ($venta === null) throw new NotFoundException('Venta');

        $this->cobroRepo->marcarExpirados($this->ahora(), $ventaId);

        return array_map(
            fn(array $c): array => $this->formatear($c),
            $this->cobroRepo->listarPorVenta($ventaId)
        );
    }

    public function obtener(string $codigo): array
    {
        $cobro = $this->cobroRepo->findByCodigo($codigo);
        if ($cobro === null) throw new NotFoundException('Cobro QR');

        if ($cobro['estado'] === 'pendiente' && strtotime($cobro['expira_at']) <= time()) {
            $this->cobroRepo->marcarExpirado((int) $cobro['id']);
            $cobro = $this->cobroRepo->findByCodigo($codigo) ?? $cobro;
            $cobro['estado'] = 'expirado';
        }

        return $this->formatear($cobro);
    }

    public function confirmar(string $codigo, array $data): array
    {
        $referencia = trim((string) ($data['referencia'] ?? ''));
        if ($referencia === '') {
            throw new ValidationException(['referencia' => 'La referencia del pago es obligatoria.']);
        }

        $medio = in_array($data['medio_pago'] ?? '', self::MEDIOS_PAGO, true)
            ? (string) $data['medio_pago']
            : 'transferencia';

        $destino = in_array($data['destino_dinero'] ?? '', self::DESTINOS, true)
            ? (string) $data['destino_dinero']
            : 'billetera_nequi';

        return $this->db->transaction(function () use ($codigo, $data, $referencia, $medio, $destino): array {
            $cobro = $this->cobroRepo->findForUpdate($codigo);
            if ($cobro === null) throw new NotFoundException('Cobro QR');

            if ($cobro['estado'] === 'pagado') {
                throw new BusinessException('Este cobro ya fue confirmado.');
            }
            if ($cobro['estado'] === 'anulado') {
                throw new BusinessException('Este cobro fue anulado.');
            }
            if ($cobro['estado'] === 'expirado' || strtotime($cobro['expira_at']) <= time()) {
                if ($cobro['estado'] === 'pendiente') {
                    $this->cobroRepo->marcarExpirado((int) $cobro['id']);
                }
                throw new BusinessException('El cobro expiró. Genera uno nuevo para continuar.');
            }

            // Reutiliza VentaService::registrarPago: valida el saldo y dispara
            // los triggers que actualizan total_pagado y estado_pago.
            $pagoId = $this->ventaService->registrarPago((int) $cobro['venta_id'], [
                'monto'          => $cobro['monto'],
                'medio_pago'     => $medio,
                'destino_dinero' => $destino,
                'referencia'     => $referencia,
                'notas'          => $data['notas'] ?? ('Cobro QR ' . $cobro['codigo']),
            ]);

            $this->cobroRepo->marcarPagado((int) $cobro['id'], $pagoId, $referencia);

            return [
                'id'       => (int) $cobro['id'],
                'venta_id' => (int) $cobro['venta_id'],
                'codigo'   => $cobro['codigo'],
                'monto'    => (float) $cobro['monto'],
                'estado'   => 'pagado',
                'pago_id'  => $pagoId,
            ];
        });
    }

    public function anular(string $codigo): array
    {
        $this->db->transaction(function () use ($codigo): void {
            $cobro = $this->cobroRepo->findForUpdate($codigo);
            if ($cobro === null) throw new NotFoundException('Cobro QR');

            if ($cobro['estado'] === 'pagado') {
                throw new BusinessException('No se puede anular un cobro ya pagado.');
            }
            if ($cobro['estado'] === 'anulado') {
                return;
            }
            if ($cobro['estado'] === 'expirado') {
                throw new BusinessException('El cobro ya expiró.');
            }

            $this->cobroRepo->anular((int) $cobro['id']);
        });

        return $this->obtener($codigo);
    }

    private function obtenerPorId(int $id): array
    {
        $cobro = $this->cobroRepo->findById($id);
        if ($cobro === null) throw new NotFoundException('Cobro QR');

        return $this->formatear($cobro);
    }

    private function generarCodigo(): string
    {
        for ($intento = 0; $intento < 5; $intento++) {
            $codigo = 'GCOM-C-' . strtoupper(bin2hex(random_bytes(6)));
            if ($this->cobroRepo->findByCodigo($codigo) === null) {
                return $codigo;
            }
        }

        throw new BusinessException('No se pudo generar un código único. Intenta de nuevo.');
    }

    private function ahora(): string
    {
        return date('Y-m-d H:i:s');
    }

    private function formatear(array $c): array
    {
        $monto = Money::fromDecimal($c['monto']);

        return [
            'id'           => (int) $c['id'],
            'venta_id'     => (int) $c['venta_id'],
            'codigo'       => $c['codigo'],
            // `monto` viaja como número porque el cliente ya lo consume así;
            // cambiarlo a texto sería un cambio de contrato de la API.
            'monto'        => (float) $c['monto'],
            'estado'       => $c['estado'],
            'expira_at'    => $c['expira_at'],
            'expira_en'    => max(0, strtotime($c['expira_at']) - time()),
            'pagado_at'    => $c['pagado_at'],
            'referencia'   => $c['referencia'],
            'pago_id'      => $c['pago_id'] !== null ? (int) $c['pago_id'] : null,
            'created_at'   => $c['created_at'],
            'contenido_qr' => sprintf(
                'GCOM-COBRO|%s|VENTA:%d|MONTO:%s',
                $c['codigo'],
                (int) $c['venta_id'],
                $monto->toDecimal()
            ),
        ];
    }

    /**
     * Formato de pesos sin decimales para los mensajes de error ("$46.250"),
     * igual al que ya mostraba la aplicación. Solo presentación.
     */
    private function pesos(Money $monto): string
    {
        return '$' . number_format($monto->toCents() / 100, 0, ',', '.');
    }
}
