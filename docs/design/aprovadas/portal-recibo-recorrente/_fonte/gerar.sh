#!/bin/sh
# Gera tudo: recibo-a4.html, financeiro.html, contratos.html, comercial.html, index.html,
# recibo-exemplo.pdf, capturas (WebP), axe e conferências. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado), e as telas aprovadas
# em /home/claude/t3just/docs/design/aprovadas/ (o comum.py lê o CSS de lá, como no Financeiro aprovado).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
AXE_DIR="${AXE_DIR:-/tmp/t3jus-carne-axe/node_modules}"
if [ ! -d "$AXE_DIR/@axe-core/playwright" ]; then
  mkdir -p /tmp/t3jus-carne-axe && (cd /tmp/t3jus-carne-axe && npm init -y >/dev/null && npm i --silent @axe-core/playwright@4.10.2 axe-core@4.10.3)
  AXE_DIR=/tmp/t3jus-carne-axe/node_modules
fi
export AXE_DIR
python3 recibo_a4.py "$S"
python3 telas.py "$S"
python3 casos_rr.py "$S"
node fotos.cjs "$S" --pdf
node fotos.cjs "$S" --capturas
python3 webp.py "$S"
