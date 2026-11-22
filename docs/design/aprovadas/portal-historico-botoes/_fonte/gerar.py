# Gera historico-botoes.html: o cabeçalho da folha "Histórico de atendimento" com o CSS real
# do sistema (console.css + portal.css, sem mudança) e, no "depois", o acréscimo proposto.
# Uso: python3 _fonte/gerar.py <pasta de saída>
import re, sys, html
REPO = '/home/claude/t3jus/'
SRC = REPO + 'sistema/packages/ui/src/'
saida = sys.argv[1]
console = open(SRC + 'console.css', encoding='utf-8').read()
portal = open(SRC + 'portal.css', encoding='utf-8').read()
eq = open(REPO + 'docs/design/aprovadas/console-v1/equipe.html', encoding='utf-8').read()
fontes = '\n'.join(re.findall(r'@font-face\{[^}]*\}', eq))
proposta = open(saida + '/_fonte/proposta.css', encoding='utf-8').read()

ICO = {
  'balanca': '<path d="M12 3.5v16M7.5 20.5h9M4.5 7h15"/><path d="M4.5 7 2 13h5ZM19.5 7 17 13h5Z"/><path d="M2 13a2.5 2.5 0 0 0 5 0M17 13a2.5 2.5 0 0 0 5 0"/>',
  'check': '<path d="m4.5 12.5 4.5 4.5L19.5 6.5"/>',
  'mais': '<path d="M12 5v14M5 12h14"/>',
}
ico = lambda n: f'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">{ICO[n]}</svg>'

def botoes(caso):
  reg = lambda cls: f'<button class="btn {cls}" type="button">{ico("mais")}Registrar atendimento</button>'
  if caso == 'um':
    return reg('btn-pri')
  passo = {'dois': ('balanca', 'Abrir o caso'), 'longo': ('check', 'Registrar assinatura')}[caso]
  return f'<button class="btn btn-pri" type="button">{ico(passo[0])}{passo[1]}</button>' + reg('btn-sec')

def folha(versao, caso):
  classe = 'folha cl-hist' if versao == 'depois' else 'folha'
  return f'''<section class="{classe}" aria-labelledby="t-hist" style="overflow:hidden">
  <div class="folha-cab">
    <div>
      <h2 id="t-hist">Histórico de atendimento</h2>
      <p class="sub">Cada conversa com o cliente ou a família: quando, por onde, quem atendeu e o combinado. Nada aqui é apagado.</p>
    </div>
    <div class="acoes">{botoes(caso)}</div>
  </div>
  <div class="eventos-dia">
    <h3>21/11/2026</h3>
    <ol class="eventos">
      <li><time datetime="2026-11-21T22:10">22h10</time><span class="pto" aria-hidden="true"></span><div>
        <p><b>Carol</b> atendeu por WhatsApp <span class="selo selo-neutro">WhatsApp</span></p>
        <span class="cl-resumo">“Aceitou a proposta P-2026-001.”</span></div></li>
      <li><time datetime="2026-11-21T22:03">22h03</time><span class="pto" aria-hidden="true"></span><div>
        <p><b>Carol</b> atendeu por WhatsApp <span class="selo selo-neutro">WhatsApp</span></p>
        <small>com CAROLINA SOARES SANTANA</small>
        <span class="cl-resumo">“Interesse em processo”</span></div></li>
    </ol>
  </div>
  <div class="mais"><span>Mostrando todos os 2 atendimentos</span></div>
</section>'''

LATERAL = '''<aside class="cl-col" aria-label="Contexto do cliente"><section class="folha" aria-labelledby="t-funil">
  <div class="folha-cab"><div><h2 id="t-funil">No funil</h2><p class="sub">Coluna lateral, só para dar a largura real.</p></div></div>
  <div class="folha-corpo"><p style="color:var(--texto-2);font-size:13px">Proposta aceita · Contrato em elaboração</p></div></section></aside>'''

CASOS = [(v, c) for v in ('antes', 'depois') for c in ('dois', 'um', 'longo')]
estados = {f'{v}-{c}': folha(v, c) for v, c in CASOS}

doc = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Histórico: botões do cabeçalho</title>
<style>
{fontes}
/* ===== console.css do sistema, sem mudança ===== */
{console}
/* ===== portal.css do sistema, sem mudança ===== */
{portal}
/* ===== acréscimo proposto (vai para o fim de portal.css) ===== */
{proposta}
/* ===== só desta prévia ===== */
html,body{{margin:0}}
.cena{{min-height:100vh;padding:32px 108px}}
.cena .cl-grade{{width:1224px}}
.rotulo-previa{{font:500 12px/1.4 Poppins,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5E4A54;margin:0 0 12px}}
@media (max-width:760px){{.cena{{padding:16px}}.cena .cl-grade{{width:auto}}.cena aside{{display:none}}}}
</style></head>
<body><div class="co pt"><div class="cena"><div class="cl">
<p class="rotulo-previa" id="rot"></p>
<div class="cl-grade"><div class="cl-col" id="principal"></div>{LATERAL}</div>
</div></div></div>
<template id="estados">{''.join(f'<template data-e="{k}">{v}</template>' for k, v in estados.items())}</template>
<script>
const p = new URLSearchParams(location.search);
const e = p.get('estado') || 'depois-dois';
const t = document.getElementById('estados').content.querySelector('[data-e="' + e + '"]');
document.getElementById('principal').appendChild(t.content.cloneNode(true));
const nomes = {{dois:'dois botões', um:'um botão só', longo:'rótulo de passo mais longo'}};
const [v, c] = e.split('-');
document.getElementById('rot').textContent = (v === 'antes' ? 'Antes' : 'Depois') + ' · ' + nomes[c];
</script></body></html>'''
open(saida + '/historico-botoes.html', 'w', encoding='utf-8').write(doc)
print('ok', len(doc))
