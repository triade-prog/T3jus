#!/bin/sh
# Gera tudo: os três HTML, o index, as capturas, o axe, o WebP e a página de publicar. Uso: sh gerar.sh <pasta-saida>
# Precisa de python3 (com Pillow), node com playwright e o @axe-core/playwright (ou AXE_DIR apontando para a pasta onde ele está instalado).
# As peças aprovadas são lidas do repositório: T3JUS_APROV aponta para docs/design/aprovadas/ (padrão /home/user/t3jus/docs/design/aprovadas/).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 sobras.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
python3 publicar.py "$S"
