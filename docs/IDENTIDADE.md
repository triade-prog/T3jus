# Identidade visual do T3jus

Escolhida pela Carol em 17/11/2026 (DC10, D1 no painel). A referência que ela trouxe é o manual de marca de um escritório de advocacia, com vinho, âmbar e areia, ícones de traço e títulos em serifa. Do manual vêm a **paleta, a tipografia, o estilo dos ícones e a personalidade**. O monograma, as estátuas e as peças daquele escritório não entram: o logo do T3jus é próprio e ainda está em aberto (E3).

## Personalidade

Elegante, sábia, madura, sóbria, séria, determinada, discreta, formal, acessível, confiável, tradicional, estável, moderna, técnica, atual e responsável.

Na tela, isso quer dizer pouca cor, muito espaço, títulos em serifa e nenhum enfeite que não informe. O texto é direto e educado, como um bom advogado escreveria.

## Cores

| Nome | Cor | Uso |
|---|---|---|
| Vinho (Purple Potion, PANTONE 19-2430 TCX) | `#692746` | Ação e destaque: botões, links, item atual do menu, títulos fortes |
| Vinho, tons | `#87335B`, `#AC3F6B`, `#AC788D` | Hover, pressionado, gráficos |
| Âmbar (Apricot Tan, PANTONE 15-1237 TCX) | `#DD9760` | Só decoração: marca, ícones, filetes, selos |
| Âmbar, tons | `#E9AE90`, `#F2CDB3` | Fundo de selos e avisos, com texto escuro (`#6B3A14`) |
| Areia (Sea Salt, PANTONE 11-1302 TCX) | `#F1E6DF`, `#F2ECE8` | Lateral, áreas de apoio, fundo das telas de entrada |
| Tinta | `#2A1A22`, suave `#5E4A54` | Texto |

Regras de contraste (WCAG 2.2 AA), conferidas:

- Branco sobre vinho: 10,6:1. É o par dos botões.
- Vinho sobre areia: 8,7:1. Tinta suave sobre areia: 6,6:1.
- **Âmbar nunca leva texto branco (2,4:1) e nunca vira texto sobre fundo claro (2,0:1 na areia).**
- Âmbar sobre vinho: 4,4:1. Serve para a marca e ícones, não para texto pequeno.
- No modo escuro, a ação passa para o âmbar claro `#E9AE90` sobre o fundo `#1E1418` (9,4:1), com texto escuro nos botões.

Os tokens ficam em `sistema/packages/ui/src/tema.css`.

## Tipografia

- **Títulos:** serifa clássica, Libre Caslon Text (Google Fonts). Se não carregar, cai em Georgia.
- **Texto e interface:** Poppins, em 14 px no corpo, com pesos 400, 500 e 600.
- As fontes vão ser servidas pelo próprio app (sem chamada ao Google em produção). Isso entra com o design system (D2).

## Ícones

Ícones de traço, com espessura uniforme, cantos retos e sem preenchimento: maleta, pena, balança, coluna, envelope, martelo, espada, escudo, pessoa e celular. Na interface, os ícones seguem o mesmo traço, em tinta ou vinho. O âmbar fica para os ícones grandes e decorativos.

## O que ainda falta

- Logo do T3jus (E3).
- Design system completo, com componentes, estados e versão de celular (D2).
