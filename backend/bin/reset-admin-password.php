<?php

/**
 * Reset o creación de un usuario administrador.
 *
 * No contiene contraseñas por defecto: se solicitan de forma interactiva
 * (o vía la variable de entorno RESET_PASSWORD en automatizaciones).
 *
 * Uso:
 *   docker compose exec php php bin/reset-admin-password.php admin@gcom.local
 *   docker compose exec php php bin/reset-admin-password.php admin@gcom.local --create
 *
 * Variables opcionales:
 *   RESET_PASSWORD  contraseña a usar (evita el prompt interactivo)
 *   RESET_NOMBRE    nombre del usuario al crearlo (por defecto "Administrador")
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Config;

function fail(string $message): never
{
    fwrite(STDERR, "✗ {$message}" . PHP_EOL);
    exit(1);
}

function leerPassword(): string
{
    $fromEnv = getenv('RESET_PASSWORD');
    if (is_string($fromEnv) && $fromEnv !== '') {
        return $fromEnv;
    }

    $esWindows = DIRECTORY_SEPARATOR === '\\';

    fwrite(STDOUT, 'Nueva contraseña: ');
    if (!$esWindows) {
        shell_exec('stty -echo');
    }

    $password = fgets(STDIN);

    if (!$esWindows) {
        shell_exec('stty echo');
        fwrite(STDOUT, PHP_EOL);
    }

    if ($password === false || trim($password) === '') {
        fail('La contraseña no puede estar vacía.');
    }

    return rtrim($password, "\r\n");
}

$email = $argv[1] ?? '';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Indica un email válido: php bin/reset-admin-password.php usuario@dominio.com [--create]');
}

$crearSiNoExiste = in_array('--create', $argv, true);

$envFile = dirname(__DIR__) . '/.env';
if (!file_exists($envFile)) {
    $envFile = dirname(__DIR__, 2) . '/.env';
}
$config = Config::getInstance($envFile);

$password = leerPassword();

if (mb_strlen($password) < 8) {
    fail('La contraseña debe tener al menos 8 caracteres.');
}

try {
    $pdo = new PDO(
        sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config->get('DB_HOST', 'db'),
            $config->get('DB_PORT', '3306'),
            $config->get('DB_NAME', 'gestion_comercial')
        ),
        $config->get('DB_USER'),
        $config->get('DB_PASSWORD'),
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $stmt = $pdo->prepare('UPDATE usuarios SET password_hash = :hash, activo = 1 WHERE email = :email');
    $stmt->execute([':hash' => $hash, ':email' => $email]);

    if ($stmt->rowCount() === 0) {
        if (!$crearSiNoExiste) {
            fail("No existe el usuario '{$email}'. Usa --create para crearlo.");
        }

        $nombre = getenv('RESET_NOMBRE') ?: 'Administrador';

        $stmt = $pdo->prepare(
            "INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
             VALUES (:nombre, :email, :hash, 'admin', 1)"
        );
        $stmt->execute([':nombre' => $nombre, ':email' => $email, ':hash' => $hash]);

        fwrite(STDOUT, "✓ Usuario admin creado: {$email}" . PHP_EOL);
    } else {
        fwrite(STDOUT, "✓ Contraseña actualizada: {$email}" . PHP_EOL);
    }
} catch (\Throwable $e) {
    fail('Error: ' . $e->getMessage());
}
