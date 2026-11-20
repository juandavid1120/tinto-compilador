#!/bin/zsh
U=http://localhost:3200
t() { echo "=== $1"; shift; curl -s -m 20 -i "$@" | sed -n '1p;/^[Cc]ontent-[Tt]ype/p;/^Allow/p;/^[Ll]ocation/p;$p' | head -8; echo "(curl rc=${pipestatus[1]})"; }
TMPD="$(mktemp -d)"
G=$TMPD/grande.json
python3 -c "print('{\"texto\":\"' + 'a'*20000 + '\"}')" > $G
python3 -c "print('{\"texto\":\"' + 'a'*5000000 + '\"}')" > $G.5m
t "cuerpo 20KB" -X POST -H 'Content-Type: application/json' --data-binary @$G $U/api/traducir
t "cuerpo 5MB" -X POST -H 'Content-Type: application/json' --data-binary @$G.5m $U/api/traducir
t "texto 501 chars" -X POST -H 'Content-Type: application/json' -d "{\"texto\":\"$(python3 -c "print('a'*501)")\"}" $U/api/traducir
t "JSON roto" -X POST -H 'Content-Type: application/json' -d '{"texto": "hola' $U/api/traducir
t "no JSON texto plano" -X POST -H 'Content-Type: text/plain' -d 'dibuja un cuadrado' $U/api/traducir
t "vacio" -X POST -H 'Content-Type: application/json' -d '' $U/api/traducir
t "texto numero" -X POST -H 'Content-Type: application/json' -d '{"texto":123}' $U/api/traducir
t "texto vacío" -X POST -H 'Content-Type: application/json' -d '{"texto":"   "}' $U/api/traducir
t "null" -X POST -H 'Content-Type: application/json' -d 'null' $U/api/traducir
t "array" -X POST -H 'Content-Type: application/json' -d '[]' $U/api/traducir
t "form-urlencoded" -X POST -H 'Content-Type: application/x-www-form-urlencoded' -d 'texto=cuadrado' $U/api/traducir
t "GET api" $U/api/traducir
t "PUT api" -X PUT $U/api/traducir
t "DELETE api" -X DELETE $U/api/traducir
t "PATCH api" -X PATCH $U/api/traducir
t "OPTIONS api" -X OPTIONS $U/api/traducir
t "HEAD api" -I $U/api/traducir
t "POST /web/" -X POST $U/web/
t "DELETE /web/" -X DELETE $U/web/index.html
t "api inexistente" $U/api/otra
t "api inexistente POST" -X POST $U/api/otra
t "ruta inexistente" $U/nada
t "ruta inexistente en web" $U/web/nada.js
t "/ raiz" $U/
t "/web sin barra" $U/web
t "/api/traducir/ con barra final" -X POST -H 'Content-Type: application/json' -d '{"texto":""}' $U/api/traducir/
