# Gerar documentos (Procurações e modelos, aprovado em 21/11/2026) com o aviso de advogado com dados faltando.
# Carrega as definições do procuracoes.py aprovado (sem gerar o procuracoes.html) e troca só os dados do
# elenco (escritório Santana, em Salvador) e o bloco dos advogados, que agora mostra a qualificação.
# Uso: python3 doc_falta.py <pasta-saida>
import sys, os
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA_DF = sys.argv[1] if len(sys.argv) > 1 else '..'
_s = open(os.path.join(AQUI, 'procuracoes.py'), encoding='utf-8').read()
_s = _s[:_s.rindex('# ---------------------------------------------------------------- estados')]
exec(compile(_s, 'procuracoes.py', 'exec'), globals())
from elenco import CAROL, RAFAEL, qualificacao, faltas, lista_e, oab_curta, rebatizar, END_ESC

U = 'documentos.html?estado='
ESC = ('SANTANA ADVOCACIA', 'OAB/BA nº 4.217', '52.318.904/0001-62', END_ESC)
CIDADE_DATA = 'Salvador, 22 de novembro de 2026'
END_CLI = 'Rua Alfredo Magalhães, 145, apto. 302, Barbalho, Salvador/BA, CEP 40301-110'
CPF_CLI = cpf('274615938')
EQUIPE_EDITAR = 'equipe.html?estado=equipe-pessoa-editar'


def timbre():
    return '<div class="pe-timbre"><span>Santana</span><span>Advocacia</span></div>'


def qual_cli():
    return (f'<{C}>BENEDITO SOUZA LIMA</mark>, <{C}>brasileiro, casado, pedreiro</mark>, portador do <{C}>RG nº 05.418.207-11 SSP/BA</mark>, '
            f'inscrito no CPF sob o nº <{C}>{CPF_CLI}</mark>, residente na <{C}>{END_CLI}</mark>')


def marca(s):
    return f'<{C}>{s}</mark>'


def qual_adv(p):
    return qualificacao(p, marca=marca).replace('class="cd-falta"', 'class="pe-falta"')


def advs_doc():
    return f'{qual_adv(CAROL)}, e {qual_adv(RAFAEL)}'


def papel_contrato_q():
    return (f'<div class="pe-papel">{timbre()}<h3>CONTRATO DE HONORÁRIOS</h3>'
            f'<p style="text-align:center;margin-top:-8px">nº <{C}>C-2026-041</mark></p>'
            f'<p><b>CONTRATANTE:</b> {qual_cli()}.</p>'
            f'<p><b>CONTRATADA:</b> <{C}>{ESC[0]}</mark>, sociedade de advogados inscrita na <{C}>{ESC[1]}</mark> e no CNPJ sob o nº <{C}>{ESC[2]}</mark>, '
            f'com sede na <{C}>{ESC[3]}</mark>, por seus advogados {advs_doc()}.</p>'
            f'<p class="pe-mais">{ico("doc")}<span>Continua com as cláusulas do modelo do escritório (v2), a data e as assinaturas. O T3jus não muda esse texto.</span></p></div>')


def papel_procuracao_q():
    return (f'<div class="pe-papel">{timbre()}<h3>PROCURAÇÃO</h3>'
            f'<p><b>OUTORGANTE:</b> {qual_cli()}.</p>'
            f'<p><b>OUTORGADOS:</b> {advs_doc()}, onde recebem intimações, a quem confere os poderes da cláusula <i>ad judicia et extra</i>'
            f'{poderes_txt(POD_BEN, OUTRO_BEN)}.</p>'
            f'<p><{F}>{CIDADE_DATA}</mark>.</p><p class="pe-ass"><{C}>BENEDITO SOUZA LIMA</mark></p>'
            f'<p class="pe-mais">{ico("doc")}<span>Modelo padrão do T3jus. O texto que não está marcado é do modelo e não muda.</span></p></div>')


CSS_DF = r"""
/* Gerar documentos · advogado com dados faltando (prefixo cd-) */
#gd-form .aviso>div{min-width:0}
.cd-nw{white-space:nowrap}
#gd-form .aviso .btn{max-width:100%;white-space:normal;height:auto;min-height:44px;text-align:left}
#gd-adv legend{white-space:normal;max-width:100%}
#gd-adv legend small{white-space:normal;display:inline}
.cd-adv-dados{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;margin:8px 0 0 34px;font-size:12px;color:var(--texto-2);line-height:1.45}
.cd-adv-dados .selo{flex:none}
.cd-adv-dados a{color:var(--vinho);font-weight:500;display:inline-flex;align-items:center;min-height:24px}
.cd-adv-dados.ok .ico{width:16px;height:16px;color:var(--vinho-4)}
@media (max-width:760px){#gd-adv legend{white-space:normal;max-width:100%}
#gd-adv legend small{white-space:normal;display:inline}
.cd-adv-dados{margin-left:0}.cd-adv-dados a{min-height:44px}}
"""


def adv_fs():
    blocos = ''
    for p, papel in ((CAROL, 'Responsável pelo contrato'), (RAFAEL, 'Advogado no contrato')):
        ins = p['oab']
        nome = p['curto']
        pnm = nome.split()[0]
        if len(ins) == 1:
            ih = f'<p class="pe-insc-uma">{oab_curta(ins[0]).replace("OAB/BA ", "OAB/BA nº ")}<small>única inscrição</small></p>'
        else:
            ih = (f'<fieldset class="pe-insc"><legend>Inscrições de {pnm} nestes documentos</legend>'
                  + ''.join(op(f'gd-insc-{pnm.lower()}', oab_curta(i), i[3], True) for i in ins) + '</fieldset>')
        f = faltas(p)
        if f:
            d = (f'<p class="cd-adv-dados"><span class="selo selo-atencao">Falta{"m" if len(f) > 1 else ""} {len(f)}</span>'
                 f'<span>{lista_e(f)[0].upper() + lista_e(f)[1:]} de {pnm} saem marcados.</span><a href="{EQUIPE_EDITAR}">Completar na Equipe</a></p>')
        else:
            d = f'<p class="cd-adv-dados ok">{ico("check")}<span>Dados para os documentos completos.</span></p>'
        blocos += f'<div class="pe-a">{op("gd-adv", f"<strong style=font-weight:500>{nome}</strong>", papel, True, id_="gd-adv-" + pnm.lower())}{ih}{d}</div>'
    sai = (f'<p class="pe-sai" aria-live="polite">{ico("pena")}<span><b>No documento:</b> CAROLINA SOARES SANTANA, OAB/BA nº 63.876-S, e '
           f'RAFAEL AUGUSTO MENEZES LIMA, OAB/BA nº 71.204 e OAB/SE nº 1.288, cada um com a qualificação completa (veja a prévia).</span></p>')
    return (f'<fieldset class="pe-fs c6" id="gd-adv" aria-describedby="gd-adv-aj"><legend>Advogados outorgados<small>dados da Equipe e de Sua conta</small></legend>'
            f'<div class="pe-adv">{blocos}</div>'
            f'<p class="ajuda" id="gd-adv-aj">Vêm marcados os advogados do contrato. Mudar aqui vale só para estes documentos. Sem OAB na Equipe, não aparecem: Júlia Andrade.</p>{sai}</fieldset>')


def gerar_falta():
    f = faltas(RAFAEL)
    aviso_adv = aviso('atencao', f'Faltam {len(f)} dados de Rafael Menezes, advogado: o estado civil e o CPF.',
                      'Dá para gerar assim: o contrato e a procuração saem com [ESTADO CIVIL: falta] e [CPF: falta] na qualificação de Rafael, '
                      'para preencher à mão ou no Word. Ou complete antes: ao voltar, a prévia já vem com os dados novos.',
                      icone='pena', acoes=f'<a class="btn btn-sec" href="{EQUIPE_EDITAR}">{ico("lapis")}Completar os dados de Rafael</a>')
    r = (contrato_card('BL', 'Benedito Souza Lima', 'C-2026-041 · Aposentadoria por idade · em elaboração', 'Veio da ficha do contrato. As condições, os advogados e as inscrições já estão lá.')
         + '<div class="c6">' + aviso_adv + '</div>'
         + documentos_fs(('c', 'p')) + adv_fs() + poderes_fs(POD_BEN, OUTRO_BEN) + data_campo())
    pe = pe_gerar('<b>Vão sair 2 arquivos .docx</b>: contrato e procuração.',
                  '2 dados saem marcados em cada um: o estado civil e o CPF de Rafael. Cada geração fica registrada, com quem gerou e quando.', 'Gerar 2 documentos', '#')
    paineis = [('c', 'Contrato', 2, papel_contrato_q()), ('p', 'Procuração', 2, papel_procuracao_q())]
    return pagina_gerar(r, previa(paineis, 'c'), pe)


GE = dict(area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Gerar documentos', titulo='Gerar documentos')
T = tpl('documento-falta', com_hip(gerar_falta()), **GE)
URL = {'Contratos': '#', 'Honorários': '#', 'Procurações e modelos': U + 'documento-falta'}
out = montar('documentos.html', 'Gerar documentos', 'Contratos › Gerar documentos: o aviso de advogado com dados faltando para a qualificação.',
             '{"estado":"documento-falta","atual":"contratos"}', T, barras('contratos', URL), CSS + CSS_PE + CSS_PR + CSS_DF)
out = out.replace('</body>', SCRIPT_ABAS + '\n</body>', 1)
out = rebatizar(out)
open(os.path.join(SAIDA_DF, 'documentos.html'), 'w', encoding='utf-8').write(out)
print('documentos ok', T.count('<template data-est='), 'estado')
