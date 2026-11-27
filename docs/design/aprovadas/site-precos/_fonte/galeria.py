# Monta o index.html: a galeria das capturas, com caminhos relativos, para abrir no celular.
# Uso: python3 galeria.py <pasta-png> <pasta-do-desenho>
import sys, os, json
png, sai = sys.argv[1:3]
tam = json.load(open(os.path.join(png, '_tamanhos.json')))
G = [
    ('hoje', 'A página inteira, como vai ao ar primeiro', 'Estado de hoje: sem formulário (os botões abrem o e-mail), sem o teste de 7 dias, sem o desconto de entrada e com o WhatsApp marcado como Em preparação.'),
    ('abertura-planos', 'A abertura e os três planos de perto', 'Os três cartões iguais, sem destaque, com o fato grande (preço e pessoas incluídas) e, menor, para quantas pessoas cada um sai mais em conta.'),
    ('incluido', 'O que todo plano inclui', 'Os mesmos itens e selos do Início: o que já está no T3jus e o que está a caminho, no mesmo plano. Nada sobre backup.'),
    ('tabela', 'Quanto fica para cada tamanho de equipe', 'A tabela fixa no lugar da calculadora, sempre visível e sem script, com a frase do desconto abaixo; a indicação usa sempre o preço cheio.'),
    ('pagamento', 'Como você paga e o que pode mudar', 'Formas de pagamento de hoje, condições (valor final, troca de plano, reajuste pelo IPCA, sem fidelidade) e o custo das mensagens da Meta.'),
    ('perguntas', 'As seis perguntas frequentes, abertas', 'As respostas que a revisão pediu, inclusive a correção sobre a assistente atender o primeiro contato.'),
    ('chamada', 'A chamada final de hoje', 'O campo âmbar com o selo inteiro: o e-mail é a ação principal enquanto o formulário está fechado.'),
    ('rolagem', 'No meio da rolagem, com movimento', 'O topo já encolhido e a barra âmbar da leitura; as seções sobem ao aparecer, e os preços nunca ficam escondidos.'),
    ('completo', 'A página inteira, com tudo ligado', 'O alvo: teste de 7 dias, desconto de entrada, formulário, boleto do Inter e a fatura com as duas linhas da implantação.'),
    ('chaves', 'Os blocos que dependem de uma chave', 'Cada bloco ligado e desligado: teste, desconto, implantação com e sem data, formas de pagamento, cartão com e sem formulário e a chamada final.'),
    ('menu', 'O item Preços no menu', 'No computador: hoje, 1440 px e 1021 px (cabe numa linha) e de 761 a 1020 px. No celular: o menu aberto com Planos e preços.'),
    ('chamadas', 'As chamadas que mudam nas outras páginas', 'Antes e depois no Início, em Para quem é, em Como funciona e em Demonstração, com o texto novo marcado em âmbar claro.'),
]
fig = []
for chave, tit, frase in G:
    par = []
    for t, rot in (('computador', 'Computador, 1440 px'), ('celular', 'Celular, 390 px')):
        n = f'precos-{chave}-{t}'
        d = tam[n]
        esc = '' if d['escala'] == 2 else f' (reduzida para caber no WebP)'
        par.append(f'<figure class="{t}"><a href="{n}.webp"><img src="{n}.webp" width="{d["largura"]}" height="{d["altura"]}" loading="lazy" alt="{tit}, {rot.lower()}."></a><figcaption>{rot}{esc}</figcaption></figure>')
    fig.append(f'<section><div class="m"><h2>{tit}</h2><p class="lede">{frase}</p><div class="duas">{"".join(par)}</div></div></section>')
html = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Planos e preços, desenho</title>
<link rel="icon" href="marca/icone-app.svg" type="image/svg+xml">
<style>
@font-face{{font-family:Alegreya;font-weight:500;src:url(fontes/alegreya-500.woff2) format('woff2')}}
@font-face{{font-family:Alegreya;font-style:italic;font-weight:500;src:url(fontes/alegreya-500-italico.woff2) format('woff2')}}
@font-face{{font-family:Poppins;font-weight:400;src:url(fontes/poppins-400.woff2) format('woff2')}}
@font-face{{font-family:Poppins;font-weight:600;src:url(fontes/poppins-600.woff2) format('woff2')}}
:root{{--vinho:#692746;--vinho-escuro:#4F1D35;--ambar-2:#E9AE90;--ambar-3:#F2CDB3;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--sal);color:var(--tinta);font:16px/1.6 Poppins,system-ui,sans-serif}}
h1,h2{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0;line-height:1.1;color:var(--vinho-escuro)}}
a{{color:var(--vinho)}}
:focus-visible{{outline:3px solid #AC3F6B;outline-offset:3px;border-radius:6px}}
.topo{{background:var(--vinho-escuro);color:var(--sal);padding:48px 0 56px}}
.topo :focus-visible{{outline-color:var(--ambar-3)}}
.m{{max-width:1200px;margin:0 auto;padding:0 16px}}
.topo h1{{color:#fff;font-size:clamp(34px,5vw,56px);margin-top:14px}}
.topo h1 em{{color:var(--ambar-3)}}
.sob{{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--ambar-2)}}
.topo p{{max-width:760px;margin:18px 0 0;font-size:17px}}
.acoes{{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}}
.btn{{display:inline-flex;align-items:center;min-height:48px;padding:0 20px;border-radius:12px;background:var(--ambar-3);color:var(--vinho-escuro);font-weight:600;text-decoration:none}}
.btn.sec{{background:transparent;color:var(--sal);box-shadow:inset 0 0 0 1.5px var(--ambar-2)}}
section{{padding:48px 0 0}}
section:last-of-type{{padding-bottom:64px}}
h2{{font-size:clamp(26px,3.2vw,38px)}}
.lede{{margin:10px 0 0;color:var(--tinta-2);max-width:760px}}
.duas{{display:grid;grid-template-columns:2.6fr 1fr;gap:24px;align-items:start;margin-top:20px}}
figure{{margin:0}}
figure a{{display:block;max-height:1100px;overflow:auto;border-radius:14px;box-shadow:0 24px 50px -28px rgba(42,26,34,.5);background:#fff}}
figure img{{display:block;width:100%;height:auto}}
figcaption{{margin-top:8px;font-size:14px;color:var(--tinta-2)}}
@media (max-width:760px){{.duas{{grid-template-columns:1fr}}figure a{{max-height:760px}}}}
</style>
</head>
<body>
<header class="topo"><div class="m">
  <span class="sob">Site comercial · Planos e preços · desenho para aprovar</span>
  <h1>Quanto custa, o que está incluído e <em>o que pode mudar o valor.</em></h1>
  <p>Página nova em t3jus.pro/precos, montada com o topo, o rodapé, as fontes e os estilos do site no ar, seguindo a revisão do plano. Nada mudou no site nem no repositório. As perguntas que sobram para você estão em NOTAS.md.</p>
  <div class="acoes"><a class="btn" href="precos.html">Abrir a página de hoje</a><a class="btn sec" href="precos-completo.html">Abrir com tudo ligado</a></div>
</div></header>
<main>
{"".join(fig)}
</main>
</body>
</html>
'''
open(os.path.join(sai, 'index.html'), 'w', encoding='utf-8').write(html)
print('index.html ok')
