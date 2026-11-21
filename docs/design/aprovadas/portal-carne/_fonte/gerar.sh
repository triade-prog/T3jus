#!/bin/sh
# Gera tudo: carne-a4.html, financeiro.html, contratos.html, escritorio.html, index.html,
# carne-exemplo.pdf, miniaturas, capturas (WebP), axe e conferências. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado), e as telas aprovadas
# em /home/claude/t3just/docs/design/aprovadas/ (o comum.py lê o CSS de lá, como no Financeiro aprovado).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
# segno (QR Code) e axe-core numa pasta temporária, se ainda não houver
PYLIBS="${PYLIBS:-/tmp/t3jus-carne-py}"
python3 -c "import segno" 2>/dev/null || [ -d "$PYLIBS/segno" ] || pip install --quiet --target "$PYLIBS" segno
AXE_DIR="${AXE_DIR:-/tmp/t3jus-carne-axe/node_modules}"
if [ ! -d "$AXE_DIR/@axe-core/playwright" ]; then
  mkdir -p /tmp/t3jus-carne-axe && (cd /tmp/t3jus-carne-axe && npm init -y >/dev/null && npm i --silent @axe-core/playwright@4.10.2 axe-core@4.10.3)
  AXE_DIR=/tmp/t3jus-carne-axe/node_modules
fi
export PYLIBS AXE_DIR
python3 carne_a4.py "$S"
python3 carne.py "$S"
python3 casos_cn.py "$S"
node fotos.cjs "$S" --miniaturas
python3 webp.py "$S"
node fotos.cjs "$S" --capturas
python3 webp.py "$S"
