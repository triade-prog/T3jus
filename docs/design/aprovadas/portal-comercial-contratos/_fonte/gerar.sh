#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 comercial.py "$S"
python3 contratos.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
