#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py e pendencias.py são as cópias do desenho aprovado (portal-clientes-pendencias),
# e f155.py é o do desenho aprovado portal-exclusao-arquivos, sem mudança; f156.py lê as peças deles.
# O axe: npm install @axe-core/playwright numa pasta qualquer e AXE_PLAYWRIGHT=<pasta>/node_modules/@axe-core/playwright.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 f156.py "$S"
python3 casos_156.py "$S"
node fotos_156.cjs "$S"
python3 webp.py "$S"
rm -rf __pycache__
