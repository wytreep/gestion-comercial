<?php

declare(strict_types=1);

namespace App\Core;

final class Response
{
    private function __construct(
        private readonly int    $status,
        private readonly mixed  $data,
        private readonly string $message = '',
        private readonly bool   $success = true,
    ) {}

    public static function ok(mixed $data = null, string $message = ''): self
    {
        return new self(200, $data, $message);
    }

    public static function created(mixed $data = null, string $message = 'Creado exitosamente'): self
    {
        return new self(201, $data, $message);
    }

    public static function error(string $message, int $code = 500, mixed $data = null): self
    {
        return new self($code, $data, $message, false);
    }

    public static function unauthorized(string $message = 'No autorizado'): self
    {
        return new self(401, null, $message, false);
    }

    public static function forbidden(string $message = 'Sin permisos para esta acción'): self
    {
        return new self(403, null, $message, false);
    }

    public static function notFound(string $message = 'Recurso no encontrado'): self
    {
        return new self(404, null, $message, false);
    }

    public function send(): void
    {
        if (!headers_sent()) {
            http_response_code($this->status);
            header('Content-Type: application/json; charset=utf-8');
        }

        $payload = ['success' => $this->success, 'message' => $this->message];
        if ($this->data !== null) $payload['data'] = $this->data;

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
