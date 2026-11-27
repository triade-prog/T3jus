#!/bin/sh
# Gera tudo: os quatro HTML, o index, as capturas, o axe e o WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py, pendencias.py, f155.py, f156.py, f177.py e webp.py são as cópias do desenho aprovado
# portal-exclusao-historico (F3.177), sem mudança; f181.py lê as peças deles e grava exclusao.html.
# contratos/ tem as cópias aprovadas de portal-recibo-recorrente (Comercial e Contratos) e lembretes/ as de
# portal-importacao-sobras-rodada2 (Lembretes de contrato), cada uma com o seu gerador f181_*.py.
# nomes_181.py troca os nomes do desenho aprovado pelos dados fictícios do plano.
# O axe: npm install @axe-core/playwright numa pasta qualquer e AXE_PLAYWRIGHT=<pasta>/node_modules/@axe-core/playwright.
set -e
S="$(cd "${1:-$(dirname "$0")/..}" && pwd)"
cd "$(dirname "$0")"
python3 f181.py "$S"
(cd contratos && python3 f181_contratos.py "$S")
(cd lembretes && python3 f181_lembretes.py "$S")
python3 casos_181.py "$S"
node fotos_181.cjs "$S"
python3 webp.py "$S"
find . -name __pycache__ -type d -exec rm -rf {} +
