# D4 · O alto do .docx (a proposta e os documentos do contrato do modelo padrão), numa página que imita a folha do Word.
# A folha segue o criarDocx de docx.ts (origin/main): A4, margens de 30 mm (em cima e à esquerda) e 20 mm, corpo em
# Times New Roman 12 com espaço de 1,5, cabeçalho centralizado com a 1ª linha em negrito de 13 pt, as outras em 9 pt cinza
# (#555555) e o fio vinho (#6B2346, 0,75 pt, 6 pt abaixo da última linha). Aqui a letra é a Liberation Serif, que tem as
# mesmas medidas da Times New Roman. O cabeçalho é medido na página (JavaScript) e o corpo começa onde o Word o põe:
# na margem de cima ou logo abaixo do cabeçalho, o que for mais baixo.
# Endereço: docx.html?estado=<estado>[&cab=12.5&logo=18] (cab: distância do cabeçalho à borda; logo: altura da caixa).
# Uso: python3 docx_a4.py <pasta-saida>
import sys, re, json, html
from rz_dados import *
from comum import CSS_BASE

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
FONTES = '\n'.join(re.findall(r'@font-face\{[^}]*\}', CSS_BASE))

# Propostas deste desenho (decisões 15 e 16): o cabeçalho a 10 mm da borda e a caixa do logo de 92 × 12 mm no .docx.
CAB, LOGO_H = 10, 12
HOJE_CAB, HOJE_LOGO = 12.5, 18


def proposta(e):
    nome = e['curto']
    return [
        ('titulo', 'PROPOSTA DE HONORÁRIOS ADVOCATÍCIOS'),
        ('direita', 'Proposta P-2026-021'),
        ('enderecamento', 'A Gabriela Teixeira Nunes,'),
        ('normal', f'Apresentamos a proposta de {nome} para o serviço abaixo. Ela vale como base para o contrato de honorários, que será assinado se a proposta for aceita.'),
        ('titulo', 'Serviço'),
        ('normal', 'Ação revisional de contrato de financiamento de veículo, com pedido de tutela para manter a posse do bem, na Justiça Estadual da Bahia, em Salvador.'),
        ('titulo', 'O que está incluído'),
        ('normal', 'Análise do contrato e dos extratos, petição inicial, audiências, recursos ao Tribunal de Justiça da Bahia e acompanhamento até o fim do processo.'),
        ('titulo', 'Honorários'),
        ('normal', '1. Valor fixo: R$ 5.100,00 em 6 parcelas de R$ 850,00, todo dia 25. Por mês, a partir da assinatura.'),
        ('normal', '2. Êxito: 20% sobre o que a cliente deixar de pagar ou receber de volta. Só se houver ganho no processo.'),
        ('normal', 'Custas, perícias e despesas do processo não estão incluídas nos honorários, salvo se escrito acima.'),
        ('titulo', 'Validade'),
        ('normal', 'Esta proposta vale até 08/12/2026.'),
        ('direita', 'Salvador, 23 de novembro de 2026.'),
        ('assinatura', f'_______________________________________\nCarol Santana\n{nome}'),
    ]


def contrato(e):
    end = f'{e["antigo"]} [ENDEREÇO: confira], Salvador/BA'
    return [
        ('titulo', 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS'),
        ('normal', 'CONTRATANTE: HÉLIO BATISTA CORRÊA, brasileiro, casado, comerciante, inscrito no CPF sob o nº 318.402.775-20, residente na Rua das Hortênsias, 210, Pituba, Salvador/BA, CEP 41810-030.'),
        ('normal', f'CONTRATADA: {e["razao"].upper()}, inscrita no CNPJ sob o nº {e["cnpj"]} e registrada na OAB/BA sob o nº 4.217, com sede em {end}, por seus advogados, CAROLINA SOARES SANTANA, brasileira, advogada, inscrita na OAB/BA sob o nº 63.876-S, e RAFAEL AUGUSTO MENEZES LIMA, brasileiro, advogado, inscrito na OAB/BA sob o nº 71.204.'),
        ('normal', 'As partes acima têm entre si justo e contratado o seguinte:'),
        ('titulo', 'CLÁUSULA PRIMEIRA · DO OBJETO'),
        ('normal', 'A CONTRATADA prestará ao CONTRATANTE os serviços de advocacia na ação revisional de contrato bancário, em todas as instâncias, até o trânsito em julgado.'),
        ('titulo', 'CLÁUSULA SEGUNDA · DOS HONORÁRIOS'),
        ('normal', 'Pelos serviços, o CONTRATANTE pagará à CONTRATADA R$ 5.100,00 (cinco mil e cem reais), em 6 parcelas mensais de R$ 850,00, com vencimento todo dia 25.'),
        ('normal', 'O atraso no pagamento de qualquer parcela gera multa de 2% e juros de 1% ao mês sobre o valor em atraso.'),
    ]


ESTADOS = [
    # nome, escritório, título curto, texto, corpo
    ('hoje', COMPLETA, 'Como sai hoje', 'O .docx de hoje: 3 linhas, com CNPJ, OAB e sede juntos na 2ª. O cabeçalho a 12,5 mm da borda.', 'proposta'),
    ('sem-logo', COMPLETA, 'Sem logo', 'As 4 linhas do timbrado aprovado: a razão social em negrito de 13 pt; CNPJ e OAB; a sede com CEP; telefone, e-mail e site.', 'proposta'),
    ('logo', LOGO, 'Com logo', 'O logo na caixa de 92 × 12 mm e as 4 linhas embaixo. A razão social fica, porque é diferente do nome curto (o texto alternativo do logo).', 'proposta'),
    ('logo-nome', QUADRADO, 'Logo e o nome ao lado', 'Logo quase quadrado: o nome curto ao lado do logo, como no carnê e no recibo, e as 4 linhas embaixo.', 'proposta'),
    ('sem-sociedade', SEM, 'Sem sociedade', 'Advogada sem sociedade: o nome completo, “OAB/BA 63.876-S · sem CNPJ”, a sede e os contatos. Nunca o CPF.', 'proposta'),
    ('razao-vazia-logo', VAZIA_LOGO, 'Razão social vazia, com logo', 'Sem razão social, a 1ª linha seria o nome curto, que o logo já diz: ela sai. Nenhum “[falta]” no cabeçalho.', 'proposta'),
    ('razao-longa', LONGA, '150 letras, sem logo', 'A razão social com 150 letras, o máximo aceito: a 1ª linha passa de 13 pt para 11 pt.', 'proposta'),
    ('razao-longa-logo', LONGA_LOGO, '150 letras e logo', 'O pior caso: o logo, a razão social de 150 letras em 11 pt e as outras 3 linhas.', 'proposta'),
    ('endereco-antigo', dict(ANTIGO, razao='SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS'), 'Endereço antigo', 'A sede do cadastro antigo, num texto só: o cabeçalho leva o texto antigo e a cidade, sem “confira”. A marca [ENDEREÇO: confira] fica no corpo do contrato, para quem confere antes de assinar.', 'contrato'),
]


def cabecalho(e, est):
    lg = logo_de(e)
    if est == 'hoje':
        ls = linhas_docx_hoje(e)
        ps = [f'<p class="dx-l1">{html.escape(ls[0])}</p>'] + [f'<p class="dx-l">{html.escape(x)}</p>' for x in ls[1:]]
        return ''.join(ps), False
    t = timbrado_docx(e)
    ps = []
    if lg:
        img = f'<img class="dx-logo" src="{uri(lg)}" alt="{"" if lg == "quadrado" else e["curto"]}" data-w="{tam(lg)[0]}" data-h="{tam(lg)[1]}">'
        nome = f'<span class="dx-nome-lado">{e["curto"]}</span>' if lg == 'quadrado' else ''
        ps.append(f'<p class="dx-logo-p">{img}{nome}</p>')
    if t['nome']:
        ps.append(f'<p class="dx-l1{" dx-longa" if t["longa"] else ""}">{t["nome"]}</p>')
    ps += [f'<p class="dx-l">{x}</p>' for x in t['linhas']]
    return ''.join(ps), t['longa']


def corpo(e, qual):
    ps = proposta(e) if qual == 'proposta' else contrato(e)
    out = ''
    for estilo, texto in ps:
        t = html.escape(texto).replace('\n', '<br>')
        t = t.replace('[ENDEREÇO: confira]', '<span class="dx-marca">[ENDEREÇO: confira]</span>')
        out += f'<p class="dx-{estilo}">{t}</p>'
    return out


def template(nome, e, tit, txt, qual):
    cab, _ = cabecalho(e, nome)
    return (f'<template data-est="{nome}" data-tit="{html.escape(tit)}" data-hoje="{1 if nome == "hoje" else 0}" data-logo="{1 if logo_de(e) else 0}">'
            f'<p class="dx-sobre-txt">{txt}</p>'
            f'<div class="dx-cab" data-cab>{cab}</div><div class="dx-corpo" data-corpo>{corpo(e, qual)}</div></template>')


NAV = ''.join(f'<a href="?estado={n}" data-e="{n}">{html.escape(t)}</a>' for n, _, t, _, _ in ESTADOS)
TEMPLATES = '\n'.join(template(*x) for x in ESTADOS)

PAGINA = f'''<!doctype html>
<html lang="pt-BR" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cabeçalho do .docx · Santana Advocacia · T3jus</title>
<meta name="description" content="O alto da proposta e dos documentos em .docx com as 4 linhas do timbrado, numa folha A4 como a do Word, com a medida do cabeçalho (F3.146, D4).">
<style>
{FONTES}
:root{{--vinho:#692746;--vinho-2:#87335B;--vinho-escuro:#4F1D35;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--tinta-2:#5E4A54;--papel:#fff;--borda:#E3D3CB}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
h1,h2{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}}
.topo{{background:var(--vinho);color:#fff;padding:20px 24px 14px}}
.topo .sobre{{margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90}}
.topo h1{{font-size:30px;line-height:1.1;margin-top:4px}}
.tb-var{{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 24px;background:var(--vinho-escuro);color:var(--ambar-3);font-size:12px}}
.tb-var a{{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:22px;color:#fff;text-decoration:none;font-size:13px;font-weight:500;border:1px solid rgba(242,205,179,.45)}}
.tb-var a[aria-current]{{background:var(--ambar-3);color:var(--vinho);border-color:var(--ambar-3)}}
a:focus-visible,input:focus-visible+span{{outline:3px solid var(--ambar-3);outline-offset:2px}}
main{{display:grid;grid-template-columns:auto minmax(280px,380px);gap:28px;align-items:start;padding:28px 24px 48px;max-width:1300px;margin:0 auto}}
.painel{{background:var(--papel);border-radius:14px;padding:20px;display:grid;gap:12px;position:sticky;top:16px}}
.painel h2{{font-size:24px;color:var(--vinho)}}
.painel p{{margin:0}}
.dx-sobre-txt{{color:var(--tinta-2);font-size:13px}}
.medidas{{margin:0;display:grid;grid-template-columns:auto auto;gap:6px 12px;font-size:13px}}
.medidas dt{{color:var(--tinta-2)}} .medidas dd{{margin:0;font-weight:500;text-align:right;font-variant-numeric:tabular-nums}}
.medidas .forte{{color:var(--vinho);font-weight:600}}
.veredito{{padding:10px 12px;border-radius:10px;background:var(--sal-2);font-size:13px;line-height:1.5}}
.veredito.passa{{background:#F6E3D6}}
.chave{{display:flex;gap:10px;align-items:center;min-height:44px;cursor:pointer;font-size:13px}}
.chave input{{width:20px;height:20px;accent-color:var(--vinho);margin:0}}
.legenda{{font-size:12px;color:var(--tinta-2)}}
/* a folha do Word */
.palco{{width:210mm}}
.folha{{position:relative;width:210mm;height:297mm;background:#fff;box-shadow:0 10px 30px -14px rgba(42,26,34,.5);overflow:hidden;transform-origin:0 0;
  font-family:"Times New Roman","Liberation Serif",Tinos,serif;color:#000}}
.dx-cab{{position:absolute;left:30mm;right:20mm;top:var(--cab)}}
.dx-cab p{{margin:0;text-align:center;line-height:1.15}}
.dx-l1{{font-weight:700;font-size:13pt}}
.dx-l1.dx-longa{{font-size:11pt}}
.dx-l{{font-size:9pt;color:#555}}
.dx-nw{{white-space:nowrap}}
.dx-cab p:last-child{{border-bottom:.75pt solid #6B2346;padding-bottom:6pt}}
.dx-logo-p{{margin-bottom:3pt!important;display:flex;align-items:center;justify-content:center;gap:0}}
.dx-logo{{display:block;max-width:92mm;max-height:var(--logo);width:auto;height:auto}}
.dx-logo-p .dx-nome-lado{{font-weight:700;font-size:13pt;white-space:pre}}
.dx-logo-p .dx-nome-lado::before{{content:"  "}}
.dx-corpo{{position:absolute;left:30mm;right:20mm;top:var(--corpo,30mm);bottom:20mm;overflow:hidden;font-size:12pt}}
.dx-corpo p{{margin:0 0 8pt;line-height:1.5}}
.dx-normal{{text-indent:25mm;text-align:justify}}
.dx-titulo{{font-weight:700;text-align:center;margin:12pt 0 12pt!important;line-height:1.15!important}}
.dx-enderecamento{{font-weight:700;margin-bottom:36pt!important}}
.dx-direita{{text-align:right}}
.dx-assinatura{{text-align:center;margin-top:24pt!important;line-height:1.15!important}}
.dx-marca{{background:#FFF1A8}}
/* as medidas desenhadas por cima (só nesta página de desenho) */
.guia{{position:absolute;left:0;right:0;pointer-events:none;font:500 8pt Poppins,sans-serif;color:#1F5E8C}}
.guia.margem{{left:0;right:auto;width:27mm;border-top:1px dashed #1F5E8C}}
.guia.margem2{{left:auto;right:0;width:18mm;border-top:1px dashed #1F5E8C}}
.guia.margem span{{position:absolute;left:2mm;top:.6mm;padding:0 2px;line-height:1.2}}
.guia.cab{{left:auto;right:3mm;width:12mm;border:1.5px solid #1F5E8C;border-left:0;border-radius:0 3px 3px 0}}
.guia.cab span{{position:absolute;right:3mm;top:.6mm;padding:0 2px;line-height:1.2;white-space:nowrap}}
.guia.perde{{left:22mm;right:auto;width:5mm;background:repeating-linear-gradient(135deg,rgba(31,94,140,.45) 0 2px,transparent 2px 5px)}}
.sem-guias .guia{{display:none}}
@media (max-width:900px){{main{{grid-template-columns:1fr;padding:16px}} .painel{{position:static}} .topo,.tb-var{{padding-left:16px;padding-right:16px}}}}
</style></head>
<body>
<header class="topo"><p class="sobre">T3jus · F3.146 · D4 · para aprovação da Carol</p><h1>O alto do .docx: proposta e documentos</h1></header>
<nav class="tb-var" aria-label="Variações do cabeçalho"><span>Variações:</span>{NAV}</nav>
<main>
<div class="palco" id="palco"><div class="folha" id="folha" role="img" aria-labelledby="folha-rot"><span id="folha-rot" hidden></span></div></div>
<section class="painel" aria-labelledby="t-med">
<h2 id="t-med"></h2>
<div id="sobre"></div>
<dl class="medidas">
<dt>Espaço do cabeçalho</dt><dd id="m-espaco"></dd>
<dt>O cabeçalho ocupa</dt><dd class="forte" id="m-cab"></dd>
<dt>O texto começa em</dt><dd id="m-corpo"></dd>
<dt>Texto perdido em cada página</dt><dd class="forte" id="m-perde"></dd>
</dl>
<p class="veredito" id="veredito" role="status"></p>
<label class="chave"><input type="checkbox" id="guias" checked><span>Mostrar as medidas na folha</span></label>
<p class="legenda">Em azul, só neste desenho: a margem de cima (30 mm), a altura do cabeçalho e, riscado, o texto que o cabeçalho empurra para baixo. O cabeçalho se repete em toda página. A folha usa a Liberation Serif, com as medidas da Times New Roman do Word.</p>
</section>
</main>
{TEMPLATES}
<script>
(function(){{
  var q=new URLSearchParams(location.search), PX=96/25.4;
  var t=document.querySelector('template[data-est="'+(q.get('estado')||'sem-logo')+'"]')||document.querySelector('template[data-est="sem-logo"]');
  var hoje=t.dataset.hoje==='1';
  var cab=parseFloat(q.get('cab')||(hoje?{HOJE_CAB}:{CAB})), logo=parseFloat(q.get('logo')||(hoje?{HOJE_LOGO}:{LOGO_H}));
  var f=document.getElementById('folha'), c=t.content.cloneNode(true);
  document.getElementById('sobre').appendChild(c.querySelector('.dx-sobre-txt'));
  f.appendChild(c);
  f.style.setProperty('--cab',cab+'mm'); f.style.setProperty('--logo',logo+'mm');
  document.getElementById('t-med').textContent=t.dataset.tit;
  document.title=t.dataset.tit+' · Cabeçalho do .docx · T3jus';
  document.querySelectorAll('.tb-var a').forEach(function(a){{ if(a.dataset.e===t.dataset.est) a.setAttribute('aria-current','page') }});
  var br=function(n){{return n.toFixed(1).replace('.',',')+' mm'}};
  function medir(){{
    var h=f.querySelector('[data-cab]').offsetHeight/PX, fim=cab+h, corpo=Math.max(30,fim), perde=corpo-30;
    f.style.setProperty('--corpo',corpo+'mm');
    f.querySelectorAll('.guia').forEach(function(g){{g.remove()}});
    var add=function(cls,top,alt,txt){{var g=document.createElement('div');g.className='guia '+cls;g.style.top=top+'mm';if(alt)g.style.height=alt+'mm';g.setAttribute('aria-hidden','true');g.innerHTML=txt?'<span>'+txt+'</span>':'';f.appendChild(g)}};
    add('margem',30,0,'30 mm'); add('margem2',30,0,'');
    add('cab',cab,h,br(h));
    if(perde>0.05) add('perde',30,perde,'');
    document.getElementById('m-espaco').textContent=br(30-cab)+', de '+br(cab).replace(' mm','')+' a 30 mm da borda';
    document.getElementById('m-cab').textContent=br(h);
    document.getElementById('m-corpo').textContent=br(corpo);
    document.getElementById('m-perde').textContent=perde>0.05?br(perde)+', cerca de '+Math.max(1,Math.round(perde/6.35))+' linha'+(Math.round(perde/6.35)>1?'s':'')+' de texto':'nada';
    var v=document.getElementById('veredito');
    v.className='veredito'+(perde>0.05?' passa':'');
    v.textContent=perde>0.05?'O cabeçalho passa da margem: o Word empurra o texto '+br(perde)+' para baixo em toda página.':'Cabe: o texto começa na margem de 30 mm, como sempre.';
    document.getElementById('folha-rot').textContent='Primeira página A4 do .docx, '+t.dataset.tit+'. O cabeçalho ocupa '+br(h)+' e o texto começa em '+br(corpo)+'.';
    window.__medida={{estado:t.dataset.est,cab:cab,logo:logo,altura:+h.toFixed(2),corpo:+corpo.toFixed(2),perde:+perde.toFixed(2)}};
  }}
  function escala(){{
    var p=document.getElementById('palco'), w=p.parentElement.clientWidth - (innerWidth<=900?0:0);
    var cheia=210*PX, s=innerWidth<=900?Math.min(1,(document.querySelector('main').clientWidth-32)/cheia):1;
    f.style.transform=s<1?'scale('+s+')':''; p.style.width=(cheia*s)+'px'; p.style.height=(297*PX*s)+'px';
  }}
  document.getElementById('guias').addEventListener('change',function(e){{f.classList.toggle('sem-guias',!e.target.checked)}});
  addEventListener('resize',escala); escala();
  Promise.all([document.fonts.ready].concat([].map.call(f.querySelectorAll('img'),function(i){{return i.complete?1:new Promise(function(r){{i.onload=i.onerror=r}})}}))).then(medir);
  medir();
}})();
</script>
</body></html>'''

open(f'{SAIDA}/docx.html', 'w', encoding='utf-8').write(PAGINA)
print('docx ok', len(ESTADOS))
