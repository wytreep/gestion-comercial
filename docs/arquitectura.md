# Arquitectura del Sistema — GestiónComercial v1.0

## Visión general

Aplicación web local que corre sobre **XAMPP** (Apache + MySQL/PHP) en un portátil Windows. No depende de internet para operar. Se instala como PWA en el escritorio del usuario sin perder los datos, que residen en MySQL local.

```
┌─────────────────────────────────────────────────────────┐
│                   NAVEGADOR (Chrome/Edge)                │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │            SPA — Single Page Application        │   │
│   │   index.php → utils.js → api.js → app.js       │   │
│   │              Service Worker (PWA)               │   │
│   └──────────────────────┬──────────────────────────┘   │
└──────────────────────────│──────────────────────────────┘
                           │ HTTP / JSON
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  XAMPP (localhost:80)                    │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │              Apache + mod_rewrite                │  │
│   │   Archivos estáticos → servir directo            │  │
│   │   /api/*             → api/index.php (router)   │  │
│   │   Rutas SPA          → index.php (shell)        │  │
│   └──────────────────────┬───────────────────────────┘  │
│                          │ PHP PDO                       │
│   ┌──────────────────────▼───────────────────────────┐  │
│   │           MySQL 8 — puerto 3307                  │  │
│   │           Base de datos: gestion_comercial       │  │
│   └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

| Capa | Tecnología | Versión mínima |
|------|-----------|----------------|
| Servidor web | Apache (XAMPP) | 2.4 |
| Backend | PHP | 8.0 |
| Base de datos | MySQL | 8.0 |
| Frontend | HTML5 + CSS3 + JavaScript | ES2020 |
| Instalación escritorio | PWA + Service Worker | — |

**Sin dependencias externas de JavaScript.** Sin Node.js, sin npm, sin frameworks.

---

## Estructura de archivos

```
pescaderia/
│
├── index.php               # Shell HTML de la SPA
├── manifest.json           # Manifiesto PWA
├── sw.js                   # Service Worker
├── .htaccess               # Apache: MIME types, rewrite, headers
├── .gitignore
├── instalar.bat            # Instalador Windows automático
├── generate_icons.php      # Genera iconos PWA con GD
│
├── api/
│   ├── config.php          # Conexión PDO + helpers (NO en git)
│   ├── config.example.php  # Plantilla de configuración (en git)
│   └── index.php           # Router REST + todos los endpoints
│
├── assets/
│   ├── css/app.css         # Estilos globales (design system propio)
│   └── js/
│       ├── utils.js        # Formato, badges, toasts, modales (IIFE)
│       ├── api.js          # Cliente HTTP para la API REST
│       └── app.js          # Router SPA + controladores de vistas
│
├── db/
│   └── schema.sql          # DDL: tablas, triggers, vistas, datos iniciales
│
└── docs/
    ├── arquitectura.md     # Este documento
    ├── api.md              # Referencia de endpoints REST
    ├── base-de-datos.md    # Diagrama y descripción de tablas
    └── instalacion.md      # Guía de instalación detallada
```

---

## Frontend — SPA Vanilla JS

### Flujo de carga

```
1. Navegador carga index.php
2. Se registra el Service Worker (sw.js)
3. Se cargan utils.js → api.js → app.js (en orden)
4. app.js lee ?page= de la URL y llama renderPage()
5. renderPage() invoca la función render correspondiente
6. Cada función render hace fetch a la API y construye el DOM
```

### Router

```javascript
// Navegación sin recarga
navigate('ventas')
  → history.pushState({ page: 'ventas' }, '', '?page=ventas')
  → renderPage('ventas')
  → renderVentas(mainEl)
```

### Módulos JS

| Archivo | Responsabilidad |
|---------|----------------|
| `utils.js` | Funciones puras: formatCOP, badge, toast, openModal. Envuelto en IIFE para no contaminar scope global. Expone `window.Utils` |
| `api.js` | Cliente HTTP. Construye URLs, hace fetch, lanza Error si `success: false`. Expone `window.API` |
| `app.js` | Router + todas las funciones `render*`. Importa Utils via destructuring con `var` |

### Decisión: `var` en lugar de `const` para aliases de Utils

```javascript
// ✅ Correcto — var no lanza SyntaxError si se redeclara en el mismo scope
var formatCOP = Utils.formatCOP;

// ❌ Rompía con 'use strict' porque utils.js también tiene formatCOP en scope
const { formatCOP } = Utils;
```

---

## Backend — API REST PHP

### Routing

Todas las peticiones pasan por `api/index.php`. El recurso se lee del query string:

```
GET /pescaderia/api/?resource=ventas&action=list
GET /pescaderia/api/?resource=ventas&id=5
POST /pescaderia/api/?resource=ventas
PUT  /pescaderia/api/?resource=ventas&id=5
DELETE /pescaderia/api/?resource=ventas&id=5
```

### Respuesta estándar

```json
{
  "success": true,
  "message": "Venta registrada exitosamente",
  "data": { "id": 42 }
}
```

### Manejo de errores

Todos los handlers usan `try/catch`. Los errores de PDO y de negocio se capturan en el router principal y se devuelven como `success: false` con el mensaje correspondiente.

### Transacciones

Las operaciones que modifican múltiples tablas (crear venta, editar compra, eliminar venta) usan transacciones PDO con rollback explícito:

```php
$db->beginTransaction();
try {
    // operaciones...
    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    throw $e;
}
```

---

## Base de datos

### Triggers automáticos

Los totales nunca se calculan en PHP — los mantienen triggers MySQL:

| Trigger | Evento | Efecto |
|---------|--------|--------|
| `trg_after_pago_insert` | INSERT pagos | Actualiza `ventas.total_pagado` y `estado_pago` |
| `trg_after_detalle_compra_*` | INSERT/UPDATE detalle_compra | Actualiza `compras.total_productos` |
| `trg_after_gasto_compra_*` | INSERT/UPDATE gastos_compra | Actualiza `compras.total_gastos` |
| `trg_after_detalle_venta_*` | INSERT/UPDATE detalle_venta | Actualiza `ventas.total` |

### Columnas generadas

```sql
-- En compras: total_inversion se calcula automáticamente
total_inversion DECIMAL(14,2) GENERATED ALWAYS AS (total_productos + total_gastos) STORED

-- En ventas: saldo_pendiente se calcula automáticamente
saldo_pendiente DECIMAL(14,2) GENERATED ALWAYS AS (total - total_pagado) STORED
```

---

## PWA — Progressive Web App

### Estrategia de caché (Service Worker)

```
Petición entrante
    │
    ├── URL contiene /api/ ?
    │       SÍ → Network first (datos siempre frescos)
    │             Si falla → respuesta JSON de error
    │
    └── NO → Cache first (assets estáticos)
              Si no está en caché → fetch y guardar
```

### Instalación en escritorio

1. El Service Worker se registra al cargar la app
2. El navegador dispara `beforeinstallprompt` si la app cumple los criterios PWA
3. El botón "⬇ Instalar app" aparece en la barra superior
4. Al confirmar, el navegador crea un acceso directo en el escritorio
5. La app abre sin barra de navegador (`display: standalone`)
6. Los datos siguen en MySQL local — la PWA solo es un "contenedor" de la URL

---

## Decisiones de diseño

### ¿Por qué sin framework JS (React/Vue)?

- El cliente usa XAMPP en un portátil sin acceso a npm en producción
- Reduce la complejidad de instalación a cero
- El tamaño total del JS es ~45KB — más que suficiente para la escala del negocio
- Facilita el mantenimiento por parte de desarrolladores PHP

### ¿Por qué SPA y no páginas PHP separadas?

- Navegación instantánea sin recargas de página
- Un solo punto de entrada simplifica el `.htaccess`
- Permite la instalación como PWA con experiencia de app nativa

### ¿Por qué el margen de pescado es diferente?

El pescado se compra por **media canasta** (unidad = precio global) y se vende por **kilo**. Comparar directamente `precio_venta_kilo` con `precio_compra_canasta` da un margen absurdo (-667%). La solución es el campo `kilos_por_canasta`:

```
costo_real_por_kg = precio_canasta / kilos_por_canasta
margen_real       = (precio_venta_kg - costo_real_por_kg) / precio_venta_kg
```

### ¿Por qué ganancia bruta = ventas − inversión y no ventas − costo_mercancía?

Con el modelo de venta de pescado, el costo por unidad vendida no es confiable a nivel de detalle de venta porque:
1. Una canasta puede tener más o menos kilos según el día
2. El `precio_compra` actual puede no coincidir con el de la compra que generó ese stock

La comparación `ventas del mes − compras del mes` es la métrica de rentabilidad más honesta y auditable.
