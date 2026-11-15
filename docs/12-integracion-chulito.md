# Integración de Chulito · documento de preparación

> **Estado:** propuesta de trabajo. No hay código implementado ni migraciones aplicadas.
> **Fecha:** 4 de noviembre de 2026.
> **Origen analizado:** `C:\dev\Chulito` (rama `main`, commit `895c3ea`) y
> `C:\dev\Chulito_documentos` (SRS v0.4, PRD v0.4, ST-01 v0.3).
> **Destino:** `gestion-comercial-v3` (rama `main`, commit `438eac5`).

---

## 1. Resumen

Chulito aporta el tramo que hoy falta en Gestión Comercial: **capturar notificaciones
de pago, normalizarlas, deduplicarlas y conciliarlas contra un cobro esperado**.
Gestión Comercial ya aporta el tramo anterior: venta, cobro, registro del pago en
`pagos` y actualización de saldo y cartera.

La integración no es "pegar" el código de Chulito. Chulito está especificado para
NestJS/TypeScript y su implementación real es un prototipo Python; Gestión Comercial
es PHP 8.4 + React. Lo que se integra es **el contrato y las reglas de dominio**.

Además de lo que trae Chulito, el requerimiento nuevo es **generar el cobro por
transferencia con un QR que corresponda al método de pago y a la cuenta receptora**,
incluyendo Bre-B. Ese componente no existe en Chulito y hay que diseñarlo aquí.

---

## 2. Qué es Chulito y qué no es

### Sí es

- Un servicio que recibe notificaciones de pago por un canal que el usuario controla.
- Un normalizador por emisor (Nequi, Daviplata, bancos, Bre-B).
- Un motor de idempotencia en dos niveles y conciliación conservadora.
- Un libro diario unificado por negocio.
- Una especificación con requisitos numerados y trazables (SRS v0.4).

### No es

- No mueve ni custodia dinero.
- No genera cobros, QR ni links de pago.
- No tiene integración oficial con bancos.
- No tiene backend de producción (TBD-9: port a TypeScript/NestJS pendiente).
- No tiene rama `dev`: local y remoto solo tienen `main`.

### Consecuencia para la integración

Todo el backend de Chulito se reimplementa en PHP siguiendo **su** contrato. No se
crea un microservicio NestJS paralelo: sería un segundo stack para un proyecto de un
solo desarrollador.

---

## 3. Punto de partida en Gestión Comercial

| Pieza existente | Estado | Reutilización |
|---|---|---|
| `ventas` / `pagos` / triggers | Operativo | Se conserva; el pago confirmado se registra con `VentaService::registrarPago` |
| `cobros_qr` | Operativo | Se extiende (método, cuenta, referencia esperada, estado `dudoso`) |
| `CobroQrService::confirmar` | Operativo | Pasa a ser la confirmación manual y el punto de escritura del pago |
| Roles `admin` / `vendedor` / `readonly` | Operativo | Se mapean a dueño / cajero / consulta |
| `pagos.destino_dinero` | Operativo | Requiere un valor para Bre-B (`bre_b`) o reutilizar `banco` |
| `pagos.medio_pago` | Operativo | Solo `efectivo` y `transferencia`; suficiente |
| Documentación `docs/07-api.md` | Operativo | Se actualiza al implementar |

### Hallazgo importante sobre el QR actual

`CobroQrService` genera `contenido_qr = "GCOM-COBRO|<codigo>|VENTA:<id>|MONTO:<monto>"`
y el cliente lo dibuja como QR. **Ese QR no lo puede pagar ninguna billetera ni banco**:
es un código interno y hoy ningún flujo de la aplicación lo lee. No sirve para cobrar
por transferencia, aunque el roadmap lo describa como QR dinámico.

Por eso "generar pagos por transferencia" no es un ajuste del QR actual: es un
componente nuevo con dos caminos posibles (ver §6).

---

## 4. Brecha funcional

| # | Capacidad | Hoy | Chulito | Requerimiento |
|---|---|---|---|---|
| 1 | Catálogo de cuentas de recaudo (Nequi, Daviplata, banco, Bre-B) | No | No | Nuevo |
| 2 | Cobro por transferencia asociado a una venta | Parcial (`cobros_qr`) | No | Nuevo |
| 3 | QR pagable según método y cuenta | No (QR interno) | No | Nuevo |
| 4 | QR Bre-B (llave / código de comercio) | No | No | Nuevo |
| 5 | Captura de notificaciones | No | Sí (especificado) | Portar |
| 6 | Parsers por emisor | No | Sí (1 sintético) | Portar y ampliar |
| 7 | Idempotencia de evento y de transacción | No | Sí | Portar |
| 8 | Conciliación cobro ↔ pago | Manual | Sí | Portar |
| 9 | Estados Pendiente / Confirmado / Dudoso / Vencido | Parcial | Sí | Extender |
| 10 | Bandeja de dudosos y resolución del dueño | No | Sí | Nuevo |
| 11 | Estado del canal (caído, retraso, brecha) | No | Sí | Nuevo |
| 12 | Libro diario multiemisor y cierre | Parcial (finanzas) | Sí | Evaluar |

---

## 5. Límite técnico de Bre-B (leer antes de prometer QR dinámico)

Bre-B es el sistema de pagos inmediatos interoperado del Banco de la República. Su QR
sigue el estándar **EMVCo** adoptado por la industria colombiana (EASPBV v1.4-2025).
Los campos relevantes:

| Tag | Contenido |
|---|---|
| `00` | Payload Format Indicator (`01`) |
| `01` | Punto de iniciación: `11` estático, `12` dinámico |
| `26` | Llave receptora. Subtag `00` = GUI de la red (`CO.COM.RBM.LLA`, `CO.COM.CRB.LLA`, `CO.COM.ACH.LLA`); subtags `01`–`05` = tipo de llave (documento, celular, correo, alfanumérica, código de comercio) |
| `49` | Red adquirente |
| `50` | Código de comercio (template `CO.COM.RBM.CU` / `CO.COM.CRB.CU`) |
| `52` | MCC |
| `53` | Moneda (`170` = COP) |
| `54` | Monto (solo QR dinámico) |
| `58` / `59` / `60` | País, nombre y ciudad del comercio |
| `90` | Identificador de la transacción (lo genera la red en el QR dinámico) |
| `91` | Hash de seguridad |
| `63` | CRC |

**Restricción real:** un ERP no puede emitir por sí solo un QR Bre-B válido. La llave
la registra el comercio en su banco o billetera, y el QR dinámico lo genera el
participante o un proveedor de servicios de pago (PSP), que es quien firma `90`/`91` y
resuelve la llave contra el directorio centralizado. Inventar esos campos produce un
QR que ninguna entidad acepta.

Por eso el diseño separa dos modos:

| Modo | Qué hace el sistema | Requiere proveedor |
|---|---|---|
| **Estático registrado** | Guarda y muestra el QR/llave que el negocio ya tiene (imagen o payload EMVCo emitido por su entidad) | No |
| **Dinámico delegado** | Pide al PSP un QR con monto y referencia, y recibe la confirmación por webhook | Sí (contrato, credenciales, comisión) |

El modo estático ya permite cobrar y conciliar por monto + ventana + referencia. El
dinámico mejora la conciliación y es el único que puede inyectar una referencia propia
en el QR de forma confiable.

### Lo mismo aplica a Nequi, Daviplata y Bancolombia

Cada billetera emite su QR desde su app o su API de negocios. El sistema puede:

- guardar el QR estático y la llave de cada cuenta;
- mostrar el QR y el dato de la cuenta al cliente;
- conciliar la notificación que llegue.

No puede fabricar un QR de Nequi o Daviplata sin su API. Si se quiere QR dinámico
multiemisor sin integrar cada entidad, el camino es un agregador (Wompi, Bold,
ePayco, Mercado Pago u otro) y aceptar que el QR sea del agregador, no de Bre-B.

---

## 6. Modelo de datos propuesto

Migración `003_transferencias.sql`.

### 6.1 Cuentas de recaudo

```sql
CREATE TABLE cuentas_recaudo (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alias             VARCHAR(80)  NOT NULL,           -- "Nequi caja 1"
  metodo            ENUM('nequi','daviplata','bancolombia','bre_b','otro') NOT NULL,
  titular           VARCHAR(120) NOT NULL,
  entidad           VARCHAR(80)  NULL,
  tipo_cuenta       ENUM('ahorros','corriente','billetera') NULL,
  numero_cuenta     VARCHAR(40)  NULL,               -- se muestra enmascarado
  llave_tipo        ENUM('documento','celular','correo','alfanumerica','codigo_comercio') NULL,
  llave_valor       VARCHAR(100) NULL,
  merchant_id       VARCHAR(10)  NULL,               -- código de comercio Bre-B
  qr_modo           ENUM('estatico','dinamico') NOT NULL DEFAULT 'estatico',
  qr_payload        TEXT         NULL,               -- EMVCo emitido por la entidad
  qr_imagen         VARCHAR(255) NULL,
  proveedor         VARCHAR(50)  NULL,               -- PSP cuando qr_modo = dinamico
  proveedor_ref     VARCHAR(100) NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cuenta_llave (metodo, llave_tipo, llave_valor)
) ENGINE=InnoDB;
```

### 6.2 Cobro por transferencia

Se extiende `cobros_qr` en lugar de crear una tabla nueva, para no duplicar el flujo
de venta, expiración y anulación que ya funciona.

```sql
ALTER TABLE cobros_qr
  ADD COLUMN cuenta_recaudo_id INT UNSIGNED NULL AFTER venta_id,
  ADD COLUMN referencia_esperada VARCHAR(100) NULL AFTER referencia,
  ADD COLUMN qr_modo ENUM('estatico','dinamico','interno') NOT NULL DEFAULT 'interno',
  ADD COLUMN qr_payload TEXT NULL,
  MODIFY COLUMN estado ENUM('pendiente','pagado','dudoso','expirado','anulado')
    NOT NULL DEFAULT 'pendiente',
  ADD CONSTRAINT fk_cobros_qr_cuenta
    FOREIGN KEY (cuenta_recaudo_id) REFERENCES cuentas_recaudo(id) ON DELETE SET NULL;
```

Estados (mapeo Chulito → Gestión Comercial):

| Chulito (SRS-F-23) | Aquí | Transición |
|---|---|---|
| Pendiente | `pendiente` | Se crea el cobro |
| Confirmado | `pagado` | Coincidencia automática o confirmación manual |
| Dudoso | `dudoso` | Monto/referencia no coincide o fuera de ventana |
| Vencido | `expirado` | Vence sin pago |
| — | `anulado` | Acción local del cajero |

### 6.3 Captura e idempotencia

```sql
CREATE TABLE eventos_captura (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ingestion_key      CHAR(64) NOT NULL,              -- tenant+canal+evento|huella
  canal              ENUM('api','email','android','simulador') NOT NULL,
  source_event_id    VARCHAR(191) NULL,
  payload_fingerprint CHAR(64) NOT NULL,
  received_at        DATETIME NOT NULL,
  resultado          ENUM('nuevo_pago','duplicado_evento','duplicado_transaccion',
                          'no_reconocido','invalido') NOT NULL,
  pago_transferencia_id BIGINT UNSIGNED NULL,
  detalle            TEXT NULL,
  UNIQUE KEY uq_eventos_ingestion (ingestion_key),
  INDEX idx_eventos_fecha (received_at)
) ENGINE=InnoDB;

CREATE TABLE pagos_transferencia (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_key       CHAR(64) NOT NULL,               -- emisor+referencia | canal+huella
  emisor            VARCHAR(40) NOT NULL,            -- NEQUI, DAVIPLATA, BANCOLOMBIA, BRE_B
  monto             DECIMAL(12,2) NOT NULL,
  moneda            CHAR(3) NOT NULL DEFAULT 'COP',
  occurred_at       DATETIME NOT NULL,
  received_at       DATETIME NOT NULL,
  referencia        VARCHAR(100) NULL,
  tipo_operacion    ENUM('credito','debito') NOT NULL DEFAULT 'credito',
  dedup_base        ENUM('emisor_referencia','canal_huella') NOT NULL,
  estado            ENUM('confirmado','revision','dudoso','sin_match') NOT NULL,
  motivo            VARCHAR(255) NULL,
  candidatos        JSON NULL,
  pago_id           INT UNSIGNED NULL,               -- fila en `pagos` al confirmar
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pagos_transferencia_key (payment_key),
  INDEX idx_pagos_transferencia_estado (estado, occurred_at),
  CONSTRAINT fk_pagos_transferencia_pago
    FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE conciliaciones (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pago_transferencia_id  BIGINT UNSIGNED NOT NULL,
  cobro_id               INT UNSIGNED NOT NULL,
  metodo                 ENUM('automatico','manual') NOT NULL,
  actor_id               INT UNSIGNED NULL,
  matched_at             DATETIME NOT NULL,
  UNIQUE KEY uq_conciliacion_pago (pago_transferencia_id),
  UNIQUE KEY uq_conciliacion_cobro (cobro_id),
  CONSTRAINT fk_conciliacion_pago  FOREIGN KEY (pago_transferencia_id)
    REFERENCES pagos_transferencia(id),
  CONSTRAINT fk_conciliacion_cobro FOREIGN KEY (cobro_id)
    REFERENCES cobros_qr(id)
) ENGINE=InnoDB;
```

`UNIQUE` en `cobro_id` y en `pago_transferencia_id` materializa SRS-RN-02: un cobro se
empareja con un solo pago y un pago con un solo cobro.

### 6.4 Credencial de captura

```sql
CREATE TABLE captura_credenciales (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL,
  canal        ENUM('api','email','android') NOT NULL,
  token_hash   CHAR(64) NOT NULL,
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_uso   DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_captura_token (token_hash)
) ENGINE=InnoDB;
```

El token de captura es distinto del JWT de usuario: el adaptador no es una persona.

---

## 7. Flujo de generación del cobro

1. El cajero elige la venta y el método/cuenta de recaudo.
2. El backend valida saldo y crea la fila en `cobros_qr` con `cuenta_recaudo_id`,
   `monto`, `referencia_esperada` y `expira_at`.
3. Según `cuenta_recaudo.qr_modo`:
   - `estatico`: devuelve `qr_payload`/`qr_imagen` de la cuenta más la referencia y el
     monto para que el cliente los digite.
   - `dinamico`: llama al PSP, recibe el payload con monto y referencia, y lo guarda.
   - `interno`: comportamiento actual (`GCOM-COBRO|...`), solo para pruebas.
4. El frontend dibuja el QR y muestra: monto, cuenta, llave, referencia y vencimiento.
5. La confirmación llega por captura automática o por confirmación manual.

### Regla de oro

Un cobro **nunca** se marca pagado por generar el QR ni por mostrar el comprobante del
cliente. Solo se marca cuando existe un pago normalizado (captura) o cuando un usuario
autorizado confirma con referencia (manual).

---

## 8. Flujo de captura y conciliación

```
adaptador/API
   ↓
1. Autenticar token de captura + rate limit
2. Calcular ingestion_key (canal + source_event_id | huella)
   → si ya existe: duplicado_evento, no reprocesar
3. Identificar emisor y ejecutar parser
   → si no hay parser: no_reconocido (se conserva, se avisa)
   → si faltan datos: invalido
4. Calcular payment_key (emisor + referencia | canal + huella)
   → si ya existe: duplicado_transaccion, no crear otro pago
5. Insertar pago_transferencia en estado inicial
6. Conciliar contra cobros pendientes:
   - única coincidencia exacta (monto + referencia + ventana) → confirmado
   - varias candidatas o falta referencia → revision
   - candidata con discrepancia → dudoso
   - sin candidata en ventana → sin_match
7. Si confirmado: VentaService::registrarPago + conciliaciones + marcar cobro pagado
```

### Reglas heredadas de Chulito

| Regla | Implementación |
|---|---|
| SRS-RN-01 un pago, un negocio | En esta instalación no hay tenant: el negocio es implícito |
| SRS-RN-02 emparejamiento 1:1 | `UNIQUE` en `conciliaciones` |
| SRS-RN-03 ventana de 10 min configurable | Columna de configuración; valor inicial 600 s |
| SRS-RN-04 pago confirmado inmutable | No hay `UPDATE` de `pagos`; corrección = nuevo evento de auditoría |
| SRS-F-13 idempotencia | Dos claves: `ingestion_key` y `payment_key` |
| SRS-F-14 no reconocido se conserva | `eventos_captura.resultado = no_reconocido` + aviso |
| SRS-F-24 dudoso no confirma | Estados `revision` / `dudoso`; nunca escriben en `pagos` |
| SRS-F-25 resolución manual del dueño | Endpoint `resolver` restringido a `admin`, con auditoría |

### Ventana y evento tardío

`occurred_at` (hora del emisor) y `received_at` (hora de captura) se guardan separados.
La ventana se evalúa con `occurred_at`; si el evento llega tarde pero cae fuera de la
ventana, queda dudoso y **no** se confirma automáticamente.

---

## 9. Parsers

Un módulo por emisor, con pruebas propias (SRS-NFR-09 exige 80 % de cobertura).

```php
interface ParserNotificacion
{
    public function emisor(): string;
    public function puedeParsear(EnvelopeCaptura $envelope): bool;
    public function parsear(EnvelopeCaptura $envelope): PagoNormalizado;
}
```

- `NequiParser`
- `DaviplataParser`
- `BancolombiaParser`
- `BreBParser`
- `GenericoParser` (texto libre pegado por el cajero)

Cada parser devuelve `monto`, `occurred_at`, `referencia`, `tipo_operacion` y `emisor`.
Los datos ausentes se dejan en `null`; no se inventan.

**Bloqueo:** no hay muestras reales autorizadas de Nequi, Daviplata ni bancos (TBD-2).
Los parsers se construyen con fixtures sintéticos y se ajustan cuando existan muestras.

---

## 10. API propuesta

### Cuentas de recaudo (admin)

| Método | Ruta |
|---|---|
| GET | `/api/v1/cuentas-recaudo` |
| POST | `/api/v1/cuentas-recaudo` |
| PUT | `/api/v1/cuentas-recaudo/{id}` |
| PATCH | `/api/v1/cuentas-recaudo/{id}/activo` |

### Cobros

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/v1/ventas/{id}/cobros` | admin, vendedor |
| GET | `/api/v1/cobros?estado=pendiente\|dudoso\|pagado\|expirado` | todos |
| GET | `/api/v1/cobros/{codigo}` | todos |
| POST | `/api/v1/cobros/{codigo}/confirmar` | admin, vendedor |
| POST | `/api/v1/cobros/{codigo}/anular` | admin, vendedor |

`POST /ventas/{id}/cobros` reemplaza a `POST /ventas/{id}/cobros-qr`; se conserva el
endpoint viejo como alias durante una versión.

### Captura (token de captura, no JWT)

| Método | Ruta |
|---|---|
| POST | `/api/v1/transferencias/capturas` |
| POST | `/api/v1/transferencias/capturas/simular` (solo admin, entorno local) |

### Conciliación

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/v1/transferencias/pagos?estado=...` | todos |
| GET | `/api/v1/transferencias/canal` | admin |
| POST | `/api/v1/transferencias/pagos/{id}/resolver` | admin |
| POST | `/api/v1/transferencias/pagos/{id}/descartar` | admin |

### Contrato de captura

```json
{
  "canal": "api",
  "source_event_id": "msg-123",
  "emisor": "NEQUI",
  "ocurrido_at": "2026-11-04T15:22:10-05:00",
  "recibido_at": "2026-11-04T15:22:14-05:00",
  "titulo": "Recibiste un pago",
  "texto": "Monto: COP $25.000\nReferencia: 88451203\nFecha: 2026-11-04 15:22"
}
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "resultado": "nuevo_pago",
    "pago_transferencia_id": 41,
    "estado": "confirmado",
    "cobro_id": 17
  }
}
```

---

## 11. Interfaz propuesta

| Pantalla | Ruta | Contenido |
|---|---|---|
| Cobros y conciliación | `/cobros` | Bandeja con pestañas Pendientes, Por revisar, Confirmados, Vencidos; estado del canal; actualización cada 10 s |
| Generar cobro | modal desde venta | Selección de cuenta, monto, referencia; QR, llave, copiar, descargar, cuenta regresiva |
| Cuentas de recaudo | `/admin/cuentas-recaudo` | CRUD, QR estático, llave, modo, activación |
| Estado del canal | dentro de `/cobros` | Última captura, errores, reintentos, brecha potencial |

Accesibilidad: se mantienen las reglas del proyecto (foco atrapado en modales, cierre
con `Escape`, etiquetas asociadas, contraste AA).

---

## 12. Roles

| Acción | admin (dueño) | vendedor (cajero) | readonly |
|---|---|---|---|
| Crear cobro por transferencia | Sí | Sí | No |
| Confirmar manualmente | Sí | Sí | No |
| Ver cobros y pagos | Sí | Sí | Sí |
| Resolver dudoso | Sí | No (SRS-F-25) | No |
| Descartar pago sin match | Sí | No | No |
| Gestionar cuentas y credenciales | Sí | No | No |
| Ver estado del canal | Sí | No | No |

---

## 13. Decisiones abiertas y bloqueos

| ID | Decisión | Estado | Impacto |
|---|---|---|---|
| D-1 | Proveedor Bre-B / PSP para QR dinámico | **Bloqueante** | Sin contrato no hay QR dinámico ni webhook |
| D-2 | Emisores del MVP y muestras reales | Abierto (TBD-2) | Define parsers |
| D-3 | Canal de captura | API + simulador (elegido); email/Android después | Define adaptadores |
| D-4 | Ventana de emparejamiento | 10 min provisional, configurable (TBD-3) | Regla de conciliación |
| D-5 | Multi-tenant | **No** en esta instalación | Se simplifica SRS-F-05 |
| D-6 | Retención y cifrado del mensaje crudo | Abierto (TBD-4) | Texto crudo no se persiste en la fase 1 |
| D-7 | Un pago que cubre varias ventas | Abierto | El modelo actual exige un pago por venta |
| D-8 | ¿Bre-B entra en `destino_dinero` o se usa `banco`? | Abierto | Migración de ENUM |
| D-9 | ¿Se reemplaza `cobros_qr` o se convive? | Propuesta: extender | Evita duplicar flujo |

---

## 14. Plan por fases

### Fase 0 · Preparación (actual)

- Este documento.
- Validar D-1 con el banco/proveedor.
- Confirmar D-2 y D-5.

**Criterio de salida:** decisiones D-1, D-2 y D-5 cerradas.

### Fase 1 · Cobro por transferencia con QR estático

- Migración `003_transferencias.sql` (cuentas + extensión de `cobros_qr`).
- CRUD de cuentas de recaudo.
- Generación de cobro con cuenta, monto, referencia y vencimiento.
- Visualización de QR estático o datos de la cuenta.
- Confirmación manual con referencia (reutiliza `CobroQrService`).
- Pantalla `/cobros` y modal de cobro.

**No requiere proveedor.** Entrega valor inmediato.

### Fase 2 · Captura y conciliación automática

- Token de captura + rate limit.
- `eventos_captura`, `pagos_transferencia`, `conciliaciones`.
- Parsers con fixtures sintéticos.
- Conciliación conservadora y bandeja de dudosos.
- Registro del pago con `VentaService::registrarPago`.

**Criterio de salida:** los escenarios de §5 del SRS v0.4 pasan como pruebas.

### Fase 3 · QR dinámico y webhook

- Adaptador del PSP (D-1).
- QR con monto y referencia.
- Confirmación por webhook firmado.
- Estado del canal y brecha potencial.

### Fase 4 · Libro diario y cierre

- Cierre por día en `America/Bogota` con totales por emisor.
- Exportación CSV/JSON.
- Evaluar solapamiento con `FinanzasService`.

---

## 15. Trazabilidad Chulito → implementación

| Requisito | Componente destino | Fase |
|---|---|---|
| SRS-F-10 captura con consentimiento | `CapturaService` + `captura_credenciales` | 2 |
| SRS-F-11 identificar emisor | `ParserRegistry` | 2 |
| SRS-F-12 normalizar | `PagoNormalizado` | 2 |
| SRS-F-13 idempotencia | `eventos_captura` + `pagos_transferencia` | 2 |
| SRS-F-14 no reconocido se conserva | `eventos_captura` + aviso | 2 |
| SRS-F-15 estado del canal | `/transferencias/canal` | 3 |
| SRS-F-20 pagos en vivo | `/cobros` con polling | 2 |
| SRS-F-21 cobro esperado | `POST /ventas/{id}/cobros` | 1 |
| SRS-F-22 emparejar | `ConciliacionService` | 2 |
| SRS-F-23 estados | `cobros_qr.estado` | 1 |
| SRS-F-24 dudoso | `pagos_transferencia.estado` | 2 |
| SRS-F-25 resolución manual | `POST /pagos/{id}/resolver` | 2 |
| SRS-F-30 libro diario | `FinanzasService` / `/cobros` | 4 |
| SRS-F-31 cierre del día | `ReporteService` | 4 |
| SRS-F-32 exportación | nuevo endpoint | 4 |
| SRS-F-40 auditoría | tabla `auditoria` | 2 |
| SRS-NFR-01 p95 ≤ 10 s | polling 10 s + índice | 2 |
| SRS-NFR-04 reintentos | token + reintento del adaptador | 2 |
| SRS-NFR-08 rate limit | `LoginThrottleService` reutilizable | 2 |
| SRS-NFR-09 parser con 80 % cobertura | PHPUnit por parser | 2 |

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Prometer QR Bre-B dinámico sin proveedor | Alta | Alto | Modo estático primero; D-1 bloqueante |
| El QR actual se cree pagable | Alta | Alto | Reemplazar `qr_modo = interno` y rotular |
| Referencias no únicas por emisor | Media | Alto | Revisión en vez de fusión; validar con muestras |
| Duplicado entre canales | Media | Medio | Idempotencia de transacción, no solo de evento |
| Falso positivo al confirmar | Media | Alto | Regla conservadora: dudoso antes que confirmado |
| Parser frágil ante cambios del emisor | Alta | Medio | Un módulo por emisor + pruebas + no reconocido |
| Copiar el modelo multi-tenant de Chulito | Media | Medio | Simplificar a negocio único |
| Dependencia de un solo desarrollador | Alta | Medio | Documentar decisiones y pruebas |

---

## 17. Próximo paso

Cuando Chulito consolide lo necesario:

1. Cerrar D-1 (proveedor Bre-B) y D-2 (emisores).
2. Crear la rama `dev` en `gestion-comercial-v3`.
3. Implementar la Fase 1 completa con pruebas.
4. Portar la Fase 2 con los escenarios del SRS v0.4 como suite de aceptación.

Mientras tanto, este documento es la referencia y no modifica el comportamiento actual
del sistema.
