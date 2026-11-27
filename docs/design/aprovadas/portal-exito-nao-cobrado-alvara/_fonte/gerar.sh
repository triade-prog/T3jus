#!/bin/sh
# Gera tudo: financeiro.html, sino.html, caso.html, casos.json, index.html, capturas PNG (escala 2), WebP, axe e _conferencia.json.
# Uso: sh gerar.sh <pasta-saida>. APROV aponta para docs/design/aprovadas/ e AXE_CORE para o axe.min.js.
# Bases, sem mudança: exito_baixado.py, comum.py, financeiro.py, relatorios.py e dados.py (portal-exito-baixado-alvara);
# fechamento.py, jornada.py, ficha_ligada.py, clientes.py e juridico.py (portal-fechamento-sem-levantamento);
# sino_caso.py, sino.py, base.py e extra.py (portal-sino-caso-encerrado); fotos.cjs (portal-exito-baixado-alvara, escala 2).
# Novos: enc_repasses.py, enc_sino.py, enc_caso.py, casos_enc.py e enc_index.py.
set -e
cd "$(dirname "$0")"
S="${1:-..}"
export APROV="${APROV:-/home/user/t3jus/docs/design/aprovadas/}"
export AXE_CORE="${AXE_CORE:-/tmp/claude-0/axe/node_modules/axe-core/axe.min.js}"
python3 enc_repasses.py "$S"
python3 enc_sino.py "$S"
python3 enc_caso.py "$S"
python3 casos_enc.py
python3 enc_index.py "$S"
node fotos.cjs "$S"
python3 -c "import sys,glob,os;from PIL import Image;[Image.open(p).save(p[:-4]+'.webp','WEBP',quality=82,method=6) for p in glob.glob(os.path.join(sys.argv[1],'*.png'))]" "$S"
