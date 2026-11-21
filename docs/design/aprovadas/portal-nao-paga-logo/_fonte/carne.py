# Portal · Carnê de pagamento dos honorários parcelados (FI-23).
# Reusa, sem mudança, o gerador do Financeiro aprovado (financeiro.py + comum.py) e o de Contratos
# (contratos.py + pecas.py): importa os dois, que gravam as páginas aprovadas, e acrescenta os estados
# novos com peças de prefixo cn-. Gera financeiro.html, contratos.html e escritorio.html.
# Uso: python3 carne.py <pasta-saida>
import sys, os, html
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import financeiro as F          # grava SAIDA/financeiro.html (aprovado) e expõe as peças
import contratos as C           # grava SAIDA/contratos.html (aprovado)
from comum import tpl, janela, aviso, toast, ico, estado, SCRIPT, pagina
from carne_dados import *

H = html.escape
ARQ = 'financeiro.html?estado='
ESCR = 'escritorio.html?estado='

# ---------------------------------------------------------------- pessoa nova: quem tem Financeiro e não é dona
QUEM_FIN = ("financeiro:{nome:'Diego Almeida',ini:'D',papel:'Áreas: Comercial e Financeiro',areas:['comercial','financeiro'],dono:false},"
            "'sem-area':{")

SPRITE_CN = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
             '<symbol id="i-carne" viewBox="0 0 24 24"><path d="M3.5 5h17v14h-17Z"/><path d="M8.5 5v2M8.5 9.5v2M8.5 14v2M8.5 18.5V19"/><path d="M11.5 9.5h6M11.5 13h6M11.5 16h3.5"/></symbol>'
             '<symbol id="i-impressora" viewBox="0 0 24 24"><path d="M7 9V3.5h10V9"/><path d="M7 17H4V9h16v8h-3"/><path d="M7 14h10v6.5H7Z"/></symbol>'
             '<symbol id="i-qr" viewBox="0 0 24 24"><path d="M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4Z"/><path d="M14 14h2v2h-2ZM18 18h2v2h-2ZM14 18h2M18 14h2"/></symbol>'
             '</svg>')

CSS_CN = r"""
/* ==========================================================================
   Portal · Carnê (FI-23). Prefixo cn-. Só tokens e pares já aprovados.
   ========================================================================== */
.janela.cn-janela{width:min(920px,calc(100vw - 32px))}
.cn-j{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:24px;align-items:start}
.cn-j-op{display:grid;gap:18px;min-width:0}
.cn-dois{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.cn-parcs{list-style:none;margin:4px 0 0 34px;padding:8px 12px;display:grid;gap:0;border-left:2px solid var(--borda-folha)}
.cn-parcs li+li{border-top:1px solid var(--divisor)}
.cn-parcs .opcao{margin:0}
.cn-parcs .opcao>span{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;width:100%}
.cn-parcs .opcao>span>b{font-weight:500}
.cn-parcs .opcao>span>.num{text-align:right;font-weight:500}
.cn-parcs .opcao>span>small{grid-column:1/-1}
.cn-parcs .cn-paga{color:var(--texto-2)}
.cn-parcs .cn-paga .opcao{cursor:default}
.cn-pixbox{display:grid;gap:10px;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2)}
.cn-pixbox h3{display:flex;align-items:center;gap:8px;font-size:18px;line-height:1.2}
.cn-pixbox h3 .ico{color:var(--vinho)}
.cn-pixbox dl{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 14px;font-size:13px}
.cn-pixbox dt{color:var(--texto-2)}
.cn-pixbox dd{margin:0;font-weight:500;overflow-wrap:anywhere}
.cn-pixbox p{font-size:13px;line-height:1.5}
.cn-pixbox .cn-quem{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--texto-2)}
.cn-pixbox .cn-quem .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}
.cn-pixbox .cn-quem a{font-weight:500}
.cn-mini{margin:0;display:grid;gap:10px;position:sticky;top:0}
.cn-mini a.cn-mini-img{display:block;border-radius:6px;box-shadow:0 8px 22px -12px rgba(42,26,34,.45);border:1px solid var(--borda-folha);overflow:hidden;background:#fff}
.cn-mini img{display:block;width:100%;height:auto}
.cn-mini figcaption{font-size:13px;line-height:1.5}
.cn-mini figcaption b{font-weight:500;display:block}
.cn-mini figcaption a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-weight:500}
.cn-envio{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--texto-2)}
.cn-envio .ico{color:var(--vinho);flex:none;margin-top:1px}
.cn-envio b{color:var(--texto);font-weight:500}
.cn-j .aviso{margin:0}
.cn-sobre-pe{margin-right:auto;align-self:center;font-size:12px;color:var(--texto-2);max-width:330px;line-height:1.45}
.cn-anexo{display:flex;align-items:center;gap:10px;margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--sal-2);font-size:12px}
.cn-anexo .ico{color:var(--vinho)}
.cn-anexo b{display:block;font-weight:500;font-size:13px}

/* Folha "Carnê" na ficha do contrato */
.cn-folha-corpo{padding:0 24px 18px;display:grid;gap:14px}
.cn-folha-corpo>p{font-size:13px;line-height:1.5;color:var(--texto-2)}
.cn-folha-corpo .btn{justify-self:start}
.cn-chave{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.45}
.cn-chave .ico{color:var(--vinho);flex:none;margin-top:1px}
.cn-chave b{font-weight:500}
.cn-hist{list-style:none;margin:0;padding:0;display:grid}
.cn-hist li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;padding:12px 0;border-top:1px solid var(--divisor)}
.cn-hist li:first-child{border-top:0;padding-top:0}
.cn-hist li>.ico{color:var(--vinho);margin-top:2px}
.cn-hist strong{display:block;font-weight:500;line-height:1.4}
.cn-hist small{display:block;font-size:12px;color:var(--texto-2);line-height:1.5}
.cn-hist .cn-acoes{grid-column:2;display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.cn-hist .selo{margin-top:4px}
.cn-mudou{display:block;font-size:12px;color:var(--vinho-3);font-weight:500}
.cn-folha .aviso{margin:0}
section[aria-labelledby="t-parc"] .folha-cab .acoes{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.contador.cn-passou{color:var(--vinho-3);font-weight:600}

/* Escritório › Recebimento */
.cn-form{display:grid;gap:18px;padding:0 24px 22px}
.cn-campo-linha{display:flex;align-items:baseline;gap:8px}
.cn-teste{display:grid;grid-template-columns:120px minmax(0,1fr);gap:16px;align-items:center;padding:14px;border-radius:var(--raio);border:1px solid var(--borda-folha);background:var(--papel)}
.cn-teste .cn-qr{width:120px;height:120px;display:block}
.cn-teste p{font-size:13px;line-height:1.5}
.cn-teste p b{font-weight:500}
.cn-teste h3{font-size:18px;margin-bottom:4px}
.cn-teste-vazio{grid-template-columns:48px minmax(0,1fr);background:var(--sal-2);border-style:dashed}
.cn-teste-vazio .ico{width:40px;height:40px;color:var(--vinho-4)}
.cn-marca{display:grid;gap:6px}
.cn-marca-prev{display:inline-grid;gap:0;padding:10px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:#fff;justify-self:start}
.cn-marca-prev b{font-family:var(--serifa);font-size:22px;font-weight:600;color:var(--vinho);line-height:1}
.cn-marca-prev span{font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:var(--texto-2)}
.cn-ro{margin:0;display:grid;gap:0}
.cn-ro div{display:grid;grid-template-columns:220px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--divisor)}
.cn-ro div:first-child{border-top:0}
.cn-ro dt{font-size:13px;color:var(--texto-2)}
.cn-ro dd{margin:0;font-weight:500;overflow-wrap:anywhere}
.cn-lista{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.cn-lista li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.45}
.cn-lista li .ico{color:var(--vinho);flex:none;margin-top:1px}
.cn-lista b{font-weight:500}

@media (max-width:760px){
  .janela.cn-janela{width:100%}
  .cn-j{grid-template-columns:minmax(0,1fr);gap:18px}
  .cn-mini{position:static;grid-template-columns:110px minmax(0,1fr);align-items:start;gap:12px}
  .cn-dois{grid-template-columns:1fr}
  .cn-parcs{margin-left:0}
  .cn-sobre-pe{max-width:none;flex:1 1 100%}
  .janela-pe .btn{flex:1 1 100%}
  .cn-janela .janela-pe .btn-sec{flex:1 1 calc(50% - 5px)}
  .cn-janela .cn-sobre-pe{display:none}
  .cn-folha-corpo{padding:0 16px 16px}
  .cn-form{padding:0 16px 18px}
  .cn-teste{grid-template-columns:96px minmax(0,1fr);gap:12px}
  .cn-teste .cn-qr{width:96px;height:96px}
  .cn-ro div{grid-template-columns:1fr;gap:2px}
  .cn-folha-corpo .btn,.cn-hist .cn-acoes .btn{flex:1 1 auto}
}
"""

PARC_TXT = {4: '4/6 a 6/6', 3: '3/6 a 6/6'}


def contato():
    return f'{CLI["contato"]}, contato principal ({CLI["contato_papel"]}), {CLI["contato_tel"]}'


# ---------------------------------------------------------------- janela "Gerar carnê"
def j_carne(v='padrao', abrir=False, dono=False):
    escolher = v == 'escolher'
    sem_pix = v in ('sem-pix', 'sem-pix-equipe')
    topo = ''
    if v == 'erro':
        topo = aviso('urgencia', 'Não deu para gerar o carnê.',
                     'Nada foi enviado nem guardado. Tente de novo em instantes. Se repetir, fale com a equipe T3jus pela Ajuda. Código: CARNE_PDF_FALHOU.')
    elif v == 'sem-pix':
        topo = aviso('atencao', 'O escritório ainda não tem chave Pix no T3jus.',
                     'Sem ela, o carnê sai com as instruções de pagamento em texto. Com a chave, cada parcela ganha o QR e o Pix copia e cola.',
                     acoes=f'<a class="btn btn-sec" href="{ESCR}recebimento-vazio">{ico("moeda")}Cadastrar a chave Pix</a>')
    elif v == 'sem-pix-equipe':
        topo = aviso('atencao', 'O escritório ainda não tem chave Pix no T3jus.',
                     f'Quem cadastra é {ESC["dona"]}, a sócia dona. Enquanto isso, o carnê sai com as instruções de pagamento em texto.',
                     acoes=f'<button class="btn btn-sec" type="button">{ico("sino")}Pedir a {ESC["dona"]}</button>')
    elif v == 'gerando':
        topo = ('<div class="pt-gerando" role="status"><p><b>Gerando o carnê:</b> 2 folhas A4, capa e parcelas 4/6 a 6/6. Leva alguns segundos.</p>'
                '<div class="pt-barra-indet" aria-hidden="true"></div></div>')

    def op(nome, tit, sub, marcado, tipo='radio', foco=False, desab=False):
        f = ' data-foco' if foco else ''
        d = ' disabled' if desab else ''
        return (f'<label class="opcao"><input class="marcar" type="{tipo}" name="{nome}"{" checked" if marcado else ""}{f}{d}>'
                f'<span>{tit}<small>{sub}</small></span></label>')

    lista = ''
    if escolher:
        itens = ''
        for n, ref, venc, sit in PARCELAS:
            if sit == 'paga':
                itens += (f'<li class="cn-paga"><label class="opcao"><input class="marcar" type="checkbox" disabled>'
                          f'<span><b>Parcela {n}/6 · {ref.split(" de ")[0]}</b><span class="num">{R(850)}</span><small>Paga em {venc[:5]}: não entra.</small></span></label></li>')
            elif sit == 'vencida':
                itens += (f'<li><label class="opcao"><input class="marcar" type="checkbox" checked>'
                          f'<span><b>Parcela {n}/6 · {ref.split(" de ")[0]} {F.selo_dias(24)}</b><span class="num">{R(850)}</span>'
                          f'<small>Sai marcada "vencida em {venc[:5]}", com o Pix sem valor, para o valor com multa e juros combinado.</small></span></label></li>')
            else:
                itens += (f'<li><label class="opcao"><input class="marcar" type="checkbox" checked>'
                          f'<span><b>Parcela {n}/6 · {ref.split(" de ")[0]}</b><span class="num">{R(850)}</span><small>Vence em {venc}</small></span></label></li>')
        lista = f'<ul class="cn-parcs" aria-label="Parcelas do contrato">{itens}</ul>'
    parcelas = (f'<fieldset class="fi-grupo-op"><legend>Parcelas</legend>'
                + op('cn-p', 'As que ainda vão vencer', f'4/6 a 6/6 · 3 parcelas · {R(2550)}', not escolher, foco=(v in ('padrao', 'sem-pix', 'sem-pix-equipe')))
                + op('cn-p', 'Escolher as parcelas', 'Para incluir a vencida ou deixar alguma de fora', escolher, foco=escolher)
                + lista + '</fieldset>')
    formato = (f'<fieldset class="fi-grupo-op"><legend>Formato</legend>'
               + op('cn-f', '3 parcelas por folha', 'Recomendado. Canhoto e via do cliente lado a lado.', True)
               + op('cn-f', '1 parcela por folha', 'Maior, para imprimir ou mandar uma por mês.', False) + '</fieldset>')
    capa = (f'<fieldset class="fi-grupo-op"><legend>Capa</legend>'
            + op('cn-c', 'Incluir a capa', 'Todas as parcelas, o total, como pagar e o WhatsApp do escritório.', True, 'checkbox') + '</fieldset>')
    if sem_pix:
        pix = (f'<div class="cn-pixbox"><h3>{ico("doc")}Como pagar (no lugar do Pix)</h3><p>{INSTRUCOES}</p>'
               f'<p class="cn-quem">{ico("cadeado")}<span>As do escritório, em Escritório › Recebimento.</span></p></div>')
    else:
        quem = (f'<p class="cn-quem">{ico("lapis")}<span>Mudar em <a href="{ESCR}recebimento">Escritório › Recebimento</a>.</span></p>' if dono else
                f'<p class="cn-quem">{ico("cadeado")}<span>Só {ESC["dona"]}, a sócia dona, muda a chave.</span></p>')
        pix = (f'<div class="cn-pixbox"><h3>{ico("moeda")}Pix do escritório</h3>'
               f'<dl><dt>Chave ({PIX["tipo"]})</dt><dd>{PIX["chave_vis"]}</dd><dt>Recebedor</dt><dd>{PIX["recebedor"]} · {PIX["cidade"]}</dd></dl>'
               f'<p>Cada parcela leva o QR e o Pix copia e cola com o valor e um identificador, como <b class="num">{txid(4)}</b>. '
               f'O Pix do carnê não dá baixa sozinho: quando o cliente pagar, use Registrar recebimento.</p>{quem}</div>')
    envio = f'<p class="cn-envio">{ico("whats")}<span>Mandar pelo WhatsApp vai para <b>{contato()}</b>, pelo número do escritório.</span></p>'
    if escolher:
        mini, leg = 'carne-miniatura-vencida.webp', f'<b>2 folhas A4</b>Capa e parcelas 3/6 a 6/6 · {R(3400)}, mais os encargos da 3/6.'
        prev_url = 'carne-a4.html?estado=vencida'
    elif sem_pix:
        mini, leg = 'carne-miniatura-sem-pix.webp', f'<b>2 folhas A4</b>Capa e parcelas 4/6 a 6/6 · {R(2550)}. Sem QR: as instruções em texto.'
        prev_url = 'carne-a4.html?estado=sem-pix'
    else:
        mini, leg = 'carne-miniatura.webp', f'<b>2 folhas A4</b>Capa e parcelas 4/6 a 6/6 · {R(2550)}.'
        prev_url = 'carne-a4.html?estado=padrao'
    previa = (f'<figure class="cn-mini"><a class="cn-mini-img" href="{prev_url}"><img src="{mini}" width="260" height="368" '
              f'alt="Prévia da primeira folha do carnê, com a capa e as primeiras parcelas."></a>'
              f'<figcaption>{leg}<br><a href="{prev_url}">{ico("olho", "ico ico-s")}Ver em tamanho real</a></figcaption></figure>')
    corpo = (topo + f'<div class="cn-j"><div class="cn-j-op">{parcelas}<div class="cn-dois">{formato}{capa}</div>{pix}{envio}</div>'
             f'<aside aria-label="Prévia do carnê">{previa}</aside></div>')
    if v == 'gerando':
        pe = (f'<button class="btn btn-sec" type="button" data-fechar data-foco>Cancelar</button>'
              f'<button class="btn btn-pri" type="button" disabled>{ico("relogio")}Gerando o PDF…</button>')
    elif v == 'erro':
        pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
              f'<button class="btn btn-pri" type="button" data-foco>{ico("reenviar")}Tentar de novo</button>')
    else:
        pe = (f'<span class="cn-sobre-pe">O carnê fica guardado na ficha, com quem gerou e quando.</span>'
              f'<button class="btn btn-sec" type="button">{ico("baixar")}Baixar PDF</button>'
              f'<button class="btn btn-sec" type="button">{ico("impressora")}Imprimir</button>'
              f'<a class="btn btn-pri" href="{ARQ}carne-whats">{ico("whats")}Mandar pelo WhatsApp</a>')
    j = janela('janela-carne', f'A receber · {CT["numero"]}', 'Gerar carnê',
               f'{CLI["nome"]} · {CT["objeto"]} · 6 parcelas de {R(850)}, todo dia 25.', corpo, pe, abrir=abrir)
    return j.replace('<dialog class="janela"', '<dialog class="janela cn-janela"', 1)


def j_whats(abrir=True):
    msg = (f'<div class="fi-balao"><p>Olá, Marta! Aqui está o carnê dos honorários do Hélio, contrato {CT["numero"]}: '
           f'as parcelas 4 a 6, de {R(850)}, que vencem todo dia 25.</p>'
           f'<p style="margin-top:6px">Em cada parcela tem o QR e o Pix copia e cola. Depois de pagar, mande o comprovante por aqui: o recibo chega nesta conversa.</p>'
           f'<p style="margin-top:6px">Ribeiro &amp; Matos Advocacia</p>'
           f'<div class="cn-anexo">{ico("doc")}<span><b>carne-helio-correa-C-2026-014.pdf</b>2 folhas A4 · 214 KB</span></div>'
           f'<small>Prévia · ainda não enviada</small></div>')
    corpo = (f'<div class="fi-zap"><p class="fi-zap-cab">{ico("whats")}Para Marta Corrêa (esposa de Hélio) · {CLI["contato_tel"]} · WhatsApp do escritório</p>{msg}</div>'
             f'<p class="fi-ref">{ico("check")}<span>A conversa está aberta: Marta escreveu ao escritório ontem, às 18h12. A mensagem vai agora, com o PDF.</span></p>'
             f'<label class="opcao"><input class="marcar" type="checkbox"><span>Mandar também a Hélio<small>(11) 99602-7735, o número do cliente na ficha</small></span></label>')
    pe = (f'<a class="btn btn-sec" href="{ARQ}carne">{ico("esq")}Voltar</a>'
          f'<button class="btn btn-pri" type="button" data-foco>{ico("whats")}Enviar a Marta</button>')
    return janela('janela-whats', 'Gerar carnê', 'Mandar o carnê pelo WhatsApp', 'Confira a mensagem antes de enviar.', corpo, pe, abrir=abrir)


# ---------------------------------------------------------------- folha "Carnê" na ficha
def folha_carne(v='vazio'):
    chave = (f'<p class="cn-chave">{ico("moeda")}<span>Sai com o Pix do escritório: chave {PIX["tipo"]} <b class="num">{PIX["chave_vis"]}</b>. '
             f'A baixa continua em Registrar recebimento.</span></p>')
    btn = f'<button class="btn btn-sec" type="button" data-janela="janela-carne">{ico("carne")}Gerar carnê</button>'
    if v == 'vazio':
        corpo = (f'<p>Nenhum carnê gerado para este contrato. O carnê sai das parcelas a vencer, num PDF em A4 para imprimir ou mandar pelo WhatsApp.</p>'
                 f'{chave}{btn}')
    elif v == 'sem-pix':
        corpo = (f'<p>Nenhum carnê gerado para este contrato.</p>'
                 f'<p class="cn-chave">{ico("alerta")}<span><b>Sem chave Pix cadastrada.</b> O carnê sai com as instruções de pagamento em texto.</span></p>{btn}')
    else:
        desat = v == 'desatualizado'
        sel = F.selo('atencao', 'Desatualizado', 'alerta') if desat else F.selo('ok', 'Em dia com as parcelas', 'check')
        item = (f'<li>{ico("carne")}<div><strong>Parcelas 4/6 a 6/6 · com capa · 2 folhas A4</strong>'
                f'<small>Gerado por {CT["responsavel"]} em 18/11, às 15h32</small>'
                f'<small>Enviado a Marta Corrêa pelo WhatsApp · lido às 15h40</small>{sel}</div>'
                f'<div class="cn-acoes"><button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar PDF</button>'
                + ('' if desat else f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-carne">{ico("reenviar")}Gerar de novo</button>')
                + '</div></li>')
        topo = ''
        if desat:
            topo = aviso('atencao', 'Carnê desatualizado: a parcela 5/6 mudou.',
                         'Marina Ribeiro mudou o vencimento de 25/12 para 30/12 em Contratos, hoje às 16h40 ("cliente recebe no dia 28"). '
                         'O carnê que Marta tem ainda diz 25/12. Gere de novo e mande o novo: ele avisa que substitui o de 18/11.',
                         acoes=f'<button class="btn btn-pri" type="button" data-janela="janela-carne">{ico("reenviar")}Gerar de novo</button>', papel='status')
        corpo = f'{topo}<ul class="cn-hist" aria-label="Carnês gerados">{item}</ul>{chave if not desat else ""}'
    return (f'<section class="folha cn-folha" aria-labelledby="t-cn"><div class="folha-cab"><div><h2 id="t-cn">{ico("carne")}Carnê</h2>'
            f'<p class="sub">Contrato {CT["numero"]} · modelo T3jus</p></div></div><div class="cn-folha-corpo">{corpo}</div></section>')


def ficha(v='vazio', desat=False):
    f = F.ficha_contrato()
    ver = f'<a class="btn btn-sec" href="#">{ico("pena")}Ver o contrato</a>'
    assert ver in f
    f = f.replace(ver, f'<button class="btn btn-sec" type="button" data-janela="janela-carne">{ico("carne")}Gerar carnê</button>{ver}', 1)
    a = '<aside class="fi-col" aria-label="Cobrança">'
    assert a in f
    f = f.replace(a, a.replace('aria-label="Cobrança"', 'aria-label="Carnê e cobrança"') + folha_carne(v), 1)
    if desat:
        old = '<td class="num">25/12</td>'
        assert old in f
        f = f.replace(old, '<td class="num">30/12<span class="cn-mudou">era 25/12</span></td>', 1)
        f = f.replace('<dt>Vence</dt><dd class="num">25/12</dd>', '<dt>Vence</dt><dd class="num">30/12 <span class="cn-mudou">era 25/12</span></dd>', 1)
    return f


T = ''
AF = lambda titulo='Hélio Batista Corrêa': F.A('A receber', titulo, 'Financeiro|A receber|Hélio Batista Corrêa')
T += tpl('contrato-carne', ficha() + j_carne(), quem='financeiro', **AF())
T += tpl('carne', ficha() + j_carne(abrir=True), quem='financeiro', **AF('Gerar carnê'))
T += tpl('carne-escolher', ficha() + j_carne('escolher', abrir=True), quem='financeiro', **AF('Gerar carnê'))
T += tpl('carne-gerando', ficha() + j_carne('gerando', abrir=True), quem='financeiro', **AF('Gerar carnê'))
T += tpl('carne-erro', ficha() + j_carne('erro', abrir=True), quem='financeiro', **AF('Gerar carnê'))
T += tpl('carne-whats', ficha() + j_carne() + j_whats(), quem='financeiro', **AF('Mandar o carnê'))
T += tpl('carne-gerado', ficha('gerado') + j_carne()
         + toast('Carnê enviado a Marta Corrêa.', 'Parcelas 4/6 a 6/6, com o Pix do escritório. O PDF ficou guardado na ficha, em Carnê.'),
         quem='financeiro', **AF())
T += tpl('carne-desatualizado', ficha('desatualizado', desat=True) + j_carne(), quem='financeiro', **AF())
T += tpl('carne-sem-pix', ficha('sem-pix') + j_carne('sem-pix', abrir=True, dono=True), **AF('Gerar carnê'))
T += tpl('carne-sem-pix-equipe', ficha('sem-pix') + j_carne('sem-pix-equipe', abrir=True), quem='financeiro', **AF('Gerar carnê'))


def links(out):
    """Os links da moldura levam às telas aprovadas vizinhas; Escritório leva ao Recebimento desta pasta."""
    out = out.replace('href="moldura.html', 'href="../portal-v1/moldura.html').replace('href="equipe.html"', 'href="../portal-v1/equipe.html"')
    out = out.replace('href="escritorio.html"', f'href="{ESCR}recebimento"')
    return out


def montar_pagina(out, templates, css_extra=''):
    out = out.replace("'sem-area':{", QUEM_FIN, 1)
    out = out.replace('</style>', css_extra + CSS_CN + '\n</style>', 1)
    out = out.replace('<div class="app">', SPRITE_CN + '\n<div class="app">', 1)
    i = out.rindex('<script>')
    out = out[:i] + templates + out[i:]
    return links(out)


fin = montar_pagina(F.out, T)
fin = fin.replace('"estado":"resumo"', '"estado":"contrato-carne"', 1)
open(f'{SAIDA}/financeiro.html', 'w', encoding='utf-8').write(fin)
print('financeiro + carnê ok', T.count('<template data-est='), 'estados novos')

# ================================================================= Contratos: o mesmo atalho
UC = 'contratos.html?estado='


def contrato_helio():
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p>'
            f'<div class="hn-dir-linha"><p class="grande">25/11</p>{C.selo("ativo", R(850))}</div>'
            f'<p class="hn-oque"><b>Parcela 4/6, de novembro</b><br>a 3/6 está em atraso, no Financeiro</p>'
            f'<a class="btn btn-pri" href="{ARQ}contrato">{ico("carteira")}Ver recebimentos</a></section>')
    cab = C.ficha_cab_c(CT['numero'], CLI['nome'], C.SIT_ATIVO, 'Ação revisional · 6 parcelas de R$ 850,00 · Pix · dia 25', dir_)
    sit = {'paga': ('ok', 'Pago', 'check'), 'vencida': ('urgente', 'Vencida há 24 dias', 'alerta'), 'a vencer': ('andamento', 'Previsto', None)}
    linhas = []
    for n, ref, venc, s in PARCELAS:
        st, sn, si = sit[s]
        if s == 'paga':
            sn = 'Pago em ' + ('25/08' if n == 1 else '29/09')
        linhas.append(([f'<b class="num">{venc}</b>', f'Parcela {n} de 6 · {ref}', C.selo_tipo('parcelado'), f'<span class="num hn-valor-c">{R(850)}</span>',
                        C.selo(st, sn, si)], ''))
    tab = C.tabela('Programação dos recebimentos', ['Vencimento', 'O quê', 'Condição', 'Valor', 'Situação'], linhas, ['14%', '34%', '18%', '15%', '19%'])
    tot = (f'<div class="ct-totais"><div><p>Recebido até hoje</p><p class="hn-res-grande num">{R(1700)}</p></div>'
           f'<div><p>Contratado</p><p class="hn-res-grande num">{R(5100)}</p></div><div><p>A receber</p><p class="hn-res-grande num">{R(3400)}</p></div></div>')
    pe = f'<p class="hn-pe">{ico("carne")}<span>O carnê sai das parcelas a vencer, com o Pix do escritório. É o mesmo carnê do Financeiro, em A receber, e fica guardado nas duas fichas.</span></p>'
    folha = (f'<section class="folha" aria-labelledby="t-rc" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-rc">Programação dos recebimentos</h2>'
             f'<p class="sub">Gerada das condições do contrato: 6 parcelas de {R(850)}, todo dia 25.</p></div>'
             f'<div class="acoes"><button class="btn btn-sec" type="button" data-janela="janela-carne">{ico("carne")}Gerar carnê</button></div></div>'
             f'{tot}{tab}{pe}</section>')
    return f'<div class="hn">{cab}{C.abas_c("recebimentos", UC + "contrato")}{folha}</div>'


TC = tpl('contrato-carne', contrato_helio() + j_carne(dono=True).replace('A receber · C-2026-014', 'Contratos · C-2026-014'),
         area='contratos', secao='Contratos', atual='contratos', trilha=f'Contratos|{CT["numero"]}', titulo=CT['numero'], aba='recebimentos', q='6')
ct = montar_pagina(C.out, TC)
open(f'{SAIDA}/contratos.html', 'w', encoding='utf-8').write(ct)
print('contratos + carnê ok')

# ================================================================= Escritório › Recebimento
NOVA_CHAVE = 'financeiro@ribeiromatos.adv.br'


def campo_cont(id_, rot, valor, limite, ajuda='', erro='', foco=False):
    c = F.campo(id_, rot, valor, ajuda=ajuda, erro=erro, foco=foco)
    cls = ' cn-passou' if len(valor) > limite else ''
    cont = f'<span class="contador{cls}" aria-hidden="true">{len(valor)} de {limite}</span>'
    c = c.replace(f'<label for="{id_}">{rot}</label>', f'<div class="cn-campo-linha"><label for="{id_}">{rot}</label>{cont}</div>', 1)
    return c.replace('<input ', f'<input maxlength="{limite + 20}" ', 1)


def teste(chave_ok=True, payload=None):
    if not chave_ok:
        return (f'<div class="cn-teste cn-teste-vazio">{ico("qr")}<div><h3>Pix de teste</h3><p>O QR de teste aparece quando a chave, o nome e a cidade estiverem preenchidos e certos.</p></div></div>')
    p = payload or brcode(None, 'TESTE')
    return (f'<div class="cn-teste">{qr_svg(p, "QR Code do Pix de teste, sem valor")}<div><h3>Pix de teste</h3>'
            f'<p>Escaneie com o app do banco do escritório. Deve aparecer <b>{PIX["recebedor"]}</b>. Não precisa pagar: é só para conferir.</p></div></div>')


def form_recebimento(v='ok'):
    erros = v == 'erros'
    vazio = v == 'vazio'
    nova = v in ('trocar', 'salvo')
    tipo = 'E-mail' if nova else ('CNPJ' if not vazio else 'Escolha o tipo')
    chave = NOVA_CHAVE if nova else ('' if vazio else ('41.276.839/0001-35' if erros else PIX['chave_vis']))
    nome = '' if vazio else ('RIBEIRO E MATOS SOCIEDADE DE ADVOGADOS' if erros else PIX['recebedor'])
    cidade = '' if (vazio or erros) else PIX['cidade']
    topo = ''
    if erros:
        topo = aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'A chave Pix ainda não foi salva. Os carnês continuam saindo com a chave anterior.')
    elif vazio:
        topo = aviso('info', 'Sem chave Pix, o carnê sai só com as instruções em texto.', 'Com a chave, cada parcela do carnê ganha o QR e o Pix copia e cola, com o valor e o identificador.')
    tipos = ['CNPJ', 'CPF', 'E-mail', 'Celular', 'Chave aleatória'] + (['Escolha o tipo'] if vazio else [])
    f_tipo = F.selecao('rb-tipo', 'Tipo da chave', tipos, tipo)
    f_chave = F.campo('rb-chave', 'Chave Pix', chave, ajuda='A chave cadastrada no banco, na conta do escritório.',
                      erro='Este CNPJ não existe: confira os dois últimos números. O do escritório é 41.276.839/0001-34.' if erros else '',
                      foco=erros or vazio)
    f_nome = campo_cont('rb-nome', 'Nome do recebedor', nome, 25,
                        ajuda='Como o app do banco mostra a quem paga. Até 25 letras, sem acento.',
                        erro='Passa de 25 letras. Use como o banco mostra, por exemplo RIBEIRO E MATOS SOC ADV.' if erros else '')
    f_cidade = campo_cont('rb-cidade', 'Cidade', cidade, 15, ajuda='A cidade da conta, como o banco mostra. Até 15 letras.',
                          erro='Escreva a cidade da conta, por exemplo SAO PAULO. O Pix exige.' if erros else '')
    if erros:
        f_chave = f_chave.replace(' data-foco', '')
        f_chave = f_chave.replace('<input ', '<input data-foco ', 1)
    p_teste = brcode(None, 'TESTE', chave=NOVA_CHAVE if nova else None)
    pix = (f'<section class="folha" aria-labelledby="t-rb"><div class="folha-cab"><div><h2 id="t-rb">{ico("moeda")}Chave Pix do escritório</h2>'
           f'<p class="sub">O T3jus monta o Pix de cada parcela com esta chave. O dinheiro vai direto para a conta do escritório.</p></div></div>'
           f'<div class="cn-form">{topo}<div class="fi-dois">{f_tipo}{f_chave}</div><div class="fi-dois">{f_nome}{f_cidade}</div>'
           f'{teste(not (vazio or erros), p_teste)}</div></section>')
    texto = INSTRUCOES
    instr = (f'<section class="folha" aria-labelledby="t-ri"><div class="folha-cab"><div><h2 id="t-ri">{ico("doc")}Instruções de pagamento</h2>'
             f'<p class="sub">Vão na capa do carnê. Sem chave Pix, vão no lugar do Pix, em cada parcela.</p></div></div>'
             f'<div class="cn-form"><div class="campo"><div class="cn-campo-linha"><label for="rb-instr">Texto para o cliente <span class="opcional">(opcional)</span></label>'
             f'<span class="contador" aria-hidden="true">{len(html.unescape(INSTRUCOES))} de 400</span></div>'
             f'<textarea class="entrada" id="rb-instr" aria-describedby="rb-instr-aj">{texto}</textarea>'
             f'<p class="ajuda" id="rb-instr-aj">Banco, agência e conta, ou outra forma que o escritório aceite. Até 400 letras.</p></div></div></section>')
    marca = (f'<section class="folha" aria-labelledby="t-rm"><div class="folha-cab"><div><h2 id="t-rm">{ico("imagem")}Marca no carnê</h2>'
             f'<p class="sub">O carnê é do escritório: a marca dele fica no alto de cada parcela. O T3jus aparece só no rodapé, em letra pequena.</p></div></div>'
             f'<div class="cn-form"><fieldset class="fi-grupo-op"><legend>O que vai no alto do carnê</legend>'
             f'<label class="opcao"><input class="marcar" type="radio" name="rb-m" checked><span>O nome do escritório em letra<small>Como na prévia abaixo. Sai bem em qualquer impressora.</small></span></label>'
             f'<label class="opcao"><input class="marcar" type="radio" name="rb-m"><span>O logo do escritório<small>PNG ou SVG, fundo branco, até 1 MB. Numa impressora preto e branco, sai em cinza.</small></span></label></fieldset>'
             f'<div class="cn-marca"><span class="fi-rotulo">Prévia</span><span class="cn-marca-prev" aria-hidden="true"><b>Ribeiro &amp; Matos</b><span>Advocacia</span></span>'
             f'<span class="sr">Ribeiro &amp; Matos, Advocacia, em letra serifada vinho.</span></div></div></section>')
    pe = (f'<div class="form-pe"><span class="esq-pe">Multa e juros vêm de cada contrato, não daqui.</span>'
          f'<button class="btn btn-fantasma" type="button">Cancelar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}Salvar</button></div>')
    return f'<form class="fi-col" action="#" novalidate aria-label="Recebimento">{pix}{instr}{marca}{pe}</form>'


def lado_recebimento(v='ok'):
    onde = (f'<section class="folha" aria-labelledby="t-ro"><div class="folha-cab"><div><h2 id="t-ro">Onde isso aparece</h2></div></div>'
            f'<div class="cn-folha-corpo"><ul class="cn-lista">'
            f'<li>{ico("carne")}<span><b>Carnê de cada contrato</b>: o QR, o Pix copia e cola, a chave e o recebedor em cada parcela.</span></li>'
            f'<li>{ico("doc")}<span><b>Capa do carnê</b>: as instruções de pagamento e o WhatsApp do escritório.</span></li>'
            f'<li>{ico("check")}<span><b>A baixa continua manual</b>, em Registrar recebimento. O identificador da parcela ajuda a achar o pagamento no extrato.</span></li>'
            f'</ul></div><p class="pt-pe-folha">{ico("cadeado")}<span>Quem muda: só {ESC["dona"]}, a sócia dona. Toda mudança fica no histórico.</span></p></section>')
    evs = ''
    if v == 'salvo':
        evs += (f'<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> trocou a chave Pix, às 17h05<span class="selo selo-ativo">Novo</span></p>'
                f'<small>De CNPJ 41.276.839/0001-34 para e-mail {NOVA_CHAVE}. 1 carnê ficou desatualizado.</small></div></li>')
    if v != 'vazio':
        evs += (f'<li><time>12/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> cadastrou a chave Pix, às 10h02</p>'
                f'<small>CNPJ 41.276.839/0001-34 · recebedor {PIX["recebedor"]} · {PIX["cidade"]}</small></div></li>')
    evs += ('<li><time>05/11</time><span class="pto" aria-hidden="true"></span><div><p>Equipe T3jus escreveu as instruções de pagamento</p>'
            '<small>Na implantação, com Marina Ribeiro.</small></div></li>')
    hist = (f'<section class="folha" aria-labelledby="t-rh"><div class="folha-cab"><div><h2 id="t-rh">{ico("historico")}Histórico</h2><p class="sub">Nada é apagado</p></div></div>'
            f'<div class="eventos-dia" style="padding-top:0"><ol class="eventos">{evs}</ol></div></section>')
    return f'<aside class="fi-col" aria-label="Sobre o recebimento">{onde}{hist}</aside>'


def so_leitura():
    av = aviso('info', 'Você vê esta página só para ler.', f'Quem muda a chave Pix e as instruções é {ESC["dona"]}, a sócia dona. Se algo estiver errado, fale com ela.', icone='cadeado')
    dl = (f'<dl class="cn-ro"><div><dt>Chave Pix ({PIX["tipo"]})</dt><dd class="num">{PIX["chave_vis"]}</dd></div>'
          f'<div><dt>Nome do recebedor</dt><dd>{PIX["recebedor"]}</dd></div><div><dt>Cidade</dt><dd>{PIX["cidade"]}</dd></div>'
          f'<div><dt>Instruções de pagamento</dt><dd style="font-weight:400">{INSTRUCOES}</dd></div>'
          f'<div><dt>Marca no carnê</dt><dd>O nome do escritório em letra</dd></div></dl>')
    pix = (f'<section class="folha" aria-labelledby="t-rb"><div class="folha-cab"><div><h2 id="t-rb">{ico("moeda")}Chave Pix do escritório</h2>'
           f'<p class="sub">Cadastrada por {ESC["dona"]} em 12/11</p></div></div><div class="cn-form">{dl}{teste()}</div></section>')
    return av, f'<div class="fi-col">{pix}</div>'


def j_trocar():
    corpo = (f'<ul class="cn-lista"><li>{ico("moeda")}<span>Hoje: <b>CNPJ {PIX["chave_vis"]}</b><br>Depois: <b>e-mail {NOVA_CHAVE}</b></span></li>'
             f'<li>{ico("carne")}<span><b>1 carnê entregue usa a chave de hoje:</b> Hélio Batista Corrêa, {CT["numero"]}, parcelas 4/6 a 6/6. '
             f'O QR dele continua pagando na chave antiga enquanto ela existir no banco. Ele fica marcado como desatualizado, para gerar de novo.</span></li></ul>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar data-foco>Voltar</button>'
          f'<a class="btn btn-pri" href="{ESCR}recebimento-salvo">{ico("trocar")}Trocar a chave</a>')
    return janela('janela-trocar', 'Recebimento', 'Trocar a chave Pix?', 'Os carnês novos saem com a chave nova.', corpo, pe, alerta=True, abrir=True)


def tela_receb(v='ok'):
    cab = F.cab_secao('Escritório', 'Recebimento', 'Como os clientes pagam o escritório: a chave Pix e as instruções que vão no carnê.')
    extra = ''
    if v == 'equipe':
        av, corpo = so_leitura()
        return f'<div class="fi">{cab}{av}<div class="fi-grade">{corpo}{lado_recebimento()}</div></div>'
    topo = ''
    if v == 'salvo':
        topo = aviso('atencao', '1 carnê ficou desatualizado com a troca da chave.',
                     f'Hélio Batista Corrêa, {CT["numero"]}, parcelas 4/6 a 6/6. Quem cuida do contrato foi avisado no sino; o carnê novo sai com a chave nova.',
                     acoes=f'<a class="btn btn-sec" href="{ARQ}carne-desatualizado">{ico("carne")}Ver o carnê</a>')
        extra = toast('Chave Pix trocada.', 'Os próximos carnês já saem com o e-mail financeiro@ribeiromatos.adv.br.')
    if v == 'trocar':
        extra = j_trocar()
    return f'<div class="fi">{cab}{topo}<div class="fi-grade">{form_recebimento(v)}{lado_recebimento(v)}</div></div>{extra}'


AE = dict(atual='escritorio', area='escritorio', secao='Recebimento', trilha='Escritório|Recebimento', titulo='Recebimento')
TE = ''
TE += tpl('recebimento', tela_receb(), **AE)
TE += tpl('recebimento-vazio', tela_receb('vazio'), **AE)
TE += tpl('recebimento-erros', tela_receb('erros'), **AE)
TE += tpl('recebimento-trocar', tela_receb('trocar'), **AE)
TE += tpl('recebimento-salvo', tela_receb('salvo'), **AE)
TE += tpl('recebimento-equipe', tela_receb('equipe'), quem='financeiro', **AE)

BARRA_E = (f'<template data-barra="escritorio|Recebimento"><div class="pt-barra-area"><p class="pt-area-nome">{ico("coluna")}Escritório</p>'
           f'<nav class="pt-secoes" aria-label="Seções do Escritório"><a href="../portal-v1/escritorio.html">Dados do escritório</a>'
           f'<a href="../portal-whatsapp/whatsapp.html?estado=ligado">WhatsApp e IA</a><a href="{ESCR}recebimento" aria-current="page">Recebimento</a></nav></div></template>\n')
esc = pagina('Recebimento', 'Escritório › Recebimento: a chave Pix do escritório e as instruções de pagamento que vão no carnê dos clientes.',
             '{"estado":"recebimento","atual":"escritorio"}', '', '', BARRA_E)
esc = esc.replace('</style>', F.CSS_FI + '\n</style>', 1)
esc = montar_pagina(esc, TE)
open(f'{SAIDA}/escritorio.html', 'w', encoding='utf-8').write(esc)
print('escritorio ok', TE.count('<template data-est='), 'estados')
