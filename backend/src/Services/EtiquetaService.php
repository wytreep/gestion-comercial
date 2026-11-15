<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Repositories\EtiquetaRepository;
use App\Repositories\ProductoRepository;

final class EtiquetaService extends BaseService
{
    public const TIPOS = ['producto', 'canasta', 'lote'];

    private const MAX_COPIAS = 50;

    public function __construct(
        private readonly EtiquetaRepository  $repo,
        private readonly ProductoRepository  $productoRepo,
    ) {}

    /**
     * Genera una o varias etiquetas. Devuelve siempre una lista: el cliente
     * imprime las copias y necesita el código de cada una.
     *
     * @return array<int, array>
     */
    public function crear(array $data, ?int $usuarioId = null): array
    {
        $productoId = (int) ($data['producto_id'] ?? 0);
        if ($productoId <= 0) {
            throw new ValidationException(['producto_id' => 'Selecciona un producto.']);
        }

        $producto = $this->productoRepo->findRaw($productoId);
        if ($producto === null) throw new NotFoundException('Producto');
        if ((int) $producto['activo'] !== 1) {
            throw new BusinessException('El producto está inactivo y no se puede etiquetar.');
        }

        $tipo = (string) ($data['tipo'] ?? 'producto');
        if (!in_array($tipo, self::TIPOS, true)) {
            throw new ValidationException(['tipo' => 'El tipo debe ser producto, canasta o lote.']);
        }

        $peso = $this->peso($data, $tipo, $producto);
        $lote = trim((string) ($data['lote'] ?? ''));

        if ($tipo === 'lote' && $lote === '') {
            throw new ValidationException(['lote' => 'Indica el identificador del lote.']);
        }
        if (mb_strlen($lote) > 40) {
            throw new ValidationException(['lote' => 'El lote admite máximo 40 caracteres.']);
        }

        $fecha = $this->fecha($data['fecha_empaque'] ?? null);
        $copias = max(1, min(self::MAX_COPIAS, (int) ($data['copias'] ?? 1)));

        $ids = [];
        for ($i = 0; $i < $copias; $i++) {
            $ids[] = $this->repo->crear([
                'codigo'        => $this->generarCodigo(),
                'tipo'          => $tipo,
                'producto_id'   => $productoId,
                'peso_kg'       => $peso,
                'lote'          => $lote !== '' ? $lote : null,
                'fecha_empaque' => $fecha,
                'usuario_id'    => $usuarioId,
            ]);
        }

        return array_map(fn(int $id): array => $this->obtenerPorId($id), $ids);
    }

    public function listar(array $filtros): array
    {
        return array_map(
            fn(array $e): array => self::formatear($e),
            $this->repo->listar($filtros)
        );
    }

    public function obtener(string $codigo): array
    {
        $etiqueta = $this->repo->findByCodigo($codigo);
        if ($etiqueta === null) throw new NotFoundException('Etiqueta');

        return self::formatear($etiqueta);
    }

    public function anular(string $codigo): array
    {
        $etiqueta = $this->repo->findByCodigo($codigo);
        if ($etiqueta === null) throw new NotFoundException('Etiqueta');

        if ($etiqueta['estado'] === 'anulada') {
            throw new BusinessException('La etiqueta ya está anulada.');
        }

        $this->repo->anular((int) $etiqueta['id']);

        return $this->obtener($codigo);
    }

    /**
     * Resuelve una etiqueta activa para el escáner. Devuelve null cuando el
     * código no es una etiqueta, para que el llamador siga con el producto.
     */
    public function activaPorCodigo(string $codigo): ?array
    {
        $etiqueta = $this->repo->findByCodigo($codigo);
        if ($etiqueta === null) return null;

        if ($etiqueta['estado'] !== 'activa') {
            throw new BusinessException('La etiqueta fue anulada.');
        }

        return self::formatear($etiqueta);
    }

    public static function formatear(array $e): array
    {
        return [
            'id'              => (int) $e['id'],
            'codigo'          => $e['codigo'],
            'tipo'            => $e['tipo'],
            'producto_id'     => (int) $e['producto_id'],
            'producto'        => $e['producto'] ?? null,
            'codigo_producto' => $e['codigo_producto'] ?? null,
            'unidad_medida'   => $e['unidad_medida'] ?? null,
            'precio_venta'    => isset($e['precio_venta']) ? (float) $e['precio_venta'] : null,
            'peso_kg'         => $e['peso_kg'] !== null ? (float) $e['peso_kg'] : null,
            'lote'            => $e['lote'] !== null ? (string) $e['lote'] : null,
            'fecha_empaque'   => $e['fecha_empaque'],
            'estado'          => $e['estado'],
            'usuario_id'      => $e['usuario_id'] !== null ? (int) $e['usuario_id'] : null,
            'usuario'         => $e['usuario'] ?? null,
            'created_at'      => $e['created_at'],
            'contenido_qr'    => $e['codigo'],
        ];
    }

    private function peso(array $data, string $tipo, array $producto): ?float
    {
        $peso = isset($data['peso_kg']) && $data['peso_kg'] !== ''
            ? round((float) $data['peso_kg'], 3)
            : null;

        if ($tipo === 'canasta' && ($peso === null || $peso <= 0)) {
            $porDefecto = (float) ($producto['kilos_por_canasta'] ?? 0);
            if ($porDefecto > 0) {
                return round($porDefecto, 3);
            }

            throw new ValidationException(['peso_kg' => 'Indica el peso de la canasta en kg.']);
        }

        if ($peso !== null && $peso <= 0) {
            throw new ValidationException(['peso_kg' => 'El peso debe ser mayor a cero.']);
        }

        if ($peso !== null && $peso > 99999.999) {
            throw new ValidationException(['peso_kg' => 'El peso excede el máximo permitido.']);
        }

        return $peso;
    }

    private function fecha(mixed $valor): string
    {
        $fecha = trim((string) ($valor ?? ''));
        if ($fecha === '') return date('Y-m-d');

        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
        if ($parsed === false || $parsed->format('Y-m-d') !== $fecha) {
            throw new ValidationException(['fecha_empaque' => 'La fecha debe tener el formato AAAA-MM-DD.']);
        }

        return $fecha;
    }

    private function generarCodigo(): string
    {
        for ($intento = 0; $intento < 8; $intento++) {
            $codigo = 'GCOM-E-' . strtoupper(bin2hex(random_bytes(5)));
            if (!$this->repo->existeCodigo($codigo)) {
                return $codigo;
            }
        }

        throw new BusinessException('No se pudo generar un código único. Intenta de nuevo.');
    }

    private function obtenerPorId(int $id): array
    {
        $etiqueta = $this->repo->findById($id);
        if ($etiqueta === null) throw new NotFoundException('Etiqueta');

        return self::formatear($etiqueta);
    }
}
