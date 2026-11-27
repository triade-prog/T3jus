# O sino do Console com os avisos novos da implantação (IMPLANTACAO_PRAZO e IMPLANTACAO_ISENCAO_FIM).
# O CSS do sino é o aprovado em console-interessado-sino (lido como a diferença entre a cobrança com sino e a cobrança aprovada).
import re
from comum_im import ler, ico

_a = ler('console-cobranca/cobranca.html')
_b = ler('console-interessado-sino/cobranca.html')
_sa = _a[_a.index('<style>'):_a.index('</style>')]
_sb = _b[_b.index('<style>'):_b.index('</style>')]
assert _sb.startswith(_sa)
SINO_CSS = _sb[len(_sa):]
SINO_CHIPS = '\n'.join(m.group(0).strip() for m in re.finditer(r'[^{}]*\.chips[^{}]*\{[^}]*\}', _sa))
SINO_SIMB = re.search(r'<symbol id="i-checks".*?</symbol>', _b).group(0)
SINO_DIALOG = '<dialog class="si-painel" id="painel-avisos" aria-labelledby="si-t" tabindex="-1"></dialog>'

ICO = {'prazo': 'prazo', 'isencao': 'isencao', 'fatura': 'fatura'}


def item(tipo, tit, det, onde, href, hora, novo=False, selo='', urg=False):
    nv = '<span class="si-nv">Novo</span>' if novo else ''
    sr = '<span class="sr">Novo: </span>' if novo else ''
    cls = 'si-item si-novo' if novo else 'si-item'
    p = '<span class="si-pto" aria-hidden="true"></span>' if novo else '<span aria-hidden="true"></span>'
    u = ' im-si-urg' if urg else ''
    return (f'<li class="{cls}"><span class="si-ico{u}" aria-hidden="true">{ico(ICO[tipo])}</span><div>'
            f'<p class="si-tit"><a class="si-link" href="{href}">{sr}{tit}</a></p><p class="si-det">{det}</p>'
            f'<p class="si-meta">{nv}{selo}<time>{hora}</time><span class="si-onde">{onde}{ico("dir", "ico ico-s")}</span></p></div>{p}</li>')


def dia(t, itens):
    return f'<h3 class="si-dia">{t}</h3><ul class="si-ul">{"".join(itens)}</ul>' if itens else ''


PE = (f'<p class="si-pe">{ico("historico")}<span>Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, '
      f'e o que o aviso conta continua no lugar de origem.</span></p>')


def painel(conta, lista, novos):
    dirr = (f'<button class="btn btn-fantasma si-todos" type="button">{ico("checks")}Marcar todos como lidos</button>' if novos
            else f'<span class="si-tudo-lido">{ico("check")}Tudo lido</span>')
    chips = (f'<div class="chips" role="group" aria-label="Mostrar avisos"><button type="button" aria-pressed="true">Todos</button>'
             f'<button type="button" aria-pressed="false">Não lidos <span class="q">{novos}</span></button></div>')
    return (f'<div class="si-cab"><div><p class="sobretitulo">Para você</p><h2 id="si-t">Avisos</h2><p class="si-conta">{conta}</p></div>'
            f'<button class="fechar" type="button" data-fechar-sino aria-label="Fechar os avisos">{ico("x")}</button></div>'
            f'<div class="si-ferr">{chips}{dirr}</div><div class="si-lista">{lista}</div>{PE}')


def tsino(nome, corpo, novos, quem=''):
    q = f' data-quem="{quem}"' if quem else ''
    return f'<template data-sino="{nome}" data-novos="{novos}"{q}>\n{corpo}\n</template>\n'


IMPL = 'ficha.html?aba=implantacao&amp;estado=im-perto'


def prazos():
    hoje = [
        item('prazo', 'A implantação da <b>Cedro &amp; Lima</b> vence em 7 dias (4 de 6 pessoas treinadas)',
             'Prazo: 16/12/2026. Faltam Tiago Ramos e Diego Alves. Quem acompanha: Rafael Teles.', 'Abrir a implantação', IMPL, '08h00', True,
             '<span class="selo selo-atencao">7 dias</span>'),
        item('prazo', 'A implantação da <b>Jatobá Advocacia Previdenciária</b> vence hoje (5 de 5 pessoas treinadas)',
             'Todas as pessoas foram treinadas: dá para concluir. Quem acompanha: Rafael Teles.', 'Abrir a implantação', '#jatoba', '08h00', True,
             '<span class="selo selo-urgente">Vence hoje</span>', urg=True),
    ]
    antes = [
        item('prazo', 'A implantação do <b>Ipê &amp; Moura Advogados</b> vence em 3 dias (2 de 4 pessoas treinadas)',
             'Prazo: 10/12/2026. Quem acompanha: Helena Prado.', 'Abrir a implantação', '#ipe', '07/12, 08h00', False,
             '<span class="selo selo-atencao">3 dias</span>'),
    ]
    return dia('Hoje · quarta-feira, 09/12', hoje) + dia('Antes', antes)


def isencao():
    hoje = [
        item('isencao', 'A isenção da implantação termina em 30 dias, em <b>31/05/2027</b>',
             'Quem abrir a implantação a partir de 01/06/2027 paga R$ 1.490,00 à vista na 1ª fatura. Para manter grátis, mude a data de corte em Cobrança › Planos.',
             'Abrir a regra', 'cobranca.html?aba=planos&amp;estado=im-regra', '08h00', True, '<span class="selo selo-atencao">Fim da isenção</span>'),
    ]
    antes = [
        item('fatura', 'Fatura em atraso há 7 dias: <b>Bacuri Advocacia Trabalhista</b>',
             'Fatura de abril de 2027 · R$ 190,00 · venceu em 10/04. O Portal já mostra o aviso ao sócio dono.', 'Abrir a fatura', '#bacuri', '17/04, 08h30'),
    ]
    return dia('Hoje · sábado, 01/05', hoje) + dia('Antes', antes)


def sino_templates_ficha():
    return (tsino('im-prazos', painel('<b>2 novos</b> · 3 nos últimos 30 dias', prazos(), 2), 2)
            + tsino('im-rafael', painel('<b>2 novos</b> · 3 nos últimos 30 dias', prazos(), 2), 2, quem='Rafael Teles|Implantação|R'))


def sino_templates_cobranca():
    return tsino('im-isencao', painel('<b>1 novo</b> · 2 nos últimos 30 dias', isencao(), 1), 1)


def sino_script():
    return r"""<script>
(function(){
  /* Sino do Console (aprovado em console-interessado-sino), com os avisos da implantação. ?sino= escolhe o estado e abre. */
  var q=new URLSearchParams(location.search), nome=q.get('sino');
  var d=document.getElementById('painel-avisos'); if(!d) return;
  var t=nome&&document.querySelector('template[data-sino="'+nome+'"]'); if(!t){d.remove();return}
  d.appendChild(t.content.cloneNode(true));
  if(t.dataset.quem){var p=t.dataset.quem.split('|');
    document.querySelectorAll('[data-quem-nome]').forEach(function(e){e.textContent=p[0]});
    document.querySelectorAll('[data-quem-funcao]').forEach(function(e){e.textContent=p[1]});
    document.querySelectorAll('[data-quem-ini]').forEach(function(e){e.textContent=p[2]});}
  var n=t.dataset.novos, cel=matchMedia('(max-width:760px)');
  var sinos=document.querySelectorAll('.topo .icone-botao,.barra-cel .bb[aria-label^="Avisos"]');
  sinos.forEach(function(b){ b.setAttribute('aria-controls','painel-avisos'); b.setAttribute('aria-expanded','false'); b.setAttribute('aria-haspopup','dialog');
    b.setAttribute('aria-label','Avisos, '+n+(n==='1'?' novo':' novos')); b.addEventListener('click',function(){ if(d.open){d.close()} else {abrir()} }); });
  function abrir(){ if(cel.matches){d.showModal()} else {d.show()} sinos.forEach(function(s){s.setAttribute('aria-expanded','true')}); d.focus() }
  d.addEventListener('close',function(){ sinos.forEach(function(s){s.setAttribute('aria-expanded','false')}) });
  d.addEventListener('click',function(e){ if(e.target.closest('[data-fechar-sino]')) d.close() });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&d.open&&!cel.matches){ d.close() } });
  abrir();
})();
</script>"""
