# Lista dos estados (capturas) do êxito para conferir e o index.html de apresentação para a Carol.
# Uso: python3 casos_ex.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
FI = 'financeiro.html?estado='

SECOES = [
    ('conferir', '1. Conferir o êxito', 'Quando um caso termina com ganho ou acordo, o Jurídico já calcula o êxito pelo contrato de cada cliente e manda ao Financeiro “para conferir”. Aqui é onde o Financeiro confere, antes de cobrar. Quem está usando é Diego Almeida, que cuida do Financeiro e não é dono.', [
        ('receber-conferir', FI + 'receber-conferir', 'A receber com “Êxito para conferir”', 'Bloco novo no alto do A receber, que só aparece quando há algo para conferir. Uma linha por cliente: cliente e caso, contrato e a conta (30% de R$ 28.000,00), o valor calculado, a data prevista, quem encerrou o caso e quando, e o botão “Conferir”. O êxito para conferir não entra nos quatro números do alto: ainda não é parcela. O bloco tem o próprio total, só de êxito.'),
        ('conferir', FI + 'conferir', 'Janela “Conferir o êxito”', 'De onde veio: caso, resultado, quem encerrou, valor de Joana, contrato com a cláusula 4ª e a conta. Honorário e vencimento já preenchidos e editáveis, forma e responsável pela cobrança. Uma linha explica que, se o dinheiro entrar pelo escritório (alvará ou depósito), o honorário sai na divisão de Repasses e a parcela é baixada por lá. Ações: “Lançar em A receber” e, à esquerda, “Não cobrar este êxito”.'),
        ('conferir-erro', FI + 'conferir-erro', 'Erros: valor mudado sem motivo e data que não existe', 'Diego mudou o valor para R$ 7.000,00: aparece o campo “Por que mudou o valor”, obrigatório. O vencimento 31/11/2026 não existe. Resumo no topo, cada erro preso ao campo, foco no primeiro.'),
        ('conferir-erro-valor', FI + 'conferir-erro-valor', 'Erro: valor em branco', 'Valor em branco ou zero não lança. O erro diz o que fazer e aponta “Não cobrar este êxito” para quando não vai haver cobrança.'),
        ('nao-cobrar', FI + 'nao-cobrar', 'Não cobrar este êxito', 'Pede o motivo: o dinheiro virá por alvará e será dividido em Repasses, foi perdoado ou renegociado, não é devido, ou outro. A explicação é obrigatória e fica no histórico do caso e do contrato. O caso continua “Encerrado · acerto pendente”.'),
    ]),
    ('lancado', '2. Depois de lançar', 'O êxito vira parcela de verdade em A receber e na ficha do contrato, com a origem escrita.', [
        ('conferido', FI + 'conferido', 'A receber depois de lançar', 'Aviso de sucesso. A parcela “Êxito · Pereira x Mercado Bom Preço” aparece em “Em dezembro · lançada agora”, com os selos Novo, Êxito e A vencer e a origem “Do encerramento do caso em 18/11, conferido por Diego”. O bloco do alto fica só com Carlos.'),
        ('conferido-contrato', FI + 'conferido-contrato', 'Ficha do contrato de Joana', 'A ficha aprovada do contrato, com a parcela do êxito e a origem na linha. Ao lado: de onde veio (encerramento, cálculo, conferência, com hora e pessoa) e o fechamento do caso (o êxito de Carlos ainda falta conferir).'),
    ]),
    ('reembolso', '3. Reembolso junto com a parcela', 'Despesa que o escritório adiantou no caso (FI-07) e combinou cobrar junto com a próxima parcela: as custas da apelação da Construtora Vale Alto Ltda., lançadas em A pagar no desenho aprovado.', [
        ('receber-reembolso', FI + 'receber-reembolso', 'Na lista do A receber', 'A linha da parcela 2/3 da Construtora (28/11) mostra “+ reembolso R$ 1.248,36” embaixo do valor e “Leva junto: custas da apelação” na situação. No celular, o cartão diz o mesmo.'),
        ('registrar-reembolso', FI + 'registrar-reembolso', 'Registrar recebimento com reembolso', 'A janela aprovada, no dia 28/11, sobre a ficha do contrato da Construtora. Uma faixa diz que o cliente deve pagar a parcela mais o reembolso e mostra a soma (R$ 3.648,36). A caixa “O reembolso também foi pago” vem desmarcada: o cheque é só da parcela.'),
        ('registrar-reembolso-junto', FI + 'registrar-reembolso-junto', 'Com o reembolso marcado', 'Marcada, a caixa abre o valor e a forma do reembolso e o total registrado. Os dois entram no caixa do escritório; o reembolso sai de “A reembolsar” e o recibo mostra as duas linhas.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, _, itens in SECOES for it in itens]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for sid, titulo, sub, itens in SECOES:
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg in itens:
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" decoding="async"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 390"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a></p></div></article>')
    corpo += '</section>'

PERGUNTAS = [
    ('Êxito que vai chegar por alvará: lançar em A receber ou não cobrar aqui?', 'Lançar sempre. A parcela fica visível e, quando o alvará for dividido em Repasses, o T3jus a baixa por lá. “Não cobrar” fica para perdão, renegociação ou erro. Se a Carol concordar, a opção “virá por alvará” sai da janela de não cobrar.'),
    ('O êxito para conferir entra nos números do alto do A receber?', 'Não. Até alguém conferir, é um cálculo, não uma cobrança. O bloco tem o próprio total, só de êxito; depois de lançado, entra na lista como qualquer parcela.'),
    ('Mudar o valor calculado precisa de aprovação da sócia?', 'Não; basta o motivo obrigatório, com nome e hora no histórico do caso e do contrato, e um aviso no sino de quem encerrou o caso. Aprovação pela sócia fica para quando FI-10 sair da validação.'),
    ('O reembolso vem marcado como pago quando o valor recebido cobre a soma?', 'Não marcar sozinho. A caixa vem sempre desmarcada e o T3jus só sugere (“o valor cobre a parcela e o reembolso; marcar?”). Assim, nenhum reembolso sai de “A reembolsar” sem alguém dizer.'),
]
perg = ''.join(f'<li><b>{h(q)}</b><span>Recomendação: {h(r)}</span></li>' for q, r in PERGUNTAS)

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Êxito para conferir · T3jus</title>
<meta name="description" content="Desenho de onde e como o Financeiro confere o êxito que vem do encerramento do caso, e do reembolso junto com a parcela, para aprovação da Carol.">
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Êxito para conferir</h1><span class="fio" aria-hidden="true"></span>
<p>CH-07, EX-08 e FI-07. O Jurídico já calcula o êxito quando o caso termina com ganho ou acordo e manda ao Financeiro “para conferir”. Este desenho mostra onde e como o Financeiro confere antes de cobrar, e como a parcela mostra e registra o reembolso de uma despesa adiantada. É um acréscimo ao Financeiro aprovado: as peças aprovadas não mudaram. Cada estado tem computador (1440) e celular (390). Clique numa imagem para abrir o HTML naquele estado. Regras, dados novos e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#conferir">Conferir o êxito</a><a href="#lancado">Depois de lançar</a><a href="#reembolso">Reembolso junto</a><a href="#perguntas">Perguntas</a></nav></header>
<main>{corpo}
<section id="perguntas" aria-labelledby="t-perg"><h2 id="t-perg">Perguntas para a Carol</h2><p class="sub">Cada uma com a recomendação. Se a Carol disser “pode seguir”, valem as recomendações.</p><ol class="perg">{perg}</ol></section>
</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
