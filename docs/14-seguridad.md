# 14 · Seguridad

Capas de protección del ERP: qué se cifra, cómo se emiten y revocan las
sesiones, cómo se frena la fuerza bruta y cómo se audita. Sirve como referencia
para operar el sistema y como checklist antes de un despliegue.

> Regla base: **el servidor decide**. El cliente solo muestra el estado; el
> bloqueo, la revocación y la validación de la IP viven en la base de datos y se
> comprueban en cada petición.

---

## 1. Resumen de capas

| Capa | Qué protege | Dónde vive |
|---|---|---|
| Contraseñas | Credenciales en reposo | `usuarios.password_hash` (Argon2id) |
| Cifrado de campos | Dirección y notas de clientes y proveedores | `CryptoService` (AES-256-GCM) |
| Access token | Autorización por petición | JWT de 15 min con `sid` y huella de IP |
| Refresh token | Continuidad de la sesión | JWT de 7 días, de un solo uso, guardado como SHA-256 |
| Sesiones revocables | Cierre inmediato de un acceso | Tabla `sesiones` |
| Bloqueo por IP | Fuerza bruta | Tabla `ip_bloqueos` con escalada |
| Lista negra | Atacante recurrente | `ip_bloqueos.permanente` |
| Bitácora | Auditoría | Tabla `eventos_seguridad` |
| Panel de seguridad | Consulta y acciones sensibles | `X-Security-Token` de 10 min |
| Cabeceras HTTP | Clickjacking, sniffing, inyección de scripts | `docker/nginx/nginx.conf` |

---

## 2. Contraseñas

- Hash con **Argon2id** (`password_hash`), con `password_verify` en el login.
- **Rehash transparente**: si el algoritmo o el coste cambian, la contraseña se
  vuelve a hashear en el siguiente inicio de sesión correcto.
- El login compara contra un hash de relleno cuando el correo no existe, para
  que el tiempo de respuesta no revele qué usuarios están registrados.
- Mínimo 8 caracteres al crear un usuario.
- Cambiar la contraseña revoca las demás sesiones abiertas del usuario.

## 3. Cifrado de datos sensibles

- Algoritmo **AES-256-GCM** con IV y tag aleatorios por registro.
- Clave en `APP_KEY` (64 caracteres hexadecimales = 32 bytes).
- Formato en la base de datos: `enc:v1:<base64(iv|tag|ciphertext)>`.
- Campos cifrados: `clientes.direccion`, `clientes.notas`, `proveedores.notas`.
- **Retrofit transparente**: un valor sin el prefijo `enc:v1:` se devuelve tal
  cual, así los registros anteriores siguen funcionando y se cifran al
  editarlos.
- El teléfono queda en claro porque la búsqueda lo usa y es un dato de contacto
  acotado.

> Si se pierde `APP_KEY`, los campos cifrados no se pueden recuperar. Guárdala
> junto al respaldo, en un gestor de secretos.

## 4. Sesiones y tokens

| Token | Vigencia | Contenido | Almacenamiento |
|---|---|---|---|
| Access | 15 min (`JWT_EXPIRY=900`) | `sub`, `rol`, `sid`, `jti`, `iph` | `localStorage` del cliente |
| Refresh | 7 días (`JWT_REFRESH_EXPIRY`) | `sub`, `sid`, `iph` | Hash SHA-256 en `refresh_tokens` |
| Seguridad | 10 min (`SECURITY_TOKEN_EXPIRY`) | `sub`, `rol`, `sid`, `iph` | Memoria del panel; no se persiste |

Cada inicio de sesión crea una fila en `sesiones` con IP, user-agent y
vencimiento. El access lleva el `sid` (id de sesión) y una huella HMAC de la IP;
en cada petición `AuthMiddleware` verifica:

1. Firma y expiración del JWT.
2. Que la sesión exista, no esté revocada y no haya expirado.
3. Que la IP de la petición coincida con la de la sesión y con la huella del
   token. Si no coincide, la sesión se revoca.

El refresh **rota en cada canje**: el token usado se marca y se emite uno nuevo.
Si un refresh ya usado vuelve a aparecer, se revoca la sesión y se registra
`refresh_reutilizado` en la bitácora. El canje usa un `UPDATE ... WHERE usado = 0`
para que dos peticiones simultáneas no puedan canjear el mismo token.

En el navegador, el canje se serializa con `navigator.locks` para que dos
pestañas no reutilicen el mismo refresh y provoquen un cierre de sesión.

**Revocación**: `POST /auth/logout`, el panel de administración, un cambio de
contraseña, desactivar al usuario o un cambio de IP.

## 5. Bloqueo por fuerza bruta

El contador vive en MySQL (`ip_bloqueos`) para respetarse entre workers de
PHP-FPM. Se cuentan fallos **por IP**, no por correo: rotar correos no evita el
bloqueo.

| Nivel | Espera | Qué ve el usuario |
|---|---|---|
| 1 | 5 minutos | Formulario deshabilitado y cuenta atrás |
| 2 | 30 minutos | Igual, con la espera mayor |
| 3 | 24 horas | Igual |
| 4 | 7 días | Igual |
| 5 | Permanente | Lista negra; solo el admin puede liberar la IP |

- 5 fallos seguidos disparan el siguiente nivel (`LOGIN_MAX_ATTEMPTS=5`).
- Un inicio de sesión correcto limpia los intentos, pero **no** el nivel.
- La escalada vuelve a cero tras 30 días sin bloqueos (`LOGIN_RESET_DAYS=30`).
- Un fallo fuera de la ventana de 15 minutos reinicia el contador de intentos.
- La respuesta `429` incluye `Retry-After` y `data.bloqueo`, `data.nivel`,
  `data.restante`, `data.permanente` y `data.hasta`.
- Con la IP bloqueada el login **no** valida credenciales: responde `429`
  incluso si la contraseña es correcta.

En la interfaz, `LoginPage` consulta `GET /auth/estado-ip` al cargar (un F5 no
reabre el formulario), deshabilita los campos, muestra el mensaje del escalón y
una cuenta atrás; al llegar a cero vuelve a preguntar el estado por si el
siguiente nivel ya está activo.

## 6. Panel de seguridad

Ruta `/admin` → pestaña **Seguridad**. Requiere rol `admin` **y** un token de
seguridad:

1. El administrador escribe su contraseña.
2. `POST /auth/seguridad` valida la contraseña y emite un token de 10 minutos
   atado a la sesión y a la IP.
3. El token se guarda **solo en memoria** y viaja en `X-Security-Token`.
4. Sin ese token las rutas responden `401`; caducado, el panel vuelve a pedir la
   contraseña.

Acciones disponibles: revocar sesiones activas, desbloquear IPs, enviar una IP a
la lista negra y revisar la bitácora. Cada acción queda registrada en
`eventos_seguridad` con el administrador responsable.

Tipos de evento: `bloqueo_ip`, `ip_lista_negra`, `bloqueo_manual`,
`desbloqueo_manual`, `sesion_revocada`, `refresh_reutilizado`,
`refresh_invalido`, `ip_cambiada` y `reautenticacion`.

## 7. Cabeceras y transporte

`docker/nginx/nginx.conf` aplica en todas las respuestas:

| Cabecera | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`; scripts solo del propio origen, estilos con `'unsafe-inline'` (React), fuentes de Google Fonts |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | cámara para el escáner QR; micrófono, geolocalización y pago deshabilitados |
| `Cross-Origin-Opener-Policy` | `same-origin` |

La CSP no permite scripts en línea: el tema inicial vive en
`client/public/tema-inicio.js`. El HTML se sirve con `Cache-Control: no-cache` y
la API con `no-cache`, para que un despliegue se vea en la siguiente carga.

> En producción, publica el sistema detrás de HTTPS (proxy o terminador TLS) y
> activa HSTS. En local se sirve por HTTP y HSTS no aplica.

## 8. Zona horaria

MySQL arranca en UTC y PHP en `America/Bogota`. `Database` fija en cada conexión
`SET time_zone = <offset de PHP>` para que `NOW()` y `date()` escriban la misma
hora. Sin esa alineación los vencimientos de bloqueos y sesiones salen corridos
cinco horas.

## 9. Variables de entorno

| Variable | Uso |
|---|---|
| `APP_KEY` | Clave de cifrado de campos (64 hex) |
| `JWT_SECRET` | Firma de los JWT |
| `JWT_EXPIRY` | Minutos del access token (900) |
| `JWT_REFRESH_EXPIRY` | Segundos del refresh (604800) |
| `SECURITY_TOKEN_EXPIRY` | Segundos del token del panel (600) |
| `LOGIN_MAX_ATTEMPTS` | Fallos antes de bloquear (5) |
| `LOGIN_WINDOW_MINUTES` | Ventana para contar fallos (15) |
| `LOGIN_BLOCK_MINUTES` | Esperas por nivel (`5,30,1440,10080`) |
| `LOGIN_MAX_BLOCKS` | Bloqueos antes de la lista negra (5) |
| `LOGIN_RESET_DAYS` | Días sin bloqueos para reiniciar la escalada (30) |

`.env.example` trae los valores por defecto; `.env` nunca se versiona.

## 10. Checklist antes de desplegar

- [ ] `APP_KEY` y `JWT_SECRET` propios, aleatorios y fuera del repositorio.
- [ ] `APP_ENV=production` (sin detalles de excepción en las respuestas).
- [ ] Migraciones `005` y `006` aplicadas.
- [ ] HTTPS activo y HSTS en el terminador TLS.
- [ ] `docker compose up -d --force-recreate php nginx` para recargar variables.
- [ ] Login correcto, refresh rotativo y reutilización revocando la sesión.
- [ ] 5 fallos bloquean 5 minutos y la cuenta atrás aparece en el login.
- [ ] Panel de seguridad pide contraseña y caduca a los 10 minutos.
- [ ] Respaldo de la base junto con `APP_KEY`.

## 11. Limitaciones conocidas

- El bloqueo es por IP: varias personas detrás de un mismo NAT comparten
  contador.
- La IP se toma de `REMOTE_ADDR`; si algún día se pone un proxy delante, hay que
  confiar en `X-Forwarded-For` de forma explícita.
- El access token se guarda en `localStorage` (necesario para el refresh
  automático); la mitigación es su vigencia corta y la revocación por sesión.
- No hay 2FA. El diseño deja el hueco: `AuthService::login` es el único punto
  donde se emite la sesión.
