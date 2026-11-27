# Portal: Escritório › Implantação, Plano e faturas com a implantação, Assinar o T3jus (CO-09) e o Início.
# Bases (lidas sem mudança): cobranca-pdfs/portal-escritorio.html e portal-inicio-audiencias/inicio.html.
# O escritório da moldura passa de Ribeiro & Matos para Cedro & Lima (o mesmo do Console), só por troca de texto.
# Uso: python3 portal_im.py <pasta-saida>
import sys, os, re
from comum_im import *
from dados_im import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'


def trocar_escritorio(s):
    s = s.replace('Ribeiro &amp; Matos Advocacia', ESC).replace('Ribeiro &amp; Matos', ESC_C).replace('Ribeiro & Matos', 'Cedro & Lima')
    s = s.replace('Advocacia · 7 pessoas', 'Advocacia · 6 pessoas').replace('<span class="mo" aria-hidden="true">R</span>', '<span class="mo" aria-hidden="true">C</span>')
    s = s.replace("socio:{nome:'Marina Ribeiro',ini:'M'", "socio:{nome:'Renata Lima',ini:'R'")
    s = s.replace("juridico:{nome:'Larissa Costa',ini:'L',papel:'Área: Jurídico'", "juridico:{nome:'Tiago Ramos',ini:'T',papel:'Área: Jurídico'")
    s = s.replace("'sem-area':{nome:'Paula Nunes',ini:'P',papel:'Só as partes comuns'", "'sem-area':{nome:'Joana Freitas',ini:'J',papel:'Só as partes comuns'")
    s = s.replace('data-quem-ini>M<', 'data-quem-ini>R<').replace('data-quem-nome>Marina Ribeiro<', 'data-quem-nome>Renata Lima<')
    return s


# ================================================================ Escritório
BASE = trocar_escritorio(ler('cobranca-pdfs/portal-escritorio.html'))
CB_PLANO = corpo_tpl(BASE, '<template data-est="cb-plano"')
# o resto da página Escritório (Dados, Seus escritórios, Exportar), depois da folha Plano e faturas
RESTO = CB_PLANO[CB_PLANO.index('<div class="pt-grade">'):]
RESTO = RESTO.replace('Ribeiro &amp; Matos Sociedade de Advogados', 'Cedro &amp; Lima Advocacia').replace('41.276.839/0001-34', '22.914.870/0001-09') \
             .replace('São Paulo, SP', 'Recife, PE').replace('Rua Cardeal Arcoverde, 1749, sala 92, Pinheiros, CEP 05407-002', 'Rua da Aurora, 295, sala 1102, Boa Vista, CEP 50050-000') \
             .replace('(11) 3032-4410', '(81) 3326-1180').replace('contato@ribeiromatos.exemplo.com.br', 'contato@cedrolima.exemplo.com.br') \
             .replace('Marina Ribeiro', 'Renata Lima').replace('(11) 98812-3040', '(81) 99734-2210').replace('marina@ribeiromatos.exemplo.com.br', 'renata@cedrolima.exemplo.com.br') \
             .replace('Bianca Torres', 'Joana Freitas').replace('(11) 3032-4412', '(81) 3326-1181').replace('financeiro@ribeiromatos.exemplo.com.br', 'financeiro@cedrolima.exemplo.com.br') \
             .replace('Nunes Prado Advogados', 'Nunes Prado Advogados').replace('Campinas, SP', 'Olinda, PE')

DIFERENCIAL = (f'<ul class="im-diferencial" aria-label="O que a implantação assistida inclui">'
               f'<li>{ico("pessoas")}<b>Todas as pessoas treinadas</b><span>Cada pessoa do escritório, em grupo ou uma a uma, por vídeo, no escritório ou por telefone. Não é uma videochamada só.</span></li>'
               f'<li>{ico("olho")}<b>Uso acompanhado</b><span>Nos primeiros 30 dias, a equipe T3jus acompanha como o escritório usa o Portal e chama quem travou.</span></li>'
               f'<li>{ico("importar")}<b>Mudança sem retrabalho</b><span>Ajuda para trazer os clientes do sistema antigo e ligar o WhatsApp do escritório.</span></li>'
               f'<li>{ico("pessoa-mais")}<b>Quem chega depois também</b><span>Pessoa que entrar no escritório depois recebe o treino, sem custo.</span></li></ul>')


def pt_pessoas(todas=False):
    li = ''
    for ini, nome, papel, conv, conv_d, tr, tr_d, ok in PESSOAS:
        if todas and not ok:
            ok, tr = True, 'Treinado'
            tr_d = '01/12 · vídeo, 45 min' if nome == 'Tiago Ramos' else '04/12 · presencial, 1h'
            conv, conv_d = 'Aceitou', ('entrou em 02/12/2026' if nome == 'Diego Alves' else conv_d)
        if not ok:
            tr_d = 'Rafael combina o horário com a pessoa' if conv == 'Aceitou' else 'Primeiro, a pessoa precisa aceitar o convite'
        sc = (f'<span class="selo selo-ok">{ico("check")}{conv}</span>' if conv == 'Aceitou' else f'<span class="selo selo-neutro">{ico("envelope")}{conv}</span>')
        st = (f'<span class="selo selo-ativo">{ico("check")}{tr}</span>' if ok else f'<span class="selo selo-atencao">{ico("relogio")}Ainda sem treino</span>')
        li += (f'<li><span class="av-p{" forte" if nome == "Renata Lima" else ""}" aria-hidden="true">{ini}</span>'
               f'<div class="im-nome"><strong>{nome}{"<span class=voce>você</span>" if nome == "Renata Lima" else ""}</strong><small>{papel}</small></div>'
               f'<div class="im-col"><span class="im-r">Convite</span>{sc}<small>{conv_d}</small></div>'
               f'<div class="im-col"><span class="im-r">Treino</span>{st}<small>{tr_d}</small></div></li>')
    n = 6 if todas else 4
    barra = ''.join('<i class="im-ok"></i>' if i < n else '<i></i>' for i in range(6))
    return (f'<div class="im-cab-folha" style="border-top:1px solid var(--divisor)"><div><h3 style="font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)">Treino de cada pessoa</h3>'
            f'<p class="sub">Quem tem acesso ao Portal. Cada pessoa vê o próprio treino no Início.</p></div></div>'
            f'<div class="im-conta"><span class="im-grande">{n} de 6<small>pessoas treinadas</small></span><span class="im-barra" aria-hidden="true">{barra}</span></div>'
            f'<div class="im-pessoas-cab" aria-hidden="true"><span></span><span>Pessoa</span><span>Convite</span><span>Treino</span></div>'
            f'<ul class="im-pessoas" aria-label="Treino de cada pessoa">{li}</ul>')


def pt_feito(todas=False):
    itens = [
        ('sim', 'check', 'Você entrou no Portal', 'Em 16/11/2026. A implantação começou aqui.', ''),
        ('sim', 'check', 'Clientes importados', 'Planilha do Astrea, em 19/11/2026 · 214 clientes.', '<a class="im-atalho" href="#">Ver a importação' + ico("dir", "ico ico-s") + '</a>'),
        (('sim', 'check', 'WhatsApp ligado', 'Desde 04/12/2026.', '') if todas else
         ('nao', 'whats', 'WhatsApp ainda não ligado', 'Rafael ajuda a ligar o número do escritório.', '<a class="im-atalho" href="#">Ligar o WhatsApp' + ico("dir", "ico ico-s") + '</a>')),
        (('sim', 'check', 'Toda a equipe entrou', '6 de 6 pessoas aceitaram o convite.', '') if todas else
         ('meio', 'pessoas', '5 de 6 pessoas entraram', 'Diego Alves ainda não aceitou o convite.', '<a class="im-atalho" href="#">Ir para Equipe' + ico("dir", "ico ico-s") + '</a>')),
    ]
    li = ''.join(f'<li><span class="im-marca im-{c}" aria-hidden="true">{ico(i)}</span><div><strong>{t}</strong><small>{d}</small>{a}</div>'
                 f'<span class="sr">{"Feito" if c == "sim" else ("Em parte" if c == "meio" else "Ainda não")}</span></li>' for c, i, t, d, a in itens)
    return (f'<div class="im-cab-folha" style="border-top:1px solid var(--divisor)"><div><h3 style="font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)">O que já aconteceu</h3>'
            f'<p class="sub">Atualiza sozinho, conforme o escritório usa o Portal.</p></div></div><ul class="im-feito">{li}</ul>')


def folha_impl(concluida=False):
    if concluida:
        topo = (f'<div class="im-pt-topo"><div><p class="im-rot">Concluída</p><p class="im-prazo"><span class="disco im-d-ok" aria-hidden="true">{ico("check")}</span>'
                f'<span><b>em 07/12/2026</b><small>9 dias antes do prazo</small></span></p></div>'
                f'<div><p class="im-rot">Quem acompanhou</p><div class="im-quem"><span class="av-p forte" aria-hidden="true">RT</span><span><strong>Rafael Teles</strong><small>equipe T3jus</small></span></div>'
                f'<p>Continua à disposição pela <a href="#">Ajuda</a>.</p></div>'
                f'<div><p class="im-rot">Custo</p><p><b>Sem custo para o escritório</b>, na oferta de lançamento do T3jus. Veja em Plano e faturas.</p></div></div>'
                f'<div class="im-resumo-sec" style="padding-top:18px;border-top:1px solid var(--divisor)"><p class="im-rot" style="margin-bottom:8px">Resumo da equipe T3jus</p>'
                f'<p class="im-resumo">“Treinamos as 6 pessoas do escritório em 4 encontros, 5h30 no total. A planilha do Astrea entrou com 214 clientes e o WhatsApp foi ligado em 04/12. '
                f'Nas próximas semanas, Rafael segue à disposição pela Ajuda do Portal.”</p><p class="im-resumo-pe">Rafael Teles · 07/12/2026</p></div>')
        sub = 'Concluída. Quem entrar no escritório daqui para a frente também recebe o treino.'
        selo = f'<span class="selo selo-ativo">{ico("check")}Concluída</span>'
    else:
        topo = (f'<div class="im-pt-topo"><div><p class="im-rot">Prazo</p><p class="im-prazo"><span class="disco im-d-ok" aria-hidden="true"><span>19</span></span>'
                f'<span><b>até 16/12/2026</b><small>faltam 19 dias · começou em 16/11</small></span></p></div>'
                f'<div><p class="im-rot">Quem acompanha</p><div class="im-quem"><span class="av-p forte" aria-hidden="true">RT</span><span><strong>Rafael Teles</strong><small>equipe T3jus</small></span></div>'
                f'<p><a class="btn btn-sec btn-compacto" href="#">{ico("ajuda", "ico ico-s")}Falar com Rafael</a></p></div>'
                f'<div><p class="im-rot">Custo</p><p><b>Sem custo para o escritório</b>, na oferta de lançamento do T3jus. O valor e a isenção aparecem em Plano e faturas.</p></div></div>')
        sub = 'Nos primeiros 30 dias, a equipe T3jus treina todas as pessoas do escritório e acompanha o uso.'
        selo = f'<span class="selo selo-implant">Em andamento</span>'
    return (f'<section class="folha im-novo" aria-labelledby="t-impl" id="implantacao" style="overflow:hidden"><div class="im-cab-folha"><div><h2 id="t-impl" style="display:flex;gap:10px;align-items:center">{ico("coluna")}Implantação assistida</h2>'
            f'<p class="sub">{sub}</p></div>{selo}</div>{topo}{"" if concluida else DIFERENCIAL}{pt_feito(concluida)}{pt_pessoas(concluida)}'
            f'<p class="docs-pe">{ico("olho")}<span>Só os sócios veem esta parte. Cada pessoa vê o próprio treino no Início.</span></p></section>')


# ---------------- Plano e faturas: a linha da implantação e a 1ª fatura com a isenção
def plano(cobrada=False, pagar=False):
    tot = TOTAL_COBRADA if cobrada else TOTAL_ISENTA
    if cobrada:
        linha = (f'<div class="im-pt-impl-linha im-novo"><p class="im-l1">{ico("coluna")}Implantação assistida <span class="selo selo-cobrada">{ico("fatura")}À vista na 1ª fatura</span></p>'
                 f'<p><b>{brl(VALOR)}</b>, uma vez só, na fatura de janeiro, por Pix ou boleto. Inclui o treino de todas as pessoas e o acompanhamento por 30 dias.</p></div>')
    else:
        linha = (f'<div class="im-pt-impl-linha im-novo"><p class="im-l1">{ico("coluna")}Implantação assistida <span class="selo selo-isenta">{ico("isencao")}Isenta · {ISENCAO_TXT}</span></p>'
                 f'<p>Vale <b>{brl(VALOR)}</b> e sai sem custo: a 1ª fatura traz o valor e a isenção, que somam zero. Inclui o treino de todas as pessoas e o acompanhamento por 30 dias.</p></div>')
    itens = (f'<tr><td><span class="im-tipo">Mensalidade</span>Mensalidade do plano Escritório<small>janeiro de 2027 · até 8 pessoas</small></td><td class="cb-valor">{brl(MENSAL)}</td></tr>'
             f'<tr class="cb-desc"><td><span class="im-tipo">Desconto</span>Desconto de entrada (20% da mensalidade)<small>1ª de 3 faturas</small></td><td class="cb-valor">{brl(-DESC)}</td></tr>'
             f'<tr><td><span class="im-tipo im-t-impl">Implantação</span>Implantação assistida · {DESCR}</td><td class="cb-valor">{brl(VALOR)}</td></tr>')
    if not cobrada:
        itens += f'<tr class="cb-desc"><td><span class="im-tipo im-t-isen">Isenção</span>Isenção da implantação · {ISENCAO_TXT}</td><td class="cb-valor">{brl(-VALOR)}</td></tr>'
    tabela = (f'<div class="im-itens-sec im-novo"><h3 id="t-itens-1">O que vem na fatura de janeiro, a 1ª</h3><table class="cb-itens" aria-labelledby="t-itens-1">'
              f'<thead><tr><th scope="col">Descrição</th><th scope="col" class="cb-valor">Valor</th></tr></thead><tbody>{itens}</tbody>'
              f'<tfoot><tr><th scope="row">Total</th><td class="cb-valor">{brl(tot)}</td></tr></tfoot></table></div>')
    fat_linha = (f'<table class="cb-tab so-pc"><caption class="sr">Faturas do escritório</caption><colgroup><col><col style="width:130px"><col style="width:116px"><col style="width:190px"><col style="width:200px"></colgroup>'
                 f'<thead><tr><th scope="col">Competência</th><th scope="col" class="cb-valor">Valor</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col"><span class="sr">Ações</span></th></tr></thead>'
                 f'<tbody><tr><td><strong style="font-weight:500">janeiro/2027</strong></td><td class="cb-valor">{brl(tot)}</td><td class="num">10/01/2027</td>'
                 f'<td><div class="cb-sit"><span class="selo selo-ok">{ico("agenda")}A vencer</span><small>a primeira · emitida em 07/12</small></div></td>'
                 f'<td><div class="cb-acoes-linha"><button class="btn btn-pri btn-compacto" type="button" data-janela="janela-pagar-im">{ico("pagar", "ico ico-s")}Pagar<span class="sr"> a fatura de janeiro</span></button></div></td></tr></tbody></table>'
                 f'<ul class="cb-cartoes so-cel" aria-label="Faturas do escritório"><li class="cb-cartao"><div class="cb-c-topo"><div><strong class="cb-c-nome">janeiro/2027</strong><small>vence em 10/01/2027</small></div>'
                 f'<span class="cb-c-valor">{brl(tot)}</span></div><div class="cb-sit"><span class="selo selo-ok">{ico("agenda")}A vencer</span><small>a primeira · emitida em 07/12</small></div>'
                 f'<div class="cb-c-acoes"><button class="btn btn-pri" type="button" data-janela="janela-pagar-im">{ico("pagar", "ico ico-s")}Pagar<span class="sr"> a fatura de janeiro</span></button></div></li></ul>')
    folha = (f'<section class="folha" aria-labelledby="t-plano" id="plano" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-plano">{ico("fatura")}Plano e faturas</h2>'
             f'<p class="sub">Só a sócia dona vê esta parte.</p></div><span class="cb-ex" title="Planos e preços fictícios, só para o desenho">Valores de exemplo</span></div>'
             f'<div class="cb-pt-plano"><div><p class="sobretitulo">Seu plano</p><p class="cb-plano-nome" style="font-size:24px">Escritório</p><p class="cb-preco">{brl(MENSAL)}<small>por mês</small></p>'
             f'<p>Até <b>8 pessoas</b>, com todas as áreas. Hoje são <b>6</b>. Desconto de entrada de 20% nas 3 primeiras mensalidades.</p>{linha}'
             f'<p>Vence todo dia <b>10</b> · Pix ou boleto · a fatura chega em financeiro@cedrolima.exemplo.com.br.</p></div>'
             f'<div><p class="sobretitulo">Próxima fatura</p><p class="cb-proxima"><span class="cb-grande">{brl(tot)}</span><span class="selo selo-ok">{ico("agenda")}A vencer</span></p>'
             f'<p>Janeiro de 2027, a 1ª · vence em <b>10/01/2027</b>.</p><p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-pri" type="button" data-janela="janela-pagar-im">{ico("pagar")}Pagar</button>'
             f'<a class="btn btn-sec" href="fatura-a4.html?estado={"im-cobrada" if cobrada else "im-isenta"}">{ico("baixar")}Baixar a fatura</a></p></div></div>'
             f'{tabela}<h3 class="sr">Faturas</h3>{fat_linha}</section>')
    conta = ''.join(f'<li{" class=im-neg" if v < 0 else ""}><span>{d}</span><b>{brl(v)}</b></li>' for d, v in
                    [('Mensalidade do plano Escritório, janeiro de 2027', MENSAL), ('Desconto de entrada (20% da mensalidade)', -DESC), ('Implantação assistida', VALOR)]
                    + ([] if cobrada else [(f'Isenção da implantação · {ISENCAO_TXT}', -VALOR)]))
    jan = janela('janela-pagar-im', 'Plano e faturas', 'Pagar a fatura de janeiro',
                 'Vence em 10/01/2027. Pago por Pix, aparece como paga na hora; por boleto, em até 1 dia útil.',
                 f'<ul class="im-conta-l">{conta}<li class="im-tot"><span>Total</span><b>{brl(tot)}</b></li></ul>'
                 f'<div class="cb-pagar" style="padding:0"><div class="cb-qr" role="img" aria-label="Lugar do QR do Pix (exemplo)">{ico("qr")}<span>QR do Pix<br>(exemplo)</span></div>'
                 f'<div class="cb-meio"><h3 id="im-pix">{ico("qr")}Pix copia e cola</h3><div class="cb-codigo"><code aria-describedby="im-pix">00020126580014br.gov.bcb.pix0136exemplo-0000-0000-0000-t3jus-exemplo52040000530398654{len(f"{tot/100:.2f}"):02d}{tot/100:.2f}5802BR5913T3JUS EXEMPLO6006RECIFE62070503***6304ABCD</code>'
                 f'<button class="btn btn-fantasma btn-compacto" type="button" aria-label="Copiar o código Pix">{ico("copiar", "ico ico-s")}Copiar</button></div></div></div>',
                 f'<button class="btn btn-pri" type="button" data-fechar data-foco>Fechar</button>', abrir=pagar)
    return folha + jan


# ---------------- Assinar o T3jus (página do CO-09): a linha da implantação
def assinar(cobrada=False):
    tot = TOTAL_COBRADA if cobrada else TOTAL_ISENTA
    cab = (f'<div class="cabeca-ambar campo-ambar cabeca-equipe"><div><p class="sobretitulo">Escritório</p><h1>Assinar o T3jus</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">Confira o que entra na assinatura antes de pedir. A equipe T3jus confirma com você.</p></div></div>')
    linhas = [('Mensalidade do plano Escritório', 'todo dia 10, a partir de janeiro de 2027', MENSAL, ''),
              ('Desconto de entrada (20% da mensalidade)', 'nas 3 primeiras mensalidades', -DESC, ''),
              ('Implantação assistida', DESCR + ' · uma vez só, na 1ª fatura', VALOR, 'impl')]
    if not cobrada:
        linhas.append((f'Isenção da implantação · {ISENCAO_TXT}', 'os 6 primeiros meses do T3jus', -VALOR, 'isen'))
    tr = ''
    for d, sm, v, k in linhas:
        tipo = {'impl': '<span class="im-tipo im-t-impl">Implantação</span>', 'isen': '<span class="im-tipo im-t-isen">Isenção</span>'}.get(k, '')
        cls = ' class="cb-desc' + (' im-novo' if k else '') + '"' if v < 0 else (' class="im-novo"' if k else '')
        tr += f'<tr{cls}><td>{tipo}{d}<small>{sm}</small></td><td class="cb-valor">{brl(v)}</td></tr>'
    folha = (f'<section class="folha" aria-labelledby="t-ass-pt" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-ass-pt">A 1ª fatura</h2>'
             f'<p class="sub">Janeiro de 2027 · vence em 10/01/2027. Depois, só a mensalidade.</p></div><span class="cb-ex">Valores de exemplo</span></div>'
             f'<table class="cb-itens"><caption class="sr">O que vem na 1ª fatura</caption><thead><tr><th scope="col">Descrição</th><th scope="col" class="cb-valor">Valor</th></tr></thead>'
             f'<tbody>{tr}</tbody><tfoot><tr><th scope="row">Total da 1ª fatura</th><td class="cb-valor">{brl(tot)}</td></tr></tfoot></table>'
             f'<p class="docs-pe">{ico("coluna")}<span>{"A implantação é cobrada à vista na 1ª fatura, por Pix ou boleto." if cobrada else "A implantação aparece com o valor e com a isenção, que se anulam: ela sai sem custo."} '
             f'Inclui o treino de todas as pessoas do escritório e o acompanhamento do uso por 30 dias.</span></p></section>')
    lado = (f'<aside class="pt-col" aria-label="Pedir a assinatura"><section class="folha" aria-labelledby="t-pedir"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-pedir" style="font-size:20px">Pedir a assinatura</h2></div>'
            f'<div class="im-concluir"><p>Ao apertar, a equipe T3jus recebe o pedido e confirma com você. Nada é cobrado antes disso.</p>'
            f'<button class="btn btn-pri" type="button">{ico("check")}Quero assinar</button></div></section>'
            f'<p class="im-co09"><b>Parte do CO-09 (D42), ainda sem desenho:</b> o resto desta página, a faixa do teste e o botão “Quero assinar”. '
            f'Este desenho (D43) só põe a linha da implantação na 1ª fatura, que já entra pronta quando o D42 sair.</p></aside>')
    return cab + f'<div class="im-assinar"><div class="pt-col">{folha}</div>{lado}</div>'


T = ''
T += tpl('pt-impl', folha_impl() + RESTO, atual='escritorio', trilha='Escritório', titulo='Escritório')
T += tpl('pt-impl-concluida', folha_impl(True) + RESTO, atual='escritorio', trilha='Escritório', titulo='Escritório')
T += tpl('pt-impl-erro', '<section class="folha" aria-labelledby="t-impl-e" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-impl-e">Implantação assistida</h2></div></div>'
         + estado('Não deu para carregar a implantação', 'Só esta parte falhou; o resto do Portal funciona. Tente de novo em instantes.',
                  acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>', codigo='Código para o suporte: PRT-1185-0219')
         + '</section>' + RESTO, atual='escritorio', trilha='Escritório', titulo='Escritório')
T += tpl('pt-plano-isenta', plano() + RESTO, atual='escritorio', trilha='Escritório', titulo='Escritório')
T += tpl('pt-plano-pagar', plano(pagar=True) + RESTO, atual='escritorio', trilha='Escritório', titulo='Escritório')
T += tpl('pt-plano-cobrada', plano(cobrada=True) + RESTO, atual='escritorio', trilha='Escritório', titulo='Escritório')
T += tpl('pt-assinar', assinar(), atual='escritorio', trilha='Escritório|Assinar o T3jus', titulo='Assinar o T3jus', sem_cabeca=True)
T += tpl('pt-assinar-cobrada', assinar(True), atual='escritorio', trilha='Escritório|Assinar o T3jus', titulo='Assinar o T3jus', sem_cabeca=True)

CSS_PT = '\n.im-assinar .pt-col{display:flex;flex-direction:column;gap:24px;min-width:0}\n.cb-pt-plano .im-pt-impl-linha p{font-size:13px}\n'
s = montar(BASE, CSS_IM + CSS_PT, precos_novos(T))
open(os.path.join(SAIDA, 'portal-escritorio.html'), 'w', encoding='utf-8').write(s)
print('portal-escritorio ok:', T.count('<template data-est='), 'estados')

# ================================================================ Início
BI = trocar_escritorio(ler('portal-inicio-audiencias/inicio.html'))


def inicio_de(est, cartao, nome):
    c = corpo_tpl(BI, f'<template data-est="{est}"')
    c = re.sub(r'<h1>Bom dia, [^<.]+\.</h1>', f'<h1>Bom dia, {nome}.</h1>', c, count=1)
    c = re.sub(r'<p class="sobretitulo">[A-ZÁÉa-zçá-]+-feira, \d+ de novembro</p>', '<p class="sobretitulo">Sexta-feira, 27 de novembro</p>', c, count=1)
    c = c.replace('Marina Ribeiro, a sócia dona', 'Renata Lima, a sócia dona')
    if '<section class="ar-faixa"' in c:
        i = c.index('<section class="ar-faixa"')
        j = c.index('</section>', i) + len('</section>')
        # o hero aprovado, o cartão novo e a faixa "Hoje nas suas áreas"; o resto do Início segue igual no produto (cortado na captura)
        return c[:i] + cartao + c[i:j] + '</div>' * (c[:i].count('<div') - c[:i].count('</div>'))
    d = c.index('<div class="dir campo-ambar">')
    h = c.index('</div></div>', d) + len('</div></div>')
    return c[:h] + cartao + c[h:]


CARTAO_SOCIA = (f'<section class="im-cartao-impl im-novo" aria-labelledby="t-ci"><div><p class="im-rot">Implantação assistida · faltam 19 dias</p>'
                f'<h2 id="t-ci">A equipe T3jus está treinando o escritório.</h2><p>Rafael Teles acompanha vocês até <b>16/12/2026</b>. Já são <b>4 de 6 pessoas treinadas</b>, você inclusive.</p></div>'
                f'<ul class="im-falta" aria-label="O que falta"><li>{ico("relogio")}<span>Treinar Tiago Ramos; Diego Alves ainda não aceitou o convite</span></li>'
                f'<li>{ico("whats")}<span>Ligar o WhatsApp do escritório</span></li></ul>'
                f'<a class="btn btn-sec" href="portal-escritorio.html?estado=pt-impl#implantacao">{ico("coluna")}Ver a implantação</a></section>')
CARTAO_SEM = (f'<section class="im-seu im-novo" aria-labelledby="t-seu"><span class="disco" aria-hidden="true">{ico("treino")}</span><div><h2 id="t-seu">Seu treino ainda vai ser marcado.</h2>'
              f'<p>Rafael Teles, da equipe T3jus, vai combinar um horário com você, por vídeo, no escritório ou por telefone. Até lá, a Ajuda tem os primeiros passos do Jurídico.</p></div>'
              f'<a class="btn btn-sec" href="#">{ico("ajuda")}Falar com Rafael</a></section>')
CARTAO_FEITO = (f'<section class="im-seu im-novo" aria-labelledby="t-seu"><span class="disco" aria-hidden="true">{ico("check")}</span><div><h2 id="t-seu">Você foi treinada em 24/11.</h2>'
                f'<p>Presencial, 2h, com Rafael Teles: <b>Agenda, Conversas, Jurídico e Documentos</b>. Ficou alguma dúvida? Rafael continua acompanhando o escritório até 16/12.</p></div>'
                f'<a class="btn btn-sec" href="#">{ico("ajuda")}Falar com Rafael</a></section>')
TI = ''
TI += tpl('pt-inicio-socia', inicio_de('dona', CARTAO_SOCIA, 'Renata'), atual='inicio', trilha='Início', titulo='Início')
TI += tpl('pt-inicio-sem-treino', inicio_de('larissa', CARTAO_SEM, 'Tiago'), quem='juridico', atual='inicio', trilha='Início', titulo='Início')
TI += tpl('pt-inicio-treinada', inicio_de('paula', CARTAO_FEITO, 'Joana'), quem='sem-area', atual='inicio', trilha='Início', titulo='Início')
s = montar(BI, CSS_IM, precos_novos(TI))
open(os.path.join(SAIDA, 'portal-inicio.html'), 'w', encoding='utf-8').write(s)
print('portal-inicio ok:', TI.count('<template data-est='), 'estados')
