# Guía de Instalación — GestiónComercial v1.0

## Requisitos

| Componente | Versión mínima | Notas |
|-----------|---------------|-------|
| Windows | 10 / 11 | |
| XAMPP | 8.2+ | Con Apache y MySQL |
| Navegador | Chrome 90+ / Edge 90+ | Para instalar la PWA |
| PHP | 8.0+ | Incluido en XAMPP |
| MySQL | 8.0+ | Incluido en XAMPP |

---

## Opción A — Instalación automática (recomendada)

### Paso 1: Descargar e instalar XAMPP
Si aún no tienes XAMPP:
1. Ve a [https://www.apachefriends.org](https://www.apachefriends.org)
2. Descarga la versión para Windows
3. Instala en `C:\xampp` (ruta por defecto)

### Paso 2: Clonar el repositorio

```bash
cd C:\xampp\htdocs
git clone https://github.com/wytreep/gestion-comercial.git pescaderia
```

O si descargaste el ZIP, extrae la carpeta `pescaderia/` en `C:\xampp\htdocs\`.

### Paso 3: Configurar la conexión a la base de datos

```bash
cd C:\xampp\htdocs\pescaderia\api
copy config.example.php config.php
```

Abre `config.php` y ajusta:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');        // Vacío en XAMPP por defecto
define('DB_NAME', 'gestion_comercial');
define('DB_PORT', 3307);      // Verifica tu puerto en XAMPP
```

> **¿Cómo verificar el puerto MySQL?**  
> Abre XAMPP Control Panel → fila MySQL → columna Port.  
> Generalmente es `3306` o `3307`.

### Paso 4: Iniciar XAMPP y ejecutar el instalador

1. Abre **XAMPP Control Panel**
2. Haz clic en **Start** en la fila de **Apache**
3. Haz clic en **Start** en la fila de **MySQL**
4. Haz doble clic en `instalar.bat` dentro de la carpeta del proyecto

El instalador:
- Crea la base de datos `gestion_comercial`
- Importa el schema con todas las tablas y datos iniciales
- Genera los iconos PNG para la PWA
- Abre automáticamente el navegador en `http://localhost/pescaderia`

---

## Opción B — Instalación manual

### Paso 1 — Copiar archivos
Copia la carpeta `pescaderia/` en `C:\xampp\htdocs\`.

### Paso 2 — Configurar config.php
```bash
cd api/
copy config.example.php config.php
# Editar config.php con tus datos
```

### Paso 3 — Crear la base de datos

1. Inicia Apache y MySQL en XAMPP
2. Abre `http://localhost/phpmyadmin`
3. Crea la base de datos:
   - Nombre: `gestion_comercial`
   - Cotejamiento: `utf8mb4_unicode_ci`
4. Selecciona la BD recién creada
5. Ve a la pestaña **Importar**
6. Selecciona el archivo `db/schema.sql`
7. Haz clic en **Importar**

### Paso 4 — Generar iconos PWA (opcional)
```bash
cd C:\xampp\htdocs\pescaderia
C:\xampp\php\php.exe generate_icons.php
```

### Paso 5 — Acceder
Abre `http://localhost/pescaderia` en Chrome o Edge.

---

## Instalar como app de escritorio (PWA)

Una vez que la app esté corriendo en el navegador:

1. Abre `http://localhost/pescaderia` en **Chrome** o **Edge**
2. Espera a que aparezca el botón **"⬇ Instalar app"** en la barra superior de la web  
   *(o busca el ícono de instalación en la barra de direcciones del navegador)*
3. Haz clic y confirma la instalación
4. La app aparece en el escritorio y en el menú de inicio de Windows
5. Ábrela como cualquier otra aplicación

> ⚠️ **XAMPP debe estar activo** para que la app funcione, aunque esté instalada en el escritorio.  
> La PWA es un acceso directo a `http://localhost/pescaderia` — la información sigue en MySQL local.

---

## Migración — si ya tenías la v1.0 instalada

Si actualizas desde una versión anterior, ejecuta en phpMyAdmin:

```sql
USE gestion_comercial;

-- Agregar campo de kilos por canasta para calcular margen real del pescado
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS kilos_por_canasta DECIMAL(8,3) NULL
  COMMENT 'Solo pescado: kg promedio por media canasta'
  AFTER precio_venta;

-- Valor inicial estimado de 15 kg por media canasta
UPDATE productos
  SET kilos_por_canasta = 15
  WHERE unidad_medida = 'canasta';
```

Luego reemplaza los archivos `.php`, `.js` y `.css` manteniendo tu `config.php` intacto.

---

## Verificación de instalación

Después de instalar, la barra superior de la app debe mostrar:

- ✅ **"● BD conectada"** en verde → todo correcto
- ❌ **"✕ Sin BD — Inicia XAMPP"** en rojo → verifica que Apache y MySQL estén activos

---

## Solución de problemas

### "Refused to apply style" o "Refused to execute script" en consola
Verifica que el `.htaccess` esté activo. En XAMPP debes habilitar `mod_rewrite`:
1. Abre `C:\xampp\apache\conf\httpd.conf`
2. Busca `#LoadModule rewrite_module` y quita el `#`
3. Reinicia Apache

### Error de conexión a la base de datos
- Verifica que MySQL esté activo en XAMPP
- Confirma el puerto en `config.php` (puede ser 3306 o 3307)
- Verifica que la BD `gestion_comercial` exista en phpMyAdmin

### La PWA no ofrece instalación
- Usa Chrome o Edge (Firefox no soporta instalación de PWA)
- Verifica que el Service Worker esté registrado (F12 → Application → Service Workers)
- La app debe estar en HTTPS o en `localhost` para que el SW funcione

### Stock negativo en productos
Ocurre cuando se registran ventas sin tener compras previas. Ajusta el stock manualmente:
```sql
UPDATE productos SET stock_actual = 20 WHERE nombre = 'Queso';
```
O usa el botón de ajuste de stock en la sección Productos y precios.

### El instalador .bat dice "MySQL no responde"
1. Asegúrate de que MySQL esté iniciado en XAMPP
2. Espera 10 segundos y vuelve a ejecutar
3. Si persiste, importa `db/schema.sql` manualmente desde phpMyAdmin

---

## Desinstalación

1. Detén Apache y MySQL en XAMPP
2. Elimina la carpeta `C:\xampp\htdocs\pescaderia\`
3. En phpMyAdmin, elimina la base de datos `gestion_comercial`
4. Si instalaste la PWA, desinstálala desde Windows: Inicio → clic derecho → Desinstalar
