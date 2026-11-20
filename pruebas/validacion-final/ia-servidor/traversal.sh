#!/bin/zsh
U=localhost:3200
TMPD="$(mktemp -d)"
# archivo fuera del proyecto: el padre contiene "tinto-compilador"; /etc/passwd y un archivo hermano
for p in "/../package.json" "/web/../../../../../../etc/passwd" "/%2e%2e/%2e%2e/etc/passwd" "/web/%2e%2e/%2e%2e/%2e%2e/etc/passwd" "/..%2f..%2f..%2fetc/passwd" "/web/..%2f..%2f..%2f..%2fetc/passwd" "/%2e%2e%2f%2e%2e%2fetc/passwd" "/web/..\\..\\..\\etc\\passwd" "/%5c..%5c..%5cetc%5cpasswd" "/....//....//etc/passwd" "/web/%252e%252e/%252e%252e/etc/passwd" "/%00/etc/passwd" "/web/index.html%00.js" "//etc/passwd" "/../tinto-compilador/servidor.js" "/../../.zshrc" "/.git/config" "/.env" "/node_modules/.package-lock.json" "/node_modules/" "/web/.hidden" "/servidor.js" "/prompt-traductor.md" "/pruebas/validacion-final/"; do
  printf '%-60s ' "$p"; curl -s --path-as-is -m 10 -o $TMPD/tr.out -w "%{http_code} %{content_type} %{size_download}B" "http://$U$p"; echo " | $(head -c 60 $TMPD/tr.out | tr '\n' ' ')"
done
