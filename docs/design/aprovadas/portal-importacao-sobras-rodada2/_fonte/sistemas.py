# Portal · Clientes › Importar dados de outros sistemas (F3.56, VA-05): Astrea (backup em .xlsx) e ADVBOX
# (conexão pela API, só leitura, ou planilha exportada), caindo no fluxo aprovado da importação de planilha.
# Base sem mudança: comum.py (Portal v1), pecas.py, clientes.py, contratos.py e importacao.py (Importar planilha
# aprovado). Este arquivo carrega as definições do importacao.py (sem gerar o HTML dele) e acrescenta as peças
# novas, com prefixo is- (importar de sistemas).
# Uso: python3 sistemas.py <pasta-saida>
import sys, os, html

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'


def _carregar(arq, corte):
    src = open(os.path.join(AQUI, arq), encoding='utf-8').read()
    src = src[:src.index(corte)]
    ns = {'__name__': 'base_' + arq[:-3], '__file__': os.path.join(AQUI, arq)}
    argv = sys.argv[:]
    exec(compile(src, arq, 'exec'), ns)
    sys.argv = argv
    return ns


IM = _carregar('importacao.py', "# ---------------------------------------------------------------- estados\nT = ''")
# Os links das peças aprovadas apontam para a importação de planilha aprovada, que mora ao lado.
IM['U'] = '../portal-importacao/importacao.html?estado='
for _k, _v in IM.items():
    if not _k.startswith('__') and _k not in ('SAIDA', 'AQUI', '_carregar'):
        globals()[_k] = _v
H = html.escape
CL = IM['CL']
cpf, cnpj = CL['cpf'], CL['cnpj']

S = 'sistemas.html?estado='
PLAN = IM['U']
JUR = '../portal-juridico/juridico.html?estado='
HOJE = '21/11/2026'
PRAZO_S = '28/11'
BKP = 'backup-astrea-21-11-2026.xlsx'


def cnj(seq, ano, j, tr, orig):
    """Número CNJ com os dígitos verificadores certos (módulo 97)."""
    n = f'{seq:07d}'
    r = int(f'{n}{ano}{j}{tr:02d}{orig:04d}00') % 97
    dd = 98 - r
    return f'{n}-{dd:02d}.{ano}.{j}.{tr:02d}.{orig:04d}'


# ---------------------------------------------------------------- dados fictícios (dígitos válidos)
CPF_BENEDITO = cpf('462803157')
CPF_CRISTINA = cpf('590714236')
CPF_ANT = CL['CPF_ANT']
CNPJ_ROTA = cnpj('184530270001')
CPF_EDITE_OK = cpf('273915046')
CPF_EDITE_ERR = CPF_EDITE_OK[:-1] + str((int(CPF_EDITE_OK[-1]) + 5) % 10)
CPF_OSVALDO = cpf('815260943')
CPF_MARCIO = cpf('734190285')
N1 = cnj(1004417, 2025, 5, 2, 61)
N2 = cnj(5012398, 2024, 4, 3, 6100)
N3 = cnj(1002210, 2026, 8, 26, 100)
N4 = cnj(1000731, 2025, 5, 2, 3)
N4_ERR = N4[:9] + str((int(N4[9]) + 3) % 10) + N4[10:]
N5 = cnj(5003389, 2023, 4, 3, 6102)

# ---------------------------------------------------------------- CSS novo (prefixo is-)
CSS_IS = r"""
/* ==========================================================================
   Portal · Clientes › Importar de outros sistemas (F3.56, VA-05). Prefixo is-.
   Só pares do contraste.md. O resto é a importação de planilha aprovada (im-).
   ========================================================================== */
.explica.is-explica{padding-bottom:84px}
/* Escolher a origem */
.is-origens{border:0;margin:0;padding:0 24px 20px;min-width:0}
.is-origens legend{padding:0;font-weight:500;margin-bottom:10px}
.is-ori-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.is-ori{position:relative;display:grid;grid-template-rows:auto auto 1fr auto;gap:8px;padding:18px 18px 16px;border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:var(--papel);cursor:pointer;min-width:0}
.is-ori:hover{border-color:var(--vinho-4)}
.is-ori:has(input:checked){border-color:var(--vinho);box-shadow:inset 0 -3px 0 var(--vinho);background:#FCF8F5}
.is-ori:has(input:focus-visible){outline:3px solid var(--foco);outline-offset:2px}
.is-ori-t{display:flex;align-items:center;gap:12px}
.is-ori-t input{flex:none;width:22px;height:22px;margin:0;accent-color:var(--vinho)}
.is-ori-t .is-ci{flex:none;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho);margin-left:auto;order:3}
.is-ori-t .is-ci{display:none}
.is-ori-t>span:last-child{min-width:0;flex:1}
.is-ori-t strong{display:block;font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.2}
.is-ori-t small{display:block;font-size:12px;color:var(--texto-2)}
.is-ori>p{font-size:13px;line-height:1.5;color:var(--texto)}
.is-ori ul{list-style:none;margin:0;padding:0;display:grid;gap:4px;align-content:start}
.is-ori li{display:flex;gap:8px;font-size:13px;line-height:1.45}
.is-ori li .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.is-ori li.is-nao .ico{color:var(--vinho-4)}
.is-ori li.is-nao{color:var(--texto-2)}
.is-ori-pe{font-size:12px;color:var(--texto-2);padding-top:8px;border-top:1px dashed var(--divisor);line-height:1.45}
.is-outro{display:flex;gap:10px;align-items:flex-start;margin:0 24px 20px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.is-outro .ico{flex:none;color:var(--vinho);margin-top:1px}
.is-outro b{font-weight:600}

/* Selo da origem (Planilha, Astrea, ADVBOX): sempre escrito, nunca só cor */
.is-orig{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;background:var(--ambar-3);color:var(--vinho-escuro);font-size:12px;font-weight:600;white-space:nowrap}
.is-orig .ico{width:14px;height:14px;color:var(--vinho)}
.is-orig-l{background:var(--sal-2);color:var(--vinho)}

/* Passo a passo para pedir o backup */
.is-pp{list-style:none;margin:0;padding:0 24px 8px;display:grid;gap:0;counter-reset:pp}
.is-pp>li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:14px 0;border-top:1px solid var(--divisor)}
.is-pp>li:first-child{border-top:0;padding-top:4px}
.is-pp .disco{--d:36px;--f:18px;--c:var(--vinho);color:var(--papel)}
.is-pp b{display:block;font-weight:500;line-height:1.4}
.is-pp p{font-size:13px;color:var(--texto-2);line-height:1.5;margin-top:2px}
.is-menu{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin-top:8px;padding:6px 10px;border-radius:8px;background:var(--sal-2);font-size:13px;color:var(--tinta);line-height:1.4}
.is-menu span{font-weight:500}
.is-menu i{font-style:normal;color:var(--texto-2)}
.is-email{display:grid;grid-template-columns:36px minmax(0,1fr);gap:10px;align-items:center;margin-top:8px;padding:10px 12px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:#FCF8F5;font-size:13px;line-height:1.4}
.is-email .ico{width:22px;height:22px;color:var(--vinho-4);justify-self:center}
.is-email b{font-weight:500}
.is-email small{display:block;font-size:12px;color:var(--texto-2)}
.is-nota{font-size:12px;color:var(--texto-2);line-height:1.5;padding:4px 24px 18px}

/* O que vem de cada sistema */
.is-vem{list-style:none;margin:0;padding:0 24px 18px}
.is-vem li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:9px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.is-vem li:first-child{border-top:0}
.is-vem .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.is-vem li.is-nao .ico{color:var(--vinho-4)}
.is-vem b{font-weight:500}
.is-vem small{display:block;font-size:12px;color:var(--texto-2)}

/* As abas do backup */
.is-abas-t td{vertical-align:middle}
.is-aba{display:flex;align-items:center;gap:10px;min-width:0}
.is-aba .is-ci{flex:none;width:34px;height:34px;border-radius:8px;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.is-aba b{font-weight:500;display:block}
.is-aba small{display:block;font-size:12px;color:var(--texto-2)}
.is-abas-t tr.im-ign .is-ci{background:var(--sal);color:var(--texto-2)}
.is-abas-t tr.is-nova td{background:#FDFAF7}
.is-abas-t tr.is-nova td:first-child{box-shadow:inset 3px 0 0 var(--ambar)}
.is-abas-t .campo{margin:0}
.is-arq-b{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 24px 16px;font-size:13px;color:var(--texto-2)}
.is-arq-b b{color:var(--texto);font-weight:500}
.is-escolha{border:0;margin:0;padding:16px 24px 18px;border-top:1px solid var(--divisor);min-width:0}
.is-escolha legend:not(.sr){padding:0;font-weight:500;margin-bottom:4px;float:left;width:100%}
.is-escolha>p{clear:both;font-size:13px;color:var(--texto-2);margin-bottom:10px;line-height:1.5}
.is-escolha .im-ops .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:14px;margin:0;background:var(--papel);align-items:flex-start}
.is-escolha .im-ops .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.is-escolha .im-ops .opcao small{line-height:1.45}

/* Abas da prévia e das colunas: Clientes, Casos, Financeiro */
.is-tabs{display:flex;gap:4px;padding:0 24px;border-bottom:1px solid var(--borda-folha);overflow:visible;flex-wrap:wrap}
.is-tabs a{position:relative;display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 14px;text-decoration:none;color:var(--texto-2);font-weight:500;font-size:14px}
.is-tabs a:hover{color:var(--vinho)}
.is-tabs a[aria-current="page"]{color:var(--vinho)}
.is-tabs a[aria-current="page"]::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--vinho)}
.is-tabs .q{font-size:11px;font-weight:600;background:var(--sal-2);color:var(--vinho-2);border-radius:10px;padding:1px 7px}
.is-tabs .is-pend{font-size:11px;font-weight:600;background:#F7DDE6;color:var(--vinho-escuro);border-radius:10px;padding:1px 7px}

/* Token e conexão */
.is-token .entrada{font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em}
.is-token-l{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
.is-token-l .campo{flex:1 1 320px;min-width:0}
.is-token-l .btn{margin-top:27px}
.is-faz{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.is-faz li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:13px;line-height:1.5}
.is-faz .ico{width:18px;height:18px;color:var(--vinho);margin-top:2px}
.is-faz li.is-nao .ico{color:var(--vinho-4)}
.is-faz b{font-weight:600}
.is-cnx{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0}
.is-cnx div{padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);min-width:0}
.is-cnx dt{font-size:12px;color:var(--texto-2)}
.is-cnx dd{margin:0;font-family:var(--serifa);font-size:24px;font-weight:500;color:var(--vinho);line-height:1.2}
.is-ler{display:grid;gap:8px}
.is-ler .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px 14px;margin:0;background:var(--papel);align-items:flex-start}
.is-ler .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.is-ler .opcao small{line-height:1.45}
.is-tempo{display:grid;grid-template-columns:52px minmax(0,1fr);gap:14px;align-items:center;padding:14px 16px;border-radius:var(--raio-g);background:var(--ambar-3)}
.is-tempo .disco{--d:52px;--f:20px;--c:var(--vinho);color:var(--papel)}
.is-tempo b{font-weight:600}
.is-tempo p{font-size:13px;line-height:1.5}

/* Leitura em segundo plano */
.is-le{list-style:none;margin:0;padding:0;display:grid;gap:0;border:1px solid var(--borda-folha);border-radius:var(--raio);overflow:hidden}
.is-le li{display:grid;grid-template-columns:28px minmax(0,1fr) minmax(0,1.2fr);gap:12px;align-items:center;padding:12px 14px;border-top:1px solid var(--divisor);font-size:13px}
.is-le li:first-child{border-top:0}
.is-le .ico{width:20px;height:20px;color:var(--vinho)}
.is-le li.is-espera .ico{color:var(--vinho-4)}
.is-le b{font-weight:500;display:block}
.is-le small{display:block;font-size:12px;color:var(--texto-2)}
.is-le .im-barra{height:8px}
.is-le li.is-espera{color:var(--texto-2)}
.is-pausa{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raio);border:1px dashed var(--vinho-4);font-size:13px;line-height:1.5;color:var(--texto-2)}
.is-pausa .ico{flex:none;color:var(--vinho-4);margin-top:1px}
.is-pausa b{color:var(--texto);font-weight:500}

/* Prévia: o caso aberto e o financeiro */
.is-caso-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.is-nao-vem{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.is-nao-vem .ico{flex:none;color:var(--vinho);margin-top:1px}
.is-nao-vem b{font-weight:600}
.is-fin-g{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:14px 24px 8px;border-top:1px solid var(--divisor);display:flex;align-items:center;gap:10px}
.is-fin-g .ico{color:var(--vinho-4)}
.is-valor{font-weight:500;white-space:nowrap}
.is-info{color:var(--texto-2)}

@media (max-width:760px){
  .is-origens{padding:0 16px 16px}
  .is-ori-g{grid-template-columns:1fr}
  .is-outro{margin:0 16px 16px}
  .is-pp{padding:0 16px 8px}
  .is-pp>li{grid-template-columns:36px minmax(0,1fr);gap:12px}
  .is-nota{padding:4px 16px 16px}
  .is-vem{padding:0 16px 14px}
  .is-arq-b{padding:0 16px 14px}
  .is-escolha{padding:14px 16px 16px}
  .is-tabs{padding:0 8px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
  .is-tabs a{flex-direction:column;justify-content:center;gap:2px;padding:6px 4px;font-size:13px;text-align:center;min-height:56px}
  .is-abas-t td:not(:first-child){display:block!important;text-align:left!important}
  .is-abas-t td:not(:first-child)::before{display:block;max-width:none!important;margin-bottom:4px}
  .is-abas-t tr.is-nova{border-color:var(--ambar);box-shadow:inset 3px 0 0 var(--ambar)}
  .is-abas-t tr.is-nova td{background:transparent!important;box-shadow:none!important}
  .is-abas-t td .campo{width:100%}
  .is-token-l .btn{margin-top:0;width:100%}
  .is-cnx{grid-template-columns:1fr 1fr}
  .is-le li{grid-template-columns:24px minmax(0,1fr)}
  .is-le li>:nth-child(3){grid-column:1/-1}
  .is-fin-g{padding:14px 16px 8px}
  .is-tempo{grid-template-columns:44px minmax(0,1fr)}
  .is-tempo .disco{--d:44px;--f:17px}
}
"""

# ---------------------------------------------------------------- peças
ORIG = {'planilha': ('Planilha', 'doc'), 'astrea': ('Astrea · backup', 'enviar'), 'advbox': ('ADVBOX · conexão', 'link'), 'advbox-pl': ('ADVBOX · planilha', 'doc')}


def orig(k, leve=False):
    n, i = ORIG[k]
    return f'<span class="is-orig{" is-orig-l" if leve else ""}">{ico(i)}<span class="sr">Origem: </span>{n}</span>'


def is_passos(atual, nomes, hrefs, escolhas=('', '', '', '')):
    li = ''
    for i, nome in enumerate(nomes, 1):
        sub = f'<small>{escolhas[i - 1]}</small>' if escolhas[i - 1] else ''
        n = f'<span class="im-n" aria-hidden="true">{i}</span>'
        txt = f'<span style="min-width:0"><b>{nome}</b>{sub}</span>'
        if i < atual:
            li += f'<li class="feito"><a href="{hrefs[i - 1]}">{n}{txt}<span class="sr"> (feito; voltar a este passo)</span></a></li>'
        elif i == atual:
            li += f'<li aria-current="step"><span class="im-pi">{n}{txt}<span class="sr"> (passo atual)</span></span></li>'
        else:
            li += f'<li><span class="im-pi">{n}{txt}</span></li>'
    return f'<ol class="im-passos" aria-label="Passo {min(atual, 4)} de 4">{li}</ol>'


P_AST = (['O backup', 'Abas e colunas', 'A prévia', 'Importar'], [S + 'astrea-pedir', S + 'astrea-abas', S + 'previa-sistema', S + 'confirmar-sistema'])
P_ADV = (['A conexão', 'Os valores', 'A prévia', 'Importar'], [S + 'advbox-token', S + 'advbox-valores', S + 'previa-sistema', S + 'confirmar-sistema'])
P_ADVPL = (['O arquivo', 'As colunas', 'A prévia', 'Importar'], [S + 'advbox-planilha', PLAN + 'colunas', PLAN + 'previa', PLAN + 'confirmar'])


def passos_ast(atual, esc=('', '', '', '')):
    return is_passos(atual, *P_AST, esc)


def passos_adv(atual, esc=('', '', '', '')):
    return is_passos(atual, *P_ADV, esc)


def cab_is(titulo, lede='', o=''):
    l = f'<p class="lede">{lede}</p>' if lede else ''
    s = f'<p style="margin-top:12px">{o}</p>' if o else ''
    return f'<div class="pt-cab"><div><p class="sobretitulo">Clientes · Importar dados</p><h1>{titulo}</h1><span class="fio" aria-hidden="true"></span>{l}{s}</div></div>'


def explica_is(nome='o sistema'):
    return ('<section class="explica campo-ambar is-explica" aria-labelledby="t-ex"><p class="sobretitulo">Como funciona</p><h2 id="t-ex">Nada entra até você conferir.</h2><ul>'
            f'<li>{ico("enviar")}<span><b>1. Os dados.</b> Do {nome}, pelo arquivo ou pela conexão. O T3jus só lê.</span></li>'
            f'<li>{ico("link")}<span><b>2. Ligar.</b> As colunas e os valores já vêm ligados pelo modelo do {nome}. Você confere e ajusta.</span></li>'
            f'<li>{ico("olho")}<span><b>3. A prévia.</b> Clientes, casos e financeiro, cada linha pronta, com aviso ou com erro.</span></li>'
            f'<li>{ico("check")}<span><b>4. Importar.</b> Entra tudo de uma vez, ou nada. Dá para desfazer em até 7 dias.</span></li>'
            '</ul></section>')


def quem_is():
    return folha('t-quem', 'Quem pode importar', '',
                 f'<ul class="im-regras" style="padding:0 24px 20px">'
                 f'<li>{ico("coluna")}<span><b>De outro sistema:</b> só a sócia dona. Traz o escritório inteiro de uma vez, com processos e financeiro (pergunta 3).</span></li>'
                 f'<li>{ico("doc")}<span><b>Planilha:</b> a regra de sempre. Clientes, todos da equipe; contratos, quem tem a área Contratos.</span></li>'
                 f'<li>{ico("historico")}<span><b>Desfazer:</b> quem importou ou a sócia dona, em até 7 dias.</span></li></ul>')


def vem_de(sistema):
    def li(ok, t, s):
        return f'<li{"" if ok else " class=\"is-nao\""}>{ico("check" if ok else "x")}<span><b>{t}</b><small>{s}</small></span></li>'
    corpo = ('<ul class="is-vem">'
             + li(True, 'Clientes', 'Com contatos e qualificação. Quem já está no T3jus é juntado, só nos campos vazios.')
             + li(True, 'Processos, como casos no Jurídico', 'Com número, área, parte contrária, clientes e responsável. Entram sem contrato (pergunta 1).')
             + li(True, 'Financeiro, só como informação', 'O que já foi pago fica na ficha. Não entra no Caixa nem em A receber (pergunta 2).')
             + li(False, 'Contratos de honorários', ('O ADVBOX não entrega contratos pela conexão. ' if sistema == 'ADVBOX' else '') + 'Crie na ficha do cliente ou importe pela planilha.')
             + li(False, 'Prazos, agenda e tarefas', 'Prazo trazido sem conferência é risco. Cadastre os próximos no caso.')
             + li(False, 'Andamentos, publicações e documentos', 'Ficam no sistema antigo. Os documentos que o caso pede, você envia no caso.')
             + '</ul>')
    return folha('t-vem', f'O que vem do {sistema}', '', corpo)


def is_tab_colunas(cols, opcoes, cap, modelo='Astrea', erros=None):
    """A tabela aprovada de colunas, com um jeito novo de ligar: pelo modelo do sistema."""
    erros = erros or {}
    linhas = []
    for letra, nome, ex, campo_, sit in cols:
        e = erros.get(letra)
        cls = 'is-nova' if sit == 'nova' else ('im-ign' if campo_ == 'Não importar' else '')
        col = f'<div class="im-col"><span class="im-letra" aria-hidden="true">{letra}</span><span><b>{H(nome)}</b><span class="sr">, coluna {letra}</span><small class="im-ex-cel">1º valor: {H(ex).replace("@", "@<wbr>")}</small></span></div>'
        exh = f'<span class="im-ex">{H(ex).replace("@", "@<wbr>")}</span>'
        s = sel_campo(f'is-c-{cap[:3]}-{letra}', f'Coluna {letra}, {nome}: vai para', opcoes, campo_, e or '')
        if sit == 'nova':
            st = f'<div class="im-sit">{selo("atencao", "Não reconhecida", "ajuda")}<small>Não está no modelo do {modelo}. Ligue à mão ou deixe de fora.</small></div>'
        elif sit.startswith('ign'):
            st = f'<div class="im-sit">{selo("neutro", "Fica de fora", "x")}<small>{sit[4:]}</small></div>'
        elif sit == 'voce':
            st = f'<div class="im-sit"><span class="hn-selo">{ico("lapis")}Por você</span></div>'
        else:
            st = f'<div class="im-sit im-sit-nome"><span class="hn-selo">{ico("check")}Pelo modelo do {modelo}</span></div>'
        linhas.append(([col, exh, s, st], cls))
    return tabela(cap, ['Coluna', 'Primeiro valor', 'Vai para', 'Como foi ligada'], linhas, ['22%', '20%', '36%', '22%'], 'im-map')


def is_pares(titulo, sub, grupos, id_='t-pares', pre='is-p'):
    out = ''
    k = 0
    for col, vals in grupos:
        out += f'<p class="im-grupo-t">{ico("funcoes")}{col}</p><ul class="im-pares">'
        for v, n, ops, sel, aj in vals:
            k += 1
            i_ = f'{pre}{k}'
            o = ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in ops)
            a = f'<p class="ajuda" id="{i_}-aj">{aj}</p>' if aj else ''
            ad = f' aria-describedby="{i_}-aj"' if aj else ''
            out += (f'<li><span class="im-de"><b>“{H(v)}”</b><small>{n}</small></span><span class="im-seta" aria-hidden="true">{ico("seta")}</span>'
                    f'<div class="campo"><label class="sr" for="{i_}">“{H(v)}” vira</label><select class="entrada" id="{i_}"{ad}>{o}</select>{a}</div></li>')
        out += '</ul>'
    return folha(id_, titulo, sub, out)


def tabs(atual, itens):
    a = ''
    for k, rot, q, pend, href in itens:
        cur = ' aria-current="page"' if k == atual else ''
        p = f'<span class="is-pend">{pend}<span class="sr"> pedem você</span></span>' if pend else ''
        a += f'<a href="{href}"{cur}>{rot}<span class="q">{q}</span>{p}</a>'
    return f'<nav class="is-tabs" aria-label="O que vem do backup">{a}</nav>'


# ---------------------------------------------------------------- 1. entradas
def cab_clientes_is():
    return ('<div class="cabeca-ambar campo-ambar cabeca-equipe cl-cab-lista"><div><p class="sobretitulo">Cadastro único</p><h1>Clientes</h1><span class="fio" aria-hidden="true"></span>'
            '<p class="lede">Quem o escritório atende: contatos, qualificação para procuração e contrato, origem e histórico de atendimento. Todos da equipe veem esta lista.</p></div>'
            f'<div class="im-cab-acoes"><a class="btn btn-sec" href="{S}origem">{ico("enviar")}Importar dados</a>'
            f'<a class="btn btn-escuro" href="../portal-clientes/clientes.html?estado=novo">{ico("pessoa-mais")}Novo cliente</a></div></div>')


def clientes_lista_is():
    s = IM['clientes_lista']()
    velho = f'<a class="btn btn-sec" href="{PLAN}enviar">{ico("enviar")}Importar planilha</a>'
    assert velho in s
    s = s.replace(velho, f'<a class="btn btn-sec" href="{S}origem">{ico("enviar")}Importar dados</a>', 1)
    return s.replace(f'href="{PLAN}importacoes"', f'href="{S}importacoes"')


def clientes_vazio_is():
    def card(href, i, t, s):
        return f'<li><a class="im-modelo" href="{href}" style="text-decoration:none;color:inherit"><span class="im-ci">{ico(i)}</span><span><strong>{t}</strong><small>{s}</small></span></a></li>'
    e = estado('Nenhum cliente cadastrado ainda',
               'Se os clientes já estão numa planilha ou em outro sistema, traga todos de uma vez: você confere tudo numa prévia antes de salvar. Ou cadastre um por um.',
               'pessoas', moldura=False,
               acoes=f'<a class="btn btn-pri" href="{S}origem">{ico("enviar")}Importar dados</a><a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=novo">{ico("pessoa-mais")}Cadastrar o primeiro cliente</a>')
    lista = ('<ul style="list-style:none;margin:0;padding:0 24px 20px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px" class="is-vazio-l" aria-label="De onde importar">'
             + card(PLAN + 'enviar', 'doc', 'Planilha', 'Do Excel ou do Google Planilhas. Clientes e contratos.')
             + card(S + 'astrea-pedir', 'enviar', 'Backup do Astrea', 'Você pede o backup no Astrea e envia aqui.')
             + card(S + 'advbox-escolha', 'link', 'ADVBOX', 'Pela conexão, se tiver o plano com API, ou pela planilha.')
             + '</ul>')
    pe = f'<p class="pt-pe-folha">{ico("doc")}<span>Usa outro sistema? Quase todos exportam planilha. Baixe a <a href="{PLAN}modelo">planilha-modelo</a> ou envie a planilha do jeito que vier.</span></p>'
    return (f'<div class="cl">{cab_clientes_is()}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de clientes</h2>{e}'
            f'<h3 class="sr">De onde importar</h3>{lista}{pe}</section></div>')


def origem():
    def card(val, i, t, s, p, itens, pe, marcado=False):
        li = ''.join(f'<li{"" if ok else " class=\"is-nao\""}>{ico("check" if ok else "x")}<span>{x}</span></li>' for ok, x in itens)
        ch = ' checked' if marcado else ''
        return (f'<label class="is-ori"><span class="is-ori-t"><input type="radio" name="is-origem" value="{val}"{ch}><span class="is-ci">{ico(i)}</span>'
                f'<span><strong>{t}</strong><small>{s}</small></span></span><p>{p}</p><ul>{li}</ul><span class="is-ori-pe">{pe}</span></label>')
    cards = (card('planilha', 'doc', 'Planilha', 'Excel ou Google Planilhas', 'A importação de sempre. Você liga as colunas da sua planilha aos campos do T3jus.',
                  [(True, 'Clientes'), (True, 'Contratos e parcelas')], 'Pronto em minutos. Clientes, todos da equipe; contratos, quem tem a área.')
             + card('astrea', 'enviar', 'Astrea', 'Pelo backup do escritório', 'O Astrea manda um arquivo com tudo do escritório. Você pede o backup lá e envia aqui.',
                    [(True, 'Clientes'), (True, 'Processos, como casos'), (True, 'Financeiro, como informação'), (False, 'Contratos de honorários')],
                    'O backup chega por e-mail em até 24 horas.', True)
             + card('advbox', 'link', 'ADVBOX', 'Pela conexão ou pela planilha', 'Com o plano de API do ADVBOX, o T3jus lê direto de lá. Sem ele, use a planilha exportada.',
                    [(True, 'Clientes'), (True, 'Processos, como casos'), (True, 'Financeiro, como informação'), (False, 'Contratos de honorários')],
                    'Pela conexão, a leitura leva de minutos a uma hora.'))
    corpo = (f'<fieldset class="is-origens"><legend>De onde vêm os dados?</legend><div class="is-ori-g">{cards}</div></fieldset>'
             f'<p class="is-outro">{ico("ajuda")}<span><b>Usa outro sistema?</b> Quase todos exportam os clientes em planilha. Escolha Planilha: o passo das colunas serve para qualquer uma.</span></p>'
             f'<div class="im-pe"><span class="im-pe-t">Nada entra no cadastro antes da prévia. Em todas as origens, dá para desfazer em 7 dias.</span>'
             f'<a class="btn btn-fantasma" href="../portal-clientes/clientes.html?estado=lista">Cancelar</a><a class="btn btn-pri" href="{S}astrea-pedir">{ico("dir")}Continuar</a></div>')
    principal = folha('t-ori', 'Escolha a origem', 'Planilha, Astrea ou ADVBOX. Os passos seguintes são os mesmos: ligar, conferir na prévia e importar.', corpo)
    ult = folha('t-ult', 'Importações anteriores', '',
                f'<ul class="im-ok"><li>{ico("historico")}<span><b>clientes-antigos.csv</b> {orig("planilha", True)}<small>12/11 · Paula Nunes · 23 clientes</small></span></li></ul>'
                f'<p class="hn-pe" style="padding-top:12px">{ico("dir")}<a href="{S}importacoes">Ver todas as importações</a></p>')
    return (f'<div class="im">{cab_is("Importar dados", "Clientes, processos e o histórico financeiro que já estão numa planilha ou em outro sistema, conferidos numa prévia antes de salvar.")}'
            f'{grade(principal, quem_is() + ult, "Quem pode e o histórico")}</div>')


# ---------------------------------------------------------------- 2. Astrea
def astrea_pedir():
    pp = ('<ol class="is-pp">'
          '<li><span class="disco" aria-hidden="true"><span>1</span></span><div><b>Entre no Astrea com o usuário administrador do escritório.</b><p>Só o administrador da conta do Astrea pede o backup.</p></div></li>'
          '<li><span class="disco" aria-hidden="true"><span>2</span></span><div><b>Abra a Administração, no ícone da engrenagem, e vá à aba Escritório.</b>'
          '<span class="is-menu"><span>Administração</span><i>(engrenagem)</i><i aria-hidden="true">›</i><span>Escritório</span></span></div></li>'
          '<li><span class="disco" aria-hidden="true"><span>3</span></span><div><b>Em “Manutenção de conta”, use o “clique aqui” para pedir o backup.</b>'
          '<span class="is-menu"><span>Manutenção de conta</span><i aria-hidden="true">›</i><span>clique aqui</span></span></div></li>'
          f'<li><span class="disco" aria-hidden="true"><span>4</span></span><div><b>Espere o e-mail e baixe o arquivo.</b><p>Chega em até 24 horas, com um link para baixar o backup em .xlsx. Não precisa abrir nem mudar o arquivo.</p>'
          f'<span class="is-email">{ico("envelope")}<span><b>“Seu backup do Astrea está pronto”</b><small>Assunto do e-mail que o Astrea manda ao administrador</small></span></span></div></li></ol>'
          '<p class="is-nota">Os nomes dos menus são os do Astrea em novembro de 2026. Se mudarem, a ajuda do Astrea mostra o caminho atual. Pode sair desta página enquanto espera: quando o e-mail chegar, volte em Clientes › Importar dados.</p>')
    lim = ('<ul class="im-lim" aria-label="Antes de enviar">'
           f'<li>{ico("doc")}<span><b>O .xlsx do backup, do jeito que veio.</b> Reconhecemos as abas pelo modelo do Astrea.</span></li>'
           f'<li>{ico("filtro")}<span><b>Até 20 MB e 10.000 linhas por aba.</b> É maior que o limite da planilha, porque o backup traz tudo.</span></li>'
           f'<li>{ico("funcoes")}<span><b>Você escolhe as abas.</b> As que ficarem de fora não são lidas.</span></li></ul>')
    soltar_b = (f'<div class="soltar">{ico("enviar")}<p><strong>Arraste o backup para cá ou</strong></p>'
                f'<input class="sr" type="file" id="is-arq" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-describedby="is-regra">'
                f'<label class="btn btn-sec" for="is-arq">{ico("mais")}Escolher o backup</label>'
                f'<p class="ajuda" id="is-regra">Arquivo .xlsx do backup do Astrea, até 20 MB.</p></div>')
    lg = lgpd('<b>O backup não fica guardado.</b> Ele traz tudo do escritório, então lemos só as abas que você escolher. O arquivo é lido no servidor, no Brasil, e apagado quando a importação termina ou é cancelada, ou em 24 horas. Fica registrado só o nome dele, quem enviou e quando.')
    principal = (folha('t-ped', 'Peça o backup no Astrea', 'O Astrea não tem conexão direta. O caminho é o backup completo, que ele mesmo oferece.', pp)
                 + folha('t-env', 'Envie o backup aqui', '', f'<div class="im-bloco">{soltar_b}{lim}{lg}</div>'
                         + f'<div class="im-pe"><span class="im-pe-t">Ao escolher o arquivo, a leitura começa sozinha. Nada entra no cadastro neste passo.</span>'
                           f'<a class="btn btn-fantasma" href="{S}origem">{ico("esq")}Trocar a origem</a><a class="btn btn-pri" href="{S}astrea-abas">{ico("dir")}Enviar e continuar</a></div>'))
    return (f'<div class="im">{cab_is("Importar do Astrea", "Clientes, processos e o histórico financeiro do escritório, a partir do backup que o Astrea gera.", orig("astrea"))}'
            f'{passos_ast(1)}{grade(principal, vem_de("Astrea") + explica_is("Astrea"), "O que vem do Astrea")}</div>')


ABAS_OK = [
    ('Contatos', '486 linhas', 'pessoas', ['Não importar', 'Clientes e partes contrárias', 'Clientes e contratos (como a planilha)'], 'Clientes e partes contrárias', 'modelo', 'Os contatos do tipo cliente viram clientes; as partes contrárias vão para os casos.'),
    ('Processos', '312 linhas', 'balanca', ['Não importar', 'Casos no Jurídico'], 'Casos no Jurídico', 'modelo', '241 ativos e 71 arquivados.'),
    ('Lançamentos', '1.204 linhas', 'carteira', ['Não importar', 'Financeiro, como informação'], 'Financeiro, como informação', 'modelo', 'Recebimentos e despesas.'),
    ('Tarefas', '97 linhas', 'check', ['Não importar'], 'Não importar', 'ign:As tarefas se criam no caso, com responsável e data conferidos.', ''),
    ('Agenda', '58 linhas', 'agenda', ['Não importar'], 'Não importar', 'ign:Prazo e audiência trazidos sem conferência são risco. Cadastre os próximos.', ''),
    ('Publicações', '1.530 linhas', 'doc', ['Não importar'], 'Não importar', 'ign:Intimações antigas ficam no Astrea.', ''),
]


def tab_abas(extra=()):
    linhas = []
    k = 0
    for nome, n, i, ops, sel, sit, det in list(ABAS_OK) + list(extra):
        k += 1
        cls = 'is-nova' if sit == 'nova' else ('im-ign' if sel == 'Não importar' else '')
        a = f'<div class="is-aba"><span class="is-ci" aria-hidden="true">{ico(i)}</span><span><b>{nome}</b><small>{n}</small></span></div>'
        s = sel_campo(f'is-aba-{k}', f'Aba {nome}: vai para', ops, sel)
        if sit == 'nova':
            st = f'<div class="im-sit">{selo("atencao", "Não reconhecida", "ajuda")}<small>{det}</small></div>'
        elif sit.startswith('ign'):
            st = f'<div class="im-sit">{selo("neutro", "Fica de fora", "x")}<small>{sit[4:]}</small></div>'
        else:
            st = f'<div class="im-sit"><span class="hn-selo">{ico("check")}Pelo modelo do Astrea</span><small>{det}</small></div>'
        linhas.append(([a, s, st], cls))
    return tabela('Abas do backup', ['Aba do backup', 'Vai para', 'Situação'], linhas, ['24%', '42%', '34%'], 'is-abas-t')


def astrea_abas(diferente=False):
    if diferente:
        topo = ('<div style="padding:0 24px 16px">' + aviso('atencao', 'Este backup está um pouco diferente do modelo que conhecemos.',
                'Ligamos pelo modelo o que reconhecemos. Duas abas e uma coluna são novas: escolha para onde vão ou deixe de fora. Nada foi importado.',
                acoes='<ul class="im-resumo" style="margin:4px 0 0;padding-left:18px"><li><a href="#is-aba-7">Aba “Pessoas”: 210 linhas</a></li><li><a href="#is-aba-8">Aba “Honorários”: 96 linhas</a></li><li>Contatos: a coluna “Documento” é nova. Você liga no passo seguinte.</li></ul>') + '</div>')
        extra = [('Pessoas', '210 linhas', 'ajuda', ['Não importar', 'Clientes e partes contrárias'], 'Não importar', 'nova', 'Pode ser uma versão nova da aba Contatos. Confira o primeiro valor antes de ligar.'),
                 ('Honorários', '96 linhas', 'ajuda', ['Não importar', 'Clientes e contratos (como a planilha)'], 'Clientes e contratos (como a planilha)', 'nova',
                  'Ligada como a planilha de clientes e contratos: no passo seguinte você liga as colunas, uma linha por contrato.')]
        sub = f'{BKP} · 4,1 MB · 8 abas · 6 reconhecidas'
    else:
        topo = ('<div style="padding:0 24px 16px">' + aviso('sucesso', 'Reconhecemos o backup do Astrea.', 'As 6 abas estão no modelo que conhecemos. Ligamos cada uma pelo modelo; confira e ajuste o que precisar.') + '</div>')
        extra = []
        sub = f'{BKP} · 3,8 MB · 6 abas · lido às 16h04'
    arq = (f'<p class="is-arq-b">{ico("doc")}<span><b>{BKP}</b> · enviado por Marina Ribeiro às 16h03</span>'
           f'<a class="btn btn-fantasma" href="{S}astrea-pedir">{ico("x")}Trocar o arquivo</a></p>') if not diferente else ''
    arq_esc = (f'<fieldset class="is-escolha"><legend>Processos arquivados (71)</legend><p>Processos que já terminaram no Astrea.</p><div class="im-ops">'
               + opcao('is-arquiv', 'Deixar de fora', 'Recomendado. A lista de casos começa só com o que está em andamento.', True, 'radio', 'fora')
               + opcao('is-arquiv', 'Importar como encerrados', 'Entram em Casos e processos › Encerrados, sem resultado nem acerto.', False, 'radio', 'encerrados')
               + '</div></fieldset>')
    pe = (f'<div class="im-pe"><span class="im-pe-t">As abas de fora não são lidas. Nada entrou no cadastro ainda.</span>'
          f'<a class="btn btn-fantasma" href="{S}astrea-pedir">{ico("esq")}Voltar</a><a class="btn btn-pri" href="{S}astrea-colunas">{ico("dir")}Conferir as colunas</a></div>')
    principal = folha('t-abas', 'As abas do backup', sub, topo + arq + tab_abas(extra) + arq_esc + pe, estilo=' style="overflow:hidden"')
    lat = vem_de('Astrea') + explica_is('Astrea')
    if diferente:
        lat = folha('t-dif', 'Por que pode mudar', '',
                    f'<ul class="im-regras" style="padding:0 24px 20px">'
                    f'<li>{ico("ajuda")}<span>O Astrea não publica o formato do backup. Quando ele muda, o que é novo cai aqui, para você decidir.</span></li>'
                    f'<li>{ico("escudo")}<span>Mandamos à equipe do T3jus só os nomes das abas e das colunas novas, sem nenhum dado, para atualizar o modelo.</span></li>'
                    f'<li>{ico("doc")}<span>Enviou a exportação de contatos, e não o backup? Ela segue como uma planilha comum, sem problema.</span></li></ul>') + lat
    return (f'<div class="im">{cab_is("Importar do Astrea", "", orig("astrea"))}{passos_ast(2, (BKP, "", "", ""))}'
            f'{grade(principal, lat, "O que vem do Astrea")}</div>')


CAMPOS_CLI_IS = IM['CAMPOS_CLI'] + ['Tipo de contato']
COL_CONT = [
    ('A', 'Nome', 'Benedito Ramos Filho', 'Nome ou razão social', 'modelo'),
    ('B', 'Tipo', 'Cliente', 'Tipo de contato', 'modelo'),
    ('C', 'CPF/CNPJ', CPF_BENEDITO, 'CPF ou CNPJ', 'modelo'),
    ('D', 'E-mail', 'benedito.ramos@exemplo.com.br', 'E-mail', 'modelo'),
    ('E', 'Celular', '(11) 99642-1180', 'Telefone ou WhatsApp', 'modelo'),
    ('F', 'Estado civil', 'Viúvo', 'Estado civil', 'modelo'),
    ('G', 'Profissão', 'Motorista aposentado', 'Profissão', 'modelo'),
    ('H', 'Endereço', 'Rua Tuiuti, 418', 'Endereço', 'modelo'),
    ('I', 'Cidade', 'São Paulo', 'Cidade', 'modelo'),
    ('J', 'UF', 'SP', 'UF', 'modelo'),
    ('K', 'Observações', 'liga depois das 18h', 'Não importar', 'ign:Observação livre não entra: pode trazer dado que o cadastro não pede (LGPD).'),
    ('L', 'Etiquetas', 'VIP; INSS', 'Não importar', 'ign:Etiquetas do Astrea não têm lugar no cadastro.'),
]


def astrea_colunas():
    t = tabs('cont', [('cont', 'Contatos', '486', '', S + 'astrea-colunas'), ('proc', 'Processos', '241', '', S + 'astrea-colunas'), ('lanc', 'Lançamentos', '1.204', '', S + 'astrea-colunas')])
    corpo = (t + '<div class="im-aba" style="padding-top:16px"><p style="padding:0">Ligamos as 12 colunas da aba Contatos pelo modelo do Astrea. Confira cada uma e ajuste o que precisar.</p></div>'
             + f'<p class="im-grupo-t">{ico("pessoas")}Contatos · 12 colunas</p>' + is_tab_colunas(COL_CONT, CAMPOS_CLI_IS, 'Colunas da aba Contatos')
             + f'<div class="im-pe"><span class="im-pe-t">As abas Processos e Lançamentos também já vêm ligadas. Nada entrou no cadastro ainda.</span>'
               f'<a class="btn btn-fantasma" href="{S}astrea-abas">{ico("esq")}Voltar</a><a class="btn btn-pri" href="{S}previa-sistema">{ico("olho")}Ver a prévia</a></div>')
    principal = folha('t-col', 'Confira as colunas', f'{BKP} · 3 abas para importar', corpo, estilo=' style="overflow:hidden"')
    eq = ['Marina Ribeiro', 'Felipe Matos', 'Larissa Costa']
    pares_ = is_pares('Valores que viram itens do T3jus', 'Cada valor diferente do backup, com quantas linhas o usam. Ligue uma vez; vale para todas as linhas.', [
        ('Contatos · coluna “Tipo”', [('Cliente', '214 linhas', ['Cliente', 'Parte contrária nos casos', 'Não importar'], 'Cliente', ''),
                                      ('Parte contrária', '172 linhas', ['Cliente', 'Parte contrária nos casos', 'Não importar'], 'Parte contrária nos casos', 'Não viram clientes: o nome entra como parte contrária no caso de cada processo.'),
                                      ('Testemunha, Perito, Correspondente', '100 linhas', ['Cliente', 'Parte contrária nos casos', 'Não importar'], 'Não importar', 'Ficam de fora: o cadastro de clientes não guarda terceiros.')]),
        ('Processos · coluna “Responsável”', [('Marina Ribeiro', '118 processos', eq, 'Marina Ribeiro', ''), ('Felipe Matos', '84 processos', eq, 'Felipe Matos', ''),
                                              ('Paulo Mendes', '39 processos', eq, 'Marina Ribeiro', 'Não está na Equipe. Os casos dele ficam com quem você escolher.')]),
        ('Processos · coluna “Área”', [('Trabalhista', '131 processos', ['Trabalhista', 'Cível', 'Consumidor', 'Família', 'Previdenciário', 'Saúde', 'Tributário', 'Outra'], 'Trabalhista', ''),
                                       ('Previdenciária', '74 processos', ['Trabalhista', 'Cível', 'Consumidor', 'Família', 'Previdenciário', 'Saúde', 'Tributário', 'Outra'], 'Previdenciário', ''),
                                       ('Cível', '36 processos', ['Trabalhista', 'Cível', 'Consumidor', 'Família', 'Previdenciário', 'Saúde', 'Tributário', 'Outra'], 'Cível', '')]),
    ])
    obr = folha('t-obr', 'O que é obrigatório', 'Tudo ligado.',
                '<p class="im-ok-t">Clientes</p><ul class="im-ok">'
                f'<li>{ico("check")}<span>Nome ou razão social<small>Contatos, coluna A</small></span></li>'
                f'<li>{ico("check")}<span>Telefone ou e-mail<small>Contatos, colunas D e E</small></span></li></ul>'
                '<p class="im-ok-t">Casos</p><ul class="im-ok">'
                f'<li>{ico("check")}<span>Cliente do caso<small>Processos, coluna “Cliente”, pelo nome ou CPF do contato</small></span></li>'
                f'<li>{ico("check")}<span>Responsável<small>Processos, coluna “Responsável”</small></span></li>'
                f'<li>{ico("check")}<span>Nome do caso<small>Montado como “Cliente x Parte contrária”, como no Jurídico</small></span></li></ul>'
                '<p class="im-ok-t">Lançamentos</p><ul class="im-ok">'
                f'<li>{ico("check")}<span>Data, valor e situação<small>Lançamentos, colunas A, C e E</small></span></li></ul>'
                f'<p class="hn-pe">{ico("ajuda")}<span>A etapa de cada caso começa em “Petição inicial” se tiver número e em “Preparação” se não tiver. Você muda depois, na lista de casos, sem aviso ao cliente.</span></p>')
    return (f'<div class="im">{cab_is("Importar do Astrea", "", orig("astrea"))}{passos_ast(2, (BKP, "", "", ""))}'
            f'{grade(principal + pares_, obr + explica_is("Astrea"), "O que é obrigatório")}</div>')


# ---------------------------------------------------------------- 3. ADVBOX
def advbox_escolha():
    def card(val, i, t, s, p, itens, pe, marcado=False):
        li = ''.join(f'<li{"" if ok else " class=\"is-nao\""}>{ico("check" if ok else "x")}<span>{x}</span></li>' for ok, x in itens)
        ch = ' checked' if marcado else ''
        return (f'<label class="is-ori"><span class="is-ori-t"><input type="radio" name="is-adv" value="{val}"{ch}><span class="is-ci">{ico(i)}</span>'
                f'<span><strong>{t}</strong><small>{s}</small></span></span><p>{p}</p><ul>{li}</ul><span class="is-ori-pe">{pe}</span></label>')
    cards = (card('api', 'link', 'Pela conexão', 'Para quem já tem o plano com API', 'Você cola o token da API do ADVBOX. O T3jus lê clientes, processos e o financeiro direto de lá, sozinho.',
                  [(True, 'Sem exportar nada'), (True, 'Responsáveis, origens, etapas e tipos já vêm em listas'), (True, 'Só leitura: nada muda no ADVBOX')],
                  'Pede o plano “API para Escritórios” do ADVBOX, a partir de R$ 280 por mês, contratado com eles.', True)
             + card('planilha', 'doc', 'Pela planilha', 'Sem custo', 'Você exporta os relatórios de clientes e de processos do ADVBOX em planilha e envia aqui, um de cada vez.',
                    [(True, 'Funciona em qualquer plano'), (True, 'Colunas ligadas pelo modelo do ADVBOX'), (False, 'O financeiro fica de fora')],
                    'Não vale contratar o plano de API só para importar: a planilha resolve.'))
    corpo = (f'<fieldset class="is-origens" style="padding-top:4px"><legend>Como trazer os dados do ADVBOX?</legend><div class="is-ori-g" style="grid-template-columns:repeat(2,minmax(0,1fr))">{cards}</div></fieldset>'
             f'<p class="is-outro">{ico("pena")}<span><b>Contratos não vêm do ADVBOX</b> por nenhum dos dois caminhos: ele não entrega contratos pela conexão, e os relatórios não trazem as condições de honorário. Depois de importar, crie cada contrato na ficha do cliente, ou importe uma planilha de contratos.</span></p>'
             f'<div class="im-pe"><span class="im-pe-t">Nada entra no cadastro antes da prévia.</span>'
             f'<a class="btn btn-fantasma" href="{S}origem">{ico("esq")}Trocar a origem</a><a class="btn btn-pri" href="{S}advbox-token">{ico("dir")}Continuar</a></div>')
    principal = folha('t-adv', 'Escolha o caminho', 'Os dois terminam na mesma prévia, antes de salvar.', corpo)
    return (f'<div class="im">{cab_is("Importar do ADVBOX", "Clientes, processos e o histórico financeiro do escritório, pela conexão com o ADVBOX ou pela planilha exportada de lá.")}'
            f'{grade(principal, vem_de("ADVBOX") + quem_is(), "O que vem do ADVBOX")}</div>')


FAZ = ('<ul class="is-faz">'
       f'<li>{ico("olho")}<span><b>Só lê.</b> Nunca grava, muda ou apaga nada no ADVBOX.</span></li>'
       f'<li>{ico("check")}<span><b>Lê:</b> as listas do escritório (pessoas, origens, etapas e tipos de ação), os clientes, os processos e os lançamentos financeiros.</span></li>'
       f'<li class="is-nao">{ico("x")}<span><b>Não lê:</b> tarefas, andamentos e documentos.</span></li>'
       f'<li>{ico("cadeado")}<span><b>Guarda o token cifrado, no servidor, só durante a leitura.</b> Ele é apagado quando a leitura termina, se você cancelar, ou em 24 horas. Ninguém da equipe nem do T3jus vê o token, e ele não volta para esta tela.</span></li>'
       f'<li>{ico("reenviar")}<span><b>Depois, se quiser, revogue o token no ADVBOX.</b> O T3jus não vai mais precisar dele.</span></li></ul>')


def advbox_token(erro=False):
    onde = ('<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>1</span></span>Onde achar o token</h3>'
            '<p>O ADVBOX entrega o token da API a quem tem o plano “API para Escritórios”. Peça ao suporte do ADVBOX ou a quem administra a conta de vocês, e diga que é para consulta (só leitura). O token é uma sequência longa de letras e números.</p></div>')
    er = ''
    if erro:
        er = ('<div style="margin-bottom:4px">' + aviso('urgencia', 'O ADVBOX não aceitou este token.',
              'Nada foi lido, e o token que você colou já foi apagado. Confira se copiou o token inteiro, sem espaço no começo ou no fim, e cole de novo. Se continuar, peça um token novo ao ADVBOX.') + '</div>')
    cmp = campo('is-token', 'Token da API do ADVBOX', '' if erro else '••••••••••••••••••••••••••••••••', 'c6', 'password',
                ajuda='Vai direto para o servidor, cifrado. Depois de testar, ele não volta para esta tela.',
                erro='O ADVBOX recusou este token. Cole o token inteiro de novo.' if erro else '', foco=erro)
    tok = (f'<div class="im-bloco is-token"><h3><span class="disco" aria-hidden="true"><span>2</span></span>Cole o token</h3>{er}'
           f'<div class="is-token-l">{cmp}<button class="btn btn-sec" type="button">{ico("olho")}Mostrar</button></div></div>')
    faz = f'<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>3</span></span>O que o T3jus faz com ele</h3>{FAZ}</div>'
    pe = (f'<div class="im-pe"><span class="im-pe-t">Testar só confere o token e lê as listas do escritório. A leitura dos clientes começa depois, quando você mandar.</span>'
          f'<a class="btn btn-fantasma" href="{S}advbox-escolha">{ico("esq")}Voltar</a><a class="btn btn-pri" href="{S}advbox-conectado">{ico("link")}Testar a conexão</a></div>')
    principal = folha('t-tok', 'Conecte o ADVBOX', 'Pelo token da API, só para leitura.', onde + tok + faz + pe)
    lat = quem_is() + explica_is('ADVBOX')
    if erro:
        msgs = [('O plano não tem a API', 'O ADVBOX respondeu que esta conta não tem acesso à API. Use a planilha exportada do ADVBOX: não tem custo.', S + 'advbox-planilha', 'Usar a planilha'),
                ('O ADVBOX pediu uma pausa', 'Ele deixa ler 30 vezes por minuto. Quando pede pausa, esperamos e seguimos sozinhos. Você não precisa fazer nada.', '', ''),
                ('O ADVBOX não respondeu', 'Tentamos de novo em alguns minutos, sem perder o que já foi lido. Se continuar, avisamos no sino.', '', ''),
                ('O token parou de valer no meio', 'Paramos a leitura e apagamos o token. O que já foi lido continua guardado por 24 horas: cole um token novo para seguir de onde parou.', '', '')]
        li = ''.join(f'<li><b>{a}</b>{b}' + (f'<span style="display:block;margin-top:6px"><a class="btn btn-sec" href="{h}">{ico("doc")}{r}</a></span>' if h else '') + '</li>' for a, b, h, r in msgs)
        lat = folha('t-msgs', 'Outros problemas de conexão', 'Em todos, nada é importado.', f'<ul class="im-msgs">{li}</ul>') + lat
    return f'<div class="im">{cab_is("Importar do ADVBOX", "", orig("advbox"))}{passos_adv(1)}{grade(principal, lat, "Quem pode e outros problemas")}</div>'


def advbox_conectado():
    ok = ('<div style="padding:0 24px 16px">' + aviso('sucesso', 'Conexão feita.', 'O ADVBOX respondeu como “Ribeiro &amp; Matos Advocacia”. O token está guardado cifrado no servidor.') + '</div>')
    cnx = ('<div class="im-bloco"><h3>As listas do escritório no ADVBOX</h3>'
           '<dl class="is-cnx"><div><dt>Pessoas</dt><dd>6</dd></div><div><dt>Origens</dt><dd>9</dd></div><div><dt>Etapas</dt><dd>12</dd></div><div><dt>Tipos de ação</dt><dd>14</dd></div></dl>'
           '<p>Você liga cada uma às listas do T3jus no próximo passo: as pessoas à Equipe, as origens à lista de origens, as etapas às etapas do escritório e os tipos de ação às áreas.</p></div>')
    ler = ('<div class="im-bloco"><fieldset class="im-opcoes"><legend>O que ler</legend><div class="is-ler">'
           + opcao('is-ler', 'Clientes · 520', 'Contatos e qualificação. É o que vale sempre.', True, 'checkbox', 'clientes')
           + opcao('is-ler', 'Processos · 384', '333 ativos viram casos no Jurídico. Os 51 arquivados ficam de fora, a não ser que você mude no passo 2.', True, 'checkbox', 'processos')
           + opcao('is-ler', 'Lançamentos financeiros · 2.310', 'Só como informação na ficha do cliente e do caso. Fora do Caixa e de A receber.', True, 'checkbox', 'financeiro')
           + '</div></fieldset>'
           f'<p class="im-cadeado">{ico("x")}<span><b>Tarefas, andamentos e documentos não são lidos.</b> Prazo e tarefa trazidos sem conferência são risco, e os andamentos pediriam uma leitura por processo.</span></p></div>')
    tempo = ('<div class="im-bloco"><div class="is-tempo"><span class="disco" aria-hidden="true"><span>40</span></span>'
             '<p><b>Cerca de 40 minutos.</b> O ADVBOX deixa ler 30 vezes por minuto, e cada processo pede uma leitura. A leitura roda no servidor: pode fechar a página. Avisamos no sino quando terminar.</p></div></div>')
    pe = (f'<div class="im-pe"><span class="im-pe-t">Ler não importa nada. Tudo passa pela prévia antes de entrar.</span>'
          f'<button class="btn btn-fantasma" type="button">{ico("x")}Cancelar e apagar o token</button><a class="btn btn-pri" href="{S}advbox-lendo">{ico("dir")}Começar a leitura</a></div>')
    principal = folha('t-cnx', 'Conectado ao ADVBOX', 'Testado às 16h01, por Marina Ribeiro.', ok + cnx + ler + tempo + pe)
    return (f'<div class="im">{cab_is("Importar do ADVBOX", "", orig("advbox"))}{passos_adv(1, ("conectado às 16h01", "", "", ""))}'
            f'{grade(principal, folha("t-faz", "O que o T3jus faz com o token", "", "<div style=\"padding:0 24px 20px\">" + FAZ + "</div>") + explica_is("ADVBOX"), "O token")}</div>')


def advbox_lendo():
    le = ('<ul class="is-le">'
          f'<li>{ico("check")}<span><b>Listas do escritório</b><small>pessoas, origens, etapas e tipos</small></span><span>Lidas às 16h01</span></li>'
          f'<li>{ico("relogio")}<span><b>Clientes</b><small>312 de 520</small></span><span class="im-barra" aria-hidden="true"><span style="width:60%"></span></span></li>'
          f'<li class="is-espera">{ico("relogio")}<span><b>Processos</b><small>384, depois dos clientes</small></span><span>Na fila</span></li>'
          f'<li class="is-espera">{ico("relogio")}<span><b>Lançamentos financeiros</b><small>2.310, por último</small></span><span>Na fila</span></li></ul>')
    corpo = (f'<div class="im-prog" aria-busy="true"><div class="pt-gerando" role="status" aria-live="polite"><p><b>Lendo o ADVBOX: clientes, 312 de 520.</b> Começou às 16h02. Deve terminar perto das 16h42.</p></div>'
             + le
             + f'<p class="is-pausa">{ico("relogio")}<span><b>O ADVBOX pediu uma pausa.</b> Seguimos sozinhos em 40 segundos. É o limite de leituras por minuto dele; nada se perde.</span></p>'
             + f'<p class="im-lgpd">{ico("sino")}<span><b>Pode fechar a página.</b> A leitura roda no servidor. Quando terminar, avisamos no sino e o token é apagado.</span></p>'
             + lgpd('<b>Nada entrou no cadastro.</b> O que é lido fica guardado só para você, por 24 horas, até a prévia. Se cancelar, apagamos o que foi lido e o token.')
             + f'<div><button class="btn btn-sec" type="button">{ico("x")}Cancelar e apagar o token</button></div></div>')
    principal = folha('t-le', 'Lendo o ADVBOX', 'Ribeiro &amp; Matos Advocacia · só leitura', corpo)
    return (f'<div class="im">{cab_is("Importar do ADVBOX", "", orig("advbox"))}{passos_adv(1, ("lendo: 312 de 520 clientes", "", "", ""))}'
            f'{grade(principal, explica_is("ADVBOX"), "Como funciona")}</div>')


def advbox_valores():
    ok = aviso('sucesso', 'A leitura do ADVBOX terminou às 16h41.',
               '520 clientes, 384 processos e 2.310 lançamentos lidos. O token foi apagado do servidor. Nada entrou no cadastro ainda: ligue os valores e confira a prévia.')
    eq = ['Marina Ribeiro', 'Felipe Matos', 'Larissa Costa', 'Diego Almeida', 'Paula Nunes']
    et = ['Preparação', 'Petição inicial', 'Citação e defesa', 'Instrução', 'Sentença', 'Recurso', 'Cumprimento', 'Encerrado']
    ar = ['Trabalhista', 'Cível', 'Consumidor', 'Família', 'Previdenciário', 'Saúde', 'Tributário', 'Outra']
    org = CL['ORIGENS']
    grupos = [
        ('Pessoas do ADVBOX › Equipe do T3jus', [('Marina Ribeiro', '211 clientes e processos', eq, 'Marina Ribeiro', ''), ('Felipe Matos', '164 clientes e processos', eq, 'Felipe Matos', ''),
                                                  ('Larissa C.', '97 clientes e processos', eq, 'Larissa Costa', ''),
                                                  ('Paulo Mendes', '58 clientes e processos', eq, 'Marina Ribeiro', 'Não está na Equipe. Os casos e clientes dele ficam com quem você escolher.')]),
        ('Origens do ADVBOX › lista de origens', [('Indicação', '188 clientes', org, 'Indicação de cliente', ''), ('Google Ads', '61 clientes', org, 'Google', ''),
                                                  ('Facebook', '22 clientes', org, 'Outra', 'A lista de origens do T3jus é fixa. Escolha a mais próxima.')]),
        ('Etapas do ADVBOX › etapas do escritório', [('Aguardando distribuição', '19 processos', et, 'Preparação', ''), ('Em andamento', '141 processos', et, 'Citação e defesa', ''),
                                                      ('Audiência marcada', '37 processos', et, 'Instrução', ''), ('Em grau de recurso', '52 processos', et, 'Recurso', ''), ('Execução', '29 processos', et, 'Cumprimento', '')]),
        ('Tipos de ação do ADVBOX › área', [('Reclamatória trabalhista', '148 processos', ar, 'Trabalhista', ''), ('Aposentadoria', '71 processos', ar, 'Previdenciário', ''),
                                            ('Indenizatória', '44 processos', ar, 'Consumidor', '')]),
    ]
    p = is_pares('Ligue os valores do ADVBOX', 'Já sugeridos pelo nome. Mostramos os mais usados de cada lista; os outros estão ligados da mesma forma.', grupos)
    p = p.replace('<div class="folha-cab">', f'<div style="padding:20px 24px 0">{ok}</div><div class="folha-cab">', 1)
    arq_esc = folha('t-arqv', 'Processos arquivados', '51 no ADVBOX',
                    '<fieldset class="is-escolha" style="border-top:0;padding-top:0"><legend class="sr">Processos arquivados</legend><div class="im-ops" style="grid-template-columns:1fr">'
                    + opcao('is-arqv', 'Deixar de fora', 'Recomendado. A lista de casos começa só com o que está em andamento.', True, 'radio', 'fora')
                    + opcao('is-arqv', 'Importar como encerrados', 'Entram em Encerrados, sem resultado nem acerto.', False, 'radio', 'enc') + '</div></fieldset>')
    pe = (f'<section class="folha" aria-label="Seguir"><div class="im-pe" style="border-top:0"><span class="im-pe-t">Nada entrou no cadastro ainda. A prévia fica guardada por 24 horas.</span>'
          f'<a class="btn btn-fantasma" href="{S}advbox-conectado">{ico("esq")}Voltar</a><a class="btn btn-pri" href="{S}previa-sistema">{ico("olho")}Ver a prévia</a></div></section>')
    return (f'<div class="im">{cab_is("Importar do ADVBOX", "", orig("advbox"))}{passos_adv(2, ("lido às 16h41", "", "", ""))}'
            f'{grade(p + pe, arq_esc + vem_de("ADVBOX"), "O que vem do ADVBOX")}</div>')


def advbox_planilha():
    pp = ('<ol class="is-pp">'
          '<li><span class="disco" aria-hidden="true"><span>1</span></span><div><b>No ADVBOX, abra o relatório de clientes e exporte em planilha (Excel).</b><p>Se o relatório deixar escolher colunas, marque todas: as que não servem ficam de fora no passo 2.</p></div></li>'
          '<li><span class="disco" aria-hidden="true"><span>2</span></span><div><b>Importe a planilha de clientes primeiro.</b><p>Ela passa pelos mesmos passos da planilha: colunas, prévia e importar.</p></div></li>'
          '<li><span class="disco" aria-hidden="true"><span>3</span></span><div><b>Depois, se quiser, exporte e importe o relatório de processos.</b><p>Cada processo se liga ao cliente já cadastrado, pelo CPF ou CNPJ, ou pelo nome.</p></div></li></ol>'
          '<p class="is-nota">O ADVBOX não publica as colunas dos relatórios. Reconhecemos os nomes mais comuns; o que não reconhecermos aparece no passo 2 para você ligar.</p>')
    oque = ('<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>1</span></span>O que esta planilha traz</h3>'
            '<fieldset class="im-opcoes"><legend class="sr">O que esta planilha traz</legend><div class="im-ops">'
            + opcao('is-pl', 'Clientes do ADVBOX', 'O relatório de clientes. Uma linha por cliente.', True, 'radio', 'cli')
            + opcao('is-pl', 'Processos do ADVBOX', 'Viram casos no Jurídico. Os clientes precisam já estar no T3jus.', False, 'radio', 'proc')
            + '</div></fieldset></div>')
    arq = f'<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>2</span></span>O arquivo</h3>{soltar()}{LIMITES}{lgpd(LGPD_ARQ)}</div>'
    pe = (f'<div class="im-pe"><span class="im-pe-t">Ao escolher o arquivo, a leitura começa sozinha. Nada entra no cadastro neste passo.</span>'
          f'<a class="btn btn-fantasma" href="{S}advbox-escolha">{ico("esq")}Voltar</a><a class="btn btn-pri" href="{PLAN}colunas">{ico("dir")}Enviar e continuar</a></div>')
    principal = folha('t-pp', 'Exporte do ADVBOX', 'Sem conexão e sem custo, pelos relatórios em planilha.', pp) + folha('t-env', 'Envie a planilha', '', oque + arq + pe)
    lat = folha('t-dif2', 'O que muda pela planilha', '',
                f'<ul class="im-regras" style="padding:0 24px 20px">'
                f'<li>{ico("check")}<span>Os passos são os da importação de planilha, com as colunas ligadas pelo modelo do ADVBOX.</span></li>'
                f'<li>{ico("x")}<span>O financeiro fica de fora: os relatórios não trazem o cliente de cada lançamento de um jeito que dê para conferir.</span></li>'
                f'<li>{ico("pena")}<span>Contratos também ficam de fora. Crie cada um na ficha do cliente.</span></li></ul>') + explica_is('ADVBOX')
    return (f'<div class="im">{cab_is("Importar do ADVBOX", "", orig("advbox-pl"))}{is_passos(1, *P_ADVPL)}'
            f'{grade(principal, lat, "O que muda pela planilha")}</div>')


# ---------------------------------------------------------------- 4. a prévia
def is_linha(n, nome, sub, mid, mid_sub, gera, sit, cls='', aberto='', rot=('Linha', 'Cliente', 'Casos e financeiro')):
    c = f' class="{cls}"' if cls else ''
    g = f'<span class="im-gera">{ico("link", "ico ico-s")}<span>{gera}</span></span>' if gera else ''
    return (f'<li{c}><div class="im-c im-c-n"><span class="im-r">{rot[0]}</span><span class="im-nl">{n}</span></div>'
            f'<div class="im-c"><span class="im-r">{rot[1]}</span><span class="im-nome">{nome}</span><small>{sub}</small></div>'
            f'<div class="im-c"><span class="im-r">{rot[2]}</span>{mid}<small>{mid_sub}</small>{g}</div>'
            f'<div class="im-c"><span class="im-r">Situação</span>{sit}</div>{aberto}</li>')


def is_lista(itens, cols=('Linha', 'Cliente', 'Casos e financeiro ligados', 'Situação'), rot='Linhas do backup'):
    cab = '<div class="im-cab-l" aria-hidden="true">' + ''.join(f'<span>{c}</span>' for c in cols) + '</div>'
    return cab + f'<ul class="im-linhas" aria-label="{rot}">{"".join(itens)}</ul>'


TABS_PREV = lambda atual: tabs(atual, [('cli', 'Clientes', '214', '18', S + 'previa-sistema'), ('caso', 'Casos', '241', '13', S + 'previa-casos'),
                                       ('fin', 'Financeiro', '1.204', '', S + 'previa-financeiro')])


def nums(itens):
    return numeros(itens, 'Resumo da prévia')


def lateral_is(final=False):
    if final:
        top = ('<div class="hn-res-bloco"><h3>Clientes</h3><p class="hn-res-grande">210</p><ul><li><b>201</b> novos</li><li><b>9</b> juntados a cadastros que já existiam (só os campos vazios)</li></ul></div>'
               '<div class="hn-res-bloco"><h3>Casos no Jurídico</h3><p class="hn-res-grande">237</p><ul><li>todos <b>sem contrato</b>, até a área Contratos ligar um</li><li><b>3</b> processos juntados a casos que já existiam</li><li><b>172</b> partes contrárias nos casos</li></ul></div>')
        btn = (f'<div class="im-res-acao"><a class="btn btn-pri" href="{S}confirmar-sistema">{ico("check")}Importar</a>'
               '<p>4 clientes e 1 caso pulados ficam de fora; no fim você baixa a planilha deles, com o motivo.</p></div>')
    else:
        top = ('<div class="hn-res-bloco"><h3>Clientes</h3><p class="hn-res-grande">196</p><ul><li>novos, das linhas prontas</li><li>mais o que você decidir nos <b>12</b> avisos</li></ul></div>'
               '<div class="hn-res-bloco"><h3>Casos no Jurídico</h3><p class="hn-res-grande">228</p><ul><li>todos <b>sem contrato</b>, até a área Contratos ligar um</li><li>etapa e responsável ligados no passo 2</li></ul></div>')
        btn = (f'<div class="im-res-acao"><a class="btn btn-pri" href="{S}confirmar-sistema">{ico("check")}Importar o que está pronto</a>'
               '<p>Os 10 com erro e os 21 com aviso ainda pedem você. Se importar agora, eles ficam de fora e vão para a planilha do que não entrou.</p></div>')
    fin = ('<div class="hn-res-bloco"><h3>Histórico financeiro</h3><p class="hn-res-grande">1.108</p><ul><li><b>1.021</b> recebidos, R$ 612.430,00, só como informação</li>'
           '<li><b>87</b> em aberto, R$ 48.900,00: viram lembrete para criar o contrato</li><li><b>96</b> despesas do escritório ficam de fora</li></ul></div>')
    nada = ('<div class="hn-res-bloco"><h3>O que não entra</h3><ul><li><b>Nenhum contrato</b> e nenhuma parcela em A receber</li><li><b>Nada no Caixa</b></li>'
            '<li><b>Nenhuma mensagem</b> ao cliente pelo WhatsApp</li></ul></div>')
    return (f'<section class="folha hn-resumo im-res" aria-labelledby="t-res"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-res">O que vai entrar</h2>'
            f'<p class="sub">Conta feita no servidor. Nada foi salvo.</p></div></div>{top}{fin}{nada}{btn}</section>')


NADA_IS = aviso('info', 'Nada foi salvo ainda.', 'Confira, corrija ou pule as linhas com problema, aba por aba. A prévia fica guardada por 24 horas só para você; depois, é apagada com o backup.', extra=' im-nada')


def pagina_prev(tab, numeros_html, corpo, final=False, esc=None):
    principal = NADA_IS + f'<section class="folha" aria-labelledby="t-prev" style="overflow:hidden"><h2 id="t-prev" class="sr">Linhas do backup</h2>{TABS_PREV(tab)}{corpo}</section>'
    return (f'<div class="im">{cab_is("Importar do Astrea", "", orig("astrea"))}{passos_ast(3, esc or (BKP, "3 abas ligadas", "", ""))}{numeros_html}'
            f'{grade(principal, lateral_is(final), "O que vai entrar")}</div>')


def chips_is(rotulos, atual='todas', busca='Nome, CPF ou número da linha'):
    bt = ''.join(f'<button type="button" aria-pressed="{"true" if k == atual else "false"}">{r}</button>' for k, r in rotulos)
    return (f'<form class="im-ferr" role="search" action="#" onsubmit="return false"><div class="campo-busca"><label class="sr" for="is-b">Buscar na prévia: {busca}</label>{ico("busca")}'
            f'<input class="entrada" id="is-b" type="search" placeholder="{busca}" autocomplete="off"></div><div class="chips" role="group" aria-label="Mostrar">{bt}</div></form>')


def previa_clientes(final=False):
    n = nums([('214', '', 'clientes lidos', 'Contatos do tipo cliente', True, S + 'previa-sistema'),
              ('196', 'hn-d-vinho', 'prontos', 'entram como estão', False, S + 'previa-sistema'),
              ('12', 'hn-d-hoje', 'com aviso', 'você decide', False, S + 'previa-sistema'),
              ('6', 'hn-d-urg', 'com erro', 'corrija ou pule', False, S + 'previa-sistema')])
    L = [
        is_linha('C2', 'Benedito Ramos Filho', f'CPF {CPF_BENEDITO} · (11) 99642-1180', '<span class="im-ctr">2 casos</span>', 'Trabalhista e Previdenciário',
                 '<b>18 lançamentos</b> recebidos<small>(informação)</small>', pronta()),
        is_linha('C3', 'Antonia F. Prado', f'CPF {CPF_ANT} · (11) 99123-4567', '<span class="im-ctr">1 caso</span>', 'Previdenciário',
                 '<b>6 lançamentos</b><small>(informação)</small>',
                 f'<div class="im-prob">{selo("atencao", "Possível duplicado", "pessoas")}<p>Mesmo CPF de <a href="../portal-clientes/clientes.html?estado=ficha">Antônia Ferreira Prado</a>, já cadastrada. Juntar só preenche o que está vazio.</p>{btns(b("Decidir", "dir"))}</div>', 'im-l-aviso'),
        is_linha('C4', 'Transportadora Rota Sul Ltda.', f'CNPJ {CNPJ_ROTA} · Osvaldo Teles, sócio', '<span class="im-ctr">1 caso</span>', 'Cível', '<b>12 lançamentos</b><small>(informação)</small>', pronta()),
        is_linha('C5', 'Edite Nogueira', f'CPF <span class="im-errado">{CPF_EDITE_ERR}</span> · edite.nogueira@exemplo.com.br', '<span class="im-ctr">1 caso</span>', 'Trabalhista', '',
                 f'<div class="im-prob">{selo("urgente", "CPF com dígito errado", "alerta")}<p>Confira o CPF no documento. Dá para importar sem CPF e completar depois.</p>{btns(b("Corrigir", "lapis"), b("Pular"))}</div>', 'im-l-erro'),
        is_linha('C6', 'Cristina Okada', f'CPF {CPF_CRISTINA} · (11) 98810-3327', '<span class="im-ctr">Sem caso</span>', 'Cliente de consultoria', '', pronta()),
        is_linha('C7', 'Márcio Tavares', f'CPF {CPF_MARCIO} · (11) 97012-3348', '<span class="im-ctr">1 caso</span>', 'Trabalhista · parte contrária: Metalúrgica Andrade S.A.',
                 '<b>3 lançamentos</b> em aberto<small>(lembrete de contrato)</small>', pronta()),
    ]
    cont = ('<p class="im-cont" role="status"><b>214 clientes</b> na ordem do backup. A letra C é da aba Contatos. '
            'As <b>172 partes contrárias</b> não aparecem aqui: entram só como parte contrária nos casos. Os 100 outros contatos ficam de fora.</p>')
    corpo = (chips_is([('todas', 'Todos (214)'), ('erro', ico("alerta", "ico ico-s") + 'Com erro (6)'), ('aviso', 'Com aviso (12)'), ('prontas', 'Prontos (196)')])
             + cont + is_lista(L)
             + f'<div class="mais"><span>Mostrando 6 de 214</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais</button></div>')
    return pagina_prev('cli', n, corpo, final)


def previa_casos():
    n = nums([('241', '', 'casos lidos', 'processos ativos', True, S + 'previa-casos'),
              ('228', 'hn-d-vinho', 'prontos', 'entram como estão', False, S + 'previa-casos'),
              ('9', 'hn-d-hoje', 'com aviso', 'você decide', False, S + 'previa-casos'),
              ('4', 'hn-d-urg', 'com erro', 'corrija ou pule', False, S + 'previa-casos')])
    rot = ('Linha', 'Caso', 'Clientes e responsável')
    dl = ('<dl class="im-dl">'
          f'<div><dt>Nome do caso</dt><dd>Tavares x Metalúrgica Andrade</dd></div><div><dt>Número do processo</dt><dd>{N1}</dd></div>'
          '<div><dt>Área</dt><dd>Trabalhista</dd></div><div><dt>Tribunal e sistema</dt><dd>TRT-2 · PJe</dd></div>'
          '<div><dt>Etapa</dt><dd>Instrução <span class="is-info">(“Audiência marcada” no Astrea)</span></dd></div><div><dt>Responsável</dt><dd>Felipe Matos</dd></div>'
          '<div><dt>Cliente e papel</dt><dd>Márcio Tavares, reclamante</dd></div><div><dt>Parte contrária</dt><dd>Metalúrgica Andrade S.A.</dd></div>'
          '<div><dt>Valor da causa</dt><dd>R$ 64.200,00</dd></div></dl>')
    aberto = (f'<div class="im-aberto" role="group" aria-labelledby="is-ab-t"><div class="is-caso-cab"><h4 id="is-ab-t">O caso que vai entrar no Jurídico<small>Linha P14 da aba Processos. Nada foi salvo.</small></h4>{orig("astrea", True)}</div>'
              + dl
              + aviso('atencao', 'Entra sem contrato.', 'Como no Jurídico, o caso fica marcado “sem contrato” até a área Contratos ligar um. Os 3 lançamentos em aberto deste cliente viram um lembrete na ficha para criar o contrato.')
              + f'<p class="is-nao-vem">{ico("x")}<span><b>Não vêm do Astrea:</b> prazos, audiências, tarefas, andamentos e documentos. Cadastre o próximo prazo no caso depois de importar. A importação não manda mensagem ao cliente.</span></p>'
              + f'<div class="im-aberto-pe"><span class="im-pe-t">Corrigir aqui vale só para esta importação.</span>{b("Editar o caso", "lapis")}{b("Pular", "x")}{b("Fechar", "", True)}</div></div>')
    L = [
        is_linha('P14', 'Tavares x Metalúrgica Andrade', f'{N1} · Trabalhista', '<span class="im-ctr">Márcio Tavares</span>', 'Felipe Matos · Instrução', '', pronta(), aberto=aberto, rot=rot),
        is_linha('P15', 'Ramos x INSS', f'{N2} · Previdenciário', '<span class="im-ctr">Benedito Ramos Filho</span>', 'Marina Ribeiro · Recurso', '',
                 f'<div class="im-prob">{selo("atencao", "Possível duplicado", "balanca")}<p>Mesmo número do caso <a href="{JUR}ficha">Ramos x INSS</a>, já no Jurídico. Juntar liga o cliente ao caso que existe e não cria outro.</p>{btns(b("Decidir", "dir"))}</div>',
                 'im-l-aviso', rot=rot),
        is_linha('P16', 'Rota Sul x Distribuidora Leste', f'<span class="im-errado">{N4_ERR}</span> · Cível', '<span class="im-ctr">Transportadora Rota Sul Ltda.</span>', 'Felipe Matos · Citação e defesa', '',
                 f'<div class="im-prob">{selo("urgente", "Número do processo inválido", "alerta")}<p>Os dígitos de conferência não batem. Confira no tribunal, ou importe sem número e complete depois.</p>{btns(b("Corrigir", "lapis"), b("Pular"))}</div>',
                 'im-l-erro', rot=rot),
        is_linha('P17', 'Okada x Banco Horizonte', 'sem número · Consumidor', '<span class="im-ctr">Cliente não encontrado</span>', 'Marina Ribeiro · Preparação', '',
                 f'<div class="im-prob">{selo("atencao", "Sem cliente", "pessoas")}<p>O nome “C. Okada” não bate com nenhum contato. Escolha o cliente ou pule.</p>{btns(b("Escolher o cliente", "dir"))}</div>',
                 'im-l-aviso', rot=rot),
    ]
    corpo = (chips_is([('todas', 'Todos (241)'), ('erro', ico("alerta", "ico ico-s") + 'Com erro (4)'), ('aviso', 'Com aviso (9)'), ('prontas', 'Prontos (228)')], busca='Caso, número ou cliente')
             + '<p class="im-cont" role="status"><b>241 processos ativos</b>. A letra P é da aba Processos. Os 71 arquivados ficaram de fora no passo 2.</p>'
             + is_lista(L, ('Linha', 'Caso', 'Clientes e responsável', 'Situação'), 'Casos do backup')
             + f'<div class="mais"><span>Mostrando 4 de 241</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais</button></div>')
    return pagina_prev('caso', n, corpo)


def previa_financeiro():
    n = nums([('1.204', '', 'lançamentos lidos', 'aba Lançamentos', True, S + 'previa-financeiro'),
              ('1.021', 'hn-d-vinho', 'recebidos', 'informação na ficha', False, S + 'previa-financeiro'),
              ('87', 'hn-d-hoje', 'em aberto', 'lembrete de contrato', False, S + 'previa-financeiro'),
              ('96', '', 'despesas', 'ficam de fora', False, S + 'previa-financeiro')])
    rot = ('Linha', 'Lançamento', 'Cliente e caso')
    info = f'<div class="im-prob">{selo("neutro", "Informação", "doc")}<p>Fica no histórico da ficha, como “pago antes do T3jus”.</p></div>'
    aberto_ = f'<div class="im-prob">{selo("atencao", "Em aberto", "relogio")}<p>Não vira cobrança. Vira um lembrete na ficha: crie o contrato para cobrar.</p></div>'
    fora = f'<div class="im-prob">{selo("neutro", "Fica de fora", "x")}<p>Despesa do escritório: o Caixa começa no T3jus.</p></div>'
    L1 = [is_linha('L8', 'Honorários · parcela 3 de 6', 'recebido em 10/10/2026 · <span class="is-valor">R$ 800,00</span>', '<span class="im-ctr">Benedito Ramos Filho</span>', 'Ramos x INSS', '', info, rot=rot),
          is_linha('L9', 'Honorários iniciais', 'recebido em 02/09/2026 · <span class="is-valor">R$ 1.500,00</span>', '<span class="im-ctr">Transportadora Rota Sul Ltda.</span>', 'Rota Sul x Distribuidora Leste', '', info, rot=rot)]
    L2 = [is_linha('L31', 'Honorários · parcela 2 de 4', 'venceu em 15/11/2026 · <span class="is-valor">R$ 1.250,00</span>', '<span class="im-ctr">Márcio Tavares</span>', 'Tavares x Metalúrgica Andrade', '', aberto_, 'im-l-aviso', rot=rot)]
    L3 = [is_linha('L77', 'Aluguel da sala', 'pago em 05/11/2026 · <span class="is-valor">R$ 4.200,00</span>', '<span class="im-ctr">Sem cliente</span>', 'Despesa do escritório', '', fora, 'im-l-pulada', rot=rot)]
    cols = ('Linha', 'Lançamento', 'Cliente e caso', 'Situação')
    regra = (f'<p class="im-massa">{ico("carteira")}<span><b>O financeiro do Astrea entra só como informação.</b> No T3jus, a cobrança nasce do contrato e o Caixa só mostra o que passou por ele. '
             'Assim o contador não recebe pagamento repetido (pergunta 2).</span></p>')
    corpo = (chips_is([('todas', 'Todos (1.204)'), ('rec', 'Recebidos (1.021)'), ('ab', 'Em aberto (87)'), ('desp', 'Despesas (96)')], busca='Cliente, caso ou valor')
             + regra
             + f'<p class="is-fin-g">{ico("check")}Recebidos · R$ 612.430,00 · 1.021</p>' + is_lista(L1, cols, 'Recebidos')
             + f'<p class="is-fin-g">{ico("relogio")}Em aberto · R$ 48.900,00 · 87</p>' + is_lista(L2, cols, 'Em aberto')
             + f'<p class="is-fin-g">{ico("x")}Despesas do escritório · 96</p>' + is_lista(L3, cols, 'Despesas')
             + f'<div class="mais"><span>Mostrando 4 de 1.204</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais</button></div>')
    return pagina_prev('fin', n, corpo)


# ---------------------------------------------------------------- 5. confirmar, resultado, histórico, desfazer
def j_confirmar_is():
    corpo = ('<ul class="im-desf">'
             f'<li>{ico("pessoas")}<span><b>210 clientes:</b> 201 novos e 9 juntados a cadastros que já existiam (só os campos vazios).</span></li>'
             f'<li>{ico("balanca")}<span><b>237 casos no Jurídico,</b> sem contrato, com 172 partes contrárias. 3 processos se juntam a casos que já existiam.</span></li>'
             f'<li>{ico("carteira")}<span><b>1.108 lançamentos só como informação:</b> 1.021 recebidos e 87 em aberto, que viram lembrete de contrato. Nada no Caixa nem em A receber.</span></li>'
             f'<li>{ico("x")}<span><b>Ficam de fora</b> 4 clientes e 1 caso pulados, 96 despesas e 71 processos arquivados.</span></li></ul>'
             + '<div style="margin-top:14px;display:grid;gap:10px">'
             + lgpd('<b>Ou entra tudo ou nada.</b> Se algo falhar no meio, nada fica pela metade. Ao terminar, o backup é apagado do servidor.')
             + f'<p class="im-lgpd">{ico("conversas")}<span><b>Nenhuma mensagem sai para os clientes.</b> A importação não avisa ninguém pelo WhatsApp.</span></p>'
             + f'<p class="im-lgpd">{ico("historico")}<span>Dá para desfazer até <b>{PRAZO_S}</b> (7 dias), em Clientes › Importações.</span></p></div>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>{ico("esq")}Voltar à prévia</button><a class="btn btn-pri" href="{S}resultado-sistema">{ico("check")}Importar</a>')
    return janela('janela-confirmar', 'Importar do Astrea', 'Importar o backup do Astrea?', f'De {BKP}, com as correções e decisões que você fez na prévia.', corpo, pe, abrir=True)


def resultado_is():
    cab = (f'<div class="cabeca-ambar campo-ambar cabeca-equipe im-fim"><div><p class="sobretitulo">Importação de hoje, 16h52 · do backup do Astrea</p><h1>Importação concluída</h1><span class="fio" aria-hidden="true"></span>'
           f'<div class="im-fim-num"><div><span class="disco hn-d-vinho" aria-hidden="true"><span>210</span></span><span><b>clientes</b><small>201 novos e 9 completados</small></span></div>'
           f'<div><span class="disco hn-d-vinho" aria-hidden="true"><span>237</span></span><span><b>casos</b><small>no Jurídico, sem contrato</small></span></div>'
           f'</div><p style="margin-top:14px;font-size:13px;color:var(--tinta)"><b style="font-weight:600">5 linhas ficaram de fora</b> (4 clientes e 1 caso), com o motivo na planilha abaixo.</p>'
           f'<p class="sr">210 clientes e 237 casos entraram; 5 linhas ficaram de fora.</p></div></div>')
    entrou = ('<ul class="im-entrou">'
              f'<li><span class="im-ci">{ico("pessoa-mais")}</span><span><strong>201 clientes novos</strong><small>O filtro “Desta importação” mostra só eles. A ficha diz que vieram do Astrea.</small></span><a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=lista">Ver clientes</a></li>'
              f'<li><span class="im-ci">{ico("pessoas")}</span><span><strong>9 cadastros completados</strong><small>Só os campos vazios receberam o dado do Astrea. O que mudou está no histórico de cada ficha.</small></span><a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=lista">Ver os 9</a></li>'
              f'<li><span class="im-ci">{ico("balanca")}</span><span><strong>237 casos</strong><small>Todos marcados “sem contrato”. Confira a etapa e cadastre o próximo prazo de cada um.</small></span><a class="btn btn-sec" href="{JUR}casos">Ver casos</a></li>'
              f'<li><span class="im-ci">{ico("pena")}</span><span><strong>87 lembretes de contrato</strong><small>Clientes com valor em aberto no Astrea, R$ 48.900,00. Crie o contrato para cobrar.</small></span><a class="btn btn-sec" href="{IM["CTR"]}contratos">Ver lembretes</a></li>'
              f'<li><span class="im-ci">{ico("carteira")}</span><span><strong>1.021 recebimentos de antes</strong><small>R$ 612.430,00 como informação no histórico de cada ficha. Fora do Caixa e sem recibo.</small></span></li></ul>')
    fora = ('<ul class="im-fora">'
            '<li><b>C5</b><span>Edite Nogueira<small>CPF com dígito errado · pulada</small></span></li>'
            '<li><b>C41</b><span>Joaquim P. Lemos<small>Sem telefone e sem e-mail · pulada</small></span></li>'
            '<li><b>P17</b><span>Okada x Banco Horizonte<small>Sem cliente · pulado</small></span></li>'
            '<li><b>+ 2</b><span>Linhas C88 e C120<small>um aviso que você pulou e uma data que não existe</small></span></li></ul>'
            f'<div class="hn-folha-acao"><a class="btn btn-sec" href="#">{ico("baixar")}Baixar as 5 linhas, com o motivo (.xlsx)</a>'
            f'<p>Corrija e importe como planilha. Este arquivo tem só as 5 linhas e fica disponível até {PRAZO_S}; depois, é apagado.</p></div>')
    principal = folha('t-entrou', 'O que entrou', 'Tudo já está no cadastro e no Jurídico. Nenhuma mensagem saiu para os clientes.', entrou) + folha('t-fora', 'Ficaram de fora', '5 linhas, mais 96 despesas e 71 processos arquivados, que você deixou de fora', fora)
    lat = (folha('t-arq', 'O backup foi apagado', '', '<div style="padding:0 24px 20px">' + lgpd(f'<b>{BKP}</b> foi apagado do servidor às 16h52. Ficou registrado só o nome do arquivo, quem importou e quando.') + '</div>')
           + folha('t-desf', 'Desfazer esta importação', f'Até {PRAZO_S}', f'<div class="hn-folha-acao"><p>Os clientes ficam inativos e os casos saem da lista, tudo com o motivo e no histórico. Nada é apagado em silêncio. O que alguém já mexeu depois fica como está.</p>'
                                                                f'<a class="btn btn-perigo" href="{S}desfazer-sistema">{ico("historico")}Desfazer importação</a></div>'))
    return f'<div class="im">{passos_ast(5, (BKP, "3 abas ligadas", "1.560 linhas conferidas", "feita hoje, 16h52"))}{cab}{grade(principal, lat, "Arquivo e desfazer")}</div>'


def importacoes_is(abrir=False):
    def arq(n, s):
        return f'<div class="esc"><div><b>{n}</b><small>{s}</small></div></div>'
    linhas = [
        ([orig('astrea'), arq(BKP, 'hoje, 16h52 · Marina Ribeiro'), '<div>210 clientes, 237 casos<small>1.108 lançamentos como informação · 5 de fora</small></div>',
          f'<div class="im-sit">{selo("ok", "Concluída", "check")}<small>desfazer até {PRAZO_S}</small></div>',
          f'<div class="im-acoes-l"><a class="btn btn-sec" href="#">{ico("baixar")}Linhas de fora</a><a class="btn btn-perigo" href="{S}desfazer-sistema">{ico("historico")}Desfazer</a></div>'], ''),
        ([orig('advbox'), arq('Conexão com o ADVBOX', '19/11/2026, 11h30 · Marina Ribeiro · token apagado às 12h14'), '<div>Nada ficou<small>tinha 520 clientes e 333 casos</small></div>',
          f'<div class="im-sit">{selo("neutro", "Desfeita", "historico")}<small>19/11, 14h05, por Marina Ribeiro: “Liguei as etapas erradas. Vou usar o backup.”</small></div>', '<span class="hn-sem">—</span>'], 'im-desfeita'),
        ([orig('planilha'), arq('clientes-antigos.csv', '12/11/2026, 10h05 · Paula Nunes'), '<div>23 clientes<small>nenhuma linha de fora</small></div>',
          f'<div class="im-sit">{selo("ok", "Concluída", "check")}<small>o prazo de desfazer acabou em 19/11</small></div>', '<span class="hn-sem">—</span>'], ''),
    ]
    tab = tabela('Importações do escritório', ['Origem', 'Arquivo ou conexão', 'O que entrou', 'Situação', 'Ações'], linhas, ['14%', '24%', '20%', '22%', '20%'], 'im-hist')
    corpo = (tab + f'<p class="hn-pe">{ico("escudo")}<span>O arquivo enviado e o token do ADVBOX nunca ficam guardados. Aqui ficam a origem, o nome do arquivo, quem importou, quando e o que entrou. Cada cliente e caso importado leva isso na própria ficha.</span></p>')
    cab = (f'<div class="cabeca-ambar campo-ambar cabeca-equipe hn-cab-ambar"><div><p class="sobretitulo">Clientes</p><h1>Importações</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">Cada importação do escritório, de planilha, do Astrea ou do ADVBOX, com quem, quando e o que entrou. Desfazer vale por 7 dias.</p></div>'
           f'<a class="btn btn-escuro" href="{S}origem" style="margin-bottom:6px">{ico("enviar")}Importar dados</a></div>')
    return f'<div class="im">{cab}<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><h2 id="t-hist" class="sr">Importações</h2>{corpo}</section></div>{j_desfazer_is(abrir)}'


def j_desfazer_is(abrir=False):
    corpo = ('<ul class="im-desf">'
             f'<li>{ico("pessoas")}<span><b>201 clientes novos ficam inativos</b>, com o motivo. Continuam no filtro Inativos.</span></li>'
             f'<li>{ico("trocar")}<span><b>Os 9 cadastros completados voltam ao que eram:</b> os campos que o Astrea preencheu ficam vazios de novo.</span></li>'
             f'<li>{ico("balanca")}<span><b>237 casos saem da lista</b> e ficam em Encerrados, marcados “importação desfeita”, sem resultado. Os 3 casos que já existiam perdem só o cliente que a importação ligou.</span></li>'
             f'<li>{ico("carteira")}<span><b>O histórico financeiro e os 87 lembretes de contrato saem das fichas.</b></span></li></ul>'
             + '<div style="margin:14px 0">' + aviso('atencao', '5 itens já foram mexidos depois da importação e ficam como estão.',
                                                     '2 casos têm prazo cadastrado, 2 clientes têm atendimento e 1 lembrete virou contrato. A lista vem no fim, para você decidir um por um.') + '</div>'
             + texto('is-motivo', 'Motivo', '', 'c6', ajuda='Fica no histórico e em cada ficha. Ex.: “liguei as etapas erradas”.', foco=True, cont=300))
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button><button class="btn btn-perigo" type="submit">{ico("historico")}Desfazer importação</button>')
    return janela('janela-desfazer', 'Importação de hoje, 16h52 · Astrea', 'Desfazer a importação?',
                  f'Nada é apagado em silêncio. O que a importação do backup do Astrea criou sai do uso do dia a dia e fica no histórico. Só quem importou ou a sócia dona pode desfazer, até {PRAZO_S}.',
                  corpo, pe, alerta=True, abrir=abrir)


# ---------------------------------------------------------------- estados
T = ''
F = dict(atual='clientes', trilha='Clientes|Importar dados', titulo='Importar dados')
FA = dict(atual='clientes', trilha='Clientes|Importar dados|Astrea', titulo='Importar do Astrea')
FB = dict(atual='clientes', trilha='Clientes|Importar dados|ADVBOX', titulo='Importar do ADVBOX')
T += tpl('clientes-vazio', clientes_vazio_is(), atual='clientes', trilha='Clientes', titulo='Clientes')
T += tpl('clientes-lista', clientes_lista_is(), atual='clientes', trilha='Clientes', titulo='Clientes')
T += tpl('origem', origem(), **F)
T += tpl('astrea-pedir', astrea_pedir(), **FA)
T += tpl('astrea-abas', astrea_abas(), **FA)
T += tpl('astrea-diferente', astrea_abas(True), **FA)
T += tpl('astrea-colunas', astrea_colunas(), **FA)
T += tpl('advbox-escolha', advbox_escolha(), **FB)
T += tpl('advbox-token', advbox_token(), **FB)
T += tpl('advbox-token-erro', advbox_token(True), **FB)
T += tpl('advbox-conectado', advbox_conectado(), **FB)
T += tpl('advbox-lendo', advbox_lendo(), **FB)
T += tpl('advbox-valores', advbox_valores(), **FB)
T += tpl('advbox-planilha', advbox_planilha(), **FB)
T += tpl('previa-sistema', previa_clientes(), **FA)
T += tpl('previa-casos', previa_casos(), **FA)
T += tpl('previa-financeiro', previa_financeiro(), **FA)
T += tpl('confirmar-sistema', previa_clientes(final=True) + j_confirmar_is(), **FA)
T += tpl('resultado-sistema', resultado_is(), **FA)
I = dict(atual='clientes', trilha='Clientes|Importações', titulo='Importações')
T += tpl('importacoes', importacoes_is(), **I)
T += tpl('desfazer-sistema', importacoes_is(True), **I)

CSS_VAZIO = '\n@media (max-width:760px){.is-vazio-l{grid-template-columns:1fr!important;padding:0 16px 16px!important}}\n'
out = montar('sistemas.html', 'Importar dados', 'Importação de clientes, processos e histórico financeiro do Astrea e do ADVBOX, com prévia antes de salvar (F3.56, VA-05).',
             '{"estado":"origem","atual":"clientes"}', T, '', CL['CSS_CL'] + IM['CT']['CSS'] + CSS_IM + CSS_IS + CSS_VAZIO)
open(os.path.join(SAIDA, 'sistemas.html'), 'w', encoding='utf-8').write(out)
print('sistemas ok', T.count('<template data-est='), 'estados')
