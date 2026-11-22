# Gera abas-tabelas.html: as abas Propostas e Contratos da ficha do cliente com o CSS real do
# sistema e, no "depois", o acréscimo proposto. Marcação copiada de FichaLigada.tsx.
# Uso: python3 _fonte/gerar_tabelas.py <pasta de saída>
import re, sys
REPO = '/home/claude/t3jus/'
SRC = REPO + 'sistema/packages/ui/src/'
saida = sys.argv[1]
console = open(SRC + 'console.css', encoding='utf-8').read()
portal = open(SRC + 'portal.css', encoding='utf-8').read()
eq = open(REPO + 'docs/design/aprovadas/console-v1/equipe.html', encoding='utf-8').read()
fontes = '\n'.join(re.findall(r'@font-face\{[^}]*\}', eq))
proposta = open(saida + '/_fonte/proposta-tabelas.css', encoding='utf-8').read()
ICO = {
  'balanca': '<path d="M12 3.5v16M7.5 20.5h9M4.5 7h15"/><path d="M4.5 7 2 13h5ZM19.5 7 17 13h5Z"/><path d="M2 13a2.5 2.5 0 0 0 5 0M17 13a2.5 2.5 0 0 0 5 0"/>',
  'check': '<path d="m4.5 12.5 4.5 4.5L19.5 6.5"/>',
  'mais': '<path d="M12 5v14M5 12h14"/>',
  'pena': '<path d="M20 4C12 4 7.5 9 6.5 16.5L5 21"/><path d="M20 4c0 7.5-5 11.5-12.5 12.5"/><path d="M9.5 11h6M8 14h4.5"/>',
  'maleta': '<path d="M3 8h18v12H3Z"/><path d="M9 8V4.5h6V8"/><path d="M3 13h18"/>',
  'dir': '<path d="m9 6 6 6-6 6"/>',
  'relogio': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
}
ico = lambda n, c='ico': f'<svg class="{c}" viewBox="0 0 24 24" aria-hidden="true">{ICO[n]}</svg>'

def cartao(nome, sub, dados, selos, acao=''):
    dl = ''.join(f'<div style="display:contents"><dt>{k}</dt><dd>{v}</dd></div>' for k, v in dados)
    a = f'<div class="fl-c-acao">{acao}</div>' if acao else ''
    return (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="#">{nome}</a><small>{sub}</small></div>{ico("dir", "ico c-ir")}</div>'
            f'<dl class="c-dados">{dl}</dl><div class="c-selos">{selos}</div>{a}</li>')

def folha(titulo, sub, corpo, acoes=''):
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    return (f'<section class="folha" aria-labelledby="t-aba" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-aba">{titulo}</h2>'
            f'<p class="sub">{sub}</p></div>{a}</div>{corpo}</section>')

def propostas(depois):
    selo = f'<span class="selo selo-ok">{ico("pena")}Virou contrato</span>'
    t = ('<table class="so-pc cl-tab fl-tab"><caption class="sr">Propostas de CAROLINA SOARES SANTANA</caption><colgroup>'
         '<col style="width:22%"><col style="width:32%"><col style="width:36%"><col style="width:10%"></colgroup>'
         '<thead><tr><th scope="col">Proposta</th><th scope="col">Situação</th><th scope="col">Honorários</th><th scope="col"><span class="sr">Abrir</span></th></tr></thead><tbody>'
         '<tr><td><div class="fl-num"><a href="#">P-2026-001</a><small>Criada em 21/11 por Carol</small></div></td>'
         f'<td><div class="fl-et">{selo}<small>Em 21/11</small></div></td>'
         '<td><b>R$ 2.400,00 mais êxito</b><small>PROCESSO TRABALHISTA</small></td>'
         f'<td><a class="fl-ir" href="#" aria-label="Abrir a proposta P-2026-001">Abrir{ico("dir", "ico ico-s")}</a></td></tr></tbody></table>')
    c = ('<ul class="cartoes so-cel fl-cards" aria-label="Propostas de CAROLINA SOARES SANTANA">'
         + cartao('P-2026-001', 'Criada em 21/11 por Carol', [('Honorários', 'R$ 2.400,00 mais êxito'), ('Situação', 'Em 21/11')], selo) + '</ul>')
    pe = '<div class="fl-pe"><span><b>1 proposta</b> · da mais nova para a mais antiga. Nada aqui é apagado.</span></div>'
    gerar = f'<a class="btn btn-sec" href="#">{ico("maleta")}Gerar proposta</a>'
    return folha('Propostas', 'O que o escritório ofereceu a CAROLINA. Cada proposta abre a própria ficha.', t + c + pe, gerar)

def contratos(depois, elab=False):
    cod = '<span class="fl-cod">P-2026-001</span>' if depois else 'P-2026-001'
    selo = f'<span class="selo selo-atencao">{ico("relogio")}Em elaboração</span>' if elab else f'<span class="selo selo-ativo">{ico("check")}Ativo</span>'
    btn = (lambda cls: f'<button class="btn {cls}" type="button">{ico("check")}Registrar assinatura</button>') if elab else (lambda cls: f'<button class="btn {cls}" type="button">{ico("balanca")}Abrir o caso</button>')
    sit = 'Desde 21/11 · falta a assinatura' if elab else 'Assinado em 21/11'
    rec = '<small>A programação nasce na assinatura</small>' if elab else '<a class="fl-ir" href="#" aria-label="Recebimentos do C-2026-001: 22/12 · R$ 200,00"><span class="num">22/12 · R$ 200,00</span></a><small>mensalidade 1 de 12</small>'
    caso = 'Abre ao registrar a assinatura' if elab else 'Sem caso ainda'
    t = ('<table class="so-pc cl-tab fl-tab"><caption class="sr">Contratos de CAROLINA SOARES SANTANA</caption><colgroup>'
         '<col style="width:21%"><col style="width:18%"><col style="width:21%"><col style="width:20%"><col style="width:20%"></colgroup>'
         '<thead><tr><th scope="col">Contrato</th><th scope="col">Situação</th><th scope="col">Honorários</th><th scope="col">Recebimentos</th><th scope="col">Caso</th></tr></thead><tbody>'
         f'<tr class="fl-vivo"><td><div class="fl-num"><a href="#">C-2026-001</a><small>PROCESSO TRABALHISTA · veio da {cod}</small></div></td>'
         f'<td><div class="fl-et">{selo}<small>{sit}</small></div></td>'
         '<td><b>R$ 2.400,00 mais êxito</b></td>'
         f'<td>{rec}</td>'
         f'<td><small>{caso}</small><div style="margin-top:6px">{btn("btn-sec")}</div></td></tr></tbody></table>')
    c = ('<ul class="cartoes so-cel fl-cards" aria-label="Contratos de CAROLINA SOARES SANTANA">'
         + cartao('C-2026-001', f'PROCESSO TRABALHISTA · veio da {cod}', [('Honorários', 'R$ 2.400,00 mais êxito'), ('Caso', 'Abre na assinatura' if elab else 'Sem caso ainda')], selo, btn('btn-pri')) + '</ul>')
    pe = '<div class="fl-pe"><span><b>1 contrato</b>. Baixar o documento, mudar condições e encerrar ficam na ficha do contrato.</span></div>'
    return folha('Contratos', 'Os contratos de honorários de CAROLINA, com a situação, a assinatura e o caso ligado.', t + c + pe)

estados = {}
for v in ('antes', 'depois'):
    estados[f'{v}-propostas'] = propostas(v == 'depois')
    estados[f'{v}-contratos'] = contratos(v == 'depois')
    estados[f'{v}-elaboracao'] = contratos(v == 'depois', True)

tpl = ''.join(f'<template data-e="{k}">{h}</template>' for k, h in estados.items())
doc = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ficha: tabelas das abas</title>
<style>
{fontes}
/* ===== console.css do sistema, sem mudança ===== */
{console}
/* ===== portal.css do sistema, sem mudança ===== */
{portal}
/* ===== só desta prévia ===== */
html,body{{margin:0}}
.cena{{min-height:100vh;padding:32px 48px}}
.cena .largura{{width:var(--w,1088px)}}
.rotulo-previa{{font:500 12px/1.4 Poppins,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5E4A54;margin:0 0 12px}}
@media (max-width:760px){{.cena{{padding:16px}}.cena .largura{{width:auto}}}}
</style>
<style id="proposta" media="not all">
/* ===== acréscimo proposto (vai para portal.css, logo depois de "Tabelas das abas novas") ===== */
{proposta}
</style></head>
<body><div class="co pt co-ficha"><div class="cena"><div class="cl">
<p class="rotulo-previa" id="rot"></p>
<div class="largura" id="principal"></div>
</div></div></div>
<template id="estados">{tpl}</template>
<script>
const p = new URLSearchParams(location.search);
const e = p.get('estado') || 'depois-contratos';
if (p.get('w')) document.querySelector('.largura').style.setProperty('--w', p.get('w') + 'px');
const t = document.getElementById('estados').content.querySelector('[data-e="' + e + '"]');
document.getElementById('principal').appendChild(t.content.cloneNode(true));
const [v, c] = e.split('-');
if (v === 'depois') document.getElementById('proposta').media = 'all';
document.getElementById('rot').textContent = (v === 'antes' ? 'Antes' : 'Depois') + ' · aba ' + ({{propostas:'Propostas', contratos:'Contratos', elaboracao:'Contratos, em elaboração'}}[c]) + (p.get('w') ? ' · folha de ' + p.get('w') + ' px' : '');
</script></body></html>'''
open(saida + '/abas-tabelas.html', 'w', encoding='utf-8').write(doc)
print('ok', len(doc))
