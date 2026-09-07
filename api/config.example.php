<?php
/**
 * config.example.php
 * ─────────────────────────────────────────────────────
 * Plantilla de configuración de base de datos.
 * INSTRUCCIONES:
 *   1. Copia este archivo y renómbralo a config.php
 *   2. Rellena los valores con los de tu entorno XAMPP
 *   3. NUNCA subas config.php a Git (ya está en .gitignore)
 * ─────────────────────────────────────────────────────
 * Sistema de Gestión Comercial v1.0
 */

define('DB_HOST',    'localhost');
define('DB_USER',    'root');           // Usuario MySQL de XAMPP
define('DB_PASS',    '');               // Contraseña MySQL (vacía en XAMPP por defecto)
define('DB_NAME',    'gestion_comercial');
define('DB_PORT',    3307);             // Puerto MySQL de XAMPP (3306 o 3307)
define('DB_CHARSET', 'utf8mb4');

// Zona horaria — ajusta si no estás en Colombia
date_default_timezone_set('America/Bogota');

// ── NO MODIFIQUES NADA POR DEBAJO DE ESTA LÍNEA ──────

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    return $pdo;
}

function jsonResponse(bool $success, $data = null, string $message = '', int $httpCode = 200): void {
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
    exit;
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}
