#!/bin/sh
# Gera tudo: os três HTML, o index, as capturas, o axe e o WebP. Uso: sh gerar.sh <pasta-saida>
# comercial/ tem as cópias sem mudança do desenho aprovado portal-exclusao-contratos-conversas/_fonte/contratos
# (com f181_contratos.py), mais nomes_181.py e pendencias.py de lá; f204_comercial.py grava comercial.html.
# funil/ tem as cópias de portal-comercial-financeiro-pendencias/_fonte; f204_funil.py grava funil.html.
# inicio/ tem as cópias de portal-inicio-audiencias/_fonte; f204_inicio.py grava inicio.html.
# Única mudança nas cópias: os caminhos vêm de T3JUS_APROV (pasta docs/design/aprovadas/) e T3JUS_LOGO
# (sistema/packages/ui/src/logo-desenho.ts), como o comum.py da F3.181 já fazia.
# O axe: npm install @axe-core/playwright numa pasta qualquer e AXE_PLAYWRIGHT=<pasta>/node_modules/@axe-core/playwright.
set -e
S="$(cd "${1:-$(dirname "$0")/..}" && pwd)"
cd "$(dirname "$0")"
(cd comercial && python3 f204_comercial.py "$S")
(cd funil && python3 f204_funil.py "$S")
(cd inicio && python3 f204_inicio.py "$S")
python3 casos_204.py "$S"
node fotos_204.cjs "$S"
python3 webp.py "$S"
find . -name __pycache__ -type d -exec rm -rf {} +
