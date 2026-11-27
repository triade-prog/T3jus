# Portal · F3.191 (D40): as telas do caso dizem "cobrado no alvará" (prefixo enc-).
# Base técnica, lida sem mudança: fechamento.py aprovado (portal-fechamento-sem-levantamento), executado até a parte
# "página" (dali vêm jornada.py, ficha_ligada.py, clientes.py, juridico.py, o CSS e as peças ficha_ct, folha_fi, eventos,
# dir_fi, dir_fecha2, lista_passos, li_ok, li_falta, ficha_x, tabela, cartao e folha_aba).
# Estados: enc-caso-historico (ficha do contrato em A receber, "De onde veio"), enc-acerto (ficha do caso no Jurídico,
# "Acerto no Financeiro") e enc-ficha-cliente (ficha do cliente, passo do fechamento).
# Uso: python3 enc_caso.py <pasta-saida>
import os, sys, json
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_SAIDA0 = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_corte = '# ====================================================================================== página'
_src = open(os.path.join(AQUI, 'fechamento.py'), encoding='utf-8').read()
exec(compile(_src[:_src.index('\n' + _corte) + 1], 'fechamento.py', 'exec'), globals())
SAIDA = _SAIDA0
EST = []
T = ''

SEB, PN = 'Sebastião Prado', 'Sebastião'
CT, CASO = 'C-2026-034', 'Prado x Seguradora Lince'
PROC = '1009876-12.2026.8.26.0100'
EXPL = 'Sebastião indicou três clientes; combinamos não cobrar o êxito.'
COMB = 'Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.'
ALV, HON = 15000, 3000
J['INI'].setdefault('Larissa Costa', 'LC')

CSS_ENC2 = r"""
/* ==========================================================================
   Telas do caso · "cobrado no alvará" (F3.191, D40). Prefixo enc-. Só tokens e pares já aprovados.
   "Cobrado no alvará" é sempre texto; o selo é o neutro do D2.
   ========================================================================== */
.eventos .enc-q{font-family:var(--serifa);font-style:italic;font-size:14px}
.jf-acerto .enc-cob small,.fi-check .enc-cob small{display:block}
.enc-vazio{margin:8px 24px 22px}
@media (max-width:760px){ .enc-vazio{margin:8px 16px 18px} }
"""


# ---------------------------------------------------------------- enc-caso-historico: a ficha do contrato de Sebastião
def ficha_contrato_seb():
    dir_ = dir_fi('Nada em parcelas', R(0), selo('ok', 'Só êxito', 'check'),
                  f'<b>O êxito foi cobrado no alvará de 18/11.</b><br>Os honorários vão ao caixa pela ficha do repasse.',
                  f'<a class="btn btn-pri" href="financeiro.html?estado=enc-historico">{ico("enviar")}Abrir o repasse</a>')
    meta = meta_ct('vigente', f'{CT} · só 20% do êxito', 'Larissa Costa')
    tot = quatro('20% do êxito', R(0), R(0), R(0))
    vazio = (f'<div class="estado sem-moldura enc-vazio" role="status"><span class="icone-estado">{ico("moeda")}</span><h3>Nenhuma parcela</h3>'
             f'<p>O contrato é só de êxito. O êxito foi marcado como não cobrado na conferência, e os honorários foram cobrados no alvará de 18/11, na ficha do repasse.</p></div>')
    orig = folha_fi('t-orig', 'De onde veio', eventos([
        ('18/11/2026', [('10h14', f'<b>Diego Almeida</b> cobrou no alvará de 18/11 os honorários do êxito de {PN}, que estava como não cobrado<span class="selo selo-ativo">Novo</span>',
                         f'{R(HON)} · <q class="enc-q">{COMB}</q>', True)]),
        ('10/11/2026', [('16h40', f'<b>Marina Ribeiro</b> marcou o êxito de {PN} como não cobrado', f'Perdoado · <q class="enc-q">{EXPL}</q>', False),
                        ('16h30', '<b>Marina Ribeiro</b> encerrou o caso com acordo', CASO, False)])],
        ver('Ver o caso no Jurídico', '?estado=enc-acerto')), icone='historico')
    fecha = folha_fi('t-fecha', 'Fechamento do caso', (
        f'<div class="fi-fecha"><ul class="fi-check">{li_falta("<b>Falta no caso:</b> " + R(ALV), "na ficha do repasse")}</ul>'
        f'<p class="fs-aponta">{ico("enviar")}<span>O fechamento deste caso fica na ficha do repasse, porque entrou dinheiro de terceiros.</span></p>'
        f'{ver("Ver o fechamento", "financeiro.html?estado=enc-historico")}</div>'), icone='cadeado', sub=f'{CASO} · só para ler')
    return ficha_ct(SEB, f'Contrato de honorários · {CASO}', meta, dir_, [], tot, orig + fecha,
                    'O êxito entra aqui depois de conferido. Cada mudança fica no histórico.', vazio=vazio)


FIN = dict(area='financeiro', secao='A receber', atual='financeiro', trilha=f'Financeiro|A receber|{SEB}', titulo=SEB)
add('enc-caso-historico', ficha_contrato_seb(), '“De onde veio”, na ficha do contrato: a cobrança no alvará', **FIN)


# ---------------------------------------------------------------- enc-acerto: a ficha do caso no Jurídico
def ficha_caso_seb(fin=True):
    NE, NOME_E = J['NE'], J['NOME_E']
    segs = ''.join(f'<li class="{"agora" if i == NE - 1 else ""}"><span class="b" aria-hidden="true"></span>'
                   f'<span class="sr">{i + 1}. {NOME_E[i]}{": atual" if i == NE - 1 else ": feita"}</span></li>' for i in range(NE))
    t = (f'Encerrado com acordo em 10/11, por Marina. <b>Falta o acerto no Financeiro</b>: repassar a {PN} e encerrar.' if fin
         else f'Encerrado com acordo em 10/11, por Marina. <b>O acerto está com o Financeiro.</b>')
    b = f'<a class="btn btn-pri" href="financeiro.html?estado=enc-historico">{ico("cadeado")}Ver o acerto</a>' if fin else ''
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-etapa"><p class="sobretitulo" id="t-etapa">Etapa do caso</p>'
            f'<p class="grande">{NE} de {NE}<small>{NOME_E[NE - 1]}</small></p><ol class="etapas ju-et8">{segs}</ol>'
            f'<p class="ju-agora">{t}</p>{b}</section>')
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
           f'<a class="voltar" href="#">{ico("esq", "ico ico-s")}Casos e processos</a>'
           f'<div class="ident"><div><p class="sobretitulo">Caso · cível</p><h1>{CASO}</h1>'
           f'<p class="meta"><span class="selo selo-atencao">{ico("relogio")}Encerrado · acerto pendente</span><span class="num">{PROC}</span>'
           f'<span class="sep" aria-hidden="true"></span><span>5ª Vara Cível · e-SAJ</span></p></div></div></div>{dir_}</div>')
    f = J['folha']
    d = [('Área', 'Cível · seguro de vida'), ('Parte contrária', 'Seguradora Lince S.A.'), ('Responsável', 'Larissa Costa'),
         ('Resultado', 'Acordo · encerrado em 10/11/2026'), ('Tribunal', 'TJSP · 5ª Vara Cível de São Paulo'), ('Aberto em', '12/03/2026, na assinatura')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in d)
    dados = f('t-dados', 'Dados do processo', 'O que identifica o caso.', f'<dl class="dados-ficha ju-dl">{dl}</dl>')
    # Larissa (só Jurídico, decidido na revisão) não tem Contratos: vê o texto da ficha aprovada.
    hon = f'<div class="ju-hon"><b>20% do êxito</b><small>Contrato {CT}</small></div>' if fin else '<div class="ju-hon"><small>Honorários na área Contratos</small></div>'
    cli = (f'<ul class="lista ju-clientes"><li><span class="av-p forte" aria-hidden="true">SP</span><div><a class="n" href="?estado=enc-ficha-cliente">{SEB}</a><small>Autor · beneficiário</small></div>'
           f'<a class="tel" href="#">{ico("whats")}<span class="num">(11) 97310-4482</span></a>{hon}</li></ul>')
    clientes = f('t-cli', 'Clientes do caso', '1 cliente', cli)
    if fin:
        ac = (f'<li class="enc-cob">{ico("check")}<span>Êxito não cobrado · cobrado no alvará'
              f'<small>Não cobrado por Marina em 10/11 · {R(HON)} cobrados por Diego em 18/11</small></span></li>'
              f'<li>{ico("check")}<span>Alvará recebido<small>{R(ALV)} · em 18/11</small></span></li>'
              f'<li class="falta">{ico("alerta")}<span><b>{PN}:</b> falta repassar {R(ALV - HON)}<small>até 24/11</small></span></li>'
              f'<li>{ico("relogio")}<span>Depois: encerrar no financeiro e o contrato {CT}<small>Os dois de uma vez, na mesma janela</small></span></li>')
        sub = 'O que falta para o caso sair de “acerto pendente”'
    else:
        ac = (f'<li class="enc-cob">{ico("check")}<span>Êxito não cobrado · cobrado no alvará<small>Não cobrado por Marina em 10/11 · cobrado por Diego em 18/11</small></span></li>'
              f'<li>{ico("check")}<span>Alvará recebido</span></li>'
              f'<li class="falta">{ico("alerta")}<span><b>{PN}:</b> falta repassar<small>até 24/11</small></span></li>'
              f'<li>{ico("relogio")}<span>Depois: encerrar no financeiro</span></li>')
        sub = 'Quem cuida: Marina e Diego, da área Financeiro'
    acerto = f('t-ac', 'Acerto no Financeiro', sub, f'<ul class="jf-acerto">{ac}</ul>', peq=True)
    ctr = f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>{CT} · {SEB}</b><small>Assinado em 12/03/2026 · ativo até o acerto</small></span></li></ul>'
    contr = f('t-ctr', 'Contratos ligados', '', ctr, peq=True)
    return (f'<div class="ju">{cab}<div class="ju-grade ju-ficha-grade"><div class="ju-col">{dados}{clientes}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{acerto}{contr}</aside></div></div>')


CJ_S = dict(area='juridico', secao='Casos e processos', atual='juridico', trilha=f'Jurídico|Casos e processos|{CASO}', titulo=CASO)
add('enc-acerto', ficha_caso_seb(), 'Ficha do caso: o acerto diz “Êxito não cobrado · cobrado no alvará”', **CJ_S)
add('enc-acerto-larissa', ficha_caso_seb(fin=False), 'Variação: Larissa (só Jurídico), o acerto sem valores', quem='juridico', **CJ_S)


# ---------------------------------------------------------------- enc-ficha-cliente: a ficha de Sebastião, passo do fechamento
SEBC = dict(nome=SEB, tp='PF', desde='05/03/2026')
D_S = dir_fecha2(f'<b>{CASO} terminou com acordo em 10/11.</b><br>O alvará entrou em 18/11. Falta repassar a parte de {PN}.',
                 [('Conferir o êxito', 'ok', 'Não cobrado, por Marina em 10/11 · cobrado no alvará de 18/11, por Diego'),
                  ('Repassar a Sebastião', 'ag', f'{R(ALV - HON)}, até 24/11'),
                  ('Encerrar no financeiro', '', 'Com o Financeiro'), ('Encerrar o contrato', '', f'{CT}, junto com o financeiro')],
                 f'<a class="btn btn-pri" href="financeiro.html?estado=enc-historico">{ico("enviar")}Ver o repasse</a>',
                 'Quem faz: a área Financeiro (Marina e Diego). O contrato pode ser encerrado junto.')
NS = dict(atendimentos=3, propostas=1, contratos=1, casos=1)


def aba_casos_seb():
    sub = f'Os casos e processos em que {PN} é cliente. Um processo pode ter mais de um cliente.'
    sel = f'<span class="selo selo-atencao">{ico("relogio")}Acerto pendente</span>'
    linhas = [('fl-vivo', [
        f'<div class="fl-num"><a href="?estado=enc-acerto">{CASO}</a><small class="num">{PROC} · Cível</small></div>',
        f'<div class="fl-et"><b>Encerrado · acerto pendente</b>{J["mini"](8)}<small>8 de 8 · acordo em 10/11</small></div>',
        '<b>Autor</b><small>Único cliente do caso</small>', J['resp']('Larissa Costa'), sel])]
    cards = cartao(CASO, '?estado=enc-acerto', PROC, [('Etapa', 'Encerrado · acerto pendente · acordo em 10/11'), ('Papel', 'Autor, único cliente do caso'), ('Responsável', 'Larissa Costa')], sel)
    pe = '<div class="fl-pe"><span><b>1 caso</b>, encerrado. O acerto do dinheiro fica no Financeiro, na ficha do repasse.</span></div>'
    return folha_aba('t-aba', 'Casos', sub, tabela(f'Casos de {PN}', ['Caso', 'Etapa', f'{PN} no caso', 'Responsável', 'Acerto'], [27, 22, 17, 18, 16], linhas, cards, pe))


add('enc-ficha-cliente', ficha_x(SEBC, D_S, 'casos', aba_casos_seb(), NS), 'Ficha de Sebastião: o passo do êxito diz “cobrado no alvará”',
    aba='casos', atual='clientes', trilha=f'Clientes|{SEB}', titulo=SEB)

# ---------------------------------------------------------------- página (como a do fechamento aprovado)
ROT = dict(EST)
nav = '<p>Telas do caso</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e, _ in EST)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')
out = pagina('Fechamento do caso', 'Portal: as telas do caso dizem “cobrado no alvará” (F3.191).',
             '{"estado":"enc-caso-historico","atual":"financeiro"}', '', T, ''.join(BARRAS.values()))
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n' + CSS_EXTRA + '\n' + CSS_JF + '\n' + CSS_EX + '\n' + CSS_FS + '\n' + CSS_ENC2 + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'caso.html'), 'w', encoding='utf-8').write(out)
json.dump(ROT, open(os.path.join(AQUI, '_rot_caso.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('caso ok', len(EST), 'estados')
