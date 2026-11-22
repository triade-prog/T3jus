#!/bin/sh
# Gera tudo: HTML, index, capturas, axe, WebP e a página de publicar. Uso: sh gerar.sh <pasta-saida>
# Precisa de python3 (com Pillow), node com playwright no NODE_PATH e o pacote axe-core
# (instalado ao lado, npm i axe-core, ou na pasta da variável AXE_DIR).
# A base vem sem mudança das telas aprovadas: comum.py (só a linha APROV), pecas.py, contratos.py e oab.py
# (Equipe · OAB) e procuracoes.py e peticoes_css.txt (Procurações e modelos). O acréscimo está em
# elenco.py, conta_dados.py e doc_falta.py (prefixo cd-).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 conta_dados.py "$S"
python3 doc_falta.py "$S"
python3 casos.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
python3 publicar.py "$S"
