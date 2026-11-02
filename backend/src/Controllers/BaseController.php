<?php declare(strict_types=1);
namespace App\Controllers;
use App\Core\Request;
use App\Exceptions\ValidationException;

abstract class BaseController
{
    protected function requireFields(Request $request, string ...$fields): void
    {
        $errors = [];
        foreach ($fields as $f) {
            $v = $request->input($f);
            if ($v === null || $v === '') $errors[$f] = "El campo '{$f}' es requerido.";
        }
        if ($errors) throw new ValidationException($errors);
    }

    protected function routeId(Request $request, string $param = 'id'): int
    {
        $id = (int) $request->param($param);
        if ($id <= 0) throw new \InvalidArgumentException("Parámetro '{$param}' inválido.");
        return $id;
    }
}
