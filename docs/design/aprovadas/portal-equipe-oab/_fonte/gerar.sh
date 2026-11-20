#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# Base sem mudança: comum.py (Portal v1), equipe.py (Portal v1), pecas.py e contratos.py (Comercial e Contratos).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 oab_equipe.py "$S"
python3 oab_contratos.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
