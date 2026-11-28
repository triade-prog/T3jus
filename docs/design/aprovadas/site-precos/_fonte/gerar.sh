#!/bin/sh
# Refaz o desenho de "Planos e preços": páginas, capturas (1440 e 390 px, 2x), conferência e galeria.
# Lê as peças do site em $SITE_DIR (padrão: /home/user/t3jus/sistema/apps/site), sem mudar nada lá.
# Precisa: node com o playwright (require('playwright') e o Chromium já instalado), python3 com Pillow.
# O axe-core é opcional: npm install axe-core dentro de _fonte (ou AXE=<caminho do axe.min.js>).
# Uso: sh gerar.sh
set -e
cd "$(dirname "$0")"
S=..
SITE="${SITE_DIR:-/home/user/t3jus/sistema/apps/site}"
T="${TMPDIR:-/tmp}/t3jus-precos"
rm -rf "$T"; mkdir -p "$T" "$S/fontes" "$S/marca"
cp "$SITE"/public/fontes/*.woff2 "$S/fontes/"
cp "$SITE"/public/marca/logo-completo-sobre-vinho.svg "$SITE"/public/marca/selo-cor.svg "$SITE"/public/marca/icone-app.svg "$S/marca/"
SITE_DIR="$SITE" python3 montar.py "$S"
node capturas.cjs "$S" "$T"
python3 webp.py "$T" "$S"
cp "$T/_conferencia.json" "$S/"
python3 galeria.py "$T" "$S"
