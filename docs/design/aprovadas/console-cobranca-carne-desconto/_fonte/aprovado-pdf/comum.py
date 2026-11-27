# Peças comuns das telas do Portal v1 (moldura, CSS, ícones e script).
import re, html

APROV = '/home/user/t3just/docs/design/aprovadas/'
_eq = open(APROV + 'console-v1/equipe.html', encoding='utf-8').read()
_pi = open(APROV + 'portal-inicio.html', encoding='utf-8').read()

# 1. CSS: D2 + moldura aprovada + acréscimos do Console v1 (copiado sem mudança, com as fontes embutidas)
CSS_BASE = _eq[_eq.index('<style>') + 7:_eq.index('</style>')]

# 2. Peças do Início aprovado do Portal (cartão do escritório, abertura, prazos, conversas, agenda)
_css_pi = _pi[_pi.index('.escritorio{'):_pi.index('</style>')]
_fora = ('.grade', '.coluna', '.folha', 'table', 'th', 'td', 'tr:', '.receb', '.semanas', '.colunas', '.eixo')
_regras = []
for r in _css_pi.split('}'):
    if '{' not in r:
        continue
    sel, corpo = r.split('{', 1)
    sel = sel.strip()
    if sel.startswith(_fora):
        continue
    if sel.startswith('.c-topo'):
        sel = ','.join('.conversa ' + s.strip() for s in sel.split(','))
    if sel.startswith(('.av1', '.av2', '.av3')):
        sel = '.conversa ' + sel
    _regras.append(sel + '{' + corpo + '}')
CSS_INICIO = '\n'.join(_regras)

CSS_PORTAL = r"""
/* ==========================================================================
   Portal v1 · acréscimos (moldura em áreas, Equipe do escritório, Escritório)
   Só tokens e classes já aprovados; prefixo pt- nas peças novas.
   ========================================================================== */
.trilho .item[aria-current="true"]{background:var(--vinho-2);color:var(--papel);font-weight:500;box-shadow:inset 0 0 0 1px rgba(242,205,179,.18)}
.trilho .item[aria-current="true"] .ico{color:var(--ambar)}
.trilho .item[aria-current="true"]::before{content:"";position:absolute;left:-14px;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--ambar)}
.trilho{min-height:100vh}
.escritorio small{color:var(--ambar-3)}
.data .hoje{color:var(--vinho-escuro)}
.quem small{max-width:170px}

/* Barra de seções da área: fica no alto, logo abaixo do topo */
.pt-barra-area{display:flex;align-items:stretch;gap:20px;padding:0 48px;background:var(--papel);border-bottom:1px solid var(--borda-folha);min-height:56px}
.pt-area-nome{display:flex;align-items:center;gap:10px;padding-right:22px;border-right:1px solid var(--borda-folha);font-family:var(--serifa);font-size:20px;font-weight:600;color:var(--vinho);white-space:nowrap}
.pt-area-nome .ico{color:var(--vinho-4)}
.pt-secoes{display:flex;gap:2px;flex-wrap:wrap}
.pt-secoes a{position:relative;display:inline-flex;align-items:center;min-height:56px;padding:0 14px;color:var(--texto-2);font-weight:500;text-decoration:none;font-size:14px}
.pt-secoes a:hover{color:var(--vinho)}
.pt-secoes a[aria-current="page"]{color:var(--vinho)}
.pt-secoes a[aria-current="page"]::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--vinho)}

/* Cabeçalho simples de página dentro da área */
.pt-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap}
.pt-cab h1{font-size:40px;line-height:1.05;margin-top:6px}
.pt-cab .lede{margin-top:10px}
.pt-cab .fio{margin-top:14px}

.pt-grade{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:24px;align-items:start}
.pt-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.pt-inicio{display:grid;grid-template-columns:7fr 5fr;gap:24px;align-items:start}

/* Equipe do escritório */
.pt-tabela td{vertical-align:middle}
.pt-areas{display:flex;flex-wrap:wrap;gap:6px}
.pt-comum{font-size:13px;color:var(--texto-2)}
.pt-sit{display:grid;gap:4px;justify-items:start}
.pt-sit small{font-size:12px;color:var(--texto-2)}
.pt-dono{font-size:12px;color:var(--texto-2)}
.pt-nova td{background:#FCF8F5}
.pt-comuns{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.pt-comuns .ico{color:var(--vinho-4);margin-top:1px}
.pt-areas-def{grid-template-columns:repeat(4,minmax(0,1fr))}
.pt-pe-folha{display:flex;align-items:flex-start;gap:10px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.pt-pe-folha .ico{color:var(--vinho-4);margin-top:1px}
.toast .fechar{width:44px;height:44px;display:grid;place-items:center;border:0;background:transparent;border-radius:var(--raio);color:var(--vinho);cursor:pointer}
.toast .fechar:hover{background:var(--sal-2)}
.pt-selo-exp{background:var(--ambar-3);color:var(--vinho)}

/* Escritório */
.pt-lista-esc{list-style:none;margin:0;padding:0 24px}
.pt-lista-esc li{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--divisor)}
.pt-lista-esc li:first-child{border-top:0}
.pt-lista-esc strong{display:block;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);line-height:1.2}
.pt-lista-esc small{display:block;font-size:12px;color:var(--texto-2)}
.pt-lista-esc .selo{margin-left:auto}
.pt-acao-folha{padding:6px 24px 22px;display:grid;gap:14px}
.pt-acao-folha>p{color:var(--texto-2);font-size:14px}
.pt-leva{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}
.pt-leva li{display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.45}
.pt-leva .ico{width:16px;height:16px;color:var(--vinho-4);margin-top:2px}
.pt-ultima{font-size:12px;color:var(--texto-2)}
.pt-ultima b{font-weight:500;color:var(--texto)}
.pt-cuidado{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.pt-cuidado .ico{color:var(--vinho);margin-top:1px}
.pt-gerando{display:grid;gap:10px;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2)}
.pt-gerando p{font-size:13px}
.pt-gerando p b{font-weight:500}
.pt-barra-indet{position:relative;height:6px;border-radius:3px;background:var(--sal);overflow:hidden}
.pt-barra-indet::after{content:"";position:absolute;top:0;bottom:0;left:0;width:36%;border-radius:3px;background:var(--vinho);animation:pt-vai 1.4s ease-in-out infinite}
@keyframes pt-vai{from{transform:translateX(-100%)}to{transform:translateX(280%)}}
@media (prefers-reduced-motion: reduce){.pt-barra-indet::after{animation:none;width:100%;background:repeating-linear-gradient(90deg,var(--vinho) 0 12px,var(--vinho-2) 12px 24px)}}
.pt-muda{display:flex;align-items:flex-start;gap:12px;padding:14px 24px;border-top:1px solid var(--divisor);background:var(--sal-2);font-size:13px;line-height:1.5}
.pt-muda .ico{color:var(--vinho);margin-top:1px}
.pt-muda a{font-weight:500}
.contato .papel{font-size:12px;color:var(--texto-2)}

/* Celular: barra de baixo e folha "Mais" (no computador ficam escondidas) */
.pt-baixo{display:none}
.pt-mais .pt-mais-corpo{padding:0 16px 20px}
.pt-mais .janela-cabeca .fechar{margin-right:-4px}
.pt-ml{list-style:none;margin:0;padding:0}
.pt-ml li+li{border-top:1px solid var(--divisor)}
.pt-mi{display:flex;align-items:center;gap:12px;min-height:48px;padding:0 10px;margin:0 -10px;border-radius:var(--raio);color:var(--texto);text-decoration:none;font-weight:500}
.pt-mi .ico{color:var(--vinho-4)}
.pt-mi .pt-ir{margin-left:auto;color:var(--vinho-4)}
.pt-mi:hover{background:var(--sal-2)}
.pt-mi[aria-current]{background:var(--ambar-3);color:var(--vinho);box-shadow:inset 3px 0 0 var(--vinho)}
.pt-mi[aria-current] .ico{color:var(--vinho)}
.pt-mg{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2);padding:16px 0 4px}
.pt-mg::after{content:"";flex:1;height:1px;background:var(--borda-folha)}
.pt-conta{display:flex;align-items:center;gap:12px;padding:8px 0 6px}
.pt-conta strong{display:block;font-weight:500;line-height:1.3}
.pt-conta small{display:block;font-size:12px;color:var(--texto-2)}

@media (max-width:760px){
  .trilho{display:none!important}
  .pt-baixo{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--papel);border-top:1px solid var(--borda-folha);box-shadow:0 -8px 20px -14px rgba(42,26,34,.35);padding:4px 4px calc(4px + env(safe-area-inset-bottom))}
  .pt-baixo a,.pt-baixo button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:56px;min-width:44px;border:0;background:transparent;border-radius:var(--raio);color:var(--texto-2);font:inherit;font-size:12px;font-weight:500;text-decoration:none;cursor:pointer}
  .pt-baixo .ico{width:22px;height:22px;color:var(--vinho-4)}
  .pt-baixo a:hover,.pt-baixo button:hover{background:var(--sal-2)}
  .pt-baixo [aria-current]{color:var(--vinho);font-weight:600}
  .pt-baixo [aria-current] .ico{color:var(--vinho)}
  .pt-baixo [aria-current]::before{content:"";position:absolute;top:-4px;left:22%;right:22%;height:3px;border-radius:0 0 3px 3px;background:var(--vinho)}
  .pt-cont{position:absolute;top:4px;left:calc(50% + 6px);min-width:20px;height:20px;border-radius:10px;padding:0 6px;display:grid;place-items:center;background:var(--ambar);color:var(--tinta);font-size:11px;font-weight:600}
  .conteudo{padding-bottom:calc(96px + env(safe-area-inset-bottom))!important}
  .toast{bottom:calc(80px + env(safe-area-inset-bottom))!important}
  .janela-pe{padding-bottom:calc(12px + env(safe-area-inset-bottom))!important}
  .pt-mais .pt-mais-corpo{padding-bottom:calc(20px + env(safe-area-inset-bottom))}
  .barra-cel .marca-cel{margin-left:10px}
  .pt-barra-area{flex-direction:column;gap:10px;padding:14px 16px 12px}
  .pt-area-nome{border-right:0;padding-right:0;font-size:22px}
  .pt-secoes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .pt-secoes a{justify-content:center;text-align:center;min-height:44px;padding:0 6px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha);font-size:13px;line-height:1.25}
  .pt-secoes a[aria-current="page"]{background:var(--vinho);border-color:var(--vinho);color:var(--papel)}
  .pt-secoes a[aria-current="page"]::after{display:none}
  .pt-cab h1{font-size:30px}
  .pt-cab .btn{flex:1 1 100%}
  .pt-grade,.pt-inicio{grid-template-columns:minmax(0,1fr);gap:16px}
  .pt-col{gap:16px}
  .pt-areas-def{grid-template-columns:1fr}
  .pt-lista-esc{padding:0 16px}
  .pt-lista-esc li{flex-wrap:wrap}
  .pt-lista-esc .selo{margin-left:0}
  .pt-acao-folha{padding:4px 16px 18px}
  .pt-acao-folha .btn{width:100%}
  .pt-leva{grid-template-columns:1fr}
  .pt-pe-folha,.pt-muda{padding:12px 16px 16px}
  .hero{grid-template-columns:1fr!important;min-height:0!important}
  .hero .esq{padding:22px 16px 24px!important}
  .hero h1{font-size:36px!important}
  .hero .estatua{width:150px!important;height:150px!important;right:-20px!important;top:-30px!important}
  .dia{flex-direction:column;gap:10px!important}
  .hero .dir{margin-left:0!important;clip-path:none!important;padding:18px 16px 20px!important}
  .conversa{padding:14px 16px!important}
  .balao,.c-pe{margin-left:0!important}
  .c-pe{flex-wrap:wrap}
  .agenda{padding:4px 16px 16px!important}
  .leg-ag{padding:0 16px 4px!important}
  .prazos{padding:0 0 8px!important}
  .prazo{grid-template-columns:52px minmax(0,1fr)!important;gap:12px!important;padding:12px 16px!important}
  .prazo .lado{grid-column:2;flex-direction:row!important;flex-wrap:wrap;align-items:center!important}
  .data .disco{--d:44px!important;--f:21px!important}
}
"""

# 3. Ícones: os aprovados + "trocar"
_sprite = _eq[_eq.index('<svg xmlns="http://www.w3.org/2000/svg" style="display:none"'):]
_sprite = _sprite[:_sprite.index('</svg>')]
SPRITE = _sprite + ('<symbol id="i-trocar" viewBox="0 0 24 24"><path d="M4 8h14l-3.5-3.5"/><path d="M20 16H6l3.5 3.5"/></symbol>'
                    '<symbol id="i-pasta" viewBox="0 0 24 24"><path d="M3 6h7l2 2.5h9V19H3Z"/></symbol>'
                    '</svg>')


def ico(nome, cls='ico'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{nome}"/></svg>'


AREAS = [
    ('comercial', 'Comercial', 'maleta', ['Atendimentos', 'Propostas', 'Funil', 'Origem dos contatos'],
     'Atendimentos, propostas, funil e origem dos contatos.'),
    ('contratos', 'Contratos', 'pena', ['Contratos', 'Honorários', 'Procurações e modelos'],
     'Contratos de honorários, condições, procurações e modelos.'),
    ('financeiro', 'Financeiro', 'carteira', ['Resumo', 'A receber', 'A pagar', 'Repasses', 'Caixa'],
     'Recebimentos, contas, repasses, caixa e o que vence.'),
    ('juridico', 'Jurídico', 'balanca', ['Casos e processos', 'Prazos', 'Tarefas', 'Petições'],
     'Casos, processos, prazos, tarefas e petições.'),
]
AREA = {a[0]: a for a in AREAS}


def barra_area(chave, secao):
    _, nome, i, secoes, _ = AREA[chave]
    links = ''.join(
        f'<a href="#"{" aria-current=\"page\"" if s == secao else ""}>{html.escape(s)}</a>' for s in secoes)
    return (f'<div class="pt-barra-area"><p class="pt-area-nome">{ico(i)}{nome}</p>'
            f'<nav class="pt-secoes" aria-label="Seções do {nome}">{links}</nav></div>')


def trilho():
    areas = ''.join(
        f'<a class="item" href="#" data-nav="{k}">{ico(i)}{n}</a>' for k, n, i, _, _ in AREAS)
    return f'''<aside class="trilho" id="trilho" aria-label="Portal do advogado">
    <div class="marca"><a class="marca-palavra" href="moldura.html" aria-label="T3jus, início">T<b>3</b>jus</a></div>
    <a class="escritorio" href="escritorio.html"><span class="mo" aria-hidden="true">R</span><span><strong>Ribeiro &amp; Matos</strong><small>Advocacia · 7 pessoas</small><span class="sr">, dados do escritório</span></span></a>
    <nav aria-label="Navegação principal">
      <a class="item" href="moldura.html?estado=sem-area" data-nav="inicio">{ico('inicio')}Início</a>
      <a class="item" href="#" data-nav="conversas">{ico('conversas')}Conversas<span class="cont" aria-label="3 aguardando">3</span></a>
      <a class="item" href="#" data-nav="clientes">{ico('pessoas')}Clientes</a>
      <a class="item" href="#" data-nav="agenda">{ico('agenda')}Agenda</a>
      <p class="grupo" data-grupo-areas>Áreas</p>
      {areas}
    </nav>
    <div class="trilho-pe">
      <nav aria-label="Escritório">
        <a class="item" href="equipe.html" data-nav="equipe">{ico('cracha')}Equipe</a>
        <a class="item" href="escritorio.html" data-nav="escritorio">{ico('coluna')}Escritório</a>
        <a class="item" href="#" data-nav="ajuda">{ico('ajuda')}Ajuda</a>
      </nav>
      <div class="quem"><span class="av" aria-hidden="true" data-quem-ini>M</span><span><strong data-quem-nome>Marina Ribeiro</strong><small data-quem-papel>Sócia dona</small></span></div>
    </div>
  </aside>'''


def barra_baixo():
    return f'''<nav class="pt-baixo" aria-label="Navegação do celular">
    <a href="moldura.html?estado=sem-area" data-nav="inicio">{ico('inicio')}<span>Início</span></a>
    <a href="#" data-nav="conversas">{ico('conversas')}<span>Conversas</span><span class="pt-cont" aria-label="3 aguardando">3</span></a>
    <a href="#" data-nav="agenda">{ico('agenda')}<span>Agenda</span></a>
    <button type="button" id="abrir-mais" data-janela="folha-mais" aria-haspopup="dialog">{ico('pontos')}<span>Mais</span></button>
  </nav>'''


def folha_mais():
    areas = ''.join(f'<li><a class="pt-mi" href="#" data-nav="{k}">{ico(i)}{n}{ico("dir", "ico ico-s pt-ir")}</a></li>' for k, n, i, _, _ in AREAS)
    return f'''<dialog class="janela pt-mais" id="folha-mais" aria-labelledby="folha-mais-t">
  <div class="janela-cabeca"><div><p class="sobretitulo">Ribeiro &amp; Matos</p><h2 id="folha-mais-t">Mais</h2></div><button class="fechar" type="button" data-fechar aria-label="Fechar">{ico('x')}</button></div>
  <nav class="pt-mais-corpo" aria-label="Mais opções">
    <ul class="pt-ml"><li><a class="pt-mi" href="#" data-nav="clientes">{ico('pessoas')}Clientes{ico("dir", "ico ico-s pt-ir")}</a></li></ul>
    <p class="pt-mg" data-grupo-areas>Áreas</p>
    <ul class="pt-ml" data-lista-areas>{areas}</ul>
    <p class="pt-mg">Escritório</p>
    <ul class="pt-ml">
      <li><a class="pt-mi" href="equipe.html" data-nav="equipe">{ico('cracha')}Equipe{ico("dir", "ico ico-s pt-ir")}</a></li>
      <li><a class="pt-mi" href="escritorio.html" data-nav="escritorio">{ico('coluna')}Escritório{ico("dir", "ico ico-s pt-ir")}</a></li>
      <li><a class="pt-mi" href="#" data-nav="ajuda">{ico('ajuda')}Ajuda{ico("dir", "ico ico-s pt-ir")}</a></li>
    </ul>
    <p class="pt-mg">Sua conta</p>
    <div class="pt-conta"><span class="av-p forte" aria-hidden="true" data-quem-ini>M</span><span><strong data-quem-nome>Marina Ribeiro</strong><small data-quem-papel>Sócia dona</small></span></div>
    <ul class="pt-ml">
      <li><a class="pt-mi" href="#">{ico('trocar')}Trocar de escritório{ico("dir", "ico ico-s pt-ir")}</a></li>
      <li><a class="pt-mi" href="#">{ico('sair')}Sair</a></li>
    </ul>
  </nav>
</dialog>'''


SCRIPT = r"""<script>
(function(){
  var q=new URLSearchParams(location.search), b=document.body, padrao=JSON.parse(b.dataset.padrao);
  var est=q.get('estado')||padrao.estado;
  var t=document.querySelector('template[data-est="'+est+'"]')||document.querySelector('template[data-est="'+padrao.estado+'"]');
  var Q={
    socio:{nome:'Marina Ribeiro',ini:'M',papel:'Sócia dona · vê tudo',areas:['comercial','contratos','financeiro','juridico'],dono:true},
    juridico:{nome:'Larissa Costa',ini:'L',papel:'Área: Jurídico',areas:['juridico'],dono:false},
    'sem-area':{nome:'Paula Nunes',ini:'P',papel:'Só as partes comuns',areas:[],dono:false}
  };
  var qk=t.dataset.quem||q.get('quem')||'socio', P=Q[qk]||Q.socio;
  document.documentElement.dataset.quem=qk;
  document.querySelectorAll('[data-quem-nome]').forEach(function(e){e.textContent=P.nome});
  document.querySelectorAll('[data-quem-ini]').forEach(function(e){e.textContent=P.ini});
  document.querySelectorAll('[data-quem-papel]').forEach(function(e){e.textContent=P.papel});
  /* O que a pessoa não pode abrir nem aparece (no produto, o servidor já manda a moldura assim) */
  ['comercial','contratos','financeiro','juridico'].forEach(function(a){ if(P.areas.indexOf(a)<0){document.querySelectorAll('[data-nav="'+a+'"]').forEach(function(e){(e.closest('li')||e).remove()})} });
  if(!P.areas.length){document.querySelectorAll('[data-grupo-areas],[data-lista-areas]').forEach(function(g){g.remove()})}
  if(!P.dono){document.querySelectorAll('[data-nav="equipe"]').forEach(function(e){(e.closest('li')||e).remove()})}
  var atual=t.dataset.atual||padrao.atual;
  document.querySelectorAll('[data-nav="'+atual+'"]').forEach(function(it){ it.setAttribute('aria-current', t.dataset.area?'true':'page') });
  /* No celular, o que mora no Mais marca o botão Mais como atual */
  if(atual && ['inicio','conversas','agenda'].indexOf(atual)<0){ document.getElementById('abrir-mais').setAttribute('aria-current','true') }
  var barra=document.querySelector('template[data-barra="'+(t.dataset.area||'')+'|'+(t.dataset.secao||'')+'"]');
  if(barra){ document.getElementById('slot-barra').appendChild(barra.content.cloneNode(true)) }
  var tr=document.getElementById('trilha'); if(tr&&t.dataset.trilha){ var p=t.dataset.trilha.split('|'); tr.innerHTML=p.map(function(x,i){return i<p.length-1?'<a href="#">'+x+'</a><svg class="ico ico-s" aria-hidden="true"><use href="#i-dir"/></svg>':'<span aria-current="page">'+x+'</span>'}).join('') }
  if(t.dataset.titulo) document.title=t.dataset.titulo+' · Ribeiro & Matos · T3jus';
  document.getElementById('miolo').appendChild(t.content.cloneNode(true));
  document.querySelectorAll('.abas a[data-aba]').forEach(function(a){ if(a.dataset.aba===(t.dataset.aba||'pessoas')) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current') });
  if(t.dataset.q){var qq=document.querySelector('.abas .q'); if(qq) qq.textContent=t.dataset.q}
  if(t.hasAttribute('data-sem-cabeca')){ document.querySelectorAll('[data-cabeca]').forEach(function(e){e.hidden=true}) }
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-janela]'); if(a){var d=document.getElementById(a.dataset.janela); if(d){e.preventDefault(); d.showModal(); var f=d.querySelector('[data-foco]'); f&&f.focus()}}
    var f=e.target.closest('[data-fechar]'); if(f){var dd=f.closest('dialog'); if(dd){dd.close()} else {var tt=f.closest('.toast'); tt&&tt.remove()}}
    if(e.target.closest('a[href="#"]')) e.preventDefault();
  });
  if(q.get('mais')){ var fm=document.getElementById('folha-mais'); fm.showModal(); fm.querySelector('.fechar').focus() }
  document.querySelectorAll('dialog[data-abrir]').forEach(function(d){ d.showModal(); var p=d.querySelector('[data-foco]'); if(p) p.focus() });
})();
</script>"""


def pagina(arquivo_titulo, descricao, padrao, cabeca_html, templates, barras=''):
    """Monta a página: moldura + slot da barra de área + cabeçalho fixo + miolo trocado por estado."""
    return f'''<!doctype html>
<html lang="pt-BR" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{arquivo_titulo} · Ribeiro &amp; Matos · T3jus</title>
<meta name="description" content="{descricao}">
<style>
{CSS_BASE}
/* ===== Início aprovado do Portal (peças reaproveitadas) ===== */
{CSS_INICIO}
{CSS_PORTAL}
</style>
</head>
<body data-padrao='{padrao}'>
{SPRITE}
<div class="app">
  <header class="barra-cel">
    <a class="marca-cel" href="moldura.html"><b>T<i>3</i>jus</b><span>Portal</span><span class="sr">, início</span></a>
    <button class="bb" type="button" aria-label="Buscar cliente, processo ou contrato">{ico('busca')}</button>
    <button class="bb" type="button" aria-label="Avisos, 4 novos">{ico('sino')}<span class="ponto"></span></button>
  </header>
  {trilho()}
  <div class="palco">
    <header class="topo">
      <nav class="trilha" id="trilha" aria-label="Você está em"><span aria-current="page">{arquivo_titulo}</span></nav>
      <button class="busca-global" type="button">{ico('busca', 'ico ico-s')}Buscar cliente, processo ou contrato<kbd>Ctrl K</kbd></button>
      <button class="icone-botao" type="button" aria-label="Avisos, 4 novos">{ico('sino')}<span class="ponto"></span></button>
    </header>
    <div id="slot-barra"></div>
    <main class="conteudo" id="conteudo">
      {cabeca_html}
      <div id="miolo" style="display:contents"></div>
    </main>
  </div>
  {barra_baixo()}
</div>
{folha_mais()}
{barras}
{templates}
{SCRIPT}
</body>
</html>
'''


def tpl(est, corpo, **attrs):
    a = ''.join(f' data-{k.replace("_", "-")}="{html.escape(str(v))}"' for k, v in attrs.items() if v is not None and v is not False)
    a += ''.join(f' data-{k.replace("_", "-")}' for k, v in attrs.items() if v is True)
    return f'<template data-est="{est}"{a}>\n{corpo}\n</template>\n'


def estado(titulo, texto, icone='alerta', erro=False, acoes='', codigo='', h='h3', papel=None, moldura=True):
    r = papel or ('alert' if erro else 'status')
    cls = 'estado' + (' estado-erro' if erro else '') + ('' if moldura else ' sem-moldura')
    cod = f'<p class="codigo">{codigo}</p>' if codigo else ''
    ac = f'<div class="acoes">{acoes}</div>' if acoes else ''
    return f'<div class="{cls}" role="{r}"><span class="icone-estado">{ico(icone)}</span><{h}>{titulo}</{h}><p>{texto}</p>{ac}{cod}</div>'


def aviso(tipo, titulo, texto='', icone=None, acoes='', papel=None, extra=''):
    icone = icone or {'urgencia': 'alerta', 'sucesso': 'check', 'atencao': 'relogio', 'info': 'ajuda'}[tipo]
    r = papel or ('alert' if tipo == 'urgencia' else 'status')
    p = f'<p>{texto}</p>' if texto else ''
    ac = f'<div class="aviso-acoes">{acoes}</div>' if acoes else ''
    return f'<div class="aviso aviso-{tipo}{extra}" role="{r}">{ico(icone)}<div><strong class="aviso-titulo">{titulo}</strong>{p}{ac}</div></div>'


def toast(titulo, texto):
    return (f'<div class="aviso aviso-sucesso toast" role="status">{ico("check")}<div><strong class="aviso-titulo">{titulo}</strong><p>{texto}</p></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


def janela(id_, sobre, titulo, desc, corpo, pe, alerta=False, abrir=False):
    role = ' role="alertdialog"' if alerta else ''
    ab = ' data-abrir' if abrir else ''
    return f'''<dialog class="janela" id="{id_}" aria-labelledby="{id_}-t" aria-describedby="{id_}-d"{role}{ab}>
  <form method="dialog" class="janela-form" novalidate>
  <div class="janela-cabeca"><div><p class="sobretitulo">{sobre}</p><h2 id="{id_}-t">{titulo}</h2></div><button class="fechar" type="button" data-fechar aria-label="Fechar">{ico('x')}</button></div>
  <div class="janela-corpo"><p id="{id_}-d">{desc}</p>{corpo}</div>
  <div class="janela-pe">{pe}</div>
  </form>
</dialog>'''
