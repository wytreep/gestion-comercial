<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BaseRepository;
use TCPDF;

final class ReporteService extends BaseRepository
{
    // ── Reporte mensual ───────────────────────────────

    public function generarMensual(string $mes): array
    {
        [$anio, $mesNum] = explode('-', $mes);

        $ventas   = $this->getResumenVentas($mes);
        $compras  = $this->getResumenCompras($mes);
        $cartera  = $this->getCartera();
        $stock    = $this->getStock();
        $topClientes = $this->getTopClientes($mes);

        $ganancia = $ventas['total'] - $compras['total'];
        $margen   = $ventas['total'] > 0
            ? round(($ganancia / $ventas['total']) * 100, 1)
            : 0;

        return [
            'periodo'      => $mes,
            'ventas'       => $ventas,
            'compras'      => $compras,
            'ganancia'     => $ganancia,
            'margen'       => $margen,
            'cartera'      => $cartera,
            'stock'        => $stock,
            'top_clientes' => $topClientes,
        ];
    }

    public function generarPdfMensual(string $mes): string
    {
        $data = $this->generarMensual($mes);
        return $this->buildPdf($data);
    }

    // ── PDF con FPDF ──────────────────────────────────

    private function buildPdf(array $data): string
    {
        $pdf = new TCPDF('P', 'mm', 'Letter', true, 'UTF-8', false);
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);
        $pdf->AddPage();

        // ── Encabezado ────────────────────────────────
        $pdf->SetFont('helvetica', 'B', 18);
        $pdf->SetTextColor(15, 76, 117);
        $pdf->Cell(0, 10, 'GestionComercial', 0, 1, 'C');

        $pdf->SetFont('helvetica', '', 11);
        $pdf->SetTextColor(80, 80, 80);
        $pdf->Cell(0, 6, 'Reporte Mensual — ' . $this->formatMes($data['periodo']), 0, 1, 'C');
        $pdf->Cell(0, 5, 'Generado: ' . date('d/m/Y H:i'), 0, 1, 'C');
        $pdf->Ln(5);

        // ── KPIs ──────────────────────────────────────
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(15, 76, 117);
        $pdf->Cell(0, 8, 'Resumen del periodo', 0, 1);
        $pdf->SetDrawColor(200, 200, 200);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(3);

        $kpis = [
            ['Ventas totales',         $this->cop($data['ventas']['total'])],
            ['Pedidos registrados',    $data['ventas']['count'] . ' pedidos'],
            ['Dinero cobrado',         $this->cop($data['ventas']['cobrado'])],
            ['Inversion compras',      $this->cop($data['compras']['total'])],
            ['Ganancia bruta est.',    $this->cop($data['ganancia'])],
            ['Margen bruto',           $data['margen'] . '%'],
            ['Cartera pendiente',      $this->cop($data['cartera']['total'])],
        ];

        $pdf->SetFont('helvetica', '', 10);
        $pdf->SetTextColor(50, 50, 50);
        $col = 0;
        foreach ($kpis as [$label, $valor]) {
            if ($col === 0) $pdf->SetX(15);
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->SetTextColor(100, 100, 100);
            $pdf->Cell(85, 5, strtoupper($label), 0, 0, 'L');
            if ($col === 1) $pdf->Ln();
            $col = ($col + 1) % 2;
        }
        $col = 0;
        foreach ($kpis as [$label, $valor]) {
            if ($col === 0) $pdf->SetX(15);
            $pdf->SetFont('helvetica', 'B', 11);
            $pdf->SetTextColor(15, 76, 117);
            $pdf->Cell(85, 7, $valor, 0, 0, 'L');
            if ($col === 1) $pdf->Ln();
            $col = ($col + 1) % 2;
        }
        if ($col !== 0) $pdf->Ln();
        $pdf->Ln(5);

        // ── Stock actual ──────────────────────────────
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(15, 76, 117);
        $pdf->Cell(0, 8, 'Stock actual', 0, 1);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(2);

        $this->tableHeader($pdf, ['Producto', 'Stock', 'P. Compra/und', 'P. Venta/kg', 'Margen']);
        foreach ($data['stock'] as $p) {
            $margen = $p['margen_porcentaje'] !== null ? $p['margen_porcentaje'] . '%' : 'N/A';
            $this->tableRow($pdf, [
                $p['nombre'],
                $this->cantidad((float) $p['stock_actual']) . ' kg',
                $this->cop($p['precio_compra']),
                $this->cop($p['precio_venta']),
                $margen,
            ], [60, 25, 35, 35, 25]);
        }
        $pdf->Ln(5);

        // ── Top clientes ──────────────────────────────
        if (!empty($data['top_clientes'])) {
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->SetTextColor(15, 76, 117);
            $pdf->Cell(0, 8, 'Top clientes del periodo', 0, 1);
            $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
            $pdf->Ln(2);

            $this->tableHeader($pdf, ['Cliente', 'Pedidos', 'Total compras', 'Total pagado', 'Saldo']);
            foreach ($data['top_clientes'] as $c) {
                $this->tableRow($pdf, [
                    $c['nombre'],
                    $c['pedidos'],
                    $this->cop($c['total']),
                    $this->cop($c['pagado']),
                    $this->cop($c['saldo']),
                ], [50, 25, 40, 40, 25]);
            }
            $pdf->Ln(5);
        }

        // ── Cartera detallada ─────────────────────────
        if (!empty($data['cartera']['detalle'])) {
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->SetTextColor(15, 76, 117);
            $pdf->Cell(0, 8, 'Cartera pendiente de cobro', 0, 1);
            $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
            $pdf->Ln(2);

            $this->tableHeader($pdf, ['Cliente', 'Pedidos', 'Total', 'Pagado', 'Saldo']);
            foreach ($data['cartera']['detalle'] as $c) {
                $this->tableRow($pdf, [
                    $c['nombre'],
                    $c['pedidos_pendientes'],
                    $this->cop($c['total_ventas']),
                    $this->cop($c['total_pagado']),
                    $this->cop($c['saldo_total']),
                ], [50, 25, 40, 40, 25]);
            }
        }

        // ── Pie de página ─────────────────────────────
        $pdf->SetY(-15);
        $pdf->SetFont('helvetica', 'I', 8);
        $pdf->SetTextColor(150, 150, 150);
        $pdf->Cell(0, 10, 'Gestión Comercial — Reporte generado automaticamente', 0, 0, 'C');

        return $pdf->Output('', 'S');
    }

    // ── Helpers de tabla PDF ──────────────────────────

    private function tableHeader(TCPDF $pdf, array $cols, array $widths = []): void
    {
        if (empty($widths)) {
            $w = (180 / count($cols));
            $widths = array_fill(0, count($cols), $w);
        }
        $pdf->SetFillColor(15, 76, 117);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->SetX(15);
        foreach ($cols as $i => $col) {
            $pdf->Cell($widths[$i], 7, $col, 0, 0, 'L', true);
        }
        $pdf->Ln();
        $pdf->SetTextColor(50, 50, 50);
        $pdf->SetFont('helvetica', '', 9);
    }

    private function tableRow(TCPDF $pdf, array $cells, array $widths = [], bool $fill = false): void
    {
        if (empty($widths)) {
            $w = (180 / count($cells));
            $widths = array_fill(0, count($cells), $w);
        }
        static $toggle = false;
        if ($fill || $toggle) {
            $pdf->SetFillColor(240, 245, 250);
        }
        $pdf->SetX(15);
        foreach ($cells as $i => $cell) {
            $pdf->Cell($widths[$i], 6, (string)$cell, 0, 0, 'L', $fill || $toggle);
        }
        $pdf->Ln();
        $toggle = !$toggle;
    }

    // ── Queries de datos ──────────────────────────────

    private function getResumenVentas(string $mes): array
    {
        $row = $this->queryOne(
            "SELECT COUNT(*) AS cnt,
                    COALESCE(SUM(total), 0) AS total,
                    COALESCE(SUM(total_pagado), 0) AS cobrado
             FROM ventas
             WHERE DATE_FORMAT(fecha_venta, '%Y-%m') = :mes
               AND estado_pedido != 'cancelado'",
            [':mes' => $mes]
        );
        return [
            'count'   => (int)   ($row['cnt']     ?? 0),
            'total'   => (float) ($row['total']   ?? 0),
            'cobrado' => (float) ($row['cobrado'] ?? 0),
        ];
    }

    private function getResumenCompras(string $mes): array
    {
        $row = $this->queryOne(
            "SELECT COALESCE(SUM(total_inversion), 0) AS total
             FROM compras
             WHERE DATE_FORMAT(fecha_compra, '%Y-%m') = :mes",
            [':mes' => $mes]
        );
        return ['total' => (float) ($row['total'] ?? 0)];
    }

    private function getCartera(): array
    {
        $row = $this->queryOne(
            "SELECT COALESCE(SUM(saldo_pendiente), 0) AS total
             FROM ventas WHERE saldo_pendiente > 0 AND estado_pedido != 'cancelado'"
        );
        $detalle = $this->query(
            "SELECT cl.nombre, COUNT(v.id) AS pedidos_pendientes,
                    SUM(v.total) AS total_ventas,
                    SUM(v.total_pagado) AS total_pagado,
                    SUM(v.saldo_pendiente) AS saldo_total
             FROM clientes cl
             JOIN ventas v ON v.cliente_id = cl.id
             WHERE v.saldo_pendiente > 0 AND v.estado_pedido != 'cancelado'
             GROUP BY cl.id ORDER BY saldo_total DESC"
        );
        return [
            'total'   => (float) ($row['total'] ?? 0),
            'detalle' => $detalle,
        ];
    }

    private function getStock(): array
    {
        return $this->query(
            "SELECT p.nombre, p.stock_actual, p.unidad_medida,
                    p.precio_compra, p.precio_venta, p.kilos_por_canasta,
                    CASE
                      WHEN p.unidad_medida = 'canasta' AND p.kilos_por_canasta > 0
                        THEN ROUND((p.precio_venta - p.precio_compra/p.kilos_por_canasta) / p.precio_venta * 100, 1)
                      WHEN p.precio_venta > 0
                        THEN ROUND((p.precio_venta - p.precio_compra) / p.precio_venta * 100, 1)
                      ELSE NULL
                    END AS margen_porcentaje
             FROM productos p WHERE p.activo = 1"
        );
    }

    private function getTopClientes(string $mes): array
    {
        return $this->query(
            "SELECT COALESCE(cl.nombre, 'Sin cliente') AS nombre,
                    COUNT(v.id) AS pedidos,
                    SUM(v.total) AS total,
                    SUM(v.total_pagado) AS pagado,
                    SUM(v.saldo_pendiente) AS saldo
             FROM ventas v
             LEFT JOIN clientes cl ON cl.id = v.cliente_id
             WHERE DATE_FORMAT(v.fecha_venta, '%Y-%m') = :mes
               AND v.estado_pedido != 'cancelado'
             GROUP BY v.cliente_id
             ORDER BY total DESC
             LIMIT 10",
            [':mes' => $mes]
        );
    }

    // ── Formateo ──────────────────────────────────────

    private function cop(float|string $n): string
    {
        return '$' . number_format((float)$n, 0, ',', '.');
    }

    /** Cantidades sin ceros sobrantes: 7.000 → "7", 1.500 → "1,5". */
    private function cantidad(float|string $n): string
    {
        $texto = number_format((float) $n, 3, ',', '.');
        return rtrim(rtrim($texto, '0'), ',');
    }

    private function formatMes(string $mes): string
    {
        [$y, $m] = explode('-', $mes);
        $meses = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return ($meses[(int)$m] ?? $m) . ' ' . $y;
    }
}
