# Documentación — Gestión Comercial

Documentación funcional, técnica y visual de Gestión Comercial, un ERP
multi-cliente para distribución y comercio. El catálogo de pescado, queso y carne
es el del primer cliente; el producto no impone un catálogo ni un giro único.

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
| [12 · Integración Chulito](12-integracion-chulito.md) | Borrador de integración con Chulito |
| [13 · Guía visual](13-guia-visual.md) | Tokens, escala tipográfica, componentes y checklist de revisión |
| [14 · Seguridad](14-seguridad.md) | Cifrado, sesiones revocables, bloqueo por IP y panel de seguridad |
| [15 · Auditoría técnica](auditoria-2026-11-16.md) | Hallazgos verificados, prioridades y línea base de calidad |
| [16 · Progreso](progreso.md) | Estado real de las 12 semanas, métricas y revisión semanal |
| [17 · Modelo SaaS](17-saas.md) | Una instancia por cliente: altas, actualizaciones, respaldos, precios y SLA |
| [ADR 0001](adr/0001-tipado-estricto-enums-y-money.md) | Dinero en centavos, `strict_types` y enums de dominio |
| [ADR 0002](adr/0002-modelo-de-tenancy.md) | Decisión de tenencia: instancia dedicada y base por cliente, sin `tenant_id` |

## Versión documentada

- **Producto:** Gestión Comercial
- **Versión:** 3.1.0
- **Fecha de documento:** 24 de noviembre de 2026
- **Periodo de construcción:** septiembre – noviembre de 2026
- **Estado:** operativo en entorno local, preparado para despliegue controlado

## Ruta rápida

1. Si vas a instalar el sistema, empieza por el [manual de despliegue](09-despliegue.md).
2. Si vas a usarlo, lee el manual de tu rol: [administrador](05-manual-administrador.md) o [vendedor](06-manual-vendedor.md).
3. Si vas a mantenerlo, revisa [arquitectura](02-arquitectura.md), [modelo de datos](03-modelo-datos.md) y [API](07-api.md).
4. Si vas a venderlo a más de un negocio, revisa [modelo SaaS](17-saas.md) y el [ADR 0002](adr/0002-modelo-de-tenancy.md).
5. Si vas a planear la siguiente etapa, revisa el [roadmap](10-roadmap.md).

## Entregables Word

Los tres tomos comparten el mismo contenido y se diferencian en tipografía,
márgenes, numeración, citas y estilo de tablas y figuras.

| Edición | Archivo | Formato |
|---|---|---|
| IEEE | [`entregables/word/Gestion-Comercial-IEEE.docx`](entregables/word/Gestion-Comercial-IEEE.docx) | Carta, Times New Roman 10 pt, citas numéricas, secciones romanas |
| ISO 690 | [`entregables/word/Gestion-Comercial-ISO690.docx`](entregables/word/Gestion-Comercial-ISO690.docx) | A4, Arial 10,5 pt, numeración decimal ISO 2145 |
| APA 7 | [`entregables/word/Gestion-Comercial-APA7.docx`](entregables/word/Gestion-Comercial-APA7.docx) | Carta, Times New Roman 12 pt, doble espacio, autor-fecha |

Los tomos incluyen portada, control del documento, resumen y abstract, índice,
listas de figuras y tablas, 17 capítulos, anexos A–D, 21 figuras y 110 tablas.
El ER se inserta en A3 y las páginas horizontales se abren solo cuando el texto
quedaría por debajo de 6 pt. Los diagramas Mermaid y los mockups SVG se
rasterizan antes de construir el documento.

```powershell
py -3 tools/docgen/render_diagrams.py   # Mermaid + mockups -> PNG y manifiestos
py -3 tools/docgen/build_docs.py        # tres tomos + paquete legal
```

## Paquete legal

Los documentos son borradores para revisión jurídica. Comparten placeholders de
razón social, NIT, domicilio, representante legal y contacto.

| Código | Documento |
|---|---|
| GC-LEG-00 | Índice del paquete legal |
| GC-LEG-01 | Aviso legal |
| GC-LEG-02 | Política de privacidad y tratamiento de datos personales |
| GC-LEG-03 | Términos y condiciones de uso |
| GC-LEG-04 | Acuerdo de encargo de tratamiento de datos personales |
| GC-LEG-05 | Acuerdo de nivel de servicio |
| GC-LEG-06 | Política de cookies |
| GC-LEG-07 | Política de seguridad de la información |
| GC-LEG-08 | Política de retención y eliminación de datos |
| GC-LEG-09 | Acuerdo de confidencialidad |
| GC-LEG-10 | Contrato de prestación de servicios SaaS |
| GC-LEG-11 | Autorización de tratamiento de datos personales |
| GC-LEG-12 | Política de gestión de incidentes de seguridad |
| GC-LEG-13 | Anexo de subencargados del tratamiento |

Las fuentes Markdown viven en [`legal/`](legal/) y los .docx en
[`entregables/word/legal/`](entregables/word/legal/).

## Convenciones

- Moneda: peso colombiano (COP), sin decimales en pantalla.
- Zona horaria de operación: `America/Bogota`.
- Fechas en pantalla: `dd/mm/aaaa`.
- Formatos monetarios y cantidades: `1.234,56` (punto de miles, coma decimal).
- No se maneja IVA en esta versión. El modelo queda preparado para incorporarlo.
