# Console · Cobrança: Faturas, Fatura aberta, Planos e Régua de cobrança (CO-06).
# Página nova, montada sobre a moldura aprovada da Equipe T3jus (console-fim-contrato/equipe.html):
# o trilho, a barra do celular, o CSS e o script são os aprovados; o miolo e os estados são novos.
# Uso: python3 cobranca_cb.py <pasta-saida>
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dados_cb import *
from carne_cb import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '../saida'
EQ = open(BASE + 'equipe.html', encoding='utf-8').read()

# ---------------------------------------------------------------- moldura
s = EQ
s = s.replace('<title>Equipe T3jus · Console T3jus</title>', '<title>Cobrança · Console T3jus</title>')
s = s.replace('content="Equipe T3jus no Console: pessoas, funções, convites, desativação e histórico da equipe."',
              'content="Cobrança dos escritórios no Console T3jus: faturas, planos e régua de lembretes."')
s = s.replace('''<body data-pagina="equipe" data-padrao='{"aba":"pessoas","estado":"ver"}'>''',
              '''<body data-pagina="cobranca" data-padrao='{"aba":"faturas","estado":"ver"}'>''')
s = s.replace('<a class="item " href="equipe.html" aria-current="page">', '<a class="item " href="equipe.html">')
s = trilho_console(s, atual=True)
s = s.replace('<span aria-current="page">Equipe</span></nav>', '<span aria-current="page">Cobrança</span></nav>', 1)
i = s.index('<div class="cabeca-ambar campo-ambar cabeca-equipe">')
j = s.index('<div id="miolo"', i)
CABECA = (f'<div class="cabeca-ambar campo-ambar cabeca-equipe cb-cab cb-sem-num">'
          f'<div><p class="sobretitulo">Administração e Financeiro</p><h1>Cobrança</h1><span class="fio" aria-hidden="true"></span>'
          f'<p class="lede">As faturas dos escritórios que assinam o T3jus, os planos e os lembretes de pagamento.</p>'
          f'<p class="cb-cab-linha">{SELO_EX}<span class="cb-peq" style="color:var(--tinta)">Hoje: 20/11/2026</span></p></div></div>\n'
          '      <nav class="abas" aria-label="Seções da cobrança"><a data-aba="faturas" href="?aba=faturas">Faturas<span class="q">20</span></a>'
          '<a data-aba="planos" href="?aba=planos">Planos<span class="q">3</span></a><a data-aba="regua" href="?aba=regua">Régua de cobrança</a></nav>\n      ')
s = s[:i] + CABECA + s[j:]
# Os estados aprovados da Equipe saem; entram os da Cobrança.
ti = s.index('<template data-est=')
tj = s.rindex('</template>') + len('</template>')
s = s[:ti] + '<!--CB-->' + s[tj:]
# Implantação e Suporte não veem a Cobrança: o endereço mostra "Esta página é de Administração e Financeiro".
ALVO = "var aba=q.get('aba')||padrao.aba, est=q.get('estado')||padrao.estado, papel=q.get('papel')||'admin';"
assert ALVO in s
s = s.replace(ALVO, ALVO + "\n  if(papel==='implantacao'||papel==='suporte'){aba='faturas';est='sem-permissao'}", 1)
s = s.replace('</style>', CSS_CB + '\n.grade{grid-template-columns:minmax(0,1fr) 340px;align-items:start}\n.cb-fat-cab{position:relative;overflow:hidden;isolation:isolate}.cb-fat-cab .estatua{position:absolute;right:40px;bottom:-30px;width:250px;height:250px;color:var(--vinho-2);z-index:-1;stroke-width:1.1}\n@media (max-width:900px){.grade{grid-template-columns:minmax(0,1fr)}.cb-fat-cab .estatua{width:150px;height:150px;right:-18px;bottom:-24px}}\n</style>', 1)
sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
s = s.replace(sp, sp + icones_novos(s), 1)
JS_TRILHA = ('<script>(function(){var q=new URLSearchParams(location.search),p=q.get("papel")||"admin";'
             'var t=document.querySelector(\'template[data-est="\'+(q.get("aba")||"faturas")+":"+(q.get("estado")||"ver")+\'"]\');'
             'if(p==="implantacao"||p==="suporte")return;'
             'if(t&&t.dataset.trilha){var n=document.querySelector(".topo .trilha");var a=t.dataset.trilha.split("|");'
             'n.innerHTML=\'<a href="#">Console</a><svg class="ico ico-s" aria-hidden="true"><use href="#i-dir"/></svg><a href="cobranca.html\'+(p!=="admin"?"?papel="+p:"")+\'">Cobrança</a>\'+a.map(function(x){return \'<svg class="ico ico-s" aria-hidden="true"><use href="#i-dir"/></svg><span aria-current="page">\'+x+"</span>"}).join("");'
             'document.title=a[a.length-1]+" · Cobrança · Console T3jus"}'
             'document.querySelectorAll("a[href^=\'cobranca.html?\']").forEach(function(l){if(p!=="admin"&&l.href.indexOf("papel=")<0)l.href+="&papel="+p});'
             '})();</script>')
s = s.replace('</body>', JS_TRILHA + '\n</body>')
MOLDURA = s

T = ''

# ================================================================ FATURAS
def numeros():
    idade = ''.join(f'<li><span>{r}</span><span class="cb-barra" aria-hidden="true"><i style="width:{round(v * 100 / EM_ATRASO) if v else 0}%;--c:{c}"></i></span>'
                    f'<b>{brl(v)}<span class="sr">, {n} {"fatura" if n == 1 else "faturas"}</span></b></li>' for r, v, n, c in IDADE)
    return ('<section class="folha" aria-labelledby="t-num"><h2 id="t-num" class="sr">Resumo da cobrança</h2><dl class="cb-numeros" style="margin:0">'
            f'<div><dt>A receber em novembro</dt><dd class="cb-grande">{brl(A_RECEBER_NOV)}</dd><dd><small>4 faturas que vencem em novembro ainda em aberto, 1 vence hoje</small></dd></div>'
            f'<div><dt>Recebido em novembro</dt><dd class="cb-grande">{brl(RECEBIDO_NOV)}</dd><dd><small>2 faturas pagas, de {brl(A_RECEBER_NOV + RECEBIDO_NOV)} que vencem no mês</small></dd></div>'
            f'<div><dt>Em atraso</dt><dd class="cb-grande cb-urg">{brl(EM_ATRASO)}</dd><dd><small>5 faturas de <b>4 escritórios</b>, um deles com o contrato encerrado</small></dd></div>'
            f'<div><dt>Atraso por idade</dt><dd><ul class="cb-idade" aria-label="Valor em atraso por idade">{idade}</ul></dd></div>'
            '</dl></section>')


def ferramentas(filtro):
    chips = [('todas', 'Todas', 20), ('avencer', 'A vencer', 4), ('hoje', 'Vence hoje', 1), ('atraso', 'Em atraso', 5), ('pagas', 'Pagas', 9), ('canceladas', 'Canceladas', 1)]
    ch = ''.join(f'<button type="button" aria-pressed="{"true" if k == filtro else "false"}">{r} ({n})</button>' for k, r, n in chips)
    return ('<div class="ferramentas" style="flex-wrap:wrap">'
            '<div class="campo-busca"><label class="sr" for="cb-busca">Buscar fatura</label>' + ico('busca') +
            '<input class="entrada" id="cb-busca" type="search" placeholder="Escritório, CNPJ ou número da fatura"></div>'
            '<label class="sr" for="cb-esc">Escritório</label><select id="cb-esc"><option>Todos os escritórios</option><option>Cedro &amp; Lima Advocacia</option><option>Bacuri Advocacia Trabalhista</option></select>'
            '<label class="sr" for="cb-mes">Vencimento</label><select id="cb-mes"><option>Vencimento: todos</option><option>Novembro de 2026</option><option>Dezembro de 2026</option></select>'
            '<label class="sr" for="cb-forma">Forma de pagamento</label><select id="cb-forma"><option>Forma: todas</option><option>Pix</option><option>Boleto</option><option>Carnê</option></select>'
            f'<div class="chips" role="group" aria-label="Situação" style="margin-left:0;flex-basis:100%">{ch}</div></div>')


LISTA_TODAS = ('<section class="folha" aria-labelledby="t-faturas" style="overflow:hidden"><h2 id="t-faturas" class="sr">Faturas</h2>' + ferramentas('todas')
               + tabela_faturas(FATURAS, legenda='Faturas de todos os escritórios, das mais urgentes para as pagas')
               + '<div class="rodape-tab"><span>Mostrando 12 de 20 faturas · das mais urgentes para as pagas</span><nav class="pag" aria-label="Páginas"><a href="#" aria-current="page">1</a><a href="#">2</a>'
               f'<a href="#" aria-label="Próxima página">{ico("dir")}</a></nav></div></section>')
T += tpl('faturas:ver', exemplo(numeros() + LISTA_TODAS))

ATR = [f for f in FATURAS if f['sit'] == 'atraso']
NOTA_30 = (f'<p class="fc-nota-lista" style="border-top:0;padding-top:0">{ico("alerta")}<span><b style="color:var(--texto)">2 escritórios passaram de 30 dias.</b> '
           '<a href="ficha.html?aba=assinatura&amp;estado=cb-atraso">Bacuri Advocacia Trabalhista</a> (41 dias): a Administração pode passar o Portal para só consulta, na aba Assinatura. '
           'Mangaba Advocacia: contrato encerrado em 02/08/2026; a régua parou e os lembretes agora são manuais.</span></p>')
LISTA_ATR = ('<section class="folha" aria-labelledby="t-faturas" style="overflow:hidden"><h2 id="t-faturas" class="sr">Faturas em atraso</h2>' + ferramentas('atraso') + NOTA_30
             + tabela_faturas(ATR, col_extra='lembrete', legenda='Faturas em atraso, da mais antiga para a mais nova')
             + f'<div class="rodape-tab"><span>5 faturas em atraso · {brl(EM_ATRASO)} · da mais antiga para a mais nova</span></div></section>')
T += tpl('faturas:atraso', exemplo(numeros() + LISTA_ATR))

VAZIO = (f'<div class="estado" role="status"><span class="icone-estado">{ico("fatura")}</span><h3>Nenhuma fatura ainda</h3>'
         '<p>As faturas aparecem aqui quando um escritório passa para Ativo e a assinatura dele começa. Antes disso, prepare os planos.</p>'
         f'<div class="acoes"><a class="btn btn-pri" href="cobranca.html?aba=planos">{ico("planos")}Ver os planos</a></div></div>')
NUM_ZERO = ('<section class="folha" aria-labelledby="t-num"><h2 id="t-num" class="sr">Resumo da cobrança</h2><dl class="cb-numeros" style="margin:0">'
            '<div><dt>A receber em novembro</dt><dd class="cb-grande">R$ 0,00</dd><dd><small>Nenhuma fatura no mês</small></dd></div>'
            '<div><dt>Recebido em novembro</dt><dd class="cb-grande">R$ 0,00</dd><dd><small>Nenhuma fatura paga</small></dd></div>'
            '<div><dt>Em atraso</dt><dd class="cb-grande">R$ 0,00</dd><dd><small>Nenhum escritório</small></dd></div>'
            '<div><dt>Atraso por idade</dt><dd><small>Sem atraso.</small></dd></div></dl></section>')
T += tpl('faturas:vazio', NUM_ZERO + VAZIO, q='0')

ESQ = ''.join('<div style="display:flex;gap:16px;align-items:center;padding:16px 0;border-top:1px solid var(--sal)"><div style="flex:1;display:grid;gap:8px">'
              '<span class="esqueleto esq-linha" style="width:45%;height:14px"></span><span class="esqueleto esq-linha" style="width:25%;height:10px"></span></div>'
              '<span class="esqueleto esq-linha" style="width:90px;height:14px"></span><span class="esqueleto esq-linha" style="width:120px;height:26px"></span></div>' for _ in range(5))
CARREGANDO = ('<div aria-busy="true"><p class="sr" role="status">Carregando as faturas…</p><div aria-hidden="true" style="display:grid;gap:24px">'
              '<section class="folha" style="padding:22px 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:24px">'
              + ''.join('<div style="display:grid;gap:10px"><span class="esqueleto esq-linha" style="width:70%;height:10px"></span><span class="esqueleto esq-linha" style="width:85%;height:28px"></span></div>' for _ in range(4))
              + f'</section><section class="folha" style="padding:16px 24px">{ESQ}</section></div></div>')
T += tpl('faturas:carregando', CARREGANDO)
ERRO = (f'<div class="estado estado-erro" role="alert"><span class="icone-estado">{ico("alerta")}</span><h3>Não deu para carregar as faturas</h3>'
        '<p>O servidor não respondeu. Nada do que estava guardado se perdeu: faturas, pagamentos e lembretes continuam lá. Tente de novo em instantes; se continuar, mande o código ao suporte.</p>'
        f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button></div><p class="codigo">Código para o suporte: CNS-7C21-0934</p></div>')
T += tpl('faturas:erro', ERRO)
SEM_PERM = (f'<div class="estado estado-erro" role="status"><span class="icone-estado">{ico("cadeado")}</span><h1>Esta página é de Administração e Financeiro</h1>'
            '<p>Quem cuida das faturas, dos planos e dos lembretes é a Administração e o Financeiro. Na ficha de cada escritório, a aba Assinatura mostra o plano e a situação da cobrança.</p>'
            '<div class="acoes"><a class="btn btn-pri" href="carteira.html">Ir para a carteira</a></div><p class="codigo">Sem acesso: esta página pede a função Administração ou Financeiro.</p></div>')
T += tpl('faturas:sem-permissao', SEM_PERM, sem_abas=True, sem_cabeca=True)


# ================================================================ FATURA ABERTA
def fat_cab(numero, comp, nome, selo, meta, total, dir_txt, rot_total='Total da fatura'):
    return (f'<div class="cb-fat-cab"><div class="esq campo-vinho"><svg class="ico estatua" aria-hidden="true"><use href="#i-fatura"/></svg>'
            f'<a class="cb-voltar" href="cobranca.html">{ico("esq", "ico ico-s")}Faturas</a>'
            f'<div><p class="sobretitulo">Fatura nº {numero} · {comp}</p><h1>{nome}</h1></div>'
            f'<p class="meta">{selo}{meta}</p></div>'
            f'<section class="dir campo-ambar" aria-labelledby="t-total"><p class="sobretitulo" id="t-total">{rot_total}</p><p class="cb-total">{brl(total)}</p>{dir_txt}</section></div>')


def meta(*xs):
    return ''.join((f'<span class="sep" aria-hidden="true"></span>' if k else '') + f'<span>{x}</span>' for k, x in enumerate(xs))


def itens(lista, total):
    tb = ''
    for v, t, sub, mot in lista:
        cls = ' class="cb-desc"' if v < 0 else ''
        m = f'<span class="cb-motivo">“{mot}”</span>' if mot else ''
        tb += f'<tr{cls}><td>{t}<small>{sub}</small>{m}</td><td class="cb-valor">{brl(v)}</td></tr>'
    return ('<section class="folha" aria-labelledby="t-itens" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-itens">Itens da fatura</h2>'
            '<p class="sub">Em reais, com os centavos exatos.</p></div></div>'
            '<table class="cb-itens"><caption class="sr">Itens da fatura</caption><thead><tr><th scope="col">Descrição</th><th scope="col" class="cb-valor">Valor</th></tr></thead>'
            f'<tbody>{tb}</tbody><tfoot><tr><th scope="row">Total</th><td class="cb-valor">{brl(total)}</td></tr></tfoot></table></section>')


def pagar_folha(valor, aviso_txt='Exemplo: o código e o boleto de verdade vêm do meio de pagamento, que ainda não foi escolhido.'):
    return (f'<section class="folha" aria-labelledby="t-pagar" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-pagar">Como pagar</h2><p class="sub">{aviso_txt}</p></div></div>'
            + como_pagar(valor) + '</section>')


def historico(dias, futuro=''):
    corpo = ''
    for titulo, evs in dias:
        corpo += f'<div class="eventos-dia"><h3>{titulo}</h3><ol class="eventos">'
        for hora, quem, acao, small, mot, tipo, selo in evs:
            pto = {'forte': 'pto forte', 'sis': 'pto fc-sis', '': 'pto'}[tipo]
            sl = f' <span class="selo selo-neutro">{selo}</span>' if selo else ''
            corpo += (f'<li><time>{hora}</time><span class="{pto}" aria-hidden="true"></span><div><p><b>{quem}</b> {acao}{sl}</p>'
                      + (f'<small>{small}</small>' if small else '') + (f'<span class="fc-motivo">“{mot}”</span>' if mot else '') + '</div></li>')
        corpo += '</ol></div>'
    fut = f'<div class="fc-futuro" role="note">{futuro}</div>' if futuro else ''
    return ('<section class="folha" aria-labelledby="t-hist"><div class="folha-cab"><div><h2 id="t-hist">Histórico da fatura</h2>'
            '<p class="sub">Quem fez o quê, e quando. Nada aqui é apagado.</p></div></div>'
            f'<div style="padding:0 24px 8px">{corpo}</div>{fut}</section>')


def acoes_fat(cancelar=True, pagar=True, lembrete=True, extra=''):
    a = ''
    if pagar:
        a += f'<button class="btn btn-pri" type="button" data-janela="janela-pagar">{ico("pagar")}Registrar pagamento</button>'
    if lembrete:
        a += f'<button class="btn btn-sec" type="button">{ico("envelope")}Mandar lembrete agora</button>'
    if cancelar:
        a += f'<button class="btn btn-perigo" type="button" data-janela="janela-cancelar">{ico("x")}Cancelar a fatura</button>'
    a += extra
    a += (f'<hr><div class="cb-reserva">{ico("doc")}<span><b>Nota fiscal: lugar reservado.</b> A emissão depende do emissor de nota que o T3jus vai contratar. '
          'Quando houver, a nota de cada fatura paga aparece aqui e no Portal.</span></div>'
          f'<button class="btn btn-sec" type="button" aria-disabled="true" aria-describedby="nf-porque">{ico("doc")}Ver a nota fiscal</button>'
          '<p class="permissao" id="nf-porque">' + ico('cadeado') + 'Ainda não emitimos nota pelo sistema.</p>')
    return f'<section class="folha" aria-labelledby="t-acoes"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-acoes" style="font-size:20px">O que fazer</h2></div><div class="cb-acoes">{a}</div></section>'


def para_quem(email, socio, cnpj_, forma, ficha_href, plano):
    return ('<section class="folha" aria-labelledby="t-para"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-para" style="font-size:20px">Para quem vai</h2></div>'
            f'<dl class="cb-dl"><div><dt>E-mail de cobrança</dt><dd>{email}</dd></div><div><dt>Cópia</dt><dd>{socio}<small>sócia dona</small></dd></div>'
            f'<div><dt>CNPJ da nota</dt><dd class="num">{cnpj_}</dd></div><div><dt>Forma</dt><dd>{forma}<small>o outro meio vai junto</small></dd></div>'
            f'<div><dt>Plano</dt><dd>{plano}</dd></div></dl>'
            f'<div style="padding:0 20px 18px"><a class="btn btn-sec" href="{ficha_href}" style="width:100%">{ico("coluna")}Ver a assinatura</a></div></section>')


def grade(main, aside):
    return f'<div class="grade"><div class="col">{main}</div><aside class="col" aria-label="Ações da fatura">{aside}</aside></div>'


# ---- Cedro & Lima, dezembro de 2026 (a vencer)
CAB_CEDRO = fat_cab('2026/0187', 'dezembro de 2026', 'Cedro &amp; Lima Advocacia', selo_sit('avencer'),
                    meta('Plano Escritório', 'Vence em 10/12/2026', 'Pix'), CEDRO_TOTAL,
                    '<p>Vence em <b>10/12/2026</b>, daqui a 20 dias. Emitida em 18/11/2026, quando a cobrança começou.</p>')
HIST_CEDRO = [('18/11/2026', [
    ('16h21', 'O sistema', 'mandou a fatura por e-mail a <b>financeiro@cedrolima.adv.br</b>', 'Com cópia para Renata Lima, sócia dona · Pix e boleto no e-mail e no Portal', '', 'sis', ''),
    ('16h21', 'O sistema', 'emitiu a fatura', f'{brl(CEDRO_TOTAL)} · vence em 10/12/2026 · 9 pessoas ativas na emissão', '', 'sis', ''),
    ('16h20', 'Carol Andrade', 'passou o cliente para <b>Ativo</b>: a cobrança começou', 'Plano Escritório · desconto de 20% nas 3 primeiras faturas', '', 'forte', ''),
])]
FUT_CEDRO = '<b>Próximos lembretes da régua</b><ul><li>07/12/2026: “vence em 3 dias”</li><li>10/12/2026: “vence hoje”</li></ul>'
PARA_CEDRO = para_quem('financeiro@cedrolima.adv.br', 'Renata Lima', CNPJ_CEDRO, 'Pix', LINK_CEDRO_FICHA, 'Escritório')
VER_CEDRO = CAB_CEDRO + grade(itens(CEDRO_ITENS, CEDRO_TOTAL) + pagar_folha(CEDRO_TOTAL) + historico(HIST_CEDRO, FUT_CEDRO), acoes_fat() + PARA_CEDRO)


def tf(est, corpo, trilha='Cedro &amp; Lima · dezembro/2026', **kw):
    return tpl('fatura:' + est, exemplo(corpo), sem_abas=True, sem_cabeca=True, trilha=trilha.replace('&amp;', '&'), **kw)


T += tf('ver', VER_CEDRO)


# ---- Pequi, dezembro de 2026: parcela 3 de 12 do carnê 2026/2027
CAB_PEQUI = fat_cab('2026/0179', 'dezembro de 2026', 'Pequi Advocacia', selo_sit('avencer'),
                    meta('Plano Escritório', 'Vence em 05/12/2026', 'Carnê · parcela 3 de 12'), V_CARNE,
                    '<p>Vence em <b>05/12/2026</b>, daqui a 15 dias. Emitida em 15/11/2026, com os códigos da página 3 do carnê.</p>')
FAIXA_PARC = (f'<section class="cb-parcela-faixa" aria-labelledby="t-parc">{ico("carne")}<div><strong id="t-parc">Parcela 3 de 12 do carnê 2026/2027</strong>'
              '<p>O Pix e o boleto desta fatura são os mesmos da página 3 do carnê, que o escritório tem desde 15/09/2026. Parcelas 1 e 2 pagas; faltam 10.</p></div>'
              f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("baixar")}Baixar o carnê (PDF)</a>'
              f'<a class="btn btn-sec" href="{LINK_PEQUI_FICHA}">{ico("carne")}Ver o carnê</a></div></section>')
ITENS_PEQUI = [(V_CARNE, 'Mensalidade do plano Escritório', 'dezembro de 2026 · até 8 pessoas · valor fixo do carnê, gerado em 15/09/2026', '')]
HIST_PEQUI = [('15/11/2026', [
    ('08h00', 'O sistema', 'mandou o aviso por e-mail a <b>financeiro@pequi.adv.br</b>', 'Com cópia para Helena Araújo, sócia dona · “A parcela 3 do seu carnê vence em 05/12”', '', 'sis', ''),
    ('08h00', 'O sistema', 'emitiu a fatura da parcela 3 do carnê 2026/2027', f'{brl(V_CARNE)} · vence em 05/12/2026 · 6 pessoas ativas na emissão', '', 'sis', ''),
]), ('15/09/2026', [
    ('10h12', 'O sistema', 'gerou o carnê 2026/2027 e mandou o PDF', f'12 parcelas de {brl(V_CARNE)}, de outubro de 2026 a setembro de 2027, todo dia 5', '', 'sis', ''),
    ('10h11', 'Carol Andrade', 'passou o cliente para <b>Ativo</b>: a cobrança começou', 'Plano Escritório · carnê de 12 parcelas', '', 'forte', ''),
])]
FUT_PEQUI = '<b>Próximos lembretes da régua</b><ul><li>02/12/2026: “vence em 3 dias”</li><li>05/12/2026: “vence hoje”</li></ul>'
PARA_PEQUI = para_quem('financeiro@pequi.adv.br', 'Helena Araújo', CNPJ_PEQUI, 'Carnê', LINK_PEQUI_FICHA, 'Escritório').replace(
    '<dd>Carnê<small>o outro meio vai junto</small>', '<dd>Carnê<small>parcela 3 de 12 · Pix e boleto na página</small>').replace('Ver a assinatura', 'Ver a assinatura e o carnê')
VER_PEQUI = CAB_PEQUI + grade(FAIXA_PARC + itens(ITENS_PEQUI, V_CARNE)
                              + pagar_folha(V_CARNE, 'Os mesmos códigos da página 3 do carnê. Exemplo: o código e o boleto de verdade vêm do meio de pagamento, que ainda não foi escolhido.')
                              + historico(HIST_PEQUI, FUT_PEQUI), acoes_fat() + PARA_PEQUI)
T += tf('carne', VER_PEQUI, trilha='Pequi · dezembro/2026')


# ---- registrar pagamento
MOT_PG = 'Renata pagou por Pix direto na conta do T3jus, fora da cobrança, porque o banco dela não leu o QR.'


def form_pagar(data='20/11/2026', valor='431,00', motivo=MOT_PG, erros=(), ro=False):
    e = set(erros)
    c = campo('pg-data', 'Data do pagamento', data, 'Dia, mês e ano (dd/mm/aaaa), hoje ou antes.',
              'A data do pagamento é hoje ou antes. Confira no comprovante.' if 'data' in e else '', modo='numeric', foco='data' in e, ro=ro)
    v_erro = 'O valor recebido precisa ser igual ao da fatura, R$ 431,00. Se o escritório pagou a menos, combine a diferença e registre quando receber tudo.' if 'valor' in e else ''
    cv = (f'<div class="campo"><label for="pg-valor">Valor recebido</label><div class="cb-campo-valor"><span class="cb-rs" aria-hidden="true">R$</span>'
          f'<input class="entrada" id="pg-valor" name="pg-valor" type="text" inputmode="decimal" value="{valor}" autocomplete="off" aria-describedby="{"pg-valor-erro " if v_erro else ""}pg-valor-ajuda"{" aria-invalid=\"true\"" if v_erro else ""}{" readonly" if ro else ""}></div>'
          + (f'<p class="erro-msg" id="pg-valor-erro">{ico("alerta", "ico ico-s")}{v_erro}</p>' if v_erro else '')
          + '<p class="ajuda" id="pg-valor-ajuda">Em reais, com centavos. Total da fatura: R$ 431,00.</p></div>')
    forma = selecao('pg-forma', 'Forma', ['Pix fora da cobrança', 'Transferência bancária', 'Boleto pago por outro canal', 'Outra'], 'Pix fora da cobrança')
    arq = ('<div class="campo"><span class="campo-rotulo" id="pg-arq-r" style="font-size:13px;font-weight:500">Comprovante <span class="opcional">(opcional)</span></span>'
           '<div class="cb-arquivo"><input class="sr" type="file" id="pg-arq" aria-labelledby="pg-arq-r pg-arq-b" accept="application/pdf,image/jpeg,image/png">'
           f'<label class="btn btn-sec" for="pg-arq" id="pg-arq-b">{ico("enviar")}Escolher arquivo</label>'
           '<span class="cb-nome-arq">comprovante-pix-cedro.pdf<small>PDF · 82 KB</small></span></div>'
           '<p class="ajuda">PDF, JPG ou PNG, até 10 MB. Fica guardado com a fatura.</p></div>')
    cont = len(motivo)
    mot = campo('pg-motivo', 'Motivo', motivo, 'Obrigatório. Fica no histórico da fatura, com seu nome e a hora.',
                'Escreva o motivo do registro manual. Ele fica no histórico da fatura.' if 'motivo' in e else '', area=True,
                foco=('motivo' in e and 'data' not in e), ro=ro, cont=f'{cont} de 300 caracteres', extra=' maxlength="300" aria-required="true"')
    return f'<div class="cb-duas">{c}{cv}</div>{forma}{arq}{mot}'


def janela_pagar(topo='', pe=None, **kw):
    corpo = topo + form_pagar(**kw) + f'<p class="permissao">{ico("envelope")}A fatura passa a Paga e o recibo vai para financeiro@cedrolima.adv.br, com cópia para Renata Lima.</p>'
    pe = pe or (f'<button class="btn btn-fantasma" type="button" data-fechar{" data-foco" if not kw.get("erros") else ""}>Cancelar</button>'
                f'<button class="btn btn-pri" type="submit">{ico("check")}Registrar pagamento</button>')
    return janela('janela-pagar', 'Fatura nº 2026/0187 · Cedro &amp; Lima', 'Registrar pagamento',
                  f'Use quando o escritório pagou fora da cobrança. Valor da fatura: {brl(CEDRO_TOTAL)}, vence em 10/12/2026.', corpo, pe)


T += tf('pagar', VER_CEDRO + janela_pagar())
T += tf('pagar-erros', VER_CEDRO + janela_pagar(topo=aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'Nenhum pagamento foi registrado.'),
                                               data='21/11/2026', valor='413,00', motivo='', erros=('data', 'valor', 'motivo')))
T += tf('pagar-enviando', VER_CEDRO + janela_pagar(topo='<p class="sr" role="status">Registrando o pagamento…</p>', ro=True,
        pe=(f'<button class="btn btn-fantasma" type="button" disabled>Cancelar</button>'
            '<button class="btn btn-pri" type="button" aria-busy="true" aria-disabled="true"><span class="fc-giro" aria-hidden="true"></span>Registrando…</button>')))
T += tf('pagar-falha', VER_CEDRO + janela_pagar(
    topo=aviso('urgencia', 'Não deu para registrar agora.',
               'A conexão caiu antes de o servidor responder. Nada mudou: a fatura continua a vencer e o que você escreveu está aqui. Tente de novo; se continuar, mande o código ao suporte técnico.',
               extra='<p class="codigo">Código para o suporte: CNS-5D08-2271</p>'),
    pe=f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("reenviar")}Tentar de novo</button>'))
_conf = aviso('urgencia', 'Marta Quintela registrou um pagamento nesta fatura às 14h32, enquanto a janela estava aberta.',
              'Nada foi registrado por você, e o que você escreveu continua aqui. Registrar de novo contaria o mesmo pagamento duas vezes: confira antes.',
              extra=('<table class="fc-compara"><caption class="sr">O que mudou na fatura</caption><thead><tr><th scope="col">Onde</th><th scope="col">Quando você abriu</th><th scope="col">Agora</th></tr></thead>'
                     '<tbody><tr><th scope="row">Situação</th><td>A vencer</td><td>Paga em 20/11/2026</td></tr>'
                     '<tr><th scope="row">Forma</th><td>—</td><td>Transferência bancária</td></tr>'
                     '<tr><th scope="row">Valor</th><td>—</td><td>R$ 431,00</td></tr></tbody></table>'))
T += tf('pagar-conflito', VER_CEDRO + janela_pagar(topo=_conf,
        pe=(f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
            f'<button class="btn btn-pri" type="button" data-fechar data-foco>{ico("olho")}Fechar e conferir</button>')))

# ---- paga
CAB_PAGA = fat_cab('2026/0187', 'dezembro de 2026', 'Cedro &amp; Lima Advocacia', selo_sit('paga'),
                   meta('Plano Escritório', 'Venceria em 10/12/2026', 'Pix fora da cobrança'), CEDRO_TOTAL,
                   '<p>Paga em <b>20/11/2026</b>, registrada à mão por Carol Andrade. O recibo foi para o e-mail de cobrança.</p>', rot_total='Recebido')
HIST_PAGA = [('20/11/2026 · hoje', [
    ('15h03', 'O sistema', 'mandou o recibo a <b>financeiro@cedrolima.adv.br</b>', 'Com cópia para Renata Lima · os lembretes desta fatura foram cancelados', '', 'sis', ''),
    ('15h02', 'Carol Andrade', 'registrou o pagamento', f'{brl(CEDRO_TOTAL)} · 20/11/2026 · Pix fora da cobrança · comprovante-pix-cedro.pdf', MOT_PG, 'forte', ''),
])] + HIST_CEDRO
RECIBO = ('<section class="folha" aria-labelledby="t-recibo" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-recibo">Recibo e comprovante</h2><p class="sub">O Pix e o boleto desta fatura não valem mais.</p></div></div>'
          f'<ul class="docs" style="list-style:none;margin:0;padding:0"><li><span class="doc-ic" aria-hidden="true">{ico("doc")}</span><div><strong style="font-weight:500">Recibo nº 2026/0187</strong><small style="display:block;font-size:12px;color:var(--texto-2)">PDF · gerado em 20/11/2026, às 15h03</small></div>'
          f'<div class="doc-acoes"><a class="btn btn-sec btn-compacto" href="#">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> o recibo</span></a></div></li>'
          f'<li><span class="doc-ic" aria-hidden="true">{ico("imagem")}</span><div><strong style="font-weight:500">comprovante-pix-cedro.pdf</strong><small style="display:block;font-size:12px;color:var(--texto-2)">PDF · 82 KB · enviado por Carol Andrade</small></div>'
          f'<div class="doc-acoes"><a class="btn btn-sec btn-compacto" href="#">{ico("olho", "ico ico-s")}Abrir<span class="sr"> o comprovante</span></a></div></li></ul></section>')
ACOES_PAGA = ('<section class="folha" aria-labelledby="t-acoes"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-acoes" style="font-size:20px">O que fazer</h2></div><div class="cb-acoes">'
              f'<a class="btn btn-sec" href="#">{ico("baixar")}Baixar o recibo</a>'
              f'<p class="permissao">{ico("cadeado")}Uma fatura paga não se cancela nem se apaga. Ela fica guardada com o recibo e o comprovante.</p>'
              f'<hr><div class="cb-reserva">{ico("doc")}<span><b>Nota fiscal: lugar reservado.</b> A emissão depende do emissor de nota que o T3jus vai contratar.</span></div></div></section>')
T += tf('paga', CAB_PAGA + grade(itens(CEDRO_ITENS, CEDRO_TOTAL) + RECIBO + historico(HIST_PAGA), ACOES_PAGA + PARA_CEDRO)
        + toast('Pagamento registrado.', 'A fatura de dezembro da Cedro &amp; Lima está paga. O recibo foi para financeiro@cedrolima.adv.br.'))

# ---- cancelar
MOT_CANC = 'Combinado com a Renata: dezembro sai sem cobrança, porque a implantação atrasou duas semanas por nossa causa.'


def janela_cancelar(erro=False):
    corpo = ((aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'A fatura não foi cancelada.') if erro else '')
             + '<ul class="tratar" style="padding:0;margin:0"><li>A fatura não é apagada: fica na lista como Cancelada, com o motivo e o seu nome.</li>'
             '<li>O Pix e o boleto dela deixam de valer, e a régua para de mandar lembretes.</li>'
             '<li>A Cedro &amp; Lima recebe um e-mail dizendo que a fatura foi cancelada.</li></ul>'
             + campo('cn-motivo', 'Motivo', '' if erro else MOT_CANC, 'Obrigatório. Fica no histórico da fatura. O escritório vê só que a fatura foi cancelada.',
                     'Escreva o motivo do cancelamento. Ele fica no histórico da fatura.' if erro else '', area=True, foco=erro, extra=' aria-required="true"'))
    return janela('janela-cancelar', 'Fatura nº 2026/0187', 'Cancelar a fatura de dezembro da Cedro &amp; Lima?',
                  f'Valor: {brl(CEDRO_TOTAL)}. Para cobrar de novo depois, é preciso uma fatura nova.', corpo,
                  f'<button class="btn btn-fantasma" type="button" data-fechar{"" if erro else " data-foco"}>Voltar</button>'
                  f'<button class="btn fc-perigo-cheio" type="submit">{ico("x")}Cancelar a fatura</button>', alerta=True)


T += tf('cancelar', VER_CEDRO + janela_cancelar())

CAB_CANC = fat_cab('2026/0187', 'dezembro de 2026', 'Cedro &amp; Lima Advocacia', selo_sit('cancelada'),
                   meta('Plano Escritório', 'Venceria em 10/12/2026'), CEDRO_TOTAL,
                   '<p>Cancelada em <b>20/11/2026</b> por Carol Andrade. Nada foi cobrado.</p>', rot_total='Valor cancelado')
HIST_CANC = [('20/11/2026 · hoje', [
    ('15h10', 'O sistema', 'avisou o escritório por e-mail que a fatura foi cancelada', 'Para financeiro@cedrolima.adv.br, com cópia para Renata Lima', '', 'sis', ''),
    ('15h09', 'Carol Andrade', 'cancelou a fatura', 'O Pix e o boleto deixaram de valer · lembretes cancelados', MOT_CANC, 'forte', ''),
])] + HIST_CEDRO
NAO_VALE = ('<section class="folha" aria-labelledby="t-pagar" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-pagar">Como pagar</h2></div></div>'
            f'<p class="cb-nao-vale">{ico("x")}<span>Esta fatura foi cancelada. O Pix e o boleto dela não valem mais; se alguém pagar por engano, o valor é devolvido.</span></p></section>')
ACOES_CANC = ('<section class="folha" aria-labelledby="t-acoes"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-acoes" style="font-size:20px">O que fazer</h2></div><div class="cb-acoes">'
              f'<p class="permissao">{ico("cadeado")}Uma fatura cancelada não volta a valer e não é apagada. Ela fica na lista, com o motivo, como prova do que foi combinado.</p></div></section>')
T += tf('cancelada', CAB_CANC + grade(itens(CEDRO_ITENS, CEDRO_TOTAL) + NAO_VALE + historico(HIST_CANC), ACOES_CANC + PARA_CEDRO))

# ---- Bacuri, outubro de 2026 (41 dias em atraso)
BAC_ITENS = [(19000, 'Mensalidade do plano Fundador', 'outubro de 2026 · até 5 pessoas · preço de quando assinou (o plano foi arquivado em 01/10/2026)', '')]
CAB_BAC = fat_cab('2026/0121', 'outubro de 2026', 'Bacuri Advocacia Trabalhista', selo_sit('atraso', 41),
                  meta('Plano Fundador', 'Venceu em 10/10/2026', 'Boleto'), 19000,
                  '<p>Venceu em <b>10/10/2026</b>, há 41 dias. A fatura de novembro também está em aberto.</p>', rot_total='Em aberto')
ATRASO_BOX = (f'<section class="cb-atraso" aria-labelledby="t-atr"><p class="cb-dias" aria-hidden="true"><b>41</b><small>dias</small></p>'
              '<div class="cb-txt"><p class="sobretitulo">Em atraso há mais de 30 dias</p><h2 id="t-atr">A Bacuri tem 2 faturas em aberto: R$ 380,00</h2>'
              '<p>Outubro (41 dias) e novembro (10 dias). Já foram 5 lembretes por e-mail à sócia dona, Luíza Farias, e desde 17/10 o Portal mostra a ela um aviso de atraso. '
              'Passou de 30 dias: a Administração decide se o Portal fica só para consulta até o pagamento. <b>Nenhum dado é apagado</b> e a exportação continua liberada.</p>'
              '<p class="sr">41 dias em atraso.</p></div>'
              f'<div class="cb-botoes"><a class="btn btn-perigo so-admin" href="ficha.html?aba=assinatura&amp;estado=cb-so-consulta-confirmar">{ico("cadeado")}Passar o Portal para só consulta</a>'
              f'<p class="permissao msg-nao-admin">{ico("cadeado")}Quem passa o Portal para só consulta é a Administração.</p></div></section>')
HIST_BAC = [
    ('12/11/2026', [('10h40', 'Marta Quintela', 'mandou um lembrete agora', 'Para luiza@bacuri.adv.br', 'Liguei para a Luíza: ela disse que paga as duas até 25/11.', '', '')]),
    ('09/11/2026', [('08h00', 'O sistema', 'avisou a Administração: 30 dias em atraso', 'O Console passou a propor o Portal só para consulta', '', 'sis', 'Só equipe')]),
    ('25/10/2026', [('08h00', 'O sistema', 'mandou o lembrete “venceu há 15 dias”', 'Último lembrete automático da régua', '', 'sis', '')]),
    ('17/10/2026', [('08h00', 'O sistema', 'mandou o lembrete “venceu há 7 dias” e ligou o aviso no Portal', 'O aviso aparece só para a sócia dona', '', 'sis', '')]),
]
FUT_BAC = '<b>Lembretes anteriores</b><ul><li>13/10: “venceu há 3 dias” · 10/10: “vence hoje” · 07/10: “vence em 3 dias”</li><li>20/09/2026: fatura emitida e enviada por e-mail</li></ul>'
PARA_BAC = para_quem('luiza@bacuri.adv.br', 'Luíza Farias', CNPJ_BACURI, 'Boleto', LINK_BACURI_FICHA, 'Fundador (arquivado)')
VER_BAC = CAB_BAC + ATRASO_BOX + grade(itens(BAC_ITENS, 19000) + pagar_folha(19000) + historico(HIST_BAC, FUT_BAC), acoes_fat() + PARA_BAC)
T += tf('atraso', VER_BAC, trilha='Bacuri · outubro/2026')
HIST_BAC_L = [('20/11/2026 · hoje', [('15h20', 'Marta Quintela', 'mandou um lembrete agora', 'Para luiza@bacuri.adv.br · com as 2 faturas em aberto, o Pix e o boleto', '', '', '')])] + HIST_BAC
T += tf('lembrete', CAB_BAC + ATRASO_BOX + grade(itens(BAC_ITENS, 19000) + pagar_folha(19000) + historico(HIST_BAC_L, FUT_BAC), acoes_fat() + PARA_BAC)
        + toast('Lembrete enviado.', 'Mandamos agora um e-mail a luiza@bacuri.adv.br com as 2 faturas em aberto. Ficou no histórico.'), trilha='Bacuri · outubro/2026')


# ================================================================ PLANOS
def card_plano(nome, p, arq=False):
    n = len(p['esc'])
    esc = ', '.join(e.split(' ')[0].replace('&amp;', '&amp;') for e in p['esc'])
    acoes = ('' if arq else
             f'<div class="cb-p-acoes so-admin"><button class="btn btn-sec" type="button" data-janela="janela-editar-{nome[:3].lower()}">{ico("lapis")}Editar<span class="sr"> o plano {nome}</span></button>'
             f'<button class="btn btn-fantasma" type="button" data-janela="janela-arquivar">{ico("arquivar")}Arquivar<span class="sr"> o plano {nome}</span></button></div>')
    if arq:
        acoes = f'<div class="cb-p-acoes so-admin"><button class="btn btn-sec" type="button">{ico("reenviar")}Desarquivar<span class="sr"> o plano {nome}</span></button></div>'
    extra = (f'<li>{ico("arquivar")}<span>Arquivado em 01/10/2026: não aparece para novas assinaturas</span></li>' if arq else
             f'<li>{ico("pessoa-mais")}<span>Pessoa a mais: {brl(PESSOA_A_MAIS)} por mês</span></li>')
    return (f'<article class="cb-plano{" cb-arq" if arq else ""}" aria-labelledby="pl-{nome[:3].lower()}"><div class="cb-tom" style="--c:{p["tom"]}" aria-hidden="true"></div>'
            f'<div class="cb-p-corpo"><h3 id="pl-{nome[:3].lower()}">{nome}</h3><p class="cb-preco">{brl(p["preco"])}<small>por mês</small></p>'
            f'<ul><li>{ico("pessoas")}<span>Até {p["pessoas"]} pessoas</span></li><li>{ico("check")}<span>Todas as áreas do Portal</span></li>{extra}</ul></div>'
            f'<p class="cb-assinam"><span class="disco" aria-hidden="true"><span>{n}</span></span><span><b>{n} {"escritório assina" if n == 1 else "escritórios assinam"}</b><br>'
            f'<span class="cb-peq">{" e ".join(p["esc"])}</span></span></p>{acoes}</article>')


REGRA_PRECO = (f'<p class="cb-regra" role="note">{ico("ajuda")}<span><b>Mudar o preço de um plano vale só para novas assinaturas.</b> Quem já assina continua com o preço de quando assinou, '
               'até alguém mudar a assinatura dele, na ficha do escritório. Plano não se apaga: arquive, e quem assina continua nele.</span></p>')
TOPO_PLANOS = (f'<div class="cb-titulo-sec"><div><h2>Planos</h2><p>Faixas de pessoas, com todas as áreas do Portal. Preços de exemplo.</p></div>'
               f'<button class="btn btn-pri so-admin" type="button" data-janela="janela-criar">{ico("mais")}Criar plano</button>'
               f'<p class="permissao msg-nao-admin">{ico("cadeado")}Quem cria, muda e arquiva planos é a Administração.</p></div>')
EXTRA = (f'<section class="folha cb-extra" aria-labelledby="t-extra"><span class="disco" aria-hidden="true"><span>+1</span></span><div><h2 id="t-extra" style="font-size:20px">Pessoa a mais: {brl(PESSOA_A_MAIS)} por mês</h2>'
         '<p class="cb-peq" style="font-size:13px">Para cada pessoa acima do que o plano inclui. Conta quem está ativo no Portal no dia em que a fatura é emitida; convite pendente não conta. Vale para todos os planos.</p></div>'
         f'<button class="btn btn-sec so-admin" type="button">{ico("lapis")}Editar<span class="sr"> o valor da pessoa a mais</span></button></section>')
ARQ = (f'<div class="cb-titulo-sec"><div><h2 style="font-size:22px">Arquivados</h2><p>Não aparecem para novas assinaturas. Quem assina continua pagando o mesmo.</p></div></div>'
       '<div class="cb-planos">' + card_plano('Fundador', dict(preco=19000, pessoas=5, tom='', esc=['Bacuri Advocacia Trabalhista']), arq=True) + '</div>')
PLANOS_VER = (TOPO_PLANOS + REGRA_PRECO + '<div class="cb-planos">' + ''.join(card_plano(n, p) for n, p in PLANOS.items()) + '</div>' + EXTRA + ARQ)
T += tpl('planos:ver', exemplo(PLANOS_VER), trilha='Planos')


def janela_plano(id_, titulo, desc, nome='', preco='', pessoas='', descr='', erros=(), topo='', aviso_preco=''):
    e = set(erros)
    corpo = (topo + campo(f'{id_}-nome', 'Nome do plano', nome, 'Aparece na ficha, na fatura e no Portal.', 'Escreva o nome do plano.' if 'nome' in e else '', foco=('nome' in e))
             + '<div class="cb-duas">'
             + (f'<div class="campo"><label for="{id_}-preco">Preço por mês</label><div class="cb-campo-valor"><span class="cb-rs" aria-hidden="true">R$</span>'
                f'<input class="entrada" id="{id_}-preco" type="text" inputmode="decimal" value="{preco}" autocomplete="off" aria-describedby="{id_ + "-preco-erro " if "preco" in e else ""}{id_}-preco-ajuda"{" aria-invalid=\"true\"" if "preco" in e else ""}></div>'
                + (f'<p class="erro-msg" id="{id_}-preco-erro">{ico("alerta", "ico ico-s")}Escreva o preço com os centavos, por exemplo 290,00.</p>' if 'preco' in e else '')
                + f'<p class="ajuda" id="{id_}-preco-ajuda">Em reais, com centavos.</p></div>')
             + campo(f'{id_}-pessoas', 'Pessoas incluídas', pessoas, 'Acima disso, cada pessoa custa R$ 39,00 por mês.',
                     'O plano inclui pelo menos 1 pessoa.' if 'pessoas' in e else '', modo='numeric')
             + '</div>' + aviso_preco
             + campo(f'{id_}-desc', 'Para quem é', descr, 'Uma frase curta, que aparece no Portal.', area=True, opcional=True, linhas=2))
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar{"" if e else " data-foco"}>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Salvar o plano</button>')
    return janela(id_, 'Planos', titulo, desc, corpo, pe)


AV_PRECO = aviso('info', 'O preço novo vale só para novas assinaturas.',
                 'Cedro &amp; Lima e Pequi continuam pagando R$ 490,00. Para mudar o preço de quem já assina, mude a assinatura de cada um, na ficha do escritório.', papel='note')
T += tpl('planos:editar', exemplo(PLANOS_VER + janela_plano('janela-editar-esc', 'Editar o plano Escritório', 'O nome e o texto mudam para todos. O preço muda só para quem assinar daqui em diante.',
                                                            'Escritório', '520,00', '8', 'Para escritórios com até 8 pessoas.', aviso_preco=AV_PRECO)), trilha='Planos')
T += tpl('planos:criar-erros', exemplo(PLANOS_VER + janela_plano('janela-criar', 'Criar plano', 'O plano novo aparece para novas assinaturas assim que for salvo.',
                                                                  '', '1290', '0', '', erros=('nome', 'preco', 'pessoas'),
                                                                  topo=aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'O plano não foi criado.'))), trilha='Planos')
JA = janela('janela-arquivar', 'Planos', 'Arquivar o plano Essencial?',
            'O plano sai da lista de novas assinaturas. Nada muda para os 2 escritórios que assinam: continuam no Essencial, pelo mesmo preço.',
            '<ul class="tratar" style="padding:0;margin:0"><li>Aroeira e Buriti &amp; Lago continuam pagando R$ 290,00.</li><li>Dá para desarquivar depois.</li><li>O plano não é apagado: fica em Arquivados, com o histórico.</li></ul>'
            + campo('arq-motivo', 'Motivo', 'Vamos juntar o Essencial ao Escritório em 2027.', 'Obrigatório. Fica no histórico dos planos.', area=True, linhas=2, extra=' aria-required="true"'),
            f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button><button class="btn btn-pri" type="submit">{ico("arquivar")}Arquivar o plano</button>')
T += tpl('planos:arquivar', exemplo(PLANOS_VER + JA), trilha='Planos')
PL_VAZIO = (TOPO_PLANOS + f'<div class="estado" role="status"><span class="icone-estado">{ico("planos")}</span><h3>Nenhum plano ainda</h3>'
            '<p>Crie o primeiro plano: o nome, o preço por mês e quantas pessoas ele inclui. Sem plano, não dá para começar a assinatura de um escritório.</p>'
            f'<div class="acoes"><button class="btn btn-pri so-admin" type="button">{ico("mais")}Criar plano</button></div></div>')
T += tpl('planos:vazio', PL_VAZIO, trilha='Planos')


# ================================================================ RÉGUA
PASSOS = [('−20', 'cb-d-antes', '', 'Fatura emitida', 'A fatura chega por e-mail, com o Pix e o boleto, e aparece no Portal.', ['E-mail', 'Portal']),
          ('−3', 'cb-d-antes', '', 'Vence em 3 dias', 'Lembrete curto, com o valor e o Pix.', ['E-mail']),
          ('0', 'cb-d-dia', '', 'Vence hoje', 'Lembrete às 8h, com o Pix e o boleto.', ['E-mail']),
          ('+3', 'cb-d-dep', ' cb-depois', 'Venceu há 3 dias', '“Se já pagou, desconsidere.”', ['E-mail']),
          ('+7', 'cb-d-dep', ' cb-depois', 'Aviso no Portal', 'E-mail e uma faixa no Portal, só para o sócio dono. O resto da equipe não vê.', ['E-mail', 'Portal']),
          ('+15', 'cb-d-dep', ' cb-depois', 'Venceu há 15 dias', 'Último lembrete automático. Daqui em diante, só manual.', ['E-mail']),
          ('+30', 'cb-d-forte', ' cb-depois', 'A Administração decide', 'O Console propõe passar o Portal para só consulta. Só acontece se a Administração confirmar, com motivo.', ['Console'])]
pas = ''
for d, cls, li, t, p, can in PASSOS:
    quando = {'−20': '20 dias antes', '−3': '3 dias antes', '0': 'No dia', '+3': '3 dias depois', '+7': '7 dias depois', '+15': '15 dias depois', '+30': '30 dias depois'}[d]
    pas += (f'<li class="{li.strip()}"><span class="disco {cls}" aria-hidden="true"><span>{d}</span></span><strong>{t}<span class="cb-peq" style="display:block;font-weight:500;color:var(--vinho-2)">{quando}</span></strong>'
            f'<p>{p}</p><p class="cb-canais">' + ''.join(f'<span class="selo selo-neutro">{c}</span>' for c in can) + '</p></li>')
REGUA = ('<div class="col"><section class="folha" aria-labelledby="t-regua" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-regua">Régua de cobrança</h2>'
         '<p class="sub">Contada a partir do vencimento. Vai para o e-mail de cobrança, com cópia para o sócio dono. Igual para todos os escritórios.</p></div></div>'
         f'<ol class="cb-regua" aria-label="Passos da régua">{pas}</ol>'
         f'<p class="cb-regra" role="note" style="margin:6px 24px 22px">{ico("check")}<span><b>Ao pagar, tudo para.</b> Os lembretes param, a faixa some e, se o Portal estava só para consulta, ele volta ao normal sozinho, assim que o pagamento é confirmado.</span></p></section>'
         '<div class="grade"><div class="col"><section class="folha" aria-labelledby="t-email" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-email">Exemplo: o lembrete de 7 dias</h2><p class="sub">Texto curto e educado. Sem ameaça, sem juros.</p></div></div>'
         '<div class="cb-email"><div class="cb-e-cab"><span><b>De:</b> T3jus &lt;cobranca@exemplo.com.br&gt;</span><span><b>Para:</b> financeiro@valesena.adv.br · <b>Cópia:</b> Rodrigo Sena</span>'
         '<span><b>Assunto:</b> Fatura de novembro do T3jus em aberto há 7 dias</span></div>'
         '<div class="cb-e-corpo"><p>Olá, Rodrigo.</p><p>A fatura de novembro de 2026 da Vale &amp; Sena Advogados, de <b>R$ 968,00</b>, venceu em 10/11/2026 e ainda não consta como paga. '
         'Se já pagou, desconsidere este e-mail: o boleto leva até 1 dia útil para cair.</p><p>Para pagar, use o Pix ou o boleto abaixo, ou abra o Portal em Escritório › Plano e faturas. '
         'O uso do Portal continua normal.</p><span class="btn btn-pri" aria-hidden="true">Ver a fatura no Portal</span>'
         '<p class="cb-peq">Dúvidas: atendimento@exemplo.com.br</p></div></div></section></div>'
         '<aside class="col" aria-label="Regras da régua"><section class="folha" aria-labelledby="t-nunca"><div class="folha-cab" style="padding-bottom:6px"><h2 id="t-nunca" style="font-size:20px">O que nunca acontece sozinho</h2></div>'
         f'<ul class="cb-nunca"><li>{ico("guardar")}<span>Nenhum dado é apagado por atraso.</span></li>'
         f'<li>{ico("cadeado")}<span>O Portal só fica só para consulta se a Administração confirmar, com motivo.</span></li>'
         f'<li>{ico("baixar")}<span>A exportação dos dados fica sempre liberada para o sócio dono.</span></li>'
         f'<li>{ico("fim")}<span>O contrato não é encerrado por atraso. Encerrar é a ação da Administração na aba Contrato.</span></li></ul></section>'
         '<section class="explica campo-ambar" aria-labelledby="t-regua-c"><p class="sobretitulo">Nesta versão</p><h2 id="t-regua-c">A régua é fixa.</h2><ul>'
         f'<li>{ico("relogio")}<span>Os dias são os mesmos para todos. Mudar fica para depois, se a prática pedir.</span></li>'
         f'<li>{ico("envelope")}<span>Cada lembrete fica no histórico da fatura, com o horário.</span></li>'
         f'<li>{ico("fim")}<span>Com o contrato encerrado, a régua para. Lembretes, só manuais.</span></li></ul></section></aside></div></div>')
T += tpl('regua:ver', exemplo(REGUA), trilha='Régua de cobrança')

s = MOLDURA.replace('<!--CB-->', T)
open(os.path.join(SAIDA, 'cobranca.html'), 'w', encoding='utf-8').write(s)
print('cobranca ok', T.count('<template data-est='), 'estados')
