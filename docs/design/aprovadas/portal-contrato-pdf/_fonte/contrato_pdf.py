# Portal · Contratos › ficha do contrato › aba Documentos: baixar em Word (.docx) e em PDF.
# Pedido da Carol: "Dentro de contrato não tem a opção de baixar o PDF ou o doc".
# Parte da aba Documentos aprovada (portal-procuracoes, decisões 18 e 20) e só muda as ações de cada documento.
# Base sem mudança: procuracoes.py (que carrega contratos.py, pecas.py e comum.py). Peças novas com o prefixo pdf-.
# Uso: python3 contrato_pdf.py <pasta-saida>
import sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_src = open(os.path.join(AQUI, 'procuracoes.py'), encoding='utf-8').read()
_src = _src[:_src.rindex('# ---------------------------------------------------------------- estados')]
_ns = {'__name__': 'procuracoes_base', '__file__': os.path.join(AQUI, 'procuracoes.py')}
_argv = sys.argv[:]
exec(compile(_src, 'procuracoes.py', 'exec'), _ns)
sys.argv = _argv
globals().update({k: v for k, v in _ns.items() if not k.startswith('__')})

# Os links das peças aprovadas levam ao pacote aprovado, na pasta vizinha.
U_PR = '../portal-procuracoes/procuracoes.html?estado='
U = 'contrato-pdf.html?estado='
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

CSS_PDF = r"""
/* ===== Baixar em Word e em PDF (peças novas, prefixo pdf-) ===== */
.pr-doc.pdf-doc{grid-template-columns:44px minmax(0,1fr) auto;align-items:start;row-gap:10px}
.pdf-doc .pe-ci{grid-row:1/3}
.pdf-doc .pdf-sit{justify-self:end}
.pdf-doc .pdf-sit .selo{margin-top:0}
.pdf-doc .pdf-bts{grid-column:2/-1}
.pdf-bts{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.pdf-bx-w{display:inline-flex;align-items:center;gap:8px}
.pdf-bx-rot{font-size:12px;color:var(--texto-2)}
.pdf-bx{display:inline-flex;gap:0}
.pdf-bx .btn{border-radius:0}
.pdf-bx .btn:first-child{border-radius:var(--raio) 0 0 var(--raio)}
.pdf-bx .btn:last-child{border-radius:0 var(--raio) var(--raio) 0;margin-left:-1px}
.pdf-bx .btn:focus-visible{position:relative;z-index:1}
.pdf-tipo{display:inline-grid;place-items:center;min-width:30px;height:18px;padding:0 4px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.04em;background:var(--sal-2);color:var(--vinho);border:1px solid var(--borda-campo,#AC788D)}
.btn[aria-disabled=true]{cursor:progress}
.pdf-gira{width:16px;height:16px;border-radius:50%;border:2px solid var(--sal);border-top-color:var(--vinho);animation:pdf-gira .9s linear infinite;flex:none}
@keyframes pdf-gira{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.pdf-gira{animation:none;border-top-color:var(--vinho);border-right-color:var(--vinho)}}
.pdf-status{margin:10px 0 0 58px;display:flex;gap:8px;align-items:center;font-size:13px;color:var(--texto-2)}
.pdf-status b{color:var(--texto);font-weight:500}
.pdf-nota{margin:10px 0 0 58px;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta,#2A1A22);font-size:13px;line-height:1.45}
.pdf-nota .ico{flex:none;margin-top:2px;color:var(--vinho)}
.pdf-nota b{font-weight:600}
.pdf-erro{margin:10px 0 0 58px}
.pdf-erro .aviso{margin:0}
.pdf-erro .aviso-acoes{display:flex;gap:8px;flex-wrap:wrap}
.pdf-erro .codigo{margin:6px 0 0;font-size:11px;color:var(--texto-2);letter-spacing:.04em}
.pdf-sem{margin:10px 0 0 58px;font-size:13px}
.pdf-sem summary{display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer;color:var(--vinho);font-weight:500}
.pdf-sem .pdf-sem-c{padding:4px 0 6px 12px;border-left:2px solid var(--divisor);display:grid;gap:8px}
.pdf-sem .pdf-sem-c p{margin:0;color:var(--texto-2);font-size:12px}
.pdf-sem .pdf-sem-l{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--texto-2);font-size:12px}
.pdf-sem .pdf-sem-l b{color:var(--texto);font-weight:500}
.pdf-ajuda{display:flex;gap:10px;align-items:flex-start}
.pdf-ajuda ul{margin:0;padding:0;list-style:none;display:grid;gap:4px}
.pr-doc .pdf-fmt{display:block;font-size:12px;color:var(--texto-2);margin-top:2px}
@media (max-width:760px){
  .pr-doc.pdf-doc{grid-template-columns:44px minmax(0,1fr)}
  .pdf-doc .pe-ci{grid-row:auto}
  .pdf-doc .pdf-sit{grid-column:2;justify-self:start}
  .pr-doc .pdf-bts{grid-column:1/-1;justify-content:stretch;width:100%}
  .pdf-bx-w{flex:1 1 100%;flex-wrap:wrap;gap:4px}
  .pdf-bx-rot{flex:1 1 100%}
  .pr-doc .pdf-bts>.btn{flex:1 1 100%}
  .pdf-bx{flex:1 1 100%}
  .pdf-bx .btn{flex:1 1 50%}
  .pdf-status,.pdf-nota,.pdf-erro,.pdf-sem{margin-left:0}
  .pdf-erro .aviso-acoes .btn{flex:1 1 auto}
  .pdf-sem .pdf-sem-l .pdf-bx{flex:1 1 100%}
}
"""


def b_word(curto, cls='btn btn-sec btn-compacto', v='', vis=False):
    pre = 'Baixar o ' if vis else '<span class="sr">Baixar em </span>'
    return (f'<button class="{cls}" type="button">{ico("baixar", "ico ico-s")}{pre}Word<span class="sr"> (.docx, para editar){v}: {curto}</span>'
            '</button>')


def b_pdf(curto, estado='', cls='btn btn-sec btn-compacto', v='', simples=False):
    s = ', leiaute simples' if simples else ''
    if estado == 'preparando':
        return (f'<button class="{cls}" type="button" aria-disabled="true" aria-describedby="pdf-st-c">'
                f'<span class="pdf-gira" aria-hidden="true"></span>Preparando o PDF<span class="sr">: {curto}</span></button>')
    return (f'<button class="{cls}" type="button">{ico("baixar", "ico ico-s")}<span class="sr">Baixar em </span>PDF<span class="sr"> (para mandar ou imprimir{s}){v}: {curto}</span>'
            '</button>')


def bx(curto, estado='', v='', simples=False):
    # "Baixar" visível como rótulo do grupo; os dois botões dizem o formato.
    gid = 'bx-' + str(abs(hash(curto + v)) % 100000)
    return (f'<div class="pdf-bx-w"><span class="pdf-bx-rot" aria-hidden="true">Baixar</span><div class="pdf-bx" role="group" aria-label="Baixar {curto}{v}">'
            + b_word(curto, v=v) + b_pdf(curto, estado, v=v, simples=simples) + '</div></div>')


def versao_anterior(curto):
    return (f'<details class="pr-vers"><summary>{ico("historico", "ico ico-s")}Versão anterior (1)</summary><ol>'
            f'<li><b>v1</b><span>hoje, 15h10 · Marina Ribeiro · com [RG: falta] · guardada</span>'
            + bx(curto, v=', versão 1') + '</li></ol></details>')


def linha(nome, base, curto, situacao, extra='', estado='', modelo='Padrão T3jus', simples=False, assinado=None, sem_aberto=False):
    """assinado: (arquivo, formato, meta) do assinado anexado."""
    if assinado:
        arq, fmt, meta = assinado
        bts = (f'<div class="pdf-bts"><button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}'
               f'Baixar o assinado ({"PDF" if fmt == "pdf" else "foto"})<span class="sr">: {curto}</span></button></div>')
        info = f'<small>{arq} · {meta}</small>'
        ab = ' open' if sem_aberto else ''
        extra = (f'<details class="pdf-sem"{ab}><summary>{ico("doc", "ico ico-s")}Sem assinatura (v2): Word e PDF</summary><div class="pdf-sem-c">'
                 f'<p>O que vale é o assinado. Use o Word só se for gerar uma versão nova.</p>'
                 f'<div class="pdf-sem-l"><b>v2</b><span>{base} · hoje, 16h02</span>{bx(curto, v=", sem assinatura")}</div></div></details>') + extra
    else:
        bts = (f'<div class="pdf-bts"><a class="btn btn-pri btn-compacto" href="{U_PR}anexar">{ico("enviar", "ico ico-s")}Anexar o assinado<span class="sr">: {curto}</span></a>'
               + bx(curto, estado, simples=simples) + '</div>')
        info = f'<small>{base} · hoje, 16h02 · Marina Ribeiro · {modelo}</small>'
    vers = '' if assinado else versao_anterior(curto)
    return (f'<li><div class="pr-doc pdf-doc"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div class="pdf-info"><b>{nome}<span class="pr-v">v2</span></b>'
            f'{info}</div><div class="pdf-sit">{situacao}</div>{bts}</div>{extra}{vers}</li>')


FALTA = sel('atencao', 'Falta anexar o assinado', 'relogio')
AJUDA = (f'<div class="hn-pe pdf-ajuda">{ico("ajuda")}<ul>'
         f'<li><b>Word</b> é para editar antes de imprimir. <b>PDF</b> é para mandar ao cliente ou imprimir como está.</li>'
         f'<li>O PDF sai do documento gerado. Se você mudou algo no Word, salve o PDF pelo próprio Word.</li>'
         f'<li>Gerar de novo guarda a versão anterior. O assinado anexado continua valendo mesmo depois de uma versão nova.</li></ul></div>')


def ficha(variante=''):
    assinado = variante == 'assinado'
    if assinado:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p>'
             f'<div class="hn-dir-linha"><p class="grande">10/12</p>{selo("ativo", "R$ 666,67")}</div>'
             f'<p class="hn-oque"><b>Parcela 1 de 3</b><br>no Financeiro, em A receber</p>'
             f'<a class="btn btn-pri" href="{U_CT}contrato-recebimentos">{ico("carteira")}Ver recebimentos</a></section>')
        sit = '<span class="selo selo-ativo">Ativo</span>'
    else:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-px"><p class="sobretitulo" id="t-px">Próximo passo</p>'
             f'<p class="grande" style="font-size:30px">Assinatura</p>'
             f'<p class="hn-oque"><b>Os 3 documentos esperam o assinado.</b><br>Anexar o contrato assinado ativa o contrato e manda a programação ao Financeiro.</p>'
             f'<div class="hn-dir-acoes"><a class="btn btn-pri" href="{U_PR}anexar">{ico("enviar")}Anexar os assinados</a></div></section>')
        sit = '<span class="selo selo-ativo">Em elaboração</span>'
    cab = ficha_cab_c('C-2026-033', 'Benedito Souza Lima', sit, 'Aposentadoria por idade', d)

    ec, nota_c, mod_c, simples = '', '', 'Padrão T3jus', False
    if variante == 'preparando':
        ec = 'preparando'
        nota_c = (f'<p class="pdf-status" id="pdf-st-c" role="status">{ico("relogio", "ico ico-s")}'
                  f'<span><b>Preparando o PDF do contrato.</b> Leva alguns segundos; o arquivo baixa sozinho. Pode continuar na tela.</span></p>')
    elif variante == 'erro':
        nota_c = ('<div class="pdf-erro">' + aviso('urgencia', 'Não deu para preparar o PDF do contrato.',
                  'Nada mudou no documento, e o Word continua para baixar. Tente de novo; se não sair, abra o Word e use Arquivo › Salvar como › PDF.',
                  acoes=(f'<button class="btn btn-sec btn-compacto" type="button" data-foco>{ico("reenviar", "ico ico-s")}Tentar de novo<span class="sr">: PDF do contrato</span></button>'
                         + b_word('o contrato', vis=True))) + '<p class="codigo">PDF_INDISPONIVEL</p></div>')
    elif variante == 'modelo':
        mod_c, simples = 'Modelo do escritório, v2 · com tabela e imagem', True
        nota_c = (f'<p class="pdf-nota">{ico("alerta")}<span><b>O PDF sai num leiaute simples, no timbrado.</b> O texto é o mesmo do Word, mas a tabela e a imagem do seu modelo ficam só no Word. '
                  f'Para um PDF igual ao Word, salve como PDF pelo Word.</span></p>')

    if assinado:
        s_c = sel('ok', 'Assinado em 21/11 · ativou o contrato', 'check')
        s_o = sel('ok', 'Assinada em 21/11', 'check')
        docs = (linha('Contrato de honorários', 'contrato-honorarios-benedito-lima', 'o contrato', s_c,
                      assinado=('contrato-assinado-benedito.pdf', 'pdf', 'PDF · 4 páginas · 1,2 MB · anexado hoje, 17h20 por Marina Ribeiro'), sem_aberto=True)
                + linha('Procuração', 'procuracao-benedito-lima', 'a procuração', s_o,
                        assinado=('procuracao-assinada-benedito.jpg', 'foto', 'foto · 2,4 MB · anexada hoje, 17h20 por Marina Ribeiro'))
                + linha('Declaração de hipossuficiência', 'declaracao-benedito-lima', 'a declaração', FALTA))
        sub = '3 documentos · 2 assinados · falta anexar a declaração'
    else:
        docs = (linha('Contrato de honorários', 'contrato-honorarios-benedito-lima', 'o contrato', FALTA, nota_c, ec, mod_c, simples)
                + linha('Procuração', 'procuracao-benedito-lima', 'a procuração', FALTA)
                + linha('Declaração de hipossuficiência', 'declaracao-benedito-lima', 'a declaração', FALTA))
        sub = '3 documentos · versão 2 · falta anexar os assinados'
    acoes = f'<a class="btn btn-sec" href="{U_PR}gerar-novo">{ico("reenviar")}Gerar de novo</a>'
    lista = folha('t-dc', 'Documentos deste contrato', f'<ul class="pr-docs">{docs}</ul>{AJUDA}', sub, acoes, extra=' style="overflow:hidden"')
    if assinado:
        assin = (f'<dl class="hn-dl"><div><dt>Assinado em</dt><dd>21/11/2026</dd></div><div><dt>Registrado por</dt><dd>Marina Ribeiro</dd></div>'
                 f'<div><dt>Arquivo assinado</dt><dd><a href="#">contrato-assinado-benedito.pdf</a></dd></div></dl>')
    else:
        assin = (f'<p class="hn-pe" style="border-top:0;padding-top:0">{ico("pena")}<span>Anexar o <b>contrato</b> assinado é o mesmo que registrar a assinatura na aba Contrato: '
                 f'o contrato fica ativo e a programação vai ao Financeiro. A procuração e a declaração só ficam guardadas.</span></p>')
    lat = (folha('t-as', 'Assinatura', assin + reserva('O lugar fica reservado. Por enquanto, imprime-se, assina-se e anexa-se o assinado.'), pequeno=True)
           + folha('t-ad', 'Advogados nos documentos', adv_lista().replace('<li><span class="av-p forte" aria-hidden="true">LC</span><div><strong>Larissa Costa</strong><small>OAB/SP nº 401.226</small></div></li>', ''),
                   'Os do contrato, com as inscrições escolhidas.', pequeno=True))
    abas = abas_ficha(U_CT + 'criado').replace(f'href="{_ns["U"]}ficha-documentos"', f'href="{U}ficha-pdf"')
    return f'<div class="hn">{cab}{abas}<div class="hn-grade"><div class="hn-col">{lista}</div><aside class="hn-col" aria-label="Sobre a assinatura">{lat}</aside></div></div>'


# ---------------------------------------------------------------- estados
HIP = (f'<p class="pr-hip">{ico("ajuda")}<span><b>Hipótese a validar (CH-08).</b> Desenho para conversar com os escritórios piloto antes de programar.</span></p>')
FI = dict(area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|C-2026-033', titulo='C-2026-033', aba='documentos')
T = ''
for est, var in [('ficha-pdf', ''), ('pdf-preparando', 'preparando'), ('pdf-erro', 'erro'), ('pdf-modelo-proprio', 'modelo'), ('assinado', 'assinado')]:
    T += tpl(est, HIP + ficha(var), **FI)

URL = {'Contratos': U_CT + 'contratos', 'Honorários': U_CT + 'honorarios', 'Procurações e modelos': U_PR + 'procuracoes'}
out = montar('contrato-pdf.html', 'Contrato em Word e PDF', 'Contratos › ficha do contrato › Documentos: cada documento gerado baixa em Word (.docx) e em PDF; o assinado anexado baixa como está.',
             '{"estado":"ficha-pdf","atual":"contratos"}', T, barras('contratos', URL), CSS + CSS_PE + CSS_PR + CSS_PDF)
out = out.replace('</body>', SCRIPT_ABAS + '\n</body>', 1)
open(os.path.join(SAIDA, 'contrato-pdf.html'), 'w', encoding='utf-8').write(out)
print('contrato-pdf ok', T.count('<template data-est='), 'estados')
