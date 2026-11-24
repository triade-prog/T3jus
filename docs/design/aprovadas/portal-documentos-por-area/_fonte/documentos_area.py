# Portal · CH-14: documentos marcados conforme a área (D35 do painel).
# Parte de desenhos aprovados, sem mudá-los, e do desenho em andamento do F3.160:
#   - editar_gerar.py (F3.160), lido até o começo dos estados. Ele já lê o D25 (responsavel.py), que lê a ficha ligada,
#     Clientes e Procurações e modelos (Gerar, Gerar de novo, Modelos de documento);
#   - prazo.py (portal-prazo-comprovante, a versão aprovada mais nova de Jurídico › Documentos para começar, EX-18),
#     lido num espaço à parte até o reflexo na ficha.
# Peças novas com o prefixo da-. Uso: python3 documentos_area.py <pasta-saida>  (escreve telas.html e casos.json)
import os, sys, re, json

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_ARGV = list(sys.argv)
_M = '\n# ---------------------------------------------------------------- estados\n'
_eg = open(os.path.join(AQUI, 'editar_gerar.py'), encoding='utf-8').read()
exec(compile(_eg[:_eg.index(_M)], 'editar_gerar.py', 'exec'), globals())
sys.argv = list(_ARGV)
SAIDA = _ARGV[1] if len(_ARGV) > 1 else 'saida'
U = '?estado='

# Documentos para começar (EX-18), num espaço à parte
_pz = open(os.path.join(AQUI, 'prazo.py'), encoding='utf-8').read()
E = {'__name__': 'prazo_base', '__file__': os.path.join(AQUI, 'prazo.py')}
sys.argv = [_ARGV[0], os.path.join(AQUI, '_lixo')]
exec(compile(_pz[:_pz.index('# ---------------------------------------------------------------- reflexo na ficha')], 'prazo.py', 'exec'), E)
sys.argv = list(_ARGV)

F3160 = '../../editar-vindo-de-gerar/desenho/telas.html?estado='   # o desenho do F3.160, ao lado desta pasta

# ---------------------------------------------------------------- dados fictícios (hoje é 22/11/2026, como no D25 e no F3.160)
AREAS8 = ['Previdenciário', 'Trabalhista', 'Cível', 'Consumidor', 'Família', 'Saúde', 'Tributário', 'Outra ou sem área']
SUG_T3 = 'cpd'   # a sugestão do T3jus, igual à de hoje, nas 8 áreas (revisão, ajuste 3)
DOC = {  # chave: (nome em Gerar, texto em Gerar, nome curto nas listas, origem do modelo)
    'c': ('Contrato de honorários', 'Com o objeto, as condições de honorário e as cláusulas do escritório. Modelo do escritório, v2.', 'contrato de honorários', 'Do escritório, v2'),
    'p': ('Procuração', 'Ad judicia et extra, para os advogados marcados abaixo. Padrão T3jus.', 'procuração', 'Padrão do T3jus'),
    'd': ('Declaração de hipossuficiência', 'Para pedir a justiça gratuita: o cliente declara que não pode pagar as custas sem prejuízo do sustento. Padrão T3jus.',
          'declaração de hipossuficiência', 'Padrão do T3jus · para empresa, sai a versão de pessoa jurídica'),
    'r': ('Declaração de residência', 'Para provar o endereço quando a conta não está no nome do cliente. Modelo do escritório.', 'declaração de residência',
          'Outro documento do escritório'),
    'i': ('Requerimento ao INSS', 'O pedido administrativo do benefício, com os dados do cliente. Modelo do escritório.', 'requerimento ao INSS',
          'Outro documento do escritório · enviado hoje'),
}
ORDEM = 'cpdri'


def lista_txt(chaves, curto=True):
    ns = [DOC[k][2 if curto else 0] for k in ORDEM if k in chaves]
    if not ns:
        return ''
    t = ns[0] if len(ns) == 1 else ', '.join(ns[:-1]) + ' e ' + ns[-1]
    return t[0].upper() + t[1:]


# A configuração do escritório (o que está salvo hoje, antes de Marina mudar Previdenciário às 15h20)
CONF = {a: (SUG_T3, None) for a in AREAS8}
CONF['Previdenciário'] = ('cpdr', 'Mudada por Marina Ribeiro em 10/11/2026')
CONF['Trabalhista'] = ('cpdr', 'Mudada por Marina Ribeiro em 10/11/2026')
CONF['Outra ou sem área'] = ('', 'Mudada por Felipe Matos em 10/11/2026')
CONF_SALVA = dict(CONF)
CONF_SALVA['Previdenciário'] = ('cpdri', 'Mudada por Marina Ribeiro hoje, às 15h20')
CONF_ZERO = {a: (SUG_T3, None) for a in AREAS8}

# ---------------------------------------------------------------- CSS novo (prefixo da-)
CSS_DA = r"""
/* ==========================================================================
   CH-14 · documentos marcados conforme a área (prefixo da-). Só tokens e pares aprovados.
   ========================================================================== */
/* Gerar documentos: o seletor da área, o "sugerido" e as linhas de sugestão */
.da-sug{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 2px}
.da-sug label{font-weight:500;font-size:14px}
.da-sug select.entrada{width:auto;min-width:230px;max-width:100%;height:44px}
.da-de{margin:0;font-size:13px;color:var(--texto-2);flex:1 1 220px;min-width:0}
.da-aj{margin:2px 0 6px;font-size:13px;color:var(--texto-2);line-height:1.5}
.da-tag{display:inline-flex;align-items:center;height:20px;padding:0 8px;margin-left:8px;border-radius:10px;background:var(--sal-2);color:var(--vinho);
  font-size:11px;font-weight:600;letter-spacing:.02em;vertical-align:1px;white-space:nowrap}
.da-linha{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:2px 0 4px;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);
  color:var(--tinta);font-size:13px;line-height:1.5}
.da-linha p{margin:0;flex:1 1 260px;min-width:0}
.da-linha b{font-weight:600}
.da-linha .btn{flex:none}
.da-status{display:flex;gap:10px;align-items:flex-start;margin:2px 0 4px;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2);color:var(--tinta);font-size:13px;line-height:1.5}
.da-status .ico{flex:none;color:var(--vinho);margin-top:2px}
.da-status p{margin:0}
.da-pe-area{display:flex;gap:8px;align-items:flex-start;margin-top:6px;color:var(--tinta)}
.da-pe-area .ico{flex:none;color:var(--vinho);margin-top:2px}
/* Modelos de documento: a folha "Documentos por área" */
.da-folha .sub a{color:var(--vinho);font-weight:500}
.da-lista{list-style:none;margin:0;padding:0 24px 8px}
.da-lista>li{display:grid;grid-template-columns:210px minmax(0,1fr) auto;gap:6px 20px;align-items:center;padding:14px 0;border-top:1px solid var(--divisor)}
.da-lista>li:first-child{border-top:0;padding-top:4px}
.da-nome strong{display:block;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);line-height:1.25}
.da-nome .selo{margin-top:6px}
.da-docs p{margin:0;font-size:14px;line-height:1.5}
.da-docs small{display:block;margin-top:2px;font-size:12.5px;color:var(--texto-2)}
.da-docs .da-nenhum{color:var(--texto-2)}
.da-lista>li.da-aberta{grid-template-columns:minmax(0,1fr);padding:16px 0}
.da-edit{display:grid;gap:14px;padding:18px 18px 16px;border:1.5px solid var(--vinho-4);border-radius:var(--raio);background:var(--papel)}
.da-edit-cab{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}
.da-edit-cab h3{margin:0;font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)}
.da-edit-cab p{margin:0;font-size:13px;color:var(--texto-2)}
.da-edit fieldset{border:0;margin:0;padding:0;min-width:0}
.da-ops{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}
.da-edit legend{font-weight:500;margin:0 0 8px;padding:0}
.da-edit .opcao{margin:0}
.da-edit .aviso{margin:0}
.da-edit-pe{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding-top:12px;border-top:1px solid var(--divisor)}
.da-edit-pe .da-volta{margin-right:auto}
.da-edit-pe .da-pe-status{font-size:12.5px;color:var(--texto-2);margin-right:auto}
.da-folha .hn-pe{margin:0 24px 18px}
.da-folha>.aviso,.da-folha>.da-topo{margin:0 24px 16px}
.da-quem{display:flex;gap:10px;align-items:flex-start;margin:0 24px 16px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.da-quem .ico{flex:none;color:var(--vinho);margin-top:2px}
.da-quem p{margin:0}
.da-folha .estado{margin:0 24px 20px}
.pr-mods .pr-mod .pe-bts{flex-wrap:wrap}
/* Prévia: modelo do escritório */
.da-papel-nota{font-size:12px}
@media (max-width:760px){
  .da-sug{flex-direction:column;align-items:stretch}
  .da-sug select.entrada{width:100%;min-width:0}
  .da-de{flex:none}
  .da-linha .btn{width:100%;justify-content:center}
  .da-lista{padding:0 16px 8px}
  .da-lista>li{grid-template-columns:minmax(0,1fr);gap:8px}
  .da-lista>li .da-ac .btn{width:100%;justify-content:center;min-height:44px}
  .da-edit{padding:14px}
  .da-ops{grid-template-columns:minmax(0,1fr)}
  .da-edit-pe{flex-direction:column;align-items:stretch}
  .da-edit-pe .btn{width:100%;justify-content:center;min-height:44px;white-space:normal;height:auto}
  .da-edit-pe .da-volta,.da-edit-pe .da-pe-status{margin-right:0}
  .da-folha .hn-pe,.da-folha>.aviso,.da-folha>.da-topo,.da-quem,.da-folha .estado{margin-left:16px;margin-right:16px}
  .da-edit .aviso .aviso-acoes .btn{white-space:normal;text-align:center;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;width:100%;justify-content:center}
  .da-edit .comparar{width:100%;table-layout:fixed}
  .da-edit .comparar th,.da-edit .comparar td{overflow-wrap:anywhere;white-space:normal;padding-left:6px;padding-right:6px}
}
"""

# ---------------------------------------------------------------- Gerar documentos: o grupo "Documentos" com a sugestão da área
TAG = '<span class="da-tag">sugerido</span>'


def docs_fs_da(area, de, marc, sug, aj=None, linha='', subs=None, extra_decl='', modelos=ORDEM, foco_sel=False):
    """area: a área no seletor; de: de onde ela veio; marc: as caixas marcadas; sug: as que a área sugere (ganham "sugerido")."""
    subs = subs or {}
    ops_area = ''.join(f'<option{" selected" if a == area else ""}>{a}</option>' for a in AREAS8)
    f = ' data-foco-agora' if foco_sel else ''
    if aj is None:
        aj = (f'Vêm marcados os documentos que o escritório escolheu para {area}. Mude o que precisar antes de gerar; vale só para estes documentos.'
              if area != 'Outra ou sem área' else 'Vêm marcados os documentos que o escritório escolheu para contrato sem área. Mude o que precisar antes de gerar.')
    sel = (f'<div class="da-sug"><label for="gd-area">Sugestão para</label>'
           f'<select class="entrada" id="gd-area" name="gd-area" aria-describedby="gd-area-de"{f}>{ops_area}</select>'
           f'<p class="da-de" id="gd-area-de">{de}</p></div><p class="da-aj">{aj}</p>')
    ops = ''
    for k in modelos:
        nome, sub, _, _ = DOC[k]
        sub = subs.get(k, sub)
        rot = nome + (TAG if k in sug else '')
        ops += P['op']('gd-doc', rot, sub, k in marc, id_=f'gd-doc-{k}')
        if k == 'd' and extra_decl:
            ops += f'<div class="pr-dentro">{extra_decl}</div>'
    return f'<fieldset class="pe-fs c6" id="gd-docs"><legend>Documentos</legend>{sel}{linha}{ops}</fieldset>'


def linha_sug(txt, botao, sr=''):
    return f'<div class="da-linha"><p>{txt}</p><button class="btn btn-sec btn-compacto" type="button">{ico("check", "ico ico-s")}{botao}<span class="sr">{sr}</span></button></div>'


def status_da(txt):
    return f'<div class="da-status" role="status">{ico("ajuda")}<p>{txt}</p></div>'


def papel_residencia(qual, end, assina):
    return (f'<div class="pe-papel">{P["timbre"]()}<h3>DECLARAÇÃO DE RESIDÊNCIA</h3>'
            f'<p>{qual}, declara, sob as penas da lei, que reside no endereço acima, <{C}>{end}</mark>, e que as contas da casa não estão no seu nome.</p>'
            f'<p><{F}>{P["CIDADE_DATA"]}</mark>.</p><p class="pe-ass">{assina}</p>'
            f'<p class="pe-mais">{ico("doc")}<span>Modelo do escritório. Este é o documento inteiro.</span></p></div>')


def papel_requerimento(qual):
    return (f'<div class="pe-papel">{P["timbre"]()}<h3>REQUERIMENTO ADMINISTRATIVO</h3><p style="text-align:center;margin-top:-8px">Ao Instituto Nacional do Seguro Social</p>'
            f'<p>{qual}, por seus advogados, requer a <{C}>aposentadoria por idade</mark>, com os documentos em anexo.</p>'
            f'<p class="pe-mais">{ico("doc")}<span>Continua com os períodos de contribuição e o pedido, como no modelo do escritório.</span></p></div>')


def pe_docs(marc, sub, botao=None, extra=''):
    n = len(marc)
    if not n:
        return P['pe_gerar']('<b>Nada marcado para gerar.</b>', 'Marque ao menos um documento.' + extra, 'Gerar documentos')
    nomes = [DOC[k][2] for k in ORDEM if k in marc]
    nomes[0] = nomes[0].replace('contrato de honorários', 'contrato').replace('declaração de hipossuficiência', 'declaração')
    nomes = [x.replace('contrato de honorários', 'contrato').replace('declaração de hipossuficiência', 'declaração') for x in nomes]
    t = nomes[0] if n == 1 else ', '.join(nomes[:-1]) + ' e ' + nomes[-1]
    arq = 'Vai sair 1 arquivo .docx' if n == 1 else f'Vão sair {n} arquivos .docx'
    return P['pe_gerar'](f'<b>{arq}</b>: {t}.', sub + extra, botao or f'Gerar {n} documento{"s" if n > 1 else ""}')


def pe_area(area, num):
    return (f'<span class="da-pe-area">{ico("balanca", "ico ico-s")}<span><b>A área {area} fica no contrato {num}.</b> '
            f'O caso que abrir na assinatura já nasce em {area}.</span></span>')


# ---------------------------------------------------------------- Benedito (Previdenciário, a área do contrato)
def paineis_ben_da(rg, marc):
    nf = 0 if rg else 1
    base = P['paineis_ben'](rg, marc)
    out = [(k, r, (nf if k in marc else None), h) for k, r, _, h in base]
    ass_b = f'<{C}>BENEDITO SOUZA LIMA</mark>'
    if 'r' in marc:
        out.append(('r', 'Residência', nf, papel_residencia(P['qual_ben'](rg), P['END_BEN'], ass_b)))
    if 'i' in marc:
        out.append(('i', 'Requerimento', nf, papel_requerimento(P['qual_ben'](rg))))
    return out


def gerar_ben(novo=False, decisao_bloco=''):
    if not novo:
        marc = 'cpdr'
        topo = ''
        card = P['contrato_card']('BL', 'Benedito Souza Lima', 'C-2026-033 · Aposentadoria por idade · em elaboração',
                                  'Veio da ficha do contrato. As condições, os advogados e as inscrições já estão lá.')
        av = '<div class="c6">' + aviso('atencao', 'Falta 1 dado de Benedito: o RG.',
                                        'Dá para gerar assim: os documentos saem com [RG: falta], para preencher à mão ou no Word. Ou complete a ficha antes.',
                                        icone='pena', acoes=f'<a class="btn btn-sec" href="{P["FICHA_CL"]}">{ico("lapis")}Completar na ficha</a>') + '</div>'
        fs = docs_fs_da('Previdenciário', 'a área do contrato C-2026-033', marc, 'cpdr')
        pe = pe_docs(marc, '1 dado sai marcado em cada um: o RG de Benedito. Cada geração fica registrada, com quem gerou e quando.', extra='')
        rg = False
        aba = 'r'
    else:
        marc = 'cpdr'
        topo = '<div class="c6">' + aviso('info', 'Estes documentos já foram gerados hoje, às 15h10 (versão 1).',
                                          'Desde então, mudou na ficha de Benedito: o RG, completado por Diego Almeida às 15h52. Gerar de novo cria a versão 2 dos documentos marcados. '
                                          'A versão 1 fica guardada e continua para baixar. Nenhum assinado foi anexado ainda.', icone='historico') + '</div>'
        card = P['contrato_card']('BL', 'Benedito Souza Lima', 'C-2026-033 · Aposentadoria por idade · em elaboração', 'Vieram marcadas as mesmas escolhas da versão 1.')
        av = ''
        linha = linha_sug('<b>Previdenciário também tem: requerimento ao INSS.</b> Entrou na lista do escritório hoje, às 15h20, depois da versão 1.',
                          'Marcar', ' o requerimento ao INSS')
        fs = docs_fs_da('Previdenciário', 'a área do contrato C-2026-033', marc, 'cpdri',
                        aj='Vieram as escolhas da versão 1, e não a lista da área. Mude o que precisar antes de gerar.', linha=linha)
        pe = pe_docs(marc, 'Nenhum dado faltando. A versão 1, com [RG: falta], fica guardada.', botao='Gerar a versão 2')
        pe = pe.replace('<b>Vão sair 4 arquivos .docx</b>:', '<b>Vão sair 4 arquivos .docx, versão 2</b>:')
        rg = True
        aba = 'p'
    r = (topo + card + av + fs + P['outorgados_fs'](P['ADV_BEN']) + P['poderes_fs'](P['POD_BEN'], P['OUTRO_BEN']) + P['data_campo']())
    h = P['pagina_gerar'](r, P['previa'](paineis_ben_da(rg, marc), aba), pe)
    if novo:
        h = h.replace('<h1>Gerar documentos</h1>', '<h1>Gerar de novo</h1>', 1)
    if decisao_bloco:
        h = com_decisao(h, decisao_bloco)
    return h


# ---------------------------------------------------------------- Farmácia Bom Jesus (empresa; a área do caso; o contrato já assinado)
def gerar_far():
    h = P['gerar_pj']()
    av_pj = re.search(r'<div class="pr-dentro">(.*?)</div></fieldset>', h, re.S).group(1)
    fs = docs_fs_da('Cível', 'a área do caso Farmácia Bom Jesus · Cobrança de duplicatas', 'pd', 'cpd',
                    subs={'c': 'Já assinado em 02/09/2026. Gere de novo só se o contrato mudou.',
                          'd': 'Para pedir a justiça gratuita. Versão para pessoa jurídica.'},
                    extra_decl=av_pj)
    h, k = re.subn(r'<fieldset class="pe-fs c6" id="gd-docs">.*?</fieldset>', lambda m: fs, h, count=1, flags=re.S)
    assert k == 1
    return h


# ---------------------------------------------------------------- Pedro (contrato em elaboração, sem área e sem caso)
def gerar_pedro_da(fs, marc, cpf_ok=False, rg_ok=False, topo='', meu=False, aba='c', area=None, pe_sub=None):
    nf = (0 if cpf_ok else 1) + (0 if rg_ok else 1)
    if nf == 2:
        q = quadro_g('Faltam o CPF e o RG dela')
        av = aviso('atencao', 'Faltam 2 dados de quem assina por Pedro: o CPF e o RG de Joana.',
                   'Dá para gerar assim: os documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. '
                   'Ou complete a ficha antes: ao salvar, você volta para cá.', icone='pena', acoes=completar_link('CPF e RG de Joana'))
    else:
        q = quadro_g()
        av = aviso('info', 'Pedro tem 12 anos hoje: ele é representado.',
                   'Só Joana assina, em nome dele, os documentos. Em 14/03/2030, aos 16 anos, ele passa a ser assistido, e os dois assinam. '
                   'O T3jus faz a conta pela data de nascimento, no dia de gerar.', icone='pessoas')
    adv = ADV_MEU if meu else ADV_PS
    pod = POD_MEU if meu else POD_PS
    outro = OUTRO_MEU if meu else ''
    r = (topo + P['contrato_card']('PS', 'Pedro Henrique Alves Souza', 'C-2026-034 · Alimentos · em elaboração')
         + q + '<div class="c6">' + av + '</div>' + fs
         + P['outorgados_fs'](adv) + P['poderes_fs'](pod, outro) + P['data_campo']())
    a = ASS_PEDRO if cpf_ok else ASS_PEDRO_F
    qual = qual_pedro_g(cpf_ok, rg_ok)
    nomes = [n for n, _, m, _ in adv if m]
    pain = [
        ('c', 'Contrato', nf if 'c' in marc else None, papel_contrato_min('C-2026-034', qual, a)),
        ('p', 'Procuração', nf if 'p' in marc else None, com_ass(P['papel_procuracao'](qual, nomes, pod, outro, assina=ASSX), a)),
        ('d', 'Declaração', nf if 'd' in marc else None, com_ass(P['papel_declaracao'](qual, assina=ASSX), a)),
    ]
    if not marc:
        prev = P['previa_vazia']()
    else:
        prev = P['previa'](pain, aba)
    if pe_sub is None:
        if nf:
            quais = 'o CPF e o RG de Joana' if nf == 2 else 'o RG de Joana'
            pe_sub = f'{nf} {"dados saem marcados" if nf > 1 else "dado sai marcado"} em cada um: {quais}. Cada geração fica registrada, com quem gerou e quando.'
        else:
            pe_sub = 'Nenhum dado faltando. Em todos, Joana assina por Pedro.'
    pe = pe_docs(marc, pe_sub, extra=pe_area(area, 'C-2026-034') if area else '')
    return P['pagina_gerar'](r, prev, pe)


SUB_CT_PEDRO = {'c': 'Contratante: Pedro, representado por Joana. Com o objeto, as 2 condições de honorário e as cláusulas do escritório.'}
DE_SEM = 'O contrato C-2026-034 ainda não tem área e não tem caso. A área que você escolher fica nele ao gerar.'


def gerar_pedro_sem_area(decisao_bloco=''):
    fs = docs_fs_da('Outra ou sem área', DE_SEM, '', '', subs=SUB_CT_PEDRO, foco_sel=False,
                    aj='Para contrato sem área, o escritório não marca nenhum documento. Escolha a área acima, ou marque os que vão sair.')
    h = gerar_pedro_da(fs, '')
    return com_decisao(h, decisao_bloco) if decisao_bloco else h


def gerar_pedro_trocou(mexida=False, decisao_bloco=''):
    if mexida:
        linha = linha_sug('<b>A sugestão de Família é: contrato de honorários, procuração e declaração de hipossuficiência.</b> '
                          'Você já tinha marcado à mão, então nada mudou sozinho.', 'Usar a sugestão', ' de Família')
        fs = docs_fs_da('Família', DE_SEM, 'p', 'cpd', subs=SUB_CT_PEDRO, linha=linha, foco_sel=True)
        h = gerar_pedro_da(fs, 'p', aba='p', area='Família')
    else:
        st = status_da('A sugestão mudou para Família: vêm marcados o contrato, a procuração e a declaração de hipossuficiência.')
        fs = docs_fs_da('Família', DE_SEM, 'cpd', 'cpd', subs=SUB_CT_PEDRO, linha=st, foco_sel=True)
        h = gerar_pedro_da(fs, 'cpd', area='Família')
    return com_decisao(h, decisao_bloco) if decisao_bloco else h


def gerar_pedro_voltou():
    fs = docs_fs_da('Família', 'Você escolheu. Fica no contrato C-2026-034 ao gerar.', 'cp', 'cpd', subs=SUB_CT_PEDRO)
    return gerar_pedro_da(fs, 'cp', cpf_ok=True, rg_ok=True, topo=salvo_aviso(), meu=True, aba='c', area='Família')


def gerado_pedro_area():
    h = gerados_pedro()
    area = aviso('info', 'A área Família ficou no contrato C-2026-034.',
                 'O caso que abrir quando o contrato assinado for anexado já nasce em Família. Para trocar, use Mudar na ficha do contrato.', icone='balanca')
    h = h.replace('<div class="pe-pronto">', '<div class="pe-pronto">' + area, 1)
    h = h.replace(f'<div><dt>Cidade e data</dt>', f'<div><dt>Área</dt><dd>Família, escolhida aqui · ficou no contrato</dd></div><div><dt>Cidade e data</dt>', 1)
    return h


# ---------------------------------------------------------------- Modelos de documento, com a folha "Documentos por área"
def mod_li(nome, meta, novo=False, arquivar=True):
    s = P['sel']('implant', 'Do escritório')
    n = ' <span class="selo selo-atencao">Novo</span>' if novo else ''
    bts = (f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> o modelo {nome.lower()}</span></button>'
           f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-modelo">{ico("trocar", "ico ico-s")}Trocar<span class="sr">: {nome.lower()}</span></button>')
    if arquivar:
        bts += f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-arquivar">{ico("x", "ico ico-s")}Arquivar<span class="sr"> {nome.lower()}</span></button>'
    return (f'<li class="pe-do-esc"><div class="pr-mod"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span>'
            f'<div><strong>{nome}{s}{n}</strong><small>{meta}</small></div><div class="pe-bts">{bts}</div></div></li>')


def linha_area(area, chaves, quem, pode=True):
    if quem:
        selo = P['sel']('implant', 'Do escritório')
        meta = quem
    else:
        selo = P['sel']('neutro', 'Sugestão do T3jus')
        meta = 'O escritório ainda não mudou.'
    docs = f'<p>{lista_txt(chaves)}</p>' if chaves else '<p class="da-nenhum">Nenhum documento. Nada vem marcado; quem gera escolhe.</p>'
    bt = (f'<div class="da-ac"><button class="btn btn-sec btn-compacto" type="button">{ico("lapis", "ico ico-s")}Mudar<span class="sr"> os documentos de {area}</span></button></div>'
          if pode else '<div class="da-ac"></div>')
    return f'<li><div class="da-nome"><strong>{area}</strong>{selo}</div><div class="da-docs">{docs}<small>{meta}</small></div>{bt}</li>'


def linha_edit(area, marc, modo='mudar'):
    """modo: mudar, salvando, conflito, erro."""
    dis = ' disabled' if modo == 'salvando' else ''
    ops = ''
    for i, k in enumerate(ORDEM):
        attr = dis + (' data-foco-agora' if (i == 0 and modo == 'mudar') else '')
        ops += P['op']('da-doc', DOC[k][0], DOC[k][3], k in marc, id_=f'da-doc-{k}', extra_attr=attr)
    topo = ''
    if modo == 'conflito':
        tab = ('<table class="comparar"><caption class="sr">Documento que mudou</caption><thead><tr><th scope="col">Documento</th><th scope="col">Salvo agora</th>'
               '<th scope="col">O que você marcou</th></tr></thead><tbody><tr><th scope="row">Declaração de residência</th><td>desmarcada</td><td>marcada</td></tr></tbody></table>')
        topo = aviso_foco('urgencia', 'Diego Almeida mudou Previdenciário às 15h18, enquanto você editava.',
                          'Nada do que você marcou se perdeu. Ele tirou a declaração de residência. Compare e escolha qual versão fica.',
                          acoes=tab + '<div class="aviso-acoes" style="width:100%"><button class="btn btn-pri" type="button">Salvar a minha versão</button>'
                          '<button class="btn btn-sec" type="button">Ficar com a versão salva</button></div>')
    elif modo == 'erro':
        topo = aviso_foco('urgencia', 'Previdenciário não foi salvo. Nada mudou.',
                          'O T3jus não respondeu a tempo. O que você marcou continua aqui: salve de novo em instantes.')
    if modo == 'salvando':
        pe = (f'<span class="da-pe-status" role="status">Salvando Previdenciário…</span>'
              f'<button class="btn btn-fantasma" type="button" disabled>Cancelar</button>'
              f'<button class="btn btn-pri" type="button" disabled>{ico("relogio")}Salvando…</button>')
    elif modo == 'conflito':
        pe = ''
    else:
        pe = (f'<button class="btn btn-fantasma da-volta" type="button">{ico("historico", "ico ico-s")}Voltar à sugestão do T3jus</button>'
              f'<button class="btn btn-fantasma" type="button">Cancelar</button>'
              f'<button class="btn btn-pri" type="button">{ico("check")}Salvar Previdenciário</button>')
    pe_html = f'<div class="da-edit-pe">{pe}</div>' if pe else ''
    return (f'<li class="da-aberta"><div class="da-edit" role="group" aria-labelledby="da-e-t">'
            f'<div class="da-edit-cab"><h3 id="da-e-t">{area}</h3><p>Mudada por Marina Ribeiro em 10/11/2026 · a sugestão do T3jus é contrato de honorários, procuração e declaração de hipossuficiência</p></div>'
            f'{topo}<fieldset><legend>O que vem marcado em Gerar documentos, nos contratos de {area.lower()}</legend><div class="da-ops">{ops}</div></fieldset>'
            f'<p class="ajuda" style="margin:0">Modelo do escritório enviado depois vem desmarcado, até alguém marcar aqui. Quem gera sempre pode mudar antes de gerar.</p>'
            f'{pe_html}</div></li>')


def folha_areas(conf, aberta=None, modo='mudar', marc_aberta='cpdri', topo='', pode=True, quem_txt='', erro_carregar=False):
    if erro_carregar:
        corpo = estado('Não deu para carregar os documentos por área.',
                       'Os modelos acima continuam valendo. Em Gerar documentos, quem gera continua podendo marcar o que quiser. Tente de novo em instantes.',
                       'alerta', erro=True, acoes=f'<button class="btn btn-sec" type="button">{ico("trocar")}Tentar de novo</button>')
    else:
        li = ''
        for a in AREAS8:
            if a == aberta:
                li += linha_edit(a, marc_aberta, modo)
            else:
                ch, q = conf[a]
                li += linha_area(a, ch, q, pode)
        corpo = f'<ul class="da-lista">{li}</ul>'
    quem = f'<div class="da-quem">{ico("cadeado")}<p>{quem_txt}</p></div>' if quem_txt else ''
    pe = (f'<p class="hn-pe">{ico("historico")}<span>Vale da próxima vez que alguém abrir Gerar documentos. Os documentos já gerados não mudam, e “Gerar de novo” '
          f'continua com as escolhas da última vez. Cada mudança fica no histórico do escritório, com quem mudou e quando.</span></p>')
    sub = ('O que vem marcado em Gerar documentos, conforme a área do contrato ou do caso. O que o cliente entrega para o processo começar fica em '
           '<a href="?estado=ex18-frase">Jurídico › Documentos para começar</a>.')
    return (f'<section class="folha da-folha" id="da" aria-labelledby="t-da" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-da">Documentos por área</h2>'
            f'<p class="sub">{sub}</p></div></div>{topo}{quem}{corpo}{pe}</section>')


def pagina_modelos_da(folha, topo_lista='', sem_envio=False, quem_lado=None):
    h = P['pagina_modelos']()
    h = h.replace('<h2 id="t-mo">Os três documentos</h2>', '<h2 id="t-mo">Os documentos</h2>', 1)
    h = h.replace('<p class="sub">1 do escritório e 2 padrão do T3jus</p>', '<p class="sub">O contrato do escritório, 2 padrão do T3jus e 2 outros documentos do escritório</p>', 1)
    outros = (mod_li('Declaração de residência', 'Outro documento · enviado por Marina Ribeiro em 10/11/2026 · 5 campos · usado 6 vezes')
              + mod_li('Requerimento ao INSS', 'Outro documento · enviado por Marina Ribeiro hoje, às 15h05 · 7 campos · ainda não usado'))
    h, k = re.subn(r'(<ul class="pr-mods">.*?)(</ul>)<div class="pr-outros">.*?</div>', lambda m: m.group(1) + outros + m.group(2)
                   + f'<div class="pr-outros">{ico("mais")}<span><b>Outros documentos do escritório.</b> Substabelecimento, declarações e requerimentos entram aqui, '
                     f'com os mesmos campos, e aparecem na hora de gerar.</span>'
                     f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-modelo">{ico("enviar", "ico ico-s")}Enviar outro modelo</button></div>',
                   h, count=1, flags=re.S)
    assert k == 1
    if topo_lista:
        h = h.replace('<ul class="pr-mods">', topo_lista + '<ul class="pr-mods">', 1)
    # a folha nova fica embaixo da lista dos modelos, na coluna principal
    h = h.replace('</section></div><aside class="hn-col" aria-label="Campos e permissões">', '</section>' + folha + '</div><aside class="hn-col" aria-label="Campos e permissões">', 1)
    assert 'id="t-da"' in h
    q = quem_lado or ('Quem tem a área Contratos envia e troca modelos e muda o que vem marcado em cada área. A versão anterior de um modelo fica guardada, e cada troca entra no histórico.')
    h = re.sub(r'(<h2 id="t-qm"[^>]*>Quem muda os modelos</h2>.*?<span>)(.*?)(</span></p>)', lambda m: m.group(1) + q + m.group(3), h, count=1, flags=re.S)
    if sem_envio:
        h = re.sub(r'<button class="btn btn-(?:pri|sec)(?: btn-compacto)?" type="button" data-janela="janela-modelo">.*?</button>', '', h, flags=re.S)
        h = re.sub(r'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-arquivar">.*?</button>', '', h, flags=re.S)
    return h


def j_arquivar():
    corpo = ('<div class="form-folha" style="padding:0">'
             + '<div class="c6">' + aviso('atencao', 'Ela também deixa de vir marcada em Previdenciário e Trabalhista.',
                                          'As outras escolhas dessas duas áreas continuam como estão. Nas outras áreas, ela já não vinha marcada.', icone='alerta') + '</div>'
             + campo('ar-motivo', 'Motivo', '', 'c6', foco=True, ajuda='Fica no histórico do escritório. Ex.: o escritório passou a usar outro texto.')
             + '</div>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-perigo" type="submit">{ico("x")}Arquivar o modelo</button>')
    return janela('janela-arquivar', 'Modelos de documento', 'Arquivar a declaração de residência?',
                  'Ela sai de Gerar documentos. Os documentos já gerados com ela continuam como estavam, para baixar.', corpo, pe, alerta=True, abrir=True)


# ---------------------------------------------------------------- Documentos para começar (EX-18): a frase do outro lado
def ex18():
    h = E['docs_pagina'](prazo=E['folha_prazo']('ver'))
    a = '<p class="lede">O que cada área pede ao cliente para o processo começar. Fica ao lado de Etapas do escritório.</p>'
    assert a in h
    return h.replace(a, '<p class="lede">O que cada área pede ao cliente para o processo começar. Fica ao lado de Etapas do escritório. '
                        'O que vem marcado em Gerar documentos fica em <a href="?estado=por-area-salva">Contratos › Modelos de documento › Documentos por área</a>.</p>', 1)


# ---------------------------------------------------------------- perguntas para a Carol, onde a resposta muda a tela
def decisao_p(num, titulo, texto, rec_rot, rec_html, alt_rot, alt_html, rec, embaixo):
    return (f'<section class="eg-decisao" aria-labelledby="t-p{num}"><p class="sobretitulo">Pergunta {num} · para a Carol · não é tela do sistema</p>'
            f'<h2 id="t-p{num}">{titulo}</h2><p>{texto} <b>{embaixo}</b></p>'
            f'<div class="eg-lado"><figure class="eg-proposta"><figcaption>{rec_rot}</figcaption>{rec_html}</figure>'
            f'<figure><figcaption>{alt_rot}</figcaption>{alt_html}</figure></div>'
            f'<p class="eg-rec">{ico("check")}<span><b>Recomendação:</b> {rec}</span></p></section>')


def mini_sel(valor, de):
    return (f'<div class="eg-doc" style="display:block"><p style="margin:0 0 6px;font-weight:500">Sugestão para</p>'
            f'<p style="margin:0;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--vinho-4);border-radius:var(--raio);'
            f'padding:10px 12px;background:var(--papel)"><span>{valor}</span>{ico("baixo", "ico ico-s")}</p><small>{de}</small></div>')


def mini_txt(t):
    return f'<div class="eg-doc" style="display:block"><p style="margin:0">{t}</p></div>'


P1 = decisao_p(1, '“Tipo de processo” é a área?',
               'O seletor mostra as 8 áreas que o contrato e o caso já guardam. Com subtipos, cada área se abriria em vários tipos, cadastrados pelo escritório, '
               'e o contrato e o caso ganhariam um campo novo.', 'Sim: a área (recomendado)',
               mini_sel('Previdenciário', 'a área do contrato C-2026-033 · 8 opções, as mesmas do caso'),
               'Não: subtipos dentro da área',
               mini_sel('Previdenciário › Aposentadoria por idade', 'o tipo do contrato · campo novo no contrato, no caso, na importação e em Documentos para começar'),
               'sim. Subtipos custam de 3 a 4 vezes mais e quase não mudam o que o escritório gera. Se os pilotos pedirem, entram depois.',
               'A página abaixo está como na recomendação.')
P2 = decisao_p(2, 'A área escolhida em Gerar fica gravada no contrato?',
               'Pedro: o contrato C-2026-034 ainda não tem área nem caso. Marina escolhe Família no seletor. Muda só a frase no pé, ao lado do botão de gerar, e a linha do resultado. '
               'No contrato já assinado, a área nunca é gravada: mudar contrato assinado pede motivo.',
               'Sim, só com o contrato em elaboração (recomendado)',
               mini_txt(f'{ico("balanca", "ico ico-s")} <b>A área Família fica no contrato C-2026-034.</b> O caso que abrir na assinatura já nasce em Família.'),
               'Não: vale só para marcar as caixas',
               mini_txt('<b>A área Família vale só para marcar as caixas agora.</b> O contrato continua sem área, e o caso que abrir na assinatura vem como “Outra”, para alguém corrigir.'),
               'sim, mas só com o contrato em elaboração. No contrato assinado (ativo ou encerrado), a escolha vale só para as caixas, e a frase do pé não aparece.',
               'A página abaixo está como na recomendação.')
P3 = decisao_p(3, 'Quem muda o que vem marcado em cada área?',
               'Diego Almeida é da equipe, com a área Contratos. Ele já envia e troca modelos. Muda o que ele vê em Documentos por área.',
               'Quem pode enviar modelos (recomendado)',
               mini_txt(f'Previdenciário · Contrato de honorários, procuração, declaração de hipossuficiência e declaração de residência '
                        f'<span class="eg-btn" style="margin-top:8px">{ico("lapis", "ico ico-s")}Mudar</span>'),
               'Só a sócia dona, como em Documentos para começar',
               mini_txt(f'Previdenciário · Contrato de honorários, procuração, declaração de hipossuficiência e declaração de residência<br>'
                        f'<small>Sem “Mudar”. No alto da folha: “Quem muda é Marina Ribeiro, a sócia dona.”</small>'),
               'quem já pode enviar modelos (sócias e equipe com a área Contratos). Marcar uma caixa não envia nada ao cliente, e quem envia o modelo é quem sabe para que ele serve.',
               'A página abaixo mostra a outra resposta: Diego vê a folha só para ler, mas continua enviando modelos.')
P4 = decisao_p(4, 'Até o escritório mudar, o que vem marcado?',
               'É o que aparece em cada área enquanto ninguém do escritório salvou uma lista para ela. Abaixo, a linha de Tributário, que era a exceção do plano.',
               'O mesmo de hoje, nas 8 áreas (recomendado)',
               mini_txt(f'<b>Tributário</b> <span class="selo selo-neutro">Sugestão do T3jus</span><br>Contrato de honorários, procuração e declaração de hipossuficiência'),
               'Outras saídas',
               mini_txt(f'<b>Tributário sem a declaração</b> <span class="selo selo-neutro">Sugestão do T3jus, em revisão</span><br>Contrato de honorários e procuração '
                        f'<small>Pede a revisão da advogada parceira.</small><br><br><b>Começar sem nada marcado</b>, como em Documentos para começar '
                        f'<small>A tela abriria vazia até alguém configurar: um passo atrás do que existe hoje.</small>'),
               'o mesmo de hoje em todas as áreas: contrato, procuração e declaração de hipossuficiência. Para empresa, a tela continua avisando da Súmula 481. '
               'Nada muda para quem não configurar, e não há o que a advogada parceira revisar.',
               'A página abaixo está como na recomendação: o primeiro uso, sem selo “em revisão”.')
P5 = decisao_p(5, 'Em “Gerar de novo”, avisar o que a área também tem?',
               'Gerar de novo sempre começa com as escolhas da última vez. A dúvida é quando avisar que a lista da área tem mais algum documento.',
               'Só o que o escritório pôs na lista depois da última geração (recomendado)',
               mini_txt('<b>Previdenciário também tem: requerimento ao INSS.</b> Entrou na lista do escritório hoje, às 15h20, depois da versão 1. '
                        f'<span class="eg-btn" style="margin-top:8px">{ico("check", "ico ico-s")}Marcar</span><br>'
                        '<small>Na Farmácia Bom Jesus, em que o escritório escolheu não gerar o contrato de novo, nada aparece.</small>'),
               'Outras saídas',
               mini_txt('<b>Sempre que faltar algo da lista</b><br><small>Na Farmácia, a cada nova geração: “Cível também tem: contrato de honorários”, para sempre.</small><br><br>'
                        '<b>Nunca avisar</b><br><small>Quem gera de novo não fica sabendo do requerimento ao INSS; precisa lembrar de marcar.</small>'),
               'só quando o escritório acabou de pôr o documento na lista da área. Assim o aviso não aparece em todo contrato em que o escritório escolheu não gerar algo.',
               'A página abaixo está como na recomendação.')


# ---------------------------------------------------------------- estados
T = ''
ESTADOS = []


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    ESTADOS.append((est, rotulo))


MOD = dict(area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Modelos de documento', titulo='Modelos de documento')
GEd = dict(area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Gerar documentos', titulo='Gerar documentos')
GNo = dict(area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Gerar de novo', titulo='Gerar de novo')

SALVO = aviso('sucesso', 'Previdenciário salvo.',
              'Da próxima vez que alguém abrir Gerar documentos num contrato de previdenciário, vêm marcados o contrato de honorários, a procuração, '
              'a declaração de hipossuficiência, a declaração de residência e o requerimento ao INSS.').replace('class="aviso ', 'class="aviso da-topo ', 1)
ENVIADO = ('<div style="margin:0 24px 12px">' + aviso_foco('sucesso', 'Requerimento ao INSS salvo.',
                                                           'Ele já aparece em Gerar documentos, desmarcado. Para vir marcado nos contratos de alguma área, mude em Documentos por área.',
                                                           acoes=f'<a class="btn btn-sec" href="#da">{ico("baixo")}Ir para Documentos por área</a>') + '</div>')
LEITURA = ('<div class="da-quem">' + ico('cadeado') + '<p><b>O Portal está só para consulta.</b> Dá para ver o que vem marcado em cada área, mas não para mudar. '
           'Quem pode enviar modelos volta a mudar quando o Portal voltar ao normal.</p></div>')

# Configuração (Modelos de documento › Documentos por área)
add('por-area-sugestao', pagina_modelos_da(folha_areas(CONF_ZERO)), 'Documentos por área: primeiro uso, a sugestão do T3jus nas 8 áreas', **MOD)
add('modelo-enviado-areas', pagina_modelos_da(folha_areas(CONF), topo_lista=ENVIADO), 'Outro documento enviado: o caminho até Documentos por área', **MOD)
add('por-area-mudar', pagina_modelos_da(folha_areas(CONF, aberta='Previdenciário')), 'Mudar Previdenciário: as caixas de todos os modelos', **MOD)
add('por-area-salvando', pagina_modelos_da(folha_areas(CONF, aberta='Previdenciário', modo='salvando')), 'Salvando Previdenciário', **MOD)
add('por-area-salva', pagina_modelos_da(folha_areas(CONF_SALVA, topo=SALVO)), 'Previdenciário salvo: a lista nova e quem mudou', **MOD)
add('por-area-conflito', pagina_modelos_da(folha_areas(CONF, aberta='Previdenciário', modo='conflito')), 'Outra pessoa salvou Previdenciário antes', **MOD)
add('por-area-erro', pagina_modelos_da(folha_areas(CONF, aberta='Previdenciário', modo='erro')), 'Erro ao salvar: nada mudou, as caixas continuam', **MOD)
add('por-area-erro-carregar', pagina_modelos_da(folha_areas(CONF, erro_carregar=True)), 'Erro ao carregar a folha', **MOD)
add('por-area-leitura', pagina_modelos_da(folha_areas(CONF_SALVA, pode=False, topo=LEITURA), sem_envio=True), 'Portal só para consulta: a folha para ler', **MOD)
add('arquivar-modelo-com-areas', pagina_modelos_da(folha_areas(CONF_SALVA)) + j_arquivar(), 'Arquivar um modelo que vem marcado em 2 áreas', **MOD)
# Gerar documentos
add('gerar-sugerido-contrato', gerar_ben(), 'Gerar: Previdenciário, a área do contrato, com o modelo do escritório marcado', **GEd)
add('gerar-sugerido-caso-pj', gerar_far(), 'Gerar: empresa, a área do caso; o contrato já assinado vem desmarcado', **GEd)
add('gerar-sem-area', gerar_pedro_sem_area(), 'Gerar: contrato sem área, e o escritório não marca nada sem área', **GEd)
add('gerar-trocou-area', gerar_pedro_trocou(), 'Gerar: escolheu Família sem ter mexido nas caixas, e a área vai ao contrato', **GEd)
add('gerar-trocou-area-mexida', gerar_pedro_trocou(mexida=True), 'Gerar: escolheu Família depois de mexer, e aparece “Usar a sugestão”', **GEd)
add('gerar-de-novo-tambem-tem', gerar_ben(novo=True), 'Gerar de novo: “Previdenciário também tem… Marcar”', **GNo)
add('gerado-area-gravada', gerado_pedro_area(), 'Documentos gerados: a área ficou no contrato',
    area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Documentos gerados', titulo='Documentos gerados')
add('gerar-voltou-da-ficha', gerar_pedro_voltou(), 'Gerar ao voltar da ficha (F3.160): a área e as caixas como estavam', **GEd)
# EX-18
add('ex18-frase', ex18(), 'Documentos para começar (EX-18): a frase que aponta para Documentos por área',
    area='juridico', secao='Casos e processos', atual='juridico', trilha='Jurídico|Casos e processos|Documentos para começar', titulo='Documentos para começar')
# Perguntas para a Carol
add('decisao-p1', gerar_ben(decisao_bloco=P1), 'Pergunta 1: tipo de processo = área', **GEd)
add('decisao-p2', gerar_pedro_trocou(decisao_bloco=P2), 'Pergunta 2: a área escolhida fica no contrato', **GEd)
P3_QUEM = 'Quem muda o que vem marcado em cada área é Marina Ribeiro, a sócia dona. Você vê e pode enviar modelos.'
add('decisao-p3', pagina_modelos_da(folha_areas(CONF_SALVA, pode=False, quem_txt=P3_QUEM),
                                    quem_lado='Quem tem a área Contratos envia e troca modelos. O que vem marcado em cada área, só a sócia dona muda.').replace(
    '<div class="hn">', '<div class="hn">' + P3, 1), 'Pergunta 3: quem muda (a outra resposta, vista por Diego)', quem='contratos-equipe', **MOD)
add('decisao-p4', pagina_modelos_da(folha_areas(CONF_ZERO)).replace('<div class="hn">', '<div class="hn">' + P4, 1), 'Pergunta 4: o que vem marcado até o escritório mudar', **MOD)
add('decisao-p5', gerar_ben(novo=True, decisao_bloco=P5), 'Pergunta 5: quando avisar em “Gerar de novo”', **GNo)

# Os links de ficha de Pedro levam ao desenho do F3.160, ao lado desta pasta
T = T.replace(f'href="{U}editar-de-gerar"', f'href="{F3160}editar-de-gerar"')

GRUPOS = [('Modelos de documento › Documentos por área', [e for e, _ in ESTADOS[:10]]),
          ('Gerar documentos', [e for e, _ in ESTADOS[10:18]]),
          ('Documentos para começar (EX-18)', ['ex18-frase']),
          ('Perguntas para a Carol', [e for e, _ in ESTADOS[19:]])]
ROT = dict(ESTADOS)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT)
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

URL = {'Contratos': '#', 'Honorários': '#', 'Procurações e modelos': '#'}
barras = P['barras']('contratos', URL) + ''.join(v for k, v in E['BARRAS'].items() if k.startswith('juridico|'))
if 'data-barra="juridico|Casos e processos"' not in barras:
    barras += f'<template data-barra="juridico|Casos e processos">{barra_area("juridico", "Casos e processos")}</template>'
out = pagina('Documentos por área', 'CH-14: o escritório escolhe, por área, os documentos que vêm marcados em Gerar documentos.',
             '{"estado":"por-area-sugestao","atual":"contratos"}', '', T, barras)
CSS_P = P['CSS_FICHA'] + P['CSS_HN'] + P['CSS'] + P['CSS_PE'] + P['CSS_PR']
out = out.replace('</style>', CSS_P + '\n' + CSS_CL + '\n' + CSS_FL + '\n' + CSS_RL + '\n' + CSS_EG + '\n' + E['J']['CSS_JU'] + '\n' + E['CSS_JF'] + '\n' + E['CSS_PC']
                  + '\n' + CSS_DA + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
# Diego Almeida, da equipe, com a área Contratos (pergunta 3)
_q = "'sem-area':{nome:'Paula Nunes'"
assert _q in out
out = out.replace(_q, "'contratos-equipe':{nome:'Diego Almeida',ini:'D',papel:'Área: Contratos',areas:['contratos'],dono:false},\n    " + _q, 1)
out = out.replace('</body>', P['SCRIPT_ABAS'] + '\n' + SCRIPT_RL + '\n' + SCRIPT_EG + '\n</body>', 1)
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'telas.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'telas.html?estado={e}', 'rotulo': r} for e, r in ESTADOS],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('documentos-por-area ok', len(ESTADOS), 'estados,', len(out) // 1024, 'KB')
