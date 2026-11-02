<?php declare(strict_types=1);
namespace App\Exceptions;

final class ValidationException extends \RuntimeException
{
    public function __construct(private readonly array $errors)
    {
        parent::__construct('Error de validación', 422);
    }
    public function getErrors(): array { return $this->errors; }
}
