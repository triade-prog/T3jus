#!/bin/sh
# Gera tudo: HTML, index, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# Os HTML aprovados são lidos de docs/design/aprovadas/console-fim-contrato/ sem mudança; os estados novos têm o prefixo cb-
# (na ficha, na carteira e no Portal) ou ficam na página nova cobranca.html.
# O axe-core entra na página pelo arquivo indicado em AXE (padrão: ../../axe/node_modules/axe-core/axe.min.js).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 cobranca_cb.py "$S"
python3 ficha_cb.py "$S"
python3 carteira_cb.py "$S"
python3 portal_cb.py "$S"
python3 casos_cb.py "$S"
node fotos_cb.cjs "$S"
python3 webp.py "$S"
