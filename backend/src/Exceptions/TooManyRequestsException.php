<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * Se lanza cuando se supera el límite de intentos de login.
 * El handler global usa getRetryAfter() para enviar la cabecera Retry-After
 * y getDatos() para que el cliente sepa cuánto falta y si es permanente.
 */
final class TooManyRequestsException extends HttpException
{
    /** @param array<string,mixed> $datos */
    public function __construct(
        string $message,
        private readonly int $retryAfter,
        private readonly array $datos = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 429, $previous);
    }

    public function getRetryAfter(): int
    {
        return $this->retryAfter;
    }

    /** @return array<string,mixed> */
    public function getDatos(): array
    {
        return $this->datos;
    }
}
