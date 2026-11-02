<?php declare(strict_types=1);
namespace App\Exceptions;
final class NotFoundException extends HttpException
{
    public function __construct(string $resource = 'Recurso')
    {
        parent::__construct("{$resource} no encontrado.", 404);
    }
}
