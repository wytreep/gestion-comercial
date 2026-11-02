<?php declare(strict_types=1);
namespace App\Exceptions;
final class BusinessException extends \RuntimeException
{
    public function __construct(string $message) { parent::__construct($message, 422); }
}
