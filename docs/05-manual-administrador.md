# 05 · Manual del administrador

Este manual describe la operación diaria del dueño o administrador del negocio.

## Ingreso

1. Abre el sistema en el navegador.
2. Escribe tu correo y contraseña.
3. Al entrar verás el **Panel de control** con la información financiera.

Si olvidas la contraseña, un responsable técnico puede restablecerla desde
consola:

```bash
docker compose exec php php bin/reset-admin-password.php admin@gcom.local
```

Para crear el primer administrador:

```bash
docker compose exec php php bin/reset-admin-password.php admin@gcom.local --create
```

## Panel de control

El panel del administrador resume el mes en curso:

| Indicador | Qué mide |
|---|---|
| Ventas del mes | Total vendido, sin pedidos cancelados |
| Utilidad bruta | Ventas menos costo de ventas |
| Flujo neto de caja | Cobros menos compras del periodo |
| Cartera pendiente | Saldo por cobrar a clientes |
| Ticket promedio | Venta media por pedido |
| DSO | Días promedio de cobro |
| Cartera sobre ventas | Peso de la deuda frente a la facturación |

También muestra:

- Evolución de ventas y utilidad de los últimos seis meses.
- Estado de resultados resumido.
- Últimas ventas.
- Saldos por destino del dinero.
- Stock disponible.

## Registrar una compra

Las compras solo las registra administración.

1. Entra a **Compras → Nueva compra**.
2. Selecciona proveedor y fecha.
3. Agrega los productos comprados con cantidad y precio.
4. Registra los gastos asociados: transporte, cuarto frío u otros.
5. Revisa el resumen: total de productos, gastos e inversión total.
6. Guarda la compra.

Efectos:

- Se actualiza el inventario.
- Se registra el movimiento de stock.
- La inversión entra al flujo de caja como egreso.
- Los gastos alimentan el estado de resultados.

### Estados de compra

| Estado | Uso |
|---|---|
| `pendiente` | Registrada, mercancía no recibida |
| `recibida` | Mercancía recibida |
| `parcial` | Recepción incompleta |

## Registrar una venta

Aunque el vendedor es quien más vende, el administrador también puede hacerlo.

1. Entra a **Ventas → Nueva venta**.
2. Busca un cliente registrado o escribe uno nuevo.
3. Agrega productos y cantidades.
4. Define el abono inicial, si existe.
5. Revisa el resumen y registra la venta.

Si el abono es menor al total, el saldo queda en **Cartera**.

## Cobrar cartera

1. Entra a **Cartera**.
2. Identifica el cliente con saldo pendiente.
3. Abre el detalle y registra el pago.
4. Indica monto, medio, destino y referencia.

El sistema actualiza el saldo y el estado de pago automáticamente.

## Gestionar precios y stock

### Precios

1. Entra a **Productos**.
2. Pulsa **Editar** en el producto.
3. Ajusta precio de compra, precio de venta y kilos por canasta.
4. Guarda.

Cada cambio queda en el historial de precios.

### Ajustes de inventario

Los ajustes manuales se usan para corregir diferencias contadas físicamente.
Deben registrarse con un motivo claro.

## Finanzas

La sección **Finanzas** presenta:

- Estado de resultados del mes.
- Flujo de caja diario.
- Indicadores: margen, punto de equilibrio, DSO, rotación y cobertura.
- Ventas por producto.
- Tendencia de seis meses.
- Comparativo con el mes anterior.

Las fórmulas se detallan en [08 · Finanzas](08-finanzas.md).

## Reportes

1. Entra a **Reportes**.
2. Selecciona el mes.
3. Consulta el resumen en pantalla o descarga el PDF.

El reporte incluye ventas, compras, cartera y resultados del periodo.

## Alertas

El sistema genera alertas de:

- Deudas vencidas.
- Stock bajo.
- Avisos del sistema.

Se revisan en **Alertas** y se marcan como leídas.

## Usuarios

En **Administración** puedes:

- Crear usuarios.
- Cambiar roles.
- Activar o desactivar cuentas.

Buenas prácticas:

- Una cuenta por vendedor.
- Desactivar al colaborador que sale.
- No compartir contraseñas.
- Revisar los permisos una vez al mes.

## Copias de seguridad

1. Entra a **Copias de seguridad**.
2. Genera un respaldo.
3. Descarga el archivo `.sql`.
4. Guárdalo fuera del equipo, en un lugar seguro.

Recomendación: un respaldo semanal y uno adicional antes de cada actualización.

## Cierre mensual

1. Verifica que todas las ventas del mes estén registradas.
2. Registra compras y gastos pendientes.
3. Cobra o documenta la cartera.
4. Genera el reporte mensual.
5. Descarga el respaldo.
6. Revisa el estado de resultados y el flujo de caja.

## Buenas prácticas

- Registra las compras el mismo día.
- No ajustes stock sin contar físicamente.
- Revisa la cartera vencida cada semana.
- Mantén los precios actualizados.
- No uses la cuenta de administrador para operar ventas diarias.
- Descarga respaldos antes de cambios importantes.
