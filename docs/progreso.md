# Progreso del plan de 12 semanas

**Inicio:** 17 nov 2026 · **Cierre previsto:** 14 feb 2027
**Base semanal:** 20 h (semanas 5 y 6 a 10 h por festivos)
**Regla de corte:** si una semana se complica, se entrega el 70 % y no se toca la siguiente.

## Estado por semana

| Semana | Fechas | Foco | Estado | Evidencia |
|---|---|---|---|---|
| 0 | 17 – 22 nov | Base de calidad: PHPUnit, auditoría estática, CI | En revisión | `composer test` 26/26, auditoría en 81 con trinquete, CI en verde (run 4) |
| 1 | 23 – 29 nov | `Money`, enums `Rol` / `EstadoPedido` / `EstadoPago` | En revisión | `Money` + ventas y cobro en centavos; enums de rol, pedido y pago: 69 tests, auditoría en 55, tolerancias y roles mágicos en 0 |
| 2 | 30 nov – 6 dic | Laravel: `laravel-cartera-api` v0.1 | Pendiente | — |
| 3 | 7 – 13 dic | SQL: joins, subconsultas, vistas | Pendiente | — |
| 4 | 14 – 20 dic | SQL: transacciones, índices, `EXPLAIN` | Pendiente | — |
| 5 | 21 – 27 dic | PHPUnit unitarias (semana ligera) | Pendiente | — |
| 6 | 28 dic – 3 ene | Tests de API (semana ligera) | Pendiente | — |
| 7 | 4 – 10 ene | Seguridad I: authN, sesiones, JWT | Pendiente | — |
| 8 | 11 – 17 ene | Seguridad II: authZ, IDOR, injection | Pendiente | — |
| 9 | 18 – 24 ene | Docker de producción | Pendiente | — |
| 10 | 25 – 31 ene | CI/CD y branch protection | Pendiente | — |
| 11 | 1 – 7 feb | AWS: despliegue con runbook | Pendiente | — |
| 12 | 8 – 14 feb | Portafolio, ADRs, demo ES/EN, CV | Pendiente | — |

## Línea base medible

| Métrica | Base (17 nov) | Actual (23 nov) | Objetivo |
|---|---:|---:|---|
| Tests unitarios en verde | 26 | 69 | 40 |
| Tests de API / integración | 0 | 0 | 15 (semana 6) |
| Hallazgos de auditoría estática | 81 | 55 | 0 en `strict_types`, `rol_magico` y `dinero_float` (semana 1) |
| Casts monetarios a `float` | 49 | 38 | 0 |
| Comparaciones con `0.01` | 4 | 0 | 0 |
| Strings de rol mágicos | 11 | 0 | 0 |

Los tests se cuentan por separado a propósito: 69 unitarios no cubren la capa
HTTP. La fila de API sigue en 0 hasta la semana 6 y no debe leerse como avance.

El umbral de `composer audit:static` (`--max`) solo baja. Si sube, el PR no se mergea.

Los 38 casts restantes están en los servicios de lectura (`FinanzasService`,
`ReporteService`, `DashboardService`, `CajaService`), que convierten sumas de
SQL para el JSON de reportes. No intervienen en lo que se cobra ni se guarda, y
van en el PR siguiente: primero se cierra el dinero exacto donde se escribe.
Fecha comprometida: semanas 3–4 (7–20 dic).

Los enums `Rol`, `EstadoPedido` y `EstadoPago` ya son la única fuente de los
valores: `RoleMiddleware`, `AuthService`, `Request`, `VentaService`,
`CobroQrService` y el resto de la API comparan contra ellos, y
`DomainEnumTest` falla si PHP y MySQL dejan de coincidir.

## Entregables de documentación

| Entregable | Archivo | Páginas | Evidencia |
|---|---|---:|---|
| Tomo IEEE | `docs/entregables/word/Gestion-Comercial-IEEE.docx` | 125 | 21 figuras, 110 tablas, ER en A3 y páginas horizontales para roadmap y mockups |
| Tomo ISO 690 | `docs/entregables/word/Gestion-Comercial-ISO690.docx` | 134 | A4, Arial 10,5 pt, numeración decimal y anexos A.1/B.1/C.1 |
| Tomo APA 7 | `docs/entregables/word/Gestion-Comercial-APA7.docx` | 188 | Doble espacio, tablas sin líneas internas y referencias con sangría francesa |
| Paquete legal | `docs/entregables/word/legal/` | 14 documentos | GC-LEG-00 a GC-LEG-13, borrador para revisión jurídica |

Los tres tomos se generan desde las mismas fuentes Markdown:

```powershell
py -3 tools/docgen/render_diagrams.py
py -3 tools/docgen/build_docs.py
```

Los conteos corresponden a la compilación del 24 de noviembre de 2026 y pueden
variar cuando Word actualiza los campos. Los seis diagramas previstos (D-01 a
D-06) están especificados en el anexo D y no se cuentan como figuras. La
verificación se hizo exportando a PDF con Word y revisando portada, control,
índice, ER, tablas y páginas de firmas.

## Revisión semanal

Copiar este bloque cada viernes y responder en 15 minutos.

```
### Semana N — fecha

- PR mergeado:
- Entregable incompleto y por qué:
- Teoría pendiente (¿la necesito o la recorto?):
- Qué puedo explicar en 2 minutos:
- Cambio de alcance respecto al cronograma:
```
