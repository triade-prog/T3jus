#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# clientes.py e comum.py são as cópias sem mudança do desenho aprovado; pendencias.py lê as peças deles.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 pendencias.py "$S"
python3 casos_pd.py "$S"
node fotos_pd.cjs "$S"
python3 webp.py "$S"
