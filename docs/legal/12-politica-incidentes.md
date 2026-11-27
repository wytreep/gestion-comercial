# Política de gestión de incidentes de seguridad

## 1. Objeto y alcance

Esta política define cómo [RAZÓN SOCIAL] detecta, clasifica, responde y aprende de
los incidentes de seguridad que afecten la Plataforma **Gestión Comercial**, sus
datos o su infraestructura.

Aplica a todo el personal, contratistas y proveedores, y se articula con el
acuerdo de encargo de tratamiento (GC-LEG-04), la política de seguridad
(GC-LEG-07) y el acuerdo de nivel de servicio (GC-LEG-05).

## 2. Definiciones

| Término | Significado |
|---|---|
| Evento | Ocurrencia observable en sistemas o redes. |
| Incidente | Evento que compromete o amenaza la confidencialidad, integridad o disponibilidad. |
| Incidente de datos personales | Incidente que afecta datos de personas naturales. |
| Contención | Acción para limitar el alcance y detener la propagación. |
| Erradicación | Eliminación de la causa raíz. |
| Recuperación | Restablecimiento del servicio y validación. |
| Postmortem | Análisis posterior sin búsqueda de culpables. |

## 3. Roles

| Rol | Responsabilidad |
|---|---|
| Responsable de incidentes | Dirige la respuesta y coordina el comité |
| Responsable de seguridad | Clasifica, investiga y preserva la evidencia |
| Operaciones | Contiene, recupera y aplica cambios de emergencia |
| Responsable de datos personales | Evalúa el impacto y coordina notificaciones |
| Comunicaciones | Prepara mensajes internos y externos |
| Dirección | Aprueba decisiones de alto impacto y recursos |

## 4. Clasificación

| Severidad | Criterio | Ejemplos | Plazo de contención |
|---|---|---|---|
| S1 — Crítica | Compromiso confirmado de datos o servicio caído | Acceso no autorizado masivo, ransomware | 1 hora |
| S2 — Alta | Riesgo inminente o función esencial afectada | Credenciales filtradas, explotación activa | 4 horas |
| S3 — Media | Incidente contenido o impacto limitado | Malware aislado, error de configuración | 24 horas |
| S4 — Baja | Evento sin impacto demostrado | Intento de escaneo bloqueado | 72 horas |

La clasificación puede escalar durante la respuesta. La severidad final se
documenta en el informe.

## 5. Fases de respuesta

### 5.1 Preparación

Se mantienen runbooks, contactos de emergencia, herramientas de análisis y
simulacros anuales. Los accesos de emergencia se prueban y se registran.

### 5.2 Detección y análisis

Las alertas provienen de monitoreo, registros, reportes de usuarios y proveedores.
El responsable de seguridad valida el evento, determina el alcance y confirma si es
un incidente.

### 5.3 Contención

Se aplican medidas proporcionales: aislamiento de la instancia, revocación de
credenciales, bloqueo de IP, deshabilitación de integraciones o restauración
controlada. Se preserva la evidencia antes de reiniciar o borrar sistemas.

### 5.4 Erradicación

Se elimina la causa: parche, cambio de configuración, eliminación de malware,
rotación de secretos o reconstrucción del servicio.

### 5.5 Recuperación

Se restablece el servicio, se validan la integridad y la seguridad, y se monitorea
con mayor frecuencia durante al menos setenta y dos (72) horas.

### 5.6 Postmortem

Dentro de los diez (10) días hábiles siguientes al cierre se elabora un informe
con cronología, causa raíz, impacto, acciones correctivas, responsables y plazos.
Las acciones se siguen hasta su cierre.

## 6. Notificaciones

### 6.1 Al Cliente

El Prestador informará al Cliente afectado sin dilación indebida y, en todo caso,
dentro de las veinticuatro (24) horas siguientes a la confirmación del incidente
que afecte sus datos o su servicio.

La comunicación inicial incluye:

1. Naturaleza y hora de detección.
2. Servicios y datos potencialmente afectados.
3. Medidas de contención adoptadas.
4. Recomendaciones para el Cliente.
5. Canal y responsable del seguimiento.
6. Fecha estimada del siguiente informe.

### 6.2 A autoridades y titulares

Cuando el incidente afecte datos personales, el Responsable evaluará el riesgo y
notificará a la Superintendencia de Industria y Comercio y a los titulares en los
términos de la Ley 1581 de 2012 y del Decreto 1377 de 2013, dentro de los plazos
que establezca la normativa o la autoridad.

La notificación no se retrasa por falta de información completa; se amplía en
informes posteriores.

### 6.3 A proveedores

Si el incidente se origina en un subencargado, este informará al Prestador dentro
de las cuatro (4) horas siguientes a la confirmación, con la evidencia disponible.

## 7. Evidencia y cadena de custodia

1. Se documenta fecha, hora, fuente y responsable de cada hallazgo.
2. Se conservan copias íntegras de registros y archivos relevantes.
3. Se calcula una huella de integridad cuando sea posible.
4. Se restringe el acceso a la evidencia.
5. Se registra toda transferencia o análisis.

## 8. Comunicaciones

Solo el vocero autorizado se pronuncia públicamente. Las comunicaciones internas
evitan especulaciones y se basan en hechos verificados. No se atribuyen culpas a
personas ni a terceros antes del informe final.

## 9. Registro y métricas

| Indicador | Meta |
|---|---|
| Tiempo medio de detección | Menos de 24 horas |
| Tiempo medio de contención S1 | Menos de 1 hora |
| Incidentes notificados en plazo | 100 % |
| Postmortems cerrados en 10 días hábiles | 90 % |
| Acciones correctivas vencidas | 0 |

El registro de incidentes se conserva por cinco (5) años y no contiene datos
personales innecesarios.

## 10. Pruebas y mejora

Se realiza al menos un simulacro anual con escenarios de acceso no autorizado,
pérdida de datos y caída del servicio. Los resultados alimentan el plan de mejora
y la revisión de esta política.

## 11. Sanciones

El incumplimiento de esta política puede dar lugar a acciones disciplinarias y a
las responsabilidades civiles o penales que correspondan, sin perjuicio de las
obligaciones contractuales.

**Versión:** 1.0 (borrador) · **Vigente desde:** [FECHA DE ENTRADA EN VIGOR]
