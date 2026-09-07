<?php
/**
 * index.php — Router principal de la API REST
 * Sistema de Gestión Comercial v1.0
 *
 * Rutas:
 *   /api/index.php?resource=<recurso>&action=<acción>
 *
 * Recursos: productos, clientes, proveedores, compras,
 *           ventas, pagos, gastos, dashboard, caja
 */

require_once __DIR__ . '/config.php';

$resource = $_GET['resource'] ?? '';
$action   = $_GET['action']   ?? 'list';
$id       = isset($_GET['id']) ? (int)$_GET['id'] : null;
$method   = $_SERVER['REQUEST_METHOD'];

try {
    switch ($resource) {
        /* ─── DASHBOARD ─── */
        case 'dashboard':    handleDashboard(); break;

        /* ─── PRODUCTOS ─── */
        case 'productos':    handleProductos($method, $action, $id); break;

        /* ─── CLIENTES ─── */
        case 'clientes':     handleClientes($method, $action, $id); break;

        /* ─── PROVEEDORES ─── */
        case 'proveedores':  handleProveedores($method, $action, $id); break;

        /* ─── COMPRAS ─── */
        case 'compras':      handleCompras($method, $action, $id); break;

        /* ─── VENTAS ─── */
        case 'ventas':       handleVentas($method, $action, $id); break;

        /* ─── PAGOS ─── */
        case 'pagos':        handlePagos($method, $action, $id); break;

        /* ─── GASTOS ─── */
        case 'gastos':       handleGastos($method, $action, $id); break;

        /* ─── CARTERA ─── */
        case 'cartera':      handleCartera(); break;

        /* ─── CAJA ─── */
        case 'caja':         handleCaja(); break;

        /* ─── TIPOS DE GASTO ─── */
        case 'tipos_gasto':  handleTiposGasto(); break;

        /* ─── CATEGORIAS ─── */
        case 'categorias':   handleCategorias(); break;

        default:
            jsonResponse(false, null, 'Recurso no encontrado', 404);
    }
} catch (PDOException $e) {
    jsonResponse(false, null, 'Error de base de datos: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    jsonResponse(false, null, $e->getMessage(), 400);
}

/* ══════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════ */
function handleDashboard(): void {
    $db = getDB();

    // Ingresos del mes actual
    $mes     = date('Y-m');
    $ingMes  = $db->query("SELECT COALESCE(SUM(monto),0) AS total FROM pagos WHERE DATE_FORMAT(fecha_pago,'%Y-%m') = '$mes'")->fetch()['total'];
    $ventasMes = $db->query("SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS sum FROM ventas WHERE DATE_FORMAT(fecha_venta,'%Y-%m') = '$mes'")->fetch();

    // Inversión del mes
    $invMes  = $db->query("SELECT COALESCE(SUM(total_inversion),0) AS total FROM compras WHERE DATE_FORMAT(fecha_compra,'%Y-%m') = '$mes'")->fetch()['total'];

    // Cartera pendiente total
    $cartera = $db->query("SELECT COALESCE(SUM(saldo_pendiente),0) AS total FROM ventas WHERE saldo_pendiente > 0")->fetch()['total'];

    // Últimas 5 ventas
    $ultimasVentas = $db->query("
        SELECT v.id, COALESCE(c.nombre,'Sin cliente') AS cliente,
               v.total, v.estado_pago, v.estado_pedido,
               DATE_FORMAT(v.fecha_venta,'%d/%m/%Y') AS fecha
        FROM ventas v
        LEFT JOIN clientes c ON c.id = v.cliente_id
        ORDER BY v.id DESC LIMIT 5
    ")->fetchAll();

    // Saldos por billetera/destino
    $saldos = $db->query("
        SELECT destino_dinero, COALESCE(SUM(monto),0) AS total
        FROM pagos
        GROUP BY destino_dinero
        ORDER BY total DESC
    ")->fetchAll();

    // Ganancia bruta = Total ventas del mes − Total invertido en compras del mes
    // Nota: NO se usa precio_compra * cantidad vendida porque el pescado se
    // compra por canasta y se vende por kilo, lo que hace inútil ese ratio.
    // La comparación correcta es ingresos generados vs dinero invertido.
    $ventasMesTotal = (float)$ventasMes['sum'];
    $inversionMes   = (float)$invMes;
    $gananciaBruta  = $ventasMesTotal - $inversionMes;

    // Margen bruto % (solo si hay ventas)
    $margenBruto = $ventasMesTotal > 0
        ? round(($gananciaBruta / $ventasMesTotal) * 100, 1)
        : 0;

    // Stock actual
    $stock = $db->query("
        SELECT pr.nombre, pr.stock_actual, pr.unidad_medida,
               pr.precio_compra, pr.precio_venta
        FROM productos pr WHERE pr.activo = 1
    ")->fetchAll();

    jsonResponse(true, [
        'resumen_mes'    => [
            'ingresos_cobrados' => (float)$ingMes,
            'ventas_count'      => (int)$ventasMes['cnt'],
            'ventas_total'      => $ventasMesTotal,
            'inversion'         => $inversionMes,
            'ganancia_bruta'    => $gananciaBruta,
            'margen_bruto'      => $margenBruto,
            'cartera_pendiente' => (float)$cartera,
        ],
        'ultimas_ventas' => $ultimasVentas,
        'saldos_destino' => $saldos,
        'stock'          => $stock,
    ]);
}

/* ══════════════════════════════════════════════════════
   PRODUCTOS
══════════════════════════════════════════════════════ */
function handleProductos(string $method, string $action, ?int $id): void {
    $db = getDB();

    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare("SELECT p.*, c.nombre AS categoria FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE p.id = ?");
            $stmt->execute([$id]);
            jsonResponse(true, $stmt->fetch());
        }
        $rows = $db->query("SELECT p.*, c.nombre AS categoria FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE p.activo=1 ORDER BY c.nombre, p.nombre")->fetchAll();
        jsonResponse(true, $rows);
    }

    if ($method === 'PUT' && $action === 'precio') {
        $body = getJsonBody();
        $pc   = (float)($body['precio_compra'] ?? 0);
        $pv   = (float)($body['precio_venta']  ?? 0);
        if ($pc <= 0 || $pv <= 0 || !$id) throw new Exception('Datos inválidos');

        // Guardar historial
        $stmt = $db->prepare("INSERT INTO historial_precios (producto_id, precio_compra, precio_venta, motivo) VALUES (?,?,?,?)");
        $stmt->execute([$id, $pc, $pv, $body['motivo'] ?? 'Actualización manual']);

        // Actualizar precios y kilos_por_canasta si viene
        $kpc = isset($body['kilos_por_canasta']) && $body['kilos_por_canasta'] !== ''
               ? (float)$body['kilos_por_canasta']
               : null;

        $stmt = $db->prepare("UPDATE productos SET precio_compra=?, precio_venta=?, kilos_por_canasta=? WHERE id=?");
        $stmt->execute([$pc, $pv, $kpc, $id]);
        jsonResponse(true, null, 'Precio actualizado');
    }

    if ($method === 'PUT' && $action === 'stock') {
        $body = getJsonBody();
        $stmt = $db->prepare("UPDATE productos SET stock_actual = stock_actual + ? WHERE id=?");
        $stmt->execute([(float)$body['cantidad'], $id]);
        jsonResponse(true, null, 'Stock actualizado');
    }

    if ($method === 'GET' && $action === 'historial') {
        $stmt = $db->prepare("SELECT * FROM historial_precios WHERE producto_id=? ORDER BY fecha DESC LIMIT 20");
        $stmt->execute([$id]);
        jsonResponse(true, $stmt->fetchAll());
    }
}

/* ══════════════════════════════════════════════════════
   CLIENTES
══════════════════════════════════════════════════════ */
function handleClientes(string $method, string $action, ?int $id): void {
    $db = getDB();

    if ($method === 'GET') {
        if ($id) {
            // Cliente + historial de compras
            $stmt = $db->prepare("SELECT * FROM clientes WHERE id=?");
            $stmt->execute([$id]);
            $cliente = $stmt->fetch();

            $stmt2 = $db->prepare("
                SELECT v.id, DATE_FORMAT(v.fecha_venta,'%d/%m/%Y %H:%i') AS fecha,
                       v.total, v.total_pagado, v.saldo_pendiente, v.estado_pago, v.estado_pedido
                FROM ventas v WHERE v.cliente_id=? ORDER BY v.id DESC LIMIT 10
            ");
            $stmt2->execute([$id]);
            $cliente['historial'] = $stmt2->fetchAll();
            jsonResponse(true, $cliente);
        }

        $buscar = $_GET['q'] ?? '';
        if ($buscar) {
            $stmt = $db->prepare("SELECT * FROM clientes WHERE activo=1 AND (nombre LIKE ? OR telefono LIKE ?) LIMIT 20");
            $stmt->execute(["%$buscar%", "%$buscar%"]);
        } else {
            $stmt = $db->query("SELECT * FROM clientes WHERE activo=1 ORDER BY nombre");
        }
        jsonResponse(true, $stmt->fetchAll());
    }

    $body = getJsonBody();
    if ($method === 'POST') {
        $stmt = $db->prepare("INSERT INTO clientes (nombre,telefono,direccion,notas) VALUES (?,?,?,?)");
        $stmt->execute([$body['nombre'], $body['telefono'] ?? null, $body['direccion'] ?? null, $body['notas'] ?? null]);
        jsonResponse(true, ['id' => $db->lastInsertId()], 'Cliente creado');
    }

    if ($method === 'PUT' && $id) {
        $stmt = $db->prepare("UPDATE clientes SET nombre=?,telefono=?,direccion=?,notas=? WHERE id=?");
        $stmt->execute([$body['nombre'], $body['telefono'] ?? null, $body['direccion'] ?? null, $body['notas'] ?? null, $id]);
        jsonResponse(true, null, 'Cliente actualizado');
    }
}

/* ══════════════════════════════════════════════════════
   PROVEEDORES
══════════════════════════════════════════════════════ */
function handleProveedores(string $method, string $action, ?int $id): void {
    $db = getDB();
    if ($method === 'GET') {
        $rows = $db->query("SELECT * FROM proveedores WHERE activo=1 ORDER BY nombre")->fetchAll();
        jsonResponse(true, $rows);
    }
    $body = getJsonBody();
    if ($method === 'POST') {
        $stmt = $db->prepare("INSERT INTO proveedores (nombre,ciudad,telefono,notas) VALUES (?,?,?,?)");
        $stmt->execute([$body['nombre'], $body['ciudad'] ?? null, $body['telefono'] ?? null, $body['notas'] ?? null]);
        jsonResponse(true, ['id' => $db->lastInsertId()], 'Proveedor creado');
    }
}

/* ══════════════════════════════════════════════════════
   COMPRAS
══════════════════════════════════════════════════════ */
function handleCompras(string $method, string $action, ?int $id): void {
    $db = getDB();

    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare("
                SELECT c.*, pr.nombre AS proveedor,
                       DATE_FORMAT(c.fecha_compra,'%d/%m/%Y') AS fecha_fmt
                FROM compras c
                LEFT JOIN proveedores pr ON pr.id = c.proveedor_id
                WHERE c.id=?
            ");
            $stmt->execute([$id]);
            $compra = $stmt->fetch();

            $stmt2 = $db->prepare("
                SELECT dc.*, p.nombre AS producto, p.unidad_medida
                FROM detalle_compra dc
                JOIN productos p ON p.id = dc.producto_id
                WHERE dc.compra_id=?
            ");
            $stmt2->execute([$id]);
            $compra['items'] = $stmt2->fetchAll();

            $stmt3 = $db->prepare("
                SELECT gc.*, tg.nombre AS tipo, tg.categoria
                FROM gastos_compra gc
                JOIN tipos_gasto tg ON tg.id = gc.tipo_gasto_id
                WHERE gc.compra_id=?
            ");
            $stmt3->execute([$id]);
            $compra['gastos'] = $stmt3->fetchAll();

            jsonResponse(true, $compra);
        }

        $rows = $db->query("
            SELECT c.id, DATE_FORMAT(c.fecha_compra,'%d/%m/%Y') AS fecha,
                   pr.nombre AS proveedor, c.total_productos,
                   c.total_gastos, c.total_inversion, c.estado
            FROM compras c
            LEFT JOIN proveedores pr ON pr.id = c.proveedor_id
            ORDER BY c.id DESC LIMIT 50
        ")->fetchAll();
        jsonResponse(true, $rows);
    }

    $body = getJsonBody();

    // POST: crear compra completa
    if ($method === 'POST') {
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("INSERT INTO compras (proveedor_id, fecha_compra, fecha_llegada, observaciones, estado) VALUES (?,?,?,?,?)");
            $stmt->execute([
                $body['proveedor_id'] ?? null,
                $body['fecha_compra'],
                $body['fecha_llegada'] ?? null,
                $body['observaciones'] ?? null,
                $body['estado'] ?? 'pendiente',
            ]);
            $compraId = $db->lastInsertId();

            // Insertar items
            foreach (($body['items'] ?? []) as $item) {
                $stmt2 = $db->prepare("INSERT INTO detalle_compra (compra_id,producto_id,cantidad,precio_unitario,kilos_estimados) VALUES (?,?,?,?,?)");
                $stmt2->execute([$compraId, $item['producto_id'], $item['cantidad'], $item['precio_unitario'], $item['kilos_estimados'] ?? null]);

                // Actualizar precio de compra del producto
                $stmt3 = $db->prepare("UPDATE productos SET precio_compra=? WHERE id=?");
                $stmt3->execute([$item['precio_unitario'], $item['producto_id']]);

                // Incrementar stock:
                // Para pescado (kilos_estimados definidos) sumar kilos reales
                // Para queso y carne sumar la cantidad directamente
                $stockDelta = (isset($item['kilos_estimados']) && floatval($item['kilos_estimados']) > 0)
                    ? floatval($item['kilos_estimados'])
                    : floatval($item['cantidad']);
                $stmt4 = $db->prepare("UPDATE productos SET stock_actual = stock_actual + ? WHERE id=?");
                $stmt4->execute([$stockDelta, $item['producto_id']]);
            }

            // Insertar gastos
            foreach (($body['gastos'] ?? []) as $gasto) {
                $stmt5 = $db->prepare("INSERT INTO gastos_compra (compra_id,tipo_gasto_id,monto,descripcion,fecha) VALUES (?,?,?,?,?)");
                $stmt5->execute([$compraId, $gasto['tipo_gasto_id'], $gasto['monto'], $gasto['descripcion'] ?? null, $gasto['fecha'] ?? date('Y-m-d')]);
            }

            $db->commit();
            jsonResponse(true, ['id' => $compraId], 'Compra registrada exitosamente');
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // PUT: editar estado o datos generales de la compra
    if ($method === 'PUT' && $id) {
        $body = getJsonBody();
        $db->beginTransaction();
        try {
            $campos = []; $vals = [];

            if (isset($body['estado'])) {
                $estados = ['pendiente','recibida','parcial'];
                if (!in_array($body['estado'], $estados))
                    throw new Exception('Estado inválido');
                $campos[] = 'estado=?'; $vals[] = $body['estado'];
            }
            if (isset($body['observaciones'])) { $campos[] = 'observaciones=?'; $vals[] = $body['observaciones']; }
            if (isset($body['fecha_llegada'])) { $campos[] = 'fecha_llegada=?'; $vals[] = $body['fecha_llegada']; }
            if (isset($body['proveedor_id']))  { $campos[] = 'proveedor_id=?';  $vals[] = $body['proveedor_id']; }

            if ($campos) {
                $vals[] = $id;
                $stmt = $db->prepare("UPDATE compras SET " . implode(',', $campos) . " WHERE id=?");
                $stmt->execute($vals);
            }

            // Reeditar items si vienen en el body
            if (!empty($body['items'])) {
                // Revertir stock anterior de esta compra
                $prevItems = $db->prepare("SELECT producto_id, cantidad, kilos_estimados FROM detalle_compra WHERE compra_id=?");
                $prevItems->execute([$id]);
                foreach ($prevItems->fetchAll() as $prev) {
                    $delta = (floatval($prev['kilos_estimados']) > 0) ? floatval($prev['kilos_estimados']) : floatval($prev['cantidad']);
                    $db->prepare("UPDATE productos SET stock_actual = stock_actual - ? WHERE id=?")->execute([$delta, $prev['producto_id']]);
                }
                // Borrar detalle viejo
                $db->prepare("DELETE FROM detalle_compra WHERE compra_id=?")->execute([$id]);

                // Insertar nuevo detalle
                foreach ($body['items'] as $item) {
                    $s = $db->prepare("INSERT INTO detalle_compra (compra_id,producto_id,cantidad,precio_unitario,kilos_estimados) VALUES (?,?,?,?,?)");
                    $s->execute([$id, $item['producto_id'], $item['cantidad'], $item['precio_unitario'], $item['kilos_estimados'] ?? null]);

                    $stockDelta = (isset($item['kilos_estimados']) && floatval($item['kilos_estimados']) > 0)
                        ? floatval($item['kilos_estimados'])
                        : floatval($item['cantidad']);
                    $db->prepare("UPDATE productos SET precio_compra=?, stock_actual = stock_actual + ? WHERE id=?")
                       ->execute([$item['precio_unitario'], $stockDelta, $item['producto_id']]);
                }
            }

            // Reeditar gastos si vienen
            if (isset($body['gastos'])) {
                $db->prepare("DELETE FROM gastos_compra WHERE compra_id=?")->execute([$id]);
                foreach ($body['gastos'] as $gasto) {
                    $sg = $db->prepare("INSERT INTO gastos_compra (compra_id,tipo_gasto_id,monto,descripcion,fecha) VALUES (?,?,?,?,?)");
                    $sg->execute([$id, $gasto['tipo_gasto_id'], $gasto['monto'], $gasto['descripcion'] ?? null, $gasto['fecha'] ?? date('Y-m-d')]);
                }
            }

            $db->commit();
            jsonResponse(true, null, 'Compra actualizada');
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
}

/* ══════════════════════════════════════════════════════
   VENTAS
══════════════════════════════════════════════════════ */
function handleVentas(string $method, string $action, ?int $id): void {
    $db = getDB();

    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare("
                SELECT v.*, COALESCE(c.nombre,'Sin cliente') AS cliente_nombre, c.telefono AS cliente_tel,
                       DATE_FORMAT(v.fecha_venta,'%d/%m/%Y %H:%i') AS fecha_fmt
                FROM ventas v
                LEFT JOIN clientes c ON c.id = v.cliente_id
                WHERE v.id=?
            ");
            $stmt->execute([$id]);
            $venta = $stmt->fetch();

            $stmt2 = $db->prepare("SELECT dv.*, p.nombre AS producto, p.unidad_medida FROM detalle_venta dv JOIN productos p ON p.id=dv.producto_id WHERE dv.venta_id=?");
            $stmt2->execute([$id]);
            $venta['items'] = $stmt2->fetchAll();

            $stmt3 = $db->prepare("SELECT * FROM pagos WHERE venta_id=? ORDER BY fecha_pago DESC");
            $stmt3->execute([$id]);
            $venta['pagos'] = $stmt3->fetchAll();

            jsonResponse(true, $venta);
        }

        // Filtros
        $where = ['1=1'];
        $params = [];
        if (!empty($_GET['estado_pago']))   { $where[] = 'v.estado_pago=?';   $params[] = $_GET['estado_pago']; }
        if (!empty($_GET['estado_pedido'])) { $where[] = 'v.estado_pedido=?'; $params[] = $_GET['estado_pedido']; }
        if (!empty($_GET['cliente_id']))    { $where[] = 'v.cliente_id=?';    $params[] = (int)$_GET['cliente_id']; }
        if (!empty($_GET['fecha_desde']))   { $where[] = 'DATE(v.fecha_venta) >= ?'; $params[] = $_GET['fecha_desde']; }
        if (!empty($_GET['fecha_hasta']))   { $where[] = 'DATE(v.fecha_venta) <= ?'; $params[] = $_GET['fecha_hasta']; }

        $sql = "SELECT v.id, COALESCE(c.nombre,'Sin cliente') AS cliente,
                       DATE_FORMAT(v.fecha_venta,'%d/%m/%Y') AS fecha,
                       v.total, v.total_pagado, v.saldo_pendiente,
                       v.estado_pago, v.estado_pedido
                FROM ventas v
                LEFT JOIN clientes c ON c.id = v.cliente_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY v.id DESC LIMIT 100";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse(true, $stmt->fetchAll());
    }

    $body = getJsonBody();

    if ($method === 'POST') {
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("INSERT INTO ventas (cliente_id,fecha_entrega,observaciones,estado_pedido) VALUES (?,?,?,?)");
            $stmt->execute([
                $body['cliente_id']    ?? null,
                $body['fecha_entrega'] ?? null,
                $body['observaciones'] ?? null,
                $body['estado_pedido'] ?? 'nuevo',
            ]);
            $ventaId = $db->lastInsertId();

            foreach (($body['items'] ?? []) as $item) {
                $stmt2 = $db->prepare("INSERT INTO detalle_venta (venta_id,producto_id,cantidad,precio_unitario) VALUES (?,?,?,?)");
                $stmt2->execute([$ventaId, $item['producto_id'], $item['cantidad'], $item['precio_unitario']]);

                // Reducir stock
                $stmt3 = $db->prepare("UPDATE productos SET stock_actual = stock_actual - ? WHERE id=?");
                $stmt3->execute([$item['cantidad'], $item['producto_id']]);
            }

            // Gastos de reparto si los hay
            foreach (($body['gastos_reparto'] ?? []) as $gr) {
                $stmt4 = $db->prepare("INSERT INTO gastos_reparto (venta_id,tipo_gasto_id,monto,descripcion,fecha) VALUES (?,?,?,?,?)");
                $stmt4->execute([$ventaId, $gr['tipo_gasto_id'], $gr['monto'], $gr['descripcion'] ?? null, date('Y-m-d')]);
            }

            // Pago inicial si lo hay
            if (!empty($body['pago_inicial']) && (float)$body['pago_inicial']['monto'] > 0) {
                $p = $body['pago_inicial'];
                $stmt5 = $db->prepare("INSERT INTO pagos (venta_id,monto,medio_pago,destino_dinero,referencia,notas,fecha_vencimiento) VALUES (?,?,?,?,?,?,?)");
                $stmt5->execute([
                    $ventaId, $p['monto'], $p['medio_pago'], $p['destino_dinero'],
                    $p['referencia'] ?? null, $p['notas'] ?? null, $p['fecha_vencimiento'] ?? null
                ]);
            }

            $db->commit();
            jsonResponse(true, ['id' => $ventaId], 'Venta registrada exitosamente');
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // ── PUT: editar venta completa ──────────────────────────────────────────
    if ($method === 'PUT' && $id) {
        $body = getJsonBody();
        $db->beginTransaction();
        try {
            $campos = []; $vals = [];
            if (isset($body['estado_pedido'])) { $campos[] = 'estado_pedido=?'; $vals[] = $body['estado_pedido']; }
            if (isset($body['observaciones'])) { $campos[] = 'observaciones=?'; $vals[] = $body['observaciones']; }
            if (isset($body['cliente_id']))    { $campos[] = 'cliente_id=?';    $vals[] = $body['cliente_id'] ?: null; }
            if (isset($body['fecha_entrega'])) { $campos[] = 'fecha_entrega=?'; $vals[] = $body['fecha_entrega'] ?: null; }

            if ($campos) {
                $vals[] = $id;
                $db->prepare("UPDATE ventas SET " . implode(',', $campos) . " WHERE id=?")->execute($vals);
            }

            // Re-editar items si vienen
            if (!empty($body['items'])) {
                // Revertir stock descontado anteriormente
                $prev = $db->prepare("SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id=?");
                $prev->execute([$id]);
                foreach ($prev->fetchAll() as $p) {
                    $db->prepare("UPDATE productos SET stock_actual = stock_actual + ? WHERE id=?")
                       ->execute([$p['cantidad'], $p['producto_id']]);
                }
                $db->prepare("DELETE FROM detalle_venta WHERE venta_id=?")->execute([$id]);

                foreach ($body['items'] as $item) {
                    $db->prepare("INSERT INTO detalle_venta (venta_id,producto_id,cantidad,precio_unitario) VALUES (?,?,?,?)")
                       ->execute([$id, $item['producto_id'], $item['cantidad'], $item['precio_unitario']]);
                    $db->prepare("UPDATE productos SET stock_actual = stock_actual - ? WHERE id=?")
                       ->execute([$item['cantidad'], $item['producto_id']]);
                }
            }

            $db->commit();
            jsonResponse(true, null, 'Venta actualizada');
        } catch (Exception $e) { $db->rollBack(); throw $e; }
    }

    // ── DELETE: anular/eliminar venta ───────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $db->beginTransaction();
        try {
            // Verificar que no tenga pagos — si los tiene, solo se puede cancelar
            $pagos = $db->prepare("SELECT COUNT(*) AS n FROM pagos WHERE venta_id=?");
            $pagos->execute([$id]);
            $tienePagos = (int)$pagos->fetch()['n'] > 0;

            if ($tienePagos) {
                // Tiene pagos: solo marcar como cancelada, no borrar
                $db->prepare("UPDATE ventas SET estado_pedido='cancelado' WHERE id=?")->execute([$id]);
                $db->commit();
                jsonResponse(true, ['accion' => 'cancelada'], 'Venta marcada como cancelada (tiene pagos registrados)');
            } else {
                // Sin pagos: eliminar y revertir stock
                $items = $db->prepare("SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id=?");
                $items->execute([$id]);
                foreach ($items->fetchAll() as $it) {
                    $db->prepare("UPDATE productos SET stock_actual = stock_actual + ? WHERE id=?")
                       ->execute([$it['cantidad'], $it['producto_id']]);
                }
                // Cascade borra detalle_venta, pagos, gastos_reparto (definido en schema)
                $db->prepare("DELETE FROM ventas WHERE id=?")->execute([$id]);
                $db->commit();
                jsonResponse(true, ['accion' => 'eliminada'], 'Venta eliminada y stock revertido');
            }
        } catch (Exception $e) { $db->rollBack(); throw $e; }
    }
}

/* ══════════════════════════════════════════════════════
   PAGOS (abonos)
══════════════════════════════════════════════════════ */
function handlePagos(string $method, string $action, ?int $id): void {
    $db = getDB();

    if ($method === 'GET') {
        // Pagos de una venta específica
        if (!empty($_GET['venta_id'])) {
            $stmt = $db->prepare("SELECT * FROM pagos WHERE venta_id=? ORDER BY fecha_pago DESC");
            $stmt->execute([(int)$_GET['venta_id']]);
            jsonResponse(true, $stmt->fetchAll());
        }
        // Pagos del día
        $fecha = $_GET['fecha'] ?? date('Y-m-d');
        $stmt  = $db->prepare("
            SELECT p.*, COALESCE(c.nombre,'Sin cliente') AS cliente,
                   v.total AS venta_total
            FROM pagos p
            JOIN ventas v ON v.id = p.venta_id
            LEFT JOIN clientes c ON c.id = v.cliente_id
            WHERE DATE(p.fecha_pago) = ?
            ORDER BY p.fecha_pago DESC
        ");
        $stmt->execute([$fecha]);
        jsonResponse(true, $stmt->fetchAll());
    }

    $body = getJsonBody();
    if ($method === 'POST') {
        // Verificar que no exceda el saldo pendiente
        $stmt = $db->prepare("SELECT saldo_pendiente FROM ventas WHERE id=?");
        $stmt->execute([$body['venta_id']]);
        $venta = $stmt->fetch();
        if (!$venta) throw new Exception('Venta no encontrada');

        $monto = (float)$body['monto'];
        if ($monto <= 0) throw new Exception('Monto inválido');
        if ($monto > (float)$venta['saldo_pendiente'] + 0.01) {
            throw new Exception('El monto excede el saldo pendiente de ' . number_format($venta['saldo_pendiente'], 0, ',', '.'));
        }

        $stmt2 = $db->prepare("INSERT INTO pagos (venta_id,monto,medio_pago,destino_dinero,referencia,notas,fecha_vencimiento) VALUES (?,?,?,?,?,?,?)");
        $stmt2->execute([
            $body['venta_id'], $monto, $body['medio_pago'], $body['destino_dinero'],
            $body['referencia'] ?? null, $body['notas'] ?? null, $body['fecha_vencimiento'] ?? null
        ]);
        jsonResponse(true, ['id' => $db->lastInsertId()], 'Pago registrado');
    }
}

/* ══════════════════════════════════════════════════════
   GASTOS (independientes / operativos)
══════════════════════════════════════════════════════ */
function handleGastos(string $method, string $action, ?int $id): void {
    $db = getDB();
    if ($method === 'GET') {
        $rows = $db->query("
            SELECT gr.*, tg.nombre AS tipo, tg.categoria,
                   COALESCE(c.nombre,'General') AS cliente
            FROM gastos_reparto gr
            JOIN tipos_gasto tg ON tg.id = gr.tipo_gasto_id
            LEFT JOIN ventas v ON v.id = gr.venta_id
            LEFT JOIN clientes c ON c.id = v.cliente_id
            ORDER BY gr.fecha DESC LIMIT 50
        ")->fetchAll();
        jsonResponse(true, $rows);
    }
}

/* ══════════════════════════════════════════════════════
   CARTERA (cuentas por cobrar)
══════════════════════════════════════════════════════ */
function handleCartera(): void {
    $db = getDB();
    $rows = $db->query("SELECT * FROM v_cartera ORDER BY saldo_total DESC")->fetchAll();
    // Ventas vencidas (fiado sin pagar en fecha)
    $vencidas = $db->query("
        SELECT v.id AS venta_id, COALESCE(c.nombre,'Sin cliente') AS cliente,
               p.fecha_vencimiento, p.monto AS abonado, v.saldo_pendiente,
               DATEDIFF(CURDATE(), p.fecha_vencimiento) AS dias_vencido
        FROM pagos p
        JOIN ventas v ON v.id = p.venta_id
        LEFT JOIN clientes c ON c.id = v.cliente_id
        WHERE p.fecha_vencimiento IS NOT NULL
          AND p.fecha_vencimiento < CURDATE()
          AND v.saldo_pendiente > 0
        ORDER BY dias_vencido DESC
    ")->fetchAll();
    jsonResponse(true, ['cartera' => $rows, 'vencidas' => $vencidas]);
}

/* ══════════════════════════════════════════════════════
   CAJA / FLUJO DE DINERO
══════════════════════════════════════════════════════ */
function handleCaja(): void {
    $db = getDB();
    $desde = $_GET['desde'] ?? date('Y-m-01');
    $hasta = $_GET['hasta'] ?? date('Y-m-d');

    $movimientos = $db->query("SELECT * FROM v_caja WHERE fecha BETWEEN '$desde' AND '$hasta' ORDER BY fecha DESC")->fetchAll();

    // Saldo total por destino
    $saldos = $db->query("
        SELECT destino_dinero,
               SUM(monto) AS total,
               COUNT(*) AS transacciones
        FROM pagos
        GROUP BY destino_dinero
    ")->fetchAll();

    // Ingresos vs inversión del período
    $flujo = $db->prepare("
        SELECT
          (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE DATE(fecha_pago) BETWEEN ? AND ?)   AS ingresos,
          (SELECT COALESCE(SUM(total_inversion),0) FROM compras WHERE fecha_compra BETWEEN ? AND ?) AS inversiones
    ");
    $flujo->execute([$desde, $hasta, $desde, $hasta]);

    jsonResponse(true, [
        'movimientos' => $movimientos,
        'saldos'      => $saldos,
        'flujo'       => $flujo->fetch(),
        'periodo'     => ['desde' => $desde, 'hasta' => $hasta],
    ]);
}

/* ══════════════════════════════════════════════════════
   HELPERS: Tipos de gasto y categorías
══════════════════════════════════════════════════════ */
function handleTiposGasto(): void {
    jsonResponse(true, getDB()->query("SELECT * FROM tipos_gasto ORDER BY categoria, nombre")->fetchAll());
}

function handleCategorias(): void {
    jsonResponse(true, getDB()->query("SELECT * FROM categorias WHERE activo=1")->fetchAll());
}
