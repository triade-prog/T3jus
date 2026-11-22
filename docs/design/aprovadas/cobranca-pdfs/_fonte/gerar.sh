#!/bin/sh
# Refaz tudo: fatura-a4.html, recibo-a4.html, carne-a4.html, as três telas aprovadas com os botões ligados,
# index.html, os três PDFs de exemplo, as miniaturas, as capturas (WebP), a leitura dos QR e o axe.
# Uso: sh gerar.sh <pasta-saida>
# Precisa: python3 com Pillow, node com playwright (Chromium já instalado), pdfinfo, pdftotext e pdftoppm (poppler),
# e as telas aprovadas em /home/claude/t3jus/docs/design/aprovadas/ (console-cobranca e o logo em docs/marca).
# O comum.py (cópia sem mudança do carnê aprovado) lê as fontes de /home/claude/t3just/docs/design/aprovadas/.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
# segno (QR Code) e axe-core, jsQR e pngjs numa pasta temporária, se ainda não houver
PYLIBS="${PYLIBS:-/tmp/t3jus-cobpdf-py}"
python3 -c "import segno" 2>/dev/null || [ -d "$PYLIBS/segno" ] || pip install --quiet --target "$PYLIBS" segno
AXE_DIR="${AXE_DIR:-/tmp/t3jus-cobpdf-node/node_modules}"
if [ ! -d "$AXE_DIR/jsqr" ]; then
  mkdir -p /tmp/t3jus-cobpdf-node && (cd /tmp/t3jus-cobpdf-node && npm init -y >/dev/null && npm i --silent @axe-core/playwright@4.10.2 axe-core@4.10.3 jsqr@1.4.0 pngjs@7.0.0)
  AXE_DIR=/tmp/t3jus-cobpdf-node/node_modules
fi
export PYLIBS AXE_DIR
python3 fatura_a4.py "$S"
python3 recibo_a4.py "$S"
python3 carne_a4.py "$S"
python3 ligar.py "$S"
python3 casos_cp.py "$S"
node fotos.cjs "$S" --pdf
python3 webp.py "$S"
node fotos.cjs "$S" --capturas
python3 webp.py "$S"
# o índice de novo, agora com o tamanho das imagens, e a conferência dele
python3 casos_cp.py "$S"
node fotos.cjs "$S" index
