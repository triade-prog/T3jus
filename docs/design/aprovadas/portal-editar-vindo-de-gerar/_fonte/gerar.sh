#!/bin/sh
# F3.160 · Gera tudo: telas.html (as telas vivas, com o botão Estados), as capturas, o axe, a galeria index.html
# (autossuficiente, com as capturas embutidas) e os WebP. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado) e o pacote axe-core (pasta da variável AXE_DIR,
# por exemplo uma pasta com "npm install axe-core@4.10.3"). Lê as telas aprovadas em /home/user/t3jus/docs/design/aprovadas/
# (variável APROV) sem mudar nada lá.
# Cópias sem mudança do D25 (portal-responsavel-legal/_fonte): clientes.py, juridico.py, ficha_ligada.py, procuracoes.py,
# contratos.py, pecas.py, peticoes_css.txt, responsavel.py e webp.py. comum.py: só o caminho das aprovadas (APROV).
# fotos.cjs: o do D25, com o axe injetado do pacote axe-core (como no F3.146), no lugar do @axe-core/playwright.
# Deste desenho: editar_gerar.py (lê responsavel.py até os estados), estados.py e galeria.py. Peças novas com o prefixo eg-.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 editar_gerar.py "$S"
node fotos.cjs "$S"
python3 galeria.py "$S"
python3 webp.py "$S"
