#!/bin/sh
# Gera tudo: index.html, lista de estados, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py, juridico.py e ficha_ligada.py são cópias sem mudança das telas aprovadas (Clientes e ficha ligada).
# procuracoes.py, contratos.py, pecas.py e peticoes_css.txt são cópias sem mudança do desenho aprovado de Procurações.
# responsavel.py lê ficha_ligada.py e procuracoes.py até o começo dos estados, sem gerar os HTML deles,
# e escreve o index.html (página única, com CSS, fontes e ícones embutidos) e o casos.json.
# O axe vem de @axe-core/playwright; se não estiver em sistema/node_modules, aponte AXE_PW para ele
# (nesta rodada: npm install @axe-core/playwright@4.10.1 numa pasta à parte, axe-core 4.10.3).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 responsavel.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
