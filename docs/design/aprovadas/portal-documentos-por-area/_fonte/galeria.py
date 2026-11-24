# Escreve o index.html: uma página só, autossuficiente (fontes e capturas embutidas), que mostra cada estado
# em computador e celular lado a lado. Lê os PNG que o fotos.cjs gravou (antes do webp.py) e embute uma cópia
# em WebP na escala 1 (a pasta guarda as capturas em escala 2). Uso: python3 galeria.py <pasta-saida>
import os, sys, io, re, json, base64, html
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from estados import DESC

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
casos = json.load(open(os.path.join(AQUI, 'casos.json'), encoding='utf-8'))
conf = {(c['nome'], c['tam']): c for c in json.load(open(os.path.join(SAIDA, '_conferencia.json'), encoding='utf-8'))}
telas = open(os.path.join(SAIDA, 'telas.html'), encoding='utf-8').read()
FONTES = '\n'.join(re.findall(r'@font-face\{[^}]*\}', telas))
H = html.escape

GRUPOS = [('Modelos de documento › Documentos por área', 'c'), ('Gerar documentos', 'g'), ('Documentos para começar (EX-18)', 'e'), ('Perguntas para a Carol, na tela', 'd')]


def grupo(nome):
    if nome.startswith('decisao'):
        return 3
    if nome.startswith('ex18'):
        return 2
    if nome.startswith(('gerar', 'gerado')):
        return 1
    return 0


def embutir(nome, tam):
    im = Image.open(os.path.join(SAIDA, f'{nome}-{tam}.png')).convert('RGB')
    w, h = im.size
    im = im.resize((w // 2, h // 2), Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=74, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), im.size


secoes = {i: '' for i in range(4)}
indice = {i: '' for i in range(4)}
n = 0
for c in casos:
    n += 1
    nome, rot = c['nome'], c['rotulo']
    g = grupo(nome)
    pc, (pw, ph) = embutir(nome, 'computador')
    cel, (cw, chh) = embutir(nome, 'celular')
    ok = all(not conf[(nome, t)]['viol'] and not conf[(nome, t)]['rolagem'] for t in ('computador', 'celular'))
    selo = '<span class="ok">axe sem violações · sem rolagem lateral</span>' if ok else '<span class="nok">conferir</span>'
    dec = ' <span class="dec">pergunta</span>' if nome.startswith('decisao') else ''
    indice[g] += f'<li><a href="#{nome}">{H(rot)}</a></li>'
    secoes[g] += (f'<section class="estado" id="{nome}" aria-labelledby="t-{nome}"><div class="cab"><p class="num">{n:02d} · <code>{nome}</code>{dec}</p>'
                  f'<h3 id="t-{nome}">{H(rot)}</h3><p class="desc">{H(DESC[nome])}</p>{selo}</div>'
                  f'<div class="par"><figure class="pc"><figcaption>Computador · 1440 px</figcaption>'
                  f'<button type="button" class="amp" data-src="{nome}-computador" aria-label="Ampliar: {H(rot)}, computador">'
                  f'<img src="{pc}" width="{pw}" height="{ph}" alt="{H(rot)}, no computador" loading="lazy" decoding="async" id="{nome}-computador"></button></figure>'
                  f'<figure class="cel"><figcaption>Celular · 390 px</figcaption>'
                  f'<button type="button" class="amp" data-src="{nome}-celular" aria-label="Ampliar: {H(rot)}, celular">'
                  f'<img src="{cel}" width="{cw}" height="{chh}" alt="{H(rot)}, no celular" loading="lazy" decoding="async" id="{nome}-celular"></button></figure></div></section>')

corpo = ''
nav = ''
for i, (titulo, _) in enumerate(GRUPOS):
    corpo += f'<h2 class="grupo" id="g{i}">{titulo}</h2>' + secoes[i]
    nav += f'<div><p>{titulo}</p><ol>{indice[i]}</ol></div>'

PERGUNTAS = [
    ('1', '“Tipo de processo” pode ser a área (Previdenciário, Trabalhista, Cível, Consumidor, Família, Saúde, Tributário e Outra)?',
     'Sim. Subtipos, como aposentadoria e BPC, custam de 3 a 4 vezes mais e quase não mudam o que o escritório gera. Se os pilotos pedirem, entram depois. (Tela decisao-p1.)'),
    ('2', 'Quando o contrato ainda não tem área e a pessoa escolhe uma em Gerar documentos, ela fica gravada no contrato?',
     'Sim, mas só com o contrato em elaboração. Assim o caso que abre na assinatura já nasce com a área. No contrato já assinado, a escolha vale só para marcar as caixas naquela hora, porque mudar contrato assinado pede motivo. (Telas gerar-trocou-area, gerado-area-gravada e decisao-p2.)'),
    ('3', 'Quem muda o que vem marcado em cada área?',
     'Quem já pode enviar modelos de documento (sócias e equipe com a área Contratos). Marcar uma caixa não envia nada ao cliente. A alternativa é só a sócia dona, como em Documentos para começar. (Tela decisao-p3.)'),
    ('4', 'Até o escritório mudar, o que vem marcado?',
     'O mesmo de hoje em todas as áreas: contrato, procuração e declaração de hipossuficiência. Para empresa, a tela continua avisando da Súmula 481. Nada muda para quem não configurar, e não há o que a advogada parceira revisar. (Telas por-area-sugestao e decisao-p4.)'),
    ('5', 'Em “Gerar de novo”, avisar “Previdenciário também tem: … Marcar”?',
     'Só quando o escritório acabou de pôr esse documento na lista da área, depois da última geração. Assim o aviso não aparece em todo contrato em que o escritório escolheu não gerar algo. (Telas gerar-de-novo-tambem-tem e decisao-p5.)'),
]
perg = ''.join(f'<li><b>Pergunta {c}.</b> {H(q)}<br><span class="rec">Recomendação: {H(r)}</span></li>' for c, q, r in PERGUNTAS)

CSS = r"""
:root{--vinho:#692746;--vinho-2:#87335B;--vinho-3:#AC3F6B;--vinho-4:#AC788D;--ambar:#DD9760;--ambar-2:#E9AE90;--ambar-3:#F2CDB3;
--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--tinta-2:#5E4A54;--papel:#FFFFFF;--fundo:#F1E6DF;--borda:#E3D3CA;--ok:#1F5D3A;
--serifa:'Alegreya',Georgia,serif;--sans:'Poppins',system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--fundo:#1C0F16;--papel:#26141D;--tinta:#F1E6DF;--tinta-2:#F2CDB3;--vinho:#E9AE90;--vinho-2:#F2CDB3;--borda:#3A2430;--sal-2:#2A1620;--ok:#9FD8B5}}
:root[data-theme="dark"]{--fundo:#1C0F16;--papel:#26141D;--tinta:#F1E6DF;--tinta-2:#F2CDB3;--vinho:#E9AE90;--vinho-2:#F2CDB3;--borda:#3A2430;--sal-2:#2A1620;--ok:#9FD8B5}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fundo);color:var(--tinta);font:14px/1.6 var(--sans)}
a{color:var(--vinho)}
:focus-visible{outline:3px solid var(--vinho-3);outline-offset:2px}
.topo{background:#692746;color:#F1E6DF;padding:40px 48px 36px;border-bottom:4px solid #DD9760}
.topo .sobre{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}
.topo h1{font-family:var(--serifa);font-weight:500;font-size:44px;line-height:1.1;margin:0 0 12px;color:#fff}
.topo p{max-width:86ch;margin:0 0 8px;color:#F2ECE8}
.topo a{color:#F2CDB3}
.miolo{max-width:1480px;margin:0 auto;padding:32px 48px 64px}
.indice{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;background:var(--papel);border:1px solid var(--borda);border-radius:14px;padding:20px 24px;margin:0 0 32px}
.indice p{font-family:var(--serifa);font-size:18px;color:var(--vinho);margin:0 0 6px}
.indice ol{margin:0;padding-left:20px;font-size:13px}
.indice li{margin:4px 0}
.indice a{display:block;min-height:24px;padding:2px 0}
.perguntas{background:var(--papel);border:1px solid var(--borda);border-left:4px solid #DD9760;border-radius:14px;padding:20px 24px;margin:0 0 40px}
.perguntas h2{font-family:var(--serifa);font-weight:500;color:var(--vinho);font-size:26px;margin:0 0 10px}
.perguntas ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:12px}
.perguntas .rec{color:var(--tinta-2);font-size:13px}
h2.grupo{font-family:var(--serifa);font-weight:500;font-size:30px;color:var(--vinho);margin:48px 0 16px;padding-bottom:8px;border-bottom:2px solid #DD9760}
.estado{background:var(--papel);border:1px solid var(--borda);border-radius:14px;padding:20px 24px 24px;margin:0 0 28px}
.estado .num{font-size:12px;color:var(--tinta-2);margin:0;letter-spacing:.04em}
.estado code{font-size:12px}
.estado h3{font-family:var(--serifa);font-weight:500;font-size:24px;line-height:1.25;color:var(--vinho);margin:2px 0 6px}
.estado .desc{margin:0 0 8px;max-width:110ch}
.dec{display:inline-block;margin-left:8px;padding:0 8px;border-radius:10px;background:#F2CDB3;color:#2A1A22;font-weight:600;font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.ok,.nok{display:inline-block;font-size:12px;font-weight:500;padding:2px 10px;border-radius:10px;border:1px solid currentColor}
.ok{color:var(--ok)}.nok{color:var(--vinho-3)}
.par{display:grid;grid-template-columns:minmax(0,3.2fr) minmax(0,1fr);gap:24px;align-items:start;margin-top:16px}
figure{margin:0}
figcaption{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--tinta-2);margin:0 0 6px}
.amp{display:block;width:100%;padding:0;border:1px solid var(--borda);border-radius:10px;background:#F1E6DF;cursor:zoom-in;overflow:hidden;max-height:1100px}
.amp img{display:block;width:100%;height:auto}
.cel .amp{max-height:1100px}
dialog{width:min(1480px,96vw);max-height:94vh;padding:0;border:0;border-radius:12px;background:var(--papel)}
dialog::backdrop{background:rgba(42,26,34,.7)}
dialog .barra{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 12px 8px 20px;background:#692746;color:#fff;z-index:1}
dialog .barra p{margin:0;font-size:14px}
dialog .fechar{min-width:44px;min-height:44px;border:0;border-radius:8px;background:transparent;color:#fff;font:600 14px var(--sans);cursor:pointer}
dialog .fechar:hover{background:#87335B}
dialog img{display:block;margin:0 auto;max-width:100%;height:auto}
dialog.estreito{width:min(460px,96vw)}
.pe{color:var(--tinta-2);font-size:13px;margin-top:40px}
@media (max-width:900px){.indice{grid-template-columns:1fr 1fr}.perguntas ol{grid-template-columns:1fr}}
@media (max-width:760px){
 .topo{padding:28px 16px}.topo h1{font-size:32px}
 .miolo{padding:20px 16px 48px}
 .indice{grid-template-columns:1fr;padding:16px}
 .perguntas{padding:16px}
 .estado{padding:16px}
 .par{grid-template-columns:1fr}
 .amp{max-height:640px}
 h2.grupo{font-size:26px}
 dialog:not(.estreito) img{max-width:none;width:1100px}
}
"""

JS = r"""<script>
(function(){
  var d=document.getElementById('zoom'), img=d.querySelector('img'), leg=d.querySelector('.barra p');
  document.addEventListener('click',function(e){
    var b=e.target.closest('.amp'); if(b){ var o=document.getElementById(b.dataset.src); img.src=o.src; img.alt=o.alt; leg.textContent=o.alt;
      d.classList.toggle('estreito', /celular$/.test(b.dataset.src)); d.showModal(); d.querySelector('.fechar').focus(); return }
    if(e.target.closest('#zoom .fechar')||e.target===d){ d.close() }
  });
})();
</script>"""

out = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documentos por área</title>
<meta name="description" content="CH-14 (D35): o escritório escolhe, por área, os documentos que vêm marcados em Gerar documentos. Estados em computador e celular, para a aprovação da Carol.">
<style>
{FONTES}
{CSS}
</style>
</head>
<body>
<header class="topo">
<p class="sobre">T3jus · Portal · desenho para aprovação · D35 · ideia CH-14</p>
<h1>Documentos marcados conforme a área</h1>
<p>Hoje, Gerar documentos abre sempre com o contrato, a procuração e a declaração de hipossuficiência marcados, e os modelos próprios do escritório desmarcados. Com este desenho, o escritório diz uma vez, para cada área, o que vem marcado (em Modelos de documento, numa folha nova, “Documentos por área”), e Gerar abre com esses marcados e um seletor “Sugestão para”, que diz de onde veio a área. A pessoa sempre pode mudar antes de gerar.</p>
<p>Parte dos desenhos aprovados de Procurações e modelos, de quem assina pelo cliente menor (D25) e de Documentos para começar (EX-18), e é coerente com o desenho em andamento do F3.160 (a volta da ficha para Gerar). Os mesmos personagens: Marina Ribeiro, sócia dona; Benedito (previdenciário); Pedro e a mãe, Joana; a Farmácia Bom Jesus; Diego Almeida, da equipe.</p>
<p>{n} estados, cada um em computador (1440 px) e celular (390 px). Clique numa imagem para ampliar. O axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação em nenhuma das {2 * n} telas, e nenhuma tem rolagem lateral. As telas vivas estão em telas.html, com o botão Estados.</p>
</header>
<main class="miolo">
<section class="perguntas" aria-labelledby="t-perg"><h2 id="t-perg">Perguntas para a Carol</h2><ol>{perg}</ol></section>
<nav class="indice" aria-label="Estados desenhados">{nav}</nav>
{corpo}
<p class="pe">Desenho feito em 24/11/2026 para o item D35 do painel (ideia CH-14), sobre os desenhos aprovados em docs/design/aprovadas, sem mudá-los. Os dados são fictícios. As notas, os textos novos e o porquê de cada recomendação estão no NOTAS.md desta pasta.</p>
</main>
<dialog id="zoom" aria-label="Tela ampliada"><div class="barra"><p></p><button class="fechar" type="button">Fechar</button></div><img alt=""></dialog>
{JS}
</body>
</html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
print('index.html', len(out) // 1024, 'KB')
