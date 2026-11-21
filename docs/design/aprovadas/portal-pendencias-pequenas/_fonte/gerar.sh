#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# O axe vem de @axe-core/playwright; se não estiver no caminho do node, aponte AXE_PW para ele
# (ex.: AXE_PW=/caminho/node_modules/@axe-core/playwright sh gerar.sh ..).
# conversas.py, contratos.py e pecas.py ficam aqui como fonte das telas aprovadas: os scripts novos os leem até o começo dos estados.
# sem_avisos.py e base.py (da ficha aprovada) são lidos só como texto, para o CSS da janela e os ícones do sino riscado.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 conversa_avisos.py "$S"
python3 contrato_pago_antes.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
