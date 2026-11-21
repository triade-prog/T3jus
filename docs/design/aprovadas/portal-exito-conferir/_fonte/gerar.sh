#!/bin/sh
# Gera tudo: financeiro.html (aprovado + estados do êxito), index.html, capturas (WebP), axe e conferências.
# Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado), e as telas aprovadas
# em /home/claude/t3just/docs/design/aprovadas/ (o comum.py lê o CSS de lá, como no Financeiro aprovado).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
AXE_DIR="${AXE_DIR:-/tmp/t3jus-exito-axe/node_modules}"
if [ ! -d "$AXE_DIR/@axe-core/playwright" ]; then
  mkdir -p /tmp/t3jus-exito-axe && (cd /tmp/t3jus-exito-axe && npm init -y >/dev/null && npm i --silent @axe-core/playwright@4.10.2 axe-core@4.10.3)
  AXE_DIR=/tmp/t3jus-exito-axe/node_modules
fi
export AXE_DIR
python3 exito.py "$S"
python3 casos_ex.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
