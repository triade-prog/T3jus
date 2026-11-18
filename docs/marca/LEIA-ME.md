# Logo do T3jus

Logo oficial, definido pela Carol em 18/11/2026. Substitui todas as versões anteriores (fio T3, logo-v3, logo-carol e logo-tracado na pasta do projeto), que não devem ser usadas.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `originais/` | Os 5 arquivos que a Carol enviou, sem mudança: `logo-ambar-e-bordo.png` (o principal), `logo-fundo-branco.png`, `logo-vinho-sem-apoio.png`, `logo-sobre-vinho.png`, `icone-app.png` e `selo.png` (enviado depois, no mesmo dia) |
| `svg/` | O vetor contornado dos originais |
| `png/` | Exportações prontas em tamanho grande |
| `ferramentas/` | Os scripts que contornam e montam os SVGs |

## Arquivos

- `logo-completo-cor.svg`: símbolo e fios em âmbar, "T3jus" e "Sistema jurídico" em vinho. Fundo claro.
- `logo-completo-vinho.svg`: tudo em vinho. Fundo claro, uma cor.
- `logo-completo-sal.svg`: tudo em sal. Fundo vinho.
- `logo-compacto-{cor,vinho,sal}.svg`: símbolo e "T3jus", sem "Sistema jurídico", na disposição da versão `logo-vinho-sem-apoio.png`.
- `simbolo-{ambar,vinho,sal}.svg`: só a coluna em T.
- `icone-app.svg`: o símbolo em sal no quadrado arredondado com degradê vinho, como o `icone-app.png`. `icone-app-quadrado.svg` é o mesmo sem os cantos (o celular arredonda sozinho).

- `selo-cor.svg`: o selo "Gestão jurídica · T3jus · Escritório em ordem", com o disco vinho `#510118`, anéis, pontos e símbolo em ouro `#FCAE01` e letras em sal `#FAF6EC`, como no `selo.png`. Usado na tela de entrar, sobre o corte entre o lado vinho e as folhas. Feito pelo `tracar_selo.py`.

Cores do logo: âmbar `#DE6A00`, vinho `#510116`, sal `#FEFAF4` (medidas nos originais).

## Como foi feito

O desenho é o da Carol, sem redesenho. O `tracar.py` separa as partes do `logo-ambar-e-bordo.png` pela posição, amplia 4 vezes, suaviza só o serrilhado do arquivo e contorna com o potrace. O `montar.py` monta as versões. Conferência: o vetor cobre 98,8% do original (IoU), com a diferença só na borda.

Para refazer:

```
pip install --target /tmp/pylibs potracer
PYLIBS=/tmp/pylibs python3 -I docs/marca/ferramentas/tracar.py docs/marca/originais /tmp/logo
python3 -I docs/marca/ferramentas/montar.py /tmp/logo docs/marca/svg
```

O desenho usado pelo sistema fica em `sistema/packages/ui/src/logo-desenho.ts`, com os mesmos contornos.
