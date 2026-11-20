#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# O axe vem do @axe-core/playwright: do node_modules do sistema ou do caminho em AXE_PLAYWRIGHT.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 relatorios.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
