# Portal · Início por áreas + próximas audiências (EX-06: "as próximas aparecem na tela inicial"; F3.2).
# Mostra também dois itens novos no bloco Jurídico, no padrão de item aprovado:
#   - prazo em 2 dias (lembrete 2 dias antes, só nos prazos com "lembrar" marcado; F3.38);
#   - petição esperando a sua revisão (EX-09; F3.76).
# Parte do Início por áreas aprovado (19/11/2026): executa o inicio_areas.py (cópia sem mudança) até antes
# dos estados dele, troca só a Agenda de hoje (ganha o trecho "Próximas audiências") e o bloco Jurídico,
# e monta a página com o mesmo fim do inicio_areas.py. Peças novas com prefixo pa-.
# Uso: python3 inicio_audiencias.py <pasta-saida>
import sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(AQUI, 'inicio_areas.py'), encoding='utf-8').read()
_ini = _src.index('# 1. Sócia dona, os dela (o principal)')
_fim = _src.index('# ---------------------------------------------------------------- página')
_cabeca, _cauda = _src[:_ini], _src[_fim:]  # antes do exec: o inicio_areas.py também usa o nome _src
__file__ = os.path.join(AQUI, 'inicio_areas.py')  # o inicio_areas.py acha o pendencias.py pela pasta dele
exec(compile(_cabeca, 'inicio_areas.py', 'exec'), globals())

# ---------------------------------------------------------------- ligações novas
L_AGM = AP + 'portal-agenda-conversas/agenda.html?estado=mes'
L_COMP = AP + 'portal-agenda-conversas/agenda.html?estado=compromisso'
L_PET = AP + 'portal-peticoes/peticoes.html?estado=revisar'

# Dois ícones da Agenda aprovada (extra.py de portal-agenda-conversas), no mesmo traço
ICO_PA = ('<symbol id="i-video" viewBox="0 0 24 24"><path d="M3 6.5h12v11H3Z"/><path d="m15 10.5 6-3.5v10l-6-3.5"/></symbol>'
          '<symbol id="i-local" viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><path d="M12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></symbol>')

# ---------------------------------------------------------------- CSS novo (prefixo pa-)
CSS_PA = r"""
/* ==========================================================================
   Portal · Início: próximas audiências (EX-06). Prefixo pa-.
   Mora dentro da folha "Agenda de hoje" aprovada; reaproveita .agenda, .ev, --t e .ar-pe.
   ========================================================================== */
.pa-cab{display:flex;align-items:baseline;justify-content:space-between;gap:2px 12px;flex-wrap:wrap;margin-top:4px;padding:16px 24px 0;border-top:1px solid var(--divisor)}
.pa-cab h3{font-family:var(--serifa);font-size:19px;font-weight:500;line-height:1.2;color:var(--vinho);display:flex;align-items:center;gap:8px;margin:0}
.pa-cab h3 .ico{width:18px;height:18px;color:var(--vinho-4)}
.pa-cab p{margin:0;font-size:12px;color:var(--texto-2)}
.agenda.pa-prox{padding-top:6px;padding-bottom:10px}
.pa-ev{grid-template-columns:64px minmax(0,1fr)}
.pa-ev time{padding-top:7px;line-height:1.1}
.pa-ev time .pa-d{display:block;margin-bottom:3px;font-family:var(--sans);font-size:11px;font-weight:500;letter-spacing:.02em;color:var(--texto-2);white-space:nowrap}
.pa-cx{display:block;color:var(--texto);text-decoration:none}
.pa-cx strong{color:var(--vinho)}
.pa-cx:hover strong{text-decoration:underline}
.pa-cx:hover{box-shadow:inset 0 0 0 1px var(--vinho-4)}  /* sem trocar o fundo: o “amanhã” em #AC3F6B só passa no #F2ECE8 */
.pa-cx:focus-visible{outline:3px solid var(--vinho-3);outline-offset:2px}
.pa-cx small{display:flex;align-items:flex-start;gap:6px;margin-top:2px;line-height:1.4}
.pa-cx small .ico{width:14px;height:14px;flex:none;margin-top:2px;color:var(--vinho-2)}
.pa-ev .tipo b{font-weight:600;color:var(--vinho-3)}
.pa-cab + .ar-pe{border-top:0;padding-top:10px}
@media (max-width:760px){
  .pa-cab{padding:14px 16px 0}
  .pa-ev{grid-template-columns:60px minmax(0,1fr);gap:10px}
}
"""

# ---------------------------------------------------------------- próximas audiências
# Da equipe toda, de amanhã até 7 dias (19/11 a 25/11), no máximo 3, as mais próximas primeiro.
# Os dados são os da Agenda aprovada (semana e mês de novembro).
AUDS = [
    ('2026-11-19T13:30', 'Qui, 19/11', '13:30', 'amanhã', 'Instrução · Corrêa x Rota Sul', 'local', 'Presencial · TRT-2, Barra Funda', 'Marina e Gustavo'),
    ('2026-11-19T16:00', 'Qui, 19/11', '16:00', 'amanhã', 'Conciliação · Mendes x Loja Bela Casa', 'video', 'Virtual · CEJUSC Pinheiros', 'Larissa'),
    ('2026-11-24T10:30', 'Ter, 24/11', '10:30', '', 'Conciliação · Castro x Seguradora Leste', 'video', 'Virtual · CEJUSC Pinheiros', 'Felipe'),
]
DEPOIS = 'quinta, 26/11, às 13h30: Instrução · Lima x Padaria Estrela.'


def aud_li(dt, dia, hora, rel, tit, ic, onde, quem):
    r = f' · <b>{rel}</b>' if rel else ''
    return (f'<li class="ev pa-ev" style="--t:var(--vinho)"><time datetime="{dt}"><span class="pa-d">{dia}</span>{hora}</time>'
            f'<a class="cx pa-cx" href="{L_COMP}"><span class="tipo">Audiência{r}</span><strong>{tit}</strong>'
            f'<small>{ico(ic)}<span>{onde} · {quem}</span></small></a></li>')


def proximas(auds=AUDS):
    cab = (f'<div class="pa-cab"><h3 id="t-aud">{ico("balanca")}Próximas audiências</h3>'
           f'<p>Da equipe toda · de amanhã até 25/11</p></div>')
    if not auds:
        return cab + pe(f'<b>Nenhuma audiência nos próximos 7 dias.</b> A próxima é na {DEPOIS}', L_AGM, 'Agenda do mês', 'agenda')
    lst = f'<ol class="agenda pa-prox" aria-labelledby="t-aud">{"".join(aud_li(*a) for a in auds[:3])}</ol>'
    if len(auds) > 3:
        rod = pe(f'<b>Mais {len(auds) - 3} até 25/11.</b>', L_AGM, 'Ver na Agenda', 'agenda')
    else:
        rod = pe(f'Nenhuma outra até 25/11. A seguinte é na {DEPOIS}', L_AGM, 'Agenda do mês', 'agenda')
    return cab + lst + rod


def agenda(auds=AUDS):
    """A Agenda de hoje aprovada, sem mudança, com o trecho "Próximas audiências" embaixo, na mesma folha."""
    return AGENDA_HOJE.replace('</ol></section>', '</ol>' + proximas(auds) + '</section>', 1)


AGENDA_HOJE = AGENDA
assert AGENDA_HOJE.endswith('</ol></section>')


def aside(auds=AUDS):
    return f'<aside class="pt-col" aria-label="Parte comum do escritório"><p class="ar-aside-rot">Todo o escritório</p>{agenda(auds)}{CONVERSAS}</aside>'


def pagina_pa(hero_html, faixa_html, blocos, auds=AUDS, aviso=''):
    return (f'<div class="pd-inicio">{hero_html}{aviso}{faixa_html}<div class="pt-inicio"><div class="pt-col">{blocos}</div>{aside(auds)}</div></div>')


# ---------------------------------------------------------------- Jurídico: os dois itens novos
SELO['breve'] = ('selo-implant', 'relogio')   # âmbar claro: em 2 dias
SELO['rev'] = ('selo-atencao', 'lapis')       # âmbar: pede a sua revisão hoje

# Prazo com "lembrar 2 dias antes" marcado: aparece em "A acompanhar" 2 dias antes do "fazer até"
JU_PRE = lambda q=None: it('20', '11', 'prox', 'Impugnação ao laudo · Ferreira x Banco Horizonte', L_PRZ, 'Fazer até sexta: o prazo final é segunda',
                          'Prazo · 1000417-58.2026.5.02.0012 · TRT-2 · lembrete de 2 dias, marcado no prazo', ('breve', 'em 2 dias'), q,
                          rot='Preparar', meta_ico='balanca')
# Petição esperando a revisão de quem vê (EX-09): substitui a tarefa à mão "Revisar a contestação de Felipe"
JU_PET = lambda q=None: it('18', '11', 'hoje', 'Contestação · Souza x Construtora Atlas', L_PET, 'Revisar a petição que Felipe mandou em 17/11',
                          'Petição · prazo da contestação: hoje, 18/11', ('rev', 'Revisar'), q, rot='Revisar', meta_ico='doc')


def b_juridico_pa(equipe=False):
    if equipe:
        sub = 'Da equipe: 2 prazos vencem hoje, 1 tarefa atrasada'
        miolo = grupos('juridico', [('Vencidos', [JU_MIN(MR)]), ('Para hoje', [JU_CON(FM), JU_LAU(LC), JU_REC(MR), JU_MRO(MR)])])
        rod = pe('<b>Mostrando 5 de 10.</b> Os outros 5: 1 petição para revisar e 1 tarefa para hoje, 1 prazo em 2 dias e 2 esperando alguém.', L_TAR, 'Ver todos', 'balanca')
    else:
        sub = 'Os seus: 1 tarefa atrasada, 3 para hoje, 1 prazo em 2 dias e 1 esperando o cliente'
        miolo = grupos('juridico', [('Vencidos', [JU_MIN()]), ('Para hoje', [JU_REC(), JU_MRO(), JU_PET()]), ('A acompanhar', [JU_PRE()])])
        rod = pe('<b>Mostrando 5 de 6.</b> O outro está esperando o cliente: a procuração de Vale Alto. No escritório, 2 prazos vencem hoje, com Felipe e com Larissa.', L_TAR, 'Ver todos', 'balanca')
    return bloco_area('juridico', sub, miolo, L_PRZ, 'Abrir Jurídico', rod)


BLOCOS_PA = lambda eq=False: b_comercial(eq) + b_contratos(eq) + b_financeiro(eq) + b_juridico_pa(eq)

# ---------------------------------------------------------------- estados
# 1. Sócia dona, os dela: as próximas audiências e os dois itens novos no Jurídico
T += tpl('dona', pagina_pa(HERO_MARINA(), faixa(cartoes_marina(), 'Hoje nas suas áreas', SUB_FAIXA, chips('meus')), BLOCOS_PA()) + j_registrar(), **I)
# 2. Sócia dona, da equipe (o botão "Da equipe" leva para cá)
T += tpl('dona-equipe', pagina_pa(HERO_MARINA(), faixa(cartoes_marina(True), 'Hoje no escritório', 'Os itens de toda a equipe, cada um com o responsável. A agenda já é da equipe toda.', chips('equipe')), BLOCOS_PA(True)) + j_registrar(), **I)

# 3. Larissa: só Jurídico (o bloco aprovado, sem mudança) e as mesmas próximas audiências
b_ju_la = bloco_area('juridico', 'Os seus: 1 prazo e 1 tarefa para hoje, 1 esperando alguém',
                     grupos('juridico', [('Para hoje', [JU_LAU(), JU_EXA()]), ('Esperando alguém', [JU_CAL()])]),
                     L_PRZ, 'Abrir Jurídico', pe('No escritório, outro prazo vence hoje, com Felipe.', L_PRZ, 'Prazos', 'balanca'))
T += tpl('larissa', pagina_pa(hero_ar('Larissa', [('2', 'pedem você hoje', 'um prazo vence hoje', '#area-juridico'), ('4', 'compromissos hoje', 'o seu às 14h30', '#t-agenda')],
                                      AT_PRAZO + AT_CLI), '', b_ju_la), quem='juridico', **I)

# 4. Paula: nenhuma área. A agenda (com as próximas audiências) e as conversas, lado a lado
sem_area = (f'<p class="ar-sem-area">{ico("coluna")}<span><b>Você vê a parte comum do escritório:</b> a agenda, as conversas e os clientes. '
            f'Se o seu trabalho pedir outra parte do T3jus, quem libera é Marina Ribeiro, a sócia dona.</span></p>')
T += tpl('paula', f'<div class="pd-inicio">' + hero_ar('Paula', [('4', 'compromissos hoje', 'audiência às 11h', '#t-agenda'), ('3', 'conversas esperando', 'a mais antiga há 2 h', '#t-conv')], AT_NOVO_CLI + AT_CLI)
         + sem_area + f'<div class="ar-comum">{agenda()}{CONVERSAS}</div></div>', quem='sem-area', **I)

# 5. Nenhuma audiência nos próximos 7 dias (Marina, o resto igual ao estado 1)
T += tpl('vazio-audiencias', pagina_pa(HERO_MARINA(), faixa(cartoes_marina(), 'Hoje nas suas áreas', SUB_FAIXA, chips('meus')), BLOCOS_PA(), auds=[]) + j_registrar(), **I)

# ---------------------------------------------------------------- página (o mesmo fim do inicio_areas.py)
CSS_AR = CSS_AR + CSS_PA
LOGO_SYMBOL = LOGO_SYMBOL + ICO_PA
_d0 = 'Portal: o Início por áreas, com o que cobrar, entregar e acompanhar hoje em Comercial, Contratos, Financeiro e Jurídico.'
assert _d0 in _cauda
_cauda = _cauda.replace(_d0, 'Portal: o Início por áreas, com as próximas audiências da equipe na Agenda de hoje e os itens novos do Jurídico (prazo em 2 dias e petição para revisar).')
exec(compile(_cauda, 'inicio_areas.py (fim)', 'exec'), globals())
assert 'id="i-video"' in out and 'id="t-aud"' in out
