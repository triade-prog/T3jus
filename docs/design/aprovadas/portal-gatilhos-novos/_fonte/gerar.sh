#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# O axe vem de @axe-core/playwright; se não estiver no caminho do node, aponte AXE_PW para ele
# (ex.: AXE_PW=/caminho/node_modules/@axe-core/playwright sh gerar.sh ..).
# automacoes.py e juridico.py são as cópias sem mudança dos aprovados: gatilhos.py e juridico_doc.py os leem
# até o começo dos estados. conversas.py fica aqui só como fonte do CSS cv- aprovado (não é rodado).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 gatilhos.py "$S"
python3 juridico_doc.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
