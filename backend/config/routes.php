<?php

declare(strict_types=1);

use App\Controllers\{
    AuthController,
    DashboardController,
    VentaController,
    CompraController,
    ProductoController,
    CategoriaController,
    ClienteController,
    NotificacionController,
    ReporteController,
    BackupController,
    CajaController,
    CarteraController,
    FinanzasController,
    CobroQrController,
    EtiquetaController,
    SecurityController
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
    FinanzasService,
    CobroQrService,
    EtiquetaService,
    ProductoService,
    CategoriaService,
    ClienteService
};
use App\Repositories\{
    ProductoRepository,
    CategoriaRepository,
    VentaRepository,
    CompraRepository,
    ClienteRepository,
    CobroQrRepository,
    EtiquetaRepository
};
use App\Middleware\{AuthMiddleware, RoleMiddleware};
use App\Core\Database;

// ── Instancias ────────────────────────────────────────
$db = Database::getInstance();
$throttle = new LoginThrottleService();
$authService = new AuthService($throttle);
$stockService = new StockService();
$notifService = new NotificacionService();
$productoRepo = new ProductoRepository();
$categoriaService = new CategoriaService(new CategoriaRepository());
$productoService = new ProductoService($productoRepo, $categoriaService, $stockService, $db);
$etiquetaService = new EtiquetaService(new EtiquetaRepository(), $productoRepo);

$authMiddleware = new AuthMiddleware($authService);
$roleMiddleware = new RoleMiddleware();

// Controllers
$authCtrl = new AuthController($authService);
$securityCtrl = new SecurityController($authService, $throttle);
$dashCtrl = new DashboardController(new DashboardService(), $notifService);
$ventaRepo = new VentaRepository();
$ventaService = new VentaService($ventaRepo, $productoRepo, new ClienteRepository(), $stockService, $db);
$ventaCtrl = new VentaController($ventaService);
$cobroQrCtrl = new CobroQrController(new CobroQrService(new CobroQrRepository(), $ventaRepo, $ventaService, $db));
$compraCtrl = new CompraController(new CompraService(new CompraRepository(), $productoRepo, $stockService, $db));
$prodCtrl = new ProductoController($productoService, $etiquetaService, $stockService);
$categoriaCtrl = new CategoriaController($categoriaService);
$etiquetaCtrl = new EtiquetaController($etiquetaService);
$clienteCtrl = new ClienteController(new ClienteService(new ClienteRepository()));
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
$router->get('/api/v1/auth/estado-ip', [$authCtrl, 'estadoIp']);
$router->post('/api/v1/auth/logout', $protect([$authCtrl, 'logout']));
$router->post('/api/v1/auth/seguridad', $protect([$authCtrl, 'verificarSeguridad']));

// ── Panel de seguridad (admin + re-autenticación) ─────────
$router->get('/api/v1/admin/seguridad/sesiones', $protect([$securityCtrl, 'sesiones'], $adminOnly));
$router->delete('/api/v1/admin/seguridad/sesiones/{id}', $protect([$securityCtrl, 'revocarSesion'], $adminOnly));
$router->get('/api/v1/admin/seguridad/bloqueos', $protect([$securityCtrl, 'bloqueos'], $adminOnly));
$router->get('/api/v1/admin/seguridad/eventos', $protect([$securityCtrl, 'eventos'], $adminOnly));
$router->post('/api/v1/admin/seguridad/desbloquear', $protect([$securityCtrl, 'desbloquear'], $adminOnly));
$router->post('/api/v1/admin/seguridad/bloquear', $protect([$securityCtrl, 'bloquear'], $adminOnly));

// ── Dashboard ─────────────────────────────────────────
$router->get('/api/v1/dashboard', $protect([$dashCtrl, 'index']));

// ── Productos (estáticas primero, luego {id}) ─────────
$router->get('/api/v1/productos', $protect([$prodCtrl, 'index']));
$router->get('/api/v1/productos/codigo/{codigo}', $protect([$prodCtrl, 'showByCodigo']));
$router->get('/api/v1/productos/{id}', $protect([$prodCtrl, 'show']));
$router->post('/api/v1/productos', $protect([$prodCtrl, 'store'], $adminOnly));
$router->put('/api/v1/productos/{id}', $protect([$prodCtrl, 'update'], $adminOnly));
$router->delete('/api/v1/productos/{id}', $protect([$prodCtrl, 'destroy'], $adminOnly));
$router->patch('/api/v1/productos/{id}/reactivar', $protect([$prodCtrl, 'reactivar'], $adminOnly));
$router->put('/api/v1/productos/{id}/precio', $protect([$prodCtrl, 'updatePrecio'], $adminOnly));
$router->get('/api/v1/productos/{id}/historial', $protect([$prodCtrl, 'historial'], $adminOnly));
$router->patch('/api/v1/productos/{id}/stock', $protect([$prodCtrl, 'ajustarStock'], $adminOnly));

// ── Categorías ────────────────────────────────────────
$router->get('/api/v1/categorias', $protect([$categoriaCtrl, 'index']));
$router->post('/api/v1/categorias', $protect([$categoriaCtrl, 'store'], $adminOnly));

// ── Stock ─────────────────────────────────────────────
$router->get('/api/v1/stock/movimientos', $protect([$prodCtrl, 'movimientos']));

// ── Etiquetas QR (Fase 1.3) ───────────────────────────
$router->get('/api/v1/etiquetas', $protect([$etiquetaCtrl, 'index']));
$router->post('/api/v1/etiquetas', $protect([$etiquetaCtrl, 'store'], $noReadonly));
$router->get('/api/v1/etiquetas/{codigo}', $protect([$etiquetaCtrl, 'show']));
$router->post('/api/v1/etiquetas/{codigo}/anular', $protect([$etiquetaCtrl, 'anular'], $noReadonly));

// ── Ventas (estáticas primero) ────────────────────────
$router->get('/api/v1/ventas', $protect([$ventaCtrl, 'index']));
$router->post('/api/v1/ventas', $protect([$ventaCtrl, 'store'], $noReadonly));
$router->get('/api/v1/ventas/{id}', $protect([$ventaCtrl, 'show']));
$router->put('/api/v1/ventas/{id}', $protect([$ventaCtrl, 'update'], $noReadonly));
$router->delete('/api/v1/ventas/{id}', $protect([$ventaCtrl, 'destroy'], $adminOnly));
$router->post('/api/v1/ventas/{id}/pagos', $protect([$ventaCtrl, 'storePago'], $noReadonly));

// ── Cobro con QR (Fase 1.2) ───────────────────────────
$router->get('/api/v1/ventas/{id}/cobros-qr', $protect([$cobroQrCtrl, 'index']));
$router->post('/api/v1/ventas/{id}/cobros-qr', $protect([$cobroQrCtrl, 'store'], $noReadonly));
$router->get('/api/v1/cobros-qr/{codigo}', $protect([$cobroQrCtrl, 'show']));
$router->post('/api/v1/cobros-qr/{codigo}/confirmar', $protect([$cobroQrCtrl, 'confirmar'], $noReadonly));
$router->post('/api/v1/cobros-qr/{codigo}/anular', $protect([$cobroQrCtrl, 'anular'], $noReadonly));

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
$router->patch('/api/v1/auth/preferencias', $protect([$authCtrl, 'preferencias']));
