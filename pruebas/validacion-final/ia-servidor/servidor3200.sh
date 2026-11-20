#!/bin/zsh
cd "$(dirname "$0")/../../.."  # raiz del proyecto
PUERTO=3200 node servidor.js > pruebas/validacion-final/ia-servidor/s3200.log 2>&1 &
echo $! > pruebas/validacion-final/ia-servidor/s3200.pid
sleep 1.5
echo "--- segundo servidor mismo puerto"
PUERTO=3200 timeout 10 node servidor.js; echo "salida=$?"
echo "--- primero sigue vivo"; curl -s -o /dev/null -w "%{http_code}\n" localhost:3200/web/
