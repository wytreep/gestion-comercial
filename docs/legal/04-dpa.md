# Acuerdo de encargo de tratamiento de datos personales

## 1. Partes y marco

Este acuerdo se celebra entre el Cliente, en calidad de responsable del
tratamiento, y [RAZÓN SOCIAL], en calidad de encargado, y forma parte integral
del contrato de prestación de servicios SaaS (GC-LEG-10).

Se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 compilado en el Decreto
1074 de 2015, la Ley 1266 de 2008 cuando aplique y las instrucciones de la
Superintendencia de Industria y Comercio.

## 2. Definiciones

| Término | Significado |
|---|---|
| Responsable | El Cliente, que decide sobre la finalidad y el contenido del tratamiento. |
| Encargado | El Prestador, que trata los datos por cuenta y bajo instrucciones del Responsable. |
| Titular | Persona natural cuyos datos personales se tratan. |
| Datos personales | Información vinculada a una persona natural identificada o identificable. |
| Tratamiento | Cualquier operación sobre datos: recolección, almacenamiento, uso, circulación o supresión. |
| Subencargado | Tercero que el Encargado vincula para apoyar el tratamiento. |
| Incidente | Evento que compromete la confidencialidad, integridad o disponibilidad de los datos. |

## 3. Objeto y duración

El Encargado tratará los datos personales necesarios para prestar el servicio de
ERP descrito en el contrato, durante su vigencia y hasta la devolución o supresión
de los datos conforme a la cláusula 13.

El objeto comprende las categorías de datos y las finalidades detalladas en el
anexo I de este acuerdo y en la política de privacidad (GC-LEG-02).

## 4. Instrucciones del Responsable

El Responsable instruye al Encargado para:

1. Alojar y procesar los datos en la instancia dedicada del Cliente.
2. Autenticar usuarios y aplicar los roles definidos por el Cliente.
3. Registrar operaciones comerciales, contables y de inventario.
4. Generar reportes y exportaciones solicitadas por el Cliente.
5. Ejecutar respaldos y pruebas de restauración.
6. Atender solicitudes de titulares canalizadas por el Cliente.
7. Cumplir requerimientos de autoridades competentes.

El Encargado no tratará los datos para finalidades distintas ni los cederá a
terceros sin instrucción escrita. Si una instrucción es contraria a la ley, lo
informará de inmediato y podrá abstenerse de ejecutarla.

## 5. Obligaciones del Encargado

El Encargado se obliga a:

1. Tratar los datos solo conforme a este acuerdo y a las instrucciones del
   Responsable.
2. Garantizar la confidencialidad del personal que accede a los datos, mediante
   compromisos escritos que sobrevivan a la relación laboral.
3. Aplicar las medidas de seguridad de la cláusula 7 y de la política GC-LEG-07.
4. No subcontratar el tratamiento sin autorización y sin suscribir obligaciones
   equivalentes con el subencargado.
5. Asistir al Responsable en la atención de derechos de los titulares.
6. Notificar incidentes conforme a la cláusula 9 y a la política GC-LEG-12.
7. Poner a disposición del Responsable la información necesaria para demostrar
   cumplimiento.
8. Devolver o suprimir los datos al terminar el servicio.
9. Designar un responsable de protección de datos y un canal de contacto.

## 6. Obligaciones del Responsable

El Responsable se obliga a:

1. Obtener la autorización previa, expresa e informada de los titulares.
2. Informar a los titulares sobre la existencia de encargados y subencargados.
3. Suministrar instrucciones claras, lícitas y documentadas.
4. Verificar que los datos entregados sean exactos y pertinentes.
5. Atender las solicitudes de los titulares y trasladar al Encargado solo las que
   requieran su apoyo técnico.
6. Cumplir las obligaciones de registro y reporte ante la SIC cuando corresponda.
7. No incluir datos sensibles o de menores de edad sin cumplir los requisitos
   legales adicionales.

## 7. Medidas de seguridad

El Encargado implementa, como mínimo:

| Control | Medida |
|---|---|
| Autenticación | Contraseñas con Argon2id, bloqueo por intentos fallidos y sesiones con expiración |
| Autorización | Control por roles verificado en cada petición |
| Cifrado en tránsito | TLS 1.2 o superior obligatorio |
| Cifrado en reposo | AES-256-GCM para datos sensibles y credenciales |
| Aislamiento | Una base de datos y una pila de servicios por Cliente |
| Auditoría | Registro de accesos y operaciones críticas con marca de tiempo |
| Respaldos | Copias cifradas con pruebas de restauración periódicas |
| Desarrollo seguro | Revisión de código, análisis de dependencias y gestión de parches |
| Entornos | Separación entre desarrollo y operación, sin datos reales en pruebas |

El detalle y las métricas se desarrollan en la política de seguridad (GC-LEG-07).

## 8. Subencargados

El Responsable autoriza los subencargados listados en el anexo GC-LEG-13. El
Encargado informará cualquier cambio con al menos treinta (30) días calendario de
antelación y el Responsable podrá oponerse por causa razonable.

Si el Responsable se opone y no se alcanza una alternativa, podrá terminar el
servicio respecto de las funciones afectadas sin penalidad.

El Encargado responde ante el Responsable por el cumplimiento de sus
subencargados, sin perjuicio de la responsabilidad directa que a estos
corresponda.

## 9. Incidentes de seguridad

Ante un incidente que afecte datos personales, el Encargado:

1. Contendrá el evento y preservará la evidencia.
2. Informará al Responsable sin dilación indebida y a más tardar dentro de las
   veinticuatro (24) horas siguientes a la confirmación.
3. Describirá la naturaleza del incidente, las categorías y el volumen estimado
   de datos afectados, las medidas adoptadas y las recomendaciones.
4. Colaborará en la evaluación de riesgos y en las notificaciones a titulares y
   autoridades.
5. Entregará un informe final con causas y acciones correctivas.

La notificación a la SIC y a los titulares corresponde al Responsable, con el
apoyo del Encargado.

## 10. Transferencias internacionales

Los datos se alojan en [PROVEEDOR DE INFRAESTRUCTURA], región [REGIÓN]. Si se
requiere transferencia internacional, el Encargado verificará que exista
autorización del titular, decisión de adecuación o garantías contractuales
conforme al artículo 26 de la Ley 1581 de 2012.

## 11. Derechos de los titulares

El Encargado habilitará mecanismos técnicos para que el Responsable atienda
consultas, rectificaciones, revocatorias y supresiones. Cuando la solicitud se
dirija directamente al Encargado, este la remitirá al Responsable dentro de los
dos (2) días hábiles siguientes y prestará el apoyo necesario.

Los plazos legales de respuesta son los previstos en la política GC-LEG-02.

## 12. Auditoría y demostración de cumplimiento

El Responsable podrá solicitar, una vez al año y con treinta (30) días de aviso,
un informe de cumplimiento o una auditoría documental. Las auditorías que
impliquen acceso a la infraestructura se coordinarán para no afectar a otros
clientes ni comprometer la seguridad.

El Encargado pondrá a disposición certificaciones, resultados de análisis de
vulnerabilidades y registros de cambios relevantes.

## 13. Devolución y supresión

Al terminar el contrato, el Encargado:

1. Entregará una exportación completa en formato estándar dentro de los quince
   (15) días hábiles siguientes.
2. Conservará los datos durante el plazo de retención legal aplicable.
3. Suprimirá o anonimizará los datos vencidos los plazos, salvo deber legal de
   conservación.
4. Certificará por escrito la supresión cuando el Responsable lo solicite.

Los respaldos se depuran conforme al ciclo de la política GC-LEG-08.

## 14. Responsabilidad

Cada parte responde por el incumplimiento de sus obligaciones. El Encargado
responde por los daños que cause con su tratamiento y por el de sus
subencargados, salvo que pruebe que el hecho no le es imputable.

Las limitaciones del contrato principal no aplican a los daños derivados del
tratamiento ilícito de datos personales ni a las sanciones impuestas por la SIC.

## 15. Vigencia y terminación

Este acuerdo rige desde [FECHA DE ENTRADA EN VIGOR] y permanece vigente mientras
el Encargado trate datos del Responsable. Las obligaciones de confidencialidad,
supresión y responsabilidad sobreviven a su terminación.

## 16. Orden de prelación

En caso de conflicto entre este acuerdo y el contrato principal en materia de
datos personales, prevalece este acuerdo. En lo demás, se aplica el contrato
principal.

## Anexo I. Categorías y finalidades

| Categoría | Ejemplos | Finalidad | Base legal |
|---|---|---|---|
| Identificación | Nombre, documento, correo, teléfono | Operación del servicio y soporte | Ejecución contractual |
| Credenciales | Usuario, hash de contraseña, rol | Autenticación y control de acceso | Ejecución contractual |
| Comercial | Clientes, ventas, compras, cartera | Gestión comercial y reportería | Ejecución contractual |
| Financiero | Pagos, abonos, conciliaciones | Registro contable y cobranza | Obligación legal |
| Seguridad | IP, eventos, auditoría | Prevención de fraude y trazabilidad | Interés legítimo |
| Facturación | Razón social, NIT, dirección | Facturación y obligaciones tributarias | Obligación legal |

**Versión:** 1.0 (borrador) · **Vigente desde:** [FECHA DE ENTRADA EN VIGOR]
