#!/bin/sh
# Gera tudo: index.html, lista de estados, capturas, axe e WebP. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py e juridico.py são cópias sem mudança das telas aprovadas (portal-clientes e portal-juridico).
# ficha_ligada.py lê clientes.py e juridico.py até o começo dos estados, sem gerar os HTML deles,
# e escreve o index.html (página única, com CSS, fontes e ícones embutidos) e o casos.json.
# O axe vem de @axe-core/playwright; se não estiver em sistema/node_modules, aponte AXE_PW para ele.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 ficha_ligada.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
