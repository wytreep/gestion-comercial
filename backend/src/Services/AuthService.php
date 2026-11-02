<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Repositories\BaseRepository;
use App\Exceptions\HttpException;
use App\Exceptions\BusinessException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

final class AuthService extends BaseRepository
{
    private string $secret;
    private int    $expiry;
    private int    $refreshExpiry;
    private LoginThrottleService $throttle;

    public function __construct(?LoginThrottleService $throttle = null)
    {
        parent::__construct();
        $cfg                 = Config::getInstance();
        $this->secret        = $cfg->get('JWT_SECRET');
        $this->expiry        = $cfg->getInt('JWT_EXPIRY', 3600);
        $this->refreshExpiry = $cfg->getInt('JWT_REFRESH_EXPIRY', 604800);
        $this->throttle      = $throttle ?? new LoginThrottleService();
    }

    public function login(string $email, string $password, string $ip = '0.0.0.0'): array
    {
        $this->throttle->assertAllowed($email, $ip);

        $user = $this->queryOne(
            'SELECT id, nombre, email, password_hash, rol
             FROM usuarios WHERE email = :email AND activo = 1',
            [':email' => $email]
        );

        // Hash de relleno: iguala el tiempo de respuesta cuando el correo no
        // existe y evita enumerar usuarios midiendo latencias.
        $hash = $user['password_hash'] ?? '$2y$12$t9dlUOvEmadrACm1cz0xgeREYcaU0d326Y4r87YxGpdFFM8CrU/MO';
        $ok   = password_verify($password, $hash);

        if ($user === null || !$ok) {
            $this->throttle->registrarFallo($email, $ip);
            throw new HttpException('Credenciales incorrectas.', 401);
        }

        $this->throttle->registrarExito($email, $ip);

        return [
            'access_token'  => $this->makeAccessToken($user),
            'refresh_token' => $this->makeRefreshToken($user),
            'expires_in'    => $this->expiry,
            'user'          => [
                'id'     => (int) $user['id'],
                'nombre' => $user['nombre'],
                'email'  => $user['email'],
                'rol'    => $user['rol'],
            ],
        ];
    }

    public function verificarToken(string $token): array
    {
        try {
            $payload = JWT::decode($token, new Key($this->secret, 'HS256'));
            return (array) $payload;
        } catch (\Exception $e) {
            throw new HttpException('Token inválido o expirado.', 401);
        }
    }

    public function refresh(string $refreshToken): array
    {
        $payload = $this->verificarToken($refreshToken);
        if (($payload['type'] ?? '') !== 'refresh') {
            throw new HttpException('Token de refresh inválido.', 401);
        }

        $user = $this->queryOne(
            'SELECT id, nombre, email, rol FROM usuarios WHERE id = :id AND activo = 1',
            [':id' => $payload['sub']]
        );

        if ($user === null) {
            throw new HttpException('Usuario no encontrado.', 401);
        }

        return [
            'access_token' => $this->makeAccessToken($user),
            'expires_in'   => $this->expiry,
        ];
    }

    public function crearUsuario(string $nombre, string $email, string $password, string $rol = 'vendedor'): int
    {
        $roles = ['admin', 'vendedor', 'readonly'];
        if (!in_array($rol, $roles, true)) {
            throw new BusinessException("Rol '{$rol}' no válido. Valores: " . implode(', ', $roles));
        }

        $existente = $this->queryOne(
            'SELECT id FROM usuarios WHERE email = :email',
            [':email' => $email]
        );
        if ($existente !== null) {
            throw new BusinessException('Ya existe un usuario con ese correo.');
        }

        return $this->insert(
            'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (:nombre, :email, :hash, :rol)',
            [
                ':nombre' => $nombre,
                ':email'  => $email,
                ':hash'   => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
                ':rol'    => $rol,
            ]
        );
    }

    public function cambiarRol(int $id, string $rol): void
    {
        $roles = ['admin', 'vendedor', 'readonly'];
        if (!in_array($rol, $roles, true)) {
            throw new BusinessException("Rol '{$rol}' no válido.");
        }
        $this->execute('UPDATE usuarios SET rol = :rol WHERE id = :id', [':rol' => $rol, ':id' => $id]);
    }

    public function cambiarPassword(int $id, string $passwordActual, string $nueva): void
    {
        $user = $this->queryOne('SELECT password_hash FROM usuarios WHERE id = :id', [':id' => $id]);
        if (!$user || !password_verify($passwordActual, $user['password_hash'])) {
            throw new BusinessException('Contraseña actual incorrecta.');
        }
        $this->execute(
            'UPDATE usuarios SET password_hash = :hash WHERE id = :id',
            [':hash' => password_hash($nueva, PASSWORD_BCRYPT, ['cost' => 12]), ':id' => $id]
        );
    }

    public function listarUsuarios(): array
    {
        return $this->query(
            'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY id'
        );
    }

    public function toggleActivo(int $id, bool $activo): void
    {
        $this->execute(
            'UPDATE usuarios SET activo = :activo WHERE id = :id',
            [':activo' => (int) $activo, ':id' => $id]
        );
    }

    private function makeAccessToken(array $user): string
    {
        $now = time();
        return JWT::encode([
            'sub'   => (int) $user['id'],
            'name'  => $user['nombre'],
            'email' => $user['email'],
            'rol'   => $user['rol'],
            'type'  => 'access',
            'iat'   => $now,
            'exp'   => $now + $this->expiry,
        ], $this->secret, 'HS256');
    }

    private function makeRefreshToken(array $user): string
    {
        $now = time();
        return JWT::encode([
            'sub'  => (int) $user['id'],
            'type' => 'refresh',
            'iat'  => $now,
            'exp'  => $now + $this->refreshExpiry,
        ], $this->secret, 'HS256');
    }
}
