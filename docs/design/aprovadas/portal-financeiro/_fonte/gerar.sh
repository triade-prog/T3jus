#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 financeiro.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
