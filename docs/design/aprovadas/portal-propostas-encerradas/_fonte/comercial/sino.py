# Portal · o sino de avisos (F3.57, PD-07; F3.38, PA-01, PT-03, PT-10).
# O botão do sino já existe na moldura aprovada do Portal v1 (no topo do computador e na barra vinho do celular);
# aqui ele só ganha o painel. A página de fundo é a lista de Clientes aprovada (clientes.py, sem mudança).
# Peças novas com prefixo si-. Uso: python3 sino.py <pasta-saida>
import sys
from base import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

CSS_SI = r"""
/* ==========================================================================
   Sino de avisos (prefixo si-)
   ========================================================================== */
/* O botão do sino aberto fica marcado, como um item atual */
.icone-botao[aria-expanded="true"]{background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--ambar-2)}
.barra-cel .bb[aria-expanded="true"]{background:var(--vinho-2)}

/* Computador: painel que desce do sino, sem cobrir a página inteira */
.si-painel{position:fixed;inset:auto;top:72px;right:40px;margin:0;z-index:90;width:460px;max-height:calc(100vh - 96px);padding:0;
  display:none;flex-direction:column;border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:var(--papel);color:var(--texto);
  box-shadow:0 24px 48px -20px rgba(42,26,34,.45),0 2px 6px rgba(42,26,34,.08);overflow:hidden}
.si-painel[open]{display:flex}
.si-painel:focus{outline:none}
.si-painel::before{content:"";position:absolute;top:0;left:0;right:0;height:4px;background:var(--vinho)}
.si-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 20px 10px 24px}
.si-cab h2{font-size:26px;line-height:1.1}
.si-cab .si-conta{font-size:13px;color:var(--texto-2);margin-top:4px}
.si-cab .si-conta b{font-weight:600;color:var(--vinho)}
.si-cab .fechar{width:44px;height:44px;display:grid;place-items:center;border:0;background:transparent;border-radius:var(--raio);color:var(--vinho);cursor:pointer;margin:-6px -6px 0 0}
.si-cab .fechar:hover{background:var(--sal-2)}
.si-ferr{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:0 16px 12px 24px;border-bottom:1px solid var(--divisor)}
.si-ferr .chips{margin-left:0}
.si-ferr .chips button .q{font-size:12px;font-weight:600}
.si-todos{min-height:44px;padding:0 10px;margin-right:-4px}
.si-tudo-lido{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:13px;color:var(--texto-2)}
.si-tudo-lido .ico{width:16px;height:16px;color:var(--vinho-4)}
.si-lista{overflow:auto;overscroll-behavior:contain;flex:1 1 auto}
.si-dia{position:sticky;top:0;z-index:1;margin:0;padding:10px 24px 6px;background:var(--papel);font-family:inherit;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2);display:flex;align-items:center;gap:10px}
.si-dia::after{content:"";flex:1;height:1px;background:var(--borda-folha)}
.si-ul{list-style:none;margin:0;padding:0}
.si-item{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) 12px;gap:12px;padding:14px 20px 14px 24px;border-top:1px solid var(--divisor)}
.si-ul li:first-child .si-item,.si-ul>li:first-child.si-item{border-top:0}
.si-item:hover{background:var(--sal-2)}
.si-item:focus-within{background:var(--sal-2)}
.si-novo{background:#FFFBF8;box-shadow:inset 3px 0 0 var(--vinho)}
.si-ico{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho-2)}
.si-novo .si-ico{background:var(--ambar-3);color:var(--vinho)}
.si-ico .ico{width:20px;height:20px}
.si-tit{font-size:14px;line-height:1.4;color:var(--texto)}
.si-link{color:inherit;text-decoration:none}
.si-link::after{content:"";position:absolute;inset:0}
.si-link:focus-visible{outline:none}
.si-item:has(.si-link:focus-visible){outline:3px solid var(--vinho-3);outline-offset:-3px}
.si-link:hover{text-decoration:underline}
.si-novo .si-tit{font-weight:600}
.si-tit b{font-weight:600}
.si-det{font-size:13px;line-height:1.45;color:var(--texto-2);margin-top:2px}
.si-det q{font-family:var(--serifa);font-style:italic;font-size:14px;color:var(--tinta)}
.si-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;margin-top:8px;font-size:12px;color:var(--texto-2)}
.si-meta .selo{height:24px;padding:0 9px;font-size:11.5px}
.si-meta .si-onde{display:inline-flex;align-items:center;gap:4px;color:var(--vinho);font-weight:500}
.si-meta .si-onde .ico{width:14px;height:14px}
.si-meta .si-nv{font-weight:600;color:var(--vinho-3)}
.si-pto{width:10px;height:10px;border-radius:50%;background:var(--vinho-3);margin-top:6px}
.si-pe{display:flex;align-items:flex-start;gap:10px;padding:12px 24px 14px;border-top:1px solid var(--divisor);background:var(--sal-2);font-size:12px;line-height:1.5;color:var(--texto-2)}
.si-pe .ico{width:16px;height:16px;flex:none;margin-top:1px;color:var(--vinho-4)}
.si-msg{margin:12px 20px 4px 24px}
.si-painel .estado{margin:16px 20px 20px;border:0;box-shadow:none;background:var(--sal-2);padding:32px 20px}
.si-vazio-lista{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:8px;text-align:left}
.si-vazio-lista li{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.45;color:var(--texto-2)}
.si-vazio-lista .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho-4)}

/* Celular: o painel ocupa a tela, abaixo da barra vinho, como a folha Mais */
@media (max-width:760px){
  .si-painel{top:0;right:0;left:0;bottom:0;width:100%;max-width:none;height:100dvh;max-height:none;border:0;border-radius:0}
  .si-painel::before{display:none}
  .si-cab{padding:16px 10px 8px 16px;background:var(--vinho);color:var(--papel)}
  .si-cab h2{color:var(--papel)}
  .si-cab .sobretitulo{color:var(--ambar-2)}
  .si-cab .si-conta{color:var(--ambar-3)}
  .si-cab .si-conta b{color:var(--papel)}
  .si-cab .fechar{color:var(--ambar-2);margin:0}
  .si-cab .fechar:hover{background:var(--vinho-2)}
  .si-cab .fechar:focus-visible{outline-color:var(--ambar-3)}
  .si-ferr{padding:10px 12px 10px 16px}
  .si-todos{flex:0 0 auto}
  .si-dia{padding:10px 16px 6px}
  .si-item{padding:14px 14px 14px 16px;gap:10px;grid-template-columns:36px minmax(0,1fr) 10px}
  .si-ico{width:36px;height:36px}
  .si-msg{margin:12px 16px 4px}
  .si-pe{padding:12px 16px calc(14px + env(safe-area-inset-bottom))}
  .si-painel .estado{margin:16px}
  .si-painel::backdrop{background:rgba(42,26,34,.4)}
}
"""

# tipo -> ícone
ICO = {'ia': 'ia', 'assumiu': 'mao', 'passou': 'trocar', 'sugestao': 'lapis', 'meta-ok': 'check', 'meta-nao': 'alerta', 'prazo': 'relogio'}


def item(tipo, tit, det, onde, href, hora, novo=False, selo=''):
    nv = '<span class="si-nv">Novo</span>' if novo else ''
    sr = '<span class="sr">Novo: </span>' if novo else ''
    cls = 'si-item si-novo' if novo else 'si-item'
    p = '<span class="si-pto" aria-hidden="true"></span>' if novo else '<span aria-hidden="true"></span>'
    return (f'<li class="{cls}"><span class="si-ico" aria-hidden="true">{ico(ICO[tipo])}</span><div>'
            f'<p class="si-tit"><a class="si-link" href="{href}">{sr}{tit}</a></p>'
            f'<p class="si-det">{det}</p>'
            f'<p class="si-meta">{nv}{selo}<time>{hora}</time><span class="si-onde">{onde}{ico("dir", "ico ico-s")}</span></p>'
            f'</div>{p}</li>')


def dia(t, itens):
    if not itens:
        return ''
    return f'<h3 class="si-dia">{t}</h3><ul class="si-ul">{"".join(itens)}</ul>'


C = '../conversas.html'  # só desenho: cada link diz para onde vai


def marina(lidos=False, so_novos=False):
    n = not lidos
    hoje = [
        item('ia', 'A IA passou a conversa de <b>Joana Prado</b> para você',
             '<q>Quero falar com a doutora sobre a audiência da minha mãe.</q> Antônia Ferreira Prado', 'Abrir a conversa', '#conversa-joana', '10h04', n),
        item('sugestao', '<b>Gustavo Lima</b> sugeriu uma mudança em “Cobrança de parcela atrasada”',
             '<q>Esperar 5 dias, e não 3, antes de passar a conversa para mim.</q>', 'Ver a sugestão', '#automacao-cobranca', '9h31', n),
        item('meta-nao', 'A Meta recusou o texto “Parcela atrasada, 2º aviso”',
             'Motivo informado: o texto parece promoção. A automação continua em rascunho; nada foi enviado.', 'Corrigir o texto', '#automacao-texto', '7h50', n,
             selo='<span class="selo selo-urgente">Recusado</span>'),
        item('prazo', 'Prazo em 2 dias: <b>contestação</b> de Irene Castro',
             'Vence sexta, 20/11. Responsável: você. Proc. 1004512-33.2026.8.26.0100.', 'Abrir o prazo', '#prazo-irene', '7h00', n,
             selo='<span class="selo selo-atencao">em 2 dias</span>'),
    ]
    ontem = [
        item('assumiu', '<b>Felipe Matos</b> assumiu a conversa de Ricardo Vale, que era sua',
             'Construtora Vale Alto Ltda. A troca ficou registrada na conversa.', 'Abrir a conversa', '#conversa-ricardo', '17h20'),
        item('passou', '<b>Diego Almeida</b> passou a conversa de Daniela Rocha Mendes para você',
             '<q>Ela quer falar do acordo; foi você quem combinou o valor.</q>', 'Abrir a conversa', '#conversa-daniela', '15h02'),
        item('meta-ok', 'A Meta aprovou o texto “Aviso de etapa do caso”',
             'A automação Aviso de etapa já está funcionando.', 'Ver a automação', '#automacao-etapa', '11h40',
             selo='<span class="selo selo-ok">Aprovado</span>'),
    ]
    if so_novos:
        return dia('Hoje', hoje)
    return dia('Hoje', hoje) + dia('Ontem · 17/11', ontem)


def larissa():
    hoje = [
        item('ia', 'A IA passou a conversa de <b>Marta Corrêa</b> para você',
             '<q>A audiência de terça continua marcada?</q> Hélio Batista Corrêa', 'Abrir a conversa', '#conversa-marta', '9h48', True),
        item('prazo', 'Prazo em 2 dias: <b>réplica</b> de Hélio Batista Corrêa',
             'Vence sexta, 20/11. Responsável: você. Proc. 1021877-05.2026.8.26.0100.', 'Abrir o prazo', '#prazo-helio', '7h00', True,
             selo='<span class="selo selo-atencao">em 2 dias</span>'),
    ]
    ontem = [
        item('assumiu', '<b>Marina Ribeiro</b> assumiu a conversa de Gabriela Teixeira, que era sua',
             'Você estava em audiência. A troca ficou registrada na conversa.', 'Abrir a conversa', '#conversa-gabriela', '14h15'),
    ]
    return dia('Hoje', hoje) + dia('Ontem · 17/11', ontem)


PE = (f'<p class="si-pe">{ico("historico")}<span>Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, '
      f'e o que o aviso conta continua no lugar de origem.</span></p>')


def painel(conta, lista, novos, filtro='todos', msg='', erro=False, vazio=False):
    if novos:
        ferr_dir = f'<button class="btn btn-fantasma si-todos" type="button">{ico("checks")}Marcar todos como lidos</button>'
    else:
        ferr_dir = f'<span class="si-tudo-lido">{ico("check")}Tudo lido</span>'
    chips = (f'<div class="chips" role="group" aria-label="Mostrar avisos">'
             f'<button type="button" aria-pressed="{"true" if filtro == "todos" else "false"}">Todos</button>'
             f'<button type="button" aria-pressed="{"true" if filtro == "novos" else "false"}">Não lidos <span class="q">{novos}</span></button></div>')
    ferr = '' if (erro or vazio) else f'<div class="si-ferr">{chips}{ferr_dir}</div>'
    m = f'<div class="si-msg">{msg}</div>' if msg else ''
    pe = '' if erro else PE
    return (f'<dialog class="si-painel" id="painel-avisos" aria-labelledby="si-t" tabindex="-1" data-sino>'
            f'<div class="si-cab"><div><p class="sobretitulo">Para você</p><h2 id="si-t">Avisos</h2><p class="si-conta">{conta}</p></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar os avisos">{ico("x")}</button></div>'
            f'{ferr}<div class="si-lista">{m}{lista}</div>{pe}</dialog>')


# Página de fundo: a lista de Clientes aprovada (o sino é o mesmo em todas as páginas do Portal)
FUNDO = (f'<div class="cl">{cab_lista()}' + folha_lista(lista(ATIVOS), cont=f'<b>{len(ATIVOS)} clientes ativos</b> · {len(VENCIDOS)} com o próximo contato vencido') + '</div>')
FUNDO_J = (f'<div class="cl">{cab_lista(False)}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de clientes</h2>'
           f'{ferramentas(comercial=False)}<p class="cl-cont" role="status"><b>{len(ATIVOS)} clientes ativos</b></p>{lista(ATIVOS, comercial=False)}{PE_SEM_COM}</section></div>')
B = dict(atual='clientes', trilha='Clientes', titulo='Clientes')

VAZIO = estado('Nenhum aviso por enquanto.',
               'Chega aqui o que pede você: uma conversa passada para você, um prazo seu que vence em 2 dias, uma decisão que só você toma. Cada aviso leva ao lugar certo.',
               icone='sino', h='h3')

T = ''
T += tpl('aberto', FUNDO + painel('<b>4 novos</b> · 7 nos últimos 30 dias', marina(), 4), novos=4, **B)
T += tpl('nao-lidos', FUNDO + painel('<b>4 novos</b> · 7 nos últimos 30 dias', marina(so_novos=True), 4, filtro='novos'), novos=4, **B)
T += tpl('lidos', FUNDO + painel('Nenhum novo · 7 nos últimos 30 dias', marina(lidos=True), 0,
                                 msg=aviso('sucesso', '4 avisos marcados como lidos.', 'Eles continuam aqui, sem o destaque.')), novos=0, **B)
T += tpl('juridico', FUNDO_J + painel('<b>2 novos</b> · 3 nos últimos 30 dias', larissa(), 2), novos=2, quem='juridico', **B)
T += tpl('vazio', FUNDO_J + painel('Nenhum aviso nos últimos 30 dias', VAZIO, 0, vazio=True), novos=0, quem='sem-area', **B)
T += tpl('erro', FUNDO + painel('Não deu para carregar', estado('Não deu para carregar os avisos',
         'O servidor não respondeu. Nenhum aviso se perde: eles continuam guardados. Tente de novo em instantes.', erro=True, h='h3',
         acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>', codigo='Código para o suporte: PTL-4C19-0810'),
         4, erro=True), novos=4, **B)

SCRIPT_SI = r"""<script>
(function(){
  /* O sino da moldura (topo no computador, barra vinho no celular) abre o painel; o número de novos vem do estado */
  var q=new URLSearchParams(location.search), padrao=JSON.parse(document.body.dataset.padrao);
  var t=document.querySelector('template[data-est="'+(q.get('estado')||padrao.estado)+'"]')||document.querySelector('template[data-est="'+padrao.estado+'"]');
  var n=t?t.dataset.novos:'4';
  var sinos=document.querySelectorAll('.topo .icone-botao,.barra-cel .bb[aria-label^="Avisos"]');
  var d=document.getElementById('painel-avisos');
  var cel=matchMedia('(max-width:760px)');
  sinos.forEach(function(b){
    b.setAttribute('aria-controls','painel-avisos');
    b.setAttribute('aria-expanded','false');
    b.setAttribute('aria-haspopup','dialog');
    if(n==='0'){ b.setAttribute('aria-label','Avisos, nenhum novo'); var p=b.querySelector('.ponto'); p&&p.remove() }
    else { b.setAttribute('aria-label','Avisos, '+n+(n==='1'?' novo':' novos')) }
    b.addEventListener('click',function(){ if(d.open){fechar()} else {abrir(b)} });
  });
  function abrir(b){ if(cel.matches){d.showModal()} else {d.show()} sinos.forEach(function(s){s.setAttribute('aria-expanded','true')}); d.focus() }
  function fechar(){ d.close() }
  d.addEventListener('close',function(){ sinos.forEach(function(s){s.setAttribute('aria-expanded','false')}); var vis=[].filter.call(sinos,function(s){return s.offsetParent}); vis[0]&&vis[0].focus() });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&d.open&&!cel.matches){ fechar() } });
  d.querySelectorAll('.chips button').forEach(function(c){ c.addEventListener('click',function(){ d.querySelectorAll('.chips button').forEach(function(o){o.setAttribute('aria-pressed',o===c?'true':'false')}) }) });
  /* Nos estados desenhados, o painel já vem aberto */
  if(d){ var b=[].filter.call(sinos,function(s){return s.offsetParent})[0]; abrir(b) }
})();
</script>"""

out = pagina('Clientes', 'O sino de avisos do Portal: o que chegou para você, com o link para o lugar certo.',
             '{"estado":"aberto","atual":"clientes"}', '', T)
out = out.replace('</style>', CSS_CL + '\n</style>', 1)
out = finalizar_sas(out, CSS_SI)
out = out.replace('</body>', SCRIPT_SI + '\n</body>', 1)
open(f'{SAIDA}/sino.html', 'w', encoding='utf-8').write(out)
print('sino ok', T.count('<template data-est='), 'estados')
