#!/bin/sh
# Gera tudo: financeiro.html, index.html, casos.json, capturas PNG (escala 2), WebP para o index, axe e _conferencia.json.
# Uso: sh gerar.sh <pasta-saida>. APROV aponta para docs/design/aprovadas/ e AXE_CORE para o axe.min.js.
# exito_alvara.py é o gerador novo (prefixo ea-). exito_baixado.py, comum.py, financeiro.py, relatorios.py, dados.py,
# fotos.cjs e webp.py são cópias, sem mudança, dos aprovados em portal-exito-baixado-alvara (D38).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
export APROV="${APROV:-/home/user/t3jus/docs/design/aprovadas/}"
export AXE_CORE="${AXE_CORE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
python3 exito_alvara.py "$S"
node fotos.cjs "$S"
# WebP para o index; os PNG ficam (as imagens em escala 2)
python3 -c "import sys,glob,os;from PIL import Image;[Image.open(p).save(p[:-4]+'.webp','WEBP',quality=82,method=6) for p in glob.glob(os.path.join(sys.argv[1],'*.png'))]" "$S"
