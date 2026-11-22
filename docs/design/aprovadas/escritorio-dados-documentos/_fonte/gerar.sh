#!/bin/sh
# Gera tudo: HTML, index, capturas, axe, WebP e a página de publicar. Uso: sh gerar.sh <pasta-saida>
# Precisa de python3 (com Pillow), node com playwright no NODE_PATH e o pacote axe-core
# (instalado ao lado, npm i axe-core, ou na pasta da variável AXE_DIR).
# Base sem mudança, de portal-conta-dados: comum.py, pecas.py, oab.py, elenco.py e conta_dados.py (importado,
# não executado), fotos.cjs, webp.py e publicar.py. Também copiadas sem mudança, por script, duas páginas aprovadas:
# cobranca-pdfs/ficha.html (console_ficha.py) e portal-nao-paga-logo/escritorio-logo.html (marca_oab.py).
# O acréscimo: esc_elenco.py, escritorio_dados.py, console_ficha.py, marca_oab.py e casos.py (prefixo ed-).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 escritorio_dados.py "$S"
python3 console_ficha.py "$S"
python3 marca_oab.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
python3 publicar.py "$S"
