#!/bin/sh
# Gera tudo: index.html, lista de estados, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py, juridico.py, ficha_ligada.py, procuracoes.py, contratos.py, pecas.py, peticoes_css.txt,
# responsavel.py, fotos.cjs e webp.py são cópias sem mudança do desenho aprovado em
# docs/design/aprovadas/portal-responsavel-legal/_fonte. termo.py lê responsavel.py até o começo dos estados.
# O axe vem de @axe-core/playwright: aponte AXE_PW para ele e NODE_PATH para onde está o playwright
# (nesta rodada: npm install @axe-core/playwright@4.10.1 numa pasta à parte).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 termo.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
