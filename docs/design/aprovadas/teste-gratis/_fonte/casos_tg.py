# Lista dos estados (capturas) e o index.html com as capturas e a legenda. Uso: python3 casos_tg.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
F = 'ficha.html?aba=assinatura&estado='
I = 'inicio.html?estado='
P = 'portal-escritorio.html?estado='

SECOES = [
    ('1. Console · ficha, aba Assinatura: o quadro do teste',
     'ficha.html?aba=assinatura. Relógio fixo: quarta-feira, 02/12/2026, 9h40 (Bahia). O quadro do teste fica no alto da aba, acima da assinatura aprovada. '
     'Um quadradinho por dia, com o número e a data (nada só pela cor). O selo do teste aparece também na abertura da ficha, em todas as abas.', [
        ('assinatura-previsto', F + 'tg-previsto', 'Previsto, antes do primeiro acesso (Cedro & Lima)', 'Renata Lima foi convidada e ainda não entrou. Os 7 dias ainda sem data: o dia 1 é o do primeiro acesso, a qualquer hora. “Se ela entrar hoje, vai até terça, 08/12.” Só a Administração vê “Dispensar o teste”.'),
        ('assinatura-em-teste', F + 'tg-em-teste', 'Em teste, dia 6 de 7 (Ribeiro & Matos)', 'Primeiro acesso em 27/11 às 23h40; último dia quinta, 03/12; só consulta a partir de 04/12 à 0h. Os 4 avisos à sócia dona, enviados e previstos. Confirmar a assinatura, Prorrogar e Dispensar. Embaixo, a assinatura preparada (valores de exemplo) com a primeira fatura em janeiro de 2027.'),
        ('assinatura-quer-assinar', F + 'tg-quer-assinar', 'Quer assinar', 'Marina apertou “Quero assinar” no Portal em 01/12, 16h20. Faixa no alto do quadro com “Confirmar a assinatura”; selo “Quer assinar” na abertura.'),
        ('assinatura-confirmar', F + 'tg-confirmar', 'Confirmar a assinatura (janela)', 'O resumo (plano, fim do teste, a cobrança começa em 04/12, primeira fatura de janeiro), “Como o escritório confirmou” e “O que foi combinado”, obrigatório. Diz que nenhuma fatura sai no teste.'),
        ('assinatura-confirmar-erros', F + 'tg-confirmar-erros', 'Confirmar sem o detalhe', 'Resumo do erro no alto e a mensagem presa ao campo. O botão nunca fica desabilitado.'),
        ('assinatura-assinado', F + 'tg-assinado', 'Assinado, com o teste ainda correndo', 'Confirmada hoje às 9h52. O teste segue até 03/12; a cobrança começa em 04/12. Os avisos do dia 7 e do dia 8 não saem mais.'),
        ('assinatura-prorrogar', F + 'tg-prorrogar', 'Prorrogar (janela)', 'Novo último dia, antes e depois (03/12 → 08/12, 12 dias), motivo obrigatório. Os avisos saem de novo para a data nova.'),
        ('assinatura-prorrogar-erros', F + 'tg-prorrogar-erros', 'Prorrogar com erros', 'Dia antes do fim de hoje e motivo vazio.'),
        ('assinatura-prorrogado', F + 'tg-prorrogado', 'Prorrogado, dia 9 de 11 (Sucupira)', 'Os dias a mais em hachura, o fim de antes e o novo, o motivo em itálico e o aviso que saiu de novo para a data nova. Sem assinatura preparada: “Preparar a assinatura”.'),
        ('assinatura-acabou', F + 'tg-acabou', 'Acabou sem assinar, com a proposta de encerrar (Ipê)', 'Acabou em 29/11; só consulta desde 30/11, com o cadeado em cada dia depois do fim. Faixa com “Encerrar o contrato” (o fim de contrato aprovado, motivo “teste não assinado”) e “Prorrogar e devolver a escrita”. O aviso do dia 7 que perdeu o dia aparece como descartado.'),
        ('assinatura-dispensar', F + 'tg-dispensar', 'Dispensar o teste (janela)', 'alertdialog, foco em Cancelar. Para pilotos e fundadores: sem trava no 8º dia, a cobrança começa na confirmação, o combinado fica no desconto. Motivo obrigatório.'),
        ('assinatura-dispensado', F + 'tg-dispensado', 'Dispensado (Buriti, piloto, já ativo)', 'Quem dispensou, quando e o motivo; a cobrança começou na confirmação, em 18/11. O primeiro acesso só marca o dia 1 da implantação.'),
        ('assinatura-repetido', F + 'tg-repetido', 'Teste repetido, esperando a decisão (Ingá)', 'Henrique Moura já foi sócio da Angico, que teve teste em setembro. O teste não começa; o Portal fica só para consulta até a Administração liberar ou dispensar. O que ele vê no Portal, sem o motivo.'),
        ('assinatura-liberar', F + 'tg-liberar', 'Liberar o teste repetido (janela)', 'O teste começa hoje (02/12 a 08/12) e o Portal volta a gravar na hora. Motivo obrigatório.'),
        ('assinatura-financeiro', F + 'tg-quer-assinar&papel=financeiro', 'Visto pelo Financeiro', 'Marta confirma a assinatura e vê os valores; Prorrogar e Dispensar somem, com a linha que diz que são da Administração.'),
        ('assinatura-suporte', F + 'tg-em-teste&papel=suporte', 'Visto pelo Suporte', 'Vê o teste e o plano, sem valores e sem ações, com as linhas que dizem quem faz cada coisa.'),
    ]),
    ('2. Console · ficha, Histórico e Notas', 'Os eventos do teste entram no Histórico aprovado, com o motivo. “O sistema” tem o ponto vazado, como no fim do contrato.', [
        ('historico-ribeiro', 'ficha.html?aba=historico&estado=tg-ribeiro', 'Histórico do teste em andamento', 'Começo do teste no primeiro acesso, aviso do dia 1, assinatura preparada, aviso do dia 5 e o “Quero assinar” da Marina.'),
        ('historico-ipe', 'ficha.html?aba=historico&estado=tg-ipe', 'Histórico do teste que acabou', 'O aviso do dia 7 descartado (a rotina não rodou), o Portal só para consulta à 0h de 30/11, o aviso do fim e a proposta de encerrar.'),
        ('notas-ribeiro', 'ficha.html?aba=notas&estado=tg-ribeiro', 'Notas internas', 'Nada muda nas notas: o teste não escreve nelas. O quadro ao lado diz que os motivos ficam no Histórico.'),
    ]),
    ('3. Console · carteira', 'carteira.html. A situação do teste entra na coluna Pendências, com ícone e texto. Filtros novos ao lado de “Fatura em atraso”. “Pedem você agora” traz o que o teste pede hoje.', [
        ('carteira', 'carteira.html?estado=tg-ver', 'Carteira com o teste', 'Jatobá e Cedro: teste previsto. Ipê: acabou em 29/11. Ingá: repetido, decidir. Sucupira: em teste até 04/12. Ribeiro & Matos: dia 6 de 7 e quer assinar. Os escritórios antigos (ativos) não têm teste.'),
        ('carteira-em-teste', 'carteira.html?estado=tg-em-teste', 'Filtro “Em teste”', 'Do fim mais próximo para o mais distante. Inclui os prorrogados.'),
        ('carteira-acabou', 'carteira.html?estado=tg-acabou', 'Filtro “Teste acabou”', 'Quem passou do fim sem assinar e ainda não foi encerrado.'),
        ('carteira-quer', 'carteira.html?estado=tg-quer', 'Filtro “Quer assinar”', 'Quem apertou “Quero assinar” e espera a confirmação.'),
    ]),
    ('4. Console · sino', 'O painel do sino aprovado, com os avisos do teste. Administração e Implantação recebem todos; o Financeiro recebe só “quer assinar”.', [
        ('sino-admin', 'carteira.html?estado=tg-ver&sino=tg-admin', 'Sino da Administração', 'Teste acabando (dizendo se a assinatura está preparada), quer assinar, teste repetido, teste acabou com a proposta de encerrar e teste começou.'),
        ('sino-financeiro', 'carteira.html?estado=tg-ver&papel=financeiro&sino=tg-financeiro', 'Sino do Financeiro', 'Só o pedido para assinar, que é o que o Financeiro confirma.'),
    ]),
    ('5. Portal · faixas, Quero assinar, Início e sino', 'inicio.html (o Início aprovado, sem mudança no miolo). Ribeiro & Matos, sócia dona Marina Ribeiro. A faixa fica no alto de todas as páginas, como a do atraso. Cada estado tem o seu relógio fixo.', [
        ('portal-dia1', I + 'tg-dia1', 'Dia 1: boas-vindas (27/11, 23h42)', 'Faixa “Teste grátis até quinta-feira, 03/12” com “Quero assinar”. Boas-vindas no lugar do Início ainda vazio: por onde começar, quem acompanha (Implantação) e os 7 dias em datas.'),
        ('portal-equipe', I + 'tg-equipe', 'Quem não é sócio (29/11)', 'Larissa vê a mesma faixa, sem o botão: quem assina é a sócia dona.'),
        ('portal-dona', I + 'tg-dona', 'Dia 6 (02/12)', 'A faixa com “faltam 2 dias”, “Ver o plano” e “Quero assinar”.'),
        ('portal-quero', I + 'tg-quero', 'Quero assinar (janela)', 'O plano preparado (exemplo), o fim do teste e a primeira fatura; o que acontece: a equipe é avisada e confirma; nada é cobrado no teste; nada muda até a confirmação. Recado opcional.'),
        ('portal-pedido', I + 'tg-pedido', 'Pedido enviado', 'Aviso de sucesso e a faixa passa a dizer que o pedido foi enviado, sem o botão.'),
        ('portal-ultimo', I + 'tg-ultimo', 'Dia 7: último dia (03/12)', 'Faixa mais forte: amanhã o Portal fica só para consulta até a assinatura. Nada é apagado.'),
        ('portal-dia8', I + 'tg-dia8', 'Dia 8: só consulta (04/12)', 'Faixa do só consulta com “Baixar os dados” e “Quero assinar”. Os atalhos viram esses dois; os outros botões ficam à vista, travados, com o motivo na faixa.'),
        ('portal-dia8-equipe', I + 'tg-dia8-equipe', 'Dia 8 para quem não é sócio', 'Vê tudo; para voltar ao normal, fala com Marina Ribeiro, a sócia dona.'),
        ('portal-sino', I + 'tg-dia8&sino=tg-socio', 'Sino da sócia dona (dia 8)', 'Os 4 avisos do teste, com os mesmos textos dos e-mails.'),
    ]),
    ('6. Portal · Escritório › Plano e faturas, antes da assinatura', 'portal-escritorio.html. A seção aprovada, sem fatura: o plano preparado pela equipe (valores de exemplo) e o teste no lugar da próxima fatura. Só a sócia dona vê.', [
        ('plano-teste', P + 'tg-plano', 'Em teste (02/12)', 'Até quinta, 03/12; se assinar, a cobrança começa em 04/12 e a primeira fatura é a de janeiro de 2027. “Quero assinar” e “Falar com o T3jus”.'),
        ('plano-pedido', P + 'tg-plano-pedido', 'Pedido enviado', 'Selo “Pedido enviado” e quem da equipe confirma.'),
        ('plano-assinado', P + 'tg-plano-assinado', 'Assinatura confirmada', 'O teste segue até 03/12; a primeira fatura chega em 04/12 e vence em 10/01/2027.'),
        ('plano-dia8', P + 'tg-plano-dia8', 'Dia 8, sem assinatura', 'O teste terminou; só consulta, nada apagado; ao confirmar a assinatura, tudo volta na hora. A exportação continua.'),
    ]),
    ('7. E-mails à sócia dona', 'emails.html. O visual dos e-mails do sistema (o do fim do contrato). O envelope em cima mostra de, para, assunto e quando sai. O mesmo texto vai no sino do Portal.', [
        ('email-dia1', 'emails.html?estado=dia1', 'Dia 1, no primeiro acesso', 'Boas-vindas, a data do fim, quem acompanha e como continuar.'),
        ('email-dia5', 'emails.html?estado=dia5', 'Dia 5, faltam 3 dias', 'A data do fim, “Quero assinar”, nada cobrado no teste e o que acontece se não assinar.'),
        ('email-dia7', 'emails.html?estado=dia7', 'Dia 7, último dia', 'Amanhã, só consulta até a assinatura. Quem já pediu pode desconsiderar.'),
        ('email-dia8', 'emails.html?estado=dia8', 'Dia 8, o teste terminou', 'Seus dados estão guardados; só consulta; como baixar; como voltar a usar tudo.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, its in SECOES for it in its]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_tg.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for n, (titulo, sub, itens) in enumerate(SECOES, 1):
    corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg in itens:
        figs = ''
        for tam, larg in (('computador', '1440'), ('celular', '412')):
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{larg}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'
nav = ''.join(f'<a href="#s{n}">{h(t.split(". ", 1)[1].split(":")[0])}</a>' for n, (t, _, _) in enumerate(SECOES, 1))
LINHA = [('Cadastro', 'Teste previsto'), ('Dia 1', 'Primeiro acesso de um sócio: e-mail e sino'), ('Dia 5', 'Faltam 3 dias: e-mail e sino'),
         ('Dia 7', 'Último dia: e-mail e sino'), ('Dia 8', 'Sem assinatura: só consulta, nada apagado'), ('Depois', 'A Administração encerra: 30 dias de consulta'),
         ('Assinou', 'Cobrança no dia seguinte ao fim; 1ª mensalidade no mês seguinte')]
linha = ''.join(f'<li><b>{h(d)}</b><span>{h(t)}</span></li>' for d, t in LINHA)
index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Teste grátis de 7 dias · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
header a{{color:#fff}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
ol.linha{{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}}
ol.linha li{{background:#87335B;border-radius:10px;padding:10px 12px;color:#fff;font-size:12px;line-height:1.45}} ol.linha b{{display:block;font-family:Alegreya,Georgia,serif;font-size:17px;font-weight:500;color:#F2CDB3}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}} ol.linha{{grid-template-columns:1fr 1fr}}}}
</style></head><body>
<header><p class="sobre">T3jus · CO-09 · D42 · para aprovação da Carol</p><h1>Teste grátis de 7 dias</h1>
<p>As telas do teste grátis, desenhadas sobre as telas aprovadas: no Console (o quadro do teste na aba Assinatura, com Prorrogar, Liberar teste repetido, Dispensar e Confirmar a assinatura; Histórico e Notas; a carteira com a situação e os filtros; o sino) e no Portal (as faixas da moldura, “Quero assinar”, as boas-vindas do dia 1, o 8º dia só para consulta, Plano e faturas antes da assinatura e o sino da sócia dona), mais os 4 e-mails. Os valores são de exemplo. O valor e a isenção da implantação ficam de fora (frente CO-08). Datas no horário da Bahia, igual ao de Brasília. Cada estado tem computador (1440) e celular (412); clique numa imagem para abrir o HTML naquele estado. Decisões e perguntas estão em NOTAS.md.</p>
<ol class="linha" aria-label="O teste, do cadastro à assinatura">{linha}</ol>
<nav class="ir" aria-label="Ir para">{nav}</nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'estados')
