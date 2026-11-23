# Peças comuns às pendências do Comercial e do Financeiro (F3.8, F3.46, F3.48, F3.49, F3.50, F3.71, F3.72).
# Não muda nada das telas aprovadas: os scripts novos importam os geradores aprovados (copiados sem mudança
# nesta pasta), pegam a página pronta e acrescentam os estados novos antes do script final.
# Prefixos das peças novas: fu- (funil), rp- (responsável do repasse), pz- (prazo e atraso do repasse),
# rv- (RPV e precatório a caminho), mt- (meta), es- (Escritório › Ajustes do financeiro), ct- (contador e caixa).
import html
from comum import ico, aviso

H = html.escape
HOJE = '18/11/2026'

# Pessoas do elenco que entram por substituição no script da moldura (o comum.py segue igual ao aprovado)
QUEM_PEND = ("bianca:{nome:'Bianca Torres',ini:'B',papel:'Áreas: Contratos e Financeiro',areas:['contratos','financeiro'],dono:false},"
             "diego:{nome:'Diego Almeida',ini:'D',papel:'Áreas: Comercial e Financeiro',areas:['comercial','financeiro'],dono:false},"
             "'sem-area':{")


def Rc(c):
    """Dinheiro em centavos (PT-09): o valor guardado é inteiro; a tela só formata."""
    c = int(round(c))
    neg = c < 0
    r, cc = divmod(abs(c), 100)
    return f'{"−" if neg else ""}R$ {r:,}'.replace(',', '.') + f',{cc:02d}'


def resumo_erros(n, txt):
    return aviso('urgencia', f'Falta acertar {n} {"ponto, marcado" if n == 1 else "pontos, marcados"} abaixo.', txt)


def falha(titulo, txt, codigo):
    return aviso('urgencia', titulo, f'{txt} Se continuar, mande ao suporte o código <b class="num">{codigo}</b>.')


def injetar(out, T, css='', padrao=None, quem=True, sprite=''):
    """Põe os estados novos antes do script da moldura, o CSS novo no fim do estilo e as pessoas do elenco."""
    if quem and 'bianca:{' not in out:
        out = out.replace("'sem-area':{", QUEM_PEND, 1)
    elif quem and 'diego:{' not in out:
        out = out.replace("'sem-area':{", QUEM_PEND.split('},', 1)[1], 1)
    out = out.replace('</style>', CSS_PEND + css + '\n</style>', 1)
    if sprite:
        out = out.replace('<div class="app">', sprite + '\n<div class="app">', 1)
    i = out.rindex('<script>')
    out = out[:i] + T + out[i:]
    if padrao:
        import re
        out = re.sub(r'"estado":"[^"]+"', f'"estado":"{padrao}"', out, count=1)
    return out


def campo_erro_fs(id_, legenda, inner, erro='', ajuda=''):
    """Grupo de opções (fieldset) com o erro preso a ele."""
    d, a, e, aj = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; d.append(f'{id_}-aj')
    if erro:
        e = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; d.append(f'{id_}-er')
    if d:
        a = f' aria-describedby="{" ".join(d)}"'
    cls = ' pd-fs-erro' if erro else ''
    return f'<fieldset class="fi-grupo-op{cls}" id="{id_}"{a}><legend>{legenda}</legend>{e}{inner}{aj}</fieldset>'


def radio(nome, rot, sub='', marcado=False, foco=False, extra=''):
    ch = ' checked' if marcado else ''
    f = ' data-foco' if foco else ''
    s = f'<small>{sub}</small>' if sub else ''
    return f'<label class="opcao"><input class="marcar" type="radio" name="{nome}"{ch}{f}><span>{rot}{s}</span></label>{extra}'


def caixa_sel(nome, rot, sub='', marcado=False):
    ch = ' checked' if marcado else ''
    s = f'<small>{sub}</small>' if sub else ''
    return f'<label class="opcao"><input class="marcar" type="checkbox" name="{nome}"{ch}><span>{rot}{s}</span></label>'


def texto_area(id_, rot, valor='', opc=False, ajuda='', erro='', foco=False, limite=None):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    d, a, aj, er = [], '', '', ''
    if ajuda and not erro:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; d.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; d.append(f'{id_}-er'); a += ' aria-invalid="true"'
    if d:
        a += f' aria-describedby="{" ".join(d)}"'
    if foco:
        a += ' data-foco'
    c = f'<span class="contador" aria-hidden="true">{len(html.unescape(valor))} de {limite}</span>' if limite else ''
    return (f'<div class="campo"><div class="pd-campo-linha"><label for="{id_}">{rot}{o}</label>{c}</div>'
            f'<textarea class="entrada" id="{id_}" rows="3"{a}>{valor}</textarea>{aj}{er}</div>')


def toast_desfazer(titulo, texto, rot_desfazer, href='#'):
    return (f'<div class="aviso aviso-sucesso toast" role="status">{ico("check")}<div><strong class="aviso-titulo">{titulo}</strong><p>{texto}</p>'
            f'<div class="aviso-acoes"><a class="btn btn-sec btn-compacto" href="{href}">{ico("trocar")}{rot_desfazer}</a></div></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


CSS_PEND = r"""
/* ==========================================================================
   Pendências do Comercial e do Financeiro (F3.8, F3.46, F3.48, F3.49, F3.50, F3.71, F3.72)
   Prefixo pd- nas peças comuns. Só pares do Gabinete/D2: âmbar nunca é texto em fundo claro
   nem fundo de texto branco; texto sobre âmbar-2/âmbar-3 é sempre tinta ou vinho.
   ========================================================================== */
.pd-campo-linha{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.pd-fs-erro{padding:10px 12px;border-radius:var(--raio);box-shadow:inset 0 0 0 1.5px var(--vinho-3)}
.pd-fs-erro>.erro-msg{margin:0 0 6px}
.pd-quem{display:flex;align-items:center;gap:12px}
.pd-quem .av-p{width:40px;height:40px;font-size:13px;flex:none}
.pd-quem strong{display:block;font-weight:500;line-height:1.3}
.pd-quem small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.pd-corpo{padding:0 24px 20px;display:grid;gap:14px}
.pd-corpo>p{font-size:13px;line-height:1.5;color:var(--texto-2)}
.pd-corpo .btn{justify-self:start}
.pd-nota{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--texto-2)}
.pd-nota .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:2px}
.pd-nota b{color:var(--texto);font-weight:500}
.pd-pe-j{margin-right:auto;align-self:center}
.janela .aviso{margin:0}
.janela .opcao small{color:var(--texto-2)}
.pd-op-dentro{display:block;margin:0 0 8px 34px;max-width:280px}
.pd-op-dentro .entrada{width:100%}
.pd-ro{margin:0;padding:0 24px 18px;display:grid}
.pd-ro div{display:grid;grid-template-columns:200px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--divisor)}
.pd-ro div:first-child{border-top:0}
.pd-ro dt{font-size:13px;color:var(--texto-2)}
aside .pd-ro div{grid-template-columns:110px minmax(0,1fr)}
.pd-ro dd{margin:0;font-weight:500;overflow-wrap:anywhere}
.pd-ro dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.pd-selo-linha{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.toast .aviso-acoes{margin-top:8px}
@media (max-width:760px){
  .pd-corpo{padding:0 16px 16px}
  .pd-ro{padding:0 16px 16px}
  .pd-ro div{grid-template-columns:1fr;gap:2px}
  .janela-pe .btn{flex:1 1 100%}
  .pd-pe-j{flex:1 1 100%}
  .pd-corpo .btn{justify-self:stretch}
}
"""
