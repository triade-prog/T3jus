# Portal · Clientes: termo de curatela (F3.118; AP-01, CH-08). Proposta para a Carol aprovar.
# Parte do desenho aprovado de "Quem assina pelo cliente" (portal-responsavel-legal), sem mudá-lo:
# responsavel.py é cópia sem mudança e é lido até o começo dos estados.
# O que muda: dois estados novos (o termo não subiu depois de salvar; erro ao baixar o termo)
# e, na linha do arquivo do termo, sai "2 páginas" (o sistema não conta páginas).
# Peças novas com o prefixo tc-. Uso: python3 termo.py <pasta-saida>
import os, sys, json

AQUI = os.path.dirname(os.path.abspath(__file__))
ARGV0 = list(sys.argv)
# comum.py (cópia sem mudança) aponta para a pasta de aprovadas de outra máquina: carrega com a pasta deste repositório.
import types
_cm = types.ModuleType('comum')
_cm.__file__ = os.path.join(AQUI, 'comum.py')
_src_cm = open(_cm.__file__, encoding='utf-8').read().replace(
    "APROV = '/home/claude/t3just/docs/design/aprovadas/'", "APROV = " + repr(os.path.normpath(os.path.join(AQUI, '../../../aprovadas')) + '/'), 1)
sys.modules['comum'] = _cm
exec(compile(_src_cm, 'comum.py', 'exec'), _cm.__dict__)
sys.path.insert(0, AQUI)
_MARCA = '\n# ---------------------------------------------------------------- estados\n'
_rl = open(os.path.join(AQUI, 'responsavel.py'), encoding='utf-8').read()
_ini = _rl.rindex(_MARCA)
G = {'__file__': os.path.join(AQUI, 'responsavel.py'), '__name__': 'rl'}
exec(compile(_rl[:_ini], 'responsavel.py', 'exec'), G)
globals().update({k: v for k, v in G.items() if not k.startswith('__')})
sys.argv = ARGV0

SAIDA = ARGV0[1] if len(ARGV0) > 1 else '..'
APROV = '../../aprovadas/'
P['U'] = APROV + 'portal-procuracoes/procuracoes.html?estado='

# ---------------------------------------------------------------- a única mudança nos estados aprovados
ANT_FORM, NOVO_FORM = 'PDF · 2 páginas · 380 KB', 'PDF · 380 KB'
ANT_FICHA = 'termo-curatela-sebastiao.pdf · 2 páginas · enviado por Paula Nunes em 05/11'
NOVO_FICHA = 'termo-curatela-sebastiao.pdf · enviado por Paula Nunes em 05/11'


def sem_paginas(h):
    assert ANT_FORM in h or ANT_FICHA in h
    return h.replace(ANT_FORM, NOVO_FORM).replace(ANT_FICHA, NOVO_FICHA)


CSS_TC = r"""
/* ==========================================================================
   Termo de curatela (prefixo tc-). Só tokens e pares aprovados.
   ========================================================================== */
.tc-baixar{margin-top:12px}
.tc-baixar.aviso{padding:12px 14px}
.tc-baixar .aviso-titulo{font-size:14px}
.tc-baixar p{font-size:13px}
/* Marca de desenho (só nas capturas de comparação; não vai para o produto) */
.tc-nota{display:flex;gap:10px;align-items:flex-start;margin:0 0 18px;padding:12px 16px;border:1.5px dashed var(--vinho);border-radius:var(--raio);background:var(--papel);font-size:13px;line-height:1.5;color:var(--tinta)}
.tc-nota .ico{flex:none;color:var(--vinho)}
.tc-nota b{font-weight:600}
.tc-marca{outline:2px dashed var(--vinho);outline-offset:4px;position:relative}
.tc-marca::after{content:"Única mudança";position:absolute;right:8px;top:-12px;padding:1px 8px;border-radius:10px;background:var(--vinho);color:var(--papel);font-size:11px;font-weight:500;letter-spacing:.02em}
/* Navegação entre estados: com o aviso de feito embaixo, ela sobe (só no index.html) */
body:has(.toast) #fl-estados{bottom:auto;top:16px}
"""


def nota(txt):
    return f'<p class="tc-nota">{ico("lapis")}<span>{txt}</span></p>'


def marca(h, alvo):
    """Contorna a linha do arquivo do termo (a única mudança)."""
    i = h.index(alvo)
    j = h.rindex('<div class="rl-arq', 0, i)
    return h[:j] + h[j:].replace('class="rl-arq', 'class="tc-marca rl-arq', 1)


NOTA_MUDA = ('<b>Desenho aprovado, com uma única mudança</b>, contornada abaixo: na linha do arquivo do termo sai “2 páginas”, '
             'porque o sistema não conta páginas. O resto está como foi aprovado.')

# ---------------------------------------------------------------- estado 1: o termo não subiu depois de salvar
TERMO_BLOCO_INI = '<div style="padding:0 24px 18px"><div class="rl-arq rl-tem"'


def sem_bloco_termo(h):
    i = h.index(TERMO_BLOCO_INI)
    j = h.index('Baixar o termo</a></div></div>', i) + len('Baixar o termo</a></div></div>')
    return h[:i] + h[j:]


MANDE = ' Mande de novo em “Mudar”, na folha Quem assina por Sebastião.'
# Frases fixas por caso (não se encaixa a mensagem do servidor). A tabela código → frase está no NOTAS.md.
FRASES = {
    'ARQUIVO': 'O termo de curatela não foi guardado: o arquivo precisa ser PDF ou foto, até 10 MB.' + MANDE,
    'CONEXAO': 'O termo de curatela não foi guardado: não deu para falar com o T3jus.' + MANDE,
    'NAO_CURATELA': 'O termo de curatela não foi guardado: Sebastião não está mais sob curatela na ficha.',
    'SESSAO': 'O termo de curatela não foi guardado: sua sessão terminou. Entre de novo para enviar o termo.',
    'PERMISSAO': 'O termo de curatela não foi guardado: o seu acesso não permite enviar o termo. Fale com quem cuida dos acessos.',
    'OUTRO': 'O termo de curatela não foi guardado: algo deu errado do nosso lado.' + MANDE,
}


def aviso_termo_falhou(titulo, caso):
    """O mesmo aviso de feito da ficha (toast), em tom de atenção, com a frase fixa do caso."""
    return (f'<div class="aviso aviso-atencao toast" role="status">{ico("alerta")}<div><strong class="aviso-titulo">{titulo}</strong><p>{FRASES[caso]}</p></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


def ficha_termo_falhou(titulo, caso):
    h = sem_bloco_termo(ficha_seb())
    return h + aviso_termo_falhou(titulo, caso)


# ---------------------------------------------------------------- estado 2: erro ao baixar o termo
def ficha_baixar_erro():
    h = sem_paginas(ficha_seb())
    erro = ('<div class="aviso aviso-urgencia tc-baixar" id="tc-baixar-erro" role="alert">' + ico('alerta')
            + '<div><strong class="aviso-titulo">Não deu para baixar o termo.</strong>'
              '<p>Não deu para falar com o T3jus agora. Confira a sua internet e tente de novo em instantes.</p></div></div>')
    i = h.index(TERMO_BLOCO_INI)
    j = h.index('Baixar o termo</a></div>', i) + len('Baixar o termo</a></div>')
    k = h.index('<a class="btn btn-sec btn-compacto"', i)
    h = h[:k] + '<a aria-describedby="tc-baixar-erro"' + h[k + 2:]  # o botão continua: tentar de novo é clicar nele outra vez
    j += len(' aria-describedby="tc-baixar-erro"')
    return h[:j] + erro + h[j:]


# ---------------------------------------------------------------- estados
T = ''
ESTADOS = []


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    ESTADOS.append((est, rotulo))


FS = dict(atual='clientes', trilha='Clientes|Sebastião Ramos Filho', titulo='Sebastião Ramos Filho', aba='ficha')
NV = dict(atual='clientes', trilha='Clientes|Novo cliente', titulo='Novo cliente')

add('ficha-termo-falhou', ficha_termo_falhou('Sebastião Ramos Filho cadastrado.', 'CONEXAO') + j_registrar() + j_inativar(),
    'Cadastrou, mas o termo não subiu (sem conexão)', **FS)
add('ficha-termo-falhou-salva', ficha_termo_falhou('Ficha salva.', 'ARQUIVO') + j_registrar() + j_inativar(),
    'Salvou a ficha, mas o termo não subiu (arquivo recusado)', **FS)
add('ficha-baixar-erro', ficha_baixar_erro() + j_registrar() + j_inativar(), 'Erro ao baixar o termo', **FS)

fc = marca(sem_paginas(ficha_seb()), NOVO_FICHA)
fc = fc.replace('<div class="cl">', '<div class="cl">' + nota(NOTA_MUDA), 1)
add('ficha-curatela', fc + j_registrar() + j_inativar(), 'Ficha: Sebastião (sai “2 páginas”)', **FS)

nv = pagina_nova(form_cliente('Sebastião Ramos Filho', '(11) 99182-7364', '', CPF_SEB, 'curatela', vc=V_SEB,
                              qual=qualif_pf(dict(nac='Brasileira', civil='Viúvo(a)', prof='Aposentado', rg='6.214.873-0', rgorg='SSP/SP', cep='04036-000',
                                                  end='Rua Domingos de Morais, 2.180, apto. 51', bairro='Vila Mariana', cidade='São Paulo', uf='SP'), False,
                                             resumo_falta='7 de 7 dados de Sebastião')))
nv = marca(sem_paginas(nv), NOVO_FORM)
nv = nota(NOTA_MUDA) + nv
add('novo-curatela', nv, 'Novo cliente sob curatela (sai “2 páginas”)', **NV)

GRUPOS = [('Estados novos', ['ficha-termo-falhou', 'ficha-termo-falhou-salva', 'ficha-baixar-erro']),
          ('A linha do arquivo (única mudança)', ['ficha-curatela', 'novo-curatela'])]
ROT = dict(ESTADOS)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT)
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

URL = {'Contratos': APROV + 'portal-comercial-contratos/contratos.html?estado=contratos', 'Honorários': APROV + 'portal-comercial-contratos/contratos.html?estado=honorarios',
       'Procurações e modelos': APROV + 'portal-procuracoes/procuracoes.html?estado=procuracoes'}
out = pagina('Termo de curatela', 'Clientes: o termo de curatela na ficha de Sebastião, quando o envio do arquivo falha e quando não dá para baixá-lo.',
             '{"estado":"ficha-termo-falhou","atual":"clientes"}', '', T, P['barras']('contratos', URL))
CSS_P = P['CSS_FICHA'] + P['CSS_HN'] + P['CSS'] + P['CSS_PE'] + P['CSS_PR']
out = out.replace('</style>', CSS_P + '\n' + CSS_CL + '\n' + CSS_FL + '\n' + CSS_RL + '\n' + CSS_TC + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace('</body>', P['SCRIPT_ABAS'] + '\n' + SCRIPT_RL + '\n</body>', 1)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in ESTADOS],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('termo-curatela ok', len(ESTADOS), 'estados,', len(out) // 1024, 'KB')
