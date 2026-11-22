#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# Precisa de python3 (com Pillow), node com playwright e o @axe-core/playwright (ou AXE_DIR).
# comum.py, pecas.py, contratos.py, procuracoes.py e peticoes_css.txt são cópias sem mudança do pacote aprovado portal-procuracoes.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 contrato_pdf.py "$S"
python3 index_gerar.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
