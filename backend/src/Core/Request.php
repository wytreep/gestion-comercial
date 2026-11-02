<?php

declare(strict_types=1);

namespace App\Core;

final class Request
{
    public readonly string $method;
    public readonly string $uri;
    private array $body    = [];
    private array $params  = [];
    private array $query   = [];
    private array $headers = [];

    private function __construct()
    {
        $this->method  = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $this->uri     = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        $this->query   = $_GET;
        $this->headers = getallheaders() ?: [];

        if (in_array($this->method, ['POST', 'PUT', 'PATCH'], true)) {
            $raw = file_get_contents('php://input');
            if ($raw) {
                $decoded = json_decode($raw, true);
                $this->body = is_array($decoded) ? $decoded : [];
            }
        }
    }

    public static function fromGlobals(): self
    {
        return new self();
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function all(): array
    {
        return $this->body;
    }

    public function query(string $key, ?string $default = null): ?string
    {
        return isset($this->query[$key]) ? (string) $this->query[$key] : $default;
    }

    public function param(string $key): ?string
    {
        return isset($this->params[$key]) ? (string) $this->params[$key] : null;
    }

    public function setParams(array $params): void
    {
        $this->params = array_merge($this->params, $params);
    }

    public function header(string $name): ?string
    {
        $normalized = strtolower($name);
        foreach ($this->headers as $k => $v) {
            if (strtolower($k) === $normalized) return $v;
        }
        return null;
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('Authorization') ?? '';
        if (str_starts_with($auth, 'Bearer ')) {
            return substr($auth, 7);
        }
        return null;
    }

    public function authUser(): ?array
    {
        return $this->params['auth_user'] ?? null;
    }

    public function authRol(): string
    {
        return $this->authUser()['rol'] ?? 'readonly';
    }

    /**
     * IP del cliente según la conexión con nginx.
     * No se confía en X-Forwarded-For: nginx no lo reenvía y el cliente
     * podría falsificarlo.
     */
    public function ip(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        return filter_var($ip, FILTER_VALIDATE_IP) !== false ? $ip : '0.0.0.0';
    }
}
