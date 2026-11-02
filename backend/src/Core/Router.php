<?php

declare(strict_types=1);

namespace App\Core;

final class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void    { $this->add('GET',    $path, $handler); }
    public function post(string $path, callable $handler): void   { $this->add('POST',   $path, $handler); }
    public function put(string $path, callable $handler): void    { $this->add('PUT',    $path, $handler); }
    public function patch(string $path, callable $handler): void  { $this->add('PATCH',  $path, $handler); }
    public function delete(string $path, callable $handler): void { $this->add('DELETE', $path, $handler); }

    private function add(string $method, string $path, callable $handler): void
    {
        $this->routes[] = ['method' => $method, 'path' => $path, 'handler' => $handler];
    }

    public function dispatch(): void
    {
        $request = Request::fromGlobals();
        $uri     = rtrim($request->uri, '/') ?: '/';
        $method  = $request->method;

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) continue;

            $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $route['path']);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {
                // Inyectar params de ruta
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $request->setParams($params);

                $response = ($route['handler'])($request);
                if ($response instanceof Response) {
                    $response->send();
                }
                return;
            }
        }

        Response::notFound("Ruta {$method} {$uri} no encontrada")->send();
    }
}
