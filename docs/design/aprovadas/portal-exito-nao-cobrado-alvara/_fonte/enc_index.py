# O index.html da F3.191 (D40): cada estado com a imagem do computador (1440) e do celular (390), a legenda e o link.
# O molde é o index aprovado de portal-exito-baixado-alvara. Uso: python3 enc_index.py <pasta-saida>
import os, sys, json, html
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = lambda s: html.escape(s, quote=True)
CASOS = {c['nome']: c for c in json.load(open(os.path.join(AQUI, 'casos.json'), encoding='utf-8'))}

SECOES = [
    ('a', 'Na janela “Registrar alvará ou RPV”',
     'Quem vê: a área Financeiro com financeiro.editar. Aqui, Diego Almeida, quarta-feira, 18/11/2026, às 10h12. O caso: Sebastião Prado, C-2026-034, “Prado x Seguradora Lince”, êxito de 20%, calculado de R$ 3.000,00. '
     'Em 10/11, Marina Ribeiro encerrou o caso e conferiu o êxito: “Não cobrar”, motivo Perdoado. Hoje entra um alvará de R$ 15.000,00.',
     [('enc-proposta', 'A divisão já vem sem a linha de honorários, e Sebastião fica com R$ 15.000,00. Abaixo da tabela, dentro do quadro “Divisão”, o aviso âmbar do eb- (quem conferiu, quando, o motivo, a explicação entre aspas) e o grupo “O que fazer com os honorários do êxito de Sebastião”, sem nada marcado. A ajuda do “Cobrar” diz quem recebe o aviso e, por ser Perdoado, lembra das parcelas novas em Contratos.'),
      ('enc-indevido', 'Com o motivo Indevido, não há grupo de rádio: o aviso diz que a divisão não tem os honorários e que eles não podem ser cobrados neste alvará. O quadro diz para falar com Marina Ribeiro e avisa que, por enquanto, o T3jus não refaz a conferência: registra-se assim, sem lançar como “Outro”.'),
      ('enc-sem', '“Deixar sem os honorários” marcado. A nota em role="status" diz que o êxito continua não cobrado e que isso fica no histórico do repasse. Nada muda na tabela.'),
      ('enc-cobrar', '“Cobrar os honorários neste alvará” marcado. A linha volta com a regra do servidor (“20% · acordo · contrato C-2026-034 · combinado com Sebastião”), R$ 3.000,00, e a ajuda do teto. Abre o quadro com “O que foi combinado com Sebastião” (vazio) e a caixa obrigatória “Sebastião concordou com a cobrança destes honorários.”. Sebastião fica com R$ 12.000,00.'),
      ('enc-erro', 'Registrar sem escolher. O resumo no topo (“Falta acertar 1 coisa. Nada foi registrado ainda.”), com o link de 44 px para o primeiro rádio, e o erro logo depois da legenda do grupo, com aria-invalid nos rádios.'),
      ('enc-erro-cobrar', 'Variação do estado 5 (o plano deixava nas notas): “Cobrar” com o combinado vazio, a caixa sem marcar e R$ 3.500,00 nos honorários. Três erros, cada um preso ao seu campo, e o resumo com três links. O foco vai ao primeiro, o valor.'),
      ('enc-conflito', 'Enquanto Diego dividia, Marina marcou o êxito como não cobrado às 10h13. A recusa EXITO_MUDOU vem no topo, em role="alert". A divisão de antes sai da janela, e “Ver a divisão refeita” fica no pé, com o foco, como no eb-conflito aprovado.')]),
    ('b', 'Na ficha do repasse',
     'Quem vê: a área Financeiro. Aqui, Marina Ribeiro, que conferiu o êxito.',
     [('enc-historico', 'Registrado com “Cobrar”. Na tabela, a linha dos honorários com a regra “combinado com Sebastião”, e o subtítulo “Com os honorários do êxito, cobrados por Diego com o combinado com Sebastião.”. No histórico, a linha com o combinado entre aspas e o que tinha sido decidido na conferência. No fechamento, o êxito cobrado. A prévia da prestação de contas mostra os honorários como desconto.'),
      ('enc-historico-sem', 'Variação: registrado com “Deixar sem”. Tudo fica com Sebastião, e o histórico diz que o êxito foi marcado como não cobrado na conferência.'),
      ('enc-resumo-fechado', 'O caso encerrado no financeiro (repasse feito, honorários transferidos e prestação lida). No fechamento, a linha “Êxito de Sebastião cobrado no alvará de 18/11 (não cobrado na conferência)”. Desenhado na ficha do repasse, e não na lateral do contrato: veja a dúvida 1.')]),
    ('c', 'No sino',
     'Avisa quem conferiu, quem encerrou e o responsável, uma vez só cada pessoa, e nunca quem cobrou. Aqui, Marina (conferiu e encerrou) e Larissa Costa (responsável, só com o Jurídico).',
     [('enc-sino', 'Marina, com o Financeiro: o título com quem cobrou e o cliente, o detalhe com o motivo, o valor, o calculado e o combinado, o selo “Cobrado no alvará” e “Abrir o repasse”.'),
      ('enc-sino-larissa', 'Larissa, sem o Financeiro: o título diz que o êxito estava como não cobrado. Sem valor, sem calculado e sem combinado, com “Abrir o caso”.')]),
    ('d', 'Nas telas do caso',
     '“Cobrado no alvará” é sempre texto. O “não cobrado” da conferência continua, porque foi o que se decidiu naquele dia.',
     [('enc-caso-historico', 'A ficha do contrato em Financeiro › A receber, de Marina. Em “De onde veio”, a linha nova: “Diego Almeida cobrou no alvará de 18/11 os honorários do êxito de Sebastião, que estava como não cobrado”, com “R$ 3.000,00 · “combinado””. O contrato só de êxito explica, no vazio das parcelas, por onde os honorários entraram.'),
      ('enc-acerto', 'A ficha do caso no Jurídico, de Marina. Em “Acerto no Financeiro”, a linha “Êxito não cobrado · cobrado no alvará”, com quem não cobrou, quem cobrou e o valor.'),
      ('enc-acerto-larissa', 'Variação: Larissa, sem o Financeiro. A mesma linha, com quem e quando, sem o valor (o servidor não manda).'),
      ('enc-ficha-cliente', 'A ficha de Sebastião, aba Casos, no âmbar “Fechar o caso”. O passo “Conferir o êxito”: “Não cobrado, por Marina em 10/11 · cobrado no alvará de 18/11, por Diego”.')]),
]
usados = [n for _, _, _, its in SECOES for n, _ in its]
assert sorted(usados) == sorted(CASOS), set(usados) ^ set(CASOS)

corpo = ''
for sid, titulo, sub, itens in SECOES:
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{H(titulo)}</h2><p class="sub">{H(sub)}</p>'
    for n, leg in itens:
        c = CASOS[n]
        url = c['url']
        figs = ''.join(f'<figure class="{"pc" if t == "computador" else "cel"}"><a href="{H(url)}"><img src="{n}-{t}.webp" alt="{H(c["rotulo"])}, {t}." loading="lazy" decoding="async"></a>'
                       f'<figcaption>{"Computador · 1440" if t == "computador" else "Celular · 390"} · <a href="{n}-{t}.png">PNG</a></figcaption></figure>' for t in ('computador', 'celular'))
        corpo += (f'<article>{figs}<div class="leg"><p class="cod">{n}</p><h3>{H(c["rotulo"])}</h3><p>{H(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{H(url)}">{H(url)}</a></p></div></article>')
    corpo += '</section>'

DUV = [
    ('1. O quadro do acerto e o resumo do caso fechado, na ficha do contrato, nunca aparecem num caso com alvará.',
     'No código de hoje, a ficha do contrato só mostra o quadro (gruposDoQuadro) e o resumo (resumoFechado) quando o caso não teve levantamento; com alvará, mostra só “O fechamento deste caso fica na ficha do repasse”. Como “Cobrar” sempre vem com um alvará, essas duas linhas novas não teriam onde aparecer. Desenhei o acerto na ficha do caso (que funciona com alvará) e o resumo do fechado na folha de fechamento da ficha do repasse. Proposta: a cobrança entra nessa folha do repasse, como já entra o êxito com baixa mantido (F3.174), e a troca em caso_acerto_quadro sai do plano ou fica só para consistência.'),
    ('2. A responsável sem a área Financeiro. Decidida na revisão.',
     'No elenco aprovado (D35, eb-conflito) Bianca tem Contratos e Financeiro. Para manter um elenco só, a responsável do exemplo passou a ser Larissa Costa, só com o Jurídico, como nas telas aprovadas do fechamento.'),
    ('3. “Fica na prestação de contas do repasse”, na ajuda do combinado.',
     'A prestação de contas que vai ao cliente usa o nome de cada parte (“Honorários de êxito − R$ 3.000,00”), e não a regra nem o combinado. O cliente vê o desconto, mas não o texto do combinado. Na revisão, a ajuda virou “Fica na ficha do repasse e na ficha do contrato. O cliente vê os honorários na prestação de contas.”.'),
    ('4. “são avisadas” virou “recebem um aviso”.',
     'Com nomes de pessoas de gêneros diferentes, “são avisadas” erra. “recebem um aviso” serve para qualquer lista.'),
]
duv = ''.join(f'<li><b>{H(q)}</b><span>{H(r)}</span></li>' for q, r in DUV)

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Êxito não cobrado no alvará · T3jus</title>
<meta name="description" content="Desenho do êxito marcado como não cobrado na divisão do alvará (F3.191, D40), para aprovação da Carol.">
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
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} figcaption a{{display:inline-flex;align-items:center;min-height:24px}}
.leg p{{margin:6px 0 0}} .cod{{font-size:12px;letter-spacing:.1em;color:var(--tinta-2);font-family:ui-monospace,monospace}} .abrir{{font-size:12px;overflow-wrap:anywhere}} a{{color:var(--vinho)}} .abrir a{{font-weight:500}}
.perg{{list-style:none;margin:0;padding:0;display:grid;gap:10px}}
.perg li{{display:grid;gap:4px;background:var(--papel);border-radius:14px;padding:16px 20px}} .perg b{{font-weight:500}} .perg span{{color:var(--tinta-2)}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:var(--ambar-3)}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} h1{{font-size:34px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Êxito não cobrado na divisão do alvará</h1><span class="fio" aria-hidden="true"></span>
<p>F3.191 (D40, CH-07 e FI-05), pelo plano v5, Parte C, com a decisão C1 = a: a divisão vem sem os honorários, e a janela oferece “Deixar sem” ou “Cobrar neste alvará”, com o combinado escrito e a confirmação de que o cliente concordou. Indevido não se cobra, e o valor nunca passa do êxito calculado. Partem das telas de hoje e dos desenhos aprovados do eb- (F3.174), do fechamento e do sino. Cada estado tem computador (1440) e celular (390); clique numa imagem para abrir o HTML naquele estado. Textos, acessibilidade e o que ficou só nas notas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#a">Janela de registrar</a><a href="#b">Ficha do repasse</a><a href="#c">Sino</a><a href="#d">Telas do caso</a><a href="#duvidas">Dúvidas</a></nav></header>
<main>{corpo}
<section id="duvidas" aria-labelledby="t-duv"><h2 id="t-duv">Dúvidas para a Carol</h2><p class="sub">As outras, menores, estão em NOTAS.md.</p><ul class="perg">{duv}</ul></section>
</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print('index ok', len(CASOS), 'estados')
