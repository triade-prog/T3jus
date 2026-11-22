#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# Precisa de python3 (com Pillow), node com playwright e o @axe-core/playwright (ou AXE_DIR).
# comum.py, pecas.py, contratos.py, procuracoes.py, peticoes_css.txt e contrato_pdf.py são cópias sem mudança
# do pacote aprovado portal-contrato-pdf (D23); ficha_pdf.py carrega o contrato_pdf.py e acrescenta as peças fp-.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 ficha_pdf.py "$S"
python3 index_ficha.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
