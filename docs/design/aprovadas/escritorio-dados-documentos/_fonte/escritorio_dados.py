# Escritório › Dados do escritório (nova versão, para os documentos), Escritório › Advogados nos documentos
# e Sua conta só com o que é do sistema. Gera escritorio.html e conta.html.
# Base sem mudança: comum.py (Portal v1), pecas.py, oab.py e conta_dados.py (Sua conta aprovada, peças cd-),
# que aqui são importados e reaproveitados. Peças novas com o prefixo ed-.
# Uso: python3 escritorio_dados.py <pasta-saida>
import sys
from comum import *
from pecas import campo, selecao, opcao, CSS_HN
from oab import UFS
import conta_dados as CD
from esc_elenco import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
X = 'escritorio.html?estado='
UF_LISTA = [u for u, _ in UFS]

CSS = r"""
/* ==========================================================================
   Escritório · dados para os documentos (prefixo ed-). Usa as peças cd- de Sua conta.
   ========================================================================== */
.ed-ref{font-family:var(--sans);font-size:12px;font-weight:500;color:var(--vinho-escuro);background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 1px var(--vinho-4);border-radius:4px;padding:1px 6px;vertical-align:1px}
.cd-papel .ed-ref{background:var(--sal-2)}
.cd-frase b{font-family:var(--sans);font-size:15px;letter-spacing:.06em;font-weight:600;color:var(--vinho-escuro);vertical-align:1px}
.cd-papel b{font-family:var(--sans);font-size:12px;letter-spacing:.06em}
.ed-grupos{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 36px;padding:4px 24px 12px}
.ed-grupos .cd-dl>div{grid-template-columns:132px minmax(0,1fr)}
.ed-grupos .cd-sai{display:block;margin:4px 0 0}.ed-grupos .cd-sai .cd-nw{white-space:normal;overflow-wrap:anywhere}
.ed-ref{white-space:nowrap}
.ed-uso{display:block;font-weight:400;font-size:12px;color:var(--texto-2);margin-top:2px}
.ed-uso b{font-weight:500;color:var(--vinho)}
.ed-cont{list-style:none;margin:0;padding:0 24px 8px}
.ed-cont li{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.4fr);gap:6px 16px;align-items:center;padding:12px 0;border-top:1px solid var(--divisor);font-size:14px}
.ed-cont li:first-child{border-top:0}
.ed-cont strong{display:block;font-weight:500}
.ed-cont small{display:block;font-size:12px;color:var(--texto-2)}
.ed-cont a{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--vinho);text-decoration:none;overflow-wrap:anywhere;min-width:0}
.ed-cont a .ico{color:var(--vinho-4);flex:none}
.ed-cont a:hover{text-decoration:underline}
.ed-advs{list-style:none;margin:0;padding:0 24px 8px}
.ed-advs>li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 20px;padding:18px 0;border-top:1px solid var(--divisor)}
.ed-advs>li:first-child{border-top:0;padding-top:6px}
.ed-adv-nome{font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho);line-height:1.2;overflow-wrap:anywhere}
.ed-adv-meta{font-size:12px;color:var(--texto-2);margin-top:2px}
.ed-adv-prog{display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap;margin-top:10px;font-size:13px}
.ed-adv-prog .cd-tons{flex:0 0 150px}
.ed-adv-prog b{font-weight:600}
.ed-adv-frase{grid-column:1/-1;margin:0;padding:12px 16px;border-radius:var(--raio);background:#FCF8F5;border:1px solid var(--borda-folha);border-left:3px solid var(--ambar);font-family:var(--serifa);font-size:16px;line-height:1.55;color:var(--tinta);overflow-wrap:anywhere}
.ed-adv-frase strong{color:var(--vinho-escuro);font-weight:700}
.ed-adv-bts{display:flex;align-items:flex-start;gap:8px}
.ed-fora{margin:0 24px 16px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5;display:flex;gap:10px;align-items:flex-start}
.ed-fora .ico{color:var(--vinho-4);flex:none;margin-top:1px}
.ed-resumo-adv{padding:0 24px 18px;display:grid;gap:12px}
.ed-resumo-adv ul{list-style:none;margin:0;padding:0}
.ed-resumo-adv li{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--divisor);font-size:13px;flex-wrap:wrap}
.ed-resumo-adv li:first-child{border-top:0}
.ed-resumo-adv li span:first-child{font-weight:500;min-width:0;overflow-wrap:anywhere}
.ed-resumo-adv .btn{justify-self:start}
.ed-tim{margin:0 24px 14px;padding:14px 16px;background:var(--papel);border:1px solid var(--borda-folha);border-radius:4px;display:grid;gap:2px;font-size:12px;line-height:1.5;color:var(--texto-2);overflow-wrap:anywhere}
.ed-tim strong{font-family:var(--serifa);font-size:17px;font-weight:600;color:var(--vinho);line-height:1.25}
.ed-tim-rot{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--vinho-2);margin:0 24px 6px}
/* Tipo do escritório: três botões de opção, um embaixo do outro */
.ed-tipo{border:0;margin:0;padding:0;min-width:0;grid-column:1/-1}
.ed-tipo>.ajuda{font-size:12px;color:var(--texto-2);margin:6px 0 0}
.ed-tipo legend{padding:0;margin-bottom:4px;font-size:13px;font-weight:500;color:var(--texto)}
.ed-tipo .ed-tipo-ops{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px 16px}
.ed-tipo .opcao{border:1px solid var(--borda-folha);margin:0;padding:12px;border-radius:var(--raio)}
.ed-tipo .opcao:has(input:checked){border-color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho);background:#FCF8F5}
[data-soc][hidden],[data-sem][hidden],[data-prev][hidden],[data-proprio][hidden]{display:none!important}
.ed-sem-nota{grid-column:1/-1;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.ed-sem-nota .ico{color:var(--vinho);flex:none;margin-top:1px}
.ed-sem-nota a{color:var(--vinho);font-weight:500}
/* Endereço em partes: o mesmo grupo aprovado do endereço de cobrança (cobranca-pdfs) */
.end-grupo{grid-column:1/-1;border:0;margin:0;padding:14px 16px 16px;min-width:0;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--sal-2)}
.end-grupo legend{float:left;width:100%;padding:0;margin:0 0 2px;font-size:14px;font-weight:500;color:var(--texto)}
.end-grupo>.ajuda{clear:both;margin:0 0 12px;font-size:12px;color:var(--texto-2)}
.end-grade{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px 16px}
.end-grade .e1{grid-column:span 1}.end-grade .e2{grid-column:span 2}.end-grade .e3{grid-column:span 3}.end-grade .e4{grid-column:span 4}.end-grade .e6{grid-column:span 6}
.ed-antigo{clear:both;margin:0 0 14px;display:grid;gap:8px}
.ed-antigo blockquote{margin:0;padding:10px 14px;background:var(--papel);border:1px dashed var(--vinho-4);border-radius:var(--raio);font-size:14px;overflow-wrap:anywhere}
.ed-antigo blockquote small{display:block;font-size:12px;color:var(--texto-2);margin-bottom:2px}
.cd-a-form .aviso-acoes li a,.cd .aviso-acoes li a{display:inline-flex;align-items:center;min-height:44px}
.ed-sistema .hn-dl dd{text-align:right}
.ed-sistema .hn-dl div{align-items:center;flex-wrap:wrap}
.ed-sistema .hn-dl div>div{display:grid;gap:0}
.ed-linha{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 16px;padding:14px 0;border-top:1px solid var(--divisor)}
.ed-linha:first-child{border-top:0}
.ed-linha dt{font-size:13px;color:var(--texto-2)}
.ed-linha dd{margin:0;font-weight:500;overflow-wrap:anywhere;min-width:0}
.ed-linha dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.ed-conta{margin:0;padding:0 24px 8px}
.ed-mudou{margin:0 24px 0}

@media (max-width:760px){
  .ed-grupos{grid-template-columns:minmax(0,1fr);padding:0 16px 8px}
  .ed-grupos .cd-dl>div{grid-template-columns:minmax(0,1fr)}
  .ed-cont{padding:0 16px 8px}
  .ed-cont li{grid-template-columns:minmax(0,1fr);gap:0}
  .ed-advs{padding:0 16px 8px}
  .ed-advs>li{grid-template-columns:minmax(0,1fr)}
  .ed-adv-bts .btn{width:100%}
  .ed-adv-frase{font-size:15px}
  .ed-fora{margin:0 16px 14px}
  .ed-resumo-adv{padding:0 16px 16px}
  .ed-tim{margin:0 16px 12px}
  .ed-tim-rot{margin:0 16px 6px}
  .ed-tipo .ed-tipo-ops{grid-template-columns:minmax(0,1fr)}
  .end-grade{grid-template-columns:minmax(0,1fr)}.end-grade>*{grid-column:1/-1!important}
  .end-grupo{padding:12px}
  .ed-conta{padding:0 16px 8px}
  .ed-linha{grid-template-columns:minmax(0,1fr)}
  .ed-linha .btn{width:100%}
  .ed-mudou{margin:0 16px}
  .cd-pe-bts .cd-bts{flex-direction:column-reverse}
}
"""


def uso(t):
    return f'<span class="ed-uso">Sai em: <b>{t}</b></span>'


def F(o):
    return f'<span class="selo selo-atencao">Falta</span><span class="cd-sai">sai como <span class="cd-nw">[{o}: falta]</span></span>'


OPC = '<span class="cd-opc">Não informado (opcional)</span>'


# ---------------------------------------------------------------- cabeçalho: vinho (quem é) + âmbar (como sai no contrato)
def disco_esc(e):
    tot = len(dados_que_contam(e))
    f = faltas_esc(e)
    n = tot - len(f)
    t = 'completos para os documentos' if not f else f'falta{"m" if len(f) > 1 else ""} {len(f)} para os documentos'
    return (f'<div class="cd-conta"><span class="disco{" cd-ok" if not f else ""}" aria-hidden="true"><span>{n}</span></span>'
            f'<p><b>de {tot} dados</b>{t}<span class="sr">: {n} de {tot} dados preenchidos</span></p></div>')


def cabecalho(e, dona=True, editar=False):
    tipo = TIPOS[e['tipo']][0] if e['tipo'] else 'Tipo não informado'
    meta = [f'<span class="selo">{tipo}</span>']
    if e['cidade']:
        meta.append(f'<span>{e["cidade"]}, {e["uf"]}</span>')
    meta.append(f'<span class="cd-nw">CNPJ {e["cnpj"]}</span>' if e['cnpj'] else '<span>Sem CNPJ</span>')
    sobre = 'Escritório · editando os dados' if editar else 'Escritório · dados para os documentos'
    topo = (f'<div class="cd-topo campo-vinho">{ico("coluna", "ico estatua")}<div class="cd-quem"><p class="sobretitulo">{sobre}</p>'
            f'<h1 data-nome-esc="{H(e["nome"])}">{e["nome"]}</h1><p class="cd-meta">{"".join(meta)}</p></div>{"" if editar else disco_esc(e)}</div>')
    if editar:
        return f'<header class="cd-cab">{topo}</header>'
    f = faltas_esc(e)
    tot = len(dados_que_contam(e))
    if f:
        txt = (f'<b>Falta{"m" if len(f) > 1 else ""} {len(f)} de {tot}: {lista_e(f)}.</b> Dá para gerar documentos assim: '
               f'o que falta sai marcado, para completar à mão ou no Word.')
        bt = f'<a class="btn btn-pri" href="{X}escritorio-editar">{ico("lapis")}Completar agora</a>' if dona else ''
    else:
        txt = 'É assim que o escritório sai no contrato de honorários. A sede também vai na procuração, nas petições e no timbrado do carnê e do recibo.'
        bt = ''
    if e['tipo'] == 'sem':
        txt = ('<b>Sem sociedade, quem contrata é a advogada:</b> a frase vem da qualificação de Carol Santana, em Advogados nos documentos, '
               'com o endereço deste escritório. Não sai CNPJ.')
    tit = 'Como o escritório sai no contrato'
    return (f'<header class="cd-cab">{topo}<section class="cd-faixa campo-ambar" aria-labelledby="t-sai">'
            f'<p class="sobretitulo" id="t-sai">{tit}</p><p class="cd-frase">{contratada(e)}</p>'
            f'<div class="cd-faixa-pe"><p>{txt}</p>{bt}</div></section></header>')


# ---------------------------------------------------------------- folha dos dados (leitura)
def prog_esc(e):
    tot = len(dados_que_contam(e))
    f = faltas_esc(e)
    n = tot - len(f)
    tons = ''.join('<i></i>' if i < n else '<i class="v"></i>' for i in range(tot))
    if f:
        t = f'<b>Falta{"m" if len(f) > 1 else ""} {len(f)} de {tot} dados:</b> {lista_e(f)}. Não bloqueia: os documentos saem com a marca no lugar.'
    else:
        t = f'<b>{tot} de {tot} dados preenchidos.</b> O escritório sai completo nos documentos.'
    return (f'<div class="cd-prog{"" if f else " ok"}"><div class="cd-tons" aria-hidden="true" style="grid-template-columns:repeat({tot},1fr);flex-basis:{23 * tot}px">{tons}</div>'
            f'<p>{t}</p></div>')


def dl(xs):
    return '<dl class="cd-dl">' + ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in xs) + '</dl>'


def linhas(e):
    sem = e['tipo'] == 'sem'
    q = [('Nome no T3jus', f'{e["nome"]}<small>Aparece no Portal, no menu e nas conversas. Não sai nos documentos.</small>'),
         ('Tipo', (TIPOS[e['tipo']][0] + f'<small>{TIPOS[e["tipo"]][1]}</small>') if e['tipo'] else F('TIPO').replace(' <span class="cd-sai">', '<span class="cd-sai">').replace('sai como <span class="cd-nw">[TIPO: falta]</span>', 'muda a frase do contrato'))]
    if sem:
        q.append(('Contratada', f'Carol Santana, como advogada<small>A qualificação dela, de Advogados nos documentos.</small>{uso("contrato")}'))
    else:
        q += [('Razão social', (e['razao'] + uso('contrato, recibo e carnê')) if e['razao'] else F('RAZÃO SOCIAL') + f'<small>Até lá, sai o nome no T3jus: “{e["nome"].upper()}”.</small>'),
              ('CNPJ', (f'<span class="cd-nw">{e["cnpj"]}</span>' + uso('contrato, recibo e carnê')) if e['cnpj'] else F('CNPJ')),
              ('Registro da sociedade na OAB', (oab_soc(e) + uso('contrato, recibo e carnê')) if e['oab'] else F('OAB DA SOCIEDADE'))]
    el = end_linha(e)
    if el:
        end = el + uso('contrato, procuração, petições, recibo e carnê') + '<small>É também o endereço profissional de quem usa o do escritório.</small>'
    elif e['antigo']:
        end = (f'{e["antigo"]}<span class="selo selo-atencao" style="margin-left:6px">Confira</span>'
               '<small>Veio do cadastro antigo, num texto só. Separe em CEP, rua, número e bairro.</small>')
    else:
        end = F('ENDEREÇO DO ESCRITÓRIO') + (f'<small>Já guardado: {e["cidade"]}, {e["uf"]}.</small>' if e['cidade'] else '')
    w = [('Endereço da sede', end)]
    c = [('Telefone', (e['tel'] + uso('recibo, carnê e petições, se o modelo pedir')) if e['tel'] else OPC),
         ('E-mail', (CD.quebra_email(e['email']) + uso('recibo, carnê e petições, se o modelo pedir')) if e['email'] else OPC),
         ('Site', (e['site'] + uso('recibo')) if e['site'] else OPC)]
    return (f'<div class="ed-grupos"><div><h3 class="cd-h3">Quem é o escritório</h3>{dl(q)}</div>'
            f'<div><h3 class="cd-h3">Onde fica</h3>{dl(w)}<h3 class="cd-h3">Como falar com o escritório</h3>{dl(c)}</div></div>')


def folha_dados(e, dona=True):
    bt = f'<div class="acoes"><a class="btn btn-sec" href="{X}escritorio-editar">{ico("lapis")}Editar dados</a></div>' if dona else ''
    if dona:
        pe = (f'<p class="cd-pe">{ico("historico")}<span>Quem muda: você, como sócia dona, aqui; e a equipe T3jus, no Console. '
              f'Cada mudança fica no histórico do escritório, com quem fez e quando.</span></p>')
    else:
        pe = (f'<div class="pt-muda">{ico("cadeado")}<p>Só para ler. <b>Quem muda estes dados é Carol Santana, sócia dona</b>, aqui no Portal '
              f'(ou a equipe T3jus, no Console). Algo errado no contrato? Fale com ela.</p></div>')
    return (f'<section class="folha" aria-labelledby="t-dados" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-dados">{ico("coluna")}Dados do escritório</h2>'
            f'<p class="sub">Saem no contrato, na procuração, nas petições e no timbrado do recibo e do carnê.</p></div>{bt}</div>'
            f'{prog_esc(e)}{linhas(e)}{pe}</section>')


CONTATOS = [('Carol Santana', 'Sócia dona', '(71) 99184-5520', f'carolina@{DOMINIO}'),
            ('Júlia Andrade', 'Recepção', '(71) 3352-4180', f'julia@{DOMINIO}')]


def folha_contatos():
    li = ''.join(f'<li><div><strong>{n}</strong><small>{p}</small></div><a href="#">{ico("telefone")}{t}</a>'
                 f'<a href="#">{ico("envelope")}{CD.quebra_email(m)}</a></li>' for n, p, t, m in CONTATOS)
    return (f'<section class="folha" aria-labelledby="t-cont" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-cont" style="font-size:20px">{ico("pessoas")}Contatos com a equipe T3jus</h2>'
            f'<p class="sub">As pessoas com quem a equipe T3jus fala. Não saem nos documentos.</p></div></div><ul class="ed-cont">{li}</ul>'
            f'<p class="cd-pe">{ico("ajuda")}<span>Para mudar os contatos, <a href="#">fale com a equipe T3jus</a> pela Ajuda.</span></p></section>')


USOS = (f'<section class="folha" aria-labelledby="t-usos"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-usos" style="font-size:20px">Onde estes dados entram</h2></div></div>'
        f'<ul class="cd-usos">'
        f'<li><span class="cd-ic" aria-hidden="true">{ico("pena")}</span><div><strong>Contrato de honorários</strong><span>“CONTRATADA:” razão social, CNPJ, registro na OAB e sede.</span></div></li>'
        f'<li><span class="cd-ic" aria-hidden="true">{ico("doc")}</span><div><strong>Procuração</strong><span>A sede, como endereço onde os advogados recebem intimações.</span></div></li>'
        f'<li><span class="cd-ic" aria-hidden="true">{ico("balanca")}</span><div><strong>Petições</strong><span>“Com escritório em ...”; telefone e e-mail só se o modelo pedir.</span></div></li>'
        f'<li><span class="cd-ic" aria-hidden="true">{ico("carteira")}</span><div><strong>Recibo e carnê</strong><span>No timbrado: razão social, CNPJ, OAB, sede, telefone, e-mail e site.</span></div></li>'
        f'</ul><p class="cd-pe">{ico("historico")}<span>Documentos já gerados não mudam: cada arquivo guarda os dados do dia.</span></p></section>')


def resumo_advs(dona=True):
    advs = [(CAROL, ), (RAFAEL, ), (LONGA, )]
    li = ''
    for (p,) in advs:
        f = faltas(p)
        s = ('<span class="selo selo-ok">' + ico('check') + '8 de 8</span>') if not f else f'<span class="selo selo-atencao">Falta{"m" if len(f) > 1 else ""} {len(f)}</span>'
        li += f'<li><span>{p["curto"]}</span>{s}</li>'
    return (f'<section class="folha" aria-labelledby="t-advr"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-advr" style="font-size:20px">Advogados nos documentos</h2>'
            f'<p class="sub">A qualificação de quem assina pelo escritório.</p></div></div><div class="ed-resumo-adv"><ul>{li}</ul>'
            f'<a class="btn btn-sec" href="{X}escritorio-advogados">{ico("cracha")}Ver os advogados</a></div></section>')


def pagina_ver(e, dona=True):
    return (f'<div class="cd">{cabecalho(e, dona)}<div class="hn-grade"><div class="hn-col">{folha_dados(e, dona)}{folha_contatos()}</div>'
            f'<aside class="hn-col" aria-label="Onde os dados entram e os advogados">{USOS}{resumo_advs(dona)}</aside></div></div>')


# ---------------------------------------------------------------- edição
def form_esc(e, erros=None):
    erros = erros or {}
    er = lambda k: erros.get(k, ('', ''))[1]
    foco = next(iter(erros), 'nome')
    resumo = ''
    if erros:
        links = ''.join(f'<li><a href="#ed-{k}">{rot}</a></li>' for k, (rot, _) in erros.items())
        resumo = ('<div class="c6">' + aviso('urgencia', f'Falta acertar {len(erros)} pontos, marcados abaixo.', 'Os dados do escritório ainda não foram salvos.',
                                             acoes=f'<ul>{links}</ul>') + '</div>')
    t = e['tipo']
    ops = ''.join(opcao('ed-tipo', TIPOS[k][0], TIPOS[k][1], t == k, 'radio', k) for k in ('sociedade', 'individual', 'sem'))
    tipo = (f'<fieldset class="ed-tipo" aria-describedby="ed-tipo-aj"><legend>Tipo</legend><div class="ed-tipo-ops">{ops}</div>'
            f'<p class="ajuda" id="ed-tipo-aj">Muda a frase do contrato. Sem sociedade, razão social, CNPJ e registro na OAB somem.</p></fieldset>')
    sem = t == 'sem'
    soc = (f'<div data-soc{" hidden" if sem else ""} style="display:contents">'
           + campo('ed-razao', 'Razão social', e['razao'], 'c6', ajuda='Como no registro da OAB e no cartão do CNPJ. No contrato, sai em maiúsculas.', ac='organization')
           + campo('ed-cnpj', 'CNPJ', e['cnpj'], 'c2', im='numeric', ajuda='' if er('cnpj') else 'Conferimos os dígitos.', erro=er('cnpj'), foco=foco == 'cnpj')
           + selecao('ed-oabuf', 'Registro na OAB: seccional', UF_LISTA, e['oab'][0] if e['oab'] else '', 'c2')
           + campo('ed-oabn', 'Registro na OAB: número', e['oab'][1] if e['oab'] else '', 'c2', im='numeric', ajuda='O da sociedade, não o de cada advogado.')
           + '</div>')
    semnota = (f'<div data-sem{"" if sem else " hidden"} class="ed-sem-nota">{ico("balanca")}<span>Sem sociedade, quem contrata é a advogada. '
               f'O contrato sai com <b>Carol Santana</b> como contratada, com a qualificação dela em '
               f'<a href="{X}escritorio-advogados">Advogados nos documentos</a> e o endereço abaixo. Sem CNPJ.</span></div>')
    x = e['end'] or {}
    antigo = ''
    if e['antigo']:
        antigo = (f'<div class="ed-antigo">' + aviso('atencao', 'Confira o endereço: ele estava num texto só.',
                                                     'Pusemos o texto antigo inteiro em “Rua”. Deixe ali só a rua e passe o número, o complemento e o bairro para os campos certos, e escreva o CEP. Até salvar, o contrato sai com a marca [ENDEREÇO: confira].', icone='alerta')
                  + f'<blockquote><small>Texto antigo</small>{e["antigo"]}</blockquote></div>')
        x = dict(rua=e['antigo'], cidade=e['cidade'], uf=e['uf'])
    end = (f'<fieldset class="end-grupo" aria-describedby="ed-end-aj"><legend>Endereço da sede</legend>'
           f'<p class="ajuda" id="ed-end-aj">Sai no contrato, na procuração, nas petições e no timbrado. Também é o endereço profissional de quem usa o do escritório.</p>{antigo}'
           f'<div class="end-grade">'
           + campo('ed-cep', 'CEP', x.get('cep', ''), 'e2', im='numeric', ac='postal-code', ajuda='' if er('cep') else 'Só números ou com hífen.', erro=er('cep'), foco=foco == 'cep')
           + campo('ed-rua', 'Rua, avenida ou travessa', x.get('rua', ''), 'e4', ac='address-line1', ajuda='Veio do texto antigo: deixe só a rua.' if e['antigo'] else '')
           + campo('ed-num', 'Número', x.get('num', ''), 'e1', ac='off', ajuda='' if er('num') else 'Sem número: S/N.', erro=er('num'), foco=foco == 'num')
           + campo('ed-comp', 'Complemento', x.get('comp', ''), 'e2', opc=True, ac='address-line2')
           + campo('ed-bairro', 'Bairro', x.get('bairro', ''), 'e3', ac='address-level3')
           + campo('ed-cidade', 'Cidade', x.get('cidade', ''), 'e4', ac='address-level2')
           + selecao('ed-uf', 'UF', UF_LISTA, x.get('uf', ''), 'e2').replace('<select ', '<select autocomplete="address-level1" ', 1)
           + '</div></fieldset>')
    corpo = (resumo
             + '<h3 class="cd-h3 cd-sec">Quem é o escritório</h3>'
             + campo('ed-nome', 'Nome no T3jus', e['nome'], 'c6', ajuda='O nome curto do Portal, do menu e das conversas. Não sai nos documentos.', erro=er('nome'), foco=foco == 'nome')
             + tipo + soc + semnota
             + '<h3 class="cd-h3 cd-sec">Onde fica</h3>' + end
             + '<h3 class="cd-h3 cd-sec">Como falar com o escritório</h3>'
             + campo('ed-tel', 'Telefone', e['tel'], 'c3', tipo='tel', opc=True, im='tel', ac='tel', ajuda='Vai no timbrado do recibo e do carnê.')
             + campo('ed-email', 'E-mail', e['email'], 'c3', tipo='email', opc=True, ac='email', ajuda='Vai no timbrado; nas petições, só se o modelo pedir.')
             + campo('ed-site', 'Site', e['site'], 'c6', opc=True, ac='url', ajuda='Só no timbrado do recibo.'))
    sub = 'Os campos sem “(opcional)” entram nos documentos. Só o nome no T3jus e o tipo são obrigatórios; o que ficar em branco sai marcado como falta.'
    return (f'<section class="folha cd-a-form" aria-labelledby="t-form"><div class="folha-cab"><div><h2 id="t-form">Dados do escritório</h2><p class="sub">{sub}</p></div></div>'
            f'<form class="form-folha" id="ed-form" action="#" novalidate>{corpo}</form></section>')


def previa(e, outro=None):
    marca = lambda s: f'<mark>{s}</mark>'

    def um(e, chave, oculto):
        f = faltas_esc(e)
        tot = len(dados_que_contam(e))
        n = tot - len(f)
        if f:
            cont = f'<b>{n} de {tot} dados.</b> Falta{"m" if len(f) > 1 else ""}: {lista_e(f)}. Dá para salvar assim.'
        else:
            cont = f'<b>{tot} de {tot} dados.</b> O escritório sai completo.'
        l1, l2, l3, l4 = timbrado(e)
        tim = ''.join(f'<span>{x}</span>' for x in (l2, l3, l4) if x)
        return (f'<div data-prev="{chave}"{" hidden" if oculto else ""}><div class="cd-papel"><p class="cd-tim"><span>{H(e["razao"] or e["nome"])}</span><span>Contrato de honorários</span></p>'
                f'<p>{contratada(e, marca=marca, advs=e["tipo"] != "sem")}</p></div>'
                f'<p class="ed-tim-rot">Timbrado do recibo e do carnê</p><div class="ed-tim"><strong>{l1}</strong>{tim}</div>'
                f'<p class="cd-conta-prev">{cont}</p></div>')
    corpo = um(e, e['tipo'] if e['tipo'] == 'sem' else 'soc', False)
    if outro:
        corpo += um(outro, 'sem' if outro['tipo'] == 'sem' else 'soc', True)
    return (f'<section class="folha" aria-labelledby="t-prev"><div class="folha-cab" style="padding-bottom:10px"><div><h2 id="t-prev" style="font-size:20px">Como o escritório sai no papel</h2>'
            f'<p class="sub">Prévia do contrato e do timbrado. Muda enquanto você digita.</p></div></div><div aria-live="polite">{corpo}</div></section>')


def pe_form():
    return (f'<section class="folha cd-a-pe" aria-label="Salvar"><div class="cd-pe-bts"><p>Vale para os próximos documentos; os já gerados não mudam. '
            f'A mudança fica no histórico do escritório.</p><div class="cd-bts"><a class="btn btn-fantasma" href="{X}escritorio-faltando">Cancelar</a>'
            f'<button class="btn btn-pri" type="submit" form="ed-form">{ico("check")}Salvar dados do escritório</button></div></div></section>')


def pagina_editar(e, erros=None, outro=None):
    return (f'<div class="cd">{cabecalho(e, editar=True)}<div class="cd-ed">{form_esc(e, erros)}'
            f'<aside class="cd-a-prev" aria-label="Prévia">{previa(e, outro)}</aside>{pe_form()}</div></div>')


# ---------------------------------------------------------------- Advogados nos documentos
def frase_adv(p):
    fr = qualificacao(p)
    if p['completo']:
        fr = fr.replace(p['completo'].upper(), f'<strong>{p["completo"].upper()}</strong>', 1)
    return fr


def pagina_advs():
    advs = [CAROL, RAFAEL, LONGA]
    comp = sum(1 for p in advs if not faltas(p))
    topo = (f'<header class="cd-cab"><div class="cd-topo campo-vinho">{ico("cracha", "ico estatua")}<div class="cd-quem"><p class="sobretitulo">Escritório · advogados nos documentos</p>'
            f'<h1>Quem assina pelo escritório</h1><p class="cd-meta"><span>3 pessoas com OAB na Equipe · a qualificação de cada uma sai no contrato e na procuração</span></p></div>'
            f'<div class="cd-conta"><span class="disco" aria-hidden="true"><span>{comp}</span></span><p><b>de 3 completos</b>Rafael Menezes tem 2 faltas<span class="sr">: {comp} de 3 advogados com os dados completos</span></p></div></div></header>')
    li = ''
    for p in advs:
        f = faltas(p)
        n = 8 - len(f)
        tons = ''.join('<i></i>' if i < n else '<i class="v"></i>' for i in range(8))
        st = f'<b>8 de 8.</b> Completos.' if not f else f'<b>{n} de 8.</b> Falta{"m" if len(f) > 1 else ""}: {lista_e(f)}.'
        oab = ' · '.join(oab_curta(i) for i in p['oab'])
        bt = 'Ver e editar' if not f else f'Completar os dados'
        url = X + ('escritorio-advogado-editar' if p is RAFAEL else 'escritorio-advogados')
        li += (f'<li><div><p class="ed-adv-nome">{p["curto"]}</p><p class="ed-adv-meta">{p["papel"]} · {oab}</p>'
               f'<div class="ed-adv-prog"><div class="cd-tons" aria-hidden="true">{tons}</div><span>{st}</span></div></div>'
               f'<div class="ed-adv-bts"><a class="btn {"btn-pri" if f else "btn-sec"}" href="{url}">{ico("lapis")}{bt}<span class="sr"> de {p["curto"]}</span></a></div>'
               f'<p class="ed-adv-frase">{frase_adv(p)}.</p></li>')
    lista = (f'<section class="folha" aria-labelledby="t-advs" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-advs">{ico("balanca")}Advogados nos documentos</h2>'
             f'<p class="sub">Como cada pessoa sai na qualificação do contrato, da procuração e das petições. O que falta sai marcado.</p></div></div>'
             f'<ul class="ed-advs">{li}</ul>'
             f'<p class="ed-fora">{ico("ajuda")}<span>Só aparece quem tem OAB na Equipe. Júlia Andrade, da recepção, não assina documentos e não está na lista. '
             f'Para cadastrar ou corrigir uma OAB, <a href="#">vá à Equipe</a>.</span></p></section>')
    quem = (f'<section class="folha" aria-labelledby="t-quem"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-quem" style="font-size:20px">Quem muda</h2></div></div>'
            f'<ul class="cd-usos">'
            f'<li><span class="cd-ic" aria-hidden="true">{ico("coluna")}</span><div><strong>A sócia dona</strong><span>Vê e muda os dados de todos os advogados.</span></div></li>'
            f'<li><span class="cd-ic" aria-hidden="true">{ico("pena")}</span><div><strong>Cada advogado</strong><span>Vê a lista e completa só os próprios dados, aqui mesmo.</span></div></li>'
            f'<li><span class="cd-ic" aria-hidden="true">{ico("cracha")}</span><div><strong>A OAB</strong><span>Vem da Equipe; só a sócia dona muda.</span></div></li>'
            f'</ul><p class="cd-pe">{ico("historico")}<span>A última mudança vale. O histórico guarda quem mudou quais campos, sem os números de CPF e RG.</span></p></section>')
    return (f'<div class="cd">{topo}<div class="hn-grade"><div class="hn-col">{lista}</div>'
            f'<aside class="hn-col" aria-label="Quem muda e onde entram">{quem}{CD.USOS}</aside></div></div>')


def pagina_adv_editar():
    RAF_ED = dict(RAFAEL, ec='SOLTEIRO')
    h = CD.pagina_editar(RAF_ED, 'equipe')
    trocas = [('Equipe · editando os dados', 'Advogados nos documentos · editando'),
              (f'{ico("esq", "ico ico-s")}Equipe</a>', f'{ico("esq", "ico ico-s")}Advogados nos documentos</a>'),
              ('equipe.html?estado=equipe-pessoa-dados', X + 'escritorio-advogados'),
              ('<a href="#">Editar inscrições</a>', '<a href="#">Mudar na Equipe</a>'),
              ('As inscrições se mudam no quadro de inscrições da ficha.', 'Vem da Equipe. Só a sócia dona muda a OAB, lá.'),
              ('A mudança fica no histórico da equipe.', 'A mudança fica no histórico do escritório.'),
              ('os seus documentos mudam junto', 'os documentos de Rafael mudam junto')]
    for a, b in trocas:
        assert a in h, a
        h = h.replace(a, b)
    return h


# ---------------------------------------------------------------- Sua conta só com o que é do sistema
def pagina_conta():
    p = dict(CAROL, oab=[])
    cab = CD.cabecalho(p, 'conta', faixa=False)
    mudou = aviso('info', 'Seus dados para contratos e procurações agora ficam no Escritório.',
                  'Nome completo, estado civil, CPF, RG e endereço profissional estão em Escritório › Advogados nos documentos, junto dos dados do escritório. Sua conta fica só com o que é do sistema.',
                  acoes=f'<a class="btn btn-sec" href="{X}escritorio-advogados">{ico("balanca")}Ir para Advogados nos documentos</a>', icone='ajuda')
    linhas_ = [('Nome de exibição', 'Carol Santana<small>Como você aparece no menu, na agenda e nas conversas.</small>', 'Mudar'),
               ('E-mail de entrada', CD.quebra_email(CAROL['login']) + '<small>É com ele que você entra e recebe o código.</small>', ''),
               ('Senha', 'Trocada em 02/10/2026<small>Entrada com senha e código por e-mail.</small>', 'Trocar a senha'),
               ('Avisos', 'No sino e por e-mail<small>Prazos, conversas e cobranças.</small>', 'Mudar avisos'),
               ('Escritórios', 'Santana Advocacia<small>Você está em 1 escritório.</small>', 'Trocar de escritório')]
    dl_ = ''.join(f'<div class="ed-linha"><dl style="margin:0;min-width:0"><dt>{a}</dt><dd>{b}</dd></dl>{f"<a class=\"btn btn-sec\" href=\"#\">{c}<span class=sr> ({a.lower()})</span></a>" if c else ""}</div>' for a, b, c in linhas_)
    folha = (f'<section class="folha ed-sistema" aria-labelledby="t-conta" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-conta">Sua conta no T3jus</h2>'
             f'<p class="sub">Só o que é do sistema: como você aparece, como entra e o que recebe.</p></div></div><div class="ed-conta">{dl_}</div></section>')
    return (f'<div class="cd">{cab}<div class="ed-mudou" style="margin:0">{mudou}</div><div class="hn-grade"><div class="hn-col">{folha}</div>'
            f'<aside class="hn-col" aria-label="Seu acesso">{CD.acesso(CAROL).replace('O profissional, se houver, é o que sai nos documentos.', 'O e-mail profissional, que sai nos documentos, fica em Escritório › Advogados nos documentos.')}</aside></div></div>')


SCRIPT_ED = r"""<script>
(function(){
  /* O nome curto do escritório da tela (no estado do print, "Santana") vai também para o cartão do trilho */
  var h=document.querySelector('[data-nome-esc]'); if(h){document.querySelectorAll('.escritorio strong').forEach(function(s){s.textContent=h.dataset.nomeEsc})}
  document.addEventListener('change',function(e){
    if(e.target.name==='ed-tipo'){
      var sem=e.target.value==='sem';
      document.querySelectorAll('[data-soc]').forEach(function(x){x.hidden=sem});
      document.querySelectorAll('[data-sem]').forEach(function(x){x.hidden=!sem});
      document.querySelectorAll('[data-prev]').forEach(function(x){x.hidden=(x.dataset.prev==='sem')!==sem});
    }
    if(e.target.id==='cd-end-esc'){
      var esc=e.target.checked;
      document.querySelectorAll('[data-proprio]').forEach(function(x){x.hidden=esc});
      var ok=document.getElementById('cd-end-ok'); if(ok) ok.hidden=!esc;
    }
  });
})();
</script>"""

SECOES_ESC = ['Dados do escritório', 'Advogados nos documentos', 'WhatsApp e IA', 'Recebimento', 'Ajustes do financeiro']


def barra_esc(secao):
    links = ''.join(f'<a href="{X + "escritorio-completo" if s == SECOES_ESC[0] else (X + "escritorio-advogados" if s == SECOES_ESC[1] else "#")}"'
                    f'{" aria-current=\"page\"" if s == secao else ""}>{s}</a>' for s in SECOES_ESC)
    return (f'<template data-barra="escritorio|{secao}"><div class="pt-barra-area"><p class="pt-area-nome">{ico("coluna")}Escritório</p>'
            f'<nav class="pt-secoes" aria-label="Seções do Escritório">{links}</nav></div></template>')


def montar_pagina(titulo, desc, padrao, T, barras=''):
    out = pagina(titulo, desc, padrao, '', T, barras)
    from oab import com_conta
    out = com_conta(out, ico)
    out = out.replace('<span class="sr">, sua conta e sua OAB</span>', '<span class="sr">, sua conta</span>')
    out = out.replace('Seus dados e sua OAB', 'Sua conta')
    out = rebatizar(out)
    out = out.replace('</style>', CSS_HN + CD.CSS + CSS + '\n</style>', 1)
    out = out.replace('</body>', SCRIPT_ED + '\n</body>', 1)
    return out


if __name__ == '__main__':
    b = dict(atual='escritorio', area='escritorio', secao='Dados do escritório', trilha='Escritório|Dados do escritório', titulo='Dados do escritório')
    be = dict(b, trilha='Escritório|Dados do escritório|Editar')
    ba = dict(b, secao='Advogados nos documentos', trilha='Escritório|Advogados nos documentos', titulo='Advogados nos documentos')
    ED = dict(PRINT, nome='Santana Advocacia', tipo='individual', razao='Santana Sociedade Individual de Advocacia',
              end=dict(cep='45240-000', rua='Rua Coronel Zeca Leite', num='118', comp='sala 2', bairro='Centro', cidade='Presidente Jânio Quadros', uf='BA'),
              tel='(77) 3492-1180', email=f'contato@{DOMINIO}')
    ERR = dict(ED, cnpj='60.814.144/0001-30', cnpj_ruim=True, end=dict(ED['end'], cep='4524-000', num=''))
    ERROS = {'cnpj': ('CNPJ: os dígitos não conferem', 'Os dois últimos dígitos não conferem com os 12 primeiros. Confira no cartão do CNPJ.'),
             'cep': ('CEP: faltam números', 'O CEP tem 8 números; aqui há 7. Confira, como em 45240-000.'),
             'num': ('Número: escreva o número', 'Escreva o número. Se não houver, escreva S/N.')}
    T = ''
    T += tpl('escritorio-completo', pagina_ver(SANTANA), quem='socio', **b)
    T += tpl('escritorio-faltando', pagina_ver(PRINT), quem='socio', **b)
    T += tpl('escritorio-editar', pagina_editar(ED, outro=dict(SEM, nome=ED['nome'], end=ED['end'], tel=ED['tel'], email=ED['email'], cidade=ED['cidade'])), quem='socio', **be)
    T += tpl('escritorio-erros', pagina_editar(ERR, ERROS), quem='socio', **be)
    T += tpl('escritorio-salvo', pagina_ver(SANTANA) + toast('Dados do escritório salvos.', 'Valem para os próximos documentos; os já gerados não mudam.'), quem='socio', **b)
    T += tpl('escritorio-sem-sociedade', pagina_ver(SEM), quem='socio', **b)
    T += tpl('escritorio-endereco-antigo', pagina_editar(ANTIGO), quem='socio', **be)
    T += tpl('escritorio-leitura', pagina_ver(SANTANA, dona=False), quem='rafael', **b)
    T += tpl('escritorio-advogados', pagina_advs(), quem='socio', **ba)
    T += tpl('escritorio-advogado-editar', pagina_adv_editar(), quem='socio', **dict(ba, trilha='Escritório|Advogados nos documentos|Rafael Menezes'))
    barras = barra_esc(SECOES_ESC[0]) + barra_esc(SECOES_ESC[1])
    out = montar_pagina('Escritório', 'Escritório no Portal: dados do escritório e dos advogados para os documentos.', '{"estado":"escritorio-completo","atual":"escritorio"}', T, barras)
    open(f'{SAIDA}/escritorio.html', 'w', encoding='utf-8').write(out)
    print('escritorio ok', T.count('<template data-est='), 'estados')

    T = tpl('conta-so-sistema', pagina_conta(), quem='socio', atual='conta', trilha='Sua conta', titulo='Sua conta')
    out = montar_pagina('Sua conta', 'Sua conta no Portal: só o que é do sistema.', '{"estado":"conta-so-sistema","atual":"conta"}', T)
    open(f'{SAIDA}/conta.html', 'w', encoding='utf-8').write(out)
    print('conta ok')
