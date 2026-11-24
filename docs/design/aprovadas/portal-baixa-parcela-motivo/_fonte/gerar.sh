#!/bin/sh
# Gera tudo: index.html, lista de estados, capturas PNG, axe e _conferencia.json. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py, juridico.py, ficha_ligada.py, jornada.py, fechamento.py e fotos.cjs são cópias sem mudança
# das de portal-fechamento-sem-levantamento (aprovado em 22/11/2026).
# baixa.py lê fechamento.py até a parte "página" e lê, só para ler, o HTML aprovado de portal-nao-paga-logo
# (CSS np- e o ícone "desfazer") e de portal-sino-caso-encerrado (painel, CSS si- e script do sino).
# fotos.cjs usa o Playwright já instalado e só o axe-core (AXE_CORE aponta para o axe.min.js).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
export APROV="${APROV:-/home/user/t3jus/docs/design/aprovadas/}"
export AXE_CORE="${AXE_CORE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
python3 baixa.py "$S"
node fotos.cjs "$S"
