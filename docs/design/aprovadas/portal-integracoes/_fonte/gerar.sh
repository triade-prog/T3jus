#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# O axe vem de @axe-core/playwright; se não estiver no caminho do node, aponte AXE_PW para ele
# (ex.: AXE_PW=/caminho/node_modules/@axe-core/playwright sh gerar.sh ..).
# comum.py e extra.py são cópias sem mudança do aprovado do WhatsApp e IA.
# conversas.py e whatsapp.py ficam aqui só como fonte do CSS aprovado (cv- e wa-); não são rodados.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 integracoes.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
