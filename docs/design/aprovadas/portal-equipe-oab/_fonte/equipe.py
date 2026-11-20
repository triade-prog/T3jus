from comum import *

NOMES = {k: n for k, n, *_ in AREAS}
DOM = 'ribeiromatos.adv.br'

# (iniciais, nome, e-mail, áreas | 'dono', situação, detalhe, desde)
PESSOAS = [
    ('MR', 'Marina Ribeiro', 'marina', 'dono', 'ativa', '', '02/02/2026'),
    ('BT', 'Bianca Torres', 'bianca', ['contratos', 'financeiro'], 'ativa', '', '15/04/2026'),
    ('DA', 'Diego Almeida', 'diego', ['comercial'], 'ativa', '', '02/06/2026'),
    ('FM', 'Felipe Matos', 'felipe', ['comercial', 'contratos', 'financeiro', 'juridico'], 'ativa', '', '02/02/2026'),
    ('GL', 'Gustavo Lima', 'gustavo', ['juridico'], 'ativa', '', '18/11/2026'),
    ('LC', 'Larissa Costa', 'larissa', ['juridico'], 'ativa', '', '10/03/2026'),
    ('PN', 'Paula Nunes', 'paula', [], 'ativa', '', '20/02/2026'),
    ('RL', 'Renata Lopes', 'renata', ['juridico'], 'pendente', 'vale até 15h05', ''),
    ('TR', 'Tiago Rocha', 'tiago', ['comercial'], 'vencido', 'venceu ontem, às 17h40', ''),
]


def areas_html(areas):
    if areas == 'dono':
        return f'<span class="selo selo-ativo">Vê tudo</span>'
    if not areas:
        return '<span class="pt-comum">Só as partes comuns</span>'
    return '<div class="pt-areas">' + ''.join(f'<span class="selo selo-neutro">{NOMES[a]}</span>' for a in areas) + '</div>'


def sit_html(sit, det):
    if sit == 'ativa':
        return f'<span class="selo selo-ok">{ico("check")}Ativa</span>'
    if sit == 'pendente':
        return f'<div class="pt-sit"><span class="selo selo-atencao">{ico("relogio")}Convite pendente</span><small>{det}</small></div>'
    return f'<div class="pt-sit"><span class="selo selo-urgente">{ico("alerta")}Convite vencido</span><small>{det}</small></div>'


def acoes_html(p, compacto=True):
    ini, nome, em, areas, sit, det, desde = p
    c = ' btn-compacto' if compacto else ''
    pn = nome.split()[0]
    if areas == 'dono':
        return '<span class="pt-dono">Sócia dona: não sai da equipe</span>'
    b = ''
    if sit != 'ativa':
        b += f'<button class="btn btn-sec{c}" type="button" aria-label="Reenviar convite para {nome}">{ico("reenviar", "ico ico-s")}Reenviar</button>'
    b += f'<button class="btn btn-sec{c}" type="button" data-janela="janela-areas" aria-label="Mudar áreas de {nome}">{ico("funcoes", "ico ico-s")}Áreas</button>'
    if sit == 'ativa':
        b += f'<button class="btn btn-perigo{c}" type="button" data-janela="janela-retirar" aria-label="Retirar {nome} da equipe">Retirar</button>'
    else:
        b += f'<button class="btn btn-perigo{c}" type="button" data-janela="janela-cancelar" aria-label="Cancelar convite de {nome}">Cancelar convite</button>'
    return b


def lista(pessoas, nova=None):
    linhas, cartoes = '', ''
    for p in pessoas:
        ini, nome, em, areas, sit, det, desde = p
        voce = '<span class="voce">você</span>' if areas == 'dono' else ''
        papel = '<small style="display:block;font-size:12px;color:var(--texto-2)">Sócia dona</small>' if areas == 'dono' else ''
        cls = ' class="pt-nova"' if nome == nova else ''
        av = 'av-p forte' if sit == 'ativa' else 'av-p apagado'
        linhas += (f'<tr{cls}><td><div class="esc"><span class="{av}" aria-hidden="true">{ini}</span><div><strong style="font-weight:500">{nome}</strong>{voce}'
                   f'<small style="display:block;font-size:12px;color:var(--texto-2)">{em}@{DOM}</small></div></div></td>'
                   f'<td>{areas_html(areas)}</td><td>{sit_html(sit, det)}</td><td><div class="acoes-tab">{acoes_html(p)}</div></td></tr>')
        desde_t = f'<small>na equipe desde {desde}</small>' if desde else ''
        cartoes += (f'<li class="cartao"><div class="c-topo"><span class="{av}" aria-hidden="true">{ini}</span><div><strong class="c-nome" style="font-size:18px">{nome}</strong>{voce}'
                    f'<small>{em}@{DOM}</small>{desde_t}</div></div>'
                    f'<div class="c-selos">{sit_html(sit, det) if sit != "ativa" else ""}{areas_html(areas)}</div>'
                    f'<div class="c-acoes">{acoes_html(p, False)}</div></li>')
    n_at = sum(1 for p in pessoas if p[4] == 'ativa')
    n_cv = len(pessoas) - n_at
    chips = (f'<div class="chips" role="group" aria-label="Mostrar" style="margin-left:0"><button type="button" aria-pressed="true">Todas ({len(pessoas)})</button>'
             f'<button type="button" aria-pressed="false">Ativas ({n_at})</button><button type="button" aria-pressed="false">Convites ({n_cv})</button></div>')
    return (f'<section class="folha" aria-labelledby="t-pessoas" style="overflow:hidden"><h2 id="t-pessoas" class="sr">Pessoas da equipe</h2>'
            f'<div class="ferramentas">{chips}</div>'
            f'<table class="so-pc pt-tabela"><colgroup><col style="width:28%"><col style="width:25%"><col style="width:19%"><col style="width:28%"></colgroup>'
            f'<thead><tr><th scope="col">Pessoa</th><th scope="col">Áreas liberadas</th><th scope="col">Situação</th><th scope="col"><span class="sr">Ações</span></th></tr></thead>'
            f'<tbody>{linhas}</tbody></table><ul class="cartoes so-cel" aria-label="Pessoas da equipe">{cartoes}</ul>'
            f'<p class="pt-pe-folha">{ico("relogio")}<span>O convite vale 1&nbsp;hora. Depois disso, use Reenviar: o link antigo deixa de valer e o novo vale mais 1&nbsp;hora.</span></p></section>')


AREAS_DEF = ('<section class="folha" aria-labelledby="t-def"><div class="folha-cab" style="padding-bottom:6px"><div><h2 id="t-def" style="font-size:20px">O que cada área abre</h2>'
             '<p class="sub">Início, Conversas, Clientes e Agenda todos veem. Equipe e a exportação dos dados ficam só com a sócia dona.</p></div></div>'
             '<dl class="funcoes-def pt-areas-def">' + ''.join(f'<div><dt>{n}</dt><dd>{d}</dd></div>' for k, n, i, s, d in AREAS) + '</dl></section>')


def caixas(nome_grupo, marcadas, invalido=False, desc_id=None):
    r = ''
    for k, n, i, s, d in AREAS:
        ch = ' checked' if k in marcadas else ''
        r += f'<label class="opcao"><input class="marcar" type="checkbox" name="{nome_grupo}" value="{k}"{ch}><span>{n}<small>{d}</small></span></label>'
    return r


COMUNS = f'<p class="pt-comuns">{ico("pessoas")}<span>Todos veem Início, Conversas, Clientes e Agenda. Sem nenhuma área marcada, a pessoa fica só com essas partes.</span></p>'


def j_convidar(estado_=None):
    nome_v, mail_v, resumo, e_nome, e_mail, marc = '', '', '', '', '', ['juridico']
    nome_attr = mail_attr = ''
    if estado_ == 'erros':
        nome_v, mail_v = '', 'renata.lopes@gmail'
        resumo = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'O convite ainda não foi enviado.')
        nome_attr = ' aria-invalid="true" aria-describedby="c-nome-erro"'
        e_nome = f'<p class="erro-msg" id="c-nome-erro">{ico("alerta", "ico ico-s")}Escreva o nome da pessoa.</p>'
        mail_attr = ' aria-invalid="true" aria-describedby="c-email-erro"'
        e_mail = f'<p class="erro-msg" id="c-email-erro">{ico("alerta", "ico ico-s")}Confira o e-mail: falta o final do endereço, como .com ou .com.br.</p>'
    elif estado_ == 'ja':
        nome_v, mail_v = 'Larissa Costa', f'larissa@{DOM}'
        resumo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'O convite ainda não foi enviado.')
        mail_attr = ' aria-invalid="true" aria-describedby="c-email-erro"'
        e_mail = f'<p class="erro-msg" id="c-email-erro">{ico("alerta", "ico ico-s")}Larissa Costa já está na equipe com este e-mail. Para mudar o que ela abre, use Áreas na lista.</p>'
    else:
        nome_v, mail_v = 'Renata Lopes', f'renata@{DOM}'
        mail_attr = ' aria-describedby="c-email-ajuda"'
    ajuda = '' if e_mail else '<p class="ajuda" id="c-email-ajuda">O convite chega neste e-mail e vale 1&nbsp;hora.</p>'
    corpo = (resumo +
             f'<div class="campo"><label for="c-nome">Nome completo</label><input class="entrada" id="c-nome" name="c-nome" type="text" value="{nome_v}" autocomplete="off" data-foco{nome_attr}>{e_nome}</div>'
             f'<div class="campo"><label for="c-email">E-mail</label><input class="entrada" id="c-email" name="c-email" type="email" value="{mail_v}" autocomplete="off"{mail_attr}>{ajuda}{e_mail}</div>'
             f'<fieldset class="grupo-opcoes"><legend>Áreas que a pessoa abre</legend>{caixas("c-areas", marc)}</fieldset>{COMUNS}')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("envelope")}Enviar convite</button>'
    return janela('janela-convidar', 'Equipe · Ribeiro &amp; Matos', 'Convidar pessoa',
                  'Mandamos um convite por e-mail. A pessoa cria a senha e entra no Portal com as áreas que você marcar.',
                  corpo, pe, abrir=estado_ is not None)


def j_areas(abrir=False, erro=False):
    av = aviso('urgencia', 'Não deu para salvar as áreas.',
               'O servidor não respondeu. As áreas de Bianca continuam como estavam. Tente de novo em instantes.') if erro else ''
    corpo = av + f'<fieldset class="grupo-opcoes"><legend>Áreas que Bianca abre</legend>{caixas("m-areas", ["contratos", "financeiro"])}</fieldset>{COMUNS}'
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit" data-foco>{ico("check")}Salvar áreas</button>'
    return janela('janela-areas', 'Equipe · Ribeiro &amp; Matos', 'Áreas de Bianca Torres',
                  'A mudança vale na próxima página que Bianca abrir e fica no histórico da equipe, com seu nome e a hora.',
                  corpo, pe, abrir=abrir)


def j_retirar(abrir=False, erro=False):
    ativos = [p[1] + (' (sócia dona)' if p[3] == 'dono' else '') for p in PESSOAS if p[4] == 'ativa' and p[1] != 'Diego Almeida']
    ops = '<option value="">Escolha uma pessoa</option>' + ''.join(f'<option>{n}</option>' for n in ativos)
    resumo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'Diego continua na equipe.') if erro else ''
    inval = ' aria-invalid="true"' if erro else ''
    desc = 'r-passa-ajuda r-passa-erro' if erro else 'r-passa-ajuda'
    e_msg = f'<p class="erro-msg" id="r-passa-erro">{ico("alerta", "ico ico-s")}Escolha para quem passa o que é de Diego. Nada pode ficar sem dono.</p>' if erro else ''
    corpo = (resumo +
             f'<div class="campo"><label for="r-passa">Passar o que é de Diego para</label>'
             f'<select class="entrada" id="r-passa" name="r-passa" required aria-describedby="{desc}"{inval} data-foco>{ops}</select>'
             f'<p class="ajuda" id="r-passa-ajuda">Passam as tarefas, prazos, cobranças e atendimentos de que Diego é responsável. Só aparecem pessoas ativas na equipe.</p>{e_msg}</div>'
             f'<p class="pt-comuns">{ico("historico")}<span>A autoria não muda: o que Diego registrou continua com o nome dele. Para trazê-lo de volta, convide de novo.</span></p>')
    pe = '<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-perigo" type="submit">Retirar Diego</button>'
    return janela('janela-retirar', 'Equipe · Ribeiro &amp; Matos', 'Retirar Diego Almeida da equipe?',
                  'Diego perde o acesso ao Portal na hora e sai da lista da equipe.', corpo, pe, alerta=True, abrir=abrir or erro)


def j_cancelar(abrir=False):
    pe = '<button class="btn btn-fantasma" type="button" data-fechar data-foco>Voltar</button><button class="btn btn-perigo" type="submit">Cancelar o convite</button>'
    corpo = f'<p class="pt-comuns">{ico("historico")}<span>Renata nunca entrou no Portal, então nada precisa passar para outra pessoa. O cancelamento fica no histórico da equipe.</span></p>'
    return janela('janela-cancelar', 'Equipe · Ribeiro &amp; Matos', 'Cancelar o convite de Renata Lopes?',
                  'O link do convite deixa de valer na hora e Renata sai da lista.', corpo, pe, alerta=True, abrir=abrir)


def janelas(conv=None, areas=False, areas_erro=False, retirar=False, retirar_erro=False, cancelar=False):
    return j_convidar(conv) + j_areas(areas or areas_erro, areas_erro) + j_retirar(retirar, retirar_erro) + j_cancelar(cancelar)


def grade(miolo):
    return f'<div class="grade"><div class="col">{miolo}</div><aside class="col" aria-label="Áreas">{AREAS_DEF}</aside></div>'


CABECA = f'''<div class="cabeca-ambar campo-ambar cabeca-equipe" data-cabeca>
  <div><p class="sobretitulo">Escritório</p><h1>Equipe</h1><span class="fio" aria-hidden="true"></span>
  <p class="lede">Quem trabalha no Portal da Ribeiro &amp; Matos e quais áreas cada pessoa abre. Só você, como sócia dona, vê esta página.</p></div>
  <button class="btn btn-escuro" type="button" data-janela="janela-convidar" style="margin-bottom:6px">{ico('pessoa-mais')}Convidar pessoa</button>
</div>
<nav class="abas" aria-label="Seções da equipe" data-cabeca><a data-aba="pessoas" href="?estado=ver">Pessoas<span class="q">9</span></a><a data-aba="historico" href="?estado=historico">Histórico da equipe</a></nav>'''

def troca(lista_, nome, **mud):
    r = []
    for p in lista_:
        if p[1] == nome:
            p = list(p)
            for k, v in mud.items():
                p[{'sit': 4, 'det': 5}[k]] = v
            p = tuple(p)
        r.append(p)
    return r


sem_diego = [p for p in PESSOAS if p[1] != 'Diego Almeida']
reenviado = troca(PESSOAS, 'Tiago Rocha', sit='pendente', det='vale até 15h22')


def ev(hora, texto, sub='', selo='', forte=False):
    s = f'<small>{sub}</small>' if sub else ''
    return f'<li><time>{hora}</time><span class="pto{" forte" if forte else ""}" aria-hidden="true"></span><div><p>{texto}{selo}</p>{s}</div></li>'


def dia(t, evs):
    return f'<div class="eventos-dia"><h3>{t}</h3><ol class="eventos">{"".join(evs)}</ol></div>'


EXP = '<span class="selo pt-selo-exp">Exportação</span>'
HIST = ('<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hist">Histórico da equipe</h2>'
        '<p class="sub">Quem entrou, saiu ou mudou de área, e cada exportação dos dados. Nada aqui é apagado.</p></div></div>' +
        dia('18/11/2026 · hoje', [
            ev('14h05', '<b>Marina Ribeiro</b> convidou <b>Renata Lopes</b>', 'Áreas: Jurídico · convite pendente, vale até 15h05'),
            ev('11h30', '<b>Marina Ribeiro</b> mudou as áreas de <b>Bianca Torres</b>', 'Entrou: Contratos · Ficou: Financeiro'),
            ev('09h02', '<b>Gustavo Lima</b> aceitou o convite e entrou na equipe', 'Áreas: Jurídico'),
        ]) +
        dia('17/11/2026', [
            ev('16h40', '<b>Marina Ribeiro</b> convidou <b>Tiago Rocha</b>', 'Áreas: Comercial · o convite venceu às 17h40 sem ser usado'),
            ev('15h10', '<b>Marina Ribeiro</b> exportou os dados do escritório', 'Arquivo JSON completo, baixado neste aparelho', EXP, True),
            ev('08h55', '<b>Marina Ribeiro</b> convidou <b>Gustavo Lima</b>', 'Áreas: Jurídico'),
        ]) +
        dia('03/11/2026', [
            ev('10h15', '<b>Marina Ribeiro</b> retirou <b>Caio Mendes</b> da equipe; o que era de Caio passou para <b>Felipe Matos</b>', 'Tarefas, prazos, cobranças e atendimentos · a autoria do que Caio registrou não mudou'),
            ev('10h12', '<b>Marina Ribeiro</b> mudou as áreas de <b>Diego Almeida</b>', 'Saiu: Contratos · Ficou: Comercial'),
        ]) +
        f'<div class="mais"><span>Mostrando os 8 mais recentes</span><button class="btn btn-sec" type="button">{ico("historico")}Carregar mais antigos</button></div></section>')

HIST_VAZIO = ('<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hist">Histórico da equipe</h2>'
              '<p class="sub">Quem entrou, saiu ou mudou de área, e cada exportação dos dados. Nada aqui é apagado.</p></div></div>' +
              estado('Nada registrado ainda', 'Cada convite, mudança de área, saída da equipe e exportação dos dados aparece aqui, com quem fez e quando.',
                     icone='historico', moldura=False) + '</section>')

SO_MARINA = [PESSOAS[0]]
VAZIO = (f'<section class="folha" aria-labelledby="t-pessoas" style="overflow:hidden"><h2 id="t-pessoas" class="sr">Pessoas da equipe</h2>'
         f'<ul class="lista"><li><div class="pessoa"><span class="av-p forte" aria-hidden="true">MR</span><div class="quem-e"><strong>Marina Ribeiro<span class="voce">você</span></strong><small>marina@{DOM} · sócia dona</small></div><span class="selo selo-ativo">Vê tudo</span></div></li></ul>' +
         estado('Por enquanto, só você', 'Convide quem trabalha com você e marque, pessoa por pessoa, as áreas que cada uma abre. O convite chega por e-mail e vale 1&nbsp;hora.',
                icone='pessoa-mais', moldura=False, acoes=f'<button class="btn btn-pri" type="button" data-janela="janela-convidar">{ico("pessoa-mais")}Convidar pessoa</button>') +
         '</section>')

ESQ_LINHA = ('<div style="display:flex;gap:14px;align-items:center;padding:14px 0;border-top:1px solid var(--sal)"><span class="esqueleto" style="width:40px;height:40px;border-radius:50%;flex:none"></span>'
             '<div style="flex:1;display:grid;gap:8px"><span class="esqueleto esq-linha" style="width:40%;height:13px"></span><span class="esqueleto esq-linha" style="width:25%;height:10px"></span></div>'
             '<span class="esqueleto esq-linha" style="width:90px;height:26px"></span></div>')
CARREGANDO = ('<div aria-busy="true"><p class="sr" role="status">Carregando a equipe…</p><div aria-hidden="true"><section class="folha" style="padding:20px 24px">'
              '<span class="esqueleto esq-linha" style="width:260px;height:36px"></span><div style="margin-top:16px">' + ESQ_LINHA * 6 + '</div></section></div></div>')
ERRO = estado('Não deu para carregar a equipe', 'O servidor não respondeu. Ninguém foi tirado nem mudou de área. Tente de novo em instantes; se continuar, mande o código ao suporte.',
              erro=True, acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>', codigo='Código para o suporte: PTL-4C18-2290')
SEM_PERM = estado('Esta página é da sócia dona',
                  'Quem convida pessoas e muda as áreas é Marina Ribeiro. Se você precisa de uma mudança na equipe ou de outra área, fale com ela.',
                  icone='cadeado', h='h1', acoes=f'<a class="btn btn-pri" href="#">{ico("inicio")}Ir para o Início</a>')

T = ''
base = dict(atual='equipe', trilha='Escritório|Equipe', titulo='Equipe')
T += tpl('ver', grade(lista(PESSOAS)) + janelas(), **base)
T += tpl('convidar', grade(lista(PESSOAS)) + janelas(conv='aberta'), **base)
T += tpl('convidar-erros', grade(lista(PESSOAS)) + janelas(conv='erros'), **base)
T += tpl('convidar-ja', grade(lista(PESSOAS)) + janelas(conv='ja'), **base)
T += tpl('convidado', grade(lista(PESSOAS, nova='Renata Lopes')) + janelas() +
         toast('Convite enviado para Renata Lopes.', f'Chega em renata@{DOM} e vale 1&nbsp;hora, até 15h05. Ela aparece como “Convite pendente” até criar a senha.'), **base)
T += tpl('areas', grade(lista(PESSOAS)) + janelas(areas=True), **base)
T += tpl('areas-erro', grade(lista(PESSOAS)) + janelas(areas_erro=True), **base)
T += tpl('areas-salvas', grade(lista(PESSOAS, nova='Bianca Torres')) + janelas() +
         toast('Áreas de Bianca Torres salvas.', 'Ela agora abre Contratos e Financeiro. A mudança ficou no histórico da equipe.'), **base)
T += tpl('reenviado', grade(lista(reenviado, nova='Tiago Rocha')) + janelas() +
         toast('Convite reenviado para Tiago Rocha.', 'O link antigo deixou de valer. O novo vale 1&nbsp;hora, até 15h22.'), **base)
T += tpl('retirar', grade(lista(PESSOAS)) + janelas(retirar=True), **base)
T += tpl('retirado', grade(lista(sem_diego)) + janelas() +
         toast('Diego Almeida saiu da equipe.', 'O que era de Diego passou para Felipe Matos. A autoria do que ele registrou não mudou, e tudo ficou no histórico da equipe.'), q='8', **base)
T += tpl('retirar-erro', grade(lista(PESSOAS)) + janelas(retirar_erro=True), **base)
T += tpl('cancelar-convite', grade(lista(PESSOAS)) + janelas(cancelar=True), **base)
sem_renata = [p for p in PESSOAS if p[1] != 'Renata Lopes']
T += tpl('convite-cancelado', grade(lista(sem_renata)) + janelas() +
         toast('Convite de Renata Lopes cancelado.', 'O link deixou de valer. Se precisar, convide de novo.'), q='8', **base)
T += tpl('vazio', grade(VAZIO) + janelas(), q='1', **base)
T += tpl('carregando', grade(CARREGANDO) + janelas(), **base)
T += tpl('erro', grade(ERRO) + janelas(), **base)
T += tpl('historico', grade(HIST) + janelas(), aba='historico', **base)
T += tpl('historico-vazio', grade(HIST_VAZIO) + janelas(), aba='historico', **base)
T += tpl('sem-permissao', SEM_PERM, quem='juridico', sem_cabeca=True, atual='', trilha='Equipe', titulo='Sem acesso')

open('saida/equipe.html', 'w', encoding='utf-8').write(
    pagina('Equipe', 'Equipe do escritório no Portal: convidar pessoas, liberar áreas, retirar e histórico.',
           '{"estado":"ver","atual":"equipe"}', CABECA, T))
print('equipe ok')
