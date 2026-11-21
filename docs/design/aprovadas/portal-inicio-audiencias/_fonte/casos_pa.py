# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Mesmo formato do casos_ia.py aprovado (Início por áreas). Uso: python3 casos_pa.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'inicio.html?estado='

SECOES = [
    ('1. Sócia dona', 'Marina Ribeiro, com as 4 áreas. O Início por áreas aprovado, com duas mudanças: o trecho “Próximas audiências” na folha Agenda de hoje (EX-06) e dois itens novos no bloco Jurídico, no padrão de item aprovado (prazo em 2 dias e petição para revisar, EX-09).', [
        ('dona', U + 'dona', 'Os meus (o principal)',
         'À direita, na mesma folha da Agenda de hoje, logo abaixo da lista do dia: “Próximas audiências”, da equipe toda, de amanhã até 25/11, no máximo 3, as mais próximas primeiro. Cada uma tem o dia e a hora, o tipo (com “amanhã” quando é amanhã), o título, a modalidade com o local e quem vai, e leva ao compromisso na Agenda. O pé diz se há mais e qual é a seguinte. No Jurídico, “Revisar” a contestação que Felipe mandou (Para hoje) e “Preparar” a impugnação ao laudo, com o lembrete de 2 dias (A acompanhar). Com 6 itens, o bloco mostra 5 e o pé diz qual ficou de fora.'),
        ('dona-equipe', U + 'dona-equipe', 'Da equipe',
         'As próximas audiências não mudam: já são da equipe toda, como a Agenda de hoje. No Jurídico, o pé passa a contar a petição para revisar e o prazo em 2 dias entre os que não couberam.'),
    ]),
    ('2. Outras pessoas', 'As próximas audiências fazem parte da agenda comum: todos veem, como a Agenda de hoje (PA-01).', [
        ('larissa', U + 'larissa', 'Larissa Costa: só Jurídico',
         'O bloco Jurídico aprovado, sem mudança (os itens novos são de Marina), e as mesmas próximas audiências. A conciliação de quinta, às 16h, é dela.'),
        ('paula', U + 'paula', 'Paula Nunes: nenhuma área',
         'A agenda e as conversas, lado a lado, como no aprovado. Ela vê as próximas audiências porque são compromissos da agenda comum; o link leva ao compromisso na Agenda, nunca ao caso.'),
    ]),
    ('3. Estado', 'Quando não há audiência nos próximos 7 dias.', [
        ('vazio-audiencias', U + 'vazio-audiencias', 'Nenhuma audiência nos próximos 7 dias',
         'O trecho fica, com o título e uma linha: “Nenhuma audiência nos próximos 7 dias.” e qual é a próxima depois disso, com o link para a Agenda do mês. Ele não some, para a folha não mudar de forma de um dia para o outro.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_pa.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for n, (titulo, sub, itens) in enumerate(SECOES, 1):
    corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg in itens:
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portal · Início: próximas audiências · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:90ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
header a{{color:#fff}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: Início, próximas audiências</h1>
<p>Um acréscimo pequeno no Início por áreas aprovado (19/11/2026): as próximas audiências da equipe, dentro da folha Agenda de hoje (EX-06: “as próximas aparecem na tela inicial”), e dois itens novos no bloco Jurídico, no padrão de item aprovado: o prazo em 2 dias (lembrete) e a petição esperando a sua revisão (EX-09). O resto da tela é o aprovado, sem mudança. Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. As decisões e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Sócia dona</a><a href="#s2">Outras pessoas</a><a href="#s3">Sem audiência</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
