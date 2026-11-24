# Portal · prazo do comprovante de residência (F3.134, AP-08). O campo fica em Jurídico › Casos e processos ›
# Documentos para começar, numa folha ao lado da lista, e a ficha do cliente leva até ele.
# Parte do desenho aprovado da jornada (portal-jornada-fechamento): lê jornada.py até a montagem da página,
# sem mudança, e reaproveita a lista por área, a folha "Documentos pessoais" e as peças. Peças novas com prefixo pc-.
# comum.py é a cópia aprovada sem mudança; aqui só o caminho das telas aprovadas (APROV) é trocado ao carregar.
# Uso: python3 prazo.py <pasta-saida>
import os, sys, re, json, types

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'saida')
AP = os.environ.get('APROV', '/home/user/t3jus/docs/design/aprovadas/')
os.environ['APROV'] = AP

_m = types.ModuleType('comum'); _m.__file__ = os.path.join(AQUI, 'comum.py')
_c = open(_m.__file__, encoding='utf-8').read()
_c = re.sub(r"^APROV = '[^']*'", f'APROV = {AP!r}', _c, count=1, flags=re.M)
exec(compile(_c, 'comum.py', 'exec'), _m.__dict__)
sys.modules['comum'] = _m

_src = open(os.path.join(AQUI, 'jornada.py'), encoding='utf-8').read()
_corte = '# ====================================================================================== página'
sys.argv = [sys.argv[0], SAIDA]
_g = dict(__file__=os.path.join(AQUI, 'jornada.py'), __name__='jornada')
exec(compile(_src[:_src.index(_corte)], 'jornada.py', 'exec'), _g)
globals().update({k: v for k, v in _g.items() if not k.startswith('__')})

EST = []
T = ''


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    EST.append((est, rotulo))


# ---------------------------------------------------------------- dados fictícios (quarta, 18/11/2026)
# 41 clientes têm comprovante na ficha. Com 90 dias, 3 passam do prazo. Os dias contam da data do papel.
VELHOS_90 = [('Antônia Ferreira Prado', 139), ('Irene Castro', 118), ('Hélio Batista', 97)]
ENTRE_60_90 = [('Eduardo Nascimento', 84), ('Gabriela Teixeira', 77), ('Benedito Souza', 71), ('Sílvia Ramos', 64)]
TOTAL = 41
AREAS_COM_TEXTO = 4  # previdenciário, trabalhista, cível e consumidor: o "Como pedir" diz "últimos 90 dias"

CSS_PC = r"""
/* ==========================================================================
   Prazo do comprovante (prefixo pc-). Só tokens e pares já aprovados.
   ========================================================================== */
.pc-corpo{display:grid;gap:12px;padding:4px 24px 20px}
.pc-corpo>p{margin:0;font-size:13.5px;line-height:1.5}
.pc-v{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2)}
.pc-v b{font-family:var(--serifa);font-size:30px;font-weight:500;color:var(--vinho);line-height:1.1}
.pc-v span{font-size:13px;color:var(--texto-2)}
.pc-agora{display:flex;gap:8px;align-items:flex-start}
.pc-agora .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.pc-corpo .btn{justify-self:start}
.pc-ops{border:0;margin:0;padding:0;min-width:0;display:grid;gap:6px}
.pc-ops legend{font-size:13.5px;font-weight:500;color:var(--tinta);padding:0;margin-bottom:6px}
.pc-ops .opcao{min-height:44px}
.pc-outro{margin:2px 0 0 34px;max-width:180px}
.pc-efeito{display:grid;gap:8px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.pc-efeito h3{margin:0;font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.pc-efeito p{margin:0}
.pc-efeito b{font-weight:600}
.pc-nomes{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.pc-nomes li{display:flex;justify-content:space-between;gap:12px;padding:6px 10px;border-radius:8px;background:var(--papel);font-size:13px}
.pc-nomes li span:last-child{color:var(--texto-2);white-space:nowrap}
.pc-ao{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.pc-ao li{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.45}
.pc-ao li .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho-4)}
.pc-pe{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.pc-corpo>.aviso{margin:0}
.pc-liga{display:block;margin:6px 0 0;font-size:12.5px;color:var(--texto-2);line-height:1.45}
.pc-liga a,.doc-meta a{color:var(--vinho);font-weight:500}
.pc-quem{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--texto-2);line-height:1.45;margin:0}
.pc-quem .ico{width:16px;height:16px;flex:none;margin-top:1px;color:var(--vinho-4)}
@media (max-width:760px){
  .pc-corpo{padding:4px 16px 16px}
  .pc-pe .btn,.pc-corpo .btn{width:100%;justify-content:center}
  .pc-outro{max-width:none;margin-left:0}
}
"""


# ---------------------------------------------------------------- a folha do prazo
def quem_muda(donos=1):
    """Regra: com uma sócia dona, o nome dela; com mais de um, todos os nomes, na ordem de entrada no escritório."""
    if donos == 1:
        return 'Quem muda é Marina Ribeiro, a sócia dona.'
    return 'Quem muda são os sócios donos: Marina Ribeiro e Felipe Matos.'


def folha_prazo(v='ver', n=90, total=TOTAL, frase=AREAS_COM_TEXTO, donos=1):
    """v: ver, editar-60, editar-180, erro, falha, salvo, equipe."""
    dona = v != 'equipe'
    velhos = (len(VELHOS_90) + (len(ENTRE_60_90) if n == 60 else 0)) if total else 0
    if v in ('ver', 'salvo', 'equipe'):
        if total:
            agora = f'Hoje, <b>{velhos} dos {total}</b> comprovantes nas fichas dos clientes têm mais de {n} dias e estão em “Precisa de atenção”.'
        else:
            agora = 'Ainda não há comprovante de residência nas fichas dos clientes. O prazo passa a contar quando o primeiro for anexado, pela data do papel.'
        corpo = (f'<p class="pc-v"><b class="num">{n} dias</b><span>contados da data que está no papel{" · o padrão do T3jus" if n == 90 else ""}</span></p>'
                 f'<p class="pc-agora">{ico("relogio")}<span>{agora}</span></p>')
        if v == 'salvo':
            corpo = (aviso('sucesso', f'O prazo agora é de {n} dias.',
                           f'Os selos das fichas já mudaram: {len(ENTRE_60_90)} comprovantes passaram a “Mais de {n} dias”. '
                           f'O texto ao cliente passou a dizer “dos últimos {n} dias” em {frase} listas. Nenhum pedido saiu agora, '
                           'e os casos já abertos não mudam: o comprovante é pedido de novo quando um caso abrir.') + corpo)
        if dona:
            corpo += f'<a class="btn btn-sec" href="?estado=pz-editar">{ico("lapis")}Mudar o prazo</a>'
            quem = ('Mudado por você hoje, às 10h25: de 90 para 60 dias. Fica no histórico do escritório.' if v == 'salvo'
                    else 'Só você, como sócia dona, muda. Cada mudança fica no histórico do escritório.')
        else:
            quem = quem_muda(donos)
        corpo += f'<p class="pc-quem">{ico("cadeado")}<span>{quem}</span></p>'
        return _folha(corpo)
    # editando
    esc = {'editar-60': 60, 'editar-180': 180, 'erro': 'outro', 'falha': 60}[v]
    topo = ''
    if v == 'erro':
        topo = aviso('urgencia', 'O prazo não foi salvo.', '<a href="#pc-dias">O prazo vai de 30 a 365 dias</a>. Ele continua em 90 dias.')
    elif v == 'falha':
        topo = aviso('urgencia', 'Não deu para salvar o prazo.',
                     'Nada mudou: o prazo continua em 90 dias, e os selos também. A sua escolha continua aqui; tente de novo. '
                     'Se não der, fale com o suporte e diga o código <b class="num">DOC-7A21-0954</b>.')
    ops = [(60, '60 dias', 'Para juízos e cartórios que pedem conta mais recente.'),
           (90, '90 dias · o padrão', 'O que o INSS, os cartórios e a maioria dos juízos aceitam.'),
           (180, '180 dias', 'Para quem só lida com órgãos que aceitam até 6 meses.'),
           ('outro', 'Outro prazo', 'De 30 a 365 dias.')]
    li = ''
    for val, rot, sub in ops:
        ch = ' checked' if val == esc else ''
        fo = ' data-foco' if val == esc and esc != 'outro' else ''
        li += f'<label class="opcao"><input class="marcar" type="radio" name="pc-prazo" value="{val}"{ch}{fo}><span>{rot}<small>{sub}</small></span></label>'
        if val == 'outro' and esc == 'outro':
            li += ('<div class="pc-outro">' + campo_j('pc-dias', 'Quantos dias', '400', 'c3', im='numeric', foco=True,
                                                     erro='Escreva de 30 a 365 dias. O padrão é 90.') + '</div>')
    fs = f'<fieldset class="pc-ops"><legend>Quanto tempo o comprovante vale</legend>{li}</fieldset>'
    if not total and esc in (60, 180):
        efeito = (f'<h3>Com {esc} dias</h3><p><b>Nenhum selo muda agora</b>: ainda não há comprovante de residência nas fichas dos clientes. '
                  f'O prazo vale para os que forem anexados.</p>')
    elif esc == 60:
        nomes = ''.join(f'<li><span>{a}</span><span>{d} dias</span></li>' for a, d in ENTRE_60_90)
        efeito = (f'<h3>Com 60 dias</h3><p><b>{len(ENTRE_60_90)} comprovantes passam a ficar com “Mais de 60 dias”</b> e sobem para “Precisa de atenção” na ficha. '
                  f'Com os {len(VELHOS_90)} que já tinham mais de 90, são {len(VELHOS_90) + len(ENTRE_60_90)} de {total}.</p><ul class="pc-nomes" aria-label="Passam a ter mais de 60 dias">{nomes}</ul>')
    elif esc == 180:
        nomes = ''.join(f'<li><span>{a}</span><span>{d} dias</span></li>' for a, d in VELHOS_90)
        efeito = (f'<h3>Com 180 dias</h3><p><b>{len(VELHOS_90)} comprovantes voltam a “Em dia”</b>. Nenhum comprovante fica com mais de 180 dias.</p>'
                  f'<ul class="pc-nomes" aria-label="Voltam a Em dia">{nomes}</ul>'
                  f'<p>O pedido de comprovante novo para o caso de Antônia, feito hoje pelo WhatsApp a Joana Prado, filha de Antônia, continua aberto. '
                  f'Se o de 02/07 servir, marque “Já chegou” no caso.</p>')
    else:
        efeito = '<h3>Com outro prazo</h3><p>Escreva de 30 a 365 dias para ver quantos comprovantes mudam.</p>'
    efeito = f'<div class="pc-efeito" role="status" aria-live="polite">{efeito}</div>'
    txt = ''
    if esc in (60, 180):
        if frase:
            txt = (f'<label class="opcao"><input class="marcar" type="checkbox" name="pc-texto" checked><span>Trocar também no texto que vai ao cliente'
                   f'<small>“dos últimos 90 dias” passa a “dos últimos {esc} dias” no comprovante das {frase} listas que dizem o prazo.</small></span></label>')
        else:
            txt = (f'<p class="pc-agora">{ico("doc")}<span>Nenhuma lista diz “dos últimos 90 dias” no texto que vai ao cliente, então não há texto para trocar. '
                   f'Se quiser que o cliente saiba o prazo, escreva no “Como pedir” do comprovante.</span></p>')
    ao = (f'<ul class="pc-ao" aria-label="Ao salvar">'
          f'<li>{ico("relogio")}<span>Os selos das fichas mudam na hora: o prazo é contado cada vez que a ficha abre.</span></li>'
          f'<li>{ico("balanca")}<span>Nenhum pedido sai agora. Casos já abertos não mudam; o comprovante é pedido de novo quando um caso abrir.</span></li>'
          f'<li>{ico("historico")}<span>Fica no histórico do escritório, com o antes, o depois e o seu nome.</span></li></ul>')
    pe = (f'<div class="pc-pe"><a class="btn btn-fantasma" href="?estado=pz-ver">Cancelar</a>'
          f'<a class="btn btn-pri" href="?estado=pz-salvo">{ico("check")}Salvar o prazo</a></div>')
    corpo = f'{topo}<form class="pc-corpo" style="padding:0" action="#" novalidate aria-label="Mudar o prazo do comprovante">{fs}{efeito}{txt}{ao}{pe}</form>'
    return _folha(corpo, editando=True)


def _folha(corpo, editando=False):
    sub = 'Comprovante de residência · vale para todas as áreas'
    return (f'<section class="folha" id="prazo" aria-labelledby="t-pc" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-pc">Prazo do comprovante</h2>'
            f'<p class="sub">{sub}</p></div></div><div class="pc-corpo">{corpo}</div></section>')


# ---------------------------------------------------------------- Documentos para começar com a folha
_ITEM6 = ('Laudos e exames médicos', 'Só nos pedidos por doença: os dos últimos 2 anos.')


def docs_pagina(n=90, dona=True, prazo='', donos=1):
    h = pagina_docs()
    # sem item em edição: o 6 volta a ser uma linha comum
    nome, txt = _ITEM6
    up = f'<button class="btn btn-icone" type="button" aria-label="Subir {nome}">{ico("baixo", "ico ju-icone-up")}</button>'
    dn = f'<button class="btn btn-icone" type="button" aria-label="Descer {nome}">{ico("baixo")}</button>'
    ed = f'<button class="btn btn-sec btn-compacto" type="button" aria-label="Editar {nome}">{ico("lapis", "ico ico-s")}Editar</button>'
    linha = (f'<li><span class="disco"><span>6</span></span><div class="nm"><strong>{nome}{tag_tipo("caso")}<span class="selo selo-neutro">Se houver</span></strong>'
             f'<span class="jf-txt">“{txt}”</span></div><div class="ac">{up}{dn}{ed}</div></li>')
    h, k = re.subn(r'<li class="edit">.*?</div></div></li>', linha, h, count=1, flags=re.S)
    assert k == 1
    # o comprovante: o prazo e o caminho até a folha
    h = troca(h, [('Vale 90 dias</span>', f'Vale {n} dias</span>'),
                  ('“Conta de luz, água ou telefone dos últimos 90 dias.”</span>',
                   f'“Conta de luz, água ou telefone dos últimos {n} dias.”</span>'
                   + (f'<p class="pc-liga">O prazo vale para todas as áreas. <a href="?estado=pz-editar">Mudar o prazo</a></p>' if dona
                      else f'<p class="pc-liga">O prazo vale para todas as áreas. {quem_muda(donos)}</p>')),
                  ('O comprovante de residência com mais de 90 dias é pedido de novo. O prazo muda em Ajustes do escritório.',
                   f'O comprovante de residência com mais de {n} dias é pedido de novo. O prazo fica no quadro “Prazo do comprovante”, acima.')])
    if not dona:
        h = re.sub(r'<div class="ac">.*?</div></li>', '<div class="ac"></div></li>', h, flags=re.S)
        h = troca(h, [(f'<div class="acoes"><button class="btn btn-sec" type="button">{ico("mais")}Adicionar documento</button></div>', ''),
                      ('Jurídico · só a sócia dona edita', 'Jurídico · você vê; quem edita é a sócia dona'),
                      ('Cada mudança fica no histórico do escritório, com seu nome e a hora. ', quem_muda(donos).replace('Quem muda', 'Quem muda as listas e o prazo') + ' ')])
    # a folha do prazo entra no alto da coluna do lado, antes de "Como funciona"
    h = troca(h, [
        ('<aside class="ju-col" aria-label="Como funcionam os documentos para começar">',
         f'<aside class="ju-col" aria-label="Prazo do comprovante e como funcionam os documentos para começar">{prazo}')])
    return h


DL = dict(area='juridico', secao='Casos e processos', atual='juridico', trilha='Jurídico|Casos e processos|Documentos para começar', titulo='Documentos para começar')
add('pz-ver', docs_pagina(prazo=folha_prazo('ver')), 'Documentos para começar: o prazo de 90 dias, ao lado da lista', **DL)
add('pz-editar', docs_pagina(prazo=folha_prazo('editar-60')), 'Mudar para 60 dias: 4 comprovantes passam a pedir troca', **DL)
add('pz-editar-180', docs_pagina(prazo=folha_prazo('editar-180')), 'Mudar para 180 dias: 3 deixam de pedir troca', **DL)
add('pz-erro', docs_pagina(prazo=folha_prazo('erro')), 'Outro prazo fora de 30 a 365', **DL)
add('pz-falha', docs_pagina(prazo=folha_prazo('falha')), 'Falha do servidor: nada mudou', **DL)
add('pz-salvo', docs_pagina(60, prazo=folha_prazo('salvo', 60)), 'Salvo: 60 dias, a lista diz “Vale 60 dias”', **DL)
add('pz-equipe', docs_pagina(dona=False, prazo=folha_prazo('equipe')), 'Larissa (Jurídico, não é dona): só para ler, com quem muda', quem='juridico', **DL)
add('pz-equipe-dois', docs_pagina(dona=False, donos=2, prazo=folha_prazo('equipe', donos=2)), 'Com dois sócios donos: “Quem muda são os sócios donos: …”', quem='juridico', **DL)
add('pz-zero', docs_pagina(prazo=folha_prazo('ver', total=0)), 'Nenhum comprovante nas fichas ainda', **DL)
add('pz-zero-editar', docs_pagina(prazo=folha_prazo('editar-60', total=0)), 'Mudar sem nenhum comprovante: nenhum selo muda', **DL)
add('pz-sem-frase', troca(docs_pagina(prazo=folha_prazo('editar-60', frase=0)), [('“Conta de luz, água ou telefone dos últimos 90 dias.”', '“Conta de luz, água ou telefone, no seu nome ou de quem mora com você.”')]), 'Nenhuma lista diz o prazo: não há texto para trocar', **DL)


# ---------------------------------------------------------------- reflexo na ficha do cliente (prazo de 60 dias)
def folha_dp(dona=True):
    h = folha_docs_pessoais()
    meta = '<span class="jf-de">Conta de luz de 02/07/2026, 139 dias.</span> Anexado por Marina em 28/10. Um novo foi pedido hoje.'
    liga = (' O escritório aceita até 60 dias. <a href="?estado=pz-ver">Mudar o prazo</a>' if dona
            else ' O escritório aceita até 60 dias; quem muda o prazo é Marina Ribeiro, a sócia dona.')
    return troca(h, [('Mais de 90 dias</span>', 'Mais de 60 dias</span>'), ('1 com mais de 90 dias', '1 com mais de 60 dias'), (meta, meta + liga)])


def ficha_pz(dona=True):
    corpo = com_lateral(dados_ant() + folha_dp(dona) + contatos_ant(), lateral_docs('andamento'))
    if dona:
        return ficha_fl(D_DOC, 'ficha', corpo, N3) + j_registrar()
    return ficha_fl(D_DOC, 'ficha', corpo, N3, areas=('juridico',))


add('pz-ficha', ficha_pz(), 'Ficha de Antônia com 60 dias: “Mais de 60 dias” e o caminho até o prazo', aba='ficha', **FT)
add('pz-ficha-equipe', ficha_pz(False), 'A mesma ficha vista por Larissa: diz quem muda', quem='juridico', aba='ficha', **FT)

# ====================================================================================== página
GRUPOS = [('Prazo do comprovante (F3.134, AP-08)', [e for e, _ in EST])]
ROT = dict(EST)
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')
out = pagina('Prazo do comprovante', 'Jurídico › Documentos para começar: o prazo do comprovante de residência, que a sócia dona muda, e o reflexo na ficha do cliente.',
             '{"estado":"pz-ver","atual":"juridico"}', '', T, ''.join(BARRAS.values()))
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n' + CSS_EXTRA + '\n' + CSS_JF + '\n' + CSS_PC + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'prazo.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'prazo.html?estado={e}', 'rotulo': r} for e, r in EST],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('prazo ok', len(EST), 'estados,', len(out) // 1024, 'KB')
