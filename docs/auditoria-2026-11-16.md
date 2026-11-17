# Auditoría técnica — 2026-11-16

**Repositorio:** `wytreep/gestion-comercial` · rama `main` · commit `379370a`
**Alcance:** `backend/src`, `database/migrations`, `docker/`, `.github/`, documentación de seguridad
**Método:** lectura de código, validación del esquema SQL y ejecución de la suite recién creada
**Autor:** revisión asistida por IA, revisada por el responsable del proyecto antes de mergear

> Esta auditoría no sustituye a PHPStan ni a una prueba dinámica: clasifica lo que se
> puede afirmar leyendo el código y deja preparado el terreno para comprobarlo con
> tests en las semanas 5-8.

---

## 1. Estado real frente al plan

| Aspecto | Lo que suponía el plan | Lo que encontré | Ajuste |
|---|---|---|---|
| Transacciones | Había que envolver la venta en una transacción | Ya existe `Database::transaction()` con savepoints anidados y rollback | Semana 4 se reduce: queda concurrencia, índices y `EXPLAIN` |
| Bloqueo de stock | Riesgo de sobreventa por condición de carrera | `StockService::registrar()` usa `SELECT ... FOR UPDATE` y valida stock ≥ 0 | Semana 4 se centra en deadlocks y orden de bloqueo |
| Refresh tokens | Rotación básica | Rotación con detección de reutilización y resolución de canje simultáneo (`UPDATE ... WHERE usado = 0`) | Semana 7 pasa a probar los casos límite, no a implementar |
| Docker | Todo por hacer | Imagen PHP multi-stage, usuario `www` no-root, MySQL sin puerto publicado | Semana 9 se centra en perfil de producción y healthchecks |
| Testing | Construir la suite desde cero | **No existe `backend/tests/`**, aunque `composer.json` declara PHPUnit 11 y el README lo anuncia | Se adelanta el andamiaje a la semana 1 |
| CI | Todo por hacer | No hay `.github/` | Esqueleto creado en esta revisión |
| Dinero | Migrar a centavos | `DECIMAL` en BD, `float` en PHP y comparaciones con `0.01` | Se mantiene como prioridad 1 de la semana 1 |

**Conclusión:** el proyecto está mejor de lo que el plan asumía en infraestructura y
peor en calidad verificable. El desequilibrio —código sólido sin pruebas que lo
demuestren— es exactamente lo que un entrevistador detecta en 10 minutos.

### Línea base medida (16-11-2026)

`php tools/audit.php` sobre 62 archivos PHP:

| Regla | Hallazgos | Objetivo |
|---|---:|---|
| Sin `declare(strict_types=1)` | 0 | 0 ✅ (mejor de lo previsto) |
| Casts `(float)` sobre campos monetarios | 49 | 0 al cerrar la semana 1 |
| Comparaciones monetarias con `0.01` | 4 | 0 |
| Strings de rol fuera de `RoleMiddleware` | 11 | 0 |
| `SELECT *` | 17 | bajar a 0 en repositorios |
| Acceso a PDO fuera de Core/Repositories | 0 | 0 ✅ |
| Llamadas de depuración | 0 | 0 ✅ |
| `TODO` / `FIXME` | 0 | mantener |
| **Total** | **81** | |

> El auditor no se analiza a sí mismo: hasta el 17 nov contaba sus propias reglas
> (2 `TODO`, 1 `SELECT *`, 1 tolerancia) e inflaba la línea base a 85. `composer
> audit:static` ahora corre con `--max=81`: el umbral baja con cada PR y nunca sube.

Suite de tests creada en esta revisión: `26 tests, 39 assertions, OK`.


---

## 2. Hallazgos

Severidad: **Crítica** (riesgo de datos o credibilidad), **Alta** (deuda que bloquea
el objetivo), **Media** (calidad), **Baja** (higiene).

### F-01 · No existe suite de tests · Crítica · Semana 5 (adelantada)

`backend/composer.json` declara `phpunit/phpunit: ^11.0` y `autoload-dev` apunta a
`Tests\` → `tests/`, pero la carpeta no existe. El README anuncia "Calidad: PHPUnit 11".

- **Riesgo:** cualquier afirmación de calidad en CV o entrevista es indefendible. Un
  reclutador técnico pide `composer test` y falla.
- **Acción:** `phpunit.xml`, `tests/bootstrap.php` y los primeros 3 archivos de test ya
  están creados (`tests/Unit/CryptoServiceTest.php`, `tests/Unit/RoleMiddlewareTest.php`).
- **Verificación:** `composer test` debe terminar en verde.
- **Meta de cierre:** 40 tests (25 unitarios + 15 de integración) al final de la semana 6.

### F-02 · Dinero en `float` con tolerancias de `0.01` · Crítica · Semana 1

Evidencia verificada:

| Archivo | Línea | Código |
|---|---|---|
| `VentaService.php` | 50, 65 | `$total = 0.0;` / `$total += $cantidad * $precio;` |
| `VentaService.php` | 69 | `if ($pagoInicial > $total + 0.01)` |
| `VentaService.php` | 241, 254-255 | `$monto = (float) …` / `$monto > $saldo + 0.01` |
| `FinanzasService.php` | 89-103 | costo, utilidad y margen calculados con `(float)` |

La base de datos guarda `DECIMAL(14,2)`, así que el total calculado en PHP puede
diferir del `SUM(detalle_venta)` en SQL. La auditoría estática cuenta **49 casts
monetarios a `float` y 4 comparaciones con `0.01`** repartidos en 12 servicios.

- **Impacto:** descuadres de centavos en cartera y reportes; pagos aceptados por encima
  del saldo dentro de la tolerancia; redondeo distinto entre capas.
- **Acción:** ADR 0001 + value object `Money` en centavos + tests de prorrateo.
- **Verificación:** `composer audit:static` con `dinero_float` y `tolerancia_dinero` en 0.

### F-03 · El precio unitario lo fija el cliente · Alta (decisión de negocio) · Semanas 1 y 8

`VentaService::crear()` toma `precio_unitario` del payload y solo exige que sea > 0.
Nunca lo compara con `productos.precio_venta`.

- **Si el precio es negociable** (habitual en distribución de productos
  perecederos): es correcto, pero falta registrar quién aplicó el descuento y
  cuánto, para auditoría.
- **Si no lo es:** un vendedor puede vender a 1 peso y el descuadre es invisible.
- **Acción:** decisión documentada en `docs/08-finanzas.md` + validación y log de
  descuentos si aplica.
- **Verificación:** test de integración que registre una venta con precio alterado y
  compruebe la regla elegida.

### F-04 · Hash de relleno con algoritmo distinto al real · Alta · Semana 7

`AuthService::login()` línea 57 usa un hash **bcrypt** (`$2y$12$…`) como relleno cuando
el correo no existe, mientras que las contraseñas reales usan **Argon2id**
(`algoritmo()` → `PASSWORD_ARGON2ID`). `password_verify` tarda distinto según el
algoritmo.

- **Impacto:** la mitigación de enumeración de usuarios por tiempo que documenta
  `docs/14-seguridad.md` §2 no se cumple.
- **Acción:** generar el relleno con `password_hash('', PASSWORD_ARGON2ID)` al arrancar
  (o guardarlo como constante con el mismo coste) y medir.
- **Verificación:** prueba con 100 intentos a correo existente e inexistente comparando
  mediana y desviación del tiempo de respuesta.

### F-05 · Sin CI · Alta · Semana 10 (esqueleto listo)

No existe `.github/`. Se añadió `ci.yml` con tres jobs: backend (sintaxis, tests,
auditoría), cliente (`npm ci` + `tsc` + build) e imagen Docker.

- **Acción pendiente tuya:** ejecutarlo en una rama, verlo verde y activar branch
  protection en `main`.
- **Verificación:** PR con un fallo deliberado que el pipeline bloquee.

### F-06 · Sin análisis estático · Alta · Semana 10

No hay PHPStan. `tools/audit.php` cubre el 20 % de bajo coste (tipado, strings de rol,
dinero, `SELECT *`, depuración).

- **Acción:** PHPStan nivel 5 en la semana 2 del plan original, nivel 6 en la 10.
- **Criterio:** no subir de nivel sin dejar el anterior en 0 errores.

### F-07 · Índices insuficientes en las tablas de operación · Alta · Semanas 3-4

`database/migrations/001_schema.sql` define `ventas` (L178-192), `detalle_venta`
(L193-203), `pagos` (L204-218) y `stock_movimientos` (L87-102) sin índices explícitos
para los filtros que usan los listados: rango de `fecha_venta`, `cliente_id` +
`estado_pago`, `venta_id` + fecha de pago, `producto_id` + `created_at`.

MySQL crea índices implícitos para las claves foráneas, pero no cubren `ORDER BY` ni
combinaciones de filtros.

- **Acción:** `EXPLAIN` de los listados reales y migración `007_indices_operacion.sql`.
- **Verificación:** tabla antes/después en `docs/sql/rendimiento.md`.

### F-08 · `Request` y `Database` acoplados a infraestructura · Media · Semanas 5-6

`Request` solo se construye desde `$_SERVER`, `$_GET` y `getallheaders()`, que no
existen en CLI. `Database` es un singleton con `PDO` privado.

- **Consecuencia:** los tests unitarios acceden por reflexión
  (`tests/Support/RequestFactory.php`) y los de integración no pueden inyectar una base
  de datos de test.
- **Acción:** `Request::fake(array $body, array $params, array $headers)` y un
  `Database::forTesting(PDO)` o un contenedor mínimo. Es el primer refactor de la
  semana 5, porque desbloquea los 15 tests de API de la semana 6.
- **Verificación:** borrar la reflexión de `RequestFactory` y `RoleMiddlewareTest` sin
  tocar sus asserts.

### F-09 · `Response` sin accesores · Baja · Semana 6

`Response` guarda `status`, `data`, `message` y `success` como propiedades privadas sin
getters. Los tests leen `status` con `ReflectionProperty`.

- **Acción:** añadir `status(): int`, `isSuccess(): bool` y `toArray(): array`
  (`toArray` además permite testear el contrato JSON sin `send()`).
- **Verificación:** los tests de `RoleMiddlewareTest` dejan de usar reflexión.

### F-10 · Doble lectura del producto y orden de bloqueo no determinista · Media · Semana 4

En `VentaService::crear()` cada ítem se lee dos veces (L60 para calcular el total, L88
para descontar stock). El bloqueo ocurre en la segunda pasada, en el orden en que llegan
los ítems del payload.

- **Impacto:** dos ventas con los mismos productos en orden distinto pueden provocar
  deadlock; MySQL aborta una y el cajero ve un error 500 sin reintento.
- **Acción:** deduplicar ítems, ordenar por `producto_id` antes de bloquear y capturar
  el error 1213 con un reintento acotado.
- **Verificación:** dos sesiones concurrentes en orden inverso, con log del deadlock y
  de la recuperación.

### F-11 · Compose solo para desarrollo · Media · Semana 9

`docker-compose.yml` monta `./backend` como volumen, no define healthcheck para `php` ni
límites de recursos, y no hay `compose.prod.yaml`.

- **Acción:** separar dev/prod, `HEALTHCHECK`, `opcache.validate_timestamps=0`, imagen
  por digest.
- **Verificación:** `docker compose -f compose.prod.yaml up` desde cero, sin pasos
  manuales.

### F-12 · Migraciones con contenido duplicado · Baja · Semana 3

`001_schema.sql` ya crea `cobros_qr` y `etiquetas`, y `002_cobros_qr.sql` /
`003_etiquetas.sql` las vuelven a crear. Funciona por `IF NOT EXISTS`, pero la
instalación limpia depende de ese detalle y confunde el orden real del esquema.

- **Acción:** consolidar en `001` y dejar `002`/`003` como no-op documentado, o
  regenerar un esquema base único.
- **Verificación:** instalación limpia con `docker compose up` en volumen vacío.

### F-13 · Alcance por usuario no definido · Baja hoy, Alta si hay multi-sucursal · Semana 8

`GET /api/v1/ventas/{id}` y `GET /api/v1/clientes` están protegidos por autenticación
pero no por pertenencia. En un negocio de una sola sede es una decisión razonable; si
algún día hay varias sedes o vendedores con cartera propia, es IDOR directo.

- **Acción:** declararlo explícitamente en `docs/04-roles-permisos.md` y añadir el test
  que documenta el comportamiento actual.

### F-14 · El README promete más de lo que el repo demuestra · Alta (credibilidad) · Semanas 5 y 12

"Calidad: TypeScript (tsc) · PHPUnit 11" y la sección de seguridad describen mecanismos
reales, pero sin tests que los respalden.

- **Acción:** no cambiar el README todavía; cambiarlo cuando `composer test` exista y
  cubra autenticación, permisos y dinero. En la semana 12, cada afirmación del README
  debe enlazar a un test, un ADR o una captura.

---

## 3. Lo que ya está por encima del promedio junior

Úsalo en entrevistas, con nombres de archivo:

1. **Transacciones con savepoints** (`Database::transaction`, L70-95): permite servicios
   anidados sin perder atomicidad. Poca gente junior lo implementa.
2. **Bloqueo pesimista en stock y pagos** (`StockService` L71-74,
   `VentaRepository::findSaldoForUpdate`): la sobreventa está resuelta a nivel de fila.
3. **Rotación de refresh con detección de reutilización y carrera**
   (`AuthService` L158-204): incluye el `UPDATE … WHERE usado = 0` que evita el doble
   canje.
4. **Cifrado versionado** `enc:v1:` con AES-256-GCM y retrocompatibilidad
   (`CryptoService`): formato preparado para rotar clave.
5. **Ocultamiento de costos en el controlador** (`ProductoController::sinCostos`): la
   restricción vive en el servidor, no en la UI.
6. **MySQL sin puerto publicado** y nginx como único punto de entrada.
7. **Documentación operativa** (13 documentos): inusual en un proyecto personal.

---

## 4. Cambios al plan de 12 semanas

1. **Semana 1 empieza por `Money`, no por enums.** El riesgo financiero es medible; los
   enums son higiene. `Money` además genera los primeros tests unitarios reales.
2. **Semana 4 pierde "envolver la venta en transacción"** (ya está) y gana deadlocks,
   orden de bloqueo, `EXPLAIN` e índices.
3. **Semana 5 incorpora un refactor de testabilidad** (`Request::fake()`,
   `Response::toArray()`) antes de escribir los 25 tests. Sin esas costuras, cada test de
   API necesita reflexión.
4. **Semana 6 prioriza la matriz rol × endpoint** por encima del resto de tests: es el
   artefacto que más impresiona y el que valida las afirmaciones del README.
5. **Semana 7 incluye F-04** (enumeración por tiempo) como caso de estudio obligatorio.

---

## 5. Herramientas añadidas en esta revisión

| Archivo | Para qué |
|---|---|
| `backend/phpunit.xml` | Configuración de suites `Unit` e `Integration`, cobertura sobre `src/` |
| `backend/tests/bootstrap.php` | Entorno mínimo sin BD; secretos de test vía `putenv` |
| `backend/tests/Support/RequestFactory.php` | Construcción de `Request` autenticado (deuda temporal) |
| `backend/tests/Unit/CryptoServiceTest.php` | 13 tests: roundtrip, IV aleatorio, clave errónea, payload corrupto |
| `backend/tests/Unit/RoleMiddlewareTest.php` | 13 tests: jerarquía de roles y no-ejecución del siguiente |
| `backend/tools/audit.php` | Línea base de hallazgos estáticos (semana 1) |
| `.github/workflows/ci.yml` | Backend, cliente e imagen en cada PR |
| `.github/pull_request_template.md` | Checklist de evidencia por PR |
| `docs/adr/0001-tipado-estricto-enums-y-money.md` | Decisión de `Money` y enums |

### Cómo ejecutarlo (sin PHP local, solo Docker)

```powershell
docker build -f docker/php/Dockerfile -t gcom-php .
docker run --rm -v "${PWD}/backend:/app" -w /app gcom-php composer install
docker run --rm -v "${PWD}/backend:/app" -w /app gcom-php composer test
docker run --rm -v "${PWD}/backend:/app" -w /app gcom-php composer audit:static
```

En Linux/macOS o CI, `composer lint` funciona directamente; en Windows usa el contenedor.

---

## 6. Orden de trabajo inmediato (esta semana)

1. Ejecutar `composer test` y dejar los tests en verde.
2. Implementar `Money` con sus tests (sin tocar servicios todavía).
3. Migrar `VentaService::crear()` y `registrarPago()` a `Money`; añadir tests de
   regresión de los flujos con abono y pago que excede saldo.
4. Sustituir `'admin'`, `'vendedor'` y `'readonly'` por el enum `Rol`.
5. Cerrar con `composer audit:static` y un PR único por paso.
