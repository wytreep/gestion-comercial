#!/usr/bin/env php
<?php
/**
 * generate_icons.php
 * Genera los iconos PNG 192x192 y 512x512 para la PWA
 * usando GD (incluido en XAMPP por defecto).
 *
 * Ejecutar UNA SOLA VEZ desde la raíz del proyecto:
 *   php generate_icons.php
 */

function crearIcono(int $size, string $ruta): void {
    if (!function_exists('imagecreatetruecolor')) {
        echo "⚠ GD no disponible. Crea los iconos manualmente en assets/img/\n";
        return;
    }

    $img = imagecreatetruecolor($size, $size);
    imageantialias($img, true);

    // Fondo azul marino con esquinas redondeadas (simuladas con elipse)
    $azul   = imagecolorallocate($img, 15,  76, 117);
    $verde  = imagecolorallocate($img, 26, 122,  74);
    $blanco = imagecolorallocate($img, 255, 255, 255);

    // Fondo
    imagefill($img, 0, 0, $azul);

    // Franja verde decorativa inferior
    imagefilledrectangle($img, 0, (int)($size * .72), $size, $size, $verde);

    // Emoji / texto centrado — usamos un rectángulo blanco como fallback
    // (PHP/GD no soporta emoji, así que ponemos letras iniciales)
    $fuente = 5; // fuente interna de GD
    $texto  = 'GC';
    $tw     = imagefontwidth($fuente)  * strlen($texto);
    $th     = imagefontheight($fuente);
    $scale  = (int)($size / 80);
    // Escalar texto manualmente dibujando varias veces
    for ($s = 0; $s <= $scale; $s++) {
        imagestring($img, $fuente,
            (int)(($size - $tw) / 2) + $s,
            (int)(($size * .3 - $th) / 2) + $s,
            $texto, $blanco);
    }

    // Línea de ola (decorativa)
    for ($x = 0; $x < $size; $x++) {
        $y = (int)(($size * .68) + sin($x / ($size / 6)) * ($size * .04));
        imagesetpixel($img, $x, $y, $blanco);
        imagesetpixel($img, $x, $y + 1, $blanco);
    }

    imagepng($img, $ruta);
    imagedestroy($img);
    echo "✓ Icono generado: $ruta\n";
}

$dir = __DIR__ . '/assets/img';
if (!is_dir($dir)) mkdir($dir, 0755, true);

crearIcono(192, "$dir/icon-192.png");
crearIcono(512, "$dir/icon-512.png");

echo "\n✅ Iconos listos en assets/img/\n";
