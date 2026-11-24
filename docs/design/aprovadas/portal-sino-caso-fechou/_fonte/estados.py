# A lista de estados do F3.150 e a navegação "Estados", comum às duas páginas:
# index.html (o sino, estados sf-*) e fechamento.html (as duas frases da pergunta 5, telas aprovadas do F3.132).
# Uso direto: python3 estados.py grava o casos.json que o fotos.cjs lê.
import os, json

AQUI = os.path.dirname(os.path.abspath(__file__))

# (estado, página, rótulo)
ESTADOS = [
    ('sf-contrato', 'index.html', 'Felipe: falta encerrar o contrato'),
    ('sf-varios', 'index.html', 'Felipe: dois contratos e três contratos'),
    ('sf-socia', 'index.html', 'Marina: o aviso novo e o de “pronto”'),
    ('sf-responsavel', 'index.html', 'Larissa: o fechamento terminou'),
    ('sf-responsavel-falta', 'index.html', 'Larissa: o contrato ficou aberto'),
    ('sf-segue', 'index.html', 'Larissa: o contrato segue com outro caso (pergunta 4)'),
    ('sf-agora-parcial', 'index.html', 'Felipe: encerrou um, falta o outro'),
    ('sf-agora-encerrado', 'index.html', 'Felipe: encerrou o contrato'),
    ('sf-agora-terminou', 'index.html', 'Larissa: o contrato foi encerrado depois'),
    ('sf-lido', 'index.html', 'Felipe: o aviso já lido'),
    ('fecha-larissa', 'fechamento.html', 'Ficha de Noemi: a frase do aviso (pergunta 5)'),
    ('encerrar-sem-contratos', 'fechamento.html', 'Janela do Diego: a frase do aviso (pergunta 5)'),
]

GRUPOS = [
    ('1. O aviso chega', ['sf-contrato', 'sf-varios', 'sf-socia', 'sf-responsavel', 'sf-responsavel-falta', 'sf-segue']),
    ('2. Depois do aviso', ['sf-agora-parcial', 'sf-agora-encerrado', 'sf-agora-terminou', 'sf-lido']),
    ('3. Se a Carol disser sim à pergunta 5', ['fecha-larissa', 'encerrar-sem-contratos']),
]
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(e for e, _, _ in ESTADOS)
PAG = {e: p for e, p, _ in ESTADOS}
ROT = {e: r for e, _, r in ESTADOS}


def nav(pagina, ico):
    """O botão "Estados" das telas aprovadas. Os estados da própria página ficam como ?estado=… (o script marca o atual);
    os da outra página levam o nome do arquivo."""
    def href(e):
        return f'?estado={e}' if PAG[e] == pagina else f'{PAG[e]}?estado={e}'
    lista = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="{href(e)}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
    return (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
            f'<nav class="fl-lista" aria-label="Estados desenhados">{lista}</nav></details>')


# Quem abre o index.html com ?estado= de um estado do fechamento vai para a página dele.
REDIRECIONA = ('<script>(function(){var e=new URLSearchParams(location.search).get("estado");var m='
               + json.dumps({e: p for e, p in PAG.items() if p != 'index.html'})
               + ';if(e&&m[e])location.replace(m[e]+location.search)})();</script>')

if __name__ == '__main__':
    json.dump([{'nome': e, 'url': f'{p}?estado={e}', 'rotulo': r} for e, p, r in ESTADOS],
              open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
    print('casos.json ok', len(ESTADOS), 'estados')
