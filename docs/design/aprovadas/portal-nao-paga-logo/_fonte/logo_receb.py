# Portal · Escritório › Recebimento: a marca do carnê e do recibo, com o envio do logo, e o registro da sociedade na OAB
# (F3.81 e o resto do F3.19; FI-23 e FI-14; PT-03, PT-10). Parte da tela aprovada em portal-carne (carne.py, sem mudança:
# ele é importado e grava as telas aprovadas numa pasta temporária). Troca só a folha "Marca no carnê", que passa a se chamar
# "Marca e timbrado", e acrescenta uma linha em "Onde isso aparece" e no histórico. Só a sócia dona muda.
# Peças novas com prefixo lg-. Gera escritorio-logo.html. Uso: python3 logo_receb.py <pasta-saida>
import os, re, sys, tempfile

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_argv = sys.argv
sys.argv = [sys.argv[0], tempfile.mkdtemp()]
import carne as K           # grava as telas aprovadas do carnê numa pasta temporária e expõe as peças
sys.argv = _argv
from logo_dados import LOGOS, br, MIN_LARGURA
F = K.F
ico, aviso, toast, janela, tpl = K.ico, K.aviso, K.toast, K.janela, K.tpl
ESC = 'escritorio-logo.html?estado='
UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']
L, Q, C = LOGOS['largo'], LOGOS['quadrado'], LOGOS['claro']

SPRITE_LG = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
             '<symbol id="i-lixo" viewBox="0 0 24 24"><path d="M4 6.5h16"/><path d="M9 6.5V4h6v2.5"/><path d="M6.5 6.5 7.5 20h9l1-13.5"/><path d="M10 10.5v6M14 10.5v6"/></symbol>'
             '<symbol id="i-recorte" viewBox="0 0 24 24"><path d="M6 3v15h15"/><path d="M3 6h15v15"/></symbol>'
             '<symbol id="i-contraste" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M12 7h4M12 11h6M12 15h5"/></symbol>'
             '</svg>')

CSS_LG = r"""
/* ==========================================================================
   Escritório › Recebimento · Marca e timbrado (prefixo lg-). Só tokens e pares já aprovados.
   O logo é do escritório e vem nas cores dele: aparece sempre sobre papel branco, como no papel impresso.
   ========================================================================== */
.lg-bloco{display:grid;gap:14px;padding:16px;border:1px solid var(--borda-folha);border-radius:var(--raio)}
.lg-bloco h3{font-size:18px;line-height:1.2;display:flex;align-items:center;gap:8px}
.lg-bloco h3 .ico{color:var(--vinho)}
.lg-bloco h3{flex-wrap:wrap}
.lg-bloco h3 .opcional{font-family:var(--sans);font-size:13px;font-weight:400;color:var(--texto-2)}
.lg-bloco>p.ajuda{margin:-8px 0 0}
.lg-soltar{display:grid;justify-items:center;gap:8px;padding:22px 16px;text-align:center;border:2px dashed var(--vinho-4);border-radius:var(--raio);background:var(--sal-2)}
.lg-soltar>.ico{width:32px;height:32px;color:var(--vinho)}
.lg-soltar strong{font-weight:500}
.lg-soltar .ajuda{max-width:52ch}
.lg-soltar.lg-erro{border-color:var(--vinho-3)}
.lg-regras{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.lg-regras li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--texto-2)}
.lg-regras li .ico{flex:none;margin-top:2px;color:var(--vinho)}
.lg-regras b{color:var(--texto);font-weight:500}
.lg-arq{display:grid;grid-template-columns:200px minmax(0,1fr);gap:16px;align-items:center}
.lg-miniatura{display:grid;place-items:center;height:96px;padding:10px;background:#fff;border:1px solid var(--borda-folha);border-radius:var(--raio)}
.lg-miniatura img{max-width:100%;max-height:72px;display:block}
.lg-arq-info{display:grid;gap:2px;min-width:0}
.lg-arq-info strong{font-weight:500;overflow-wrap:anywhere}
.lg-arq-info small{font-size:12px;color:var(--texto-2)}
.lg-arq-ac{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.lg-conf{margin:0;padding:0;list-style:none;display:grid;gap:0;border-top:1px solid var(--divisor)}
.lg-conf li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:10px;padding:10px 0;border-bottom:1px solid var(--divisor);font-size:13px;line-height:1.5}
.lg-conf li .ico{margin-top:1px;color:var(--vinho)}
.lg-conf li b{font-weight:600}
.lg-conf li.lg-nao{color:var(--vinho-3)}
.lg-conf li.lg-nao .ico{color:var(--vinho-3)}
.lg-conf li.lg-nao b{color:var(--vinho-3)}
.lg-conf small{display:block;color:var(--texto-2);font-size:12px}
.lg-prev{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.lg-prev figure{margin:0;display:grid;gap:6px;min-width:0}
.lg-prev figcaption{font-size:12px;color:var(--texto-2)}
.lg-prev figcaption b{color:var(--texto);font-weight:500}
.lg-papel{background:#fff;border:1px solid var(--borda-folha);border-radius:4px;padding:12px 14px;box-shadow:0 6px 16px -12px rgba(42,26,34,.45);min-height:92px}
.lg-pb .lg-papel{filter:grayscale(1)}
.lg-cn{display:grid;gap:5px}
.lg-cn-top{display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
.lg-m{flex:1;min-width:0}
.lg-cn img{display:block;max-width:100%;max-height:38px}
.lg-cn .lg-lado{display:flex;align-items:center;gap:6px}
.lg-cn .lg-lado img{width:34px;height:34px;max-width:none}
.lg-letra{font-family:var(--serifa);font-weight:600;color:var(--vinho);line-height:1}
.lg-cn .lg-letra{font-size:17px}
.lg-num{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--texto-2);text-align:right;line-height:1.3}
.lg-num b{display:block;font-family:var(--serifa);font-size:17px;letter-spacing:0;color:var(--tinta);text-transform:none}
.lg-doc{font-size:9px;color:var(--texto-2)}
.lg-fio{position:relative;height:2px;background:var(--vinho)}
.lg-fio::before{content:"";position:absolute;left:0;top:-2px;width:34px;height:5px;background:var(--ambar)}
.lg-rb{display:flex;justify-content:space-between;align-items:center;gap:10px}
.lg-rb img{display:block;max-width:100%;max-height:50px}
.lg-rb .lg-lado{display:flex;align-items:center;gap:8px}
.lg-rb .lg-lado img{width:46px;height:46px;max-width:none}
.lg-rb .lg-letra{font-size:21px}
.lg-rb p{flex:0 0 auto;max-width:48%;font-size:8.5px;line-height:1.45;color:var(--texto-2);text-align:right}
.lg-rb p b{color:var(--tinta);font-weight:600}
.lg-ver{display:flex;gap:8px;flex-wrap:wrap}
.lg-ver a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-weight:500;font-size:13px}
.lg-uma{display:flex;align-items:center;gap:12px;margin:4px 0 0 34px;padding:8px 12px;background:#fff;border:1px solid var(--borda-folha);border-radius:var(--raio)}
.lg-uma img{max-height:30px;max-width:180px;display:block}
.lg-uma span{font-size:12px;color:var(--texto-2)}
.lg-grupo .x-ops-l{grid-template-columns:1fr 1fr}
.lg-grupo.lg-com-erro .x-ops-l{border-left:3px solid var(--vinho-3);padding-left:10px}
.lg-oab{display:grid;grid-template-columns:160px minmax(0,220px);gap:16px;align-items:start}
.lg-ro-marca{display:grid;gap:8px}
.lg-ro-marca .lg-papel{max-width:360px}
/* a lista só para ler (.cn-ro, aprovada) pinta toda div como linha: a prévia dentro dela volta ao desenho próprio */
.cn-ro div.lg-ro-marca,.cn-ro .lg-ro-marca div{display:block;padding:0;border:0;grid-template-columns:none}
.cn-ro .lg-ro-marca div.lg-papel{display:grid;gap:5px;padding:12px 14px;border:1px solid var(--borda-folha);margin-top:8px}
.cn-ro .lg-ro-marca div.lg-cn-top{display:flex}
.cn-ro .lg-ro-marca div.lg-m{flex:1;min-width:0}
.cn-ro .lg-ro-marca div.lg-fio{height:2px}
@media (max-width:760px){
  .lg-arq{grid-template-columns:1fr}
  .lg-prev{grid-template-columns:1fr}
  .lg-grupo .x-ops-l{grid-template-columns:1fr}
  .lg-oab{grid-template-columns:1fr 1fr}
  .lg-uma{margin-left:0}
  .lg-arq-ac .btn{flex:1 1 100%}
  .lg-bloco{padding:14px 12px}
}
"""

ALT_L = 'Logo do escritório: monograma R e M num círculo e o nome Ribeiro e Matos, Advocacia e Consultoria, em azul-marinho e ouro'
ALT_Q = 'Logo do escritório: monograma R e M em branco, num círculo azul-marinho'
ALT_C = 'Logo do escritório em ouro muito claro'


def logo_html(tipo, cls='', alt=None):
    d = {'largo': (L['uri'], ALT_L), 'quadrado': (Q['uri'], ALT_Q), 'claro': (C['uri'], ALT_C), 'uma-cor': (C.get('uri_uma_cor', ''), 'Logo do escritório em uma cor, na cor da tinta')}[tipo]
    return f'<img src="{d[0]}" alt="{alt if alt is not None else d[1]}"{f" class={chr(34)}{cls}{chr(34)}" if cls else ""}>'


def mini_carne(tipo):
    if tipo == 'letra':
        m = '<span class="lg-letra">Ribeiro &amp; Matos</span>'
    elif tipo == 'quadrado':
        m = f'<span class="lg-lado">{logo_html("quadrado", alt="")}<span class="lg-letra">Ribeiro &amp; Matos</span></span>'
    else:
        m = logo_html(tipo, alt='')
    return (f'<div class="lg-papel lg-cn"><div class="lg-cn-top"><div class="lg-m">{m}</div><p class="lg-num">Via do cliente<b>4 de 6</b></p></div>'
            f'<p class="lg-doc">CNPJ 41.276.839/0001-34 · OAB/SP 31.874</p><div class="lg-fio"></div></div>')


def mini_recibo(tipo):
    if tipo == 'quadrado':
        m = f'<span class="lg-lado">{logo_html("quadrado", alt="")}<span class="lg-letra">Ribeiro &amp; Matos</span></span>'
    elif tipo == 'letra':
        m = '<span class="lg-letra">Ribeiro &amp; Matos</span>'
    else:
        m = logo_html(tipo, alt='')
    return (f'<div class="lg-papel"><div class="lg-rb"><div class="lg-m">{m}</div><p><b>Ribeiro &amp; Matos Sociedade de Advogados</b><br>CNPJ 41.276.839/0001-34 · OAB/SP 31.874<br>'
            f'Rua Cardeal Arcoverde, 1749 · São Paulo, SP</p></div><div class="lg-fio" style="margin-top:8px"></div></div>')


def previas(tipo, a4='largo'):
    nomes = {'largo': 'logo largo', 'quadrado': 'logo quadrado com o nome ao lado', 'claro': 'logo claro, nas cores do arquivo', 'letra': 'nome em letra'}
    n = nomes.get(tipo, tipo)
    figs = ''
    for doc, fn in (('carnê', mini_carne), ('recibo', mini_recibo)):
        for pb in (False, True):
            r = f'Prévia do alto do {doc}, {"em preto e branco" if pb else "em cores"}, com o {n}'
            figs += (f'<figure class="{"lg-pb" if pb else ""}"><div role="img" aria-label="{r}">{fn(tipo)}</div>'
                     f'<figcaption><b>{doc.capitalize()}</b> · {"preto e branco" if pb else "em cores"}</figcaption></figure>')
    ver = ''
    if a4:
        ver = (f'<p class="lg-ver"><a href="carne-logo-a4.html?estado={a4}">{ico("doc")}Ver o carnê inteiro</a>'
               f'<a href="recibo-logo-a4.html?estado={"largo" if a4 == "uma-cor" else a4}">{ico("doc")}Ver o recibo inteiro</a></p>')
    return f'<div class="lg-bloco"><h3>{ico("olho")}Como vai sair</h3><div class="lg-prev">{figs}</div>{ver}</div>'


def conf(d, nome_arq, peso, tipo_arq='PNG'):
    ok = lambda t, s='': f'<li>{ico("check")}<span>{t}{f"<small>{s}</small>" if s else ""}</span></li>'
    nao = lambda t, s='': f'<li class="lg-nao">{ico("alerta")}<span>{t}{f"<small>{s}</small>" if s else ""}</span></li>'
    w, h = d['tamanho']
    mw, mh = d['margem']
    itens = ok(f'<b>Formato e peso:</b> {tipo_arq}, {peso} KB.', 'Aceita PNG, JPG ou SVG, até 1 MB.')
    corte = f'Cortamos a margem vazia em volta ({mw} px na largura e {mh} px na altura).' if (mw or mh) else 'Não havia margem vazia para cortar.'
    itens += ok(f'<b>Tamanho:</b> {w} × {h} px depois do corte. Sai nítido no carnê e no recibo.', corte + f' O mínimo é {MIN_LARGURA} px no lado maior.')
    if d['passa']:
        itens += ok(f'<b>Contraste com o papel:</b> a parte mais clara tem {br(d["pior"])}:1.', 'O mínimo é 3:1, a mesma régua da WCAG para desenhos.')
        itens += ok('<b>Preto e branco:</b> continua legível.', 'A impressora troca cada cor por um cinza; veja a prévia abaixo.')
    else:
        itens += nao(f'<b>Contraste com o papel: {br(d["pior"])}:1.</b> O logo some no papel.', 'O mínimo é 3:1. Em preto e branco fica ainda mais apagado; veja a prévia abaixo.')
        itens += nao('<b>Preto e branco:</b> quase não aparece.')
    return f'<ul class="lg-conf" aria-label="Conferência do logo para impressão">{itens}</ul>'


def arquivo(tipo, nome_arq, peso, dims, quando, removivel=True):
    ac = (f'<input class="sr" type="file" id="lg-trocar" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml">'
          f'<label class="btn btn-sec" for="lg-trocar">{ico("trocar")}Trocar o logo</label>')
    if removivel:
        ac += f'<button class="btn btn-fantasma" type="button" data-janela="janela-remover">{ico("lixo")}Remover o logo</button>'
    return (f'<div class="lg-arq"><div class="lg-miniatura">{logo_html(tipo)}</div><div class="lg-arq-info"><strong>{nome_arq}</strong>'
            f'<small>{dims} · {peso} KB · {quando}</small><div class="lg-arq-ac">{ac}</div></div></div>')


def soltar(erro=False):
    regras = (f'<ul class="lg-regras" aria-label="Como o T3jus confere o logo">'
              f'<li>{ico("recorte")}<span><b>Corta a margem vazia</b> em volta do desenho. O logo em si não é cortado nem esticado.</span></li>'
              f'<li>{ico("imagem")}<span><b>Confere o tamanho:</b> pelo menos {MIN_LARGURA} px no lado maior, para sair nítido no papel.</span></li>'
              f'<li>{ico("contraste")}<span><b>Confere o contraste com o papel</b>, em cores e em preto e branco, e mostra como vai sair.</span></li></ul>')
    av = ''
    if erro:
        av = aviso('urgencia', 'Não deu para usar “logo-whatsapp.jpg”.',
                   f'Ele tem 240 × 80 px e sairia borrado no papel. Envie o arquivo original do logo, com pelo menos {MIN_LARGURA} px no lado maior. '
                   'Quem desenhou o logo costuma ter esse arquivo; a foto de perfil do WhatsApp é pequena demais.', papel='alert')
    z = (f'<div class="lg-soltar{" lg-erro" if erro else ""}">{ico("imagem")}<p><strong>Arraste o logo para cá ou</strong></p>'
         f'<input class="sr" type="file" id="lg-arq" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" aria-describedby="lg-arq-aj">'
         f'<label class="btn btn-sec" for="lg-arq"{" data-foco" if erro else ""}>{ico("mais")}{"Escolher outro arquivo" if erro else "Escolher o arquivo"}</label>'
         f'<p class="ajuda" id="lg-arq-aj">PNG, JPG ou SVG, até 1 MB. O melhor é fundo transparente ou branco.</p></div>')
    outros = ''
    if erro:
        outros = (f'<ul class="lg-regras" aria-label="Outros motivos de recusa">'
                  f'<li>{ico("doc")}<span><b>PDF, Word, HEIC ou WebP:</b> “O arquivo é PDF. Exporte o logo como PNG ou SVG.”</span></li>'
                  f'<li>{ico("filtro")}<span><b>Mais de 1 MB:</b> “O arquivo tem 3,4 MB. Exporte de novo, menor, ou em SVG.”</span></li>'
                  f'<li>{ico("escudo")}<span><b>SVG com código ou fonte de fora:</b> “Este SVG traz mais do que o desenho. Exporte de novo, com o texto em curvas, ou envie em PNG.”</span></li>'
                  f'<li>{ico("recorte")}<span><b>Comprido demais</b> (mais de 8 vezes mais largo que alto): “Assim o logo sai com letra miúda. Envie a versão empilhada.”</span></li></ul>')
    return av + z + (outros or regras)


def oab(vazio=False):
    uf = F.selecao('lg-oab-uf', 'Seccional', ['Escolha'] + UFS if vazio else UFS, 'Escolha' if vazio else 'SP')
    num = F.campo('lg-oab-n', 'Número do registro', '' if vazio else '31.874', im='numeric')
    return (f'<div class="lg-bloco"><h3>{ico("balanca")}Registro da sociedade na OAB <span class="opcional">(opcional)</span></h3>'
            f'<p class="ajuda" id="lg-oab-aj">O registro da sociedade de advogados na seccional, como no ato de registro. Vai no alto do carnê e no timbrado do recibo, '
            f'depois do CNPJ. Advogado que atua sozinho, sem sociedade, deixa em branco: a linha sai só com o CNPJ.</p>'
            f'<div class="lg-oab">{uf}{num}</div></div>')


def marca(v):
    """A folha nova: marca (nome em letra ou logo), envio e conferência do logo, prévia e registro na OAB."""
    letra = v == 'letra'
    op = (f'<fieldset class="fi-grupo-op"><legend>O que vai no alto do carnê e do recibo</legend>'
          f'<label class="opcao"><input class="marcar" type="radio" name="lg-m"{" checked" if letra else ""}><span>O nome do escritório em letra<small>Ribeiro &amp; Matos, em serifa vinho. Sai bem em qualquer impressora.</small></span></label>'
          f'<label class="opcao"><input class="marcar" type="radio" name="lg-m"{"" if letra else " checked"}><span>O logo do escritório<small>Envie o arquivo abaixo. O T3jus confere antes de usar.</small></span></label></fieldset>')
    corpo, topo = '', ''
    if v == 'escolher':
        corpo = f'<div class="lg-bloco"><h3>{ico("imagem")}O logo</h3>{soltar()}</div>' + previas('letra', a4='')
        corpo = corpo.replace('Como vai sair</h3>', 'Como sai hoje, enquanto não houver logo</h3>')
    elif v == 'recusa':
        corpo = f'<div class="lg-bloco"><h3>{ico("imagem")}O logo</h3>{soltar(erro=True)}</div>'
    elif v in ('largo', 'salvo'):
        quando = 'salvo hoje, às 10h31' if v == 'salvo' else 'enviado agora, ainda não salvo'
        corpo = (f'<div class="lg-bloco"><h3>{ico("imagem")}O logo</h3>{arquivo("largo", "logo-ribeiro-matos.png", L["peso_kb"], "1800 × 420 px", quando, v == "salvo")}'
                 f'{conf(L, "logo-ribeiro-matos.png", L["peso_kb"])}</div>{previas("largo")}')
    elif v == 'quadrado':
        jeito = (f'<fieldset class="x-ops lg-grupo"><legend>Como o logo entra</legend><div class="x-ops-l">'
                 f'<label class="opcao"><input class="marcar" type="radio" name="lg-j"><span>Só o logo<small>Na altura do alto do carnê, um logo quadrado fica pequeno e não diz o nome.</small></span></label>'
                 f'<label class="opcao"><input class="marcar" type="radio" name="lg-j" checked><span>O logo e o nome ao lado<small>O padrão para logo quadrado. O nome vai em letra, como hoje.</small></span></label></div></fieldset>')
        corpo = (f'<div class="lg-bloco"><h3>{ico("imagem")}O logo</h3>{arquivo("quadrado", "rm-monograma.png", Q["peso_kb"], "800 × 800 px", "enviado agora, ainda não salvo", False)}'
                 f'{conf(Q, "rm-monograma.png", Q["peso_kb"])}{jeito}</div>{previas("quadrado", "quadrado")}')
    elif v == 'claro':
        topo = aviso('urgencia', 'A marca não foi salva: o logo some no papel.',
                     f'A parte mais clara tem {br(C["pior"])}:1 contra o papel branco, e o mínimo é 3:1. Escolha “Em uma cor só”, envie uma versão mais escura '
                     'ou fique com o nome em letra. O resto da página foi salvo.', papel='alert')
        jeito = (f'<fieldset class="x-ops lg-grupo lg-com-erro" aria-describedby="lg-j-er"><legend>Como imprimir o logo</legend>'
                 f'<p class="erro-msg" id="lg-j-er">{ico("alerta", "ico ico-s")}Nas cores do arquivo, o logo não aparece no papel. Escolha outra forma.</p><div class="x-ops-l">'
                 f'<label class="opcao"><input class="marcar" type="radio" name="lg-j" checked aria-invalid="true" data-foco><span>Nas cores do arquivo<small>Ouro muito claro: some no papel.</small></span></label>'
                 f'<label class="opcao"><input class="marcar" type="radio" name="lg-j"><span>Em uma cor só, na cor da tinta<small>O desenho é o mesmo; só a cor muda, e só no papel.</small></span></label></div></fieldset>'
                 f'<div class="lg-uma" role="img" aria-label="Como fica em uma cor só: o mesmo logo, em tinta escura">{logo_html("uma-cor", alt="")}<span>Em uma cor só</span></div>')
        corpo = (f'<div class="lg-bloco"><h3>{ico("imagem")}O logo</h3>{arquivo("claro", "logo-dourado.png", C["peso_kb"], "1800 × 420 px", "enviado agora, não salvo", False)}'
                 f'{conf(C, "logo-dourado.png", C["peso_kb"])}{jeito}</div>{previas("claro", "uma-cor")}')
    corpo += oab(vazio=v in ('escolher', 'recusa', 'letra'))
    sub = ('O carnê e o recibo são do escritório: a marca dele vai no alto. O T3jus aparece só no rodapé, em letra pequena (“Modelo T3jus”). '
           'Carnês e recibos já emitidos ficam como saíram.')
    return (f'<section class="folha" aria-labelledby="t-rm"><div class="folha-cab"><div><h2 id="t-rm">{ico("imagem")}Marca e timbrado</h2>'
            f'<p class="sub">{sub}</p></div></div><div class="cn-form">{topo}{op}{corpo}</div></section>')


def form(v):
    f = K.form_recebimento('ok')
    f2, n = re.subn(r'<section class="folha" aria-labelledby="t-rm">.*?</section>', lambda m: marca(v), f, flags=re.S)
    assert n == 1
    return f2


def lado(v):
    s = K.lado_recebimento('ok')
    a = '<li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg><span><b>A baixa continua manual</b>'
    assert a in s
    s = s.replace(a, f'<li>{ico("doc")}<span><b>Recibo de cada recebimento</b>: a marca e o registro na OAB no timbrado.</span></li>' + a, 1)
    s = s.replace('a chave Pix e as instruções', 'a chave Pix, as instruções e a marca')
    if v in ('salvo', 'remover'):
        ev = (f'<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> trocou a marca para o logo, às 10h31'
              f'<span class="selo selo-ativo">Novo</span></p><small>logo-ribeiro-matos.png, 1425 × 366 px depois do corte · contraste {br(L["pior"])}:1 · '
              f'registro da sociedade OAB/SP 31.874. O arquivo fica guardado.</small></div></li>')
        s = s.replace('<ol class="eventos">', '<ol class="eventos">' + ev, 1)
    return s


def equipe():
    av, corpo = K.so_leitura()
    a = '<div><dt>Marca no carnê</dt><dd>O nome do escritório em letra</dd></div>'
    assert a in corpo
    novo = (f'<div><dt>Marca no carnê e no recibo</dt><dd><div class="lg-ro-marca">O logo do escritório, desde 18/11'
            f'<div role="img" aria-label="Prévia do alto do carnê com o logo largo">{mini_carne("largo")}</div></div></dd></div>'
            f'<div><dt>Registro da sociedade na OAB</dt><dd>OAB/SP 31.874</dd></div>')
    corpo = corpo.replace(a, novo)
    av = av.replace('a chave Pix e as instruções', 'a chave Pix, as instruções e a marca')
    return av, corpo


def j_remover():
    corpo = (f'<ul class="cn-lista"><li>{ico("doc")}<span>Os próximos carnês e recibos saem com <b>o nome em letra</b>, como antes.</span></li>'
             f'<li>{ico("historico")}<span>O arquivo do logo fica guardado no histórico. Nada se apaga, e ele pode voltar com “Trocar o logo”.</span></li>'
             f'<li>{ico("cadeado")}<span><b>Carnês e recibos já emitidos não mudam:</b> continuam com o logo, como foram entregues.</span></li></ul>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar data-foco>Voltar</button>'
          f'<a class="btn btn-pri" href="{ESC}letra">{ico("lixo")}Remover o logo</a>')
    return janela('janela-remover', 'Marca e timbrado', 'Remover o logo?', 'O registro na OAB continua no timbrado.', corpo, pe, alerta=True, abrir=True)


def tela(v):
    cab = F.cab_secao('Escritório', 'Recebimento', 'Como os clientes pagam o escritório: a chave Pix, as instruções do carnê e a marca que vai no carnê e no recibo.')
    if v == 'equipe':
        av, corpo = equipe()
        return f'<div class="fi">{cab}{av}<div class="fi-grade">{corpo}{lado("ok")}</div></div>'
    extra = ''
    if v == 'salvo':
        extra = toast('Marca salva: o logo do escritório.', 'Os próximos carnês e recibos já saem com o logo. Os já emitidos ficam como saíram.')
    if v == 'remover':
        extra = j_remover()
    return f'<div class="fi">{cab}<div class="fi-grade">{form("salvo" if v == "remover" else v)}{lado(v)}</div></div>{extra}'


AE = dict(K.AE)
TE = ''
for v in ['escolher', 'largo', 'quadrado', 'claro', 'recusa', 'salvo', 'remover', 'letra']:
    TE += tpl(v, tela(v), **AE)
TE += tpl('equipe', tela('equipe'), quem='financeiro', **AE)

esc = K.pagina('Recebimento', 'Escritório › Recebimento: a chave Pix, as instruções de pagamento e a marca do escritório no carnê e no recibo, com o envio do logo.',
               '{"estado":"largo","atual":"escritorio"}', '', '', K.BARRA_E)
esc = esc.replace('</style>', F.CSS_FI + '\n</style>', 1)
import extra as X
esc = K.montar_pagina(esc, TE, X.CSS_X + CSS_LG)
esc = esc.replace('<div class="app">', SPRITE_LG + '\n<div class="app">', 1)
esc = esc.replace('escritorio.html?estado=recebimento', ESC + 'largo').replace('escritorio.html?estado=', ESC)
open(f'{SAIDA}/escritorio-logo.html', 'w', encoding='utf-8').write(esc)
print('escritorio-logo ok', TE.count('<template data-est='), 'estados')
