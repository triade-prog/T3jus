#!/bin/sh
# D35 · CH-14 (documentos marcados conforme a área). Gera tudo: telas.html (as telas vivas, com o botão Estados),
# as capturas, o axe, a galeria index.html (autossuficiente, com as capturas embutidas) e os WebP.
# Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado) e o pacote axe-core (pasta da variável AXE_DIR,
# por exemplo uma pasta com "npm install axe-core@4.10.3"). Lê as telas aprovadas em /home/user/t3jus/docs/design/aprovadas/
# (variável APROV) sem mudar nada lá.
# Cópias sem mudança do _fonte do F3.160 (telas/editar-vindo-de-gerar/desenho/_fonte): clientes.py, juridico.py, ficha_ligada.py,
# procuracoes.py, contratos.py, pecas.py, peticoes_css.txt, responsavel.py, editar_gerar.py, comum.py, fotos.cjs e webp.py.
# Cópias sem mudança da aprovada portal-prazo-comprovante/_fonte: jornada.py e prazo.py (Documentos para começar, EX-18).
# Deste desenho: documentos_area.py (lê editar_gerar.py até os estados e prazo.py até o reflexo na ficha), estados.py e
# galeria.py (adaptada da do F3.160). Peças novas com o prefixo da-.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 documentos_area.py "$S"
node fotos.cjs "$S"
python3 galeria.py "$S"
python3 webp.py "$S"
