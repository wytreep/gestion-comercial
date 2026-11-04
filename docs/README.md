# Documentación — Gestión Comercial

Documentación funcional, técnica y visual del sistema de gestión comercial para
distribución de pescado, queso y carne.

| Documento | Contenido |
|---|---|
| [01 · Visión general](01-vision-general.md) | Alcance, ficha del proyecto, fechas, stack y uso de IA |
| [02 · Arquitectura](02-arquitectura.md) | Capas, componentes, despliegue y flujos |
| [03 · Modelo de datos](03-modelo-datos.md) | Diagrama ER y diccionario de tablas |
| [04 · Roles y permisos](04-roles-permisos.md) | Matriz de acceso y reglas de negocio |
| [05 · Manual del administrador](05-manual-administrador.md) | Operación diaria y tareas de control |
| [06 · Manual del vendedor](06-manual-vendedor.md) | Flujo de venta, cartera y consultas |
| [07 · API REST](07-api.md) | Endpoints, autenticación y errores |
| [08 · Finanzas](08-finanzas.md) | Estado de resultados, flujo de caja e indicadores |
| [09 · Despliegue](09-despliegue.md) | Docker, configuración, respaldo y recuperación |
| [10 · Roadmap](10-roadmap.md) | Escáner QR, facturación electrónica y mejoras |
| [11 · Mockups](11-mockups.md) | Wireframes de las pantallas principales |

## Versión documentada

- **Producto:** Gestión Comercial
- **Versión:** 3.0.0
- **Fecha de documento:** 3 de noviembre de 2026
- **Periodo de construcción:** septiembre – noviembre de 2026
- **Estado:** operativo en entorno local, preparado para despliegue controlado

## Ruta rápida

1. Si vas a instalar el sistema, empieza por el [manual de despliegue](09-despliegue.md).
2. Si vas a usarlo, lee el manual de tu rol: [administrador](05-manual-administrador.md) o [vendedor](06-manual-vendedor.md).
3. Si vas a mantenerlo, revisa [arquitectura](02-arquitectura.md), [modelo de datos](03-modelo-datos.md) y [API](07-api.md).
4. Si vas a planear la siguiente etapa, revisa el [roadmap](10-roadmap.md).

## Convenciones

- Moneda: peso colombiano (COP), sin decimales en pantalla.
- Zona horaria de operación: `America/Bogota`.
- Fechas en pantalla: `dd/mm/aaaa`.
- Formatos monetarios y cantidades: `1.234,56` (punto de miles, coma decimal).
- No se maneja IVA en esta versión. El modelo queda preparado para incorporarlo.
