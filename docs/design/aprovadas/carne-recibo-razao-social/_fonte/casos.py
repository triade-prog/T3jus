# Lista dos estados (capturas) e o index.html de apresentação para a Carol. Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
CN = 'carne-a4.html?estado='
RB = 'recibo-a4.html?estado='

SECOES = [
    ('antes', '1. Antes e depois', 'O alto e a assinatura do recibo, a via com o canhoto e a capa do carnê, como o T3jus gera hoje e com o timbrado aprovado. Santana Advocacia, sociedade completa.', [
        ('antes-depois', 'antes-depois.html', 'Antes e depois, lado a lado',
         'Recibo: hoje a razão social não aparece, a sede vai junto do CNPJ e o nome curto ganha um “Advocacia” repetido; a assinatura é o nome curto. '
         'Carnê: hoje a via tem o nome curto e “CNPJ · OAB”, e a capa tem só o endereço, sem CEP. Depois: a razão social entra em todos esses lugares, '
         'e a capa ganha o timbrado inteiro.'),
    ]),
    ('recibo', '2. O recibo em A4', 'A folha aprovada (portal-recibo-recorrente) muda em dois lugares: o bloco da direita do timbrado e a assinatura. A marca à esquerda, o texto, a discriminação, os dados do pagamento e o rodapé “Modelo T3jus” não mudam.', [
        ('rb-completa', RB + 'completa', 'Sociedade completa',
         'À direita, as 4 linhas aprovadas: a razão social em destaque, “CNPJ · OAB”, a sede com CEP e “telefone · e-mail · site”; por último o WhatsApp, por onde o recibo chega. '
         'A marca é o nome curto, sem o “Advocacia” pequeno, porque o nome já diz. Assina a razão social, com CNPJ e OAB.'),
        ('rb-sem-sociedade', RB + 'sem-sociedade', 'Advogada sem sociedade',
         'A 1ª linha é o nome completo da sócia dona, Carolina Soares Santana; a 2ª, “OAB/BA 63.876-S · sem CNPJ”. Assina ela, com a OAB, sem CPF.'),
        ('rb-logo', RB + 'logo', 'Com logo', 'O logo no lugar do nome em letra (caixa aprovada de 92 × 20 mm). O resto igual à sociedade completa.'),
        ('rb-razao-vazia', RB + 'razao-vazia', 'Razão social vazia',
         'Sem marca “[falta]” no papel do cliente: a 1ª linha seria o nome curto, igual à marca, e não se repete. Assina o nome curto, com o CNPJ. '
         'Sem telefone e e-mail do escritório, vai o primeiro contato, como hoje.'),
        ('rb-sem-advocacia', RB + 'sem-advocacia', 'Nome curto sem “Advocacia”',
         'Ribeiro & Matos, o escritório do recibo aprovado: o nome curto não diz “Advocacia”, então a linha pequena aparece embaixo da marca (decisão 4).'),
        ('rb-razao-longa', RB + 'razao-longa', 'Razão social de 150 letras',
         'O maior nome aceito. Acima de 90 letras, a razão social do timbrado e da assinatura fica um pouco menor; a folha continua em uma página, com 3,8 mm de folga.'),
        ('rb-razao-longa-logo', RB + 'razao-longa-logo', '150 letras e logo', 'O pior caso do recibo. Também cabe em uma página.'),
    ]),
    ('carne', '3. O carnê em A4', 'A folha aprovada (portal-carne) muda no alto da via e no campo Escritório da capa. O canhoto, o corpo da via, o Pix, o rodapé e as faixas de corte não mudam.', [
        ('cn-completa', CN + 'completa', 'Sociedade completa',
         'Na via, embaixo da marca, onde hoje está só “CNPJ · OAB”, entra a linha da identificação: razão social em negrito · CNPJ · OAB. '
         'Na capa, a marca sozinha e, no campo Escritório, o timbrado: razão social, CNPJ e OAB, a sede com CEP, telefone e e-mail. O canhoto continua com o nome curto.'),
        ('cn-uma', CN + 'uma', '1 parcela por folha', 'A via grande ganha a mesma linha, em letra maior.'),
        ('cn-sem-sociedade', CN + 'sem-sociedade', 'Advogada sem sociedade',
         'Na via: “Carolina Soares Santana · OAB/BA 63.876-S · sem CNPJ”. Na capa, o timbrado dela. Sem CPF.'),
        ('cn-logo', CN + 'logo', 'Com logo',
         'O logo no lugar do nome em letra e a linha da identificação embaixo. Na via, a caixa do logo passa de 56 × 12 mm para 56 × 10 mm, para caber a linha nova.'),
        ('cn-razao-vazia', CN + 'razao-vazia', 'Razão social vazia',
         'Sai o nome curto, sem “[falta]”, e a razão social não se repete. A linha da via fica só com o CNPJ. A capa usa o primeiro contato, como hoje.'),
        ('cn-sem-advocacia', CN + 'sem-advocacia', 'Nome curto sem “Advocacia”',
         'Ribeiro & Matos, o escritório do carnê aprovado: a marca ganha a linha pequena “ADVOCACIA” e, embaixo, a linha da identificação. '
         'Medido também com a parcela vencida, sem Pix e 1 por folha: cabe, com 3,2 mm de folga na via vencida (o carnê aprovado tinha 3,3 mm).'),
        ('cn-razao-longa', CN + 'razao-longa', 'Razão social de 150 letras',
         'Na via, a linha quebra em três, em letra um pouco menor (acima de 90 letras); na capa, o nome ocupa cinco linhas. Tudo cabe na faixa.'),
        ('cn-razao-longa-logo', CN + 'razao-longa-logo', '150 letras e logo',
         'O pior caso do carnê. O gerador conferiu 36 combinações (cada escritório com a parcela vencida, sem Pix e 1 por folha): nenhuma passa da faixa, e a menor folga é 1 mm.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, _, itens in SECOES for it in itens]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

PERGUNTAS = [
    ('O canhoto do carnê continua com o nome curto?',
     'Sim. O canhoto fica com o escritório, para o controle em papel; quem lê é a equipe, que conhece o escritório pelo nome curto. '
     'A razão social de 150 letras ocuparia seis linhas nos 47 mm do canhoto e passaria da faixa. A via e a capa, que ficam com o cliente, levam a razão social.'),
    ('O site fica só no recibo, e não no carnê?',
     'Sim, como diz a ajuda aprovada do campo Site (“Só no timbrado do recibo”). No carnê o cliente paga pelo Pix e fala pelo WhatsApp; a capa leva telefone e e-mail.'),
    ('Com a razão social vazia, o papel do cliente sai com o nome curto e sem “[falta]”?',
     'Sim. A marca de falta é para quem assina o contrato, não para o cliente. Quem gera o carnê ou o recibo pode ver um aviso de uma linha na tela, com o caminho para completar (ao programar, em F3.133).'),
    ('No recibo, o WhatsApp continua no timbrado, depois das 4 linhas?',
     'Sim, numa 5ª linha, só quando é diferente do telefone: é por onde o recibo chega e o cliente responde.'),
]

h = lambda s: html.escape(s, quote=True)
corpo = ''
for sid, titulo, sub, itens in SECOES:
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg in itens:
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" decoding="async"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a></p></div></article>')
    corpo += '</section>'
perg = ''.join(f'<li><b>{h(q)}</b><span>Recomendação: {h(r)}</span></li>' for q, r in PERGUNTAS)

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Timbrado no carnê e no recibo · T3jus</title>
<meta name="description" content="Desenho da razão social e dos contatos do escritório no carnê e no recibo (F3.133), para aprovação da Carol.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--vinho-2:#87335B;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:var(--ambar-3);max-width:92ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:44px;line-height:1.1}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
.fio{{display:block;width:56px;height:3px;background:var(--ambar);margin:14px 0 4px;border-radius:2px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:var(--vinho-2);color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} a{{color:var(--vinho)}} .abrir a{{font-weight:500}}
.perg{{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:q}}
.perg li{{counter-increment:q;display:grid;grid-template-columns:40px minmax(0,1fr);gap:4px 14px;background:var(--papel);border-radius:14px;padding:16px 20px}}
.perg li::before{{content:counter(q);grid-row:1/3;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--ambar-3);color:var(--vinho);font-family:Alegreya,Georgia,serif;font-size:20px}}
.perg b{{font-weight:500}} .perg span{{color:var(--tinta-2)}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:var(--ambar-3)}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} h1{{font-size:34px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Timbrado no carnê e no recibo</h1><span class="fio" aria-hidden="true"></span>
<p>F3.133 (PA-07). O carnê e o recibo passam a usar o timbrado que a Carol aprovou em Dados do escritório: a razão social (ou, sem sociedade, o nome da sócia dona), CNPJ e OAB, a sede com CEP e os contatos do escritório. A marca, logo ou nome curto em letra, continua no mesmo lugar. Uma mudança pequena, dentro das folhas aprovadas. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir a página naquele estado.</p>
<nav class="ir" aria-label="Ir para"><a href="#antes">Antes e depois</a><a href="#recibo">Recibo</a><a href="#carne">Carnê</a><a href="#perguntas">Perguntas</a></nav></header>
<main>{corpo}
<section id="perguntas" aria-labelledby="t-perg"><h2 id="t-perg">Perguntas para a Carol</h2><p class="sub">As decisões e o que muda para quem programar estão no NOTAS.md.</p><ol class="perg">{perg}</ol></section>
</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
