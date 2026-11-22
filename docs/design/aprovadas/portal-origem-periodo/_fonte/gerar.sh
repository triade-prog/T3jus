#!/bin/sh
# Refaz tudo: sh _fonte/gerar.sh <pasta> (a pasta precisa ter _fonte/ dentro)
set -e
D=${1:-.}
python3 "$D/_fonte/gerar.py" "$D"
node "$D/_fonte/fotos.cjs" "$D"
python3 "$D/_fonte/juntar.py" "$D"
node "$D/_fonte/varrer.cjs" "$D"
