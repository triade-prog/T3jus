# Logo do T3jus

Logo oficial, definido pela Carol em 18/11/2026. Substitui todas as versões anteriores (fio T3, logo-v3, logo-carol e logo-tracado na pasta do projeto), que não devem ser usadas.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `originais/` | Os 5 arquivos que a Carol enviou, sem mudança: `logo-ambar-e-bordo.png` (o principal), `logo-fundo-branco.png`, `logo-vinho-sem-apoio.png`, `logo-sobre-vinho.png`, `icone-app.png` e `selo.png` (enviado depois, no mesmo dia) |
| `svg-original/` | O vetor contornado dos originais, nas cores dos arquivos dela |
| `svg/` | **As versões em uso**: o mesmo vetor nas cores do Gabinete (aprovadas pela Carol em 18/11/2026, opção A) |
| `png/` | Exportações prontas em tamanho grande |
| `ferramentas/` | Os scripts que contornam e montam os SVGs |

## Arquivos em uso (`svg/`, cores do Gabinete)

- `logo-completo-cor.svg`: coluna, fio e linha em âmbar `#DD9760`, "T3jus" e "Sistema jurídico" em vinho `#692746`. Fundo claro (sal ou branco).
- `logo-completo-sobre-vinho.svg`: coluna e fios em âmbar, letras em sal `#F1E6DF`. Sobre o vinho `#692746` (lateral do Console e do Portal, tela de entrar).
- `logo-completo-vinho.svg` e `logo-completo-sal.svg`: uma cor. Use o vinho no claro quando a coluna tiver menos de 32 px de altura ou na impressão (o âmbar no claro fica suave, 2:1).
- `logo-compacto-*.svg`: símbolo e "T3jus", sem "Sistema jurídico", nas mesmas quatro versões.
- `simbolo-{ambar,vinho,sal}.svg`: só a coluna em T (âmbar só sobre o vinho).
- `icone-app.svg`: coluna em sal no quadrado arredondado com degradê `#87335B` → `#692746` → `#4F1D35`. `icone-app-quadrado.svg` é o mesmo sem os cantos (o celular arredonda sozinho).
- `selo-cor.svg`: o selo "Gestão jurídica · T3jus · Escritório em ordem", com disco `#4F1D35` (separa-se do lado vinho da tela de entrar), anéis, pontos e coluna em âmbar e letras em sal.

`svg-original/` guarda as mesmas peças nas cores dos arquivos da Carol (âmbar `#DE6A00`, vinho `#510116`, selo com ouro `#FCAE01`), só como registro.

## Como foi feito

O desenho é o da Carol, sem redesenho. O `tracar.py` separa as partes do `logo-ambar-e-bordo.png` pela posição, amplia 4 vezes, suaviza só o serrilhado do arquivo e contorna com o potrace. O `montar.py` monta as versões nas cores originais e o `recolorir.py` troca só as cores para as do Gabinete, conferindo que os contornos ficaram idênticos. Conferência: o vetor cobre 98,8% do original (IoU), com a diferença só na borda.

Para refazer:

```
pip install --target /tmp/pylibs potracer
PYLIBS=/tmp/pylibs python3 -I docs/marca/ferramentas/tracar.py docs/marca/originais /tmp/logo
python3 -I docs/marca/ferramentas/montar.py /tmp/logo docs/marca/svg-original
PYLIBS=/tmp/pylibs python3 -I docs/marca/ferramentas/tracar_selo.py docs/marca/originais docs/marca/svg-original
python3 -I docs/marca/ferramentas/recolorir.py docs/marca/svg-original docs/marca/svg
```

O desenho usado pelo sistema fica em `sistema/packages/ui/src/logo-desenho.ts`, com os mesmos contornos.
