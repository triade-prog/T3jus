#!/bin/sh
# Gera tudo: index.html, lista de estados, capturas PNG, axe e _conferencia.json. Uso: sh gerar.sh <pasta-saida>
# clientes.py, juridico.py, ficha_ligada.py e jornada.py são cópias sem mudança das aprovadas (portal-jornada-fechamento).
# comum.py é a mesma cópia, com uma linha a mais: a pasta das telas aprovadas vem de APROV.
# fechamento.py lê jornada.py até a parte "página" e lê, só para ler, o HTML aprovado de portal-exito-conferir.
# fotos.cjs usa o Playwright já instalado e só o axe-core (AXE_CORE aponta para o axe.min.js).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
export APROV="${APROV:-/home/user/t3jus/docs/design/aprovadas/}"
export AXE_CORE="${AXE_CORE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
python3 fechamento.py "$S"
node fotos.cjs "$S"
