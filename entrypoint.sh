#!/bin/sh
set -e

echo "Esperando a la base de datos y aplicando migraciones..."
until npx prisma migrate deploy; do
  echo "Base de datos no lista, reintentando en 1s..."
  sleep 1
done

echo "Verificando si es necesario ejecutar el seed..."
node prisma/ensureSeed.js

echo "Iniciando servidor..."
exec node dist/server.js
