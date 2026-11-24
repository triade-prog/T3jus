#!/bin/sh
# F3.146 · Gera tudo: logos fictícios, marca.html (D1), carne.html (D2), recibo.html (D3), docx.html (D4), a cópia sem mudança
# de escritorio-dados-documentos/escritorio.html (para onde a linha de aviso leva), as miniaturas do carnê, a medida do
# cabeçalho do .docx, o index.html, as capturas WebP e o axe. Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado) e o pacote axe-core (pasta da variável AXE_DIR).
# Lê as telas aprovadas em /home/user/t3jus/docs/design/aprovadas/ (variável APROV) e o portal.css da origin/main
# em /home/user/t3jus/sistema (variável REPO), sem mudar nada lá.
# Cópias sem mudança: rs_dados.py, comum.py e webp.py (carne-recibo-razao-social). Cópias com acréscimo marcado no
# alto do arquivo: logos.py e logos.cjs (o logo quadrado) e fotos.cjs (de escritorio-dados-documentos: rola a janela
# até a linha de aviso). O resto é deste desenho: rz_dados.py, css_real.py, paginas.py, marca.py, janelas.py,
# docx_a4.py, medir.cjs, miniaturas.cjs, logos_cortar.py e casos.py (peças novas com prefixo rz- e dx-).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
APROV="${APROV:-/home/user/t3jus/docs/design/aprovadas/}"
export APROV
python3 logos.py
node logos.cjs
python3 logos_cortar.py
cp "$APROV/escritorio-dados-documentos/escritorio.html" "$S/escritorio.html"
node miniaturas.cjs "$S"
python3 marca.py "$S"
python3 janelas.py "$S"
python3 docx_a4.py "$S"
node medir.cjs "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
