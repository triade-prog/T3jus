# Console · Cadastrar interessado à mão (F2.5, SC-05) e o sino do Console (F2.6, SC-02, SC-05).
# Parte das telas aprovadas, lidas sem mudança:
#   - docs/design/aprovadas/site-comercial/_fonte/interessados.py (Interessados aprovado; é rodado numa pasta
#     temporária e as suas peças, como cab(), pedido(), notas(), historico(), são reaproveitadas);
#   - docs/design/aprovadas/console-cobranca/cobranca.html (para a vista do Financeiro, que não vê Interessados);
#   - docs/design/aprovadas/portal-sem-avisos-sino/_fonte/sino.py (o CSS do sino aprovado, prefixo si-, copiado do arquivo).
# O que é novo tem o prefixo ci- (cadastrar interessado) e cs- (sino do Console).
# Uso: python3 montar.py <pasta-saida>
import sys, os, re, runpy, tempfile

APROV = '/home/claude/t3jus/docs/design/aprovadas/'
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'

# ---------------------------------------------------------------- 1. o Interessados aprovado, sem mudança
tmp = tempfile.mkdtemp()
argv0 = sys.argv
sys.argv = ['interessados.py', tmp]
cwd = os.getcwd()
os.chdir(APROV + 'site-comercial/_fonte')
NS = runpy.run_path('interessados.py', run_name='aprovado')
os.chdir(cwd)
sys.argv = argv0
BASE_INT = open(os.path.join(tmp, 'interessados.html'), encoding='utf-8').read()
assert BASE_INT == open(APROV + 'site-comercial/interessados.html', encoding='utf-8').read(), 'o Interessados aprovado mudou'
BASE_COB = open(APROV + 'console-cobranca/cobranca.html', encoding='utf-8').read()

ico, aviso, janela, tpl, campo, selecao, H = (NS[k] for k in ('ico', 'aviso', 'janela', 'tpl', 'campo', 'selecao', 'H'))
cab, sel, pessoa, notas, historico, acoes, lateral_resp, grade, LISTA, NUMEROS, ferramentas, tabela = (
    NS[k] for k in ('cab', 'sel', 'pessoa', 'notas', 'historico', 'acoes', 'lateral_resp', 'grade', 'LISTA', 'NUMEROS', 'ferramentas', 'tabela'))

# O CSS do sino aprovado do Portal, lido do arquivo-fonte sem mudança.
_src = open(APROV + 'portal-sem-avisos-sino/_fonte/sino.py', encoding='utf-8').read()
CSS_SI = re.search(r'CSS_SI = r"""(.*?)"""', _src, re.S).group(1)
_sino_html = open(APROV + 'portal-sem-avisos-sino/sino.html', encoding='utf-8').read()
SIMB_CHECKS = re.search(r'<symbol id="i-checks".*?</symbol>', _sino_html).group(0)

# ---------------------------------------------------------------- 2. CSS novo
CSS_NOVO = r"""
/* ==========================================================================
   F2.5 · Cadastrar interessado à mão (prefixo ci-)
   ========================================================================== */
.janela.ci-larga{width:min(760px,calc(100vw - 32px))}
.ci-sec{display:grid;gap:14px;padding-top:18px;border-top:1px solid var(--divisor)}
.ci-sec:first-of-type{border-top:0;padding-top:0}
.ci-sec>h3{font-family:inherit;font-size:12px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2);margin:0;display:flex;align-items:center;gap:8px}
.ci-sec>h3 .ico{width:16px;height:16px;color:var(--vinho-4)}
.ci-duas{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
.ci-cid{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:14px}
.ci-grupo legend{font-size:13px;font-weight:500;margin-bottom:8px}
.ci-cartoes{display:grid;gap:8px}
.ci-cartoes.ci-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.ci-cartoes.ci-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.ci-cartoes.ci-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.ci-cartoes .opcao{margin:0;padding:10px 12px;border-radius:var(--raio);box-shadow:inset 0 0 0 1px var(--borda-folha);background:var(--papel);min-height:48px;align-items:flex-start}
.ci-cartoes .opcao:has(input:checked){box-shadow:inset 0 0 0 2px var(--vinho);background:#FFFBF8}
.ci-cartoes .opcao small{color:var(--texto-2)}
.ci-grupo[aria-invalid="true"] .opcao,.ci-grupo.ci-erro .opcao{box-shadow:inset 0 0 0 1px var(--vinho-3)}
.ci-grupo .erro-msg{margin-top:8px}
.ci-ajuda-par{font-size:12px;color:var(--texto-2);margin:-6px 0 0}
.ci-lgpd{padding:14px 16px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:8px;font-size:13px;line-height:1.5}
.ci-lgpd .ci-l-topo{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0}
.ci-lgpd .ci-l-topo b{font-weight:600;font-size:14px}
.ci-lgpd ul{list-style:none;margin:0;padding:0;display:grid;gap:4px;color:var(--texto-2)}
.ci-lgpd ul b{color:var(--texto);font-weight:500}
.ci-lgpd .ci-dica{display:flex;gap:8px;align-items:flex-start;margin:0;padding:10px 12px;border-radius:8px;background:var(--ambar-3);color:var(--tinta)}
.ci-lgpd .ci-dica .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.ci-igual{display:flex;align-items:center;gap:6px;margin:6px 0 0;font-size:12.5px;font-weight:500;color:var(--vinho)}
.ci-igual .ico{width:14px;height:14px}
.ci-rep{display:grid;gap:4px;margin:8px 0 0;padding:10px 12px;border-radius:8px;background:var(--papel);box-shadow:inset 0 0 0 1px var(--borda-folha)}
.ci-rep b{font-weight:600}
.ci-rep span{font-size:12.5px;color:var(--texto-2)}
.janela .aviso[tabindex="-1"]:focus{outline:3px solid var(--vinho-3);outline-offset:2px}
.in-dl dd .ci-mao{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--vinho-2);margin-left:8px}
.ci-mao .ico{width:13px;height:13px}
@media (max-width:760px){
  .ci-duas,.ci-cartoes.ci-3,.ci-cartoes.ci-2{grid-template-columns:minmax(0,1fr)}
  .ci-cartoes.ci-4{grid-template-columns:repeat(2,minmax(0,1fr))}
  .janela.ci-larga{width:100vw;max-width:100vw;max-height:100dvh;height:100dvh;border-radius:0;margin:0}
}

/* ==========================================================================
   F2.6 · Sino do Console (CSS si- do Portal aprovado, mais o prefixo cs-)
   ========================================================================== */
""" + CSS_SI + r"""
.cs-explica{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:8px;text-align:left}
.cs-explica li{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.45;color:var(--texto-2)}
.cs-explica .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho-4)}
.si-painel .estado h3{font-size:22px}
.si-painel .estado .codigo{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--texto-2)}
"""

# ---------------------------------------------------------------- 3. o sino: avisos desta primeira versão
ICO_S = {'pedido': 'maleta', 'atribuido': 'pessoa-mais', 'vencido': 'relogio'}


def item(tipo, tit, det, onde, href, hora, novo=False, selo=''):
    nv = '<span class="si-nv">Novo</span>' if novo else ''
    sr = '<span class="sr">Novo: </span>' if novo else ''
    cls = 'si-item si-novo' if novo else 'si-item'
    p = '<span class="si-pto" aria-hidden="true"></span>' if novo else '<span aria-hidden="true"></span>'
    return (f'<li class="{cls}"><span class="si-ico" aria-hidden="true">{ico(ICO_S[tipo])}</span><div>'
            f'<p class="si-tit"><a class="si-link" href="{href}">{sr}{tit}</a></p><p class="si-det">{det}</p>'
            f'<p class="si-meta">{nv}{selo}<time>{hora}</time><span class="si-onde">{onde}{ico("dir", "ico ico-s")}</span></p></div>{p}</li>')


def dia(t, itens):
    return f'<h3 class="si-dia">{t}</h3><ul class="si-ul">{"".join(itens)}</ul>' if itens else ''


def carol(lidos=False, so_novos=False):
    n = not lidos
    hoje = [
        item('pedido', 'Pedido de demonstração pelo site: <b>Jatobá Advocacia Previdenciária</b>',
             '<q>Queremos ver o financeiro e o WhatsApp.</q> Lívia Prado · 6 a 10 pessoas. Ninguém cuida ainda; o site promete resposta até 22/11.',
             'Abrir o pedido', 'interessados.html?aba=ficha&estado=novo', '09h14', n, '<span class="selo selo-atencao">Sem responsável</span>'),
        item('vencido', 'Próximo passo vencido: <b>Ligar para saber da proposta</b>',
             'Sucupira Advogados Associados · Otávio Reis. Venceu em 19/11, há 2 dias. Responsável: você.',
             'Abrir o interessado', '#sucupira', '07h00', n, '<span class="selo selo-urgente">Vencido</span>'),
    ]
    ontem = [
        item('atribuido', '<b>Rafael Teles</b> passou para você o interessado <b>Umbu Advocacia de Família</b>',
             '<q>Patrícia prefere falar com você, que já conhece a sócia dela.</q>', 'Abrir o interessado', '#umbu', '17h05', n),
        item('pedido', 'Pedido de demonstração pelo site: <b>Ipê &amp; Moura Advogados</b>',
             'Henrique Moura · 6 a 10 pessoas. Agora com Rafael Teles.', 'Abrir o pedido', 'interessados.html?aba=ficha&estado=ver', '16h42'),
    ]
    antes = [
        item('vencido', 'Próximo passo vencido: <b>Mandar a proposta</b>',
             'Sucupira Advogados Associados · Otávio Reis. Venceu em 16/11. Já foi feito: a proposta saiu em 17/11.', 'Abrir o interessado', '#sucupira', '07h00'),
        item('pedido', 'Pedido de demonstração pelo site: <b>Umbu Advocacia de Família</b>',
             'Patrícia Nóbrega · 2 a 5 pessoas.', 'Abrir o pedido', '#umbu', '14/11, 10h31'),
    ]
    if so_novos:
        return dia('Hoje · sábado, 21/11', hoje) + dia('Ontem · 20/11', ontem[:1])
    return dia('Hoje · sábado, 21/11', hoje) + dia('Ontem · 20/11', ontem) + dia('Antes', antes)


PE = (f'<p class="si-pe">{ico("historico")}<span>Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, '
      f'e o que o aviso conta continua na ficha do interessado.</span></p>')


def estado_painel(titulo, texto, icone, acoes='', codigo='', erro=False, extra=''):
    cls = 'estado estado-erro' if erro else 'estado'
    role = 'alert' if erro else 'status'
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    c = f'<p class="codigo">{codigo}</p>' if codigo else ''
    return f'<div class="{cls}" role="{role}"><span class="icone-estado">{ico(icone)}</span><h3>{titulo}</h3><p>{texto}</p>{extra}{a}{c}</div>'


PE_GERAL = PE.replace('continua na ficha do interessado', 'continua no lugar de origem')


def painel(conta, lista, novos, filtro='todos', msg='', erro=False, vazio=False, pe=PE):
    dirr = (f'<button class="btn btn-fantasma si-todos" type="button">{ico("checks")}Marcar todos como lidos</button>' if novos
            else f'<span class="si-tudo-lido">{ico("check")}Tudo lido</span>')
    chips = (f'<div class="chips" role="group" aria-label="Mostrar avisos">'
             f'<button type="button" aria-pressed="{"true" if filtro == "todos" else "false"}">Todos</button>'
             f'<button type="button" aria-pressed="{"true" if filtro == "novos" else "false"}">Não lidos <span class="q">{novos}</span></button></div>')
    ferr = '' if (erro or vazio) else f'<div class="si-ferr">{chips}{dirr}</div>'
    m = f'<div class="si-msg">{msg}</div>' if msg else ''
    return (f'<div class="si-cab"><div><p class="sobretitulo">Para você</p><h2 id="si-t">Avisos</h2><p class="si-conta">{conta}</p></div>'
            f'<button class="fechar" type="button" data-fechar-sino aria-label="Fechar os avisos">{ico("x")}</button></div>'
            f'{ferr}<div class="si-lista">{m}{lista}</div>{"" if erro else pe}')


def tsino(nome, corpo, novos, quem=''):
    q = f' data-quem="{quem}"' if quem else ''
    return f'<template data-sino="{nome}" data-novos="{novos}"{q}>\n{corpo}\n</template>\n'


EXPLICA = (f'<ul class="cs-explica"><li>{ico("maleta")}<span>Um pedido de demonstração novo pelo site</span></li>'
           f'<li>{ico("pessoa-mais")}<span>Um interessado que alguém passou para você</span></li>'
           f'<li>{ico("relogio")}<span>O próximo passo de um interessado seu que venceu</span></li></ul>')
S = ''
S += tsino('aberto', painel('<b>3 novos</b> · 6 nos últimos 30 dias', carol(), 3), 3)
S += tsino('nao-lidos', painel('<b>3 novos</b> · 6 nos últimos 30 dias', carol(so_novos=True), 3, filtro='novos'), 3)
S += tsino('lidos', painel('Nenhum novo · 6 nos últimos 30 dias', carol(lidos=True), 0,
                           msg=aviso('sucesso', '3 avisos marcados como lidos.', 'Eles continuam aqui, sem o destaque.')), 0)
S += tsino('vazio', painel('Nenhum aviso nos últimos 30 dias', estado_painel('Nenhum aviso por enquanto.',
           'Chega aqui o que pede você no Comercial. Cada aviso leva à ficha do interessado.', 'sino', extra=EXPLICA), 0, vazio=True), 0,
           quem='Luísa Matos|Implantação|L')
S += tsino('erro', painel('Não deu para carregar', estado_painel('Não deu para carregar os avisos',
           'O servidor não respondeu. Nenhum aviso se perde: eles continuam guardados. Tente de novo em instantes.', 'alerta',
           acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>', codigo='Código para o suporte: CNS-6E30-0914', erro=True),
           3, erro=True), 3)
S += tsino('sem-interessados', painel('Nenhum aviso nos últimos 30 dias', estado_painel('Nenhum aviso para você por enquanto.',
           'Nesta primeira versão, o sino só avisa sobre interessados, que são da Administração e da Implantação. '
           'Os avisos do Financeiro e do Suporte entram depois.', 'sino',
           extra=f'<ul class="cs-explica"><li>{ico("cadeado")}<span>Pedido de demonstração e interessado não chegam aqui: têm dados pessoais de quem pediu.</span></li>'
                 f'<li>{ico("fatura")}<span>Em estudo: fatura de escritório em atraso, pedido de suporte novo e fim de contrato chegando.</span></li></ul>'), 0, vazio=True, pe=PE_GERAL), 0)

DIALOG = '<dialog class="si-painel" id="painel-avisos" aria-labelledby="si-t" tabindex="-1"></dialog>'

SCRIPT_CS = r"""<script>
(function(){
  /* Sino do Console. O botão já existe na moldura aprovada (topo e barra vinho do celular): só ganha o painel.
     ?sino= escolhe o estado do painel e o abre; sem ?sino=, o painel fica fechado com o ponto de novo. */
  var q=new URLSearchParams(location.search), papel=q.get('papel')||'admin';
  var sem=(papel==='financeiro'||papel==='suporte');
  var nome=q.get('sino')||(sem?'sem-interessados':'aberto');
  if(sem&&nome!=='erro')nome='sem-interessados';
  var t=document.querySelector('template[data-sino="'+nome+'"]')||document.querySelector('template[data-sino="aberto"]');
  var d=document.getElementById('painel-avisos'); d.appendChild(t.content.cloneNode(true));
  if(t.dataset.quem){var p=t.dataset.quem.split('|');
    document.querySelectorAll('[data-quem-nome]').forEach(function(e){e.textContent=p[0]});
    document.querySelectorAll('[data-quem-funcao]').forEach(function(e){e.textContent=p[1]});
    document.querySelectorAll('[data-quem-ini]').forEach(function(e){e.textContent=p[2]});}
  var n=t.dataset.novos;
  var sinos=document.querySelectorAll('.topo .icone-botao,.barra-cel .bb[aria-label^="Avisos"]');
  var cel=matchMedia('(max-width:760px)');
  sinos.forEach(function(b){
    b.setAttribute('aria-controls','painel-avisos'); b.setAttribute('aria-expanded','false'); b.setAttribute('aria-haspopup','dialog');
    if(n==='0'){b.setAttribute('aria-label','Avisos, nenhum novo'); var pt=b.querySelector('.ponto'); pt&&pt.remove()}
    else {b.setAttribute('aria-label','Avisos, '+n+(n==='1'?' novo':' novos'))}
    b.addEventListener('click',function(){ if(d.open){fechar()} else {abrir()} });
  });
  function abrir(){ if(cel.matches){d.showModal()} else {d.show()} sinos.forEach(function(s){s.setAttribute('aria-expanded','true')}); d.focus() }
  function fechar(){ d.close() }
  d.addEventListener('close',function(){ sinos.forEach(function(s){s.setAttribute('aria-expanded','false')}); var vis=[].filter.call(sinos,function(s){return s.offsetParent}); vis[0]&&vis[0].focus() });
  d.addEventListener('click',function(e){ if(e.target.closest('[data-fechar-sino]')) fechar() });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&d.open&&!cel.matches){ fechar() } });
  d.querySelectorAll('.chips button').forEach(function(c){ c.addEventListener('click',function(){ d.querySelectorAll('.chips button').forEach(function(o){o.setAttribute('aria-pressed',o===c?'true':'false')}) }) });
  /* A janela "Cadastrar interessado" do estado substitui a janela em branco da página */
  var js=document.querySelectorAll('#janela-cadastrar'); if(js.length>1){ js[js.length-1].remove() }
  if(q.get('sino')&&!document.querySelector('dialog.janela[open]')) abrir();
})();
</script>"""


def com_sino(s):
    s = s.replace('</style>', CSS_NOVO + '\n</style>', 1)
    sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    assert sp in s
    if 'id="i-checks"' not in s:
        s = s.replace(sp, sp + SIMB_CHECKS, 1)
    assert s.count('aria-label="Avisos, 2 novos"') == 2
    k = s.rindex('</template>') + len('</template>')
    s = s[:k] + '\n' + S + DIALOG + '\n' + s[k:]
    return s.replace('</body>', SCRIPT_CS + '\n</body>', 1)


# ---------------------------------------------------------------- 4. Cadastrar interessado à mão
UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
TAM = [('Só eu', 'Advogado sozinho'), ('2 a 5', 'pessoas'), ('6 a 10', 'pessoas'), ('Mais de 10', 'pessoas')]
ORIGENS = [('Indicação', 'Alguém passou o contato'), ('Evento', 'Feira, palestra, encontro da OAB'), ('Contato direto', 'Ligou, escreveu ou veio falar com a gente')]
SABE = [('Sim, ela pediu ou aceitou', 'Ela já espera o nosso contato'), ('Ainda não', 'O contato veio por outra pessoa')]
RESP = ['Rafael Teles (você) · Implantação', 'Carol Andrade · Administração']


def grupo(nome, legenda, itens, atual, cls, erro='', ro=False, ajuda=''):
    desc = ' '.join(x for x in ((nome + '-erro') if erro else '', (nome + '-ajuda') if ajuda else '') if x)
    d = f' aria-describedby="{desc}"' if desc else ''
    inv = ' aria-invalid="true"' if erro else ''
    r = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="{nome}" value="{H(v)}"{" checked" if v == atual else ""}{" disabled" if ro else ""}{inv}>'
                f'<span>{v}<small>{s}</small></span></label>' for v, s in itens)
    er = f'<p class="erro-msg" id="{nome}-erro">{ico("alerta", "ico ico-s")}{erro}</p>' if erro else ''
    aj = f'<p class="ajuda" id="{nome}-ajuda">{ajuda}</p>' if ajuda else ''
    return f'<fieldset class="grupo-opcoes ci-grupo{" ci-erro" if erro else ""}"{d}><legend>{legenda}</legend><div class="ci-cartoes {cls}">{r}</div>{er}{aj}</fieldset>'


VAZIO = dict(nome='', esc='', email='', whats='', tam='', area='', cidade='', uf='', org='', ref='', quando='21/11/2026', msg='', sabe='', resp=RESP[0], passo='Fazer o primeiro contato', pdata='23/11/2026')
AROEIRA = dict(nome='Tomás Lins', esc='Aroeira &amp; Lins Advogados', email='tomas@aroeiralins.exemplo.com.br', whats='(86) 99561-2087', tam='2 a 5', area='Cível e consumidor',
               cidade='Teresina', uf='PI', org='Indicação', ref='Indicação de Patrícia Nóbrega, da Umbu Advocacia de Família', quando='21/11/2026',
               msg='Quer ver o carnê e o controle das parcelas dos acordos. Prefere ligação à tarde.', sabe='Ainda não', resp=RESP[0], passo='Fazer o primeiro contato', pdata='23/11/2026')
ERROS_V = dict(AROEIRA, esc='', whats='(86) 9956-12', org='', ref='', sabe='', email='')
SUCUPIRA = dict(nome='Otávio Reis', esc='Sucupira Advogados', email='otavio@sucupira.exemplo.com.br', whats='(98) 98144-3307', tam='6 a 10', area='Empresarial',
                cidade='São Luís', uf='MA', org='Evento', ref='Encontro da OAB-MA em São Luís, conversa no estande', quando='19/11/2026',
                msg='Quer saber como fica a cobrança dos honorários de êxito.', sabe='Sim, ela pediu ou aceitou', resp=RESP[0], passo='Fazer o primeiro contato', pdata='23/11/2026')


def form_cad(v, erros=None, ro=False, topo='', igual=''):
    e = erros or {}
    def c(id_, rot, chave, ajuda='', **kw):
        return campo(id_, rot, v[chave], ajuda, e.get(chave, ''), ro=ro, **kw)
    whats_aj = 'Preencha pelo menos um dos dois, e-mail ou WhatsApp. É por eles que o T3jus confere se o interessado já existe.'
    email = c('ci-email', 'E-mail', 'email', tipo='email', opcional=True)
    if igual == 'email':
        email = email.replace('</div>', f'<p class="ci-igual">{ico("alerta", "ico ico-s")}Igual ao de Sucupira Advogados Associados</p></div>', 1)
        email = email.replace('<div class="campo ">', '<div class="campo ">', 1)
    uf = ''.join(f'<option{" selected" if u == v["uf"] else ""}>{u}</option>' for u in UFS)
    s1 = (f'<section class="ci-sec" aria-labelledby="ci-s1"><h3 id="ci-s1">{ico("pessoas")}Quem é</h3>'
          + '<div class="ci-duas">' + c('ci-nome', 'Nome da pessoa', 'nome', extra=' autocomplete="off" aria-required="true"') + c('ci-esc', 'Escritório', 'esc', extra=' aria-required="true"') + '</div>'
          + '<div class="ci-duas">' + email + c('ci-whats', 'WhatsApp', 'whats', modo='tel', opcional=True) + '</div>'
          + f'<p class="ci-ajuda-par" id="ci-um-dos-dois">{whats_aj}</p>'
          + grupo('ci-tam', 'Tamanho do escritório', TAM, v['tam'], 'ci-4', e.get('tam', ''), ro)
          + c('ci-area', 'Área de atuação', 'area', opcional=True)
          + f'<div class="ci-cid">{c("ci-cidade", "Cidade", "cidade", opcional=True)}<div class="campo"><label for="ci-uf">UF</label>'
            f'<select class="entrada" id="ci-uf" name="ci-uf"{" disabled" if ro else ""}><option value="">Escolha</option>{uf}</select></div></div></section>')
    s2 = (f'<section class="ci-sec" aria-labelledby="ci-s2"><h3 id="ci-s2">{ico("link")}De onde veio o contato</h3>'
          + grupo('ci-org', 'Como chegou', ORIGENS, v['org'], 'ci-3', e.get('org', ''), ro)
          + c('ci-ref', 'De onde veio, em detalhe', 'ref', 'Quem indicou, qual evento ou por onde a pessoa falou. Fica na ficha e explica, a qualquer tempo, por que temos este contato.', extra=' aria-required="true"')
          + '<div class="ci-duas">' + c('ci-quando', 'Data do contato', 'quando', 'Hoje ou antes. O prazo de guarda conta do último contato.', modo='numeric') + '<div></div></div>'
          + c('ci-msg', 'O que a pessoa quer', 'msg', area=True, linhas=2, opcional=True) + '</section>')
    dica = ('No primeiro contato, conte à pessoa de onde veio o contato dela e que ela pode pedir para não ser mais procurada.'
            if v['sabe'] != 'Sim, ela pediu ou aceitou' else 'Se a pessoa pedir para não ser mais procurada, encerre como descartado: os dados saem no prazo.')
    s3 = (f'<section class="ci-sec" aria-labelledby="ci-s3"><h3 id="ci-s3">{ico("escudo")}Dados pessoais</h3>'
          + grupo('ci-sabe', 'A pessoa sabe que vamos procurá-la?', SABE, v['sabe'], 'ci-2', e.get('sabe', ''), ro)
          + f'<div class="ci-lgpd"><p class="ci-l-topo"><span class="selo selo-neutro">{ico("escudo")}Legítimo interesse</span><b>sem a autorização do site</b></p>'
            '<ul><li><b>Por quê:</b> quem chega por indicação, evento ou contato direto não marcou a caixa de autorização. A base é o legítimo interesse (LGPD, art. 7º, IX), com a origem registrada.</li>'
            '<li><b>Para quê:</b> apresentar o T3jus e marcar uma demonstração. Nada de propaganda.</li>'
            '<li><b>Até quando:</b> se não virar cliente, os dados são apagados 12 meses depois do último contato, ou antes, se a pessoa pedir.</li></ul>'
            f'<p class="ci-dica">{ico("ajuda")}<span>{dica}</span></p></div></section>')
    s4 = (f'<section class="ci-sec" aria-labelledby="ci-s4"><h3 id="ci-s4">{ico("cracha")}Quem cuida</h3>'
          + selecao('ci-resp', 'Responsável', RESP, v['resp'], 'Se for outra pessoa, ela recebe um aviso no sino.')
          + '<div class="ci-duas">' + c('ci-passo', 'Próximo passo', 'passo') + c('ci-pdata', 'Até', 'pdata', '1 dia útil, como no pedido do site.', modo='numeric') + '</div></section>')
    corpo = topo + s1 + s2 + s3 + s4
    if ro:
        corpo = corpo.replace('autocomplete="off"', 'autocomplete="off" readonly').replace('readonly readonly', 'readonly')
        corpo = corpo.replace('<select class="entrada" id="ci-resp"', '<select class="entrada" id="ci-resp" disabled')
    return corpo


PE_CAD = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("mais")}Cadastrar interessado</button>'
DESC_CAD = 'Para quem chegou por indicação, evento ou contato direto. O pedido do site entra sozinho e não passa por aqui.'


def j_cad(v, topo='', erros=None, ro=False, pe=PE_CAD, abrir=True, igual=''):
    return janela('janela-cadastrar', 'Comercial', 'Cadastrar interessado', DESC_CAD, form_cad(v, erros, ro, topo, igual), pe, abrir=abrir, cls='ci-larga')


def foco_resumo(html_aviso):
    return html_aviso.replace('<div class="aviso ', '<div tabindex="-1" data-foco class="aviso ', 1)


FUNDO = NUMEROS + ('<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Interessados</h2>' + ferramentas() + tabela(LISTA[:5])
                   + '<div class="mais"><span>5 em andamento. Os encerrados ficam em “Clientes” e “Perdidos e descartados”.</span></div></section>')

T = ''
T += tpl('lista:cadastrar', FUNDO + j_cad(VAZIO).replace('id="ci-nome" name="ci-nome" type="text" value=""', 'id="ci-nome" name="ci-nome" type="text" value="" data-foco'))
ERR = {'esc': 'Escreva o nome do escritório. Se ainda não tem, use o da pessoa, como “Tomás Lins Advocacia”.',
       'whats': 'O WhatsApp tem DDD e 8 ou 9 números, como (86) 99561-2087.',
       'org': 'Escolha como o contato chegou.',
       'ref': 'Escreva de onde veio o contato: quem indicou, qual evento ou por onde a pessoa falou.',
       'sabe': 'Diga se a pessoa sabe que vamos procurá-la. Isso muda o que dizer no primeiro contato.'}
T += tpl('lista:cadastrar-erros', FUNDO + j_cad(ERROS_V, foco_resumo(aviso('urgencia', 'Falta acertar 5 pontos, marcados abaixo.', 'Nada foi cadastrado ainda.')), ERR))
T += tpl('lista:cadastrar-salvando', FUNDO + j_cad(AROEIRA, '<p class="sr" role="status">Cadastrando o interessado…</p>', ro=True,
         pe='<button class="btn btn-fantasma" type="button" disabled>Cancelar</button><button class="btn btn-pri" type="button" aria-busy="true" aria-disabled="true"><span class="fc-giro" aria-hidden="true"></span>Cadastrando…</button>'))
REP = foco_resumo(aviso('atencao', 'Já existe um interessado com este e-mail.', 'Nada foi cadastrado ainda. Confira se é o mesmo escritório.', icone='alerta',
                        extra=('<div class="ci-rep"><b>Sucupira Advogados Associados</b><span>Otávio Reis · São Luís, MA · chegou pelo site em 10/11/2026</span>'
                               '<span>Proposta enviada · com Carol Andrade · e-mail otavio@sucupira.exemplo.com.br</span></div>'
                               '<p style="margin-top:8px">“Juntar ao existente” guarda o que você escreveu como nota no Sucupira, conta como novo contato e não cria outro interessado.</p>'),
                        acoes=(f'<button class="btn btn-pri btn-compacto" type="button">{ico("check")}Juntar ao existente</button>'
                               f'<a class="btn btn-sec btn-compacto" href="#sucupira">{ico("abrir")}Abrir o existente</a>')))
T += tpl('lista:cadastrar-repetido', FUNDO + j_cad(SUCUPIRA, REP, igual='email',
         pe=f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-sec" type="submit">É outro escritório: cadastrar mesmo assim</button>'))
FALHA = foco_resumo(aviso('urgencia', 'Não deu para cadastrar agora.',
                          'A conexão caiu antes de o servidor responder. Nada foi cadastrado, e o que você escreveu continua aqui. Tente de novo; se continuar, mande o código ao suporte.',
                          extra='<p class="codigo">Código para o suporte: CNS-7A21-1020</p>'))
T += tpl('lista:cadastrar-falha', FUNDO + j_cad(AROEIRA, FALHA,
         pe=f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("reenviar")}Tentar de novo</button>'))

# A ficha do interessado novo
MAO = f'<span class="ci-mao">{ico("lapis")}cadastrado à mão</span>'
ARO_CAB = cab('Aroeira &amp; Lins Advogados', 'Interessado · cadastrado à mão por Rafael Teles hoje, às 10h20', sel('Novo'), ['Tomás Lins', 'Teresina, PI', '2 a 5 pessoas'],
              '<p class="sobretitulo" id="t-dir">Próximo passo</p><p class="in-passo-g">Fazer o primeiro contato</p><p><b>Até segunda, 23/11</b> · Rafael Teles</p>'
              f'<button class="btn btn-sec so-pode" type="button">{ico("lapis")}Mudar o próximo passo</button>')
ARO_CONTATO = ('<section class="folha" aria-labelledby="t-pedido" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-pedido">Contato</h2>'
               '<p class="sub">Cadastrado à mão por Rafael Teles em 21/11/2026, às 10h20.</p></div></div>'
               f'<dl class="in-dl"><dt>Nome</dt><dd>Tomás Lins</dd><dt>Escritório</dt><dd>Aroeira &amp; Lins Advogados</dd><dt>E-mail</dt><dd><a href="#">tomas@aroeiralins.exemplo.com.br</a></dd>'
               '<dt>WhatsApp</dt><dd>(86) 99561-2087</dd><dt>Tamanho</dt><dd>2 a 5 pessoas</dd><dt>Área de atuação</dt><dd>Cível e consumidor</dd><dt>Cidade</dt><dd>Teresina, PI</dd></dl>'
               '<p class="in-msg">“Quer ver o carnê e o controle das parcelas dos acordos. Prefere ligação à tarde.”</p></section>')
ARO_LGPD = ('<section class="folha" aria-labelledby="t-lgpd" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-lgpd">De onde veio o contato</h2><p class="sub">Guardado com o cadastro. Não dá para editar.</p></div></div>'
            f'<div class="in-lgpd"><p class="in-l-topo"><span class="selo selo-neutro">{ico("escudo")}Legítimo interesse</span><b>cadastrado em 21/11/2026, às 10h20</b><span class="cb-peq">por Rafael Teles · sem a autorização do site</span></p>'
            '<blockquote>“Indicação de Patrícia Nóbrega, da Umbu Advocacia de Família”</blockquote>'
            '<ul><li><b>A pessoa sabe:</b> ainda não. No primeiro contato, conte de onde veio o contato e que ela pode pedir para não ser mais procurada.</li>'
            '<li><b>Para quê:</b> apresentar o T3jus e marcar uma demonstração. Nada de propaganda.</li>'
            '<li><b>Até quando:</b> se não virar cliente, os dados são apagados 12 meses depois do último contato, ou antes, se a pessoa pedir.</li></ul></div></section>')
ARO_HIST = [('21/11/2026 · hoje', [('10h20', '<b>Rafael Teles</b> cadastrou o interessado à mão · Indicação',
                                    'De onde veio: “Indicação de Patrícia Nóbrega, da Umbu Advocacia de Família”. A pessoa ainda não sabe. Responsável: Rafael Teles.', True)])]
ARO_ORIG = ('<section class="folha" aria-labelledby="t-org"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-org" style="font-size:20px">Origem</h2></div>'
            '<dl class="cb-dl"><div><dt>Como chegou</dt><dd>Indicação</dd></div><div><dt>Quem indicou</dt><dd>Patrícia Nóbrega, da Umbu Advocacia de Família</dd></div>'
            '<div><dt>Cadastro</dt><dd>À mão, por Rafael Teles</dd></div><div><dt>Data do contato</dt><dd>21/11/2026</dd></div></dl></section>')
ARO = (ARO_CAB + aviso('sucesso', 'Aroeira &amp; Lins Advogados entrou em Interessados.',
                       'Está em Novo, com você como responsável. O próximo passo é fazer o primeiro contato até segunda, 23/11.')
       + grade(ARO_CONTATO + ARO_LGPD + notas([]) + historico(ARO_HIST), acoes() + lateral_resp('Rafael Teles', '21/11/2026, no cadastro') + ARO_ORIG))
T += tpl('ficha:cadastrado', ARO, sem_abas=True, sem_cabeca=True, trilha='Aroeira &amp; Lins Advogados')


# ---------------------------------------------------------------- 5. montar as páginas
def pagina_int(s):
    # O botão "Cadastrar interessado" (já na tela aprovada) passa a abrir a janela.
    a = '<button class="btn btn-pri" type="button"><svg class="ico" aria-hidden="true"><use href="#i-mais"/></svg>Cadastrar interessado</button>'
    assert s.count(a) == 2
    s = s.replace(a, a.replace('type="button">', 'type="button" data-janela="janela-cadastrar">'))
    s = s.replace('<title>Interessados · Console T3jus</title>', '<title>Interessados · Console T3jus</title>', 1)
    k = s.rindex('</template>') + len('</template>')
    branca = j_cad(VAZIO, abrir=False)
    s = s[:k] + '\n' + T + branca + '\n' + s[k:]
    return com_sino(s)


open(os.path.join(SAIDA, 'interessados.html'), 'w', encoding='utf-8').write(pagina_int(BASE_INT))
open(os.path.join(SAIDA, 'cobranca.html'), 'w', encoding='utf-8').write(com_sino(BASE_COB))
print('montar ok:', T.count('<template data-est='), 'estados de cadastro,', S.count('<template data-sino='), 'do sino')
