# Portal · Contratos › ficha do contrato: "Baixar o contrato" (Word e PDF) no cabeçalho vinho da ficha,
# visível nas três abas (Contrato, Recebimentos, Documentos), sem precisar ir a Documentos.
# Pedido da Carol: abriu a aba Contrato e não achou onde baixar o contrato em PDF.
# Base sem mudança: contrato_pdf.py (D23), que carrega procuracoes.py, contratos.py, pecas.py e comum.py.
# Peças novas com o prefixo fp-. Uso: python3 ficha_pdf.py <pasta-saida>
import sys, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_src = open(os.path.join(AQUI, 'contrato_pdf.py'), encoding='utf-8').read()
_src = _src[:_src.rindex('# ---------------------------------------------------------------- estados')]
_d23 = {'__name__': 'contrato_pdf_base', '__file__': os.path.join(AQUI, 'contrato_pdf.py')}
_argv = sys.argv[:]
exec(compile(_src, 'contrato_pdf.py', 'exec'), _d23)
sys.argv = _argv
globals().update({k: v for k, v in _d23.items() if not k.startswith('__')})

U = 'ficha-pdf.html?estado='
# Os pacotes aprovados ficam fora desta pasta; a aba Documentos leva ao desenho D23, na pasta vizinha.
DOCS = '../contrato-pdf/contrato-pdf.html?estado='
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

CSS_FP = r"""
/* ===== Baixar o contrato no cabeçalho da ficha (peças novas, prefixo fp-) ===== */
.ficha-cab .esq .fp{margin-top:auto;padding-top:14px;border-top:1px solid var(--vinho-2);display:grid;gap:6px;min-width:0}
.fp>.fp-erro,.fp>.fp-status{margin-top:6px}
.fp-linha{display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap}
.fp-rot{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--sal)}
.fp-rot .ico{color:var(--ambar-3)}
.fp-qual{font-size:12px;color:var(--ambar-2)}
.fp .pdf-bx .btn,.fp .fp-bt{background:var(--papel);color:var(--vinho);border-color:var(--papel);box-shadow:none}
.fp .pdf-bx .btn:last-child{border-left-color:var(--vinho-4)}
.fp .pdf-bx .btn:hover,.fp .fp-bt:hover{background:var(--ambar-3);border-color:var(--ambar-3)}
.fp .pdf-bx .btn[aria-disabled=true]{background:var(--sal-2);color:var(--vinho);border:1px solid var(--sal-2);border-left-color:var(--vinho-4)}
.fp .btn:focus-visible,.fp a:focus-visible{outline:3px solid var(--ambar-3);outline-offset:2px;box-shadow:none}
.fp .btn .ico{color:var(--vinho)}
.fp-todos{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--ambar-3);font-size:13px;font-weight:500;text-decoration:underline;text-underline-offset:3px}
.fp-todos:hover{color:var(--papel)}
.fp-status{margin:0;display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--sal);line-height:1.45}
.fp-status .ico{color:var(--ambar-3);flex:none;margin-top:2px}
.fp-status b{color:var(--papel);font-weight:600}
.fp-erro{max-width:620px}
.fp-erro .aviso{margin:0}
.fp-erro .aviso-acoes{display:flex;gap:8px;flex-wrap:wrap}
.fp-erro .aviso-acoes .btn{background:var(--papel);color:var(--vinho);border-color:var(--vinho-4)}
.fp-erro .aviso-acoes .btn:focus-visible{outline:3px solid var(--vinho-3);outline-offset:2px}
.fp-erro .codigo{margin:6px 0 0;font-size:11px;color:var(--ambar-2);letter-spacing:.04em}
.fp-sem{font-size:13px;color:var(--sal)}
.fp-anot{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.45}
.fp-anot .ico{color:var(--vinho);flex:none;margin-top:2px}
.fp-anot b{font-weight:600}
@media (max-width:760px){
  .fp-linha{gap:8px}
  .fp-rot{flex:1 1 100%}
  .fp .pdf-bx-w,.fp .pdf-bx{flex:1 1 100%}
  .fp .pdf-bx .btn,.fp .fp-bt{flex:1 1 50%;min-height:44px}
  .fp .fp-bt{flex:1 1 100%}
  .fp-erro .aviso-acoes .btn{flex:1 1 auto;min-height:44px}
}
"""


# ---------------------------------------------------------------- a peça nova
def fp_word(vis=False):
    pre = 'Baixar o ' if vis else '<span class="sr">Baixar o contrato em </span>'
    return (f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}{pre}Word'
            f'<span class="sr"> (.docx, para editar)</span></button>')


def fp_pdf(estado=''):
    if estado == 'preparando':
        return ('<button class="btn btn-sec btn-compacto" type="button" aria-disabled="true" aria-describedby="fp-st">'
                '<span class="pdf-gira" aria-hidden="true"></span>Preparando o PDF<span class="sr"> do contrato</span></button>')
    return (f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}<span class="sr">Baixar o contrato em </span>PDF'
            f'<span class="sr"> (para mandar ou imprimir)</span></button>')


def todos(est):
    return f'<a class="fp-todos" href="{DOCS}{est}">Ver todos os documentos{ico("dir", "ico ico-s")}</a>'


def baixar_contrato(estado, versao='v1 · gerado em 01/09/2026'):
    """estado: gerado | preparando | erro | assinado | sem."""
    if estado == 'assinado':
        linha = (f'<div class="fp-linha"><span class="fp-rot" id="fp-rot">{ico("pena", "ico ico-s")}Contrato assinado</span>'
                 f'<button class="btn btn-sec btn-compacto fp-bt" type="button" aria-describedby="fp-qual">{ico("baixar", "ico ico-s")}Baixar o assinado (PDF)</button></div>'
                 f'<div class="fp-linha"><span class="fp-qual" id="fp-qual">contrato-assinado.pdf · anexado em 02/09/2026</span>{todos("assinado")}</div>')
        return f'<div class="fp">{linha}</div>'
    if estado == 'sem':
        linha = (f'<div class="fp-linha"><span class="fp-rot" id="fp-rot">{ico("doc", "ico ico-s")}O contrato ainda não foi gerado no T3jus.</span>'
                 f'<a class="btn btn-sec btn-compacto fp-bt" href="#" data-rota="/contratos/modelos/gerar?contrato=c-2026-021">{ico("doc", "ico ico-s")}Gerar o contrato</a></div>'
                 f'<div class="fp-linha"><span class="fp-qual">Sai em Word e PDF, com os dados do cliente e do contrato.</span></div>')
        return f'<div class="fp">{linha}</div>'
    linha = (f'<div class="fp-linha"><span class="fp-rot" id="fp-rot">{ico("doc", "ico ico-s")}Baixar o contrato</span>'
             f'<div class="pdf-bx" role="group" aria-labelledby="fp-rot fp-qual">{fp_word()}{fp_pdf(estado)}</div></div>'
             f'<div class="fp-linha"><span class="fp-qual" id="fp-qual">{versao}</span>{todos("ficha-pdf")}</div>')
    extra = ''
    if estado == 'preparando':
        extra = (f'<p class="fp-status" id="fp-st" role="status">{ico("relogio", "ico ico-s")}'
                 f'<span><b>Preparando o PDF do contrato.</b> Leva alguns segundos; o arquivo baixa sozinho. Pode continuar na tela.</span></p>')
    elif estado == 'erro':
        extra = ('<div class="fp-erro">' + aviso('urgencia', 'Não deu para preparar o PDF do contrato.',
                 'Nada mudou no contrato, e o Word continua para baixar. Tente de novo; se não sair, abra o Word e use Arquivo › Salvar como › PDF.',
                 acoes=(f'<button class="btn btn-sec btn-compacto" type="button" data-foco>{ico("reenviar", "ico ico-s")}Tentar de novo<span class="sr">: PDF do contrato</span></button>'
                        + fp_word(vis=True))) + '<p class="codigo">PDF_INDISPONIVEL</p></div>')
    return f'<div class="fp">{linha}{extra}</div>'


# ---------------------------------------------------------------- a ficha
def cab(numero, cliente, sit, obj, dir_html, fp_html):
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("pena", "ico estatua")}'
            f'<a class="voltar" href="#">{ico("esq", "ico ico-s")}Contratos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Contrato {numero}</p><h1>{cliente}</h1>'
            f'<p class="meta">{sit}<span>{obj}</span></p></div></div>{fp_html}</div>{dir_html}</div>')


def abas(q_rec, q_doc, docs_est):
    d = f'<span class="q">{q_doc}</span>' if q_doc else ''
    a = (f'<a data-aba="contrato" href="#">Contrato</a><a data-aba="recebimentos" href="#">Recebimentos<span class="q">{q_rec}</span></a>'
         f'<a data-aba="documentos" href="{DOCS}{docs_est}">Documentos{d}</a>')
    return f'<nav class="abas" aria-label="Seções do contrato">{a}</nav>'


def assinatura(arquivo):
    arq = (f'<a href="#">{arquivo}</a>' if arquivo else
           f'Ainda não anexado. <a href="#">Anexar o assinado</a>')
    return (f'<section class="folha" aria-labelledby="t-as"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-as" style="font-size:20px">Assinatura</h2></div></div>'
            f'<dl class="hn-dl"><div><dt>Assinado em</dt><dd>02/09/2026</dd></div><div><dt>Registrado por</dt><dd>Felipe Matos</dd></div>'
            f'<div><dt>Arquivo assinado</dt><dd>{arq}</dd></div><div><dt>Veio da proposta</dt><dd><a href="#">P-2026-006</a></dd></div></dl>'
            f'<div class="hn-reserva"><div>{ico("lapis")}<span><b>Assinatura eletrônica:</b> em estudo. Por enquanto, imprime-se, assina-se e anexa-se o arquivo assinado.</span></div></div></section>')


def ficha_far(estado):
    corpo = conds_ler(COND_FAR, sub='O que se combinou. Cada condição diz o que gera.', acoes=f'<button class="btn btn-sec" type="button">{ico("lapis")}Mudar condições</button>') + casos_far()
    arq = 'contrato-assinado.pdf' if estado == 'assinado' else None
    c = cab('C-2026-019', 'Farmácia Bom Jesus Ltda.', SIT_ATIVO, 'Cobranças e consultivo', dir_far(), baixar_contrato(estado))
    lat = pessoas_far() + assinatura(arq) + situacao_far()
    return (f'<div class="hn">{c}{abas(14, 1, "assinado" if arq else "ficha-pdf")}<div class="hn-grade"><div class="hn-col">{corpo}</div>'
            f'<aside class="hn-col" aria-label="Sobre o contrato">{lat}</aside></div></div>')


def ficha_irene():
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p>'
         f'<div class="hn-dir-linha"><p class="grande">05/12</p>{selo("ativo", "R$ 1.200,00")}</div>'
         f'<p class="hn-oque"><b>Parcela 3 de 10</b><br>no Financeiro, em A receber</p>'
         f'<a class="btn btn-pri" href="#">{ico("carteira")}Ver recebimentos</a></section>')
    c = cab('C-2026-021', 'Irene Castro', SIT_ATIVO, 'Inventário', d, baixar_contrato('sem'))
    conds = [cond_ler('parcelado', 'R$ 12.000,00 <small>em 10 parcelas de R$ 1.200,00</small>', 'Todo dia 5, de 05/10/2026 a 05/07/2027.', '10 recebimentos programados.')]
    corpo = conds_ler(conds, sub='O que se combinou. Cada condição diz o que gera.', acoes=f'<button class="btn btn-sec" type="button">{ico("lapis")}Mudar condições</button>')
    resp = (f'<section class="folha" aria-labelledby="t-rs"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-rs" style="font-size:20px">Responsáveis</h2></div></div><ul class="hn-pessoas">'
            f'<li><span class="av-p forte" aria-hidden="true">MR</span><div><strong>Marina Ribeiro</strong><small>Responsável · {OAB["Marina Ribeiro"]}</small></div>{selo("ativo", "Recebe os lembretes")}</li></ul></section>')
    ass = (f'<section class="folha" aria-labelledby="t-as"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-as" style="font-size:20px">Assinatura</h2></div></div>'
           f'<dl class="hn-dl"><div><dt>Assinado em</dt><dd>28/09/2026</dd></div><div><dt>Registrado por</dt><dd>Marina Ribeiro</dd></div>'
           f'<div><dt>Arquivo assinado</dt><dd>Ainda não anexado. <a href="#">Anexar o assinado</a></dd></div></dl></section>')
    return (f'<div class="hn">{c}{abas(10, 0, "ficha-pdf")}<div class="hn-grade"><div class="hn-col">{corpo}</div>'
            f'<aside class="hn-col" aria-label="Sobre o contrato">{resp}{ass}</aside></div></div>')


# ---------------------------------------------------------------- estados
ESTADOS = [
    ('gerado', lambda: ficha_far('gerado'), 'C-2026-019'),
    ('assinado', lambda: ficha_far('assinado'), 'C-2026-019'),
    ('preparando', lambda: ficha_far('preparando'), 'C-2026-019'),
    ('erro', lambda: ficha_far('erro'), 'C-2026-019'),
    ('sem-documento', ficha_irene, 'C-2026-021'),
]
T = ''
for est, f, num in ESTADOS:
    # A trilha corrigida: área › número (sem repetir "Contratos" da seção).
    T += tpl(est, f(), area='contratos', secao='Contratos', atual='contratos', trilha=f'Contratos|{num}', titulo=num, aba='contrato')

URL = {'Contratos': '#', 'Honorários': '#', 'Procurações e modelos': '#'}
out = montar('ficha-pdf.html', 'Baixar o contrato na ficha',
             'Contratos › ficha do contrato: o grupo “Baixar o contrato” (Word e PDF) fica no cabeçalho vinho, visível em todas as abas.',
             '{"estado":"gerado","atual":"contratos"}', T, barras('contratos', URL), CSS + CSS_PE + CSS_PR + CSS_PDF + CSS_FP)
# Links para os pacotes aprovados (fora desta pasta) viram "#"; os da aba Documentos levam ao D23 vizinho.
out = re.sub(r'href="\.\./portal-[^"]*"', 'href="#"', out)
out = out.replace('</body>', SCRIPT_ABAS + '\n</body>', 1)
open(os.path.join(SAIDA, 'ficha-pdf.html'), 'w', encoding='utf-8').write(out)
print('ficha-pdf ok', T.count('<template data-est='), 'estados')
