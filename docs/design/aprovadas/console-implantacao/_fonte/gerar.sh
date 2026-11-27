#!/bin/sh
# Gera tudo: HTML, index, capturas, conferência e WebP. Uso: sh gerar.sh <pasta-saida>
# Os HTML aprovados são lidos de docs/design/aprovadas/ (cobranca-pdfs, console-interessado-sino, portal-inicio-audiencias) sem mudança;
# os estados novos têm o prefixo im- (Console) ou pt- (Portal). A conferência de acessibilidade é própria (ver fotos_im.cjs).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 ficha_im.py "$S"
python3 cobranca_im.py "$S"
python3 portal_im.py "$S"
python3 pdf_im.py "$S"
python3 casos_im.py "$S"
node fotos_im.cjs "$S"
python3 webp.py "$S"
