#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Auditoría estática ligera para Gestión Comercial.
 *
 * No sustituye a PHPStan: detecta los patrones que la semana 1 del plan debe
 * eliminar (tipado estricto, strings de rol, dinero en float) y deja una línea
 * base medible para comparar el avance.
 *
 * Uso:
 *   php tools/audit.php                 informe completo (siempre exit 0)
 *   php tools/audit.php --max=82        falla si hay más de 82 hallazgos (trinquete de CI)
 */

const COLOR_ROJO  = "\033[31m";
const COLOR_AMAR  = "\033[33m";
const COLOR_VERDE = "\033[32m";
const COLOR_GRIS  = "\033[90m";
const COLOR_FIN   = "\033[0m";

$raiz  = dirname(__DIR__);
$zonas = ['src', 'bin', 'public', 'config', 'tools'];

$archivos = [];
foreach ($zonas as $zona) {
    $ruta = $raiz . DIRECTORY_SEPARATOR . $zona;
    if (!is_dir($ruta)) {
        continue;
    }
    $iterador = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($ruta, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterador as $archivo) {
        // El propio auditor contiene los patrones que busca: se excluye para no
        // contar sus definiciones como hallazgos reales del proyecto.
        if ($archivo->isFile()
            && $archivo->getExtension() === 'php'
            && $archivo->getPathname() !== __FILE__
        ) {
            $archivos[] = $archivo->getPathname();
        }
    }
}
sort($archivos);

/** Umbral opcional: `--max=N` devuelve exit 1 si el total supera N. */
$maximo = null;
foreach (array_slice($argv ?? [], 1) as $argumento) {
    if (preg_match('/^--max=(\d+)$/', $argumento, $coincidencia) === 1) {
        $maximo = (int) $coincidencia[1];
    }
}

/**
 * Cada regla devuelve las coincidencias encontradas.
 *
 * @var array<string, array{descripcion: string, severidad: string, evaluar: callable}>
 */
$reglas = [
    'strict_types' => [
        'descripcion' => 'Archivos sin declare(strict_types=1)',
        'severidad'   => 'alta',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            if (str_contains($contenido, 'declare(strict_types=1)')) {
                return [];
            }
            return [[1, 'falta declare(strict_types=1)']];
        },
    ],
    'dinero_float' => [
        'descripcion' => 'Casts a float sobre campos monetarios (usar enteros en centavos)',
        'severidad'   => 'alta',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            return patron(
                $contenido,
                '/\((?:float|double)\)[^;\n]{0,40}(?:total|monto|saldo|precio|importe|costo|valor)/i'
            );
        },
    ],
    'tolerancia_dinero' => [
        'descripcion' => 'Comparaciones monetarias con tolerancia (0.01)',
        'severidad'   => 'alta',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            return patron($contenido, '/[<>]=?\s*[^;\n]*0\.01|0\.01\s*[<>]/');
        },
    ],
    'rol_magico' => [
        'descripcion' => 'Strings de rol fuera de RoleMiddleware (usar enum)',
        'severidad'   => 'media',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            // El enum es la fuente de los valores: ahí sí viven los strings.
            if (str_contains($ruta, 'Domain' . DIRECTORY_SEPARATOR . 'Rol.php')) {
                return [];
            }
            if (str_contains($ruta, 'Middleware' . DIRECTORY_SEPARATOR . 'RoleMiddleware.php')) {
                return [];
            }
            return patron($contenido, "/'(?:admin|vendedor|readonly)'/");
        },
    ],
    'select_estrella' => [
        'descripcion' => 'SELECT * (proyecta columnas explícitas)',
        'severidad'   => 'media',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            return patron($contenido, '/\bSELECT\s+\*/i');
        },
    ],
    'pdo_fuera_de_repositorio' => [
        'descripcion' => 'Acceso directo a PDO fuera de Core/Repositories',
        'severidad'   => 'media',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            if (str_contains($ruta, DIRECTORY_SEPARATOR . 'Core' . DIRECTORY_SEPARATOR)
                || str_contains($ruta, DIRECTORY_SEPARATOR . 'Repositories' . DIRECTORY_SEPARATOR)
            ) {
                return [];
            }
            return patron($contenido, '/->pdo\(\)/');
        },
    ],
    'depuracion' => [
        'descripcion' => 'Llamadas de depuración (var_dump, print_r, dd)',
        'severidad'   => 'baja',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            return patron($contenido, '/\b(?:var_dump|print_r|dd|dump)\s*\(/');
        },
    ],
    'pendientes' => [
        'descripcion' => 'Marcadores TODO/FIXME',
        'severidad'   => 'baja',
        'evaluar'     => static function (string $ruta, string $contenido): array {
            return patron($contenido, '/\b(?:TODO|FIXME|HACK)\b/');
        },
    ],
];

/**
 * Devuelve [número de línea, texto] por cada línea que cumple el patrón.
 *
 * @return list<array{0: int, 1: string}>
 */
function patron(string $contenido, string $regex): array
{
    $lineas = preg_split('/\R/', $contenido) ?: [];
    $salida = [];
    foreach ($lineas as $numero => $linea) {
        if (preg_match($regex, $linea) === 1) {
            $salida[] = [$numero + 1, trim($linea)];
        }
    }
    return $salida;
}

$totalHallazgos = 0;
$relativas     = static fn (string $ruta): string => str_replace($raiz . DIRECTORY_SEPARATOR, '', $ruta);

echo PHP_EOL . 'Auditoría estática — Gestión Comercial' . PHP_EOL;
echo COLOR_GRIS . "Archivos PHP analizados: " . count($archivos) . COLOR_FIN . PHP_EOL . PHP_EOL;

foreach ($reglas as $clave => $regla) {
    $hallazgos = [];

    foreach ($archivos as $archivo) {
        $contenido = (string) file_get_contents($archivo);
        foreach ($regla['evaluar']($archivo, $contenido) as $coincidencia) {
            $hallazgos[] = [$relativas($archivo), $coincidencia[0], $coincidencia[1]];
        }
    }

    $color = match ($regla['severidad']) {
        'alta'  => COLOR_ROJO,
        'media' => COLOR_AMAR,
        default => COLOR_GRIS,
    };

    printf(
        "%s[%s]%s %-46s %s%d%s\n",
        $color,
        strtoupper($regla['severidad']),
        COLOR_FIN,
        $regla['descripcion'],
        $hallazgos === [] ? COLOR_VERDE : $color,
        count($hallazgos),
        COLOR_FIN
    );

    foreach ($hallazgos as [$archivo, $linea, $texto]) {
        echo "    {$archivo}:{$linea}" . PHP_EOL;
        echo COLOR_GRIS . "      " . mb_strimwidth($texto, 0, 110, '…') . COLOR_FIN . PHP_EOL;
    }

    if ($hallazgos !== []) {
        echo PHP_EOL;
    }

    $totalHallazgos += count($hallazgos);
}

echo str_repeat('─', 72) . PHP_EOL;
echo "Total de hallazgos: {$totalHallazgos}" . PHP_EOL;
echo "Objetivo semana 1: 'strict_types', 'rol_magico' y 'dinero_float' en 0." . PHP_EOL;
echo "Objetivo semana 10: migrar estas reglas a PHPStan nivel 6 en CI." . PHP_EOL . PHP_EOL;

if ($maximo !== null) {
    if ($totalHallazgos > $maximo) {
        echo COLOR_ROJO . "Trinquete superado: {$totalHallazgos} > {$maximo}. Arregla antes de bajar el umbral."
            . COLOR_FIN . PHP_EOL . PHP_EOL;
        exit(1);
    }

    echo COLOR_VERDE . "Trinquete en {$maximo}: quedan " . ($maximo - $totalHallazgos) . " hallazgos de margen."
        . COLOR_FIN . PHP_EOL . PHP_EOL;
}

exit(0);
