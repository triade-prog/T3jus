# Portal · Contratos › Procurações e modelos, 2ª rodada (CH-08, a validar; item F3.16 do painel).
# Parte da 1ª rodada aprovada (portal-comercial-contratos, decisões 17, 19, 24, 25 e 26) e do gerador
# de petições aprovado e programado (portal-peticoes): modelos .docx com campos entre colchetes,
# padrão T3jus x do escritório, versões, conferência na chegada, prévia com 3 marcas e [RG: falta].
# Base sem mudança: comum.py (Portal v1), pecas.py e contratos.py (Contratos aprovado) e o CSS pe-
# do peticoes.py aprovado, lido de lá. Peças novas com o prefixo pr-.
# Uso: python3 procuracoes.py <pasta-saida>
import sys, os, html

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_src = open(os.path.join(AQUI, 'contratos.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ---------------------------------------------------------------- estados')]
_ns = {'__name__': 'contratos_base', '__file__': os.path.join(AQUI, 'contratos.py')}
_argv = sys.argv[:]
exec(compile(_src, 'contratos.py', 'exec'), _ns)
sys.argv = _argv
globals().update({k: v for k, v in _ns.items() if not k.startswith('__')})

# Os links das peças de Contratos levam à 1ª rodada aprovada, na pasta vizinha.
U_CT = '../portal-comercial-contratos/contratos.html?estado='
_ns['U'] = U_CT
U = 'procuracoes.html?estado='
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape

# O CSS das petições aprovadas (prefixo pe-), sem mudança: prévia em papel, conferência, campos, advogados.
_pe = os.path.join(AQUI, 'peticoes_css.txt')
CSS_PE = open(_pe, encoding='utf-8').read()


def cpf(b):
    d = [int(x) for x in b]
    for n in (10, 11):
        s = sum(v * (n - i) for i, v in enumerate(d)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:3]}.{s[3:6]}.{s[6:9]}-{s[9:]}'


# ---------------------------------------------------------------- dados fictícios
HOJE = '21/11/2026'
CIDADE_DATA = 'São Paulo, 21 de novembro de 2026'
ESC = ('RIBEIRO &amp; MATOS ADVOCACIA', 'OAB/SP nº 31.874', '41.207.338/0001-05', 'Rua Tabapuã, 1.123, sala 42, Itaim Bibi, São Paulo, SP')
# Inscrições da OAB (as mesmas da Equipe · OAB e das petições): principal primeiro
OABS = {
    'Marina Ribeiro': [('OAB/SP nº 214.538', 'principal')],
    'Felipe Matos': [('OAB/SP nº 287.104', 'principal'), ('OAB/RJ nº 245.880-S', 'suplementar')],
    'Larissa Costa': [('OAB/SP nº 401.226', 'principal')],
}
SEM_OAB = 'Diego Almeida, Gustavo Lima e Paula Nunes'
CPF_REP = cpf('305118742')
CPF_PEDRO, CPF_JOANA = cpf('488213907'), cpf('377640215')
END_BEN = 'Rua Coronel Melo, 212, Jardim Japão, São Paulo, SP, CEP 02124-010'

PODERES = [
    ('Receber e dar quitação', 'Para levantar alvará e RPV.'),
    ('Firmar acordo (transigir)', ''),
    ('Substabelecer', 'Com ou sem reserva de poderes.'),
    ('Desistir da ação', ''),
    ('Renunciar ao direito', ''),
    ('Reconhecer a procedência do pedido', ''),
    ('Receber citação', ''),
    ('Confessar', ''),
    ('Firmar compromisso', ''),
    ('Assinar declaração de hipossuficiência', 'Em nome do cliente.'),
]

# Campos aceitos nos três modelos. Os nomes são os mesmos das petições quando o dado é o mesmo.
# (grupo, [(campo, o que entra)])
CAMPOS = [
    ('Cliente', [
        ('[CLIENTE_NOME]', 'Nome do cliente, em maiúsculas'),
        ('[CLIENTE_QUALIFICACAO]', 'Qualificação completa. Na empresa, CNPJ, sede e quem assina; no menor ou incapaz, também o representante'),
        ('[CLIENTE_CPF]  [CLIENTE_RG]  [CLIENTE_ENDERECO]', 'Um dado só, quando o modelo precisa separado'),
        ('[REPRESENTANTE_NOME]  [REPRESENTANTE_QUALIFICACAO]', 'Quem assina pela empresa, pelo menor ou pelo incapaz'),
        ('[CLIENTE_ASSINATURA]', 'O bloco de assinatura do cliente, com o representante quando houver'),
    ]),
    ('Contrato e honorários', [
        ('[CONTRATO_NUMERO]  [CONTRATO_OBJETO]', '“C-2026-033” e o objeto escrito no contrato'),
        ('[CONTRATO_CASOS]', 'Os casos ligados, com o número do processo quando houver'),
        ('[HONORARIOS_CONDICOES]', 'Cada condição de honorário numa alínea, com o valor em reais e por extenso'),
    ]),
    ('Advogados e poderes', [
        ('[ADVOGADOS_OAB]', 'Nome e inscrições: “MARINA RIBEIRO, OAB/SP nº 214.538, e …”'),
        ('[ADVOGADOS_ASSINATURA]', 'O bloco de assinatura, uma linha por advogado'),
        ('[PODERES_ESPECIAIS]', 'O trecho “e os poderes especiais para …”. Sem poder marcado, sai vazio'),
    ]),
    ('Escritório e data', [
        ('[ESCRITORIO_NOME]  [ESCRITORIO_ENDERECO]', 'De Escritório, no Portal'),
        ('[ESCRITORIO_CNPJ]  [ESCRITORIO_OAB]', 'CNPJ e registro da sociedade na OAB'),
        ('[CIDADE_DATA]', '“São Paulo, 21 de novembro de 2026”'),
    ]),
]

# ---------------------------------------------------------------- CSS (prefixo pr-)
CSS_PR = r"""
/* ==========================================================================
   Portal · Contratos › Procurações e modelos, 2ª rodada (prefixo pr-).
   Usa as peças hn- e ct- de Contratos e as pe- das petições, sem mudança.
   ========================================================================== */
.pr-hip{display:flex;gap:10px;align-items:flex-start;margin:0 0 4px;padding:10px 14px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);background:var(--papel);font-size:12px;color:var(--texto-2);line-height:1.5}
.pr-hip .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}
.pr-hip b{color:var(--texto);font-weight:500}
/* Página de gerar: formulário, prévia ao lado e o pé com o botão. No celular: formulário, prévia, botão. */
.pr-gerar{display:grid;grid-template-columns:minmax(0,1fr) 470px;grid-template-areas:"form prev" "pe prev";gap:24px;align-items:start}
.pr-gerar>.pr-a-form{grid-area:form;min-width:0}
.pr-gerar>.pr-a-prev{grid-area:prev;min-width:0;position:sticky;top:24px}
.pr-gerar>.pr-a-pe{grid-area:pe;min-width:0}
.pr-pe{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:18px 24px}
.pr-pe .pr-pe-txt{flex:1 1 280px;font-size:13px;line-height:1.5}
.pr-pe .pr-pe-txt b{font-weight:600}
.pr-pe .pr-pe-txt small{display:block;color:var(--texto-2);font-size:12px}
.pr-pe .pr-pe-bts{display:flex;gap:10px;flex-wrap:wrap}
/* Abas da prévia, uma por documento */
.pr-abas{display:flex;gap:4px;padding:0 24px;border-bottom:1px solid var(--divisor);overflow-x:auto}
.pr-abas [role=tab]{appearance:none;border:0;background:none;font:inherit;font-size:13px;font-weight:500;color:var(--texto-2);min-height:44px;padding:0 10px;border-bottom:3px solid transparent;margin-bottom:-1px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.pr-abas [role=tab][aria-selected=true]{color:var(--vinho);border-bottom-color:var(--vinho)}
.pr-abas [role=tab]:hover{color:var(--vinho)}
.pr-abas [role=tab]:focus-visible{outline:3px solid var(--foco);outline-offset:-3px;border-radius:6px}
.pr-abas .pr-q{font-size:11px;font-weight:600;background:var(--ambar-3);color:var(--tinta);border-radius:9px;padding:0 7px;line-height:18px}
.pr-abas .pr-q.pr-ok{background:var(--sal-2);color:var(--vinho)}
.pr-painel{padding-top:14px}
.pr-painel .pe-papel{padding:22px 22px 26px;font-size:13.5px;line-height:1.65}
.pr-painel .pe-papel h3{font-family:var(--serifa);font-size:17px;font-weight:700;text-align:center;letter-spacing:.1em;color:var(--vinho);margin-bottom:12px}
.pr-painel .pe-papel .pr-cl{font-weight:700}
.pr-painel .pe-papel ol{margin:6px 0 0;padding-left:20px}
.pr-painel .pe-papel ol li+li{margin-top:4px}
.pr-nada{padding:28px 24px 32px;text-align:center;font-size:13px;color:var(--texto-2)}
.pr-nada .ico{width:28px;height:28px;color:var(--vinho-4);display:block;margin:0 auto 8px}
/* Quem assina pelo cliente (empresa, menor) */
.pr-rep{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:#FCF8F5}
.pr-rep .pe-ci{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.pr-rep b{display:block;font-weight:500}
.pr-rep small{display:block;font-size:12px;color:var(--texto-2)}
.pr-dentro{margin:2px 0 6px 34px}
.pr-pod{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
.pr-pod .opcao{margin:0}
/* Lista de documentos */
.pr-tab tr.pr-falta td{background:#FFFBF8}
.pr-tab tr.pr-falta td:first-child{box-shadow:inset 3px 0 0 var(--ambar)}
.pr-tab .pr-acoes{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.pr-tab .pr-sit small{display:block;margin-top:4px}
.pr-tab td .selo{white-space:normal;height:auto;min-height:24px;padding-top:3px;padding-bottom:3px;line-height:1.3}
.pr-v{display:inline-flex;align-items:center;height:20px;padding:0 7px;margin-left:6px;border-radius:10px;background:var(--sal-2);color:var(--vinho);font-size:11px;font-weight:600;vertical-align:1px}
.pr-avisos{padding:0 24px 14px}
.pr-m{display:block;margin-top:6px}
.pr-tres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}
/* Modelos */
.pr-mods{list-style:none;margin:0;padding:0 24px 10px}
.pr-mods>li{padding:16px 0;border-top:1px solid var(--divisor)}
.pr-mods>li:first-child{border-top:0;padding-top:4px}
.pr-mod{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center}
.pr-mod .pe-ci{width:44px;height:44px;border-radius:var(--raio);display:grid;place-items:center;background:var(--sal-2);color:var(--vinho-2)}
.pr-mods li.pe-do-esc .pe-ci{background:var(--ambar-3);color:var(--vinho)}
.pr-mod strong{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-family:var(--serifa);font-size:19px;font-weight:500;color:var(--vinho);line-height:1.25}
.pr-mod strong .selo{font-family:var(--sans)}
.pr-mod small{display:block;font-size:12px;color:var(--texto-2)}
.pr-mod .pe-bts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.pr-vers{margin:10px 0 0 58px;font-size:13px}
.pr-vers summary{display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer;color:var(--vinho);font-weight:500}
.pr-vers ol{list-style:none;margin:0;padding:0 0 0 12px;border-left:2px solid var(--divisor);display:grid;gap:6px}
.pr-vers li{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--texto-2);font-size:12px}
.pr-vers li b{color:var(--texto);font-weight:500}
.pr-outros{margin:4px 24px 16px;padding:16px;border:1.5px dashed var(--borda-folha);border-radius:var(--raio);display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--texto-2);line-height:1.5}
.pr-outros>span{flex:1 1 300px}
.pr-outros b{color:var(--texto);font-weight:500}
/* Ficha do contrato · aba Documentos */
.pr-docs{list-style:none;margin:0;padding:0 24px 8px}
.pr-docs>li{padding:14px 0;border-top:1px solid var(--divisor)}
.pr-docs>li:first-child{border-top:0;padding-top:4px}
.pr-doc{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center}
.pr-doc .pe-ci{width:44px;height:44px;border-radius:var(--raio);display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.pr-doc b{display:block;font-weight:500}
.pr-doc small{display:block;font-size:12px;color:var(--texto-2);overflow-wrap:anywhere}
.pr-doc .selo{margin-top:6px}
.pr-doc .pe-bts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
/* Janela de anexar os assinados */
.pr-anx{display:grid;gap:12px}
.pr-anx fieldset{border:1px solid var(--borda-folha);border-radius:var(--raio-g);margin:0;padding:12px 14px 14px;min-width:0;display:grid;gap:10px;background:var(--papel)}
.pr-anx-l{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:10px 14px;align-items:start}
.pr-anx .pe-arq{grid-template-columns:44px minmax(0,1fr) auto}
.pr-anx fieldset.pr-ativa{border-color:var(--vinho);box-shadow:inset 3px 0 0 var(--vinho)}
.pr-anx fieldset.pr-erro{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}
.pr-anx legend{padding:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-family:var(--serifa);font-size:18px;font-weight:600;color:var(--vinho)}
.pr-anx legend small{font-family:var(--sans);font-size:12px;font-weight:400;color:var(--texto-2)}
.pr-anx .campo{margin:0;min-width:0}
.pr-anx .pr-ativa-txt{grid-column:1/-1;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.pr-anx .pr-ativa-txt .ico{color:var(--vinho);flex:none;margin-top:2px}
.pr-anx .pr-ativa-txt b{font-weight:600}
.pr-anx .pr-nao{grid-column:1/-1;font-size:12px;color:var(--texto-2);margin:0}
.pr-anx input[type=file]{padding:9px 12px}
.janela.pr-larga{width:min(760px,calc(100vw - 32px))}

@media (max-width:760px){
  .pr-gerar{grid-template-columns:minmax(0,1fr);grid-template-areas:"form" "prev" "pe";gap:16px}
  .pr-gerar>.pr-a-prev{position:static}
  .pr-pe{padding:16px}
  .pr-pe .pr-pe-bts{width:100%}
  .pr-pe .pr-pe-bts{flex-direction:column-reverse}
  .pr-pe .pr-pe-bts .btn{width:100%}
  .pr-abas{padding:0 12px;flex-wrap:wrap;overflow:visible}
  .pr-abas [role=tab]{padding:0 8px}
  .pr-painel .pe-papel{padding:18px 14px 20px;font-size:13px}
  .pr-pod{grid-template-columns:1fr}
  .pr-rep{grid-template-columns:44px minmax(0,1fr)}
  .pr-rep .btn{grid-column:1/-1;width:100%}
  .pr-dentro{margin-left:0}
  .pr-tab .pr-acoes{justify-content:stretch;width:100%}
  .pr-tab .pr-acoes .btn{flex:1 1 auto}
  .pr-tab td.pr-td-acoes{display:block}
  .pr-tab td.pr-td-acoes::before{display:none}
  .pr-avisos{padding:0 16px 12px}
  .pr-tres{grid-template-columns:minmax(0,1fr);gap:16px}
  .pr-mods{padding:0 16px 8px}
  .pr-mod{grid-template-columns:44px minmax(0,1fr)}
  .pr-mod .pe-bts{grid-column:1/-1;justify-content:stretch}
  .pr-mod .pe-bts .btn{flex:1 1 auto}
  .pr-vers{margin-left:0}
  .pr-outros{margin:4px 16px 14px}
  .pr-outros .btn{width:100%}
  .pr-docs{padding:0 16px 8px}
  .pr-doc{grid-template-columns:44px minmax(0,1fr)}
  .pr-doc .pe-bts{grid-column:1/-1;justify-content:stretch}
  .pr-doc .pe-bts .btn{flex:1 1 auto}
  .pr-anx fieldset{padding:12px}
  .pr-anx-l{grid-template-columns:minmax(0,1fr)}
}
"""

# As abas da prévia: setas e clique trocam o documento mostrado.
SCRIPT_ABAS = r"""<script>
(function(){
  function ir(t){var l=t.closest('[role=tablist]');l.querySelectorAll('[role=tab]').forEach(function(x){var s=x===t;x.setAttribute('aria-selected',s);x.tabIndex=s?0:-1;var p=document.getElementById(x.getAttribute('aria-controls'));if(p)p.hidden=!s});t.focus()}
  document.addEventListener('click',function(e){var t=e.target.closest('[role=tab]');if(t)ir(t)});
  document.addEventListener('keydown',function(e){var t=e.target.closest&&e.target.closest('[role=tab]');if(!t)return;var a=[].slice.call(t.closest('[role=tablist]').querySelectorAll('[role=tab]'));var i=a.indexOf(t);
    if(e.key==='ArrowRight'){ir(a[(i+1)%a.length]);e.preventDefault()} else if(e.key==='ArrowLeft'){ir(a[(i-1+a.length)%a.length]);e.preventDefault()} else if(e.key==='Home'){ir(a[0]);e.preventDefault()} else if(e.key==='End'){ir(a[a.length-1]);e.preventDefault()}});
})();
</script>"""


# ---------------------------------------------------------------- peças
def op(nome, rot, sub='', marcado=False, tipo='checkbox', id_=None, extra_attr=''):
    ch = ' checked' if marcado else ''
    i = f' id="{id_}"' if id_ else ''
    s = f'<small>{sub}</small>' if sub else ''
    return f'<label class="opcao"><input class="marcar" type="{tipo}" name="{nome}"{i}{ch}{extra_attr}><span>{rot}{s}</span></label>'


def sel(tipo, txt, icone=None):
    i = ico(icone) if icone else ''
    return f'<span class="selo selo-{tipo}">{i}{txt}</span>'


def cab_pr(titulo, lede='', acoes='', voltar=None, sobre='Contratos'):
    v = f'<a class="pe-voltar" href="{voltar[0]}">{ico("esq", "ico ico-s")}{voltar[1]}</a>' if voltar else ''
    lp = f'<p class="lede">{lede}</p>' if lede else ''
    a = f'<div class="pe-cab-acoes">{acoes}</div>' if acoes else ''
    return f'<div class="pt-cab"><div>{v}<p class="sobretitulo">{sobre}</p><h1>{titulo}</h1><span class="fio" aria-hidden="true"></span>{lp}</div>{a}</div>'


def folha(id_, titulo, corpo, sub='', acoes='', pequeno=False, extra=''):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    st = ' style="font-size:20px"' if pequeno else ''
    pb = ' style="padding-bottom:8px"' if pequeno else ''
    return (f'<section class="folha"{extra} aria-labelledby="{id_}"><div class="folha-cab"{pb}><div><h2 id="{id_}"{st}>{titulo}</h2>{s}</div>{a}</div>{corpo}</section>')


def reserva(txt):
    return f'<div class="hn-reserva"><div>{ico("lapis")}<span><b>Assinatura eletrônica: em estudo.</b> {txt}</span></div></div>'


def iniciais(n):
    return ''.join(p[0] for p in n.split()[:2])


def adv_lista():
    li = ''
    for n, ins in OABS.items():
        li += f'<li><span class="av-p forte" aria-hidden="true">{iniciais(n)}</span><div><strong>{n}</strong><small>{" · ".join(i for i, _ in ins)}</small></div></li>'
    return (f'<ul class="hn-pessoas">{li}</ul><p class="hn-pe">{ico("ajuda")}<span>{SEM_OAB} não têm OAB na Equipe e não aparecem como outorgados. '
            f'Cada advogado entra com todas as inscrições, a principal primeiro.</span></p>')


# ---------------------------------------------------------------- prévia em papel (3 marcas: cadastro, formulário, falta)
C = 'mark'                 # do cadastro e do contrato (traço)
F = 'mark class="pe-f"'    # deste formulário (pontilhado)
FALTA = lambda o: f'<mark class="pe-falta">[{o}: falta]</mark>'


def legenda():
    return ('<p class="pe-leg" aria-hidden="true"><span><i style="background:var(--sal-2);box-shadow:inset 0 -2px 0 var(--vinho-4)"></i>do cadastro e do contrato (traço)</span>'
            '<span><i style="background:#FCF8F5;border-bottom:2px dotted var(--vinho-2)"></i>desta tela (pontilhado)</span>'
            '<span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-3)"></i>falta: completar no Word</span></p>'
            '<p class="sr">Na prévia, os dados preenchidos vêm marcados. Os que faltam aparecem entre colchetes, com a palavra falta.</p>')


def timbre():
    return '<div class="pe-timbre"><span>Ribeiro &amp; Matos</span><span>Advocacia</span></div>'


def frase_adv(nomes, insc=None):
    insc = insc or {}
    partes = []
    for n in nomes:
        ins = insc.get(n, [i for i, _ in OABS[n]])
        partes.append(f'<{C}>{n.upper()}</mark>, <{C}>{" e ".join(ins)}</mark>')
    if len(partes) == 1:
        return partes[0]
    return ', '.join(partes[:-1]) + ', e ' + partes[-1]


def qual_ben(rg=False):
    r = f'<{C}>RG nº 33.418.207-5 SSP/SP</mark>' if rg else FALTA('RG')
    return (f'<{C}>BENEDITO SOUZA LIMA</mark>, <{C}>brasileiro, casado, pedreiro</mark>, portador do {r}, '
            f'inscrito no CPF sob o nº <{C}>{CPF_BEN}</mark>, residente na <{C}>{END_BEN}</mark>')


def qual_far():
    return (f'<{C}>FARMÁCIA BOM JESUS LTDA.</mark>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <{C}>08.417.552/0001-30</mark>, '
            f'com sede na <{C}>Rua Voluntários da Pátria, 1.540, Santana, São Paulo, SP, CEP 02011-000</mark>, neste ato representada por sua '
            f'<{C}>sócia-administradora, RITA DE CÁSSIA MOURA, brasileira, casada, farmacêutica, inscrita no CPF sob o nº {CPF_REP}</mark>')


def qual_pedro():
    return (f'<{C}>PEDRO HENRIQUE ALVES SOUZA</mark>, <{C}>brasileiro, menor impúbere, nascido em 14/03/2014, inscrito no CPF sob o nº {CPF_PEDRO}</mark>, '
            f'neste ato representado por sua mãe, <{C}>JOANA ALVES SOUZA, brasileira, divorciada, auxiliar administrativa, portadora do RG nº 41.552.318-7 SSP/SP, '
            f'inscrita no CPF sob o nº {CPF_JOANA}</mark>, ambos residentes na <{C}>Rua Bresser, 845, apto. 12, Brás, São Paulo, SP, CEP 03017-000</mark>')


def poderes_txt(lista, outro=''):
    itens = [p.lower() for p in lista] + ([outro] if outro else [])
    if not itens:
        return ''
    t = ', '.join(itens[:-1]) + (' e ' if len(itens) > 1 else '') + itens[-1]
    return f' e os poderes especiais para <{F}>{t}</mark>'


def papel_procuracao(qual, outorgados, poderes, outro='', insc=None, assina='BENEDITO SOUZA LIMA'):
    return (f'<div class="pe-papel">{timbre()}<h3>PROCURAÇÃO</h3>'
            f'<p><b>OUTORGANTE:</b> {qual}.</p>'
            f'<p><b>OUTORGADOS:</b> {frase_adv(outorgados, insc)}, com escritório na <{C}>{ESC[3]}</mark>, a quem confere os poderes da cláusula <i>ad judicia et extra</i>'
            f'{poderes_txt(poderes, outro)}.</p>'
            f'<p><{F}>{CIDADE_DATA}</mark>.</p><p class="pe-ass"><{C}>{assina}</mark></p>'
            f'<p class="pe-mais">{ico("doc")}<span>Modelo padrão do T3jus. O texto que não está marcado é do modelo e não muda.</span></p></div>')


def papel_contrato(rg=False):
    return (f'<div class="pe-papel">{timbre()}<h3>CONTRATO DE HONORÁRIOS</h3>'
            f'<p style="text-align:center;margin-top:-8px">nº <{C}>C-2026-033</mark></p>'
            f'<p><b>CONTRATANTE:</b> {qual_ben(rg)}.</p>'
            f'<p><b>CONTRATADA:</b> <{C}>{ESC[0]}</mark>, sociedade de advogados inscrita na <{C}>{ESC[1]}</mark> e no CNPJ sob o nº <{C}>{ESC[2]}</mark>, '
            f'com sede na <{C}>{ESC[3]}</mark>, por seus advogados {frase_adv(["Marina Ribeiro", "Felipe Matos"])}.</p>'
            f'<p><span class="pr-cl">Cláusula 1ª.</span> O objeto deste contrato é <{C}>aposentadoria por idade: requerimento no INSS e, se preciso, a ação judicial</mark>.</p>'
            f'<p><span class="pr-cl">Cláusula 3ª.</span> Pelos serviços, o CONTRATANTE pagará:</p><ol type="a">'
            f'<li><{C}>R$ 2.000,00 (dois mil reais), em 3 parcelas mensais, 2 de R$ 666,67 e 1 de R$ 666,66, todo dia 10, de 10/12/2026 a 10/02/2027</mark>;</li>'
            f'<li><{C}>30% (trinta por cento) dos valores atrasados que receber, em até 15 dias do pagamento da RPV ou do precatório</mark>;</li>'
            f'<li><{C}>30% (trinta por cento) do benefício mensal, por 12 meses, a partir da implantação, todo dia 10</mark>.</li></ol>'
            f'<p class="pe-mais">{ico("doc")}<span>Continua com as cláusulas 2 e 4 a 9 do modelo do escritório (v2), a data e as assinaturas. O T3jus não muda esse texto.</span></p></div>')


def papel_declaracao(qual, pj=False, assina='BENEDITO SOUZA LIMA'):
    if pj:
        corpo = ('declara, para pedir a gratuidade da justiça, que não tem condições de pagar as custas do processo sem comprometer a continuidade das suas atividades, '
                 'e junta os documentos que comprovam essa situação.')
    else:
        corpo = ('declara, para os fins do art. 99 do Código de Processo Civil, que não tem condições de pagar as custas do processo e os honorários '
                 'sem prejuízo do próprio sustento e do da família.')
    return (f'<div class="pe-papel">{timbre()}<h3>DECLARAÇÃO DE HIPOSSUFICIÊNCIA</h3>'
            f'<p>{qual}, {corpo}</p><p><{F}>{CIDADE_DATA}</mark>.</p><p class="pe-ass"><{C}>{assina}</mark></p>'
            f'<p class="pe-mais">{ico("doc")}<span>Modelo padrão do T3jus{", versão para pessoa jurídica" if pj else ""}. Este é o documento inteiro.</span></p></div>')


def previa(paineis, atual, id_='pv'):
    """paineis: lista de (chave, rótulo, n_faltas ou None quando não vai ser gerado, html do papel)."""
    abas, ps = '', ''
    for k, rot, nf, papel in paineis:
        s = k == atual
        if nf is None:
            q = '<span class="pr-q pr-ok">não marcado</span>'
        elif nf:
            q = f'<span class="pr-q">{nf} falta</span>'
        else:
            q = ''
        abas += (f'<button type="button" role="tab" id="{id_}-t-{k}" aria-controls="{id_}-p-{k}" aria-selected="{"true" if s else "false"}" tabindex="{0 if s else -1}">{rot}{q}</button>')
        conteudo = papel if nf is not None else (f'<div class="pr-nada">{ico("doc")}Este documento não está marcado e não vai ser gerado. '
                                                 f'Marque em Documentos para ver a prévia.</div>')
        ps += f'<div class="pr-painel" role="tabpanel" id="{id_}-p-{k}" aria-labelledby="{id_}-t-{k}"{"" if s else " hidden"}><div class="pe-papel-folha">{conteudo}</div></div>'
    return (f'<section class="folha" aria-labelledby="t-{id_}"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-{id_}" style="font-size:20px">Prévia</h2>'
            f'<p class="sub">O começo de cada documento, com os dados de agora.</p></div></div>{legenda()}'
            f'<div class="pr-abas" role="tablist" aria-label="Documento da prévia">{abas}</div>{ps}</section>')


def previa_vazia():
    return (f'<section class="folha" aria-labelledby="t-pv"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pv" style="font-size:20px">Prévia</h2>'
            f'<p class="sub">O começo de cada documento, com os dados de agora.</p></div></div>'
            f'<div class="pr-nada">{ico("doc")}Nenhum documento marcado. Marque ao menos um para ver a prévia.</div></section>')


# ---------------------------------------------------------------- 1. lista
def doc_cel(nome, arq, v, marcado=0, por=''):
    m = f'<span class="pr-m">{sel("atencao", f"{marcado} dado marcado<span class=sr> para completar</span>", "pena")}</span>' if marcado else ''
    p = f'<small>Gerado por {por.replace("<small>", ", ").replace("</small>", "")}</small>' if por else ''
    return f'<div class="pe-doc"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span><span><b>{nome}<span class="pr-v">v{v}</span></b><small>{arq}</small>{p}{m}</span></div>'


def acoes_doc(curto, falta):
    a = ''
    if falta:
        a += f'<a class="btn btn-pri btn-compacto" href="{U}anexar">{ico("enviar", "ico ico-s")}Anexar o assinado<span class="sr">: {curto}</span></a>'
    a += f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> {curto}</span></button>'
    return f'<div class="pr-acoes">{a}</div>'


def lista_docs():
    FICHA = f'{U}ficha-documentos'
    falta = sel('atencao', 'Falta anexar o assinado', 'relogio')
    rows = [
        ('Contrato de honorários', 'contrato-honorarios-benedito-lima.docx', 1, 1, f'<a class="pe-caso" href="{FICHA}">Benedito Souza Lima</a><small>C-2026-033 · em elaboração</small>', 'Marina Ribeiro<small>hoje, 15h10</small>',
         f'<div class="pr-sit">{falta}<small>O assinado ativa o contrato</small></div>', 'o contrato de Benedito', True),
        ('Procuração', 'procuracao-benedito-lima.docx', 1, 1, f'<a class="pe-caso" href="{FICHA}">Benedito Souza Lima</a><small>C-2026-033 · em elaboração</small>', 'Marina Ribeiro<small>hoje, 15h10</small>', falta, 'a procuração de Benedito', True),
        ('Declaração de hipossuficiência', 'declaracao-benedito-lima.docx', 1, 1, f'<a class="pe-caso" href="{FICHA}">Benedito Souza Lima</a><small>C-2026-033 · em elaboração</small>', 'Marina Ribeiro<small>hoje, 15h10</small>', falta, 'a declaração de Benedito', True),
        ('Procuração', 'procuracao-farmacia-bom-jesus.docx', 2, 0, f'<a class="pe-caso" href="{U_CT}contrato">Farmácia Bom Jesus Ltda.</a><small>C-2026-019 · ativo</small>', 'Felipe Matos<small>19/11/2026</small>', falta, 'a procuração da Farmácia', True),
        ('Contrato de honorários', 'contrato-honorarios-antonia-prado.docx', 1, 0, '<a class="pe-caso" href="#">Antônia Ferreira Prado</a><small>C-2026-031 · ativo</small>', 'Marina Ribeiro<small>28/10/2026</small>', sel('ok', 'Assinado em 30/10', 'check'), 'o contrato de Antônia', False),
        ('Procuração', 'procuracao-antonia-prado.docx', 1, 0, '<a class="pe-caso" href="#">Antônia Ferreira Prado</a><small>C-2026-031 · ativo</small>', 'Marina Ribeiro<small>28/10/2026</small>', sel('ok', 'Assinada em 30/10', 'check'), 'a procuração de Antônia', False),
    ]
    linhas = []
    for nome, arq, v, m, cli, por, sit, curto, f in rows:
        linhas.append(([doc_cel(nome, arq, v, m, por), cli, sit, acoes_doc(curto, f)], 'pr-falta' if f else ''))
    t = tabela('Documentos gerados', ['Documento', 'Cliente e contrato', 'Assinatura', '<span class="sr">Ações</span>'], linhas, ['38%', '21%', '19%', '22%'], 'pr-tab')
    return t.replace('<td data-r="Ações">', '<td data-r="Ações" class="pr-td-acoes">')


def lado_lista():
    mods = (f'<ul class="hn-pessoas">'
            f'<li><span class="av-p forte" aria-hidden="true">{ico("doc", "ico ico-s")}</span><div><strong>Contrato de honorários</strong><small>Do escritório · v2</small></div></li>'
            f'<li><span class="av-p forte" aria-hidden="true">{ico("doc", "ico ico-s")}</span><div><strong>Procuração</strong><small>Padrão T3jus</small></div></li>'
            f'<li><span class="av-p forte" aria-hidden="true">{ico("doc", "ico ico-s")}</span><div><strong>Declaração de hipossuficiência</strong><small>Padrão T3jus</small></div></li></ul>'
            f'<div class="hn-folha-acao"><a class="btn btn-sec" href="{U}modelos">{ico("doc")}Modelos de documento</a></div>')
    return (folha('t-lm', 'Modelos', mods, 'O texto é do escritório; o T3jus preenche os campos.', pequeno=True)
            + folha('t-ad', 'Advogados nos documentos', adv_lista(), 'Nome e OAB vêm da Equipe.', pequeno=True)
            + folha('t-as', 'Assinatura', reserva('O lugar fica reservado. Por enquanto, o escritório imprime, colhe a assinatura e anexa o arquivo assinado.'), pequeno=True))


def pagina_lista():
    cab = cab_pr('Procurações e modelos', 'Contrato de honorários, procuração e declaração de hipossuficiência, com os dados do cliente e dos advogados, no timbrado do escritório.',
                 f'<a class="btn btn-sec" href="{U}modelos">{ico("doc")}Modelos de documento</a><a class="btn btn-pri" href="{U}gerar-escolher">{ico("pena")}Gerar documentos</a>')
    chips = ('<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="true">Todos (10)</button>'
             f'<button type="button" aria-pressed="false">{ico("relogio", "ico ico-s")}Falta anexar o assinado (4)</button>'
             '<button type="button" aria-pressed="false">Assinados (6)</button></div>')
    ferr = (f'<form class="hn-ferr" role="search" action="#" onsubmit="return false"><div class="campo-busca"><label class="sr" for="pr-b">Buscar por cliente ou contrato</label>{ico("busca")}'
            f'<input class="entrada" id="pr-b" type="search" placeholder="Cliente ou número do contrato" autocomplete="off"></div>{chips}</form>')
    av = ('<div class="pr-avisos">' + aviso('atencao', '4 documentos esperam o assinado.',
                                          'O contrato de Benedito Souza Lima só fica ativo, e a programação dos recebimentos só vai ao Financeiro, quando o contrato assinado for anexado.',
                                          icone='relogio', acoes=f'<a class="btn btn-sec" href="{U}anexar">{ico("enviar")}Anexar os de Benedito</a>') + '</div>')
    lista = (f'<section class="folha" aria-labelledby="t-gd" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-gd">Documentos gerados</h2>'
             f'<p class="sub">Arquivo do Word, para revisar antes de imprimir. O que falta anexar vem primeiro.</p></div></div>{ferr}{av}'
             f'<p class="hn-cont" role="status"><b>10 documentos</b> de 4 contratos · mostrando 6</p>{lista_docs()}'
             f'<div class="mais"><span>Mostrando 6 de 10</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais 4</button></div>'
             f'<p class="hn-pe">{ico("historico")}<span>Gerar de novo guarda o anterior como versão. Nada é apagado: cada documento fica também na ficha do contrato, aba Documentos.</span></p></section>')
    return f'<div class="hn">{cab}{lista}<aside class="pr-tres" aria-label="Modelos, advogados e assinatura">{lado_lista()}</aside></div>'


EXPLICA = (f'<section class="explica campo-ambar" aria-labelledby="t-ex"><p class="sobretitulo">Como funciona</p><h2 id="t-ex">O texto é do escritório. Os dados, do cadastro.</h2><ul>'
           f'<li>{ico("doc")}<span>Cada documento parte de um modelo em Word, com campos entre colchetes como [CLIENTE_QUALIFICACAO] e [ADVOGADOS_OAB].</span></li>'
           f'<li>{ico("pessoas")}<span>A qualificação vem da ficha do cliente; as condições, do contrato; a OAB, da Equipe.</span></li>'
           f'<li>{ico("pena")}<span>O escritório imprime, colhe a assinatura e anexa o assinado. O do contrato ativa o contrato.</span></li></ul></section>')


def pagina_vazia():
    cab = cab_pr('Procurações e modelos', 'Contrato de honorários, procuração e declaração de hipossuficiência, com os dados do cliente e dos advogados, no timbrado do escritório.',
                 f'<a class="btn btn-sec" href="{U}modelos">{ico("doc")}Modelos de documento</a><a class="btn btn-pri" href="{U}gerar-escolher">{ico("pena")}Gerar documentos</a>')
    passos = (f'<ol class="pe-proximo" style="text-align:left;max-width:520px;margin:4px auto 0">'
              f'<li><span><b>Confira os modelos.</b> Já vêm os três padrão do T3jus. Troque pelo do escritório quando quiser: um .docx com os campos entre colchetes.</span></li>'
              f'<li><span><b>Gere a partir de um contrato.</b> Pode ser um contrato em elaboração. Também dá para começar pela ficha do contrato, na aba Documentos.</span></li></ol>')
    e = estado('Nenhum documento gerado ainda', 'Aqui ficam o contrato, a procuração e a declaração de cada cliente, com a situação da assinatura. Dois passos para começar:', 'pena', moldura=False,
               acoes=f'<a class="btn btn-sec" href="{U}modelos">{ico("doc")}Ver os modelos</a><a class="btn btn-pri" href="{U}gerar-escolher">{ico("pena")}Gerar os primeiros</a>', h='h2')
    e = e.replace('</p><div class="acoes">', '</p>' + passos + '<div class="acoes">')
    lista = f'<section class="folha" aria-label="Documentos gerados" style="overflow:hidden">{e}</section>'
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{lista}</div><aside class="hn-col" aria-label="Como funciona">{EXPLICA}</aside></div></div>'


# ---------------------------------------------------------------- 2. modelos
MODELOS = [
    ('Contrato de honorários', True, 'v2 · enviado por Marina Ribeiro em 15/09/2026 · 12 campos · usado 14 vezes',
     [('v1', 'enviado por Marina Ribeiro em 02/08/2026', '9 documentos gerados com ela continuam como estavam')]),
    ('Procuração', False, 'padrão do T3jus · atualizado em 01/11/2026 · 9 campos · usado 21 vezes', []),
    ('Declaração de hipossuficiência', False, 'padrão do T3jus · atualizado em 01/11/2026 · 6 campos · usado 11 vezes · tem versão para pessoa jurídica', []),
]


def pagina_modelos():
    cab = cab_pr('Modelos de documento', 'Os textos do escritório, em Word. O T3jus só preenche os campos entre colchetes; o resto fica como está.',
                 f'<button class="btn btn-pri" type="button" data-janela="janela-modelo">{ico("enviar")}Enviar modelo</button>',
                 voltar=(f'{U}procuracoes', 'Procurações e modelos'), sobre='Contratos · Procurações e modelos')
    li = ''
    for nome, esc, meta, vers in MODELOS:
        s = sel('implant', 'Do escritório') if esc else sel('neutro', 'Padrão T3jus')
        bts = (f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> o modelo de {nome.lower()}</span></button>'
               f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-modelo">{ico("trocar", "ico ico-s")}{"Trocar" if esc else "Usar o do escritório"}<span class="sr">: {nome.lower()}</span></button>')
        v = ''
        if vers:
            v = ('<details class="pr-vers"><summary>' + ico('historico', 'ico ico-s') + f'Versões anteriores ({len(vers)})</summary><ol>'
                 + ''.join(f'<li><b>{a}</b><span>{b}</span><span>{c}</span><button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> a {a} do {nome.lower()}</span></button></li>' for a, b, c in vers)
                 + '</ol></details>')
        li += (f'<li class="{"pe-do-esc" if esc else ""}"><div class="pr-mod"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span>'
               f'<div><strong>{nome}{s}</strong><small>{meta}</small></div><div class="pe-bts">{bts}</div></div>{v}</li>')
    outros = (f'<div class="pr-outros">{ico("mais")}<span><b>Outros documentos do escritório.</b> Nenhum ainda. Substabelecimento, declaração de residência e outros podem entrar aqui, '
              f'com os mesmos campos, e aparecem na hora de gerar (pergunta 1).</span>'
              f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-modelo">{ico("enviar", "ico ico-s")}Enviar outro modelo</button></div>')
    pe = (f'<p class="hn-pe">{ico("historico")}<span>Trocar um modelo cria a versão nova e guarda a anterior. Os documentos já gerados não mudam. '
          f'Cada envio e cada troca ficam no histórico do escritório, com quem fez e quando.</span></p>')
    lista = (f'<section class="folha" aria-labelledby="t-mo" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-mo">Os três documentos</h2>'
             f'<p class="sub">1 do escritório e 2 padrão do T3jus</p></div></div><ul class="pr-mods">{li}</ul>{outros}{pe}</section>')
    cps = ''
    for g, itens in CAMPOS:
        cps += f'<h3>{g}</h3><dl>' + ''.join(
            f'<div><dt>{" ".join(f"<code>{H(x)}</code>" for x in c.split("  "))}</dt><dd>{d}</dd></div>' for c, d in itens) + '</dl>'
    campos = (f'<section class="folha" aria-labelledby="t-cps"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-cps" style="font-size:20px">Campos aceitos</h2>'
              f'<p class="sub">Escreva no modelo do jeito que está aqui, com os colchetes. Os nomes são os mesmos das petições.</p></div></div><div class="pe-campos">{cps}</div>'
              f'<p class="hn-pe">{ico("ajuda")}<span>Dado que falta no cadastro sai marcado, como [RG: falta]. Campo que o T3jus não conhece sai como está, para completar no Word.</span></p></section>')
    quem = folha('t-qm', 'Quem muda os modelos', f'<p class="hn-pe" style="border-top:0;padding-top:0">{ico("pessoas")}<span>Quem tem a área Contratos envia e troca modelos. A versão anterior fica guardada e a troca entra no histórico.</span></p>', pequeno=True)
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{lista}</div><aside class="hn-col" aria-label="Campos e permissões">{campos}{quem}</aside></div></div>'


def j_modelo(abrir=False, erro=False):
    if erro:
        arq = (f'<div class="campo c6"><p class="pe-rot" id="ma-arq-r">Arquivo do modelo</p><div class="pe-arq erro" role="group" aria-labelledby="ma-arq-r">'
               f'<span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><b>procuracao-escritorio.doc</b><small>Word 97-2003 · 64 KB</small></div>'
               f'<button class="btn btn-sec btn-compacto" type="button" data-foco aria-describedby="ma-arq-er">{ico("enviar", "ico ico-s")}Escolher outro arquivo</button></div>'
               f'<p class="erro-msg" id="ma-arq-er">{ico("alerta", "ico ico-s")}Este arquivo é do Word antigo (.doc). O modelo precisa ser .docx, para o T3jus preencher e você editar depois. '
               f'No Word: Arquivo › Salvar como › Documento do Word (.docx).</p></div>')
        conf = ''
        resumo = aviso('urgencia', 'O modelo não foi salvo.', 'Escolha um arquivo .docx de até 5 MB, sem macro. A procuração padrão do T3jus continua valendo.')
    else:
        arq = (f'<div class="campo c6"><p class="pe-rot" id="ma-arq-r">Arquivo do modelo</p><div class="pe-arq" role="group" aria-labelledby="ma-arq-r">'
               f'<span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><b>procuracao-ribeiro-matos.docx</b><small>Word · 41 KB · conferido agora</small></div>'
               f'<button class="btn btn-sec btn-compacto" type="button">{ico("enviar", "ico ico-s")}Trocar arquivo</button></div>'
               f'<p class="ajuda">Só .docx, até 5 MB. PDF, .doc antigo e .docm (com macro) não servem.</p></div>')
        ok = ['[CLIENTE_NOME]', '[ADVOGADOS_OAB]', '[ESCRITORIO_ENDERECO]', '[CIDADE_DATA]', '[CLIENTE_ASSINATURA]']
        chips = ''.join(f'<li>{ico("check")}<code class="pe-code">{c}</code></li>' for c in ok)
        chips += f'<li class="pe-desc">{ico("alerta")}<code class="pe-code">[QUALIFICACAO_CLIENTE]</code><span class="sr">: campo desconhecido</span></li>'
        conf = (f'<section class="pe-conf c6" aria-labelledby="ma-conf-t"><h3 id="ma-conf-t">{ico("doc")}Conferimos o arquivo: 6 campos, 1 desconhecido</h3>'
                f'<ul class="pe-chips" aria-label="Campos encontrados">{chips}</ul>'
                + aviso('atencao', 'O T3jus não conhece o campo [QUALIFICACAO_CLIENTE].',
                        'No documento, ele sai do jeito que está, para completar no Word. Para preencher sozinho, troque no Word por [CLIENTE_QUALIFICACAO] e envie de novo. Dá para salvar assim.',
                        icone='alerta')
                + aviso('info', 'O modelo não tem [PODERES_ESPECIAIS].',
                        'Os poderes marcados na hora de gerar não vão entrar. Se o texto do escritório já traz os poderes escritos, pode salvar assim.')
                + '</section>')
        resumo = ''
    corpo = (resumo + '<div class="form-folha" style="padding:0">' + arq
             + selecao('ma-doc', 'Documento', ['Contrato de honorários', 'Procuração', 'Declaração de hipossuficiência', 'Outro documento'], 'Procuração', 'c3', vazio='')
             + campo('ma-nome', 'Nome do modelo', 'Procuração do escritório', 'c3', foco=not erro, ajuda='Como aparece na lista de modelos.')
             + selecao('ma-subst', 'Substitui', ['Procuração · padrão do T3jus', 'Nenhum: é um modelo novo'], 'Procuração · padrão do T3jus', 'c6',
                       ajuda='O padrão continua guardado e dá para voltar a ele. Os documentos já gerados não mudam.', vazio='')
             + conf + '</div>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Salvar e usar este modelo</button>')
    j = janela('janela-modelo', 'Modelos de documento', 'Enviar modelo',
               'Um .docx do escritório com os campos entre colchetes. Conferimos os campos assim que o arquivo chega.', corpo, pe, abrir=abrir or erro)
    return j.replace('class="janela"', 'class="janela pr-larga"', 1)


# ---------------------------------------------------------------- 3. gerar
def contrato_card(ini, nome, sub, veio=''):
    v = f'<p class="ajuda" style="margin-top:6px">{veio}</p>' if veio else ''
    return (f'<div class="c6"><p style="font-weight:500;margin-bottom:6px" id="gd-ct-r">Contrato</p><div class="hn-escolhido" role="group" aria-labelledby="gd-ct-r">'
            f'<span class="av-p forte" aria-hidden="true">{ini}</span><div><strong>{nome}</strong><small>{sub}</small></div>'
            f'<a class="btn btn-sec btn-compacto" href="{U}gerar-escolher">{ico("trocar")}Trocar contrato</a></div>{v}</div>')


def documentos_fs(marcados=('c', 'p', 'd'), erro=False, pj=False, contrato_sub=None, extra_decl=''):
    subs = {
        'c': contrato_sub or 'Com o objeto, as 3 condições de honorário e as cláusulas do escritório. Modelo do escritório, v2.',
        'p': 'Ad judicia et extra, para os advogados marcados abaixo. Padrão T3jus.',
        'd': ('Para pedir a justiça gratuita. Versão para pessoa jurídica.' if pj else
              'Para pedir a justiça gratuita: o cliente declara que não pode pagar as custas sem prejuízo do sustento. Padrão T3jus.'),
    }
    nomes = {'c': 'Contrato de honorários', 'p': 'Procuração', 'd': 'Declaração de hipossuficiência'}
    ops = ''
    for k in 'cpd':
        ops += op('gd-doc', nomes[k], subs[k], k in marcados, id_=f'gd-doc-{k}')
        if k == 'd' and extra_decl:
            ops += f'<div class="pr-dentro">{extra_decl}</div>'
    er = (f'<p class="erro-msg" id="gd-doc-er">{ico("alerta", "ico ico-s")}Marque ao menos um documento.</p>' if erro else '')
    d = ' aria-describedby="gd-doc-er"' if erro else ''
    return f'<fieldset class="pe-fs c6" id="gd-docs"{d}><legend>Documentos</legend>{er}{ops}</fieldset>'


def outorgados_fs(pessoas, erro=False):
    """pessoas: lista de (nome, papel, marcado, inscrições marcadas ou None para todas)."""
    blocos = ''
    escolhidos = []
    for nome, papel, marc, ins_m in pessoas:
        ins = OABS[nome]
        if len(ins) == 1:
            ih = f'<p class="pe-insc-uma">{ins[0][0]}<small>única inscrição</small></p>'
        else:
            pn = nome.split()[0]
            ih = (f'<fieldset class="pe-insc"><legend>Inscrições de {pn} nestes documentos</legend>'
                  + ''.join(op(f'gd-insc-{pn.lower()}', i, t, ins_m is None or i in ins_m) for i, t in ins) + '</fieldset>')
        blocos += (f'<div class="pe-a">{op("gd-adv", f"<strong style=font-weight:500>{nome}</strong>", papel, marc, id_="gd-adv-" + nome.split()[0].lower())}{ih}</div>')
        if marc:
            escolhidos.append(nome)
    er = (f'<p class="erro-msg" id="gd-adv-er">{ico("alerta", "ico ico-s")}Marque ao menos um advogado. Sem advogado, a procuração não tem a quem dar os poderes e o contrato não tem quem assine pelo escritório.</p>' if erro else '')
    d = ' aria-describedby="gd-adv-er gd-adv-aj"' if erro else ' aria-describedby="gd-adv-aj"'
    if escolhidos:
        partes = [f'{n.upper()}, {" e ".join(i for i, _ in OABS[n])}' for n in escolhidos]
        frase = partes[0] if len(partes) == 1 else ', '.join(partes[:-1]) + ', e ' + partes[-1]
        sai = f'<p class="pe-sai" aria-live="polite">{ico("pena")}<span><b>No documento:</b> {frase}.</span></p>'
    else:
        sai = f'<p class="pe-sai" aria-live="polite">{ico("pena")}<span><b>No documento:</b> ninguém ainda.</span></p>'
    return (f'<fieldset class="pe-fs c6" id="gd-adv"{d}><legend>Advogados outorgados<small>a OAB vem da Equipe</small></legend>{er}<div class="pe-adv">{blocos}</div>'
            f'<p class="ajuda" id="gd-adv-aj">Vêm marcados os advogados do contrato. Mudar aqui vale só para estes documentos. Sem OAB na Equipe, não aparecem: {SEM_OAB}.</p>{sai}</fieldset>')


def poderes_fs(marcados, outro=''):
    ops = ''.join(op('gd-pod', n, s, n in marcados) for n, s in PODERES)
    return (f'<fieldset class="pe-fs c6" aria-describedby="gd-pod-aj"><legend>Poderes especiais da procuração</legend>'
            f'<p class="ajuda" id="gd-pod-aj" style="margin:-4px 0 4px">Os poderes gerais (<i>ad judicia et extra</i>) já estão no modelo. Marque os que precisam estar escritos (art. 105 do Código de Processo Civil).</p>'
            f'<div class="pr-pod">{ops}</div></fieldset>'
            + campo('gd-outro', 'Outro poder', outro, 'c6', opc=True, ajuda='Escreva como deve sair no documento. Ex.: representar perante o INSS e ter vista de processos administrativos.'))


def data_campo():
    return campo('gd-data', 'Cidade e data', CIDADE_DATA, 'c6', ajuda='Do endereço do escritório e de hoje. Mude se a assinatura for em outro dia.')


def pe_gerar(txt, sub, botao, voltar=f'{U}procuracoes'):
    return (f'<section class="folha pr-a-pe" aria-label="Gerar"><div class="pr-pe"><p class="pr-pe-txt">{txt}<small>{sub}</small></p>'
            f'<div class="pr-pe-bts"><a class="btn btn-fantasma" href="{voltar}">Cancelar</a>'
            f'<button class="btn btn-pri" type="submit" form="gd-form">{ico("doc")}{botao}</button></div></div></section>')


def pagina_gerar(form_corpo, prev, pe, titulo_form='O que gerar', sub_form='Os dados vêm da ficha do cliente, do contrato e da Equipe. Os campos sem “(opcional)” são obrigatórios.'):
    cab = cab_pr('Gerar documentos', voltar=(f'{U}procuracoes', 'Procurações e modelos'), sobre='Procurações e modelos')
    form = (f'<section class="folha pr-a-form" aria-labelledby="t-gd"><div class="folha-cab"><div><h2 id="t-gd">{titulo_form}</h2><p class="sub">{sub_form}</p></div></div>'
            f'<form class="form-folha pe-form" id="gd-form" action="#" novalidate>{form_corpo}</form></section>')
    return f'<div class="hn">{cab}<div class="pr-gerar">{form}<aside class="pr-a-prev" aria-label="Prévia dos documentos">{prev}</aside>{pe}</div></div>'


ADV_BEN = [('Marina Ribeiro', 'Responsável pelo contrato', True, None), ('Felipe Matos', 'Advogado no contrato', True, None), ('Larissa Costa', 'Não está no contrato', False, None)]
POD_BEN = ['Receber e dar quitação', 'Firmar acordo (transigir)', 'Substabelecer']
OUTRO_BEN = 'representar perante o INSS e ter vista de processos administrativos'


def paineis_ben(rg=False, marc=('c', 'p', 'd')):
    nf = 0 if rg else 1
    return [
        ('c', 'Contrato', nf if 'c' in marc else None, papel_contrato(rg)),
        ('p', 'Procuração', nf if 'p' in marc else None, papel_procuracao(qual_ben(rg), ['Marina Ribeiro', 'Felipe Matos'], POD_BEN, OUTRO_BEN)),
        ('d', 'Declaração', nf if 'd' in marc else None, papel_declaracao(qual_ben(rg))),
    ]


def gerar():
    r = (contrato_card('BL', 'Benedito Souza Lima', 'C-2026-033 · Aposentadoria por idade · em elaboração', 'Veio da ficha do contrato. As condições, os advogados e as inscrições já estão lá.')
         + '<div class="c6">' + aviso('atencao', 'Falta 1 dado de Benedito: o RG.',
                                      'Dá para gerar assim: os três documentos saem com [RG: falta], para preencher à mão ou no Word. Ou complete a ficha antes.',
                                      icone='pena', acoes=f'<a class="btn btn-sec" href="{FICHA_CL}">{ico("lapis")}Completar na ficha</a>') + '</div>'
         + documentos_fs() + outorgados_fs(ADV_BEN) + poderes_fs(POD_BEN, OUTRO_BEN) + data_campo())
    pe = pe_gerar('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.', '1 dado sai marcado em cada um: o RG de Benedito. Cada geração fica registrada, com quem gerou e quando.', 'Gerar 3 documentos', f'{U}ficha-documentos')
    return pagina_gerar(r, previa(paineis_ben(), 'c'), pe)


def gerar_erro():
    r = ('<div class="c6">' + aviso('urgencia', 'Nada foi gerado. Falta acertar 2 pontos.',
                                  '<a href="#gd-doc-c">Nenhum documento marcado</a> · <a href="#gd-adv-marina">Nenhum advogado marcado</a>. O que você escolheu continua aqui.') + '</div>'
         + contrato_card('BL', 'Benedito Souza Lima', 'C-2026-033 · Aposentadoria por idade · em elaboração')
         + documentos_fs(marcados=(), erro=True)
         + outorgados_fs([(n, p, False, i) for n, p, _, i in ADV_BEN], erro=True)
         + poderes_fs(POD_BEN, OUTRO_BEN) + data_campo())
    pe = pe_gerar('<b>Nada marcado para gerar.</b>', 'Marque ao menos um documento e um advogado.', 'Gerar documentos', f'{U}ficha-documentos')
    return pagina_gerar(r, previa_vazia(), pe)


def gerar_escolher():
    def ct(ini, nome, sub, linha2, marc=False):
        return (f'<li>{op("gd-ct", f"<strong>{nome}</strong>", f"{sub}<span class=pe-linha2 style=display:block>{linha2}</span>", marc, tipo="radio")}</li>')
    lista = (f'<p class="pe-grupo-t">Em elaboração, sem documentos ainda</p><ul class="pe-escolhas">'
             + ct('BL', 'Benedito Souza Lima', 'C-2026-033 · Aposentadoria por idade', 'Marina Ribeiro · criado em 18/11')
             + ct('PS', 'Pedro Henrique Alves Souza', 'C-2026-034 · Alimentos · representado pela mãe', 'Marina Ribeiro · criado em 20/11')
             + '</ul><p class="pe-grupo-t">Ativos</p><ul class="pe-escolhas">'
             + ct('FB', 'Farmácia Bom Jesus Ltda.', 'C-2026-019 · Cobranças e consultivo', 'Felipe Matos · documentos gerados em 01/09 e 19/11')
             + ct('AP', 'Antônia Ferreira Prado', 'C-2026-031 · Pensão por morte', 'Marina Ribeiro · documentos gerados em 28/10')
             + '</ul>')
    busca = (f'<div class="pe-busca"><div class="campo-busca"><label class="sr" for="gd-b">Buscar contrato</label>{ico("busca")}'
             f'<input class="entrada" id="gd-b" type="search" placeholder="Cliente ou número do contrato" autocomplete="off"></div></div>')
    sem = (f'<p class="hn-pe">{ico("ajuda")}<span>Cliente ainda sem contrato? <a href="{U_CT}novo-tipos">Crie o contrato em elaboração</a>: os documentos saem dele, '
           f'com as condições e os advogados. Ele só fica ativo quando o assinado for anexado.</span></p>')
    pri = (f'<section class="folha" aria-labelledby="t-ge"><div class="folha-cab"><div><h2 id="t-ge">De qual contrato?</h2>'
           f'<p class="sub">Os documentos usam o cliente, as condições e os advogados do contrato. Os que ainda não têm documentos vêm primeiro.</p></div></div>'
           f'{busca}<fieldset class="pe-fs" style="padding:0"><legend class="sr">Contrato</legend>{lista}</fieldset>'
           f'<div class="pr-pe" style="border-top:1px solid var(--divisor)"><p class="pr-pe-txt">Escolha um contrato para ver os documentos, os advogados e a prévia.</p>'
           f'<div class="pr-pe-bts"><a class="btn btn-fantasma" href="{U}procuracoes">Cancelar</a><a class="btn btn-pri" href="{U}gerar">Continuar{ico("dir")}</a></div></div>{sem}</section>')
    cab = cab_pr('Gerar documentos', voltar=(f'{U}procuracoes', 'Procurações e modelos'), sobre='Procurações e modelos')
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{pri}</div><aside class="hn-col" aria-label="Como funciona">{EXPLICA}</aside></div></div>'


def gerar_pj():
    rep = (f'<div class="c6"><p style="font-weight:500;margin-bottom:6px" id="gd-rep-r">Quem assina pela empresa</p><div class="pr-rep" role="group" aria-labelledby="gd-rep-r">'
           f'<span class="pe-ci" aria-hidden="true">{ico("pessoa-mais")}</span><div><b>Rita de Cássia Moura</b><small>Sócia-administradora · CPF {CPF_REP} · da ficha do cliente</small></div>'
           f'<a class="btn btn-sec btn-compacto" href="{FICHA_CL}">{ico("lapis", "ico ico-s")}Mudar na ficha</a></div>'
           f'<p class="ajuda" style="margin-top:6px">Entra na procuração e no contrato como representante da empresa, e assina por ela.</p></div>')
    av_pj = aviso('atencao', 'Para a empresa, a declaração sozinha não basta.',
                  'O juiz pede prova de que a empresa não pode pagar as custas, como balanço, extratos ou a declaração do imposto (Súmula 481 do STJ). '
                  'Sai a versão para pessoa jurídica, que diz que a prova vai junto. Dá para gerar assim.', icone='alerta')
    r = (contrato_card('FB', 'Farmácia Bom Jesus Ltda.', 'C-2026-019 · Cobranças e consultivo · ativo desde 02/09/2026')
         + rep
         + documentos_fs(marcados=('p', 'd'), pj=True, contrato_sub='Já assinado em 02/09/2026. Gere de novo só se o contrato mudou.', extra_decl=av_pj)
         + outorgados_fs([('Felipe Matos', 'Responsável pelo contrato', True, None), ('Larissa Costa', 'Advogada no contrato', True, None), ('Marina Ribeiro', 'Não está no contrato', False, None)])
         + poderes_fs(['Receber e dar quitação', 'Firmar acordo (transigir)', 'Receber citação']) + data_campo())
    pain = [
        ('c', 'Contrato', None, ''),
        ('p', 'Procuração', 0, papel_procuracao(qual_far(), ['Felipe Matos', 'Larissa Costa'], ['Receber e dar quitação', 'Firmar acordo (transigir)', 'Receber citação'],
                                                assina='FARMÁCIA BOM JESUS LTDA.<br>por Rita de Cássia Moura, sócia-administradora')),
        ('d', 'Declaração', 0, papel_declaracao(qual_far(), pj=True, assina='FARMÁCIA BOM JESUS LTDA.<br>por Rita de Cássia Moura, sócia-administradora')),
    ]
    pe = pe_gerar('<b>Vão sair 2 arquivos .docx</b>: procuração e declaração.', 'Nenhum dado faltando. Lembre de juntar a prova da empresa com a declaração.', 'Gerar 2 documentos', f'{U_CT}contrato')
    return pagina_gerar(r, previa(pain, 'p'), pe)


def gerar_menor():
    rep = (f'<div class="c6"><p style="font-weight:500;margin-bottom:6px" id="gd-rep-r">Quem assina por Pedro</p><div class="pr-rep" role="group" aria-labelledby="gd-rep-r">'
           f'<span class="pe-ci" aria-hidden="true">{ico("pessoa-mais")}</span><div><b>Joana Alves Souza</b><small>Mãe · representante legal · CPF {CPF_JOANA} · da ficha do cliente</small></div>'
           f'<a class="btn btn-sec btn-compacto" href="{FICHA_CL}">{ico("lapis", "ico ico-s")}Mudar na ficha</a></div></div>'
           + '<div class="c6">' + aviso('info', 'Pedro tem 12 anos: ele é representado.',
                                        'Só a mãe assina, em nome dele, os três documentos. Dos 16 aos 17 anos, ele seria assistido e os dois assinariam. '
                                        'Adulto sob curatela: assina o curador, e o termo de curatela vai junto.') + '</div>')
    r = (contrato_card('PS', 'Pedro Henrique Alves Souza', 'C-2026-034 · Alimentos · em elaboração')
         + rep + documentos_fs(contrato_sub='Contratante: Joana, em nome de Pedro. Com o objeto, as 2 condições de honorário e as cláusulas do escritório.')
         + outorgados_fs([('Marina Ribeiro', 'Responsável pelo contrato', True, None), ('Larissa Costa', 'Advogada no contrato', True, None), ('Felipe Matos', 'Não está no contrato', False, None)])
         + poderes_fs(['Receber e dar quitação', 'Firmar acordo (transigir)', 'Substabelecer']) + data_campo())
    ass = 'PEDRO HENRIQUE ALVES SOUZA<br>representado por Joana Alves Souza'
    contrato_p = (f'<div class="pe-papel">{timbre()}<h3>CONTRATO DE HONORÁRIOS</h3><p style="text-align:center;margin-top:-8px">nº <{C}>C-2026-034</mark></p>'
                  f'<p><b>CONTRATANTE:</b> {qual_pedro()}.</p><p class="pe-mais">{ico("doc")}<span>Continua com a contratada, as condições e as cláusulas do escritório (v2).</span></p></div>')
    pain = [
        ('c', 'Contrato', 0, contrato_p),
        ('p', 'Procuração', 0, papel_procuracao(qual_pedro(), ['Marina Ribeiro', 'Larissa Costa'], ['Receber e dar quitação', 'Firmar acordo (transigir)', 'Substabelecer'], assina=ass)),
        ('d', 'Declaração', 0, papel_declaracao(qual_pedro(), assina=ass)),
    ]
    pe = pe_gerar('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.', 'Nenhum dado faltando. Em todos, Joana assina por Pedro.', 'Gerar 3 documentos')
    return pagina_gerar(r, previa(pain, 'p'), pe)


def gerar_novo():
    r = ('<div class="c6">' + aviso('info', 'Estes documentos já foram gerados hoje, às 15h10 (versão 1).',
                                  'Desde então, mudou na ficha de Benedito: o RG, completado por Diego Almeida às 15h52. Gerar de novo cria a versão 2 dos documentos marcados. '
                                  'A versão 1 fica guardada e continua para baixar. Nenhum assinado foi anexado ainda.', icone='historico') + '</div>'
         + contrato_card('BL', 'Benedito Souza Lima', 'C-2026-033 · Aposentadoria por idade · em elaboração', 'Vieram marcadas as mesmas escolhas da versão 1.')
         + documentos_fs() + outorgados_fs(ADV_BEN) + poderes_fs(POD_BEN, OUTRO_BEN) + data_campo())
    pe = pe_gerar('<b>Vão sair 3 arquivos .docx, versão 2</b>.', 'Nenhum dado faltando. A versão 1, com [RG: falta], fica guardada.', 'Gerar a versão 2', f'{U}ficha-documentos')
    return pagina_gerar(r, previa(paineis_ben(rg=True), 'p'), pe)


# ---------------------------------------------------------------- 4. resultado
def gerado():
    def a(n, arq, kb):
        return (f'<li><span class="ct-ci">{ico("doc")}</span><div><b>{n}</b><small>{arq} · Word · {kb}</small></div>'
                f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> {n.lower()}</span></button></li>')
    corpo = (f'<ul class="ct-arquivos">'
             + a('Contrato de honorários', 'contrato-honorarios-benedito-lima.docx', '48 KB')
             + a('Procuração', 'procuracao-benedito-lima.docx', '32 KB')
             + a('Declaração de hipossuficiência', 'declaracao-benedito-lima.docx', '18 KB')
             + '</ul><div class="pe-pronto">'
             + aviso('atencao', 'O RG de Benedito saiu como [RG: falta] nos três.', 'Preencha à mão ou no Word. Ou complete a ficha e gere de novo: a versão 1 fica guardada.', icone='pena',
                     acoes=f'<a class="btn btn-sec" href="{FICHA_CL}">{ico("lapis")}Completar na ficha</a>')
             + f'<p class="pe-cuidado" style="margin:0">{ico("balanca")}<span><b>Você revisa antes de imprimir.</b> O T3jus preencheu os modelos com os dados do cadastro e do contrato. Ele não confere o conteúdo jurídico.</span></p>'
             + f'<ol class="pe-proximo" aria-label="Próximos passos"><li><span><b>Revise no Word</b> os dados marcados, a concordância e as cláusulas.</span></li>'
             f'<li><span><b>Imprima</b> no timbrado. O arquivo já sai com ele.</span></li>'
             f'<li><span><b>Colha as assinaturas:</b> Benedito nos três; no contrato, também quem assina pelo escritório.</span></li>'
             f'<li><span><b>Anexe os assinados.</b> O contrato assinado ativa o contrato e manda a programação dos recebimentos ao Financeiro.</span></li></ol>'
             f'<div class="pe-acoes-res"><a class="btn btn-sec" href="{U}anexar">{ico("enviar")}Anexar os assinados</a>'
             f'<a class="btn btn-fantasma" href="{U}ficha-documentos">{ico("dir")}Ir para o contrato C-2026-033</a></div></div>'
             + reserva('Quando existir, o botão para mandar assinar fica aqui. Por enquanto, imprime-se, assina-se e anexa-se o assinado.'))
    pri = (f'<section class="folha" aria-labelledby="t-gf"><div class="folha-cab"><div><h2 id="t-gf">3 documentos prontos</h2>'
           f'<p class="sub">C-2026-033 · Benedito Souza Lima · versão 1 · gerados agora por Marina Ribeiro</p></div>'
           f'<div class="acoes"><button class="btn btn-pri" type="button" data-foco>{ico("baixar")}Baixar todos (.zip)</button></div></div>{corpo}</section>')
    usado = (f'<dl class="hn-dl">'
             f'<div><dt>Contrato</dt><dd>C-2026-033</dd></div>'
             f'<div><dt>Modelos</dt><dd>Contrato v2, do escritório<br>Procuração e declaração, padrão T3jus</dd></div>'
             f'<div><dt>Outorgados</dt><dd>Marina Ribeiro, OAB/SP nº 214.538<br>Felipe Matos, OAB/SP nº 287.104 e OAB/RJ nº 245.880-S</dd></div>'
             f'<div><dt>Poderes especiais</dt><dd>Receber e dar quitação, firmar acordo, substabelecer e representar perante o INSS</dd></div>'
             f'<div><dt>Cidade e data</dt><dd>{CIDADE_DATA}</dd></div>'
             f'<div><dt>Saiu marcado</dt><dd>RG de Benedito</dd></div></dl>'
             f'<p class="hn-pe">{ico("historico")}<span>Fica guardado com os arquivos, como estava hoje, mesmo que a Equipe ou a ficha mudem depois.</span></p>')
    lat = folha('t-us', 'O que foi usado', usado, pequeno=True)
    cab = cab_pr('Documentos gerados', voltar=(f'{U}procuracoes', 'Procurações e modelos'), sobre='Procurações e modelos')
    t = toast('3 documentos gerados.', 'Ficaram em Procurações e modelos e na ficha do contrato C-2026-033, aba Documentos.')
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{pri}</div><aside class="hn-col" aria-label="O que foi usado">{lat}</aside></div></div>{t}'


# ---------------------------------------------------------------- 5. ficha do contrato · aba Documentos e anexar
def abas_ficha(base_contrato):
    a = (f'<a data-aba="contrato" href="{base_contrato}">Contrato</a><a data-aba="recebimentos" href="{U_CT}contrato-recebimentos">Recebimentos</a>'
         f'<a data-aba="documentos" href="{U}ficha-documentos">Documentos<span class="q">3</span></a>')
    return f'<nav class="abas" aria-label="Seções do contrato">{a}</nav>'


def doc_linha(nome, arq, curto, situacao, v1=True, assinado=False):
    if assinado:
        bts = (f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar o assinado<span class="sr">: {curto}</span></button>'
               f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar o .docx<span class="sr">: {curto}</span></button>')
    else:
        bts = (f'<a class="btn btn-pri btn-compacto" href="{U}anexar">{ico("enviar", "ico ico-s")}Anexar o assinado<span class="sr">: {curto}</span></a>'
               f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> {curto}</span></button>')
    vers = ''
    if v1:
        vers = (f'<details class="pr-vers"><summary>{ico("historico", "ico ico-s")}Versão anterior (1)</summary><ol>'
                f'<li><b>v1</b><span>hoje, 15h10 · Marina Ribeiro · com [RG: falta] · guardada</span>'
                f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> a v1: {curto}</span></button></li></ol></details>')
    return (f'<li><div class="pr-doc"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><b>{nome}<span class="pr-v">v2</span></b>'
            f'<small>{arq} · hoje, 16h02 · Marina Ribeiro</small>{situacao}</div><div class="pe-bts">{bts}</div></div>{vers}</li>')


def ficha_documentos(anexado=False):
    if anexado:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p>'
             f'<div class="hn-dir-linha"><p class="grande">10/12</p>{selo("ativo", "R$ 666,67")}</div>'
             f'<p class="hn-oque"><b>Parcela 1 de 3</b><br>no Financeiro, em A receber</p>'
             f'<a class="btn btn-pri" href="{U_CT}contrato-recebimentos">{ico("carteira")}Ver recebimentos</a></section>')
        sit = '<span class="selo selo-ativo">Ativo</span>'
    else:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-px"><p class="sobretitulo" id="t-px">Próximo passo</p>'
             f'<p class="grande" style="font-size:30px">Assinatura</p>'
             f'<p class="hn-oque"><b>Os 3 documentos esperam o assinado.</b><br>Anexar o contrato assinado ativa o contrato e manda a programação ao Financeiro.</p>'
             f'<div class="hn-dir-acoes"><a class="btn btn-pri" href="{U}anexar">{ico("enviar")}Anexar os assinados</a></div></section>')
        sit = '<span class="selo selo-ativo">Em elaboração</span>'
    cab = ficha_cab_c('C-2026-033', 'Benedito Souza Lima', sit, 'Aposentadoria por idade', d)
    if anexado:
        s_c = sel('ok', 'Assinado em 21/11 · ativou o contrato', 'check')
        s_o = sel('ok', 'Assinada em 21/11', 'check')
        docs = (doc_linha('Contrato de honorários', 'contrato-assinado-benedito.pdf · PDF · 1,2 MB', 'o contrato', s_c, assinado=True)
                + doc_linha('Procuração', 'procuracao-assinada-benedito.jpg · foto · 2,4 MB', 'a procuração', s_o, assinado=True)
                + doc_linha('Declaração de hipossuficiência', 'declaracao-assinada-benedito.pdf · PDF · 0,4 MB', 'a declaração', s_o, assinado=True))
        sub = '3 documentos · todos assinados'
    else:
        f = sel('atencao', 'Falta anexar o assinado', 'relogio')
        docs = (doc_linha('Contrato de honorários', 'contrato-honorarios-benedito-lima.docx', 'o contrato', f)
                + doc_linha('Procuração', 'procuracao-benedito-lima.docx', 'a procuração', f)
                + doc_linha('Declaração de hipossuficiência', 'declaracao-benedito-lima.docx', 'a declaração', f))
        sub = '3 documentos · versão 2 · falta anexar os assinados'
    acoes = (f'<a class="btn btn-sec" href="{U}gerar-novo">{ico("reenviar")}Gerar de novo</a>')
    lista = folha('t-dc', 'Documentos deste contrato', f'<ul class="pr-docs">{docs}</ul>'
                  f'<p class="hn-pe">{ico("historico")}<span>Gerar de novo guarda a versão anterior. O assinado anexado continua valendo mesmo depois de uma versão nova.</span></p>',
                  sub, acoes, extra=' style="overflow:hidden"')
    if anexado:
        assin = (f'<dl class="hn-dl"><div><dt>Assinado em</dt><dd>21/11/2026</dd></div><div><dt>Registrado por</dt><dd>Marina Ribeiro</dd></div>'
                 f'<div><dt>Arquivo assinado</dt><dd><a href="#">contrato-assinado-benedito.pdf</a></dd></div></dl>')
    else:
        assin = (f'<p class="hn-pe" style="border-top:0;padding-top:0">{ico("pena")}<span>Anexar o <b>contrato</b> assinado é o mesmo que registrar a assinatura na aba Contrato: '
                 f'o contrato fica ativo e a programação vai ao Financeiro. A procuração e a declaração só ficam guardadas.</span></p>')
    lat = (folha('t-as', 'Assinatura', assin + reserva('O lugar fica reservado. Por enquanto, imprime-se, assina-se e anexa-se o assinado.'), pequeno=True)
           + folha('t-ad', 'Advogados nos documentos', adv_lista().replace('<li><span class="av-p forte" aria-hidden="true">LC</span><div><strong>Larissa Costa</strong><small>OAB/SP nº 401.226</small></div></li>', ''),
                   'Os do contrato, com as inscrições escolhidas.', pequeno=True))
    t = ''
    if anexado:
        t = toast('Contrato C-2026-033 ativo.', 'Os 3 assinados foram anexados. A programação foi ao Financeiro: 3 parcelas, a primeira de R$ 666,67 em 10/12/2026.')
    return f'<div class="hn">{cab}{abas_ficha(U_CT + "criado")}<div class="hn-grade"><div class="hn-col">{lista}</div><aside class="hn-col" aria-label="Sobre a assinatura">{lat}</aside></div></div>{t}'


def j_anexar(erro=False):
    def arq(id_, rot, nome=None, meta='', er=''):
        e = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{er}</p>' if er else ''
        foco = ' data-foco' if (er and erro) or (not erro and id_ == 'ax-c-arq') else ''
        d = f' aria-describedby="{id_}-er {id_}-aj"' if er else f' aria-describedby="{id_}-aj"'
        if nome:
            info = f'<div><b>{nome}</b><small>{meta}</small></div>'
            bt = f'<button class="btn btn-sec btn-compacto" type="button" id="{id_}"{d}{foco}>{ico("enviar", "ico ico-s")}Trocar arquivo<span class="sr">: {rot.lower()}</span></button>'
        else:
            info = '<div><b>Nenhum arquivo</b><small>Ainda não assinado? Deixe em branco.</small></div>'
            bt = f'<button class="btn btn-sec btn-compacto" type="button" id="{id_}"{d}{foco}>{ico("enviar", "ico ico-s")}Escolher arquivo<span class="sr">: {rot.lower()}</span></button>'
        return (f'<div class="campo"><p class="pe-rot" id="{id_}-r">{rot}</p><div class="pe-arq{" erro" if er else ""}" role="group" aria-labelledby="{id_}-r">'
                f'<span class="pe-ci" aria-hidden="true">{ico("doc")}</span>{info}{bt}</div>'
                f'<p class="ajuda" id="{id_}-aj">PDF ou foto, até 10 MB. Várias páginas: um PDF só ou até 10 fotos.</p>{e}</div>')
    def data(id_, v, er=''):
        return campo(id_, 'Assinado em', v, '', im='numeric', erro=er)
    ec = 'Este arquivo é o .docx gerado, não o assinado. Anexe o PDF ou a foto do papel assinado.' if erro else ''
    ep = 'Confira a data: ela não pode ser depois de hoje (21/11/2026).' if erro else ''
    c = (f'<fieldset class="pr-ativa{" pr-erro" if erro else ""}"><legend>Contrato de honorários <small>v2 · contrato-honorarios-benedito-lima.docx</small></legend>'
         + '<div class="pr-anx-l">' + (arq('ax-c-arq', 'Contrato assinado', 'contrato-honorarios-benedito-lima.docx', 'Word · 48 KB', ec) if erro else arq('ax-c-arq', 'Contrato assinado', 'contrato-assinado-benedito.pdf', 'PDF · 4 páginas · 1,2 MB')) + data('ax-c-data', HOJE) + '</div>'
         + f'<p class="pr-ativa-txt">{ico("pena")}<span><b>Anexar o contrato assinado registra a assinatura.</b> O contrato C-2026-033 fica ativo e a programação dos recebimentos vai ao Financeiro: '
         f'3 parcelas de R$ 2.000,00 (2 de R$ 666,67 e 1 de R$ 666,66), a primeira em 10/12/2026. É o mesmo que “Registrar assinatura”, na aba Contrato.</span></p></fieldset>')
    p = (f'<fieldset{" class=pr-erro" if erro else ""}><legend>Procuração <small>v2</small></legend>'
         + '<div class="pr-anx-l">' + arq('ax-p-arq', 'Procuração assinada', 'procuracao-assinada-benedito.jpg', 'Foto · 2,4 MB') + data('ax-p-data', '22/11/2026' if erro else HOJE, ep) + '</div>'
         + '<p class="pr-nao">Fica guardada no contrato. Não muda a situação do contrato.</p></fieldset>')
    dc = (f'<fieldset><legend>Declaração de hipossuficiência <small>v2</small></legend>'
          + '<div class="pr-anx-l">' + arq('ax-d-arq', 'Declaração assinada', 'declaracao-assinada-benedito.pdf', 'PDF · 1 página · 0,4 MB') + data('ax-d-data', HOJE) + '</div>'
          + '<p class="pr-nao">Fica guardada no contrato. O que ainda não foi assinado pode ficar em branco e ser anexado depois.</p></fieldset>')
    res = aviso('urgencia', 'Nada foi anexado. Falta acertar 2 pontos.',
                '<a href="#ax-c-arq">O contrato veio em .docx</a> · <a href="#ax-p-data">A data da procuração é depois de hoje</a>. O contrato continua em elaboração.') if erro else ''
    corpo = res + f'<div class="pr-anx">{c}{p}{dc}</div>'
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Anexar e ativar o contrato</button>')
    j = janela('j-anexar', 'C-2026-033 · Benedito Souza Lima', 'Anexar os assinados',
               'Um arquivo por documento, com a data em que foi assinado. Anexe só os que já estão assinados.', corpo, pe, abrir=True)
    return j.replace('class="janela"', 'class="janela pr-larga"', 1)


# ---------------------------------------------------------------- 6. sem a área
def sem_area():
    e = estado('Esta área não está liberada para você',
               'Contratos, com os contratos de honorários, as procurações e os modelos, só aparece para quem a sócia dona liberou. Se você precisa dela, fale com Marina Ribeiro.',
               'cadeado', acoes=f'<a class="btn btn-pri" href="#">{ico("inicio")}Ir para o Início</a>', codigo='AREA_NAO_LIBERADA', h='h1', moldura=False)
    return f'<section class="folha" aria-label="Acesso" style="overflow:hidden">{e}</section>'


# ---------------------------------------------------------------- hipótese a validar (faixa discreta no alto de cada estado)
HIP = (f'<p class="pr-hip">{ico("ajuda")}<span><b>Hipótese a validar (CH-08).</b> Desenho para conversar com os escritórios piloto antes de programar.</span></p>')


def com_hip(corpo):
    return HIP + corpo


# ---------------------------------------------------------------- estados
T = ''
A = lambda sec, trilha, titulo, **k: dict(area='contratos', secao=sec, atual='contratos', trilha=trilha, titulo=titulo, **k)
PM = A('Procurações e modelos', 'Contratos|Procurações e modelos', 'Procurações e modelos')
MO = A('Procurações e modelos', 'Contratos|Procurações e modelos|Modelos de documento', 'Modelos de documento')
GE = A('Procurações e modelos', 'Contratos|Procurações e modelos|Gerar documentos', 'Gerar documentos')
FI = A('Contratos', 'Contratos|C-2026-033', 'C-2026-033', aba='documentos')

T += tpl('procuracoes', com_hip(pagina_lista()), **PM)
T += tpl('procuracoes-vazio', com_hip(pagina_vazia()), **PM)
T += tpl('modelos', com_hip(pagina_modelos()) + j_modelo(), **MO)
T += tpl('modelo-enviar', com_hip(pagina_modelos()) + j_modelo(abrir=True), **MO)
T += tpl('modelo-erro', com_hip(pagina_modelos()) + j_modelo(erro=True), **MO)
T += tpl('gerar-escolher', com_hip(gerar_escolher()), **GE)
T += tpl('gerar', com_hip(gerar()), **GE)
T += tpl('gerar-pj', com_hip(gerar_pj()), **GE)
T += tpl('gerar-menor', com_hip(gerar_menor()), **GE)
T += tpl('gerar-erro', com_hip(gerar_erro()), **GE)
T += tpl('gerado', com_hip(gerado()), **A('Procurações e modelos', 'Contratos|Procurações e modelos|Documentos gerados', 'Documentos gerados'))
T += tpl('ficha-documentos', com_hip(ficha_documentos()), **FI)
T += tpl('anexar', com_hip(ficha_documentos()) + j_anexar(), **FI)
T += tpl('anexar-erro', com_hip(ficha_documentos()) + j_anexar(erro=True), **FI)
T += tpl('anexado', com_hip(ficha_documentos(anexado=True)), **FI)
T += tpl('gerar-novo', com_hip(gerar_novo()), **GE)
T += tpl('sem-contratos', sem_area(), quem='juridico', atual='nenhum', trilha='Contratos', titulo='Contratos')

URL = {'Contratos': U_CT + 'contratos', 'Honorários': U_CT + 'honorarios', 'Procurações e modelos': U + 'procuracoes'}
out = montar('procuracoes.html', 'Procurações e modelos', 'Contratos › Procurações e modelos: contrato, procuração e declaração gerados em .docx no timbrado, modelos do escritório e os assinados.',
             '{"estado":"procuracoes","atual":"contratos"}', T, barras('contratos', URL), CSS + CSS_PE + CSS_PR)
out = out.replace('</body>', SCRIPT_ABAS + '\n</body>', 1)
open(os.path.join(SAIDA, 'procuracoes.html'), 'w', encoding='utf-8').write(out)
print('procuracoes ok', T.count('<template data-est='), 'estados')
