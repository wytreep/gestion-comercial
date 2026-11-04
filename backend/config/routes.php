<?php

declare(strict_types=1);

use App\Controllers\{
    AuthController,
    DashboardController,
    VentaController,
    CompraController,
    ProductoController,
    ClienteController,
    NotificacionController,
    ReporteController,
    BackupController,
    CajaController,
    CarteraController,
    FinanzasController
};
use App\Services\{
    AuthService,
    LoginThrottleService,
    VentaService,
    CompraService,
    DashboardService,
    StockService,
    NotificacionService,
    ReporteService,
    BackupService,
    CajaService,
    CarteraService,
    FinanzasService
};
use App\Repositories\{ProductoRepository, VentaRepository, CompraRepository, ClienteRepository};
use App\Middleware\{AuthMiddleware, RoleMiddleware};
use App\Core\Database;

// ── Instancias ────────────────────────────────────────
$db = Database::getInstance();
$authService = new AuthService(new LoginThrottleService());
$stockService = new StockService();
$notifService = new NotificacionService();

$authMiddleware = new AuthMiddleware($authService);
$roleMiddleware = new RoleMiddleware();

// Controllers
$authCtrl = new AuthController($authService);
$dashCtrl = new DashboardController(new DashboardService(), $notifService);
$ventaCtrl = new VentaController(new VentaService(new VentaRepository(), new ProductoRepository(), new ClienteRepository(), $stockService, $db));
$compraCtrl = new CompraController(new CompraService(new CompraRepository(), new ProductoRepository(), $stockService, $db));
$prodCtrl = new ProductoController(new ProductoRepository(), $stockService);
$clienteCtrl = new ClienteController();
$notifCtrl = new NotificacionController($notifService);
$reporteCtrl = new ReporteController(new ReporteService());
$backupCtrl = new BackupController(new BackupService());
$cajaCtrl = new CajaController(new CajaService());
$carteraCtrl = new CarteraController(new CarteraService());
$finanzasCtrl = new FinanzasController(new FinanzasService());

// ── Pipeline de middlewares ───────────────────────────
$protect = function (callable $handler, ?callable $roleCheck = null) use ($authMiddleware): callable {
    return function ($req) use ($handler, $authMiddleware, $roleCheck) {
        return $authMiddleware($req, function ($req) use ($handler, $roleCheck) {
            if ($roleCheck) {
                return $roleCheck($req, $handler);
            }
            return $handler($req);
        });
    };
};

$adminOnly = $roleMiddleware->require('admin');
$noReadonly = $roleMiddleware->require('admin', 'vendedor');

// ── Rutas públicas ────────────────────────────────────
$router->post('/api/v1/auth/login', [$authCtrl, 'login']);
$router->post('/api/v1/auth/refresh', [$authCtrl, 'refresh']);

// ── Dashboard ─────────────────────────────────────────
$router->get('/api/v1/dashboard', $protect([$dashCtrl, 'index']));

// ── Productos (estáticas primero, luego {id}) ─────────
$router->get('/api/v1/productos', $protect([$prodCtrl, 'index']));
$router->get('/api/v1/productos/codigo/{codigo}', $protect([$prodCtrl, 'showByCodigo']));
$router->get('/api/v1/productos/{id}', $protect([$prodCtrl, 'show']));
$router->put('/api/v1/productos/{id}/precio', $protect([$prodCtrl, 'updatePrecio'], $adminOnly));
$router->get('/api/v1/productos/{id}/historial', $protect([$prodCtrl, 'historial'], $adminOnly));
$router->patch('/api/v1/productos/{id}/stock', $protect([$prodCtrl, 'ajustarStock'], $adminOnly));

// ── Stock ─────────────────────────────────────────────
$router->get('/api/v1/stock/movimientos', $protect([$prodCtrl, 'movimientos']));

// ── Ventas (estáticas primero) ────────────────────────
$router->get('/api/v1/ventas', $protect([$ventaCtrl, 'index']));
$router->post('/api/v1/ventas', $protect([$ventaCtrl, 'store'], $noReadonly));
$router->get('/api/v1/ventas/{id}', $protect([$ventaCtrl, 'show']));
$router->put('/api/v1/ventas/{id}', $protect([$ventaCtrl, 'update'], $noReadonly));
$router->delete('/api/v1/ventas/{id}', $protect([$ventaCtrl, 'destroy'], $adminOnly));
$router->post('/api/v1/ventas/{id}/pagos', $protect([$ventaCtrl, 'storePago'], $noReadonly));

// ── Compras (solo administración: afectan inventario y costos) ──
$router->get('/api/v1/compras', $protect([$compraCtrl, 'index'], $adminOnly));
$router->post('/api/v1/compras', $protect([$compraCtrl, 'store'], $adminOnly));
$router->get('/api/v1/compras/{id}', $protect([$compraCtrl, 'show'], $adminOnly));
$router->put('/api/v1/compras/{id}', $protect([$compraCtrl, 'update'], $adminOnly));
$router->patch('/api/v1/compras/{id}/estado', $protect([$compraCtrl, 'cambiarEstado'], $adminOnly));

// ── Clientes ──────────────────────────────────────────
$router->get('/api/v1/clientes', $protect([$clienteCtrl, 'index']));
$router->post('/api/v1/clientes', $protect([$clienteCtrl, 'store'], $noReadonly));
$router->put('/api/v1/clientes/{id}', $protect([$clienteCtrl, 'update'], $noReadonly));

$router->get('/api/v1/proveedores', $protect([$clienteCtrl, 'getProveedores']));
$router->get('/api/v1/tipos_gasto', $protect([$clienteCtrl, 'getTiposGasto']));
// ── Cartera ───────────────────────────────────────────
$router->get('/api/v1/cartera', $protect([$carteraCtrl, 'index']));

// ── Caja ─────────────────────────────────────────────
$router->get('/api/v1/caja', $protect([$cajaCtrl, 'index'], $adminOnly));

// ── Finanzas ─────────────────────────────────────────
$router->get('/api/v1/finanzas', $protect([$finanzasCtrl, 'index'], $adminOnly));

// ── Notificaciones (count/leer-todas ANTES de {id}) ──
$router->get('/api/v1/notificaciones', $protect([$notifCtrl, 'index']));
$router->get('/api/v1/notificaciones/count', $protect([$notifCtrl, 'count']));      // ← estática primero
$router->post('/api/v1/notificaciones/leer-todas', $protect([$notifCtrl, 'leerTodas']));  // ← estática primero
$router->patch('/api/v1/notificaciones/{id}/leer', $protect([$notifCtrl, 'leer']));       // ← dinámica después

// ── Reportes ─────────────────────────────────────────
$router->get('/api/v1/reportes/mensual', $protect([$reporteCtrl, 'mensualJson'], $adminOnly));
$router->get('/api/v1/reportes/mensual/pdf', $protect([$reporteCtrl, 'mensualPdf'], $adminOnly));

// ── Backup ────────────────────────────────────────────
$router->get('/api/v1/backup/generar', $protect([$backupCtrl, 'generar'], $adminOnly));
$router->get('/api/v1/backup/historial', $protect([$backupCtrl, 'historial'], $adminOnly));

// ── Usuarios ──────────────────────────────────────────
$router->get('/api/v1/usuarios', $protect([$authCtrl, 'listarUsuarios'], $adminOnly));
$router->post('/api/v1/auth/register', $protect([$authCtrl, 'register'], $adminOnly));
$router->patch('/api/v1/usuarios/{id}/rol', $protect([$authCtrl, 'cambiarRol'], $adminOnly));
$router->patch('/api/v1/usuarios/{id}/activo', $protect([$authCtrl, 'toggleActivo'], $adminOnly));
$router->post('/api/v1/auth/cambiar-password', $protect([$authCtrl, 'cambiarPassword']));
