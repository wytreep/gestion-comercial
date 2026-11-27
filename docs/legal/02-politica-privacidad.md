# Política de privacidad y tratamiento de datos personales

## 1. Objeto y marco normativo

Esta política describe cómo **[RAZÓN SOCIAL]** (en adelante, «el Prestador»)
recolecta, usa, almacena, transmite y suprime datos personales en el marco de la
Plataforma **Gestión Comercial**.

Se expide en cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013,
compilado en el Decreto 1074 de 2015, y las instrucciones de la Superintendencia
de Industria y Comercio (SIC). Cuando se trate de información financiera,
crediticia, comercial o de servicios, se aplican además las reglas de la Ley 1266
de 2008.

## 2. Roles frente al tratamiento

| Rol | Quién | Alcance |
|---|---|---|
| Responsable del tratamiento | El cliente que contrata la Plataforma | Define las finalidades sobre los datos de sus clientes, empleados y proveedores |
| Encargado del tratamiento | El Prestador | Trata los datos por cuenta del cliente, según sus instrucciones y el acuerdo de encargo |
| Titular | Persona natural cuyos datos se tratan | Ejerce los derechos de ley |
| Autoridad de control | Superintendencia de Industria y Comercio | Vigila y sanciona el cumplimiento |

El Prestador actúa como responsable únicamente respecto de los datos de sus
propios contactos comerciales, de facturación y de soporte. El detalle de las
obligaciones recíprocas consta en el acuerdo de encargo de tratamiento (GC-LEG-04).

## 3. Datos que se tratan

La Plataforma trata las siguientes categorías:

1. **Identificación y contacto:** nombre, documento, correo, teléfono, dirección.
2. **Credenciales:** correo de acceso, hash de contraseña, rol, estado, intentos
   fallidos e IP de acceso.
3. **Datos comerciales:** clientes, ventas, compras, pagos, abonos, cartera,
   precios, inventario y gastos.
4. **Datos financieros:** montos, medios de pago, referencias de transferencia y
   conciliaciones.
5. **Datos de uso y seguridad:** registros de auditoría, marcas de tiempo, eventos
   de autenticación y direcciones IP.
6. **Datos de facturación del cliente:** razón social, NIT, correo y dirección.

No se solicitan datos sensibles (salud, origen étnico, convicciones religiosas,
datos biométricos) ni datos de menores de edad. Si el cliente llegara a
cargarlos, será el único responsable de obtener la autorización correspondiente.

## 4. Finalidades del tratamiento

Los datos se tratan para:

1. Prestar el servicio contratado y operar la Plataforma.
2. Autenticar usuarios y controlar el acceso según el rol.
3. Registrar ventas, compras, pagos, cartera, inventario y caja.
4. Generar reportes, indicadores y estados financieros del cliente.
5. Cumplir obligaciones contables, tributarias y de facturación.
6. Atender solicitudes de soporte, garantía y capacitación.
7. Prevenir fraudes, abusos y accesos no autorizados.
8. Enviar comunicaciones operativas y de seguridad.
9. Cumplir requerimientos de autoridades competentes.

El Prestador no utiliza los datos del cliente para publicidad de terceros ni
para entrenar modelos de inteligencia artificial sin autorización expresa.

## 5. Autorización

El cliente, en calidad de responsable, declara que cuenta con la autorización
previa, expresa e informada de los titulares para las finalidades descritas. La
autorización se obtiene por medios físicos o electrónicos que permitan su
consulta posterior, conforme al artículo 9 de la Ley 1581 de 2012 y al artículo 7
del Decreto 1377 de 2013.

El modelo de autorización para titulares se entrega en el documento GC-LEG-11.

## 6. Derechos de los titulares

Los titulares pueden:

1. Conocer, actualizar y rectificar sus datos.
2. Solicitar prueba de la autorización otorgada.
3. Ser informados sobre el uso dado a sus datos.
4. Presentar quejas ante la SIC por infracciones a la ley.
5. Revocar la autorización y solicitar la supresión cuando no exista un deber
   legal o contractual de conservación.
6. Acceder gratuitamente a sus datos en los términos del artículo 21 del Decreto
   1377 de 2013.

## 7. Procedimiento para ejercer los derechos

Las solicitudes se presentan por escrito a **[CORREO DE CONTACTO]** o en la
dirección **[DOMICILIO]**, indicando nombre, documento, dato a corregir o
suprimir y soportes.

| Etapa | Plazo | Responsable |
|---|---|---|
| Radicación y acuse | 2 días hábiles | Oficina de datos personales |
| Verificación de identidad | 3 días hábiles | Oficina de datos personales |
| Respuesta de consulta | 10 días hábiles prorrogables por 5 | Oficina de datos personales |
| Respuesta de reclamo | 15 días hábiles prorrogables por 8 | Oficina de datos personales |
| Escalamiento ante la SIC | Según ley | Titular |

El área responsable es **[ÁREA RESPONSABLE]**, con correo
**[CORREO DE DATOS PERSONALES]**.

## 8. Seguridad de la información

El Prestador aplica medidas técnicas, humanas y administrativas razonables:

1. Cifrado de credenciales con Argon2id y de datos sensibles en reposo con
   AES-256-GCM.
2. Tokens de acceso de corta duración y refresh tokens rotativos.
3. Control de acceso basado en roles y verificación de autorización en cada
   petición.
4. Registro de auditoría de accesos y operaciones críticas.
5. Copias de seguridad cifradas y pruebas de restauración.
6. Aislamiento por cliente: una base de datos y una pila de servicios por
   instancia.
7. Actualizaciones de seguridad y análisis de dependencias.

El detalle se desarrolla en la política de seguridad de la información
(GC-LEG-07) y en la política de retención (GC-LEG-08).

## 9. Transferencias y transmisiones

Los datos se alojan en **[PROVEEDOR DE INFRAESTRUCTURA]**, en la región
**[REGIÓN]**. Cuando exista transferencia internacional, se aplicarán las reglas
del artículo 26 de la Ley 1581 de 2012 y del Decreto 1377 de 2013, o se contará
con autorización del titular.

Los subencargados autorizados se listan en el documento GC-LEG-13. Cualquier
cambio se comunicará con antelación y el cliente podrá oponerse.

## 10. Vigencia y conservación

Los datos se conservan mientras subsista la relación contractual y durante los
plazos legales de conservación contable y tributaria. Cumplidos esos plazos, se
suprimen o anonimizan conforme a la política de retención.

## 11. Incidentes de seguridad

Si se presenta un incidente que afecte datos personales, el Prestador informará
al cliente sin dilación indebida, con la descripción del evento, los datos
comprometidos, las medidas adoptadas y las recomendaciones. El procedimiento
consta en GC-LEG-12.

## 12. Cambios en la política

Los cambios sustanciales se comunicarán por correo electrónico con quince (15)
días de antelación. La versión vigente se publica en **[SITIO WEB]**.

**Versión:** 1.0 (borrador) · **Vigente desde:** [FECHA DE ENTRADA EN VIGOR]
