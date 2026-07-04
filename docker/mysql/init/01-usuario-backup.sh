#!/bin/bash
# Cria o usuário dedicado para mysqldump com auth mysql_native_password.
# O cliente MariaDB usado no container da aplicação trava (segfault) ao
# autenticar com caching_sha2_password (plugin padrão do usuário da app no
# MySQL 8), então o backup automático usa este usuário à parte.
# Executado automaticamente pela imagem oficial do MySQL apenas na
# primeira inicialização do volume de dados (novo servidor/portabilidade).
set -euo pipefail

: "${DB_BACKUP_USERNAME:?defina DB_BACKUP_USERNAME no .env}"
: "${DB_BACKUP_PASSWORD:?defina DB_BACKUP_PASSWORD no .env}"

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    CREATE USER IF NOT EXISTS '${DB_BACKUP_USERNAME}'@'%' IDENTIFIED WITH mysql_native_password BY '${DB_BACKUP_PASSWORD}';
    GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON \`${MYSQL_DATABASE}\`.* TO '${DB_BACKUP_USERNAME}'@'%';
    FLUSH PRIVILEGES;
EOSQL
