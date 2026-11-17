-- ============================================================
-- Datos de ejemplo — catálogo de referencia
-- ============================================================
-- NO se cargan automáticamente: `database/migrations/` es solo esquema.
-- Estos son los productos del primer negocio que usó el sistema
-- (distribuidor de pescado, queso y carne) y sirven para probar la
-- aplicación con datos realistas.
--
-- Uso:
--   docker compose cp database/seeds/demo_catalogo.sql db:/tmp/demo.sql
--   docker compose exec -T db sh -c \
--     'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /tmp/demo.sql'
--   docker compose exec -T db rm -f /tmp/demo.sql
--
-- Para un catálogo distinto (ferretería, despensa, farmacia…), reemplaza
-- estas filas: el esquema no depende de los nombres ni de las categorías.

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Pescado',       'Pescado fresco vendido por canastas o kilos'),
  ('Queso',         'Queso blanco vendido por kilo'),
  ('Carne Serrana', 'Carne de res serrana vendida por kilo');

-- Precios de demostración: no corresponden a ningún negocio real.
INSERT INTO productos (categoria_id, nombre, unidad_medida, precio_compra, precio_venta, kilos_por_canasta) VALUES
  (1, 'Pescado (media canasta)', 'canasta', 120000, 15000, 20),
  (2, 'Queso',                   'kilo',    4000,   8000,  NULL),
  (3, 'Carne Serrana',           'kilo',    15000,  25000, NULL);
