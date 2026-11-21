#!/bin/sh
# Gera tudo: logos fictícios (PNG), contrato-nao-paga.html, financeiro-nao-paga.html, escritorio-logo.html,
# carne-logo-a4.html, recibo-logo-a4.html, index.html, carne-exemplo.pdf, recibo-exemplo.pdf, capturas WebP,
# axe e conferências. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado) e as telas aprovadas em
# /home/claude/t3just/docs/design/aprovadas/ (o comum.py lê o CSS de lá, como nos pacotes aprovados).
# Cópias sem mudança das aprovadas: comum.py, extra.py, contratos.py, pecas.py, contrato_pago_antes.py, fotos.cjs e webp.py
# (portal-pendencias-pequenas); carne.py, carne_dados.py, carne_a4.py e financeiro.py (portal-carne); recibo_a4.py e
# rr_dados.py (portal-recibo-recorrente). Os scripts novos as leem ou importam, sem gerar os HTML delas aqui.
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
export PYLIBS
export AXE_PW="$AXE_DIR/@axe-core/playwright"
python3 logos.py
node logos.cjs
python3 nao_paga.py "$S"
python3 logo_receb.py "$S"
python3 logo_a4.py "$S"
python3 casos.py "$S"
node pdf.cjs "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
