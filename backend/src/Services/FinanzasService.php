<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BaseRepository;
use DateTimeImmutable;

/**
 * Cálculos financieros construidos sobre las tablas existentes.
 *
 * Notas de criterio:
 *  - El estado de resultados es devengado: usa ventas.total del período.
 *  - El costo de ventas usa el costo unitario configurado en productos.
 *    Para productos por canasta el costo se normaliza a costo/kg, igual
 *    que ya lo hace ProductoRepository para el margen por producto.
 *  - Los gastos operativos son los gastos de compra (transporte, cuarto
 *    frío, etc.) más los gastos de reparto del período.
 *  - El flujo de caja es caja real: pagos cobrados menos compras.
 *  - No se maneja IVA en esta versión; queda preparado para agregarlo
 *    como una línea más del estado de resultados.
 */
final class FinanzasService extends BaseRepository
{
    private const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    private const MESES_LARGOS = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    public function getResumen(string $mes): array
    {
        $mes   = $this->normalizarMes($mes);
        $desde = $mes . '-01';
        $hasta = (new DateTimeImmutable($desde))->modify('+1 month')->format('Y-m-d');

        $estado   = $this->getEstadoResultados($desde, $hasta);
        $flujo    = $this->getFlujo($desde, $hasta);
        $productos = $this->getProductos($desde, $hasta);
        $indicadores = $this->getIndicadores($mes, $estado, $flujo, $productos);
        $tendencia = $this->getTendencia($mes, 6);
        $comparativo = $this->getComparativo($mes);

        return [
            'periodo'            => $mes,
            'periodo_label'      => $this->etiquetaMes($mes),
            'estado_resultados'  => $estado,
            'flujo'              => $flujo,
            'indicadores'        => $indicadores,
            'productos'          => $productos,
            'tendencia'          => $tendencia,
            'comparativo'        => $comparativo,
        ];
    }

    // ── Estado de resultados ─────────────────────────────

    private function getEstadoResultados(string $desde, string $hasta): array
    {
        $ventas = $this->queryOne(
            "SELECT COUNT(*) AS pedidos,
                    COALESCE(SUM(total), 0)       AS total,
                    COALESCE(SUM(total_pagado),0) AS cobrado
             FROM ventas
             WHERE fecha_venta >= :desde AND fecha_venta < :hasta
               AND estado_pedido <> 'cancelado'",
            [':desde' => $desde, ':hasta' => $hasta]
        ) ?? ['pedidos' => 0, 'total' => 0, 'cobrado' => 0];

        $costo = $this->queryOne(
            "SELECT COALESCE(SUM(
                        dv.cantidad * CASE
                          WHEN p.unidad_medida = 'canasta' AND p.kilos_por_canasta > 0
                            THEN p.precio_compra / p.kilos_por_canasta
                          ELSE p.precio_compra
                        END
                    ), 0) AS total
             FROM detalle_venta dv
             JOIN ventas v    ON v.id = dv.venta_id
             JOIN productos p ON p.id = dv.producto_id
             WHERE v.fecha_venta >= :desde AND v.fecha_venta < :hasta
               AND v.estado_pedido <> 'cancelado'",
            [':desde' => $desde, ':hasta' => $hasta]
        ) ?? ['total' => 0];

        $gastos = $this->getGastosOperativos($desde, $hasta);

        $ingresos          = (float) $ventas['total'];
        $costoVentas       = (float) $costo['total'];
        $gastosOperativos  = (float) $gastos['total'];
        $utilidadBruta     = $ingresos - $costoVentas;
        $utilidadOperativa = $utilidadBruta - $gastosOperativos;

        return [
            'ingresos_operacionales' => $ingresos,
            'pedidos'                => (int) $ventas['pedidos'],
            'cobrado'                => (float) $ventas['cobrado'],
            'costo_ventas'           => $costoVentas,
            'utilidad_bruta'         => $utilidadBruta,
            'gastos_operativos'      => $gastosOperativos,
            'utilidad_operativa'     => $utilidadOperativa,
            'margen_bruto'           => $ingresos > 0 ? round($utilidadBruta / $ingresos * 100, 1) : 0.0,
            'margen_operativo'       => $ingresos > 0 ? round($utilidadOperativa / $ingresos * 100, 1) : 0.0,
            'detalle_gastos'         => $gastos['detalle'],
            'gastos_por_categoria'   => $gastos['por_categoria'],
        ];
    }

    private function getGastosOperativos(string $desde, string $hasta): array
    {
        $detalle = $this->query(
            "SELECT tg.nombre, tg.categoria, COALESCE(SUM(x.monto), 0) AS monto
             FROM (
                 SELECT tipo_gasto_id, monto, fecha FROM gastos_compra
                 UNION ALL
                 SELECT tipo_gasto_id, monto, fecha FROM gastos_reparto
             ) x
             JOIN tipos_gasto tg ON tg.id = x.tipo_gasto_id
             WHERE x.fecha >= :desde AND x.fecha < :hasta
             GROUP BY tg.id, tg.nombre, tg.categoria
             ORDER BY monto DESC",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $total = 0.0;
        $porCategoria = [];
        foreach ($detalle as &$g) {
            $monto = (float) $g['monto'];
            $g['monto'] = $monto;
            $total += $monto;
            $cat = (string) $g['categoria'];
            $porCategoria[$cat] = ($porCategoria[$cat] ?? 0.0) + $monto;
        }
        unset($g);

        $categorias = [];
        foreach ($porCategoria as $categoria => $monto) {
            $categorias[] = ['categoria' => $categoria, 'monto' => $monto];
        }
        usort($categorias, static fn(array $a, array $b): int => $b['monto'] <=> $a['monto']);

        return ['total' => $total, 'detalle' => $detalle, 'por_categoria' => $categorias];
    }

    // ── Flujo de caja ────────────────────────────────────

    private function getFlujo(string $desde, string $hasta): array
    {
        $ingresos = $this->queryOne(
            "SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS num
             FROM pagos
             WHERE fecha_pago >= :desde AND fecha_pago < :hasta",
            [':desde' => $desde, ':hasta' => $hasta]
        ) ?? ['total' => 0, 'num' => 0];

        $egresos = $this->queryOne(
            "SELECT COALESCE(SUM(total_inversion), 0) AS total, COUNT(*) AS num
             FROM compras
             WHERE fecha_compra >= :desde AND fecha_compra < :hasta",
            [':desde' => $desde, ':hasta' => $hasta]
        ) ?? ['total' => 0, 'num' => 0];

        $saldos = $this->query(
            "SELECT destino_dinero,
                    COALESCE(SUM(monto), 0) AS total,
                    COUNT(*) AS transacciones
             FROM pagos
             WHERE fecha_pago >= :desde AND fecha_pago < :hasta
             GROUP BY destino_dinero
             ORDER BY total DESC",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $porMedio = $this->query(
            "SELECT medio_pago,
                    COALESCE(SUM(monto), 0) AS total,
                    COUNT(*) AS transacciones
             FROM pagos
             WHERE fecha_pago >= :desde AND fecha_pago < :hasta
             GROUP BY medio_pago
             ORDER BY total DESC",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $egresosDetalle = $this->query(
            "SELECT c.id, c.fecha_compra, COALESCE(pr.nombre, 'Sin proveedor') AS proveedor,
                    c.total_productos, c.total_gastos, c.total_inversion, c.estado
             FROM compras c
             LEFT JOIN proveedores pr ON pr.id = c.proveedor_id
             WHERE c.fecha_compra >= :desde AND c.fecha_compra < :hasta
             ORDER BY c.fecha_compra DESC, c.id DESC",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        foreach ($saldos as &$s) {
            $s['total'] = (float) $s['total'];
            $s['transacciones'] = (int) $s['transacciones'];
        }
        unset($s);

        foreach ($porMedio as &$m) {
            $m['total'] = (float) $m['total'];
            $m['transacciones'] = (int) $m['transacciones'];
        }
        unset($m);

        foreach ($egresosDetalle as &$e) {
            $e['id'] = (int) $e['id'];
            $e['total_productos'] = (float) $e['total_productos'];
            $e['total_gastos'] = (float) $e['total_gastos'];
            $e['total_inversion'] = (float) $e['total_inversion'];
        }
        unset($e);

        $posicion = $this->queryOne(
            "SELECT
                (SELECT COALESCE(SUM(monto), 0) FROM pagos) -
                (SELECT COALESCE(SUM(total_inversion), 0) FROM compras) AS saldo"
        ) ?? ['saldo' => 0];

        $ingresosTotal = (float) $ingresos['total'];
        $egresosTotal  = (float) $egresos['total'];

        return [
            'ingresos'          => $ingresosTotal,
            'egresos'           => $egresosTotal,
            'neto'              => $ingresosTotal - $egresosTotal,
            'num_cobros'        => (int) $ingresos['num'],
            'num_compras'       => (int) $egresos['num'],
            'posicion_caja'     => (float) $posicion['saldo'],
            'saldos_destino'    => $saldos,
            'por_medio'         => $porMedio,
            'serie_diaria'      => $this->getSerieDiaria($desde, $hasta),
            'egresos_detalle'   => $egresosDetalle,
        ];
    }

    private function getSerieDiaria(string $desde, string $hasta): array
    {
        $ingresos = $this->query(
            "SELECT DATE(fecha_pago) AS fecha, COALESCE(SUM(monto), 0) AS total
             FROM pagos
             WHERE fecha_pago >= :desde AND fecha_pago < :hasta
             GROUP BY DATE(fecha_pago)",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $egresos = $this->query(
            "SELECT fecha_compra AS fecha, COALESCE(SUM(total_inversion), 0) AS total
             FROM compras
             WHERE fecha_compra >= :desde AND fecha_compra < :hasta
             GROUP BY fecha_compra",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $mapIngresos = [];
        foreach ($ingresos as $r) {
            $mapIngresos[(string) $r['fecha']] = (float) $r['total'];
        }
        $mapEgresos = [];
        foreach ($egresos as $r) {
            $mapEgresos[(string) $r['fecha']] = (float) $r['total'];
        }

        $inicio = new DateTimeImmutable($desde);
        $fin    = new DateTimeImmutable($hasta);
        $acum   = 0.0;
        $serie  = [];

        for ($dia = $inicio; $dia < $fin; $dia = $dia->modify('+1 day')) {
            $fecha    = $dia->format('Y-m-d');
            $ing      = $mapIngresos[$fecha] ?? 0.0;
            $egr      = $mapEgresos[$fecha] ?? 0.0;
            $neto     = $ing - $egr;
            $acum    += $neto;

            $serie[] = [
                'fecha'      => $fecha,
                'label'      => $dia->format('d/m'),
                'ingresos'   => $ing,
                'egresos'    => $egr,
                'neto'       => $neto,
                'acumulado'  => $acum,
            ];
        }

        return $serie;
    }

    // ── Productos ────────────────────────────────────────

    private function getProductos(string $desde, string $hasta): array
    {
        $rows = $this->query(
            "SELECT p.id, p.nombre, p.unidad_medida,
                    COALESCE(SUM(dv.cantidad), 0) AS unidades,
                    COALESCE(SUM(dv.subtotal), 0) AS ventas,
                    COALESCE(SUM(
                        dv.cantidad * CASE
                          WHEN p.unidad_medida = 'canasta' AND p.kilos_por_canasta > 0
                            THEN p.precio_compra / p.kilos_por_canasta
                          ELSE p.precio_compra
                        END
                    ), 0) AS costo
             FROM detalle_venta dv
             JOIN ventas v    ON v.id = dv.venta_id
             JOIN productos p ON p.id = dv.producto_id
             WHERE v.fecha_venta >= :desde AND v.fecha_venta < :hasta
               AND v.estado_pedido <> 'cancelado'
             GROUP BY p.id, p.nombre, p.unidad_medida
             ORDER BY ventas DESC",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $totalVentas = 0.0;
        foreach ($rows as $r) {
            $totalVentas += (float) $r['ventas'];
        }

        $productos = [];
        foreach ($rows as $r) {
            $ventas  = (float) $r['ventas'];
            $costo   = (float) $r['costo'];
            $utilidad = $ventas - $costo;

            $productos[] = [
                'id'             => (int) $r['id'],
                'nombre'         => (string) $r['nombre'],
                'unidad_medida'  => (string) $r['unidad_medida'],
                'unidades'       => (float) $r['unidades'],
                'ventas'         => $ventas,
                'costo'          => $costo,
                'utilidad'       => $utilidad,
                'margen'         => $ventas > 0 ? round($utilidad / $ventas * 100, 1) : 0.0,
                'participacion'  => $totalVentas > 0 ? round($ventas / $totalVentas * 100, 1) : 0.0,
            ];
        }

        return $productos;
    }

    // ── Indicadores ──────────────────────────────────────

    private function getIndicadores(string $mes, array $estado, array $flujo, array $productos): array
    {
        $cartera = $this->queryOne(
            "SELECT COALESCE(SUM(saldo_pendiente), 0) AS total
             FROM ventas
             WHERE saldo_pendiente > 0 AND estado_pedido <> 'cancelado'"
        ) ?? ['total' => 0];

        $inventario = $this->queryOne(
            "SELECT COALESCE(SUM(
                        p.stock_actual * CASE
                          WHEN p.unidad_medida = 'canasta' AND p.kilos_por_canasta > 0
                            THEN p.precio_compra / p.kilos_por_canasta
                          ELSE p.precio_compra
                        END
                    ), 0) AS valor
             FROM productos p
             WHERE p.activo = 1"
        ) ?? ['valor' => 0];

        $previo = (new DateTimeImmutable($mes . '-01'))->modify('-1 month')->format('Y-m');
        $ventasPrevias = $this->queryOne(
            "SELECT COALESCE(SUM(total), 0) AS total
             FROM ventas
             WHERE DATE_FORMAT(fecha_venta, '%Y-%m') = :mes
               AND estado_pedido <> 'cancelado'",
            [':mes' => $previo]
        ) ?? ['total' => 0];

        $ventas        = (float) $estado['ingresos_operacionales'];
        $utilidadBruta = (float) $estado['utilidad_bruta'];
        $gastos        = (float) $estado['gastos_operativos'];
        $carteraTotal  = (float) $cartera['total'];
        $valorInv      = (float) $inventario['valor'];
        $ventasAnt     = (float) $ventasPrevias['total'];

        $margenRatio = $ventas > 0 ? $utilidadBruta / $ventas : 0.0;

        return [
            'ticket_promedio'      => $estado['pedidos'] > 0 ? round($ventas / $estado['pedidos'], 0) : 0.0,
            'margen_bruto'         => $estado['margen_bruto'],
            'margen_operativo'     => $estado['margen_operativo'],
            'punto_equilibrio'     => $margenRatio > 0 ? round($gastos / $margenRatio, 0) : 0.0,
            'cartera'              => $carteraTotal,
            'dso'                  => $ventas > 0 ? round($carteraTotal / ($ventas / 30), 1) : 0.0,
            'rotacion_inventario'  => $valorInv > 0 ? round((float) $estado['costo_ventas'] / $valorInv, 2) : 0.0,
            'valor_inventario'     => $valorInv,
            'crecimiento_ventas'   => $ventasAnt > 0 ? round(($ventas - $ventasAnt) / $ventasAnt * 100, 1) : null,
            'cartera_sobre_ventas' => $ventas > 0 ? round($carteraTotal / $ventas * 100, 1) : 0.0,
            'cobertura_gastos'     => $gastos > 0 ? round($utilidadBruta / $gastos, 2) : 0.0,
            'compras_mes'          => (float) $flujo['egresos'],
            'flujo_neto'           => (float) $flujo['neto'],
            'saldo_caja'           => (float) $flujo['posicion_caja'],
            'pedidos'              => (int) $estado['pedidos'],
            'ventas'               => $ventas,
            'productos_con_venta'  => count($productos),
        ];
    }

    // ── Tendencia y comparativo ──────────────────────────

    private function getTendencia(string $mes, int $meses = 6): array
    {
        $base  = new DateTimeImmutable($mes . '-01');
        $lista = [];
        for ($i = $meses - 1; $i >= 0; $i--) {
            $lista[] = $base->modify("-{$i} months")->format('Y-m');
        }

        $desde = $lista[0] . '-01';
        $hasta = $base->modify('+1 month')->format('Y-m-d');

        $ventas = $this->query(
            "SELECT DATE_FORMAT(fecha_venta, '%Y-%m') AS mes,
                    COALESCE(SUM(total), 0) AS total
             FROM ventas
             WHERE fecha_venta >= :desde AND fecha_venta < :hasta
               AND estado_pedido <> 'cancelado'
             GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m')",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $costos = $this->query(
            "SELECT DATE_FORMAT(v.fecha_venta, '%Y-%m') AS mes,
                    COALESCE(SUM(
                        dv.cantidad * CASE
                          WHEN p.unidad_medida = 'canasta' AND p.kilos_por_canasta > 0
                            THEN p.precio_compra / p.kilos_por_canasta
                          ELSE p.precio_compra
                        END
                    ), 0) AS total
             FROM detalle_venta dv
             JOIN ventas v    ON v.id = dv.venta_id
             JOIN productos p ON p.id = dv.producto_id
             WHERE v.fecha_venta >= :desde AND v.fecha_venta < :hasta
               AND v.estado_pedido <> 'cancelado'
             GROUP BY DATE_FORMAT(v.fecha_venta, '%Y-%m')",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $gastos = $this->query(
            "SELECT DATE_FORMAT(x.fecha, '%Y-%m') AS mes,
                    COALESCE(SUM(x.monto), 0) AS total
             FROM (
                 SELECT monto, fecha FROM gastos_compra
                 UNION ALL
                 SELECT monto, fecha FROM gastos_reparto
             ) x
             WHERE x.fecha >= :desde AND x.fecha < :hasta
             GROUP BY DATE_FORMAT(x.fecha, '%Y-%m')",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $cobros = $this->query(
            "SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
                    COALESCE(SUM(monto), 0) AS total
             FROM pagos
             WHERE fecha_pago >= :desde AND fecha_pago < :hasta
             GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m')",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $compras = $this->query(
            "SELECT DATE_FORMAT(fecha_compra, '%Y-%m') AS mes,
                    COALESCE(SUM(total_inversion), 0) AS total
             FROM compras
             WHERE fecha_compra >= :desde AND fecha_compra < :hasta
             GROUP BY DATE_FORMAT(fecha_compra, '%Y-%m')",
            [':desde' => $desde, ':hasta' => $hasta]
        );

        $mapVentas  = $this->indexarPorMes($ventas);
        $mapCostos  = $this->indexarPorMes($costos);
        $mapGastos  = $this->indexarPorMes($gastos);
        $mapCobros  = $this->indexarPorMes($cobros);
        $mapCompras = $this->indexarPorMes($compras);

        $tendencia = [];
        foreach ($lista as $m) {
            $v  = $mapVentas[$m] ?? 0.0;
            $c  = $mapCostos[$m] ?? 0.0;
            $g  = $mapGastos[$m] ?? 0.0;
            $cb = $mapCobros[$m] ?? 0.0;
            $cp = $mapCompras[$m] ?? 0.0;

            $tendencia[] = [
                'mes'               => $m,
                'label'             => $this->etiquetaMesCorta($m),
                'ventas'            => $v,
                'costo'             => $c,
                'utilidad_bruta'    => $v - $c,
                'gastos'            => $g,
                'utilidad_operativa'=> $v - $c - $g,
                'cobros'            => $cb,
                'compras'           => $cp,
                'flujo'             => $cb - $cp,
            ];
        }

        return $tendencia;
    }

    private function getComparativo(string $mes): array
    {
        $previo = (new DateTimeImmutable($mes . '-01'))->modify('-1 month')->format('Y-m');
        $desde  = $previo . '-01';
        $hasta  = (new DateTimeImmutable($desde))->modify('+1 month')->format('Y-m-d');

        $estado = $this->getEstadoResultados($desde, $hasta);
        $cobros = $this->queryOne(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM pagos
             WHERE fecha_pago >= :desde AND fecha_pago < :hasta",
            [':desde' => $desde, ':hasta' => $hasta]
        ) ?? ['total' => 0];
        $compras = $this->queryOne(
            "SELECT COALESCE(SUM(total_inversion), 0) AS total FROM compras
             WHERE fecha_compra >= :desde AND fecha_compra < :hasta",
            [':desde' => $desde, ':hasta' => $hasta]
        ) ?? ['total' => 0];

        return [
            'periodo'           => $previo,
            'periodo_label'     => $this->etiquetaMes($previo),
            'ventas'            => (float) $estado['ingresos_operacionales'],
            'utilidad_bruta'    => (float) $estado['utilidad_bruta'],
            'utilidad_operativa'=> (float) $estado['utilidad_operativa'],
            'cobros'            => (float) $cobros['total'],
            'compras'           => (float) $compras['total'],
        ];
    }

    // ── Utilidades ───────────────────────────────────────

    private function indexarPorMes(array $rows): array
    {
        $map = [];
        foreach ($rows as $r) {
            $map[(string) $r['mes']] = (float) $r['total'];
        }
        return $map;
    }

    private function normalizarMes(string $mes): string
    {
        return preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $mes) === 1 ? $mes : date('Y-m');
    }

    private function etiquetaMes(string $mes): string
    {
        $anio = (int) substr($mes, 0, 4);
        $num  = (int) substr($mes, 5, 2);
        return self::MESES_LARGOS[$num - 1] . ' ' . $anio;
    }

    private function etiquetaMesCorta(string $mes): string
    {
        $anio = substr($mes, 0, 4);
        $num  = (int) substr($mes, 5, 2);
        return self::MESES_CORTOS[$num - 1] . ' ' . $anio;
    }
}
