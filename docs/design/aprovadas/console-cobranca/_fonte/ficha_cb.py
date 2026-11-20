# Console · ficha do escritório, aba nova "Assinatura" (CO-06).
# Base: docs/design/aprovadas/console-fim-contrato/ficha.html (Console v1 + fim do contrato), lido sem mudança.
# Uso: python3 ficha_cb.py <pasta-saida>
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dados_cb import *
from carne_cb import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '../saida'
SRC = open(BASE + 'ficha.html', encoding='utf-8').read()

CSS_FICHA = r"""
@media (max-width:760px){ .abas a[data-aba="historico"]{grid-column:1/-1} }
.ficha-cab .meta .selo-enc{background:var(--sal-2)}
"""

# ---------------------------------------------------------------- aberturas novas (outros escritórios do exemplo)
_cab_ativo = bloco(SRC, '<template data-cab="ativo"')
_cab_ativo = _cab_ativo[_cab_ativo.index('>') + 1:]


def cab_outro(nome, cidade, cnpj_, desde, ativo_desde, dica, faixa='', selo=None, dir_html=None):
    c = (_cab_ativo.replace('Cedro &amp; Lima Advocacia', nome).replace('Recife, PE', cidade).replace(CNPJ_CEDRO, cnpj_)
         .replace('desde 04/11/2026', f'desde {desde}').replace('<small>desde 18/11/2026</small>', f'<small>desde {ativo_desde}</small>')
         .replace('A implantação foi concluída por Carol Andrade. O motivo está no histórico.', dica))
    if selo:
        c = c.replace('<span class="selo selo-ativo"><span class="bolinha" aria-hidden="true"></span>Ativo</span>', selo)
    if dir_html:
        c = c[:c.index('<section class="dir')] + dir_html + '</div>'
    return c + faixa


def faixa(texto, link=''):
    return (f'<div class="fc-faixa" role="note" aria-label="Situação do Portal">{ico("cadeado")}<p>{texto}</p>{link}</div>')


CAB = ''
CAB += '<template data-cab="cb-bacuri">' + cab_outro('Bacuri Advocacia Trabalhista', 'Belém, PA', CNPJ_BACURI, '12/07/2026', '30/07/2026',
                                                       'A implantação foi concluída por Carol Andrade.') + '</template>\n'
CAB += '<template data-cab="cb-bacuri-consulta">' + cab_outro(
    'Bacuri Advocacia Trabalhista', 'Belém, PA', CNPJ_BACURI, '12/07/2026', '30/07/2026', 'A implantação foi concluída por Carol Andrade.',
    faixa('<b>Portal só para consulta por atraso</b>, desde 20/11/2026, por Carol Andrade. Volta ao normal sozinho quando as faturas em atraso forem pagas. Nenhum dado foi apagado.',
          f'<a href="?aba=assinatura&amp;estado=cb-so-consulta">{ico("fatura", "ico ico-s")}Ver a assinatura</a>')) + '</template>\n'
CAB += '<template data-cab="cb-pequi">' + cab_outro('Pequi Advocacia', 'Cuiabá, MT', CNPJ_PEQUI, '01/09/2026', '15/09/2026',
                                                      'A implantação foi concluída por Carol Andrade.') + '</template>\n'
CAB += '<template data-cab="cb-mangaba">' + cab_outro(
    'Mangaba Advocacia', 'Natal, RN', CNPJ_MANGABA, '20/04/2026', '', '',
    faixa('<b>Só leitura.</b> Contrato encerrado em 02/08/2026. O acesso do escritório fechou em 01/09/2026; os dados ficam guardados até 02/08/2031.'),
    selo=f'<span class="selo selo-enc">{ico("cadeado")}Encerrado</span>',
    dir_html=('<section class="dir campo-ambar" aria-labelledby="t-fimc"><p class="sobretitulo" id="t-fimc">Contrato encerrado</p>'
              '<p class="grande">02/08<small>de 2026 · fim do contrato</small></p>'
              '<p class="dica" style="font-size:13px">Acesso fechado em <b>01/09/2026</b>. Ficou uma fatura em aberto, de julho.</p></section>')) + '</template>\n'


# ---------------------------------------------------------------- peças da aba
def dl(itens):
    out = '<dl class="dados-ficha">'
    for rot, val, cls in itens:
        out += f'<div class="{cls}"><dt>{rot}</dt><dd>{val}</dd></div>'
    return out + '</dl>'


def ass_topo(sub, acoes=True, editar_href='?aba=assinatura&amp;estado=cb-editar', mudar=True):
    a = ''
    if acoes:
        a = '<div class="acoes so-fin">'
        if mudar:
            a += f'<button class="btn btn-sec" type="button" data-janela="janela-mudar-plano">{ico("planos")}Mudar de plano</button>'
        a += f'<a class="btn btn-sec" href="{editar_href}">{ico("lapis")}Editar</a></div>'
    return f'<div class="cb-ass-topo"><div><h2 id="t-ass">Assinatura</h2><p class="sub">{sub}</p></div>{a}</div>'


SO_VER = (f'<p class="cb-so-ver msg-nao-fin">{ico("olho")}<span>Você vê o plano e a situação da cobrança. Valores, faturas e mudanças ficam com a Administração e o Financeiro.</span></p>')

MOT_DESC = 'Combinado na proposta de 30/10/2026: desconto de implantação nos 3 primeiros meses.'
DADOS_CEDRO = dl([
    ('Plano', f'<span class="cb-plano-nome">Escritório</span><span class="selo selo-neutro">até 8 pessoas</span>', ''),
    ('Mensalidade', f'{brl(49000)} por mês<span class="cb-peq">preço de quando assinou</span>', 'so-fin'),
    ('Pessoas ativas hoje', '9 de 8 <span class="cb-peq">1 a mais, R$ 39,00 por mês</span>', ''),
    ('Dia de vencimento', 'Todo dia 10', ''),
    ('Forma de pagamento', 'Pix <span class="cb-peq">o boleto vai junto, como alternativa</span>', 'so-fin'),
    ('Início da cobrança', '18/11/2026 <span class="cb-peq">quando passou para Ativo</span>', ''),
    ('E-mail de cobrança', 'financeiro@cedrolima.adv.br <span class="cb-peq">com cópia para Renata Lima, sócia dona</span>', 'inteira so-fin'),
    ('CNPJ da nota', f'<span class="num">{CNPJ_CEDRO}</span><span class="cb-peq">o mesmo da ficha</span>', 'so-fin'),
    ('Desconto', f'20% na mensalidade <span class="cb-peq">até a fatura de fevereiro de 2027 (3 faturas)</span>', 'so-fin'),
    ('Motivo do desconto', f'<span class="cb-motivo" style="margin:0">“{MOT_DESC}”</span>', 'inteira so-fin'),
])
MINI_CEDRO = ('<div class="cb-mini-hist so-fin"><h3>Mudanças da assinatura</h3><ul>'
              '<li><span>18/11/2026</span>Assinatura criada por Carol Andrade · plano Escritório, todo dia 10, Pix, desconto de 20% nas 3 primeiras faturas</li></ul></div>')


def folha_ass(topo, dados, extra=''):
    return f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden">{topo}{dados}{extra}</section>'


def folha_faturas(tabela, pe=''):
    return (f'<section class="folha so-fin" aria-labelledby="t-fats" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-fats">Faturas do escritório</h2>'
            f'<p class="sub">Da mais nova para a mais antiga. Todas ficam em Cobrança também.</p></div></div>{tabela}{pe}</section>')


FAT_CEDRO = tabela_esc([('dezembro/2026', CEDRO_TOTAL, '10/12/2026', 'avencer', None, 'emitida em 18/11, a primeira', 'cobranca.html?aba=fatura&amp;estado=ver', '')],
                       'Faturas da Cedro e Lima', acoes=False)
PE_FAT_CEDRO = f'<p class="docs-pe">{ico("relogio")}<span>A próxima, de janeiro de 2027, é emitida em 21/12/2026.</span></p>'


def situ(selo, valor_html, texto, extra=''):
    return (f'<section class="folha" aria-labelledby="t-situ"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-situ" style="font-size:20px">Situação da cobrança</h2></div>'
            f'<div class="cb-situ"><p>{selo}</p>{valor_html}<p>{texto}</p>{extra}</div></section>')


COMO = ('<section class="explica campo-ambar" aria-labelledby="t-como-c"><p class="sobretitulo">Como funciona</p><h2 id="t-como-c">A assinatura do escritório.</h2><ul>'
        f'<li>{ico("planos")}<span>Mudar de plano ou de dia vale na próxima fatura ainda não emitida. Sem proporcional: nada de crédito nem de diferença.</span></li>'
        f'<li>{ico("pessoas")}<span>Pessoa a mais conta quem está ativo no dia em que a fatura é emitida.</span></li>'
        f'<li>{ico("relogio")}<span>Com 7 dias de atraso, o sócio dono vê um aviso no Portal. Com 30, a Administração pode deixar o Portal só para consulta. Nada é apagado.</span></li>'
        f'<li>{ico("check")}<span>Ao pagar, o Portal volta ao normal sozinho.</span></li></ul></section>')


def grade(main, aside):
    return f'<div class="grade"><div class="col">{main}</div><aside class="col" aria-label="Situação da cobrança">{aside}</aside></div>'


def t_ass(est, corpo, cab='ativo', **kw):
    return tpl('assinatura:' + est, exemplo(corpo), cab=cab, sem_alerta=True, **kw)


SITU_CEDRO = situ(f'<span class="selo selo-ok">{ico("check")}Em dia</span>', f'<p class="cb-grande so-fin">{brl(CEDRO_TOTAL)}</p>',
                  'Próxima fatura: <b>dezembro de 2026</b>, vence em <b>10/12/2026</b>. É a primeira; já tem o desconto.')
EM_DIA = grade(folha_ass(ass_topo('Desde 18/11/2026. A cobrança começou quando o cliente passou para Ativo.'), DADOS_CEDRO, SO_VER + MINI_CEDRO)
               + folha_faturas(FAT_CEDRO, PE_FAT_CEDRO), SITU_CEDRO + COMO)
T = CAB
T += t_ass('cb-em-dia', EM_DIA)

# ---- sem assinatura (em implantação)
SEM = grade(f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="cb-ass-topo"><div><h2 id="t-ass">Assinatura</h2><p class="sub">Ainda não começou.</p></div></div>'
            f'<div class="estado sem-moldura" role="status" style="padding-top:12px"><span class="icone-estado">{ico("fatura")}</span><h3>Sem assinatura ainda</h3>'
            '<p>A cobrança começa quando a Cedro &amp; Lima passar para Ativo. Dá para deixar o plano, o dia e o desconto escolhidos agora; nenhuma fatura sai antes disso.</p>'
            f'<div class="acoes"><a class="btn btn-pri so-fin" href="?aba=assinatura&amp;estado=cb-editar">{ico("planos")}Preparar a assinatura</a></div>'
            f'<p class="permissao msg-nao-fin" style="justify-content:center">{ico("cadeado")}Quem prepara a assinatura é a Administração ou o Financeiro.</p></div></section>',
            situ(f'<span class="selo selo-implant">Em implantação</span>', '', 'Nenhuma fatura. A primeira é emitida no dia em que o cliente passar para Ativo.') + COMO)
T += t_ass('cb-sem', SEM, cab='impl')


# ---- editar
FORMAS = [('Pix', 'O boleto vai junto, como alternativa'), ('Boleto', 'O Pix vai junto, como alternativa'),
          ('Carnê', '12 parcelas iguais, de uma vez, cada uma com Pix e boleto')]


def form_ass(erros=(), conflito=False, ro=False):
    e = set(erros)
    plano = ('<div class="campo c6"><span style="font-size:13px;font-weight:500">Plano</span><p style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
             '<span class="cb-plano-nome">Escritório</span><span class="cb-peq">R$ 490,00 por mês, até 8 pessoas · para mudar, use “Mudar de plano”</span></p></div>')
    dia = selecao('as-dia', 'Dia de vencimento', ['5', '10', '15', '20', '25'], '10', 'Muda a partir da próxima fatura.', cls='c3', mudou=conflito)
    forma = radios('as-forma', 'Forma de pagamento', FORMAS, 'Pix', cls='c3', mudou=conflito)
    email = campo('as-email', 'E-mail de cobrança', 'financeiro@cedrolima' if 'email' in e else 'financeiro@cedrolima.adv.br',
                  'A fatura e os lembretes vão para este e-mail, com cópia para a sócia dona.',
                  'Confira o e-mail: falta o domínio, como em @cedrolima.adv.br.' if 'email' in e else '', tipo='email', cls='c3', foco='email' in e)
    cn = campo('as-cnpj', 'CNPJ da nota', '22.914.870/0001-66' if 'cnpj' in e else CNPJ_CEDRO, 'O mesmo da ficha. Mude só se a nota sai em outro CNPJ.',
               'Os dígitos do CNPJ não conferem. Confira o número no cartão do CNPJ.' if 'cnpj' in e else '', modo='numeric', cls='c3')
    desc = campo('as-desc', 'Desconto na mensalidade (%)', '20', 'De 0 a 100. Use 0 para sem desconto.', modo='numeric', cls='c2', opcional=True)
    ate = selecao('as-ate', 'Até a fatura de', ['dezembro de 2026', 'janeiro de 2027', 'fevereiro de 2027', 'março de 2027', 'Sem prazo'], 'fevereiro de 2027', cls='c2')
    ini = campo('as-ini', 'Início da cobrança', '18/11/2026', 'Não muda depois da primeira fatura.', ro=True, cls='c2')
    mot = campo('as-motivo', 'Motivo do desconto', '' if 'motivo' in e else MOT_DESC, 'Obrigatório quando há desconto. Fica no histórico da assinatura.',
                'Escreva o motivo do desconto. Ele fica no histórico da assinatura.' if 'motivo' in e else '', area=True, linhas=2, cls='c6')
    pe = ('<div class="form-pe"><p class="esq-pe">Vale a partir da próxima fatura ainda não emitida (janeiro de 2027). A de dezembro continua como está.</p>'
          f'<a class="btn btn-fantasma" href="?aba=assinatura&amp;estado=cb-em-dia">Cancelar</a><button class="btn btn-pri" type="button">{ico("check")}Salvar a assinatura</button></div>')
    return f'<div class="form-folha">{plano}{dia}{forma}{email}{cn}{desc}{ate}{ini}{mot}{pe}</div>'


def editar(topo='', **kw):
    f = (f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="cb-ass-topo"><div><h2 id="t-ass">Editar a assinatura</h2>'
         '<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div>'
         + (f'<div style="padding:0 24px 16px">{topo}</div>' if topo else '') + form_ass(**kw) + '</section>')
    return grade(f + folha_faturas(FAT_CEDRO, PE_FAT_CEDRO), SITU_CEDRO + COMO)


T += t_ass('cb-editar', editar())
T += t_ass('cb-editar-erros', editar(aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'Nada foi salvo.'), erros=('email', 'cnpj', 'motivo')))
_conf = aviso('urgencia', 'Marta Quintela salvou esta assinatura às 14h32, enquanto você editava.',
              'Nada do que você escreveu se perdeu. Compare os dois campos que mudaram e escolha qual versão fica.',
              acoes=(f'<button class="btn btn-pri" type="button">{ico("check")}Salvar a minha versão</button>'
                     f'<button class="btn btn-sec" type="button">Ficar com a versão salva</button>'),
              extra=('<table class="comparar"><caption class="sr">Campos que mudaram</caption><thead><tr><th scope="col">Campo</th><th scope="col">Salvo agora, por Marta</th><th scope="col">O que você escreveu</th></tr></thead>'
                     '<tbody><tr><th scope="row">Dia de vencimento</th><td>15</td><td>10</td></tr><tr><th scope="row">Forma de pagamento</th><td>Boleto</td><td>Pix</td></tr></tbody></table>'))
T += t_ass('cb-conflito', editar(_conf, conflito=True))

# ---- mudar de plano
MOT_MUDA = 'A Renata pediu: o escritório contrata mais 4 advogados em dezembro.'
conta = [('Mensalidade do Banca', 89000), ('Pessoa a mais (9 de 15)', 0), ('Desconto de 20% (2ª de 3)', -17800)]
tot = sum(v for _, v in conta)
assert tot == 71200
JM = janela('janela-mudar-plano', 'Assinatura · Cedro &amp; Lima', 'Mudar de plano',
            'A mudança vale na próxima fatura ainda não emitida, sem proporcional.',
            ('<div class="cb-compara-planos" aria-label="De Escritório para Banca"><div><span class="cb-peq">Hoje</span><strong>Escritório</strong><span>R$ 490,00 por mês · até 8 pessoas</span><span class="cb-peq">com 9 pessoas: R$ 529,00 sem desconto</span></div>'
             f'<span class="cb-seta" aria-hidden="true">{ico("seta")}</span>'
             '<div class="cb-novo"><span class="cb-peq">Novo</span><strong>Banca</strong><span>R$ 890,00 por mês · até 15 pessoas</span><span class="cb-peq">sem pessoa a mais</span></div></div>'
             + radios('mp-plano', 'Plano novo', [('Essencial', 'R$ 290,00 por mês · até 3 pessoas'), ('Escritório', 'R$ 490,00 por mês · até 8 pessoas · o plano de hoje'),
                                                 ('Banca', 'R$ 890,00 por mês · até 15 pessoas')], 'Banca')
             + '<div><p style="font-size:13px;font-weight:500;margin-bottom:6px">Primeira fatura no Banca: janeiro de 2027, vence em 10/01/2027</p><ul class="cb-conta">'
             + ''.join(f'<li><span>{r}</span><b>{brl(v)}</b></li>' for r, v in conta) + f'<li class="cb-tot"><span>Total</span><b>{brl(tot)}</b></li></ul></div>'
             + f'<p class="permissao">{ico("ajuda")}A fatura de dezembro já foi emitida e continua {brl(CEDRO_TOTAL)}. A assinatura guarda o preço de hoje do Banca, R$ 890,00.</p>'
             + campo('mp-motivo', 'Motivo', MOT_MUDA, 'Obrigatório. Fica no histórico da assinatura.', area=True, linhas=2, extra=' aria-required="true"')),
            f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button><button class="btn btn-pri" type="submit">{ico("planos")}Mudar para Banca</button>')
T += t_ass('cb-mudar-plano', EM_DIA + JM)

# ---- Bacuri: em atraso há 41 dias
DADOS_BAC = dl([
    ('Plano', f'<span class="cb-plano-nome">Fundador</span><span class="selo selo-neutro">até 5 pessoas · arquivado</span>', ''),
    ('Mensalidade', f'{brl(19000)} por mês<span class="cb-peq">preço de quando assinou</span>', 'so-fin'),
    ('Pessoas ativas hoje', '4 de 5', ''),
    ('Dia de vencimento', 'Todo dia 10', ''),
    ('Forma de pagamento', 'Boleto <span class="cb-peq">o Pix vai junto, como alternativa</span>', 'so-fin'),
    ('Início da cobrança', '30/07/2026', ''),
    ('E-mail de cobrança', 'luiza@bacuri.adv.br <span class="cb-peq">a própria sócia dona, Luíza Farias</span>', 'inteira so-fin'),
    ('CNPJ da nota', f'<span class="num">{CNPJ_BACURI}</span>', 'so-fin'),
    ('Desconto', 'Sem desconto', 'so-fin'),
])
FAT_BAC = tabela_esc([
    ('dezembro/2026', 19000, '10/12/2026', 'avencer', None, 'emitida hoje', '#', ''),
    ('novembro/2026', 19000, '10/11/2026', 'atraso', 10, 'aviso no Portal desde 17/11', '#', ''),
    ('outubro/2026', 19000, '10/10/2026', 'atraso', 41, '5 lembretes e 1 manual', 'cobranca.html?aba=fatura&amp;estado=atraso', ''),
    ('setembro/2026', 19000, '10/09/2026', 'paga', None, 'paga em 08/09, boleto', '#', ''),
    ('agosto/2026', 19000, '10/08/2026', 'paga', None, 'paga em 10/08, boleto', '#', ''),
], 'Faturas da Bacuri', acoes=False)


def atraso_box(consulta=False):
    if consulta:
        return (f'<section class="cb-atraso" aria-labelledby="t-atr"><p class="cb-dias" aria-hidden="true"><b>41</b><small>dias</small></p>'
                '<div class="cb-txt"><p class="sobretitulo">Portal só para consulta</p><h2 id="t-atr">A equipe da Bacuri só consulta, desde hoje</h2>'
                '<p>Todos veem tudo e a sócia dona baixa os dados, mas ninguém cria nem muda nada. <span class="so-fin">Quando as 2 faturas em atraso (<b>R$ 380,00</b>) forem pagas, </span>'
                '<span class="msg-nao-fin">Quando as faturas em atraso forem pagas, </span>o Portal volta ao normal sozinho. <b>Nenhum dado foi apagado.</b></p><p class="sr">41 dias em atraso.</p></div>'
                f'<div class="cb-botoes"><button class="btn btn-sec so-admin" type="button">{ico("abrir")}Devolver o acesso agora</button>'
                '<p class="cb-peq so-admin">Antes do pagamento, com motivo. Por exemplo, se a sócia mandou o comprovante.</p>'
                f'<p class="permissao msg-nao-admin">{ico("cadeado")}Quem devolve o acesso antes do pagamento é a Administração.</p></div></section>')
    return (f'<section class="cb-atraso" aria-labelledby="t-atr"><p class="cb-dias" aria-hidden="true"><b>41</b><small>dias</small></p>'
            '<div class="cb-txt"><p class="sobretitulo">Em atraso há mais de 30 dias</p><h2 id="t-atr">Duas faturas em aberto: outubro e novembro</h2>'
            '<p><span class="so-fin">Total em atraso: <b>R$ 380,00</b>. </span>Desde 17/10, o Portal mostra um aviso à sócia dona, Luíza Farias. '
            'Passou de 30 dias: a Administração decide se o Portal fica só para consulta até o pagamento. <b>Nenhum dado é apagado</b> e a exportação continua liberada.</p>'
            '<p class="sr">41 dias em atraso.</p></div>'
            f'<div class="cb-botoes"><button class="btn btn-perigo so-admin" type="button" data-janela="janela-consulta">{ico("cadeado")}Passar o Portal para só consulta</button>'
            f'<p class="permissao msg-nao-admin">{ico("cadeado")}Quem passa o Portal para só consulta é a Administração.</p></div></section>')


SITU_BAC = situ(f'<span class="selo selo-urgente">{ico("alerta")}Em atraso · 41 dias</span>', f'<p class="cb-grande cb-urg so-fin">{brl(38000)}</p>',
                '2 faturas em aberto, a mais antiga venceu em <b>10/10/2026</b>. Último lembrete: 12/11, por Marta Quintela.')
MINI_BAC = ('<div class="cb-mini-hist so-fin"><h3>Mudanças da assinatura</h3><ul>'
            '<li><span>01/10/2026</span>Plano Fundador arquivado · a Bacuri continua nele, pelo mesmo preço</li>'
            '<li><span>30/07/2026</span>Assinatura criada por Carol Andrade · plano Fundador, todo dia 10, boleto</li></ul></div>')
BAC = grade(folha_ass(ass_topo('Desde 30/07/2026.', editar_href='#'), DADOS_BAC, SO_VER + MINI_BAC) + folha_faturas(FAT_BAC), SITU_BAC + COMO)
KW_BAC = dict(nome='Bacuri Advocacia Trabalhista', docs='2', notas='4')
T += t_ass('cb-atraso', atraso_box() + BAC, cab='cb-bacuri', **KW_BAC)

MOT_CONS = 'Duas faturas em aberto há mais de 30 dias. A Luíza prometeu pagar até 25/11 e não pagou; tentamos por telefone em 12/11 e 19/11.'


def janela_consulta(erro=False):
    corpo = ((aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'O Portal continua normal.') if erro else '')
             + '<div class="fc-passagem" aria-hidden="true"><span class="selo selo-ativo"><span class="bolinha"></span>Portal normal</span>'
             + ico('seta') + f'<span class="selo selo-consulta">{ico("cadeado")}Só consulta</span></div>'
             '<ul class="tratar" style="padding:0;margin:0"><li>A equipe da Bacuri continua entrando e vendo tudo. Ninguém cria nem muda nada.</li>'
             '<li>Nenhum dado é apagado. A sócia dona continua baixando os dados e pagando pelo Portal.</li>'
             '<li>Ao pagar as 2 faturas em atraso, o Portal volta ao normal sozinho, assim que o pagamento é confirmado.</li>'
             '<li>Luíza Farias, a sócia dona, recebe um e-mail; a equipe vê uma faixa pedindo para falar com ela.</li>'
             '<li>Encerrar o contrato é outra ação, na aba Contrato e documentos.</li></ul>'
             + campo('cs-motivo', 'Motivo', '' if erro else MOT_CONS, 'Obrigatório. Fica no histórico do cliente, com seu nome e a hora. O escritório não vê.',
                     'Escreva o motivo. Ele fica no histórico do cliente.' if erro else '', area=True, foco=erro, extra=' aria-required="true"'))
    return janela('janela-consulta', 'Assinatura · Bacuri', 'Passar o Portal da Bacuri para só consulta?',
                  'São 41 dias de atraso, em 2 faturas, R$ 380,00. É o mesmo modo só consulta do fim do contrato, mas o contrato continua.', corpo,
                  f'<button class="btn btn-fantasma" type="button" data-fechar{"" if erro else " data-foco"}>Cancelar</button>'
                  f'<button class="btn fc-perigo-cheio" type="submit">{ico("cadeado")}Passar para só consulta</button>', alerta=True)


T += t_ass('cb-so-consulta-confirmar', atraso_box() + BAC + janela_consulta(), cab='cb-bacuri', **KW_BAC)
SITU_BAC_C = situ(f'<span class="selo selo-consulta">{ico("cadeado")}Portal só consulta</span>', f'<p class="cb-grande cb-urg so-fin">{brl(38000)}</p>',
                  'Em atraso há 41 dias. Desde 20/11/2026, por Carol Andrade. Volta sozinho ao pagar.')
MINI_BAC_C = MINI_BAC.replace('<ul>', f'<ul><li><span>20/11/2026</span>Portal passou para só consulta · Carol Andrade · <span class="cb-motivo" style="display:inline;border:0;padding:0">“{MOT_CONS}”</span></li>', 1)
BAC_C = grade(folha_ass(ass_topo('Desde 30/07/2026.', editar_href='#'), DADOS_BAC, SO_VER + MINI_BAC_C) + folha_faturas(FAT_BAC), SITU_BAC_C + COMO)
T += t_ass('cb-so-consulta', atraso_box(True) + BAC_C + toast('O Portal da Bacuri está só para consulta.', 'Luíza Farias recebeu um e-mail com as faturas em aberto e como pagar. O motivo ficou no histórico.'),
           cab='cb-bacuri-consulta', **KW_BAC)

# ---- Mangaba: contrato encerrado com fatura em aberto
DADOS_MAN = dl([
    ('Plano', '<span class="cb-plano-nome">Essencial</span><span class="selo selo-neutro">até 3 pessoas</span>', ''),
    ('Mensalidade', f'{brl(29000)} por mês', 'so-fin'),
    ('Dia de vencimento', 'Era todo dia 10', ''),
    ('Forma de pagamento', 'Boleto', 'so-fin'),
    ('Início e fim', '05/05/2026 a 02/08/2026 <span class="cb-peq">a assinatura terminou com o contrato</span>', 'inteira'),
    ('E-mail de cobrança', 'luis@mangaba.adv.br <span class="cb-peq">Luís Mangabeira, sócio dono · sem acesso ao Portal desde 01/09</span>', 'inteira so-fin'),
])
FAT_MAN = tabela_esc([
    ('julho/2026', 29000, '10/07/2026', 'atraso', 133, 'régua parada · lembretes só manuais', '',
     f'<button class="btn btn-sec btn-compacto" type="button">{ico("pagar", "ico ico-s")}Registrar pagamento<span class="sr"> de julho</span></button>'
     f'<button class="btn btn-fantasma btn-compacto" type="button">{ico("x", "ico ico-s")}Cancelar<span class="sr"> a fatura de julho</span></button>'),
    ('junho/2026', 29000, '10/06/2026', 'paga', None, 'paga em 09/06, boleto', '#', ''),
], 'Faturas da Mangaba', acoes=True)
SITU_MAN = situ(f'<span class="selo selo-urgente">{ico("alerta")}Fatura em aberto · 133 dias</span>', f'<p class="cb-grande cb-urg so-fin">{brl(29000)}</p>',
                'Julho de 2026, vencida em <b>10/07/2026</b>. O contrato acabou, mas a fatura continua valendo até ser paga ou cancelada com motivo.')
NOTA_MAN = (f'<p class="cb-so-ver">{ico("ajuda")}<span>Assinatura encerrada em 02/08/2026, com o contrato. Nenhuma fatura nova é emitida e a régua parou. '
            'O escritório não entra mais no Portal; o contato é por e-mail.</span></p>')
MAN = grade(folha_ass(ass_topo('Encerrada em 02/08/2026.', acoes=False), DADOS_MAN, NOTA_MAN) + folha_faturas(FAT_MAN), SITU_MAN)
T += t_ass('cb-encerrado', MAN, cab='cb-mangaba', nome='Mangaba Advocacia', docs='3', notas='2')

# ---- Pequi: assinatura em carnê
KW_PEQ = dict(nome='Pequi Advocacia', docs='2', notas='1')
DADOS_PEQ = dl([
    ('Plano', f'<span class="cb-plano-nome">Escritório</span><span class="selo selo-neutro">até 8 pessoas</span>', ''),
    ('Mensalidade', f'{brl(V_CARNE)} por mês<span class="cb-peq">preço de quando assinou</span>', 'so-fin'),
    ('Pessoas ativas hoje', '9 de 8 <span class="cb-peq">1 a mais desde 18/11/2026</span>', ''),
    ('Dia de vencimento', 'Todo dia 5', ''),
    ('Forma de pagamento', f'Carnê <span class="cb-peq">12 parcelas, de outubro de 2026 a setembro de 2027</span>', 'so-fin'),
    ('Início da cobrança', '15/09/2026 <span class="cb-peq">quando passou para Ativo</span>', ''),
    ('E-mail de cobrança', 'financeiro@pequi.adv.br <span class="cb-peq">com cópia para Helena Araújo, sócia dona</span>', 'inteira so-fin'),
    ('CNPJ da nota', f'<span class="num">{CNPJ_PEQUI}</span><span class="cb-peq">o mesmo da ficha</span>', 'so-fin'),
    ('Desconto', 'Sem desconto', 'so-fin'),
])
MINI_PEQ = ('<div class="cb-mini-hist so-fin"><h3>Mudanças da assinatura</h3><ul>'
            '<li><span>15/09/2026</span>O sistema gerou o carnê 2026/2027 · 12 parcelas de R$ 490,00, mandado em PDF a financeiro@pequi.adv.br</li>'
            '<li><span>15/09/2026</span>Assinatura criada por Carol Andrade · plano Escritório, todo dia 5, carnê de 12 parcelas</li></ul></div>')
AVISO_VALOR = aviso('atencao', 'O valor mudou: são 9 pessoas desde 18/11/2026.',
                    f'Com 1 pessoa a mais, a mensalidade passa a {brl(V_NOVO)}. As parcelas do carnê ficam em {brl(V_CARNE)} até um carnê novo, '
                    'que começa na próxima parcela ainda sem fatura: janeiro de 2027.', cls='so-fin')
FOLHA_CARNE = folha_carne('Carnê 2026/2027', f'12 parcelas de {brl(V_CARNE)} · outubro de 2026 a setembro de 2027 · todo dia 5 · gerado em 15/09/2026',
                          PARC_PEQUI, V_CARNE, aviso_html=AVISO_VALOR, cls_folha='folha so-fin')
FAT_PEQ = tabela_esc([
    ('dezembro/2026', V_CARNE, '05/12/2026', 'avencer', None, 'parcela 3 de 12 · emitida em 15/11', 'cobranca.html?aba=fatura&amp;estado=carne', ''),
    ('novembro/2026', V_CARNE, '05/11/2026', 'paga', None, 'parcela 2 · paga em 04/11', '#', ''),
    ('outubro/2026', V_CARNE, '05/10/2026', 'paga', None, 'parcela 1 · paga em 02/10', '#', ''),
], 'Faturas da Pequi', acoes=False)
PE_FAT_PEQ = f'<p class="docs-pe">{ico("relogio")}<span>A fatura de janeiro de 2027, parcela 4, é emitida em 16/12/2026, com os códigos da página 4 do carnê.</span></p>'
SITU_PEQ = situ(f'<span class="selo selo-ok">{ico("check")}Em dia</span>', f'<p class="cb-grande so-fin">{brl(V_CARNE)}</p>',
                'Próxima: <b>parcela 3 de 12</b>, dezembro de 2026, vence em <b>05/12/2026</b>.')
COMO_CARNE = ('<section class="explica campo-ambar" aria-labelledby="t-como-carne"><p class="sobretitulo">Como funciona</p><h2 id="t-como-carne">O carnê.</h2><ul>'
              f'<li>{ico("carne")}<span>12 parcelas com o mesmo valor, mandadas de uma vez em PDF. Cada parcela tem o próprio Pix e boleto.</span></li>'
              f'<li>{ico("fatura")}<span>Cada parcela é a fatura do mês, emitida 20 dias antes, com os mesmos códigos. A régua de lembretes vale igual.</span></li>'
              f'<li>{ico("check")}<span>Pode pagar adiantado: a parcela fica paga e a fatura do mês já nasce paga.</span></li>'
              f'<li>{ico("planos")}<span>Mudou o plano, o valor ou o dia: carnê novo a partir da próxima parcela sem fatura. As que faltam são canceladas com motivo, nunca apagadas.</span></li>'
              f'<li>{ico("relogio")}<span>20 dias antes da última parcela, sai o próximo carnê.</span></li></ul></section>')
PEQ = grade(folha_ass(ass_topo('Desde 15/09/2026. Paga por carnê.', editar_href='?aba=assinatura&amp;estado=cb-editar-carne'), DADOS_PEQ, SO_VER + MINI_PEQ)
            + FOLHA_CARNE + folha_faturas(FAT_PEQ, PE_FAT_PEQ), SITU_PEQ + COMO_CARNE)
T += t_ass('cb-carne', PEQ, cab='cb-pequi', **KW_PEQ)


def form_pequi():
    plano = ('<div class="campo c6"><span style="font-size:13px;font-weight:500">Plano</span><p style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
             '<span class="cb-plano-nome">Escritório</span><span class="cb-peq">R$ 490,00 por mês, até 8 pessoas · para mudar, use “Mudar de plano”</span></p></div>')
    dia = selecao('as-dia', 'Dia de vencimento', ['5', '10', '15', '20', '25'], '5', 'Com carnê, mudar o dia gera um carnê novo.', cls='c3')
    forma = radios('as-forma', 'Forma de pagamento', FORMAS, 'Carnê', cls='c3')
    parc = selecao('as-parc', 'Parcelas por carnê', ['12'], '12', 'Uma por mês. O próximo carnê sai 20 dias antes da última parcela.', cls='c3')
    atual = ('<div class="campo c3"><span style="font-size:13px;font-weight:500">Carnê em uso</span>'
             '<p style="margin:6px 0 0">Carnê 2026/2027 · parcelas 1 e 2 pagas, 3 a 12 por pagar</p>'
             f'<p class="ajuda"><a href="#">Baixar o carnê (PDF)</a></p></div>')
    email = campo('as-email', 'E-mail de cobrança', 'financeiro@pequi.adv.br', 'O carnê, as faturas e os lembretes vão para este e-mail, com cópia para a sócia dona.', tipo='email', cls='c3')
    cn = campo('as-cnpj', 'CNPJ da nota', CNPJ_PEQUI, 'O mesmo da ficha. Mude só se a nota sai em outro CNPJ.', modo='numeric', cls='c3')
    regra = ('<div class="c6">' + aviso('info', 'Com o carnê em uso, mudar o dia, a forma ou o valor gera um carnê novo.',
                                         'Ele começa na próxima parcela ainda sem fatura, janeiro de 2027. As parcelas 4 a 12 do carnê de hoje são canceladas com o motivo, '
                                         'nunca apagadas. Dezembro, já emitida, continua valendo. Ao salvar, você confirma numa janela.') + '</div>')
    pe = ('<div class="form-pe"><p class="esq-pe">Mudar só o e-mail ou o CNPJ não mexe no carnê.</p>'
          f'<a class="btn btn-fantasma" href="?aba=assinatura&amp;estado=cb-carne">Cancelar</a><button class="btn btn-pri" type="button">{ico("check")}Salvar a assinatura</button></div>')
    return f'<div class="form-folha">{plano}{dia}{forma}{parc}{atual}{email}{cn}{regra}{pe}</div>'


ED_PEQ = (f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="cb-ass-topo"><div><h2 id="t-ass">Editar a assinatura</h2>'
          '<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div>' + form_pequi() + '</section>')
T += t_ass('cb-editar-carne', grade(ED_PEQ + FOLHA_CARNE.replace(AVISO_VALOR, ''), SITU_PEQ + COMO_CARNE), cab='cb-pequi', **KW_PEQ)

# ---- gerar novo carnê (valor mudou: 9 pessoas)
MOT_CARNE = 'A Pequi tem 9 pessoas desde 18/11. Helena concordou com a pessoa a mais a partir de janeiro, por telefone, em 19/11.'
_cancel = 9 * V_CARNE
assert _cancel == 441000 and 12 * V_NOVO == 634800
JCN = janela('janela-carne-novo', 'Assinatura · Pequi', 'Gerar um carnê novo para a Pequi?',
             f'A mensalidade passou de {brl(V_CARNE)} para {brl(V_NOVO)} (9 pessoas desde 18/11). O carnê novo começa na próxima parcela ainda sem fatura: janeiro de 2027.',
             ('<div class="cb-compara-planos" aria-label="Do carnê de hoje para o carnê novo"><div><span class="cb-peq">Hoje</span><strong>Carnê 2026/2027</strong>'
              f'<span>12 × {brl(V_CARNE)} · todo dia 5</span><span class="cb-peq">2 pagas · dezembro emitida · 9 sem fatura</span></div>'
              f'<span class="cb-seta" aria-hidden="true">{ico("seta")}</span>'
              f'<div class="cb-novo"><span class="cb-peq">Novo</span><strong>Carnê 2027</strong><span>12 × {brl(V_NOVO)} · todo dia 5</span>'
              f'<span class="cb-peq">janeiro a dezembro de 2027 · total {brl(12 * V_NOVO)}</span></div></div>'
              '<ul class="tratar" style="padding:0;margin:0">'
              f'<li>Dezembro de 2026 (parcela 3) continua valendo, por {brl(V_CARNE)}: a fatura já foi emitida e não muda.</li>'
              f'<li>As parcelas 4 a 12 do carnê 2026/2027 (9 parcelas, {brl(_cancel)}) são canceladas, com o motivo. Nada é apagado: elas ficam na assinatura como Canceladas.</li>'
              '<li>O carnê novo vai em PDF para financeiro@pequi.adv.br, com cópia para Helena Araújo, e aparece no Portal. O e-mail pede para descartar as páginas 4 a 12 do carnê antigo.</li>'
              '<li>Parcela paga adiantada no carnê antigo continua paga, sem diferença a cobrar.</li></ul>'
              + campo('cn-motivo', 'Motivo', MOT_CARNE, 'Obrigatório. Fica no histórico da assinatura e das parcelas canceladas. O escritório não vê.', area=True, linhas=2, extra=' aria-required="true"')),
             f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button><button class="btn btn-pri" type="submit">{ico("carne")}Gerar o carnê novo</button>',
             alerta=True)
T += t_ass('cb-carne-novo', PEQ + JCN, cab='cb-pequi', **KW_PEQ)

# ---- erro ao carregar a aba
ERRO = (f'<div class="estado estado-erro" role="alert"><span class="icone-estado">{ico("alerta")}</span><h3>Não deu para abrir a assinatura</h3>'
        '<p>O servidor não respondeu. Nada do que estava salvo se perdeu. Tente de novo em instantes; se continuar, mande o código ao suporte.</p>'
        f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button></div><p class="codigo">Código para o suporte: CNS-2A90-6612</p></div>')
T += t_ass('cb-erro', ERRO)

# ---------------------------------------------------------------- página
TROCAS = [
    ('<a data-aba="equipe" href="?aba=equipe">', '<a data-aba="assinatura" href="?aba=assinatura">Assinatura</a>\n        <a data-aba="equipe" href="?aba=equipe">'),
    ('com as abas Ficha, Sócio, Contrato, Equipe T3jus, Notas internas e Histórico.', 'com as abas Ficha, Sócio, Contrato, Assinatura, Equipe T3jus, Notas internas e Histórico.'),
]
montar('ficha.html', os.path.join(SAIDA, 'ficha.html'), CSS_CB + CSS_FICHA, T, TROCAS, pos=lambda s: trilho_console(s))
print('ficha ok', T.count('<template data-est='), 'estados')
