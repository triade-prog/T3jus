# Console · o teste grátis na ficha (aba Assinatura, Histórico e Notas), na carteira e no sino (CO-09, D42).
# Base: docs/design/aprovadas/console-cobranca/ficha.html e carteira.html, lidas sem mudança.
# Relógio fixo: quarta-feira, 02/12/2026, 9h40 (Bahia). Uso: python3 console_tg.py <pasta-saida>
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum_tg import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
FICHA = open(COB + 'ficha.html', encoding='utf-8').read()
F = 'ficha.html?aba=assinatura&amp;estado='

# ---------------------------------------------------------------- os escritórios do exemplo
CEDRO = ('Cedro &amp; Lima Advocacia', 'Recife, PE', '22.914.870/0001-09', '04/11/2026')


def selo(tipo, texto, icone):
    return f'<span class="selo selo-{tipo}">{ico(icone)}{texto}</span>'


S_PREV = selo('previsto', 'Teste previsto', 'ampulheta')
S_T6 = selo('teste', 'Em teste · dia 6 de 7', 'ampulheta')
S_T9 = selo('teste', 'Em teste · dia 9 de 11, prorrogado', 'mais-dias')
S_QUER = selo('quer', 'Quer assinar', 'assinar')
S_ACABOU = selo('acabou', 'Teste acabou em 29/11 · sem assinar', 'alerta')
S_REP = selo('repetido', 'Teste repetido · decidir', 'repetido')
S_DISP = selo('dispensado', 'Teste dispensado', 'dispensar')
S_ASS = selo('assinado', 'Assinado · teste até 03/12', 'check')


def _cab(nome):
    c = bloco(FICHA, f'<template data-cab="{nome}"')
    return c[c.index('>') + 1:]


CAB_IMPL, CAB_PRONTO, CAB_ATIVO = _cab('impl'), _cab('pronto'), _cab('ativo')
ETAPAS = ['Ficha', 'Contrato', 'Equipe', 'Sócio no Portal']


def cab(nome, cidade, cnpj_, desde, selo_teste, falta=None, dica='', base=None):
    """Abertura aprovada da ficha com outro escritório e o selo do teste. falta = etapa que falta (None = 4 de 4)."""
    c = base or (CAB_PRONTO if falta is None else CAB_IMPL)
    c = (c.replace('Cedro &amp; Lima Advocacia', nome).replace('<span>Recife, PE</span>', selo_teste + f'<span>{cidade}</span>')
         .replace('22.914.870/0001-09', cnpj_).replace('desde 04/11/2026', f'desde {desde}'))
    if falta is not None and base is None:
        lis = ''.join(f'<li{" class=" + chr(34) + "agora" + chr(34) if e == falta else ""}><span class="b" aria-hidden="true"></span>{e}'
                      f'<span class="sr">: {"falta" if e == falta else "resolvido"}</span></li>' for e in ETAPAS)
        c = re.sub(r'<ol class="etapas">.*?</ol>', f'<ol class="etapas">{lis}</ol>', c, count=1, flags=re.S)
        c = c.replace('Libera quando a sócia entrar no Portal.', dica)
    return c


CABS = {
    'tg-cedro': cab(*CEDRO, S_PREV, falta='Sócio no Portal', dica='Libera quando a sócia entrar no Portal.'),
    'tg-ribeiro': cab('Ribeiro &amp; Matos Advocacia', 'São Paulo, SP', '41.208.553/0001-62', '10/11/2026', S_T6),
    'tg-ribeiro-quer': cab('Ribeiro &amp; Matos Advocacia', 'São Paulo, SP', '41.208.553/0001-62', '10/11/2026', S_T6 + S_QUER),
    'tg-ribeiro-ass': cab('Ribeiro &amp; Matos Advocacia', 'São Paulo, SP', '41.208.553/0001-62', '10/11/2026', S_ASS),
    'tg-sucupira': cab('Sucupira Advocacia Familiar', 'Porto Alegre, RS', '30.517.904/0001-71', '09/11/2026', S_T9, falta='Ficha',
                       dica='Libera quando a ficha tiver um contato.'),
    'tg-ipe': cab('Ipê Advocacia', 'Brasília, DF', '18.330.462/0001-05', '05/11/2026', S_ACABOU, falta='Contrato',
                  dica='Libera quando o contrato for registrado.'),
    'tg-inga': cab('Ingá Advocacia', 'Salvador, BA', '27.645.118/0001-90', '25/11/2026', S_REP, falta='Contrato',
                   dica='Libera quando o contrato for registrado.'),
    'tg-buriti': cab('Buriti Advocacia', 'Fortaleza, CE', '33.902.771/0001-48', '03/11/2026', S_DISP, base=CAB_ATIVO)
                 .replace('<small>desde 18/11/2026</small>', '<small>desde 20/11/2026</small>')
                 .replace('A implantação foi concluída por Carol Andrade. O motivo está no histórico.',
                          'Escritório piloto, sem teste. A cobrança começou na confirmação da assinatura, em 18/11/2026.'),
}
T = ''.join(f'<template data-cab="{k}">{v}</template>\n' for k, v in CABS.items())

NOMES = {'tg-cedro': 'Cedro & Lima Advocacia', 'tg-ribeiro': 'Ribeiro & Matos Advocacia', 'tg-ribeiro-quer': 'Ribeiro & Matos Advocacia',
         'tg-ribeiro-ass': 'Ribeiro & Matos Advocacia', 'tg-sucupira': 'Sucupira Advocacia Familiar', 'tg-ipe': 'Ipê Advocacia',
         'tg-inga': 'Ingá Advocacia', 'tg-buriti': 'Buriti Advocacia'}


def t_aba(aba, est, corpo, cabn, notas='2', docs='2'):
    return tpl(f'{aba}:{est}', exemplo(corpo), cab=cabn, sem_alerta=True, nome=NOMES[cabn], docs=docs, notas=notas)


# ---------------------------------------------------------------- peças da aba Assinatura
def dias(rotulos, hoje=None, extra_de=None, depois=(), feitos=None):
    """rotulos = datas dd/mm de cada dia do teste. hoje = índice (1..n) do dia de hoje. extra_de = primeiro dia a mais (prorrogação).
    depois = datas depois do fim, já em só consulta. feitos = quantos dias já passaram (padrão: hoje − 1)."""
    n = len(rotulos) + len(depois)
    f = (hoje - 1) if feitos is None else feitos
    out = f'<ol class="tg-dias" style="--n:{n}" aria-label="Os dias do teste">'
    for i, r in enumerate(rotulos, 1):
        cls = []
        if i <= f:
            cls.append('feito')
        if hoje == i:
            cls.append('hoje')
        if extra_de and i >= extra_de:
            cls.append('extra')
        sit = 'hoje' if hoje == i else ('passou' if i <= f else 'falta')
        out += (f'<li class="{" ".join(cls)}"><span class="q" aria-hidden="true">{i}</span>'
                f'<span>{"<b>hoje</b>" if hoje == i else r}</span><span class="sr">Dia {i}, {r}: {sit}{", dia a mais" if extra_de and i >= extra_de else ""}</span></li>')
    for r in depois:
        out += f'<li class="depois"><span class="q" aria-hidden="true">{ico("cadeado")}</span><span>{r}</span><span class="sr">{r}: só consulta</span></li>'
    return out + '</ol>'


def legenda(extra=False, depois=False, hoje=True):
    x = '<span><i class="l-feito"></i>Já passou</span>'
    x += '<span><i class="l-hoje"></i>Hoje</span>' if hoje else ''
    x += '<span><i class="l-falta"></i>Falta</span>'
    x += '<span><i class="l-extra"></i>Dia a mais (prorrogação)</span>' if extra else ''
    x += f'<span>{ico("cadeado", "ico ico-s")}Só consulta</span>' if depois else ''
    return f'<p class="tg-legenda">{x}</p>'


def disco(cls, grande, peq=''):
    p = f'<small>{peq}</small>' if peq else ''
    return f'<span class="tg-disco {cls}" aria-hidden="true"><b>{grande}</b>{p}</span>'


def disco_ico(cls, nome):
    return f'<span class="tg-disco {cls}" aria-hidden="true">{ico(nome)}</span>'


def quadro(dsc, titulo, sub, selo_, tira='', dados='', acoes='', faixa='', sobre='Teste grátis de 7 dias'):
    return (f'<section class="folha tg-quadro" aria-labelledby="t-teste">{faixa}<div class="tg-q-topo">{dsc}<div><p class="sobretitulo">{sobre}</p>'
            f'<h2 id="t-teste">{titulo}</h2><p class="sub">{sub}</p></div><span class="tg-cab-selo">{selo_}</span></div>{tira}{dados}{acoes}</section>')


def faixa(cls, icone, titulo, texto, acoes=''):
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    return f'<div class="tg-faixa {cls}" role="note">{ico(icone, "ico ico-g")}<div><h3>{titulo}</h3><p>{texto}</p></div>{a}</div>'


def msg(texto, para):
    return f'<p class="permissao tg-msg" data-para="{para}">{ico("cadeado")}<span>{texto}</span></p>'


MSG_ADM = msg('Prorrogar, liberar e dispensar o teste é com a Administração, sempre com motivo.', 'financeiro implantacao suporte')
MSG_CONF = msg('Confirmar a assinatura é com a Administração ou o Financeiro.', 'implantacao suporte')


def bt(classe, href, icone, texto, papel=''):
    return f'<a class="btn {classe} {papel}" href="{href}">{ico(icone)}{texto}</a>'


B_CONF = bt('btn-pri', F + 'tg-confirmar', 'assinar', 'Confirmar a assinatura', 'so-conf')
B_PROR = bt('btn-sec', F + 'tg-prorrogar', 'mais-dias', 'Prorrogar', 'so-adm')
B_DISP = bt('btn-fantasma', F + 'tg-dispensar', 'dispensar', 'Dispensar o teste', 'so-adm')


def acoes(*bs, msgs=(MSG_ADM, MSG_CONF)):
    return f'<div class="tg-acoes">{"".join(bs)}{"".join(msgs)}</div>'


def avisos(itens):
    out = '<ul class="tg-avisos">'
    for feito, txt in itens:
        out += (f'<li class="{"" if feito else "prev"}">{ico("check" if feito else "relogio")}<span>{txt}'
                f'<span class="sr">{": enviado" if feito else ": previsto"}</span></span></li>')
    return out + '</ul>'


def situ(selo_, texto, extra=''):
    return (f'<section class="folha" aria-labelledby="t-situ"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-situ" style="font-size:20px">Situação da cobrança</h2></div>'
            f'<div class="tg-situ"><p>{selo_}</p>{extra}<p>{texto}</p></div></section>')


COMO = ('<section class="explica campo-ambar" aria-labelledby="t-como-t"><p class="sobretitulo">Como funciona</p><h2 id="t-como-t">O teste grátis.</h2><ul>'
        f'<li>{ico("ampulheta")}<span>7 dias, contados do primeiro acesso de um sócio ao Portal. O dia 1 é o dia desse acesso, a qualquer hora.</span></li>'
        f'<li>{ico("fatura")}<span>Nenhuma fatura no teste, mesmo assinando antes. A cobrança começa no dia seguinte ao fim, e a primeira mensalidade é a do mês seguinte.</span></li>'
        f'<li>{ico("cadeado")}<span>No 8º dia sem assinatura, o Portal fica só para consulta: o escritório vê e baixa tudo. Nada é apagado.</span></li>'
        f'<li>{ico("mais-dias")}<span>Mais dias, teste repetido e dispensa ficam com a Administração, sempre com motivo.</span></li></ul></section>')


def grade(main, aside):
    return f'<div class="grade"><div class="col">{main}</div><aside class="col" aria-label="Situação da cobrança">{aside}</aside></div>'


def folha_ass(sub, dados, topo_acoes='', extra=''):
    return (f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="tg-ass-topo"><div><h2 id="t-ass">Assinatura</h2>'
            f'<p class="sub">{sub}</p></div>{topo_acoes}</div>{dados}{extra}</section>')


SO_VER = (f'<p class="cb-so-ver msg-nao-fin">{ico("olho")}<span>Você vê o plano e o teste. Valores e mudanças ficam com a Administração e o Financeiro.</span></p>')
ED = f'<div class="acoes so-fin" style="display:flex;gap:8px">{SELO_EX}<a class="btn btn-sec" href="ficha.html?aba=assinatura&amp;estado=cb-editar">{ico("lapis")}Editar</a></div>'

DADOS_RIBEIRO = dl([
    ('Plano', '<span class="tg-plano-nome">Escritório</span> <span class="selo selo-neutro">até 8 pessoas</span>'),
    ('Mensalidade', f'{brl(49000)} por mês<small>valor de exemplo</small>', 'so-fin'),
    ('Dia de vencimento', 'Todo dia 10'),
    ('Forma de pagamento', 'Pix<small>o boleto vai junto, como alternativa</small>', 'so-fin'),
    ('Início da cobrança', 'Sexta-feira, 04/12/2026<small>o dia seguinte ao fim do teste, se a assinatura for confirmada até lá</small>'),
    ('Primeira fatura', 'Janeiro de 2027, vence em 10/01/2027<small>emitida em 04/12/2026; nenhuma fatura sai durante o teste</small>'),
    ('E-mail de cobrança', 'marina@ribeiromatos.exemplo.com.br<small>a sócia dona, Marina Ribeiro</small>', 'inteira so-fin'),
])
ASS_RIBEIRO = folha_ass('Preparada por Carol Andrade em 30/11/2026. Ainda não confirmada.', DADOS_RIBEIRO, ED, SO_VER)

SEM_ASS = lambda nome: (f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="tg-ass-topo"><div><h2 id="t-ass">Assinatura</h2>'
                        f'<p class="sub">Ainda não preparada.</p></div></div>'
                        f'<div class="estado sem-moldura" role="status" style="padding-top:6px"><span class="icone-estado">{ico("fatura")}</span><h3>Sem assinatura ainda</h3>'
                        f'<p>Dá para deixar o plano, o dia e a forma escolhidos agora. Nenhuma fatura sai durante o teste; a {nome} só paga depois de confirmar a assinatura.</p>'
                        f'<div class="acoes"><a class="btn btn-pri so-fin" href="ficha.html?aba=assinatura&amp;estado=cb-editar">{ico("planos")}Preparar a assinatura</a></div>'
                        f'<p class="permissao msg-nao-fin" style="justify-content:center">{ico("cadeado")}Quem prepara a assinatura é a Administração ou o Financeiro.</p></div></section>')

SITU_TESTE = situ(selo('teste', 'Em teste', 'ampulheta'), 'Se a assinatura for confirmada até quinta-feira, 03/12, a cobrança começa em <b>04/12/2026</b> e a primeira mensalidade é a de <b>janeiro de 2027</b>.',
                  '<p class="tg-grande">Nenhuma fatura</p><p>Durante o teste, nada é cobrado, mesmo com a assinatura confirmada.</p>')

# ---- 1. previsto (Cedro & Lima)
DIAS_PREV = ('<ol class="tg-dias" style="--n:7" aria-label="Os 7 dias do teste, ainda sem data">'
             + ''.join(f'<li><span class="q" aria-hidden="true">{i}</span><span>{"1º acesso" if i == 1 else "—"}</span><span class="sr">Dia {i}{", o dia do primeiro acesso" if i == 1 else ""}</span></li>' for i in range(1, 8))
             + '</ol>')
PREV = quadro(disco_ico('tg-d-prev', 'ampulheta'), 'Previsto',
              'Começa quando um sócio entrar no Portal pela primeira vez. <b>Renata Lima</b> foi convidada em 12/11/2026 e ainda não entrou.',
              S_PREV, DIAS_PREV + '<p class="tg-legenda"><span>Se ela entrar hoje, a qualquer hora, o teste vai até <b>&nbsp;terça-feira, 08/12</b>.</span></p>',
              dl([('Cadastrado com teste', 'Sim, em 04/11/2026<small>a chave do teste estava ligada no dia do cadastro</small>'),
                  ('Sócia convidada', 'Renata Lima<small>convite enviado em 12/11/2026</small>'),
                  ('No primeiro acesso', 'Renata recebe um e-mail e um aviso no sino com o último dia do teste.', 'inteira')]),
              acoes(B_DISP, msgs=(msg('Dispensar o teste é com a Administração, sempre com motivo. Serve para pilotos e fundadores.', 'financeiro implantacao suporte'),)))
T += t_aba('assinatura', 'tg-previsto', grade(PREV + SEM_ASS('Cedro &amp; Lima'),
           situ(S_PREV, 'Nenhuma fatura. A cobrança só começa depois do teste e da assinatura confirmada.') + COMO), 'tg-cedro', notas='5', docs='3')

# ---- 2. em teste, dia 6 de 7 (Ribeiro & Matos)
D_RIB = ['27/11', '28/11', '29/11', '30/11', '01/12', '02/12', '03/12']
AV_RIB = [(True, '<b>Dia 1</b> · 27/11, 23h40 · e-mail e sino: “Seu teste vai até quinta-feira, 03/12.”'),
          (True, '<b>Dia 5</b> · 01/12, 8h · e-mail e sino: faltam 3 dias, com “Quero assinar”'),
          (False, '<b>Dia 7</b> · 03/12, 8h · “Hoje é o último dia do seu teste.”'),
          (False, '<b>Dia 8</b> · 04/12, 8h · “O teste terminou. Seus dados estão guardados.” Só sai sem assinatura.')]


def dados_rib(pedido='Ainda não pediu para assinar.'):
    return dl([('Primeiro acesso', '27/11/2026, 23h40<small>Marina Ribeiro, sócia dona</small>'),
               ('Último dia', 'Quinta-feira, 03/12/2026'),
               ('Sem assinatura, só consulta a partir de', 'Sexta-feira, 04/12/2026, à 0h<small>horário de Brasília, o mesmo da Bahia</small>'),
               ('Pedido no Portal', pedido),
               ('Avisos à sócia dona', avisos(AV_RIB), 'inteira')])


EM_TESTE = quadro(disco('', '6', 'de 7'), 'Em teste até quinta-feira, 03/12',
                  'Faltam <b>2 dias</b>, contando hoje. Começou no primeiro acesso de Marina Ribeiro.', S_T6,
                  dias(D_RIB, hoje=6) + legenda(), dados_rib(), acoes(B_CONF, B_PROR, B_DISP))
T += t_aba('assinatura', 'tg-em-teste', grade(EM_TESTE + ASS_RIBEIRO, SITU_TESTE + COMO), 'tg-ribeiro')

# ---- 3. quer assinar (o mesmo dia, com o pedido do Portal)
F_QUER = faixa('', 'assinar', 'Marina Ribeiro pediu para assinar · ontem, 01/12, às 16h20, pelo Portal',
               'A assinatura já está preparada (plano Escritório). Confirme com ela a forma de pagamento e o e-mail de cobrança, e depois confirme aqui.',
               B_CONF.replace('so-conf', 'so-conf'))


def quer(acoes_html, faixa_html=F_QUER):
    return quadro(disco('', '6', 'de 7'), 'Em teste até quinta-feira, 03/12',
                  'Faltam <b>2 dias</b>, contando hoje. Começou no primeiro acesso de Marina Ribeiro.', S_T6 + S_QUER,
                  dias(D_RIB, hoje=6) + legenda(), dados_rib('01/12/2026, 16h20<small>Marina Ribeiro apertou “Quero assinar”. O sino avisou a Administração, a Implantação e o Financeiro.</small>'),
                  acoes_html, faixa_html)


QUER = quer(acoes(B_PROR, B_DISP, msgs=(MSG_ADM,)))
T += t_aba('assinatura', 'tg-quer-assinar', grade(QUER + ASS_RIBEIRO, SITU_TESTE + COMO), 'tg-ribeiro-quer')

# ---- 4. confirmar a assinatura (janela) e os erros
COMO_OPC = ['Pediu no Portal (Quero assinar)', 'Por e-mail', 'Por WhatsApp', 'Em reunião ou ligação', 'Outro']


def j_confirmar(erro=False, valor=''):
    resumo = aviso('urgencia', 'Falta uma informação.', 'Confira o campo destacado.', cls='') if erro else ''
    conta = ('<ul class="tg-conta">'
             f'<li><span>Plano</span><b>Escritório · {brl(49000)} por mês <span class="tg-peq">valor de exemplo</span></b></li>'
             '<li><span>Vencimento e forma</span><b>Todo dia 10 · Pix</b></li>'
             '<li><span>Fim do teste</span><b>Quinta-feira, 03/12/2026</b></li>'
             '<li><span>A cobrança começa</span><b>Sexta-feira, 04/12/2026</b></li>'
             '<li><span>Primeira fatura</span><b>Janeiro de 2027 · vence em 10/01/2027</b></li></ul>')
    oque = (f'<ul class="tg-oque"><li>{ico("fatura")}<span><b>Nenhuma fatura sai durante o teste.</b> A primeira é emitida em 04/12, a de janeiro.</span></li>'
            f'<li>{ico("sino")}<span>Os avisos de fim do teste param. No Portal, a faixa do teste muda para “Assinatura confirmada”.</span></li>'
            f'<li>{ico("historico")}<span>Fica no histórico, com o seu nome, o jeito que o escritório confirmou e o detalhe.</span></li></ul>')
    det = campo('conf-det', 'O que foi combinado', valor,
                'Por exemplo: com quem falou, quando e o que ficou acertado. Só a equipe T3jus vê.',
                'Escreva o que foi combinado com o escritório. Isso fica no histórico.' if erro else '',
                area=True, linhas=3, cont=f'{len(valor)} de 300 caracteres', foco=True, extra=' aria-required="true"')
    corpo = resumo + conta + selecao('conf-como', 'Como o escritório confirmou', COMO_OPC, COMO_OPC[0]) + det + oque
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("assinar")}Confirmar a assinatura</button>'
    return janela('janela-confirmar', 'Assinatura · Ribeiro &amp; Matos', 'Confirmar a assinatura',
                  'A assinatura fica confirmada agora. A cobrança só começa depois do teste.', corpo, pe)


T += t_aba('assinatura', 'tg-confirmar', grade(QUER + ASS_RIBEIRO, SITU_TESTE + COMO) + j_confirmar(), 'tg-ribeiro-quer')
T += t_aba('assinatura', 'tg-confirmar-erros', grade(QUER + ASS_RIBEIRO, SITU_TESTE + COMO) + j_confirmar(erro=True), 'tg-ribeiro-quer')

# ---- 5. assinado (confirmado hoje, o teste segue até o fim)
MOT_CONF = 'Marina confirmou por telefone o plano Escritório, o Pix e o e-mail de cobrança. Ligação de 02/12, 9h30.'
ASSINADO = quadro(disco_ico('tg-d-ok', 'check'), 'Assinado · o teste segue até 03/12',
                  'Confirmada hoje, 02/12/2026, às 9h52, por Carol Andrade. Até quinta, a equipe da Ribeiro &amp; Matos usa tudo como no teste.', S_ASS,
                  dias(D_RIB, hoje=6) + legenda(),
                  dl([('Como confirmou', f'Pediu no Portal (Quero assinar)<span class="tg-motivo">“{MOT_CONF}”</span>', 'inteira'),
                      ('A cobrança começa', 'Sexta-feira, 04/12/2026<small>o dia seguinte ao fim do teste</small>'),
                      ('Primeira fatura', 'Janeiro de 2027, vence em 10/01/2027<small>emitida em 04/12/2026</small>'),
                      ('Avisos à sócia dona', avisos(AV_RIB[:2] + [(False, '<b>Dia 7 e dia 8</b> · não saem mais, porque a assinatura foi confirmada.')]), 'inteira')]))
T += t_aba('assinatura', 'tg-assinado',
           toast('Assinatura confirmada.', 'A cobrança começa em 04/12/2026. Nenhuma fatura sai antes disso.')
           + grade(ASSINADO + folha_ass('Confirmada em 02/12/2026 por Carol Andrade.', DADOS_RIBEIRO, ED, SO_VER),
                   situ(selo('assinado', 'Assinado', 'check'), 'A primeira fatura, de <b>janeiro de 2027</b>, é emitida em <b>04/12/2026</b> e vence em <b>10/01/2027</b>.',
                        f'<p class="tg-grande so-fin">{brl(49000)}</p>') + COMO), 'tg-ribeiro-ass')


# ---- 6. prorrogar (janela) e os erros
def j_prorrogar(erro=False):
    data = '02/12/2026' if erro else '08/12/2026'
    resumo = aviso('urgencia', 'Faltam duas informações.', 'Confira os campos destacados.') if erro else ''
    novo = campo('pr-data', 'Novo último dia', data, 'Depois de 03/12/2026. O Portal só trava à 0h do dia seguinte.',
                 'Escolha um dia depois de quinta-feira, 03/12/2026, o último dia de hoje.' if erro else '', modo='numeric', foco=not erro,
                 extra=' aria-required="true"')
    ad = ('' if erro else
          '<div class="tg-antes-depois"><div><small>Hoje</small><strong>03/12</strong><span>quinta-feira · 7 dias</span></div>'
          f'<span class="seta">{ico("seta")}</span><div class="novo"><small>Com a prorrogação</small><strong>08/12</strong><span>terça-feira · 12 dias</span></div></div>')
    mot = campo('pr-motivo', 'Motivo', '', 'Fica no histórico interno, com o fim de antes e o novo. O escritório não vê.',
                'Escreva o motivo. Toda prorrogação precisa de um.' if erro else '', area=True, linhas=3, cont='0 de 300 caracteres',
                foco=erro, extra=' aria-required="true"')
    oque = ('' if erro else
            f'<ul class="tg-oque"><li>{ico("sino")}<span>Os avisos do fim saem de novo para a data nova: “faltam 3 dias” em 06/12 e “último dia” em 08/12.</span></li>'
            f'<li>{ico("fatura")}<span>Se a assinatura for confirmada, a cobrança passa a começar em 09/12/2026.</span></li></ul>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("mais-dias")}{"Prorrogar" if erro else "Prorrogar até 08/12"}</button>')
    return janela('janela-prorrogar', 'Teste grátis · Ribeiro &amp; Matos', 'Prorrogar o teste',
                  'Só a Administração prorroga, sempre com motivo. Dá para prorrogar também depois do fim, enquanto o contrato não for encerrado.',
                  resumo + novo + ad + mot + oque, pe)


T += t_aba('assinatura', 'tg-prorrogar', grade(EM_TESTE + ASS_RIBEIRO, SITU_TESTE + COMO) + j_prorrogar(), 'tg-ribeiro')
T += t_aba('assinatura', 'tg-prorrogar-erros', grade(EM_TESTE + ASS_RIBEIRO, SITU_TESTE + COMO) + j_prorrogar(erro=True), 'tg-ribeiro')

# ---- 7. prorrogado (Sucupira)
D_SUC = ['24/11', '25/11', '26/11', '27/11', '28/11', '29/11', '30/11', '01/12', '02/12', '03/12', '04/12']
MOT_PR = 'A sócia ficou sem internet no escritório na primeira semana, por causa de uma obra. Combinado com ela em 30/11.'
PRORROGADO = quadro(disco('', '9', 'de 11'), 'Em teste até sexta-feira, 04/12',
                    'Prorrogado por Carol Andrade em 30/11/2026, às 17h10. Faltam <b>3 dias</b>, contando hoje.', S_T9,
                    dias(D_SUC, hoje=9, extra_de=8) + legenda(extra=True),
                    dl([('Primeiro acesso', '24/11/2026, 9h05<small>Beatriz Nunes, sócia dona</small>'),
                        ('Último dia', 'Sexta-feira, 04/12/2026<small>era segunda-feira, 30/11/2026</small>'),
                        ('Motivo da prorrogação', f'<span class="tg-motivo" style="margin:0">“{MOT_PR}”</span>', 'inteira'),
                        ('Sem assinatura, só consulta a partir de', 'Sábado, 05/12/2026, à 0h'),
                        ('Pedido no Portal', 'Ainda não pediu para assinar.'),
                        ('Avisos à sócia dona', avisos([(True, '<b>Dia 1</b> · 24/11, 9h05 · e-mail e sino'),
                                                         (True, '<b>Dia 5</b> · 28/11, 8h · faltam 3 dias'),
                                                         (True, '<b>Dia 7</b> · 30/11, 8h · último dia, antes da prorrogação'),
                                                         (True, '<b>De novo, para a data nova</b> · hoje, 02/12, 8h · “Seu teste vai até sexta-feira, 04/12.”'),
                                                         (False, '<b>Último dia</b> · 04/12, 8h · e <b>fim</b> · 05/12, 8h, só sem assinatura')]), 'inteira')]),
                    acoes(bt('btn-pri', 'ficha.html?aba=assinatura&amp;estado=cb-editar', 'planos', 'Preparar a assinatura', 'so-fin'),
                          B_PROR.replace('Prorrogar', 'Prorrogar de novo'), B_DISP,
                          msgs=(MSG_ADM, msg('Preparar a assinatura é com a Administração ou o Financeiro. Sem ela, não há o que confirmar.', 'implantacao suporte'))))
T += t_aba('assinatura', 'tg-prorrogado', grade(PRORROGADO + SEM_ASS('Sucupira'),
           situ(S_T9, 'Se a assinatura for preparada e confirmada até sexta, 04/12, a cobrança começa em <b>05/12/2026</b> e a primeira mensalidade é a de <b>janeiro de 2027</b>.',
                '<p class="tg-grande">Nenhuma fatura</p>') + COMO), 'tg-sucupira', notas='3')

# ---- 8. acabou sem assinar (Ipê): proposta de encerrar
D_IPE = ['23/11', '24/11', '25/11', '26/11', '27/11', '28/11', '29/11']
F_ACABOU = faixa('tg-f-urg', 'alerta', 'O teste acabou em 29/11 sem assinatura. Proposta: encerrar como fim de contrato.',
                 'Ao encerrar, com o motivo “teste não assinado”, o escritório tem 30 dias para consultar e baixar os dados, com os e-mails do fim, e depois o acesso fecha. '
                 'Os dados ficam guardados 12 meses depois disso. Se o escritório ainda quiser assinar, prorrogue: a escrita volta na hora.',
                 bt('btn-pri', 'ficha.html?aba=contrato&amp;estado=fc-encerrar', 'fim', 'Encerrar o contrato', 'so-adm'))
ACABOU = quadro(disco('tg-d-urg', '3', 'dias'), 'Acabou sem assinar no domingo, 29/11',
                'Há 3 dias o Portal da Ipê está só para consulta: a equipe vê e baixa tudo, mas não cria nem muda nada. A demora em decidir não dá mais dias.', S_ACABOU,
                dias(D_IPE, feitos=7, depois=['30/11', '01/12', '02/12']) + legenda(depois=True, hoje=False),
                dl([('Primeiro acesso', '23/11/2026, 14h20<small>Ana Lúcia Prado, sócia dona</small>'),
                    ('Último dia', 'Domingo, 29/11/2026'),
                    ('Só consulta desde', 'Segunda-feira, 30/11/2026, à 0h'),
                    ('Pedido no Portal', 'Não pediu para assinar.'),
                    ('Avisos à sócia dona', avisos([(True, '<b>Dia 1</b> · 23/11, 14h20 · e-mail e sino'),
                                                     (True, '<b>Dia 5</b> · 27/11, 8h · faltam 3 dias'),
                                                     (False, '<b>Dia 7</b> · não saiu: a rotina das 8h não rodou em 29/11, e o aviso foi descartado. O motivo está no histórico.'),
                                                     (True, '<b>Dia 8</b> · 30/11, 8h · “O teste terminou em 29/11. Seus dados estão guardados.”')]), 'inteira')]),
                acoes(B_PROR.replace('Prorrogar', 'Prorrogar e devolver a escrita'),
                      bt('btn-sec', 'ficha.html?aba=assinatura&amp;estado=cb-editar', 'planos', 'Preparar a assinatura', 'so-fin'),
                      msgs=(msg('Encerrar e prorrogar é com a Administração, sempre com motivo.', 'financeiro implantacao suporte'),)),
                F_ACABOU)
T += t_aba('assinatura', 'tg-acabou', grade(ACABOU + SEM_ASS('Ipê'),
           situ(S_ACABOU, 'Sem assinatura, nada é cobrado. Se o escritório assinar agora, a cobrança começa no dia da confirmação.',
                '<p class="tg-grande">Nenhuma fatura</p>') + COMO), 'tg-ipe', notas='4', docs='1')


# ---- 9. dispensar (janela, na Cedro & Lima, antes do primeiro acesso)
def j_dispensar():
    oque = (f'<ul class="tg-oque"><li>{ico("cadeado")}<span>O Portal não trava no 8º dia. O primeiro acesso de Renata só marca o dia 1 da implantação.</span></li>'
            f'<li>{ico("fatura")}<span>A cobrança começa no dia em que a assinatura for confirmada, e a primeira mensalidade é a do mês seguinte.</span></li>'
            f'<li>{ico("planos")}<span>O combinado com pilotos e fundadores fica no desconto da assinatura, e não em dias sem cobrança.</span></li></ul>')
    mot = campo('disp-motivo', 'Motivo', '', 'Fica no histórico interno e no quadro do teste.', area=True, linhas=3, cont='0 de 300 caracteres',
                extra=' aria-required="true"')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("dispensar")}Dispensar o teste</button>')
    return janela('janela-dispensar', 'Teste grátis · Cedro &amp; Lima', 'Dispensar o teste da Cedro &amp; Lima?',
                  'Para pilotos, fundadores e quem já combinou a assinatura. Depois de dispensado, o teste não começa mais.', oque + mot, pe, alerta=True)


T += t_aba('assinatura', 'tg-dispensar', grade(PREV + SEM_ASS('Cedro &amp; Lima'),
           situ(S_PREV, 'Nenhuma fatura.') + COMO) + j_dispensar(), 'tg-cedro', notas='5', docs='3')

# ---- 10. dispensado (Buriti, piloto, já ativo)
MOT_DISP = 'Escritório piloto. O combinado de fundador está no desconto da assinatura.'
DISP = quadro(disco_ico('tg-d-neutro', 'dispensar'), 'Teste dispensado',
              'Por Carol Andrade em 16/11/2026, antes do primeiro acesso.', S_DISP, '',
              dl([('Motivo', f'<span class="tg-motivo" style="margin:0">“{MOT_DISP}”</span>', 'inteira'),
                  ('Assinatura confirmada', '18/11/2026, por Carol Andrade<small>em reunião com Lucas Buriti</small>'),
                  ('A cobrança começou', '18/11/2026, na confirmação<small>sem teste, não há dias grátis</small>'),
                  ('Primeiro acesso', '19/11/2026, 10h02<small>Lucas Buriti; marca só o dia 1 da implantação</small>'),
                  ('Primeira fatura', 'Dezembro de 2026, vence em 10/12/2026')]))
DADOS_BURITI = dl([('Plano', '<span class="tg-plano-nome">Escritório</span> <span class="selo selo-neutro">até 8 pessoas</span>'),
                   ('Mensalidade', f'{brl(49000)} por mês<small>valor de exemplo</small>', 'so-fin'),
                   ('Desconto', '30% por 12 faturas<small>o combinado de fundador</small>', 'so-fin'),
                   ('Dia de vencimento', 'Todo dia 10')])
T += t_aba('assinatura', 'tg-dispensado', grade(DISP + folha_ass('Desde 18/11/2026.', DADOS_BURITI, ED, SO_VER),
           situ(f'<span class="selo selo-ok">{ico("check")}Em dia</span>', 'Próxima fatura: <b>dezembro de 2026</b>, vence em <b>10/12/2026</b>.') + COMO),
           'tg-buriti', notas='1')

# ---- 11. repetido (Ingá) e liberar
F_REP = faixa('tg-f-amb', 'repetido', 'Henrique Moura já teve um teste no T3jus',
              'Ele foi sócio da Angico Advocacia Trabalhista, que fez o teste de 07/09 a 13/09/2026 e foi encerrada sem assinar. '
              'Por isso, o teste da Ingá não começou: desde o primeiro acesso, ontem às 10h15, o Portal está só para consulta, até a Administração decidir.',
              bt('btn-pri', F + 'tg-liberar', 'ampulheta', 'Liberar o teste', 'so-adm')
              + bt('btn-sec', F + 'tg-dispensar', 'dispensar', 'Dispensar o teste', 'so-adm'))
REP = quadro(disco_ico('tg-d-rep', 'repetido'), 'Esperando a decisão da Administração', 'O teste não começa sozinho quando a pessoa já teve outro.', S_REP, '',
             dl([('Primeiro acesso', '01/12/2026, 10h15<small>Henrique Moura, sócio dono</small>'),
                 ('Teste anterior', 'Angico Advocacia Trabalhista<small>sócio · teste de 07/09 a 13/09/2026 · encerrada sem assinar em 21/09/2026</small>'),
                 ('Como o T3jus percebeu', 'A mesma pessoa, com o mesmo cadastro, já foi sócia de um escritório que teve teste.', 'inteira'),
                 ('O que Henrique vê no Portal', 'Só consulta, com “A equipe do T3jus está liberando o seu acesso.” Ele não vê o motivo.', 'inteira')]),
             acoes(msgs=(MSG_ADM,)) , F_REP)
T += t_aba('assinatura', 'tg-repetido', grade(REP + SEM_ASS('Ingá'),
           situ(S_REP, 'Nenhuma fatura. Liberado, o teste começa no dia da decisão; dispensado, a cobrança começa na confirmação da assinatura.') + COMO),
           'tg-inga', notas='1', docs='1')


def j_liberar():
    conta = ('<ul class="tg-conta"><li><span>Dia 1</span><b>Hoje, quarta-feira, 02/12/2026</b></li>'
             '<li><span>Último dia</span><b>Terça-feira, 08/12/2026</b></li>'
             '<li><span>O Portal</span><b>Volta a gravar agora</b></li></ul>')
    oque = f'<ul class="tg-oque"><li>{ico("sino")}<span>Henrique recebe agora o e-mail e o aviso do dia 1, com o último dia do teste.</span></li></ul>'
    mot = campo('lib-motivo', 'Motivo', '', 'Fica no histórico interno. O escritório não vê.', area=True, linhas=3, cont='0 de 300 caracteres',
                foco=True, extra=' aria-required="true"')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("ampulheta")}Liberar o teste</button>'
    return janela('janela-liberar', 'Teste grátis · Ingá', 'Liberar o teste repetido',
                  'O teste da Ingá começa hoje, como se fosse o primeiro acesso de Henrique.', conta + mot + oque, pe)


T += t_aba('assinatura', 'tg-liberar', grade(REP + SEM_ASS('Ingá'), situ(S_REP, 'Nenhuma fatura.') + COMO) + j_liberar(), 'tg-inga', notas='1', docs='1')


# ---------------------------------------------------------------- Histórico e Notas
def ev(hora, quem, texto, small='', forte=False, sis=False, so_equipe=True):
    pto = 'pto fc-sis' if sis else ('pto forte' if forte else 'pto')
    s = '<span class="selo selo-neutro">Só equipe</span>' if so_equipe else ''
    sm = f'<small>{small}</small>' if small else ''
    return f'<li><time>{hora}</time><span class="{pto}" aria-hidden="true"></span><div><p><b>{quem}</b> {texto}{s}</p>{sm}</div></li>'


def dia_ev(titulo, itens):
    return f'<div class="eventos-dia"><h3>{titulo}</h3><ol class="eventos">{"".join(itens)}</ol></div>'


def hist(dias_html, aside_extra=''):
    return (f'<div class="grade"><div class="col"><section class="folha" aria-labelledby="t-hist"><div class="folha-cab"><div><h2 id="t-hist">Histórico administrativo</h2>'
            f'<p class="sub">Quem fez o quê, e quando. Nada aqui é apagado.</p></div></div>{dias_html}</section></div>'
            f'<aside class="col" aria-label="Contexto do escritório"><section class="folha" aria-labelledby="t-entra"><div class="folha-cab" style="padding-bottom:4px"><h2 id="t-entra" style="font-size:20px">O que entra aqui</h2></div>'
            '<ul class="tratar"><li>Cadastro e mudanças da ficha</li><li>Referência do contrato e estágio, com o motivo</li><li>Convites de sócio</li><li>Quem foi atribuído ou retirado</li>'
            '<li><b>Novo:</b> o teste grátis (começo, avisos, pedido para assinar, prorrogação, liberação, dispensa e fim) e a confirmação da assinatura, sempre com o motivo</li>'
            '<li><span class="selo selo-neutro">Só equipe</span><span class="ok">o escritório não vê este evento</span></li></ul></section>' + aside_extra + '</aside></div>')


H_RIB = hist(
    dia_ev('01/12/2026 · ontem', [
        ev('16h20', 'Marina Ribeiro', 'apertou “Quero assinar”, pelo Portal', 'O sino avisou Administração, Implantação e Financeiro. O teste vai até 03/12.', forte=True),
        ev('08h00', 'O sistema', 'mandou o aviso do dia 5 a <b>Marina Ribeiro</b>, por e-mail e no sino', 'Faltam 3 dias. A assinatura já estava preparada.', sis=True)])
    + dia_ev('30/11/2026', [ev('11h30', 'Carol Andrade', 'preparou a assinatura', 'Plano Escritório, todo dia 10, Pix. Ainda sem confirmação.')])
    + dia_ev('27/11/2026', [
        ev('23h40', 'O sistema', 'mandou o aviso do dia 1 a <b>Marina Ribeiro</b>, por e-mail e no sino', '“Seu teste vai até quinta-feira, 03/12.”', sis=True),
        ev('23h40', 'O sistema', 'começou o teste grátis no primeiro acesso de <b>Marina Ribeiro</b>', 'Dia 1: 27/11. Último dia: 03/12. Só consulta a partir de 04/12, à 0h, se não assinar.', sis=True)])
    + '<div class="mais"><span>Mostrando os 5 mais recentes</span><button class="btn btn-sec" type="button">' + ico('baixo') + 'Carregar mais antigos</button></div>')
T += t_aba('historico', 'tg-ribeiro', H_RIB, 'tg-ribeiro-quer')

H_IPE = hist(
    dia_ev('30/11/2026', [
        ev('08h00', 'O sistema', 'mandou o aviso do fim do teste a <b>Ana Lúcia Prado</b>, por e-mail e no sino', '“O teste terminou em 29/11. Seus dados estão guardados.”', sis=True),
        ev('08h00', 'O sistema', 'avisou a Administração e a Implantação no sino', 'Proposta: encerrar como fim de contrato, com o motivo “teste não assinado”.', sis=True),
        ev('00h00', 'O sistema', 'deixou o Portal da Ipê só para consulta', 'O teste acabou em 29/11 sem assinatura. Ninguém do escritório cria nem muda nada; a leitura e a exportação continuam.', sis=True)])
    + dia_ev('29/11/2026', [ev('—', 'O sistema', 'descartou o aviso do último dia', 'A rotina das 8h não rodou em 29/11. Um aviso que perde o dia dele não sai depois: nunca sai “hoje é o último dia” no dia 8.', sis=True)])
    + dia_ev('27/11/2026', [ev('08h00', 'O sistema', 'mandou o aviso do dia 5 a <b>Ana Lúcia Prado</b>, por e-mail e no sino', 'Faltam 3 dias. A assinatura não estava preparada.', sis=True)])
    + '<div class="mais"><span>Mostrando os 5 mais recentes</span><button class="btn btn-sec" type="button">' + ico('baixo') + 'Carregar mais antigos</button></div>')
T += t_aba('historico', 'tg-ipe', H_IPE, 'tg-ipe', notas='4', docs='1')

NOTAS_RIB = ('<div class="grade"><div class="col"><section class="folha" aria-labelledby="t-nova"><div class="folha-cab"><h2 id="t-nova">Nova nota</h2></div>'
             '<form class="form-folha" action="#" novalidate style="padding-top:0"><div class="campo c6"><div class="campo-linha"><label for="nota">Nota interna</label>'
             '<span class="contador" id="nota-cont">0 de 2.000 caracteres</span></div><textarea class="entrada" id="nota" aria-describedby="nota-ajuda nota-cont"></textarea>'
             '<p class="ajuda" id="nota-ajuda">Só a equipe T3jus vê. Depois de salva, a nota não muda nem sai.</p></div>'
             f'<div class="form-pe"><button class="btn btn-pri" type="submit">{ico("pena")}Salvar nota</button></div></form></section>'
             '<section class="folha" aria-labelledby="t-notas"><div class="folha-cab"><div><h2 id="t-notas">Notas da equipe</h2><p class="sub">2 notas, da mais nova para a mais antiga</p></div></div>'
             '<ol class="lista notas" reversed><li><blockquote>“Marina quer assinar, mas pergunta se dá para pagar por boleto. Ligar amanhã cedo, antes de confirmar.”</blockquote>'
             '<footer><span class="av-p" aria-hidden="true">RT</span>Rafael Teles · <time>01/12/2026, 17h05</time></footer></li>'
             '<li><blockquote>“Implantação combinada para sexta à noite: Marina só tem tempo depois do expediente.”</blockquote>'
             '<footer><span class="av-p" aria-hidden="true">RT</span>Rafael Teles · <time>26/11/2026, 15h20</time></footer></li></ol></section></div>'
             '<aside class="col" aria-label="Contexto do escritório"><section class="explica campo-ambar" aria-labelledby="t-so"><p class="sobretitulo">Só a equipe vê</p>'
             '<h2 id="t-so">O escritório nunca vê estas notas.</h2><ul>'
             f'<li>{ico("escudo")}<span>Nem no Portal, nem em exportação para o cliente.</span></li>'
             f'<li>{ico("cadeado")}<span>Ninguém edita nem apaga uma nota. Para corrigir, escreva outra.</span></li>'
             f'<li>{ico("historico")}<span>O teste não escreve notas. O motivo de prorrogar, liberar, dispensar e confirmar a assinatura fica no Histórico, com o nome de quem fez.</span></li></ul></section></aside></div>')
T += t_aba('notas', 'tg-ribeiro', NOTAS_RIB, 'tg-ribeiro-quer')

# Mensagens por papel (só aparecem para quem não pode a ação)
CSS_FICHA = r"""
.tg-msg{display:none!important}
html[data-papel="financeiro"] .tg-msg[data-para~="financeiro"],html[data-papel="implantacao"] .tg-msg[data-para~="implantacao"],html[data-papel="suporte"] .tg-msg[data-para~="suporte"]{display:flex!important}
"""

montar(COB + 'ficha.html', os.path.join(SAIDA, 'ficha.html'), CSS_TG + CSS_FICHA, T)
print('ficha ok', T.count('<template data-est='), 'estados')

# ================================================================ carteira
CAR = open(COB + 'carteira.html', encoding='utf-8').read()
LV = miolo(CAR, 'lista:cb-ver')


def linha(s, nome):
    """(início, fim) da linha da tabela e do cartão do celular do escritório."""
    k = s.index(f'>{nome}</a>', s.index('<tbody>'))
    a, b = s.rfind('<tr>', 0, k), s.index('</tr>', k) + 5
    k2 = s.index(f'c-nome" href="#">{nome}</a>')
    c, d = s.rfind('<li class="cartao">', 0, k2), s.index('</li>', k2) + 5
    return (a, b), (c, d)


def pegar(s, nome):
    (a, b), (c, d) = linha(s, nome)
    return s[a:b], s[c:d]


def trocar_linha(s, nome, f_tr, f_li):
    (a, b), (c, d) = linha(s, nome)
    tr, li = s[a:b], s[c:d]
    s = s[:c] + f_li(li) + s[d:]
    return s[:a] + f_tr(tr) + s[b:]


def pend(selos, tira=()):
    def f(tr):
        for x in tira:
            tr = tr.replace(x, '', 1)
        return tr.replace('<div class="pend">', '<div class="pend">' + selos, 1)
    return f


def cart(selos, tira=()):
    def f(li):
        for x in tira:
            li = li.replace(x, '', 1)
        return li.replace('<span class="selo selo-implant">Em implantação</span>', '<span class="selo selo-implant">Em implantação</span>' + selos, 1)
    return f


def ligar(s, nome, href):
    return s.replace(f'<a href="#">{nome}</a>', f'<a href="{href}">{nome}</a>').replace(f'<a class="c-nome" href="#">{nome}</a>', f'<a class="c-nome" href="{href}">{nome}</a>')


EM_DIA = '<span class="selo selo-ok"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Em dia</span>'
s = LV
# Cedro & Lima tem link para a aba Sócio na aprovada
s = s.replace('href="ficha.html?aba=socio">Cedro &amp; Lima Advocacia</a>', 'href="#">Cedro &amp; Lima Advocacia</a>')
INGA_TR, INGA_LI = pegar(s, 'Ipê Advocacia')
s = trocar_linha(s, 'Jatobá Advogados Associados', pend(S_PREV), cart(S_PREV))
s = trocar_linha(s, 'Cedro &amp; Lima Advocacia', pend(S_PREV), cart(S_PREV))
s = trocar_linha(s, 'Ipê Advocacia', pend(selo('acabou', 'Teste acabou em 29/11', 'alerta')), cart(selo('acabou', 'Teste acabou em 29/11', 'alerta')))
s = trocar_linha(s, 'Sucupira Advocacia Familiar', pend(selo('teste', 'Em teste · até 04/12', 'mais-dias')), cart(selo('teste', 'Em teste · até 04/12', 'mais-dias')))
RIB_SELOS = selo('teste', 'Em teste · dia 6 de 7', 'ampulheta') + S_QUER
s = trocar_linha(s, 'Ribeiro &amp; Matos Advocacia', lambda tr: tr.replace(EM_DIA, f'<div class="pend">{RIB_SELOS}</div>', 1), cart(RIB_SELOS, tira=(EM_DIA,)))
# Ingá: linha nova, no lugar da Vale & Sena (que vai para a página 2)
inga_tr = (INGA_TR.replace('Ipê Advocacia', 'Ingá Advocacia').replace('Brasília, DF', 'Salvador, BA').replace('Ana Lúcia Prado', 'Henrique Moura')
           .replace('<div class="pend">', '<div class="pend">' + S_REP, 1).replace('há 2 h', 'ontem').replace('>I<', '>I<'))
inga_li = (INGA_LI.replace('Ipê Advocacia', 'Ingá Advocacia').replace('Brasília, DF', 'Salvador, BA').replace('Ana Lúcia Prado', 'Henrique Moura')
           .replace('<span class="selo selo-implant">Em implantação</span>', '<span class="selo selo-implant">Em implantação</span>' + S_REP, 1).replace('há 2 h', 'ontem'))
(a, b), (c, d) = linha(s, 'Vale &amp; Sena Advogados')
s = s[:c] + s[d:]
s = s[:a] + s[b:]
(a, b), (c, d) = linha(s, 'Ipê Advocacia')
s = s[:d] + inga_li + s[d:]
s = s[:b] + inga_tr + s[b:]
for nome, est in [('Jatobá Advogados Associados', 'tg-previsto'), ('Cedro &amp; Lima Advocacia', 'tg-previsto'), ('Ipê Advocacia', 'tg-acabou'),
                  ('Sucupira Advocacia Familiar', 'tg-prorrogado'), ('Ribeiro &amp; Matos Advocacia', 'tg-quer-assinar'), ('Ingá Advocacia', 'tg-repetido')]:
    s = ligar(s, nome, F + est)
assert s.count('Ingá Advocacia') >= 2
# Números: 13 escritórios, 6 em implantação
for a_, b_ in [('<span>12</span></span><span class="r">Todos os escritórios', '<span>13</span></span><span class="r">Todos os escritórios'),
               ('<span>5</span></span><span class="r">Em implantação', '<span>6</span></span><span class="r">Em implantação'),
               ('Mostrando 8 de 12 escritórios', 'Mostrando 8 de 13 escritórios')]:
    assert a_ in s, a_
    s = s.replace(a_, b_)
# Pedem você agora
PEDEM = ('<section class="pedem campo-vinho" aria-labelledby="t-pedem">\n        <h2 id="t-pedem"><small>Hoje</small>Pedem você agora</h2>'
         f'<a href="{F}tg-quer-assinar"><span class="disco" aria-hidden="true"><span>1</span></span><span><strong>Confirmar a assinatura da Ribeiro &amp; Matos</strong><span>Pediu ontem, 16h20 · teste até 03/12</span></span>{ico("dir", "ico ir")}</a>'
         f'<a href="{F}tg-acabou"><span class="disco" aria-hidden="true"><span>2</span></span><span><strong>Decidir o teste da Ipê</strong><span>Acabou em 29/11 sem assinar</span></span>{ico("dir", "ico ir")}</a>'
         f'<a href="{F}tg-repetido"><span class="disco" aria-hidden="true"><span>3</span></span><span><strong>Decidir o teste repetido da Ingá</strong><span>Só consulta desde ontem</span></span>{ico("dir", "ico ir")}</a>'
         '</section>')
s = re.sub(r'<section class="pedem campo-vinho".*?</section>', PEDEM, s, count=1, flags=re.S)
CHIPS_CB = re.search(r'<div class="chips" role="group" aria-label="Situação".*?</div>', s, re.S).group(0)


def chips(on=None):
    def c(chave, icone, txt):
        return f'<button type="button" aria-pressed="{"true" if on == chave else "false"}">{ico(icone, "ico ico-s")}{txt}</button>'
    return (f'<div class="chips tg-chips" role="group" aria-label="Situação" style="margin-left:0">{c("fat", "fatura", "Fatura em atraso (3)")}'
            f'{c("teste", "ampulheta", "Em teste (2)")}{c("acabou", "alerta", "Teste acabou (1)")}{c("quer", "assinar", "Quer assinar (1)")}</div>')


VER = s.replace(CHIPS_CB, chips())
CT = tpl('lista:tg-ver', exemplo(VER))


def filtrado(on, nomes, rodape, ordem):
    x = s.replace(CHIPS_CB, chips(on))
    x = x[:x.index('<section class="pedem')] + x[x.index('<section class="folha" aria-labelledby="t-lista"'):]
    rows = re.findall(r'<tr>.*?</tr>', x[x.index('<tbody>'):x.index('</tbody>')], flags=re.S)
    keep = [next(r for r in rows if f'>{n}</a>' in r) for n in nomes]
    x = re.sub(r'<tbody>.*?</tbody>', '<tbody>' + ''.join(keep) + '</tbody>', x, count=1, flags=re.S)
    ul = x[x.index('<ul class="cartoes so-cel"'):]
    ul = ul[:ul.index('</ul>') + 5]
    lis = re.findall(r'<li class="cartao">.*?</li>', ul, flags=re.S)
    keepc = [next(l for l in lis if f'>{n}</a>' in l) for n in nomes]
    x = x.replace(ul, '<ul class="cartoes so-cel" aria-label="Escritórios filtrados">' + ''.join(keepc) + '</ul>')
    x = re.sub(r'<div class="rodape-tab">.*?</div>',
               f'<p class="fc-nota-lista">{ico("ajuda")}<span>Os dias do teste contam no horário de Brasília, o mesmo da Bahia. “Em teste” inclui os prorrogados.</span></p>'
               f'<div class="rodape-tab"><span>{rodape}</span></div>', x, count=1, flags=re.S)
    return x.replace('<option>Pendências primeiro</option>', f'<option>{ordem}</option>')


CT += tpl('lista:tg-em-teste', exemplo(filtrado('teste', ['Ribeiro &amp; Matos Advocacia', 'Sucupira Advocacia Familiar'],
                                                 'Mostrando 2 escritórios em teste, do fim mais próximo para o mais distante', 'Fim do teste primeiro')))
CT += tpl('lista:tg-acabou', exemplo(filtrado('acabou', ['Ipê Advocacia'], 'Mostrando 1 escritório com o teste acabado sem assinatura', 'Fim do teste primeiro')))
CT += tpl('lista:tg-quer', exemplo(filtrado('quer', ['Ribeiro &amp; Matos Advocacia'], 'Mostrando 1 escritório que pediu para assinar pelo Portal', 'Pedido mais antigo primeiro')))

# ---------------------------------------------------------------- o sino do Console
PE_C = (f'<p class="si-pe">{ico("historico")}<span>Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, '
        'e o que o aviso conta continua na aba Assinatura do escritório.</span></p>')
I_QUER = si_item('assinar', '<b>Marina Ribeiro</b> pediu para assinar: <b>Ribeiro &amp; Matos Advocacia</b>',
                 'Pelo Portal. A assinatura está preparada (plano Escritório). O teste vai até quinta, 03/12.', 'Confirmar a assinatura',
                 F + 'tg-quer-assinar', '16h20', True, '<span class="selo selo-quer">Quer assinar</span>')
SINO_ADM = si_painel('<b>4 novos</b> · 6 nos últimos 30 dias',
                     si_dia('Hoje · quarta-feira, 02/12', [
                         si_item('ampulheta', 'O teste da <b>Sucupira Advocacia Familiar</b> acaba na sexta, 04/12',
                                 'Prorrogado. A assinatura ainda não foi preparada.', 'Abrir a assinatura', F + 'tg-prorrogado', '08h00', True)])
                     + si_dia('Ontem · 01/12', [
                         I_QUER,
                         si_item('repetido', 'Teste repetido: <b>Ingá Advocacia</b>',
                                 'Henrique Moura já foi sócio da Angico Advocacia Trabalhista, que teve teste em setembro. O Portal da Ingá está só para consulta até a decisão.',
                                 'Liberar ou dispensar', F + 'tg-repetido', '10h15', True, '<span class="selo selo-atencao">Decidir</span>'),
                         si_item('ampulheta', 'O teste da <b>Ribeiro &amp; Matos Advocacia</b> acaba na quinta, 03/12',
                                 'A assinatura está preparada.', 'Abrir a assinatura', F + 'tg-em-teste', '08h00')])
                     + si_dia('Antes', [
                         si_item('alerta', 'O teste da <b>Ipê Advocacia</b> acabou sem assinar',
                                 'Acabou em 29/11. Portal só para consulta desde 30/11. Proposta: encerrar como fim de contrato, com o motivo “teste não assinado”.',
                                 'Decidir', F + 'tg-acabou', '30/11, 08h00', True, '<span class="selo selo-urgente">Propor encerrar</span>'),
                         si_item('ampulheta', 'O teste da <b>Ribeiro &amp; Matos Advocacia</b> começou',
                                 'Primeiro acesso de Marina Ribeiro. Vai até quinta-feira, 03/12.', 'Abrir a assinatura', F + 'tg-em-teste', '27/11, 23h40')]),
                     4, PE_C)
SINO_FIN = si_painel('<b>1 novo</b> · 1 nos últimos 30 dias', si_dia('Ontem · 01/12', [I_QUER]), 1,
                     PE_C.replace('</span></p>', ' O Financeiro recebe do teste só o pedido para assinar.</span></p>'))
SINOS = tsino('tg-admin', SINO_ADM, 4) + tsino('tg-financeiro', SINO_FIN, 1)

out = montar(COB + 'carteira.html', os.path.join(SAIDA, 'carteira.html'), CSS_TG, CT, pos=lambda x: com_sino(x, SINOS))
print('carteira ok', CT.count('<template data-est='), 'estados')
