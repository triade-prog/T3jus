#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py e pendencias.py são as cópias do desenho aprovado (portal-clientes-pendencias),
# só com o caminho do repositório trocado para /home/user/t3jus; f155.py lê as peças deles.
# O axe: npm install @axe-core/playwright numa pasta qualquer e AXE_PLAYWRIGHT=<pasta>/node_modules/@axe-core/playwright.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 f155.py "$S"
python3 casos_155.py "$S"
node fotos_155.cjs "$S"
python3 webp.py "$S"
rm -rf __pycache__
