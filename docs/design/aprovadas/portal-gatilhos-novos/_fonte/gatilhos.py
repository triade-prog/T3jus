# Portal · Conversas › Automações: dois gatilhos novos, "Cliente novo" e "Documento pendente" (PA-06, sobre PA-03).
# Parte do desenho aprovado de Automações sem mudança: o automacoes.py aprovado é lido até o começo dos estados
# (todas as peças au- e o CSS cv-), com o comum.py e o extra.py também sem mudança. Peças novas com prefixo gn-.
# Uso: python3 gatilhos.py <pasta-saida>
import os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(AQUI, 'automacoes.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ---------------------------------------------------------------- estados')]
__file__ = os.path.join(AQUI, 'automacoes.py')
exec(compile(_src, 'automacoes.py', 'exec'), globals())

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
G = 'gatilhos.html?estado='
JU = 'juridico-lembrete.html?estado=ficha'

CSS_GN = r"""
/* ==========================================================================
   Gatilhos novos (PA-06). Prefixo gn-.
   ========================================================================== */
.gn-ramos2{grid-template-columns:repeat(2,minmax(0,1fr))}
.gn-ramos2::before{left:calc((100% - 14px)/4);right:calc((100% - 14px)/4)}
.gn-novo{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:11px;background:var(--ambar-3);color:var(--vinho);font-size:11px;font-weight:600;letter-spacing:.04em;margin-left:8px;vertical-align:2px}
.gn-tipos{display:grid;gap:14px}
.gn-tipos fieldset{border:0;margin:0;padding:0;min-width:0}
.gn-tipos legend{padding:0;margin-bottom:6px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.gn-tipos ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.gn-tipos label{display:grid;grid-template-columns:auto 30px minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel);cursor:pointer;min-height:44px}
.gn-tipos label:hover{background:#FCF8F5}
.gn-tipos label:has(input:checked){border-color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho);background:#FFFBF8}
.gn-tipos .marcar{margin-top:6px}
.gn-tipos b{display:block;font-weight:600;font-size:13.5px;line-height:1.35}
.gn-tipos small{display:block;font-size:12.5px;color:var(--texto-2);line-height:1.45}
.gn-tipos .au-ic{margin-top:1px}
.gn-tipos .gn-novo-l .au-ic{background:var(--ambar);color:var(--tinta)}
.gn-regras{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.gn-regras li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;font-size:13px;line-height:1.45}
.gn-regras .ico{width:16px;height:16px;color:var(--vinho);margin-top:2px}
.gn-regras b{font-weight:600}
.gn-regras small{display:block;font-size:12px;color:var(--texto-2)}
.gn-campos{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.gn-campos li{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:12.5px;line-height:1.45;align-items:baseline}
.gn-campos code{font:inherit;font-weight:600;color:var(--vinho);background:var(--sal-2);border-radius:6px;padding:2px 8px;justify-self:start;font-variant-numeric:tabular-nums}
.gn-campos span{color:var(--texto-2)}
.au-bl-corpo .x-ops-l{grid-template-columns:minmax(0,1fr)}
.gn-dias{display:flex;align-items:center;gap:10px;margin:10px 0 0;flex-wrap:wrap}
.gn-dias .entrada{width:92px}
.gn-dias span{font-size:13px}
.gn-cam{display:flex;flex-wrap:wrap;gap:6px}
.gn-grupo{font-size:12px;color:var(--texto-2);margin:0}
.gn-ju-auto{display:flex;align-items:flex-start;gap:6px;margin:4px 0 0;font-size:12px;line-height:1.45;color:var(--texto-2)}
.gn-ju-auto .ico{width:14px;height:14px;color:var(--vinho-2);flex:none;margin-top:2px}
.gn-ju-auto b{font-weight:500;color:var(--texto)}
.gn-ju-auto a{color:var(--vinho);font-weight:500}
.au-quem-l .gn-ja{grid-column:1/-1;justify-self:start}
@media (max-width:760px){
  .gn-campos li{grid-template-columns:minmax(0,1fr)}
  .gn-dias{margin-left:0}
}
"""


# ---------------------------------------------------------------- peças
def passos_gn(atual, montar, bloq_testar='', bloq_ligar='', ro=False):
    itens = [('montar', '1', 'Montar', montar), ('testar', '2', 'Testar', 'Sem enviar nada'),
             ('ligar', '3', 'Ligar', 'Revisar e ligar'), ('historico', '4', 'Histórico', '')]
    h = ''
    for k, n, nome, sub in itens:
        b = bloq_testar if k == 'testar' else bloq_ligar if k == 'ligar' else ('Ainda nada saiu' if k == 'historico' else '')
        if b:
            h += f'<li><span class="bloq" role="link" aria-disabled="true"><span class="disco"><span>{n}</span></span><span><strong>{nome}</strong><small>{b}</small></span></span></li>'
            continue
        cur = ' aria-current="step"' if k == atual else ''
        h += f'<li><a href="{G}{atual}"{cur}><span class="disco"><span>{n}</span></span><span><strong>{nome}</strong><small>{sub}</small></span></a></li>'
    return f'<nav aria-label="Passos da automação"><ol class="au-passos">{h}</ol></nav>'


def legenda(erros=False):
    return (f'<div class="au-ferr"><div class="au-leg" aria-label="Legenda"><span><i aria-hidden="true"></i>Contorno contínuo: salvo no rascunho</span>'
            f'<span><i class="t" aria-hidden="true"></i>Tracejado: sugerido pela IA, ainda não salvo</span>'
            + ('<span><i class="e" aria-hidden="true"></i>Filete: precisa de ajuste</span>' if erros else '') +
            f'</div><button class="btn btn-sec so-pc" type="button">{ico("mais")}Adicionar passo</button></div>')


def tela_desenho(fluxo, topo='', erros=False):
    return (f'<section class="folha" aria-labelledby="t-des" style="overflow:hidden"><h2 class="sr" id="t-des">Desenho do fluxo</h2>{topo}{legenda(erros)}'
            f'<div class="au-tela">{fluxo}</div>'
            f'<p class="au-tela-pe">{ico("celular")}<span class="so-cel">No celular dá para aplicar e recusar sugestões, aprovar o texto e ligar. Para adicionar, mover ou apagar passos, use o computador.</span>'
            f'<span class="so-pc-i">O desenho também é uma lista: leitores de tela leem os passos em ordem, com os caminhos de cada ramo.</span></p></section>')


def campos_lista(itens):
    return '<ul class="gn-campos">' + ''.join(f'<li><code>{{{c}}}</code><span>{t}</span></li>' for c, t in itens) + '</ul>'


def regras(itens):
    return '<ul class="gn-regras">' + ''.join(f'<li>{ico(i)}<span>{t}</span></li>' for i, t in itens) + '</ul>'


def rot(t):
    return f'<p class="au-rot-p">{t}</p>'


def painel(sobre, titulo, corpo, pe, voltar):
    return (f'<section class="folha au-as" aria-labelledby="pn-t"><a class="au-voltar-cel" href="{voltar}">{ico("esq", "ico ico-s")}Voltar ao fluxo</a>'
            f'<div class="folha-cab"><div><p class="sobretitulo">{sobre}</p><h2 id="pn-t">{titulo}</h2></div>'
            f'<a class="btn btn-fantasma" href="{voltar}" aria-label="Fechar a edição do passo">{ico("x")}</a></div>'
            f'<form class="au-bl-corpo" action="#" onsubmit="return false">{corpo}</form>'
            f'<div class="au-bl-pe">{pe}</div></section>')


def ramos(lis, sug=False, aria='Caminhos depois do passo 5'):
    return f'<ul class="au-ramos gn-ramos2{" sug" if sug else ""}" aria-label="{aria}">{lis}</ul>' if lis.count('<li><span class="au-rot">') == 2 else f'<ul class="au-ramos{" sug" if sug else ""}" aria-label="{aria}">{lis}</ul>'


def ramo(icone, t, conteudo):
    return f'<li><span class="au-rot">{ico(icone)}{t}</span><ol class="au-fluxo">{conteudo}</ol></li>'


# ---------------------------------------------------------------- Cliente novo
NOME_BV = 'Boas-vindas ao cliente novo'
CAMPOS_BV = [('nome', 'o primeiro nome de quem recebe'), ('quem atende', 'quem cuida do cliente; no exemplo, Diego Almeida'),
             ('horário de atendimento', 'o horário do WhatsApp do escritório: “de segunda a sexta, das 9h às 18h”'),
             ('nome do escritório', 'Ribeiro & Matos')]
MSG_BV = ('Olá, {nome}. Seja bem-vindo ao escritório Ribeiro & Matos. Este é o nosso WhatsApp: pode salvar o número. '
          'Quem vai cuidar do seu atendimento é {quem atende}. Atendemos {horário de atendimento}. Sempre que tiver uma dúvida, é só escrever aqui.')


def fluxo_bv(modo):
    """modo: novo (rascunho recém-criado), sugestao, erros"""
    sug = modo == 'sugestao'
    sel_g = modo == 'novo'
    b1 = bloco('b-gatilho', 1, 'Gatilho', 'pessoa-mais', 'Vira cliente do escritório',
               det('Vem de Clientes: primeira proposta aceita ou primeiro contrato assinado. Sai <b>no mesmo dia</b>.'), 'gatilho', sel=sel_g)
    if modo == 'novo':
        b2 = bloco('b-msg', 2, 'Mensagem', 'whats', 'Mensagem nova', det('<b>Texto:</b> ainda não escrito.'), 'mensagem')
        return (f'<ol class="au-fluxo" aria-label="Passos da automação, de cima para baixo">{li(b1)}{li(b2)}{fim()}</ol>')
    b2 = bloco('b-cond', 2, 'Condições', 'filtro', 'Só quem pode receber',
               f'<ul class="au-cond"><li>{ico("check")}<span>Contato principal tem WhatsApp</span></li>'
               f'<li>{ico("cadeado")}<span>Importados da planilha e reativados ficam de fora (regra fixa)</span></li>'
               f'<li>{ico("cadeado")}<span>Quem pediu para não receber avisos fica de fora (regra fixa)</span></li></ul>', 'condicao')
    txt = MSG_BV.replace('{quem atende}', '{quem atende}. Para mandar documentos, use {documentos}') if modo == 'erros' else MSG_BV
    b3 = bloco('b-msg', 3, 'Mensagem', 'whats', 'Boas-vindas',
               (f'<p class="au-cita">“…Quem vai cuidar do seu atendimento é {{quem atende}}. Para mandar documentos, use <b>{{documentos}}</b>…”</p>' if modo == 'erros' else f'<p class="au-cita">“{H(txt[:122])}…”</p>')
               + det('<b>Texto:</b> rascunho da IA, falta você aprovar. Sai das 8h às 20h, em dia útil.'),
               'mensagem', sug=sug,
               erro=('O campo {documentos} não existe para este gatilho. Cliente novo tem: {nome}, {quem atende}, {horário de atendimento} e {nome do escritório}.' if modo == 'erros' else ''))
    b4 = bloco('b-espera', 4, 'Espera', 'espera', 'Esperar até 2 dias', det('Segue antes se o cliente responder.'), 'espera', sug=sug)
    b5 = bloco('b-ramo', 5, 'Ramos', 'ramo', 'O cliente respondeu?', det('Dois caminhos. Boas-vindas não tem “pagou”.'), 'ramo', sug=sug)
    b6 = bloco('b-ia', 6, 'IA responde', 'ia', 'A IA conversa com o cliente',
               det('Só com o que está no T3jus: horário, endereço, quem atende. Dúvida sobre o caso ou valores vai para quem atende.'), 'ia', sug=sug)
    r = ramo('conversas', 'Se respondeu', li(b6, sug) + fim()) + ramo('relogio', 'Não respondeu', fim('Fim · nada mais sai'))
    return (f'<ol class="au-fluxo" aria-label="Passos da automação, de cima para baixo">{li(b1)}{li(b2)}{li(b3, sug)}{li(b4, sug)}'
            f'<li class="au-li-ramo{" sug" if sug else ""}">{b5}{ramos(r, sug)}</li></ol>')


def tela_bv_gatilho():
    corpo = (f'<p class="au-det">Vem de Clientes: quando alguém passa a ser cliente do escritório. Cada cliente recebe as boas-vindas uma vez só, mesmo que feche outro contrato depois.</p>'
             + opcoes_radio('gt-conta', 'Conta como cliente novo quando', [
                 ('fechou', 'Aceita a primeira proposta ou assina o primeiro contrato', 'Recomendado. Quem só veio para uma consulta e não fechou não recebe.'),
                 ('cadastro', 'É cadastrado em Clientes', 'Inclui quem só fez o primeiro atendimento e ainda não fechou.')], 'fechou')
             + '<fieldset class="x-ops"><legend>Quando sai</legend><div class="x-ops-l">'
               '<label class="opcao"><input class="marcar" type="radio" name="gt-qd" value="0" checked><span>No mesmo dia<small>Recomendado. Fora das 8h às 20h ou em fim de semana, sai no próximo dia útil, às 8h.</small></span></label>'
               '<label class="opcao"><input class="marcar" type="radio" name="gt-qd" value="n"><span>Alguns dias depois<small>Para dar tempo de a equipe ligar antes.</small></span></label>'
               '</div><div class="gn-dias"><label for="gt-dias" class="sr">Quantos dias depois</label><input class="entrada" id="gt-dias" type="number" inputmode="numeric" min="1" max="30" value="2" aria-describedby="gt-dias-aj" disabled><span id="gt-dias-aj">dias depois, se escolher “Alguns dias depois” (de 1 a 30)</span></div>'
               '</fieldset>'
             + f'<div class="campo" role="group" aria-labelledby="gt-nunca">{rot("<span id=\"gt-nunca\">Nunca recebem boas-vindas · regra fixa</span>")}' + regras([
                 ('cadeado', '<b>Clientes trazidos pela importação de planilha.</b><small>Já eram do escritório. Na importação de 12/11 vieram 38: nenhum recebe.</small>'),
                 ('cadeado', '<b>Cliente reativado.</b><small>Já recebeu quando entrou da primeira vez.</small>'),
                 ('cadeado', '<b>Quem pediu para não receber avisos automáticos.</b>'),
                 ('cadeado', '<b>Contato principal sem WhatsApp.</b><small>Aparece em “Quem entraria”, com “Corrigir na ficha”.</small>')]) + '</div>'
             + f'<div class="campo" role="group" aria-labelledby="gt-cp">{rot("<span id=\"gt-cp\">Campos que este gatilho tem</span>")}{campos_lista(CAMPOS_BV)}</div>'
             + f'<div class="campo" role="group" aria-labelledby="gt-rm">{rot("<span id=\"gt-rm\">Caminhos possíveis nos Ramos</span>")}'
               f'<div class="gn-cam"><span class="au-rot">{ico("conversas")}Se respondeu</span><span class="au-rot">{ico("relogio")}Não respondeu</span></div>'
               f'<p class="ajuda">Não tem “Se pagou”: boas-vindas não cobra nada.</p></div>'
             + f'<p class="pt-comuns">{ico("pessoas")}<span>Área: <b>Conversas</b>. Toda a equipe vê esta automação, como vê a lista de Clientes. Valores e propostas não entram na mensagem.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Salvar no rascunho</button>'
    pn = painel('Passo 1 · Gatilho', 'Cliente novo', corpo, pe, G + 'cliente-sugestao')
    tela = tela_desenho(fluxo_bv('novo'))
    cab = cab_editor(NOME_BV, 'Automação · criada agora', SIT['rascunho'], 'Salvo às 10:12 · 1 gatilho, 1 mensagem para escrever',
                     f'<span class="btn btn-sec" role="link" aria-disabled="true">{ico("olho")}Testar sem enviar</span>')
    return (f'<div class="au">{cab}{passos_gn("montar", "Gatilho e mensagem", "Escreva a mensagem antes", "Teste antes de ligar")}'
            f'<div class="au-editor largo bloco-aberto"><div class="au-col">{tela}</div><div class="au-col au-lado">{pn}</div></div></div>')


def assistente_bv():
    fez = [('Usei o gatilho <b>Cliente novo</b>: sai no dia em que a proposta é aceita ou o primeiro contrato é assinado.', 'b-gatilho'),
           ('Escrevi o <b>rascunho do texto</b>, com o número, quem atende e o horário. Ele só vale depois que você aprovar.', 'b-msg'),
           ('Se o cliente <b>responder</b> em 2 dias, a IA conversa com o que está no T3jus.', 'b-ia'),
           ('Se <b>não responder</b>, termina: boas-vindas não precisa de ninguém da equipe.', 'b-ramo')]
    al = [('Clientes da <b>importação de planilha</b> e <b>reativados</b> não recebem (regra fixa). Os 38 da importação de 12/11 ficam de fora.', f'<a class="au-mostrar" href="#b-cond">{ico("alvo")}Mostrar no desenho</a>'),
          ('O texto é um <b>modelo novo</b>. Ao ligar, ele vai para aprovação no WhatsApp (Meta), que costuma levar até 1 dia.', f'<a class="au-mostrar" href="#b-msg">{ico("alvo")}Mostrar no desenho</a>')]
    lis = ''.join(f'<li><span class="ok" aria-hidden="true">{ico("check")}</span><div>{t}<br><a class="au-mostrar" href="#{a}">{ico("alvo")}Mostrar no desenho<span class="sr"> o passo citado</span></a></div></li>' for t, a in fez)
    als = ''.join(f'<li class="alerta"><span class="al" aria-hidden="true">!</span><div><span class="sr">Atenção: </span>{t}<br>{a}</div></li>' for t, a in al)
    return (f'<aside class="folha au-as" aria-labelledby="as-t"><div class="au-as-cab"><span class="disco">{ico("ia")}</span><div><p class="sobretitulo">IA do escritório</p><h2 id="as-t">Assistente</h2></div></div>'
            f'<section class="au-as-sec" aria-labelledby="as-p"><h3 id="as-p">Você pediu</h3>'
            f'<p class="au-pedido"><span class="de">Marina Ribeiro · pelo exemplo “Boas-vindas ao cliente novo”</span>Quero dar boas-vindas a quem fechar com a gente, com o nosso horário e quem vai atender.<time>10:04</time></p></section>'
            f'<section class="au-as-sec" aria-labelledby="as-f"><h3 id="as-f">O que a IA fez</h3><ul class="au-fez">{lis}</ul></section>'
            f'<section class="au-as-sec" aria-labelledby="as-a"><h3 id="as-a">Para você decidir · 2</h3><ul class="au-fez">{als}</ul></section>'
            f'<section class="au-as-sec" aria-labelledby="as-e"><h3 id="as-e">Experimente a seguir</h3><div class="au-chips">'
            f'<button type="button">Mandar 2 dias depois, não no mesmo dia</button><button type="button">Incluir o endereço do escritório</button><button type="button">Avisar quem atende quando o cliente responder</button></div></section>'
            f'<form class="au-as-sec au-pedir" action="#" onsubmit="return false"><label class="au-rot-p" for="as-txt">Peça uma mudança</label>'
            f'<textarea class="entrada" id="as-txt" placeholder="Ex.: espere 1 dia em vez de 2"></textarea>'
            f'<button class="btn btn-sec" type="submit">{ico("enviar")}Pedir à IA</button></form>'
            f'<p class="au-as-pe">{ico("escudo")}<span><b>A IA sugere, você aprova.</b> Aplicar muda só o rascunho. Nada sai para cliente antes de testar e você ligar.</span></p></aside>')


def tela_bv_sugestao():
    faixa = (f'<div class="au-faixa" role="region" aria-label="Sugestões da IA">{ico("ia")}<p><b>4 passos sugeridos pela IA</b>: revise antes de aplicar. Você também pode aplicar ou recusar um por um.</p>'
             f'<div class="bts"><button class="btn btn-sec" type="button">{ico("x")}Recusar tudo</button><button class="btn btn-pri" type="button">{ico("check")}Aplicar tudo</button></div></div>')
    cab = cab_editor(NOME_BV, 'Automação · criada com a IA hoje', SIT['rascunho'], 'Salvo às 10:05 · 2 passos salvos, 4 sugeridos',
                     f'<span class="btn btn-sec" role="link" aria-disabled="true">{ico("olho")}Testar sem enviar</span>')
    return (f'<div class="au">{cab}{passos_gn("montar", "4 sugestões para revisar", "", "Aplique ou recuse as sugestões")}'
            f'<div class="au-editor"><div class="au-col">{tela_desenho(fluxo_bv("sugestao"), faixa)}</div><div class="au-col au-lado">{assistente_bv()}</div></div></div>')


def lista_quem(titulo, sub, entram, fora, pe, n_ent='Entrariam', n_fora='Ficam de fora'):
    le = ''.join(f'<li><strong>{n}</strong>{s or selo("ok", "Entraria", "check")}<small>{d}</small>{a}</li>' for n, d, s, a in entram)
    lf = ''.join(f'<li><strong>{n}</strong>{s or selo("neutro", "Fica de fora")}<small>{d}</small>{a}</li>' for n, d, s, a in fora)
    return (f'<section class="folha" aria-labelledby="t-quem"><div class="folha-cab"><div><h2 id="t-quem">{titulo}</h2><p class="sub">{sub}</p></div></div>'
            f'<p class="au-sub3">{n_ent} · {len(entram)}</p><ul class="au-quem-l">{le}</ul><p class="au-sub3">{n_fora} · {len(fora)}</p><ul class="au-quem-l">{lf}</ul>'
            f'<p class="pt-pe-folha">{ico("ajuda")}<span>{pe}</span></p></section>')


def simulacao(ctl, caminho, msgs):
    cam = ''.join(f'<li class="r"><span>{ico(i)}{t}</span></li>' for i, t in caminho)
    return (f'<section class="folha" aria-labelledby="t-sim" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-sim">Simular sem enviar</h2><p class="sub">Escolha um cliente e o que ele faria. Nada sai pelo WhatsApp.</p></div></div>'
            f'<form class="au-sim-ctl" action="#" onsubmit="return false">{ctl}</form>'
            f'<p class="au-simfaixa">{ico("olho")}<span><b>Simulação.</b> Esta conversa não foi enviada. Os horários seguem os limites: 8h às 20h, em dia útil.</span></p>'
            f'<ol class="au-caminho" aria-label="Caminho percorrido no fluxo">{cam}</ol><ol class="cv-msgs" aria-label="Conversa simulada">{msgs}</ol></section>')


def tela_bv_testar():
    ctl = (selecao('ts-cli', 'Simular com', ['Paulo Henrique Saraiva · proposta aceita em 16/11', 'Mercado Dois Irmãos Ltda. · proposta aceita em 04/11', 'Lúcia Fernandes Barros · contrato assinado em 09/11'],
                   'Paulo Henrique Saraiva · proposta aceita em 16/11', ajuda='Clientes que viraram clientes nos últimos 30 dias.')
           + opcoes_radio('ts-cam', 'E se o cliente', [('resp', 'Responder', ''), ('nada', 'Não responder', '')], 'resp'))
    msgs = (f'<li class="cv-dia">Segunda, 16/11</li>'
            f'<li class="cv-sis">{ico("pessoa-mais")}<span><b>Gatilho:</b> Paulo aceitou a proposta P-2026-031, a primeira dele. Condições conferidas: tem WhatsApp, não veio de importação.<time>16:40</time></span></li>'
            f'<li class="cv-m eq"><div class="cv-b"><span class="de">Aviso automático · Boas-vindas</span>Olá, Paulo. Seja bem-vindo ao escritório Ribeiro &amp; Matos. Este é o nosso WhatsApp: pode salvar o número. '
            f'Quem vai cuidar do seu atendimento é Diego Almeida. Atendemos de segunda a sexta, das 9h às 18h. Sempre que tiver uma dúvida, é só escrever aqui.<time>16:40</time></div></li>'
            f'<li class="cv-m cli"><div class="cv-b"><span class="de">Paulo Henrique Saraiva</span>Obrigado! Qual o endereço de vocês?<time>17:02</time></div></li>'
            f'<li class="cv-m ia"><div class="cv-b"><span class="de">IA do escritório</span>Estamos na Rua Augusta, 1.508, sala 41, em São Paulo. Se quiser marcar uma conversa com o Diego, é só me dizer o melhor dia.<time>17:02</time></div></li>'
            f'<li class="cv-sis">{ico("fim")}<span><b>Fim.</b> A conversa continua em Mensagens, como qualquer outra.<time>17:02</time></span></li>')
    sim = simulacao(ctl, [('pessoa-mais', '1 Gatilho'), ('filtro', '2 Condições'), ('whats', '3 Mensagem'), ('espera', '4 Espera'), ('ramo', 'Se respondeu'), ('ia', '6 IA responde'), ('fim', 'Fim')], msgs)
    entram = [('Paulo Henrique Saraiva', 'Aceitou a proposta em 16/11 · para Paulo, o próprio · atende Diego Almeida', '', ''),
              ('Lúcia Fernandes Barros', 'Contrato assinado em 09/11, sem proposta · atende Marina Ribeiro', '', ''),
              ('Mercado Dois Irmãos Ltda.', 'Aceitou a proposta em 04/11 · para Wagner Dias, sócio · atende Bianca Torres', '', '')]
    fora = [('38 clientes da planilha', 'Vieram pela importação de 12/11. Já eram do escritório.', '', ''),
            ('Roberto Andrade', 'Reativado em 13/11. Já era cliente desde 2025.', '', ''),
            ('Tereza Moura Lima', 'Cadastrada em 17/11, só fez o primeiro atendimento. Entra se aceitar a proposta.', selo('implant', 'Ainda não', 'relogio'), ''),
            ('Vânia Costa Reis', 'O número da ficha é fixo e não tem WhatsApp.', '', f'<a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=ficha">{ico("pessoas")}Corrigir na ficha</a>')]
    quem = lista_quem('Quem teria entrado', 'Se estivesse ligada nos últimos 30 dias: 3 entrariam, 41 ficariam de fora', entram, fora,
                      'Boas-vindas só vale para quem entrar depois de ligar. Quem já é cliente hoje não recebe, nem estes 3.')
    cab = cab_editor(NOME_BV, 'Automação · teste sem enviar', SIT['rascunho'], 'Texto aprovado por Marina às 10:14 · testada às 10:20',
                     f'<a class="btn btn-pri" href="{G}cliente-ligar">{ico("ligar")}Seguir para ligar</a>')
    return f'<div class="au">{cab}{passos_gn("testar", "6 passos, todos salvos")}<div class="au-teste"><div class="au-col">{sim}</div><aside class="au-col" aria-label="Quem entraria">{quem}</aside></div></div>'


def limites(extra):
    return (f'<section class="folha" aria-labelledby="t-lim"><div class="folha-cab"><div><h2 id="t-lim">Limites que valem sempre</h2><p class="sub">Fixos no T3jus; o escritório não afrouxa</p></div></div><ul class="au-lim">'
            f'<li>{ico("relogio")}<span><b>Só das 8h às 20h, em dia útil.</b><small>Fora disso, a mensagem espera o próximo horário. Feriado nacional conta como dia sem envio.</small></span></li>'
            f'{extra}'
            f'<li>{ico("cadeado")}<span><b>Quem pediu para não receber avisos fica de fora.</b><small>O pedido “só cobrança” não tira deste aviso; o pedido “todos” tira.</small></span></li>'
            f'<li>{ico("whats")}<span><b>Texto aprovado por você e pela Meta.</b><small>A IA conversa só depois que o cliente responde, dentro da janela de 24 horas do WhatsApp.</small></span></li></ul></section>')


def depois():
    return (f'<section class="folha" aria-labelledby="t-dep"><div class="folha-cab"><div><h2 id="t-dep">Depois de ligar</h2></div></div>'
            f'<ol class="cv-passos" style="padding:0 24px 22px;margin:0">'
            f'<li><span class="disco"><span>1</span></span><span><b>O texto vai para aprovação no WhatsApp.</b><small>Costuma levar até 1 dia. Nada sai antes.</small></span></li>'
            f'<li><span class="disco"><span>2</span></span><span><b>Aprovado, ela começa sozinha.</b><small>Você recebe um aviso no sino. Se a Meta recusar, volta a rascunho, com o motivo.</small></span></li>'
            f'<li><span class="disco"><span>3</span></span><span><b>Cada execução fica no histórico.</b><small>Por cliente, com o caminho e as falhas.</small></span></li></ol></section>')


def tela_ligar_gn(nome, frase, escolha, extra_lim, voltar):
    conf = (f'<section class="folha" aria-labelledby="t-lg"><div class="folha-cab"><div><h2 id="t-lg">Revise e ligue</h2><p class="sub">Em linguagem simples, o que vai acontecer</p></div></div>'
            f'<p class="au-frase">{frase}</p><form class="au-conf" action="#" onsubmit="return false">{escolha}'
            + marcar('lg-ok', 'Revisei o texto, os caminhos e quem entra', '', False) +
            f'<button class="btn btn-pri" type="submit">{ico("ligar")}Ligar a automação</button>'
            f'<p class="x-pe-nota">{ico("cadeado")}<span>Só Marina Ribeiro, a sócia dona, liga e desliga. Fica no histórico do escritório quem ligou e quando.</span></p></form></section>')
    cab = cab_editor(nome, 'Automação · ligar', SIT['rascunho'], 'Testada às 10:20 · texto aprovado por Marina',
                     f'<a class="btn btn-sec" href="{voltar}">{ico("esq")}Voltar ao teste</a>')
    return (f'<div class="au">{cab}{passos_gn("ligar", "Todos os passos salvos")}<div class="au-grade" style="grid-template-columns:minmax(0,1fr) 380px">'
            f'<div class="au-col">{conf}</div><aside class="au-col" aria-label="Limites e o que acontece depois">{limites(extra_lim)}{depois()}</aside></div></div>')


def tela_bv_ligar():
    frase = ('Todo cliente que <b>aceitar a primeira proposta ou assinar o primeiro contrato</b> recebe, <b>no mesmo dia</b>, uma mensagem de boas-vindas pelo WhatsApp, '
             'com quem vai atender e o horário do escritório. Se responder em 2 dias, <b>a IA conversa</b> com o que está no T3jus. Se não responder, <b>nada mais sai</b>.')
    escolha = (f'<div class="pt-comuns">{ico("pessoas")}<span><b>Quem entra:</b> só quem virar cliente daqui em diante. Quem já é cliente não recebe, '
               f'e importados da planilha e reativados nunca recebem. Cada cliente recebe uma vez só.</span></div>')
    extra = f'<li>{ico("pessoa-mais")}<span><b>Uma boas-vindas por cliente, para sempre.</b><small>Mesmo que feche outro contrato depois ou seja reativado.</small></span></li>'
    return tela_ligar_gn(NOME_BV, frase, escolha, extra, G + 'cliente-testar')


def tela_erros():
    resumo = ('<div style="padding:16px 20px 4px">' + aviso('urgencia', '1 passo precisa de ajuste antes de testar',
              '<a href="#b-msg">Passo 3, Mensagem: campo que o gatilho não tem</a>') + '</div>')
    lado = (f'<aside class="folha au-as" aria-labelledby="as-t"><div class="au-as-cab"><span class="disco">{ico("ia")}</span><div><p class="sobretitulo">IA do escritório</p><h2 id="as-t">Assistente</h2></div></div>'
            f'<section class="au-as-sec" aria-labelledby="as-a"><h3 id="as-a">O que falta · 1</h3><ul class="au-fez">'
            f'<li class="alerta"><span class="al" aria-hidden="true">!</span><div><b>Mensagem com campo que não existe.</b> {{documentos}} é do gatilho Documento pendente. Na boas-vindas ainda não há documento pedido. '
            f'Tire a frase ou crie outra automação, com o gatilho Documento pendente.<br><a class="au-mostrar" href="#b-msg">{ico("alvo")}Mostrar no desenho</a></div></li></ul></section>'
            f'<section class="au-as-sec"><button class="btn btn-sec" type="button">{ico("ia")}Pedir à IA para corrigir</button>'
            f'<a class="btn btn-fantasma" href="{G}doc-gatilho">{ico("doc")}Criar o lembrete de documento</a></section>'
            f'<p class="au-as-pe">{ico("escudo")}<span><b>A IA sugere, você aprova.</b> A correção chega tracejada, como qualquer sugestão.</span></p></aside>')
    cab = cab_editor(NOME_BV, 'Automação · criada com a IA hoje', SIT['rascunho'], 'Salvo às 10:31 · 1 passo com ajuste',
                     f'<span class="btn btn-pri" role="link" aria-disabled="true">{ico("olho")}Testar sem enviar</span>')
    return (f'<div class="au">{cab}{passos_gn("montar", "1 passo para ajustar", "Ajuste o passo 3 antes", "Teste antes de ligar")}'
            f'<div class="au-editor"><div class="au-col">{tela_desenho(fluxo_bv("erros"), resumo, erros=True)}</div><div class="au-col au-lado">{lado}</div></div></div>')


# ---------------------------------------------------------------- Documento pendente
NOME_DOC = 'Lembrete de documento que falta'
CAMPOS_DOC = [('nome', 'o primeiro nome de quem recebe'), ('documentos', 'tudo o que ainda falta deste cliente, numa frase: “carta de indeferimento do INSS e laudo médico atualizado”'),
              ('caso', 'o nome do caso: “Ferreira Prado x INSS”'), ('pedido em', 'a data do pedido mais antigo que ainda falta: “09/11”'),
              ('nome do escritório', 'Ribeiro & Matos')]
MSG_DOC = ('Olá, {nome}. Aqui é do escritório Ribeiro & Matos. Para o caso {caso} andar, ainda falta: {documentos}. Pedimos em {pedido em}. '
           'Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, obrigado e pode desconsiderar esta mensagem.')


def fluxo_doc(modo):
    """modo: novo, aplicado (mensagem aberta)"""
    b1 = bloco('b-gatilho', 1, 'Gatilho', 'doc', 'Documento pendente há 5 dias',
               det('Vem do Jurídico: documento pedido ao cliente no caso, que não chegou em 5 dias. Conta do pedido ou do último “Pedir de novo”.'), 'gatilho', sel=modo == 'novo')
    if modo == 'novo':
        b2 = bloco('b-msg', 2, 'Mensagem', 'whats', 'Mensagem nova', det('<b>Texto:</b> ainda não escrito.'), 'mensagem')
        return f'<ol class="au-fluxo" aria-label="Passos da automação, de cima para baixo">{li(b1)}{li(b2)}{fim()}</ol>'
    b2 = bloco('b-cond', 2, 'Condições', 'filtro', 'Só quem pode receber',
               f'<ul class="au-cond"><li>{ico("check")}<span>Caso em andamento (encerrado sai)</span></li>'
               f'<li>{ico("check")}<span>Contato principal tem WhatsApp</span></li>'
               f'<li>{ico("cadeado")}<span>1 lembrete por semana por cliente, juntando tudo o que falta (regra fixa)</span></li>'
               f'<li>{ico("cadeado")}<span>Quem pediu para não receber nenhum aviso fica de fora (regra fixa)</span></li></ul>', 'condicao')
    b3 = bloco('b-msg', 3, 'Mensagem', 'whats', 'Lembrete de documento',
               f'<p class="au-cita">“{H(MSG_DOC[:118])}…”</p>' + det('<b>Texto:</b> rascunho da IA, falta você aprovar. Sai das 8h às 20h, em dia útil.'), 'mensagem', sel=True)
    b4 = bloco('b-espera', 4, 'Espera', 'espera', 'Esperar até 7 dias', det('Segue antes se o documento chegar ou o cliente responder.'), 'espera')
    b5 = bloco('b-ramo', 5, 'Ramos', 'ramo', 'O que o cliente fez?',
               det('Três caminhos. Se chegou só parte, quem segue é o que ainda falta.'), 'ramo')
    b6 = bloco('b-ia', 6, 'IA responde', 'ia', 'A IA conversa com o cliente',
               det('Agradece e tira dúvida simples. Arquivo que chegar pela conversa vai para quem pediu conferir e marcar “Já chegou”.'), 'ia')
    b7 = bloco('b-pessoa', 7, 'Passar para pessoa', 'mao', 'Passar para quem pediu o documento',
               det('No exemplo, Larissa Costa. Motivo: 7 dias sem o documento nem resposta. Se ela estiver fora ou sair da equipe, vai para quem cuida do caso; sem ninguém, para Marina.'), 'pessoa')
    r = (ramo('check', 'Se chegou', fim('Fim · sai da automação, como a parcela paga'))
         + ramo('conversas', 'Se respondeu', li(b6) + fim())
         + ramo('relogio', 'Nem chegou, nem respondeu', li(b7) + fim()))
    return (f'<ol class="au-fluxo" aria-label="Passos da automação, de cima para baixo">{li(b1)}{li(b2)}{li(b3)}{li(b4)}'
            f'<li class="au-li-ramo">{b5}{ramos(r)}</li></ol>')


def tela_doc_gatilho():
    corpo = (f'<p class="au-det">Vem do Jurídico: o documento que a equipe pediu ao cliente na ficha do caso e que ainda não chegou.</p>'
             + campo('gt-dias', 'Dias depois do pedido, sem chegar', '5', tipo='number', im='numeric', foco=True,
                     ajuda='De 1 a 30. Conta do pedido ou do último “Pedir de novo”, o que for mais novo. Dias corridos; se cair em fim de semana, sai no próximo dia útil, às 8h.',
                     extra=' min="1" max="30" style="width:120px"')
             + f'<div class="campo" role="group" aria-labelledby="gt-como">{rot("<span id=\"gt-como\">Como conta · regra fixa</span>")}' + regras([
                 ('pessoas', '<b>Uma mensagem por cliente, com tudo o que falta.</b><small>Antônia tem 2 documentos faltando: recebe uma mensagem só, com os dois.</small>'),
                 ('relogio', '<b>No máximo 1 lembrete por semana por cliente.</b><small>Soma todas as automações e o “Pedir de novo” da ficha do caso.</small>'),
                 ('check', '<b>Chegou, sai na hora.</b><small>Quando alguém marca “Já chegou” ou envia o arquivo ligado ao pedido. Como a parcela paga.</small>'),
                 ('balanca', '<b>Caso encerrado sai.</b>'),
                 ('cadeado', '<b>Quem pediu para não receber nenhum aviso fica de fora.</b><small>O pedido “só cobrança” não tira: o lembrete de documento sai.</small>')]) + '</div>'
             + f'<div class="campo" role="group" aria-labelledby="gt-cp">{rot("<span id=\"gt-cp\">Campos que este gatilho tem</span>")}{campos_lista(CAMPOS_DOC)}</div>'
             + f'<div class="campo" role="group" aria-labelledby="gt-rm">{rot("<span id=\"gt-rm\">Caminhos possíveis nos Ramos</span>")}'
               f'<div class="gn-cam"><span class="au-rot">{ico("check")}Se chegou</span><span class="au-rot">{ico("conversas")}Se respondeu</span><span class="au-rot">{ico("relogio")}Nem chegou, nem respondeu</span></div></div>'
             + f'<p class="pt-comuns">{ico("balanca")}<span>Área: <b>Jurídico</b>. Só vê e monta quem tem o Jurídico. “Passar para” pode ir para <b>quem pediu o documento</b> ou quem cuida do caso.</span></p>')
    pe = f'<button class="btn btn-sec" type="button">Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Salvar no rascunho</button>'
    pn = painel('Passo 1 · Gatilho', 'Documento pendente', corpo, pe, G + 'doc-mensagem')
    cab = cab_editor(NOME_DOC, 'Automação · criada agora', SIT['rascunho'], 'Salvo às 10:12 · 1 gatilho, 1 mensagem para escrever',
                     f'<span class="btn btn-sec" role="link" aria-disabled="true">{ico("olho")}Testar sem enviar</span>')
    return (f'<div class="au">{cab}{passos_gn("montar", "Gatilho e mensagem", "Escreva a mensagem antes", "Teste antes de ligar")}'
            f'<div class="au-editor largo bloco-aberto"><div class="au-col">{tela_desenho(fluxo_doc("novo"))}</div><div class="au-col au-lado">{pn}</div></div></div>')


def tela_doc_mensagem():
    corpo = (campo('bl-nome', 'Nome do modelo', 'Lembrete de documento', ajuda='Só a equipe vê. Aparece no histórico e em Avisos automáticos.')
             + f'<div class="pt-cuidado">{ico("ia")}<span><b>Rascunho da IA, ainda não vale.</b> Depois que você aprovar, o texto fica fixo: só mudam os campos de cada cliente.</span></div>'
             + f'<div class="campo"><div class="campo-linha"><label for="bl-txt">Texto da mensagem</label><span class="contador" id="bl-cont">{len(MSG_DOC)} de 1.024 caracteres</span></div>'
             f'<textarea class="entrada" id="bl-txt" name="bl-txt" aria-describedby="bl-cont bl-aj" style="min-height:190px" data-foco>{H(MSG_DOC)}</textarea>'
             f'<p class="ajuda" id="bl-aj">{{documentos}} vira a lista do que ainda falta. Se o cliente mandou parte, o próximo lembrete só cita o resto.</p></div>'
             + f'<div class="campo" role="group" aria-labelledby="bl-cp"><p class="au-rot-p" id="bl-cp">Inserir campo · os que o documento pendente tem</p><div class="au-campos">'
             + ''.join(f'<button type="button">{{{c}}}</button>' for c, _ in CAMPOS_DOC) + '</div></div>'
             + f'<div class="campo" role="group" aria-labelledby="bl-pv"><p class="au-rot-p" id="bl-pv">Prévia · como Joana Prado, filha de Antônia Ferreira Prado, veria</p><div class="au-wpp">'
             f'<p class="b"><span class="de">{ico("whats")}Ribeiro &amp; Matos</span>Olá, Joana. Aqui é do escritório Ribeiro &amp; Matos. Para o caso Ferreira Prado x INSS andar, ainda falta: '
             f'carta de indeferimento do INSS e laudo médico atualizado. Pedimos em 09/11. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, obrigado e pode desconsiderar esta mensagem.<time>10:00</time></p>'
             f'<small>Prévia, nada foi enviado. Dois documentos, uma mensagem só.</small></div></div>'
             + aviso('atencao', 'Modelo novo do WhatsApp', 'Ao ligar, este texto vai para aprovação da Meta (costuma levar até 1 dia). Mudar o texto depois pede nova aprovação.', icone='relogio'))
    pe = f'<button class="btn btn-sec" type="button">Salvar no rascunho</button><button class="btn btn-pri" type="button">{ico("check")}Aprovar o texto</button>'
    pn = painel('Passo 3 · Mensagem', 'Editar a mensagem', corpo, pe, G + 'doc-mensagem')
    topo = f'<div style="padding:16px 20px 4px">{aviso("sucesso", "5 passos aplicados", "Estão no rascunho. A automação continua desligada.")}</div>'
    cab = cab_editor(NOME_DOC, 'Automação · criada com a IA hoje', SIT['rascunho'], 'Salvo às 10:09 · 7 passos, texto por aprovar',
                     f'<a class="btn btn-sec" href="{G}doc-testar">{ico("olho")}Testar sem enviar</a>')
    return (f'<div class="au">{cab}{passos_gn("montar", "7 passos, todos salvos")}'
            f'<div class="au-editor largo bloco-aberto"><div class="au-col">{tela_desenho(fluxo_doc("aplicado"), topo)}</div><div class="au-col au-lado">{pn}</div></div></div>')


def tela_doc_testar():
    ctl = (selecao('ts-cli', 'Simular com', ['Carlos Henrique Dias · CTPS digital', 'Joana Pereira · holerites de janeiro a março de 2025', 'Antônia Ferreira Prado · 2 documentos', 'Construtora Vale Alto Ltda. · notificação da Prefeitura'],
                   'Carlos Henrique Dias · CTPS digital', ajuda='Clientes com documento pendente hoje.')
           + opcoes_radio('ts-cam', 'E se o cliente', [('nada', 'Não mandar nem responder', ''), ('resp', 'Responder ou mandar um arquivo', ''), ('chegou', 'O documento chegar', '')], 'nada'))
    msgs = (f'<li class="cv-dia">Hoje, 18/11</li>'
            f'<li class="cv-sis">{ico("doc")}<span><b>Gatilho:</b> a CTPS digital de Carlos foi pedida em 10/11 e não chegou. Condições conferidas: caso em andamento, Carlos tem WhatsApp, nenhum lembrete nesta semana.<time>10:00</time></span></li>'
            f'<li class="cv-m eq"><div class="cv-b"><span class="de">Aviso automático · Lembrete de documento</span>Olá, Carlos. Aqui é do escritório Ribeiro &amp; Matos. Para o caso Pereira x Mercado Bom Preço andar, ainda falta: CTPS digital. '
            f'Pedimos em 10/11. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, obrigado e pode desconsiderar esta mensagem.<time>10:00</time></div></li>'
            f'<li class="cv-dia">Quarta, 25/11</li>'
            f'<li class="cv-sis">{ico("espera")}<span><b>7 dias</b> sem o documento nem resposta.<time>10:00</time></span></li>'
            f'<li class="cv-sis">{ico("mao")}<span>A conversa passaria para <b>Larissa Costa</b>, que pediu o documento. Motivo: 7 dias sem a CTPS digital nem resposta. Ela recebe aviso no sino. A tarefa “Calcular as horas extras de Carlos” continua travada.<time>10:00</time></span></li>')
    sim = simulacao(ctl, [('doc', '1 Gatilho'), ('filtro', '2 Condições'), ('whats', '3 Mensagem'), ('espera', '4 Espera'), ('ramo', 'Nem chegou, nem respondeu'), ('mao', '7 Passar para Larissa'), ('fim', 'Fim')], msgs)
    ja = selo('atencao', 'Já pendente hoje', 'relogio')
    chegou = f'<a class="btn btn-sec gn-ja" href="{JU}">{ico("check")}Já chegou? Marcar no caso</a>'
    entram = [('Carlos Henrique Dias', 'CTPS digital · Pereira x Mercado Bom Preço · pedido em 10/11, há 8 dias · para Carlos', ja, chegou),
              ('Joana Pereira', 'Holerites de janeiro a março de 2025 · mesmo caso · pedido em 12/11, há 6 dias · para Joana', ja, ''),
              ('Antônia Ferreira Prado', '2 documentos numa mensagem só · Ferreira Prado x INSS · pedidos em 09/11 · para Joana Prado, filha. O pedido dela é só de cobrança: este lembrete sai.', ja, ''),
              ('Construtora Vale Alto Ltda.', 'Notificação da Prefeitura · pedido em 14/11 · chega a 5 dias amanhã, 19/11 · para Ricardo Vale, sócio. O combinado no Financeiro só vale para cobrança.', selo('ok', 'Entra amanhã', 'check'), '')]
    fora = [('Roberto Andrade', 'Relatório do médico · Larissa pediu de novo ontem, 17/11. A contagem recomeçou: o lembrete sai na segunda, 23/11, se não chegar.', selo('implant', 'Espera', 'relogio'), '')]
    quem = lista_quem('Quem entraria', '6 documentos faltando, de 5 clientes: 3 já passaram de 5 dias hoje', entram, fora,
                      '“Já pendente hoje” só entra se você escolher isso ao ligar. Antes, vale conferir na ficha do caso se algum já chegou por e-mail ou em mãos.',
                      'Entrariam', 'Ainda não')
    cab = cab_editor(NOME_DOC, 'Automação · teste sem enviar', SIT['rascunho'], 'Texto aprovado por Marina às 10:14 · testada às 10:20',
                     f'<a class="btn btn-pri" href="{G}doc-ligar">{ico("ligar")}Seguir para ligar</a>')
    return f'<div class="au">{cab}{passos_gn("testar", "7 passos, todos salvos")}<div class="au-teste"><div class="au-col">{sim}</div><aside class="au-col" aria-label="Quem entraria">{quem}</aside></div></div>'


def tela_doc_ligar():
    frase = ('Todo documento pedido ao cliente que <b>não chegar em 5 dias</b> gera <b>um lembrete educado</b> pelo WhatsApp, com tudo o que falta daquele cliente numa mensagem só. '
             'Se chegar, <b>sai da automação</b>. Se o cliente responder, <b>a IA conversa</b>. Se em <b>7 dias</b> não chegar nem responder, a conversa <b>passa para quem pediu o documento</b>.')
    escolha = opcoes_radio('lg-quem', 'Quem entra', [
        ('novos', 'Só os pedidos que chegarem a 5 dias daqui em diante', 'Recomendado. A lista de pendentes pode estar desatualizada: algum documento pode ter chegado por e-mail ou em mãos sem ninguém marcar.'),
        ('todos', 'Também os 3 clientes que já passaram de 5 dias hoje', 'Carlos, Joana e Antônia. Saem a partir das 8h de amanhã. Confira antes na ficha do caso.')], 'novos')
    extra = f'<li>{ico("doc")}<span><b>No máximo 1 lembrete de documento por semana por cliente</b>, somando todas as automações e o “Pedir de novo”.<small>Tudo o que falta vai numa mensagem só.</small></span></li>'
    return tela_ligar_gn(NOME_DOC, frase, escolha, extra, G + 'doc-testar')


# ---------------------------------------------------------------- Escolher o gatilho (Nova automação)
TIPOS = [
    ('Clientes · todos da equipe veem', [('pessoa-mais', 'Cliente novo', 'Quando aceita a primeira proposta ou assina o primeiro contrato. Para a boas-vindas.', True, True)]),
    ('Jurídico', [('doc', 'Documento pendente', 'Quando um documento pedido ao cliente não chega em alguns dias. Para lembrar do que falta.', True, False),
                  ('balanca', 'Etapa do caso', 'Quando a etapa muda e tem texto para o cliente.', False, False),
                  ('relogio', 'Lembrete de audiência', '1 dia antes de audiência, reunião ou perícia com o cliente.', False, False)]),
    ('Financeiro', [('alerta', 'Parcela em atraso', 'Parcela sem pagamento alguns dias depois do vencimento.', False, False),
                    ('moeda', 'Parcela vai vencer', 'Alguns dias antes do vencimento.', False, False),
                    ('moeda', 'Pagamento recebido', 'Quando o Financeiro registra o recebimento.', False, False),
                    ('carteira', 'Prestação de contas', 'Quando o repasse ao cliente é registrado.', False, False)]),
]


def j_nova():
    grupos = ''
    for leg, itens in TIPOS:
        lis = ''
        for i, n, d, novo, ch in itens:
            nv = '<span class="gn-novo">Novo</span>' if novo else ''
            lis += (f'<li><label{" class=\"gn-novo-l\"" if novo else ""}><input class="marcar" type="radio" name="nv-g"{" checked" if ch else ""}>'
                    f'<span class="au-ic">{ico(i)}</span><span><b>{n}{nv}</b><small>{d}</small></span></label></li>')
        grupos += f'<fieldset><legend>{leg}</legend><ul>{lis}</ul></fieldset>'
    corpo = (campo('nv-nome', 'Nome', 'Boas-vindas ao cliente novo', ajuda='Só a equipe vê. Ex.: “Cobrança gentil de parcela em atraso”.', foco=True)
             + f'<div class="campo" role="group" aria-labelledby="nv-q"><p class="au-rot-p" id="nv-q">Quando começa</p><div class="gn-tipos">{grupos}</div>'
             f'<p class="ajuda">Só aparecem os gatilhos das áreas que você tem. Cliente novo aparece para todos.</p></div>'
             + f'<p class="pt-comuns">{ico("ia")}<span>Prefere descrever? <a href="{U}pedir">Peça à IA</a>: ela também usa Cliente novo e Documento pendente.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><a class="btn btn-pri" href="{G}cliente-gatilho">{ico("mais")}Criar o rascunho</a>'
    return janela('janela-nova', 'Automações', 'Nova automação', 'Começa em rascunho, com o gatilho, uma mensagem para escrever e o fim. Nada sai antes de testar e a sócia dona ligar.', corpo, pe, abrir=True)


# ---------------------------------------------------------------- estados
def barra_au(sec_, chave):
    q = '<span class="q" aria-label="3 esperando">3</span>'
    links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if s == sec_ else ""}>{s}{q if s == "Mensagens" else ""}</a>'
                    for s, h in [('Mensagens', CONV + 'fila'), ('Automações', G + 'escolher'), ('Avisos automáticos', CONV + 'avisos')])
    return (f'<template data-barra="conversas|{chave}"><div class="pt-barra-area"><p class="pt-area-nome">{ico("conversas")}Conversas</p>'
            f'<nav class="pt-secoes" aria-label="Seções de Conversas">{links}</nav></div></template>\n')


BARRAS = barra_au('Automações', 'Automações')
C = dict(atual='conversas', area='conversas', secao='Automações', trilha='Conversas|Automações', titulo='Automações')
C2 = dict(C)
T = ''
T += tpl('escolher', tela_lista(dialog=j_nova()), **C2)
T += tpl('cliente-gatilho', tela_bv_gatilho(), **dict(C, trilha='Conversas|Automações|' + NOME_BV))
T += tpl('cliente-sugestao', tela_bv_sugestao(), **dict(C, trilha='Conversas|Automações|' + NOME_BV))
T += tpl('cliente-testar', tela_bv_testar(), **dict(C, trilha='Conversas|Automações|' + NOME_BV))
T += tpl('cliente-ligar', tela_bv_ligar(), **dict(C, trilha='Conversas|Automações|' + NOME_BV))
T += tpl('doc-gatilho', tela_doc_gatilho(), **dict(C, trilha='Conversas|Automações|' + NOME_DOC))
T += tpl('doc-mensagem', tela_doc_mensagem(), **dict(C, trilha='Conversas|Automações|' + NOME_DOC))
T += tpl('doc-testar', tela_doc_testar(), **dict(C, trilha='Conversas|Automações|' + NOME_DOC))
T += tpl('doc-ligar', tela_doc_ligar(), **dict(C, trilha='Conversas|Automações|' + NOME_DOC))
T += tpl('erros', tela_erros(), **dict(C, trilha='Conversas|Automações|' + NOME_BV))

out = pagina('Gatilhos novos', 'Automações: os gatilhos Cliente novo e Documento pendente.',
             '{"estado":"escolher","atual":"conversas"}', '', T, BARRAS)
out = finalizar(out, CSS_CV + CSS_AU + CSS_GN)
out = out.replace('<div class="app">', SPRITE_AU + '\n<div class="app">', 1)
out = out.replace('href="#" data-nav="conversas"', f'href="{CONV}fila" data-nav="conversas"')
out = out.replace('</body>', '''<script>
document.addEventListener('click',function(e){var a=e.target.closest('a[href^="#b-"]');if(!a)return;var b=document.getElementById(a.getAttribute('href').slice(1));if(b){e.preventDefault();b.setAttribute('tabindex','-1');b.scrollIntoView({block:'center'});b.focus({preventScroll:true});history.replaceState(null,'',location.search+a.getAttribute('href'))}});
</script>
</body>''', 1)
open(f'{SAIDA}/gatilhos.html', 'w', encoding='utf-8').write(out)
print('gatilhos ok', T.count('<template data-est='), 'estados')
