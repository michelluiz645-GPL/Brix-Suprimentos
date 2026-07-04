# docker/Dockerfile — ambiente de desenvolvimento (PHP-FPM)
FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
    bash git curl libpng-dev libzip-dev zip unzip oniguruma-dev \
    mysql-client

RUN docker-php-ext-install pdo_mysql mbstring zip exif pcntl gd bcmath

# Composer (binário oficial, sem precisar baixar do Packagist nesta etapa)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/backend

EXPOSE 9000

CMD ["php-fpm"]
