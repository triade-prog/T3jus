# Portal · F3.191 (D40): o êxito marcado como "não cobrado" na divisão do alvará. Parte "Repasses" (prefixo enc-).
# Desenho para a Carol aprovar. Base técnica, lida sem mudança: exito_baixado.py aprovado (portal-exito-baixado-alvara),
# executado até o começo dos estados (dali vêm F, R, selo, folha, campo, selecao, CSS_RP, CSS_EB, linha_prop e A).
# A janela "Registrar alvará ou RPV" segue o código de hoje (FinanceiroRepasses.tsx, JanelaRegistrar, com o eb- já no ar).
# Peças novas: prefixo enc- (só o que o eb- não tem: o combinado, a caixa "concordou" e o teto do valor).
# Caso do plano v5, Parte C5: Sebastião Prado, C-2026-034, "Prado x Seguradora Lince", 20%, R$ 3.000,00 calculados.
# Uso: python3 enc_repasses.py <pasta-saida>
import os, sys, json
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_src = open(os.path.join(AQUI, 'exito_baixado.py'), encoding='utf-8').read()
_src = _src[:_src.index('\nROT = {}\n')]
exec(compile(_src, 'exito_baixado.py', 'exec'), globals())
SAIDA = _SAIDA

SEB, PN = 'Sebastião Prado', 'Sebastião'
CT, CASO = 'C-2026-034', 'Prado x Seguradora Lince'
EXPL = 'Sebastião indicou três clientes; combinamos não cobrar o êxito.'
EXPL_IND = 'O acordo foi só sobre danos morais, que o contrato não cobre.'
COMB = 'Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.'
ALV, HON = 15000, 3000
AVISADOS = 'Marina Ribeiro e Larissa Costa'
NB = ' '

CSS_ENC = r"""
/* ==========================================================================
   Repasses · o êxito não cobrado na divisão do alvará (F3.191, D40). Prefixo enc-.
   O aviso, o grupo de cartões, a nota e o resumo de erros são os do eb- (F3.174), sem mudança.
   Peças novas: o quadro do "Cobrar" (combinado + caixa), o teto do valor e o erro dentro da linha.
   ========================================================================== */
.enc-cobrar{display:grid;gap:12px;margin-top:10px;padding:14px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha)}
.enc-cobrar .campo{margin:0}
.enc-cobrar textarea.entrada{min-height:84px}
.enc-cobrar .opcao{margin:0;min-height:44px;border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px}
.enc-cobrar .opcao:has(input:checked){border-color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho)}
.enc-cobrar .opcao:has(input[aria-invalid="true"]){border-color:var(--vinho-3)}
.enc-cobrar .opcao span{font-weight:500}
.enc-cobrar .opcao small{font-weight:400}
.enc-cobrar .erro-msg{margin:4px 0 0}
/* Sobre a folha branca do quadro, o erro volta ao #AC3F6B (5,7:1). No fundo âmbar do aviso ele fica em tinta, como no eb- (o #AC3F6B daria 3,9:1). */
.eb-aviso .enc-cobrar p.erro-msg{color:var(--vinho-3)}
.enc-conta{display:flex;gap:8px;align-items:flex-start;margin:0;font-size:12.5px;line-height:1.45;color:var(--texto-2)}
.enc-conta .ico{flex:none;width:14px;height:14px;margin-top:2px;color:var(--vinho)}
.fi-quem .enc-teto{display:flex;gap:6px;align-items:flex-start;color:var(--texto-2)}
.fi-quem .enc-teto .ico{flex:none;width:14px;height:14px;margin-top:2px;color:var(--vinho)}
.fi-quem .enc-cel{display:flex;gap:6px;align-items:flex-start;color:var(--vinho);font-weight:500}
.fi-quem .enc-cel .ico{flex:none;width:14px;height:14px;margin-top:2px}
.rp-tab .erro-msg.enc-er-v{margin:6px 0 0;font-size:12.5px}
.rp-valor .entrada[aria-invalid="true"]{border-color:var(--vinho-3);box-shadow:inset 0 0 0 1px var(--vinho-3)}
.eb-aviso .enc-sem-ops{margin:0;padding:10px 12px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha);display:flex;gap:10px;align-items:flex-start}
.eb-aviso .enc-sem-ops .ico{flex:none;width:16px;height:16px;margin-top:2px;color:var(--vinho)}
.enc-hist q{font-family:var(--serifa);font-style:italic}
.fi-fecha .enc-cobrado small q{font-family:var(--serifa);font-style:italic;font-size:14px}
.enc-prest{margin:0 24px 20px}
.fi-fecha-acao{padding:0 24px 22px}
.fi-fecha-acao .fi-fechado{display:flex;gap:8px;align-items:flex-start;margin:0;font-size:13px;line-height:1.5}
.fi-fecha-acao .fi-fechado .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
@media (max-width:760px){
  .enc-prest{margin:0 16px 18px}
  .fi-fecha-acao{padding:0 16px 18px}
}
"""


def aviso_enc(motivo='perdoado'):
    """O aviso âmbar, abaixo da tabela, dentro do quadro "Divisão". Abre a section; o grupo a fecha (como o eb-)."""
    if motivo == 'indevido':
        return (f'<section class="eb-aviso" aria-labelledby="eb-aviso-t"><div class="eb-txt" id="eb-aviso">'
                f'<h3 id="eb-aviso-t">{ico("alerta")}O êxito de {PN} foi marcado como não devido na conferência.</h3>'
                f'<p class="eb-det">Êxito · {CASO} · 20% · <span class="eb-num">{R(HON)}</span> calculados · indevido, por Marina Ribeiro em 10/11/2026.</p>'
                f'<p class="eb-expl"><q>{EXPL_IND}</q></p>'
                f'<p>Por isso, a divisão não tem os honorários do êxito, e eles não podem ser cobrados neste alvará.</p>'
                f'<p class="enc-sem-ops">{ico("pessoas")}<span>Se foi um engano, fale com Marina Ribeiro. Por enquanto, o T3jus não refaz a conferência: registre o alvará assim e não lance os honorários como “Outro”.</span></p>'
                f'</div></section>')
    return (f'<section class="eb-aviso" aria-labelledby="eb-aviso-t"><div class="eb-txt" id="eb-aviso">'
            f'<h3 id="eb-aviso-t">{ico("alerta")}O êxito de {PN} foi marcado como não cobrado.</h3>'
            f'<p class="eb-det">Êxito · {CASO} · 20% · <span class="eb-num">{R(HON)}</span> calculados · perdoado, por Marina Ribeiro em 10/11/2026.</p>'
            f'<p class="eb-expl"><q>{EXPL}</q></p>'
            f'<p>Por isso, a divisão veio sem os honorários do êxito. Escolha se fica assim ou se eles são cobrados neste alvará, com o acordo de {PN}.</p></div>')


def grupo_enc(marcado=None, erro=None):
    """marcado: None, 'sem' ou 'cobrar'. erro: None, 'escolha' ou 'cobrar' (combinado vazio, caixa e valor acima)."""
    ops = [('sem', 'Deixar sem os honorários', f'Os {R(ALV)} ficam com {PN}, como decidido na conferência.'),
           ('cobrar', 'Cobrar os honorários neste alvará',
            f'Só cobre se {PN} concordou. A prestação de contas vai mostrar os honorários, e {AVISADOS} recebem um aviso. '
            'Se o combinado virou parcelas novas em Contratos, cobrar aqui cobra duas vezes.')]
    li = ''
    for i, (v, rot, aj) in enumerate(ops):
        ch = ' checked' if v == marcado else ''
        inv = ' aria-invalid="true"' if erro == 'escolha' else ''
        foco = ' data-foco' if (erro == 'escolha' and i == 0) or (v == marcado and not erro) else ''
        li += (f'<label class="opcao"><input class="marcar" type="radio" name="enc-exito" id="enc-op-{v}" value="{v}"{ch}{inv}{foco}>'
               f'<span>{rot}<small>{aj}</small></span></label>')
    er = (f'<p class="erro-msg" id="enc-ops-er">{ico("alerta", "ico ico-s")}Escolha o que fazer com os honorários do êxito de {PN}: '
          f'deixar sem ou cobrar neste alvará.</p>') if erro == 'escolha' else ''
    desc = ' aria-describedby="enc-ops-er"' if erro == 'escolha' else ''
    extra = ''
    if marcado == 'sem':
        extra = (f'<p class="eb-nota" role="status">{ico("historico")}<span>Os honorários ficam fora da divisão. O êxito de {PN} continua não cobrado, '
                 f'e isso fica no histórico do repasse.</span></p>')
    if marcado == 'cobrar':
        ec = erro == 'cobrar'
        t_inv = ' aria-invalid="true"' if ec else ''
        t_desc = 'enc-comb-aj enc-comb-er' if ec else 'enc-comb-aj'
        t_er = (f'<p class="erro-msg" id="enc-comb-er">{ico("alerta", "ico ico-s")}Escreva o que foi combinado com {PN}, com pelo menos 3 letras.</p>') if ec else ''
        c_inv = ' aria-invalid="true" aria-describedby="enc-conc-er"' if ec else ''
        c_er = (f'<p class="erro-msg" id="enc-conc-er">{ico("alerta", "ico ico-s")}Confirme que {PN} concordou com a cobrança.</p>') if ec else ''
        extra = (f'<div class="enc-cobrar">'
                 f'<div class="campo"><label for="enc-comb">O que foi combinado com {PN}</label>'
                 f'<textarea class="entrada" id="enc-comb" maxlength="1000" aria-describedby="{t_desc}"{t_inv}></textarea>'
                 f'<p class="ajuda" id="enc-comb-aj">Fica na ficha do repasse e na ficha do contrato. O cliente vê os honorários na prestação de contas.</p>{t_er}</div>'
                 f'<div><label class="opcao"><input class="marcar" type="checkbox" id="enc-conc"{c_inv}>'
                 f'<span>{PN} concordou com a cobrança destes honorários.</span></label>{c_er}</div>'
                 f'</div>')
    return (f'<fieldset class="eb-ops"{desc}><legend>O que fazer com os honorários do êxito de {PN}</legend>{er}'
            f'<div class="eb-ops-l">{li}</div>{extra}</fieldset></section>')


def linha_hon(valor, erro=False):
    """A linha de honorários que volta com o "Cobrar": a regra do servidor, o teto e, no erro, a mensagem presa ao campo."""
    v = R(valor).replace('R$' + NB, '')
    inv = ' aria-invalid="true"' if erro else ''
    desc = 'enc-teto enc-v-er' if erro else 'enc-teto'
    er = (f'<p class="erro-msg enc-er-v" id="enc-v-er">{ico("alerta", "ico ico-s")}Os honorários passam do êxito calculado na conferência ({R(HON)}).</p>') if erro else ''
    return (f'<tr><td><div class="fi-quem"><strong>Honorários de êxito</strong><small>20% · acordo · contrato {CT} · combinado com {PN}</small>'
            f'<small class="enc-teto" id="enc-teto">{ico("ajuda")}Até {R(HON)}, o êxito calculado na conferência.</small>{er}</div></td>'
            f'<td data-r="Caixa"><span class="fi-cat">{ico("coluna")}Escritório</span></td>'
            f'<td data-r="Valor" class="rp-valor"><div class="rp-valor-in"><label class="sr" for="rp-v-0">Valor de Honorários de êxito</label>'
            f'<input class="entrada num" id="rp-v-0" type="text" inputmode="decimal" autocomplete="off" value="{v}" aria-describedby="{desc}"{inv}>'
            f'<button class="btn btn-fantasma btn-compacto" type="button">{ico("x")}<span class="sr">Tirar Honorários de êxito da divisão</span></button></div></td></tr>')


def j_registrar_enc(var='proposta'):
    """var: proposta, indevido, sem, cobrar, erro, erro-cobrar ou conflito (Diego, 18/11, 10h12)."""
    marcado = {'sem': 'sem', 'cobrar': 'cobrar', 'erro-cobrar': 'cobrar'}.get(var)
    erro = {'erro': 'escolha', 'erro-cobrar': 'cobrar'}.get(var)
    topo = ''
    if var == 'erro':
        topo = (f'<div class="aviso aviso-urgencia eb-resumo" role="alert">{ico("alerta")}<div><strong class="aviso-titulo">Falta acertar 1 coisa.</strong>'
                f'<p>Nada foi registrado ainda.</p><ul><li><a href="#enc-op-sem">Escolha o que fazer com os honorários do êxito de {PN}.</a></li></ul></div></div>')
    if var == 'erro-cobrar':
        topo = (f'<div class="aviso aviso-urgencia eb-resumo" role="alert">{ico("alerta")}<div><strong class="aviso-titulo">Falta acertar 3 coisas.</strong>'
                f'<p>Nada foi registrado ainda.</p><ul>'
                f'<li><a href="#rp-v-0">Os honorários passam do êxito calculado na conferência.</a></li>'
                f'<li><a href="#enc-comb">Escreva o que foi combinado com {PN}.</a></li>'
                f'<li><a href="#enc-conc">Confirme que {PN} concordou com a cobrança.</a></li></ul></div></div>')
    if var == 'conflito':
        topo = aviso('atencao', f'Marina Ribeiro marcou o êxito de {PN} como não cobrado às 10h13.',
                     'Nada foi registrado. Veja a divisão refeita: ela fica sem os honorários do êxito.', icone='pessoas', papel='alert')
    campos = (f'<div class="fi-dois">{selecao("rp-tipo", "O que entrou", ["Escolha", "Alvará", "RPV", "Precatório", "Depósito de acordo"], "Alvará")}'
              + selecao('rp-caso', 'Caso e cliente', ['Escolha o caso', f'{CASO} · {SEB}', 'Fonseca x Banco Aurora · Rita Fonseca'], f'{CASO} · {SEB}') + '</div>'
              + f'<div class="fi-dois">{campo("rp-valor", "Valor levantado", "15.000,00", im="decimal")}{campo("rp-dia", "Dia em que entrou", "18/11/2026", im="numeric", ajuda="dd/mm/aaaa")}</div>'
              + f'<p class="fi-caixa-fixa">{ico("escudo")}<span>Entra como <b>valor de terceiros</b>. Só a parte do escritório passa para o caixa dele, quando for transferida.</span></p>')
    linhas, cliente = '', ALV
    if marcado == 'cobrar':
        hv = 3500 if var == 'erro-cobrar' else HON
        linhas += linha_hon(hv, erro=var == 'erro-cobrar')
        cliente -= hv
    linhas += (f'<tr class="rp-cliente"><td><div class="fi-quem"><strong>{SEB}</strong><small>Cliente · o que fica, depois das outras partes</small></div></td>'
               f'<td data-r="Caixa"><span class="fi-cat terc">{ico("escudo")}Terceiros</span></td><td data-r="Valor" class="fi-v num">{R(cliente)}</td></tr>')
    tab = (f'<table class="fi-tab rp-tab"><caption class="sr">Para quem vai cada parte</caption>'
           f'<colgroup><col style="width:48%"><col style="width:20%"><col style="width:32%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Caixa</th><th scope="col" style="text-align:right">Valor</th></tr></thead><tbody>{linhas}</tbody></table>')
    soma = f'<p class="fi-ref" role="status">{ico("check")}<span>Soma da divisão: <b>{R(ALV)}</b>, igual ao valor levantado. Falta destinar: <b>{R(0)}</b>.</span></p>'
    acres = f'<button class="btn btn-sec btn-compacto" type="button" style="justify-self:start">{ico("mais")}Acrescentar perito, parceiro ou outro</button>'
    if var == 'indevido':
        miolo = aviso_enc('indevido')
    else:
        miolo = aviso_enc() + grupo_enc(marcado, erro)
    div = (f'<fieldset class="rp-div" aria-describedby="eb-aviso"><legend>Divisão proposta pelo contrato {CT}</legend>'
           f'{tab}{miolo}{acres}{soma}</fieldset>')
    if var == 'conflito':
        div = (f'<fieldset class="rp-div"><legend>Divisão proposta pelo contrato {CT}</legend>'
               f'<p class="ajuda eb-velha">{ico("reenviar")}<span>A divisão saiu daqui porque o êxito de {PN} mudou. '
               f'O que entrou, o caso, o valor e o dia continuam como você escreveu.</span></p></fieldset>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}Registrar</button>')
    if var == 'conflito':
        pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
              f'<button class="btn btn-pri" type="button" data-foco>{ico("reenviar")}Ver a divisão refeita</button>')
    h = janela('j-rpv', 'Repasses', 'Registrar alvará ou RPV', 'Diga o que entrou e de qual caso. A divisão sai do contrato, e você pode ajustar antes de registrar.',
               topo + campos + div, pe, abrir=True).replace('class="janela"', 'class="janela fi-larga"', 1)
    if var in ('proposta', 'indevido'):
        h = h.replace('<select class="entrada" id="rp-tipo">', '<select class="entrada" id="rp-tipo" data-foco>', 1)
    if var == 'erro-cobrar':
        h = h.replace('id="rp-v-0" type="text"', 'id="rp-v-0" data-foco type="text"', 1)
    return h


# ---------------------------------------------------------------- a ficha do repasse de Sebastião
def prestacao(enviada=False):
    rod = '18/11 · 15h12 · lida' if enviada else 'Prévia · ainda não enviada'
    cab = (f'<p class="fi-zap-cab">{ico("whats")}Mandada pelo WhatsApp por Diego Almeida: lida às 15h40</p>' if enviada
           else f'<p class="fi-zap-cab">{ico("whats")}Ainda não enviada</p>')
    fecho = 'Já transferimos o seu valor em 18/11. Qualquer dúvida, é só responder esta mensagem.' if enviada else 'Vamos transferir o seu valor até 24/11. Qualquer dúvida, é só responder esta mensagem.'
    zap = (f'<div class="fi-zap enc-prest">{cab}'
           f'<div class="fi-balao"><p>Olá, Sebastião. Aqui é do escritório Ribeiro &amp; Matos. O seu alvará foi levantado, e esta é a conta de como ficou:</p>'
           f'<table><caption class="sr">A conta da prestação de contas</caption><tbody>'
           f'<tr><td>Valor recebido</td><td>{R(ALV)}</td></tr><tr><td>Honorários de êxito</td><td>− {R(HON)}</td></tr>'
           f'<tr class="fi-fica"><td>Fica para você</td><td>{R(ALV - HON)}</td></tr></tbody></table>'
           f'<p>{fecho}</p><small>{rod}</small></div></div>')
    return folha('t-prest', 'Prestação de contas ao cliente', zap, icone='whats', sub='O que Sebastião recebe pelo WhatsApp do escritório')


def ficha_seb(modo='cobrar'):
    """modo: cobrar (registrado com "Cobrar"), sem (com "Deixar sem") ou fechado (cobrar, repassado e encerrado)."""
    cobrou = modo in ('cobrar', 'fechado')
    fechado = modo == 'fechado'
    cli = ALV - HON if cobrou else ALV
    if fechado:
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="fi-terc-rot" id="t-dir">{ico("escudo")}Ainda com o escritório</p>'
                f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(0)}</p>{selo("ok", "Caso encerrado", "check")}</div>'
                f'<p class="fi-oque"><b>Tudo repassado e transferido em 18/11.</b><br>Marina Ribeiro encerrou o caso no financeiro às 16h20.</p></section>')
        sel_meta = '2 de 2 feitos'
    else:
        oque = (f'<b>{R(cli)} de {PN} e {R(HON)} de honorários.</b> O prazo do escritório para repassar é de 3 dias úteis.' if cobrou
                else f'<b>Tudo é de {PN}.</b> O prazo do escritório para repassar é de 3 dias úteis.')
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="fi-terc-rot" id="t-dir">{ico("escudo")}Ainda com o escritório</p>'
                f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(ALV)}</p>{selo("atencao", "Até 24/11", "relogio")}</div>'
                f'<p class="fi-oque">{oque}</p>'
                f'<button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button></section>')
        sel_meta = '0 de 2 feitos' if cobrou else '0 de 1 feito'
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
           f'<a class="voltar" href="{FARQ}repasses">{ico("esq", "ico ico-s")}Repasses</a>'
           f'<div class="ident"><div><p class="sobretitulo">Alvará · {CASO}</p><h1>{SEB}</h1>'
           f'<p class="meta"><span class="selo" style="background:var(--ambar-3);color:var(--vinho)">{sel_meta}</span><span>levantado em 18/11/2026</span><span class="sep" aria-hidden="true"></span><span class="num">{R(ALV)}</span></p></div></div></div>{dir_}</div>')
    s_cli = selo('ok', 'Repassado 18/11', 'check') if fechado else selo('atencao', 'Até 24/11', 'relogio')
    s_hon = selo('ok', 'Transferido 18/11', 'check') if fechado else selo('neutro', 'A transferir')
    d_cli = f'<div class="fi-docs"><a href="#">{ico("link")}Comprovante</a></div>' if fechado else '<span class="fi-pq">—</span>'
    d_hon = f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo 0201</a></div>' if fechado else '<span class="fi-pq">—</span>'
    linhas = [('SP', SEB, 'Cliente · o que fica para ele', R(cli), s_cli, d_cli)]
    if cobrou:
        linhas.append(('RM', 'Honorários de êxito', f'Escritório · 20% · acordo · contrato {CT} · combinado com {PN}', R(HON), s_hon, d_hon))
    rows, car = '', ''
    for ini, q, r, v, s, d in linhas:
        rows += (f'<tr><td><div class="fi-quem-d"><span class="av-p forte" aria-hidden="true">{ini}</span><div><strong>{q}</strong><small>{r}</small></div></div></td>'
                 f'<td>{s}</td><td class="fi-v num">{v}</td><td>{d}</td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{q}</strong><small>{r}</small></div></div>'
                f'<dl class="c-dados"><dt>Valor</dt><dd class="num">{v}</dd></dl><div class="c-selos">{s}</div></li>')
    tab = (f'<table class="so-pc fi-tab fi-dest"><caption class="sr">Para onde vai cada parte</caption><colgroup><col style="width:40%"><col style="width:23%"><col style="width:18%"><col style="width:19%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documento</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">Levantado e destinado</th><td style="white-space:nowrap">Falta destinar {R(0)}</td><td class="fi-v num">{R(ALV)}</td><td></td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Para onde vai cada parte">{car}</ul>')
    sub = (f'Com os honorários do êxito, cobrados por Diego com o combinado com {PN}.' if cobrou
           else 'Sem os honorários do êxito: o êxito foi marcado como não cobrado na conferência.')
    dest = folha('t-dest', 'Para onde vai cada parte', tab, sub=sub, icone='enviar', terc=True)
    # Histórico
    if cobrou:
        novo = (f'<li class="eb-hist-novo enc-hist"><time>10h14</time><span class="pto" aria-hidden="true"></span><div><p>Honorários do êxito cobrados neste alvará, '
                f'com o combinado com {PN}: <q>{COMB}</q> Na conferência, o êxito tinha sido marcado como não cobrado (perdoado, por Marina Ribeiro em 10/11).</p>'
                f'<small>Diego Almeida, ao registrar o alvará · Sebastião concordou, segundo Diego</small></div></li>')
        reg = f'<li><time>10h14</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> registrou Alvará de {R(ALV)}</p><small>com os honorários do êxito cobrados</small></div></li>'
    else:
        novo = (f'<li class="eb-hist-novo"><time>10h14</time><span class="pto" aria-hidden="true"></span><div><p>Registrado sem os honorários do êxito: o êxito de {PN} '
                f'foi marcado como não cobrado na conferência (perdoado, por Marina Ribeiro em 10/11).</p><small>Diego Almeida, ao registrar o alvará</small></div></li>')
        reg = f'<li><time>10h14</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> registrou Alvará de {R(ALV)}</p><small>divisão do contrato aceita sem mudança</small></div></li>'
    tarde = ''
    if fechado:
        tarde = (f'<li><time>16h20</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> encerrou o caso no financeiro</p><small>Tudo repassado e transferido</small></div></li>'
                 f'<li><time>15h40</time><span class="pto" aria-hidden="true"></span><div><p>Sebastião leu a prestação de contas</p><small>WhatsApp do escritório</small></div></li>'
                 f'<li><time>15h05</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> repassou {R(cli)} a {PN} e transferiu {R(HON)} de honorários ao caixa</p><small>Pix · comprovante anexado</small></div></li>')
    hist = folha('t-hist', 'Histórico', f'<div class="eventos-dia" style="padding-top:0"><h3>18/11/2026 · hoje</h3><ol class="eventos">{tarde}{novo}{reg}</ol></div>', icone='historico')
    # Fechamento do caso (a folha da ficha do repasse, como no código de hoje)
    if cobrou:
        ex = (f'<li class="enc-cobrado">{ico("check")}<span>Êxito de {PN} cobrado no alvará de 18/11 (não cobrado na conferência)'
              f'<small>{R(HON)} · por Diego Almeida, com o combinado com {PN} · na conferência: perdoado, por Marina Ribeiro em 10/11</small></span></li>')
    else:
        ex = (f'<li>{ico("check")}<span>Êxito do contrato {CT}: não cobrado'
              f'<small>perdoado, por Marina Ribeiro em 10/11 · deixado fora do alvará ao registrar</small></span></li>')
    if fechado:
        num = (f'<div class="fi-fecha-num"><div><b class="num">{R(ALV)}</b><small>entrou</small></div><div><b class="num">{R(ALV)}</b><small>destinado e pago</small></div>'
               f'<div><b class="num">{R(0)}</b><small>falta pagar</small></div></div>')
        itens = (f'<li>{ico("check")}<span>Alvará registrado em 18/11/2026</span></li>{ex}'
                 f'<li>{ico("check")}<span>Honorários de êxito: feito em 18/11</span></li>'
                 f'<li>{ico("check")}<span>{SEB}: feito em 18/11</span></li>'
                 f'<li>{ico("check")}<span>Prestação de contas lida pelo cliente em 18/11, às 15h40</span></li>')
        acao = f'<p class="fi-fechado">{ico("check")}<span>Caso encerrado no financeiro em 18/11, por Marina Ribeiro.</span></p>'
    else:
        num = (f'<div class="fi-fecha-num"><div><b class="num">{R(ALV)}</b><small>entrou</small></div><div><b class="num">{R(0)}</b><small>destinado e pago</small></div>'
               f'<div class="falta"><b class="num">{R(ALV)}</b><small>falta pagar</small></div></div>')
        hon = f'<li class="falta">{ico("alerta")}<span><b>Honorários:</b> falta pagar {R(HON)}, até 24/11</span></li>' if cobrou else ''
        itens = (f'<li>{ico("check")}<span>Alvará registrado em 18/11/2026</span></li>{ex}{hon}'
                 f'<li class="falta">{ico("alerta")}<span><b>Cliente:</b> falta pagar {R(cli)}, até 24/11</span></li>'
                 f'<li class="falta">{ico("alerta")}<span><b>Prestação de contas:</b> ainda não enviada</span></li>')
        acao = f'<button class="btn btn-sec" type="button" style="width:100%">{ico("cadeado")}Encerrar o caso no financeiro</button>'
    fecha = folha('t-fecha', 'Fechamento do caso', f'<div class="fi-fecha">{num}<ul class="fi-check">{itens}</ul></div><div class="fi-fecha-acao">{acao}</div>',
                  icone='cadeado', sub='Só encerra com tudo recebido e tudo repassado')
    prest = prestacao(enviada=fechado) if cobrou else ''
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{dest}{prest}</div><aside class="fi-col" aria-label="Fechamento e histórico">{fecha}{hist}</aside></div></div>'


ROT, TF = {}, ''


def addf(nome, corpo, rotulo, **kw):
    global TF
    ROT[nome] = rotulo
    TF += tpl(nome, corpo, **kw)


REP = F.repasses()
JR = A('Repasses', 'Registrar alvará ou RPV', quem='diego')
addf('enc-proposta', REP + j_registrar_enc('proposta'), 'A divisão vem sem os honorários: o aviso e a escolha, sem nada marcado', **JR)
addf('enc-indevido', REP + j_registrar_enc('indevido'), 'Indevido: sem a escolha, e o caminho é falar com quem conferiu', **JR)
addf('enc-sem', REP + j_registrar_enc('sem'), '“Deixar sem os honorários”: tudo fica com Sebastião', **JR)
addf('enc-cobrar', REP + j_registrar_enc('cobrar'), '“Cobrar os honorários neste alvará”: a linha volta, o combinado e a caixa', **JR)
addf('enc-erro', REP + j_registrar_enc('erro'), 'Registrar sem escolher: o erro do grupo', **JR)
addf('enc-erro-cobrar', REP + j_registrar_enc('erro-cobrar'), 'Variação: “Cobrar” sem o combinado, sem a caixa e acima do calculado', **JR)
addf('enc-conflito', REP + j_registrar_enc('conflito'), 'Marina marcou o êxito como não cobrado com a janela aberta: nada foi registrado', **JR)
addf('enc-historico', ficha_seb('cobrar'), 'Marina, na ficha do repasse: registrado com “Cobrar”', **A('Repasses', SEB, f'Financeiro|Repasses|{SEB}'))
addf('enc-historico-sem', ficha_seb('sem'), 'Variação: a ficha do repasse registrado com “Deixar sem”', **A('Repasses', SEB, f'Financeiro|Repasses|{SEB}'))
addf('enc-resumo-fechado', ficha_seb('fechado'), 'O caso encerrado: o êxito cobrado no alvará no fechamento do repasse', **A('Repasses', SEB, f'Financeiro|Repasses|{SEB}'))

barras_f = ''.join(f'<template data-barra="financeiro|{s}">{barra_area("financeiro", s)}</template>\n' for s in ['Repasses'])
barras_f = barras_f.replace('<a href="#" aria-current="page">Repasses</a>', f'<a href="{FARQ}enc-proposta" aria-current="page">Repasses</a>')
out = pagina('Financeiro', 'Repasses: o êxito marcado como não cobrado na divisão do alvará (F3.191).', '{"estado":"enc-proposta","atual":"financeiro"}', '', TF, barras_f)
out = out.replace('</style>', F.CSS_FI + '\n' + CSS_RP + '\n' + CSS_EB + '\n' + CSS_ENC + '\n</style>', 1)
out = out.replace("'sem-area':{", QUEM, 1)
assert 'diego:{' in out
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'financeiro.html'), 'w', encoding='utf-8').write(out)
json.dump(ROT, open(os.path.join(AQUI, '_rot_financeiro.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('financeiro ok', len(ROT), 'estados')
