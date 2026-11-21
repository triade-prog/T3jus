#!/bin/sh
# Gera tudo: HTML, index, capturas, axe, WebP e a página de publicar. Uso: sh gerar.sh <pasta-saida>
# Precisa de python3 (com Pillow), node com playwright e o @axe-core/playwright (ou AXE_DIR apontando para a pasta onde ele está instalado).
# contratos.py, pecas.py e comum.py são cópias sem mudança do Contratos aprovado; peticoes_css.txt é o CSS_PE do peticoes.py aprovado.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 procuracoes.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
python3 publicar.py "$S"
