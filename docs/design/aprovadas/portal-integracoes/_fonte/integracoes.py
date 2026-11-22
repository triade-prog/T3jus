# Portal · Escritório › Integrações (PT-15, PT-01, PT-02, PT-03, PT-10, PT-11, PT-17).
# Chaves da API de parceiros e avisos para o parceiro (webhooks). Só a sócia dona vê e mexe.
# Parte da moldura do Portal v1 (comum.py, sem mudança), do extra.py (sem mudança), do CSS cv- aprovado
# das Conversas e do CSS wa- aprovado do WhatsApp e IA (lidos do conversas.py e do whatsapp.py, que não são rodados).
# Peças novas com prefixo ig-. Uso: python3 integracoes.py <pasta-saida>
import sys, os, ast
from extra import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'integracoes.html?estado='
AQUI = os.path.dirname(os.path.abspath(__file__))


def _literal(arquivo, nome):
    arv = ast.parse(open(os.path.join(AQUI, arquivo), encoding='utf-8').read())
    for n in arv.body:
        if isinstance(n, ast.Assign) and any(getattr(t, 'id', '') == nome for t in n.targets):
            return ast.literal_eval(n.value)
    raise KeyError(nome)


CSS_CV = _literal('conversas.py', 'CSS_CV')
CSS_WA = _literal('whatsapp.py', 'CSS_WA')
SPRITE_WA = _literal('whatsapp.py', 'SPRITE_WA')

# Ícones novos, no mesmo traço (grade 24, 1,6, cantos vivos)
SPRITE_IG = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">'
             '<symbol id="i-tomada" viewBox="0 0 24 24"><path d="M9 3v5M15 3v5"/><path d="M6 8h12v4a6 6 0 0 1-12 0Z"/><path d="M12 18v3"/></symbol>'
             '<symbol id="i-barras" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M6 16v-4M10 16V8M14 16v-6M18 16V5"/></symbol>'
             '<symbol id="i-sinal" viewBox="0 0 24 24"><path d="M12 13.5a1.5 1.5 0 1 1 0-.1Z"/><path d="M8.5 9.5a5 5 0 0 0 0 7M15.5 9.5a5 5 0 0 1 0 7"/><path d="M5.6 6.6a9 9 0 0 0 0 12.8M18.4 6.6a9 9 0 0 1 0 12.8"/></symbol>'
             '<symbol id="i-codigo" viewBox="0 0 24 24"><path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/></symbol>'
             '</svg>')

# ---------------------------------------------------------------- dados fictícios (elenco aprovado)
DONA = 'Marina Ribeiro'
CHAVES = {
    'acme': dict(nome='Integração Acme Publicações', pre='t3j_live_a1b2c3d4', esc=['Clientes', 'Jurídico'], cpf=False,
                 criada='02/09/2026', ate='02/09/2027', meses='12 meses', uso='hoje, 10:04', n30='4.212'),
    'cont': dict(nome='Planilha do contador', pre='t3j_live_7f3e9b20', esc=['Financeiro'], cpf=False,
                 criada='27/05/2026', ate='27/11/2026', meses='6 meses', uso='hoje, 07:00', n30='62'),
    'bi': dict(nome='Painel de relatórios (teste)', pre='t3j_live_5c90d1aa', esc=['Clientes', 'Contratos', 'Financeiro'], cpf=False,
               criada='14/10/2026', ate='14/01/2027', meses='3 meses', uso='02/11, 16:40', n30='0'),
    'agenda': dict(nome='Agenda da recepção', pre='t3j_live_0d4b77e1', esc=['Jurídico'], cpf=False,
                   criada='10/08/2026', ate='10/08/2027', meses='12 meses', uso='hoje, 09:30', n30='1.310'),
    'selo': dict(nome='Assinaturas Selo Digital', pre='t3j_live_9a61f0c3', esc=['Clientes', 'Contratos'], cpf=True,
                 criada='21/07/2026', ate='21/07/2027', meses='12 meses', uso='ontem, 17:12', n30='388'),
    'pesq': dict(nome='Pesquisa de satisfação', pre='t3j_live_3e2c58b6', esc=['Clientes', 'Jurídico'], cpf=False,
                 criada='05/06/2026', ate='05/12/2026', meses='6 meses', uso='15/09, 11:02', n30='0'),
}
NOVA = 't3j_live_e8c41f07b9a2d65c3f1e0a9b7d24c8f6'
SEGREDO = 'whsec_4kT9mQ2vX7pL1sR8nB3cF6yH0dJ5wZ'
AREAS_ESC = [
    ('Clientes', 'pessoas', 'Nome, contatos, endereço e situação do cliente. Sem CPF e documentos, que ficam à parte.'),
    ('Jurídico', 'balanca', 'Casos, processos, etapas, prazos e compromissos da agenda.'),
    ('Contratos', 'pena', 'Contratos de honorários, condições, assinatura e encerramento.'),
    ('Financeiro', 'carteira', 'Parcelas, recebimentos e contas a pagar e a receber.'),
]
EVENTOS = [
    ('Clientes', [('cli-mud', 'Cliente criado ou alterado', ''),
                  ('cli-exc', 'Dados do cliente excluídos', 'Para o parceiro apagar também (LGPD).')]),
    ('Jurídico', [('caso-novo', 'Caso criado', ''), ('caso-etapa', 'Etapa do caso mudou', ''),
                  ('comp', 'Compromisso criado, alterado ou cancelado', 'Audiência, reunião e perícia da Agenda.')]),
    ('Contratos', [('ct-ass', 'Contrato assinado', ''), ('ct-enc', 'Contrato encerrado', '')]),
    ('Financeiro', [('rec', 'Recebimento registrado', ''), ('atr', 'Parcela atrasou', '')]),
]


# ---------------------------------------------------------------- peças
def selo(tipo, txt, i=None):
    return f'<span class="selo selo-{tipo}">{ico(i) if i else ""}{txt}</span>'


def folha(id_, titulo, sub, corpo, icone=None, cls='', acao=''):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    i = ico(icone) if icone else ''
    return (f'<section class="folha {cls}" aria-labelledby="{id_}" style="overflow:hidden"><div class="folha-cab"><div><h2 id="{id_}">{i}{titulo}</h2>{s}</div>{acao}</div>{corpo}</section>')


def lista_x(itens):
    return '<ul class="cv-lista-x">' + ''.join(f'<li>{ico(i)}<span>{t}</span></li>' for i, t in itens) + '</ul>'


def chips(esc, cpf=False):
    ic = {a: i for a, i, _ in AREAS_ESC}
    h = ''.join(f'<li class="ig-chip">{ico(ic[e])}{e}</li>' for e in esc)
    if cpf:
        h += f'<li class="ig-chip ig-chip-cpf">{ico("cadeado")}CPF e documentos</li>'
    return f'<ul class="ig-chips" aria-label="O que ela lê">{h}</ul>'


def cab(acoes=''):
    return (f'<div class="wa-cab"><div><p class="sobretitulo">Escritório</p><h1>Integrações</h1><span class="fio" aria-hidden="true"></span>'
            f'<p class="lede">Chaves para sistemas parceiros lerem dados do escritório, e os avisos que o T3jus manda a eles.</p></div>{acoes}</div>')


SEL_CH = {'nenhuma': selo('neutro', 'Nenhuma'), 'ativas': selo('ativo', '2 ativas', 'check'), '5': selo('atencao', '5 de 5 ativas'), 'ativas1': selo('ativo', '1 ativa', 'check')}
SEL_AV = {'nenhum': selo('neutro', 'Nenhum destino'), 'falha': selo('urgente', '1 com falha', 'alerta'), 'ok': selo('ativo', '2 funcionando', 'check'),
          'pausado': selo('urgente', '1 pausado', 'pausa'), 'tres': selo('urgente', '1 com falha', 'alerta')}


def abas(atual, ch, av):
    a1 = ' aria-current="page"' if atual == 'ch' else ''
    a2 = ' aria-current="page"' if atual == 'av' else ''
    return (f'<nav class="abas wa-abas" aria-label="Partes da página"><a href="{U}lista"{a1}>{ico("chave", "ico ico-s")}Chaves de acesso{SEL_CH[ch]}</a>'
            f'<a href="{U}webhooks"{a2}>{ico("sinal", "ico ico-s")}Avisos para o parceiro{SEL_AV[av]}</a></nav>')


def btn_criar(bloq=None):
    if bloq:
        return (f'<div class="ig-bloq"><button class="btn btn-pri" type="button" aria-disabled="true" aria-describedby="ig-bloq-m">{ico("mais")}Criar chave</button>'
                f'<p id="ig-bloq-m">{bloq}</p></div>')
    return f'<a class="btn btn-pri" href="{U}criar">{ico("mais")}Criar chave</a>'


def nunca_sai(margem=True):
    return (f'<p class="wa-fixo">{ico("cadeado")}<span><b>Nunca saem pela API:</b> conversas do WhatsApp, notas internas e dados de saúde. '
            f'Fixo no T3jus, não dá para marcar.</span></p>')


def medida(rot, usado, total, txt):
    pct = round(100 * usado / total, 1)
    return (f'<div class="ig-medida"><p><b>{rot}</b><span class="num">{txt}</span></p>'
            f'<div class="wa-medida" role="img" aria-label="{txt}"><span style="width:{pct}%"></span></div></div>')


def limites(ativas=2, destinos=2):
    return folha('t-lim', 'Limites do escritório', None,
                 f'<div class="wa-corpo">{medida("Chaves ativas", ativas, 5, f"{ativas} de 5")}{medida("Destinos de aviso", destinos, 3, f"{destinos} de 3")}'
                 f'<p class="wa-nota">{ico("medidor")}<span>Cada chave lê até <b>60 vezes por minuto</b> e <b>10.000 vezes por dia</b>. Passou disso, o parceiro espera e tenta de novo; nada se perde.</span></p></div>', 'medidor')


def f_nunca():
    return folha('t-nun', 'O que pode sair e o que nunca sai', 'Só leitura: nenhuma chave cria, muda ou apaga dado no T3jus',
                 '<ul class="ig-pode">' + ''.join(f'<li>{ico(i)}<span><b>{a}.</b> {t}</span></li>' for a, i, t in AREAS_ESC)
                 + f'<li>{ico("cadeado")}<span><b>CPF e documentos dos clientes.</b> Escolha à parte, desmarcada por padrão.</span></li></ul>'
                 + nunca_sai(), 'escudo')


def hist(itens, titulo='Histórico das integrações'):
    return folha('t-hist', titulo, 'Nada é apagado', '<ul class="wa-hist">' + ''.join(f'<li><time>{t}</time><span>{x}</span></li>' for t, x in itens) + '</ul>', 'historico')


HIST_LISTA = [('03/11, 18:40', '<b>Marina</b> revogou “Painel de relatórios (teste)”. Motivo: o teste terminou.'),
              ('02/09, 15:10', '<b>Marina</b> criou “Integração Acme Publicações” (Clientes e Jurídico, 12 meses).'),
              ('02/09, 15:22', '<b>Marina</b> criou o destino de avisos “Acme Publicações”.'),
              ('27/05, 09:05', '<b>Marina</b> criou “Planilha do contador” (Financeiro, 6 meses).')]


# ---------------------------------------------------------------- lista de chaves
def linha_chave(k, sit, sitq, off=False, destaque=False):
    c = CHAVES[k]
    cls = ' class="ig-off"' if off else (' class="ig-vence"' if destaque else '')
    ver = f'<a class="btn btn-sec btn-compacto" href="{U}{"revogada" if off else "ficha"}">{ico("olho")}Ver<span class="sr"> a chave {c["nome"]}</span></a>'
    nome = f'<div class="ig-nome"><strong>{c["nome"]}</strong><span class="ig-mono">{c["pre"]}…</span></div>'
    tr = (f'<tr{cls}><td>{nome}</td><td>{chips(c["esc"], c["cpf"])}</td><td><div class="wa-sit">{sit}<small>{sitq}</small></div></td>'
          f'<td class="num ig-nw">{c["uso"]}</td><td class="ig-acao">{ver}</td></tr>')
    st = ' style="box-shadow:inset 3px 0 0 var(--ambar)"' if destaque else ''
    card = (f'<li class="cartao{" ig-off" if off else ""}"{st}>{nome}{chips(c["esc"], c["cpf"])}<div class="wa-sit">{sit}<small>{sitq}</small></div>'
            f'<p class="ig-uso">Último uso: <span class="num">{c["uso"]}</span></p><div class="c-acoes">{ver.replace(" btn-compacto", "")}</div></li>')
    return tr, card


def tabela_chaves(linhas, cap='Chaves de acesso do escritório'):
    tr = ''.join(l[0] for l in linhas)
    cd = ''.join(l[1] for l in linhas)
    return (f'<table class="so-pc wa-tab ig-tab"><caption class="sr">{cap}</caption>'
            f'<thead><tr><th scope="col">Chave</th><th scope="col">O que lê</th><th scope="col">Situação</th><th scope="col">Último uso</th><th scope="col"><span class="sr">Ação</span></th></tr></thead><tbody>{tr}</tbody></table>'
            f'<ul class="cartoes so-cel" aria-label="{cap}">{cd}</ul>')


def linhas_padrao():
    return [linha_chave('acme', selo('ativo', 'Ativa', 'check'), 'Até 02/09/2027'),
            linha_chave('cont', selo('atencao', 'Vence em 9 dias', 'relogio'), 'Em 27/11/2026. Avisamos em 12/11.', destaque=True),
            linha_chave('bi', selo('neutro', 'Revogada', 'proibido'), 'Em 03/11 por Marina Ribeiro. Motivo: o teste terminou.', off=True)]


def tela_lista(topo='', bloq=None, ch='ativas', av='falha', linhas=None, ativas=2, extra_hist=None):
    aviso_v = aviso('atencao', 'A chave “Planilha do contador” vence em 9 dias, em 27/11',
                    'Depois disso, a planilha para de ler. Crie a substituta, mande ao contador e revogue a antiga quando ele trocar. Não dá para esticar a validade de uma chave.',
                    acoes=(f'<a class="btn btn-sec" href="{U}criar">{ico("mais")}Criar a substituta</a>' if not bloq else ''))
    lista = folha('t-ch', 'Chaves de acesso', f'{ativas} ativas de 5. Revogadas e vencidas ficam na lista, apagadas.', tabela_chaves(linhas or linhas_padrao()), 'chave')
    lado = limites(ativas) + f_nunca() + hist(extra_hist or HIST_LISTA)
    return (f'<div class="wa">{cab(btn_criar(bloq))}{abas("ch", ch, av)}{topo}'
            f'<div class="wa-grade"><div class="wa-col">{aviso_v if ativas == 2 else ""}{lista}</div><aside class="wa-col" aria-label="Limites e histórico">{lado}</aside></div></div>')


def tela_vazio():
    passos = ('<ol class="cv-passos" style="padding:0;margin:0">'
              '<li><span class="disco"><span>1</span></span><span><b>Você cria a chave e marca o que ela lê.</b><small>Clientes, Jurídico, Contratos ou Financeiro. CPF e documentos são escolha à parte.</small></span></li>'
              '<li><span class="disco"><span>2</span></span><span><b>Copia e entrega ao parceiro, por um canal seguro.</b><small>A chave aparece uma vez só. Depois, você vê só o começo dela.</small></span></li>'
              '<li><span class="disco"><span>3</span></span><span><b>Acompanha o uso e revoga quando quiser.</b><small>Revogar vale na hora. A chave vence sozinha em até 12 meses.</small></span></li></ol>')
    principal = (f'<section class="folha" aria-labelledby="t-vz" style="overflow:hidden"><div class="wa-abre"><span class="icone-estado">{ico("tomada")}</span>'
                 f'<div><h2 id="t-vz">Ligue o escritório a um sistema parceiro</h2><p>Uma chave deixa um sistema de fora, como a planilha do contador ou um serviço de publicações, ler dados do escritório no T3jus. Só das áreas que você marcar, e só para ler.</p></div></div>'
                 f'<div class="wa-corpo"><h3 class="sobretitulo" style="margin-top:12px;font-family:inherit;font-weight:500">Como funciona</h3>{passos}'
                 f'<div class="wa-acoes" style="padding:0"><a class="btn btn-pri" href="{U}criar">{ico("mais")}Criar a primeira chave</a>'
                 f'<p class="wa-nota">{ico("ajuda")}<span>Ainda sem parceiro? Não há nada a fazer aqui. A exportação completa dos dados continua em <a href="../portal-v1/escritorio.html">Dados do escritório</a>.</span></p></div>'
                 f'<p class="wa-nota">{ico("cadeado")}<span>Só <b>Marina Ribeiro</b>, a sócia dona, vê e mexe nas integrações. Fica no histórico quem fez e quando.</span></p></div></section>')
    return (f'<div class="wa">{cab()}{abas("ch", "nenhuma", "nenhum")}<div class="wa-grade"><div class="wa-col">{principal}</div>'
            f'<aside class="wa-col" aria-label="Antes de criar">{f_nunca()}{limites(0, 0)}</aside></div></div>')


def tela_limite():
    ls = [linha_chave('acme', selo('ativo', 'Ativa', 'check'), 'Até 02/09/2027'),
          linha_chave('agenda', selo('ativo', 'Ativa', 'check'), 'Até 10/08/2027'),
          linha_chave('selo', selo('ativo', 'Ativa', 'check'), 'Até 21/07/2027'),
          linha_chave('cont', selo('ativo', 'Ativa', 'check'), 'Até 27/11/2026'),
          linha_chave('pesq', selo('atencao', 'Sem uso há 64 dias', 'relogio'), 'Ativa até 05/12/2026. Ainda é usada?', destaque=True),
          linha_chave('bi', selo('neutro', 'Revogada', 'proibido'), 'Em 03/11 por Marina Ribeiro. Motivo: o teste terminou.', off=True)]
    topo = aviso('info', 'O escritório já tem 5 chaves ativas, o máximo',
                 'Para criar outra, revogue uma que não use mais. “Pesquisa de satisfação” não é usada desde 15/09.',
                 acoes=f'<a class="btn btn-sec" href="#">{ico("olho")}Ver “Pesquisa de satisfação”</a>')
    return tela_lista(topo=topo, bloq='Limite de 5 chaves ativas. Revogue uma para criar outra.', ch='5', linhas=ls, ativas=5)


def tela_so_consulta():
    topo = aviso('atencao', 'Portal só para consulta: não dá para criar chave nova agora',
                 'As chaves continuam lendo e os avisos para o parceiro continuam saindo. Revogar continua liberado, para você poder cortar um acesso a qualquer hora. Ao pagar a fatura, criar volta na hora.',
                 icone='cadeado', acoes=f'<a class="btn btn-sec" href="../console-cobranca/portal-escritorio.html?estado=cb-so-consulta">{ico("moeda")}Ver e pagar</a>')
    return tela_lista(topo=topo, bloq='Volta quando a fatura em atraso for paga.')


# ---------------------------------------------------------------- criar
def form_criar(erros=False):
    nome_v = 'Planilha do contador' if erros else 'Planilha do contador, 2027'
    resumo = ''
    if erros:
        resumo = aviso('urgencia', '3 pontos para corrigir antes de criar',
                       '<a href="#cr-nome">Nome: já existe uma chave ativa com este nome</a> · <a href="#cr-areas-l">O que ela lê: marque ao menos uma área</a> · <a href="#cr-ok">Responsabilidade: falta confirmar</a>')
    nome = campo('cr-nome', 'Nome da chave', nome_v, foco=True,
                 ajuda='Para você reconhecer na lista. Diga o parceiro e para que serve.',
                 erro='Já existe uma chave ativa chamada “Planilha do contador”. Use outro nome, como “Planilha do contador, 2027”.' if erros else '')
    marcadas = [] if erros else ['Financeiro']
    ops = ''.join(f'<label class="opcao"><input class="marcar" type="checkbox" name="cr-{a.lower()}"{" checked" if a in marcadas else ""}{" aria-invalid=\"true\"" if erros else ""}>'
                  f'<span>{ico(i, "ico ico-s")} <b>{a}</b><small>{t}</small></span></label>' for a, i, t in AREAS_ESC)
    er = f'<p class="erro-msg" id="cr-areas-er">{ico("alerta", "ico ico-s")}Marque ao menos uma área. Sem área, a chave não lê nada.</p>' if erros else ''
    areas = (f'<fieldset class="x-ops ig-areas" id="cr-areas"{" aria-describedby=\"cr-areas-er\"" if erros else ""}><legend id="cr-areas-l">O que ela pode ler</legend>'
             f'<div class="ig-ops">{ops}</div>{er}</fieldset>')
    cpf = (f'<fieldset class="x-grupo"><legend>Dados pessoais, à parte</legend>'
           + marcar('cr-cpf', 'Incluir CPF e documentos dos clientes', 'Só se o parceiro precisar para identificar o cliente, como numa consulta de processos. Desmarcado por padrão.', False)
           + '</fieldset>')
    val = opcoes_radio('cr-val', 'Validade', [('3', '3 meses', 'Até 18/02/2027'), ('6', '6 meses', 'Até 18/05/2027'), ('12', '12 meses', 'Recomendado. Até 18/11/2027')], '12', 'wa-tres')
    val += f'<p class="wa-nota" style="margin-top:-8px">{ico("sino")}<span>Avisamos você 15 dias antes de vencer, no sino e por e-mail. Vencida, a chave para de ler e fica na lista.</span></p>'
    ok_er = f'<p class="erro-msg" id="cr-ok-er">{ico("alerta", "ico ico-s")}Confirme para criar a chave. Sem isso, nenhum dado sai.</p>' if erros else ''
    ok = (f'<fieldset class="x-grupo ig-aceite"><legend>Responsabilidade (LGPD)</legend>'
          f'<label class="opcao"><input class="marcar" type="checkbox" id="cr-ok" name="cr-ok"{"" if erros else " checked"}{" aria-invalid=\"true\" aria-describedby=\"cr-ok-er\"" if erros else ""}>'
          f'<span>O escritório decidiu compartilhar estes dados com o parceiro e responde por isso.<small>O escritório é quem decide sobre os dados dos clientes. Tenha um contrato com o parceiro dizendo para que ele usa os dados e por quanto tempo guarda.</small></span></label>{ok_er}</fieldset>')
    acoes = (f'<div class="wa-acoes" style="padding:0"><a class="btn btn-sec" href="{U}lista">Cancelar</a><button class="btn btn-pri" type="submit">{ico("chave")}Criar chave</button>'
             f'<p class="wa-nota">{ico("historico")}<span>Fica no histórico: quem criou, quando e o que a chave lê.</span></p></div>')
    form = (f'<div class="wa-passo-cab"><p class="sobretitulo">Chaves de acesso</p><h2 id="t-cr">Nova chave</h2>'
            f'<p>A chave só lê. Ela não cria, não muda e não apaga nada no T3jus.</p></div>'
            f'<form class="wa-form" action="#" onsubmit="return false" novalidate>{resumo}{nome}{areas}{nunca_sai()}{cpf}{val}{ok}{acoes}</form>')
    principal = f'<section class="folha" aria-labelledby="t-cr" style="overflow:hidden">{form}</section>'
    if erros:
        frase = '<p class="wa-frase">Marque ao menos uma área para ver aqui o que a chave vai ler.</p>'
    else:
        frase = ('<p class="wa-frase">A chave <b>“Planilha do contador, 2027”</b> vai ler <b>o Financeiro</b> do Ribeiro &amp; Matos até <b>18/11/2027</b>. '
                 'Sem CPF e documentos dos clientes.</p>')
    res = folha('t-fr', 'Esta chave, numa frase', 'Confira antes de criar', f'<div class="wa-corpo">{frase}</div>', 'chave')
    entregar = folha('t-ent', 'Depois de criar', None, lista_x([
        ('copiar', '<b>A chave aparece uma vez só.</b> Copie e entregue ao parceiro na hora.'),
        ('cadeado', '<b>Use um canal seguro</b>, como um gerenciador de senhas ou o portal do parceiro. Nunca por WhatsApp, e-mail aberto ou planilha.'),
        ('chave', '<b>Trocando uma chave?</b> Revogue a antiga quando o parceiro confirmar que já usa a nova.'),
    ]))
    return (f'<div class="wa">{cab()}{abas("ch", "ativas", "falha")}<div class="wa-grade"><div class="wa-col">{principal}</div>'
            f'<aside class="wa-col" aria-label="Resumo">{res}{entregar}{limites()}</aside></div></div>')


def segredo_box(id_, rot, valor, pre):
    return (f'<div class="ig-segredo"><p class="ig-rot" id="{id_}-r">{rot}</p>'
            f'<div class="ig-seg-l"><code class="ig-mono ig-valor" id="{id_}">{valor}</code>'
            f'<button class="btn btn-pri" type="button" data-copiar="{id_}" aria-describedby="{id_}-r">{ico("copiar")}<span>Copiar</span></button></div>'
            f'<p class="ig-copiado" role="status" aria-live="polite"></p></div>'
            + aviso('atencao', 'Copie agora: não mostramos de novo', f'Nem você nem a equipe T3jus conseguem ver esta chave depois de sair desta tela. Depois, aparece só o começo: <span class="ig-mono">{pre}…</span>. Se perder, revogue e crie outra.', icone='alerta', papel='note'))


def tela_criada():
    corpo = (f'<div class="wa-num-cab"><span class="disco">{ico("chave")}</span><div><p class="sobretitulo">Chave criada agora, 10:12</p><h2 id="t-ok">Planilha do contador, 2027</h2></div>'
             f'<div class="lado">{selo("ativo", "Ativa", "check")}<span>Lê o Financeiro · até 18/11/2027</span></div></div>'
             f'<div class="wa-corpo" style="padding-top:20px">{segredo_box("ig-k", "Sua chave", NOVA, "t3j_live_e8c41f07")}'
             f'<div class="ig-uso-api"><p class="ig-rot">Para quem vai programar no parceiro</p><dl class="wa-resumo" style="padding:0">'
             f'<div><dt>Endereço da API</dt><dd class="ig-mono">https://api.t3jus.pro/v1</dd></div>'
             f'<div><dt>Como mandar a chave</dt><dd class="ig-mono">Authorization: Bearer &lt;chave&gt;</dd></div>'
             f'<div><dt>Manual</dt><dd><p>Em <a href="#">api.t3jus.pro/manual</a>, com endereços, campos, páginas de resultado e erros, por versão.</p></dd></div></dl></div>'
             f'<div class="wa-acoes" style="padding:0"><a class="btn btn-pri" href="{U}lista">{ico("check")}Já copiei, concluir</a></div></div>')
    principal = f'<section class="folha" aria-labelledby="t-ok" style="overflow:hidden">{corpo}</section>'
    lado = folha('t-ent', 'Como entregar ao contador', None, lista_x([
        ('cadeado', '<b>Por um canal seguro</b>, como um gerenciador de senhas ou o portal do escritório de contabilidade.'),
        ('proibido', '<b>Nunca por WhatsApp, e-mail aberto ou planilha.</b> Quem tiver a chave lê o Financeiro.'),
        ('chave', '<b>A chave antiga vence sozinha em 27/11.</b> Se o contador trocar antes, revogue a antiga em “Planilha do contador”.'),
    ]), 'escudo')
    return (f'<div class="wa">{cab()}{abas("ch", "ativas", "falha")}<div class="wa-grade"><div class="wa-col">{principal}</div>'
            f'<aside class="wa-col" aria-label="Como entregar">{lado}{limites(3)}</aside></div></div>')


# ---------------------------------------------------------------- ficha
DIAS = []
for i in range(30):
    d = 20 + i
    dia, mes = (d, 10) if d <= 31 else (d - 31, 11)
    sem = (i + 1) % 7  # 20/10/2026 é terça
    fds = sem in (4, 5)  # sábado e domingo
    v = 22 + (i * 7) % 9 if fds else 120 + (i * 37) % 70 + (40 if i in (17, 23) else 0)
    DIAS.append((f'{dia:02d}/{mes:02d}', v, fds))


def grafico(apagado=False):
    tot = sum(v for _, v, _ in DIAS)
    mx = max(DIAS, key=lambda x: x[1])
    w, h, g = 600, 140, 4
    bw = (w - g * 29) / 30
    barras = ''
    for i, (d, v, fds) in enumerate(DIAS):
        bh = max(2, round(v / 260 * (h - 4), 1))
        x = round(i * (bw + g), 1)
        cor = 'var(--vinho-4)' if apagado else ('var(--vinho-4)' if fds else 'var(--vinho)')
        barras += f'<rect x="{x}" y="{h - bh}" width="{round(bw, 1)}" height="{bh}" rx="2" fill="{cor}"/>'
    rot = f'Chamadas por dia de 20/10 a 18/11: {tot:,} no total; o dia com mais foi {mx[0]}, com {mx[1]}; nos fins de semana, cerca de 25 por dia.'.replace(',', '.')
    return (f'<figure class="ig-graf"><svg viewBox="0 0 {w} {h}" preserveAspectRatio="none" role="img" aria-label="{rot}">'
            f'<line x1="0" y1="{h - .5}" x2="{w}" y2="{h - .5}" stroke="var(--borda-folha)"/>{barras}</svg>'
            f'<div class="ig-eixo" aria-hidden="true"><span style="left:0">20/10</span><span style="left:{round(12/30*100,1)}%">01/11</span><span style="right:0">hoje</span></div>'
            f'<figcaption><span class="ig-q"><i></i>Dia útil</span><span class="ig-q"><i class="f"></i>Fim de semana</span><span>Só a contagem. O conteúdo das respostas não fica guardado.</span></figcaption></figure>'), tot


CHAMADAS = [
    ('hoje, 10:04', 'Casos alterados na última hora', 'GET /v1/casos?alterados_desde=…', '3', ('ok', 'Deu certo', 'check')),
    ('hoje, 10:03', 'Um caso', 'GET /v1/casos/cs_7Q2M', '1', ('ok', 'Deu certo', 'check')),
    ('hoje, 09:04', 'Clientes alterados na última hora', 'GET /v1/clientes?alterados_desde=…', '0', ('ok', 'Deu certo', 'check')),
    ('hoje, 08:12', 'Prazos da semana', 'GET /v1/prazos?de=16/11&amp;ate=22/11', '14', ('ok', 'Deu certo', 'check')),
    ('ontem, 23:10', 'Lista de contratos', 'GET /v1/contratos', '—', ('urgente', 'Recusada: a chave não lê Contratos', 'proibido')),
    ('ontem, 19:30', 'Clientes, página 4 de 9', 'GET /v1/clientes?pagina=4', '—', ('atencao', 'Passou de 60 por minuto: esperou e repetiu', 'relogio')),
]


def tabela_chamadas(rev=False):
    ls = list(CHAMADAS)
    if rev:
        ls = [('hoje, 10:14', 'Casos alterados na última hora', 'GET /v1/casos?alterados_desde=…', '—', ('urgente', 'Recusada: chave revogada', 'proibido'))] + ls[:4]
    tr, cd = '', ''
    for hora, oq, rota, n, (t, r, i) in ls:
        res = selo(t, r, i)
        tr += f'<tr><td class="num ig-nw">{hora}</td><td><div class="ig-pedido"><strong>{oq}</strong><span class="ig-mono">{rota}</span></div></td><td class="num">{n}</td><td><div class="wa-sit">{res}</div></td></tr>'
        cd += f'<li class="cartao"><p class="ig-hora num">{hora}</p><div class="ig-pedido"><strong>{oq}</strong><span class="ig-mono">{rota}</span></div><p class="ig-uso">Registros: <span class="num">{n}</span></p><div class="wa-sit">{res}</div></li>'
    return (f'<table class="so-pc wa-tab ig-tab"><caption class="sr">Últimas chamadas da chave</caption>'
            f'<thead><tr><th scope="col">Hora</th><th scope="col">O que pediu</th><th scope="col">Registros</th><th scope="col">Resultado</th></tr></thead><tbody>{tr}</tbody></table>'
            f'<ul class="cartoes so-cel" aria-label="Últimas chamadas">{cd}</ul>'
            f'<p class="wa-nota" style="padding:12px 24px 18px">{ico("escudo")}<span>Aqui aparece só o pedido e quantos registros voltaram. Nome, CPF ou qualquer dado de cliente nunca fica guardado neste registro.</span></p>')


def escopos_ficha(c):
    h = ''
    for a, i, t in AREAS_ESC:
        sim = a in c['esc']
        h += (f'<li class="{"sim" if sim else "nao"}">{ico("check" if sim else "x")}<span><b>{a}</b><small>{"Lê" if sim else "Não lê"}</small></span></li>')
    h += f'<li class="{"sim" if c["cpf"] else "nao"}">{ico("check" if c["cpf"] else "x")}<span><b>CPF e documentos</b><small>{"Lê" if c["cpf"] else "Não lê"}</small></span></li>'
    return f'<ul class="ig-escopos" aria-label="O que a chave lê">{h}</ul>'


def tela_ficha(rev=False, dialog=''):
    c = CHAVES['acme']
    if rev:
        cabeca = (f'<div class="wa-num-cab ig-off-cab"><span class="disco">{ico("chave")}</span><div><p class="sobretitulo">Chave revogada</p><h2 id="t-fi">{c["nome"]}</h2>'
                  f'<span class="ig-mono">{c["pre"]}…</span></div><div class="lado">{selo("neutro", "Revogada", "proibido")}<span>Hoje, 10:12, por Marina Ribeiro</span></div></div>')
    else:
        cabeca = (f'<div class="wa-num-cab"><span class="disco">{ico("chave")}</span><div><p class="sobretitulo">Chave de acesso</p><h2 id="t-fi">{c["nome"]}</h2>'
                  f'<span class="ig-mono ig-mono-claro">{c["pre"]}…</span></div><div class="lado">{selo("ativo", "Ativa", "check")}<span>Criada em 02/09/2026 por Marina Ribeiro</span></div></div>')
    graf, tot = grafico(rev)
    val = ('<span class="val">Revogada</span><p>Valia até 02/09/2027. Não volta: para ligar de novo, crie outra chave.</p>' if rev else
           '<span class="val">Até 02/09/2027</span><p>12 meses. Faltam 288 dias. Avisamos 15 dias antes, em 18/08/2027.</p>')
    ind = ('<ul class="wa-saude" aria-label="Uso da chave">'
           f'<li class="wa-ind"><span class="ic">{ico("relogio")}</span><div><p class="dt">Validade</p><div class="dd">{val}</div></div></li>'
           f'<li class="wa-ind"><span class="ic">{ico("sinal")}</span><div><p class="dt">Último uso</p><div class="dd"><span class="val">{"Hoje, 10:14" if rev else "Hoje, 10:04"}</span><p>{"Recusada: a chave já estava revogada." if rev else "Deu certo. Casos alterados na última hora."}</p></div></div></li>'
           f'<li class="wa-ind"><span class="ic">{ico("barras")}</span><div><p class="dt">Chamadas nos últimos 30 dias</p><div class="dd"><span class="val num">{tot:,}</span><p>Cerca de 150 por dia útil. Só a contagem.</p></div></div></li>'.replace(f'{tot:,}', f'{tot:,}'.replace(',', '.'))
           + f'<li class="wa-ind"><span class="ic">{ico("medidor")}</span><div><p class="dt">Limite</p><div class="dd"><span class="val num">{"0" if rev else "312"} de 10.000 hoje</span>'
           f'<div class="wa-medida" role="img" aria-label="{"0" if rev else "312"} de 10.000 chamadas hoje"><span style="width:{0 if rev else 3.1}%"></span></div><p>E até 60 por minuto. Passou disso, o parceiro espera e repete.</p></div></div></li></ul>')
    principal = f'<section class="folha" aria-labelledby="t-fi" style="overflow:hidden">{cabeca}{ind}</section>'
    uso = folha('t-uso', 'Uso nos últimos 30 dias', 'Chamadas por dia', f'<div class="wa-corpo">{graf}</div>', 'barras')
    cham = folha('t-cha', 'Últimas chamadas', 'As 6 mais recentes', tabela_chamadas(rev), 'sinal')
    esc = folha('t-esc', 'O que ela lê', 'Para mudar, crie outra chave' if not rev else 'Lia até ser revogada',
                escopos_ficha(c) + nunca_sai(), 'escudo')
    if rev:
        acao = folha('t-rv', 'Revogada', None,
                     f'<dl class="wa-resumo"><div><dt>Quem revogou</dt><dd>Marina Ribeiro<small>Hoje, 10:12. Valeu na hora.</small></dd></div>'
                     f'<div><dt>Motivo</dt><dd>O contrato com a Acme terminou em 17/11.</dd></div>'
                     f'<div><dt>Avisos para o parceiro</dt><dd>Destino “Acme Publicações” parado junto<small>Fica na lista de destinos, apagado.</small></dd></div></dl>'
                     f'<div class="wa-btns"><a class="btn btn-sec" href="{U}criar">{ico("mais")}Criar outra chave</a>'
                     f'<p class="wa-nota">{ico("historico")}<span>A chave fica na lista, apagada, com quem revogou e o motivo. Nada some.</span></p></div>', 'proibido')
    else:
        acao = folha('t-ac', 'Revogar', None,
                     f'<div class="wa-btns"><p class="ig-acao-txt">Corte o acesso se o parceiro não for mais usar a chave, se a chave vazou ou se o contrato terminou. Vale na hora.</p>'
                     f'<a class="btn btn-perigo" href="{U}revogar" data-janela="janela-revogar">{ico("proibido")}Revogar a chave</a>'
                     f'<p class="wa-nota">{ico("cadeado")}<span>Só a sócia dona revoga. Pede motivo e fica no histórico.</span></p></div>', 'proibido')
    hi = hist([('hoje, 10:12', '<b>Marina</b> revogou a chave. Motivo: o contrato com a Acme terminou em 17/11.')] * rev +
              [('02/09, 15:22', '<b>Marina</b> ligou o destino de avisos “Acme Publicações” a esta chave.'),
               ('02/09, 15:10', '<b>Marina</b> criou a chave: Clientes e Jurídico, sem CPF, 12 meses. Confirmou a responsabilidade (LGPD).')], 'Histórico da chave')
    topo = toast('Chave revogada.', 'A Acme não lê mais nada desde 10:12. A chave ficou na lista, apagada.') if rev else ''
    return (f'<div class="wa">{cab()}{abas("ch", "ativas1" if rev else "ativas", "falha")}'
            f'<div class="wa-grade"><div class="wa-col">{principal}{uso}{cham}</div><aside class="wa-col" aria-label="O que lê e ações">{acao}{esc}{hi}</aside></div></div>{topo}{dialog}')


def j_revogar(abrir=False):
    corpo = (f'<ul class="cv-lista-x" style="padding:0">'
             f'<li>{ico("proibido")}<span><b>A Acme para de ler agora.</b> A próxima chamada dela recebe “chave revogada”.</span></li>'
             f'<li>{ico("sinal")}<span><b>Os avisos do destino “Acme Publicações” param junto</b>, porque dependem desta chave.</span></li>'
             f'<li>{ico("historico")}<span><b>Nada é apagado.</b> A chave fica na lista, apagada, com o seu nome, a hora e o motivo.</span></li>'
             f'<li>{ico("chave")}<span><b>Não tem volta.</b> Para ligar de novo, crie outra chave.</span></li></ul>'
             + area_texto('rv-motivo', 'Motivo', '', ajuda='Obrigatório. Ex.: o contrato terminou, a chave vazou. Fica no histórico.', foco=True))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-perigo" type="button">{ico("proibido")}Revogar agora</button>'
    return janela('janela-revogar', 'Chave de acesso', 'Revogar “Integração Acme Publicações”?', 'Chave <span class="ig-mono">t3j_live_a1b2c3d4…</span>. Vale na hora. Leia o que acontece antes de confirmar.', corpo, pe, alerta=True, abrir=abrir)


# ---------------------------------------------------------------- avisos para o parceiro (webhooks)
def falhas_tabela():
    ls = [('hoje, 09:41', 'Recebimento registrado', 'rc_8F2K', 'O sistema do parceiro respondeu com erro (500).', '5 de 8 · próxima às 10:41'),
          ('ontem, 18:02', 'Parcela atrasou', 'pc_3M7T', 'O endereço não respondeu em 10 segundos.', '8 de 8 · paramos de tentar'),
          ('ontem, 14:20', 'Recebimento registrado', 'rc_8E1Q', 'O endereço não existe mais no parceiro (404).', '8 de 8 · paramos de tentar')]
    tr, cd = '', ''
    for hora, ev, reg, motivo, tent in ls:
        b = f'<button class="btn btn-sec btn-compacto" type="button">{ico("reenviar")}Tentar de novo<span class="sr">: {ev}, {hora}</span></button>'
        tr += (f'<tr><td class="num ig-nw">{hora}</td><td><div class="ig-pedido"><strong>{ev}</strong><span class="ig-mono">registro {reg}</span></div></td>'
               f'<td><p class="ig-motivo">{motivo}</p><small class="ig-tent">{tent}</small></td><td class="ig-acao">{b}</td></tr>')
        cd += (f'<li class="cartao"><p class="ig-hora num">{hora}</p><div class="ig-pedido"><strong>{ev}</strong><span class="ig-mono">registro {reg}</span></div>'
               f'<p class="ig-motivo">{motivo}</p><small class="ig-tent">{tent}</small><div class="c-acoes">{b.replace(" btn-compacto", "")}</div></li>')
    return (f'<table class="so-pc wa-tab ig-tab"><caption class="sr">Entregas recentes com falha</caption>'
            f'<thead><tr><th scope="col">Quando</th><th scope="col">Aviso</th><th scope="col">O que houve</th><th scope="col"><span class="sr">Ação</span></th></tr></thead><tbody>{tr}</tbody></table>'
            f'<ul class="cartoes so-cel" aria-label="Entregas recentes com falha">{cd}</ul>')


def destino(id_, nome, url, chave, eventos, sit, linhas, falhas='', acoes='', cls=''):
    dl = ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in linhas)
    ev = '<ul class="ig-chips" aria-label="Eventos">' + ''.join(f'<li class="ig-chip">{e}</li>' for e in eventos) + '</ul>'
    return (f'<section class="folha ig-dest {cls}" aria-labelledby="{id_}" style="overflow:hidden"><div class="ig-dest-cab"><div><h2 id="{id_}">{ico("sinal")}{nome}</h2>'
            f'<p class="ig-mono ig-url">{url}</p></div>{sit}</div>'
            f'<dl class="wa-resumo ig-dl"><div><dt>Chave que lê os detalhes</dt><dd>{chave}</dd></div><div><dt>Eventos</dt><dd>{ev}</dd></div>{dl}</dl>'
            f'{falhas}<div class="ig-dest-acoes">{acoes}</div></section>')


def tela_webhooks(pausado=False, topo_extra=''):
    acme = destino('t-d1', 'Acme Publicações', 'https://hooks.acmepublicacoes.com.br/t3jus/rm', 'Integração Acme Publicações',
                   ['Cliente criado ou alterado', 'Dados do cliente excluídos', 'Caso criado', 'Etapa do caso mudou', 'Compromisso criado, alterado ou cancelado'],
                   selo('ativo', 'Funcionando', 'check'),
                   [('Última entrega', 'Hoje, 10:03 · Etapa do caso mudou<small>Deu certo em 0,4 segundo.</small>'),
                    ('Nos últimos 30 dias', '318 entregas, nenhuma falha')],
                   acoes=(f'<button class="btn btn-sec" type="button">{ico("enviar")}Mandar um teste</button>'
                          f'<button class="btn btn-sec" type="button">{ico("trocar")}Trocar o segredo</button>'
                          f'<button class="btn btn-fantasma" type="button">{ico("pausa")}Pausar</button>'))
    if pausado:
        sit = selo('urgente', 'Pausado', 'pausa')
        info = aviso('urgencia', 'Pausado hoje, 08:00, depois de 3 dias seguidos falhando',
                     'Falha desde domingo, 15/11, 08:00. Avisamos você no sino e por e-mail. Os avisos desde a pausa ficam guardados por 7 dias, até 25/11; ao retomar, saem em ordem.',
                     icone='pausa', papel='status',
                     acoes=f'<button class="btn btn-sec" type="button">{ico("enviar")}Mandar um teste</button><button class="btn btn-pri" type="button">{ico("ligar")}Retomar</button>')
        linhas = [('Última entrega que deu certo', 'Sábado, 14/11, 17:30'), ('Guardados durante a pausa', '4 avisos<small>Saem quando você retomar.</small>')]
        acoes = f'<button class="btn btn-sec" type="button">{ico("trocar")}Trocar o segredo</button><button class="btn btn-fantasma" type="button">{ico("lapis")}Mudar o endereço</button>'
    else:
        sit = selo('urgente', 'Falhando desde ontem, 14:20', 'alerta')
        info = aviso('atencao', 'Se continuar falhando até sexta, 20/11, 14:20, pausamos este destino',
                     'Tentamos cada aviso 8 vezes em 24 horas. Peça ao contador para conferir o endereço. Nada do escritório foi enviado para outro lugar.', papel='status')
        linhas = [('Última entrega que deu certo', 'Ontem, 11:05 · Recebimento registrado'), ('Nos últimos 30 dias', '41 entregas, 3 com falha')]
        acoes = (f'<button class="btn btn-sec" type="button">{ico("enviar")}Mandar um teste</button>'
                 f'<button class="btn btn-sec" type="button">{ico("lapis")}Mudar o endereço</button>'
                 f'<button class="btn btn-fantasma" type="button">{ico("pausa")}Pausar</button>')
    falhas = (f'<div class="wa-corpo" style="padding-top:4px">{info}<h3 class="ig-sub">Entregas recentes com falha</h3></div>{falhas_tabela()}')
    cont = destino('t-d2', 'Planilha do contador', 'https://planilhas.contabilnorte.com.br/ganchos/rm-receb', 'Planilha do contador',
                   ['Recebimento registrado', 'Parcela atrasou'], sit, linhas, falhas, acoes, 'ig-dest-falha')
    topo = topo_extra
    if pausado:
        topo += aviso('urgencia', 'Pausamos o destino “Planilha do contador”',
                      'Ele falhou por 3 dias seguidos. A chave do contador continua lendo; só os avisos estão parados.',
                      acoes=f'<a class="btn btn-sec" href="#t-d2">{ico("dir")}Ver o destino</a>')
    como = folha('t-como', 'Como funciona o aviso', None, lista_x([
        ('sinal', '<b>Quando algo acontece</b> no escritório, o T3jus manda um aviso ao endereço https do parceiro.'),
        ('escudo', '<b>O aviso leva só o tipo, o número do registro e a hora.</b> Nenhum dado de cliente. O parceiro busca o resto com a chave, que só lê o que você marcou.'),
        ('cadeado', '<b>Cada aviso vai assinado</b> com o segredo do destino, para o parceiro saber que veio do T3jus.'),
        ('reenviar', '<b>Falhou?</b> Tentamos 8 vezes em 24 horas. Com 3 dias seguidos falhando, pausamos e avisamos você.'),
    ]), 'ajuda')
    novo = f'<a class="btn btn-pri" href="{U}webhook-criar">{ico("mais")}Novo destino</a>'
    return (f'<div class="wa">{cab(novo)}{abas("av", "ativas", "pausado" if pausado else "falha")}{topo}'
            f'<div class="wa-grade"><div class="wa-col">{cont}{acme}</div><aside class="wa-col" aria-label="Como funciona e limites">{como}{limites()}'
            + hist([('hoje, 08:00', 'O T3jus pausou “Planilha do contador” depois de 3 dias falhando. Avisou Marina.')] * pausado +
                   [('02/09, 15:22', '<b>Marina</b> criou o destino “Acme Publicações”.'), ('27/05, 09:20', '<b>Marina</b> criou o destino “Planilha do contador”.')], 'Histórico dos avisos')
            + '</aside></div></div>')


EXEMPLO = ('{\n  "evento": "caso.etapa_mudou",\n  "id": "evt_2b9X41",\n  "registro": "cs_7Q2M",\n'
           '  "em": "2026-11-18T10:03:12-03:00",\n  "versao": "v1"\n}')


def tela_webhook_criar():
    nome = campo('wc-nome', 'Nome do destino', 'Acme Publicações, agenda', foco=True, ajuda='Para você reconhecer na lista.')
    url = campo('wc-url', 'Endereço que recebe os avisos', 'https://hooks.acmepublicacoes.com.br/t3jus/rm-agenda', tipo='url', im='url',
                ajuda='O parceiro passa este endereço. Precisa começar com https://.')
    chave = selecao('wc-chave', 'Chave que lê os detalhes', ['Integração Acme Publicações (Clientes e Jurídico)', 'Planilha do contador (Financeiro)'],
                    'Integração Acme Publicações (Clientes e Jurídico)', ajuda='Só aparecem os eventos das áreas que esta chave lê.')
    le = ['Clientes', 'Jurídico']
    marcados = {'comp'}
    grupos = ''
    for area, evs in EVENTOS:
        pode = area in le
        ops = ''
        for k, rot, sub in evs:
            dis = '' if pode else ' disabled'
            ch = ' checked' if k in marcados else ''
            s = f'<small>{sub}</small>' if sub else ''
            ops += f'<label class="opcao"><input class="marcar" type="checkbox" name="wc-{k}"{ch}{dis}><span>{rot}{s}</span></label>'
        nota = '' if pode else f'<p class="ig-nao-le">{ico("cadeado", "ico ico-s")}A chave escolhida não lê {area}.</p>'
        grupos += f'<fieldset class="ig-ev"><legend>{area}</legend>{ops}{nota}</fieldset>'
    eventos = f'<fieldset class="x-ops"><legend>Eventos que viram aviso</legend><div class="ig-evs">{grupos}</div></fieldset>'
    acoes = (f'<div class="wa-acoes" style="padding:0"><a class="btn btn-sec" href="{U}webhooks">Cancelar</a><button class="btn btn-pri" type="submit">{ico("sinal")}Criar destino</button>'
             f'<p class="wa-nota">{ico("historico")}<span>Fica no histórico: quem criou, o endereço e os eventos.</span></p></div>')
    form = (f'<div class="wa-passo-cab"><p class="sobretitulo">Avisos para o parceiro</p><h2 id="t-wc">Novo destino</h2>'
            f'<p>O T3jus avisa o sistema do parceiro quando algo acontece. Depois de criar, mandamos um aviso de teste.</p></div>'
            f'<form class="wa-form" action="#" onsubmit="return false" novalidate>{nome}{url}{chave}{eventos}{acoes}</form>')
    principal = f'<section class="folha" aria-labelledby="t-wc" style="overflow:hidden">{form}</section>'
    ex = folha('t-ex', 'O que o parceiro recebe', 'Exemplo de um aviso', f'<div class="wa-corpo"><pre class="ig-codigo">{H(EXEMPLO)}</pre>'
               f'<p class="wa-nota">{ico("escudo")}<span>Só o tipo, o número do registro e a hora. Para saber o resto, o parceiro pede com a chave, e a chave só lê o que você marcou nela.</span></p></div>', 'codigo')
    return (f'<div class="wa">{cab()}{abas("av", "ativas", "falha")}<div class="wa-grade"><div class="wa-col">{principal}</div>'
            f'<aside class="wa-col" aria-label="Exemplo e limites">{ex}{limites()}</aside></div></div>')


def tela_webhook_criado():
    corpo = (f'<div class="wa-num-cab"><span class="disco">{ico("sinal")}</span><div><p class="sobretitulo">Destino criado agora, 10:12</p><h2 id="t-wok">Acme Publicações, agenda</h2></div>'
             f'<div class="lado">{selo("ativo", "Funcionando", "check")}<span>Teste entregue às 10:12, em 0,3 segundo</span></div></div>'
             f'<div class="wa-corpo" style="padding-top:20px">'
             + segredo_box('ig-s', 'Segredo de assinatura', SEGREDO, 'whsec_4kT9').replace('Nem você nem a equipe T3jus conseguem ver esta chave', 'Nem você nem a equipe T3jus conseguem ver este segredo').replace('Se perder, revogue e crie outra.', 'Se perder, use “Trocar o segredo”.')
             + f'<p class="wa-nota">{ico("cadeado")}<span>O parceiro usa o segredo para conferir que cada aviso veio do T3jus (assinatura no cabeçalho <span class="ig-mono">T3jus-Assinatura</span>).</span></p>'
             f'<div class="wa-acoes" style="padding:0"><a class="btn btn-pri" href="{U}webhooks">{ico("check")}Já copiei, concluir</a></div></div>')
    principal = f'<section class="folha" aria-labelledby="t-wok" style="overflow:hidden">{corpo}</section>'
    resumo = folha('t-wr', 'O destino', None, f'<dl class="wa-resumo"><div><dt>Endereço</dt><dd class="ig-mono" style="overflow-wrap:anywhere">https://hooks.acmepublicacoes.com.br/t3jus/rm-agenda</dd></div>'
                   f'<div><dt>Chave que lê os detalhes</dt><dd>Integração Acme Publicações</dd></div>'
                   f'<div><dt>Eventos</dt><dd>Compromisso criado, alterado ou cancelado</dd></div></dl>', 'sinal')
    return (f'<div class="wa">{cab()}{abas("av", "ativas", "falha")}<div class="wa-grade"><div class="wa-col">{principal}</div>'
            f'<aside class="wa-col" aria-label="Resumo">{resumo}{limites(2, 3)}</aside></div></div>')


# ---------------------------------------------------------------- estados de página
def tela_nao_dona():
    return ('<div class="estado" role="status"><span class="icone-estado">' + ico('cadeado') + '</span><h1>Quem cuida das integrações é Marina Ribeiro</h1>'
            '<p>As chaves de acesso e os avisos para sistemas parceiros ficam só com a sócia dona, porque decidem quais dados do escritório saem do T3jus. Se um parceiro precisar de acesso, fale com ela.</p>'
            f'<div class="acoes"><a class="btn btn-pri" href="../portal-v1/escritorio.html">{ico("coluna")}Ir para Dados do escritório</a></div></div>')


def tela_erro():
    return (f'<div class="wa">{cab()}<div class="estado estado-erro" role="alert"><span class="icone-estado">{ico("alerta")}</span><h2>Não deu para abrir as integrações</h2>'
            '<p>O servidor não respondeu. As chaves continuam funcionando para os parceiros, e nada do que estava guardado se perdeu. Tente de novo em instantes; se continuar, mande o código ao suporte.</p>'
            f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button></div><p class="codigo">Código para o suporte: PTL-7C31-2208</p></div></div>')


def esq(ws, titulo=True):
    h = '<span class="esqueleto esq-linha" style="width:55%;height:24px"></span>' if titulo else ''
    return '<section class="folha" style="padding:22px 24px;display:grid;gap:14px">' + h + ''.join(f'<span class="esqueleto esq-linha" style="width:{w}%;height:12px"></span>' for w in ws) + '</section>'


def tela_carregando():
    return (f'<div class="wa">{cab()}<div aria-busy="true"><p class="sr" role="status">Carregando as integrações…</p><div aria-hidden="true" class="wa">'
            '<span class="esqueleto" style="height:56px;border-radius:12px"></span>'
            f'<div class="wa-grade"><div class="wa-col">{esq([90, 75, 60, 85, 40, 70, 55, 30])}</div><div class="wa-col">{esq([40, 70, 35])}{esq([80, 50])}</div></div></div></div></div>')


CSS_IG = r"""
/* ==========================================================================
   Portal · Escritório › Integrações. Prefixo ig- nas peças novas.
   ========================================================================== */
.ig-mono{font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,"DejaVu Sans Mono","Liberation Mono",monospace;font-size:12.5px;color:var(--texto-2);overflow-wrap:anywhere}
.wa-num-cab .ig-mono-claro{color:var(--ambar-3);display:block;margin-top:2px}
.ig-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.ig-chip{display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:3px 10px;border-radius:13px;background:var(--sal-2);font-size:12px;font-weight:500;color:var(--tinta);line-height:1.3}
.ig-chip .ico{width:14px;height:14px;color:var(--vinho)}
.ig-chip-cpf{background:var(--ambar-3)}
.ig-nome strong{display:block;font-family:var(--serifa);font-size:17px;font-weight:500;color:var(--vinho);line-height:1.25}
.ig-nome .ig-mono{display:block;margin-top:2px;white-space:nowrap;overflow-wrap:normal}
.ig-tab .ig-nome{min-width:180px}
.ig-tab .ig-chips{min-width:120px}
.ig-tab{table-layout:auto;width:100%}
.ig-tab td{vertical-align:middle}
.ig-tab .ig-acao{width:1%;white-space:nowrap}
.ig-tab th,.ig-tab td{padding-left:12px;padding-right:12px}
.ig-tab th:first-child,.ig-tab td:first-child{padding-left:24px}
.ig-tab th:last-child,.ig-tab td:last-child{padding-right:20px}
.ig-nw{white-space:nowrap}
.wa-form .wa-fixo{margin:0}
.ig-tab tr.ig-off td{background:var(--sal-2);color:var(--texto-2)}
.ig-tab tr.ig-off .ig-nome strong{color:var(--texto-2)}
.ig-tab tr.ig-off .ig-chip{background:var(--papel);color:var(--texto-2)}
.ig-tab tr.ig-off .ig-chip .ico{color:var(--texto-2)}
.ig-tab tr.ig-vence td{background:#FCF8F5}
.ig-tab tr.ig-vence td:first-child{box-shadow:inset 3px 0 0 var(--ambar)}
.cartao.ig-off{background:var(--sal-2)}
.cartao.ig-off .ig-nome strong{color:var(--texto-2)}
.cartao.ig-off .ig-chip{background:var(--papel);color:var(--texto-2)}
.cartao{display:grid;gap:8px}
.ig-uso{font-size:12.5px;color:var(--texto-2)}
.ig-hora{font-size:12.5px;color:var(--texto-2)}
.ig-bloq{display:grid;gap:6px;justify-items:end;max-width:300px}
.ig-bloq p{font-size:12.5px;color:var(--texto-2);text-align:right;line-height:1.45}
.ig-medida{display:grid;gap:2px}
.ig-medida p{display:flex;justify-content:space-between;gap:12px;font-size:13px}
.ig-medida p b{font-weight:500}
.ig-medida .wa-medida{margin-top:4px}
.ig-pode{list-style:none;margin:0;padding:0 24px 16px;display:grid;gap:10px}
.ig-pode li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:13px;line-height:1.5}
.ig-pode .ico{width:18px;height:18px;color:var(--vinho);margin-top:2px}
.ig-pode b{font-weight:600}
.ig-ops{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ig-ops .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 12px;margin:0;background:var(--papel)}
.ig-ops .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.ig-ops .opcao b{font-weight:600}
.ig-ops .opcao .ico{color:var(--vinho);vertical-align:-3px}
.ig-areas .erro-msg{margin-top:8px}
.ig-aceite{box-shadow:inset 3px 0 0 var(--ambar)}
.ig-segredo{display:grid;gap:8px}
.ig-rot{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.ig-seg-l{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 12px 12px 16px;border-radius:var(--raio);border:1.5px solid var(--vinho);background:var(--papel)}
.ig-valor{flex:1 1 260px;min-width:0;font-size:15px;color:var(--tinta);line-height:1.5}
.ig-copiado{font-size:12.5px;color:var(--vinho);font-weight:500;min-height:0}
.ig-copiado:empty{display:none}
.ig-uso-api{display:grid;gap:8px;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2)}
.ig-uso-api .wa-resumo>div{border-top-color:var(--borda-folha)}
.ig-graf{margin:0;display:grid;gap:6px}
.ig-graf svg{display:block;width:100%;height:150px}
.ig-eixo{position:relative;height:18px;font-size:11.5px;color:var(--texto-2)}
.ig-eixo span{position:absolute;top:0}
.ig-graf figcaption{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--texto-2);margin-top:4px}
.ig-q{display:inline-flex;align-items:center;gap:6px}
.ig-q i{display:inline-block;width:12px;height:12px;border-radius:2px;background:var(--vinho)}
.ig-q i.f{background:var(--vinho-4)}
.ig-pedido strong{display:block;font-weight:500;font-size:13.5px;line-height:1.35}
.ig-pedido .ig-mono{display:block;font-size:12px}
.ig-escopos{list-style:none;margin:0;padding:0 24px 14px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ig-escopos li{display:grid;grid-template-columns:20px minmax(0,1fr);gap:8px;align-items:start;padding:8px 10px;border-radius:var(--raio);font-size:13px;line-height:1.35}
.ig-escopos li.sim{background:var(--ambar-3)}
.ig-escopos li.nao{background:var(--sal-2);color:var(--texto-2)}
.ig-escopos .ico{width:16px;height:16px;margin-top:1px}
.ig-escopos li.sim .ico{color:var(--vinho)}
.ig-escopos b{font-weight:600}
.ig-escopos small{display:block;font-size:12px}
.ig-acao-txt{font-size:13px;line-height:1.5}
.wa-num-cab.ig-off-cab{background:var(--sal-2);color:var(--tinta);box-shadow:inset 0 -1px 0 var(--borda-folha)}
.ig-off-cab .disco{--c:var(--papel);color:var(--texto-2)}
.ig-off-cab .sobretitulo{color:var(--vinho-2)}
.ig-off-cab h2{color:var(--texto-2)}
.ig-off-cab .lado{color:var(--texto-2)}
.ig-off-cab .selo{background:var(--papel);color:var(--texto-2)}
.ig-dest-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:20px 24px 8px}
.ig-dest-cab h2{display:flex;align-items:center;gap:10px;font-size:22px;line-height:1.2}
.ig-dest-cab h2 .ico{color:var(--vinho-4)}
.ig-url{margin-top:4px}
.ig-dest-falha{box-shadow:inset 3px 0 0 var(--vinho-3)}
.ig-dl dd{font-weight:500}
.ig-dest-acoes{display:flex;gap:8px;flex-wrap:wrap;padding:6px 24px 20px;border-top:1px solid var(--divisor);padding-top:16px}
.ig-sub{font-size:13px;font-family:inherit;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);margin:6px 0 -6px}
.ig-motivo{font-size:13px;line-height:1.45}
.ig-tent{display:block;font-size:12px;color:var(--texto-2)}
.ig-evs{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ig-ev{border:1px solid var(--borda-folha);border-radius:var(--raio);margin:0;padding:8px 14px 10px;min-width:0}
.ig-ev legend{font-family:var(--serifa);font-size:17px;font-weight:600;color:var(--vinho);padding:0 4px}
.ig-ev:has(input:disabled){background:var(--sal-2)}
.ig-ev:has(input:disabled) legend{color:var(--texto-2)}
.ig-nao-le{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--texto-2);margin-top:4px}
.ig-codigo{margin:0;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2);font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,"DejaVu Sans Mono",monospace;font-size:12.5px;line-height:1.6;color:var(--tinta);white-space:pre-wrap;overflow-wrap:anywhere}
@media (max-width:760px){
  .ig-bloq{max-width:none;justify-items:stretch;width:100%}
  .ig-bloq p{text-align:left}
  .wa-cab .ig-bloq .btn{width:100%}
  .ig-pode,.ig-escopos{padding-left:16px;padding-right:16px}
  .ig-ops,.ig-evs{grid-template-columns:1fr}
  .ig-seg-l{padding:12px}
  .ig-seg-l .btn{width:100%}
  .ig-dest-cab{padding:16px 16px 6px}
  .ig-dest-acoes{padding:14px 16px 18px}
  .ig-dest-acoes .btn{flex:1 1 100%}
  .ig-graf svg{height:120px}
  .wa-cab>.btn{flex:1 1 100%}
}
/* Faixa de só consulta: a mesma do aprovado de Cobrança (fc-tira) */
.fc-tira{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 48px;background:var(--ambar-3);color:var(--tinta);font-size:13px;border-bottom:1px solid var(--ambar-2)}
.fc-tira .ico{color:var(--vinho);flex:none}
.fc-tira b{font-weight:600}
.fc-tira span{flex:1;min-width:0}
.fc-tira a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;border-radius:var(--raio);color:var(--vinho);font-weight:600}
.fc-tira a:hover{background:rgba(255,255,255,.5)}
@media (max-width:760px){.fc-tira{padding:6px 16px}}
"""

SCRIPT_IG = r"""<script>
(function(){
  /* Faixa de só consulta (só no estado so-consulta) e o botão Copiar */
  var q=new URLSearchParams(location.search);
  if(q.get('estado')==='so-consulta'){
    document.getElementById('slot-barra').insertAdjacentHTML('afterbegin','<div class="fc-tira" role="note"><svg class="ico" aria-hidden="true"><use href="#i-cadeado"/></svg><span><b>Portal só para consulta desde 16/11/2026.</b> Há faturas em atraso. Ao pagar, tudo volta ao normal na hora; nenhum dado foi apagado.</span><a href="../console-cobranca/portal-escritorio.html?estado=cb-so-consulta#plano">Ver e pagar</a></div>');
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-copiar]'); if(!b) return;
    var v=document.getElementById(b.dataset.copiar).textContent, box=b.closest('.ig-segredo').querySelector('.ig-copiado');
    var ok=function(){ b.querySelector('span').textContent='Copiada'; box.textContent='Copiada. Cole no lugar seguro antes de sair desta tela.' };
    try{ navigator.clipboard.writeText(v).then(ok,ok) }catch(_){ ok() }
  });
})();
</script>"""

# ---------------------------------------------------------------- estados
SECOES_DONA = (f'<a href="../portal-v1/escritorio.html">Dados do escritório</a><a href="../portal-whatsapp/whatsapp.html?estado=ligado">WhatsApp e IA</a>'
               f'<a href="../portal-carne/escritorio.html?estado=recebimento">Recebimento</a>'
               f'<a href="../portal-comercial-financeiro-pendencias/escritorio.html?estado=es-ajustes">Ajustes do financeiro</a>'
               f'<a href="{U}lista" aria-current="page">Integrações</a>')
SECOES_EQ = (f'<a href="../portal-v1/escritorio.html">Dados do escritório</a><a href="../portal-whatsapp/whatsapp.html?estado=ligado">WhatsApp e IA</a>'
             f'<a href="../portal-carne/escritorio.html?estado=recebimento">Recebimento</a><a href="{U}nao-dona" aria-current="page">Integrações</a>')
BARRA = ''.join(f'<template data-barra="escritorio|{k}"><div class="pt-barra-area"><p class="pt-area-nome">{ico("coluna")}Escritório</p>'
                f'<nav class="pt-secoes" aria-label="Seções do Escritório">{v}</nav></div></template>\n'
                for k, v in (('Integrações', SECOES_DONA), ('Integrações, equipe', SECOES_EQ)))

C = dict(atual='escritorio', area='escritorio', secao='Integrações', trilha='Escritório|Integrações', titulo='Integrações')
CC = dict(C, trilha='Escritório|Integrações|Chaves de acesso')
CA = dict(C, trilha='Escritório|Integrações|Avisos para o parceiro')
T = ''
T += tpl('vazio', tela_vazio(), **C)
T += tpl('lista', tela_lista(), **CC)
T += tpl('criar', form_criar(), **dict(C, trilha='Escritório|Integrações|Nova chave'))
T += tpl('criar-erros', form_criar(True), **dict(C, trilha='Escritório|Integrações|Nova chave'))
T += tpl('criada', tela_criada(), **dict(C, trilha='Escritório|Integrações|Chave criada'))
T += tpl('ficha', tela_ficha(dialog=j_revogar()), **dict(C, trilha='Escritório|Integrações|Integração Acme Publicações'))
T += tpl('revogar', tela_ficha(dialog=j_revogar(True)), **dict(C, trilha='Escritório|Integrações|Integração Acme Publicações'))
T += tpl('revogada', tela_ficha(rev=True), **dict(C, trilha='Escritório|Integrações|Integração Acme Publicações'))
T += tpl('webhooks', tela_webhooks(), **CA)
T += tpl('webhook-criar', tela_webhook_criar(), **dict(C, trilha='Escritório|Integrações|Novo destino'))
T += tpl('webhook-criado', tela_webhook_criado(), **dict(C, trilha='Escritório|Integrações|Destino criado'))
T += tpl('webhook-pausado', tela_webhooks(pausado=True), **CA)
T += tpl('limite', tela_limite(), **CC)
T += tpl('so-consulta', tela_so_consulta(), **CC)
T += tpl('nao-dona', tela_nao_dona(), quem='contratos', **dict(C, secao='Integrações, equipe', titulo='Sem acesso'))
T += tpl('erro', tela_erro(), **C)
T += tpl('carregando', tela_carregando(), **C)

# Felipe Matos (sócio, não é o dono) entra por substituição no texto gerado, como no aprovado de Importação; o comum.py fica igual.
QUEM_EXTRA = ("contratos:{nome:'Felipe Matos',ini:'F',papel:'Sócio · Comercial, Contratos e Jurídico',areas:['comercial','contratos','juridico'],dono:false},"
              "'sem-area':{")

out = pagina('Integrações', 'Escritório › Integrações: chaves da API para parceiros e avisos para o parceiro (webhooks). Só a sócia dona vê e mexe.',
             '{"estado":"lista","atual":"escritorio"}', '', T, BARRA)
out = finalizar(out, CSS_CV + CSS_WA + CSS_IG)
out = out.replace("'sem-area':{", QUEM_EXTRA, 1)
out = out.replace('<div class="app">', SPRITE_WA + SPRITE_IG + '\n<div class="app">', 1)
out = out.replace('href="conversas.html" data-nav="conversas"', 'href="../portal-agenda-conversas/conversas.html?estado=fila" data-nav="conversas"')
out = out.replace('href="agenda.html" data-nav="agenda"', 'href="../portal-agenda-conversas/agenda.html" data-nav="agenda"')
out = out.replace('href="moldura.html', 'href="../portal-v1/moldura.html').replace('href="equipe.html"', 'href="../portal-v1/equipe.html"')
out = out.replace('href="escritorio.html" data-nav="escritorio"', f'href="{U}lista" data-nav="escritorio"')
out = out.replace('href="escritorio.html"', 'href="../portal-v1/escritorio.html"')
out = out.replace('</body>', SCRIPT_IG + '\n</body>', 1)
open(f'{SAIDA}/integracoes.html', 'w', encoding='utf-8').write(out)
print('integracoes ok', T.count('<template data-est='), 'estados')
