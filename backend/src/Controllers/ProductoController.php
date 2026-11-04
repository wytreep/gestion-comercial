<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Repositories\ProductoRepository;
use App\Services\StockService;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;

final class ProductoController extends BaseController
{
    public function __construct(
        private readonly ProductoRepository $repo,
        private readonly StockService       $stockSvc,
    ) {}

    public function index(Request $r): Response { return Response::ok($this->sinCostos($this->repo->findAll(), $r)); }

    public function show(Request $r): Response
    {
        $p = $this->repo->findById($this->routeId($r));
        return Response::ok($p === null ? null : $this->sinCostos([$p], $r)[0]);
    }

    public function showByCodigo(Request $r): Response
    {
        $p = $this->repo->findByCodigo((string) $r->param('codigo'));
        if ($p === null || (int) ($p['activo'] ?? 0) !== 1) {
            throw new NotFoundException('Producto');
        }
        return Response::ok($this->sinCostos([$p], $r)[0]);
    }

    /**
     * Oculta el costo y el margen a los roles que no son administración.
     * El vendedor solo necesita precio de venta, unidad y stock.
     */
    private function sinCostos(array $productos, Request $r): array
    {
        if ($r->authRol() === 'admin') {
            return $productos;
        }
        foreach ($productos as &$p) {
            unset($p['precio_compra'], $p['costo_por_kg'], $p['margen_porcentaje']);
        }
        unset($p);
        return $productos;
    }

    public function updatePrecio(Request $r): Response
    {
        $id = $this->routeId($r);
        $this->requireFields($r, 'precio_compra', 'precio_venta');
        $pc  = (float)$r->input('precio_compra');
        $pv  = (float)$r->input('precio_venta');
        $kpc = $r->input('kilos_por_canasta') !== null ? (float)$r->input('kilos_por_canasta') : null;
        if ($pc <= 0 || $pv <= 0) throw new ValidationException(['precio' => 'Los precios deben ser mayores a cero.']);
        $this->repo->insertHistorialPrecio($id, $pc, $pv, $r->input('motivo'));
        $this->repo->updatePrecio($id, $pc, $pv, $kpc);
        return Response::ok($this->repo->findById($id), 'Precio actualizado');
    }

    public function historial(Request $r): Response
    {
        return Response::ok($this->repo->historialPrecios($this->routeId($r)));
    }

    public function ajustarStock(Request $r): Response
    {
        $id = $this->routeId($r);
        $this->requireFields($r, 'cantidad');
        $cantidad = (float)$r->input('cantidad');
        if ($cantidad === 0.0) throw new ValidationException(['cantidad' => 'La cantidad no puede ser cero.']);
        $this->stockSvc->registrar($id, $cantidad, 'ajuste_manual', $r->input('motivo') ?? 'Ajuste manual', null, $r->authUser()['sub'] ?? null);
        return Response::ok(null, 'Stock ajustado');
    }

    public function movimientos(Request $r): Response
    {
        return Response::ok($this->stockSvc->historialGeneral());
    }
}
