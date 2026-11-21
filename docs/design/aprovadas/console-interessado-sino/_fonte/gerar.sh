#!/bin/sh
# Gera tudo: interessados.html e cobranca.html, capturas (WebP), axe e o index.html. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado) e as telas aprovadas em
# /home/claude/t3jus/docs/design/aprovadas/ (Interessados do site-comercial, Cobrança e o sino do Portal), lidas sem mudança.
# O axe-core vai numa pasta temporária (AXE aponta para o axe.min.js).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
AXE="${AXE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
if [ ! -f "$AXE" ]; then mkdir -p /tmp/claude-0/axe && (cd /tmp/claude-0/axe && npm init -y >/dev/null && npm i --silent axe-core@4.10.3); fi
export AXE
[ -f "$S/fontes.css" ] || cp /home/claude/t3jus/docs/design/aprovadas/site-comercial/fontes.css "$S/"
python3 montar.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
