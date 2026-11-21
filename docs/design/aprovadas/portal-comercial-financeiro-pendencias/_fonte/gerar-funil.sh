#!/bin/sh
# Gera as três opções do bloco "Quanto vira contrato" (funil-opcoes.html), as capturas, o axe e a página para publicar.
# Uso: sh gerar-funil.sh <pasta-saida>. As capturas usam funil/casos.json (o fotos.cjs lê o casos.json da própria pasta).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
R="$(mktemp -d)"
python3 funil_opcoes.py "$S" "$R"
node funil/fotos.cjs "$S"
mv "$S/_conferencia.json" "$S/_conferencia-funil.json"
python3 webp.py "$S"
python3 funil_publicar.py "$S"
