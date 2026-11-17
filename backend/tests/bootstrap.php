<?php

declare(strict_types=1);

/**
 * Bootstrap de la suite.
 *
 * Los tests unitarios no tocan MySQL ni el sistema de archivos: solo necesitan
 * un entorno mínimo para que Config no falle al derivar claves. Las variables
 * se fijan con putenv porque Config::get() consulta getenv() primero, así que
 * tienen prioridad sobre cualquier .env local del desarrollador.
 */
require __DIR__ . '/../vendor/autoload.php';

const TEST_JWT_SECRET = 'test-jwt-secret-no-usar-fuera-de-tests-000000000000';
const TEST_APP_KEY    = '0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0';

putenv('APP_ENV=testing');
putenv('JWT_SECRET=' . TEST_JWT_SECRET);
putenv('APP_KEY=' . TEST_APP_KEY);
