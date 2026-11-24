#!/bin/sh
# Gera tudo: index.html (o sino), fechamento.html (as duas frases da pergunta 5), casos.json, capturas PNG, axe e _conferencia.json.
# Uso: sh gerar.sh <pasta-saida>
# sino.py, base.py, extra.py, clientes.py, comum.py e sino_caso.py são cópias sem mudança de portal-sino-caso-encerrado/_fonte (F3.147).
# fechamento.py, jornada.py, ficha_ligada.py e juridico.py são cópias sem mudança de portal-fechamento-sem-levantamento/_fonte (F3.132).
# sino_fechou.py lê o sino_caso.py até o começo dos estados e monta os 10 estados do aviso novo.
# fecha_fechou.py lê o fechamento.py até a parte "página", troca só as duas frases e grava os 2 estados da pergunta 5.
# estados.py tem a lista de estados e a navegação comum às duas páginas.
# fotos.cjs é a cópia do F3.147 sem mudança; usa o Playwright já instalado e só o axe-core
# (AXE_CORE aponta para o axe.min.js; para ter um: npm install axe-core@4.10.2 numa pasta qualquer).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
export APROV="${APROV:-/home/user/t3jus/docs/design/aprovadas/}"
export AXE_CORE="${AXE_CORE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
python3 sino_fechou.py "$S"
python3 fecha_fechou.py "$S"
python3 estados.py
node fotos.cjs "$S"
