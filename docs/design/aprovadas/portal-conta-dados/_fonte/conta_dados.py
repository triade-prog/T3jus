# Sua conta · seus dados para os documentos (conta.html) e a ficha da pessoa na Equipe com os mesmos dados
# (equipe.html). Parte da Sua conta aprovada (portal-equipe-oab, decisão 7) e troca o cabeçalho e o miolo.
# Base sem mudança: comum.py (Portal v1), pecas.py (Comercial e Contratos) e oab.py (Equipe · OAB).
# Peças novas com o prefixo cd-. Uso: python3 conta_dados.py <pasta-saida>
import sys
from comum import *
from pecas import campo, selecao, opcao, CSS_HN
from oab import UFS, com_conta
from elenco import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
K = 'conta.html?estado='
E = 'equipe.html?estado='
NOMES_AREA = {k: n for k, n, *_ in AREAS}

CSS = r"""
/* ==========================================================================
   Sua conta · dados para os documentos (prefixo cd-)
   O cabeçalho é próprio desta tela: não depende de regras da ficha do Console (.ficha-cab, .dir),
   que no Portal estão fora do escopo e deixavam textos sobrepostos.
   ========================================================================== */
.cd{display:flex;flex-direction:column;gap:24px;min-width:0}
.cd-cab{border-radius:var(--raio-g);overflow:hidden;box-shadow:var(--sombra);min-width:0;background:var(--vinho)}
.cd-topo{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px 40px;padding:22px 36px 28px}
.cd-topo .estatua{position:absolute;right:-84px;bottom:-84px;width:210px;height:210px;color:var(--vinho-2);z-index:-1;stroke-width:1.1;pointer-events:none}
.cd-quem{min-width:0}
.cd-voltar{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--ambar-3);text-decoration:none;font-weight:500;font-size:13px;margin:-8px 0 2px -4px}
.cd-voltar:hover{text-decoration:underline}
.cd-voltar:focus-visible{outline:3px solid var(--ambar-3);outline-offset:2px;border-radius:6px}
.cd-topo .sobretitulo{color:var(--ambar-2)}
.cd-topo h1{font-size:44px;line-height:1.06;margin-top:4px;color:var(--papel);overflow-wrap:anywhere;text-wrap:balance}
.cd-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-top:12px;font-size:13px;color:var(--ambar-2);min-width:0}
.cd-meta .selo{background:var(--ambar-3);color:var(--vinho)}
.cd-meta>span{min-width:0;overflow-wrap:anywhere}
.cd-conta{display:flex;align-items:center;gap:14px;max-width:250px}
.cd-conta .disco{--d:76px;--f:34px;--c:var(--vinho-2);color:var(--papel);box-shadow:inset 0 0 0 1px rgba(242,205,179,.3)}
.cd-conta .disco.cd-ok{--c:var(--ambar-3);color:var(--vinho)}
.cd-conta p{font-size:13px;line-height:1.4;color:var(--ambar-3);margin:0}
.cd-conta b{display:block;font-family:var(--serifa);font-size:21px;font-weight:500;color:var(--papel);line-height:1.15}
.cd-faixa{padding:20px 36px 22px;display:grid;gap:10px;border-top:1px solid rgba(79,29,53,.25)}
.cd-faixa.campo-ambar::before{-webkit-mask-image:linear-gradient(90deg,transparent 76%,#000 98%)!important;mask-image:linear-gradient(90deg,transparent 76%,#000 98%)!important}
.cd-faixa .sobretitulo{color:var(--vinho-escuro)}
.cd-frase{margin:0;font-family:var(--serifa);font-size:21px;line-height:1.48;color:var(--tinta);font-weight:500;max-width:780px;overflow-wrap:anywhere}
.cd-frase strong{color:var(--vinho-escuro);font-weight:700}
.cd-falta{background:var(--sal);color:var(--vinho-escuro);box-shadow:inset 0 0 0 1px var(--vinho-3);font-family:var(--sans);font-size:12px;font-weight:600;padding:2px 7px;border-radius:4px;white-space:nowrap;vertical-align:2px}
.cd-faixa-pe{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;font-size:13px;color:var(--tinta);max-width:780px}
.cd-faixa-pe p{margin:0;flex:1 1 320px}
.cd-faixa-pe b{font-weight:600}
.cd-vazia{margin:0;font-family:var(--serifa);font-size:26px;line-height:1.2;color:var(--vinho-escuro);font-weight:500}

/* Folha dos dados */
.cd-prog{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;margin:0 24px 8px;padding:12px 16px;border-radius:var(--raio);background:var(--sal-2)}
.cd-tons{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;flex:0 0 184px}
.cd-tons i{height:8px;border-radius:4px;background:var(--vinho)}
.cd-tons i.v{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.cd-prog p{margin:0;font-size:13px;flex:1 1 260px;line-height:1.45}
.cd-prog b{font-weight:600}
.cd-prog.ok{background:#F6F1EC}
.cd-grupos{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 36px;padding:4px 24px 12px}
.cd-h3{font-family:var(--sans)!important;font-size:12px!important;letter-spacing:.16em;text-transform:uppercase;color:var(--vinho-2);font-weight:500;margin:14px 0 2px;line-height:1.4}
.cd-dl{margin:0}
.cd-dl>div{display:grid;grid-template-columns:118px minmax(0,1fr);gap:2px 14px;padding:11px 0;border-top:1px solid var(--divisor);font-size:14px}
.cd-dl>div:first-child{border-top:0}
.cd-dl dt{color:var(--texto-2);font-size:13px;line-height:1.5}
.cd-dl dd{margin:0;font-weight:500;overflow-wrap:anywhere;min-width:0;line-height:1.5}
.cd-dl dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.cd-dl .selo{vertical-align:1px}
.cd-sai{font-weight:400;font-size:12px;color:var(--texto-2);margin-left:6px}
.cd-opc{font-weight:400;color:var(--texto-2)}
.cd-oab{border-top:1px solid var(--divisor);padding:6px 24px 4px}
.cd-oab-cab{display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap}
.cd-insc{list-style:none;margin:0;padding:0}
.cd-insc li{display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid var(--divisor);flex-wrap:wrap}
.cd-insc li:first-child{border-top:0}
.cd-uf{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:var(--raio);background:var(--sal-2);color:var(--vinho);font-family:var(--serifa);font-size:20px;font-weight:500;box-shadow:inset 0 0 0 1px var(--borda-folha)}
.cd-insc .cd-q{flex:1 1 200px;min-width:0}
.cd-insc strong{display:block;font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.2}
.cd-insc small{display:block;font-size:12px;color:var(--texto-2)}
.cd-insc .cd-bts{display:flex;gap:8px;margin-left:auto}
.cd-pe{display:flex;align-items:flex-start;gap:10px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2);line-height:1.5;margin:0}
.cd-pe .ico{color:var(--vinho-4);margin-top:1px;flex:none}
.cd-pe b{font-weight:500;color:var(--texto)}
.cd-pe a{color:var(--vinho);font-weight:500}
.cd-oab .cd-pe{padding:12px 0 14px;border-top:1px solid var(--divisor)}

/* Lateral */
.cd-usos{list-style:none;margin:0;padding:0 24px 10px}
.cd-usos li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.cd-usos li:first-child{border-top:0;padding-top:4px}
.cd-usos .cd-ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.cd-usos strong{display:block;font-weight:500;color:var(--texto);font-size:14px}
.cd-usos span{color:var(--texto-2)}
.cd-areas{padding:0 24px 18px;display:grid;gap:10px;justify-items:start}
.cd-areas .cd-rot{margin:0;font-size:13px;color:var(--texto-2)}
.cd-chips{display:flex;flex-wrap:wrap;gap:6px}
.cd-chips .selo{background:var(--sal-2);color:var(--vinho)}
.cd-hist{list-style:none;margin:0;padding:0 24px 16px;display:grid;gap:0}
.cd-hist li{padding:10px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.cd-hist li:first-child{border-top:0;padding-top:0}
.cd-hist small{display:block;color:var(--texto-2);font-size:12px}

/* Edição: formulário, prévia ao lado (no celular, entre o formulário e os botões) */
.cd-ed{display:grid;grid-template-columns:minmax(0,1fr) 380px;grid-template-areas:"form prev" "pe prev";gap:24px;align-items:start}
.cd-ed>.cd-a-form{grid-area:form;min-width:0}
.cd-ed>.cd-a-prev{grid-area:prev;position:sticky;top:24px;min-width:0}
.cd-ed>.cd-a-pe{grid-area:pe;min-width:0}
.cd-sec{grid-column:1/-1;margin:6px 0 -6px;padding-top:16px;border-top:1px solid var(--divisor)}
.cd-sec:first-child{border-top:0;padding-top:0;margin-top:0}
.cd-trat{border:0;margin:0;padding:0;min-width:0;grid-column:1/-1}
.cd-trat legend{padding:0;margin-bottom:4px;font-size:13px;font-weight:500;color:var(--texto)}
.cd-trat .cd-trat-ops{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}
.cd-end-ok{grid-column:1/-1;margin:-6px 0 0 34px;font-size:13px;color:var(--texto-2);line-height:1.5}
.cd-oab-ler{grid-column:1/-1;display:flex;align-items:center;gap:12px 14px;flex-wrap:wrap;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2)}
.cd-oab-ler .cd-uf{width:40px;height:40px;font-size:17px;background:var(--papel)}
.cd-oab-ler p{margin:0;flex:1 1 220px;font-size:13px;color:var(--texto-2);line-height:1.45}
.cd-oab-ler p b{display:block;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho)}
.cd-oab-ler a{color:var(--vinho);font-weight:500;display:inline-flex;align-items:center;min-height:44px}
.cd-papel{margin:0 24px 14px;background:var(--papel);border:1px solid var(--borda-folha);border-top:3px solid var(--vinho);border-radius:4px;padding:16px 18px;font-family:var(--serifa);font-size:15.5px;line-height:1.6;color:var(--tinta);overflow-wrap:anywhere}
.cd-papel p{margin:0}
.cd-papel .cd-tim{display:flex;justify-content:space-between;font-family:var(--sans);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2);margin-bottom:12px;gap:8px}
.cd-papel b{font-weight:700}
.cd-papel mark{background:transparent;color:inherit;border-bottom:1.5px solid var(--vinho-4)}
.cd-papel mark.cd-falta{border-bottom:0}
.cd-conta-prev{margin:0 24px 18px;font-size:13px;line-height:1.5;color:var(--texto)}
.cd-conta-prev b{font-weight:600}
.cd-pe-bts{display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap;padding:18px 24px}
.cd-pe-bts p{margin:0;flex:1 1 280px;font-size:13px;color:var(--texto-2);line-height:1.5}
.cd-pe-bts .cd-bts{display:flex;gap:10px;flex-wrap:wrap}
[data-proprio][hidden]{display:none!important}
.cd-nw{white-space:nowrap}
.cd-trat .ajuda{font-size:12px;color:var(--texto-2);margin:2px 0 0}
.cd .aviso-acoes li a{display:inline-flex;align-items:center;min-height:44px}

@media (max-width:760px){
  .cd{gap:16px}
  .cd-topo{grid-template-columns:minmax(0,1fr);padding:16px 16px 20px;gap:16px}
  .cd-topo .estatua{display:none}
  .cd-faixa.campo-ambar::before{display:none}
  .cd-topo h1{font-size:30px}
  .cd-conta{max-width:none}
  .cd-conta .disco{--d:60px;--f:28px}
  .cd-faixa{padding:16px 16px 18px}
  .cd-faixa.campo-ambar::before{-webkit-mask-image:linear-gradient(180deg,transparent 80%,#000 100%)!important;mask-image:linear-gradient(180deg,transparent 80%,#000 100%)!important}
  .cd-frase{font-size:18px}
  .cd-faixa-pe .btn{width:100%}
  .cd-vazia{font-size:22px}
  .cd-prog{margin:0 16px 8px}
  .cd-tons{flex-basis:100%}
  .cd-grupos{grid-template-columns:minmax(0,1fr);padding:0 16px 8px}
  .cd-dl>div{grid-template-columns:minmax(0,1fr)}
  .cd-oab{padding:4px 16px 2px}
  .cd-insc .cd-bts{margin-left:62px;width:calc(100% - 62px)}
  .cd-insc .cd-bts .btn{flex:1}
  .cd-pe{padding:12px 16px 16px}
  .cd-usos,.cd-areas,.cd-hist{padding-left:16px;padding-right:16px}
  .cd-ed{grid-template-columns:minmax(0,1fr);grid-template-areas:"form" "prev" "pe";gap:16px}
  .cd-ed>.cd-a-prev{position:static}
  .cd-trat .cd-trat-ops{grid-template-columns:1fr}
  .cd-end-ok{margin-left:0}
  .cd-papel{margin:0 16px 12px;font-size:15px}
  .cd-conta-prev{margin:0 16px 16px}
  .cd-pe-bts{padding:16px}
  .cd-pe-bts .cd-bts{width:100%}
  .cd-pe-bts .cd-bts .btn{flex:1}
}
"""

DE_UF = {'BA': 'da Bahia', 'SE': 'de Sergipe', 'SP': 'de São Paulo', 'PE': 'de Pernambuco'}


def quebra_email(e):
    # deixa o e-mail longo quebrar depois do @ e antes dos pontos, em vez de no meio de uma palavra
    u, d = e.split('@')
    return u.replace('.', '<wbr>.') + '@<wbr>' + d.replace('.', '<wbr>.')


def pn(p):
    return p['curto'].split()[0]


# ---------------------------------------------------------------- cabeçalho (vinho com nome e e-mail; âmbar com a frase)
def disco(p):
    f = faltas(p)
    n = 8 - len(f)
    if not p['oab']:
        return ''
    t = 'completos para os documentos' if not f else f'falta{"m" if len(f) > 1 else ""} {len(f)} para os documentos'
    return (f'<div class="cd-conta"><span class="disco{" cd-ok" if not f else ""}" aria-hidden="true"><span>{n}</span></span>'
            f'<p><b>de 8 dados</b>{t}<span class="sr">: {n} de 8 dados preenchidos</span></p></div>')


def cabecalho(p, modo='conta', faixa=True, editar=False):
    voce = modo == 'conta'
    sobre = 'Sua conta' if voce else 'Pessoa da equipe'
    voltar = '' if voce else f'<a class="cd-voltar" href="#">{ico("esq", "ico ico-s")}Equipe</a>'
    if editar:
        sobre = 'Sua conta · editando seus dados' if voce else 'Equipe · editando os dados'
    meta = (f'<p class="cd-meta"><span class="selo">{p["papel"]}</span><span>{quebra_email(p["login"])}</span>'
            f'<span>na equipe desde {p["desde"]}</span></p>')
    topo = (f'<div class="cd-topo campo-vinho">{ico("cracha", "ico estatua")}<div class="cd-quem">{voltar}<p class="sobretitulo">{sobre}</p>'
            f'<h1>{p["curto"]}</h1>{meta}</div>{"" if editar else disco(p)}</div>')
    if not faixa or editar:
        return f'<header class="cd-cab">{topo}</header>'
    f = faltas(p)
    if p['oab']:
        quem_sai = 'Como você sai' if voce else f'Como {pn(p)} sai'
        frase = qualificacao(p)
        # o nome em negrito, como no documento
        if p['completo']:
            frase = frase.replace(p['completo'].upper(), f'<strong>{p["completo"].upper()}</strong>', 1)
        if f:
            edit = K + 'conta-editar' if voce else E + 'equipe-pessoa-editar'
            txt = (f'<b>Falta{"m" if len(f) > 1 else ""} {len(f)} de 8: {lista_e(f)}.</b> Dá para gerar documentos assim: '
                   f'o que falta sai marcado, para completar à mão ou no Word.')
            pe = f'<div class="cd-faixa-pe"><p>{txt}</p><a class="btn btn-pri" href="{edit}">{ico("lapis")}Completar {"agora" if voce else "os dados de " + pn(p)}</a></div>'
        else:
            pe = '<div class="cd-faixa-pe"><p>É assim que sai na qualificação do contrato de honorários, da procuração e das petições. Vale para os documentos gerados daqui em diante.</p></div>'
        corpo = f'<p class="cd-frase">{frase}.</p>{pe}'
        tit = f'{quem_sai} no contrato e na procuração'
    else:
        tit = 'Documentos do escritório'
        corpo = (f'<p class="cd-vazia">Você não assina contratos nem procurações</p>'
                 f'<div class="cd-faixa-pe"><p>Sem OAB cadastrada, você não aparece como advogada nos documentos, e nada aqui é cobrado. '
                 f'Para a recepção e o financeiro, é o normal. Se você é advogada, peça a Carol Santana, sócia dona, para cadastrar a sua inscrição na Equipe.</p></div>')
    return (f'<header class="cd-cab">{topo}<section class="cd-faixa campo-ambar" aria-labelledby="t-sai">'
            f'<p class="sobretitulo" id="t-sai">{tit}</p>{corpo}</section></header>')


# ---------------------------------------------------------------- folha dos dados (leitura)
def falta_dd(o):
    return f'<span class="selo selo-atencao">Falta</span><span class="cd-sai">sai como <span class="cd-nw">[{o}: falta]</span></span>'


def linhas_dados(p, voce=True):
    g = p['trat']
    trat = {'a': 'Advogada', 'o': 'Advogado'}.get(g)
    conc = {'a': 'inscrita, portadora', 'o': 'inscrito, portador'}.get(g, '')
    q = [
        ('Nome completo', (f'{p["completo"]}<small>No T3jus, {"você aparece" if voce else "aparece"} como “{p["curto"]}”</small>') if p['completo'] else falta_dd('NOME COMPLETO')),
        ('Como o documento {}chama'.format('te ' if voce else 'o '), f'{trat}<small>Concordância: {conc}</small>' if trat else falta_dd('TRATAMENTO')),
        ('Nacionalidade', p['nac'].capitalize() if p['nac'] else falta_dd('NACIONALIDADE')),
        ('Estado civil', EC[p['ec']][0 if g == 'a' else 1].capitalize() if p['ec'] else falta_dd('ESTADO CIVIL')),
        ('CPF', p['cpf'] if p['cpf'] else falta_dd('CPF')),
        ('RG', f'{p["rg"]} · {p["rg_org"]}' if p['rg'] and p['rg_org'] else falta_dd('RG')),
    ]
    e = endereco(p)
    origem = 'O do escritório. Muda junto se o escritório mudar.' if p['end_esc'] else 'Endereço próprio, diferente do escritório.'
    w = [
        ('Endereço profissional', f'{e}<small>{origem}</small>' if e else falta_dd('ENDEREÇO PROFISSIONAL')),
        ('E-mail profissional', quebra_email(p['email_prof']) if p['email_prof'] else '<span class="cd-opc">Não informado (opcional)</span>'),
        ('Telefone profissional', p['tel'] or '<span class="cd-opc">Não informado (opcional)</span>'),
    ]
    dl = lambda xs: '<dl class="cd-dl">' + ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in xs) + '</dl>'
    return (f'<div class="cd-grupos"><div><h3 class="cd-h3">{"Quem você é" if voce else "Quem " + pn(p) + " é"}</h3>{dl(q)}</div>'
            f'<div><h3 class="cd-h3">{"Onde você atende" if voce else "Onde " + pn(p) + " atende"}</h3>{dl(w)}</div></div>')


def prog(p):
    f = faltas(p)
    n = 8 - len(f)
    tons = ''.join('<i></i>' if i < n else '<i class="v"></i>' for i in range(8))
    if f:
        t = f'<b>Falta{"m" if len(f) > 1 else ""} {len(f)} de 8 dados:</b> {lista_e(f)}. Não bloqueia: os documentos saem com a marca no lugar, como no cadastro do cliente.'
    else:
        t = '<b>8 de 8 dados preenchidos.</b> A qualificação sai completa nos documentos.'
    return f'<div class="cd-prog{"" if f else " ok"}"><div class="cd-tons" aria-hidden="true">{tons}</div><p>{t}</p></div>'


def insc(p, editar=False):
    out = ''
    for uf, n, l, tipo in p['oab']:
        t = oab_curta((uf, n, l, tipo))
        bts = ''
        if editar:
            bts = (f'<div class="cd-bts"><button class="btn btn-sec btn-compacto" type="button" aria-label="Editar a inscrição {t} de {pn(p)}">{ico("lapis", "ico ico-s")}Editar</button>'
                   f'<button class="btn btn-perigo btn-compacto" type="button" aria-label="Remover a inscrição {t} de {pn(p)}">Remover</button></div>')
        out += (f'<li><span class="cd-uf" aria-hidden="true">{uf}</span><div class="cd-q"><strong>{t}</strong>'
                f'<small>{"Principal" if tipo == "principal" else "Suplementar"} · seccional {DE_UF[uf]}</small></div>{bts}</li>')
    return f'<ul class="cd-insc">{out}</ul>'


def bloco_oab(p, modo):
    if modo == 'equipe':
        cab = (f'<div class="cd-oab-cab"><h3 class="cd-h3">Inscrições na OAB</h3>'
               f'<button class="btn btn-sec btn-compacto" type="button">{ico("mais", "ico ico-s")}Adicionar inscrição</button></div>')
        pe = f'<p class="cd-pe">{ico("historico")}<span>Só a sócia dona muda as inscrições. A principal vem primeiro nos documentos.</span></p>'
        return f'<div class="cd-oab">{cab}{insc(p, True)}{pe}</div>'
    cab = f'<div class="cd-oab-cab"><h3 class="cd-h3">Sua OAB</h3></div>'
    if p['dona']:
        pe = (f'<p class="cd-pe">{ico("cadeado")}<span>A OAB fica na Equipe, para ninguém ter duas versões dela. Como sócia dona, você corrige lá: '
              f'<a href="{E}equipe-pessoa-dados">Corrigir a OAB na Equipe</a>.</span></p>')
    else:
        pe = (f'<p class="cd-pe">{ico("cadeado")}<span>Algum número diferente da sua carteira? <b>Fale com Carol Santana, sócia dona:</b> só ela muda a OAB, na Equipe. '
              f'Os documentos já gerados guardam a OAB do dia.</span></p>')
    return f'<div class="cd-oab">{cab}{insc(p)}{pe}</div>'


def folha_dados(p, modo='conta', ultima=''):
    voce = modo == 'conta'
    tit = 'Seus dados para os documentos' if voce else f'Dados de {pn(p)} para os documentos'
    sub = ('Saem na qualificação do contrato de honorários, da procuração e das petições que você assina. Só você e a sócia dona veem e mudam.'
           if voce else f'Os mesmos que {pn(p)} vê em Sua conta. Vocês dois podem completar; a última mudança vale.')
    edit = K + 'conta-editar' if voce else E + 'equipe-pessoa-editar'
    bt = f'<a class="btn btn-sec" href="{edit}">{ico("lapis")}{"Editar dados" if voce else "Completar dados"}<span class="sr"> {"" if voce else "de " + pn(p)}</span></a>'
    pe = (f'<p class="cd-pe">{ico("cadeado")}<span>CPF e RG servem só para os documentos que o escritório gera. Clientes não veem esta página. '
          f'{ultima or "Cada mudança fica no histórico da equipe, com quem fez e quando."}</span></p>')
    return (f'<section class="folha" aria-labelledby="t-dados" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-dados">{tit}</h2>'
            f'<p class="sub">{sub}</p></div><div class="acoes">{bt}</div></div>{prog(p)}{linhas_dados(p, voce)}{bloco_oab(p, modo)}{pe}</section>')


def folha_sem_oab(p):
    corpo = estado('Nada a preencher por aqui',
                   'Os dados para os documentos (nome completo, estado civil, CPF, RG e endereço profissional) só são pedidos de quem assina como advogado. '
                   'Quando a sócia dona cadastrar uma OAB para você na Equipe, este quadro abre para você completar.',
                   icone='balanca', moldura=False)
    return (f'<section class="folha" aria-labelledby="t-dados" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-dados">Seus dados para os documentos</h2>'
            f'<p class="sub">Só para quem assina documentos como advogado.</p></div></div>{corpo}</section>')


USOS = (f'<section class="folha" aria-labelledby="t-usos"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-usos" style="font-size:20px">Onde estes dados entram</h2></div></div>'
        f'<ul class="cd-usos">'
        f'<li><span class="cd-ic" aria-hidden="true">{ico("pena")}</span><div><strong>Contrato de honorários</strong><span>Na qualificação da contratada, “por seus advogados”, e na assinatura.</span></div></li>'
        f'<li><span class="cd-ic" aria-hidden="true">{ico("doc")}</span><div><strong>Procuração</strong><span>Como outorgado, com o endereço onde recebe intimações.</span></div></li>'
        f'<li><span class="cd-ic" aria-hidden="true">{ico("balanca")}</span><div><strong>Petições</strong><span>No fecho, com nome completo e OAB; e-mail e telefone só se o modelo pedir.</span></div></li>'
        f'</ul><p class="cd-pe">{ico("historico")}<span>Documentos já gerados não mudam: cada arquivo guarda os dados do dia em que foi gerado.</span></p></section>')


def acesso(p, voce=True):
    areas = ''.join(f'<span class="selo">{NOMES_AREA[a]}</span>' for a in p['areas']) or '<span class="selo">Só as partes comuns</span>'
    rot = 'Áreas que você abre' if voce else 'Áreas liberadas'
    nota = ('O e-mail de entrada é o da sua senha. O profissional, se houver, é o que sai nos documentos.' if voce
            else 'Quem muda as áreas e as inscrições é a sócia dona.')
    return (f'<section class="folha" aria-labelledby="t-ac"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-ac" style="font-size:20px">{"Seu acesso" if voce else "Acesso"}</h2></div></div>'
            f'<dl class="hn-dl"><div><dt>E-mail de entrada</dt><dd style="overflow-wrap:anywhere;min-width:0">{quebra_email(p["login"])}</dd></div><div><dt>Na equipe desde</dt><dd>{p["desde"]}</dd></div></dl>'
            f'<div class="cd-areas"><p class="cd-rot">{rot}</p><div class="cd-chips">{areas}</div></div>'
            f'<p class="cd-pe">{ico("ajuda")}<span>{nota}</span></p></section>')


HIST_RAFAEL = (f'<section class="folha" aria-labelledby="t-hi"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-hi" style="font-size:20px">Últimas mudanças</h2></div></div>'
               f'<ul class="cd-hist"><li>Rafael preencheu o RG, em Sua conta<small>20/11/2026 às 16h12</small></li>'
               f'<li>Carol Santana cadastrou a OAB/SE 1.288 como suplementar<small>18/11/2026 às 10h40</small></li>'
               f'<li>Rafael entrou na equipe<small>10/03/2026</small></li></ul></section>')


def pagina_ver(p, modo='conta'):
    voce = modo == 'conta'
    if p['oab']:
        miolo = folha_dados(p, modo, '' if voce else 'Última mudança: Rafael preencheu o RG em Sua conta, em 20/11/2026.')
    else:
        miolo = folha_sem_oab(p)
    lado = (USOS + acesso(p)) if voce else (acesso(p, False) + HIST_RAFAEL)
    return (f'<div class="cd">{cabecalho(p, modo)}<div class="hn-grade"><div class="hn-col">{miolo}</div>'
            f'<aside class="hn-col" aria-label="{"Onde os dados entram e seu acesso" if voce else "Acesso e histórico"}">{lado}</aside></div></div>')


# ---------------------------------------------------------------- edição
def ops_ec(sel):
    return selecao('cd-ec', 'Estado civil', [EC_ROT[k] for k, *_ in ESTADOS], EC_ROT.get(sel, ''), 'c2')


def form_dados(p, modo='conta', erros=None):
    erros = erros or {}
    voce = modo == 'conta'
    nome = pn(p)
    resumo = ''
    if erros:
        links = ''.join(f'<li><a href="#cd-{k}">{rot}</a></li>' for k, (rot, _) in erros.items())
        resumo = ('<div class="c6">' + aviso('urgencia', f'Falta acertar {len(erros)} pontos, marcados abaixo.', 'Seus dados ainda não foram salvos.',
                                             acoes=f'<ul>{links}</ul>') + '</div>')
    er = lambda k: erros.get(k, ('', ''))[1]
    foco = next(iter(erros), 'completo')
    aj_nome = (f'Como na carteira da OAB. Nos documentos, sai em maiúsculas. No T3jus, {"você continua aparecendo" if voce else nome + " continua aparecendo"} como “{p["curto"]}”.')
    g = p['trat']
    trat = (f'<fieldset class="cd-trat" aria-describedby="cd-trat-aj"><legend>Como o documento {"te" if voce else "o"} chama</legend><div class="cd-trat-ops">'
            + opcao('cd-trat', 'Advogada', 'inscrita, portadora, casada', g == 'a', 'radio', 'a')
            + opcao('cd-trat', 'Advogado', 'inscrito, portador, casado', g == 'o', 'radio', 'o')
            + f'</div><p class="ajuda" id="cd-trat-aj">Acerta a concordância da frase inteira.</p></fieldset>')
    end = p['end'] or {}
    proprio = not p['end_esc']
    caixa = (f'<div class="c6">{opcao("cd-end-esc", "Usar o endereço do escritório", "", p["end_esc"], "checkbox", "1").replace("<input", "<input id=cd-end-esc", 1)}'
             f'<p class="cd-end-ok" id="cd-end-ok"{" hidden" if proprio else ""}>{END_ESC}. Se o escritório mudar de endereço, os seus documentos mudam junto.</p></div>')
    ufs = [u for u, _ in UFS]
    campos_end = (f'<div class="c6" data-proprio{"" if proprio else " hidden"} style="display:contents">'
                  + campo('cd-cep', 'CEP', end.get('cep', ''), 'c2', im='numeric', ajuda='O T3jus completa a rua e o bairro.')
                  + campo('cd-rua', 'Endereço', end.get('rua', ''), 'c4', ajuda='Rua, número e sala.')
                  + campo('cd-bairro', 'Bairro', end.get('bairro', ''), 'c2')
                  + campo('cd-cidade', 'Cidade', end.get('cidade', ''), 'c2', erro=er('cidade'), foco=foco == 'cidade')
                  + selecao('cd-uf', 'UF', ufs, end.get('uf', ''), 'c2')
                  + '</div>')
    oab = ''.join(f'<span class="cd-uf" aria-hidden="true">{uf}</span>' for uf, *_ in p['oab'][:1])
    oab_t = ' e '.join(oab_curta(i) for i in p['oab'])
    if voce:
        quem_muda = f'<a href="{E}equipe-pessoa-dados">Corrigir na Equipe</a>' if p['dona'] else ''
        oab_txt = 'Para conferir. Quem muda a OAB é a sócia dona, na Equipe.' if not p['dona'] else 'Para conferir. Como sócia dona, você corrige na Equipe.'
    else:
        quem_muda = f'<a href="#">Editar inscrições</a>'
        oab_txt = 'As inscrições se mudam no quadro de inscrições da ficha.'
    corpo = (resumo
             + f'<h3 class="cd-h3 cd-sec">{"Quem você é" if voce else "Quem " + nome + " é"}</h3>'
             + campo('cd-completo', 'Nome completo', p['completo'], 'c6', ajuda=aj_nome, erro=er('completo'), foco=foco == 'completo', ac='name' if voce else 'off')
             + trat
             + campo('cd-nac', 'Nacionalidade', p['nac'], 'c2', ajuda='Ex.: brasileira.')
             + ops_ec(p['ec'])
             + campo('cd-cpf', 'CPF', p['cpf'] or '', 'c2', im='numeric', ajuda='' if er('cpf') else 'Conferimos os dígitos.', erro=er('cpf'), foco=foco == 'cpf')
             + campo('cd-rg', 'RG', p['rg'] or '', 'c3')
             + campo('cd-rgorg', 'Órgão emissor e UF', p['rg_org'] or '', 'c3', ajuda='Ex.: SSP/BA.')
             + f'<h3 class="cd-h3 cd-sec">{"Onde você atende" if voce else "Onde " + nome + " atende"}</h3>'
             + caixa + campos_end
             + campo('cd-email', 'E-mail profissional', p['email_prof'], 'c3', tipo='email', opc=True, ajuda='Só sai se o modelo pedir.')
             + campo('cd-tel', 'Telefone profissional', p['tel'], 'c3', tipo='tel', opc=True, im='tel', ajuda='Só sai se o modelo pedir.')
             + f'<h3 class="cd-h3 cd-sec">{"Sua OAB" if voce else "OAB de " + nome}</h3>'
             + f'<div class="cd-oab-ler">{oab}<p><b>{oab_t}</b>{oab_txt}</p>{quem_muda}</div>')
    tit = 'Seus dados para os documentos' if voce else f'Dados de {nome} para os documentos'
    sub = 'Os campos sem “(opcional)” entram na qualificação. Só o nome completo é obrigatório; o que ficar em branco sai marcado como falta.'
    return (f'<section class="folha cd-a-form" aria-labelledby="t-form"><div class="folha-cab"><div><h2 id="t-form">{tit}</h2><p class="sub">{sub}</p></div></div>'
            f'<form class="form-folha" id="cd-form" action="#" novalidate>{corpo}</form></section>')


def folha_previa(p, voce=True):
    marca = lambda s: f'<mark>{s}</mark>'
    q = qualificacao(p, marca=marca)
    f = faltas(p)
    n = 8 - len(f)
    if f:
        cont = f'<b>{n} de 8 dados.</b> Falta{"m" if len(f) > 1 else ""}: {lista_e(f)}. ' + ('O nome completo é obrigatório para salvar.' if 'nome completo' in f else 'Dá para salvar assim.')
    else:
        cont = '<b>8 de 8 dados.</b> A qualificação sai completa.'
    return (f'<section class="folha cd-a-prev" aria-labelledby="t-prev"><div class="folha-cab" style="padding-bottom:10px"><div><h2 id="t-prev" style="font-size:20px">'
            f'{"Como você sai" if voce else "Como " + pn(p) + " sai"} no contrato e na procuração</h2>'
            f'<p class="sub">Prévia da procuração. Muda enquanto {"você digita" if voce else "se digita"}.</p></div></div>'
            f'<div class="cd-papel" aria-live="polite"><p class="cd-tim"><span>Santana Advocacia</span><span>Procuração</span></p>'
            f'<p><b>OUTORGADA:</b> {q}, onde recebe intimações.</p></div>'
            f'<p class="cd-conta-prev" aria-live="polite">{cont}</p></section>')


def pe_form(p, voce=True):
    volta = K + 'conta-faltando' if voce else E + 'equipe-pessoa-dados'
    return (f'<section class="folha cd-a-pe" aria-label="Salvar"><div class="cd-pe-bts"><p>Vale para os documentos gerados daqui em diante. Os já gerados não mudam. '
            f'A mudança fica no histórico da equipe.</p><div class="cd-bts"><a class="btn btn-fantasma" href="{volta}">Cancelar</a>'
            f'<button class="btn btn-pri" type="submit" form="cd-form">{ico("check")}{"Salvar dados" if voce else "Salvar dados de " + pn(p)}</button></div></div></section>')


def pagina_editar(p, modo='conta', erros=None):
    voce = modo == 'conta'
    return (f'<div class="cd">{cabecalho(p, modo, editar=True)}<div class="cd-ed">{form_dados(p, modo, erros)}'
            f'<aside class="cd-a-prev" aria-label="Prévia">{folha_previa(p, voce)}</aside>{pe_form(p, voce)}</div></div>').replace(
        '<aside class="cd-a-prev" aria-label="Prévia"><section class="folha cd-a-prev"', '<aside class="cd-a-prev" aria-label="Prévia"><section class="folha"')


SCRIPT_END = r"""<script>
(function(){
  document.addEventListener('change',function(e){
    if(e.target.id!=='cd-end-esc') return;
    var esc=e.target.checked;
    document.querySelectorAll('[data-proprio]').forEach(function(x){x.hidden=esc});
    var ok=document.getElementById('cd-end-ok'); if(ok) ok.hidden=!esc;
  });
})();
</script>"""


def montar_pagina(titulo, desc, padrao, T):
    out = pagina(titulo, desc, padrao, '', T)
    out = com_conta(out, ico)
    out = out.replace('<span class="sr">, sua conta e sua OAB</span>', '<span class="sr">, sua conta e seus dados</span>')
    out = out.replace('Seus dados e sua OAB', 'Seus dados para os documentos')
    out = rebatizar(out)
    out = out.replace('</style>', CSS_HN + CSS + '\n</style>', 1)
    out = out.replace('</body>', SCRIPT_END + '\n</body>', 1)
    return out


if __name__ == '__main__':
    # ---------------------------------------------------------------- conta.html
    ED = dict(CAROL_FALTA, ec='CASADO', cpf='123.456.789-09')                  # no meio da edição: falta só o RG
    ERR = dict(CAROL_FALTA, completo='', ec='CASADO', cpf='123.456.789-00', cpf_ruim=True, end_esc=False,
               end=dict(cep='40020-010', rua='Rua Chile, 22, sala 301', bairro='Centro', cidade='', uf='BA'))
    ERROS = {'completo': ('Nome completo: escreva como na carteira', 'Escreva o nome completo, como na carteira da OAB. É o nome que sai nos documentos.'),
             'cpf': ('CPF: os dígitos não conferem', 'Os dois últimos dígitos não conferem com os 9 primeiros. Confira no seu documento.'),
             'cidade': ('Cidade: escreva a cidade', 'Escreva a cidade do endereço profissional, ou volte a marcar “Usar o endereço do escritório”.')}
    b = dict(atual='conta', trilha='Sua conta', titulo='Sua conta')
    T = ''
    T += tpl('conta-completa', pagina_ver(CAROL), quem='socio', **b)
    T += tpl('conta-faltando', pagina_ver(CAROL_FALTA), quem='socio', **b)
    T += tpl('conta-editar', pagina_editar(ED), quem='socio', **dict(b, trilha='Sua conta|Editar dados'))
    T += tpl('conta-erros', pagina_editar(ERR, erros=ERROS), quem='socio', **dict(b, trilha='Sua conta|Editar dados'))
    T += tpl('conta-salva', pagina_ver(CAROL) + toast('Seus dados foram salvos.', 'A qualificação sai completa nos documentos gerados daqui em diante. Os já gerados não mudam.'), quem='socio', **b)
    T += tpl('conta-sem-oab', pagina_ver(JULIA), quem='sem-area', **b)
    T += tpl('conta-nome-longo', pagina_ver(LONGA), quem='longa', **b)
    out = montar_pagina('Sua conta', 'Sua conta no Portal: seus dados para os documentos e a sua OAB.', '{"estado":"conta-completa","atual":"conta"}', T)
    open(f'{SAIDA}/conta.html', 'w', encoding='utf-8').write(out)
    print('conta ok', T.count('<template data-est='), 'estados')

    # ---------------------------------------------------------------- equipe.html (a sócia dona na ficha da pessoa)
    fb = dict(atual='equipe', trilha='Escritório|Equipe|Rafael Menezes', titulo='Rafael Menezes')
    RAF_ED = dict(RAFAEL, ec='SOLTEIRO')
    T = ''
    T += tpl('equipe-pessoa-dados', pagina_ver(RAFAEL, 'equipe'), quem='socio', **fb)
    T += tpl('equipe-pessoa-editar', pagina_editar(RAF_ED, 'equipe'), quem='socio', **dict(fb, trilha='Escritório|Equipe|Rafael Menezes|Dados'))
    out = montar_pagina('Equipe', 'Equipe do escritório no Portal: a ficha da pessoa com os dados para os documentos.', '{"estado":"equipe-pessoa-dados","atual":"equipe"}', T)
    open(f'{SAIDA}/equipe.html', 'w', encoding='utf-8').write(out)
    print('equipe ok', T.count('<template data-est='), 'estados')
