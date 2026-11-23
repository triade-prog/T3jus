#!/bin/sh
# Gera tudo: o HTML, o index, as capturas PNG e a conferência (axe, rolagem, alvos). Uso: sh gerar.sh <pasta-saida>
# comum.py, financeiro.py, pend.py e financeiro_pend.py são os geradores das telas aprovadas, copiados sem mudança
# (só o caminho das telas aprovadas no comum.py, que pode vir de APROV). O emprestimos.py os importa e põe os estados novos.
# O axe vem de @axe-core/playwright; se não estiver no caminho do node, aponte AXE_PW para ele.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 emprestimos.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
