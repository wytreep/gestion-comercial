# 09 · Despliegue

## Requisitos

- Docker 24 o superior.
- Docker Compose v2.
- 2 GB de RAM disponibles.
- Puerto 8080 libre.

Para desarrollo sin Docker:

- PHP 8.4.27 o superior.
- Node.js 22 o superior.
- MySQL 8.0.

## Instalación con Docker

### 1. Configurar variables

```bash
cp .env.example .env
```

Genera los secretos:

```bash
php -r "echo bin2hex(random_bytes(48));"   # JWT_SECRET
php -r "echo bin2hex(random_bytes(24));"   # DB_PASSWORD
php -r "echo bin2hex(random_bytes(24));"   # DB_ROOT_PASSWORD
```

Edita `.env` y asigna:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `APP_ENV` | Sí | `development` o `production` |
| `APP_NAME` | No | Nombre visible |
| `APP_URL` | No | URL base |
| `DB_HOST` | Sí | `db` en Docker |
| `DB_PORT` | Sí | `3306` |
| `DB_NAME` | Sí | `gestion_comercial` |
| `DB_USER` | Sí | Usuario de la base |
| `DB_PASSWORD` | Sí | Contraseña del usuario |
| `DB_ROOT_PASSWORD` | Sí | Contraseña de root |
| `JWT_SECRET` | Sí | Clave de firma |
| `APP_KEY` | Sí | Clave AES-256-GCM de 64 hex para cifrar datos sensibles |
| `JWT_EXPIRY` | No | Segundos del access token (900) |
| `JWT_REFRESH_EXPIRY` | No | Segundos del refresh (604800) |
| `SECURITY_TOKEN_EXPIRY` | No | Segundos del token del panel de seguridad (600) |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes permitidos |
| `LOGIN_MAX_ATTEMPTS` | No | Fallos antes de bloquear (5) |
| `LOGIN_WINDOW_MINUTES` | No | Ventana de conteo (15) |
| `LOGIN_BLOCK_MINUTES` | No | Esperas por nivel (`5,30,1440,10080`) |
| `LOGIN_MAX_BLOCKS` | No | Bloqueos antes de la lista negra (5) |
| `LOGIN_RESET_DAYS` | No | Días sin bloqueos para reiniciar la escalada (30) |

`DB_PASSWORD` y `DB_ROOT_PASSWORD` no tienen valor por defecto. Si faltan,
Docker Compose no arranca.

### 2. Construir y levantar

```bash
docker compose up -d --build
```

Servicios:

| Servicio | Contenedor | Puerto |
|---|---|---|
| nginx | `gcom_nginx` | 8080 |
| php | `gcom_php` | interno 9000 |
| db | `gcom_db` | interno 3306 |

### 3. Crear el administrador

```bash
docker compose exec php php bin/reset-admin-password.php admin@gcom.local --create
```

No existe usuario por defecto.

### 4. Verificar

```bash
docker compose ps
curl http://localhost:8080/api/v1/auth/login
```

Abre <http://localhost:8080>.

## Estructura del proyecto

```
gestion-comercial/
├── backend/                API PHP
│   ├── bin/                Utilidades de consola
│   ├── config/             Rutas y configuración
│   ├── public/             Punto de entrada
│   └── src/                Código de la aplicación
├── client/                 SPA React
│   ├── public/
│   └── src/
├── database/
│   ├── migrations/         Esquema versionable
│   ├── seeds/              Datos de ejemplo (carga manual)
│   └── private/            Datos reales (no versionado)
├── docker/
│   ├── nginx/              Configuración y build del frontend
│   └── php/                Imagen PHP-FPM
├── docs/                   Documentación
├── docker-compose.yml
└── .env.example
```

## Flujo de actualización

```mermaid
flowchart LR
    A[Cambios] --> B[Build frontend]
    B --> C[Reiniciar PHP]
    C --> D[Verificar]
    D --> E[Respaldo]
```

Comandos:

```bash
cd client
npm run build

cd ..
docker compose build nginx
docker compose up -d nginx
docker compose restart php
```

Para validar sintaxis PHP:

```bash
docker compose exec -T php php -l src/Controllers/VentaController.php
```

## Datos iniciales

Una instalación nueva carga **solo el esquema y los tipos de gasto**. No crea
categorías, productos, clientes, ventas ni pagos: el catálogo es de cada negocio.

Para probar con datos realistas existe un catálogo de ejemplo (el del primer
negocio: pescado, queso y carne), que **no** se carga automáticamente:

```bash
docker compose cp database/seeds/demo_catalogo.sql db:/tmp/demo.sql
docker compose exec -T db sh -c \
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /tmp/demo.sql'
docker compose exec -T db rm -f /tmp/demo.sql
```

Los precios son de demostración. Cámbialos en **Productos** antes de operar con
clientes reales.

### Migraciones incrementales

`docker-compose.yml` monta `database/migrations/` en el directorio de
inicialización. En una base nueva, MySQL ejecuta los archivos en orden
alfabético. En una base existente, las migraciones nuevas se aplican a mano:

```bash
docker compose cp database/migrations/002_cobros_qr.sql db:/tmp/002_cobros_qr.sql
docker compose exec -T db sh -c \
  'mysql -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < /tmp/002_cobros_qr.sql'
docker compose exec -T db rm -f /tmp/002_cobros_qr.sql
```

### Importar datos operativos

Los dumps con datos reales viven en `database/private/` y no se versionan.

```bash
docker compose cp database/private/003_datos_actualizados.sql db:/tmp/datos.sql
docker compose exec -T db sh -c \
  'mysql -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < /tmp/datos.sql'
docker compose exec -T db rm -f /tmp/datos.sql
```

Advertencia: `003_datos_actualizados.sql` reemplaza los datos existentes. Úsalo
solo sobre una base nueva o después de un respaldo.

## Copias de seguridad

### Desde la aplicación

**Copias de seguridad → Generar** descarga un `.sql` con DDL y datos.

### Desde consola

```bash
docker compose exec -T db sh -c \
  'mysqldump -u root -p$MYSQL_ROOT_PASSWORD --single-transaction $MYSQL_DATABASE' \
  > respaldo.sql
```

### Restauración

```bash
docker compose cp respaldo.sql db:/tmp/respaldo.sql
docker compose exec -T db sh -c \
  'mysql -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < /tmp/respaldo.sql'
```

Verifica siempre la restauración en un entorno de prueba antes de hacerlo en
producción.

## Seguridad

El detalle de cada capa está en [14 · Seguridad](14-seguridad.md). Resumen:

- nginx es el único servicio publicado; MySQL no expone puertos al host.
- Contraseñas con Argon2id y cifrado AES-256-GCM de direcciones y notas.
- Access de 15 min y refresh de un solo uso atado a la IP y a la sesión.
- Sesiones revocables desde el panel de administración.
- Bloqueo de IP escalonado y lista negra tras 5 bloqueos.
- Cabeceras de seguridad y CSP estricta en nginx.
- Los secretos viven en .env; .env y database/private/ están fuera de Git.
- Errores internos ocultos en producción.
- Respaldos fuera del servidor.

### Antes de producción

1. `APP_ENV=production`.
2. HTTPS con certificado válido.
3. Firewall y acceso restringido.
4. Respaldos automáticos.
5. Monitoreo de logs.
6. Rotación de secretos.
7. Prueba de restauración.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| No abre el puerto 8080 | Contenedor detenido | `docker compose ps` y `up -d` |
| Error de conexión a la base | Variables incorrectas | Revisar `.env` |
| 401 en todas las peticiones | Token vencido | Iniciar sesión de nuevo |
| 403 en una acción | Rol sin permiso | Verificar rol del usuario |
| Cambios de frontend no se ven | Imagen sin reconstruir | `docker compose build nginx` |
| Cambios de PHP no se ven | OPcache | `docker compose restart php` |
| Login bloqueado | Rate limiting | Esperar 15 minutos |
| PDF no descarga | Error de TCPDF | Revisar logs de PHP |

## Logs

```bash
docker compose logs -f nginx
docker compose logs -f php
docker compose logs -f db
```

## Actualización de dependencias

Frontend:

```bash
cd client
npm update
npm run build
```

Backend:

```bash
docker compose exec php composer update
```

Validar siempre en un entorno de prueba antes de producción.
