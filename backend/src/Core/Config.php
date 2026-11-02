<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\ConfigException;

final class Config
{
    private static ?self $instance = null;
    private array $values = [];

    private function __construct(string $envPath)
    {
        if (file_exists($envPath)) {
            foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) continue;
                if (!str_contains($line, '=')) continue;
                [$key, $value] = explode('=', $line, 2);
                $key   = trim($key);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                $this->values[$key] = $value;
            }
        }
    }

    public static function getInstance(string $envPath = ''): self
    {
        if (self::$instance === null) {
            self::$instance = new self($envPath ?: dirname(__DIR__, 2) . '/.env');
        }
        return self::$instance;
    }

    public function get(string $key, ?string $default = null): string
    {
        // Variables del sistema (Docker) tienen prioridad
        $env = getenv($key);
        if ($env !== false) return $env;
        if (isset($this->values[$key])) return $this->values[$key];
        if ($default !== null) return $default;
        throw new ConfigException("Variable de entorno '{$key}' no definida.");
    }

    public function getInt(string $key, int $default = 0): int
    {
        try { return (int) $this->get($key, (string) $default); }
        catch (ConfigException) { return $default; }
    }

    public function getBool(string $key, bool $default = false): bool
    {
        try {
            return in_array(strtolower($this->get($key)), ['true', '1', 'yes', 'on'], true);
        } catch (ConfigException) { return $default; }
    }

    public function isDevelopment(): bool
    {
        return $this->get('APP_ENV', 'development') === 'development';
    }
}
