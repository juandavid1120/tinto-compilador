#!/bin/sh
# Regresión: corre tal cual los scripts existentes, uno tras otro, con tiempo máximo (perl alarm).
R=$(cd "$(dirname "$0")/../../.." && pwd)  # raiz del proyecto
L=$R/pruebas/validacion-final/interfaz/logs-regresion
mkdir -p $L
run() { # nombre segundos dir comando...
  n=$1; s=$2; d=$3; shift 3
  echo "[$(date +%T)] INICIO $n" >> $L/_progreso.txt
  (cd $d && perl -e 'alarm shift; exec @ARGV' $s "$@" > $L/$n.log 2>&1; echo "exit=$?" >> $L/$n.log)
  echo "[$(date +%T)] FIN $n $(tail -1 $L/$n.log)" >> $L/_progreso.txt
}
E=$R/pruebas/navegador-ronda1; R2=$R/pruebas/navegador-ronda2
run humo 120 $E node 00-humo.mjs
run A-chat 700 $E node A-chat.mjs
run A7 240 $E node A7-servidor-caido.mjs
run B 500 $E node B-recorrido.mjs
run C 500 $E node C-errores.mjs
run D 600 $E node D-editor-tablero.mjs
run E 500 $E node E-modos.mjs
run F 1000 $E node F-presentacion.mjs
run G 200 $E node G-red.mjs
run r2-g1 400 $R2 node g1.mjs
run r2-g2 400 $R2 node g2.mjs
run r2-g3 400 $R2 node g3.mjs
run r2-g4 200 $R2 node g4.mjs
run r2-g5 300 $R2 node g5.mjs
run r2-g6 400 $R2 node g6.mjs
run r2-g7 150 $R2 node g7.mjs
run r2-v1470 350 $R2 node vista.mjs R2-17-1470x800 1470 800 1
run r2-v1366 350 $R2 node vista.mjs R2-17-1366x768 1366 768 1
run r2-v1024 350 $R2 node vista.mjs R2-17-1024x768 1024 768 1
run r2-v125 350 $R2 node vista.mjs R2-18-125 1152 720 1.25
run r2-v150 350 $R2 node vista.mjs R2-18-150 960 600 1.5
run r2-x150 200 $R2 node x150.mjs
echo "[$(date +%T)] TODO TERMINADO" >> $L/_progreso.txt
