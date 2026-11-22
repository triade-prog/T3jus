#!/bin/sh
# Refaz tudo: sh _fonte/gerar.sh <pasta>
set -e
D=${1:-.}
python3 "$D/_fonte/gerar.py" "$D"
python3 "$D/_fonte/gerar_tabelas.py" "$D"
node "$D/_fonte/fotos.cjs" "$D" > /dev/null
node "$D/_fonte/fotos-tabelas.cjs" "$D" > /dev/null
python3 "$D/_fonte/juntar.py" "$D"
(cd "$D" && node _fonte/varrer.cjs)
