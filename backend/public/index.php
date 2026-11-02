<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Config;
use App\Core\Router;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Exceptions\BusinessException;
use App\Exceptions\TooManyRequestsException;

$envFile = dirname(__DIR__) . '/.env';
if (!file_exists($envFile)) {
    // En desarrollo local el .env vive en la raíz del proyecto.
    $envFile = dirname(__DIR__, 2) . '/.env';
}

$config = Config::getInstance($envFile);

if ($config->isDevelopment()) {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

// ── CORS ──────────────────────────────────────────────
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_map('trim', explode(',', $config->get('CORS_ALLOWED_ORIGINS', '*')));

if (in_array('*', $allowed, true)) {
    header('Access-Control-Allow-Origin: *');
} elseif ($origin && in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

// ── Preflight ─────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Manejador global de excepciones ──────────────────
set_exception_handler(function (\Throwable $e) use ($config): void {
    $code = match (true) {
        $e instanceof ValidationException => 422,
        $e instanceof BusinessException   => 422,
        $e instanceof HttpException       => $e->getCode(),
        default                           => 500,
    };

    $data = null;
    if ($e instanceof ValidationException) {
        $data = ['errors' => $e->getErrors()];
    }

    if ($code >= 500) {
        error_log("[ERROR {$code}] " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());

        if ($config->isDevelopment()) {
            $data = [
                'exception' => get_class($e),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ];
            $message = $e->getMessage();
        } else {
            // No filtrar detalles internos al cliente en producción.
            $message = 'Error interno del servidor.';
        }
    } else {
        $message = $e->getMessage();
    }

    if ($e instanceof TooManyRequestsException && !headers_sent()) {
        header('Retry-After: ' . $e->getRetryAfter());
    }

    Response::error($message, $code, $data)->send();
});

// ── Router ────────────────────────────────────────────
$router = new Router();
require_once dirname(__DIR__) . '/config/routes.php';
$router->dispatch();
