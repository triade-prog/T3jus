# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda, para os gatilhos novos (PA-06).
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
G = 'gatilhos.html?estado='

SECOES = [
    ('1. Escolher o gatilho', 'O botão “Nova automação” da lista aprovada abre esta janela. Os dois gatilhos novos entram com o selo “Novo”, agrupados pela área. PA-06.', [
        ('gn-escolher', G + 'escolher', 'Nova automação: escolher o gatilho', 'Nome e “Quando começa”, agrupado por área: Clientes (Cliente novo, que todos veem), Jurídico (Documento pendente, Etapa do caso, Lembrete de audiência) e Financeiro (os quatro de antes). Só aparecem os das áreas que a pessoa tem. No pé, o atalho para pedir à IA, que também usa os dois novos.'),
    ]),
    ('2. Cliente novo: boas-vindas', 'Quando alguém vira cliente do escritório. Recomendado: na primeira proposta aceita ou no primeiro contrato assinado; importados da planilha e reativados nunca recebem.', [
        ('gn-cliente-gatilho', G + 'cliente-gatilho', 'Bloco do gatilho aberto', 'Rascunho recém-criado (gatilho, mensagem para escrever, fim). O painel diz quando conta como cliente novo (recomendado: proposta aceita ou contrato assinado), quando sai (no mesmo dia ou 1 a 30 dias depois), quem nunca recebe (regra fixa), os campos do gatilho e os caminhos possíveis (sem “Se pagou”).'),
        ('gn-cliente-sugestao', G + 'cliente-sugestao', 'Boas-vindas sugerida pela IA', 'A partir do exemplo “Boas-vindas ao cliente novo”: gatilho e condições salvos, quatro passos tracejados. Os ramos são dois: “Se respondeu” (a IA conversa) e “Não respondeu” (fim, nada mais sai). O assistente avisa que os 38 importados da planilha não recebem.'),
        ('gn-cliente-testar', G + 'cliente-testar', 'Testar e quem teria entrado', 'Simulação com Paulo Saraiva, que aceitou a proposta em 16/11. “Quem teria entrado” olha os últimos 30 dias: 3 entrariam; ficam de fora os 38 da planilha, o reativado, quem só fez o primeiro atendimento (“Ainda não”) e o número fixo, com “Corrigir na ficha”.'),
        ('gn-cliente-ligar', G + 'cliente-ligar', 'Revisar e ligar', 'A frase em linguagem simples. Quem entra não tem escolha: só quem virar cliente daqui em diante, uma vez por cliente. Os limites de sempre, mais “uma boas-vindas por cliente, para sempre”.'),
    ]),
    ('3. Documento pendente: lembrete do que falta', 'Quando um documento pedido na ficha do caso não chega em alguns dias (1 a 30, padrão 5). Chegou, sai da automação, como a parcela paga. Uma mensagem por cliente, com tudo o que falta, no máximo 1 por semana.', [
        ('gn-doc-gatilho', G + 'doc-gatilho', 'Bloco do gatilho aberto', 'Dias depois do pedido (ou do último “Pedir de novo”), as regras fixas (junta tudo do cliente, 1 por semana, chegou sai, caso encerrado sai, o pedido “só cobrança” não tira), os campos ({nome}, {documentos}, {caso}, {pedido em}, {nome do escritório}) e os três caminhos.'),
        ('gn-doc-mensagem', G + 'doc-mensagem', 'Fluxo com ramos e a mensagem aberta', 'Sete passos aplicados. Ramos: “Se chegou” (fim, sai da automação), “Se respondeu” (a IA agradece; arquivo vai para quem pediu conferir) e “Nem chegou, nem respondeu” (passa para quem pediu o documento). A prévia mostra Antônia com dois documentos numa mensagem só, para a filha.'),
        ('gn-doc-testar', G + 'doc-testar', 'Testar e quem entraria', 'Simulação com a CTPS de Carlos: lembrete hoje, passa para Larissa em 25/11. “Quem entraria”: 3 já pendentes hoje (com “Já chegou? Marcar no caso”), a Vale Alto entra amanhã, e Roberto espera porque pediram de novo ontem.'),
        ('gn-doc-ligar', G + 'doc-ligar', 'Revisar e ligar', 'Quem entra: só os pedidos que chegarem a 5 dias daqui em diante (recomendado) ou também os 3 já pendentes. Limite novo: no máximo 1 lembrete de documento por semana por cliente, somando o “Pedir de novo”.'),
    ]),
    ('4. Erro e o pedido no Jurídico', 'O erro que mais deve aparecer com os dois gatilhos juntos, e a linha discreta na ficha do caso.', [
        ('gn-erros', G + 'erros', 'Campo que o gatilho não tem', 'A boas-vindas com {documentos}: o bloco ganha filete e a frase com os campos que Cliente novo tem. Testar e Ligar ficam travados. O assistente oferece corrigir ou criar o lembrete de documento.'),
        ('gn-juridico', 'juridico-lembrete.html?estado=ficha', 'Ficha do caso: o lembrete no pedido', 'Na folha Documentos da ficha aprovada, cada “Falta” ganha uma linha: quando saiu o lembrete automático e quando passa para Larissa. A nota do pé diz que “Pedir de novo” recomeça a contagem. Nada mais muda na ficha.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, itens in SECOES for it in itens]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

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
<title>Gatilhos novos · Automações · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:90ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
.legenda{{display:flex;flex-wrap:wrap;gap:18px;margin-top:14px;color:#fff;font-size:13px}} .legenda span{{display:inline-flex;align-items:center;gap:8px}}
.legenda i{{display:inline-block;width:28px;height:18px;border-radius:4px;background:#fff;border:2px solid #AC788D}} .legenda i.t{{border:2px dashed #87335B;background:#FFFCFA}} .legenda i.e{{border-color:#AC3F6B;box-shadow:inset 4px 0 0 #AC3F6B}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Automações: gatilhos Cliente novo e Documento pendente</h1>
<p>Acréscimo pequeno ao desenho aprovado de Conversas › Automações (PA-06, sobre PA-03): dois gatilhos novos, um para a boas-vindas e outro para lembrar o documento que falta. O resto do editor (passos, tracejado da IA, testar, ligar, histórico) é o aprovado, sem mudança. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões e perguntas estão no NOTAS.md.</p>
<p class="legenda" aria-label="Legenda do desenho"><span><i aria-hidden="true"></i>Contorno contínuo: passo salvo</span><span><i class="t" aria-hidden="true"></i>Tracejado: sugerido pela IA, ainda não salvo</span><span><i class="e" aria-hidden="true"></i>Filete: passo que precisa de ajuste</span></p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Escolher o gatilho</a><a href="#s2">Cliente novo</a><a href="#s3">Documento pendente</a><a href="#s4">Erro e Jurídico</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
