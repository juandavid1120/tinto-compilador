#!/bin/sh
# uso: tmo.sh SEGUNDOS comando...
s=$1; shift
exec perl -e 'alarm shift; exec @ARGV' "$s" "$@"
