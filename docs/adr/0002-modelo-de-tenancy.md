# ADR 0002 — Tenencia: instancia dedicada primero, base de datos por cliente después

- **Estado:** propuesto
- **Fecha:** 2026-11-23
- **Contexto del plan:** cierre de la semana 1, preparación del primer cliente externo
- **Ámbito:** despliegue, datos, operación y contrato comercial

## Contexto

Hoy el sistema corre en dos pilas: desarrollo (`docker-compose.yml`, 8081) y
operación (`compose.ops.yaml`, 8080). La pila de operación tiene nombres fijos
(`gcom_ops_*`), un volumen con nombre literal
(`gestion-comercial-v3_gcom_db_data`) y un único `.env`. Eso funciona para un
cliente; no permite dar de alta un segundo sin copiar y editar archivos a mano.

La intención comercial es que **cada cliente tenga su propio servicio y el
alojamiento de sus datos**. La pregunta técnica es cómo se consigue eso sin
convertir la operación en un trabajo de tiempo completo para una sola persona.

El producto es un ERP de catálogo abierto (pescado, queso y carne son el
catálogo del primer cliente). Tiene 26 tablas, triggers que recalculan totales
y saldos, vistas de reportes, JWT, cifrado AES-256-GCM y respaldos en SQL.

## Opciones consideradas

| Opción | Aislamiento | Coste por cliente | Riesgo principal |
|---|---|---|---|
| **A. Esquema compartido con `tenant_id`** | Bajo: una consulta sin `WHERE` mezcla clientes | Bajo | Fuga de datos entre clientes; auditoría de 26 tablas, triggers y vistas |
| **B. App compartida, una base por cliente** | Medio-alto: datos separados, credenciales compartidas por proceso | Medio | Un fallo de la app afecta a todos; enrutar el tenant sin errores |
| **C. Pila completa por cliente** | Alto: proceso, red, volumen y credenciales propios | Alto | N pilas que actualizar y vigilar; consumo de RAM por MySQL |

Se descarta **A**. El ahorro de infraestructura no compensa el riesgo de mezclar
datos de dos negocios y la promesa comercial ("sus datos en su servicio") deja
de poder demostrarse. Además obligaría a tocar las 26 tablas, los triggers y
todas las consultas de reportes, justo cuando el plan pide no abrir frentes.

## Decisión

1. **Fase 1 — instancia dedicada (ahora).** Cada cliente recibe su propia pila
   completa: nginx + PHP-FPM + MySQL, con volumen, red, secretos y puerto
   propios. El aislamiento es de proceso y de credenciales, no de `WHERE`.
2. **Fase 2 — base de datos por cliente sobre app compartida.** Cuando la
   operación de N pilas duela (actualizaciones, RAM, monitoreo), se pasa a una
   sola imagen y un solo nginx que resuelven el cliente por subdominio y abren
   la conexión a la base que corresponda. **Nunca `tenant_id`.**
3. **Un subdominio por cliente** (`cliente.dominio.com`) sobre un dominio único.
   El plano de control (alta, inventario, estado, versión) vive separado de los
   datos del negocio.
4. **Secretos por cliente.** `JWT_SECRET`, `APP_KEY`, `DB_PASSWORD` y
   `DB_ROOT_PASSWORD` se generan en el alta; no se reutilizan entre clientes.
   Un token de un cliente no vale en otro.
5. **Migraciones por cliente**, con copia previa y paso por desarrollo y por un
   cliente piloto antes de tocar al resto.
6. **Respaldo por cliente**, cifrado, fuera del servidor, con prueba de
   restauración trimestral. El respaldo es parte del producto, no un extra.
7. **TLS obligatorio** en todas las fases. HTTP solo para redirigir a HTTPS.
8. **El código es el mismo para todos.** Lo que cambia por cliente es
   configuración (`.env`), datos y, como máximo, catálogo y logo. Las
   personalizaciones de código se cobran aparte y se incorporan al tronco.

## Consecuencias

**A favor**

- La separación es demostrable: el cliente A no tiene credenciales ni red hacia
  la base del cliente B.
- Respaldo, restauración, exportación y baja de un cliente son operaciones
  locales a su pila.
- Un error grave en una actualización se puede revertir en un cliente sin tocar
  a los demás.
- El discurso comercial es simple: "su servicio, sus datos, su respaldo".

**En contra**

- Cada pila consume RAM: MySQL 8 ronda los 350–500 MB en reposo, más PHP-FPM y
  nginx. Un VPS de 8 GB aguanta del orden de **6–10 clientes** con holgura; a
  partir de ahí hay que repartir en más hosts o pasar a la fase 2.
- Actualizar es repetir el despliegue N veces. Sin un CLI que lo automatice, el
  trabajo crece linealmente con los clientes.
- El monitoreo y las alertas hay que multiplicarlos por cliente.
- El coste fijo por cliente es más alto que en un esquema compartido; se
  traslada al precio del plan.

## Qué falta en el repositorio (cambios concretos)

| Cambio | Archivo | Por qué |
|---|---|---|
| Parametrizar pila | `compose.ops.yaml` | `name`, `container_name`, `ports` y el nombre del volumen pasan a variables con los valores actuales como defecto. El cliente 1 no cambia. |
| Alta de cliente | `bin/tenant.php` (nuevo) | Crear `.env.<slug>`, generar secretos, levantar la pila, crear admin, registrar en el inventario. |
| Inventario | `clients.yaml` (nuevo) | Slug, plan, subdominio, versión, estado, último respaldo. Sin secretos. |
| Borde y TLS | `compose.edge.yaml` (nuevo) | Un proxy (Caddy o Traefik) que enruta por `Host` y renueva certificados. |
| Respaldo por cliente | `bin/tenant.php backup` | `mysqldump` con nombre `slug-fecha.sql`, cifrado y copia fuera del host. |
| Conexión por tenant (fase 2) | `backend/src/Core/Database.php` | Hoy es un singleton; pasará a un registro `Database::for($slug)` alimentado por un `TenantContext`. |
| Migraciones por tenant (fase 2) | `backend/bin/migrate.php` (nuevo) | Tabla de migraciones aplicadas por base; nunca `initdb.d` en caliente. |

## Aplicación por fases

**Ahora (semanas 2–3)**

1. Parametrizar `compose.ops.yaml` sin cambiar el comportamiento del cliente 1.
2. Escribir `bin/tenant.php` con `new`, `backup`, `restore`, `status` y `destroy`.
3. Montar el borde con TLS y un subdominio de prueba.
4. Dar de alta un cliente de prueba completo y medir el tiempo: objetivo,
   menos de 30 minutos y cero SQL manual.

**Antes del cliente 3**

5. Respaldos automáticos diarios y copia fuera del host.
6. Monitoreo mínimo: pila arriba, disco, último respaldo, errores 500.
7. Runbook de actualización y reversión por cliente.

**Fase 2 (cuando haga falta)**

8. `TenantContext` + `Database::for()` + rutas por `Host`.
9. Migrador por base y panel de control con estado de versión.
10. Prueba de aislamiento: desde el cliente A, intentar abrir la base del B y
    fallar por credenciales y por red.

## Criterios de cierre

- Un cliente nuevo se crea desde cero en menos de 30 minutos, sin editar SQL.
- Restaurar el respaldo de un cliente en una pila limpia deja el sistema
  operativo y con los totales que muestra la aplicación.
- `docker compose -p` con dos slugs distintos no colisiona en contenedores,
  redes, volúmenes ni puertos.
- Está documentado qué se hace al dar de baja a un cliente: exportar, entregar
  y borrar.

## Decisiones abiertas

- ¿Un VPS por cliente desde el inicio o varios clientes por VPS? El umbral
  propuesto es 6 clientes por host de 8 GB; se revisa con datos reales.
- ¿El precio incluye dominio y certificado o se facturan aparte?
- Retención y RPO/RTO por plan (propuesta en [17 · SaaS](17-saas.md)).
- ¿Dónde vive el plano de control: en el mismo proveedor o fuera de la red de
  los clientes?

## Referencias

- [09 · Despliegue](../09-despliegue.md)
- [14 · Seguridad](../14-seguridad.md)
- [17 · Modelo SaaS multi-cliente](../17-saas.md)
- ADR [0001](0001-tipado-estricto-enums-y-money.md)
