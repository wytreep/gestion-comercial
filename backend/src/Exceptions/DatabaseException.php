<?php declare(strict_types=1);
namespace App\Exceptions;
final class DatabaseException extends HttpException
{
    public function __construct(string $message) { parent::__construct($message, 500); }
}
