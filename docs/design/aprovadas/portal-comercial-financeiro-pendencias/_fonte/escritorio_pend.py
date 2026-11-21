# Portal · Escritório › Ajustes do financeiro: o contador (F3.50, FI-21), o saldo de abertura do caixa
# (F3.50, FI-09), o prazo para repassar (F3.46, FI-05) e a meta de receita (F3.49, IN-09, só o resumo; a janela
# mora no Resumo). Usa as peças do financeiro.py aprovado. Uso: python3 escritorio_pend.py <pasta-saida>
import sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import financeiro as F
from comum import tpl, janela, aviso, toast, ico, estado, pagina
from pend import *

R, folha, campo = F.R, F.folha, F.campo
FIN = 'financeiro.html?estado='
ESC = 'escritorio.html?estado='


def form_ajustes(v='dona'):
    vazio = v == 'vazio'
    erros = v == 'erros'
    topo = ''
    if erros:
        topo = resumo_erros(2, 'Os ajustes ainda não foram salvos. O resto do que você mudou continua aqui.')
    elif v == 'falha':
        topo = falha('Não deu para salvar os ajustes.', 'Nada foi salvo: o contador, o prazo e o saldo continuam como estavam. O que você mudou continua aqui; tente de novo.', 'ESC-4F63-1811')
    elif vazio:
        topo = aviso('info', 'Falta o saldo de abertura e o contador.',
                     'Sem o saldo de abertura, o Caixa começa em R$ 0,00 e o saldo do escritório não bate com o do banco. Sem o contador, a exportação só baixa no seu aparelho.')
    # Contador
    email = campo('es-mail', 'E-mail do contador', 'contato@exemplo' if erros else ('' if vazio else 'contato@exemplo.com.br'), tipo='email', ac='email',
                  ajuda='Para onde vai a exportação do mês.', erro='Este e-mail está incompleto: falta o final, como .com.br.' if erros else '', foco=erros or vazio)
    cont = (f'<div class="pd-corpo"><div class="fi-dois">{campo("es-nome", "Nome do contador", "" if vazio else "Paulo Serra")}'
            f'{campo("es-firma", "Escritório de contabilidade", "" if vazio else "Contabilidade Silva", opc=True)}</div>'
            f'<div class="fi-dois">{email}{campo("es-tel", "Telefone", "" if vazio else "(11) 3456-7890", opc=True, im="tel")}</div>'
            f'<fieldset class="fi-grupo-op"><legend>Envio</legend>'
            + caixa_sel('es-env', 'Mandar por e-mail quando alguém exportar o mês', 'A planilha vai anexada; os comprovantes vão num link do .zip, que vale por 30 dias.', marcado=not vazio)
            + caixa_sel('es-lem', 'Lembrar no dia 5 de exportar o mês anterior', 'O lembrete aparece no Início e no sino de quem tem o Financeiro.', marcado=not vazio)
            + '</fieldset>'
            f'<p class="pd-nota">{ico("cadeado")}<span>O contador não entra no T3jus. Ele recebe só o e-mail, que sai de <b>T3jus &lt;nao-responda@t3jus.pro&gt;</b> em nome do escritório, com resposta para o seu e-mail.</span></p></div>')
    f_cont = folha('t-cont', 'Contador do escritório', cont, icone='doc', sub='Quem recebe a exportação mensal do Financeiro')
    # Saldo de abertura
    if vazio:
        ab = (f'<div class="pd-corpo"><div class="fi-dois">{campo("es-abd", "Data", "31/08/2026", im="numeric", ajuda="O dia antes do primeiro lançamento no T3jus. dd/mm/aaaa")}'
              f'{campo("es-abv", "Saldo na conta nesse dia", "", im="decimal", ajuda="Como está no extrato do banco, só o que é do escritório.")}</div>'
              f'<p class="pd-nota">{ico("escudo")}<span>Dinheiro de clientes que já estava na conta não entra aqui: registre em Repasses, como alvará ou acordo, com o dia em que entrou.</span></p></div>')
    else:
        ab = (f'<div class="pd-corpo"><div class="es-ab"><div><p class="es-ab-v num">{R(12480)}</p><p class="es-ab-d">em 31/08/2026, o dia antes do primeiro lançamento</p></div>'
              f'<button class="btn btn-sec" type="button" data-janela="janela-abertura">{ico("lapis")}Corrigir</button></div>'
              f'<p>Lançado por Marina Ribeiro em 01/09/2026. O saldo do Caixa é este valor mais o que entrou e menos o que saiu a partir de 01/09. Lançamentos com data anterior ficam no histórico, mas não mudam o saldo.</p></div>')
    f_ab = folha('t-ab', 'Saldo de abertura do caixa', ab, icone='moeda', sub='Onde o Caixa do escritório começa')
    # Prazo
    prazo = campo('es-prazo', 'Dias úteis para repassar', '0' if erros else '3', im='numeric',
                  ajuda='De 1 a 30. Conta de segunda a sexta, a partir do dia em que o dinheiro entrou.',
                  erro='Escreva de 1 a 30 dias úteis. O padrão é 3.' if erros else '')
    f_pz = folha('t-pz', 'Prazo para repassar', (
        f'<div class="pd-corpo"><div class="es-prazo">{prazo}</div>'
        f'<p>Vale para o dinheiro que entrar depois de salvar. Os repasses já registrados mantêm o prazo que tinham; para um repasse atrasado, anote o motivo e a próxima ação nele.</p></div>'),
        icone='relogio', sub='Depois que um alvará, RPV ou acordo entra')
    # Meta
    if vazio:
        mt = (f'<div class="pd-corpo"><p>Sem meta. Defina no Resumo do Financeiro, onde ela é comparada com o que entrou.</p>'
              f'<a class="btn btn-sec" href="{FIN}mt-sem-meta">{ico("dir")}Definir no Resumo</a></div>')
    else:
        mt = (f'<dl class="pd-ro"><div><dt>Todo mês</dt><dd class="num">{R(50000)}<small>desde novembro de 2026; antes, {R(45000)}</small></dd></div>'
              f'<div><dt>Só em um mês</dt><dd class="num">Dezembro de 2026: {R(40000)}<small>recesso</small></dd></div></dl>'
              f'<div class="pd-corpo"><a class="btn btn-sec" href="{FIN}mt-definir">{ico("lapis")}Mudar no Resumo</a></div>')
    f_mt = folha('t-mt', 'Meta de receita', mt, icone='funcoes', sub='Honorários que o escritório quer receber no mês')
    pe = (f'<div class="form-pe"><span class="esq-pe">O que você mudar fica no histórico, com o antes e o depois.</span>'
          f'<button class="btn btn-fantasma" type="button">Cancelar</button>'
          f'<a class="btn btn-pri" href="{ESC}es-salvo">{ico("check")}Salvar</a></div>')
    if erros:
        prazo_foco = ''
    return f'{topo}<form class="fi-col" action="#" novalidate aria-label="Ajustes do financeiro">{f_cont}{f_ab}{f_pz}{f_mt}{pe}</form>'


def lado(v='dona'):
    onde = folha('t-onde', 'Onde isso aparece', (
        f'<div class="pd-corpo"><ul class="es-lista">'
        f'<li>{ico("envelope")}<span><b>Caixa › Exportar para o contador</b>: o e-mail sai para o contador, com a planilha e o link dos comprovantes.</span></li>'
        f'<li>{ico("moeda")}<span><b>Caixa</b>: o saldo do escritório começa no saldo de abertura.</span></li>'
        f'<li>{ico("relogio")}<span><b>Repasses</b>: o prazo de cada parte, os atrasos e o Início de quem cuida.</span></li>'
        f'<li>{ico("funcoes")}<span><b>Resumo</b>: a meta ao lado do que entrou e dos meses anteriores.</span></li></ul></div>'
        f'<p class="pt-pe-folha">{ico("cadeado")}<span>Quem muda: só Marina Ribeiro, a sócia dona. Quem tem o Financeiro vê.</span></p>'))
    novo = ''
    if v == 'salvo':
        novo = (f'<li><time>10h25</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> mudou o prazo para repassar<span class="selo selo-ativo">Novo</span></p>'
                f'<small>De 3 para 2 dias úteis. Vale para o que entrar a partir de agora.</small></div></li>')
    evs = (f'<div class="eventos-dia" style="padding-top:0"><h3>18/11/2026 · hoje</h3><ol class="eventos">{novo}'
           f'<li><time>9h40</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> mudou a meta</p><small>De {R(45000)} para {R(50000)}, todo mês, a partir de novembro.</small></div></li></ol></div>'
           f'<div class="eventos-dia"><h3>01/09/2026</h3><ol class="eventos">'
           f'<li><time>11h02</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> lançou o saldo de abertura</p><small>{R(12480)} em 31/08/2026</small></div></li>'
           f'<li><time>10h50</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> cadastrou o contador</p><small>Paulo Serra · Contabilidade Silva</small></div></li></ol></div>')
    if v == 'vazio':
        evs = '<p class="pd-corpo" style="font-size:13px;color:var(--texto-2)">Nada mudou ainda. Cada ajuste vai aparecer aqui, com quem mudou e quando.</p>'
    hist = folha('t-h', 'Histórico', evs, icone='historico', sub='Nada é apagado')
    return f'<aside class="fi-col" aria-label="Sobre os ajustes">{onde}{hist}</aside>'


def so_leitura():
    av = aviso('info', 'Você vê esta página só para ler.', 'Quem muda o contador, o saldo de abertura, o prazo e a meta é Marina Ribeiro, a sócia dona. Se algo estiver errado, fale com ela.', icone='cadeado')
    dl = (f'<dl class="pd-ro"><div><dt>Contador</dt><dd>Paulo Serra · Contabilidade Silva<small>contato@exemplo.com.br · recebe a exportação por e-mail</small></dd></div>'
          f'<div><dt>Saldo de abertura</dt><dd class="num">{R(12480)}<small>em 31/08/2026</small></dd></div>'
          f'<div><dt>Prazo para repassar</dt><dd>3 dias úteis</dd></div>'
          f'<div><dt>Meta de receita</dt><dd class="num">{R(50000)} todo mês<small>dezembro de 2026: {R(40000)}, só este mês</small></dd></div></dl>')
    return av + '<div class="fi-grade"><div class="fi-col">' + folha('t-ro', 'Ajustes do financeiro', dl, icone='ajustes') + '</div>' + lado() + '</div>'


def j_abertura():
    corpo = (f'<div class="fi-alvo">{ico("moeda")}<div><strong>Saldo de abertura de hoje</strong><small>em 31/08/2026 · lançado por Marina Ribeiro em 01/09</small></div><span class="fi-v num">{R(12480)}</span></div>'
             + '<div class="fi-dois">' + campo('ab-d', 'Data', '31/08/2026', im='numeric', ajuda='dd/mm/aaaa') + campo('ab-v', 'Saldo certo', '13.180,00', im='decimal', foco=True) + '</div>'
             + texto_area('ab-m', 'Por que corrigir', 'Faltou somar uma aplicação que voltou para a conta em 31/08.', ajuda='Obrigatório. Fica no histórico, com o valor anterior.', limite=300)
             + f'<p class="fi-ref">{ico("moeda")}<span>O saldo do Caixa de hoje passa de <b>{R(40310)}</b> para <b>{R(41010)}</b>, e a previsão dos próximos meses sobe {R(700)}. As exportações já enviadas ao contador não mudam: o histórico diz que o saldo foi corrigido depois.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Corrigir o saldo</button>'
    return janela('janela-abertura', 'Ajustes do financeiro', 'Corrigir o saldo de abertura', 'O valor anterior não se apaga: fica no histórico.', corpo, pe, abrir=True)


def tela(v='dona'):
    cab = F.cab_secao('Escritório', 'Ajustes do financeiro', 'O contador, onde o caixa começa, o prazo para repassar e a meta do mês. Só a sócia dona muda.')
    if v == 'equipe':
        return f'<div class="fi">{cab}{so_leitura()}</div>'
    if v == 'sem-area':
        e = estado('Os ajustes do financeiro são da área Financeiro', 'O contador, o saldo do caixa, o prazo de repasse e a meta ficam com quem tem a área Financeiro. Quem libera é Marina Ribeiro, a sócia dona.',
                   'cadeado', h='h2', papel='status', acoes=f'<a class="btn btn-pri" href="../portal-v1/escritorio.html">{ico("coluna")}Ver os dados do escritório</a>')
        return f'<div class="fi">{cab}{e}</div>'
    extra = ''
    if v == 'salvo':
        extra = toast('Ajustes salvos.', 'O prazo para repassar agora é de 2 dias úteis, para o que entrar a partir de agora.')
    if v == 'abertura':
        extra = j_abertura()
    f = form_ajustes(v)
    if v == 'salvo':
        f = f.replace('value="3"', 'value="2"')
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{f}</div>{lado(v)}</div></div>{extra}'


CSS_ES = r"""
/* ===== Escritório › Ajustes do financeiro (es-) ===== */
.es-ab{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2)}
.es-ab-v{font-family:var(--serifa);font-size:30px;font-weight:500;color:var(--vinho);line-height:1.1}
.es-ab-d{font-size:13px;color:var(--texto-2)}
.es-prazo{max-width:280px}
.es-lista{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.es-lista li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.45}
.es-lista li .ico{color:var(--vinho);flex:none;margin-top:1px}
.es-lista b{font-weight:500}
.fi>.aviso{margin:0}
@media (max-width:760px){.es-prazo{max-width:none}}
"""

AE = dict(atual='escritorio', area='escritorio', secao='Ajustes do financeiro', trilha='Escritório|Ajustes do financeiro', titulo='Ajustes do financeiro')
T = ''
T += tpl('es-ajustes', tela(), **AE)
T += tpl('es-vazio', tela('vazio'), **AE)
T += tpl('es-erros', tela('erros'), **AE)
T += tpl('es-falha', tela('falha'), **AE)
T += tpl('es-salvo', tela('salvo'), **AE)
T += tpl('es-abertura', tela('abertura'), **AE)
T += tpl('es-equipe', tela('equipe'), quem='bianca', **AE)
T += tpl('es-sem-area', tela('sem-area'), quem='juridico', **dict(AE, secao='sem-financeiro'))


def barra(com=True):
    a = f'<a href="{ESC}es-ajustes" aria-current="page">Ajustes do financeiro</a>' if com else ''
    return (f'<div class="pt-barra-area"><p class="pt-area-nome">{ico("coluna")}Escritório</p>'
            f'<nav class="pt-secoes" aria-label="Seções do Escritório"><a href="../portal-v1/escritorio.html">Dados do escritório</a>'
            f'<a href="../portal-whatsapp/whatsapp.html?estado=ligado">WhatsApp e IA</a><a href="../portal-carne/escritorio.html?estado=recebimento">Recebimento</a>{a}</nav></div>')


BARRAS = (f'<template data-barra="escritorio|Ajustes do financeiro">{barra()}</template>\n'
          f'<template data-barra="escritorio|sem-financeiro">{barra(False)}</template>\n')
out = pagina('Ajustes do financeiro', 'Escritório › Ajustes do financeiro: o contador, o saldo de abertura do caixa, o prazo para repassar e a meta de receita.',
             '{"estado":"es-ajustes","atual":"escritorio"}', '', '', BARRAS)
out = out.replace('</style>', F.CSS_FI + '\n</style>', 1)
out = injetar(out, T, CSS_ES)
out = out.replace('href="escritorio.html"', f'href="{ESC}es-ajustes"').replace('href="#" data-nav="financeiro"', f'href="{FIN}mt-resumo" data-nav="financeiro"')
open(os.path.join(SAIDA, 'escritorio.html'), 'w', encoding='utf-8').write(out)
print('escritorio ok', T.count('<template data-est='), 'estados')
