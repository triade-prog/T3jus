#!/bin/sh
# Gera tudo: HTML, index, capturas, axe, WebP e a página para publicar. Uso: sh gerar.sh <pasta-saida>
# O axe vem de @axe-core/playwright; se não estiver no caminho do node, aponte AXE_PW para ele
# (ex.: AXE_PW=/caminho/node_modules/@axe-core/playwright sh gerar.sh ..).
# comum.py, financeiro.py, comercial.py, pecas.py, clientes.py, relatorios.py e dados.py são os geradores das telas
# aprovadas, copiados sem mudança: os scripts *_pend.py os importam e acrescentam os estados novos.
# A ordem importa: escritorio_pend.py importa financeiro.py, que reescreve financeiro.html; por isso vem antes.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 escritorio_pend.py "$S"
python3 financeiro_pend.py "$S"
python3 relatorios_pend.py "$S"
python3 comercial_pend.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
python3 casos.py "$S" --publicar
