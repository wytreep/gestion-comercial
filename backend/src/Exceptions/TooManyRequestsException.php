<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * Se lanza cuando se supera el límite de intentos de login.
 * El handler global usa getRetryAfter() para enviar la cabecera Retry-After.
 */
final class TooManyRequestsException extends HttpException
{
    public function __construct(
        string $message,
        private readonly int $retryAfter,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 429, $previous);
    }

    public function getRetryAfter(): int
    {
        return $this->retryAfter;
    }
}
