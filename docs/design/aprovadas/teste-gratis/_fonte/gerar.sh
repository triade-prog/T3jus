#!/bin/sh
# Gera tudo: HTML, index, capturas, conferência e WebP. Uso: sh gerar.sh <pasta-saida>
# Os HTML aprovados são lidos de docs/design/aprovadas/ (variável APROV) sem mudança; os estados novos têm o prefixo tg-.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 console_tg.py "$S"
python3 portal_tg.py "$S"
python3 emails_tg.py "$S"
python3 casos_tg.py "$S"
node fotos_tg.cjs "$S"
python3 webp.py "$S"
rm -rf __pycache__
