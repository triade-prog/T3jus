# Portal · rodada curta sobre o desenho aprovado das sobras da importação (importacao-sobras, 23/11/2026).
# Só o que o plano 2 deixou sem desenho (revisao-2.md, correção 11; decisoes-plano-2.md, decisões 1 e 2):
#   - a janela "Registrar o resultado" do caso que veio encerrado, com o erro e a ficha depois (P2);
#   - "Escolha o motivo." e o conflito "já dispensou" na janela de dispensar (P6);
#   - os avisos de "Trazer de volta" (P7);
#   - a busca vazia fora de Abertos, sem a Ordem (P5);
#   - a contagem dos Encerrados com a importação desfeita (P12).
# ("Cliente atendido" fica no cliente.py, porque usa a ficha ligada aprovada da jornada.)
# Base sem mudança: sobras.py aprovado (lido até os estados, sem gerar o HTML dele), que por sua vez lê sistemas.py,
# juridico.py e o resto. Peças novas com prefixo il-.
# Gera juridico.html e lembretes.html. Uso: python3 rodada2.py <pasta-saida>
import sys, os, html, re

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_corte = '# ---------------------------------------------------------------- estados e páginas'
_src = open(os.path.join(AQUI, 'sobras.py'), encoding='utf-8').read()
exec(compile(_src[:_src.index(_corte)], 'sobras.py', 'exec'), globals())

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
# Os links para os estados aprovados apontam para a pasta aprovada, ao lado desta.
AP = '../importacao-sobras/'
L, D, J = AP + 'lembretes.html?estado=', AP + 'dispensar.html?estado=', AP + 'caso-importado.html?estado='
JR = 'juridico.html?estado='
LR = 'lembretes.html?estado='
toast = JU['toast']

# ---------------------------------------------------------------- CSS novo (prefixo il-), só pares aprovados
CSS_IL2 = r"""
/* ==========================================================================
   Rodada curta (23/11/2026): registrar o resultado, avisos de trazer de volta. Prefixo il-.
   ========================================================================== */
/* O que acontece, na janela do resultado: o mesmo desenho da lista .im-desf aprovada */
.il-oque{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.il-oque li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5}
.il-oque .ico{width:18px;height:18px;color:var(--vinho);flex:none;margin-top:2px}
.il-oque b{font-weight:600}
.il-oque-t{margin:4px 0 0;font-size:13px;font-weight:500}
/* Grupo de opções com erro: o mesmo realce do .il-motivos.il-erro aprovado */
.ju-fs.il-fs-erro{padding:10px 12px;border-radius:var(--raio);box-shadow:inset 3px 0 0 var(--vinho-3);background:#FCF6F2}
.il-motivos .erro-msg,.ju-fs .erro-msg{margin-top:6px}
/* Resultado registrado, na folha Resultado */
.il-res .selo{justify-self:start}
.il-res .il-motivo{margin-top:0}
"""

# ================================================================ 1. registrar o resultado (P2)
CASO_Q = 'Queiroz x Construtora Lume'
MOTIVO_OK = 'Sentença procedente, confirmada pelo TRT em 2024. Renata recebeu e o processo foi arquivado em 14/03/2025, ainda no Astrea.'
RES = [('Ganho', 'Decisão a favor do cliente'), ('Perda', 'Decisão contra o cliente'), ('Acordo', 'As partes fecharam acordo')]


def fs_resultado(marcado='', erro=False):
    """O fieldset Resultado aprovado da janela de mudança de etapa (j_final), com os mesmos rádios e textos.
    Muda só a explicação da legenda: aqui não há êxito a cobrar, porque o caso não tem contrato."""
    inv = ' aria-invalid="true"' if erro else ''
    res = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="mr-res" value="{k.upper()}"{" checked" if k == marcado else ""}{inv}'
                  f'{" data-foco" if ((i == 0 and (erro or not marcado)) or (k == marcado and not erro)) else ""}><span>{k}<small>{s}</small></span></label>'
                  for i, (k, s) in enumerate(RES))
    er = f'<p class="erro-msg" id="mr-res-er">{ico("alerta", "ico ico-s")}Escolha o resultado: ganho, perda ou acordo.</p>' if erro else ''
    cls = ' il-fs-erro' if erro else ''
    d = ' aria-describedby="mr-res-er"' if erro else ''
    return (f'<fieldset class="ju-fs ju-res{cls}"{d}><legend>Resultado<small>entra nas contas de ganho, perda e acordo</small></legend>'
            f'<div class="ju-ops">{res}</div>{er}</fieldset>')


def motivo_res(valor='', erro=False):
    """O campo Motivo aprovado (juridico.motivo), com a ajuda e o erro deste caso."""
    m = JU['motivo'](valor, erro)
    m = m.replace('Só para a equipe; o cliente não vê. Ex.: sentença procedente em parte; vamos recorrer.',
                  'Só para a equipe; o cliente não vê. De 3 a 1.000 caracteres. Ex.: sentença procedente, confirmada pelo TRT; pago e arquivado em 2025.')
    m = m.replace('Escreva o motivo da mudança. Ele fica no histórico do caso e ajuda quem pegar o caso depois.',
                  'O motivo está curto. Escreva pelo menos 3 caracteres: ele fica no histórico do caso e explica a quem consultar depois.')
    return m.replace(' data-foco', '')  # o foco vai para o primeiro campo com erro, o Resultado


def j_resultado(abrir=False, erro=False):
    topo = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'Nada foi registrado: o caso continua encerrado e sem resultado, como veio do Astrea.') if erro else ''
    oque = (f'<div><p class="il-oque-t">O que acontece</p><ul class="il-oque">'
            f'<li>{ico("balanca")}<span><b>O caso entra nas contas de ganho, perda e acordo.</b> A etapa continua 8. Encerrado.</span></li>'
            f'<li>{ico("whats")}<span><b>Não avisa o cliente.</b> Nenhuma mensagem vai para Renata.</span></li>'
            f'<li>{ico("moeda")}<span><b>Não pede acerto nem cobra êxito</b>, porque o caso não tem contrato.</span></li>'
            f'<li>{ico("historico")}<span><b>Fica em Mudanças de etapa e no histórico do caso</b>, com seu nome, a hora e o motivo. Se a importação for desfeita, este caso fica, como tudo o que foi mexido depois dela.</span></li></ul></div>')
    corpo = (topo + f'<p class="ju-de"><span>Agora: <b>8. Encerrado</b>, sem resultado. Arquivado no Astrea em 14/03/2025.</span></p>'
             + fs_resultado('' if erro else 'Ganho', erro) + motivo_res('ok' if erro else MOTIVO_OK, erro) + oque)
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Registrar o resultado</button>'
    j = janela('janela-resultado', 'Caso encerrado · veio do Astrea', f'Registrar o resultado de {CASO_Q}',
               'O Astrea não diz como o caso terminou. Registre aqui o que aconteceu.', corpo, pe, abrir=abrir or erro)
    return j.replace('class="janela"', 'class="janela ju-larga"', 1)


def ficha_enc(feito=False):
    """A ficha aprovada do encerrado importado (sobras.ficha_encerrado), com o botão que abre a janela; e a ficha depois de registrar."""
    if not feito:
        h = ficha_encerrado()
        return h.replace(f'<button class="btn btn-sec" type="button">{ico("lapis")}Registrar o resultado</button>',
                         f'<button class="btn btn-sec" type="button" data-janela="janela-resultado">{ico("lapis")}Registrar o resultado</button>', 1)
    cab = cab_caso(CASO_Q, 'Trabalhista', N_QUEIROZ, 'TRT-2 · PJe', 8, 'Arquivado no Astrea em 14/03/2025. Resultado registrado hoje, por Marina Ribeiro.',
                   '<span class="selo selo-neutro">Encerrado</span>' + selo('ativo', 'Ganho', 'check'), botao=False)
    lo = linha_origem(etapa_antiga='“Arquivado”', ligada='8. Encerrado', onde='Linha P203 da aba Processos (arquivados)')
    d = [('Área', 'Trabalhista'), ('Parte contrária', 'Construtora Lume Ltda.'), ('Valor da causa', '<span class="num">R$ 41.000,00</span>'),
         ('Tribunal', 'TRT da 2ª Região'), ('Vara', '<span class="hn-sem">Não veio do Astrea</span>'), ('Sistema', 'PJe'),
         ('Distribuído em', '<span class="num">22/03/2021</span>'), ('Responsável', 'Marina Ribeiro'), ('Arquivado em', '<span class="num">14/03/2025</span>')]
    corpo_cli = (f'<ul class="lista ju-clientes"><li><span class="av-p forte" aria-hidden="true">RQ</span><div><a class="n" href="cliente.html?estado=cliente-atendido">Renata Queiroz</a><small>Reclamante</small></div>'
                 f'<a class="tel" href="#">{ico("whats")}<span class="num">(11) 98841-2073</span></a><div class="ju-hon"><b>Sem contrato</b><small>Veio encerrado: não pede contrato</small></div></li></ul>')
    cli = folha('t-cli', 'Clientes do caso', '1 cliente', corpo_cli)
    res = folha('t-res', 'Resultado', '', f'<div class="il-res">{selo("ativo", "Ganho", "check")}'
                '<p><b style="color:var(--texto);font-weight:500">Registrado hoje por Marina Ribeiro.</b> Entra nas contas de ganho, perda e acordo. '
                'Não pede acerto no Financeiro, porque o caso veio sem contrato.</p></div>', peq=True)
    ctr = folha('t-ctr', 'Contratos ligados', '', f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>Nenhum contrato ligado</b><small>Caso encerrado não ganha lembrete de contrato.</small></span></li></ul>', peq=True)
    novo = (f'<li class="novo"><time>hoje</time><span>Resultado: <b>ganho</b> · Marina Ribeiro<em>“{MOTIVO_OK}”</em>'
            f'<small>Nenhum aviso foi ao cliente.</small></span></li>')
    imp = (f'<li class="il-imp"><time>21/11</time><span>Entrou em <b>Encerrado</b> · pela importação do Astrea, por Marina Ribeiro'
           f'<em>No Astrea: “Arquivado” em 14/03/2025. Entrou como encerrado, porque a importação marcou “Importar como encerrados”.</em></span></li>')
    hist = folha('t-hist', 'Mudanças de etapa', '', f'<ol class="ju-hist">{novo}{imp}</ol>', peq=True)
    pt = folha('t-pt', 'Prazos e tarefas', 'Caso encerrado', '<p class="il-sem-prazo" style="font-size:13px;color:var(--texto-2)">Nenhum prazo nem tarefa. A importação não traz prazos, e o caso já chegou encerrado.</p>')
    t = toast('Resultado registrado: ganho.', 'O caso entra nas contas de resultado e a mudança está no histórico. Nenhum aviso foi a Renata.')
    return (t + f'<div class="ju">{cab}{lo}<div class="ju-grade ju-ficha-grade"><div class="ju-col">{dados(d)}{cli}{pt}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{res}{ctr}{hist}</aside></div></div>')


# ================================================================ 2. Encerrados com a importação desfeita (P12)
N_SOUZA = IS['cnj'](1004410, 2026, 8, 26, 100)
ENC2 = [('Souza x Telecom Aurora', N_SOUZA, 'Consumidor', 'Vera Souza', ('desf', 'sem resultado · importação do Astrea de 20/11 desfeita em 21/11/2026'), 'Larissa Costa', '#')] + ENC


def lista_enc2():
    R = JU['resp']
    linhas, cartoes = '', ''
    for nome, num, area, cli, como, rsp, href in ENC2:
        if como[0] == 'res':
            c = f'<div class="il-como">{selo(como[1], como[2])}<small>{como[3]}</small></div>'
            c_cel, o, sc = f'{como[2]} · {como[3]}', '', ''
        elif como[0] == 'imp':
            c = f'<div class="il-como">{selo_enc()}<small>sem resultado · {como[1]}</small></div>'
            c_cel = f'Veio encerrado · {como[1]}'
            o = f'<div style="margin-top:4px">{orig("astrea", True)}</div>'
            sc = f'<div class="c-selos">{selo_enc()}{orig("astrea", True)}</div>'
        else:
            c = f'<div class="il-como">{selo("neutro", "Importação desfeita", "historico")}<small>{como[1]}</small></div>'
            c_cel = f'Importação desfeita · {como[1]}'
            o = f'<div style="margin-top:4px">{orig("astrea", True)}</div>'
            sc = f'<div class="c-selos">{selo("neutro", "Importação desfeita", "historico")}{orig("astrea", True)}</div>'
        linhas += (f'<tr><td><div class="esc"><div><a href="{href}">{H(nome)}</a><small class="num">{num} · {area}</small>{o}</div></div></td>'
                   f'<td><div class="ju-cli"><strong>{H(cli)}</strong></div></td><td>{c}</td><td>{R(rsp)}</td></tr>')
        cartoes += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{href}">{H(nome)}</a><small class="num">{num}</small></div>{ico("dir", "ico c-ir")}</div>'
                    f'<dl class="c-dados"><dt>Cliente</dt><dd>{H(cli)}</dd><dt>Como encerrou</dt><dd>{c_cel}</dd><dt>Responsável</dt><dd>{rsp}</dd></dl>{sc}</li>')
    cols = '<col style="width:36%"><col style="width:20%"><col style="width:26%"><col style="width:18%">'
    return (f'<table class="so-pc ju-tab"><caption class="sr">Casos encerrados</caption><colgroup>{cols}</colgroup>'
            f'<thead><tr><th scope="col">Caso e processo</th><th scope="col">Cliente</th><th scope="col">Como encerrou</th><th scope="col">Responsável</th></tr></thead>'
            f'<tbody>{linhas}</tbody></table><ul class="cartoes so-cel" aria-label="Casos encerrados">{cartoes}</ul>')


def pagina_encerrados2():
    h = pagina_encerrados()
    h = h.replace('Encerrados (85)', 'Encerrados (88)')
    h = h.replace('<b>85 casos encerrados</b> · 14 com resultado e 71 que vieram encerrados do Astrea · do mais recente para o mais antigo',
                  '<b>88 casos encerrados</b> · 14 com resultado, 71 que vieram encerrados do Astrea e 3 com a importação desfeita · do mais recente para o mais antigo')
    h = h.replace('Mostrando 5 de 85', 'Mostrando 6 de 88')
    h = h.replace(lista_enc(), lista_enc2())
    h = h.replace('fora das contas de ganho, perda e acordo; se quiser, registre o resultado na ficha.',
                  'fora das contas de ganho, perda e acordo; se quiser, registre o resultado na ficha. O de importação desfeita também fica, sem resultado.')
    assert '88 casos' in h and 'Importação desfeita</span>' in h
    return h


# ================================================================ 3. lembretes: sem motivo, já dispensado, trazer de volta, busca fora de Abertos
def ferr2(valor='', ordem=True):
    """As ferramentas aprovadas; fora de Abertos, sem a Ordem (P5)."""
    f = ferr(valor)
    if not ordem:
        f = re.sub(r'<label class="sr" for="il-ord">Ordem</label><select class="entrada" id="il-ord">.*?</select>', '', f, flags=re.S)
    return f


def j_sem_motivo():
    j = j_dispensar(abrir=True)
    topo = aviso('urgencia', 'Falta escolher o motivo.', 'Marque por que o escritório não vai cobrar. O lembrete continua aberto até você dispensar.')
    j = j.replace('<div class="il-lemb">', topo + '<div class="il-lemb">', 1)
    j = j.replace('<fieldset class="il-motivos">', '<fieldset class="il-motivos il-erro" aria-describedby="il-mot-er">', 1)
    j = j.replace('name="il-mot" value=', 'name="il-mot" aria-invalid="true" value=')
    j = j.replace('<span>Outro motivo</span></label></fieldset>',
                  f'<span>Outro motivo</span></label><p class="erro-msg" id="il-mot-er">{ico("alerta", "ico ico-s")}Escolha o motivo. Ele fica no histórico do cliente, com o seu nome.</p></fieldset>', 1)
    assert 'il-mot-er">' in j
    return j


def j_ja_dispensado():
    j = j_dispensar(abrir=True, conflito=True)
    a = ('Este lembrete já saiu da lista.', 'Felipe Matos criou o contrato C-2026-038 para Osvaldo há 2 minutos, e o lembrete saiu sozinho. Nada foi dispensado. Feche a janela para ver a lista atualizada.')
    b = ('Este lembrete já foi dispensado.', 'Felipe Matos já dispensou este lembrete há 3 minutos. Nada mudou: o motivo que você escolheu não foi gravado. O lembrete está em Dispensados, com o motivo de Felipe.')
    for x, y in zip(a, b):
        assert x in j
        j = j.replace(x, y)
    return j


def corpo_disp(itens, cont, toast_html=''):
    global DISPENSADOS
    antes = DISPENSADOS
    DISPENSADOS = itens
    t = linhas_dispensados()
    DISPENSADOS = antes
    return (ferr2(ordem=False) + f'<p class="hn-cont" role="status">{cont} · do mais recente para o mais antigo</p>' + t
            + f'<p class="hn-pe">{ico("historico")}<span>“Trazer de volta” põe o lembrete de novo na lista e na ficha, sem prazo. Fica no histórico do cliente quem dispensou, quem trouxe de volta e o motivo.</span></p>')


def trazido():
    t = toast('O lembrete de Nair voltou para Abertos.', 'Está de novo na lista e na ficha dela, com o mesmo valor. O histórico do cliente guarda quem dispensou e quem trouxe de volta.')
    corpo = corpo_disp(DISPENSADOS[1:], '<b>1 lembrete dispensado</b> · R$ 500,00')
    return t + pagina_lemb(corpo, 'dispensados', nums('dispensados', ('82', 'R$ 46.000,00'), '4', '1'))


def trazido_resolvido():
    t = toast_acao('O lembrete de Jorge voltou já resolvido.', 'O contrato C-2026-039 foi criado enquanto ele estava dispensado. Por isso foi direto para Viraram contrato, e não para Abertos.',
                   f'<a class="btn btn-sec" href="{L}viraram">{ico("pena")}Ver em Viraram contrato</a>')
    corpo = corpo_disp(DISPENSADOS[:1], '<b>1 lembrete dispensado</b> · R$ 750,00')
    return t + pagina_lemb(corpo, 'dispensados', nums('dispensados', ('81', 'R$ 45.250,00'), '5', '1'))


def busca_vazia_viraram():
    e = estado('Nenhum lembrete em Viraram contrato para “Tavares”',
               'Confira o nome do cliente ou do caso. Aqui a busca olha só os que viraram contrato. Para procurar nos abertos ou nos dispensados, clique no número acima: a busca vai junto.',
               'busca', moldura=False, acoes=f'<button class="btn btn-sec" type="button">{ico("x")}Limpar a busca</button>')
    return pagina_lemb(ferr2('Tavares', ordem=False) + '<p class="hn-cont" role="status"><b>Nenhum lembrete encontrado</b> em Viraram contrato para “Tavares”</p>' + e, 'viraram')


# ================================================================ páginas
# As mesmas definições da parte de estados do sobras.py aprovado (que não é lida acima).
CSS_PAG = CL['CSS_CL'] + CT['CSS'] + IS['CSS_IM'] + IS['CSS_IS'] + CSS_IL
URL = {'Contratos': CTR + 'contratos', 'Honorários': CTR + 'honorarios', 'Procurações e modelos': CTR + 'procuracoes'}
A = dict(area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|Contratos|Lembretes de contrato', titulo='Lembretes de contrato')
JA = JU['A']
FQ = JA('Casos e processos', f'Jurídico|Casos e processos|{CASO_Q}', CASO_Q)
T = ''
T += tpl('resultado', ficha_enc() + j_resultado(abrir=True), **FQ)
T += tpl('resultado-erro', ficha_enc() + j_resultado(erro=True), **FQ)
T += tpl('resultado-feito', ficha_enc(feito=True), **FQ)
T += tpl('encerrados-desfeitos', pagina_encerrados2(), **JA('Casos e processos', 'Jurídico|Casos e processos', 'Casos e processos'))
out = JU['pagina']('Jurídico', 'Registrar o resultado do caso que veio encerrado de outro sistema e a contagem dos Encerrados com a importação desfeita (F3.56).',
                   '{"estado":"resultado","atual":"juridico"}', '', T, JU['BARRAS'])
out = out.replace('</style>', JU['CSS_JU'] + IS['CSS_HN'] + CSS_IL + CSS_IL2 + '\n</style>', 1)
open(os.path.join(SAIDA, 'juridico.html'), 'w', encoding='utf-8').write(out)
print('juridico ok', T.count('<template data-est='), 'estados')

T = ''
T += tpl('dispensar-sem-motivo', lista() + j_sem_motivo(), **A)
T += tpl('ja-dispensado', lista() + j_ja_dispensado(), **A)
T += tpl('trazido', trazido(), **A)
T += tpl('trazido-resolvido', trazido_resolvido(), **A)
T += tpl('busca-vazia-viraram', busca_vazia_viraram(), **A)
out = montar('lembretes.html', 'Lembretes de contrato', 'Dispensar sem motivo, lembrete já dispensado, trazer de volta e busca fora de Abertos, na lista dos lembretes de contrato (F3.56).',
             '{"estado":"dispensar-sem-motivo","atual":"contratos"}', T, barras('contratos', URL), CSS_PAG + CSS_IL2)
open(os.path.join(SAIDA, 'lembretes.html'), 'w', encoding='utf-8').write(out)
print('lembretes ok', T.count('<template data-est='), 'estados')
