#!/bin/sh
# Gera tudo: index.html, lista de estados, capturas PNG, axe e conferências. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py, juridico.py e ficha_ligada.py são cópias sem mudança das aprovadas (portal-ficha-cliente-ligada).
# jornada.py lê ficha_ligada.py até o começo dos estados e lê, só para ler, o HTML aprovado de Contratos,
# Procurações e modelos, Financeiro, Conversas, Agenda e Clientes em docs/design/aprovadas/ (variável APROV).
# O axe vem de @axe-core/playwright; aponte AXE_PW para ele se não estiver no caminho padrão.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 jornada.py "$S"
node fotos.cjs "$S"
