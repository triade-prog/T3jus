#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# O axe vem de @axe-core/playwright; se não estiver no caminho do node, aponte AXE_PW para ele
# (ex.: AXE_PW=/caminho/node_modules/@axe-core/playwright sh gerar.sh ..).
# O clientes.py fica aqui como fonte das peças da ficha aprovada; o base.py o lê até o começo dos estados.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 sem_avisos.py "$S"
python3 sino.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
