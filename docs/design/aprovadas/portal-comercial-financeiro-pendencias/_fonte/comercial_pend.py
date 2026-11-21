# Portal · Comercial e ficha do cliente: por que o primeiro contato não recebeu proposta (F3.8, AP-03).
# Importa o comercial.py e o clientes.py aprovados (copiados sem mudança), que montam as páginas com os estados
# aprovados, e acrescenta os estados novos. Uso: python3 comercial_pend.py <pasta-saida>
import sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import comercial as CM
import clientes as CL
from comum import tpl, janela, aviso, toast, ico, estado
from pend import *

U = 'comercial.html?estado='
UC = 'clientes.html?estado='
selo = CM.selo


def j_funil(v='abrir'):
    topo, erro = '', ''
    if v == 'erros':
        topo = resumo_erros(1, 'Eduardo ainda está no funil.')
        erro = 'Escolha um dos dois motivos. É ele que o Funil conta.'
    elif v == 'falha':
        topo = falha('Não deu para tirar Eduardo do funil.', 'Nada foi salvo: ele continua em “Primeiro contato”. O que você escolheu continua aqui; tente de novo.', 'COM-7B30-1811')
    ops = (radio('fu-m', 'O escritório não pegou o caso', 'Fora da área, sem viabilidade, conflito de interesse ou falta de agenda.', foco=(v == 'erros'))
           + radio('fu-m', 'O cliente não voltou', 'Foi atendido e não deu mais retorno.', marcado=(v != 'erros'), foco=(v == 'abrir')))
    fs = campo_erro_fs('fu-mot', 'Por que não recebeu proposta', ops, erro=erro)
    if erro:
        fs = fs.replace('type="radio" name="fu-m"', 'type="radio" name="fu-m" aria-invalid="true"')
    corpo = (topo
             + f'<div class="fu-alvo">{ico("pessoa-menos")}<div><strong>Eduardo Nascimento</strong><small>Primeiro contato em 04/11, presencial, com Marina Ribeiro · sem proposta · sem próximo contato</small></div></div>'
             + fs
             + texto_area('fu-nota', 'Anotação', '' if v == 'erros' else 'Liguei em 10/11 e 13/11, sem resposta.', opc=True, ajuda='Fica no histórico do cliente. Só quem tem a área Comercial vê.', limite=300)
             + f'<p class="fi-ref">{ico("check")}<span>Eduardo sai de “Primeiro contato” e de “Sem próximo contato”, e passa a contar em <b>“não voltaram”</b>. A ficha continua ativa, com tudo o que foi registrado. Se ele voltar e receber proposta, passa a contar como proposta.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><a class="btn btn-pri" href="{U}fu-marcado">{ico("check")}Tirar do funil</a>'
    return janela('janela-funil', 'Comercial · funil', 'Encerrar sem proposta', 'Diga por que este primeiro contato não recebeu proposta.', corpo, pe, abrir=(v != 'fechada'))


def j_voltar(abrir=False):
    corpo = (f'<div class="fu-alvo">{ico("pessoa-mais")}<div><strong>Eduardo Nascimento</strong><small>Fora do funil desde hoje: o cliente não voltou · marcado por Marina Ribeiro</small></div></div>'
             + f'<p class="fi-ref">{ico("historico")}<span>Ele volta para “Primeiro contato”, como ainda em atendimento, e deixa de contar em “não voltaram”. O motivo marcado hoje fica no histórico.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar data-foco>Cancelar</button><a class="btn btn-pri" href="{U}fu-funil">{ico("trocar")}Voltar ao funil</a>'
    return janela('janela-voltar', 'Comercial · funil', 'Voltar Eduardo ao funil?', 'Use quando o motivo foi marcado por engano ou quando ele voltou a falar com o escritório.', corpo, pe, abrir=abrir)


SAIRAM = [
    ('Renata Gomes', 'pegou', 'Marina Ribeiro', '12/11', 'Inventário em Portugal, fora da área.'),
    ('Paulo Henrique Sá', 'voltou', 'Diego Almeida', '06/11', ''),
    ('Lúcia Andrade', 'pegou', 'Felipe Matos', '29/10', 'Conflito de interesse: a outra parte é cliente.'),
    ('Tiago Moreira', 'pegou', 'Marina Ribeiro', '21/10', 'Sem agenda para audiência em outra comarca.'),
]
MOT = {'pegou': 'Escritório não pegou', 'voltou': 'Cliente não voltou'}


def folha_sairam(v='base'):
    if v == 'vazio':
        corpo = estado('Ninguém saiu do funil sem proposta', 'Quando um primeiro contato não for receber proposta, marque o motivo no cartão dele, acima, ou na ficha do cliente.', 'funcoes', moldura=False)
        return f'<section class="folha" aria-labelledby="t-sa"><div class="folha-cab"><div><h2 id="t-sa">Saíram sem proposta</h2></div></div>{corpo}</section>'
    itens = ([('Eduardo Nascimento', 'voltou', 'Marina Ribeiro', 'hoje', 'Liguei em 10/11 e 13/11, sem resposta.', True)] if v == 'marcado' else []) + [x + (False,) for x in SAIRAM]
    li = ''
    for n, m, q, d, nota, novo in itens:
        nv = selo('ativo', 'Novo') if novo else ''
        nt = f'<small class="fu-nota">“{nota}”</small>' if nota else ''
        li += (f'<li><div class="fu-s-quem"><a href="{UC}fu-ficha">{n}</a><small>Marcado por {q} {"hoje" if d == "hoje" else "em " + d}</small>{nt}</div>'
               f'<div class="pd-selo-linha">{selo("neutro", MOT[m])}{nv}</div>'
               f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-voltar">{ico("trocar")}Voltar ao funil<span class="sr">: {n}</span></button></li>')
    n_tot = 9 if v == 'marcado' else 8
    corpo = (f'<ul class="fu-sairam">{li}</ul><p class="mais"><span>Mostrando {len(itens)} de {n_tot}</span><button class="btn btn-sec" type="button">Mostrar as outras {n_tot - len(itens)}</button></p>')
    return (f'<section class="folha" aria-labelledby="t-sa" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-sa">Saíram sem proposta</h2>'
            f'<p class="sub">Primeiros contatos do período que alguém tirou do funil, com o motivo. Nada é apagado: dá para voltar.</p></div></div>{corpo}</section>')


def card_acao(nome, sub, s='', ficha=UC + 'fu-ficha-aberta'):
    return (f'<li class="cm-card fu-card"><a href="{ficha}">{nome}</a><small>{sub}</small>{s}'
            f'<button class="btn btn-sec btn-compacto fu-bot" type="button" data-janela="janela-funil">Encerrar sem proposta<span class="sr">: {nome}</span></button></li>')


def funil_barra(total, contrato, andamento, outro, pegou, voltou, atend):
    """Quanto vira contrato em três números e uma barra (opção B, escolhida pela Carol em 21/11/2026)."""
    proposta = contrato + andamento + outro
    sem = pegou + voltou + atend
    assert proposta + sem == total
    pc = lambda a, b: f'{round(100 * a / b)}%' if b else '—'

    def num(n, rot):
        return f'<li class="fb-et"><b class="num">{n}</b><span>{rot}</span></li>'

    def seta(p, rot):
        return (f'<li class="fb-seta"><span class="fb-p num">{p}</span>'
                f'<span class="fb-linha" aria-hidden="true"></span><span class="fb-sr">{rot}</span></li>')
    linha = (f'<ol class="fb-nums" aria-label="Funil de 20/08 a 18/11/2026">'
             + num(total, 'primeiros contatos') + seta(pc(proposta, total), 'receberam proposta')
             + num(proposta, 'receberam proposta') + seta(pc(contrato, proposta), 'fecharam')
             + num(contrato, 'viraram contrato') + '</ol>')
    segs = [('fb-c', contrato), ('fb-a', andamento), ('fb-o', outro), ('fb-np', pegou), ('fb-nv', voltou), ('fb-at', atend)]
    barra = ''.join(f'<span class="{c}" style="flex:{n}"></span>' for c, n in segs if n)
    pess = lambda n, um, varios: f'{n} {um if n == 1 else varios}'
    desc = (f'Dos {total}: {pess(contrato, "virou contrato", "viraram contrato")}, {andamento} com proposta em andamento, '
            f'{pess(outro, "fechou com outro escritório", "fecharam com outro escritório")}'
            + (f', o escritório não pegou {pegou}, {pess(voltou, "não voltou", "não voltaram")} e {atend} ainda em atendimento.' if sem else '. Ninguém saiu sem proposta.'))
    grupos = f'<span style="flex:{proposta}">receberam proposta · {proposta}</span>' + (f'<span style="flex:{sem}">sem proposta · {sem}</span>' if sem else '')
    leg = lambda c, n, t: f'<li><span class="fb-m {c}" aria-hidden="true"></span><b class="num">{n}</b><span>{t}</span></li>'
    if sem:
        sai = (f'<ul>{leg("fb-np", pegou, "o escritório não pegou o caso")}{leg("fb-nv", voltou, "o cliente não voltou")}'
               f'{leg("fb-at", atend, "ainda em atendimento, sem motivo")}</ul>'
               + (f'<p class="fb-marcar"><a class="fu-link" href="#t-ag">marcar o motivo</a></p>' if atend else ''))
    else:
        sai = '<p class="fb-nada">Ninguém no período. Todo primeiro contato recebeu proposta.</p>'
    return (f'<div class="cm-funil fb">{linha}'
            f'<div class="fb-onde"><h3 class="fb-tit">Onde os {total} pararam</h3>'
            f'<div class="fb-barra" role="img" aria-label="{desc}">{barra}</div>'
            f'<div class="fb-grupos" aria-hidden="true">{grupos}</div>'
            '<div class="fb-legs">'
            f'<div><p class="fb-g">Receberam proposta</p><ul>{leg("fb-c", contrato, "viraram contrato")}{leg("fb-a", andamento, "proposta em andamento (abaixo)")}{leg("fb-o", outro, "fechou com outro escritório" if outro == 1 else "fecharam com outro escritório")}</ul></div>'
            f'<div><p class="fb-g">Saíram sem proposta</p>{sai}</div>'
            '</div></div></div>')


def funil_pend(v='base', extra=''):
    marcado = v == 'marcado'
    vazio = v == 'vazio'

    if vazio:
        forma = funil_barra(14, 9, 4, 1, 0, 0, 0)
    else:
        forma = funil_barra(24, 9, 4, 1, 5, 4 if marcado else 3, 1 if marcado else 2)
    conv = (f'<section class="folha" aria-labelledby="t-cv"><div class="folha-cab"><div><h2 id="t-cv">Quanto vira contrato</h2>'
            f'<p class="sub">Primeiros contatos de 20/08 a 18/11/2026 e o que aconteceu com cada um.</p></div><div class="acoes">{CM.periodo_chips()}</div></div>'
            f'{forma}</section>')

    def col(tit, n, desc, cards, cls='cm-coluna'):
        return (f'<div class="{cls}"><h3>{tit} <span class="disco" aria-hidden="true"><span>{n}</span></span><span class="sr">: {n}</span></h3>'
                f'<p>{desc}</p><ul>{cards}</ul></div>')
    if vazio:
        prim = col('Primeiro contato', 0, 'Atendido, ainda sem proposta enviada.', '<li class="fu-vazio">Ninguém esperando proposta. Cada primeiro contato já recebeu proposta ou saiu do funil com o motivo.</li>')
    elif marcado:
        prim = col('Primeiro contato', 1, 'Atendido, ainda sem proposta enviada.', card_acao('Marcos Vinícius Duarte', 'Proposta em rascunho · Marina', selo('neutro', 'Rascunho')))
    else:
        prim = col('Primeiro contato', 2, 'Atendido, ainda sem proposta enviada.',
                   card_acao('Marcos Vinícius Duarte', 'Proposta em rascunho · Marina', selo('neutro', 'Rascunho'))
                   + card_acao('Eduardo Nascimento', 'Atendido em 04/11 · sem próximo contato', selo('atencao', 'Sem retorno marcado', 'relogio')))
    card = CM.card
    cols = (f'<section class="folha" aria-labelledby="t-ag" style="overflow:hidden" id="t-ag-s"><div class="folha-cab"><div><h2 id="t-ag">Agora no funil</h2>'
            f'<p class="sub">Ninguém arrasta cartão: a etapa sai do que foi registrado. Quem não vai receber proposta sai com “Encerrar sem proposta”.</p></div></div><div class="cm-colunas">'
            + prim
            + col('Proposta enviada', 1, 'Esperando a resposta do cliente.', card('Daniela Rocha Mendes', 'P-2026-015 · R$ 1.500,00 + 20%', selo('urgente', 'retorno vencido', 'alerta')))
            + col('Em negociação', 2, 'O cliente pediu mudança.',
                  card('Gabriela Teixeira', 'P-2026-016 · R$ 4.000,00', selo('atencao', 'retorno hoje', 'relogio')) + card('Construtora Vale Alto', 'P-2026-013 · R$ 2.500,00 por mês', ''))
            + col('Aceita', 1, 'Falta criar ou assinar o contrato.', card('Benedito Souza Lima', 'P-2026-014 · assina em 20/11', ''))
            + col('Contrato no período', 9, 'Os 3 mais recentes.',
                  card('Antônia Ferreira Prado', 'C-2026-031 · 28/10') + card('Hélio Batista Corrêa', 'C-2026-022 · 06/10') + card('Irene Castro', 'C-2026-021 · 30/09'), 'cm-coluna cm-fim')
            + '</div></section>')
    oab = (f'<aside class="cm-oab" aria-label="Regra da OAB">{ico("escudo")}<div><b>Funil de quem já procurou o escritório.</b> O T3jus não faz anúncio, envio em massa nem lista de contatos comprada, '
           f'e não conta pontos de “chance de fechar”. A publicidade da advocacia segue o Provimento 205/2021 da OAB.</div></aside>')
    return (f'<div class="hn"><div class="pt-cab"><div><p class="sobretitulo">Comercial</p><h1>Funil</h1><span class="fio" aria-hidden="true"></span></div></div>'
            f'{conv}{cols}{folha_sairam(v)}{oab}</div>{extra}')


def atendimentos_pend():
    a = CM.atendimentos()
    alvo = '<p>Ninguém marcou quando falar de novo.</p>'
    assert alvo in a
    return a.replace(alvo, alvo + f'<button class="btn btn-sec btn-compacto fu-bot2" type="button" data-janela="janela-funil">{ico("pessoa-menos")}Encerrar sem proposta<span class="sr">: Eduardo Nascimento</span></button>', 1)


# ---------------------------------------------------------------- ficha do cliente (Eduardo)
def ficha_eduardo(v='aberta', extra=''):
    c = dict(nome='Eduardo Nascimento', tp='PF', desde='04/11/2026')
    if v == 'larissa':
        d = CL.dir_proc(2, 7, 'CPF, RG e mais 3')
    elif v == 'aberta':
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-prox"><p class="sobretitulo" id="t-prox">Próximo contato</p>'
             f'<p class="grande" style="font-size:30px">Nenhum</p><p class="cl-oque">Atendido em 04/11 e ninguém marcou quando falar de novo.</p>'
             f'<button class="btn btn-pri" type="button">{ico("mais")}Registrar atendimento</button></section>')
    else:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-prox"><p class="sobretitulo" id="t-prox">Fora do funil</p>'
             f'<p class="grande" style="font-size:30px">Não voltou</p><p class="cl-oque">Saiu sem proposta hoje, marcado por Marina Ribeiro. Se ele voltar a falar, registre o atendimento.</p>'
             f'<button class="btn btn-pri" type="button">{ico("mais")}Registrar atendimento</button></section>')
    cab = CL.ficha_cab(c, d)
    hist_evs = []
    if v == 'fora':
        hist_evs.append(CL.dia('18/11/2026 · hoje', [f'<li class="cl-novo"><time>10h20</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> tirou Eduardo do funil<span class="selo selo-ativo">Novo</span></p>'
                                                    f'<small>Motivo: o cliente não voltou</small><span class="cl-resumo">“Liguei em 10/11 e 13/11, sem resposta.”</span></div></li>']))
    hist_evs.append(CL.dia('04/11/2026', [CL.ev('15h30', 'Marina Ribeiro', 'presencial', 'Eduardo Nascimento',
                                               'Passou no escritório. Quer saber se tem direito à revisão da aposentadoria. Ficou de trazer a carta de concessão.')]))
    hist = (f'<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hist">Histórico de atendimento</h2>'
            f'<p class="sub">Cada conversa com o cliente: quando, por onde, quem atendeu e o combinado. Nada aqui é apagado.</p></div></div>{"".join(hist_evs)}</section>')
    if v == 'aberta':
        fun = (f'<div class="pd-corpo"><p class="fu-est">{selo("atencao", "Primeiro contato, sem proposta", "relogio")}</p>'
               f'<p>Atendido em 04/11. Se o escritório não vai fazer proposta, diga por quê: o Funil conta.</p>'
               f'<button class="btn btn-sec" type="button" data-janela="janela-funil">{ico("pessoa-menos")}Encerrar sem proposta</button></div>')
    else:
        fun = (f'<dl class="pd-ro"><div><dt>Situação</dt><dd>Saiu sem proposta<small>o cliente não voltou</small></dd></div>'
               f'<div><dt>Marcado por</dt><dd>Marina Ribeiro<small>hoje, às 10h20</small></dd></div></dl>'
               f'<div class="pd-corpo"><button class="btn btn-sec" type="button" data-janela="janela-voltar">{ico("trocar")}Voltar ao funil</button></div>')
    f_fun = (f'<section class="folha" aria-labelledby="t-fun"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-fun" style="font-size:20px">No funil do Comercial</h2></div></div>{fun}</section>')
    origem = (f'<section class="folha" aria-labelledby="t-org"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-org" style="font-size:20px">Origem</h2></div></div>'
              f'<dl class="cl-origem"><div><dt>Como chegou</dt><dd>Passou no escritório</dd></div><div><dt>Primeiro contato</dt><dd>04/11/2026, presencial</dd></div><div><dt>Cadastrado por</dt><dd>Marina Ribeiro</dd></div></dl></section>')
    if v == 'larissa':
        nota = (f'<section class="folha" aria-labelledby="t-semc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-semc" style="font-size:20px">Atendimentos</h2></div></div>'
                f'<p class="pt-pe-folha" style="border-top:0">{ico("cadeado")}<span>O histórico de atendimento, a origem e o funil ficam na área Comercial, que não está liberada para você. Quem libera é Marina Ribeiro, a sócia dona.</span></p></section>')
        dados = (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2><p class="sub">O que vai na procuração e no contrato.</p></div></div>'
                 f'<dl class="dados-ficha"><div class="inteira"><dt>Nome completo</dt><dd>Eduardo Nascimento</dd></div><div><dt>Telefone</dt><dd class="num">(11) 96214-3307</dd></div></dl></section>')
        return f'<div class="cl">{cab}{CL.abas("ficha", comercial=False)}{CL.grade_ficha(dados, nota)}</div>'
    return f'<div class="cl">{cab}{CL.abas("atendimentos", 1)}{CL.grade_ficha(hist, f_fun + origem)}</div>{extra}'


CSS_FU = r"""
/* Quanto vira contrato: três números e uma barra (opção B, escolha da Carol em 21/11) */
.fb-nums{list-style:none;margin:6px 0 0;padding:0;display:flex;align-items:flex-start;gap:0}
.fb-et{display:flex;flex-direction:column;gap:2px;min-width:0}
.fb-et b{font-family:var(--serifa);font-size:48px;font-weight:600;color:var(--vinho);line-height:1}
.fb-et span{font-size:13px;color:var(--texto-2)}
.fb-seta{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 18px 0;min-width:0}
.fb-p{font-size:15px;font-weight:600;color:var(--vinho-2)}
.fb-linha{display:block;width:100%;height:1px;background:var(--vinho-4);position:relative}
.fb-linha::after{content:"";position:absolute;right:-1px;top:-4px;border-left:7px solid var(--vinho-4);border-top:4.5px solid transparent;border-bottom:4.5px solid transparent}
.fb-sr{font-size:12px;color:var(--texto-2)}
.fb-onde{margin-top:24px;padding-top:16px;border-top:1px solid var(--divisor)}
.fb-tit{font-family:var(--fonte-texto);font-size:13px;font-weight:500;margin:0 0 10px;color:var(--texto)}
.fb-barra{display:flex;gap:2px;height:22px}
.fb-barra span:first-child{border-radius:3px 0 0 3px}.fb-barra span:last-child{border-radius:0 3px 3px 0}
.fb-c{background:var(--vinho)}.fb-a{background:var(--vinho-4)}.fb-o{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.fb-np{background:var(--marca-ambar)}.fb-nv{background:var(--marca-ambar-2)}
.fb-at{background:repeating-linear-gradient(135deg,var(--marca-ambar) 0 2px,var(--papel) 2px 6px);box-shadow:inset 0 0 0 1.5px var(--marca-ambar)}
.fb-grupos{display:flex;gap:2px;margin-top:6px;font-size:12px;color:var(--texto-2)}
.fb-grupos span{border-top:1px solid var(--vinho-4);padding-top:4px}
.fb-grupos span+span{text-align:right}
.fb-legs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 32px;margin-top:16px}
.fb-g{margin:0 0 6px;font-size:13px;font-weight:500}
.fb-legs ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.fb-legs li{display:grid;grid-template-columns:14px 24px minmax(0,1fr);gap:8px;align-items:center;font-size:13px;color:var(--texto-2)}
.fb-legs li b{color:var(--texto);font-weight:600;text-align:right}
.fb-m{width:14px;height:14px;border-radius:3px;display:block}
.fb-marcar{margin:4px 0 0 46px;font-size:13px}
.fb-marcar .fu-link{margin-left:0}
.fb-nada{margin:0;font-size:13px;color:var(--texto-2)}
.fb.cm-funil{padding-top:4px}
@media (max-width:760px){
  .fb-et{flex:1}
  .fb-et b{font-size:34px}
  .fb-et span{font-size:12px;line-height:1.35}
  .fb-seta{flex:none;width:52px;padding:6px 6px 0}
  .fb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .fb-legs{grid-template-columns:1fr}
}
.cm-card>a{display:inline-flex;align-items:center;min-height:24px}
.fi-ref{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);border:1px solid var(--vinho-4);font-size:13px;line-height:1.5}
.fi-ref .ico{color:var(--vinho);flex:none;margin-top:1px}
.fi-ref b{font-weight:600}
.janela .opcao{margin:0}
.fi-grupo-op{border:0;margin:0;padding:0;min-width:0;display:grid;gap:4px}
.fi-grupo-op legend{padding:0;margin-bottom:6px;font-size:13px;font-weight:500}
/* ===== Funil: encerrar sem proposta (fu-) ===== */
.fu-card{padding-bottom:12px}
.fu-bot{position:relative;z-index:1;margin-top:6px;width:100%;justify-content:center;font-size:13px}
.fu-bot2{margin-top:8px}
.fu-link{font-weight:500;margin-left:6px;display:inline-flex;align-items:center;min-height:24px}
.fu-vazio{font-size:12px;color:var(--texto-2);line-height:1.45;padding:10px 12px;border:1px dashed var(--vinho-4);border-radius:var(--raio)}
.fu-sairam{list-style:none;margin:0;padding:0}
.fu-sairam li{display:grid;grid-template-columns:minmax(0,1fr) 200px auto;gap:12px 16px;align-items:center;padding:12px 24px;border-top:1px solid var(--divisor)}
.fu-sairam li:first-child{border-top:0}
.fu-s-quem a{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);text-decoration:none;display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -8px}
.fu-s-quem a:hover{text-decoration:underline}
.fu-s-quem small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.fu-nota{font-style:italic}
.fu-alvo{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2)}
.fu-alvo .ico{color:var(--vinho);flex:none;margin-top:2px}
.fu-alvo strong{display:block;font-weight:500}
.fu-alvo small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.fu-est{margin:0}
@media (max-width:760px){
  .fu-sairam li{grid-template-columns:minmax(0,1fr);padding:12px 16px}
  .fu-sairam li .btn{width:100%}
}
"""

# ---------------------------------------------------------------- estados: Comercial
A = lambda sec, trilha, titulo: dict(area='comercial', secao=sec, atual='comercial', trilha=trilha, titulo=titulo)
T = ''
T += tpl('fu-funil', funil_pend() + j_funil('fechada') + j_voltar(), **A('Funil', 'Comercial|Funil', 'Funil'))
T += tpl('fu-marcar', funil_pend() + j_funil('abrir') + j_voltar(), **A('Funil', 'Comercial|Funil', 'Encerrar sem proposta'))
T += tpl('fu-erros', funil_pend() + j_funil('erros') + j_voltar(), **A('Funil', 'Comercial|Funil', 'Encerrar sem proposta'))
T += tpl('fu-falha', funil_pend() + j_funil('falha') + j_voltar(), **A('Funil', 'Comercial|Funil', 'Encerrar sem proposta'))
T += tpl('fu-marcado', funil_pend('marcado', extra=toast_desfazer('Eduardo Nascimento saiu do funil.', 'Motivo: o cliente não voltou. Ele passou a contar em “não voltaram”.', 'Desfazer', U + 'fu-funil'))
         + j_funil('fechada') + j_voltar(), **A('Funil', 'Comercial|Funil', 'Funil'))
T += tpl('fu-voltar', funil_pend('marcado') + j_funil('fechada') + j_voltar(True), **A('Funil', 'Comercial|Funil', 'Voltar ao funil'))
T += tpl('fu-vazio', funil_pend('vazio') + j_funil('fechada') + j_voltar(), **A('Funil', 'Comercial|Funil', 'Funil'))
T += tpl('fu-atendimentos', atendimentos_pend() + j_funil('fechada'), **A('Atendimentos', 'Comercial|Atendimentos', 'Atendimentos'))
out = injetar(CM.out, T, CSS_FU, padrao='fu-funil')
# O estado aprovado "funil" também troca os trapézios pela forma nova (escolha da Carol em 21/11/2026).
_f = CM.funil()
_i = _f.index('<div class="cm-funil">')
_j = _f.index('</section>', _i)
assert out.count(_f[_i:_j]) == 1
out = out.replace(_f[_i:_j], funil_barra(24, 9, 4, 1, 5, 3, 2), 1)
out = out.replace(f'href="{U}funil"', f'href="{U}fu-funil"').replace(f'href="{U}atendimentos"', f'href="{U}fu-atendimentos"')
out = out.replace('href="../portal-clientes/clientes.html?estado=atendimentos">Eduardo Nascimento', f'href="{UC}fu-ficha-aberta">Eduardo Nascimento')
open(os.path.join(SAIDA, 'comercial.html'), 'w', encoding='utf-8').write(out)
print('comercial + funil ok', T.count('<template data-est='), 'estados novos')

# ---------------------------------------------------------------- estados: ficha do cliente
FC = dict(atual='clientes', trilha='Clientes|Eduardo Nascimento', titulo='Eduardo Nascimento', aba='atendimentos')
T2 = ''
T2 += tpl('fu-ficha-aberta', ficha_eduardo('aberta') + j_funil('fechada') + j_voltar(), **FC)
T2 += tpl('fu-ficha-marcar', ficha_eduardo('aberta') + j_funil('abrir') + j_voltar(), **FC)
T2 += tpl('fu-ficha', ficha_eduardo('fora') + j_funil('fechada') + j_voltar(), **FC)
T2 += tpl('fu-ficha-larissa', ficha_eduardo('larissa'), quem='juridico', **dict(FC, aba='ficha'))
out2 = injetar(CL.out, T2, CSS_FU, padrao='fu-ficha-aberta')
out2 = out2.replace(f'href="{U}fu-marcado"', f'href="{UC}fu-ficha"').replace(f'href="{U}fu-funil">{ico("trocar")}Voltar ao funil', f'href="{UC}fu-ficha-aberta">{ico("trocar")}Voltar ao funil')
open(os.path.join(SAIDA, 'clientes.html'), 'w', encoding='utf-8').write(out2)
print('clientes + funil ok', T2.count('<template data-est='), 'estados novos')
