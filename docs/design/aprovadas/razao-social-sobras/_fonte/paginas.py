# Peças comuns: abre uma página aprovada, troca o escritório de exemplo pelo Santana, acrescenta estados
# (<template data-est>) e o CSS. As páginas aprovadas não mudam: o script lê de docs/design/aprovadas e grava aqui.
import re
from rz_dados import APROV, EQUIPE
import css_real

ICO = lambda n, c='ico': f'<svg class="{c}" aria-hidden="true"><use href="#i-{n}"/></svg>'

# Peças novas (prefixo rz-: conferido na origin/main, nenhuma classe rz- existe no portal.css nem no console.css)
CSS_RZ = r'''
/* ===== F3.146 · peças novas (prefixo rz-) ===== */
.rz-nw{white-space:nowrap}
/* Prévia de Marca e timbrado · carnê: a linha da identificação embaixo da marca, como na via (decisões 4, 8, 9 e 13 de carne-recibo-razao-social) */
.lg-cn.rz-cn .lg-cn-top{align-items:flex-end}
.rz-marca{flex:1 1 auto;min-width:0;display:grid;gap:3px;justify-items:start}
.rz-marca .lg-m{flex:none;max-width:100%}
.rz-cn .lg-m img{max-height:32px}
.rz-cn .lg-lado img{width:28px!important;height:28px!important}
.rz-cn.rz-longo .lg-m img{max-height:29px}
.rz-cn.rz-longo .lg-lado img{width:26px!important;height:26px!important}
.rz-sub{font-size:7px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;color:var(--texto-2);line-height:1.1}
.lg-doc.rz-ident{margin-top:1px;line-height:1.35;overflow-wrap:anywhere}
.rz-ident b{font-weight:600;color:var(--tinta)}
.rz-longo .rz-ident{font-size:8.2px;line-height:1.3}
.rz-cn .lg-num{flex:none}
/* Prévia de Marca e timbrado · recibo: as 4 linhas da folha (decisão 5), a 1ª em destaque */
.lg-rb.rz-rb{align-items:flex-end}
.rz-rb .lg-m{flex:1 1 auto}
.lg-rb p.rz-ender{max-width:56%;display:grid;gap:1px;justify-items:end;line-height:1.4;overflow-wrap:anywhere}
.lg-rb p.rz-ender>span{display:block}
.lg-rb p.rz-ender b{font-size:9.5px;line-height:1.3;margin-bottom:1px}
.rz-longo .lg-rb p.rz-ender b{font-size:8.6px}
/* A linha de aviso: o padrão da linha da chave Pix (.cn-chave), com o caminho numa linha de 44 px */
.rz-linha{margin:0}
.rz-linha>span{min-width:0}
.rz-linha .rz-ir{display:flex;align-items:center;gap:6px;min-height:44px;margin:0 0 -10px;font-weight:500;color:var(--vinho);max-width:100%}
.rz-linha .rz-ir .ico{width:16px;height:16px;margin:0;color:currentColor}
'''


def ler(rel):
    return open(APROV + rel, encoding='utf-8').read()


def rebatizar(s):
    """Ribeiro & Matos (o elenco do carnê e do recibo aprovados) vira Santana Advocacia, em Salvador."""
    trocas = [
        ("socio:{nome:'Marina Ribeiro',ini:'M'", "socio:{nome:'Carol Santana',ini:'C'"),
        ("financeiro:{nome:'Diego Almeida',ini:'D',papel:'Áreas: Comercial e Financeiro',areas:['comercial','financeiro']",
         f"financeiro:{{nome:'{EQUIPE[0]}',ini:'{EQUIPE[1]}',papel:'{EQUIPE[2]}',areas:['contratos','financeiro']"),
        ('<span class="mo" aria-hidden="true">R</span>', '<span class="mo" aria-hidden="true">S</span>'),
        ('Advocacia · 7 pessoas', 'Advocacia · 5 pessoas'),
        ('Ribeiro &amp; Matos', 'Santana Advocacia'), ('Ribeiro & Matos', 'Santana Advocacia'),
        ('Marina Ribeiro', 'Carol Santana'), ('data-quem-ini>M<', 'data-quem-ini>C<'),
        ('41.276.839/0001-34', '47.318.552/0001-06'), ('RIBEIRO E MATOS SOC ADV', 'SANTANA LIMA OLIVEIRA ADV'),
        ('SAO PAULO', 'SALVADOR'), ('Diego Almeida', EQUIPE[0]), ('Diego liga', 'Bruna liga'), ('ribeiromatos', 'santana'), ('OAB/SP 31.874', 'OAB/BA 4.217'), ('(11) 97405-2210', '(71) 99187-4402'),
    ]
    for a, b in trocas:
        s = s.replace(a, b)
    # Se a página não tem quem é da equipe com Financeiro, entra (Bruna, inventada aqui)
    if "financeiro:{nome:" not in s:
        s = s.replace("'sem-area':{", f"financeiro:{{nome:'{EQUIPE[0]}',ini:'{EQUIPE[1]}',papel:'{EQUIPE[2]}',areas:['contratos','financeiro'],dono:false}},'sem-area':{{", 1)
    return s


def template(s, est):
    i = s.index(f'<template data-est="{est}"')
    j = s.index('</template>', i) + len('</template>')
    return i, j, s[i:j]


def sem_templates(s):
    """Tira os estados aprovados: a página fica só com os estados deste desenho (o resto não muda e está no aprovado)."""
    return re.sub(r'<template data-est="(?!\'\+)[^"]+"[^>]*>.*?</template>\n?', '', s, flags=re.S)


def com_estados(s, novos, padrao):
    """Põe os estados novos no lugar dos aprovados e escolhe o que abre sem ?estado=."""
    i = s.index('<template data-est="')
    s = s[:i] + '\n'.join(novos) + '\n' + sem_templates(s[i:])
    s = re.sub(r"data-padrao='\{\"estado\":\"[^\"]*\"", f"data-padrao='{{\"estado\":\"{padrao}\"", s, count=1)
    return s


def css(s, extra=''):
    return s.replace('</head>', '<style>' + css_real.TUDO + CSS_RZ + extra + '</style>\n</head>', 1)


def titulo_meta(s, titulo, desc):
    s = re.sub(r'<title>[^<]*</title>', f'<title>{titulo}</title>', s, count=1)
    s = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{desc}"', s, count=1)
    return s


def linha_aviso(papel, dono, motivo='RAZAO', dona='Carol Santana', curto='Santana Advocacia', href='escritorio.html', saem=False):
    """A linha de aviso (D1, D2 e D3), com o texto pelo motivo de razaoSocialEmBranco. papel: 'O carnê', 'O recibo'
    ou 'O carnê e o recibo' (saem=True)."""
    sai = 'saem' if saem else 'sai'
    if motivo == 'TIPO':
        txt = (f'<b>Falta dizer em Dados do escritório se ele é uma sociedade.</b> {papel} {sai} com o nome {curto}, sem razão social. '
               'Se a advogada atua sem sociedade, é só marcar isso lá, e o aviso some.')
    else:
        txt = f'<b>A razão social do escritório está em branco.</b> {papel} {sai} com o nome {curto} no lugar dela.'
    if dono:
        ir = f'<a class="rz-ir" href="{href}?estado=escritorio-editar">{ICO("lapis")}Completar em Escritório › Dados do escritório</a>'
        quem = ''
    else:
        ir = f'<a class="rz-ir" href="{href}?estado=escritorio-leitura">{ICO("olho")}Ver em Escritório › Dados do escritório</a>'
        quem = f' Quem completa é {dona}, a sócia dona.'
    return f'<p class="cn-chave rz-linha">{ICO("alerta")}<span>{txt}{quem}{ir}</span></p>'


def script_esc(s):
    """Estados de outro escritório (Ribeiro & Matos; Carol Santana Advocacia, sem sociedade): o cartão do escritório
    na moldura e a sócia dona acompanham o estado (data-esc e data-quem no <template>)."""
    s = s.replace("    socio:{nome:'Carol Santana'",
                  "    'socio-rm':{nome:'Marina Ribeiro',ini:'M',papel:'Sócia dona · vê tudo',areas:['comercial','contratos','financeiro','juridico'],dono:true},\n    socio:{nome:'Carol Santana'", 1)
    s = s.replace("document.getElementById('miolo').appendChild(t.content.cloneNode(true));",
                  "document.getElementById('miolo').appendChild(t.content.cloneNode(true));\n"
                  "  if(t.dataset.esc){document.querySelectorAll('.escritorio strong').forEach(function(x){x.textContent=t.dataset.esc});"
                  "document.querySelectorAll('.escritorio .mo').forEach(function(x){x.textContent=t.dataset.esc.charAt(0)});"
                  "document.title=document.title.replace('Santana Advocacia',t.dataset.esc)}", 1)
    assert "'socio-rm'" in s and 't.dataset.esc' in s
    return s
