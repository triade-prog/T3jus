#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py e pendencias.py são as cópias sem mudança do Início aprovado (F1.14);
# inicio_areas.py lê as peças deles. O axe vem do @axe-core/playwright (veja fotos_ia.cjs).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 inicio_areas.py "$S"
python3 casos_ia.py "$S"
node fotos_ia.cjs "$S"
python3 webp.py "$S"
