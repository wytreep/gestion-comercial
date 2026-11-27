# Política de seguridad de la información

## 1. Objeto y alcance

Esta política establece los principios, roles y controles con los que [RAZÓN
SOCIAL] protege la información de la Plataforma **Gestión Comercial** y los datos
de sus clientes.

Aplica a todo el personal, contratistas, proveedores y sistemas que accedan a la
infraestructura, al código o a los datos, con independencia del entorno.

## 2. Principios

1. **Confidencialidad:** solo las personas autorizadas acceden a la información.
2. **Integridad:** la información es exacta y no se altera sin control.
3. **Disponibilidad:** el servicio está operativo según el acuerdo de nivel de
   servicio.
4. **Privacidad desde el diseño:** los datos personales se minimizan y protegen
   desde la concepción de cada funcionalidad.
5. **Defensa en profundidad:** varios controles independientes cubren el mismo
   riesgo.
6. **Mínimo privilegio:** cada cuenta tiene solo los permisos necesarios.
7. **Trazabilidad:** las operaciones críticas quedan registradas.

## 3. Roles y responsabilidades

| Rol | Responsabilidad |
|---|---|
| Dirección | Aprobar la política, asignar recursos y revisar los riesgos |
| Responsable de seguridad | Mantener el sistema de gestión y coordinar incidentes |
| Responsable de datos personales | Atender derechos de titulares y reportes a la SIC |
| Ingeniería | Implementar controles, revisar código y corregir vulnerabilidades |
| Operaciones | Gestionar infraestructura, respaldos y monitoreo |
| Todo el personal | Cumplir la política y reportar incidentes |

## 4. Gestión de identidades y accesos

1. Las cuentas son nominales; se prohíben las cuentas compartidas.
2. El acceso se aprovisiona por rol y se revisa trimestralmente.
3. El acceso de administrador requiere doble factor cuando la infraestructura lo
   permita.
4. Las contraseñas se almacenan con Argon2id y nunca en texto plano.
5. Los tokens de acceso son de corta duración y los de refresco rotan.
6. El bloqueo por intentos fallidos y la expiración de sesión están habilitados.
7. La revocación de acceso se ejecuta el mismo día del retiro.
8. Los accesos de emergencia se registran y se revisan después del evento.

## 5. Seguridad de la infraestructura

| Control | Implementación |
|---|---|
| Aislamiento | Una pila de servicios y una base de datos por cliente |
| Red | Segmentación, firewall y exposición mínima de puertos |
| Transporte | TLS 1.2 o superior obligatorio; HSTS en producción |
| Reposo | Cifrado AES-256-GCM de datos sensibles y respaldos |
| Sistemas operativos | Endurecimiento, parches y mínimo software instalado |
| Secretos | Gestión centralizada; prohibido almacenarlos en el repositorio |
| Registros | Retención centralizada y protección contra alteración |

## 6. Separación de entornos

La operación y el desarrollo están separados:

| Entorno | Puerto | Datos | Uso |
|---|---|---|---|
| Desarrollo | 8081 | Sintéticos o anonimizados | Pruebas e integración |
| Operación | 8080 | Reales del Cliente | Producción |

Las pruebas nunca se ejecutan contra la base de datos de operación. Las
credenciales de cada entorno son distintas y no se reutilizan. La promoción a
operación requiere revisión, pruebas automatizadas y aprobación.

## 7. Desarrollo seguro

1. Revisión de código por un segundo desarrollador antes de integrar.
2. Análisis automático de dependencias y de composición de software.
3. Validación de entradas y consultas parametrizadas para prevenir inyección.
4. Codificación de salidas para prevenir XSS.
5. Protección contra CSRF y control de origen.
6. Pruebas de autorización en cada endpoint, no solo en la interfaz.
7. Gestión de vulnerabilidades con plazos por criticidad.
8. Prohibición de datos reales en pruebas y en repositorios.

## 8. Gestión de vulnerabilidades y parches

| Criticidad | Plazo de corrección |
|---|---|
| Crítica | 7 días |
| Alta | 15 días |
| Media | 30 días |
| Baja | 90 días |

Las vulnerabilidades explotadas o con impacto directo en datos personales se
atienden de inmediato, con contención temporal si la corrección no es viable.

## 9. Respaldos y continuidad

1. Respaldo diario automático con cifrado.
2. Retención de 35 días operativos y 12 meses mensuales.
3. Prueba de restauración trimestral documentada.
4. RPO de 24 horas y RTO de 8 horas.
5. Plan de continuidad revisado anualmente.
6. Copia fuera del servidor principal cuando la infraestructura lo permita.

El detalle de plazos de conservación consta en GC-LEG-08.

## 10. Registro y monitoreo

Se registran, como mínimo:

1. Inicios de sesión exitosos y fallidos.
2. Cambios de rol y de permisos.
3. Operaciones sobre ventas, pagos, compras y caja.
4. Exportaciones y descargas masivas.
5. Cambios de configuración y de precios.
6. Errores de aplicación y eventos de seguridad.

Los registros incluyen usuario, fecha, hora, IP y resultado. Se protegen contra
modificación y se revisan ante alertas.

## 11. Gestión de proveedores

Los proveedores que tratan datos personales se evalúan antes de contratar y se
vinculan mediante obligaciones equivalentes a esta política. Se mantiene un
inventario actualizado en GC-LEG-13 y se revisa al menos una vez al año.

## 12. Incidentes

Todo evento se reporta de inmediato al responsable de seguridad. La clasificación,
respuesta, notificación y análisis posterior se rigen por GC-LEG-12.

## 13. Concientización y personal

1. El personal firma un acuerdo de confidencialidad.
2. Recibe inducción en seguridad y privacidad al ingresar.
3. Participa en capacitaciones anuales y simulacros de incidentes.
4. Conoce el canal para reportar incidentes y sospechas de fraude.

## 14. Métricas y revisión

| Indicador | Meta |
|---|---|
| Cobertura de revisión de código | 100 % de los cambios |
| Vulnerabilidades críticas abiertas | 0 |
| Pruebas de restauración exitosas | 100 % trimestral |
| Incidentes notificados dentro del plazo | 100 % |
| Revisión de accesos | Trimestral |

La dirección revisa esta política al menos una vez al año y cuando ocurra un
cambio relevante en el negocio, la tecnología o la normativa.

## 15. Sanciones

El incumplimiento de esta política puede dar lugar a acciones disciplinarias,
terminación contractual y las demás consecuencias previstas en la ley, sin
perjuicio de la responsabilidad civil o penal.

**Versión:** 1.0 (borrador) · **Vigente desde:** [FECHA DE ENTRADA EN VIGOR]
