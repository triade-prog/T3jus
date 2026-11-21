# Lista dos estados (capturas) e o index.html de apresentação para a Carol.
# Uso: python3 casos_rr.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
A4 = 'recibo-a4.html?estado='
FI = 'financeiro.html?estado='
CO = 'contratos.html?estado='

SECOES = [
    ('recibo', '1. Recibo em PDF', 'FI-14 · F3.19. O número do recibo já existe (nº 2026-0187, por escritório e ano). Falta o documento: uma folha A4 no timbrado do escritório, aberta numa página própria (no produto, /recibos/:id) e baixada pela impressão do navegador, com "Salvar como PDF". O envio pelo WhatsApp continua como está; nada de envio novo.', [
        ('rb-a4-padrao', A4 + 'padrao', 'O recibo, padrão', 'A folha A4: timbrado do escritório (nome, razão social, CNPJ, registro na OAB, endereço, WhatsApp e e-mail), "Recibo nº 2026-0187", o valor em destaque, o texto "Recebemos de… a quantia de R$ 850,00 (oitocentos e cinquenta reais), referente à parcela 3 de 6… mês de referência outubro de 2026, paga por Pix em 18/11/2026", a discriminação, os dados do pagamento, cidade e data, a assinatura do escritório e quem registrou. O T3jus só no rodapé. Na tela, a barra vinho tem "Voltar ao contrato" e "Baixar PDF ou imprimir", e some na impressão.'),
        ('rb-a4-multa', A4 + 'multa', 'Com multa e juros', 'Quando quem registra preenche "Multa e juros", o recibo soma ao valor (R$ 873,80) e mostra cada parte: parcela, multa de 2% e juros de 1% ao mês por 24 dias. O valor por extenso acompanha.'),
        ('rb-a4-terceiro', A4 + 'terceiro', 'Pago por outra pessoa', 'Marta Corrêa, a esposa e contato principal, fez o Pix. O texto diz "Recebemos de Marta Corrêa… em favor de Hélio Batista Corrêa", e os dados mostram as duas pessoas.'),
        ('rb-a4-pb', A4 + 'pb', 'Preto e branco', 'Como sai numa impressora comum. Nada que informa depende de cor.'),
        ('rb-ficha', FI + 'rb-ficha', 'Onde baixar: a ficha do contrato', 'Na ficha aprovada do contrato de Hélio (Financeiro › A receber), os links "Recibo 0187", "Recibo 0131" e "Recibo 0098" da tabela de parcelas abrem o recibo em outra aba. O histórico de cobrança ganhou "ver o recibo".'),
        ('rb-confirmacao', FI + 'rb-confirmacao', 'Onde baixar: "Recebimento registrado"', 'O aviso de sucesso aprovado ganha o botão "Ver o recibo", que abre a página do recibo para baixar ou imprimir.'),
        ('rb-confirmacao-sem-envio', FI + 'rb-confirmacao-sem-envio', 'Registrado sem mandar pelo WhatsApp', 'Quando a opção do WhatsApp estava desmarcada: o aviso diz que o recibo está pronto e não foi mandado, com o mesmo "Ver o recibo".'),
        ('rb-quem-pagou', FI + 'rb-quem-pagou', '"Quem pagou" ao registrar', 'Para o recibo do pagador diferente, a janela aprovada "Registrar recebimento" ganha uma pergunta: o cliente (padrão), o contato principal (com o CPF do cadastro) ou outra pessoa ou empresa (nome e CPF ou CNPJ).'),
    ]),
    ('recorrente', '2. Mudar o valor ou encerrar uma conta que repete', 'FI-13 · F3.24. Em Financeiro › A pagar, a conta que repete todo mês nasce sozinha no dia 1º. Agora dá para mudar o valor (e o dia) a partir de um mês e encerrar a partir de um mês, com motivo. Nada se apaga e as contas pagas nunca mudam.', [
        ('rc-lista', FI + 'rc-lista', 'A pagar › Recorrentes do mês', 'O número "Recorrentes do mês" (aprovado) abre a lista das 8 contas que repetem: categoria, dia, valor, desde quando e o que aconteceu em novembro. Cada linha tem "Mudar" e "Encerrar"; o nome abre a ficha da conta.'),
        ('rc-ficha', FI + 'rc-ficha', 'Ficha da conta: Aluguel da sala', 'O cabeçalho mostra a conta e, no campo âmbar, a próxima (dezembro, nasce em 01/12), com "Mudar valor ou dia" e "Encerrar". Embaixo, as contas já lançadas mês a mês e, ao lado, as mudanças.'),
        ('rc-mudar', FI + 'rc-mudar', 'Mudar valor ou dia', 'A partir de (dezembro, a próxima, vem marcado), valor novo, dia e o motivo, que é opcional. O quadro "O que vai acontecer" diz mês a mês o que muda: as pagas não, novembro (já lançada) não, de dezembro em diante R$ 3.780,00.'),
        ('rc-mudar-erros', FI + 'rc-mudar-erros', 'Mudar: erros', 'Sem o mês e sem o valor: resumo no alto e cada erro preso ao campo, dizendo o que fazer.'),
        ('rc-mudado', FI + 'rc-mudado', 'Mudança salva', 'A próxima conta já mostra R$ 3.780,00, o histórico ganha a linha nova com o motivo, e o aviso confirma que novembro e as pagas não mudaram.'),
        ('rc-encerrar', FI + 'rc-encerrar', 'Encerrar a recorrência', 'Sistema de petições, que o escritório trocou. A partir de (dezembro), a opção de cancelar também a de novembro (desmarcada), o motivo obrigatório e um detalhe. O quadro diz o que acontece: nenhuma conta nova, novembro continua a pagar, o histórico fica.'),
        ('rc-encerrar-erro', FI + 'rc-encerrar-erro', 'Encerrar sem motivo', 'O motivo é obrigatório: sem ele, nada muda e o erro diz por quê.'),
        ('rc-encerrada', FI + 'rc-encerrada', 'Encerrada: a ficha', '"Encerrada em 18/11/2026" no cabeçalho, sem os botões. A conta de novembro aparece como "a última desta conta". O histórico mostra quem encerrou, quando e o motivo.'),
        ('rc-lista-encerrada', FI + 'rc-lista-encerrada', 'Encerrada: a lista', 'A lista fica com 7 ativas. A encerrada desce para "Encerradas", com a data, quem encerrou e o motivo.'),
    ]),
    ('pedidos', '3. Pedidos de contrato em Contratos', 'IN-01 · F3.11. Quem só tem Comercial pede o contrato na proposta aceita (aprovado). Do outro lado, quem tem Contratos vê os pedidos no alto da lista e recebe o aviso no sino. O pedido some quando o contrato é gerado.', [
        ('pc-um', CO + 'pc-um', 'Um pedido', 'Bloco discreto acima da lista, com filete âmbar: cliente (leva à proposta), número e serviço, quando foi aceita, os honorários, quem pediu e quando, e "Gerar o contrato", que abre o Novo contrato aprovado já preenchido com a proposta.'),
        ('pc-dois', CO + 'pc-dois', 'Dois pedidos', 'O mesmo bloco com Benedito Souza Lima e Daniela Rocha Mendes, do mais antigo para o mais novo.'),
        ('pc-sino', CO + 'pc-sino', 'O aviso no sino', 'No sino aprovado, o aviso "Diego Almeida pediu o contrato de Benedito Souza Lima", com o resumo da proposta e o link "Gerar o contrato". Chega a todos que têm a área Contratos.'),
        ('pc-vazio', CO + 'pc-vazio', 'Sem pedidos', 'Sem pedido, não há bloco: é a lista aprovada, sem mudança. Depois de gerar o contrato de Benedito, ele aparece na lista "Em elaboração".'),
        ('pc-pedido-feito', 'comercial.html?estado=pc-pedido-feito', 'O lado do Comercial: pedido feito', 'Na proposta aceita, depois de "Pedir o contrato", Diego vê "Contrato pedido" no lugar do botão, quem recebeu o aviso e a linha no histórico. Quando o contrato for gerado, ele recebe um aviso.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, _, itens in SECOES for it in itens]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for sid, titulo, sub, itens in SECOES:
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    if sid == 'recibo':
        corpo += ('<p class="pdf"><a class="botao" href="recibo-exemplo.pdf">Abrir o PDF de exemplo (A4, 1 página)</a>'
                  '<a class="botao sec" href="recibo-a4.html">Abrir a página do recibo</a></p>')
    for nome, url, t, leg in itens:
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" decoding="async"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 390"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a></p></div></article>')
    corpo += '</section>'

PERGUNTAS = [
    ('Quem assina o recibo?', 'O escritório: razão social, CNPJ e registro na OAB, com a linha para assinar quando for impresso, e embaixo, pequeno, quem registrou e quando. Sem imagem de assinatura escaneada.'),
    ('CPF completo no recibo?', 'Sim, completo. O recibo é a prova de pagamento do cliente e só vai para ele (o carnê, que circula mais, continua com o CPF parcial).'),
    ('A conta do mês já lançada e não paga muda junto?', 'Ao mudar o valor: só se você escolher o mês dela em "A partir de" (o padrão é o mês seguinte). Ao encerrar: ela continua a pagar; só é cancelada se você marcar a opção, e fica no histórico como cancelada.'),
    ('O pedido de contrato pode ser dispensado sem gerar contrato?', 'Não, por enquanto. Ele sai só quando o contrato é gerado ou quando a proposta deixa de estar aceita no Comercial. Assim ninguém some com um pedido sem resposta.'),
]
perg = ''.join(f'<li><b>{h(q)}</b><span>Recomendação: {h(r)}</span></li>' for q, r in PERGUNTAS)

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recibo, recorrentes e pedidos · T3jus</title>
<meta name="description" content="Desenho de três peças do Portal do T3jus para aprovação da Carol: o recibo em PDF (FI-14), mudar ou encerrar uma conta que repete (FI-13) e os pedidos de contrato em Contratos (IN-01).">
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
.pdf{{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}}
.botao{{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:8px;background:var(--vinho);color:#fff!important;text-decoration:none;font-weight:500}}
.botao.sec{{background:var(--papel);color:var(--vinho)!important;border:1px solid var(--vinho)}}
.perg{{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:q}}
.perg li{{counter-increment:q;display:grid;grid-template-columns:40px minmax(0,1fr);gap:4px 14px;background:var(--papel);border-radius:14px;padding:16px 20px}}
.perg li::before{{content:counter(q);grid-row:1/3;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--ambar-3);color:var(--vinho);font-family:Alegreya,Georgia,serif;font-size:20px}}
.perg b{{font-weight:500}} .perg span{{color:var(--tinta-2)}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:var(--ambar-3)}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} h1{{font-size:34px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Recibo, contas que repetem e pedidos de contrato</h1><span class="fio" aria-hidden="true"></span>
<p>Três peças pequenas sobre telas já aprovadas: o recibo em PDF (FI-14), mudar o valor ou encerrar uma conta que repete todo mês (FI-13) e os pedidos de contrato do Comercial na lista de Contratos (IN-01). As telas aprovadas não mudaram; só ganharam o que está aqui. Cada estado tem computador (1440) e celular (390). Clique numa imagem para abrir o HTML naquele estado. As decisões, o que o servidor precisa e as perguntas estão no NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#recibo">Recibo em PDF</a><a href="#recorrente">Contas que repetem</a><a href="#pedidos">Pedidos de contrato</a><a href="#perguntas">Perguntas</a></nav></header>
<main>{corpo}
<section id="perguntas" aria-labelledby="t-perg"><h2 id="t-perg">Perguntas para a Carol</h2><p class="sub">Cada uma com a recomendação. Se a Carol aprovar sem mudar, as recomendações valem como decisão.</p><ol class="perg">{perg}</ol></section>
</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
