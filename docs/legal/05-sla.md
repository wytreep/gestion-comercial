# Acuerdo de nivel de servicio

## 1. Objeto

Este acuerdo define los niveles de disponibilidad, soporte y tiempos de respuesta
del servicio **Gestión Comercial** y los créditos aplicables cuando no se
cumplen. Forma parte del contrato de prestación de servicios (GC-LEG-10).

## 2. Alcance y horarios

| Concepto | Cobertura |
|---|---|
| Horario de soporte | Lunes a viernes, 8:00 a 18:00 (hora de Colombia) |
| Atención de incidentes críticos | 24 × 7, incluidos festivos |
| Ventana de mantenimiento | Domingos de 22:00 a 02:00, previo aviso |
| Canales | Portal de soporte y correo [CORREO DE SOPORTE] |
| Idiomas | Español |
| Zona horaria | America/Bogota (UTC−5) |

El soporte cubre el uso funcional de la Plataforma, la corrección de defectos y la
orientación operativa. No incluye desarrollos a la medida, migraciones masivas ni
capacitación presencial, que se cotizan por separado.

## 3. Disponibilidad

La disponibilidad mensual se calcula así:

> Disponibilidad = (minutos del mes − minutos de indisponibilidad) ÷ minutos del
> mes × 100

No se computan como indisponibilidad:

1. Las ventanas de mantenimiento programado avisadas con 48 horas.
2. Las interrupciones atribuibles a la red, equipos o usuarios del Cliente.
3. Los hechos de fuerza mayor o de terceros fuera del control del Prestador.
4. El uso indebido o el incumplimiento de las condiciones de uso.
5. Las suspensiones por mora o por requerimiento de autoridad.

| Plan | Disponibilidad objetivo | Indisponibilidad máxima mensual |
|---|---|---|
| Esencial | 99,0 % | 7 h 18 min |
| Profesional | 99,5 % | 3 h 39 min |
| Empresarial | 99,9 % | 43 min |

La disponibilidad se mide sobre el servicio principal de la instancia del Cliente,
no sobre componentes auxiliares como reportes programados o integraciones
opcionales.

## 4. Severidades

| Severidad | Definición | Ejemplo |
|---|---|---|
| S1 — Crítica | Servicio no disponible o pérdida de datos | No se puede iniciar sesión ni registrar ventas |
| S2 — Alta | Función esencial degradada sin alternativa | No se pueden emitir pagos o cerrar caja |
| S3 — Media | Función secundaria afectada con alternativa | Un reporte falla pero hay exportación |
| S4 — Baja | Consulta, mejora o error cosmético | Etiqueta mal alineada |

El Prestador puede reclasificar un ticket con justificación. Si el Cliente no está
de acuerdo, puede escalar conforme a la cláusula 8.

## 5. Tiempos de respuesta y restablecimiento

| Severidad | Primera respuesta | Restablecimiento objetivo | Actualización |
|---|---|---|---|
| S1 | 30 minutos | 4 horas | Cada 60 minutos |
| S2 | 2 horas | 8 horas hábiles | Cada 4 horas |
| S3 | 8 horas hábiles | 5 días hábiles | Diaria |
| S4 | 2 días hábiles | Según planificación | Semanal |

El restablecimiento puede consistir en una solución definitiva, una medida de
contención o una alternativa operativa documentada. La primera respuesta es el
acuse con diagnóstico inicial y responsable asignado, no la solución.

## 6. Créditos por incumplimiento

Si la disponibilidad mensual es inferior al objetivo, el Cliente recibe un crédito
sobre la factura del mes siguiente:

| Disponibilidad | Crédito |
|---|---|
| Menor al objetivo y mayor o igual a 99,0 % | 5 % del valor mensual |
| Menor a 99,0 % y mayor o igual a 98,0 % | 10 % del valor mensual |
| Menor a 98,0 % y mayor o igual a 95,0 % | 20 % del valor mensual |
| Menor a 95,0 % | 30 % del valor mensual |

El crédito es el remedio exclusivo por incumplimiento de disponibilidad y no es
acumulable con otras compensaciones por el mismo hecho. Para recibirlo, el Cliente
debe solicitarlo dentro de los treinta (30) días siguientes al cierre del mes
afectado, adjuntando la evidencia de las interrupciones.

Los créditos no generan devolución en efectivo y se aplican a facturas futuras.

## 7. Respaldos y recuperación

| Elemento | Objetivo |
|---|---|
| Frecuencia de respaldo | Diaria automática |
| Retención operativa | 35 días |
| Retención mensual | 12 meses |
| RPO | 24 horas |
| RTO | 8 horas |
| Prueba de restauración | Trimestral documentada |

El Cliente puede solicitar una restauración fuera de incidente, con costo
adicional y sujeción a la disponibilidad del equipo.

## 8. Escalamiento

| Nivel | Responsable | Cuándo |
|---|---|---|
| N1 | Mesa de ayuda | Todo ticket inicial |
| N2 | Especialista funcional | S3 y S4 sin solución en 2 días |
| N3 | Ingeniería | S1 y S2, o S3 sin solución en 5 días |
| N4 | Dirección de operaciones | S1 sin restablecer en 4 horas |

El Cliente puede solicitar el escalamiento por el portal o por correo, indicando
el número de ticket y el impacto en su operación.

## 9. Reportes y revisión

El Prestador publica un tablero mensual con disponibilidad, tickets por severidad,
tiempo medio de respuesta y tiempo medio de restablecimiento. Cada trimestre se
realiza una reunión de revisión de servicio con el Cliente.

## 10. Exclusiones

No hay lugar a créditos cuando el incumplimiento se debe a:

1. Caso fortuito o fuerza mayor.
2. Fallas en la conectividad o en los equipos del Cliente.
3. Modificaciones realizadas por el Cliente o por terceros no autorizados.
4. Uso de versiones o integraciones no soportadas.
5. Suspensión por mora o por incumplimiento contractual.
6. Mantenimiento de emergencia por vulnerabilidad crítica, avisado tan pronto
   como sea posible.

## 11. Vigencia

Este acuerdo rige desde [FECHA DE ENTRADA EN VIGOR] y se mantiene mientras esté
vigente el contrato principal. Las modificaciones se comunican con treinta (30)
días de antelación y no aplican retroactivamente a meses ya cerrados.

**Versión:** 1.0 (borrador) · **Vigente desde:** [FECHA DE ENTRADA EN VIGOR]
