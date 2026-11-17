# ADR 0001 — Tipado estricto, enums de dominio y value object `Money`

- **Estado:** propuesto
- **Fecha:** 2026-11-16
- **Contexto del plan:** semana 1
- **Ámbito:** `backend/src`

## Contexto

El backend guarda dinero en columnas `DECIMAL(14,2)` y `DECIMAL(12,2)`, pero lo
calcula en PHP con `float`. Ejemplos verificados en el código actual:

- `VentaService::crear()` acumula el total con `$total += $cantidad * $precio`
  y compara el pago inicial con `$total + 0.01`.
- `VentaService::registrarPago()` lee `saldo_pendiente` como `(float)` y acepta
  el pago si `$monto <= $saldo + 0.01`.
- `FinanzasService` calcula costo de ventas, utilidad y márgenes con `(float)`.

El margen de `0.01` es un parche que oculta el problema: convierte errores de
representación en tolerancias y puede aceptar pagos por encima del saldo real o
arrastrar diferencias de centavos en reportes. Además, PHP y MySQL redondean
distinto, así que el total calculado en PHP puede no coincidir con la suma de
`detalle_venta` en SQL.

En paralelo, los roles, estados de venta y tipos de movimiento de stock viven
como strings (`'admin'`, `'pendiente'`, `'ajuste_manual'`) repartidos entre
controladores, servicios, middlewares y migraciones. Un typo solo se descubre en
tiempo de ejecución.

## Decisión

1. **`declare(strict_types=1)` en todos los archivos** de `src`, `bin`,
   `public`, `config` y `tools`.
2. **Enums backed** en `App\Domain\Enums` para los vocabularios cerrados que ya
   existen como `ENUM` en MySQL: `Rol`, `EstadoVenta`, `EstadoPago`,
   `TipoMovimientoStock`, `TipoNotificacion`.
3. **Value object `Money`** en `App\Domain\ValueObjects`, inmutable, que
   almacena **enteros en centavos** y expone `fromDecimal(string)`,
   `add`, `subtract`, `multiply`, `allocate`, `equals`, `isZero`, `toDecimal`,
   `format`. Prohibido operar con `float` fuera de la frontera de entrada/salida.
4. La conversión `DECIMAL (string) → Money` ocurre en el repositorio; el dominio
   nunca ve strings monetarios crudos.

## Alternativas descartadas

- **`brick/money`**: resuelve el problema, pero añade una dependencia y oculta el
  aprendizaje del redondeo, que es justamente lo que se quiere dominar ahora.
- **Seguir con `float` y tolerancias**: el `0.01` ya está en dos comparaciones
  críticas; mantenerlo perpetúa el descuadre.
- **`DECIMAL` como string en PHP**: evita floats pero obliga a reimplementar
  aritmética en cada servicio.
- **Enums solo en los nuevos módulos**: deja dos vocabularios conviviendo y
  rompe el objetivo de un único origen de verdad.

## Consecuencias

**A favor**
- Los cálculos de venta, abono y finanzas dejan de depender del redondeo de
  coma flotante.
- Desaparecen los límites arbitrarios `0.01`.
- Los estados y roles dejan de ser texto libre; el autocompletado y el análisis
  estático encuentran los usos.
- Requisito previo para PHPStan nivel 6 (semana 10) y para tests unitarios
  baratos de las reglas de negocio (semana 5).

**En contra**
- Refactor amplio: repositorios, servicios, controladores y recursos JSON.
- Hay que decidir el redondeo de `allocate` (resto al último tramo) y
  documentarlo.
- Riesgo de romper el contrato de la API si los importes pasan de número a
  string; se mantiene **número en JSON** para no tocar el cliente.

## Aplicación

1. `Money` + tests unitarios (redondeo, prorrateo, comparación) **antes** de
   tocar servicios.
2. Migrar `VentaService::crear()`, `registrarPago()` y `cobros` (los flujos con
   dinero real). Un PR por flujo, con tests de regresión.
3. Enums: empezar por `Rol` (afecta a `RoleMiddleware`, `ProductoController` y
   `AuthService`) y seguir por `EstadoVenta`/`EstadoPago`.
4. Activar `strict_types` archivo por archivo, sin mezclar con cambios de lógica.
5. Criterio de cierre (semana 1): `php tools/audit.php` con `strict_types`,
   `dinero_float`, `tolerancia_dinero` y `rol_magico` en 0.
