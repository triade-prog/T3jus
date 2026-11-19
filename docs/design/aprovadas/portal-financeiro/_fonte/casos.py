# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'financeiro.html?estado='

SECOES = [
    ('1. Resumo', 'A primeira seção da área. Do honorário contratado ao dinheiro recebido e repassado: o que venceu e por quê, o que entra, o que falta repassar. FI-04, FI-06, PD-03, PD-06, IN-02 a IN-05, IN-07, IN-09, IN-10, IN-14.', [
        ('resumo', U + 'resumo', 'Resumo (sócia dona)', 'Abertura cortada em dois campos: à esquerda, o dinheiro do escritório no mês (recebido contra previsto); à direita, no âmbar e com o escudo, os valores de terceiros que estão na conta. Abaixo: vencido por idade e cada atraso com motivo, próxima ação e responsável; previsto e realizado com os meses anteriores e o alerta de queda do êxito; o que entra em 7 dias; repasses pendentes; números do mês (contratado, por tipo, cobertura das despesas fixas, clientes que receberam).'),
        ('resumo-vazio', U + 'resumo-vazio', 'Primeiro uso', 'Escritório sem contrato: três passos, cada um com o seu botão. As parcelas nascem dos contratos; ninguém digita parcela.'),
    ]),
    ('2. A receber', 'Parcelas de todos os contratos, com forma de pagamento e cobrança. Registrar recebimento baixa a parcela e o mês a que ela se refere. FI-01 a FI-04, FI-14, FI-17, FI-18.', [
        ('receber', U + 'receber', 'Lista de parcelas', 'Quatro números que filtram (em aberto, vencidas, 7 dias, recebido no mês). Agrupada por vencimento: vencidas com motivo e próxima ação, próximos 7 dias e até o fim do mês. Cada linha: cliente e contrato, parcela e mês, forma (Pix, boleto, cartão, débito automático, dinheiro, cheque pré-datado) e a situação da cobrança.'),
        ('contrato', U + 'contrato', 'Parcelas de um contrato', 'Cabeçalho da ficha aprovada: no âmbar, o atraso e o botão de registrar. Parcelas com mês de referência, recibo e comprovante; o adiantado pelo escritório no caso (reembolso); ao lado, a cobrança (motivo, próxima ação, histórico) e o Pix copia e cola com baixa automática.'),
        ('registrar', U + 'registrar', 'Registrar recebimento', 'Valor, dia em que o dinheiro entrou, forma, multa e juros opcionais, o aviso de que baixa a parcela de outubro mesmo paga em novembro, o caixa (do escritório, por ser honorário), o comprovante anexado e o recibo pelo WhatsApp.'),
        ('registrar-erro', U + 'registrar-erro', 'Registrar · erros', 'Valor maior que o que falta na parcela e data depois de hoje. Resumo no topo e cada erro preso ao campo, com o que fazer.'),
        ('recebido', U + 'recebido', 'Recebimento registrado', 'A parcela 3/6 aparece paga em 18/11, com 24 dias de atraso, baixando outubro; recibo nº 2026-0187 e comprovante na linha. O âmbar passa para a próxima parcela e a cobrança se encerra.'),
    ]),
    ('3. A pagar', 'Contas do escritório, recorrentes lançadas sozinhas, despesa adiantada que vira reembolso por cliente e caso, e categorias simples. FI-01, FI-07, FI-13, FI-18, FI-20; FI-10 só com lugar reservado.', [
        ('pagar', U + 'pagar', 'Contas da semana', 'Cada conta com categoria, origem (recorrente todo dia 20, ou adiantada por um cliente) e a nota ou guia anexada; a que falta nota ganha o selo de atenção. Ao lado, as saídas do mês por categoria. Abaixo, o adiantado por cliente e como o dinheiro volta. A aprovação pela sócia (FI-10) tem o lugar marcado.'),
        ('nova-conta', U + 'nova-conta', 'Lançar conta', 'Descrição, valor, vencimento, categoria e como vai pagar. "Repete todo mês" e "Foi adiantada para um cliente", que pede cliente, caso e como o dinheiro volta. Guia ou nota anexada.'),
    ]),
    ('4. Repasses', 'O coração da promessa: o valor de terceiros entra separado, o sistema divide pelo contrato, a prestação de contas vai ao cliente e o caso só fecha com tudo repassado. FI-05, FI-06, FI-08, FI-12, VA-01, IN-14.', [
        ('repasses', U + 'repasses', 'Repasses pendentes', 'Um bloco por valor recebido (RPV, depósito de acordo), cada um com a faixa "De terceiros", quem recebe quanto, a situação e o atraso com motivo. Ao lado, as regras e o que já foi repassado no mês.'),
        ('registrar-rpv', U + 'registrar-rpv', 'Registrar alvará ou RPV', 'O que entrou, o caso, o valor e o alvará anexado. A divisão vem do contrato (honorários de 30%, custas adiantadas, cliente) e a conta tem de fechar em zero. A parcela em atraso da cliente não é descontada sem o aceite dela.'),
        ('prestacao', U + 'prestacao', 'Prestação de contas pelo WhatsApp', 'Prévia da mensagem ao cliente, com o valor pago, os honorários e o que fica para ele. Os números vêm do registro e não se editam ali. Envio só depois da revisão.'),
        ('repasse', U + 'repasse', 'Um repasse por dentro (RPV de Irene)', 'Para onde foi cada parte: cliente, honorários, parceiro, reembolso e perito, com situação e documento, somando o valor levantado. A prestação de contas enviada e lida. O fechamento do caso: entrou, pago e o que falta, com a lista do que está pronto.'),
        ('fechar-bloqueado', U + 'fechar-bloqueado', 'Encerrar o caso com pendência', 'A janela diz o que falta (parceiro e perito, com valores) e leva a registrar o repasse. Nada some sem motivo.'),
    ]),
    ('5. Caixa', 'Saldo do escritório e de terceiros lado a lado, nunca somados. Previsão prevista contra realizada, com RPVs e precatórios de data estimada, e exportação mensal para o contador. FI-06, FI-09, FI-21; FI-15 e FI-16 só com lugar reservado.', [
        ('caixa', U + 'caixa', 'Caixa e previsão', 'Dois saldos separados: o do escritório (vinho) e o de terceiros (âmbar, fora da previsão). Barras de setembro a fevereiro com previsto e realizado e o valor escrito ao lado; o RPV de janeiro em âmbar. Tabela mês a mês. RPVs e precatórios a caminho com data estimada.'),
        ('exportar', U + 'exportar', 'Exportar para o contador', 'Mês, o que vai (recebimentos, despesas, recibos, comprovantes), terceiros numa aba à parte, as despesas sem nota apontadas, formato e envio por e-mail ao contador.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
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
<title>Portal · Financeiro · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: Financeiro</h1>
<p>A área Financeiro: do honorário contratado ao dinheiro recebido e repassado, sem escapar nada. Resumo, A receber, A pagar, Repasses (valores de terceiros) e Caixa. Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Resumo</a><a href="#s2">A receber</a><a href="#s3">A pagar</a><a href="#s4">Repasses</a><a href="#s5">Caixa</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
