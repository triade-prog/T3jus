# D41 · Console › ficha › Assinatura: os estados 1 a 10 do plano-v2 (4.2), com o carnê que tem o valor de cada parcela.
# Parte da ficha aprovada mais recente (cobranca-pdfs/ficha.html) e das peças do ficha_cb.py aprovado.
# Uso: python3 d41_ficha.py <pasta-saida>
import sys, os
from d41_base import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
dl, ass_topo, SO_VER, folha_ass, folha_faturas, situ, grade, t_ass, tabela_esc, cab_outro, cnpj, selo_sit, bloco, SRC = (
    F[k] for k in ('dl', 'ass_topo', 'SO_VER', 'folha_ass', 'folha_faturas', 'situ', 'grade', 't_ass', 'tabela_esc', 'cab_outro', 'cnpj', 'selo_sit', 'bloco', 'SRC'))

# ---------------------------------------------------------------- escritórios do exemplo
CNPJ_JAT, CNPJ_UMB, CNPJ_CAJA, CNPJ_MUR = cnpj('451807230001'), cnpj('462310980001'), cnpj('437702150001'), cnpj('470164520001')
CAB = ''
CAB += '<template data-cab="d41-jatoba">' + cab_outro('Jatobá Advocacia', 'Palmas, TO', CNPJ_JAT, '04/11/2026', '18/11/2026', 'A implantação foi concluída por Carol Andrade.') + '</template>\n'
CAB += '<template data-cab="d41-umbu">' + cab_outro('Umbu Advocacia', 'Petrolina, PE', CNPJ_UMB, '03/11/2026', '18/11/2026', 'A implantação foi concluída por Rafael Teles.') + '</template>\n'
CAB += '<template data-cab="d41-caja">' + cab_outro('Cajá Advocacia', 'Aracaju, SE', CNPJ_CAJA, '05/11/2026', '18/11/2026', 'A implantação foi concluída por Carol Andrade.') + '</template>\n'
_impl = bloco(SRC, '<template data-cab="impl"')
_impl = _impl[_impl.index('>') + 1:]
_mur = (_impl.replace('Cedro &amp; Lima Advocacia', 'Murici Advocacia').replace('Recife, PE', 'Teresina, PI').replace('22.914.870/0001-09', CNPJ_MUR)
        .replace('desde 04/11/2026', 'desde 23/11/2026'))
assert _mur != _impl
CAB += '<template data-cab="d41-murici">' + _mur + '</template>\n'
KW_JAT = dict(nome='Jatobá Advocacia', docs='2', notas='1')
KW_UMB = dict(nome='Umbu Advocacia', docs='2', notas='0')
KW_CAJA = dict(nome='Cajá Advocacia', docs='2', notas='2')
KW_MUR = dict(nome='Murici Advocacia', docs='1', notas='0')
LINK_FAT_JAT = 'cobranca.html?aba=fatura&amp;estado=carne-desconto'
PDF_CARNE = 'carne-a4.html?estado=carne-desconto'


def dados(plano='Escritório', pessoas='6 de 6 <span class="cb-peq">nenhuma a mais</span>', dia='Todo dia 10', forma='', inicio='18/11/2026',
          email='financeiro@jatoba.adv.br', socia='Beatriz Nogueira', cn=CNPJ_JAT, end='Quadra 104 Norte, Rua NE 5, lote 32, sala 7 · Plano Diretor Norte · Palmas, TO · CEP 77006-020',
          pct=20, ate='fevereiro de 2027', mot=MOT_NOVO, quando_ate='3 faturas, contadas da 1ª'):
    desc = (f'Desconto de entrada de {pct}% na mensalidade <span class="cb-peq">até a fatura de {ate} ({quando_ate})</span>' if pct else 'Sem desconto')
    it = [
        ('Plano', f'<span class="cb-plano-nome">{plano}</span><span class="selo selo-neutro">até {INCLUI[plano]} pessoas</span>', ''),
        ('Mensalidade', f'{brl(PRECO[plano])} por mês<span class="cb-peq">preço de quando assinou</span>', 'so-fin'),
        ('Pessoas ativas hoje', pessoas, ''),
        ('Dia de vencimento', dia, ''),
        ('Forma de pagamento', f'Carnê <span class="cb-peq">{forma}</span>', 'so-fin'),
        ('Início da cobrança', f'{inicio} <span class="cb-peq">quando passou para Ativo</span>', ''),
        ('E-mail de cobrança', f'{email} <span class="cb-peq">com cópia para {socia}, sócia dona</span>', 'inteira so-fin'),
        ('Endereço de cobrança', f'{end} <span class="cb-peq">vai no boleto como endereço do pagador · o mesmo da ficha</span>', 'inteira so-fin'),
        ('CNPJ da nota', f'<span class="num">{cn}</span><span class="cb-peq">o mesmo da ficha</span>', 'so-fin'),
        ('Desconto', desc, 'so-fin'),
    ]
    if pct:
        it.append(('Motivo do desconto', f'<span class="cb-motivo" style="margin:0">“{mot}”</span><span class="cb-peq">aparece na fatura do escritório</span>', 'inteira so-fin'))
    return dl(it)


def mini(itens):
    return ('<div class="cb-mini-hist so-fin"><h3>Mudanças da assinatura</h3><ul>'
            + ''.join(f'<li><span>{d}</span>{t}</li>' for d, t in itens) + '</ul></div>')


COMO = ('<section class="explica campo-ambar" aria-labelledby="t-como-carne"><p class="sobretitulo">Como funciona</p><h2 id="t-como-carne">O carnê com desconto de entrada.</h2><ul>'
        f'<li>{ico("carne")}<span>12 parcelas mandadas de uma vez em PDF. Cada parcela tem o próprio Pix e boleto e o valor do mês dela.</span></li>'
        f'<li>{ico("desconto")}<span>O desconto de entrada vale só nas parcelas até o fim do prazo, contado da 1ª fatura. Depois, o valor cheio do plano, sem carnê novo.</span></li>'
        f'<li>{ico("fatura")}<span>Cada parcela é a fatura do mês, emitida 20 dias antes, com os mesmos códigos e os mesmos itens.</span></li>'
        f'<li>{ico("planos")}<span>Mudou o plano, o dia ou o desconto: você vê a prévia e confirma um carnê novo, a partir da próxima parcela sem fatura. Nenhum mês fica sem parcela nem se repete.</span></li>'
        f'<li>{ico("pessoas")}<span>Mudou o número de pessoas: o Console avisa e você gera o carnê novo, com motivo.</span></li>'
        f'<li>{ico("check")}<span>Fatura emitida e parcela paga não mudam. Canceladas ficam na assinatura, nunca apagadas.</span></li></ul></section>')


def pe_fat(txt):
    return f'<p class="docs-pe">{ico("relogio")}<span>{txt}</span></p>'


def topo_jat(sub='Desde 18/11/2026. Paga por carnê.'):
    return ass_topo(sub, editar_href='?aba=assinatura&amp;estado=cb-desconto-troca')


def subst(nome, ps, quando, pe, id_='t-subst'):
    return folha_carne(f'{nome}', f'{texto_faixas(faixas(ps))} · {periodo(ps)} · substituído em {quando}', ps, id_=id_,
                       cls_folha='folha so-fin d41-subst', acoes=False, pe=pe,
                       selo_h2=f' <span class="selo d41-selo-subst" style="vertical-align:3px;margin-left:8px">{ico("trocar")}Substituído</span>')


def copia(ps):
    return [dict(p) for p in ps]


# ---------------------------------------------------------------- 1. cb-carne-desconto: a folha com as faixas e os canhotos com valor e selo
MINI_JAT = mini([
    ('18/11/2026', f'O sistema gerou o carnê 2026/2027 · {texto_faixas(faixas(JAT))}, mandado em PDF a financeiro@jatoba.adv.br'),
    ('18/11/2026', 'O sistema ajustou o desconto de entrada para até a fatura de fevereiro de 2027: 3 meses a partir da 1ª fatura, dezembro (era até janeiro)'),
    ('04/11/2026', 'Assinatura preparada por Carol Andrade · plano Escritório, todo dia 10, carnê de 12 parcelas, desconto de entrada de 20% por 3 meses'),
])
D_JAT = dados(forma='12 parcelas, de dezembro de 2026 a novembro de 2027')
F_JAT = folha_carne('Carnê 2026/2027', sub_carne(JAT, 10, '18/11/2026'), JAT, cls_folha='folha so-fin', baixar=PDF_CARNE)
FAT_JAT = tabela_esc([('dezembro/2026', 39920, '10/12/2026', 'avencer', None, 'parcela 1 de 12 · emitida em 18/11 · com o desconto de entrada', LINK_FAT_JAT, '')],
                     'Faturas da Jatobá', acoes=False)
PE_FAT_JAT = pe_fat('A fatura de janeiro de 2027, parcela 2, é emitida em 21/12/2026, com os códigos e os itens da página 2 do carnê: R$ 399,20, com o desconto de entrada.')
SITU_JAT = situ(f'<span class="selo selo-ok">{ico("check")}Em dia</span>', f'<p class="cb-grande so-fin">{brl(39920)}</p>',
                'Próxima: <b>parcela 1 de 12</b>, dezembro de 2026, vence em <b>10/12/2026</b>, com o desconto de entrada.')
JM_FECHADA = None  # definida no estado 9 e reaproveitada fechada no estado 1
T = CAB


# ---------------------------------------------------------------- 9 (antes, para reaproveitar): mudar de plano com carnê
def janela_mudar(abrir=True):
    conta = [('Mensalidade do Banca', 74900), ('Pessoa a mais (6 de 10)', 0), ('Desconto de entrada (20% da mensalidade, 2ª de 3)', -14980)]
    tot = sum(v for _, v in conta)
    assert tot == JATB[0]['valor'] == 59920
    corpo = ('<div class="cb-compara-planos" aria-label="De Escritório para Banca"><div><span class="cb-peq">Hoje</span><strong>Escritório</strong>'
             f'<span>{brl(PRECO["Escritório"])} por mês · até 6 pessoas</span><span class="cb-peq">carnê: <span class="d41-fx">{texto_faixas(faixas(JAT), True)}</span></span></div>'
             f'<span class="cb-seta" aria-hidden="true">{ico("seta")}</span>'
             f'<div class="cb-novo"><span class="cb-peq">Novo</span><strong>Banca</strong><span>{brl(PRECO["Banca"])} por mês · até 10 pessoas</span>'
             f'<span class="cb-peq">carnê novo: <span class="d41-fx">{texto_faixas(faixas(JATB), True)}</span></span></div></div>'
             + radios('mp-plano', 'Plano novo', [('Essencial', f'{brl(PRECO["Essencial"])} por mês · até 3 pessoas'), ('Escritório', f'{brl(PRECO["Escritório"])} por mês · até 6 pessoas · o plano de hoje'),
                                                 ('Banca', f'{brl(PRECO["Banca"])} por mês · até 10 pessoas')], 'Banca')
             + '<div><p style="font-size:13px;font-weight:500;margin-bottom:6px">Primeira parcela no Banca: janeiro de 2027, vence em 10/01/2027</p><ul class="cb-conta">'
             + ''.join(f'<li><span>{r}</span><b>{brl(v)}</b></li>' for r, v in conta) + f'<li class="cb-tot"><span>Total</span><b>{brl(tot)}</b></li></ul></div>'
             + previa('O carnê novo no Banca', JATB, '<p class="cb-peq">O desconto de entrada continua até a fatura de fevereiro de 2027, agora sobre o preço do Banca. As 6 pessoas cabem no plano.</p>')
             + f'<p class="permissao">{ico("ajuda")}A fatura de dezembro já foi emitida e continua {brl(39920)}. As parcelas 2 a 12 do carnê 2026/2027 são canceladas com o motivo, nunca apagadas. A assinatura guarda o preço de hoje do Banca, {brl(PRECO["Banca"])}.</p>'
             + campo('mp-motivo', 'Motivo', 'A Beatriz pediu: o escritório contrata mais 3 advogados em janeiro.', 'Obrigatório. Fica no histórico da assinatura e das parcelas canceladas.', area=True, linhas=2, extra=' aria-required="true"'))
    return janela('janela-mudar-plano', 'Assinatura · Jatobá', 'Mudar de plano',
                  'A mudança vale na próxima parcela ainda sem fatura, sem proporcional. Com carnê, sai um carnê novo a partir dela.', corpo,
                  f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button><button class="btn btn-pri" type="submit">{ico("planos")}Mudar para Banca e trocar o carnê</button>',
                  abrir=abrir)


PAG1 = grade(folha_ass(topo_jat(), D_JAT, SO_VER + MINI_JAT) + F_JAT + folha_faturas(FAT_JAT, PE_FAT_JAT), SITU_JAT + COMO)
T += t_ass('cb-carne-desconto', PAG1 + janela_mudar(False), cab='d41-jatoba', **KW_JAT)

# ---------------------------------------------------------------- 2. cb-carne-desconto-meio: o carnê começa no meio do desconto (2 + 10)
_umb = copia(UMB)
_umb[0].update(sit='proxima', nota='fatura em 21/12')
D_UMB = dados(forma='12 parcelas, de janeiro a dezembro de 2027 · até dezembro, Pix', email='financeiro@umbu.adv.br', socia='Joana Brandão', cn=CNPJ_UMB,
              end='Avenida Souza Filho, 615, sala 204 · Centro · Petrolina, PE · CEP 56304-000')
NOTA_UMB = nota('<b>O desconto de entrada vai até a fatura de fevereiro de 2027.</b> Dezembro foi pago por Pix, já com o desconto. '
                'Por isso o carnê leva o desconto só em janeiro e fevereiro, e as outras 10 parcelas saem com o valor cheio.', 'desconto')
F_UMB = folha_carne('Carnê 2027', sub_carne(_umb, 10, '25/11/2026'), _umb, nota_html=NOTA_UMB, cls_folha='folha so-fin', baixar=PDF_CARNE)
MINI_UMB = mini([
    ('25/11/2026', f'O sistema gerou o carnê 2027 · {texto_faixas(faixas(UMB))}, mandado em PDF a financeiro@umbu.adv.br'),
    ('25/11/2026', 'Marta Quintela mudou a forma de pagamento de Pix para Carnê, a partir de janeiro de 2027'),
    ('18/11/2026', 'Assinatura criada por Rafael Teles · plano Escritório, todo dia 10, Pix, desconto de entrada de 20% nas 3 primeiras faturas'),
])
FAT_UMB = tabela_esc([('dezembro/2026', 39920, '10/12/2026', 'paga', None, 'paga em 22/11, Pix · com o desconto de entrada', '#', '')], 'Faturas da Umbu', acoes=False)
SITU_UMB = situ(f'<span class="selo selo-ok">{ico("check")}Em dia</span>', f'<p class="cb-grande so-fin">{brl(39920)}</p>',
                'Próxima: <b>parcela 1 de 12</b> do carnê 2027, janeiro, vence em <b>10/01/2027</b>, com o desconto de entrada.')
PAG2 = grade(folha_ass(ass_topo('Desde 18/11/2026. Paga por carnê desde janeiro de 2027.', editar_href='#'), D_UMB, SO_VER + MINI_UMB) + F_UMB
             + folha_faturas(FAT_UMB, pe_fat('A fatura de janeiro de 2027, parcela 1 do carnê, é emitida em 21/12/2026.')), SITU_UMB + COMO)
T += t_ass('cb-carne-desconto-meio', PAG2, cab='d41-umbu', **KW_UMB)

# ---------------------------------------------------------------- 3. cb-carne-pulou-adiantada: o carnê trocado pula o mês pago adiantado
_cn = copia(CAJA_NOVO)
_cn[0].update(sit='proxima', nota='fatura em 31/12')
_ca = copia(CAJA_ANT)
for p in _ca:
    p['sit'] = 'cancelada'
_ca[0].update(sit='paga', nota='em 24/11')
_ca[2].update(sit='paga', nota='adiantada, em 26/11')
NOTA_CAJA = nota('<b>Fevereiro de 2027 não entra neste carnê.</b> Foi pago adiantado no carnê 2026/2027, em 26/11, e continua pago. '
                 'O carnê novo começa em janeiro, o primeiro mês cancelado, pula fevereiro e vai até janeiro de 2028. Nenhum mês fica sem parcela nem com duas.', 'check')
F_CAJA = folha_carne('Carnê 2027/2028', sub_carne(_cn, 20, '27/11/2026', ', sem fevereiro'), _cn, nota_html=NOTA_CAJA, cls_folha='folha so-fin', baixar=PDF_CARNE,
                     fora=(1, (2027, 2), 'fora deste carnê · paga adiantada no carnê 2026/2027'))
S_CAJA = subst('Carnê 2026/2027', _ca, '27/11/2026',
               'Trocado em 27/11/2026 por Carol Andrade: “O dia de vencimento mudou: de 10 para 20.” As parcelas pagas continuam pagas, sem diferença a cobrar; as canceladas ficam aqui, nunca apagadas.')
D_CAJA = dados(dia='Todo dia 20 <span class="cb-peq">era dia 10 até 27/11/2026</span>', forma='12 parcelas, de janeiro de 2027 a janeiro de 2028',
               email='financeiro@caja.adv.br', socia='Lívia Sampaio', cn=CNPJ_CAJA, end='Rua Itabaiana, 410, sala 1203 · Centro · Aracaju, SE · CEP 49010-170')
MINI_CAJA = mini([
    ('27/11/2026', f'Carol Andrade mudou o dia de 10 para 20 e trocou o carnê · carnê 2027/2028, {texto_faixas(faixas(CAJA_NOVO))}, sem fevereiro (já pago)'),
    ('18/11/2026', f'O sistema gerou o carnê 2026/2027 · {texto_faixas(faixas(CAJA_ANT))}'),
])
FAT_CAJA = tabela_esc([('fevereiro/2027', 39920, '10/02/2027', 'paga', None, 'parcela 3 do carnê 2026/2027 · paga adiantada em 26/11, Pix', '#', ''),
                       ('dezembro/2026', 39920, '10/12/2026', 'paga', None, 'parcela 1 do carnê 2026/2027 · paga em 24/11, boleto', '#', '')], 'Faturas da Cajá', acoes=False)
SITU_CAJA = situ(f'<span class="selo selo-ok">{ico("check")}Em dia</span>', f'<p class="cb-grande so-fin">{brl(39920)}</p>',
                 'Próxima: <b>parcela 1 de 12</b> do carnê 2027/2028, janeiro, vence em <b>20/01/2027</b>. Fevereiro já está pago.')
TOAST_CAJA = toast('Assinatura salva e carnê trocado.', 'O carnê 2027/2028 foi para financeiro@caja.adv.br e está no Portal. As parcelas 2 e 4 a 12 do carnê 2026/2027 ficaram como Canceladas, com o motivo.')
PAG3 = grade(folha_ass(ass_topo('Desde 18/11/2026. Paga por carnê.', editar_href='#'), D_CAJA, SO_VER + MINI_CAJA) + F_CAJA + S_CAJA
             + folha_faturas(FAT_CAJA, pe_fat('A fatura de janeiro de 2027, parcela 1 do carnê 2027/2028, é emitida em 31/12/2026.')), SITU_CAJA + COMO)
T += t_ass('cb-carne-pulou-adiantada', PAG3 + TOAST_CAJA, cab='d41-caja', **KW_CAJA)

# ---------------------------------------------------------------- 4. cb-editar-carne-desconto: preparar com Carnê e desconto (e o erro de 100%)
MUR = carne((2026, 12), 10, P, 20, (2027, 2))


def form_murici(erro=False):
    plano = selecao('as-plano', 'Plano', [f'Essencial · {brl(PRECO["Essencial"])} · até 3 pessoas', f'Escritório · {brl(PRECO["Escritório"])} · até 6 pessoas',
                                         f'Banca · {brl(PRECO["Banca"])} · até 10 pessoas'], f'Escritório · {brl(PRECO["Escritório"])} · até 6 pessoas',
                    'Hoje a Murici tem 5 pessoas no Portal.', cls='c3')
    dia = selecao('as-dia', 'Dia de vencimento', ['5', '10', '15', '20', '25'], '10', cls='c3')
    forma = radios('as-forma', 'Forma de pagamento', F['FORMAS'][:2] + [('Carnê', '12 parcelas de uma vez, cada uma com Pix, boleto e o valor do mês dela')], 'Carnê', cls='c3')
    parc = selecao('as-parc', 'Parcelas por carnê', ['12'], '12', 'Uma por mês. O próximo carnê sai 20 dias antes da última parcela.', cls='c3')
    email = campo('as-email', 'E-mail de cobrança', 'financeiro@murici.adv.br', 'O carnê, as faturas e os lembretes vão para este e-mail, com cópia para a sócia dona.', tipo='email', cls='c3')
    cn = campo('as-cnpj', 'CNPJ da nota', CNPJ_MUR, 'O mesmo da ficha.', modo='numeric', cls='c3')
    desc = campo('as-desc', 'Desconto de entrada (%)', '100' if erro else '20', 'Com carnê, de 0 a 99. Use 0 para sem desconto.',
                 'No carnê, o desconto vai até 99%.' if erro else '', modo='numeric', cls='c2', opcional=True, foco=erro)
    ate = selecao('as-ate', 'Até a fatura de', ['dezembro de 2026', 'janeiro de 2027', 'fevereiro de 2027', 'março de 2027', 'Sem prazo'], 'fevereiro de 2027',
                  'Conta da 1ª fatura de verdade.', cls='c2')
    ini = campo('as-ini', 'Início da cobrança', 'Quando passar para Ativo', 'A 1ª fatura sai nesse dia.', ro=True, cls='c2')
    ajuda = (f'<p class="permissao d41-ajuda-desc">{ico("desconto")}<span>No carnê, o desconto vale só nas parcelas até a fatura de <b>fevereiro de 2027</b>: dezembro, janeiro e fevereiro. '
             'São as 3 primeiras faturas: se a Murici passar para Ativo depois de novembro, o prazo anda junto, sozinho.</span></p>')
    mot = campo('as-motivo', 'Motivo do desconto', MOT_NOVO, 'Aparece na fatura do escritório. Escreva para o cliente ler.', area=True, linhas=2, cls='c6')
    if erro:
        pv = (f'<div class="d41-previa" role="group" aria-labelledby="pv-mur"><h3 id="pv-mur">Como fica o carnê</h3>'
              f'<p class="cb-peq">A prévia volta quando o desconto estiver entre 0 e 99%.</p></div>')
    else:
        pv = previa('Como fica o carnê, se a Murici passar para Ativo ainda em novembro', MUR,
                    '<p class="cb-peq">Prévia feita na tela, só para conferir. Quem gera o carnê é o sistema, no dia em que a Murici passar para Ativo.</p>')
    pe = ('<div class="form-pe"><p class="esq-pe">Nenhuma fatura nem carnê sai antes de a Murici passar para Ativo.</p>'
          f'<a class="btn btn-fantasma" href="#">Cancelar</a><button class="btn btn-pri" type="button">{ico("check")}Salvar a assinatura</button></div>')
    return f'<div class="form-folha">{plano}{dia}{forma}{parc}{email}{cn}{desc}{ate}{ini}{ajuda}{mot}{pv}{pe}</div>'


def editar_murici(erro=False):
    topo = (f'<div style="padding:0 24px 16px">{aviso("urgencia", "Falta acertar 1 ponto, marcado abaixo.", "Nada foi salvo.")}</div>' if erro else '')
    f = (f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="cb-ass-topo"><div><h2 id="t-ass">Preparar a assinatura</h2>'
         '<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div>' + topo + form_murici(erro) + '</section>')
    s = situ('<span class="selo selo-implant">Em implantação</span>', '', 'Nenhuma fatura. A primeira é emitida no dia em que a Murici passar para Ativo.')
    return grade(f, s + COMO)


T += t_ass('cb-editar-carne-desconto', editar_murici(), cab='d41-murici', **KW_MUR)
T += t_ass('cb-editar-carne-desconto-erros', editar_murici(True), cab='d41-murici', **KW_MUR)


# ---------------------------------------------------------------- 5 e 6. cb-desconto-troca: o alertdialog da troca (e com as pessoas)
def form_jatoba(pct='30', mot=MOT_OUTRO, mudou=True):
    m = '<span class="mudou">Mudou</span>' if mudou else ''
    plano = ('<div class="campo c6"><span style="font-size:13px;font-weight:500">Plano</span><p style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
             f'<span class="cb-plano-nome">Escritório</span><span class="cb-peq">{brl(P)} por mês, até 6 pessoas · para mudar, use “Mudar de plano”</span></p></div>')
    dia = selecao('as-dia', 'Dia de vencimento', ['5', '10', '15', '20', '25'], '10', 'Com carnê, mudar o dia troca o carnê.', cls='c3')
    forma = radios('as-forma', 'Forma de pagamento', F['FORMAS'][:2] + [('Carnê', '12 parcelas de uma vez, cada uma com Pix, boleto e o valor do mês dela')], 'Carnê', cls='c3')
    parc = selecao('as-parc', 'Parcelas por carnê', ['12'], '12', 'Uma por mês. O próximo carnê sai 20 dias antes da última parcela.', cls='c3')
    atual = ('<div class="campo c3"><span style="font-size:13px;font-weight:500">Carnê em uso</span>'
             f'<p style="margin:6px 0 0">Carnê 2026/2027 · {texto_faixas(faixas(JAT))} · dezembro emitida</p>'
             f'<p class="ajuda"><a href="{PDF_CARNE}">Baixar o carnê (PDF)</a></p></div>')
    desc = campo('as-desc', f'Desconto de entrada (%){m}', pct, 'Com carnê, de 0 a 99. Use 0 para sem desconto.', modo='numeric', cls='c2', opcional=True)
    ate = selecao('as-ate', 'Até a fatura de', ['janeiro de 2027', 'fevereiro de 2027', 'março de 2027', 'Sem prazo'], 'fevereiro de 2027', 'Precisa valer pelo menos na próxima fatura.', cls='c2')
    ini = campo('as-ini', 'Início da cobrança', '18/11/2026', 'Não muda depois da primeira fatura.', ro=True, cls='c2')
    ajuda = (f'<p class="permissao d41-ajuda-desc">{ico("desconto")}<span>No carnê, o desconto vale só nas parcelas até a fatura de <b>fevereiro de 2027</b>. '
             'Dezembro já tem fatura e não muda; janeiro e fevereiro mudam de valor.</span></p>')
    mot_ = campo('as-motivo', f'Motivo do desconto{m}', mot, 'Aparece na fatura do escritório. Escreva para o cliente ler.', area=True, linhas=2, cls='c6')
    regra = ('<div class="c6">' + aviso('info', 'Com o carnê em uso, mudar o dia, a forma ou o desconto troca o carnê.',
                                         'O carnê novo começa na próxima parcela ainda sem fatura, janeiro de 2027, sem repetir mês já pago. '
                                         'As parcelas que faltam são canceladas com o motivo, nunca apagadas. Dezembro, já emitida, continua valendo. Ao salvar, você vê a prévia e confirma.') + '</div>')
    pe = ('<div class="form-pe"><p class="esq-pe">Mudar só o e-mail, o CNPJ ou o motivo do desconto não mexe no carnê.</p>'
          f'<a class="btn btn-fantasma" href="?aba=assinatura&amp;estado=cb-carne-desconto">Cancelar</a><button class="btn btn-pri" type="button">{ico("check")}Salvar a assinatura</button></div>')
    return f'<div class="form-folha">{plano}{dia}{forma}{parc}{atual}{email_jat()}{cn_jat()}{desc}{ate}{ini}{ajuda}{mot_}{regra}{pe}</div>'


def email_jat():
    return campo('as-email', 'E-mail de cobrança', 'financeiro@jatoba.adv.br', 'O carnê, as faturas e os lembretes vão para este e-mail, com cópia para a sócia dona.', tipo='email', cls='c3')


def cn_jat():
    return campo('as-cnpj', 'CNPJ da nota', CNPJ_JAT, 'O mesmo da ficha.', modo='numeric', cls='c3')


def editar_jatoba():
    f = (f'<section class="folha" aria-labelledby="t-ass" style="overflow:hidden"><div class="cb-ass-topo"><div><h2 id="t-ass">Editar a assinatura</h2>'
         '<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div>' + form_jatoba() + '</section>')
    return grade(f + F_JAT.replace(' so-fin cb-carne', ' so-fin cb-carne'), SITU_JAT + COMO)


def mudam(linhas):
    li = '<li class="d41-cab" aria-hidden="true"><span>Mês</span><span>Hoje</span><span></span><span>Novo</span></li>'
    for mes_, hoje, novo in linhas:
        h = f'<s>{hoje}</s>' if hoje != novo else f'<s style="text-decoration:none">{hoje}</s>'
        sr = f'<span class="sr">: hoje {hoje}, no carnê novo {novo}</span>'
        li += f'<li><span>{mes_}{sr}</span>{h}{ico("seta")}<b aria-hidden="true">{novo}</b></li>'
    return f'<ul class="d41-mudam" aria-label="O valor de cada mês, hoje e no carnê novo">{li}</ul>'


def janela_troca(novo, pessoas=False):
    fx = texto_faixas(faixas(novo), True)
    pmsg = ', e passa a contar 7 pessoas (eram 6)' if pessoas else ''
    motivo = ('O desconto de entrada mudou: de 20% até a fatura de fevereiro de 2027 para 30% até a fatura de fevereiro de 2027' + pmsg + '.')
    assert len(motivo) <= 300
    ja, ma = novo[0]['valor'], novo[2]['valor']
    linhas = [('janeiro de 2027 <small class="cb-peq">parcela 2 hoje · 1 no novo</small>', brl(39920), brl(ja)),
              ('fevereiro de 2027', brl(39920), brl(novo[1]['valor'])),
              ('março a novembro de 2027', brl(49900), brl(ma)),
              ('dezembro de 2027 <small class="cb-peq">parcela 12 do novo</small>', '—', brl(novo[-1]['valor']))]
    pes = (f'<li><b>O carnê novo conta as pessoas de hoje: 7</b>, uma a mais que as 6 do plano ({brl(PESSOA_A_MAIS)} por mês). O carnê de hoje contava 6, do dia em que nasceu.</li>'
           if pessoas else '<li>As pessoas continuam 6, as mesmas do carnê de hoje.</li>')
    corpo = ('<div class="cb-compara-planos" aria-label="Do carnê de hoje para o carnê novo"><div><span class="cb-peq">Hoje</span><strong>Carnê 2026/2027</strong>'
             f'<span class="d41-fx">{texto_faixas(faixas(JAT), True)}</span><span class="cb-peq">dezembro emitida · 11 sem fatura · 6 pessoas</span></div>'
             f'<span class="cb-seta" aria-hidden="true">{ico("seta")}</span>'
             f'<div class="cb-novo"><span class="cb-peq">Novo</span><strong>Carnê 2027</strong><span class="d41-fx">{fx}</span>'
             f'<span class="cb-peq">{periodo(novo)} · total {brl(total(novo))}{" · 7 pessoas" if pessoas else ""}</span></div></div>'
             + mudam(linhas)
             + '<ul class="tratar" style="padding:0;margin:0">'
             '<li>As parcelas 2 a 12 do carnê 2026/2027 (11 parcelas, de janeiro a novembro de 2027) são canceladas, com o motivo. Nada é apagado.</li>'
             f'<li>Dezembro de 2026 (parcela 1) já tem fatura e continua {brl(39920)}, com o desconto de 20%. Faturas emitidas e parcelas pagas não mudam.</li>'
             + pes +
             '<li>O carnê novo vai em PDF para financeiro@jatoba.adv.br, com cópia para Beatriz Nogueira, e aparece no Portal. O e-mail pede para descartar as páginas 2 a 12 do carnê antigo.</li></ul>'
             f'<p class="d41-motivo-srv"><b>Motivo da troca, escrito pelo sistema:</b> “{motivo}” Fica no histórico com o seu nome. O escritório não vê.</p>')
    desc = ('O desconto de entrada passa de 20% para 30% até a fatura de fevereiro de 2027' + (', e a Jatobá tem 7 pessoas desde 25/11' if pessoas else '') +
            '. As parcelas ainda sem fatura mudam de valor, então sai um carnê novo, a partir de janeiro de 2027.')
    return janela('janela-troca', 'Assinatura · Jatobá', 'Mudar o desconto troca o carnê', desc, corpo,
                  f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button><button class="btn btn-pri" type="submit">{ico("carne")}Trocar o carnê e salvar</button>',
                  alerta=True)


T += t_ass('cb-desconto-troca', editar_jatoba() + janela_troca(JAT30), cab='d41-jatoba', **KW_JAT)
T += t_ass('cb-desconto-troca-pessoas', editar_jatoba() + janela_troca(JAT30P, pessoas=True), cab='d41-jatoba', **KW_JAT)

# ---------------------------------------------------------------- 5b. cb-desconto-troca-feito: o resultado da troca
_j30 = copia(JAT30)
_j30[0].update(sit='proxima', nota='fatura em 21/12')
_jold = copia(JAT)
for p in _jold[1:]:
    p.update(sit='cancelada', nota='')
_jold[0].update(sit='proxima', nota='fatura emitida · vale')
D_JAT30 = dados(forma='carnê 2027, de janeiro a dezembro de 2027 · dezembro de 2026 no carnê 2026/2027', pct=30, mot=MOT_OUTRO)
F_J30 = folha_carne('Carnê 2027', sub_carne(_j30, 10, '27/11/2026'), _j30, cls_folha='folha so-fin', baixar=PDF_CARNE)
S_J = subst('Carnê 2026/2027', _jold, '27/11/2026',
            'Trocado em 27/11/2026 por Carol Andrade: “O desconto de entrada mudou: de 20% até a fatura de fevereiro de 2027 para 30% até a fatura de fevereiro de 2027.” '
            'Dezembro continua valendo, por R$ 399,20. As canceladas ficam aqui, nunca apagadas.', id_='t-subst-j')
MINI_J30 = mini([
    ('27/11/2026', f'Carol Andrade mudou o desconto de entrada para 30% e trocou o carnê · carnê 2027, {texto_faixas(faixas(JAT30))}'),
    ('18/11/2026', f'O sistema gerou o carnê 2026/2027 · {texto_faixas(faixas(JAT))}'),
    ('18/11/2026', 'O sistema ajustou o desconto de entrada para até a fatura de fevereiro de 2027: 3 meses a partir da 1ª fatura (era até janeiro)'),
])
SITU_J30 = situ(f'<span class="selo selo-ok">{ico("check")}Em dia</span>', f'<p class="cb-grande so-fin">{brl(39920)}</p>',
                'Próxima: <b>dezembro de 2026</b>, parcela 1 do carnê 2026/2027, vence em <b>10/12/2026</b>. Depois, janeiro, parcela 1 do carnê 2027, por R$ 349,30.')
TOAST_J = toast('Assinatura salva e carnê trocado.', 'O carnê 2027 foi para financeiro@jatoba.adv.br e está no Portal. As parcelas 2 a 12 do carnê 2026/2027 ficaram como Canceladas, com o motivo.')
PAG5B = grade(folha_ass(topo_jat(), D_JAT30, SO_VER + MINI_J30) + F_J30 + S_J + folha_faturas(FAT_JAT, PE_FAT_JAT.replace('página 2 do carnê: R$ 399,20', 'página 1 do carnê 2027: R$ 349,30').replace('parcela 2,', 'parcela 1 do carnê 2027,')), SITU_J30 + COMO)
assert 'R$ 349,30' in PAG5B
T += t_ass('cb-desconto-troca-feito', PAG5B + TOAST_J, cab='d41-jatoba', **KW_JAT)

# ---------------------------------------------------------------- 8. cb-carne-valor-mudou: o aviso compara o mesmo mês (e 7. o carnê novo com as faixas)
D_JATP = dados(forma='12 parcelas, de dezembro de 2026 a novembro de 2027', pessoas=f'7 de 6 <span class="cb-peq">1 a mais desde 25/11/2026, {brl(PESSOA_A_MAIS)} por mês</span>')
AVISO_VALOR = aviso('atencao', 'O valor mudou: são 7 pessoas desde 25/11/2026.',
                    f'A parcela de janeiro está em {brl(39920)}, e a mensalidade de janeiro hoje é {brl(JATP[0]["valor"])} (7 pessoas, 1 a mais). '
                    'As parcelas ficam como estão até um carnê novo, que começa na próxima parcela ainda sem fatura: janeiro de 2027.',
                    acoes=f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-carne-novo">{ico("reenviar", "ico ico-s")}Gerar novo carnê</button>', cls='so-fin')
F_JATP = folha_carne('Carnê 2026/2027', sub_carne(JAT, 10, '18/11/2026') + ' · 6 pessoas no dia do carnê', JAT, aviso_html=AVISO_VALOR, cls_folha='folha so-fin', baixar=PDF_CARNE)
MINI_JATP = mini([('25/11/2026', 'Pessoa nova no Portal: 7 pessoas, 1 a mais que o plano. O carnê continua com as 6 do dia em que nasceu.')] + [
    ('18/11/2026', f'O sistema gerou o carnê 2026/2027 · {texto_faixas(faixas(JAT))}, mandado em PDF a financeiro@jatoba.adv.br')])
PAG8 = grade(folha_ass(topo_jat(), D_JATP, SO_VER + MINI_JATP) + F_JATP + folha_faturas(FAT_JAT, PE_FAT_JAT), SITU_JAT + COMO)


def janela_carne_novo(abrir=True):
    cancel = total(JAT[1:])
    assert cancel == 528940
    corpo = ('<div class="cb-compara-planos" aria-label="Do carnê de hoje para o carnê novo"><div><span class="cb-peq">Hoje</span><strong>Carnê 2026/2027</strong>'
             f'<span class="d41-fx">{texto_faixas(faixas(JAT), True)}</span><span class="cb-peq">6 pessoas · dezembro emitida · 11 sem fatura</span></div>'
             f'<span class="cb-seta" aria-hidden="true">{ico("seta")}</span>'
             f'<div class="cb-novo"><span class="cb-peq">Novo</span><strong>Carnê 2027</strong><span class="d41-fx">{texto_faixas(faixas(JATP), True)}</span>'
             f'<span class="cb-peq">7 pessoas · {periodo(JATP)} · total {brl(total(JATP))}</span></div></div>'
             + mudam([('janeiro de 2027', brl(39920), brl(JATP[0]['valor'])), ('fevereiro de 2027', brl(39920), brl(JATP[1]['valor'])),
                      ('março a novembro de 2027', brl(49900), brl(JATP[2]['valor'])), ('dezembro de 2027 <small class="cb-peq">parcela 12 do novo</small>', '—', brl(JATP[-1]['valor']))])
             + '<ul class="tratar" style="padding:0;margin:0">'
             f'<li>Dezembro de 2026 (parcela 1) continua valendo, por {brl(39920)}: a fatura já foi emitida e não muda.</li>'
             f'<li>As parcelas 2 a 12 do carnê 2026/2027 (11 parcelas, {brl(cancel)}) são canceladas, com o motivo. Nada é apagado: elas ficam na assinatura como Canceladas.</li>'
             '<li>O desconto de entrada continua como foi combinado: só em janeiro e fevereiro, até a fatura de fevereiro de 2027.</li>'
             '<li>O carnê novo vai em PDF para financeiro@jatoba.adv.br, com cópia para Beatriz Nogueira, e aparece no Portal. O e-mail pede para descartar as páginas 2 a 12 do carnê antigo.</li>'
             '<li>Parcela paga adiantada no carnê antigo continua paga, sem diferença a cobrar.</li></ul>'
             + campo('cn-motivo', 'Motivo', 'A Jatobá tem 7 pessoas desde 25/11. Beatriz concordou com a pessoa a mais a partir de janeiro, por e-mail, em 26/11.',
                     'Obrigatório. Fica no histórico da assinatura e das parcelas canceladas. O escritório não vê.', area=True, linhas=2, extra=' aria-required="true"'))
    return janela('janela-carne-novo', 'Assinatura · Jatobá', 'Gerar um carnê novo para a Jatobá?',
                  f'São 7 pessoas desde 25/11 (o plano inclui 6). A parcela de janeiro passa de {brl(39920)} para {brl(JATP[0]["valor"])}. '
                  'O carnê novo começa na próxima parcela ainda sem fatura: janeiro de 2027.', corpo,
                  f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button><button class="btn btn-pri" type="submit">{ico("carne")}Gerar o carnê novo</button>',
                  alerta=True, abrir=abrir)


T += t_ass('cb-carne-novo-faixas', PAG8 + janela_carne_novo(), cab='d41-jatoba', **KW_JAT)
T += t_ass('cb-carne-valor-mudou', PAG8 + janela_carne_novo(False), cab='d41-jatoba', **KW_JAT)

# ---------------------------------------------------------------- 9. cb-mudar-plano-carne
T += t_ass('cb-mudar-plano-carne', PAG1 + janela_mudar(), cab='d41-jatoba', **KW_JAT)

# ---------------------------------------------------------------- 10. Histórico: carnê com faixas, a troca pelo desconto e o desconto ajustado
HIST = [
    ('27/11/2026', '14h05', 'Carol Andrade', 'trocou o carnê', f'Carnê 2026/2027: parcelas 2 a 12 canceladas · carnê 2027 gerado: {texto_faixas(faixas(JAT30))}, {periodo(JAT30)}, total {brl(total(JAT30))}',
     'O desconto de entrada mudou: de 20% até a fatura de fevereiro de 2027 para 30% até a fatura de fevereiro de 2027.'),
    ('27/11/2026', '14h05', 'Carol Andrade', 'mudou o desconto de entrada de 20% para 30%, até a fatura de fevereiro de 2027', 'Motivo do desconto, que aparece na fatura do escritório:', MOT_OUTRO),
    ('18/11/2026', '16h21', 'O sistema', 'gerou o carnê 2026/2027', f'{texto_faixas(faixas(JAT))} · {periodo(JAT)} · total {brl(total(JAT))} · mandado em PDF a financeiro@jatoba.adv.br', ''),
    ('18/11/2026', '16h21', 'O sistema', 'ajustou o desconto de entrada para até a fatura de fevereiro de 2027', '3 meses a partir da 1ª fatura, dezembro de 2026. Era até janeiro, contado de 04/11.', ''),
    ('18/11/2026', '16h20', 'Carol Andrade', 'passou o cliente para <b>Ativo</b>: a cobrança começou', 'A 1ª fatura é dezembro de 2026, parcela 1 do carnê.', ''),
    ('04/11/2026', '10h12', 'Carol Andrade', 'preparou a assinatura', 'Plano Escritório, todo dia 10, carnê de 12 parcelas, desconto de entrada de 20% até a fatura de janeiro de 2027 (3 meses, contados da 1ª fatura)', MOT_NOVO),
]
_li = ''
for d, h, quem, acao, small, q in HIST:
    novo = ' class="d41-novo-ev"' if ('carnê' in acao or 'ajustou' in acao) else ''
    _li += (f'<li><time>{d}<br>{h}</time><div><span{novo}><b>{quem}</b> {acao}</span><small>{small}</small>' + (f'<q>{q}</q>' if q else '') + '</div></li>')
HIST_FULL = f'<div class="d41-hist so-fin"><h3>Mudanças da assinatura</h3><ol>{_li}</ol></div>'
PAG10 = grade(folha_ass(topo_jat(), D_JAT30, SO_VER + HIST_FULL) + F_J30 + S_J, SITU_J30 + COMO)
T += t_ass('cb-carne-historico', PAG10, cab='d41-jatoba', **KW_JAT)

montar_sobre('ficha.html', os.path.join(SAIDA, 'ficha.html'), CSS_D41, T)
print('ficha ok', T.count('<template data-est='), 'estados novos')
