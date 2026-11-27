# Monta as páginas do desenho de "Planos e preços" a partir das peças do site no ar:
# site.css e paginas.css (sem mudança), os ícones de Icones.astro (sem mudança), o topo e o rodapé
# de Topo.astro e Rodape.astro (com o item novo "Preços") e o script do topo (topo.ts).
# O que é só desta página fica em precos.css. As chaves de config.ts viram o dicionário CHAVES.
# Uso: python3 montar.py <pasta-saida>
import sys, os, re, json
from urllib.parse import quote

AQUI = os.path.dirname(os.path.abspath(__file__))
SAI = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, '..'))
SITE = os.environ.get('SITE_DIR', '/home/user/t3jus/sistema/apps/site')
EXT = 'https://t3jus.pro'   # os outros links levam ao site no ar, que não muda
CONTATO = 'contato@t3jus.pro'


def ler(p):
    return open(p, encoding='utf-8').read()


CSS = '\n'.join([ler(f'{SITE}/src/styles/site.css'), ler(f'{SITE}/src/styles/paginas.css'), ler(os.path.join(AQUI, 'precos.css'))])
CSS = CSS.replace('url(/fontes/', 'url(fontes/')
ICONES = re.sub(r'^---.*?---\s*', '', ler(f'{SITE}/src/components/Icones.astro'), flags=re.S).strip()


def ico(n, cls='ico'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{n}"/></svg>'


SELO = {
    'pronto': f'<span class="st st-pronto">{ico("check")}No T3jus</span>',
    'prep': f'<span class="st st-prep">{ico("relogio")}Em preparação</span>',
    'plan': f'<span class="st st-plan">{ico("tracejado")}Planejado</span>',
}

# ---------- chaves (no código: src/config.ts e src/precos.ts) ----------
HOJE = dict(form=False, teste=False, desconto=False, inter=False, fatura2=False, data_impl=None)
COMPLETO = dict(form=True, teste=True, desconto=True, inter=True, fatura2=True, data_impl=None)

PLANOS = [
    dict(id='essencial', nome='Essencial', artigo='o', preco=299, pessoas=3, conta='1 a 5 pessoas'),
    dict(id='escritorio', nome='Escritório', artigo='o', preco=499, pessoas=6, conta='6 a 9 pessoas'),
    dict(id='banca', nome='Banca', artigo='a', preco=749, pessoas=10, conta='10 pessoas ou mais'),
]
MAIS = 69


def brl(v):
    s = f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return s[:-3] if s.endswith(',00') else s


def mais_conta(n):
    """Plano mais em conta pelo preço cheio (o desconto nunca muda a indicação)."""
    melhor = None
    for p in PLANOS:
        v = p['preco'] + max(0, n - p['pessoas']) * MAIS
        if melhor is None or v < melhor[1]:
            melhor = (p, v)
    return melhor


# ---------- topo e rodapé (Topo.astro e Rodape.astro, com "Preços") ----------
def topo(com_precos=True, atual='/precos'):
    cur = ' aria-current="page"' if atual == '/precos' else ''
    p_desk = f'<a href="precos.html"{cur}>Preços</a>' if com_precos else ''
    p_cel = f'<a href="precos.html"{cur}>Planos e preços</a>' if com_precos else ''
    return f'''<header class="topo"><span class="progresso" aria-hidden="true"></span><div class="miolo">
  <a class="marca" href="{EXT}/"><img src="marca/logo-completo-sobre-vinho.svg" width="1583" height="512" alt="T3jus, Sistema jurídico, página inicial"></a>
  <nav class="menu" aria-label="Principal"><a href="{EXT}/#por-dentro">O sistema</a><a href="{EXT}/como-funciona">Como funciona</a><a href="{EXT}/para-quem-e">Para quem é</a>{p_desk}<a class="entrar" href="https://app.t3jus.pro">{ico("sair")}Entrar</a><a class="btn btn-claro" href="{EXT}/demonstracao">Pedir demonstração</a></nav>
  <details class="menu-cel"><summary aria-label="Abrir o menu">{ico("menu")}Menu</summary><nav aria-label="Principal"><a href="{EXT}/">Início</a><a href="{EXT}/#por-dentro">O sistema</a><a href="{EXT}/como-funciona">Como funciona</a><a href="{EXT}/para-quem-e">Para quem é</a>{p_cel}<a href="https://app.t3jus.pro">{ico("sair")}Entrar no T3jus</a><a class="btn btn-pri" href="{EXT}/demonstracao">Pedir demonstração</a></nav></details>
</div></header>'''


def rodape():
    cores = ['#692746', '#87335B', '#AC3F6B', '#AC788D', '#DD9760', '#E9AE90', '#F2CDB3', '#F2ECE8', '#F1E6DF']
    fita = ''.join(f'<i style="background:{c}"></i>' for c in cores)
    return f'''<footer class="rodape"><div class="fita9" aria-hidden="true">{fita}</div><div class="miolo">
  <div class="grade-r">
    <div><img src="marca/logo-completo-sobre-vinho.svg" width="1583" height="512" alt="T3jus, Sistema jurídico" loading="lazy"><p class="sobre-t">Gestão comercial e financeira ligada aos casos, para escritórios de advocacia.</p></div>
    <div><h2>O T3jus</h2><ul><li><a href="{EXT}/#por-dentro">O sistema</a></li><li><a href="{EXT}/como-funciona">Como funciona</a></li><li><a href="{EXT}/para-quem-e">Para quem é</a></li><li><a href="precos.html">Planos e preços</a></li><li><a href="{EXT}/demonstracao">Pedir demonstração</a></li></ul></div>
    <div><h2>Já é cliente</h2><ul><li><a href="https://app.t3jus.pro">{ico("sair")}Entrar no T3jus</a></li></ul></div>
    <div><h2>Contato</h2><ul><li><a href="mailto:{CONTATO}">{ico("envelope")}{CONTATO}</a></li><li><span>Política de privacidade</span><span class="depois">em preparação</span></li></ul></div>
  </div>
  <div class="pe"><span>© 2026 T3jus</span><span>Servidores no Brasil · São Paulo</span><span class="empresa">[Razão social do T3jus] · CNPJ [a informar] · [endereço completo]</span></div>
</div></footer>'''


SCRIPT = r'''<script>
// Topo (como src/scripts/topo.ts) e entrada das seções (como a reserva de src/scripts/movimento.ts).
(function(){
var raiz=document.documentElement,menos=matchMedia("(prefers-reduced-motion: reduce)"),barra=document.querySelector(".topo .progresso");
if(!raiz.classList.contains("sd")){var pedido=false;var quadro=function(){pedido=false;if(menos.matches){raiz.classList.remove("compacto");if(barra)barra.style.transform="";return}var y=scrollY,t=raiz.scrollHeight-innerHeight;if(barra)barra.style.transform="scaleX("+(t>0?Math.min(1,y/t):0).toFixed(4)+")";raiz.classList.toggle("compacto",y>60)};var pedir=function(){if(!pedido){pedido=true;requestAnimationFrame(quadro)}};addEventListener("scroll",pedir,{passive:true});addEventListener("resize",pedir);quadro()}
if(!raiz.classList.contains("sd")&&!menos.matches&&"IntersectionObserver" in window){raiz.classList.add("io");var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("visivel");io.unobserve(e.target)}})},{rootMargin:"0px 0px -8% 0px",threshold:.08});document.querySelectorAll("[data-revelar]").forEach(function(el){io.observe(el)})}
var selo=document.querySelector(".selo-cham");
if(selo&&raiz.classList.contains("sd")&&!menos.matches&&"IntersectionObserver" in window){var is=new IntersectionObserver(function(es){if(es[0].isIntersecting){selo.classList.add("gira");is.disconnect()}},{threshold:.6});is.observe(selo)}
})();
</script>'''


def pagina(titulo, descricao, corpo, dados=None, com_precos=True):
    ld = f'<script type="application/ld+json">{json.dumps(dados, ensure_ascii=False)}</script>' if dados else ''
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{descricao}">
<meta name="theme-color" content="#692746">
<link rel="canonical" href="{EXT}/precos">
<link rel="icon" href="marca/icone-app.svg" type="image/svg+xml">
<script>(function(d){{d.classList.add("js");try{{if(matchMedia("(prefers-reduced-motion: no-preference)").matches&&window.CSS&&CSS.supports&&CSS.supports("animation-timeline: view()"))d.classList.add("sd")}}catch(e){{}}}})(document.documentElement);</script>
{ld}
<style>
{CSS}
</style>
</head>
<body>
{ICONES}
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
{topo(com_precos)}
{corpo.replace('R$ ', 'R$&nbsp;')}
{rodape()}
{SCRIPT}
</body>
</html>
'''


# ---------- seções ----------
def abertura(k):
    fatos = []
    if k['teste']:
        fatos.append(('#teste', 'relogio', '7 dias para usar sem pagar'))
    fatos.append(('#implantacao', 'pessoas', 'Implantação assistida grátis na oferta de lançamento'))
    fatos.append(('#pagamento', 'pix', 'Pix, boleto ou carnê com as 12 mensalidades' if k['inter'] else 'Pix ou carnê com as 12 mensalidades'))
    if not k['teste']:
        fatos.append(('#por-pessoas', 'moeda', f'Pessoa a mais: R$ {MAIS} por mês'))
    lis = ''.join(f'<li><a href="{h}">{ico(i)}{t}</a></li>' for h, i, t in fatos)
    return f'''<div class="abertura interna"><div class="lado" aria-hidden="true"></div>{ico("coluna", "ico estatua")}
  <div class="miolo"><div id="conteudo" class="cab-int precos-cab sobre-vinho"><nav class="trilha-int" aria-label="Você está em"><a href="{EXT}/">Início</a><span aria-hidden="true">/</span><span aria-current="page">Planos e preços</span></nav>
  <span class="sobretitulo">Planos e preços</span><h1>Todas as áreas em todos os planos. <i>Muda só o tamanho da equipe.</i></h1><span class="fio" aria-hidden="true"></span><p class="lede">Você escolhe pelo número de pessoas que usam o T3jus. Os valores são por mês, e cada um é o valor final da fatura, sem nada somado.</p>
  <ul class="fatos-ab" aria-label="Em resumo">{lis}</ul></div></div>
</div>'''


def cartao(p, k):
    assunto = quote(f'Quero o plano {p["nome"]}')
    rot = f'Quero {p["artigo"]} {p["nome"]}'
    if k['form']:
        botao = f'<a class="btn btn-pri" href="{EXT}/demonstracao?plano={p["id"]}">{rot}{ico("seta")}</a>'
        escreva = ''
    else:
        botao = f'<a class="btn btn-pri" href="mailto:{CONTATO}?subject={assunto}">{ico("envelope")}{rot}<span class="sr"> por e-mail</span></a>'
        escreva = f'<p class="escreva">ou escreva para <span>{CONTATO}</span></p>'
    return f'''<article class="plano" aria-labelledby="pl-{p["id"]}">
      <h3 id="pl-{p["id"]}">{p["nome"]}</h3><span class="fio" aria-hidden="true"></span>
      <p class="valor"><span class="rs">R$</span><b>{p["preco"]}</b><span class="mes">por mês</span></p>
      <p class="incl">{ico("pessoas")}{p["pessoas"]} pessoas incluídas</p>
      <p class="mais-conta">Mais em conta para equipes de <b>{p["conta"]}</b>.</p>
      <p class="extra">Pessoa a mais: R$ {MAIS} por mês cada.</p>
      <div class="acao">{botao}{escreva}</div>
    </article>'''


def planos(k):
    cards = '\n    '.join(cartao(p, k) for p in PLANOS)
    resp = '' if k['form'] else ' Por enquanto, o contato é por e-mail. Respondemos em até 1 dia útil.'
    return f'''<section class="planos-sec" aria-labelledby="t-planos"><div class="miolo">
  <h2 id="t-planos" class="sr">Os planos</h2>
  <div class="planos">
    {cards}
  </div>
  <div class="planos-pe" data-revelar><p><b>Todos os planos têm as mesmas áreas e o mesmo suporte da nossa equipe.</b> A diferença é o número de pessoas.{resp}</p><a class="link-seta" href="#incluido">Ver tudo o que está incluído{ico("seta")}</a></div>
</div></section>'''


def incluido(k, cls):
    itens = [
        ('inicio', 'Todas as áreas do Portal', 'Início, Clientes, Agenda, Comercial, Contratos, Financeiro e Jurídico.'),
        ('pessoas', 'Áreas liberadas por pessoa', 'O sócio dono marca o que cada um vê.'),
        ('doc', 'Documentos no timbrado', 'Proposta, contrato, procuração e declaração, em Word e PDF.'),
        ('pena', 'Petições a partir de modelos', 'Os modelos do escritório preenchidos com o cliente e o caso, para revisar.'),
        ('carne', 'Carnê com o Pix do escritório', 'E o recibo de cada pagamento, em PDF.'),
        ('repasse', 'Repasses, caixa e relatórios', 'O mês do escritório separado do dinheiro de terceiros.'),
        ('baixar', 'Importar de planilha', 'Clientes e contratos que o escritório já tem, com a nossa ajuda.'),
        ('servidor', 'Servidores no Brasil', 'Em São Paulo, com cada escritório separado.'),
        ('escudo', 'Os dados são seus', 'O sócio dono exporta tudo do escritório quando quiser.'),
    ]
    lis = ''.join(f'<li style="--i:{i}"><span class="ic">{ico(n)}</span><span><b>{b}</b><span>{s}</span></span></li>' for i, (n, b, s) in enumerate(itens))
    return f'''<section class="secao {cls}" id="incluido" aria-labelledby="t-incluido"><div class="miolo">
  <div class="sec-cab" data-revelar><span class="sobretitulo">Em todos os planos</span><h2 id="t-incluido">O mesmo T3jus, do Essencial à Banca.</h2><span class="fio" aria-hidden="true"></span></div>
  <ul class="legenda-p" aria-label="O que cada situação quer dizer" data-revelar>
    <li>{SELO["pronto"]}construído e testado</li>
    <li>{SELO["prep"]}construído; falta um passo de fora</li>
    <li>{SELO["plan"]}ainda não existe, sem data</li>
  </ul>
  <div class="inclui" data-revelar><h3>Já no T3jus {SELO["pronto"]}</h3><ul class="grade-incl">{lis}</ul></div>
  <div class="prep-p" data-revelar><h3>A caminho, no mesmo plano {SELO["prep"]}</h3><ul>
    <li><b>Atendimento pelo WhatsApp do escritório, com a assistente virtual</b><p>A tela está pronta e a assistente está testada. <strong>Falta:</strong> a ligação oficial com a Meta, para o número do escritório funcionar. Quando ficar pronta, entra no seu plano sem mudar o preço.</p></li>
    <li><b>Trazer os dados do Astrea e do ADVBOX</b><p>Clientes, processos e o financeiro antigo. <strong>Falta:</strong> conferir com os arquivos reais de um escritório piloto.</p></li>
  </ul></div>
  <p class="incl-pe">O que ainda é planejado está no Início, em <a href="{EXT}/#t-existe">O que tem no T3jus</a>.</p>
</div></section>'''


def tabela(k, cls):
    linhas = []
    faixas = [(1, 3)] + [(n, n) for n in range(4, 14)]
    ant = None
    for i, (a, b) in enumerate(faixas):
        p, v = mais_conta(b)
        extra = max(0, b - p['pessoas'])
        quem = f'{a} a {b}' if a != b else str(a)
        plano = f'<b>{p["nome"]}</b>' + (f' <span>+ {extra} {"pessoa" if extra == 1 else "pessoas"}</span>' if extra else '')
        vira = ' class="vira"' if ant and ant != p['id'] else ''
        ant = p['id']
        linhas.append(f'<tr{vira} style="--i:{i}"><th scope="row">{quem}</th><td class="p">{plano}</td><td class="v">R$ {brl(v)}</td></tr>')
    desc = ''
    if k['desconto']:
        desc = ('<p class="desc-t"><b>Nos 3 primeiros meses, o plano sai mais barato.</b> São 20% para escritório novo e 30% para quem usa hoje outro sistema jurídico pago: o Escritório, por exemplo, fica em R$ 399,20 ou R$ 349,30. '
                'O desconto vale sobre o plano, não sobre as pessoas a mais, e a tabela mostra sempre o preço cheio. <a href="#desconto">Ver o desconto de entrada</a>.</p>')
    return f'''<section class="secao {cls}" id="por-pessoas" aria-labelledby="t-pessoas"><div class="miolo tabela-grade">
  <div data-revelar><div class="sec-cab"><span class="sobretitulo">Para a sua equipe</span><h2 id="t-pessoas">Quanto fica para a sua equipe.</h2><span class="fio" aria-hidden="true"></span><p class="lede">Conte todas as pessoas que vão entrar no T3jus, inclusive estagiários e secretaria. Os clientes do escritório não contam.</p></div>
    <p class="nota-i">{ico("fatura")}<span><b>A fatura segue o plano que você contratou.</b> Se a equipe crescer, você pode pedir a troca de plano. Com 6 pessoas no Essencial, por exemplo, a fatura é de R$ 506 até a troca para o Escritório, que sai R$ 499.</span></p></div>
  <div class="folha-t"><table class="t-pessoas"><caption>Preço por mês, conforme o número de pessoas, com o plano mais em conta.</caption>
    <thead><tr><th scope="col">Pessoas</th><th scope="col">Plano mais em conta</th><th scope="col">Por mês</th></tr></thead>
    <tbody>{"".join(linhas)}</tbody></table><p class="desc-t" style="border-top:0;margin-top:6px;padding-top:0">Acima de 13 pessoas, some R$ {MAIS} por mês a cada pessoa a mais.</p>{desc}</div>
</div></section>'''


def teste(k, cls):
    if not k['teste']:
        return ''
    return f'''<section class="secao {cls}" id="teste" aria-labelledby="t-teste"><div class="miolo">
  <div class="sec-cab" data-revelar><span class="sobretitulo">Para experimentar</span><h2 id="t-teste">Use o T3jus por 7 dias antes de assinar.</h2><span class="fio" aria-hidden="true"></span></div>
  <ol class="passos-t" data-revelar>
    <li><span class="disco" aria-hidden="true">1</span><h3>Combinamos o começo</h3><p>A nossa equipe cadastra o escritório e manda o convite ao sócio.</p></li>
    <li><span class="disco" aria-hidden="true">2</span><h3>Os 7 dias contam do primeiro acesso</h3><p>Nenhuma fatura sai nesse prazo. Ninguém pede cartão.</p></li>
    <li><span class="disco" aria-hidden="true">3</span><h3>Você decide</h3><p>Se assinar, a primeira mensalidade vence no mês seguinte ao fim do teste. Se não assinar, a partir do 8º dia o Portal fica só para consulta: você vê e baixa tudo, mas não cria nem muda nada.</p></li>
  </ol>
  <p class="nota-pe" data-revelar>Sem assinatura, o Portal fica só para consulta. Quando a nossa equipe encerrar o teste, você tem 30 dias para baixar os dados. Depois, os dados ficam guardados por 12 meses e são apagados, como dizem os <a href="{EXT}/termos">Termos de uso</a>.</p>
</div></section>'''


def valor_impl(k):
    if k['data_impl']:
        cond1 = f'Grátis para escritórios que fizerem o primeiro acesso até {k["data_impl"]}.'
    else:
        cond1 = 'Grátis na oferta de lançamento, para escritórios que fizerem o primeiro acesso nos 6 primeiros meses do T3jus.'
    conds = [cond1, 'Depois da oferta, o valor é cobrado à vista na primeira fatura.']
    if k['fatura2']:
        conds.append('Na primeira fatura aparecem as duas linhas: o valor e a isenção.')
    lis = ''.join(f'<li>{ico("check")}<span>{c}</span></li>' for c in conds)
    return f'''<div class="valor-impl"><h3>O valor</h3><dl>
      <div><dt>Implantação assistida</dt><dd>R$ 1.490,00</dd></div>
      <div class="gratis"><dt>Na oferta de lançamento</dt><dd>Grátis</dd></div>
    </dl><ul class="cond">{lis}</ul></div>'''


def implantacao(k, cls):
    return f'''<section class="secao {cls}" id="implantacao" aria-labelledby="t-impl"><div class="miolo impl">
  <div data-revelar><div class="sec-cab"><span class="sobretitulo">Para começar bem</span><h2 id="t-impl">A nossa equipe treina todas as pessoas do escritório.</h2><span class="fio" aria-hidden="true"></span><p class="lede">Na implantação assistida, a nossa equipe traz os clientes e contratos da sua planilha, treina cada pessoa que vai usar o T3jus e acompanha o escritório nos primeiros 30 dias. Quem entrar na equipe depois também é treinado, sem custo.</p></div>
    <ul class="lista-impl"><li>{ico("check")}<span>Clientes e contratos trazidos da sua planilha, com as parcelas já pagas</span></li><li>{ico("check")}<span>Treino de cada pessoa, na área que ela usa</span></li><li>{ico("check")}<span>Acompanhamento da nossa equipe nos primeiros 30 dias</span></li></ul></div>
  <div data-revelar>{valor_impl(k)}</div>
</div></section>'''


def desconto(k, cls):
    if not k['desconto']:
        return ''
    return f'''<section class="secao {cls}" id="desconto" aria-labelledby="t-desc"><div class="miolo">
  <div class="sec-cab" data-revelar><span class="sobretitulo">Para quem chega</span><h2 id="t-desc">Desconto nas 3 primeiras mensalidades.</h2><span class="fio" aria-hidden="true"></span></div>
  <div class="desc-faixa" data-revelar>
    <div><p class="ex-t">Exemplo</p><p class="ex-v">Escritório com 6 pessoas, vindo de outro sistema: <b>R$ 349,30</b> nos meses 1, 2 e 3, e <b>R$ 499,00</b> a partir do 4º.</p></div>
    <div><p class="pct">20%</p><h3>Para escritório novo</h3><p>Nos 3 primeiros meses: Essencial R$ 239,20, Escritório R$ 399,20 e Banca R$ 599,20.</p></div>
    <div><p class="pct">30%</p><h3>Para quem usa hoje outro sistema jurídico pago</h3><p>Conferido pela nossa equipe. Nos 3 primeiros meses: Essencial R$ 209,30, Escritório R$ 349,30 e Banca R$ 524,30.</p></div>
  </div>
  <p class="nota-pe" data-revelar>O desconto vale sobre o preço do plano, não sobre as pessoas a mais. Ele conta a partir da primeira fatura, mesmo que a implantação ainda não tenha terminado. No carnê, vale só nas 3 primeiras mensalidades.</p>
</div></section>'''


def formas(k):
    if k['inter']:
        f = [('pix', 'Pix ou boleto', 'Uma fatura por mês.'),
             ('carne', 'Carnê com as 12 mensalidades do ano', 'Cada mensalidade com o Pix e o boleto. As pessoas a mais entram pelo número do dia em que o carnê é gerado. Se a equipe mudar, geramos um carnê novo, com o motivo.'),
             ('fatura', 'Em nome do T3jus', 'O boleto é registrado pelo Banco Inter.')]
    else:
        f = [('pix', 'Pix', 'Uma fatura por mês.'),
             ('carne', 'Carnê com as 12 mensalidades do ano', 'Cada mensalidade com o Pix. As pessoas a mais entram pelo número do dia em que o carnê é gerado. Se a equipe mudar, geramos um carnê novo, com o motivo.')]
    lis = ''.join(f'<li>{ico(i)}<span><b>{b}</b>{s}</span></li>' for i, b, s in f)
    return f'<div class="caixa-pg"><h3>Formas</h3><ul>{lis}</ul></div>'


def pagamento(k, cls):
    cond = [('check', 'Valor final', 'O valor da fatura é o da tabela, sem nada somado.'),
            ('repasse', 'A fatura segue o plano contratado', 'Se a equipe crescer, você pede a troca de plano. Subir vale na hora, e a fatura seguinte traz a diferença dos dias que faltavam no mês. Descer vale a partir do mês seguinte.'),
            ('historico', 'Reajuste uma vez por ano, pelo IPCA', 'O preço do plano e o da pessoa a mais sobem pelo IPCA acumulado em 12 meses, no aniversário da assinatura. Você recebe o aviso 30 dias antes, com o valor de hoje, o novo e o índice, e pode cancelar sem multa antes de o novo valor valer. Se o índice for negativo, o preço não muda.'),
            ('sair', 'Sem fidelidade e sem multa', 'O cancelamento vale a partir da mensalidade seguinte.')]
    lis = ''.join(f'<li>{ico(i)}<span><b>{b}</b>{s}</span></li>' for i, b, s in cond)
    return f'''<section class="secao {cls}" id="pagamento" aria-labelledby="t-pag"><div class="miolo">
  <div class="sec-cab" data-revelar><span class="sobretitulo">Pagamento</span><h2 id="t-pag">Como você paga e o que pode mudar.</h2><span class="fio" aria-hidden="true"></span></div>
  <div class="paga" data-revelar>{formas(k)}<div class="caixa-pg"><h3>Condições</h3><ul>{lis}</ul></div></div>
  <div class="meta-pg" data-revelar><span class="bola">{ico("whats")}</span><div><h3>Mensagens do WhatsApp {SELO["prep"]}</h3><p>A Meta cobra por mensagem, direto do escritório, na conta do WhatsApp Business do número dele. O valor depende de quantas conversas o escritório tem e da tabela da Meta, que pode mudar. A assistente virtual do T3jus está no plano, sem cobrança por resposta. <b>Nada é cobrado por mensagens até o WhatsApp do escritório estar ligado.</b></p></div></div>
  <p class="pg-pe">As condições completas estão no contrato e nos Termos de uso, que você recebe e aceita antes de assinar.</p>
</div></section>'''


def perguntas_lista(k):
    prim = ('No mês seguinte ao fim dos 7 dias de teste, no dia de vencimento que você escolher, e só se você assinar.' if k['teste']
            else 'No mês seguinte ao começo da assinatura, no dia de vencimento que você escolher.')
    return [
        ('Quem conta como pessoa?', 'Toda pessoa com acesso liberado ao Portal do escritório no dia em que a fatura é calculada, mesmo quem ainda não entrou: sócios, advogados, estagiários e secretaria. Os clientes do escritório não contam. Quem sai da equipe deixa de contar quando o acesso é desativado.'),
        ('O WhatsApp com a assistente já funciona, e quem paga as mensagens?', 'A tela e a assistente estão prontas e testadas. Falta a ligação oficial do número do escritório com a Meta, que está em preparação. Quando ficar pronta, ela entra no seu plano sem mudar o preço. A Meta cobra por mensagem, direto do escritório, na conta do WhatsApp Business do número dele. A assistente do T3jus não tem cobrança por resposta. Até o WhatsApp do escritório estar ligado, nada é cobrado por mensagens.'),
        ('A assistente atende quem ainda não é cliente?', 'Só no primeiro contato. Quando um número novo escreve, ela se apresenta, pergunta o nome e o assunto e passa a conversa para a equipe. Ela não responde consulta jurídica e não fala de caso. O T3jus não envia propaganda nem mensagem em massa. As regras do atendimento são do escritório, que segue o Código de Ética da OAB.'),
        ('Quando pago a primeira mensalidade?', prim),
        ('E se eu quiser sair?', 'Não há fidelidade nem multa. O cancelamento vale a partir da mensalidade seguinte, e, se você desistir antes do primeiro vencimento, nada é cobrado. No carnê, as mensalidades que ainda não venceram são canceladas junto. Depois de sair, o Portal fica só para consulta por 30 dias, e o sócio dono pode exportar tudo do escritório nesse prazo.'),
        ('O T3jus recebe o dinheiro dos meus clientes?', 'Não. O carnê dos seus clientes leva o Pix do próprio escritório, e o dinheiro cai direto na sua conta. O que o T3jus cobra é só a mensalidade.'),
    ]


def perguntas(k, cls, abertas=False):
    op = ' open' if abertas else ''
    ds = ''.join(f'<details{op}><summary>{q}{ico("dir")}</summary><p>{r}</p></details>' for q, r in perguntas_lista(k))
    return f'''<section class="secao {cls}" id="perguntas" aria-labelledby="t-perg"><div class="miolo">
  <div class="sec-cab" data-revelar><span class="sobretitulo">Perguntas</span><h2 id="t-perg">Antes de escolher.</h2><span class="fio" aria-hidden="true"></span></div>
  <div class="perguntas">{ds}</div>
</div></section>'''


def chamada(k):
    if k['form']:
        txt = ('Cadastramos o escritório, mandamos o convite e os 7 dias começam no seu primeiro acesso.' if k['teste']
               else 'Uma conversa com a nossa equipe, sem compromisso, para ver o T3jus com a rotina do seu escritório.')
        acoes = f'<div class="acoes"><a class="btn btn-pri" href="{EXT}/demonstracao">Pedir uma demonstração{ico("seta")}</a></div><p class="ou">{ico("envelope")}<span>Prefere e-mail?</span> <a href="mailto:{CONTATO}">{CONTATO}</a></p>'
        lado = f'''<div class="cartao-cham"><h3>Na demonstração, você vê</h3><ul>
      <li>{ico("check")}O T3jus com um exemplo parecido com o seu escritório</li>
      <li>{ico("check")}Como trazer os clientes e contratos que você já tem</li>
      <li>{ico("check")}O que já existe e o que ainda é planejado</li>
      <li>{ico("check")}Quanto fica para o tamanho da sua equipe</li></ul></div>'''
    else:
        txt = 'Uma conversa com a nossa equipe, sem compromisso, para ver o T3jus com a rotina do seu escritório. Por enquanto, o contato é por e-mail. Respondemos em até 1 dia útil.'
        acoes = f'<div class="acoes"><a class="btn btn-pri" href="mailto:{CONTATO}?subject={quote("Quero conhecer o T3jus")}">{ico("envelope")}Escrever para {CONTATO}</a></div>'
        lado = f'''<div class="cartao-cham"><h3>No e-mail, conte</h3><ul>
      <li>{ico("check")}O nome do escritório</li>
      <li>{ico("check")}Quantas pessoas vão usar o T3jus</li>
      <li>{ico("check")}O plano que interessa, se já souber</li>
      <li>{ico("check")}O melhor horário para uma conversa por vídeo</li></ul><p class="resp">Não escreva dados de clientes no e-mail.</p></div>'''
    return f'''<section class="cham" aria-labelledby="t-cham"><div class="miolo">
  <div class="cham-bloco" data-revelar>
    <div><span class="sobretitulo">Vamos começar</span><h2 id="t-cham">Escolha o plano e fale com a nossa equipe.</h2><p class="txt">{txt}</p>{acoes}
      <img class="selo-cham" src="marca/selo-cor.svg" width="1162" height="1162" alt="" aria-hidden="true"></div>
    {lado}
  </div>
</div></section>'''


def dados_estruturados(k):
    ofertas = []
    for p in PLANOS:
        ofertas.append({"@type": "Offer", "name": p['nome'], "price": f"{p['preco']}.00", "priceCurrency": "BRL",
                        "eligibleQuantity": {"@type": "QuantitativeValue", "maxValue": p['pessoas'], "unitText": "pessoas"},
                        "priceSpecification": {"@type": "UnitPriceSpecification", "price": f"{p['preco']}.00", "priceCurrency": "BRL", "billingDuration": "P1M"}})
    return [{"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "T3jus", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": ofertas},
            {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": r}} for q, r in perguntas_lista(k)]}]


def corpo_precos(k, abertas=False):
    secs = [incluido, tabela, teste, implantacao, desconto, pagamento]
    html, n = [], 0
    for f in secs:
        s = f(k, 'clara' if n % 2 == 0 else '')
        if s:
            html.append(s)
            n += 1
    html.append(perguntas(k, 'clara' if n % 2 == 0 else '', abertas))
    return abertura(k) + '<main>' + planos(k) + '\n'.join(html) + chamada(k) + '</main>'


DESC = 'Planos do T3jus para escritórios de advocacia: R$ 299, R$ 499 ou R$ 749 por mês, conforme a equipe, com todas as áreas. Veja o que está incluído.'


# ---------- prancha: blocos com chave, ligados e desligados ----------
def rot(t, liga=None):
    s = f'<p class="rotulo-d">{t}'
    if liga is not None:
        s += f' <span class="{"" if liga else "off"}">{"ligada" if liga else "desligada"}</span>'
    return s + '</p>'


def vazio(t):
    return f'<div class="vazio-d"><p>{t}</p></div>'


def chaves():
    c = dict(COMPLETO)
    c_data = dict(COMPLETO, data_impl='31 de maio de 2027')
    partes = [
        rot('Teste de 7 dias · chave testeGratisLigado', True), teste(c, 'clara'),
        rot('Teste de 7 dias · chave testeGratisLigado', False), vazio('A seção some. A abertura, a resposta sobre a primeira mensalidade e a chamada final deixam de falar em teste. Hoje a chave está desligada: as telas do teste (F1.32 a F1.36) e os Termos de uso (F2.4) estão pendentes.'),
        rot('Desconto de entrada · chave descontoEntradaNoSite', True), desconto(c, ''),
        rot('Desconto de entrada · chave descontoEntradaNoSite', False), vazio('A faixa some, e a frase do desconto sai de baixo da tabela. Liga quando o desconto estiver publicado (P32).'),
        rot('Implantação assistida · com e sem a data do fim da oferta'),
        f'<div class="par-d"><div><p class="cab-d">Sem data gravada no Console (hoje)</p>{valor_impl(HOJE)}</div><div><p class="cab-d">Com a data gravada e a fatura com as duas linhas (data de exemplo)</p>{valor_impl(c_data)}</div></div>',
        rot('Formas de pagamento · conforme o Banco Inter (F1.21)'),
        f'<div class="par-d"><div><p class="cab-d">Hoje: só o que já funciona</p>{formas(HOJE)}</div><div><p class="cab-d">Com o boleto do Inter ligado</p>{formas(c)}</div></div>',
        rot('Cartões dos planos · chave privacidadePronta (formulário)'),
        f'<div class="par-d"><div><p class="cab-d">Formulário fechado (hoje): abre o e-mail</p>{cartao(PLANOS[1], HOJE)}</div><div><p class="cab-d">Formulário ligado: leva à Demonstração</p>{cartao(PLANOS[1], c)}</div></div>',
        rot('Chamada final · formulário ligado e teste ligado'), chamada(c),
    ]
    return '<main id="conteudo" class="prancha">' + '\n'.join(partes) + '</main>'


# ---------- prancha: chamadas que mudam nas outras páginas ----------
def chamadas():
    def par(titulo, antes, depois):
        return f'{rot(titulo)}<div class="par-d"><div class="antes-d"><p class="cab-d">Hoje</p>{antes}</div><div><p class="cab-d depois-t">Passa a ser</p>{depois}</div></div>'

    def bloco_inicio(txt, link):
        extra = f'<p class="ou"><mark><a href="precos.html">Ver planos e preços</a></mark></p>' if link else ''
        return f'''<div class="cham-bloco sem-padrao" style="grid-template-columns:1fr;padding:40px"><div><span class="sobretitulo">Vamos conversar</span><h2 style="font-size:36px">Veja o T3jus com a rotina do seu escritório.</h2><p class="txt">{txt}</p><div class="acoes"><a class="btn btn-pri" href="{EXT}/demonstracao">Pedir uma demonstração{ico("seta")}</a></div>{extra}</div></div>'''

    def ver(ult):
        return f'''<div class="cartao-cham"><h3>Na demonstração, você vê</h3><ul><li>{ico("check")}O T3jus com um exemplo parecido com o seu escritório</li><li>{ico("check")}Como trazer os clientes e contratos que você já tem</li><li>{ico("check")}O que já existe e o que ainda é planejado</li><li>{ico("check")}{ult}</li></ul></div>'''

    def faq(q, r):
        return f'<div class="perguntas" style="margin-top:0"><details open><summary>{q}{ico("dir")}</summary><p>{r}</p></details></div>'

    def passo(t, s, d='1'):
        return f'<div class="trecho"><span class="pg">Como funciona · Para começar · passo {d}</span><ol class="comecar" style="margin-top:0;grid-template-columns:1fr"><li><span class="disco" aria-hidden="true">{d}</span><h3>{t}</h3><p>{s}</p></li></ol></div>'

    def dem(b, s):
        return f'<div class="trecho"><span class="pg">Demonstração · O que acontece depois · passo 3</span><ol class="depois-lista" style="margin-top:0"><li><span class="disco" aria-hidden="true">3</span><span><b>{b}</b><span>{s}</span></span></li></ol></div>'

    partes = [
        par('Início · chamada final',
            bloco_inicio('Uma conversa com a nossa equipe, sem compromisso. O valor é combinado na demonstração: os planos ainda estão sendo definidos.', False),
            bloco_inicio('Uma conversa com a nossa equipe, sem compromisso. <mark>Planos a partir de R$ 299 por mês, com todas as áreas.</mark>', True)),
        par('Início · cartão “Na demonstração, você vê”', ver('O valor para o tamanho da sua equipe'), ver('<span><mark>Quanto fica para o tamanho da sua equipe</mark>, com o link para a tabela de Planos e preços</span>')),
        par('Para quem é · pergunta “Quanto custa?” (e o FAQPage)',
            faq('Quanto custa?', 'O valor é combinado na demonstração, de acordo com o tamanho da equipe. Os planos ainda estão sendo definidos.'),
            faq('Quanto custa?', '<mark>A partir de R$ 299 por mês, conforme o número de pessoas, com todas as áreas em todos os planos. Pessoa a mais custa R$ 69 por mês. Veja os detalhes em</mark> <a href="precos.html">Planos e preços</a>.')),
        par('Para quem é · pergunta “Preciso largar o sistema que uso hoje?” (correção no mesmo commit)',
            faq('Preciso largar o sistema que uso hoje?', 'Não de uma vez. Clientes e contratos entram pela sua planilha, com a ajuda da nossa equipe. Importar direto de outros sistemas jurídicos ainda é planejado.'),
            faq('Preciso largar o sistema que uso hoje?', 'Não de uma vez. Clientes e contratos entram pela sua planilha, com a ajuda da nossa equipe. <mark>Trazer os dados direto do Astrea e do ADVBOX está em preparação.</mark>')),
        par('Como funciona · Para começar',
            passo('Demonstração', 'Uma conversa para ver o T3jus com a rotina do seu escritório e combinar o valor.'),
            passo('Demonstração', 'Uma conversa para ver o T3jus com a rotina do seu escritório e <mark>tirar as dúvidas. Os valores estão em</mark> <a href="precos.html">Planos e preços</a>.')),
        par('Demonstração · O que acontece depois',
            dem('Valor combinado antes', 'Você decide depois de ver, sem compromisso.'),
            dem('<mark>Valor conhecido antes</mark>', '<mark>Os preços estão em Planos e preços.</mark> Você decide depois de ver, sem compromisso.')),
    ]
    return '<main id="conteudo" class="prancha">' + '\n'.join(partes) + '</main>'


# ---------- prancha: o menu do topo, antes e depois ----------
def menu():
    def quadro(t, src, w):
        return f'<p class="rotulo-d">{t}</p><div style="max-width:{w}px;margin:12px auto 0;padding:0"><iframe src="{src}" title="{t}" width="{w}" height="96" style="display:block;border:0;width:{w}px;height:96px;border-radius:12px;box-shadow:0 0 0 1px #E6D8D0"></iframe></div>'
    return ('<style>body>.topo{display:none}</style><main id="conteudo" class="prancha" style="padding-bottom:48px">'
            + quadro('Hoje, no site no ar · 1440 px', '_topo-antes.html', 1440)
            + quadro('Passa a ser · 1440 px, na página Planos e preços (item atual sublinhado em âmbar)', 'precos.html', 1440)
            + quadro('Passa a ser · 1021 px, a largura mais estreita em que o menu completo aparece', 'precos.html', 1021)
            + quadro('De 761 a 1020 px · como hoje, os links de texto saem e ficam Entrar e Pedir demonstração', 'precos.html', 900)
            + '</main>')


def gravar(nome, html):
    open(os.path.join(SAI, nome), 'w', encoding='utf-8').write(html)
    print(nome, len(html))


os.makedirs(SAI, exist_ok=True)
gravar('precos.html', pagina('Planos e preços · T3jus', DESC, corpo_precos(HOJE), dados_estruturados(HOJE)))
gravar('precos-completo.html', pagina('Planos e preços · T3jus', DESC, corpo_precos(COMPLETO), dados_estruturados(COMPLETO)))
gravar('_precos-perguntas-abertas.html', pagina('Planos e preços · T3jus', DESC, corpo_precos(HOJE, abertas=True)))
gravar('chaves.html', pagina('Blocos com chave · Planos e preços', DESC, chaves()))
gravar('chamadas.html', pagina('Chamadas que mudam · Planos e preços', DESC, chamadas()))
gravar('menu.html', pagina('Menu do topo · Planos e preços', DESC, menu()))
gravar('_topo-antes.html', pagina('Topo de hoje', DESC, '<main id="conteudo"></main>', com_precos=False).replace(rodape(), ''))
