# Console › ficha do escritório: aba nova Implantação, bloco na Assinatura, aba Contrato e o sino.
# Base: docs/design/aprovadas/cobranca-pdfs/ficha.html, lida sem mudança.
# Uso: python3 ficha_im.py <pasta-saida>
import sys, os, re
from comum_im import *
from dados_im import *
from sino_im import SINO_CHIPS, SINO_CSS, SINO_SIMB, SINO_DIALOG, sino_script, sino_templates_ficha

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
BASE = ler('cobranca-pdfs/ficha.html')

# ---------------------------------------------------------------- cabeçalhos da ficha
CAB_PRONTO = corpo_tpl(BASE, '<template data-cab="pronto"')
CAB_ATIVO = corpo_tpl(BASE, '<template data-cab="ativo"')
BOT_ANTIGO = '<a class="btn btn-sec pode-editar" href="?aba=contrato&amp;estado=mudar" style="align-self:flex-start">Passar para ativo</a>'
DICA_ANTIGA = '<p class="dica">A sócia já entrou no Portal. Pode concluir a implantação.</p>'
assert BOT_ANTIGO in CAB_PRONTO and DICA_ANTIGA in CAB_PRONTO


def cab_impl(dica):
    c = CAB_PRONTO.replace(BOT_ANTIGO, f'<a class="btn btn-sec im-so-edita im-novo" href="?aba=implantacao&amp;estado=im-concluir" style="align-self:flex-start">{ico("check")}Concluir a implantação</a>')
    return c.replace(DICA_ANTIGA, f'<p class="dica im-novo">{dica}</p>')


A1 = '<p class="grande">Ativo<small>desde 18/11/2026</small></p>'
A2 = '<p class="dica" style="font-size:13px">A implantação foi concluída por Carol Andrade. O motivo está no histórico.</p>'
assert A1 in CAB_ATIVO and A2 in CAB_ATIVO
CAB_IM_ATIVO = CAB_ATIVO.replace(A1, '<p class="grande">Ativo<small>desde 07/12/2026</small></p>').replace(
    A2, '<p class="dica im-novo" style="font-size:13px">A implantação foi concluída por Rafael Teles em 07/12/2026, 9 dias antes do prazo. O resumo está na aba Implantação.</p>')

CABS = ''
for nome, dica in (('im-pronto', 'Prazo da implantação: <b>16/12/2026</b>, faltam 19 dias.'),
                   ('im-pronta', 'Prazo da implantação: <b>16/12/2026</b>, faltam 9 dias. As 6 pessoas foram treinadas.'),
                   ('im-perto', 'Prazo da implantação: <b>16/12/2026</b>, faltam 7 dias.'),
                   ('im-hoje', 'O prazo da implantação vence <b>hoje</b>, 16/12/2026.'),
                   ('im-passou', 'O prazo da implantação passou em <b>16/12/2026</b>, há 5 dias.')):
    CABS += f'<template data-cab="{nome}">{cab_impl(dica)}</template>\n'
CABS += f'<template data-cab="im-ativo">{CAB_IM_ATIVO}</template>\n'

# ---------------------------------------------------------------- peças da aba Implantação
LEITURA = (f'<p class="cb-so-ver im-msg-leitura" style="margin:0">{ico("olho")}<span>Você vê a implantação. Quem registra treinos, troca o responsável e conclui '
           f'é a Implantação ou a Administração.</span></p>')


def topo(n_disco, cls_disco, prazo_b, prazo_small, selo_estado='<span class="selo selo-implant">Aberta</span>', sub=None, acoes=True, cond=None):
    sub = sub or 'Nº 1 · aberta em 16/11/2026, quando Renata Lima, sócia, entrou no Portal pela primeira vez.'
    bp = (f'<button class="btn btn-sec btn-compacto so-admin" type="button" data-janela="janela-prazo">{ico("prazo", "ico ico-s")}Mudar o prazo</button>'
          f'<p class="permissao msg-nao-admin im-so-edita">{ico("cadeado")}Só a Administração muda o prazo.</p>') if acoes else ''
    bt = (f'<button class="btn btn-sec btn-compacto im-so-edita" type="button" data-janela="janela-trocar">{ico("trocar", "ico ico-s")}Trocar<span class="sr"> quem acompanha</span></button>') if acoes else ''
    cond = cond or (f'<p><span class="selo selo-isenta">{ico("isencao")}Isenta · {ISENCAO_TXT}</span></p>'
                    f'<p class="im-valor-linha so-fin">Valor <b>{brl(VALOR)}</b> e a isenção de <b>{brl(-VALOR)}</b> na 1ª fatura: efeito <b>R$ 0,00</b>.</p>'
                    f'<p class="im-peq">Congelada em 16/11/2026, na abertura. Mudar a regra em Cobrança não muda esta.</p>'
                    f'<p class="im-peq msg-nao-fin">O valor fica com a Administração e o Financeiro.</p>')
    disco = f'<span class="disco {cls_disco}" aria-hidden="true"><span>{n_disco}</span></span>' if n_disco != '' else f'<span class="disco im-d-ok" aria-hidden="true">{ico("check")}</span>'
    return (f'<section class="folha im-novo" aria-labelledby="t-im" style="overflow:hidden"><div class="im-cab-folha"><div><h2 id="t-im">Implantação assistida</h2>'
            f'<p class="sub">{sub}</p></div>{selo_estado}</div>'
            f'<div class="im-topo"><div><p class="im-rot">Prazo</p><div class="im-prazo">{disco}<span><b>{prazo_b}</b><small>{prazo_small}</small></span></div>{bp}</div>'
            f'<div><p class="im-rot">Quem acompanha</p><div class="im-quem"><span class="av-p forte" aria-hidden="true">RT</span><span><strong>Rafael Teles</strong><small>Implantação · equipe T3jus</small></span></div>{bt}</div>'
            f'<div><p class="im-rot">Condição</p>{cond}</div></div></section>')


def feito(treinadas, whats=False, quem_ver=True):
    itens = [
        ('sim', 'check', 'Uma sócia entrou no Portal', 'Renata Lima, em 16/11/2026. A implantação começou aqui.', ''),
        ('sim', 'check', 'Importação concluída', 'Planilha do Astrea, em 19/11/2026 · 214 clientes e 388 contratos.', ''),
        (('sim', 'check', 'WhatsApp ligado', 'Desde 04/12/2026, no número (81) 3326-1180.', '') if whats else
         ('nao', 'whats', 'WhatsApp ainda não ligado', 'O escritório liga em Escritório › Integrações, com a ajuda da equipe.', '')),
        (('sim' if treinadas == 6 else 'meio'), 'pessoas', f'{treinadas} de 6 pessoas treinadas',
         'Todas as pessoas com acesso ao Portal.' if treinadas == 6 else f'Faltam {6 - treinadas}: Tiago Ramos e Diego Alves. Veja abaixo.', ''),
    ]
    li = ''.join(f'<li><span class="im-marca im-{c}" aria-hidden="true">{ico(i)}</span><div><strong>{t}</strong><small>{d}</small>{a}</div>'
                 f'<span class="sr">{"Feito" if c == "sim" else ("Em parte" if c == "meio" else "Ainda não")}</span></li>' for c, i, t, d, a in itens)
    return (f'<section class="folha im-novo" aria-labelledby="t-feito"><div class="im-cab-folha"><div><h2 id="t-feito">O que já aconteceu</h2>'
            f'<p class="sub">Calculado na hora, a partir do Portal do escritório.</p></div></div><ul class="im-feito">{li}</ul>'
            f'<p class="im-calc">{ico("ajuda")}<span>Nada aqui se marca à mão. Quando o escritório faz, aparece sozinho; se desfaz, volta.</span></p></section>')


def barra(n, tot=6):
    return f'<span class="im-barra" aria-hidden="true">{"".join("<i class=im-ok></i>" if i < n else "<i></i>" for i in range(tot))}</span>'


def pessoas(todas=False, editar=True):
    li = ''
    for ini, nome, papel, conv, conv_d, tr, tr_d, ok in PESSOAS:
        if todas and not ok:
            ok = True
            tr = 'Treinado'
            tr_d = '01/12 · vídeo, 45 min' if nome == 'Tiago Ramos' else '04/12 · presencial, 1h'
            if nome == 'Diego Alves':
                conv, conv_d = 'Aceitou', 'entrou em 02/12/2026'
        sc = (f'<span class="selo selo-ok">{ico("check")}{conv}</span>' if conv == 'Aceitou' else f'<span class="selo selo-neutro">{ico("envelope")}{conv}</span>')
        st = (f'<span class="selo selo-ativo">{ico("check")}{tr}</span>' if ok else f'<span class="selo selo-atencao">{ico("relogio")}{tr}</span>')
        li += (f'<li><span class="av-p{" forte" if nome == "Renata Lima" else ""}" aria-hidden="true">{ini}</span>'
               f'<div class="im-nome"><strong>{nome}</strong><small>{papel}</small></div>'
               f'<div class="im-col"><span class="im-r">Convite</span>{sc}<small>{conv_d}</small></div>'
               f'<div class="im-col"><span class="im-r">Treino</span>{st}<small>{tr_d}</small></div></li>')
    n = 6 if todas else 4
    return (f'<section class="folha im-novo" aria-labelledby="t-pess" style="overflow:hidden"><div class="im-cab-folha"><div><h2 id="t-pess">Pessoas do escritório</h2>'
            f'<p class="sub">Todas as pessoas com acesso ao Portal. Quem entra depois aparece aqui sozinho.</p></div></div>'
            f'<div class="im-conta"><span class="im-grande">{n} de 6<small>pessoas treinadas</small></span>{barra(n)}</div>'
            f'<div class="im-pessoas-cab" aria-hidden="true"><span></span><span>Pessoa</span><span>Convite</span><span>Treino</span></div>'
            f'<ul class="im-pessoas" aria-label="Pessoas do escritório, com o convite e o treino">{li}</ul></section>')


def treino_li(t, editar=True):
    temas = ''.join(f'<span class="selo selo-neutro">{x}</span>' for x in t['temas'])
    if t.get('desfeito'):
        q, d, m = t['desfeito']
        return (f'<li class="im-desfeito"><div class="im-dia" aria-hidden="true"><span class="disco"><span>{t["dia"]}</span></span><small>{t["mes"]}</small></div>'
                f'<div><h3>{ico(t["ico"])}<span class="im-riscado">{t["forma"]} · {t["dur"]} · {t["pessoas"]}</span><span class="selo selo-neutro">{ico("desfazer")}Desfeito</span></h3>'
                f'<p class="im-peq"><span class="sr">Treino de {t["data"]}, desfeito. </span>Registrado por {t["por"]}; desfeito por {q} em {d}. Não conta no treino de ninguém.</p>'
                f'<span class="im-motivo">“{m}”</span></div><span></span></li>')
    ac = (f'<div class="im-acoes-l im-so-edita"><button class="btn btn-fantasma btn-compacto" type="button" data-janela="janela-desfazer">{ico("desfazer", "ico ico-s")}'
          f'Desfazer registro<span class="sr"> do treino de {t["data"]}</span></button></div>') if editar else '<span></span>'
    return (f'<li><div class="im-dia" aria-hidden="true"><span class="disco"><span>{t["dia"]}</span></span><small>{t["mes"]}</small></div>'
            f'<div><h3>{ico(t["ico"])}<span><span class="sr">{t["data"]}: </span>{t["forma"]} · {t["dur"]}</span></h3>'
            f'<p><b style="font-weight:600">{t["pessoas"]}</b> · {t.get("onde", "")}</p><p class="im-peq">Dado por {t["por"]}</p>'
            f'<div class="im-temas" aria-label="Temas">{temas}</div></div>{ac}</li>')


EXTRA_TREINOS = [
    dict(dia='04', mes='dez', data='04/12/2026', forma='Presencial', ico='presencial', dur='1h', pessoas='Diego Alves', temas=['Início', 'Jurídico', 'Agenda'], por='Rafael Teles', onde='no escritório'),
    dict(dia='01', mes='dez', data='01/12/2026', forma='Vídeo', ico='treino', dur='45 min', pessoas='Tiago Ramos', temas=['Jurídico', 'Documentos'], por='Rafael Teles', onde='por videochamada'),
]


def treinos(todas=False, editar=True, depois=False):
    lista = (EXTRA_TREINOS + TREINOS) if todas else TREINOS
    li = ''.join(treino_li(t, editar) for t in lista)
    tot = '5h30 em 4 treinos, sem contar o desfeito' if todas else '3h30 em 2 treinos, sem contar o desfeito'
    bot = (f'<button class="btn btn-pri im-so-edita" type="button" data-janela="janela-treino">{ico("mais")}Registrar treino</button>') if editar else ''
    sub = ('Quem entrar no escritório depois da conclusão também é treinado e entra aqui (pergunta 6).' if depois else
           'Cada treino guarda o dia, a duração, a forma, os temas e quem participou. Nada se apaga.')
    return (f'<section class="folha im-novo" aria-labelledby="t-treinos" style="overflow:hidden"><div class="im-cab-folha"><div><h2 id="t-treinos">Treinos</h2>'
            f'<p class="sub">{sub}</p></div>{bot}</div><ul class="im-treinos" aria-label="Treinos registrados">{li}</ul>'
            f'<p class="im-total-treino">{ico("relogio")}<span>Tempo de treino: {tot}. A duração ajuda a medir o custo real da implantação.</span></p></section>')


def lateral(concluir=True, falta=True, extra=''):
    c = ''
    if concluir:
        f = (f'<p class="im-peq">{ico("relogio", "ico ico-s")} 2 pessoas ainda sem treino. Dá para concluir assim; o treino delas continua sendo registrado aqui.</p>' if falta else
             '<p class="im-peq">As 6 pessoas foram treinadas.</p>')
        c = (f'<section class="folha im-so-edita im-novo" aria-labelledby="t-concl"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-concl" style="font-size:20px">Concluir</h2></div>'
             f'<div class="im-concluir"><p>Concluir passa o cliente para <b>Ativo</b>. Sem o teste grátis (CO-09), a cobrança começa no mesmo dia e a 1ª fatura já traz a implantação e a isenção.</p>'
             f'<a class="btn btn-pri" href="?aba=implantacao&amp;estado=im-concluir">{ico("check")}Concluir a implantação</a>{f}</div></section>')
    exp = (f'<section class="explica campo-ambar" aria-labelledby="t-como-im"><p class="sobretitulo">Como funciona</p><h2 id="t-como-im" class="im-h2">A implantação assistida.</h2><ul>'
           f'<li>{ico("relogio")}<span>Até 30 dias, contados do primeiro acesso de uma sócia ou de um sócio ao Portal.</span></li>'
           f'<li>{ico("pessoas")}<span>A equipe T3jus treina todas as pessoas do escritório, em grupo ou uma a uma, e acompanha o uso. Não é uma videochamada só.</span></li>'
           f'<li>{ico("sino")}<span>O sino avisa aos 7, 3 e 0 dias do prazo. Passado o prazo, nada muda sozinho: o cliente segue em implantação até alguém concluir.</span></li>'
           f'<li>{ico("isencao")}<span>O valor e a condição (isenta ou cobrada) ficam congelados no dia em que a implantação abre.</span></li>'
           f'<li>{ico("olho")}<span>Os sócios veem no Portal o prazo, quem acompanha e o treino de cada pessoa, sem valores.</span></li></ul></section>')
    return f'<aside class="col" aria-label="Concluir e como funciona">{extra}{c}{exp}</aside>'


def pagina(faixa='', topo_html='', concluir=True, falta=True, todas=False, editar=True, lat_extra='', depois=False, whats=False):
    t = 6 if todas else 4
    return (f'<div class="grade"><div class="col">{faixa}{LEITURA}{topo_html}{feito(t, whats)}{pessoas(todas)}{treinos(todas, editar, depois)}</div>'
            f'{lateral(concluir, falta, lat_extra)}</div>')


TOPO_ABERTA = topo('19', 'im-d-ok', 'até 16/12/2026', 'faltam 19 dias · hoje é 27/11/2026')
TOPO_PRONTA = topo('9', 'im-d-ok', 'até 16/12/2026', 'faltam 9 dias · hoje é 07/12/2026')
TOPO_PERTO = topo('7', 'im-d-atencao', 'até 16/12/2026', 'faltam 7 dias · hoje é 09/12/2026',
                  f'<span class="selo selo-atencao">{ico("relogio")}Faltam 7 dias</span>')
TOPO_HOJE = topo('0', 'im-d-urg', 'vence hoje, 16/12/2026', 'prazo de 30 dias', f'<span class="selo selo-urgente">{ico("alerta")}Vence hoje</span>')
TOPO_PASSOU = topo('+5', 'im-d-urg', 'venceu em 16/12/2026', 'passou há 5 dias · hoje é 21/12/2026', f'<span class="selo selo-urgente">{ico("alerta")}Passou do prazo</span>')

FX_PERTO = aviso('atencao', 'Faltam 7 dias para o prazo, e 2 pessoas estão sem treino.',
                 'Tiago Ramos e Diego Alves. O sino avisou você e Rafael Teles hoje; o próximo aviso sai a 3 dias do prazo.', cls='im-novo')
FX_HOJE = aviso('urgencia', 'O prazo da implantação vence hoje.',
                'Conclua a implantação, se o escritório já está usando, ou mude o prazo com o motivo. Amanhã nada muda sozinho: o cliente continua em implantação.',
                acoes=f'<a class="btn btn-pri btn-compacto im-so-edita" href="?aba=implantacao&amp;estado=im-concluir">{ico("check", "ico ico-s")}Concluir a implantação</a>'
                      f'<button class="btn btn-sec btn-compacto so-admin" type="button" data-janela="janela-prazo">{ico("prazo", "ico ico-s")}Mudar o prazo</button>', cls='im-novo')
FX_PASSOU = aviso('urgencia', 'O prazo passou em 16/12/2026, há 5 dias.',
                  'O cliente continua em implantação: nada passa para Ativo sozinho. Conclua, ou peça à Administração para mudar o prazo com o motivo. A promessa ao escritório é de até 30 dias.',
                  acoes=f'<a class="btn btn-pri btn-compacto im-so-edita" href="?aba=implantacao&amp;estado=im-concluir">{ico("check", "ico ico-s")}Concluir a implantação</a>'
                        f'<button class="btn btn-sec btn-compacto so-admin" type="button" data-janela="janela-prazo">{ico("prazo", "ico ico-s")}Mudar o prazo</button>', cls='im-novo')

# ---------------------------------------------------------------- janelas
PESS_TREINO = [(n, ('ainda não entrou no Portal' if n == 'Diego Alves' else ((tr.lower() + ' em ' + d.split(' ·')[0]) if ok else 'sem treino')))
               for _, n, _, _, _, tr, d, ok in PESSOAS]


def janela_treino(erros=False):
    resumo = aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'Nada foi registrado ainda.') if erros else ''
    dia = campo('tr-dia', 'Dia do treino', '30/11/2026' if erros else '27/11/2026', 'dd/mm/aaaa. Hoje ou antes.',
                'O treino precisa ser de hoje ou de antes. Para combinar um treino futuro, use a Agenda.' if erros else '', modo='numeric', foco=erros)
    dur = campo('tr-dur', 'Duração, em minutos', '5' if erros else '60', 'De 15 a 480 minutos (8 horas).',
                'Escreva entre 15 e 480 minutos.' if erros else '', modo='numeric')
    forma = radios('tr-forma', 'Forma', [('Vídeo', 'Por videochamada'), ('Presencial', 'No escritório'), ('Telefone', 'Por ligação')], 'Vídeo', cls='im-inteira')
    pess = marcas('tr-pess', 'Quem participou', [(n, d, (not erros) and n == 'Tiago Ramos') for n, d in PESS_TREINO], cls='im-inteira',
                  erro='Marque pelo menos uma pessoa.' if erros else '', ajuda='Só aparece quem tem acesso ao Portal da Cedro &amp; Lima.')
    temas = marcas('tr-temas', 'Temas', [(t, '', t in ('Jurídico', 'Agenda')) for t in TEMAS], cls='im-inteira', colunas=3,
                   ajuda='As áreas do Portal que o treino cobriu.')
    autor = f'<div class="im-autor im-inteira"><span class="av-p" aria-hidden="true">RT</span><span>Dado por <b>Rafael Teles (você)</b>. O nome vem da sua sessão.</span></div>'
    corpo = f'{resumo}<div class="im-janela-grade">{dia}{dur}{forma}{pess}{temas}{autor}</div>'
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit"{"" if erros else " data-foco"}>{ico("check")}Registrar o treino</button>'
    return janela('janela-treino', 'Implantação · Cedro &amp; Lima', 'Registrar treino',
                  'Depois de registrado, o treino não se edita. Se algo sair errado, use “Desfazer registro”, com o motivo.', corpo, pe, cls='im-larga')


def janela_desfazer():
    t = TREINOS[0]
    corpo = (f'<ul class="im-conta-l"><li><span>Treino</span><b>{t["data"]} · {t["forma"]}, {t["dur"]}</b></li><li><span>Quem participou</span><b>{t["pessoas"]}</b></li>'
             f'<li><span>Dado por</span><b>{t["por"]}</b></li></ul>'
             + campo('df-motivo', 'Motivo', '', 'Obrigatório. Fica no histórico interno do cliente, com o seu nome e a hora.', area=True, linhas=3, cont='0 de 300'))
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Voltar</button>'
          f'<button class="btn btn-perigo" type="submit">{ico("desfazer")}Desfazer o registro</button>')
    return janela('janela-desfazer', 'Implantação · Cedro &amp; Lima', 'Desfazer o registro do treino de 24/11?',
                  'O registro não é apagado: fica na lista, riscado, com o motivo. Juliana Prado e Joana Freitas voltam a contar como sem treino, se não tiverem outro.',
                  corpo, pe, alerta=True)


def janela_trocar():
    op = [('Rafael Teles', 'RT', 'Implantação · acompanha hoje', True), ('Carol Andrade', 'CA', 'Administração', False)]
    r = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="tc-resp"{" checked" if c else ""}{" data-foco" if c else ""}>'
                f'<span class="im-o"><span class="av-p" aria-hidden="true">{i}</span><span>{n}<small>{d}</small></span></span></label>' for n, i, d, c in op)
    corpo = (f'<fieldset class="grupo-opcoes im-grupo im-opcoes-resp" aria-describedby="tc-ajuda"><legend>Quem acompanha</legend>{r}'
             f'<p class="ajuda" id="tc-ajuda">Só aparece quem atende a Cedro &amp; Lima com a função Implantação ou Administração. Para incluir alguém, atribua na aba Equipe T3jus.</p></fieldset>'
             + aviso('info', 'A pessoa nova recebe os avisos do prazo no sino.', 'Os sócios veem no Portal o nome de quem acompanha.'))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("trocar")}Trocar</button>'
    return janela('janela-trocar', 'Implantação · Cedro &amp; Lima', 'Trocar quem acompanha', 'Quem acompanha combina os treinos e responde ao escritório durante a implantação.', corpo, pe)


def janela_prazo():
    corpo = ('<ul class="im-conta-l"><li><span>Prazo de hoje</span><b>16/12/2026</b></li><li class="im-sub"><span>Aberta em 16/11/2026 · 30 dias</span><span></span></li></ul>'
             + '<div class="im-janela-grade">' + campo('pz-novo', 'Novo prazo', '23/12/2026', 'dd/mm/aaaa. Depois de hoje.', modo='numeric', foco=True)
             + campo('pz-motivo', 'Motivo', 'A sócia pediu para treinar o Tiago e o Diego depois da audiência do dia 15.',
                     'Obrigatório. Fica no histórico interno do cliente; o escritório não vê o motivo.', area=True, linhas=3, cont='74 de 300', cls='im-inteira') + '</div>'
             + aviso('info', 'Os avisos do sino passam a contar do prazo novo.', 'No Portal, os sócios veem a data nova.'))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("prazo")}Mudar o prazo</button>'
    return janela('janela-prazo', 'Implantação · Cedro &amp; Lima', 'Mudar o prazo da implantação', 'Só a Administração muda o prazo.', corpo, pe)


CONTA_ISENTA = (f'<ul class="im-conta-l so-fin" aria-label="1ª fatura, janeiro de 2027">'
                f'<li><span>Mensalidade do plano Escritório · janeiro de 2027</span><b>{brl(MENSAL)}</b></li>'
                f'<li class="im-neg"><span>Desconto de entrada (20% da mensalidade)</span><b>{brl(-DESC)}</b></li>'
                f'<li><span>Implantação assistida · {DESCR}</span><b>{brl(VALOR)}</b></li>'
                f'<li class="im-neg"><span>Isenção da implantação · {ISENCAO_TXT}</span><b>{brl(-VALOR)}</b></li>'
                f'<li class="im-tot"><span>Total da 1ª fatura</span><b>{brl(TOTAL_ISENTA)}</b></li></ul>')
SEM_VALOR = '<p class="im-peq msg-nao-fin">Os valores ficam com a Administração e o Financeiro.</p>'


def janela_concluir(co09=False, conflito=False):
    conf = ''
    if conflito:
        conf = aviso('urgencia', 'Carol Andrade mudou o prazo às 14h32, enquanto esta janela estava aberta.',
                     'Nada foi concluído. O resumo que você escreveu continua aqui. Confira a mudança e conclua de novo.',
                     extra='<table class="comparar"><caption class="sr">O que mudou</caption><thead><tr><th scope="col">Campo</th><th scope="col">Salvo agora</th><th scope="col">O que você via</th></tr></thead>'
                           '<tbody><tr><th scope="row">Prazo</th><td>23/12/2026</td><td>16/12/2026</td></tr></tbody></table><p class="im-peq" style="margin-top:6px">CONFLITO_VERSAO</p>')
    passagem = f'<div class="passagem" aria-hidden="true"><span class="selo selo-implant">Em implantação</span>{ico("seta")}<span class="selo selo-ativo"><span class="bolinha"></span>Ativo</span></div>'
    resumo = campo('cc-resumo', 'Resumo para o escritório',
                   'Treinamos as 6 pessoas do escritório em 4 encontros, 5h30 no total. A planilha do Astrea entrou com 214 clientes e o WhatsApp foi ligado em 04/12. '
                   'Nas próximas semanas, Rafael segue à disposição pela Ajuda do Portal.',
                   'Os sócios leem este resumo no Portal, em Escritório › Implantação. Até 2.000 caracteres.', area=True, linhas=4, cont='253 de 2.000', foco=not conflito)
    if co09:
        ef = (f'<div class="im-efeito"><h3>{ico("fatura")}Na cobrança, nada muda</h3>'
              f'<p>Com o teste grátis (CO-09), a cobrança já começou na assinatura, em <b>03/12/2026</b>. A 1ª fatura, de <b>janeiro de 2027</b> (nº 2027/0004), já traz a implantação e a isenção.</p>'
              f'{CONTA_ISENTA}{SEM_VALOR}</div>')
    else:
        ef = (f'<div class="im-efeito"><h3>{ico("fatura")}Na cobrança</h3>'
              f'<p>A cobrança começa <b>hoje</b>. A 1ª fatura, de <b>janeiro de 2027</b>, sai hoje, vence em <b>10/01/2027</b> e traz a implantação com a isenção.</p>'
              f'{CONTA_ISENTA}{SEM_VALOR}</div>')
    corpo = conf + passagem + resumo + ef
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar{" data-foco" if conflito else ""}>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Concluir e passar para Ativo</button>')
    return janela('janela-concluir', 'Implantação · Cedro &amp; Lima', 'Concluir a implantação da Cedro &amp; Lima?',
                  'A implantação termina e o cliente passa para Ativo. Não dá para voltar pelo Console. O motivo do estágio fica “Implantação concluída”, no histórico.',
                  corpo, pe, alerta=True, cls='im-larga')


# ---------------------------------------------------------------- estados da aba Implantação
T = ''
T += tpl('implantacao:im-aberta', pagina(topo_html=TOPO_ABERTA) + janela_treino().replace(' data-abrir', '') + janela_desfazer().replace(' data-abrir', '')
         + janela_trocar().replace(' data-abrir', '') + janela_prazo().replace(' data-abrir', ''), cab='im-pronto', sem_alerta=True)
T += tpl('implantacao:im-perto', pagina(FX_PERTO, TOPO_PERTO), cab='im-perto', sem_alerta=True)
T += tpl('implantacao:im-hoje', pagina(FX_HOJE, TOPO_HOJE), cab='im-hoje', sem_alerta=True)
T += tpl('implantacao:im-passou', pagina(FX_PASSOU, TOPO_PASSOU), cab='im-passou', sem_alerta=True)
T += tpl('implantacao:im-registrar', pagina(topo_html=TOPO_ABERTA) + janela_treino(), cab='im-pronto', sem_alerta=True)
T += tpl('implantacao:im-registrar-erros', pagina(topo_html=TOPO_ABERTA) + janela_treino(True), cab='im-pronto', sem_alerta=True)
T += tpl('implantacao:im-desfazer', pagina(topo_html=TOPO_ABERTA) + janela_desfazer(), cab='im-pronto', sem_alerta=True)
T += tpl('implantacao:im-trocar', pagina(topo_html=TOPO_ABERTA) + janela_trocar(), cab='im-pronto', sem_alerta=True)
T += tpl('implantacao:im-prazo', pagina(topo_html=TOPO_ABERTA) + janela_prazo(), cab='im-pronto', sem_alerta=True)
PRONTA = pagina(topo_html=TOPO_PRONTA, falta=False, todas=True, whats=True)
T += tpl('implantacao:im-pronta', PRONTA, cab='im-pronta', sem_alerta=True)
T += tpl('implantacao:im-concluir', PRONTA + janela_concluir(), cab='im-pronta', sem_alerta=True)
T += tpl('implantacao:im-concluir-co09', PRONTA + janela_concluir(co09=True), cab='im-pronta', sem_alerta=True)
T += tpl('implantacao:im-concluir-conflito', PRONTA + janela_concluir(conflito=True), cab='im-pronta', sem_alerta=True)

# Concluída
RESUMO = ('Treinamos as 6 pessoas do escritório em 4 encontros, 5h30 no total. A planilha do Astrea entrou com 214 clientes e o WhatsApp foi ligado em 04/12. '
          'Nas próximas semanas, Rafael segue à disposição pela Ajuda do Portal.')
COND_FAT = (f'<p><span class="selo selo-isenta">{ico("isencao")}Isenta · {ISENCAO_TXT}</span></p>'
            f'<p class="im-valor-linha so-fin"><b>{brl(VALOR)}</b> e a isenção de <b>{brl(-VALOR)}</b>, na <a href="cobranca.html?aba=fatura&amp;estado=im-fatura-isenta">fatura de janeiro de 2027</a>.</p>'
            f'<p class="im-peq msg-nao-fin">Faturada na 1ª fatura, de janeiro de 2027.</p>')
TOPO_CONCL = topo('', '', 'concluída em 07/12/2026', '9 dias antes do prazo (16/12/2026)', f'<span class="selo selo-ativo">{ico("check")}Concluída</span>',
                  sub='Nº 1 · aberta em 16/11/2026 e concluída por Rafael Teles em 07/12/2026, ao passar o cliente para Ativo.', acoes=False, cond=COND_FAT)
RES_SEC = (f'<section class="folha im-novo" aria-labelledby="t-res"><div class="im-cab-folha"><div><h2 id="t-res">Resumo da conclusão</h2>'
           f'<p class="sub">Os sócios leem este texto no Portal, em Escritório › Implantação.</p></div></div><div class="im-resumo-sec"><p class="im-resumo">“{RESUMO}”</p>'
           f'<p class="im-resumo-pe">Rafael Teles · 07/12/2026, às 16h05</p></div></section>')
T += tpl('implantacao:im-concluida',
         f'<div class="grade"><div class="col">{LEITURA}{TOPO_CONCL}{RES_SEC}{feito(6, True)}{pessoas(True)}{treinos(True, True, depois=True)}</div>{lateral(False)}</div>'
         + janela_treino().replace(' data-abrir', ''), cab='im-ativo', sem_alerta=True)

# Cancelada (fim do contrato)
TOPO_CANC = topo('', '', 'cancelada em 30/11/2026', 'no dia do fim do contrato', f'<span class="selo selo-cancelada">{ico("x")}Cancelada</span>',
                 sub='Nº 1 · aberta em 16/11/2026 e cancelada sozinha quando o contrato terminou, em 30/11/2026.', acoes=False,
                 cond=f'<p><span class="selo selo-isenta">{ico("isencao")}Isenta · {ISENCAO_TXT}</span></p><p class="im-peq">Não chegou a nenhuma fatura.</p>')
FX_CANC = aviso('info', 'A implantação foi cancelada com o fim do contrato.',
                'O motivo está no histórico do encerramento. Os treinos ficam aqui, só para leitura. Se o contrato for reaberto ainda em implantação, abre uma implantação nova, a nº 2, com a regra do dia.',
                icone='historico', cls='im-novo')
T += tpl('implantacao:im-cancelada', f'<div class="grade"><div class="col">{FX_CANC}{TOPO_CANC}{feito(4)}{pessoas()}{treinos(editar=False)}</div>{lateral(False)}</div>',
         cab='fc-encerrado', sem_alerta=True)

# Carregando, erro, sem permissão
ESQ = ('<div aria-busy="true"><p class="sr" role="status">Carregando a implantação…</p><div aria-hidden="true"><div class="grade"><div class="col">'
       '<section class="folha" style="padding:24px;display:grid;gap:18px"><span class="esqueleto esq-linha" style="width:40%;height:22px"></span>'
       '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px"><span class="esqueleto" style="height:84px"></span><span class="esqueleto" style="height:84px"></span><span class="esqueleto" style="height:84px"></span></div></section>'
       '<section class="folha" style="padding:24px;display:grid;gap:14px"><span class="esqueleto esq-linha" style="width:30%;height:20px"></span>'
       + ''.join('<div style="display:flex;gap:14px;align-items:center"><span class="esqueleto" style="width:40px;height:40px;border-radius:50%;flex:none"></span><div style="flex:1;display:grid;gap:8px"><span class="esqueleto esq-linha" style="width:45%;height:12px"></span><span class="esqueleto esq-linha" style="width:75%;height:10px"></span></div></div>' for _ in range(4))
       + '</section></div><aside class="col"><section class="folha" style="padding:20px;display:grid;gap:12px"><span class="esqueleto esq-linha" style="width:50%;height:18px"></span><span class="esqueleto esq-linha" style="width:100%;height:44px"></span></section></aside></div></div></div>')
T += tpl('implantacao:im-carregando', ESQ, cab='im-pronto', sem_alerta=True)
T += tpl('implantacao:im-erro', estado('Não deu para carregar a implantação deste cliente',
                                       'O servidor não respondeu. Os treinos e o prazo continuam salvos. Tente de novo; se continuar, mande o código abaixo ao suporte.',
                                       acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>', codigo='Código para o suporte: CNS-1183-0427'),
         cab='im-pronto', sem_alerta=True)
T += tpl('implantacao:im-sem-permissao', estado('Você não atende a Cedro &amp; Lima',
                                                'Só quem está na Equipe T3jus deste cliente vê a implantação. Se você precisa ajudar este escritório, peça à Administração para atribuir você.',
                                                icone='cadeado', erro=False, acoes=f'<a class="btn btn-sec" href="carteira.html">{ico("esq")}Voltar à carteira</a>',
                                                codigo='SEM_PERMISSAO'), sem_abas=True)

# ---------------------------------------------------------------- aba Contrato: o botão leva à aba Implantação
CONTRATO = corpo_tpl(BASE, '<template data-est="contrato:ver"')
LI_ANT = 'Para passar a Ativo, o escritório precisa ter sócio.'
assert LI_ANT in CONTRATO
CONTRATO = CONTRATO.replace(LI_ANT, 'Para passar a Ativo, conclua a implantação na aba Implantação, com o resumo para o escritório e o efeito na cobrança.')
FX_CONTR = aviso('info', 'Passar para Ativo agora é “Concluir a implantação”.',
                 'O botão do cabeçalho leva à aba Implantação, que pede o resumo e mostra o que acontece na cobrança. Quem passa para Ativo por outro caminho também conclui a implantação.',
                 acoes=f'<a class="btn btn-sec btn-compacto im-so-edita" href="?aba=implantacao&amp;estado=im-concluir">{ico("check", "ico ico-s")}Concluir a implantação</a>',
                 cls='im-novo')
CONTRATO = CONTRATO.replace('<div class="grade"><div class="col">', '<div class="grade"><div class="col">' + FX_CONTR, 1)
T += tpl('contrato:im-contrato', CONTRATO.replace('<h2 id="t-como">', '<h2 id="t-como" class="im-h2">'), cab='im-pronto', sem_alerta=True)

# ---------------------------------------------------------------- aba Assinatura: o bloco da implantação


def bloco_ass(tipo):
    lnk = f'<a class="btn btn-sec btn-compacto" href="?aba=implantacao&amp;estado=im-aberta">{ico("coluna", "ico ico-s")}Ver a implantação</a>'
    if tipo == 'isenta':
        selo = f'<span class="selo selo-isenta">{ico("isencao")}Isenta · {ISENCAO_TXT}</span>'
        c = (f'<p><b>Na 1ª fatura</b>, quando a cobrança começar: a linha da implantação e a da isenção, que somam zero.</p>'
             f'<ul class="im-conta-l so-fin"><li><span>Implantação assistida · {DESCR}</span><b>{brl(VALOR)}</b></li>'
             f'<li class="im-neg"><span>Isenção da implantação · {ISENCAO_TXT}</span><b>{brl(-VALOR)}</b></li><li class="im-tot"><span>Efeito na 1ª fatura</span><b>R$ 0,00</b></li></ul>'
             f'<p class="im-peq">Aberta em 16/11/2026, com a regra do dia. Prazo: 16/12/2026.</p>')
    elif tipo == 'faturada':
        selo = f'<span class="selo selo-isenta">{ico("isencao")}Isenta · {ISENCAO_TXT}</span>'
        c = (f'<p><b>Na fatura de janeiro de 2027</b> (<a href="cobranca.html?aba=fatura&amp;estado=im-fatura-isenta">ver</a>), a 1ª, emitida em 07/12/2026.</p>'
             f'<ul class="im-conta-l so-fin"><li><span>Implantação assistida</span><b>{brl(VALOR)}</b></li>'
             f'<li class="im-neg"><span>Isenção da implantação · {ISENCAO_TXT}</span><b>{brl(-VALOR)}</b></li></ul>'
             f'<p class="im-peq">Concluída em 07/12/2026. A implantação só entra na 1ª fatura; as próximas não a trazem.</p>')
    elif tipo == 'cobrada':
        selo = f'<span class="selo selo-cobrada">{ico("fatura")}Cobrada à vista</span>'
        c = (f'<p><b>Na 1ª fatura</b>, à vista, por Pix ou boleto. Sem parcelamento nesta versão.</p>'
             f'<ul class="im-conta-l so-fin"><li><span>Implantação assistida · {DESCR}</span><b>{brl(VALOR)}</b></li></ul>'
             f'<p class="im-peq">Aberta em 16/01/2027, depois do fim da isenção. O desconto de entrada vale só sobre a mensalidade, nunca sobre a implantação.</p>')
    else:  # carnê recusado
        selo = f'<span class="selo selo-cobrada">{ico("fatura")}Cobrada à vista</span>'
        c = (aviso('urgencia', 'Com Carnê, a 1ª fatura desta assinatura não sai.',
                   'A implantação deste escritório é cobrada à vista, e o carnê ainda não leva a implantação. Ao concluir a implantação ou gerar o carnê, o sistema recusa. '
                   'Mude a forma de pagamento para Pix ou boleto.',
                   acoes=f'<a class="btn btn-pri btn-compacto so-fin" href="?aba=assinatura&amp;estado=im-ass-salvar-carne">{ico("lapis", "ico ico-s")}Mudar a forma de pagamento</a>',
                   extra='<p class="im-peq" style="margin-top:6px">IMPLANTACAO_COBRADA_NO_CARNE</p>')
             + f'<ul class="im-conta-l so-fin"><li><span>Implantação assistida · {DESCR}</span><b>{brl(VALOR)}</b></li></ul>')
    return (f'<section class="im-ass im-novo" aria-labelledby="t-im-ass"><div class="im-ass-cab"><h3 id="t-im-ass">{ico("coluna")}Implantação assistida {selo}</h3>{lnk}</div>'
            f'<div class="im-ass-corpo">{c}</div></section>')


def assinatura(tipo, forma='Pix', ativo=False, faturas=''):
    sub = ('Desde 07/12/2026. A cobrança começou quando o cliente passou para Ativo.' if ativo else
           'Preparada em 20/11/2026. A cobrança começa quando o cliente passar para Ativo.')
    forma_d = {'Pix': 'Pix <span class="cb-peq">o boleto vai junto, como alternativa</span>',
               'Carnê': 'Carnê <span class="cb-peq">12 parcelas, cada uma com Pix e boleto · salvo em 20/11/2026</span>'}[forma]
    inicio = '07/12/2026 <span class="cb-peq">quando passou para Ativo</span>' if ativo else 'Quando passar para Ativo <span class="cb-peq">sem fatura antes disso</span>'
    dl = (f'<dl class="dados-ficha"><div><dt>Plano</dt><dd><span class="cb-plano-nome">Escritório</span><span class="selo selo-neutro">até 8 pessoas</span></dd></div>'
          f'<div class="so-fin"><dt>Mensalidade</dt><dd>{brl(MENSAL)} por mês<span class="cb-peq">preço de quando assinou</span></dd></div>'
          f'<div><dt>Pessoas ativas hoje</dt><dd>6 de 8</dd></div><div><dt>Dia de vencimento</dt><dd>Todo dia 10</dd></div>'
          f'<div class="so-fin"><dt>Forma de pagamento</dt><dd>{forma_d}</dd></div><div><dt>Início da cobrança</dt><dd>{inicio}</dd></div>'
          f'<div class="so-fin"><dt>Desconto de entrada</dt><dd>20% da mensalidade <span class="cb-peq">nas 3 primeiras faturas · CO-10</span></dd></div>'
          f'<div class="inteira so-fin"><dt>E-mail de cobrança</dt><dd>financeiro@cedrolima.exemplo.com.br <span class="cb-peq">com cópia para Renata Lima, sócia dona</span></dd></div></dl>')
    sover = (f'<p class="cb-so-ver msg-nao-fin">{ico("olho")}<span>Você vê o plano, a situação da cobrança e a condição da implantação. '
             f'Valores, faturas e mudanças ficam com a Administração e o Financeiro.</span></p>')
    acoes = (f'<div class="acoes so-fin"><a class="btn btn-sec" href="?aba=assinatura&amp;estado=im-ass-salvar-carne">{ico("lapis")}Editar</a></div>')
    sec = (f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="cb-ass-topo"><div><h2 id="t-ass">Assinatura</h2><p class="sub">{sub}</p></div>{acoes}</div>'
           f'{dl}{bloco_ass(tipo)}{sover}</section>')
    if ativo:
        situ = (f'<p><span class="selo selo-ok">{ico("check")}Em dia</span></p><p class="cb-grande so-fin">{brl(TOTAL_ISENTA)}</p>'
                f'<p>Próxima fatura: <b>janeiro de 2027</b>, vence em <b>10/01/2027</b>. É a primeira; traz a implantação com a isenção.</p>')
    else:
        situ = (f'<p><span class="selo selo-neutro">{ico("relogio")}Sem fatura ainda</span></p>'
                f'<p>A 1ª fatura sai quando o cliente passar para Ativo. Com o teste grátis (CO-09), sai na assinatura.</p>')
    aside = (f'<aside class="col" aria-label="Situação da cobrança"><section class="folha" aria-labelledby="t-situ"><div class="folha-cab" style="padding-bottom:6px">'
             f'<h2 id="t-situ" style="font-size:20px">Situação da cobrança</h2></div><div class="cb-situ">{situ}</div></section></aside>')
    return f'<div class="grade"><div class="col">{sec}{faturas}</div>{aside}</div>'


FAT_JAN = (f'<section class="folha so-fin" aria-labelledby="t-fats" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-fats">Faturas do escritório</h2>'
           f'<p class="sub">Da mais nova para a mais antiga.</p></div></div><table class="cb-tab so-pc"><caption class="sr">Faturas da Cedro e Lima</caption>'
           f'<colgroup><col><col style="width:120px"><col style="width:116px"><col style="width:190px"><col style="width:64px"></colgroup><thead><tr><th scope="col">Competência</th>'
           f'<th scope="col" class="cb-valor">Valor</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col"><span class="sr">Ações</span></th></tr></thead>'
           f'<tbody><tr><td><strong style="font-weight:500">janeiro/2027</strong></td><td class="cb-valor">{brl(TOTAL_ISENTA)}</td><td class="num">10/01/2027</td>'
           f'<td><div class="cb-sit"><span class="selo selo-ok">{ico("agenda")}A vencer</span><small>a primeira · com a implantação</small></div></td>'
           f'<td><div class="cb-acoes-linha"><a class="cb-ir" href="cobranca.html?aba=fatura&amp;estado=im-fatura-isenta" aria-label="Abrir a fatura de janeiro/2027">{ico("dir")}</a></div></td></tr></tbody></table>'
           f'<ul class="cb-cartoes so-cel" aria-label="Faturas da Cedro e Lima"><li class="cb-cartao"><div class="cb-c-topo"><div><strong class="cb-c-nome">janeiro/2027</strong>'
           f'<small>vence em 10/01/2027</small></div><span class="cb-c-valor">{brl(TOTAL_ISENTA)}</span></div><div class="cb-sit"><span class="selo selo-ok">{ico("agenda")}A vencer</span>'
           f'<small>a primeira · com a implantação</small></div><div class="cb-c-acoes"><a class="btn btn-sec" href="cobranca.html?aba=fatura&amp;estado=im-fatura-isenta">{ico("fatura")}Abrir a fatura<span class="sr"> de janeiro/2027</span></a></div></li></ul></section>')

T += tpl('assinatura:im-ass-isenta', assinatura('isenta'), cab='im-pronto', sem_alerta=True)
T += tpl('assinatura:im-ass-faturada', assinatura('faturada', ativo=True, faturas=FAT_JAN), cab='im-ativo', sem_alerta=True)
T += tpl('assinatura:im-ass-cobrada', assinatura('cobrada'), cab='im-pronto', sem_alerta=True)
T += tpl('assinatura:im-ass-carne-recusa', assinatura('carne', forma='Carnê'), cab='im-pronto', sem_alerta=True)

# Editar com Carnê e implantação cobrada: o erro ao salvar
ED = (f'<div class="grade"><div class="col"><section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="cb-ass-topo"><div><h2 id="t-ass">Editar a assinatura</h2>'
      f'<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div><div class="form-folha">'
      f'<div class="c6">{aviso("urgencia", "Não deu para salvar: Carnê não combina com a implantação cobrada.", "A implantação da Cedro &amp; Lima é cobrada à vista na 1ª fatura (R$ 1.490,00), e o carnê ainda não leva a implantação. Escolha Pix ou Boleto. Nada foi salvo.", extra="<p class=im-peq style=margin-top:6px>IMPLANTACAO_COBRADA_NO_CARNE</p>", cls="im-novo")}</div>'
      f'<div class="campo c6"><span style="font-size:13px;font-weight:500">Plano</span><p style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="cb-plano-nome">Escritório</span>'
      f'<span class="cb-peq">{brl(MENSAL)} por mês, até 8 pessoas</span></p></div>'
      f'<div class="campo c3"><label for="as-dia">Dia de vencimento</label><select class="entrada" id="as-dia" name="as-dia"><option>5</option><option selected>10</option><option>15</option><option>20</option><option>25</option></select></div>'
      f'<fieldset class="grupo-opcoes c3 im-novo" aria-describedby="as-forma-erro"><legend>Forma de pagamento</legend>'
      f'<label class="opcao"><input class="marcar" type="radio" name="as-forma"><span>Pix<small>O boleto vai junto, como alternativa</small></span></label>'
      f'<label class="opcao"><input class="marcar" type="radio" name="as-forma"><span>Boleto<small>O Pix vai junto, como alternativa</small></span></label>'
      f'<label class="opcao"><input class="marcar" type="radio" name="as-forma" checked data-foco><span>Carnê<small>12 parcelas iguais, de uma vez, cada uma com Pix e boleto</small></span></label>'
      f'<p class="erro-msg" id="as-forma-erro">{ico("alerta", "ico ico-s")}Com a implantação cobrada, a 1ª fatura sai por Pix ou boleto. O carnê fica para depois (pendente F1.49).</p></fieldset>'
      f'<div class="campo c3"><label for="as-email">E-mail de cobrança</label><input class="entrada" id="as-email" name="as-email" type="email" value="financeiro@cedrolima.exemplo.com.br" autocomplete="off"></div>'
      f'<div class="form-pe"><a class="btn btn-fantasma" href="?aba=assinatura&amp;estado=im-ass-cobrada">Cancelar</a><button class="btn btn-pri" type="button">{ico("check")}Salvar a assinatura</button></div></div></section></div>'
      f'<aside class="col" aria-label="Implantação"><section class="folha" aria-labelledby="t-im-lat"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-im-lat" style="font-size:20px">Implantação</h2></div>'
      f'<div class="cb-situ"><p><span class="selo selo-cobrada">{ico("fatura")}Cobrada à vista</span></p><p class="cb-grande">{brl(VALOR)}</p>'
      f'<p>Entra inteira na 1ª fatura, por Pix ou boleto. Parcelar e o carnê com a implantação ficam no item pendente F1.49.</p></div></section></aside></div>')
T += tpl('assinatura:im-ass-salvar-carne', ED, cab='im-pronto', sem_alerta=True)

# ---------------------------------------------------------------- sino (Console): na aba Implantação, como Carol e como Rafael
T += tpl('implantacao:im-sino', pagina(FX_PERTO, TOPO_PERTO), cab='im-perto', sem_alerta=True)

# ---------------------------------------------------------------- montar
ABA_NOVA = '<a data-aba="assinatura" href="?aba=assinatura">Assinatura</a>'
assert ABA_NOVA in BASE
CSS_ABAS = '\n.abas a[data-aba="implantacao"]{position:relative}\n@media (max-width:760px){.abas a[data-aba="historico"]{grid-column:auto}}\n'
s = montar(BASE, CSS_IM + CSS_ABAS + SINO_CSS + SINO_CHIPS, CABS + T + sino_templates_ficha() + SINO_DIALOG,
           trocas=[(ABA_NOVA, '<a data-aba="implantacao" href="?aba=implantacao">Implantação</a>' + ABA_NOVA)],
           js=sino_script())
sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
if 'id="i-checks"' not in s:
    s = s.replace(sp, sp + SINO_SIMB, 1)
s = s.replace('<title>', '<title>', 1)
open(os.path.join(SAIDA, 'ficha.html'), 'w', encoding='utf-8').write(s)
print('ficha ok:', T.count('<template data-est='), 'estados')
