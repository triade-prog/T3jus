#!/bin/sh
# Gera tudo: index.html, lista de estados, capturas PNG, axe e _conferencia.json. Uso: sh gerar.sh <pasta-saida>
# comum.py é a cópia do fechamento aprovado (a pasta das telas aprovadas vem de APROV).
# extra.py, clientes.py, base.py e sino.py são cópias sem mudança de portal-sem-avisos-sino/_fonte (o sino aprovado).
# sino_caso.py lê o sino.py até o começo dos estados e monta os 9 estados do aviso novo.
# fotos.cjs usa o Playwright já instalado e só o axe-core (AXE_CORE aponta para o axe.min.js;
# para ter um: npm install axe-core@4.10.2 numa pasta qualquer).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
export APROV="${APROV:-/home/user/t3jus/docs/design/aprovadas/}"
export AXE_CORE="${AXE_CORE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
python3 sino_caso.py "$S"
node fotos.cjs "$S"
