<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\{Request, Response};
use App\Services\{EtiquetaService, ProductoService, StockService};
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;

final class ProductoController extends BaseController
{
    public function __construct(
        private readonly ProductoService $svc,
        private readonly EtiquetaService $etiquetaSvc,
        private readonly StockService    $stockSvc,
    ) {}

    public function index(Request $r): Response
    {
        $incluirInactivos = $r->authRol() === 'admin'
            && in_array($r->query('incluir_inactivos'), ['1', 'true', 'si'], true);

        return Response::ok($this->sinCostos($this->svc->listar($incluirInactivos), $r));
    }

    public function show(Request $r): Response
    {
        $p = $this->svc->detalle($this->routeId($r));
        return Response::ok($this->sinCostos([$p], $r)[0]);
    }

    public function showByCodigo(Request $r): Response
    {
        $codigo = (string) $r->param('codigo');

        // Una etiqueta resuelve al producto y añade peso, lote y fecha.
        $etiqueta = $this->etiquetaSvc->activaPorCodigo($codigo);
        if ($etiqueta !== null) {
            $p = $this->svc->detalle((int) $etiqueta['producto_id']);
            if ((int) ($p['activo'] ?? 0) !== 1) {
                throw new NotFoundException('Producto');
            }

            $p['etiqueta'] = $etiqueta;
            return Response::ok($this->sinCostos([$p], $r)[0]);
        }

        $p = $this->svc->porCodigo($codigo);
        if ($p === null || (int) ($p['activo'] ?? 0) !== 1) {
            throw new NotFoundException('Producto');
        }
        return Response::ok($this->sinCostos([$p], $r)[0]);
    }

    public function store(Request $r): Response
    {
        $p = $this->svc->crear($r->all(), $this->usuarioId($r));
        return Response::created($this->sinCostos([$p], $r)[0], 'Producto creado');
    }

    public function update(Request $r): Response
    {
        $p = $this->svc->actualizar($this->routeId($r), $r->all());
        return Response::ok($this->sinCostos([$p], $r)[0], 'Producto actualizado');
    }

    public function destroy(Request $r): Response
    {
        $p = $this->svc->desactivar($this->routeId($r));
        return Response::ok($this->sinCostos([$p], $r)[0], 'Producto desactivado');
    }

    public function reactivar(Request $r): Response
    {
        $p = $this->svc->reactivar($this->routeId($r));
        return Response::ok($this->sinCostos([$p], $r)[0], 'Producto reactivado');
    }

    public function updatePrecio(Request $r): Response
    {
        $p = $this->svc->actualizarPrecio($this->routeId($r), $r->all());
        return Response::ok($this->sinCostos([$p], $r)[0], 'Precio actualizado');
    }

    public function historial(Request $r): Response
    {
        return Response::ok($this->svc->historial($this->routeId($r)));
    }

    public function ajustarStock(Request $r): Response
    {
        $id = $this->routeId($r);
        $this->requireFields($r, 'cantidad');
        $cantidad = (float) $r->input('cantidad');
        if ($cantidad === 0.0) throw new ValidationException(['cantidad' => 'La cantidad no puede ser cero.']);
        $this->stockSvc->registrar($id, $cantidad, 'ajuste_manual', $r->input('motivo') ?? 'Ajuste manual', null, $this->usuarioId($r));
        return Response::ok(null, 'Stock ajustado');
    }

    public function movimientos(Request $r): Response
    {
        return Response::ok($this->stockSvc->historialGeneral());
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

    private function usuarioId(Request $r): ?int
    {
        $id = $r->authUser()['sub'] ?? null;

        return $id !== null ? (int) $id : null;
    }
}
