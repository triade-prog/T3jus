# Portal · F3.160: editar a ficha vindo de Gerar documentos (AP-01, CH-08).
# Parte do desenho aprovado D25 (portal-responsavel-legal), sem mudá-lo: lê responsavel.py até o começo dos
# estados (que por sua vez lê a ficha ligada, Clientes e Procurações) e desenha só o que este item acrescenta.
# Peças novas com o prefixo eg-. Uso: python3 editar_gerar.py <pasta-saida>  (escreve telas.html e casos.json)
import os, sys, json

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_ARGV = list(sys.argv)
_M = '\n# ---------------------------------------------------------------- estados\n'
_rs = open(os.path.join(AQUI, 'responsavel.py'), encoding='utf-8').read()
exec(compile(_rs[:_rs.index(_M)], 'responsavel.py', 'exec'), globals())
sys.argv = _ARGV
SAIDA = _ARGV[1] if len(_ARGV) > 1 else 'saida'
U = '?estado='

# ---------------------------------------------------------------- CSS novo (prefixo eg-)
CSS_EG = r"""
/* ==========================================================================
   F3.160 · editar a ficha vindo de Gerar documentos (prefixo eg-). Só tokens e pares aprovados.
   ========================================================================== */
.eg-falta{font-family:var(--sans);display:inline-flex;align-items:center;margin-left:8px;height:20px;padding:0 8px;border-radius:10px;
  background:var(--papel);border:1px dashed var(--vinho-3);color:var(--vinho-3);font-size:11px;font-weight:600;vertical-align:1px}
.eg-volta{margin:0 0 20px}
.eg-volta+.cl-inativo-faixa{margin-top:-8px}
.eg-volta .btn{white-space:nowrap}
.eg-pe-status{font-size:12px;color:var(--texto-2)}
.janela .eg-janela-aviso{margin:0 0 14px}
/* Decisões D1 a D3: o quadro de hoje e o do desenho, lado a lado */
.eg-decisao{margin:0 0 24px;padding:18px 20px 20px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio-g);background:var(--papel)}
.eg-decisao .sobretitulo{margin:0 0 4px}
.eg-decisao h2{font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho);margin:0 0 6px}
.eg-decisao>p{font-size:13px;line-height:1.55;color:var(--texto-2);margin:0 0 14px;max-width:80ch}
.eg-decisao>p b{color:var(--texto);font-weight:500}
.eg-lado{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.eg-lado figure{margin:0;padding:14px;border-radius:var(--raio);background:var(--sal-2)}
.eg-lado figure.eg-proposta{background:var(--ambar-3)}
.eg-lado figcaption{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--vinho-2);margin:0 0 10px}
.eg-lado .pr-rep{background:var(--papel);display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px}
.eg-lado .pr-rep>div{flex:1 1 180px;min-width:0}
.eg-lado .eg-link{color:var(--vinho);font-weight:500;font-size:13px;text-decoration:underline;text-underline-offset:3px}
.eg-lado .eg-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border:1px solid var(--vinho);border-radius:var(--raio);color:var(--vinho);font-size:13px;font-weight:500;background:var(--papel);white-space:nowrap}
.eg-lado .eg-doc{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;padding:12px;border-radius:var(--raio);background:var(--papel);font-size:14px}
.eg-lado .eg-doc .eg-cx{width:20px;height:20px;border-radius:4px;background:var(--vinho);display:grid;place-items:center;color:#fff}
.eg-lado .eg-doc small{display:block;font-size:12.5px;color:var(--texto-2);line-height:1.45;margin-top:2px}
.eg-lado mark.eg-dif{background:transparent;color:inherit;border-bottom:2px solid var(--vinho-3);padding:0 1px}
.eg-rec{display:flex;gap:10px;align-items:flex-start;margin-top:14px;font-size:13px;line-height:1.5}
.eg-rec .ico{flex:none;color:var(--vinho);margin-top:1px}
.eg-rec b{font-weight:600}
@media (max-width:760px){
  .eg-lado{grid-template-columns:1fr}
  .eg-decisao{padding:14px 14px 16px}
  .eg-volta .btn{white-space:normal}
  .aviso .aviso-acoes .btn{white-space:normal;text-align:center;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px}
  .aviso .comparar{width:100%;table-layout:fixed}
  .aviso .comparar th,.aviso .comparar td{overflow-wrap:anywhere;white-space:normal;padding-left:6px;padding-right:6px}
  .aviso .comparar thead th{letter-spacing:.02em;font-size:11px}
}
"""

SCRIPT_EG = r"""<script>
/* Desenho: o foco onde o produto o põe ao abrir esta tela (aviso de volta, campo que falta ou link de origem). */
(function(){ var f=document.querySelector('#miolo [data-foco-agora]'); if(f){ try{ f.focus({preventScroll:true, focusVisible:true}) }catch(e){ f.focus() } } })();
</script>"""

SR_VOLTA = '<span class="sr"> para Gerar documentos</span>'
SR_CANCELA = '<span class="sr"> e voltar para Gerar documentos</span>'


def aviso_foco(tipo, titulo, texto='', icone=None, acoes=''):
    """Aviso que recebe o foco ao abrir a tela: sem região viva, para o leitor de tela não falar duas vezes (revisão, ajuste 18)."""
    return aviso(tipo, titulo, texto, icone=icone, acoes=acoes).replace(' role="status"', ' tabindex="-1" data-foco-agora', 1).replace(' role="alert"', ' tabindex="-1" data-foco-agora', 1)


def com_foco(html_, id_):
    return html_.replace(f'id="{id_}"', f'id="{id_}" data-foco-agora', 1)


FALTA_SELO = '<span class="eg-falta">Falta</span>'


def faixa_volta(titulo, texto, estado_destino, rotulo='Voltar para Gerar documentos'):
    """A volta fixa na tela (revisão, ajuste 8): fica enquanto a ficha veio de Gerar, mesmo depois de fechar o aviso."""
    return ('<div class="aviso aviso-info cl-inativo-faixa eg-volta" role="region" aria-label="Volta para Gerar documentos">' + ico('seta')
            + f'<div><strong class="aviso-titulo">{titulo}</strong><p>{texto}</p></div>'
            f'<a class="btn btn-pri" href="{U}{estado_destino}">{ico("esq")}{rotulo}</a></div>')


# ---------------------------------------------------------------- 1. editar a ficha de Pedro vindo de Gerar
def painel_menor_g(cpf_v='', rg_v='', cpf_erro='', mudou=(), falta=(), foco=None):
    v = V_PEDRO
    pr = 'Pedro'
    ok = bool(cpf_v) and not cpf_erro
    def lab(k):
        return (k in mudou, FALTA_SELO if k in falta else '')
    cpf_ = campo('m-rl-cpf', 'CPF', cpf_v, 'c2', uso=PROC, im='numeric', erro=cpf_erro, mudou=lab('cpf')[0],
                 ajuda='' if cpf_erro else ('Falta. Vai na procuração e no contrato.' if 'cpf' in falta else 'Conferimos os dígitos.'),
                 depois=f'<p class="cl-ok">{ico("check")}Dígitos conferidos</p>' if ok else '')
    rg_ = campo('m-rl-rg', 'RG', rg_v, 'c2', uso=PROC, im='numeric', mudou=lab('rg')[0],
                ajuda='Falta. Vai na procuração e no contrato.' if 'rg' in falta else '')
    if 'cpf' in falta:
        cpf_ = cpf_.replace('<span class="cl-uso">procuração</span>', '<span class="cl-uso">procuração</span>' + FALTA_SELO, 1)
    if 'rg' in falta:
        rg_ = rg_.replace('<span class="cl-uso">procuração</span>', '<span class="cl-uso">procuração</span>' + FALTA_SELO, 1)
    if foco:
        cpf_ = com_foco(cpf_, foco) if foco == 'm-rl-cpf' else cpf_
        rg_ = com_foco(rg_, foco) if foco == 'm-rl-rg' else rg_
    corpo = (
        f'<div class="c6 cl-lgpd">{ico("escudo")}<span><b>Por que pedimos a data de nascimento.</b> Só de quem é menor, e só para saber, no dia de gerar cada documento, '
        f'se ele é representado ou assistido. De quem assina por si, não pedimos (LGPD).</span></div>'
        + campo('m-nasc', 'Data de nascimento', v['nasc'], 'c3', uso=PROC, im='numeric', ajuda='dd/mm/aaaa')
        + calc_menor(pr, v['idade'], v['n16'], v['n18'])
        + f'<div class="rl-sub"><h4>Quem assina por {pr}</h4><small>O pai, a mãe ou o tutor. Vai na procuração e no contrato.</small></div>'
        + selecao('m-papel', 'É', ['Mãe', 'Pai', 'Tutora', 'Tutor'], v['papel'], 'c2', uso=PROC, ajuda='Tutor é quem o juiz nomeou.')
        + campo('m-rl-nome', 'Nome completo', v['rl'], 'c4', uso=PROC, ajuda='Como está no documento.')
        + cpf_ + rg_
        + campo('m-rl-rgo', 'Órgão emissor e UF', 'SSP/SP' if rg_v else '', 'c2', ajuda='Ex.: SSP/SP', mudou='rg' in mudou and 'cpf' in mudou)
        + selecao('m-rl-nac', 'Nacionalidade', ['Brasileira', 'Outra'], v['rlnac'], 'c2', PROC)
        + selecao('m-rl-civil', 'Estado civil', EST_CIVIL, v['rlcivil'], 'c2', PROC)
        + campo('m-rl-prof', 'Profissão', v['rlprof'], 'c2', uso=PROC)
        + f'<div class="rl-mora"><label class="opcao"><input class="marcar" type="checkbox" name="m-mora" checked><span>Mora com {pr}'
          f'<small>O endereço da qualificação vale para os dois (“ambos residentes na…”). Desmarque para escrever outro.</small></span></label></div>'
    )
    return f'<div class="rl-painel" data-cap="menor" role="group" aria-label="Menor de 18 anos: data de nascimento e quem assina">{corpo}</div>'


CONFLITO_TAB = ('<table class="comparar"><caption class="sr">Campos que mudaram</caption><thead><tr><th scope="col">Campo</th><th scope="col">Salvo agora</th>'
                '<th scope="col">O que você escreveu</th></tr></thead><tbody><tr><th scope="row">RG de quem assina</th><td>41.552.318-7</td><td>41.552.381-7</td></tr></tbody></table>')


def editar_pedro_g(modo='abrir'):
    """modo: abrir (D9: foco no CPF de Joana, que falta), mudou (D10), salvando, erros, conflito."""
    topo = ''
    if modo == 'erros':
        topo += ('<div class="c6">' + aviso_foco('urgencia', 'A ficha não foi salva. Falta acertar 1 ponto, marcado abaixo.',
                                                 '<a href="#m-rl-cpf">CPF de Joana</a>. O que você escreveu continua aqui. Ao salvar, você volta para Gerar documentos.') + '</div>')
    if modo == 'conflito':
        topo += ('<div class="c6">' + aviso_foco('urgencia', 'Diego Almeida salvou esta ficha às 15h48, enquanto você editava.',
                                                 'Nada do que você escreveu se perdeu. Compare o campo que mudou e escolha qual versão fica. Nas duas, você volta para Gerar documentos.',
                                                 acoes=CONFLITO_TAB + '<div class="aviso-acoes" style="width:100%">'
                                                 f'<button class="btn btn-pri" type="button">Salvar a minha versão e voltar</button>'
                                                 f'<a class="btn btn-sec" href="{U}gerar-voltou-ficou-com-a-salva">Ficar com a versão salva e voltar</a></div>') + '</div>')
    txt_volta = ('Faltam o CPF e o RG de Joana: o cursor já está no CPF. Ao salvar, você volta para lá, com a prévia já com os dados novos.'
                 if modo == 'abrir' else 'Ao salvar, volta para lá, com a prévia já com os dados novos.')
    topo += '<div class="c6">' + aviso('info', 'Você veio de Gerar documentos.', txt_volta, icone='seta').replace(' role="status"', ' id="eg-veio"', 1) + '</div>'
    if modo == 'abrir':
        pm = painel_menor_g('', '', falta=('cpf', 'rg'), foco='m-rl-cpf')
    elif modo == 'erros':
        pm = painel_menor_g(CPF_JOANA_ERRADO, '41.552.318-7', mudou=('rg',),
                            cpf_erro='Confira o CPF: o último dígito não bate com os anteriores. Veja se algum número foi trocado, ou deixe em branco por agora.')
    elif modo == 'conflito':
        pm = painel_menor_g(CPF_JOANA, '41.552.381-7', mudou=('rg',))
    else:
        pm = painel_menor_g(CPF_JOANA, '41.552.318-7', mudou=('cpf', 'rg'))
    r = topo
    r += campo('e-nome', 'Nome completo', 'Pedro Henrique Alves Souza', 'c4', uso=PROC)
    r += campo('e-doc', 'CPF', CPF_PEDRO, 'c2', uso=PROC, im='numeric', ajuda='Dígitos conferidos.')
    r += campo('e-email', 'E-mail', '', 'c3', tipo='email', opc=True, ajuda='Para falar com o cliente.')
    r += selecao('e-origem', 'Origem', ORIGENS, 'Indicação de cliente', 'c3', opc=True, ajuda='Não vai em documento.')
    r += capacidade_fs('menor')
    r += pm
    r += qualif_menor(V_PEDRO, False, pre='eq')
    r += ('<fieldset class="contatos-edit"><legend>Contatos<small>Até 10. Cada um precisa de telefone ou e-mail. O principal é quem o escritório procura primeiro.</small></legend>'
          + contato_edit(1, 'Joana Alves Souza', 'Mãe · quem assina por Pedro', '(11) 98472-3316', 'joana.souza@exemplo.com.br', True)
          + f'<div><button class="btn btn-fantasma" type="button">{ico("mais")}Adicionar contato</button></div></fieldset>')
    if modo == 'salvando':
        r += (f'<div class="form-pe"><span class="esq-pe" role="status">Salvando a ficha. Em seguida, você volta para Gerar documentos.</span>'
              f'<button class="btn btn-fantasma" type="button" disabled>Cancelar{SR_CANCELA}</button>'
              f'<button class="btn btn-pri" type="submit" disabled>{ico("relogio")}Salvando…</button></div>')
    else:
        r += (f'<div class="form-pe"><span class="esq-pe">Cada mudança vai para o histórico do escritório, com seu nome e os campos alterados.</span>'
              f'<a class="btn btn-fantasma" href="{U}gerar-voltou-cancelou">Cancelar{SR_CANCELA}</a>'
              f'<button class="btn btn-pri" type="submit">{ico("check")}Salvar e voltar{SR_VOLTA}</button></div>')
    f_ = (f'<section class="folha" aria-labelledby="t-editar"><div class="folha-cab"><div><h2 id="t-editar">Editar ficha<span class="sr"> · você veio de Gerar documentos</span></h2>'
          f'<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div><form class="form-folha" action="#" novalidate aria-describedby="eg-veio">{r}</form></section>')
    d = DIR_PEDRO.replace(f'<a class="btn btn-pri" href="{U}gerar-representado">{ico("doc")}Gerar documentos</a>', '')
    cab = cab_cli(PEDRO, d, selo_menor('Menor · assina a mãe'))
    return f'<div class="cl">{cab}{abas_fl(N_PEDRO, estado_base="ficha-menor")}{grade_ficha(f_, EXPLICA_EDIT)}</div>'


# ---------------------------------------------------------------- 2. editar a ficha da empresa (PJ) vindo de Gerar
CNPJ_FAR = '08.417.552/0001-30'
FAR = dict(nome='Farmácia Bom Jesus Ltda.', tp='PJ', desde='02/09/2026', doc='')
DIR_FAR = dir_passo('Caso em andamento', '<b>C-2026-019 ativo desde 02/09.</b><br>Rita assina pela empresa a procuração e a declaração.', '', 4,
                    contato=None, sobre='Próximo passo', grande_px=26)


def editar_far():
    topo = '<div class="c6">' + aviso('info', 'Você veio de Gerar documentos.',
                                      'O cursor já está em “Quem assina pela empresa”. Ao salvar, você volta para lá, com a prévia já com os dados novos.',
                                      icone='seta').replace(' role="status"', ' id="eg-veio"', 1) + '</div>'
    v = dict(cep='02011-000', end='Rua Voluntários da Pátria, 1.540', cidade='São Paulo', uf='SP', rep='Rita de Cássia Moura', cargo='Sócia-administradora',
             repcpf=P['CPF_REP'], repcivil='Casado(a)', repprof='Farmacêutica')
    q = com_foco(qualif_pj(v, True, pref='eq'), 'eq-rep')
    r = topo
    r += campo('e-nome', 'Razão social', 'Farmácia Bom Jesus Ltda.', 'c4', uso=PROC)
    r += campo('e-doc', 'CNPJ', CNPJ_FAR, 'c2', uso=PROC, im='numeric', ajuda='Dígitos conferidos.')
    r += campo('e-email', 'E-mail', 'compras@bomjesus.exemplo.com.br', 'c3', tipo='email', opc=True, ajuda='Para falar com o cliente.')
    r += selecao('e-origem', 'Origem', ORIGENS, 'Indicação de advogado ou parceiro', 'c3', opc=True, ajuda='Não vai em documento.')
    r += q
    r += ('<fieldset class="contatos-edit"><legend>Contatos<small>Até 10. Cada um precisa de telefone ou e-mail. O principal é quem o escritório procura primeiro.</small></legend>'
          + contato_edit(1, 'Rita de Cássia Moura', 'Sócia-administradora', '(11) 2281-4470', 'rita@bomjesus.exemplo.com.br', True)
          + f'<div><button class="btn btn-fantasma" type="button">{ico("mais")}Adicionar contato</button></div></fieldset>')
    r += (f'<div class="form-pe"><span class="esq-pe">Cada mudança vai para o histórico do escritório, com seu nome e os campos alterados.</span>'
          f'<a class="btn btn-fantasma" href="#">Cancelar{SR_CANCELA}</a>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Salvar e voltar{SR_VOLTA}</button></div>')
    f_ = (f'<section class="folha" aria-labelledby="t-editar"><div class="folha-cab"><div><h2 id="t-editar">Editar ficha<span class="sr"> · você veio de Gerar documentos</span></h2>'
          f'<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div><form class="form-folha" action="#" novalidate aria-describedby="eg-veio">{r}</form></section>')
    return f'<div class="cl">{ficha_cab(FAR, DIR_FAR)}{abas_fl(dict(atendimentos=4, propostas=1, contratos=1, casos=1), estado_base="ficha-pj")}{grade_ficha(f_, EXPLICA_EDIT)}</div>'


# ---------------------------------------------------------------- 3. a ficha em leitura, com a volta fixa
def ficha_seb_termo_recusado():
    h = ficha_seb()
    i = h.index('<div style="padding:0 24px 18px"><div class="rl-arq rl-tem"')
    j = h.index('</div></div>', h.index('Baixar o termo', i)) + len('</div></div>')
    sem = (f'<div style="padding:0 24px 18px"><div class="rl-arq" role="group" aria-labelledby="f-termo"><span class="rl-ic" aria-hidden="true">{ico("doc")}</span>'
           f'<div><strong id="f-termo">Termo de curatela</strong><small>Não foi guardado. Mande de novo em “Mudar”, nesta folha.</small></div></div></div>')
    h = h[:i] + sem + h[j:]
    h = h.replace('<dd>Termo de curatela na ficha', '<dd>Sem termo na ficha', 1)
    faixa = faixa_volta('Você veio de Gerar documentos.',
                        'A ficha de Sebastião foi salva; só o termo de curatela não foi guardado. A prévia já vem com os dados novos e as suas escolhas continuam lá.',
                        'gerar-voltou-salvo')
    h = h.replace('<div class="cl-grade">', faixa + '<div class="cl-grade">', 1) if '<div class="cl-grade">' in h else h
    t = (f'<div class="aviso aviso-atencao toast" role="status">{ico("relogio")}<div><strong class="aviso-titulo">Ficha salva.</strong>'
         f'<p>O termo de curatela não foi guardado: o arquivo precisa ser PDF ou foto, até 10 MB. Mande de novo em “Mudar”, na folha Quem assina por Sebastião.</p></div>'
         f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')
    return h + t


CT_ADD = f'<div class="acoes"><a class="btn btn-sec" href="{U}editar">{ico("mais")}Adicionar contato</a></div>'


def ficha_pedro_inativa():
    dados = dados_pedro().replace(b_editar(), '').replace('<div class="acoes"></div>', '')
    quem = quem_pedro(falta=True)
    i = quem.index('<div class="acoes">')
    j = quem.index('</div>', i) + 6
    quem = quem[:i] + quem[j:]
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-prox"><p class="sobretitulo" id="t-prox">Próximo contato</p>'
         f'<p class="grande" style="font-size:30px">Nenhum</p><p class="cl-oque">Encerrado ao inativar, hoje, às 15h40.</p></section>')
    cab = cab_cli(PEDRO, d, selo_menor('Menor · assina a mãe')).replace('<span class="selo selo-ativo">Ativo</span>', '<span class="selo selo-neutro">Inativo</span>', 1)
    volta = faixa_volta('Você veio de Gerar documentos. A ficha de Pedro está inativa.',
                        'Para mudar, reative primeiro. Nada foi salvo; volte para gerar como está, com os dados marcados como falta.', 'gerar-voltou-cancelou')
    inat = ('<div class="aviso aviso-info cl-inativo-faixa" role="status">' + ico('pasta')
            + '<div><strong class="aviso-titulo">Cliente inativo desde hoje, 15h40.</strong><p>Diego Almeida inativou: “A família desistiu da ação.” Os dados e os atendimentos continuam aqui.</p></div>'
            f'<button class="btn btn-sec" type="button" data-janela="janela-reativar">{ico("reenviar")}Reativar</button></div>')
    lat = (f'<section class="folha" aria-labelledby="t-sit"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-sit" style="font-size:20px">Situação</h2></div></div>'
           f'<div class="cl-sit"><p>Inativo não aparece na lista do dia a dia nem gera próximo contato. Para mudar a ficha, reative: ela volta com os dados de antes.</p></div></section>')
    return (f'<div class="cl">{cab}{abas_fl(N_PEDRO, estado_base="ficha-menor")}{volta}'
            f'{inat}{grade_ficha(dados + quem + contatos_pedro().replace(CT_ADD, ""), lat)}</div>' + j_reativar().replace('João Pedro Alves', 'Pedro Henrique Alves Souza').replace('João Pedro volta', 'Pedro volta'))


def nao_encontrada():
    ac = (f'<a class="btn btn-pri" href="{U}gerar-voltou-cancelou" data-foco-agora>{ico("esq")}Voltar para Gerar documentos</a>'
          f'<a class="btn btn-sec" href="#">{ico("pessoas")}Ir para Clientes</a>')
    return estado('Cliente não encontrado', 'Este endereço não é de um cliente deste escritório, ou o cliente foi excluído. Nada foi salvo. '
                  'Volte para Gerar documentos e confira o contrato, ou busque o cliente pelo nome, CPF ou telefone.', 'busca', acoes=ac, h='h1')


# ---------------------------------------------------------------- 4. fez 18 vindo de Gerar (D6)
def j_18_g():
    corpo = ('<div class="eg-janela-aviso">' + aviso('info', 'Você veio de Gerar documentos.',
                                                     'Ao salvar, volta para lá, com a procuração já assinada só por Rafaela. “Agora não” volta sem mudar nada.', icone='seta') + '</div>'
             + f'<p class="pt-comuns">{ico("historico")}<span>Cleusa sai de “Quem assina” e fica no histórico da ficha, com a data. Nada é apagado. '
             f'Os documentos gerados antes continuam como estavam.</span></p>'
             + '<div class="cl-dois">' + selecao('j18-civil', 'Estado civil de Rafaela', EST_CIVIL, '', 'c3').replace('<select ', '<select data-foco ', 1)
             + campo('j18-prof', 'Profissão', '', 'c3', ajuda='Ex.: estudante, atendente') + '</div>'
             + f'<p class="ajuda">Se Rafaela não pode assinar sozinha por outro motivo (curatela), não salve aqui: <a href="#">marque “Está sob curatela” na ficha</a>.</p>')
    pe = (f'<a class="btn btn-fantasma" href="{U}gerar-fez-18-agora-nao">Agora não{SR_CANCELA}</a>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Salvar e voltar<span class="sr">: Rafaela assina por si</span></button>')
    return janela('janela-18', 'Rafaela Nunes Torres', 'Rafaela agora assina por si',
                  'Ela fez 18 anos em 19/11/2026. Complete o que passa a ir no documento.', corpo, pe, abrir=True)


def ficha_rafa_janela_g():
    h = ficha_rafa(False)
    return h.replace(j_18(False), j_18_g(), 1)


def ficha_rafa_resolvida():
    cab = cab_cli(RAFA, DIR_RAFA, '')
    dados = folha('t-dados', 'Dados e qualificação', 'O que vai na procuração e no contrato.', dl([
        ('Nome completo', 'Rafaela Nunes Torres', True),
        ('CPF', f'<span class="num">{CPF_RAFA}</span>{CONF}'), ('RG', '52.884.106-2 · SSP/SP'), ('Nacionalidade', 'Brasileira'),
        ('Estado civil', 'Solteira'), ('Profissão', 'Atendente'),
        ('Endereço', 'Rua Itaqueri, 1.020, Mooca, São Paulo, SP · CEP 03187-000', True),
    ]), acoes=b_editar('editar-de-gerar'))
    antes = folha('t-antes', 'Quem assinava com Rafaela', 'Até 18/11/2026. Fica guardado, mas não entra nos documentos novos.',
                  f'<div class="rl-quem"><span class="rl-av" aria-hidden="true">CN</span><div><strong>Cleusa Nunes Torres</strong>'
                  f'<small>Avó e tutora · assistiu Rafaela dos 16 aos 17 anos</small><span class="selo selo-neutro">Até 18/11/2026</span></div></div>'
                  + dl([('CPF', f'<span class="num">{CPF_CLEUSA}</span>'), ('Assinou com ela', 'Contrato C-2026-022 e a procuração, em 08/07/2026')]).replace('class="dados-ficha"', 'class="dados-ficha rl-antes"'))
    lat = (proc_lista('Para gerar a procuração', 7, 7, [('Nome completo', 1), ('CPF', 1), ('RG', 1), ('Nacionalidade', 1), ('Endereço', 1), ('Estado civil', 1), ('Profissão', 1)],
                      'Tudo pronto. Rafaela assina por si desde hoje, 15h20.', botao=False))
    volta = faixa_volta('Rafaela já assina por si.',
                        'Larissa Costa confirmou hoje, às 15h20, com o estado civil e a profissão. Não há nada a completar aqui: a prévia em Gerar já sai assinada só por ela.',
                        'gerar-voltou-salvo')
    volta = volta.replace('role="region"', 'tabindex="-1" data-foco-agora role="region"', 1)
    return f'<div class="cl">{cab}{abas_fl(dict(atendimentos=6, propostas=1, contratos=1, casos=1), estado_base="ficha-fez-18")}{volta}{grade_ficha(dados + antes, lat)}</div>'


# ---------------------------------------------------------------- 5. Gerar documentos ao voltar
def qual_pedro_g(cpf_ok=True, rg_ok=True):
    cpf_j = f'<{C}>inscrita no CPF sob o nº {CPF_JOANA}</mark>' if cpf_ok else FALTA('CPF DE QUEM ASSINA')
    rg_j = f'<{C}>portadora do RG nº 41.552.318-7 SSP/SP</mark>' if rg_ok else FALTA('RG DE QUEM ASSINA')
    return (f'<{C}>PEDRO HENRIQUE ALVES SOUZA</mark>, <{C}>brasileiro, menor impúbere, nascido em 14/03/2014, inscrito no CPF sob o nº {CPF_PEDRO}</mark>, '
            f'neste ato representado por sua <{C}>mãe</mark>, <{C}>JOANA ALVES SOUZA, brasileira, divorciada, auxiliar administrativa</mark>, {rg_j}, {cpf_j}, '
            f'ambos residentes na <{C}>{END_PEDRO}</mark>')


ADV_MEU = [('Marina Ribeiro', 'Responsável pelo contrato', True, None), ('Larissa Costa', 'Advogada no contrato', True, None), ('Felipe Matos', 'Não está no contrato', True, None)]
POD_MEU = POD_PS + ['Desistir da ação']
OUTRO_MEU = 'requerer e levantar valores depositados em juízo em nome do menor'


def quadro_g(falta_txt=None):
    nome_sr = '<span class="sr"> quem assina por Pedro</span>'
    if falta_txt:
        q = quadro('Pedro', 'JA', 'Joana Alves Souza', 'Mãe · da ficha do cliente', falta=True, dois=falta_txt)
    else:
        q = quadro('Pedro', 'JA', 'Joana Alves Souza', f'Mãe · CPF {CPF_JOANA} · da ficha do cliente')
    return q.replace(f'href="{U}editar">{ico("lapis", "ico ico-s")}Mudar na ficha',
                     f'href="{U}editar-de-gerar" id="volta-quadro">{ico("lapis", "ico ico-s")}<span>Mudar{nome_sr} na ficha</span>', 1)


def completar_link(sr, foco=False, destino='editar-de-gerar', id_='volta-falta-rl'):
    f = ' data-foco-agora' if foco else ''
    return f'<a class="btn btn-sec" href="{U}{destino}" id="{id_}"{f}>{ico("lapis")}Completar na ficha<span class="sr">: {sr}</span></a>'


def gerar_pedro_g(cpf_ok, rg_ok, topo='', meu=True, aba='p', foco_link=False, cab_titulo=None, veio='', pe_override=None):
    nf = (0 if cpf_ok else 1) + (0 if rg_ok else 1)
    if nf == 2:
        q = quadro_g('Faltam o CPF e o RG dela')
        av = aviso('atencao', 'Faltam 2 dados de quem assina por Pedro: o CPF e o RG de Joana.',
                   'Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. '
                   'Ou complete a ficha antes: ao salvar, você volta para cá.', icone='pena', acoes=completar_link('CPF e RG de Joana', foco_link))
    elif nf == 1:
        q = quadro_g('Falta o RG dela')
        av = aviso('atencao', 'Falta 1 dado de quem assina por Pedro: o RG de Joana.',
                   'Dá para gerar assim: os três documentos saem com [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. '
                   'Ou complete a ficha antes: ao salvar, você volta para cá.', icone='pena', acoes=completar_link('RG de Joana', foco_link))
    else:
        q = quadro_g()
        av = aviso('info', 'Pedro tem 12 anos hoje: ele é representado.',
                   'Só Joana assina, em nome dele, os três documentos. Em 14/03/2030, aos 16 anos, ele passa a ser assistido, e os dois assinam. '
                   'O T3jus faz a conta pela data de nascimento, no dia de gerar.', icone='pessoas')
    adv = ADV_MEU if meu else ADV_PS
    pod = POD_MEU if meu else POD_PS
    outro = OUTRO_MEU if meu else ''
    r = (topo + P['contrato_card']('PS', 'Pedro Henrique Alves Souza', 'C-2026-034 · Alimentos · em elaboração', veio)
         + q + '<div class="c6">' + av + '</div>'
         + P['documentos_fs'](contrato_sub='Contratante: Pedro, representado por Joana. Com o objeto, as 2 condições de honorário e as cláusulas do escritório.')
         + P['outorgados_fs'](adv) + P['poderes_fs'](pod, outro) + P['data_campo']())
    if cpf_ok:
        a = ASS_PEDRO
    else:
        a = ASS_PEDRO_F
    qual = qual_pedro_g(cpf_ok, rg_ok)
    nomes = [n for n, _, m, _ in adv if m]
    pain = [
        ('c', 'Contrato', nf, papel_contrato_min('C-2026-034', qual, a)),
        ('p', 'Procuração', nf, com_ass(P['papel_procuracao'](qual, nomes, pod, outro, assina=ASSX), a)),
        ('d', 'Declaração', nf, com_ass(P['papel_declaracao'](qual, assina=ASSX), a)),
    ]
    if pe_override:
        pe = pe_override
    elif nf:
        quais = 'o CPF e o RG de Joana' if nf == 2 else 'o RG de Joana'
        pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.',
                           f'{nf} {"dados saem marcados" if nf > 1 else "dado sai marcado"} em cada um: {quais}. Cada geração fica registrada, com quem gerou e quando.', 'Gerar 3 documentos')
    else:
        pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.', 'Nenhum dado faltando. Em todos, Joana assina por Pedro.', 'Gerar 3 documentos')
    h = P['pagina_gerar'](r, P['previa'](pain, aba), pe)
    if cab_titulo:
        h = h.replace('<h1>Gerar documentos</h1>', f'<h1>{cab_titulo}</h1>', 1)
    return h


def salvo_aviso(nome='Pedro', escolhas=True):
    t = 'A prévia já está com os dados novos.' + (' As suas escolhas continuam aqui.' if escolhas else '')
    return '<div class="c6">' + aviso_foco('sucesso', f'Ficha de {nome} salva.', t) + '</div>'


def gerar_voltou_salvo():
    return gerar_pedro_g(True, True, topo=salvo_aviso(), aba='c')


def gerar_voltou_falta():
    return gerar_pedro_g(True, False, topo=salvo_aviso(), aba='c')


def gerar_voltou_cancelou():
    return gerar_pedro_g(False, False, aba='c', foco_link=True)


def gerar_voltou_ficou():
    av = '<div class="c6">' + aviso_foco('info', 'A ficha ficou como Diego Almeida salvou.',
                                         'Ele salvou às 15h48 o CPF e o RG de Joana; o que você escreveu não foi salvo. A prévia já está com os dados dele. As suas escolhas continuam aqui.',
                                         icone='pessoas') + '</div>'
    return gerar_pedro_g(True, True, topo=av, aba='c')


def gerar_de_novo_voltou():
    versao = '<div class="c6">' + aviso('info', 'A versão 1 é de hoje, às 15h10, gerada por Marina Ribeiro.',
                                        'Desde então mudaram 2 dados de Pedro: o CPF e o RG de Joana. Gerar de novo cria a versão 2 dos documentos marcados; a versão 1 fica guardada. '
                                        'Nenhum assinado foi anexado ainda.', icone='historico') + '</div>'
    pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx, versão 2</b>.', 'Nenhum dado faltando. A versão 1, com o CPF e o RG de Joana marcados como falta, fica guardada.', 'Gerar a versão 2')
    return gerar_pedro_g(True, True, topo=salvo_aviso(escolhas=False) + versao, meu=False, aba='p', cab_titulo='Gerar de novo',
                         veio='Vieram as mesmas escolhas da versão 1.', pe_override=pe)


def gerar_fez18_agora_nao():
    h = gerar_fez_18()
    h = h.replace('Ou complete a ficha antes.', 'Ou complete a ficha antes: ao salvar, você volta para cá.', 1)
    h = h.replace(f'<a class="btn btn-sec" href="{U}fez-18-janela">{ico("lapis")}Completar na ficha</a>',
                  f'<a class="btn btn-sec" href="{U}fez-18-janela-de-gerar" id="volta-fez18" data-foco-agora>{ico("lapis")}Completar na ficha'
                  f'<span class="sr">: estado civil e profissão de Rafaela</span></a>', 1)
    return h


def gerar_voltou_pj():
    h = P['gerar_pj']()
    h = h.replace('<form class="form-folha pe-form" id="gd-form" action="#" novalidate>',
                  '<form class="form-folha pe-form" id="gd-form" action="#" novalidate>' + salvo_aviso('Farmácia Bom Jesus Ltda.'), 1)
    h = h.replace(f'href="{P["FICHA_CL"]}">{ico("lapis", "ico ico-s")}Mudar na ficha',
                  f'href="{U}editar-de-gerar-pj" id="volta-pj">{ico("lapis", "ico ico-s")}<span>Mudar<span class="sr"> quem assina pela empresa</span> na ficha</span>', 1)
    return h


# ---------------------------------------------------------------- 6. Documentos gerados com falta: "Completar na ficha" na mesma aba
def gerados_pedro():
    def a(n, arq, kb):
        return (f'<li><span class="ct-ci">{ico("doc")}</span><div><b>{n}</b><small>{arq} · Word · {kb}</small></div>'
                f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> {n.lower()}</span></button></li>')
    corpo = (f'<ul class="ct-arquivos">'
             + a('Contrato de honorários', 'contrato-honorarios-pedro-souza.docx', '47 KB')
             + a('Procuração', 'procuracao-pedro-souza.docx', '31 KB')
             + a('Declaração de hipossuficiência', 'declaracao-pedro-souza.docx', '18 KB')
             + '</ul><div class="pe-pronto">'
             + aviso('atencao', 'O CPF e o RG de Joana saíram como falta nos três.',
                     'Preencha à mão ou no Word. Ou complete a ficha e gere de novo: ao salvar, você volta para cá, em Gerar de novo, com as mesmas escolhas. A versão 1 fica guardada.',
                     icone='pena', acoes=completar_link('CPF e RG de Joana', destino='editar-de-gerar', id_='volta-resultado'))
             + f'<p class="pe-cuidado" style="margin:0">{ico("balanca")}<span><b>Você revisa antes de imprimir.</b> O T3jus preencheu os modelos com os dados do cadastro e do contrato. Ele não confere o conteúdo jurídico.</span></p>'
             + f'<ol class="pe-proximo" aria-label="Próximos passos"><li><span><b>Revise no Word</b> os dados marcados, a concordância e as cláusulas.</span></li>'
             f'<li><span><b>Imprima</b> no timbrado. O arquivo já sai com ele.</span></li>'
             f'<li><span><b>Colha as assinaturas:</b> Joana assina por Pedro nos três; no contrato, também quem assina pelo escritório.</span></li>'
             f'<li><span><b>Anexe os assinados.</b> O contrato assinado ativa o contrato e manda a programação dos recebimentos ao Financeiro.</span></li></ol>'
             f'<div class="pe-acoes-res"><a class="btn btn-sec" href="#">{ico("enviar")}Anexar os assinados</a>'
             f'<a class="btn btn-fantasma" href="#">{ico("dir")}Ir para o contrato C-2026-034</a></div></div>')
    pri = (f'<section class="folha" aria-labelledby="t-gf"><div class="folha-cab"><div><h2 id="t-gf">3 documentos prontos</h2>'
           f'<p class="sub">C-2026-034 · Pedro Henrique Alves Souza · versão 1 · gerados hoje, às 15h10, por Marina Ribeiro</p></div>'
           f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("baixar")}Baixar todos (.zip)</button></div></div>{corpo}</section>')
    usado = (f'<dl class="hn-dl">'
             f'<div><dt>Contrato</dt><dd>C-2026-034</dd></div>'
             f'<div><dt>Modelos</dt><dd>Contrato v2, do escritório<br>Procuração e declaração, padrão T3jus</dd></div>'
             f'<div><dt>Quem assina</dt><dd>Joana Alves Souza, mãe, por Pedro (representado)</dd></div>'
             f'<div><dt>Outorgados</dt><dd>Marina Ribeiro, OAB/SP nº 214.538<br>Larissa Costa, OAB/SP nº 401.226</dd></div>'
             f'<div><dt>Cidade e data</dt><dd>{P["CIDADE_DATA"]}</dd></div>'
             f'<div><dt>Saiu marcado</dt><dd>CPF e RG de Joana</dd></div></dl>'
             f'<p class="hn-pe">{ico("historico")}<span>Fica guardado com os arquivos, como estava hoje, mesmo que a Equipe ou a ficha mudem depois.</span></p>')
    lat = P['folha']('t-us', 'O que foi usado', usado, pequeno=True)
    cab = P['cab_pr']('Documentos gerados', voltar=('#', 'Procurações e modelos'), sobre='Procurações e modelos')
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{pri}</div><aside class="hn-col" aria-label="O que foi usado">{lat}</aside></div></div>'


# ---------------------------------------------------------------- 7. decisões D1 a D3 (diferenças da nota do item)
def rep_mini(nome, linha, selo='', falta=''):
    # Hoje (selo): o quadro do código, com o selo e o link de texto "Mudar na ficha". Desenho: o botão compacto do D25.
    s = f'<span class="selo selo-implant">{selo}</span>' if selo else ''
    b = ('<span class="eg-link">Mudar na ficha</span>' if selo else f'<span class="eg-btn">{ico("lapis", "ico ico-s")}Mudar na ficha</span>')
    return (f'<div class="pr-rep"><span class="pe-ci" aria-hidden="true">{ico("pessoas")}</span><div><b>{nome}</b><small>{linha}</small></div>'
            f'{s}{b}</div>')


def doc_mini(sub):
    return (f'<div class="eg-doc"><span class="eg-cx" aria-hidden="true">{ico("check", "ico ico-s")}</span><div><b style="font-weight:500">Contrato de honorários</b>'
            f'<small>{sub}</small></div></div>')


def decisao(cod, titulo, texto, hoje, proposta, rec):
    return (f'<section class="eg-decisao" aria-labelledby="t-{cod}"><p class="sobretitulo">Decisão {cod} · para a Carol · não é tela do sistema</p>'
            f'<h2 id="t-{cod}">{titulo}</h2><p>{texto}</p>'
            f'<div class="eg-lado"><figure><figcaption>Hoje no sistema</figcaption>{hoje}</figure>'
            f'<figure class="eg-proposta"><figcaption>Com a {cod} (desenho D25)</figcaption>{proposta}</figure></div>'
            f'<p class="eg-rec">{ico("check")}<span><b>Recomendação:</b> {rec}</span></p></section>')


def com_decisao(pagina_html, bloco):
    return pagina_html.replace('<div class="pr-gerar">', bloco + '<div class="pr-gerar">', 1)


D1 = decisao('D1', 'Quadro do assistido com os dois nomes',
             'No assistido, os dois assinam. Hoje o quadro mostra só o pai, com o selo “Assiste”. O desenho mostra os dois nomes e diz, numa frase, quem assina e como. '
             '<b>A página abaixo já está como no desenho.</b>',
             rep_mini('Marcos Ferreira Moura', f'Pai · CPF {CPF_MARCOS}', 'Assiste'),
             rep_mini('<mark class="eg-dif">Lucas e Marcos Ferreira Moura</mark>', f'<mark class="eg-dif">Lucas assina, assistido pelo pai, Marcos</mark> · CPF {CPF_MARCOS} · da ficha do cliente'),
             'sim. Custo baixo e cabe neste item (F3.160), se a Carol quiser; não depende da volta.')
D2 = decisao('D2', '“· da ficha do cliente” no fim da linha do quadro',
             'Diz de onde vem o dado, como no quadro de quem assina pela empresa, aprovado em Procurações. Vale para o representado, o assistido e a curatela. '
             '<b>A página abaixo já está como no desenho.</b>',
             rep_mini('Joana Alves Souza', f'Mãe · CPF {CPF_JOANA}', 'Representa'),
             rep_mini('Joana Alves Souza', f'Mãe · CPF {CPF_JOANA} <mark class="eg-dif">· da ficha do cliente</mark>'),
             'sim. Custo mínimo e cabe neste item.')
D3 = decisao('D3', 'A linha do contrato em “Documentos” diz quem contrata',
             'Hoje a linha do contrato é a mesma para todo cliente. O desenho diz quem é o contratante e quem o representa ou assiste. Depende da pergunta 8 do D25 '
             '(o contratante é o menor, representado, e não a mãe em nome próprio), que ainda espera a advogada parceira. <b>A página abaixo já está como no desenho.</b>',
             doc_mini('As condições de honorário, o objeto e os casos do contrato. Modelo do escritório, v2.'),
             doc_mini('<mark class="eg-dif">Contratante: Pedro, representado por Joana.</mark> Com o objeto, as 2 condições de honorário e as cláusulas do escritório.'),
             'sim, com “representado(a)” e o primeiro nome, mas num item novo (hoje seria o F3.166), para não segurar o F3.160 até a resposta da pergunta 8.')


# ---------------------------------------------------------------- estados
T = ''
ESTADOS = []


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    ESTADOS.append((est, rotulo))


FPg = dict(atual='clientes', trilha='Clientes|Pedro Henrique Alves Souza', titulo='Editar ficha de Pedro · vindo de Gerar documentos', aba='ficha')
FPl = dict(atual='clientes', trilha='Clientes|Pedro Henrique Alves Souza', titulo='Pedro Henrique Alves Souza', aba='ficha')
GEd = dict(area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Gerar documentos', titulo='Gerar documentos')
FR = dict(atual='clientes', trilha='Clientes|Rafaela Nunes Torres', titulo='Rafaela Nunes Torres', aba='ficha')

add('editar-de-gerar', editar_pedro_g('abrir'), 'Editar vindo de Gerar: ao abrir, foco no CPF de Joana (D9)', **FPg)
add('editar-de-gerar-mudou', editar_pedro_g('mudou'), 'Editar vindo de Gerar: depois de escrever, “Mudou” (D10)', **FPg)
add('editar-de-gerar-salvando', editar_pedro_g('salvando'), 'Editar vindo de Gerar: salvando', **FPg)
add('editar-de-gerar-erros', editar_pedro_g('erros'), 'Editar vindo de Gerar: CPF que não confere', **FPg)
add('editar-de-gerar-conflito', editar_pedro_g('conflito'), 'Editar vindo de Gerar: outra pessoa salvou antes', **FPg)
add('editar-de-gerar-pj', editar_far(), 'Editar vindo de Gerar: empresa (quem assina pela empresa)',
    atual='clientes', trilha='Clientes|Farmácia Bom Jesus Ltda.', titulo='Editar ficha de Farmácia Bom Jesus Ltda. · vindo de Gerar documentos', aba='ficha')
add('ficha-salva-termo-recusado', ficha_seb_termo_recusado() + j_registrar() + j_inativar(), 'Ficha salva, termo recusado: a volta fica na tela',
    atual='clientes', trilha='Clientes|Sebastião Ramos Filho', titulo='Sebastião Ramos Filho', aba='ficha')
add('ficha-inativa-de-gerar', ficha_pedro_inativa(), 'Ficha inativa vinda de Gerar: leitura e a volta', **FPl)
add('ficha-nao-encontrada-de-gerar', nao_encontrada(), 'Cliente não encontrado, vindo de Gerar',
    atual='clientes', trilha='Clientes|Não encontrado', titulo='Cliente não encontrado')
add('fez-18-janela-de-gerar', ficha_rafa_janela_g(), 'Fez 18: a janela aberta por Gerar (D6)', **FR)
add('fez-18-ja-resolvido', ficha_rafa_resolvida(), 'Fez 18 já resolvido: sem janela, com a volta', **FR)
add('gerar-voltou-salvo', gerar_voltou_salvo(), 'Gerar ao voltar: ficha salva, nada faltando', **GEd)
add('gerar-voltou-ainda-falta', gerar_voltou_falta(), 'Gerar ao voltar: salva, ainda falta o RG', **GEd)
add('gerar-voltou-cancelou', gerar_voltou_cancelou(), 'Gerar ao voltar: depois de Cancelar', **GEd)
add('gerar-voltou-ficou-com-a-salva', gerar_voltou_ficou(), 'Gerar ao voltar: ficou com a versão salva', **GEd)
add('gerar-voltou-pj', gerar_voltou_pj(), 'Gerar ao voltar: empresa, com o nome inteiro', **GEd)
add('gerar-fez-18-agora-nao', gerar_fez18_agora_nao(), 'Gerar ao voltar: fez 18, depois de “Agora não”', **GEd)
add('gerados-completar', gerados_pedro(), 'Documentos gerados: “Completar na ficha” na mesma aba',
    area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Documentos gerados', titulo='Documentos gerados')
add('gerar-de-novo-voltou', gerar_de_novo_voltou(), 'Gerar de novo ao voltar: o aviso reescrito',
    area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Gerar de novo', titulo='Gerar de novo')
add('decisao-d1', com_decisao(gerar_assistido(), D1), 'Decisão D1: quadro do assistido com os dois nomes', **GEd)
add('decisao-d2', com_decisao(gerar_representado(), D2), 'Decisão D2: “· da ficha do cliente”', **GEd)
add('decisao-d3', com_decisao(gerar_representado(), D3), 'Decisão D3: “Contratante: Pedro, representado por Joana”', **GEd)

GRUPOS = [('A ficha, vindo de Gerar', ['editar-de-gerar', 'editar-de-gerar-mudou', 'editar-de-gerar-salvando', 'editar-de-gerar-erros', 'editar-de-gerar-conflito',
                                        'editar-de-gerar-pj', 'ficha-salva-termo-recusado', 'ficha-inativa-de-gerar', 'ficha-nao-encontrada-de-gerar']),
          ('Fez 18, vindo de Gerar', ['fez-18-janela-de-gerar', 'fez-18-ja-resolvido']),
          ('Gerar documentos, ao voltar', ['gerar-voltou-salvo', 'gerar-voltou-ainda-falta', 'gerar-voltou-cancelou', 'gerar-voltou-ficou-com-a-salva', 'gerar-voltou-pj',
                                           'gerar-fez-18-agora-nao', 'gerados-completar', 'gerar-de-novo-voltou']),
          ('Decisões (diferenças da nota do item)', ['decisao-d1', 'decisao-d2', 'decisao-d3'])]
ROT = dict(ESTADOS)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT)
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

URL = {'Contratos': '#', 'Honorários': '#', 'Procurações e modelos': '#'}
out = pagina('Editar vindo de Gerar documentos', 'F3.160: editar a ficha vindo de Gerar documentos e voltar para lá, com as escolhas.',
             '{"estado":"editar-de-gerar","atual":"clientes"}', '', T, P['barras']('contratos', URL))
CSS_P = P['CSS_FICHA'] + P['CSS_HN'] + P['CSS'] + P['CSS_PE'] + P['CSS_PR']
out = out.replace('</style>', CSS_P + '\n' + CSS_CL + '\n' + CSS_FL + '\n' + CSS_RL + '\n' + CSS_EG + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace('</body>', P['SCRIPT_ABAS'] + '\n' + SCRIPT_RL + '\n' + SCRIPT_EG + '\n</body>', 1)
open(os.path.join(SAIDA, 'telas.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'telas.html?estado={e}', 'rotulo': r} for e, r in ESTADOS],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('editar-vindo-de-gerar ok', len(ESTADOS), 'estados,', len(out) // 1024, 'KB')
