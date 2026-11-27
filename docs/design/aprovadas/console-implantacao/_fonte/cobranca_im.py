# Console › Cobrança: a folha "Implantação assistida" em Planos (regra global) e a fatura aberta com as linhas novas.
# Base: docs/design/aprovadas/console-interessado-sino/cobranca.html (a cobrança aprovada com o sino), lida sem mudança.
# Uso: python3 cobranca_im.py <pasta-saida>
import sys, os
from comum_im import *
from dados_im import *
from sino_im import sino_templates_cobranca

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
BASE = ler('console-interessado-sino/cobranca.html')
PLANOS = corpo_tpl(BASE, '<template data-est="planos:ver"')
ARQ = '<div class="cb-titulo-sec"><div><h2 style="font-size:22px">Arquivados</h2>'
assert ARQ in PLANOS

PREVIA_ISENTA = (f'<ul class="im-conta-l" aria-label="Como aparece na 1ª fatura"><li><span>Implantação assistida · {DESCR}</span><b>{brl(VALOR)}</b></li>'
                 f'<li class="im-neg"><span>Isenção da implantação · {ISENCAO_TXT}</span><b>{brl(-VALOR)}</b></li>'
                 f'<li class="im-tot"><span>Efeito na 1ª fatura</span><b>R$ 0,00</b></li></ul>')
PREVIA_COBRADA = (f'<ul class="im-conta-l" aria-label="Como aparece na 1ª fatura"><li><span>Implantação assistida · {DESCR}</span><b>{brl(VALOR)}</b></li>'
                  f'<li class="im-tot"><span>Efeito na 1ª fatura</span><b>+ {brl(VALOR)}</b></li></ul>')


def folha_regra():
    return (f'<section class="folha im-regra im-novo" aria-labelledby="t-regra"><div class="im-cab-folha"><div><h2 id="t-regra">Implantação assistida</h2>'
            f'<p class="sub">Vale para todo escritório novo. Cada implantação copia a regra do dia em que abre e fica congelada.</p></div>'
            f'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="im-ex" title="R$ 1.490,00 ainda não foi confirmado pela Carol">Valor provisório</span>'
            f'<button class="btn btn-sec so-admin" type="button" data-janela="janela-regra">{ico("lapis")}Editar<span class="sr"> a regra da implantação</span></button></div></div>'
            f'<div class="im-regra-corpo"><div><p class="cb-preco">{brl(VALOR)}<small>à vista, na 1ª fatura</small></p>'
            f'<dl class="im-dl"><div><dt>Para quem abrir hoje</dt><dd><span class="selo selo-isenta">{ico("isencao")}Isenta · {ISENCAO_TXT}</span></dd></div>'
            f'<div><dt>Isenta até</dt><dd>Sem data de fim<small>Enquanto não houver data, toda implantação nova sai isenta. O sino avisa 30 dias antes da data, quando houver.</small></dd></div>'
            f'<div><dt>Texto na fatura</dt><dd>“Isenção da implantação · {ISENCAO_TXT}”<small>Público: o escritório lê na fatura, no PDF e no Portal.</small></dd></div>'
            f'<div><dt>O que inclui</dt><dd>“{DESCR}”<small>Vai na linha da implantação, na fatura.</small></dd></div>'
            f'<div><dt>Prazo</dt><dd>30 dias<small>Contados do primeiro acesso de um sócio ao Portal.</small></dd></div></dl></div>'
            f'<div><p class="im-rot">Como aparece na 1ª fatura</p>{PREVIA_ISENTA}'
            f'<p class="im-peq">O desconto de entrada vale só sobre a mensalidade, nunca sobre a implantação.</p>'
            f'<p class="im-peq"><b style="font-weight:600;color:var(--texto)">Abertas hoje:</b> 3 implantações, todas isentas (Cedro &amp; Lima, Jatobá e Ipê &amp; Moura).</p></div></div>'
            f'<div class="cb-mini-hist" style="margin-top:0;padding-top:14px"><h3>Mudanças da regra</h3><ul class="im-hist" style="padding:0">'
            f'<li><span>02/11/2026</span><span><b style="font-weight:600">Carol Andrade</b> criou a regra: {brl(VALOR)}, isenta, sem data de fim, 30 dias'
            f'<small>No histórico de Planos, com os dados de antes e de depois.</small></span></li></ul></div>'
            f'<p class="permissao msg-nao-admin" style="margin:0 24px 18px">{ico("cadeado")}Quem muda a regra da implantação é a Administração.</p></section>')


def planos(janela_html=''):
    return PLANOS.replace(ARQ, folha_regra() + ARQ, 1) + janela_html


def janela_regra(modo='isenta'):
    erros = modo == 'erros'
    cobrada = modo == 'cobrada'
    resumo = aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'A regra não mudou.') if erros else ''
    valor = campo('rg-valor', 'Valor da implantação', '1490' if erros else '1.490,00', 'Em reais, com centavos. Cobrado à vista na 1ª fatura.',
                  'Escreva o valor com os centavos, por exemplo 1.490,00.' if erros else '', rs=True, modo='decimal', foco=erros)
    prazo = campo('rg-prazo', 'Prazo, em dias', '120' if erros else '30', 'De 1 a 90 dias, contados do primeiro acesso de um sócio.',
                  'Escreva um prazo entre 1 e 90 dias.' if erros else '', modo='numeric')
    cond = radios('rg-cond', 'Condição para as implantações que abrirem daqui em diante',
                  [('Isenta', 'O valor aparece na 1ª fatura junto com a isenção, e as duas linhas somam zero.'),
                   ('Cobrada à vista', 'O valor entra inteiro na 1ª fatura, por Pix ou boleto.')], 'Cobrada à vista' if cobrada else 'Isenta', cls='im-inteira')
    ate = campo('rg-ate', 'Isenta até', '' if cobrada else ('15/11/2026' if erros else '31/05/2027'),
                'dd/mm/aaaa. Vazio: isenta sem data de fim. Depois dessa data, quem abrir a implantação paga.' if not cobrada else 'Não vale com “Cobrada à vista”.',
                'A data precisa ser de hoje em diante.' if erros else '', opcional=True, modo='numeric', extra=' disabled' if cobrada else '')
    texto = campo('rg-texto', 'Texto da isenção na fatura', ISENCAO_TXT, 'Público. Vai depois de “Isenção da implantação ·”.', cont='20 de 60',
                  extra=' disabled' if cobrada else '')
    desc = campo('rg-desc', 'O que a implantação inclui', DESCR, 'Vai na linha da implantação, na fatura.', cont='52 de 120', cls='im-inteira')
    if cobrada:
        prev = (aviso('atencao', 'Antes de cobrar, resolva a nota fiscal com o contador.',
                      'Hoje o T3jus não emite nota pelo sistema (F1.24), e a 1ª fatura passa de R$ 1.800,00 com a mensalidade. '
                      'Cobrado, o carnê não leva a implantação: quem paga por carnê precisa da 1ª fatura por Pix ou boleto.', cls='im-novo')
                + f'<div class="im-efeito"><h3>{ico("olho")}Prévia: vale para as implantações que abrirem depois de salvar</h3>'
                  f'<p>As 3 já abertas (Cedro &amp; Lima, Jatobá e Ipê &amp; Moura) continuam isentas. A partir de hoje, a 1ª fatura de quem abrir traz:</p>{PREVIA_COBRADA}</div>')
    else:
        prev = (f'<div class="im-efeito"><h3>{ico("olho")}Prévia: vale para as implantações que abrirem depois de salvar</h3>'
                f'<p>As 3 já abertas continuam como estão. Quem abrir <b>até 31/05/2027</b> fica isento; a partir de <b>01/06/2027</b>, paga {brl(VALOR)} à vista na 1ª fatura. '
                f'O sino avisa a Administração em 01/05/2027, 30 dias antes.</p>{PREVIA_ISENTA}</div>')
    corpo = f'{resumo}<div class="im-janela-grade">{valor}{prazo}{cond}{ate}{texto}{desc}</div>{prev}'
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar{"" if erros else " data-foco"}>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Salvar a regra</button>'
    return janela('janela-regra', 'Planos', 'Editar a implantação assistida',
                  'A mudança fica no histórico de Planos, com o seu nome e os dados de antes e de depois. Não mexe em nenhuma implantação já aberta.',
                  corpo, pe, cls='im-larga')


T = ''
T += tpl('planos:im-regra', planos(janela_regra().replace(' data-abrir', '')), trilha='Planos')
T += tpl('planos:im-regra-editar', planos(janela_regra()), trilha='Planos')
T += tpl('planos:im-regra-cobrada', planos(janela_regra('cobrada')), trilha='Planos')
T += tpl('planos:im-regra-erros', planos(janela_regra('erros')), trilha='Planos')


# ---------------------------------------------------------------- fatura aberta
def fatura(cobrada=False):
    tot = TOTAL_COBRADA if cobrada else TOTAL_ISENTA
    num = '2027/0011' if cobrada else '2027/0004'
    esc = 'Umbu Advocacia de Família' if cobrada else ESC
    quando = 'Emitida em 18/02/2027, quando a cobrança começou.' if cobrada else 'Emitida em 07/12/2026, quando a cobrança começou.'
    comp = 'março de 2027' if cobrada else 'janeiro de 2027'
    venc = '10/03/2027' if cobrada else '10/01/2027'
    t_impl = ('<span class="im-tipo im-t-impl">Implantação</span>')
    impl_det = ('Implantação nº 1, aberta em 16/01/2027, depois do fim da isenção · cobrada à vista' if cobrada else
                'Implantação nº 1, aberta em 16/11/2026 e concluída em 07/12/2026 · lançada pelo sistema')
    linhas = (f'<tr><td><span class="im-tipo">Mensalidade</span>Mensalidade do plano Escritório<small>{comp} · até 8 pessoas · todas as áreas do Portal</small></td><td class="cb-valor">{brl(MENSAL)}</td></tr>'
              f'<tr class="cb-desc"><td><span class="im-tipo">Desconto</span>Desconto de entrada (20% da mensalidade)<small>1ª de 3 faturas · só sobre a mensalidade</small></td><td class="cb-valor">{brl(-DESC)}</td></tr>'
              f'<tr class="im-novo"><td>{t_impl}Implantação assistida · {DESCR}<small>{impl_det}</small></td><td class="cb-valor">{brl(VALOR)}</td></tr>')
    if not cobrada:
        linhas += (f'<tr class="cb-desc im-novo"><td><span class="im-tipo im-t-isen">Isenção</span>Isenção da implantação · {ISENCAO_TXT}<small>Os 6 primeiros meses do T3jus: o valor aparece e a isenção também</small></td>'
                   f'<td class="cb-valor">{brl(-VALOR)}</td></tr>')
    hist = (f'<li><time>16h06</time><span class="pto fc-sis" aria-hidden="true"></span><div><p><b>O sistema</b> emitiu a fatura</p>'
            f'<small>{brl(tot)} · vence em {venc} · {"implantação cobrada à vista" if cobrada else "implantação isenta (" + ISENCAO_TXT + ")"}</small></div></li>'
            f'<li><time>16h05</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Rafael Teles</b> concluiu a implantação e passou o cliente para <b>Ativo</b>: a cobrança começou</p>'
            f'<small>Motivo do estágio: Implantação concluída</small></div></li>')
    cab = (f'<div class="cb-fat-cab"><div class="esq campo-vinho">{ico("fatura", "ico estatua")}<a class="cb-voltar" href="cobranca.html">{ico("esq", "ico ico-s")}Faturas</a>'
           f'<div><p class="sobretitulo">Fatura nº {num} · {comp}</p><h1>{esc}</h1></div><p class="meta"><span class="selo selo-ok">{ico("agenda")}A vencer</span>'
           f'<span>Plano Escritório</span><span class="sep" aria-hidden="true"></span><span>Vence em {venc}</span><span class="sep" aria-hidden="true"></span><span>Pix</span>'
           f'<span class="sep" aria-hidden="true"></span><span>A 1ª fatura</span></p></div>'
           f'<section class="dir campo-ambar" aria-labelledby="t-total"><p class="sobretitulo" id="t-total">Total da fatura</p><p class="cb-total">{brl(tot)}</p>'
           f'<p>Vence em <b>{venc}</b>. {quando}</p></section></div>')
    itens = (f'<section class="folha" aria-labelledby="t-itens" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-itens">Itens da fatura</h2>'
             f'<p class="sub">Em reais, com os centavos exatos. Cada linha diz o tipo.</p></div></div><table class="cb-itens"><caption class="sr">Itens da fatura</caption>'
             f'<thead><tr><th scope="col">Descrição</th><th scope="col" class="cb-valor">Valor</th></tr></thead><tbody>{linhas}</tbody>'
             f'<tfoot><tr><th scope="row">Total</th><td class="cb-valor">{brl(tot)}</td></tr></tfoot></table></section>')
    nota = ''
    if cobrada:
        nota = aviso('atencao', 'Esta é a 1ª fatura com a implantação cobrada.',
                     'Ela passa de R$ 1.800,00. Sem nota fiscal pelo sistema, o recibo é o comprovante (pergunta 5 das notas).', cls='im-novo')
    hs = (f'<section class="folha" aria-labelledby="t-hist"><div class="folha-cab"><div><h2 id="t-hist">Histórico da fatura</h2><p class="sub">Quem fez o quê, e quando. Nada aqui é apagado.</p></div></div>'
          f'<div style="padding:0 24px 8px"><div class="eventos-dia"><h3>{"18/02/2027" if cobrada else "07/12/2026"}</h3><ol class="eventos">{hist}</ol></div></div></section>')
    acoes = (f'<aside class="col" aria-label="Ações da fatura"><section class="folha" aria-labelledby="t-acoes"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-acoes" style="font-size:20px">O que fazer</h2></div>'
             f'<div class="cb-acoes"><button class="btn btn-pri" type="button">{ico("pagar")}Registrar pagamento</button>'
             f'<a class="btn btn-sec" href="fatura-a4.html?estado={"im-cobrada" if cobrada else "im-isenta"}">{ico("baixar")}Baixar a fatura (PDF)</a>'
             f'<button class="btn btn-perigo" type="button">{ico("x")}Cancelar a fatura</button></div></section>'
             f'<section class="folha" aria-labelledby="t-impl-l"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-impl-l" style="font-size:20px">Implantação</h2></div>'
             f'<dl class="cb-dl"><div><dt>Condição</dt><dd>{"Cobrada à vista" if cobrada else "Isenta · " + ISENCAO_TXT}</dd></div><div><dt>Valor</dt><dd>{brl(VALOR)}<small>congelado na abertura</small></dd></div>'
             f'<div><dt>Só na 1ª fatura</dt><dd>As próximas não a trazem</dd></div></dl>'
             f'<div style="padding:0 20px 18px"><a class="btn btn-sec" href="ficha.html?aba=implantacao&amp;estado=im-concluida" style="width:100%">{ico("coluna")}Ver a implantação</a></div></section></aside>')
    return f'{cab}<div class="grade"><div class="col">{nota}{itens}{hs}</div>{acoes}</div>'


T += tpl('fatura:im-fatura-isenta', fatura(), sem_abas=True, sem_cabeca=True, trilha='Cedro &amp; Lima · janeiro/2027')
T += tpl('fatura:im-fatura-cobrada', fatura(True), sem_abas=True, sem_cabeca=True, trilha='Umbu · março/2027')
T += tpl('planos:im-sino', planos(), trilha='Planos')

s = montar(BASE, CSS_IM, precos_novos(T + sino_templates_cobranca()), trocas=[('Hoje: 20/11/2026', 'Hoje: 27/11/2026')])
open(os.path.join(SAIDA, 'cobranca.html'), 'w', encoding='utf-8').write(s)
print('cobranca ok:', T.count('<template data-est='), 'estados')
