# Progreso del plan de 12 semanas

**Inicio:** 17 nov 2026 · **Cierre previsto:** 14 feb 2027
**Base semanal:** 20 h (semanas 5 y 6 a 10 h por festivos)
**Regla de corte:** si una semana se complica, se entrega el 70 % y no se toca la siguiente.

## Estado por semana

| Semana | Fechas | Foco | Estado | Evidencia |
|---|---|---|---|---|
| 0 | 17 – 22 nov | Base de calidad: PHPUnit, auditoría estática, CI | En curso | `composer test` 26/26, auditoría en 81 con trinquete |
| 1 | 23 – 29 nov | `Money`, enums `Rol` / `EstadoVenta` / `EstadoPago` | Pendiente | — |
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

## Línea base medible (17 nov 2026)

| Métrica | Valor | Objetivo |
|---|---:|---|
| Tests unitarios en verde | 26 | 40 al cerrar la semana 6 |
| Hallazgos de auditoría estática | 81 | 0 en `strict_types`, `rol_magico` y `dinero_float` (semana 1) |
| Casts monetarios a `float` | 49 | 0 |
| Comparaciones con `0.01` | 4 | 0 |
| Strings de rol mágicos | 11 | 0 |

El umbral de `composer audit:static` (`--max`) solo baja. Si sube, el PR no se mergea.

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
