FROM php:8.4.27-fpm-alpine

RUN apk add --no-cache bash git curl libpng-dev oniguruma-dev libxml2-dev zip unzip shadow

RUN docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/php.ini /usr/local/etc/php/conf.d/app.ini

WORKDIR /var/www

COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

RUN addgroup -g 1000 www && adduser -u 1000 -G www -s /bin/sh -D www

# El código vive dentro de la imagen. El entorno de operación (compose.ops.yaml)
# no monta el directorio: editar archivos en el host no cambia lo que ve el
# cliente hasta que se reconstruye y se despliega la imagen.
COPY backend/ ./
RUN chown -R www:www /var/www

USER www
EXPOSE 9000
