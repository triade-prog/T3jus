# Portal · Contratos: Contratos, Honorários, Procurações e modelos.
# CH-01 a CH-07; CH-08 e CH-09 são [VAL] (CH-09 só tem lugar reservado). Peças novas com prefixo ct-.
# O coração é o formulário de criar contrato com as condições de honorário (componente hn- do pecas.py).
# Uso: python3 contratos.py <pasta-saida>
import sys
from pecas import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'contratos.html?estado='
FICHA_CL = CLIENTES_URL + '?estado=ficha'


def cpf(b):
    d = [int(x) for x in b]
    for n in (10, 11):
        s = sum(v * (n - i) for i, v in enumerate(d)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:3]}.{s[3:6]}.{s[6:9]}-{s[9:]}'


CPF_BEN = cpf('274615938')

CSS = r"""
/* ==========================================================================
   Portal · Contratos (prefixo ct-)
   ========================================================================== */
.ct-casos{list-style:none;margin:0;padding:0 24px 12px}
.ct-casos li{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--divisor)}
.ct-casos li:first-child{border-top:0}
.ct-casos .ct-ci{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.ct-casos a{font-weight:500;color:var(--vinho);text-decoration:none;display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -12px}
.ct-casos a:hover{text-decoration:underline}
.ct-casos small{display:block;font-size:12px;color:var(--texto-2)}
.ct-totais{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:0 24px 16px;gap:0}
.ct-totais>div{padding:0 20px;border-left:1px solid var(--divisor)}
.ct-totais>div:first-child{border-left:0;padding-left:0}
.ct-totais p{font-size:13px;color:var(--texto-2)}
.ct-totais p.hn-res-grande{font-size:28px}
.ct-aviso{margin:0 24px 14px}
.ct-lembretes{list-style:none;margin:0;padding:0}
.ct-lembretes li{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 24px;border-top:1px solid var(--divisor)}
.ct-lembretes li:first-child{border-top:0}
.ct-lembretes li.ct-parado{background:#FCF6F2;box-shadow:inset 3px 0 0 var(--vinho-3)}
.ct-lembretes a.ct-nome{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);text-decoration:none;display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -10px}
.ct-lembretes p{font-size:13px;line-height:1.45}
.ct-lembretes small{display:block;font-size:12px;color:var(--texto-2)}
.ct-lembretes .ct-calc{font-size:13px}
.ct-lembretes .ct-calc b{font-weight:500}

/* Documentos e modelos */
.ct-modelos{list-style:none;margin:0;padding:0 24px 16px}
.ct-modelos li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 0;border-top:1px solid var(--divisor)}
.ct-modelos li:first-child{border-top:0}
.ct-modelos .ct-ci{width:44px;height:44px;border-radius:var(--raio);display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.ct-modelos strong{display:block;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);line-height:1.2}
.ct-modelos small{display:block;font-size:12px;color:var(--texto-2)}
.ct-modelos .ct-bts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.ct-doc-nome{display:flex;align-items:center;gap:10px}
.ct-doc-nome .ico{color:var(--vinho-4);flex:none}
.ct-doc-nome b{display:block;font-weight:500}

/* Prévia do documento (papel) */
.ct-papel-folha{padding:0 24px 24px}
.ct-papel{background:var(--papel);border:1px solid var(--borda-folha);border-radius:4px;box-shadow:0 10px 24px -16px rgba(42,26,34,.45);padding:22px 22px 26px;font-family:var(--serifa);font-size:14px;line-height:1.6;color:var(--tinta);position:relative}
.ct-papel::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:var(--vinho);border-radius:4px 4px 0 0}
.ct-timbre{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding-bottom:8px;margin-bottom:12px;border-bottom:1px solid var(--ambar-2);font-family:var(--sans);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--vinho-2)}
.ct-papel h3{font-family:var(--serifa);font-size:20px;font-weight:600;text-align:center;letter-spacing:.12em;color:var(--vinho);margin-bottom:10px}
.ct-papel p+p{margin-top:8px}
.ct-papel mark{background:var(--sal-2);color:inherit;border-radius:3px;padding:0 2px;box-shadow:inset 0 -2px 0 var(--vinho-4)}
.ct-papel mark.ct-falta{background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-3);font-family:var(--sans);font-size:12px;font-weight:500;padding:1px 6px}
.ct-papel .ct-mais{font-family:var(--sans);font-size:12px;color:var(--texto-2);margin-top:12px}
.ct-leg{display:flex;flex-wrap:wrap;gap:6px 16px;padding:0 24px 12px;font-size:12px;color:var(--texto-2)}
.ct-leg span{display:inline-flex;align-items:center;gap:6px}
.ct-leg i{width:14px;height:10px;border-radius:2px;display:inline-block}
.ct-arquivos{list-style:none;margin:0;padding:0 24px 8px}
.ct-arquivos li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--divisor)}
.ct-arquivos li:first-child{border-top:0}
.ct-arquivos .ct-ci{width:44px;height:44px;border-radius:var(--raio);display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.ct-arquivos b{display:block;font-weight:500;overflow-wrap:anywhere}
.ct-arquivos small{display:block;font-size:12px;color:var(--texto-2)}

.cm-motivos li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--divisor);font-size:13px}
.cm-motivos li:first-child{border-top:0}
.cm-motivos b{font-weight:500}

@media (max-width:760px){
  .cm-motivos{padding:0 16px 14px!important}
  .ct-casos{padding:0 16px 8px}
  .ct-casos li{grid-template-columns:40px minmax(0,1fr)}
  .ct-casos li>.selo{grid-column:2;justify-self:start}
  .ct-totais{grid-template-columns:1fr;padding:0 16px 14px;gap:12px}
  .ct-totais>div{border-left:0;padding:12px 0 0;border-top:1px solid var(--divisor)}
  .ct-totais>div:first-child{border-top:0;padding-top:0}
  .ct-aviso{margin:0 16px 12px}
  .ct-lembretes li{grid-template-columns:1fr;gap:8px;padding:14px 16px}
  .ct-lembretes li .btn{width:100%}
  .ct-modelos{padding:0 16px 12px}
  .ct-modelos li{grid-template-columns:44px minmax(0,1fr)}
  .ct-modelos .ct-bts{grid-column:1/-1;justify-content:stretch}
  .ct-modelos .ct-bts .btn{flex:1 1 auto}
  .ct-papel-folha{padding:0 16px 16px}
  .ct-papel{padding:18px 14px 20px;font-size:13.5px}
  .ct-leg{padding:0 16px 10px}
  .ct-arquivos{padding:0 16px 8px}
  .ct-arquivos li{grid-template-columns:44px minmax(0,1fr)}
  .ct-arquivos li .btn{grid-column:1/-1;width:100%}
}
"""

# ---------------------------------------------------------------- lista
SIT = {'ativo': ('ativo', 'Ativo', None), 'elab': ('andamento', 'Em elaboração', 'lapis'), 'enc': ('neutro', 'Encerrado', 'pasta')}

CONTRATOS = [
    ('C-2026-033', 'Benedito Souza Lima', 'Aposentadoria por idade', [('parcelado', ' 3 ×'), ('exito', ' 30%'), ('recorrente', ' 30%')], 'Marina Ribeiro', '<span class="hn-sem">depois da assinatura</span>', 'elab', U + 'criado'),
    ('C-2026-022', 'Hélio Batista Corrêa', 'Aposentadoria especial', [('exito', ' 30%'), ('recorrente', ' 30%')], 'Marina Ribeiro', selo('urgente', 'base de novembro a pedir', 'alerta'), 'ativo', U + 'honorarios'),
    ('C-2026-031', 'Antônia Ferreira Prado', 'Pensão por morte', [('parcelado', ' 6 × R$ 500,00'), ('exito', ' 30%'), ('sucumbencia', '')], 'Marina Ribeiro', '<b class="num">10/12 · R$ 500,00</b><small>parcela 3 de 6</small>', 'ativo', '#'),
    ('C-2026-019', 'Farmácia Bom Jesus Ltda.', 'Cobranças e consultivo', [('mensal', ' R$ 1.800,00'), ('ato', ' R$ 450,00'), ('sucumbencia', '')], 'Felipe Matos', '<b class="num">10/12 · R$ 2.250,00</b><small>mensalidade e 1 audiência</small>', 'ativo', U + 'contrato'),
    ('C-2026-021', 'Irene Castro', 'Inventário', [('parcelado', ' 10 × R$ 1.200,00')], 'Marina Ribeiro', '<b class="num">05/12 · R$ 1.200,00</b><small>parcela 3 de 10</small>', 'ativo', '#'),
    ('C-2026-024', 'Construtora Vale Alto Ltda.', 'Consultivo trabalhista', [('mensal', ' R$ 2.500,00')], 'Felipe Matos', '<b class="num">15/12 · R$ 2.500,00</b><small>mensalidade 4</small>', 'ativo', '#'),
]


def lista_contratos():
    linhas = []
    for n, cli, obj, hon, resp, prox, sit, href in CONTRATOS:
        t, nome, i = SIT[sit]
        selos = '<div class="hn-selos">' + ''.join(selo_tipo(k, v) for k, v in hon) + '</div>'
        cls = 'hn-venc' if 'urgente' in prox else ''
        linhas.append(([f'<div class="esc"><div><a href="{href}">{H(cli)}</a><small>{n} · {obj}</small></div></div>', selos, resp, f'<div>{prox}</div>', selo(t, nome, i)], cls))
    return tabela('Contratos', ['Contrato', 'Honorários', 'Responsável', 'Próximo recebimento', 'Situação'], linhas, ['27%', '29%', '14%', '17%', '13%'])


def cab_lista():
    return ('<div class="cabeca-ambar campo-ambar cabeca-equipe hn-cab-ambar"><div><p class="sobretitulo">Contratos de honorários</p><h1>Contratos</h1><span class="fio" aria-hidden="true"></span>'
            '<p class="lede">Cada contrato liga o cliente aos casos, diz quem responde por ele e o que se combinou de honorários. Das condições sai a programação dos recebimentos que o Financeiro acompanha.</p></div>'
            f'<a class="btn btn-escuro" href="{U}novo-tipos" style="margin-bottom:6px">{ico("mais")}Novo contrato</a></div>')


def contratos():
    chips = ('<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="true">Ativos e em elaboração (15)</button>'
             '<button type="button" aria-pressed="false">Encerrados (4)</button>'
             f'<button type="button" aria-pressed="false">{ico("alerta", "ico ico-s")}Base do mês a pedir (1)</button></div>')
    ferr = (f'<form class="hn-ferr" role="search" action="#" onsubmit="return false"><div class="campo-busca"><label class="sr" for="ct-b">Buscar por cliente, número ou caso</label>{ico("busca")}'
            f'<input class="entrada" id="ct-b" type="search" placeholder="Cliente, número do contrato ou do processo" autocomplete="off"></div>{chips}</form>')
    return (f'<div class="hn">{cab_lista()}<section class="folha" aria-labelledby="t-cl" style="overflow:hidden"><h2 id="t-cl" class="sr">Lista de contratos</h2>{ferr}'
            f'<p class="hn-cont" role="status"><b>15 contratos</b> · 14 ativos e 1 em elaboração · do recebimento mais próximo para o mais distante</p>{lista_contratos()}'
            f'<div class="mais"><span>Mostrando 6 de 15</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais 9</button></div></section></div>')


def contratos_vazio():
    return (f'<div class="hn">{cab_lista()}<section class="folha" aria-labelledby="t-cl" style="overflow:hidden"><h2 id="t-cl" class="sr">Lista de contratos</h2>'
            + estado('Nenhum contrato ainda',
                     'Um contrato nasce de uma proposta aceita, com as condições já preenchidas, ou direto aqui. Escolha o cliente, os casos e os honorários: a programação dos recebimentos sai sozinha.',
                     'pena', moldura=False,
                     acoes=f'<a class="btn btn-sec" href="comercial.html?estado=propostas">{ico("maleta")}Ver propostas aceitas</a><a class="btn btn-pri" href="{U}novo-tipos">{ico("mais")}Criar o primeiro contrato</a>')
            + '</section></div>')


# ---------------------------------------------------------------- o formulário (o coração)
def passo(n, titulo, sub='', primeiro=False):
    s = f'<small>{sub}</small>' if sub else ''
    return f'<div class="hn-passo{" hn-primeiro" if primeiro else ""}"><span class="disco" aria-hidden="true"><span>{n}</span></span><div><h3>{titulo}</h3>{s}</div></div>'


def escolhido(ini, nome, sub, id_='nv-cli'):
    return (f'<div class="hn-bloco"><p style="font-weight:500;margin-bottom:6px" id="{id_}-r">Cliente</p><div class="hn-escolhido" role="group" aria-labelledby="{id_}-r">'
            f'<span class="av-p forte" aria-hidden="true">{ini}</span><div><strong>{nome}</strong><small>{sub}</small></div>'
            f'<button class="btn btn-sec btn-compacto" type="button">{ico("trocar")}Trocar cliente</button></div></div>')


def advogados(marcados=('Marina Ribeiro',), erro=False):
    er = f'<p class="erro-msg" id="nv-adv-er">{ico("alerta", "ico ico-s")}Marque pelo menos um advogado. Sem ele, o contrato e a procuração não têm quem assine pelo escritório.</p>' if erro else ''
    a = ' aria-describedby="nv-adv-aj nv-adv-er"' if erro else ' aria-describedby="nv-adv-aj"'
    ops = ''.join(opcao('nv-adv', n, o, n in marcados) for n, o in OAB.items())
    return (f'<fieldset class="grupo-opcoes c6" id="nv-adv"{a}><legend>Advogados no contrato e na procuração</legend><div class="hn-ops3">{ops}</div>'
            f'<p class="ajuda" id="nv-adv-aj">Nome e OAB saem da Equipe. Vão como contratados e outorgados.</p>{er}</fieldset>')


def c_parcelado(n=1, total='2.000,00', qtd='3', prim='10/12/2026', erro_prim=False,
                gera_txt='3 parcelas: 2 de R$ 666,67 e 1 de R$ 666,66, todo dia 10, de 10/12/2026 a 10/02/2027. A soma dá R$ 2.000,00 exatos.'):
    e = 'Esta data já passou. Escolha hoje ou depois. Parcela que o cliente já pagou se registra no Financeiro.' if erro_prim else ''
    campos = (campo(f'c{n}-total', 'Valor total', total, 'c2', im='decimal', antes='R$')
              + campo(f'c{n}-qtd', 'Parcelas', qtd, 'c2', im='numeric', ajuda='De 1 a 120.')
              + campo(f'c{n}-prim', 'Primeiro vencimento', '10/11/2026' if erro_prim else prim, 'c2', im='numeric', ajuda='' if erro_prim else 'dd/mm/aaaa. As outras, no mesmo dia dos meses seguintes.', erro=e))
    gera = 'Ajuste o primeiro vencimento para ver as parcelas.' if erro_prim else gera_txt
    return cond_editar(n, 'parcelado', campos, gera, erros=1 if erro_prim else 0)


def c_fixo(n=1, valor='1.500,00', venc='25/11/2026'):
    campos = (campo(f'c{n}-valor', 'Valor', valor, 'c3', im='decimal', antes='R$')
              + campo(f'c{n}-venc', 'Vencimento', venc, 'c3', im='numeric', ajuda='dd/mm/aaaa'))
    return cond_editar(n, 'fixo', campos, f'R$ {valor} a receber em {venc}. Serve de entrada, junto com as parcelas.')


ETAPAS = ['Pagamento da RPV ou precatório', 'Sentença', 'Acordo homologado', 'Alvará levantado', 'Benefício implantado', 'Pagamento da sucumbência']


def c_exito(n=2, erro=False):
    campos = (campo(f'c{n}-pct', 'Percentual', '' if erro else '30', 'c2', im='decimal', depois_in='%', erro='Escreva o percentual, de 1 a 100. Ex.: 30.' if erro else '')
              + selecao(f'c{n}-sobre', 'Sobre o quê', ['Atrasados que o cliente receber', 'Valor da condenação', 'Valor do acordo', 'Proveito econômico', 'Outro'], 'Atrasados que o cliente receber', 'c4')
              + selecao(f'c{n}-etapa', 'Vira cobrança quando o caso chegar a', ETAPAS, '' if erro else 'Pagamento da RPV ou precatório', 'c4',
                        ajuda='' if erro else 'As etapas são as do Jurídico do escritório.',
                        erro='Escolha a etapa. Sem ela, ninguém é avisado na hora de cobrar.' if erro else '')
              + campo(f'c{n}-dias', 'Vencimento', '15', 'c2', im='numeric', depois_in='dias', ajuda='depois da etapa'))
    gera = ('Escolha o percentual e a etapa para ver o que esta condição gera.' if erro else
            '30% dos atrasados, com vencimento 15 dias depois de o caso chegar a “Pagamento da RPV ou precatório”. Nessa hora, quem marca a etapa informa o valor e o Financeiro é avisado.')
    return cond_editar(n, 'exito', campos, gera, erros=2 if erro else 0)


def c_recorrente(n=3):
    base = ('<fieldset class="grupo-opcoes"><legend>A base</legend><div class="hn-ops">'
            + opcao(f'c{n}-base', 'Muda todo mês', 'Alguém informa o valor a cada mês, como o benefício no contracheque.', True, 'radio')
            + opcao(f'c{n}-base', 'É sempre a mesma', 'Nesse caso, prefira o tipo Mensal.', False, 'radio') + '</div></fieldset>')
    campos = (campo(f'c{n}-pct', 'Percentual', '30', 'c2', im='decimal', depois_in='%')
              + campo(f'c{n}-sobre', 'Sobre o quê', 'Benefício mensal do cliente', 'c4', ajuda='Aparece no lembrete e no contrato.')
              + selecao(f'c{n}-ini', 'Começa quando o caso chegar a', ETAPAS, 'Benefício implantado', 'c4', vazio='Numa data')
              + campo(f'c{n}-dia', 'Cobrar todo dia', '10', 'c2', im='numeric')
              + campo(f'c{n}-meses', 'Por quantos meses', '12', 'c2', im='numeric', depois_in='meses')
              + campo(f'c{n}-lemb', 'Pedir a base todo dia', '5', 'c2', im='numeric', ajuda='Cinco dias antes de cobrar.')
              + base
              + selecao(f'c{n}-quem', 'Quem recebe o lembrete', ['O responsável pelo contrato'] + EQUIPE, 'O responsável pelo contrato', 'c4', vazio='')
              + f'<div class="c6">{opcao(f"c{n}-whats", "Pedir também ao cliente, pelo WhatsApp do escritório", "A mensagem pede o extrato do benefício do mês. A resposta chega em Conversas.", False)}</div>')
    gera = ('12 cobranças de 30% do benefício, todo dia 10, a partir da implantação. Todo dia 5, o responsável recebe o lembrete para pedir a base; '
            'o valor de cada mês sai quando ela for informada. Se a base não chegar, a cobrança aparece como parada em Honorários.')
    return cond_editar(n, 'recorrente', campos, gera)


def resumo_corpo(variante=''):
    if variante == 'tipos':
        prog = ''.join(f'<li><time class="num">10/{m}</time><span>Parcela {i} de 6</span><b class="num">R$ 1.000,00</b></li>'
                       for i, m in enumerate(['12/2026', '01/2027', '02/2027', '03/2027', '04/2027', '05/2027'], 1))
        corpo = (f'<div class="hn-res-bloco"><h3>Valor certo</h3><p class="hn-res-grande num">R$ 7.500,00</p>'
                 f'<p><small>Fixo R$ 1.500,00 + parcelado R$ 6.000,00</small></p></div>'
                 f'<div class="hn-res-bloco"><h3>Programação dos recebimentos</h3><ol class="hn-prog">'
                 f'<li><time class="num">25/11/2026</time><span>Fixo (entrada)</span><b class="num">R$ 1.500,00</b></li>{prog}</ol></div>')
    else:
        ex = '<p><b>Êxito:</b> <i>falta o percentual e a etapa</i></p>' if variante == 'erros' else '<p><b>30% dos atrasados</b><br><small>quando a RPV ou o precatório for pago</small></p>'
        corpo = (f'<div class="hn-res-bloco"><h3>Valor certo</h3><p class="hn-res-grande num">R$ 2.000,00</p><p><small>em 3 parcelas</small></p></div>'
                 f'<div class="hn-res-bloco"><h3>Depende do caso</h3>{ex}<p style="margin-top:6px"><b>30% do benefício por 12 meses</b><br><small>depois da implantação; base pedida todo dia 5</small></p></div>'
                 f'<div class="hn-res-bloco"><h3>Programação dos recebimentos</h3><ol class="hn-prog">'
                 + ('<li><time>—</time><span>Parcelas 1 a 3</span><b>acerte a data</b></li>' if variante == 'erros' else
                    '<li><time class="num">10/12/2026</time><span>Parcela 1 de 3</span><b class="num">R$ 666,67</b></li>'
                    '<li><time class="num">10/01/2027</time><span>Parcela 2 de 3</span><b class="num">R$ 666,67</b></li>'
                    '<li><time class="num">10/02/2027</time><span>Parcela 3 de 3</span><b class="num">R$ 666,66</b></li>')
                 + '<li class="hn-var"><time>na etapa</time><span>Êxito de 30%</span><b>a definir</b></li>'
                 '<li class="hn-var"><time>mês a mês</time><span>30% do benefício, 12 vezes</span><b>a definir</b></li></ol></div>')
    corpo += f'<p class="hn-pe" style="border-top:1px solid var(--divisor)">{ico("carteira")}<span>O Financeiro vê esta programação em A receber quando a assinatura for registrada.</span></p>'
    return corpo


def resumo_lateral(variante=''):
    corpo = resumo_corpo(variante)
    return (f'<section class="folha hn-resumo" aria-labelledby="t-res"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-res" style="font-size:20px">O que este contrato gera</h2>'
            f'<p class="sub">Atualiza enquanto você preenche.</p></div></div>{corpo}</section>')


def form_novo(variante=''):
    erros = variante == 'erros'
    vazio = variante == 'tipos'
    r = ''
    if erros:
        r += ('<div class="hn-resumo-erros">' + aviso('urgencia', 'Falta acertar 4 pontos, marcados abaixo.', 'O contrato ainda não foi criado. Nada do que você escreveu se perdeu.',
              acoes=('<ul><li><a href="#nv-adv">Advogados no contrato: marque pelo menos um</a></li>'
                     '<li><a href="#c1-prim">Condição 1, Parcelado: o primeiro vencimento já passou</a></li>'
                     '<li><a href="#c2-pct">Condição 2, Êxito: falta o percentual</a></li>'
                     '<li><a href="#c2-etapa">Condição 2, Êxito: falta a etapa que gera a cobrança</a></li></ul>')) + '</div>')
    elif not vazio:
        r += ('<div class="c6">' + aviso('info', 'Veio da proposta P-2026-014, aceita em 17/11.',
              'Cliente, objeto, responsável e as 3 condições de honorário foram copiados da proposta. Confira, ajuste se for preciso e crie o contrato.', icone='maleta') + '</div>')
    r += passo(1, 'Cliente e casos', 'O contrato é sempre de um cliente; pode cobrir mais de um caso', True)
    if vazio:
        r += escolhido('EN', 'Eduardo Nascimento', 'Pessoa física · qualificação: 7 de 7 dados para o contrato')
        r += campo('nv-obj', 'Objeto do contrato', 'Inventário extrajudicial dos bens de Olga Nascimento', 'c6', ajuda='O serviço contratado, como vai no documento.')
        r += (f'<div class="c6"><p class="pt-comuns">{ico("balanca")}<span>Eduardo ainda não tem caso no Jurídico. O contrato pode ser criado agora e o caso, ligado depois, quando existir.</span></p></div>')
    else:
        r += escolhido('BL', 'Benedito Souza Lima', 'Pessoa física · qualificação: 6 de 7 dados para o contrato (falta o RG)')
        r += campo('nv-obj', 'Objeto do contrato', 'Aposentadoria por idade: pedido no INSS e, se negado, ação na Justiça Federal até o pagamento dos atrasados', 'c6',
                   ajuda='O serviço contratado, como vai no documento.')
        r += ('<fieldset class="grupo-opcoes c6"><legend>Casos deste contrato</legend>'
              + opcao('nv-caso', 'Aposentadoria por idade · requerimento no INSS', 'Aberto em 18/11 por Larissa Costa · etapa: Documentos', True)
              + '<p class="ajuda">Um processo pode ter mais de um cliente; cada cliente tem o próprio contrato. Caso que ainda não existe pode ser ligado depois.</p></fieldset>')
    r += passo(2, 'Responsáveis', 'Ninguém fica sem dono: se a pessoa sair da equipe, o contrato passa para outra')
    r += selecao('nv-resp', 'Responsável pelo contrato', EQUIPE, 'Marina Ribeiro (você)', 'c3', vazio='',
                 ajuda='Recebe os lembretes: base do mês, etapa que gera cobrança e assinatura pendente.')
    r += f'<div class="c3"></div>' if False else ''
    r += advogados(() if erros else ('Marina Ribeiro', 'Felipe Matos') if not vazio else ('Marina Ribeiro',), erro=erros)
    r += passo(3, 'Condições de honorário', 'Marque os tipos; cada um abre um bloco que diz o que gera')
    if vazio:
        r += ('<div class="hn-bloco">' + marcar_tipos(('fixo', 'parcelado')) + c_fixo(1)
              + c_parcelado(2, '6.000,00', '6', '10/12/2026', gera_txt='6 parcelas de R$ 1.000,00, todo dia 10, de 10/12/2026 a 10/05/2027. A soma dá R$ 6.000,00 exatos.') + '</div>')
    else:
        r += ('<div class="hn-bloco">' + marcar_tipos(('parcelado', 'exito', 'recorrente')) + c_parcelado(erro_prim=erros) + c_exito(erro=erros) + c_recorrente() + '</div>')
    r += passo(4, 'Cláusulas do escritório', 'Opcional')
    r += texto('nv-obs', 'Observações que vão no contrato', 'Inventário pelo cartório, com todos os herdeiros de acordo.' if vazio else 'Custas, perícias e despesas do processo ficam por conta do cliente e não entram nos honorários.', opc=True,
               ajuda='O resto do texto vem do modelo de contrato do escritório.')
    r += (f'<section class="c6 so-cel hn-res-dentro" aria-labelledby="t-res-cel"><h2 id="t-res-cel">O que este contrato gera</h2>'
          + resumo_corpo(variante) + '</section>')
    r += (f'<div class="form-pe"><span class="esq-pe">O contrato nasce em elaboração. Gere o documento, colha a assinatura e registre-a: aí a programação vai para o Financeiro. Tudo fica no histórico, com seu nome e a hora.</span>'
          f'<a class="btn btn-fantasma" href="{U}contratos">Cancelar</a><button class="btn btn-pri" type="submit">{ico("check")}Criar contrato</button></div>')
    return (f'<section class="folha" aria-labelledby="t-nv"><div class="folha-cab"><div><h2 id="t-nv">Dados do contrato</h2>'
            f'<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div><form class="form-folha" action="#" novalidate>{r}</form></section>')


def pagina_novo(variante=''):
    cab = '<div class="pt-cab"><div><p class="sobretitulo">Contratos</p><h1>Novo contrato</h1><span class="fio" aria-hidden="true"></span></div></div>'
    return (f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{form_novo(variante)}</div>'
            f'<aside class="hn-col so-pc" aria-label="Resumo do contrato">{resumo_lateral(variante)}</aside></div></div>')


# ---------------------------------------------------------------- ficha do contrato
def ficha_cab_c(numero, cliente, sit, obj, dir_html):
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("pena", "ico estatua")}'
            f'<a class="voltar" href="{U}contratos">{ico("esq", "ico ico-s")}Contratos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Contrato {numero}</p><h1>{cliente}</h1>'
            f'<p class="meta">{sit}<span>{obj}</span></p></div></div></div>{dir_html}</div>')


def abas_c(atual, base):
    a = (f'<a data-aba="contrato" href="{base}">Contrato</a><a data-aba="recebimentos" href="{U}contrato-recebimentos">Recebimentos<span class="q">14</span></a>'
         f'<a data-aba="documentos" href="{U}procuracoes">Documentos<span class="q">2</span></a>')
    return f'<nav class="abas" aria-label="Seções do contrato">{a}</nav>'


COND_FAR = [
    cond_ler('mensal', 'R$ 1.800,00 <small>por mês</small>', 'Todo dia 10, desde 10/09/2026, sem prazo para acabar. Reajuste em setembro pelo IPCA.',
             'Uma cobrança por mês, programada 12 meses à frente.'),
    cond_ler('ato', 'R$ 450,00 <small>por audiência</small>', 'E R$ 200,00 por diligência fora da capital.',
             'Quando a audiência é marcada como realizada no caso, vira valor a receber no dia 10 seguinte.'),
    cond_ler('sucumbencia', 'Do escritório <small>inteira</small>', 'Fixada pelo juiz em cada ação de cobrança. Pertence ao advogado (Estatuto da Advocacia, art. 23).',
             'Vira valor a receber quando o caso chegar a “Pagamento da sucumbência”.'),
]


def casos_far():
    def c(t, sub, et):
        return f'<li><span class="ct-ci">{ico("balanca")}</span><div><a href="#">{t}</a><small>{sub}</small></div>{et}</li>'
    return (f'<section class="folha" aria-labelledby="t-cs"><div class="folha-cab"><div><h2 id="t-cs">Casos deste contrato</h2><p class="sub">3 casos no Jurídico</p></div>'
            f'<div class="acoes"><button class="btn btn-sec" type="button">{ico("mais")}Ligar caso</button></div></div><ul class="ct-casos">'
            + c('Cobrança · Mercado Ponto Certo', '<span class="num">1004417-22.2026.8.26.0100</span>', selo('andamento', 'Audiência realizada'))
            + c('Cobrança · Clínica Vida Plena', '<span class="num">1012238-90.2026.8.26.0100</span>', selo('neutro', 'Citação'))
            + c('Consultivo de contratos e trabalhista', 'Sem processo', selo('neutro', 'Em andamento'))
            + '</ul></section>')


def pessoas_far():
    return (f'<section class="folha" aria-labelledby="t-rs"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-rs" style="font-size:20px">Responsáveis</h2></div></div><ul class="hn-pessoas">'
            f'<li><span class="av-p forte" aria-hidden="true">FM</span><div><strong>Felipe Matos</strong><small>Responsável · {OAB["Felipe Matos"]}</small></div>{selo("ativo", "Recebe os lembretes")}</li>'
            f'<li><span class="av-p forte" aria-hidden="true">LC</span><div><strong>Larissa Costa</strong><small>Advogada no contrato · {OAB["Larissa Costa"]}</small></div></li></ul></section>')


def assinatura_far():
    return (f'<section class="folha" aria-labelledby="t-as"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-as" style="font-size:20px">Assinatura</h2></div></div>'
            f'<dl class="hn-dl"><div><dt>Assinado em</dt><dd>02/09/2026</dd></div><div><dt>Registrado por</dt><dd>Felipe Matos</dd></div>'
            f'<div><dt>Arquivo assinado</dt><dd><a href="#">contrato-assinado.pdf</a></dd></div><div><dt>Veio da proposta</dt><dd><a href="comercial.html?estado=propostas">P-2026-006</a></dd></div></dl>'
            f'<div class="hn-reserva"><div>{ico("lapis")}<span><b>Assinatura eletrônica:</b> em estudo. Por enquanto, imprime-se, assina-se e anexa-se o arquivo assinado.</span></div></div></section>')


def situacao_far():
    return (f'<section class="folha" aria-labelledby="t-st"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-st" style="font-size:20px">Situação</h2></div></div>'
            f'<div class="hn-folha-acao"><p>Ativo desde 02/09/2026. Mudar uma condição pede o motivo e refaz só os recebimentos futuros. Encerrar para as cobranças novas; nada é apagado.</p>'
            f'<button class="btn btn-perigo" type="button">{ico("pasta")}Encerrar contrato</button></div></section>')


def dir_far():
    return (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p>'
            f'<div class="hn-dir-linha"><p class="grande">10/12</p>{selo("ativo", "R$ 2.250,00")}</div>'
            f'<p class="hn-oque"><b>Mensalidade 4 e a audiência de 12/11</b><br>no Financeiro, em A receber</p>'
            f'<a class="btn btn-pri" href="{U}contrato-recebimentos">{ico("carteira")}Ver recebimentos</a></section>')


SIT_ATIVO = '<span class="selo selo-ativo">Ativo</span>'


def contrato_far():
    cab = ficha_cab_c('C-2026-019', 'Farmácia Bom Jesus Ltda.', SIT_ATIVO, 'Cobranças e consultivo', dir_far())
    corpo = conds_ler(COND_FAR, sub='O que se combinou. Cada condição diz o que gera.', acoes=f'<button class="btn btn-sec" type="button">{ico("lapis")}Mudar condições</button>') + casos_far()
    return f'<div class="hn">{cab}{abas_c("contrato", U + "contrato")}<div class="hn-grade"><div class="hn-col">{corpo}</div><aside class="hn-col" aria-label="Sobre o contrato">{pessoas_far()}{assinatura_far()}{situacao_far()}</aside></div></div>'


AVISO_ETAPA = aviso('info', 'A audiência de 12/11 virou cobrança.',
                    'Larissa Costa marcou a audiência como realizada no processo 1004417-22.2026.8.26.0100, em 13/11. Entrou R$ 450,00 a receber em 10/12, e o Financeiro foi avisado.', icone='balanca')


def recebimentos(financeiro=True):
    rows = [
        ('10/09/2026', 'Mensalidade 1', 'mensal', 180000, ('ok', 'Pago em 10/09', 'check'), ''),
        ('10/10/2026', 'Mensalidade 2', 'mensal', 180000, ('ok', 'Pago em 14/10', 'check'), ''),
        ('10/11/2026', 'Mensalidade 3', 'mensal', 180000, ('ok', 'Pago em 10/11', 'check'), ''),
        ('10/11/2026', 'Audiência de 21/10 · Mercado Ponto Certo', 'ato', 45000, ('ok', 'Pago em 10/11', 'check'), ''),
        ('10/12/2026', 'Mensalidade 4', 'mensal', 180000, ('andamento', 'Previsto', None), ''),
        ('10/12/2026', 'Audiência de 12/11 · Mercado Ponto Certo', 'ato', 45000, ('andamento', 'Previsto', None), 'hn-novo'),
        ('10/01/2027', 'Mensalidade 5', 'mensal', 180000, ('andamento', 'Previsto', None), ''),
        ('10/02/2027', 'Mensalidade 6', 'mensal', 180000, ('andamento', 'Previsto', None), ''),
        ('na etapa', 'Sucumbência das ações de cobrança', 'sucumbencia', None, ('neutro', 'Esperando a etapa', 'relogio'), ''),
    ]
    linhas = []
    for d, oque, k, v, (st, sn, si), cls in rows:
        novo = ' <span class="selo selo-ativo">Novo</span>' if cls else ''
        cel = [f'<b class="num">{d}</b>', f'{oque}{novo}', selo_tipo(k), f'<span class="num hn-valor-c">{brl(v) if v else "a definir"}</span>']
        if financeiro:
            cel.append(selo(st, sn, si))
        linhas.append((cel, cls))
    cols = ['Vencimento', 'O quê', 'Condição', 'Valor'] + (['Situação'] if financeiro else [])
    larg = ['14%', '34%', '18%', '15%', '19%'] if financeiro else ['16%', '40%', '22%', '22%']
    tab = tabela('Programação dos recebimentos', cols, linhas, larg)
    tot = (f'<div class="ct-totais">'
           + (f'<div><p>Recebido até hoje</p><p class="hn-res-grande num">R$ 5.850,00</p></div>' if financeiro else '')
           + f'<div><p>Programado até 10/09/2027</p><p class="hn-res-grande num">R$ 18.450,00</p></div>'
           f'<div><p>Depende do caso</p><p class="hn-res-grande">Sucumbência</p></div></div>')
    pe = (f'<p class="hn-pe">{ico("carteira")}<span>É a mesma programação que o Financeiro vê em A receber. Pagamentos, atrasos e baixas são registrados lá.</span></p>' if financeiro else
          f'<p class="hn-pe">{ico("cadeado")}<span>Se cada recebimento foi pago ou está em atraso fica no Financeiro, que não está liberado para você. Quem libera é Marina Ribeiro, a sócia dona.</span></p>')
    folha = (f'<section class="folha" aria-labelledby="t-rc" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-rc">Programação dos recebimentos</h2>'
             f'<p class="sub">Gerada das condições do contrato. Mostra os próximos 3 meses; a mensalidade segue todo dia 10.</p></div></div>'
             f'<div class="ct-aviso">{AVISO_ETAPA}</div>{tot}{tab}{pe}</section>')
    cab = ficha_cab_c('C-2026-019', 'Farmácia Bom Jesus Ltda.', SIT_ATIVO, 'Cobranças e consultivo', dir_far())
    return f'<div class="hn">{cab}{abas_c("recebimentos", U + "contrato")}{folha}</div>'


# ---------------------------------------------------------------- contrato recém-criado
def criado():
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-px"><p class="sobretitulo" id="t-px">Próximo passo</p>'
         f'<p class="grande" style="font-size:30px">Assinatura</p>'
         f'<p class="hn-oque"><b>Gere os documentos e colha a assinatura em 20/11.</b><br>Ao registrar a assinatura, a programação vai ao Financeiro.</p>'
         f'<div class="hn-dir-acoes"><a class="btn btn-pri" href="{U}gerar">{ico("doc")}Gerar documentos</a><button class="btn btn-sec" type="button">{ico("check")}Registrar assinatura</button></div></section>')
    cab = ficha_cab_c('C-2026-033', 'Benedito Souza Lima', '<span class="selo selo-ativo">Em elaboração</span>', 'Aposentadoria por idade', d)
    conds = [
        cond_ler('parcelado', 'R$ 2.000,00 <small>em 3 parcelas: 2 de R$ 666,67 e 1 de R$ 666,66</small>', 'Todo dia 10, de 10/12/2026 a 10/02/2027.', 'Vira 3 recebimentos programados.'),
        cond_ler('exito', '30% <small>dos atrasados que o cliente receber</small>', 'Quando o caso chegar a “Pagamento da RPV ou precatório”, com vencimento 15 dias depois.', 'Avisa o Financeiro na etapa.'),
        cond_ler('recorrente', '30% <small>do benefício mensal, por 12 meses</small>', 'A partir de “Benefício implantado”, todo dia 10. A base é pedida todo dia 5.', 'Lembrete para Marina Ribeiro.'),
    ]
    caso = (f'<section class="folha" aria-labelledby="t-cs"><div class="folha-cab"><div><h2 id="t-cs">Casos deste contrato</h2><p class="sub">1 caso no Jurídico</p></div></div><ul class="ct-casos">'
            f'<li><span class="ct-ci">{ico("balanca")}</span><div><a href="#">Aposentadoria por idade · requerimento no INSS</a><small>Aberto em 18/11 por Larissa Costa</small></div>{selo("neutro", "Documentos")}</li></ul></section>')
    resp = (f'<section class="folha" aria-labelledby="t-rs"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-rs" style="font-size:20px">Responsáveis</h2></div></div><ul class="hn-pessoas">'
            f'<li><span class="av-p forte" aria-hidden="true">MR</span><div><strong>Marina Ribeiro</strong><small>Responsável · {OAB["Marina Ribeiro"]}</small></div>{selo("ativo", "Recebe os lembretes")}</li>'
            f'<li><span class="av-p forte" aria-hidden="true">FM</span><div><strong>Felipe Matos</strong><small>Advogado no contrato · {OAB["Felipe Matos"]}</small></div></li></ul></section>')
    hist = (f'<section class="folha" aria-labelledby="t-hc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-hc" style="font-size:20px">Histórico</h2></div></div>'
            f'<div class="eventos-dia"><h3>18/11/2026 · hoje</h3><ol class="eventos"><li><time>15h02</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> criou o contrato{selo("ativo", "Novo")}</p><small>Da proposta P-2026-014, com 3 condições.</small></div></li></ol></div></section>')
    t = toast('Contrato C-2026-033 criado.', 'Veio da proposta P-2026-014, que agora mostra “Virou contrato”. Falta gerar os documentos e registrar a assinatura.')
    return (f'<div class="hn">{cab}{abas_c("contrato", U + "criado")}<div class="hn-grade"><div class="hn-col">{conds_ler(conds, sub="Copiadas da proposta aceita.")}{caso}</div>'
            f'<aside class="hn-col" aria-label="Sobre o contrato">{resp}{hist}</aside></div></div>{t}')


# ---------------------------------------------------------------- Honorários
def j_base(abrir=True):
    corpo = (campo('bs-valor', 'Valor do benefício de novembro', '2.910,00', 'c6', im='decimal', antes='R$', foco=True, ajuda='O valor bruto que aparece no extrato.')
             + '<div class="cm-dois" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
             + selecao('bs-fonte', 'De onde veio', ['Extrato do benefício (INSS)', 'Contracheque', 'Informado pelo cliente'], 'Extrato do benefício (INSS)', 'c3', vazio='')
             + campo('bs-venc', 'Vencimento', '23/11/2026', 'c3', im='numeric', ajuda='O dia 10 já passou. Sugerimos 5 dias a partir de hoje.') + '</div>'
             + '<div class="campo"><label for="bs-arq">Comprovante <span class="opcional">(opcional)</span></label><input class="entrada" id="bs-arq" type="file" accept=".pdf,.jpg,.jpeg,.png" style="padding:9px 12px">'
             + '<p class="ajuda">PDF ou foto, até 10 MB. Fica guardado no contrato, aberto só por quem tem Contratos.</p></div>'
             + f'<p class="hn-gera-ed" style="margin:0">{ico("seta", "ico ico-s")}<span><b>Gera:</b> 30% de R$ 2.910,00 = <b>R$ 873,00</b>, a receber em 23/11/2026 (mês 2 de 12). O Financeiro é avisado.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Informar a base</button>'
    return janela('j-base', 'C-2026-022 · Hélio Batista Corrêa', 'Informar a base de novembro', 'A cobrança de 10/11 está parada esperando este valor.', corpo, pe, abrir=abrir)


def honorarios(com_janela=False):
    cab = ('<div class="pt-cab"><div><p class="sobretitulo">Contratos</p><h1>Honorários</h1><span class="fio" aria-hidden="true"></span>'
           '<p class="lede">O que depende de alguém para virar cobrança: a base do mês, a etapa do caso e o ato feito.</p></div></div>')
    nums = ('<nav class="folha hn-numeros" aria-label="Resumo dos honorários">'
            '<a href="#t-bm"><span class="disco hn-d-urg" aria-hidden="true"><span>1</span></span><span class="r"><b>Base a pedir</b>cobrança parada</span><span class="sr">: 1</span></a>'
            '<a href="#t-et"><span class="disco" aria-hidden="true"><span>4</span></span><span class="r"><b>Esperando etapa</b>êxito e sucumbência</span><span class="sr">: 4</span></a>'
            '<a href="#t-vc"><span class="disco hn-d-vinho" aria-hidden="true"><span>1</span></span><span class="r"><b>Virou cobrança</b>em novembro</span><span class="sr">: 1</span></a>'
            '<a href="#t-tp"><span class="disco" aria-hidden="true"><span>7</span></span><span class="r"><b>Tipos em uso</b>em 15 contratos</span><span class="sr">: 7</span></a></nav>')
    base = (f'<section class="folha" aria-labelledby="t-bm" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-bm">Base do mês</h2>'
            f'<p class="sub">Percentual recorrente sobre um valor que muda. Sem a base, a cobrança do mês não sai.</p></div></div><ul class="ct-lembretes">'
            f'<li class="ct-parado"><div><a class="ct-nome" href="#">Hélio Batista Corrêa</a><small>C-2026-022 · 30% do benefício · mês 2 de 12 · com Marina Ribeiro</small>'
            f'<p style="margin-top:6px">Base de novembro pedida em 05/11 por lembrete. Diego ligou em 03/11 e marcou retorno para 10/11.</p></div>'
            f'<div>{selo("urgente", "cobrança de 10/11 parada", "alerta")}<small style="margin-top:6px">há 8 dias</small></div>'
            f'<button class="btn btn-pri btn-compacto" type="button" data-janela="j-base">{ico("moeda")}Informar a base</button></li>'
            f'<li><div><a class="ct-nome" href="#">Hélio Batista Corrêa</a><small>C-2026-022 · outubro · mês 1 de 12</small></div>'
            f'<p class="ct-calc">R$ 2.910,00 × 30% = <b>R$ 873,00</b><small>Informada por Diego Almeida em 07/10</small></p>{selo("ok", "Pago em 12/10", "check")}</li></ul></section>')
    linhas = [
        (['<div class="esc"><div><a href="#">Hélio Batista Corrêa</a><small>C-2026-022</small></div></div>', selo_tipo('exito', ' 30%'), 'Pagamento da RPV ou precatório', selo('andamento', 'RPV expedida em 30/10')], ''),
        (['<div class="esc"><div><a href="#">Antônia Ferreira Prado</a><small>C-2026-031</small></div></div>', selo_tipo('exito', ' 30%'), 'Pagamento da RPV ou precatório', selo('neutro', 'Documentos')], ''),
        (['<div class="esc"><div><a href="#">Antônia Ferreira Prado</a><small>C-2026-031</small></div></div>', selo_tipo('sucumbencia'), 'Pagamento da sucumbência', selo('neutro', 'Documentos')], ''),
        (['<div class="esc"><div><a href="' + U + 'contrato">Farmácia Bom Jesus Ltda.</a><small>C-2026-019</small></div></div>', selo_tipo('sucumbencia'), 'Pagamento da sucumbência', selo('neutro', '2 ações em andamento')], ''),
    ]
    etapa = (f'<section class="folha" aria-labelledby="t-et" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-et">Esperando etapa do caso</h2>'
             f'<p class="sub">Quando alguém do Jurídico marcar a etapa, o valor entra em A receber e o Financeiro é avisado.</p></div></div>'
             + tabela('Condições esperando etapa', ['Contrato', 'Condição', 'Vira cobrança em', 'Onde o caso está'], linhas, ['28%', '24%', '25%', '23%']) + '</section>')
    vc = (f'<section class="folha" aria-labelledby="t-vc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-vc" style="font-size:20px">Virou cobrança em novembro</h2></div></div>'
          f'<div class="hn-folha-acao" style="padding-top:0">{AVISO_ETAPA}</div></section>')
    tipos = ''.join(f'<li><span>{selo_tipo(k)}</span><b class="num">{n}</b></li>' for k, n in
                    [('parcelado', 9), ('mensal', 3), ('exito', 6), ('sucumbencia', 5), ('recorrente', 1), ('ato', 1), ('fixo', 2)])
    tp = (f'<section class="folha" aria-labelledby="t-tp"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-tp" style="font-size:20px">Tipos em uso</h2>'
          f'<p class="sub">Contratos ativos com cada tipo. Um contrato pode ter vários.</p></div></div><ul class="cm-motivos" style="list-style:none;margin:0;padding:0 24px 18px">{tipos}</ul></section>')
    ex = (f'<section class="explica campo-ambar" aria-labelledby="t-hx"><p class="sobretitulo">Nada esquecido</p><h2 id="t-hx">O caso avisa a hora de cobrar.</h2><ul>'
          f'<li>{ico("balanca")}<span>Êxito, sucumbência e ato são ligados a uma etapa do caso. Marcada a etapa, o valor vira a receber.</span></li>'
          f'<li>{ico("relogio")}<span>No percentual recorrente, o responsável recebe o lembrete para pedir a base, e a cobrança parada aparece aqui.</span></li>'
          f'<li>{ico("carteira")}<span>O Financeiro vê tudo isso em A receber, com a data prevista.</span></li></ul></section>')
    jan = j_base(True) if com_janela else j_base(False)
    return (f'<div class="hn">{cab}{nums}<div class="hn-grade"><div class="hn-col">{base}{etapa}</div><aside class="hn-col" aria-label="Mais sobre honorários">{vc}{tp}{ex}</aside></div></div>{jan}')


# ---------------------------------------------------------------- Procurações e modelos
def procuracoes():
    cab = ('<div class="pt-cab"><div><p class="sobretitulo">Contratos</p><h1>Procurações e modelos</h1><span class="fio" aria-hidden="true"></span>'
           '<p class="lede">Contrato de honorários, procuração e declaração de hipossuficiência, com os dados do cliente e dos advogados, no timbrado do escritório.</p></div>'
           f'<a class="btn btn-pri" href="{U}gerar">{ico("doc")}Gerar documentos</a></div>')
    def doc(nome, arq, kb):
        return f'<div class="ct-doc-nome">{ico("doc")}<span><b>{nome}</b><small>{arq} · {kb}</small></span></div>'
    linhas = [
        ([doc('Contrato de honorários', 'contrato-honorarios-antonia-prado.docx', '46 KB'), 'Antônia Ferreira Prado<small>C-2026-031</small>', 'Marina Ribeiro<small>28/10/2026</small>', selo('atencao', 'Falta anexar o assinado', 'relogio'), f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> o contrato de Antônia</span></button>'], ''),
        ([doc('Procuração', 'procuracao-antonia-prado.docx', '31 KB'), 'Antônia Ferreira Prado<small>C-2026-031</small>', 'Marina Ribeiro<small>28/10/2026</small>', selo('ok', 'Assinada · anexada em 30/10', 'check'), f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> a procuração de Antônia</span></button>'], ''),
        ([doc('Declaração de hipossuficiência', 'declaracao-antonia-prado.docx', '18 KB'), 'Antônia Ferreira Prado<small>C-2026-031</small>', 'Marina Ribeiro<small>28/10/2026</small>', selo('ok', 'Assinada · anexada em 30/10', 'check'), f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> a declaração de Antônia</span></button>'], ''),
        ([doc('Contrato de honorários', 'contrato-honorarios-farmacia-bom-jesus.docx', '52 KB'), 'Farmácia Bom Jesus Ltda.<small>C-2026-019</small>', 'Felipe Matos<small>01/09/2026</small>', selo('ok', 'Assinado · anexado em 02/09', 'check'), f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> o contrato da Farmácia</span></button>'], ''),
    ]
    ger = (f'<section class="folha" aria-labelledby="t-gd" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-gd">Documentos gerados</h2>'
           f'<p class="sub">Arquivo do Word, para revisar antes de imprimir. O assinado se anexa aqui ou na ficha do contrato.</p></div></div>'
           + tabela('Documentos gerados', ['Documento', 'Cliente e contrato', 'Gerado por', 'Assinatura', ''], linhas, ['34%', '20%', '16%', '18%', '12%'])
           + '</section>')
    def mod(n, sub):
        return (f'<li><span class="ct-ci">{ico("doc")}</span><div><strong>{n}</strong><small>{sub}</small></div>'
                f'<div class="ct-bts"><button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> o modelo de {n.lower()}</span></button>'
                f'<button class="btn btn-sec btn-compacto" type="button">{ico("trocar")}Trocar<span class="sr"> o modelo de {n.lower()}</span></button></div></li>')
    mods = (f'<section class="folha" aria-labelledby="t-md"><div class="folha-cab"><div><h2 id="t-md">Modelos do escritório</h2>'
            f'<p class="sub">O texto é do escritório. Os campos entre colchetes, como [QUALIFICACAO_CLIENTE] e [ADVOGADOS_OAB], são preenchidos na hora.</p></div></div><ul class="ct-modelos">'
            + mod('Contrato de honorários', 'Atualizado por Marina Ribeiro em 15/09/2026 · as condições entram na cláusula 3')
            + mod('Procuração', 'Ad judicia et extra, com poderes especiais marcados na hora · padrão do T3jus')
            + mod('Declaração de hipossuficiência', 'Para quem pede a justiça gratuita · padrão do T3jus')
            + '</ul></section>')
    adv = (f'<section class="folha" aria-labelledby="t-ad"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-ad" style="font-size:20px">Advogados nos documentos</h2>'
           f'<p class="sub">Nome e OAB vêm da Equipe.</p></div></div><ul class="hn-pessoas">'
           + ''.join(f'<li><span class="av-p forte" aria-hidden="true">{"".join(p[0] for p in n.split())}</span><div><strong>{n}</strong><small>{o}</small></div></li>' for n, o in OAB.items())
           + f'</ul><p class="hn-pe">{ico("ajuda")}<span>Diego Almeida e Paula Nunes não têm OAB cadastrada e não aparecem como outorgados.</span></p></section>')
    timb = (f'<section class="folha" aria-labelledby="t-tb"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-tb" style="font-size:20px">Assinatura</h2></div></div>'
            f'<div class="hn-reserva"><div>{ico("lapis")}<span><b>Assinatura eletrônica: em estudo.</b> O lugar fica reservado. Por enquanto, o escritório imprime, colhe a assinatura e anexa o arquivo assinado.</span></div></div></section>')
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{ger}{mods}</div><aside class="hn-col" aria-label="Advogados e assinatura">{adv}{timb}</aside></div></div>'


def previa(rg_falta=True):
    rg = '<mark class="ct-falta">[RG: falta]</mark>' if rg_falta else '<mark>RG 33.418.207-5 SSP/SP</mark>'
    return (f'<section class="folha hn-resumo" aria-labelledby="t-pv"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pv" style="font-size:20px">Prévia da procuração</h2>'
            f'<p class="sub">O começo do documento, com os dados de agora.</p></div></div>'
            f'<div class="ct-leg"><span><i style="background:var(--sal-2);box-shadow:inset 0 -2px 0 var(--vinho-4)"></i>dado do cadastro</span><span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-3)"></i>falta</span></div>'
            f'<div class="ct-papel-folha"><div class="ct-papel"><div class="ct-timbre"><span>Ribeiro &amp; Matos</span><span>Advocacia</span></div><h3>PROCURAÇÃO</h3>'
            f'<p><b>OUTORGANTE:</b> <mark>BENEDITO SOUZA LIMA</mark>, <mark>brasileiro</mark>, <mark>casado</mark>, <mark>pedreiro</mark>, portador do {rg}, '
            f'inscrito no CPF sob o nº <mark>{CPF_BEN}</mark>, residente na <mark>Rua Coronel Melo, 212, Jardim Japão, São Paulo, SP, CEP 02124-010</mark>.</p>'
            f'<p><b>OUTORGADOS:</b> <mark>MARINA RIBEIRO</mark>, advogada, <mark>{OAB["Marina Ribeiro"]}</mark>, e <mark>FELIPE MATOS</mark>, advogado, <mark>{OAB["Felipe Matos"]}</mark>, '
            f'com escritório na Rua Tabapuã, 1.123, sala 42, São Paulo, SP, a quem confere os poderes da cláusula <i>ad judicia et extra</i> e os poderes especiais para '
            f'<mark>receber e dar quitação, firmar acordo e substabelecer</mark>.</p>'
            f'<p class="ct-mais">Continua com o fim, a data e o lugar da assinatura.</p></div></div></section>')


def gerar(feito=False):
    cab = ('<div class="pt-cab"><div><p class="sobretitulo">Procurações e modelos</p><h1>Gerar documentos</h1><span class="fio" aria-hidden="true"></span></div></div>')
    if feito:
        def a(n, arq, kb):
            return (f'<li><span class="ct-ci">{ico("doc")}</span><div><b>{n}</b><small>{arq} · {kb}</small></div>'
                    f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar")}Baixar<span class="sr"> {n.lower()}</span></button></li>')
        corpo = (f'<section class="folha" aria-labelledby="t-gf"><div class="folha-cab"><div><h2 id="t-gf">3 documentos prontos</h2>'
                 f'<p class="sub">C-2026-033 · Benedito Souza Lima · gerados agora por Marina Ribeiro</p></div>'
                 f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("baixar")}Baixar os 3 (.zip)</button></div></div><ul class="ct-arquivos">'
                 + a('Contrato de honorários', 'contrato-honorarios-benedito-lima.docx', '48 KB')
                 + a('Procuração', 'procuracao-benedito-lima.docx', '32 KB')
                 + a('Declaração de hipossuficiência', 'declaracao-benedito-lima.docx', '18 KB')
                 + f'</ul><div class="hn-folha-acao"><p class="pt-cuidado">{ico("pena")}<span>O RG de Benedito saiu como <b>[RG: falta]</b>. Preencha à mão ou complete a ficha e gere de novo; o arquivo anterior fica guardado.</span></p>'
                 f'<p>Revise no Word, imprima e colha as assinaturas em 20/11. Depois, anexe os assinados na ficha do contrato e registre a assinatura: é isso que ativa o contrato.</p>'
                 f'<a class="btn btn-sec" href="{U}criado">{ico("dir")}Voltar ao contrato C-2026-033</a></div>'
                 f'<div class="hn-reserva"><div>{ico("lapis")}<span><b>Assinatura eletrônica: em estudo.</b> Quando existir, o botão para mandar assinar fica aqui.</span></div></div></section>')
        t = toast('3 documentos gerados.', 'Ficaram em Procurações e modelos e na ficha do contrato C-2026-033.')
        return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{corpo}</div><aside class="hn-col" aria-label="Prévia">{previa()}</aside></div></div>{t}'
    r = (f'<div class="hn-bloco"><p style="font-weight:500;margin-bottom:6px" id="gd-ct-r">Contrato</p><div class="hn-escolhido" role="group" aria-labelledby="gd-ct-r"><span class="av-p forte" aria-hidden="true">BL</span>'
         f'<div><strong>Benedito Souza Lima</strong><small>C-2026-033 · Aposentadoria por idade · em elaboração</small></div>'
         f'<button class="btn btn-sec btn-compacto" type="button">{ico("trocar")}Trocar contrato</button></div></div>'
         + '<div class="c6">' + aviso('atencao', 'Falta 1 dado de Benedito: o RG.',
                                      'Dá para gerar assim: o documento sai com [RG: falta] marcado para preencher à mão. Ou complete a ficha antes.',
                                      icone='pena', acoes=f'<a class="btn btn-sec" href="{FICHA_CL}">{ico("lapis")}Completar na ficha</a>') + '</div>'
         + '<fieldset class="grupo-opcoes c6"><legend>Documentos</legend>'
         + opcao('gd-doc', 'Contrato de honorários', 'Com o objeto, as 3 condições e as cláusulas do escritório.', True)
         + opcao('gd-doc', 'Procuração', 'Para os advogados marcados abaixo.', True)
         + opcao('gd-doc', 'Declaração de hipossuficiência', 'Para quem pede a justiça gratuita. O cliente declara que não pode pagar as custas sem prejuízo do sustento.', True)
         + '</fieldset>'
         + '<fieldset class="grupo-opcoes c3"><legend>Advogados outorgados</legend>'
         + ''.join(opcao('gd-adv', n, o, n != 'Larissa Costa') for n, o in OAB.items())
         + '</fieldset>'
         + '<fieldset class="grupo-opcoes c3"><legend>Poderes especiais da procuração</legend>'
         + opcao('gd-pod', 'Receber e dar quitação', 'Para levantar alvará e RPV.', True)
         + opcao('gd-pod', 'Firmar acordo', '', True)
         + opcao('gd-pod', 'Desistir e renunciar', '', False)
         + opcao('gd-pod', 'Substabelecer', '', True)
         + '</fieldset>'
         + f'<div class="c6"><p class="pt-comuns">{ico("doc")}<span>Sai em arquivo do Word (.docx), no timbrado do escritório, para revisar antes de imprimir. Cada geração fica registrada, com quem gerou e quando.</span></p></div>'
         + (f'<div class="form-pe"><a class="btn btn-fantasma" href="{U}procuracoes">Cancelar</a><button class="btn btn-pri" type="submit">{ico("doc")}Gerar 3 documentos</button></div>'))
    form = (f'<section class="folha" aria-labelledby="t-gd"><div class="folha-cab"><div><h2 id="t-gd">O que gerar</h2><p class="sub">Os dados vêm da ficha do cliente, do contrato e da Equipe.</p></div></div>'
            f'<form class="form-folha" action="#" novalidate>{r}</form></section>')
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{form}</div><aside class="hn-col" aria-label="Prévia">{previa()}</aside></div></div>'


# ---------------------------------------------------------------- estados
T = ''
A = lambda sec, trilha, titulo, **k: dict(area='contratos', secao=sec, atual='contratos', trilha=trilha, titulo=titulo, **k)
T += tpl('contratos', contratos(), **A('Contratos', 'Contratos|Contratos', 'Contratos'))
T += tpl('contratos-vazio', contratos_vazio(), **A('Contratos', 'Contratos|Contratos', 'Contratos'))
T += tpl('novo', pagina_novo(), **A('Contratos', 'Contratos|Novo contrato', 'Novo contrato'))
T += tpl('novo-tipos', pagina_novo('tipos'), **A('Contratos', 'Contratos|Novo contrato', 'Novo contrato'))
T += tpl('novo-erros', pagina_novo('erros'), **A('Contratos', 'Contratos|Novo contrato', 'Novo contrato'))
T += tpl('criado', criado(), **A('Contratos', 'Contratos|C-2026-033', 'C-2026-033', aba='contrato'))
T += tpl('contrato', contrato_far(), **A('Contratos', 'Contratos|C-2026-019', 'C-2026-019', aba='contrato'))
T += tpl('contrato-recebimentos', recebimentos(), **A('Contratos', 'Contratos|C-2026-019', 'C-2026-019', aba='recebimentos'))
T += tpl('contrato-sem-financeiro', recebimentos(False), quem='contratos', **A('Contratos', 'Contratos|C-2026-019', 'C-2026-019', aba='recebimentos'))
T += tpl('honorarios', honorarios(), **A('Honorários', 'Contratos|Honorários', 'Honorários'))
T += tpl('base', honorarios(True), **A('Honorários', 'Contratos|Honorários', 'Honorários'))
T += tpl('procuracoes', procuracoes(), **A('Procurações e modelos', 'Contratos|Procurações e modelos', 'Procurações e modelos'))
T += tpl('gerar', gerar(), **A('Procurações e modelos', 'Contratos|Procurações e modelos|Gerar documentos', 'Gerar documentos'))
T += tpl('gerado', gerar(True), **A('Procurações e modelos', 'Contratos|Procurações e modelos|Gerar documentos', 'Gerar documentos'))

URL = {'Contratos': U + 'contratos', 'Honorários': U + 'honorarios', 'Procurações e modelos': U + 'procuracoes'}
out = montar('contratos.html', 'Contratos', 'Área Contratos do Portal: contratos de honorários, condições, programação dos recebimentos, procurações e modelos.',
             '{"estado":"contratos","atual":"contratos"}', T, barras('contratos', URL), CSS)
open(f'{SAIDA}/contratos.html', 'w', encoding='utf-8').write(out)
print('contratos ok', T.count('<template data-est='), 'estados')
