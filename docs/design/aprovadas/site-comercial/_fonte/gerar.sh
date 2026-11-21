#!/bin/sh
# Gera tudo: páginas do site, fontes.css, interessados.html, capturas (WebP), axe e o index.html. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado), as telas aprovadas em
# /home/claude/t3jus/docs/design/aprovadas/ (moldura, CSS, ícones e peças da Cobrança) e os SVGs da marca em marca/.
# O axe-core vai numa pasta temporária (AXE aponta para o axe.min.js).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
AXE="${AXE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
if [ ! -f "$AXE" ]; then mkdir -p /tmp/claude-0/axe && (cd /tmp/claude-0/axe && npm init -y >/dev/null && npm i --silent axe-core@4.10.3); fi
export AXE
mkdir -p "$S/marca"
for f in logo-completo-sobre-vinho.svg selo-cor.svg icone-app.svg og.png apple-touch-icon.png; do cp /home/claude/t3jus/sistema/apps/site/public/marca/$f "$S/marca/"; done
python3 site.py "$S"
python3 interessados.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
