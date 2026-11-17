# Tests de integración

Aquí viven los tests que tocan MySQL y la API completa (semanas 5-6 del plan).

Se ejecutan con `composer test:all` y en CI. Requieren una base de datos de test;
la configuración llega en la semana 6, cuando se añada `Request::fake()` y la
inyección de una conexión de test.
