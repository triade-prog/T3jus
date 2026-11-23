#!/bin/sh
# Gera tudo: logo fictício, carne-a4.html, recibo-a4.html, antes-depois.html, index.html, os PDFs de exemplo,
# as capturas WebP, a conferência das faixas e o axe. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado) e as telas aprovadas em
# /home/user/t3jus/docs/design/aprovadas/ (o comum.py lê o CSS de lá, como nos pacotes aprovados).
# Cópias sem mudança das aprovadas (só o caminho das pastas trocado de /home/claude para /home/user):
#   comum.py, carne_a4.py, carne_dados.py e webp.py (portal-carne); recibo_a4.py e rr_dados.py (portal-recibo-recorrente);
#   logo_dados.py (portal-nao-paga-logo, só com o logo largo).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
PYLIBS="${PYLIBS:-/tmp/t3jus-carne-py}"
python3 -c "import segno" 2>/dev/null || [ -d "$PYLIBS/segno" ] || pip install --quiet --target "$PYLIBS" segno
AXE_DIR="${AXE_DIR:-/tmp/t3jus-carne-axe/node_modules}"
if [ ! -d "$AXE_DIR/@axe-core/playwright" ]; then
  mkdir -p /tmp/t3jus-carne-axe && (cd /tmp/t3jus-carne-axe && npm init -y >/dev/null && npm i --silent @axe-core/playwright@4.10.2 axe-core@4.10.3)
  AXE_DIR=/tmp/t3jus-carne-axe/node_modules
fi
export PYLIBS AXE_DIR
python3 logos.py
node logos.cjs
python3 rs_a4.py "$S"
python3 casos.py "$S"
node conferir.cjs "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
