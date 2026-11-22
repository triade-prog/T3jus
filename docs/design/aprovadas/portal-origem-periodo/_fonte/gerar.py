# Gera origem-periodo.html: as folhas "De onde vêm os clientes" (Origem dos contatos) e
# "Quanto vira contrato" (Funil), dentro da moldura do Portal, com o CSS real do sistema
# (console.css + portal.css, sem mudança) e, no "depois", o acréscimo proposto (proposta.css).
# Uso: python3 _fonte/gerar.py <pasta de saída>
# Estados: ?estado=antes-origem | depois-origem | antes-funil | depois-funil
import re, sys
REPO = '/home/claude/t3jus/'
SRC = REPO + 'sistema/packages/ui/src/'
saida = sys.argv[1]
console = open(SRC + 'console.css', encoding='utf-8').read()
portal = open(SRC + 'portal.css', encoding='utf-8').read()
eq = open(REPO + 'docs/design/aprovadas/console-v1/equipe.html', encoding='utf-8').read()
fontes = '\n'.join(re.findall(r'@font-face\{[^}]*\}', eq))
proposta = open(saida + '/_fonte/proposta.css', encoding='utf-8').read()

ICO = {
  'quad': '<path d="M4.5 4.5h15v15h-15Z"/>',
  'ajuda': '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  'escudo': '<path d="M12 3.5 19.5 6v6c0 4.5-3.2 7.6-7.5 8.5C7.7 19.6 4.5 16.5 4.5 12V6Z"/>',
  'pessoas': '<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.5-3.5 3.2-6 6.5-6s6 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2 .8 3.2 2.8 3.5 5.5"/>',
  'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
}
ico = lambda n, c='ico': f'<svg class="{c}" viewBox="0 0 24 24" aria-hidden="true">{ICO[n]}</svg>'

def periodo(versao):
  cls = 'chips cm-periodo' if versao == 'depois' else 'chips'
  bt = lambda t, on: f'<button type="button" aria-pressed="{"true" if on else "false"}">{t}</button>'
  return f'<div class="{cls}" role="group" aria-label="Período">{bt("30 dias", False)}{bt("90 dias", True)}{bt("12 meses", False)}</div>'

def cab(versao, hid, titulo, sub):
  cls = 'folha-cab cm-cab-per' if versao == 'depois' else 'folha-cab'
  return f'''<div class="{cls}">
      <div>
        <h2 id="{hid}">{titulo}</h2>
        <p class="sub">{sub}</p>
      </div>
      <div class="acoes">{periodo(versao)}</div>
    </div>'''

def origem(versao):
  tab = 'hn-tab cm-org-tab' if versao == 'depois' else 'hn-tab'
  cols = ''.join(f'<col style="width:{w}">' for w in ['31%', '11%', '11%', '11%', '17%', '19%'])
  ths = ''.join(f'<th scope="col">{t}</th>' for t in ["Origem", "Contatos", "Propostas", "Contratos", "Viram contrato", "Contratado (valor certo)"])
  return f'''<div class="hn">
  <div class="pt-cab"><div><p class="sobretitulo">Comercial</p><h1>Origem dos contatos</h1><span class="fio" aria-hidden="true"></span></div></div>
  <div class="hn-grade">
    <div class="hn-col">
      <section class="folha" aria-labelledby="t-or" style="overflow:hidden">
        {cab(versao, "t-or", "De onde vêm os clientes", "1 primeiro contato de 25/08 a 22/11/2026. A origem é a que foi marcada no cadastro do cliente.")}
        <div class="legenda" style="padding:0 24px 16px">
          <span><i style="background:var(--vinho)"></i>virou contrato</span>
          <span><i style="background:var(--vinho-4)"></i>recebeu proposta, não fechou</span>
          <span><i style="background:var(--ambar-2)"></i>só o primeiro contato</span>
        </div>
        <table class="{tab}">
          <caption class="sr">Origem dos contatos</caption>
          <colgroup>{cols}</colgroup>
          <thead><tr>{ths}</tr></thead>
          <tbody><tr>
            <td><b>Indicação de cliente</b><div class="cm-org-barra" aria-hidden="true"><div class="tons"><i style="width:100%;background:var(--vinho)"></i><i style="width:0%;background:var(--vinho-4)"></i><i style="width:0%;background:var(--ambar-2)"></i></div></div></td>
            <td data-r="Contatos"><span class="num">1</span></td>
            <td data-r="Propostas"><span class="num">1</span></td>
            <td data-r="Contratos"><span class="num">1</span></td>
            <td data-r="Viram contrato"><span><span class="cm-pct num">100%</span><span class="selo selo-neutro cm-poucos">poucos dados</span></span></td>
            <td data-r="Contratado (valor certo)"><span class="num hn-valor-c">R$&nbsp;2.400,00</span></td>
          </tr></tbody>
        </table>
        <p class="hn-pe">{ico("ajuda")}<span>Com menos de 5 contatos, a porcentagem diz pouco: por isso o selo “poucos dados”. O valor certo soma o fixo, as parcelas e 12 meses de mensalidade; êxito e sucumbência só entram quando viram cobrança.</span></p>
      </section>
    </div>
    <aside class="hn-col" aria-label="Indicações e regras">
      <section class="folha" aria-labelledby="t-qi">
        <div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-qi" style="font-size:20px">Quem mais indicou</h2><p class="sub">Do campo “Quem indicou” do cadastro.</p></div></div>
        <ul class="cm-motivos"><li><span>Mariana Lopes</span><b class="num">1</b></li></ul>
      </section>
      <aside class="cm-oab" aria-label="Regra da OAB">{ico("escudo")}<div><b>Para saber, não para captar.</b> Esta tela só conta de onde vieram os clientes que procuraram o escritório.
        <ul><li>Não há campanha, anúncio nem envio em massa no T3jus.</li><li>A lista de origens é fixa nesta versão e não tem “comprou contatos”.</li><li>Publicidade da advocacia: Provimento 205/2021 da OAB.</li></ul></div></aside>
    </aside>
  </div>
</div>'''

def leg(c, n, t):
  return f'<li><span class="fb-m {c}"></span><b class="num">{n}</b><span>{t}</span></li>'

def funil(versao):
  return f'''<div class="hn">
  <div class="pt-cab"><div><p class="sobretitulo">Comercial</p><h1>Funil</h1><span class="fio" aria-hidden="true"></span></div></div>
  <section class="folha" aria-labelledby="t-cv">
    {cab(versao, "t-cv", "Quanto vira contrato", "Primeiros contatos de 25/08 a 22/11/2026 e o que aconteceu com cada um.")}
    <div class="cm-funil fb">
      <ol class="fb-nums" aria-label="Funil de 25/08 a 22/11/2026">
        <li class="fb-et"><b class="num">1</b><span>primeiro contato</span></li>
        <li class="fb-seta"><span class="fb-p num">100%</span><span class="fb-linha" aria-hidden="true"></span><span class="fb-sr">receberam proposta</span></li>
        <li class="fb-et"><b class="num">1</b><span>recebeu proposta</span></li>
        <li class="fb-seta"><span class="fb-p num">100%</span><span class="fb-linha" aria-hidden="true"></span><span class="fb-sr">fecharam</span></li>
        <li class="fb-et"><b class="num">1</b><span>virou contrato</span></li>
      </ol>
      <div class="fb-onde">
        <h3 class="fb-tit">Onde os 1 pararam</h3>
        <div class="fb-barra" role="img" aria-label="Dos 1: 1 virou contrato."><span class="fb-c" style="flex:1"></span></div>
        <div class="fb-grupos" aria-hidden="true"><span style="flex:1">receberam proposta · 1</span></div>
        <div class="fb-legs">
          <div><p class="fb-g">Receberam proposta</p><ul>{leg("fb-c", 1, "virou contrato")}{leg("fb-a", 0, "proposta em andamento (abaixo)")}{leg("fb-o", 0, "recusaram")}</ul></div>
          <div><p class="fb-g">Saíram sem proposta</p><p class="fb-nada">Ninguém no período. Todo primeiro contato recebeu proposta.</p></div>
        </div>
      </div>
    </div>
  </section>
</div>'''

ITENS = ['Início', 'Conversas', 'Agenda', None, 'Comercial', 'Jurídico', 'Contratos', 'Financeiro']
trilho = ''.join('<p class="grupo">Áreas</p>' if i is None else
  f'<a class="item" href="#"{" aria-current=\"page\"" if i == "Comercial" else ""}>{ico("quad")}{i}</a>' for i in ITENS)

estados = {f'{v}-{t}': (origem(v) if t == 'origem' else funil(v)) for v in ('antes', 'depois') for t in ('origem', 'funil')}
TITULOS = {'origem': 'Origem dos contatos', 'funil': 'Funil'}

doc = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Origem e Funil: período</title>
<style>
{fontes}
/* ===== console.css do sistema, sem mudança ===== */
{console}
/* ===== portal.css do sistema, sem mudança ===== */
{portal}
/* ===== acréscimo proposto (vai para portal.css) ===== */
{proposta}
/* ===== só desta prévia ===== */
html,body{{margin:0}}
.rotulo-previa{{font:500 12px/1.4 Poppins,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5E4A54;margin:0}}
.marca-txt{{font-family:var(--serifa);font-size:28px;color:var(--sal);padding:0 12px 22px}}
</style></head>
<body><div class="co pt co-equipe co-carteira"><div class="app">
<header class="barra-cel"><button class="bb" type="button" aria-label="Menu">{ico("menu")}</button><a class="marca-cel" href="#"><span class="marca-txt" style="font-size:22px;padding:0">T3jus</span><span>Portal</span></a></header>
<aside class="trilho" aria-label="Portal do advogado"><div class="marca-txt">T3jus</div><nav aria-label="Navegação principal">{trilho}</nav></aside>
<div class="palco">
  <header class="topo"><nav class="trilha" aria-label="Você está em"><a href="#">Comercial</a><span>›</span><span id="pag"></span></nav><p class="rotulo-previa" id="rot" style="margin-left:auto"></p></header>
  <main class="conteudo" id="conteudo"></main>
</div></div></div>
<template id="estados">{''.join(f'<template data-e="{k}">{v}</template>' for k, v in estados.items())}</template>
<script>
const p = new URLSearchParams(location.search);
const e = p.get('estado') || 'depois-origem';
const t = document.getElementById('estados').content.querySelector('[data-e="' + e + '"]');
document.getElementById('conteudo').appendChild(t.content.cloneNode(true));
const [v, tela] = e.split('-');
document.getElementById('pag').textContent = {{origem:'Origem dos contatos', funil:'Funil'}}[tela];
document.getElementById('rot').textContent = (v === 'antes' ? 'Antes' : 'Depois (proposta)');
</script></body></html>'''
open(saida + '/origem-periodo.html', 'w', encoding='utf-8').write(doc)
print('ok', len(doc))
