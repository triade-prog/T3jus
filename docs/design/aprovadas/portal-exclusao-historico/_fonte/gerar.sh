#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py, pendencias.py, f155.py e f156.py são as cópias do desenho aprovado
# portal-exclusao-despesas (F3.156), sem mudança; f177.py lê as peças deles.
# O axe: npm install @axe-core/playwright numa pasta qualquer e AXE_PLAYWRIGHT=<pasta>/node_modules/@axe-core/playwright.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 f177.py "$S"
python3 casos_177.py "$S"
node fotos_177.cjs "$S"
python3 webp.py "$S"
rm -rf __pycache__
