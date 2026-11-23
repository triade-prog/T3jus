#!/bin/sh
# Gera tudo: prazo.html (os estados), capturas, axe, WebP, index.html e publicar.html. Uso: sh gerar.sh <pasta-saida>
# comum.py, clientes.py, juridico.py, ficha_ligada.py e jornada.py são cópias sem mudança das aprovadas
# (portal-jornada-fechamento). prazo.py lê jornada.py até a montagem da página e troca, ao carregar, o caminho das
# telas aprovadas que comum.py lê (APROV; padrão /home/user/t3jus/docs/design/aprovadas/).
# fotos.cjs é o da jornada, com o celular em 412. O axe vem de @axe-core/playwright; aponte AXE_PW para ele se
# não estiver no caminho do node (e NODE_PATH para o playwright).
set -e
cd "$(dirname "$0")"
S="${1:-..}"
python3 prazo.py "$S"
node fotos.cjs "$S"
python3 webp.py "$S"
python3 casos.py "$S" --publicar
