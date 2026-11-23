# Portal · Financeiro: pendências F3.71 (responsável do repasse), F3.46 (prazo e atraso do repasse),
# F3.48 (RPV e precatório a caminho), F3.49 (meta do mês) e F3.50 (contador e saldo de abertura no Caixa).
# Importa o financeiro.py aprovado (copiado sem mudança), que monta a página com os 16 estados aprovados,
# e acrescenta os estados novos. Uso: python3 financeiro_pend.py <pasta-saida>
import sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import financeiro as F
from comum import tpl, janela, aviso, toast, ico, estado
from pend import *

R, folha, ver, selo, campo, selecao, anexo = F.R, F.folha, F.ver, F.selo, F.campo, F.selecao, F.anexo
ARQ = 'financeiro.html?estado='
ESC = 'escritorio.html?estado='
REL = 'relatorios.html?estado='


def A(secao, titulo=None, trilha=None, **kw):
    d = F.A(secao, titulo, trilha)
    d.update(kw)
    return d


def sel_erro(id_, rot, opcoes, sel='', erro='', ajuda='', foco=False):
    ops = ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in opcoes)
    d, a, aj, er = [], '', '', ''
    if ajuda and not erro:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; d.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; d.append(f'{id_}-er'); a = ' aria-invalid="true"'
    if d:
        a += f' aria-describedby="{" ".join(d)}"'
    if foco:
        a += ' data-foco'
    return f'<div class="campo"><label for="{id_}">{rot}</label><select class="entrada" id="{id_}"{a}>{ops}</select>{aj}{er}</div>'


def larga(j):
    return j.replace('class="janela"', 'class="janela fi-larga"', 1)


def sem_foco(s):
    return s.replace(' data-foco', '')


# ================================================================= F3.71 e F3.46: ficha do repasse de Irene
RESP = {'bianca': ('BT', 'Bianca Torres', 'Contratos e Financeiro'), 'diego': ('DA', 'Diego Almeida', 'Comercial e Financeiro'),
        'marina': ('MR', 'Marina Ribeiro', 'Sócia dona · responsável pelo contrato')}


def folha_quem(resp='bianca', pode=True):
    ini, nome, _ = RESP[resp]
    if resp == 'bianca':
        origem = 'Era de Marina Ribeiro, a responsável pelo contrato. Passou para Bianca em 13/11.'
    else:
        origem = 'Passou de Bianca Torres para Diego hoje, às 10h14, por Marina Ribeiro.'
    b = (f'<button class="btn btn-sec" type="button" data-janela="janela-resp">{ico("trocar")}Trocar o responsável</button>' if pode else
         f'<p class="pd-nota">{ico("cadeado")}<span>Quem troca é quem tem a área Financeiro.</span></p>')
    corpo = (f'<div class="pd-corpo"><div class="pd-quem"><span class="av-p forte" aria-hidden="true">{ini}</span><div><strong>{nome}</strong>'
             f'<small>Recebe no sino e no Início os prazos e os atrasos das partes que faltam.</small></div></div>'
             f'<p>{origem}</p>{b}</div>')
    return folha('t-quem', 'Quem cuida deste repasse', corpo, icone='pessoas')


def linhas_irene(atraso='sem'):
    """atraso: sem (passou do prazo, sem motivo), anotado (com motivo e próxima ação)."""
    if atraso == 'anotado':
        sit_perito = (f'<div class="fi-sit">{selo("urgente", "Atrasado · era 17/11", "alerta")}'
                      f'<p class="fi-motivo"><b>Motivo:</b> esperando a nota fiscal do perito.</p>'
                      f'<p class="fi-motivo"><b>Próxima ação, 19/11:</b> cobrar a nota por e-mail · Bianca</p>'
                      f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-atraso">{ico("lapis")}Mudar a anotação</button></div>')
    else:
        sit_perito = (f'<div class="fi-sit">{selo("urgente", "Atrasado · era 17/11", "alerta")}'
                      f'<p class="fi-motivo">Sem motivo anotado. O prazo foi de 3 dias úteis depois de 12/11.</p>'
                      f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-atraso">{ico("lapis")}Anotar o atraso</button></div>')
    return [
        ('IC', 'Irene Castro', 'Cliente · o que fica para ela', R(25128), f'<div class="fi-sit">{selo("ok", "Repassado 13/11", "check")}</div>', f'<div class="fi-docs"><a href="#">{ico("link")}Comprovante</a></div>', ''),
        ('RM', 'Honorários de êxito (30%)', f'Escritório · {R(11592)} no total', R(9273.60), f'<div class="fi-sit">{selo("ok", "Transferido 13/11", "check")}</div>', f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo 0179</a></div>', 'sub'),
        ('OP', 'Oliveira &amp; Prates Advocacia', 'Parceiro · 20% dos honorários, combinado na entrada do caso', R(2318.40), f'<div class="fi-sit">{selo("neutro", "Até 20/11")}<p class="fi-motivo">Prazo combinado com o parceiro.</p></div>', '<span class="fi-pq">—</span>', 'parte'),
        ('RM', 'Reembolso de custas', 'Laudo médico adiantado em 03/2025', R(420), f'<div class="fi-sit">{selo("ok", "Transferido 13/11", "check")}</div>', '<span class="fi-pq">Despesa ligada</span>', ''),
        ('RT', 'Dr. Rui Tavares', 'Perito · assistente técnico', R(1500), sit_perito, f'<div class="fi-docs"><span class="fi-pq">Falta a nota fiscal</span><button class="btn btn-sec btn-compacto" type="button">Pedir a nota</button></div>', 'atraso'),
    ]


def ficha_irene(resp='bianca', atraso='sem', evs_novos='', pode=True, extra=''):
    ini, nome, _ = RESP[resp]
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="fi-terc-rot" id="t-dir">{ico("escudo")}Ainda com o escritório</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(3818.40)}</p>{selo("urgente", "1 atrasado", "alerta")}</div>'
            f'<p class="fi-oque"><b>Perito e parceiro.</b> O do perito passou do prazo em 17/11. O caso só fecha no financeiro quando os dois forem pagos.</p>'
            f'<button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button></section>')
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
           f'<a class="voltar" href="{ARQ}pz-repasses">{ico("esq", "ico ico-s")}Repasses</a>'
           f'<div class="ident"><div><p class="sobretitulo">RPV · Aposentadoria por incapacidade × INSS</p><h1>Irene Castro</h1>'
           f'<p class="meta"><span class="selo" style="background:var(--ambar-3);color:var(--vinho)">3 de 5 feitos</span><span>levantado em 12/11/2026</span><span class="sep" aria-hidden="true"></span><span class="num">{R(38640)}</span>'
           f'<span class="sep" aria-hidden="true"></span><span>responsável {nome}</span></p></div></div></div>{dir_}</div>')
    tons = (f'<div class="tons" role="img" aria-label="Cliente {R(25128)}, escritório {R(9693.60)}, parceiro {R(2318.40)}, perito {R(1500)}">'
            f'<i style="flex:25128;background:var(--vinho)"></i><i style="flex:9693.6;background:var(--vinho-2)"></i><i style="flex:2318.4;background:var(--vinho-3)"></i><i style="flex:1500;background:var(--vinho-4)"></i></div>'
            f'<p class="legenda"><span><i style="background:var(--vinho)"></i>Cliente {R(25128)}</span><span><i style="background:var(--vinho-2)"></i>Escritório {R(9693.60)}</span>'
            f'<span><i style="background:var(--vinho-3)"></i>Parceiro {R(2318.40)}</span><span><i style="background:var(--vinho-4)"></i>Perito {R(1500)}</span></p>')
    rows, car = '', ''
    for i_, q, r, v, s, d, k in linhas_irene(atraso):
        pre = f'<span class="fi-recuo">{ico("dir")}' if k == 'parte' else ''
        pos = '</span>' if k == 'parte' else ''
        av = '' if k == 'parte' else f'<span class="av-p forte" aria-hidden="true">{i_}</span>'
        tr = ' class="fi-atraso"' if k == 'atraso' else ''
        rows += f'<tr{tr}><td>{pre}<div class="fi-quem-d">{av}<div><strong>{q}</strong><small>{r}</small></div></div>{pos}</td><td>{s}</td><td class="fi-v num">{v}</td><td>{d}</td></tr>'
        cc = ' pz-cartao-atraso' if k == 'atraso' else ''
        car += (f'<li class="cartao{cc}"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{q}</strong><small>{r}</small></div></div>'
                f'<dl class="c-dados"><dt>Valor</dt><dd class="num">{v}</dd></dl><div class="c-selos">{s}</div></li>')
    tab = (f'<table class="so-pc fi-tab fi-dest"><caption class="sr">Para onde foi cada parte</caption><colgroup><col style="width:36%"><col style="width:30%"><col style="width:15%"><col style="width:19%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documento</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">Levantado e destinado</th><td style="white-space:nowrap">Falta destinar {R(0)}</td><td class="fi-v num">{R(38640)}</td><td></td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Para onde foi cada parte">{car}</ul>')
    dest = folha('t-dest', 'Para onde vai cada parte', f'<div class="fi-split">{tons}</div>' + tab,
                 sub='A divisão saiu do contrato e foi revisada por Marina Ribeiro em 12/11. Prazo do escritório: 3 dias úteis depois que o dinheiro entra.', icone='enviar', terc=True)
    fecha = folha('t-fecha', 'Fechamento do caso', (
        f'<div class="fi-fecha"><div class="fi-fecha-num"><div><b class="num">{R(38640)}</b><small>entrou</small></div><div><b class="num">{R(34821.60)}</b><small>destinado e pago</small></div>'
        f'<div class="falta"><b class="num">{R(3818.40)}</b><small>falta pagar</small></div></div>'
        f'<ul class="fi-check"><li>{ico("check")}<span>Cliente recebeu e a prestação de contas foi lida</span></li>'
        f'<li>{ico("check")}<span>Honorários e reembolso no caixa do escritório</span></li>'
        f'<li class="falta">{ico("alerta")}<span><b>Parceiro:</b> falta pagar {R(2318.40)}</span></li>'
        f'<li class="falta">{ico("alerta")}<span><b>Perito:</b> falta pagar {R(1500)}<small>atrasado desde 17/11</small></span></li></ul>'
        f'<button class="btn btn-sec" type="button">{ico("cadeado")}Encerrar o caso no financeiro</button></div>'), icone='cadeado', sub='Só encerra com tudo recebido e tudo repassado')
    hoje = evs_novos + (f'<li><time>9h00</time><span class="pto" aria-hidden="true"></span><div><p>O repasse ao perito passou do prazo (17/11)</p>'
                        f'<small>Aviso no sino de <b>Bianca Torres</b>, a responsável</small></div></li>')
    hist = folha('t-hist', 'Histórico', (
        f'<div class="eventos-dia" style="padding-top:0"><h3>18/11/2026 · hoje</h3><ol class="eventos">{hoje}</ol></div>'
        '<div class="eventos-dia"><h3>13/11/2026</h3><ol class="eventos">'
        f'<li><time>10h40</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> repassou {R(25128)} a Irene</p><small>Pix · comprovante anexado</small></div></li>'
        f'<li><time>9h20</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> passou o repasse para <b>Bianca Torres</b></p><small>“Bianca cuida dos pagamentos a perito e parceiro.”</small></div></li></ol></div>'
        '<div class="eventos-dia"><h3>12/11/2026</h3><ol class="eventos">'
        f'<li><time>16h12</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou o RPV</p><small>{R(38640)} · responsável: Marina Ribeiro, a do contrato</small></div></li></ol></div>'), icone='historico',
        sub='Nada é apagado')
    return (f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{dest}</div>'
            f'<aside class="fi-col" aria-label="Responsável, fechamento e histórico">{folha_quem(resp, pode)}{fecha}{hist}</aside></div></div>{extra}')


def j_resp(v='abrir'):
    topo = ''
    erro_fs = ''
    if v == 'erro':
        topo = resumo_erros(1, 'O responsável ainda não foi trocado.')
        erro_fs = 'Diego Almeida não tem mais a área Financeiro (mudou hoje, às 10h05, em Equipe). Escolha outra pessoa.'
    elif v == 'falha':
        topo = falha('Não deu para trocar o responsável.', 'Nada foi salvo: Bianca Torres continua responsável. O que você escolheu continua aqui; tente de novo.', 'FIN-3C82-1811')
    ops = (radio('rp-q', 'Marina Ribeiro', 'Sócia dona · responsável pelo contrato de Irene')
           + radio('rp-q', 'Bianca Torres <span class="rp-agora">responsável agora</span>', 'Contratos e Financeiro', marcado=(v == 'nada'))
           + radio('rp-q', 'Diego Almeida', 'Comercial e Financeiro', marcado=(v != 'nada'), foco=(v == 'abrir')))
    fs = campo_erro_fs('rp-quem', 'Quem passa a cuidar', ops, erro=erro_fs, ajuda='Só aparece quem tem a área Financeiro.')
    if v == 'erro':
        fs = fs.replace('<input class="marcar" type="radio" name="rp-q" checked>', '<input class="marcar" type="radio" name="rp-q" checked aria-invalid="true" data-foco>')
    corpo = (topo
             + f'<div class="fi-alvo">{ico("escudo")}<div><strong>Irene Castro · RPV de 12/11</strong><small>2 partes ainda a fazer: parceiro e perito (atrasado)</small></div><span class="fi-v num">{R(3818.40)}</span></div>'
             + fs
             + texto_area('rp-mot', 'Por quê', 'Bianca está de férias até 30/11.', opc=True, ajuda='Aparece no histórico do repasse e no aviso a quem passa a cuidar.', limite=200)
             + f'<p class="fi-ref">{ico("sino")}<span>Vale para o repasse inteiro. <b>Diego</b> passa a receber no sino e no Início os prazos e atrasos das 2 partes que faltam; Bianca deixa de receber. A troca fica no histórico, com quem trocou e quando.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><a class="btn btn-pri" href="{ARQ}rp-trocado">{ico("trocar")}Trocar o responsável</a>'
    return janela('janela-resp', 'Repasses', 'Trocar o responsável', 'Quem cuida do repasse recebe os avisos de prazo e de atraso.', corpo, pe, abrir=(v != 'fechada'))


def j_atraso(v='abrir'):
    erros = v == 'erros'
    topo = resumo_erros(2, 'A anotação ainda não foi salva.') if erros else ''
    if v == 'falha':
        topo = falha('Não deu para salvar a anotação.', 'Nada foi salvo. O que você escreveu continua aqui; tente de novo.', 'FIN-5A10-1811')
    mot = (radio('pz-m', 'Esperando um documento de quem recebe', 'Nota fiscal, recibo ou os dados do banco.', marcado=True)
           + radio('pz-m', 'Quem recebe não respondeu', 'Mensagens e ligações sem resposta.')
           + radio('pz-m', 'Esperando uma decisão', 'Do cliente, do parceiro ou do juiz.')
           + radio('pz-m', 'Outro motivo', 'Escreva abaixo.'))
    data = campo('pz-data', 'Quando', '17/11/2026' if erros else '19/11/2026', im='numeric', ajuda='dd/mm/aaaa',
                 erro='A próxima ação é hoje ou depois. Hoje é 18/11/2026.' if erros else '', foco=erros)
    oque = campo('pz-oque', 'O que fazer', '' if erros else 'Cobrar a nota por e-mail', ajuda='Uma frase, como na cobrança das parcelas.',
                 erro='Diga o que vai ser feito, por exemplo: cobrar a nota por e-mail.' if erros else '')
    corpo = (topo
             + f'<div class="fi-alvo">{ico("alerta")}<div><strong>Dr. Rui Tavares · perito</strong><small>Irene Castro · RPV de 12/11 · prazo era 17/11, 1 dia útil de atraso</small></div><span class="fi-v num">{R(1500)}</span></div>'
             + campo_erro_fs('pz-mot', 'Por que atrasou', mot)
             + texto_area('pz-txt', 'Em poucas palavras', 'O perito ainda não mandou a nota fiscal do assistente técnico.', opc=True, limite=300)
             + f'<fieldset class="fi-grupo-op"><legend>Próxima ação</legend><div class="fi-dois">{data}'
             + selecao('pz-resp', 'Com quem', ['Bianca Torres (responsável)', 'Diego Almeida', 'Marina Ribeiro']) + f'</div>{oque}</fieldset>'
             + f'<p class="fi-ref">{ico("relogio")}<span>O repasse continua atrasado até ser feito, e o prazo não muda. A anotação aparece aqui, em Repasses e no Início de quem vai fazer, e o sino lembra no dia. Fica no histórico.</span></p>')
    if not erros and v != 'falha':
        corpo = corpo.replace('name="pz-m" checked>', 'name="pz-m" checked data-foco>', 1)
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><a class="btn btn-pri" href="{ARQ}pz-anotado">{ico("check")}Salvar a anotação</a>'
    return larga(janela('janela-atraso', 'Repasses · atraso', 'Anotar o atraso', 'Por que o repasse passou do prazo e o que vai ser feito.', corpo, pe, abrir=(v != 'fechada')))


# ================================================================= F3.48: RPV e precatório a caminho
CAMINHO = [
    # (chave, cliente, tipo, sub, requisitado, estimada, parte, regra, situacao)
    ('irene', 'Irene Castro', 'RPV complementar', 'TRF da 3ª Região · INSS · expedida em 03/08/2026', 6300, 'outubro de 2026', 1890, '30% de êxito', 'passou'),
    ('eduardo', 'Eduardo Nascimento', 'RPV', 'TRF da 3ª Região · INSS · expedida em 02/10/2026', 16200, 'janeiro de 2027', 4860, '30% de êxito', 'ok'),
    ('helio', 'Hélio Batista Corrêa', 'Precatório', 'TJSP · Estado de São Paulo · inscrito em 2026', 71000, 'até dezembro de 2027', 21300, '30% de êxito', 'longe'),
]
VALE = ('vale', 'Construtora Vale Alto Ltda.', 'RPV municipal', 'TJSP · Prefeitura de Santo André · expedida em 18/11/2026', 18400, 'janeiro de 2027', 3680, '20% de êxito', 'novo')


def item_caminho(c, acoes=True):
    k, cli, tipo, sub, req, est, parte, regra, sit = c
    if sit == 'passou':
        s = selo('urgente', 'Passou da data estimada', 'alerta')
        prox = f'<p class="fi-prox">{ico("agenda")}Era <b>{est}</b> · fora da previsão do Caixa até ter data nova</p>'
    elif sit == 'novo':
        s = selo('ativo', 'Novo')
        prox = f'<p class="fi-prox">{ico("agenda")}Data estimada: <b>{est}</b> · na previsão do Caixa</p>'
    elif sit == 'longe':
        s = ''
        prox = f'<p class="fi-prox">{ico("agenda")}Data estimada: <b>{est}</b> · fora do gráfico, que vai até fevereiro</p>'
    else:
        s = ''
        prox = f'<p class="fi-prox">{ico("agenda")}Data estimada: <b>{est}</b> · na previsão do Caixa</p>'
    ac = ''
    if acoes:
        ac = (f'<div class="rv-acoes"><a class="btn btn-sec btn-compacto" href="{ARQ}rv-data">{ico("agenda")}Mudar a data<span class="sr"> de {cli}</span></a>'
              f'<a class="btn btn-sec btn-compacto" href="{ARQ}rv-entrou">{ico("moeda")}Entrou na conta<span class="sr">: {cli}</span></a></div>')
    return (f'<li class="fi-linha rv-item{" rv-passou" if sit == "passou" else ""}"><div class="fi-quem"><strong>{cli} · {tipo}</strong><small>{sub} · requisitado {R(req)}</small>{prox}'
            f'{"<div class=fi-por>" + s + "</div>" if s else ""}{ac}</div>'
            f'<div class="fi-lado"><span class="fi-v num">{R(parte)}</span><span class="fi-pq">do escritório ({regra})</span></div></li>')


def folha_caminho(v='base', acoes=True, id_='t-cam'):
    itens = CAMINHO + ([VALE] if v == 'registrado' else [])
    bot = f'<button class="btn btn-sec" type="button" data-janela="janela-expedido">{ico("mais")}Registrar expedido</button>'
    if v == 'vazio':
        corpo = estado('Nenhum RPV ou precatório a caminho',
                       'Quando o tribunal expedir um RPV ou um precatório de um cliente, registre aqui, com a data estimada. A parte do escritório entra na previsão do Caixa antes do dinheiro chegar.',
                       'balanca', moldura=False, acoes=f'<button class="btn btn-pri" type="button" data-janela="janela-expedido">{ico("mais")}Registrar expedido</button>')
        return folha(id_, 'A caminho', corpo, sub='RPV e precatório expedidos que ainda não entraram', icone='balanca')
    tot = sum(c[6] for c in itens)
    li = ''.join(item_caminho(c, acoes) for c in itens)
    corpo = (f'<ul class="fi-linhas">{li}</ul><p class="fi-total"><span>Parte do escritório em {len(itens)} {"requisições" if len(itens) > 1 else "requisição"}</span><b class="num">{R(tot)}</b></p>'
             f'<p class="pt-pe-folha">{ico("escudo")}<span>Só a parte do escritório, pelo contrato, conta na previsão. O resto é do cliente e vira repasse quando o dinheiro entrar.</span></p>')
    return folha(id_, 'A caminho', corpo, sub='RPV e precatório expedidos que ainda não entraram', icone='balanca', acoes=bot)


def j_expedido(v='abrir'):
    erros = v == 'erros'
    topo = resumo_erros(2, 'O RPV ainda não foi registrado.') if erros else ''
    if v == 'falha':
        topo = falha('Não deu para registrar o RPV.', 'Nada foi salvo e a previsão do Caixa não mudou. O que você preencheu continua aqui; tente de novo.', 'FIN-8E41-1811')
    tipo = (radio('rv-t', 'RPV', 'Requisição de pequeno valor. Costuma ser paga em até 2 meses depois de expedida.', marcado=True)
            + radio('rv-t', 'Precatório', 'Entra no orçamento de quem paga. Apresentado até 2 de abril, costuma ser pago até o fim do ano seguinte.'))
    valor = campo('rv-req', 'Valor requisitado', '' if erros else '18.400,00', im='decimal', ajuda='Como está no ofício requisitório.',
                  erro='Escreva o valor requisitado, como está no ofício.' if erros else '', foco=erros)
    exped = campo('rv-exp', 'Expedido em', HOJE, im='numeric', ajuda='dd/mm/aaaa')
    est = campo('rv-est', 'Data estimada de pagamento', '10/2026' if erros else '01/2027', im='numeric',
                ajuda='mm/aaaa. Sugerida pelo tipo: RPV, 2 meses depois de expedido. Mude se o tribunal disser outra.',
                erro='A data estimada vem depois da expedição (18/11/2026). Para RPV, costuma ser 01/2027.' if erros else '')
    parte = (f'<div class="rv-parte"><p class="fi-rotulo">Parte do escritório, pelo contrato</p>'
             f'<div class="rv-parte-l"><span><b>Honorários de êxito · 20% do que voltar</b><small>Cláusula 5 do contrato com a Construtora Vale Alto</small></span><span class="fi-v num">{"—" if erros else R(3680)}</span></div>'
             f'<div class="rv-parte-l rv-cli"><span><b>Da cliente</b><small>Vira repasse quando o dinheiro entrar</small></span><span class="fi-v num">{"—" if erros else R(14720)}</span></div></div>')
    corpo = (topo
             + campo_erro_fs('rv-tipo', 'O que foi expedido', f'<div class="rv-dois-op">{tipo}</div>')
             + '<div class="fi-dois">' + selecao('rv-caso', 'Caso', ['Construtora Vale Alto Ltda. · Vale Alto x Prefeitura de Santo André', 'Irene Castro · Aposentadoria por incapacidade × INSS'], 'Construtora Vale Alto Ltda. · Vale Alto x Prefeitura de Santo André')
             + campo('rv-num', 'Número do requisitório', '', opc=True) + '</div>'
             + '<div class="fi-dois">' + campo('rv-trib', 'Tribunal', 'TJSP') + campo('rv-dev', 'Quem paga', 'Prefeitura de Santo André') + '</div>'
             + f'<div class="fi-dois">{valor}{exped}</div>{est}{parte}'
             + f'<p class="rv-prev">{ico("moeda")}<span>Os <b>{R(3680)}</b> do escritório entram na previsão do Caixa em <b>janeiro de 2027</b>, em âmbar, e no Falta receber dos Relatórios, à parte. Nada entra no caixa agora.</span></p>'
             + f'<div class="campo"><span class="fi-rotulo">Ofício requisitório <span class="opcional" style="font-weight:400;color:var(--texto-2)">(opcional)</span></span>{anexo("oficio-rpv-vale-alto.pdf", "312 KB · anexado agora")}</div>')
    if not erros:
        corpo = corpo.replace('name="rv-t" checked>', 'name="rv-t" checked data-foco>', 1) if v == 'abrir' else corpo
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><a class="btn btn-pri" href="{ARQ}rv-registrado">{ico("check")}Registrar a caminho</a>'
    return larga(janela('janela-expedido', 'Repasses · a caminho', 'Registrar RPV ou precatório expedido',
                        'Antes do dinheiro entrar. Quando entrar, ele vira levantamento, com a divisão do contrato.', corpo, pe, abrir=(v != 'fechada')))


def j_data():
    op = (radio('rv-d', 'Ainda vai entrar', 'Escreva a nova data estimada.', marcado=True, foco=True,
                extra=f'<div class="pd-op-dentro">{campo("rv-nova", "Nova data estimada", "12/2026", im="numeric", ajuda="mm/aaaa")}</div>')
          + radio('rv-d', 'Não vai entrar', 'Por exemplo, a requisição foi cancelada. Sai da previsão e fica no histórico, com o motivo.'))
    corpo = (f'<div class="fi-alvo">{ico("balanca")}<div><strong>Irene Castro · RPV complementar</strong><small>TRF da 3ª Região · estimada para outubro de 2026, passou há 1 mês</small></div><span class="fi-v num">{R(1890)}</span></div>'
             + campo_erro_fs('rv-dd', 'O que aconteceu', op)
             + texto_area('rv-dmot', 'Por quê', 'O TRF3 publicou a nova data de liberação: dezembro.', ajuda='Obrigatório. Fica no histórico do RPV.', limite=300)
             + f'<p class="fi-ref">{ico("moeda")}<span>Os {R(1890)} do escritório voltam à previsão do Caixa em <b>dezembro</b> e ao Falta receber dos Relatórios, à parte. A data anterior fica no histórico.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Salvar a data</button>'
    return janela('janela-data', 'Repasses · a caminho', 'Mudar a data estimada', 'Quando o tribunal muda a previsão, ou quando a requisição não vai mais ser paga.', corpo, pe, abrir=True)


def j_entrou():
    rows = (f'<tr><td><div class="fi-quem"><strong>Honorários de êxito</strong><small>30% do valor levantado, cláusula 4 do contrato</small></div></td><td><span class="fi-cat">{ico("coluna")}Escritório</span></td><td class="fi-v num">{R(1923.71)}</td></tr>'
            f'<tr><td><div class="fi-quem"><strong>Irene Castro</strong><small>Cliente · o que fica para ela</small></div></td><td><span class="fi-cat terc">{ico("escudo")}Terceiros</span></td><td class="fi-v num">{R(4488.64)}</td></tr>')
    corpo = (f'<p class="rv-de">{ico("balanca")}<span>Vem do RPV a caminho: <b>Irene Castro · RPV complementar</b>, requisitado {R(6300)}, estimado para outubro de 2026.</span></p>'
             + f'<div class="fi-dois">{selecao("re-tipo", "O que entrou", ["Alvará", "RPV", "Precatório", "Depósito de acordo"], "RPV")}'
             + selecao('re-caso', 'Caso', ['Irene Castro · Aposentadoria por incapacidade × INSS'], 'Irene Castro · Aposentadoria por incapacidade × INSS') + '</div>'
             + f'<div class="fi-dois">{campo("re-valor", "Valor levantado", "6.412,35", im="decimal", foco=True, ajuda="Requisitado: R$ 6.300,00. O que entra costuma vir corrigido.")}{campo("re-data", "Dia em que entrou", HOJE, im="numeric", ajuda="dd/mm/aaaa")}</div>'
             + f'<p class="fi-caixa-fixa">{ico("escudo")}<span>Entra como <b>valor de terceiros</b>. Só a parte do escritório passa para o caixa dele, quando for transferida.</span></p>'
             + f'<div><p class="fi-rotulo" style="margin-bottom:8px">Divisão proposta pelo contrato</p><table class="fi-tab"><caption class="sr">Divisão proposta</caption><colgroup><col style="width:56%"><col style="width:22%"><col style="width:22%"></colgroup>'
             + f'<thead><tr><th scope="col">Para quem</th><th scope="col">Caixa</th><th scope="col" style="text-align:right">Valor</th></tr></thead><tbody>{rows}</tbody></table></div>'
             + f'<p class="fi-ref">{ico("check")}<span>Soma da divisão: <b>{R(6412.35)}</b>, igual ao valor levantado. Ao registrar, o RPV sai de “A caminho” e da previsão do Caixa e fica como <b>“Entrou em 18/11”</b>, ligado a este levantamento. O prazo do repasse a Irene começa hoje: 3 dias úteis.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Registrar e criar os repasses</button>'
    return larga(janela('janela-entrou', 'Repasses', 'Registrar o levantamento', 'O RPV entrou na conta. A divisão sai do contrato, e você pode ajustar antes de registrar.', corpo, pe, abrir=True))


# ================================================================= Repasses (com responsável, atraso e a caminho)
def repasses_pend(caminho='base', extra='', gab_anotado=True, irene='sem'):
    bot = (f'<span class="rv-cab-bot"><button class="btn btn-sec" type="button" data-janela="janela-expedido">{ico("balanca")}Registrar RPV expedido</button>'
           f'<button class="btn btn-pri" type="button" data-janela="janela-rpv">{ico("escudo")}Registrar alvará ou RPV</button></span>')
    cab = F.cab_secao('Financeiro', 'Repasses', 'Dinheiro de terceiros que entra pelo escritório: quanto é de cada um, o que já foi repassado, o que falta e o que ainda está a caminho.', bot)
    nums = (f'<div class="fi-nums" role="group" aria-label="Mostrar">'
            f'<button type="button" aria-pressed="true"><span class="r">A repassar</span><b class="num">{R(23814.99)}</b><small>4 repasses</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">{ico("alerta")}Atrasados</span><b class="num">{R(6400)}</b><small>2 repasses · {"1 sem motivo" if irene == "sem" else "todos com motivo"}</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Honorários a transferir</span><b class="num">{R(6469.97)}</b><small>para a conta do escritório</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">A caminho</span><b class="num">{R(31730 if caminho == "registrado" else (0 if caminho == "vazio" else 28050))}</b><small>do escritório, em RPV e precatório</small></button></div>')
    chips = ('<div class="chips rp-chips" role="group" aria-label="Responsável"><button type="button" aria-pressed="true">Todos (3)</button>'
             '<button type="button" aria-pressed="false">Os meus (2)</button><button type="button" aria-pressed="false">Bianca (1)</button></div>')

    def bloco(id_, tipo, cli, caso, data, total, resp, linhas, situacao, acoes):
        li = ''
        for quem, papel, v, s, ex, atr in linhas:
            li += (f'<li class="fi-linha pz-l{" pz-linha-atraso" if atr else ""}" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>{quem}</strong><small>{papel}</small>{ex}</div>'
                   f'<div class="fi-lado"><span class="fi-v num">{R(v)}</span>{s}</div></li>')
        return (f'<section class="folha fi-terc" aria-labelledby="{id_}"><div class="fi-terc-cab">{ico("escudo")}De terceiros · {tipo}</div>'
                f'<div class="folha-cab"><div><h2 id="{id_}"><a class="fi-h2-link" href="{ARQ}pz-ficha">{cli}</a></h2><p class="sub">{caso} · entrou em {data}</p>'
                f'<p class="rp-resp">{ico("pessoas")}<span>Cuida: <b>{resp}</b></span></p></div>'
                f'<div class="fi-lado"><span class="fi-v forte num">{R(total)}</span>{situacao}</div></div>'
                f'<ul class="fi-linhas">{li}</ul><div class="mais">{acoes}</div></section>')
    b1 = bloco('t-b1', 'RPV', 'Benedito Souza Lima', 'Revisão de aposentadoria × INSS', '17/11', 21566.56, 'Marina Ribeiro (você)', [
        ('Benedito Souza Lima', 'Cliente · o que fica para ele', 15096.59, selo('atencao', 'Até 20/11', 'relogio'), f'<p class="fi-prox">{ico("whats")}Prestação de contas: <b>ainda não enviada</b></p>', False),
        ('Honorários de êxito (30%)', 'Escritório · conforme o contrato', 6469.97, selo('neutro', 'Transferir depois'), '', False),
    ], selo('atencao', '0 de 2 feitos'),
        f'<span>Nada repassado ainda. Prazo do escritório: 3 dias úteis, até 20/11.</span><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sec" type="button">{ico("whats")}Prestação de contas</button><button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button></span>')
    gab_ex = (f'<p class="fi-prox pz-mot">{ico("alerta")}<b>Motivo do atraso:</b> a cliente trocou de banco; esperando a chave Pix nova</p>'
              f'<p class="fi-prox">{ico("relogio")}Próxima ação: <b>19/11, ligar para Gabriela e pedir a chave</b> · Marina</p>'
              f'<button class="btn btn-sec btn-compacto pz-bot" type="button" data-janela="janela-atraso">{ico("lapis")}Mudar a anotação<span class="sr"> de Gabriela</span></button>')
    b2 = bloco('t-b2', 'Depósito de acordo', 'Gabriela Teixeira', 'Ação de cobrança × Comercial Lima', '12/11', 7000, 'Marina Ribeiro (você)', [
        ('Gabriela Teixeira', 'Cliente · o que fica para ela', 4900, selo('urgente', 'Atrasado · era 17/11', 'alerta'), gab_ex, True),
        ('Honorários (30%)', 'Escritório', 2100, selo('ok', 'Transferido 13/11', 'check'), '', False),
    ], selo('atencao', '1 de 2 feitos'), f'<span>Prestação de contas enviada em 13/11, lida.</span><button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button>')
    if irene == 'sem':
        rui_ex = (f'<p class="fi-prox pz-sem">{ico("alerta")}<b>Sem motivo anotado.</b> Passou do prazo ontem.</p>'
                  f'<button class="btn btn-sec btn-compacto pz-bot" type="button" data-janela="janela-atraso">{ico("lapis")}Anotar o atraso<span class="sr"> do perito</span></button>')
    else:
        rui_ex = (f'<p class="fi-prox pz-mot">{ico("alerta")}<b>Motivo do atraso:</b> esperando a nota fiscal do perito</p>'
                  f'<p class="fi-prox">{ico("relogio")}Próxima ação: <b>19/11, cobrar a nota por e-mail</b> · Bianca</p>')
    b3 = bloco('t-b3', 'RPV', 'Irene Castro', 'Aposentadoria por incapacidade × INSS', '12/11', 38640, 'Bianca Torres', [
        ('Oliveira &amp; Prates Advocacia', 'Parceiro · 20% dos honorários', 2318.40, selo('neutro', 'Até 20/11'), '', False),
        ('Dr. Rui Tavares', 'Perito · assistente técnico', 1500, selo('urgente', 'Atrasado · era 17/11', 'alerta'), rui_ex, True),
    ], selo('atencao', '3 de 5 feitos'), f'<span>Cliente, honorários e reembolso já feitos em 13/11.</span>{ver("Abrir e fechar o caso", ARQ + "pz-ficha")}')
    regra = (f'<section class="explica campo-ambar" aria-labelledby="t-regra"><p class="sobretitulo">Como funciona</p><h2 id="t-regra">Nada fica parado sem dono.</h2><ul>'
             f'<li>{ico("relogio")}<span>Cada parte tem prazo: <b>3 dias úteis</b> depois que o dinheiro entra. Quem muda é Marina Ribeiro, em Escritório › Ajustes do financeiro.</span></li>'
             f'<li>{ico("alerta")}<span>Passou do prazo, a parte fica atrasada até ser feita. Anote o motivo e a próxima ação, como na cobrança das parcelas.</span></li>'
             f'<li>{ico("pessoas")}<span>Cada repasse tem quem cuida: no começo, o responsável pelo contrato. Dá para trocar na ficha do repasse.</span></li>'
             f'<li>{ico("cadeado")}<span>O caso só fecha no financeiro com tudo recebido e tudo repassado.</span></li></ul></section>')
    return (f'<div class="fi">{cab}{nums}<div class="fi-grade"><div class="fi-col"><div class="rp-filtro">{chips}</div>{b2}{b3}{b1}{folha_caminho(caminho)}</div>'
            f'<aside class="fi-col" aria-label="Regras">{regra}</aside></div></div>{extra}')


# ================================================================= F3.49: meta no Resumo
MESES_META = [('Agosto', 44100, 42380, None), ('Setembro', 45600, 39910, 45000), ('Outubro', 47200, 45050, 45000), ('Novembro', 48300, 31240, 50000)]


def folha_previsto_meta(v='dona'):
    tons = (f'<div class="tons" role="img" aria-label="Recebido {R(31240)}, vencido {R(5000)}, próximos 7 dias {R(8000)}, até o fim do mês {R(4060)}">'
            f'<i style="flex:31240;background:var(--vinho)"></i><i style="flex:5000;background:var(--vinho-3)"></i><i style="flex:8000;background:var(--ambar)"></i><i style="flex:4060;background:var(--ambar-3)"></i></div>')
    leg = (f'<p class="legenda"><span><i style="background:var(--vinho)"></i>Recebido {R(31240)}</span><span><i style="background:var(--vinho-3)"></i>Vencido {R(5000)}</span>'
           f'<span><i style="background:var(--ambar)"></i>Próximos 7 dias {R(8000)}</span><span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-4)"></i>Até 30/11 {R(4060)}</span></p>')
    sem = v in ('sem-meta', 'sem-meta-equipe')
    mx = 52000
    if sem:
        if v == 'sem-meta':
            meta = (f'<div class="mt-meta mt-vazia"><div><p class="mt-rot">Meta de novembro</p><p class="mt-txt">Sem meta. Com uma meta, o Resumo mostra quanto falta para chegar nela, ao lado dos meses anteriores.</p></div>'
                    f'<button class="btn btn-sec" type="button" data-janela="janela-meta">{ico("mais")}Definir a meta</button></div>')
        else:
            meta = (f'<div class="mt-meta mt-vazia"><div><p class="mt-rot">Meta de novembro</p><p class="mt-txt">Sem meta. Quem define é Marina Ribeiro, a sócia dona.</p></div></div>')
    else:
        b = (f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-meta">{ico("lapis")}Mudar a meta</button>' if v == 'dona'
             else '<span class="fi-pq">Definida por Marina Ribeiro, a sócia dona</span>')
        meta = (f'<div class="mt-meta"><div class="mt-topo"><div><p class="mt-rot">Meta de novembro</p><p class="mt-valor"><b class="num">{R(50000)}</b><span>todo mês, desde novembro</span></p></div>{b}</div>'
                f'<div class="mt-barra" role="img" aria-label="Recebido {R(31240)}, 62% da meta de {R(50000)}. Se todo o previsto entrar, {R(48300)}, 97% da meta.">'
                f'<span class="fi-trilho"><i class="prev" style="width:{48300 / mx * 100:.1f}%"></i><i class="real" style="width:{31240 / mx * 100:.1f}%"></i></span>'
                f'<span class="mt-traco" style="left:{50000 / mx * 100:.1f}%"><span>meta</span></span></div>'
                f'<p class="mt-txt"><b>62% da meta.</b> Faltam {R(18760)} em 12 dias. Se todo o previsto entrar, novembro fecha em {R(48300)}: <b>{R(1700)} abaixo da meta</b>.</p></div>')
    bar = ''
    for n, p, r, m in MESES_META:
        sub = '<small>até hoje</small>' if n == 'Novembro' else ''
        traco = '' if (m is None or sem) else f'<span class="mt-traco mt-traco-p" style="left:{m / mx * 100:.1f}%" aria-hidden="true"></span>'
        if sem or m is None:
            txt = f'de {R(p)} · {round(r / p * 100)}%' + (' · sem meta' if (m is None and not sem) else '')
        elif n == 'Novembro':
            txt = f'meta {R(m)} · 62% até hoje'
        elif r >= m:
            txt = f'meta {R(m)} · <b>bateu</b>'
        else:
            txt = f'meta {R(m)} · {round(r / m * 100)}%'
        bar += (f'<div class="fi-barra"><span class="rot">{n}{sub}</span><span class="fi-duplo mt-duplo" aria-hidden="true"><span class="fi-trilho"><i class="prev" style="width:{p / mx * 100:.1f}%"></i></span>'
                f'<span class="fi-trilho"><i class="real" style="width:{r / mx * 100:.1f}%"></i></span>{traco}</span>'
                f'<span class="val"><b class="num">{R(r)}</b><small>{txt}</small></span></div>')
    leg2 = (f'<p class="legenda fi-leg"><span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-4)"></i>Previsto (barra de cima)</span><span><i style="background:var(--vinho)"></i>Realizado (barra de baixo)</span>'
            + ('' if sem else '<span><i class="mt-leg-traco"></i>Meta do mês (traço)</span>') + '</p>')
    tit = 'Comparado com os meses anteriores' + ('' if sem else ' e com a meta')
    corpo = (f'<p class="fi-grande"><b class="num">{R(31240)}</b><span>de {R(48300)} previstos</span></p><div class="fi-tons">{tons}{leg}</div>{meta}'
             f'<p class="fi-sub3">{tit}</p>'
             f'<div class="fi-barras" role="group" aria-label="Realizado contra previsto{"" if sem else " e contra a meta"}, de agosto a novembro">{bar}</div>{leg2}'
             f'<div class="fi-aviso-in">' + aviso('atencao', 'Os honorários de êxito caíram neste mês.',
                                                f'Entraram {R(7200)} até hoje, 41% abaixo da média de agosto a outubro ({R(12300)}). Pode ser só a data dos alvarás: dois RPVs estão previstos para janeiro, em Caixa.',
                                                icone='alerta') + '</div>')
    return folha('t-prev', 'Previsto e realizado', corpo, sub='Honorários do escritório em novembro. Valores de terceiros ficam fora.', icone='moeda',
                 acoes=ver('Caixa', ARQ + 'ct-caixa'))


def resumo_meta(v='dona', extra=''):
    cab = F.cab_secao('Financeiro', 'Resumo', 'Do honorário contratado ao dinheiro recebido e repassado. Hoje, quarta-feira, 18 de novembro.')
    return (f'<div class="fi">{cab}{F.hero()}<div class="fi-grade"><div class="fi-col">{folha_previsto_meta(v)}{F.folha_vencido()}</div>'
            f'<div class="fi-col">{F.folha_proximos()}{F.folha_repasses_pend()}{F.folha_numeros()}</div></div></div>{extra}')


def j_meta(v='abrir'):
    erros = v == 'erros'
    um = v in ('um-mes', 'erros')
    topo = resumo_erros(2, 'A meta ainda não foi salva.') if erros else ''
    if v == 'falha':
        topo = falha('Não deu para salvar a meta.', 'Nada foi salvo: novembro continua com a meta de antes. O valor que você escreveu continua aqui; tente de novo.', 'FIN-6D27-1811')
    valor = campo('mt-valor', 'Meta de receita do mês', '0,00' if erros else ('40.000,00' if um else '50.000,00'), im='decimal',
                  ajuda='Honorários que entram no caixa do escritório no mês. Valores de terceiros não contam.',
                  erro='Escreva um valor maior que zero. Para ficar sem meta, use “Tirar a meta”.' if erros else '', foco=(v in ('abrir', 'um-mes', 'erros')))
    mes_sel = sel_erro('mt-mes', 'Qual mês', ['Outubro de 2026', 'Novembro de 2026', 'Dezembro de 2026', 'Janeiro de 2027'],
                       'Outubro de 2026' if erros else 'Dezembro de 2026',
                       erro='Outubro já fechou. A meta de um mês fechado não muda, para a comparação continuar verdadeira.' if erros else '')
    vale = (radio('mt-v', 'Todo mês, a partir de novembro de 2026', 'Substitui a de R$ 45.000,00, que valia desde setembro. Setembro e outubro continuam comparados com R$ 45.000,00.', marcado=not um)
            + radio('mt-v', 'Só em um mês', 'Os outros meses continuam com a meta de todo mês.', marcado=um,
                    extra=(f'<div class="pd-op-dentro">{mes_sel}</div>' if um else '')))
    corpo = (topo + valor + campo_erro_fs('mt-vale', 'Vale para', vale)
             + f'<dl class="fi-dl mt-ref"><div><dt>Média de agosto a outubro</dt><dd class="num">{R(42446.67)}</dd></div>'
             + f'<div><dt>Previsto para novembro</dt><dd class="num">{R(48300)}</dd></div>'
             + f'<div><dt>Meses com meta só deles</dt><dd>Dezembro de 2026: {R(40000)}<br><span class="fi-pq">recesso; continua como está</span></dd></div></dl>'
             + f'<p class="fi-ref">{ico("historico")}<span>Quem vê o Financeiro vê a meta. Só você, a sócia dona, muda. Cada mudança fica no histórico, e a meta de um mês que já fechou não muda.</span></p>')
    pe = (f'<button class="btn btn-fantasma pd-pe-j" type="button">{ico("x")}Tirar a meta</button><button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<a class="btn btn-pri" href="{ARQ}mt-resumo">{ico("check")}Salvar a meta</a>')
    return janela('janela-meta', 'Resumo', 'Meta de receita', 'Quanto o escritório quer receber de honorários no mês.', corpo, pe, abrir=(v != 'fechada'))


# ================================================================= F3.50 e F3.48 no Caixa
MESES_C = [  # (mes, sub, E prev, E real, S prev, S real, saldo, futuro, rpv)
    ('Setembro', '', 45600, 39910, 41200, 41640, 28270, False, 0),
    ('Outubro', '', 47200, 45050, 41400, 40870, 32450, False, 0),
    ('Novembro', 'até hoje', 48300, 31240, 40900, 23380, 40310, False, 0),
    ('Dezembro', 'previsto', 46900, None, 46600, None, 40150, True, 0),
    ('Janeiro', 'previsto', 49660, None, 41300, None, 48510, True, 4860),
    ('Fevereiro', 'previsto', 45200, None, 41300, None, 52410, True, 0),
]


def caixa_pend(v='base', extra=''):
    bot = f'<button class="btn btn-pri" type="button" data-janela="janela-exportar">{ico("baixar")}Exportar para o contador</button>'
    cab = F.cab_secao('Financeiro', 'Caixa', 'O que entrou e saiu, o que está previsto e o saldo do escritório, sem misturar o que é de terceiros.', bot)
    sem_ab = v == 'sem-abertura'
    saldo = 27830 if sem_ab else 40310
    if sem_ab:
        abertura = (f'<p class="ct-abertura ct-falta">{ico("alerta")}<span><b>O saldo começa em {R(0)}.</b> Falta o saldo de abertura: o que havia na conta antes do primeiro lançamento.</span></p>'
                    f'<a class="btn btn-escuro ct-bot" href="{ESC}es-vazio">{ico("lapis")}Lançar o saldo de abertura</a>')
    else:
        abertura = f'<p class="ct-abertura">{ico("historico")}<span>Começa no saldo de abertura de <b>{R(12480)}</b>, em 31/08/2026.</span> <a href="{ESC}es-ajustes">Ver em Escritório</a></p>'
    saldos = (f'<div class="fi-saldos"><section class="fi-saldo campo-vinho" aria-labelledby="t-s1" style="position:relative">{ico("coluna", "ico estatua")}<p class="sobretitulo" id="t-s1">Do escritório · hoje</p>'
              f'<p><span class="fi-big num">{R(saldo)}</span></p><p>Saldo do caixa do escritório. Se tudo o que está previsto entrar e sair, fecha novembro em <b>{R(saldo - 460)}</b>.</p>{abertura}</section>'
              f'<section class="fi-saldo campo-ambar" aria-labelledby="t-s2" style="position:relative"><p class="fi-terc-rot" id="t-s2">{ico("escudo")}De terceiros · hoje</p>'
              f'<p><span class="fi-big num">{R(30284.96)}</span></p><p>Está na conta, mas não é do escritório e <b>não entra na previsão</b>. É de 3 clientes, 1 perito e 1 parceiro, mais honorários a transferir.</p>'
              f'<a class="btn btn-escuro" href="{ARQ}pz-repasses" style="justify-self:start;margin-top:4px">{ico("enviar")}Ver repasses</a></section></div>')
    mx = 50000
    bar = ''
    for m, sub, ep, er, sp, sr, s_, fut, rpv in MESES_C:
        s = f'<small>{sub}</small>' if sub else ''
        cls = ' fi-hoje' if m == 'Novembro' else ''
        if fut:
            base = ep - rpv
            tr = (f'<span class="fi-duplo" aria-hidden="true"><span class="fi-trilho"><i class="prev" style="width:{ep / mx * 100:.1f}%"></i>'
                  + (f'<i class="rpv" style="left:{base / mx * 100:.1f}%;width:{rpv / mx * 100:.1f}%;border-radius:0 4px 4px 0"></i>' if rpv else '') + '</span></span>')
            val = f'<b class="num">{R(ep)}</b> previstos' + (f'<br>dos quais {R(rpv)} de RPV' if rpv else '')
        else:
            tr = (f'<span class="fi-duplo" aria-hidden="true"><span class="fi-trilho"><i class="prev" style="width:{ep / mx * 100:.1f}%"></i></span>'
                  f'<span class="fi-trilho"><i class="real" style="width:{er / mx * 100:.1f}%"></i></span></span>')
            val = f'<b class="num">{R(er)}</b> realizados<br>de {R(ep)} previstos'
        bar += f'<div class="fi-mes{cls}"><span class="rot">{m}{s}</span>{tr}<span class="val">{val}</span></div>'
    leg = (f'<p class="legenda fi-leg"><span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-4)"></i>Previsto</span>'
           f'<span><i style="background:var(--vinho)"></i>Realizado</span><span><i style="background:var(--ambar)"></i>RPV ou precatório com data estimada</span></p>')
    fora = ('<div class="fi-aviso-in">' + aviso('atencao', '1 RPV passou da data estimada e saiu da previsão.',
                                             f'Irene Castro, RPV complementar: {R(1890)} do escritório, era outubro. Volta à previsão quando tiver data nova.',
                                             icone='alerta', acoes=f'<a class="btn btn-sec btn-compacto" href="{ARQ}rv-data">{ico("agenda")}Mudar a data</a>') + '</div>')
    prev = folha('t-prev', 'Previsto e realizado', f'<div class="fi-meses" role="group" aria-label="Entradas do escritório por mês, previstas e realizadas">{bar}</div>{leg}{fora}',
                 sub='Entradas do escritório, de setembro a fevereiro. Saldo de novembro em diante é previsão.', icone='moeda')
    rpvs = folha_caminho('base', acoes=False, id_='t-rpvs').replace('A caminho</h2>', 'RPVs e precatórios a caminho</h2>', 1)
    rpvs = rpvs.replace('<div class="acoes"><button class="btn btn-sec" type="button" data-janela="janela-expedido">',
                        f'<div class="acoes"><a class="btn btn-sec" href="{ARQ}rv-caminho">', 1).replace('Registrar expedido</button>', 'Ver em Repasses</a>', 1)
    rpvs = rpvs.replace(ico('mais') + 'Ver em Repasses', ico('dir') + 'Ver em Repasses')
    if v == 'sem-contador':
        exp_c = (f'<dl class="fi-dl"><div><dt>Outubro de 2026</dt><dd>Exportado em 05/11<br><span class="fi-pq">baixado por Marina Ribeiro</span></dd></div>'
                 f'<div><dt>Novembro de 2026</dt><dd>Pronto a partir de 01/12</dd></div></dl>'
                 f'<p class="ct-sem">{ico("envelope")}<span><b>Nenhum contador cadastrado.</b> Com o nome e o e-mail dele, a exportação vai por e-mail sem você anexar nada.</span></p>'
                 f'<div class="fi-cob"><a class="btn btn-sec" href="{ESC}es-vazio">{ico("mais")}Cadastrar o contador</a></div>')
    else:
        env = ('Enviado por e-mail hoje, às 10h20<br><span class="fi-pq">por Marina Ribeiro · entregue</span>' if v == 'enviado'
               else 'Enviado por e-mail em 05/11, às 9h12<br><span class="fi-pq">por Marina Ribeiro · entregue</span>')
        exp_c = (f'<dl class="fi-dl"><div><dt>Outubro de 2026</dt><dd>{env}</dd></div>'
                 f'<div><dt>Novembro de 2026</dt><dd>Pronto a partir de 01/12<br><span class="fi-pq">lembrete a Marina em 05/12</span></dd></div>'
                 f'<div><dt>Para quem vai</dt><dd>Paulo Serra · Contabilidade Silva<br><span class="fi-pq">contato@exemplo.com.br</span></dd></div></dl>'
                 f'<div class="fi-cob"><button class="btn btn-sec" type="button" data-janela="janela-exportar">{ico("baixar")}Exportar um mês</button></div>')
    exp = folha('t-exp', 'Para o contador', exp_c, icone='doc', sub='Recebimentos, despesas, recibos e comprovantes do mês')
    return (f'<div class="fi">{cab}{saldos}<div class="fi-grade"><div class="fi-col">{prev}</div>'
            f'<aside class="fi-col" aria-label="A caminho e contador">{rpvs}{exp}</aside></div></div>{extra}')


def j_exportar(v='ok'):
    topo = ''
    if v == 'falha':
        topo = aviso('urgencia', 'O arquivo foi gerado, mas o e-mail não saiu.',
                     'A exportação de outubro está no histórico e já baixou no seu aparelho. Só o envio a Paulo Serra falhou; nada mais mudou. '
                     'Tente mandar de novo. Se continuar, mande ao suporte o código <b class="num">FIN-2B95-1811</b>.')
    if v == 'sem-contador':
        envio = (f'<p class="ct-sem">{ico("envelope")}<span><b>Sem contador cadastrado:</b> o arquivo só baixa no seu aparelho. Cadastre o contador para mandar por e-mail.</span></p>'
                 f'<a class="btn btn-sec" href="{ESC}es-vazio" style="justify-self:start">{ico("mais")}Cadastrar o contador</a>')
    else:
        envio = caixa_sel('ex-mail', 'Mandar por e-mail a Paulo Serra, da Contabilidade Silva',
                          'contato@exemplo.com.br · a planilha vai anexada; os comprovantes vão num link do .zip, que vale por 30 dias.', marcado=True)
    corpo = (topo + selecao('ex-mes', 'Mês', ['Novembro de 2026 (ainda aberto)', 'Outubro de 2026', 'Setembro de 2026'], 'Outubro de 2026')
             + f'<div><p class="fi-rotulo" style="margin-bottom:6px">O que vai no arquivo</p><ul class="fi-check">'
             + f'<li>{ico("check")}<span>42 recebimentos, por categoria de honorário<small>{R(45050)}</small></span></li>'
             + f'<li>{ico("check")}<span>31 despesas, por categoria<small>{R(40870)}</small></span></li>'
             + f'<li>{ico("check")}<span>Os comprovantes num .zip: 40 recibos e 58 comprovantes, notas e guias<small>41 MB · cada arquivo com a data e o lançamento no nome</small></span></li>'
             + f'<li>{ico("check")}<span>Saldo do caixa no começo e no fim do mês<small>{R(28270)} em 30/09 e {R(32450)} em 31/10, a partir do saldo de abertura</small></span></li>'
             + f'<li>{ico("escudo")}<span>Valores de terceiros numa aba à parte<small>{R(6300)} entraram e foram repassados. Não são receita do escritório.</small></span></li>'
             + f'<li class="falta">{ico("alerta")}<span><b>3 despesas sem nota fiscal</b><small>Sistema de petições, 21/10 · Táxi, 14/10 · Cartório, 08/10. Vão marcadas na planilha.</small></span></li></ul></div>'
             + f'<fieldset class="fi-grupo-op"><legend>Formato</legend><label class="opcao"><input class="marcar" type="radio" name="ex-f" checked><span>Planilha (.xlsx) e os comprovantes (.zip)<small>O mais pedido pelos contadores</small></span></label>'
             + f'<label class="opcao"><input class="marcar" type="radio" name="ex-f"><span>Só a planilha (.csv)</span></label></fieldset>'
             + envio
             + f'<p class="fi-ref">{ico("historico")}<span>A exportação e o envio ficam no histórico do escritório, com quem gerou, para quem foi e quando.</span></p>')
    rot = 'Mandar de novo' if v == 'falha' else ('Exportar outubro' if v == 'sem-contador' else 'Exportar e mandar')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><a class="btn btn-pri" href="{ARQ}ct-enviado" data-foco>{ico("envelope" if v != "sem-contador" else "baixar")}{rot}</a>'
    return janela('janela-exportar', 'Caixa', 'Exportar para o contador', 'Tudo o que o contador pede do mês, num arquivo só.', corpo, pe, abrir=True)


# ================================================================= quem não tem a área
def sem_area():
    e = estado('Esta página é da área Financeiro',
               'Repasses, caixa, metas e o que está a caminho ficam com quem tem a área Financeiro. Quem libera as áreas é Marina Ribeiro, a sócia dona, em Equipe.',
               'cadeado', h='h1', papel='status', acoes=f'<a class="btn btn-pri" href="#">{ico("inicio")}Voltar ao Início</a>')
    return f'<div class="fi">{e}</div>'


CSS_FP = r"""
/* ===== F3.71 responsável, F3.46 atraso, F3.48 a caminho, F3.49 meta, F3.50 caixa ===== */
.rp-resp{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:12px;color:var(--texto-2)}
.rp-resp .ico{width:16px;height:16px;color:var(--vinho-4)}
.rp-resp b{font-weight:500;color:var(--texto)}
.rp-agora{display:inline-block;margin-left:8px;padding:0 8px;border-radius:10px;background:var(--sal-2);color:var(--vinho);font-size:11px;font-weight:500;vertical-align:1px}
.rp-filtro{display:flex;justify-content:flex-start}
.rp-filtro .chips{margin:0}
aside.fi-col .folha-cab{flex-wrap:wrap}
aside.fi-col .rv-item{grid-template-columns:minmax(0,1fr)!important}
aside.fi-col .rv-item .fi-lado{justify-items:start;text-align:left;grid-auto-flow:column;justify-content:start;align-items:baseline;gap:8px}
.pz-linha-atraso{box-shadow:inset 3px 0 0 var(--vinho-3)}
.pz-mot b,.pz-sem b{color:var(--texto)}
.pz-sem .ico,.pz-mot .ico{color:var(--vinho-3)!important}
.pz-bot{margin-top:8px}
.fi-sit .btn{margin-top:2px}
.fi-docs .btn{margin-top:4px}
.pz-cartao-atraso{border-color:var(--vinho-3)!important;box-shadow:inset 3px 0 0 var(--vinho-3)}
.rv-cab-bot{display:flex;gap:8px;flex-wrap:wrap}
.rv-item{grid-template-columns:minmax(0,1fr) auto!important}
.rv-passou{box-shadow:inset 3px 0 0 var(--vinho-3)}
.rv-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.rv-dois-op{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rv-dois-op .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 12px}
.rv-dois-op .opcao:has(input:checked){border-color:var(--vinho);background:var(--sal-2)}
.rv-parte{display:grid;gap:0;border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 14px}
.rv-parte .fi-rotulo{margin-bottom:4px}
.rv-parte-l{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--divisor);font-size:13px}
.rv-parte-l b{display:block;font-weight:500}
.rv-parte-l small{display:block;font-size:12px;color:var(--texto-2)}
.rv-parte-l.rv-cli{color:var(--texto-2)}
.rv-prev{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.rv-prev .ico{color:var(--vinho);flex:none;margin-top:1px}
.rv-prev b{font-weight:600}
.rv-de{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2)}
.rv-de .ico{color:var(--vinho);flex:none;margin-top:1px}
.rv-de b{font-weight:500}
.mt-meta{margin:16px 24px 0;padding:14px 16px;border-radius:var(--raio);border:1px solid var(--borda-folha);display:grid;gap:10px}
.mt-vazia{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;background:var(--sal-2);border-style:dashed;border-color:var(--vinho-4)}
.mt-topo{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.mt-rot{font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.mt-valor{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.mt-valor b{font-family:var(--serifa);font-size:28px;font-weight:500;color:var(--vinho);line-height:1.1}
.mt-valor span,.mt-txt{font-size:13px;color:var(--texto-2);line-height:1.5}
.mt-txt b{color:var(--texto);font-weight:600}
.mt-barra{position:relative;padding:18px 0 2px}
.mt-barra .fi-trilho{display:block;height:16px}
.mt-traco{position:absolute;top:10px;bottom:-2px;width:0;border-left:2.5px solid var(--vinho-escuro)}
.mt-traco span{position:absolute;top:-12px;left:4px;font-size:11px;font-weight:600;color:var(--vinho-escuro);white-space:nowrap}
.mt-duplo{position:relative}
.mt-traco-p{top:-3px;bottom:-3px}
.mt-leg-traco{width:3px!important;height:14px!important;background:var(--vinho-escuro)!important;border-radius:0!important}
.mt-ref{padding:0}
.ct-abertura{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;font-size:12px!important;color:var(--ambar-3)!important;margin-top:2px}
.ct-abertura .ico{width:16px;height:16px;color:var(--ambar-2);flex:none;margin-top:1px}
.ct-abertura b{color:var(--papel)}
.ct-abertura a{color:var(--papel);font-weight:500;text-decoration:underline;text-underline-offset:3px;display:inline-flex;align-items:center;min-height:24px}
.ct-falta{padding:10px 12px;border-radius:var(--raio);background:var(--vinho-2);font-size:13px!important;color:var(--papel)!important;position:relative;z-index:1}
.ct-bot{justify-self:start;position:relative;z-index:1;background:var(--papel)!important;color:var(--vinho)!important}
.ct-sem{display:flex;gap:10px;align-items:flex-start;margin:0 24px 12px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.janela .ct-sem{margin:0}
.ct-sem .ico{color:var(--vinho);flex:none;margin-top:1px}
.ct-sem b{font-weight:600}
@media (max-width:760px){
  .rv-dois-op{grid-template-columns:1fr}
  .pz-l,.rv-item{grid-template-columns:minmax(0,1fr)!important}
  .pz-l .fi-lado,.rv-item .fi-lado{grid-column:1!important;justify-items:start;text-align:left;grid-auto-flow:column;justify-content:start;align-items:center;gap:10px}
  .rv-cab-bot{flex:1 1 100%}
  .rv-cab-bot .btn{flex:1 1 100%}
  .mt-meta{margin:14px 16px 0}
  .ct-sem{margin:0 16px 12px}
  .rv-acoes .btn{flex:1 1 auto}
}
"""

# ================================================================= estados
RF = dict(trilha='Financeiro|Repasses|Irene Castro')
T = ''
# F3.71 · responsável pelo repasse
EV_TROCA = (f'<li><time>10h14</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> passou o repasse de Bianca Torres para <b>Diego Almeida</b><span class="selo selo-ativo">Novo</span></p>'
            f'<small>“Bianca está de férias até 30/11.” Diego foi avisado no sino.</small></div></li>')
T += tpl('rp-ficha', ficha_irene() + j_resp('fechada') + j_atraso('fechada'), **A('Repasses', 'Irene Castro', RF['trilha']))
T += tpl('rp-trocar', ficha_irene() + j_resp('abrir') + j_atraso('fechada'), **A('Repasses', 'Trocar o responsável', RF['trilha']))
T += tpl('rp-trocar-erro', ficha_irene() + j_resp('erro') + j_atraso('fechada'), **A('Repasses', 'Trocar o responsável', RF['trilha']))
T += tpl('rp-trocar-falha', ficha_irene() + j_resp('falha') + j_atraso('fechada'), **A('Repasses', 'Trocar o responsável', RF['trilha']))
T += tpl('rp-trocado', ficha_irene('diego', evs_novos=EV_TROCA, extra=toast('Diego Almeida cuida deste repasse agora.', 'Ele foi avisado no sino e passa a ver as 2 partes que faltam no Início dele.'))
         + j_resp('fechada') + j_atraso('fechada'), **A('Repasses', 'Irene Castro', RF['trilha']))
# F3.46 · prazo e atraso do repasse
EV_ANOT = (f'<li><time>10h18</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Bianca Torres</b> anotou o atraso do perito<span class="selo selo-ativo">Novo</span></p>'
           f'<small>Esperando a nota fiscal. Próxima ação: 19/11, cobrar a nota por e-mail, com Bianca.</small></div></li>')
T += tpl('pz-repasses', repasses_pend() + j_atraso('fechada') + j_expedido('fechada'), **A('Repasses'))
T += tpl('pz-ficha', ficha_irene() + j_resp('fechada') + j_atraso('fechada'), quem='bianca', **A('Repasses', 'Irene Castro', RF['trilha']))
T += tpl('pz-anotar', ficha_irene() + j_resp('fechada') + j_atraso('abrir'), quem='bianca', **A('Repasses', 'Anotar o atraso', RF['trilha']))
T += tpl('pz-anotar-erros', ficha_irene() + j_resp('fechada') + j_atraso('erros'), quem='bianca', **A('Repasses', 'Anotar o atraso', RF['trilha']))
T += tpl('pz-anotar-falha', ficha_irene() + j_resp('fechada') + j_atraso('falha'), quem='bianca', **A('Repasses', 'Anotar o atraso', RF['trilha']))
T += tpl('pz-anotado', ficha_irene(atraso='anotado', evs_novos=EV_ANOT, extra=toast('Atraso anotado.', 'Amanhã, 19/11, o sino lembra você de cobrar a nota do perito.'))
         + j_resp('fechada') + j_atraso('fechada'), quem='bianca', **A('Repasses', 'Irene Castro', RF['trilha']))
# F3.48 · RPV e precatório a caminho
T += tpl('rv-caminho', repasses_pend() + j_atraso('fechada') + j_expedido('fechada'), **A('Repasses'))
T += tpl('rv-registrar', repasses_pend() + j_atraso('fechada') + j_expedido('abrir'), **A('Repasses', 'Registrar RPV expedido'))
T += tpl('rv-registrar-erros', repasses_pend() + j_atraso('fechada') + j_expedido('erros'), **A('Repasses', 'Registrar RPV expedido'))
T += tpl('rv-registrar-falha', repasses_pend() + j_atraso('fechada') + j_expedido('falha'), **A('Repasses', 'Registrar RPV expedido'))
T += tpl('rv-registrado', repasses_pend('registrado', extra=toast('RPV a caminho registrado.', f'Os {R(3680)} do escritório entraram na previsão do Caixa em janeiro de 2027.'))
         + j_atraso('fechada') + j_expedido('fechada'), **A('Repasses'))
T += tpl('rv-data', repasses_pend() + j_atraso('fechada') + j_expedido('fechada') + j_data(), **A('Repasses', 'Mudar a data estimada'))
T += tpl('rv-entrou', repasses_pend() + j_atraso('fechada') + j_expedido('fechada') + j_entrou(), **A('Repasses', 'Registrar o levantamento'))
T += tpl('rv-vazio', repasses_pend('vazio') + j_atraso('fechada') + j_expedido('fechada'), **A('Repasses'))
T += tpl('rv-caixa', caixa_pend() + j_expedido('fechada'), **A('Caixa'))
# F3.49 · meta do mês
T += tpl('mt-resumo', resumo_meta() + j_meta('fechada'), **A('Resumo'))
T += tpl('mt-definir', resumo_meta() + j_meta('abrir'), **A('Resumo', 'Meta de receita'))
T += tpl('mt-um-mes', resumo_meta() + j_meta('um-mes'), **A('Resumo', 'Meta de receita'))
T += tpl('mt-erros', resumo_meta() + j_meta('erros'), **A('Resumo', 'Meta de receita'))
T += tpl('mt-falha', resumo_meta() + j_meta('falha'), **A('Resumo', 'Meta de receita'))
T += tpl('mt-sem-meta', resumo_meta('sem-meta') + j_meta('fechada'), **A('Resumo'))
T += tpl('mt-equipe', resumo_meta('equipe'), quem='bianca', **A('Resumo'))
# F3.50 · contador e saldo de abertura, no Caixa
T += tpl('ct-caixa', caixa_pend() + j_expedido('fechada'), **A('Caixa'))
T += tpl('ct-exportar', caixa_pend() + j_exportar('ok'), **A('Caixa', 'Exportar para o contador'))
T += tpl('ct-exportar-falha', caixa_pend() + j_exportar('falha'), **A('Caixa', 'Exportar para o contador'))
T += tpl('ct-enviado', caixa_pend('enviado', extra=toast('Outubro foi para Paulo Serra.', 'A planilha e o link dos comprovantes (.zip) saíram para contato@exemplo.com.br. Também baixaram no seu aparelho.')), **A('Caixa'))
T += tpl('ct-sem-contador', caixa_pend('sem-contador') + j_exportar('sem-contador'), **A('Caixa', 'Exportar para o contador'))
T += tpl('ct-sem-abertura', caixa_pend('sem-abertura'), **A('Caixa'))
# Quem não tem a área Financeiro (Larissa, só Jurídico): o menu não mostra; o link direto mostra isto
T += tpl('fi-sem-area', sem_area(), quem='juridico', atual='financeiro', trilha='Financeiro', titulo='Financeiro')

out = injetar(F.out, T, CSS_FP, padrao='rp-ficha')
out = out.replace('href="#" data-nav="financeiro"', f'href="{ARQ}mt-resumo" data-nav="financeiro"')
for s, e in [('Resumo', 'resumo'), ('Repasses', 'repasses'), ('Caixa', 'caixa')]:
    out = out.replace(f'href="{ARQ}{e}">{s}</a>', f'href="{ARQ}{ {"resumo": "mt-resumo", "repasses": "pz-repasses", "caixa": "ct-caixa"}[e]}">{s}</a>')
    out = out.replace(f'href="{ARQ}{e}" aria-current="page">{s}</a>', f'href="{ARQ}{ {"resumo": "mt-resumo", "repasses": "pz-repasses", "caixa": "ct-caixa"}[e]}" aria-current="page">{s}</a>')
out = out.replace('href="escritorio.html"', f'href="{ESC}es-ajustes"')
open(os.path.join(SAIDA, 'financeiro.html'), 'w', encoding='utf-8').write(out)
print('financeiro + pendências ok', T.count('<template data-est='), 'estados novos')
