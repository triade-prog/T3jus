#!/bin/sh
# Refaz a v3 inteira: capturas do Portal (relógio parado em quarta, 18/11/2026, 10h15), imagens,
# inicio.html, capturas da página com a conferência (axe, rolagem, alvos, teclado) e o antes x depois.
# Antes: cd /home/claude/t3jus/sistema && pnpm install && pnpm --filter @t3jus/portal build && pnpm --filter @t3jus/portal start
# (Portal em http://localhost:3000; a API é simulada pelos dados dos testes, nada vai a servidor nenhum).
# Precisa: node com o playwright do sistema (Chromium em /opt/pw-browsers), python3 com Pillow.
# Uso: sh gerar.sh <captura-fireshot-do-site-no-ar.png>
set -e
cd "$(dirname "$0")"
S=..
T="${TMPDIR:-/tmp}/t3jus-site-v3"
node capturas.cjs "$T/portal"
python3 imagens.py "$T/portal" "$S/capturas"
python3 inicio_v3.py "$S"
node fotos.cjs "$S" "$T/pagina"
python3 webp.py "$S" "$T/pagina" "$1" "$S/../site-abertura-v2/site-abertura-computador.webp"
node antes-depois.cjs "$S" "$T/pagina"
python3 -c "from PIL import Image; Image.open('$T/pagina/antes-depois.png').convert('RGB').save('$S/antes-depois-abertura-computador.webp', quality=84, method=6)"
# vídeo da rolagem em 1440 (o Playwright 1.64 procura ffmpeg-1013; aqui ele aponta para o ffmpeg do sistema)
B="$T/pw"; mkdir -p "$B/ffmpeg-1013"; ln -sf "$(command -v ffmpeg)" "$B/ffmpeg-1013/ffmpeg-linux"; touch "$B/ffmpeg-1013/INSTALLATION_COMPLETE"
PLAYWRIGHT_BROWSERS_PATH="$B" node video.cjs "$S" "$T/video"
ffmpeg -y -v error -i "$T/video/rolagem-bruta.webm" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -deadline good -cpu-used 4 -an "$S/rolagem-computador.webm"
