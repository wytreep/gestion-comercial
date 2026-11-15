<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Exceptions\HttpException;
use App\Exceptions\BusinessException;
use App\Exceptions\TooManyRequestsException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Autenticación con sesiones revocables.
 *
 * Cada inicio de sesión crea una fila en `sesiones`. El access token (15 min)
 * lleva el id y el `jti` de la sesión y una huella de la IP; el refresh (7
 * días) es de un solo uso y rota en cada canje. Cambiar de IP, reutilizar un
 * refresh o revocar la sesión invalida ambos tokens de inmediato.
 */
final class AuthService extends BaseService
{
    private string $secret;
    private int    $expiry;
    private int    $refreshExpiry;
    private int    $securityExpiry;
    private LoginThrottleService $throttle;

    public function __construct(?LoginThrottleService $throttle = null)
    {
        parent::__construct();
        $cfg                  = Config::getInstance();
        $this->secret         = $cfg->get('JWT_SECRET');
        $this->expiry         = max(60, $cfg->getInt('JWT_EXPIRY', 900));
        $this->refreshExpiry  = max($this->expiry, $cfg->getInt('JWT_REFRESH_EXPIRY', 604800));
        $this->securityExpiry = max(60, $cfg->getInt('SECURITY_TOKEN_EXPIRY', 600));
        $this->throttle       = $throttle ?? new LoginThrottleService();
    }

    public function login(
        string $email,
        string $password,
        string $ip = '0.0.0.0',
        string $userAgent = '',
    ): array {
        $this->throttle->assertAllowed($email, $ip);

        $user = $this->queryOne(
            'SELECT id, nombre, email, password_hash, rol, tema
             FROM usuarios WHERE email = :email AND activo = 1',
            [':email' => $email]
        );

        // Hash de relleno: iguala el tiempo de respuesta cuando el correo no
        // existe y evita enumerar usuarios midiendo latencias.
        $hash = $user['password_hash'] ?? '$2y$12$t9dlUOvEmadrACm1cz0xgeREYcaU0d326Y4r87YxGpdFFM8CrU/MO';
        $ok   = password_verify($password, $hash);

        if ($user === null || !$ok) {
            $estado = $this->throttle->registrarFallo($email, $ip);

            // El fallo que dispara el bloqueo responde 429 para que la
            // pantalla de login muestre la cuenta atrás de inmediato.
            if ($estado['bloqueado']) {
                throw new TooManyRequestsException(
                    $this->throttle->mensaje($estado),
                    $estado['permanente'] ? 86400 : max(1, $estado['restante']),
                    $this->throttle->datosBloqueo($estado)
                );
            }

            throw new HttpException('Credenciales incorrectas.', 401);
        }

        // Rehash transparente al algoritmo actual (Argon2id).
        if (password_needs_rehash($user['password_hash'], $this->algoritmo())) {
            $this->execute(
                'UPDATE usuarios SET password_hash = :hash WHERE id = :id',
                [':hash' => $this->hashPassword($password), ':id' => $user['id']]
            );
        }

        $this->throttle->registrarExito($email, $ip);

        $sesion = $this->crearSesion((int) $user['id'], $ip, $userAgent);

        return [
            'access_token'  => $this->makeAccessToken($user, $sesion, $ip),
            'refresh_token' => $this->crearRefreshToken((int) $user['id'], $sesion, $ip),
            'expires_in'    => $this->expiry,
            'user'          => [
                'id'     => (int) $user['id'],
                'nombre' => $user['nombre'],
                'email'  => $user['email'],
                'rol'    => $user['rol'],
                'tema'   => $user['tema'] ?? 'sistema',
            ],
        ];
    }

    /**
     * Verifica el access token y que su sesión siga activa y ligada a la IP.
     */
    public function verificarAcceso(string $token, string $ip): array
    {
        $payload = $this->decodificar($token);

        if (($payload['type'] ?? '') !== 'access') {
            throw new HttpException('Token inválido o expirado.', 401);
        }

        $sesion = $this->sesionActiva($payload, $ip);

        // La huella de IP del token debe coincidir con la conexión actual.
        if (!$this->ipCoincide($payload, $ip)) {
            $this->revocarSesionInterna($sesion['id'], 'Cambio de IP');
            throw new HttpException('La sesión se abrió desde otra conexión. Inicia sesión de nuevo.', 401);
        }

        $this->actualizarActividad((int) $sesion['id']);

        return $payload;
    }

    /**
     * Canjea un refresh de un solo uso y devuelve un par nuevo.
     */
    public function refresh(string $refreshToken, string $ip = '0.0.0.0', string $userAgent = ''): array
    {
        $payload = $this->decodificar($refreshToken);

        if (($payload['type'] ?? '') !== 'refresh') {
            throw new HttpException('Token de refresh inválido.', 401);
        }

        $hash = hash('sha256', $refreshToken);
        $fila = $this->queryOne(
            'SELECT rt.id, rt.usado, rt.ip AS token_ip,
                    s.id AS sesion_id, s.usuario_id, s.jti AS sesion_jti,
                    s.revocada, s.expira, s.ip AS sesion_ip
               FROM refresh_tokens rt
               JOIN sesiones s ON s.id = rt.sesion_id
              WHERE rt.token_hash = :hash',
            [':hash' => $hash]
        );

        if ($fila === null) {
            $this->throttle->registrarEvento('refresh_invalido', $ip, null, null, 'Token desconocido');
            throw new HttpException('Sesión inválida. Inicia sesión de nuevo.', 401);
        }

        if ((int) $fila['revocada'] === 1 || strtotime((string) $fila['expira']) <= time()) {
            throw new HttpException('Sesión expirada o revocada. Inicia sesión de nuevo.', 401);
        }

        if ($fila['token_ip'] !== $ip || $fila['sesion_ip'] !== $ip) {
            $this->revocarSesionInterna((int) $fila['sesion_id'], 'Cambio de IP en refresh');
            $this->throttle->registrarEvento('ip_cambiada', $ip, null, (int) $fila['usuario_id'], 'Refresh desde otra IP');
            throw new HttpException('La sesión se abrió desde otra conexión. Inicia sesión de nuevo.', 401);
        }

        if ((int) $fila['usado'] === 1) {
            // Reutilización de un refresh ya canjeado: se trata como robo.
            $this->revocarSesionInterna((int) $fila['sesion_id'], 'Refresh reutilizado');
            $this->throttle->registrarEvento(
                'refresh_reutilizado',
                $ip,
                null,
                (int) $fila['usuario_id'],
                'Posible robo de token: sesión revocada'
            );
            throw new HttpException('Sesión revocada por seguridad. Inicia sesión de nuevo.', 401);
        }

        $user = $this->queryOne(
            'SELECT id, nombre, email, rol, tema FROM usuarios WHERE id = :id AND activo = 1',
            [':id' => $fila['usuario_id']]
        );

        if ($user === null) {
            throw new HttpException('Usuario no encontrado.', 401);
        }

        $sesion = [
            'id'     => (int) $fila['sesion_id'],
            'jti'    => (string) $fila['sesion_jti'],
            'expira' => (string) $fila['expira'],
        ];

        $nuevoRefresh = $this->crearRefreshToken((int) $user['id'], $sesion, $ip);

        // El UPDATE condicional evita que dos peticiones simultáneas canjeen
        // el mismo refresh: solo una obtiene rowCount = 1.
        $canjeado = $this->execute(
            'UPDATE refresh_tokens
                SET usado = 1, usado_en = NOW(), reemplazado_por = :nuevo
              WHERE id = :id AND usado = 0',
            [':nuevo' => hash('sha256', $nuevoRefresh), ':id' => $fila['id']]
        );

        if ($canjeado !== 1) {
            $this->revocarSesionInterna((int) $fila['sesion_id'], 'Refresh reutilizado (carrera)');
            $this->throttle->registrarEvento('refresh_reutilizado', $ip, null, (int) $user['id'], 'Canje simultáneo');
            throw new HttpException('Sesión revocada por seguridad. Inicia sesión de nuevo.', 401);
        }

        $this->actualizarActividad((int) $fila['sesion_id']);

        return [
            'access_token'  => $this->makeAccessToken($user, $sesion, $ip),
            'refresh_token' => $nuevoRefresh,
            'expires_in'    => $this->expiry,
            'user'          => [
                'id'     => (int) $user['id'],
                'nombre' => $user['nombre'],
                'email'  => $user['email'],
                'rol'    => $user['rol'],
                'tema'   => $user['tema'] ?? 'sistema',
            ],
        ];
    }

    /** Cierra la sesión del token actual. */
    public function logout(array $payload): void
    {
        $sid = (int) ($payload['sid'] ?? 0);
        if ($sid > 0) {
            $this->revocarSesionInterna($sid, 'Cierre de sesión');
        }
    }

    /** Estado del bloqueo de IP, para la pantalla de login. */
    public function estadoIp(string $ip): array
    {
        $estado = $this->throttle->estado($ip);

        return [
            'bloqueo'    => $estado['bloqueado'],
            'permanente' => $estado['permanente'],
            'nivel'      => $estado['nivel'],
            'restante'   => $estado['restante'],
            'hasta'      => $estado['bloqueado_hasta'],
            'mensaje'    => $estado['bloqueado'] ? $this->throttle->mensaje($estado) : '',
        ];
    }

    /**
     * Re-autenticación para el panel de seguridad: exige la contraseña y
     * emite un token de corta vida atado a la sesión y a la IP.
     */
    public function crearTokenSeguridad(int $userId, array $payload, string $ip): array
    {
        $user = $this->queryOne(
            'SELECT id, nombre, email, rol FROM usuarios WHERE id = :id AND activo = 1',
            [':id' => $userId]
        );
        if ($user === null) {
            throw new HttpException('Usuario no encontrado.', 401);
        }

        $ahora = time();
        $token = JWT::encode([
            'sub'  => $userId,
            'name' => $user['nombre'],
            'rol'  => $user['rol'],
            'type' => 'security',
            'sid'  => (int) $payload['sid'],
            'jti'  => (string) $payload['jti'],
            'iph'  => $this->huellaIp($ip),
            'iat'  => $ahora,
            'exp'  => $ahora + $this->securityExpiry,
        ], $this->secret, 'HS256');

        $this->throttle->registrarEvento(
            'reautenticacion',
            $ip,
            null,
            $userId,
            'Acceso al panel de seguridad'
        );

        return ['security_token' => $token, 'expires_in' => $this->securityExpiry];
    }

    public function verificarTokenSeguridad(string $token, string $ip): array
    {
        $payload = $this->decodificar($token);

        if (($payload['type'] ?? '') !== 'security') {
            throw new HttpException('Verificación de seguridad inválida.', 401);
        }

        $this->sesionActiva($payload, $ip);

        if (!$this->ipCoincide($payload, $ip)) {
            throw new HttpException('Verificación de seguridad inválida.', 401);
        }

        return $payload;
    }

    public function verificarPassword(int $userId, string $password): bool
    {
        $user = $this->queryOne('SELECT password_hash FROM usuarios WHERE id = :id', [':id' => $userId]);
        return $user !== null && password_verify($password, $user['password_hash']);
    }

    /** Deja rastro de una re-autenticación fallida (sin bloquear la cuenta). */
    public function registrarReautenticacionFallida(int $userId, string $ip): void
    {
        $this->throttle->registrarEvento(
            'reautenticacion_fallida',
            $ip,
            null,
            $userId,
            'Contraseña incorrecta en el panel de seguridad'
        );
    }

    /** @return list<array<string,mixed>> */
    public function listarSesiones(): array
    {
        return $this->query(
            "SELECT s.id, s.usuario_id, u.nombre, u.email, s.ip, s.user_agent,
                    s.creada, s.ultima_actividad, s.expira
               FROM sesiones s
               JOIN usuarios u ON u.id = s.usuario_id
              WHERE s.revocada = 0 AND s.expira > NOW()
              ORDER BY s.ultima_actividad DESC
              LIMIT 100"
        );
    }

    public function revocarSesion(int $id, int $adminId, string $motivo = 'Revocada por administrador'): void
    {
        $sesion = $this->queryOne('SELECT id FROM sesiones WHERE id = :id', [':id' => $id]);
        if ($sesion === null) {
            throw new BusinessException('La sesión no existe o ya fue revocada.');
        }
        $this->revocarSesionInterna($id, $motivo);
        $this->throttle->registrarEvento('sesion_revocada', '0.0.0.0', null, $adminId, "Sesión #{$id}: {$motivo}");
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
                ':hash'   => $this->hashPassword($password),
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

    /** Guarda el tema elegido (claro · oscuro · sistema) para la cuenta. */
    public function guardarTema(int $id, string $tema): void
    {
        if (!in_array($tema, ['claro', 'oscuro', 'sistema'], true)) {
            throw new BusinessException("Tema '{$tema}' no válido.");
        }
        $this->execute('UPDATE usuarios SET tema = :tema WHERE id = :id', [':tema' => $tema, ':id' => $id]);
    }

    public function cambiarPassword(int $id, string $passwordActual, string $nueva): void
    {
        $user = $this->queryOne('SELECT password_hash FROM usuarios WHERE id = :id', [':id' => $id]);
        if (!$user || !password_verify($passwordActual, $user['password_hash'])) {
            throw new BusinessException('Contraseña actual incorrecta.');
        }

        $this->execute(
            'UPDATE usuarios SET password_hash = :hash WHERE id = :id',
            [':hash' => $this->hashPassword($nueva), ':id' => $id]
        );

        // Cambiar la contraseña invalida las demás sesiones.
        $this->execute(
            "UPDATE sesiones SET revocada = 1, motivo_revocacion = 'Contraseña cambiada'
              WHERE usuario_id = :id AND revocada = 0",
            [':id' => $id]
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

        if (!$activo) {
            $this->execute(
                "UPDATE sesiones SET revocada = 1, motivo_revocacion = 'Usuario desactivado'
                  WHERE usuario_id = :id AND revocada = 0",
                [':id' => $id]
            );
        }
    }

    // ── Internos ───────────────────────────────────────────

    /** @return array{id:int, jti:string, expira:string} */
    private function crearSesion(int $usuarioId, string $ip, string $userAgent): array
    {
        $jti    = $this->uuid();
        $expira = date('Y-m-d H:i:s', time() + $this->refreshExpiry);

        $id = $this->insert(
            'INSERT INTO sesiones (usuario_id, jti, ip, user_agent, expira)
             VALUES (:usuario_id, :jti, :ip, :user_agent, :expira)',
            [
                ':usuario_id' => $usuarioId,
                ':jti'        => $jti,
                ':ip'         => $ip,
                ':user_agent' => mb_substr($userAgent, 0, 255),
                ':expira'     => $expira,
            ]
        );

        return ['id' => $id, 'jti' => $jti, 'expira' => $expira];
    }

    private function crearRefreshToken(int $usuarioId, array $sesion, string $ip): string
    {
        $ahora = time();
        $exp   = $ahora + $this->refreshExpiry;

        $token = JWT::encode([
            'sub'   => $usuarioId,
            'type'  => 'refresh',
            'sid'   => (int) $sesion['id'],
            'jti'   => $this->uuid(),
            // Identificador estable de la sesión para localizarla al rotar.
            'jti_sesion' => (string) $sesion['jti'],
            'iph'   => $this->huellaIp($ip),
            'iat'   => $ahora,
            'exp'   => $exp,
        ], $this->secret, 'HS256');

        $this->insert(
            'INSERT INTO refresh_tokens (sesion_id, token_hash, ip, expira)
             VALUES (:sesion_id, :hash, :ip, :expira)',
            [
                ':sesion_id' => $sesion['id'],
                ':hash'      => hash('sha256', $token),
                ':ip'        => $ip,
                ':expira'    => date('Y-m-d H:i:s', $exp),
            ]
        );

        return $token;
    }

    private function makeAccessToken(array $user, array $sesion, string $ip): string
    {
        $now = time();

        return JWT::encode([
            'sub'   => (int) $user['id'],
            'name'  => $user['nombre'],
            'email' => $user['email'],
            'rol'   => $user['rol'],
            'type'  => 'access',
            'sid'   => (int) $sesion['id'],
            'jti'   => (string) $sesion['jti'],
            'iph'   => $this->huellaIp($ip),
            'iat'   => $now,
            'exp'   => $now + $this->expiry,
        ], $this->secret, 'HS256');
    }

    private function decodificar(string $token): array
    {
        try {
            return (array) JWT::decode($token, new Key($this->secret, 'HS256'));
        } catch (\Exception $e) {
            throw new HttpException('Token inválido o expirado.', 401);
        }
    }

    /** @return array<string,mixed> */
    private function sesionActiva(array $payload, string $ip): array
    {
        $sid = (int) ($payload['sid'] ?? 0);
        if ($sid <= 0) {
            throw new HttpException('Sesión inválida.', 401);
        }

        $sesion = $this->queryOne(
            'SELECT id, usuario_id, ip, revocada, expira
               FROM sesiones WHERE id = :id',
            [':id' => $sid]
        );

        if ($sesion === null || (int) $sesion['revocada'] === 1) {
            throw new HttpException('Sesión revocada. Inicia sesión de nuevo.', 401);
        }

        if (strtotime((string) $sesion['expira']) <= time()) {
            throw new HttpException('Sesión expirada. Inicia sesión de nuevo.', 401);
        }

        if ((string) $sesion['ip'] !== $ip) {
            $this->revocarSesionInterna($sid, 'Cambio de IP');
            throw new HttpException('La sesión se abrió desde otra conexión. Inicia sesión de nuevo.', 401);
        }

        return $sesion;
    }

    private function ipCoincide(array $payload, string $ip): bool
    {
        return isset($payload['iph']) && hash_equals((string) $payload['iph'], $this->huellaIp($ip));
    }

    private function huellaIp(string $ip): string
    {
        return hash_hmac('sha256', $ip, $this->secret);
    }

    private function actualizarActividad(int $sesionId): void
    {
        // Evita un UPDATE por cada petición: basta con latir cada minuto.
        $this->execute(
            'UPDATE sesiones SET ultima_actividad = NOW()
              WHERE id = :id AND ultima_actividad < NOW() - INTERVAL 60 SECOND',
            [':id' => $sesionId]
        );
    }

    private function revocarSesionInterna(int $id, string $motivo): void
    {
        $this->execute(
            'UPDATE sesiones
                SET revocada = 1, motivo_revocacion = :motivo
              WHERE id = :id AND revocada = 0',
            [':id' => $id, ':motivo' => mb_substr($motivo, 0, 160)]
        );
    }

    private function hashPassword(string $password): string
    {
        return password_hash($password, $this->algoritmo());
    }

    private function algoritmo(): string|int
    {
        return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    }

    private function uuid(): string
    {
        $datos = random_bytes(16);
        $datos[6] = chr((ord($datos[6]) & 0x0f) | 0x40);
        $datos[8] = chr((ord($datos[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($datos), 4));
    }
}
