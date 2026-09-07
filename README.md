# 🐟 GestiónComercial v1.0

> Sistema de gestión de ventas, compras y contabilidad para negocios de **pescado, queso y carne serrana**.  
> Funciona 100% local sobre XAMPP — sin internet, sin servidores externos, sin costos de hosting.

![PHP](https://img.shields.io/badge/PHP-8.0+-777BB4?style=flat&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat&logo=mysql&logoColor=white)
![XAMPP](https://img.shields.io/badge/XAMPP-local-FB7A24?style=flat&logo=xampp&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalable-5A0FC8?style=flat&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/licencia-privada-gray?style=flat)

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 📊 **Dashboard** | KPIs del mes: ventas, cobrado, inversión, ganancia bruta, cartera pendiente y saldos por billetera |
| 🧾 **Ventas** | Crear, editar, cancelar/eliminar ventas. Búsqueda de clientes en tiempo real |
| 💳 **Abonos y pagos** | Pagos parciales con trazabilidad: efectivo o transferencia → caja / Nequi / Daviplata / Bancolombia |
| 📦 **Compras** | Registro de lotes con gastos operativos desglosados (transporte, cuarto frío). Stock automático |
| 💰 **Cartera** | Cuentas por cobrar con alertas de deudas vencidas y días de mora |
| 🏦 **Caja** | Flujo de dinero por período. Saldos por destino (efectivo, billeteras, banco) |
| 🏷️ **Productos** | Margen real calculado por kg (incluyendo costo real del pescado por canasta) |
| 👥 **Clientes** | Directorio con historial de compras por cliente |

---

## 🚀 Instalación rápida

### Prerrequisitos
- Windows 10/11
- [XAMPP](https://www.apachefriends.org) >= 8.2 con **Apache** y **MySQL** activos
- Chrome 90+ o Edge 90+

### Pasos

```bash
# 1. Clonar en htdocs de XAMPP
cd C:\xampp\htdocs
git clone https://github.com/wytreep/gestion-comercial.git pescaderia

# 2. Configurar la BD
cd pescaderia\api
copy config.example.php config.php
# Edita config.php con tu puerto MySQL (3306 o 3307)

# 3. Ejecutar el instalador automático
# Doble clic en instalar.bat
# (crea la BD, importa el schema, abre el navegador)
```

Accede en: **http://localhost/pescaderia**

> Guia completa en [docs/instalacion.md](docs/instalacion.md)

---

## 📲 Instalar como app de escritorio (PWA)

1. Abre `http://localhost/pescaderia` en Chrome o Edge
2. Haz clic en **"Instalar app"** en la barra superior
3. La app se instala como cualquier programa de Windows

> Los datos **no se pierden** al instalar — siguen en MySQL local.

---

## 🏗️ Arquitectura

```
Navegador (Chrome/Edge)
    └── SPA Vanilla JS (utils.js + api.js + app.js)
           │ fetch JSON
    Apache (XAMPP :80)
    └── api/index.php  ← Router REST PHP
           │ PDO
    MySQL (XAMPP :3307)
    └── gestion_comercial  ← 13 tablas + triggers + vistas
```

Sin frameworks externos. Sin Node.js. Sin npm. Todo corre sobre XAMPP estándar.

---

## 📁 Estructura

```
pescaderia/
├── index.php               # Shell HTML de la SPA
├── manifest.json           # Manifiesto PWA
├── sw.js                   # Service Worker
├── .htaccess               # Apache: MIME types, rewrite, headers
├── instalar.bat            # Instalador Windows automatico
├── generate_icons.php      # Genera iconos PWA
│
├── api/
│   ├── config.example.php  # Copia esto a config.php
│   └── index.php           # API REST (todos los endpoints)
│
├── assets/
│   ├── css/app.css
│   └── js/
│       ├── utils.js        # Helpers (IIFE)
│       ├── api.js          # Cliente HTTP
│       └── app.js          # Router SPA + vistas
│
├── db/
│   └── schema.sql          # DDL: tablas, triggers, vistas
│
└── docs/
    ├── arquitectura.md
    ├── api.md
    ├── base-de-datos.md
    └── instalacion.md
```

---

## 📚 Documentacion

| Documento | Descripcion |
|-----------|-------------|
| [docs/arquitectura.md](docs/arquitectura.md) | Stack, decisiones de diseno, flujo de la app |
| [docs/api.md](docs/api.md) | Endpoints REST con ejemplos de body y respuesta |
| [docs/base-de-datos.md](docs/base-de-datos.md) | Tablas, columnas, triggers, vistas y relaciones |
| [docs/instalacion.md](docs/instalacion.md) | Instalacion paso a paso y solucion de problemas |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios por version |

---

## 💡 Notas tecnicas

**Margen del pescado**
```
costo_por_kg = precio_canasta / kilos_por_canasta
margen       = (precio_venta_kg - costo_por_kg) / precio_venta_kg
```

**Ganancia bruta del dashboard**
```
Ganancia bruta = Total ventas del mes - Total invertido en compras del mes
```

**Stock del pescado** — el campo "Kilos estimados" en la compra define cuantos kg se suman al stock real, no el numero de canastas.

---

## ⚠️ Seguridad

- `api/config.php` esta en `.gitignore` — nunca subas ese archivo
- Usa `api/config.example.php` como plantilla
- Sistema disenado para red local. No publicar en internet sin autenticacion y HTTPS

---

## 👤 Autor

**wytreep** — Estudiante de Ingenieria de Software, UNIAJC, Cali, Colombia.

---

## 📄 Licencia

Uso privado. Prohibida la distribucion sin autorizacion del autor.
