#!/bin/sh
# D41 · CO-10 no carnê. Gera tudo: HTML, index, capturas, axe, PDFs de exemplo com os QR lidos de volta e WebP.
# Uso: sh gerar.sh <pasta-saida>
# aprovado-cb/ e aprovado-pdf/ são as cópias dos geradores aprovados (console-cobranca e cobranca-pdfs), sem mudança
# além do caminho do repositório; os d41_*.py leem as peças deles e acrescentam os estados novos.
# As páginas de base são as aprovadas em docs/design/aprovadas/cobranca-pdfs/ (ficha, cobrança e Portal), lidas do repositório.
# Precisa de: Python 3 com Pillow; segno para os QR (PYLIBS=<pasta> se não estiver instalado);
# Playwright (Node); pdfinfo e pdftoppm (poppler); e AXE_DIR=<pasta>/node_modules com @axe-core/playwright, jsqr e pngjs.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 d41_outras.py "$S"     # também gera ficha.html (importa d41_ficha)
python3 d41_pdf.py "$S"
python3 casos_d41.py "$S"
node fotos_d41.cjs "$S"
python3 webp.py "$S"
rm -rf __pycache__ aprovado-cb/__pycache__ aprovado-pdf/__pycache__
