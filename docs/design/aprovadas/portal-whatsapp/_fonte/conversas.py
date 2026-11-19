# Portal · Conversas (decisões da Carol sobre a IA no WhatsApp; VA-03 [VAL], EX-11, EX-14, FI-12, PD-07, EX-10; PT-03, PT-10, PT-11).
# Reusa a moldura, o CSS e as peças do Portal v1 aprovado (comum.py, sem mudança) e o desenho do Clientes aprovado.
# Peças novas com prefixo cv-. Uso: python3 conversas.py <pasta-saida>
import sys
from extra import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'conversas.html?estado='
FICHA_CL = '../portal-clientes/clientes.html?estado=lista'

CSS_CV = r"""
/* ==========================================================================
   Portal · Conversas. Prefixo cv- nas peças novas.
   ========================================================================== */
.cv{display:flex;flex-direction:column;gap:24px;min-width:0}
.pt-secoes a .q{margin-left:8px;font-size:11px;font-weight:600;background:var(--ambar);color:var(--tinta);border-radius:10px;padding:1px 7px}
.cv-caixa{display:grid;grid-template-columns:310px minmax(0,1fr) 290px;min-height:780px;overflow:hidden}
.cv-lista{border-right:1px solid var(--divisor);display:flex;flex-direction:column;min-width:0}
.cv-lista-cab{padding:16px 16px 12px;display:grid;gap:10px;border-bottom:1px solid var(--divisor)}
.cv-lista-cab .campo-busca{position:relative}
.cv-lista-cab .campo-busca .ico{position:absolute;left:14px;top:12px;color:var(--vinho-4);pointer-events:none}
.cv-lista-cab .campo-busca input{padding-left:44px}
.cv-filtros{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cv-filtros button{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:44px;padding:0 12px;border-radius:var(--raio);border:1px solid var(--borda-folha);background:var(--papel);font:inherit;font-size:12.5px;color:var(--texto-2);cursor:pointer;text-align:left;line-height:1.2}
.cv-filtros button b{font-weight:600;font-variant-numeric:tabular-nums;color:var(--texto)}
.cv-filtros button[aria-pressed="true"]{background:var(--ambar-3);border-color:var(--ambar-2);color:var(--vinho);font-weight:500}
.cv-filtros button[aria-pressed="true"] b{color:var(--vinho)}
.cv-filtros .ico{width:16px;height:16px}
.cv-itens{list-style:none;margin:0;padding:0}
.cv-item{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;padding:14px 16px;border-bottom:1px solid var(--divisor)}
.cv-item:hover{background:#FCF8F5}
.cv-item.atual{background:var(--ambar-3);box-shadow:inset 3px 0 0 var(--vinho)}
.cv-it-l1{display:flex;align-items:baseline;gap:8px;min-width:0}
.cv-item a.cv-nome{font-family:var(--serifa);font-size:17px;font-weight:500;color:var(--vinho);text-decoration:none;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.cv-item a.cv-nome::after{content:"";position:absolute;inset:0}
.cv-item a.cv-nome:focus-visible{outline:none}
.cv-item:has(a.cv-nome:focus-visible){outline:3px solid var(--foco);outline-offset:-3px}
.cv-quando{margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--texto-2);white-space:nowrap;flex:none}
.cv-quando .ico{width:14px;height:14px}
.cv-item.espera .cv-quando{color:var(--vinho-3);font-weight:600}
.cv-item.atual.espera .cv-quando{color:var(--vinho)}
.cv-item small{display:block;font-size:12px;color:var(--texto-2)}
.cv-ult{margin:4px 0 0;font-size:13px;line-height:1.4;color:var(--texto);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cv-it-pe{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
.cv-it-pe .selo{height:24px;font-size:11.5px}
.cv-resp{font-size:12px;color:var(--texto-2)}
.cv-item.atual .cv-resp,.cv-item.atual small{color:var(--tinta)}
.cv-lista-pe{margin-top:auto;padding:12px 16px 16px;font-size:12px;color:var(--texto-2);display:flex;gap:8px;align-items:flex-start;line-height:1.45}
.cv-lista-pe .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}

/* Conversa aberta */
.cv-conv{display:flex;flex-direction:column;min-width:0;background:var(--papel)}
.cv-cab{padding:16px 24px 12px;border-bottom:1px solid var(--divisor);display:grid;gap:10px}
.cv-volta{display:none}
.cv-cab h2{font-size:26px;line-height:1.15}
.cv-quem{font-size:13px;color:var(--texto-2);line-height:1.6}
.cv-quem b{font-weight:500;color:var(--texto)}
.cv-quem a{display:inline-flex;align-items:center;gap:4px;min-height:44px;margin:-12px 0 -12px 6px;vertical-align:middle;font-weight:500;color:var(--vinho)}
.cv-est{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 24px;border-bottom:1px solid var(--divisor);background:#FCF8F5}
.cv-est p{font-size:13px;line-height:1.45;flex:1 1 220px;min-width:0}
.cv-est p b{font-weight:500}
.cv-est .btn{min-height:44px}
.cv-msgs{list-style:none;margin:0;padding:16px 24px 20px;display:flex;flex-direction:column;gap:10px;background:var(--sal-2);flex:1}
.cv-dia{align-self:center;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--texto-2);padding:6px 0 2px}
.cv-m{display:flex}
.cv-m .cv-b{max-width:82%;padding:9px 13px 7px;border-radius:4px 14px 14px 14px;background:var(--papel);font-size:14px;line-height:1.5;box-shadow:0 1px 1px rgba(42,26,34,.06)}
.cv-m.ia,.cv-m.eq{justify-content:flex-end}
.cv-m.ia .cv-b{background:var(--ambar-3);color:var(--tinta);border-radius:14px 4px 14px 14px}
.cv-m.eq .cv-b{background:var(--vinho);color:var(--papel);border-radius:14px 4px 14px 14px}
.cv-b .de{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--vinho-2);margin-bottom:2px}
.cv-b .de .ico{width:14px;height:14px}
.cv-m.ia .cv-b .de{color:var(--vinho)}
.cv-m.eq .cv-b .de{color:var(--ambar-3)}
.cv-b time{display:block;text-align:right;font-size:11px;color:var(--texto-2);margin-top:2px}
.cv-m.ia .cv-b time{color:var(--tinta)}
.cv-m.eq .cv-b time{color:var(--ambar-3)}
.cv-anexo{display:flex;align-items:center;gap:10px;padding:10px 12px;margin:2px 0 6px;border-radius:10px;background:var(--sal-2);font-size:13px}
.cv-anexo .ico{color:var(--vinho)}
.cv-anexo small{display:block;font-size:11.5px;color:var(--texto-2)}
.cv-sis{align-self:center;display:flex;align-items:flex-start;gap:8px;max-width:88%;padding:8px 12px;border-radius:10px;background:var(--papel);box-shadow:inset 0 0 0 1px var(--borda-folha);font-size:12.5px;line-height:1.45;color:var(--texto)}
.cv-sis .ico{width:16px;height:16px;color:var(--vinho);flex:none;margin-top:1px}
.cv-sis time{color:var(--texto-2);margin-left:4px;white-space:nowrap}
.cv-sis b{font-weight:600}
.cv-av{align-self:flex-end;max-width:82%;padding:10px 13px 8px;border-radius:14px 4px 14px 14px;background:var(--papel);border:1.5px dashed var(--vinho-4);font-size:13.5px;line-height:1.5}
.cv-av .de{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--vinho-2);margin-bottom:4px}
.cv-av .de .ico{width:14px;height:14px}
.cv-av small{display:flex;justify-content:flex-end;gap:6px;font-size:11px;color:var(--texto-2);margin-top:4px}
.cv-compor{border-top:1px solid var(--divisor);padding:14px 24px 16px;background:var(--papel);display:grid;gap:10px}
.cv-compor textarea{min-height:76px;padding:10px 14px;resize:vertical}
.cv-compor-pe{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cv-compor-pe span{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--texto-2);margin-right:auto}
.cv-compor-pe span .ico{width:16px;height:16px;color:var(--vinho-4)}
.cv-compor.bloq{grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px}
.cv-compor.bloq>.ico{color:var(--vinho)}
.cv-compor.bloq p{font-size:13px;line-height:1.45;color:var(--texto)}

/* Contexto */
.cv-ctx{border-left:1px solid var(--divisor);display:flex;flex-direction:column;min-width:0;background:var(--papel)}
.cv-sec{padding:16px 20px;border-bottom:1px solid var(--divisor);display:grid;gap:10px}
.cv-sec:last-child{border-bottom:0}
.cv-sec h3{font-size:18px;line-height:1.25;display:flex;align-items:center;gap:8px}
.cv-sec h3 .ico{color:var(--vinho-4)}
.cv-sec p{font-size:13px;line-height:1.5}
.cv-sec .sub{font-size:12px;color:var(--texto-2)}
.cv-por{padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);font-size:13px;line-height:1.5;color:var(--tinta)}
.cv-por b{font-weight:600}
.cv-dl{margin:0;display:grid;gap:6px}
.cv-dl div{display:flex;justify-content:space-between;gap:10px;font-size:13px}
.cv-dl dt{color:var(--texto-2);flex:none}
.cv-dl dd{margin:0;font-weight:500;text-align:right;min-width:0}
.cv-sec .btn{justify-self:stretch}
.cv-mini{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.cv-mini li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;font-size:12.5px;line-height:1.45}
.cv-mini li .ico{width:16px;height:16px;color:var(--vinho-4);margin-top:2px}
.cv-mini li b{font-weight:500}
.cv-mini li small{display:block;font-size:12px;color:var(--texto-2)}
.cv-sec .ver{justify-self:start;margin:-8px 0 -10px -6px}
.cv-anotou{border:1.5px dashed var(--vinho-4);border-radius:var(--raio);padding:12px 14px;display:grid;gap:8px}
.cv-anotou .selo{justify-self:start}
.cv-nota{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--texto-2);line-height:1.45}
.cv-nota .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}
.cv-ctx-cel{display:none}

/* Vazio, hoje e não conectado */
.cv-nada{flex:1;display:grid;place-items:center;padding:32px 24px;background:var(--sal-2)}
.cv-hoje{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:520px;margin:6px auto 0}
.cv-hoje div{display:grid;justify-items:center;gap:6px;text-align:center;font-size:12.5px;color:var(--texto-2);line-height:1.35}
.cv-hoje .disco{--d:56px;--f:26px}
.cv-nc{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.cv-passos{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:14px;text-align:left;max-width:60ch}
.cv-passos li{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;font-size:14px;line-height:1.5;color:var(--texto)}
.cv-passos .disco{--d:32px;--f:17px}
.cv-passos b{font-weight:600}
.cv-passos small{display:block;font-size:12.5px;color:var(--texto-2)}
.cv-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.cv-lista-x{list-style:none;margin:0;padding:0 24px 20px;display:grid;gap:12px}
.cv-lista-x li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:13px;line-height:1.5}
.cv-lista-x .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.cv-lista-x b{font-weight:500}

/* Avisos automáticos */
.cv-av-grade{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:24px;align-items:start}
.cv-av-ferr{display:flex;gap:6px;flex-wrap:wrap;padding:0 24px 16px}
.cv-av-ferr button{min-height:44px;padding:0 14px;border-radius:22px;border:1px solid var(--borda-folha);background:var(--papel);font:inherit;font-size:13px;color:var(--texto-2);cursor:pointer;white-space:nowrap}
.cv-av-ferr button[aria-pressed="true"]{background:var(--ambar-3);border-color:var(--ambar-2);color:var(--vinho);font-weight:500}
.cv-tab td{vertical-align:middle}
.cv-tipo{display:flex;align-items:flex-start;gap:10px}
.cv-tipo>.ico{color:var(--vinho);margin-top:2px}
.cv-tipo strong{display:block;font-weight:500}
.cv-tipo small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}
.cv-tab .cv-c strong{display:block;font-weight:500}
.cv-tab .cv-c small{display:block;font-size:12px;color:var(--texto-2)}
.cv-tab tr.sel td{background:var(--ambar-3)}
.cv-tab tr.sel td:first-child{box-shadow:inset 3px 0 0 var(--vinho)}
.cv-tab tr.falha td{background:#FCF6F2}
.cv-tab tr.falha td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}
.cv-sit{display:grid;gap:6px;justify-items:start}
.cv-sit small{font-size:12px;color:var(--texto-2)}
.cv-ver{display:inline-flex;align-items:center;gap:4px;min-height:44px;margin:-6px 0;font-size:13px;font-weight:500;color:var(--vinho)}
.cv-prev{padding:0 24px 20px;display:grid;gap:12px}
.cv-prev .cv-av{align-self:stretch;max-width:none}
.cv-prev .cv-dl{padding:0}
.cv-regras{list-style:none;margin:0;padding:0 24px 8px}
.cv-regras li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:10px 0;border-top:1px solid var(--divisor);align-items:center}
.cv-regras li:first-child{border-top:0}
.cv-regras strong{font-weight:500;font-size:13.5px}
.cv-regras small{grid-column:1/-1;font-size:12px;color:var(--texto-2);line-height:1.45}
.cv-regras .selo{height:24px;font-size:11.5px}

@media (max-width:760px){
  .cv{gap:16px}
  .cv-caixa{grid-template-columns:minmax(0,1fr);min-height:0}
  .cv-caixa.foco-lista .cv-conv,.cv-caixa.foco-lista .cv-ctx{display:none}
  .cv-caixa.foco-conversa .cv-lista{display:none}
  .cv-caixa.foco-conversa .cv-ctx{display:none}
  .cv-ctx-cel{display:block;border-top:1px solid var(--divisor)}
  .cv-ctx-cel>summary{display:flex;align-items:center;gap:10px;min-height:52px;padding:0 16px;font-weight:500;color:var(--vinho);cursor:pointer;list-style:none;background:var(--papel)}
  .cv-ctx-cel>summary::-webkit-details-marker{display:none}
  .cv-ctx-cel>summary .ico:last-child{margin-left:auto}
  .cv-ctx-cel .cv-ctx{display:flex!important;border-left:0}
  .cv-lista{border-right:0}
  .cv-volta{display:inline-flex;align-items:center;gap:6px;min-height:44px;margin:-8px 0 -6px -4px;color:var(--vinho);font-weight:500;font-size:13px;text-decoration:none;justify-self:start}
  .cv-cab{padding:12px 16px 10px}
  .cv-cab h2{font-size:24px}
  .cv-est{padding:10px 16px}
  .cv-est .btn{flex:1 1 100%}
  .cv-msgs{padding:14px 12px 16px}
  .cv-m .cv-b,.cv-av{max-width:90%}
  .cv-compor{padding:12px 16px 14px}
  .cv-compor.bloq{grid-template-columns:auto minmax(0,1fr)}
  .cv-compor.bloq .btn{grid-column:1/-1}
  .cv-compor-pe .btn{flex:1 1 auto}
  .cv-sec{padding:14px 16px}
  .cv-nada{padding:24px 16px}
  .cv-hoje{grid-template-columns:1fr 1fr 1fr;gap:8px}
  .cv-nc,.cv-av-grade{grid-template-columns:minmax(0,1fr);gap:16px}
  .cv-col{gap:16px}
  .cv-lista-x{padding:0 16px 16px}
  .cv-av-ferr{padding:0 16px 14px}
  .cv-prev{padding:0 16px 16px}
  .cv-regras{padding:0 16px 6px}
}
"""

# ---------------------------------------------------------------- dados fictícios
# (chave, ini, nome, quem escreve, última, quando, estado, responsável, motivo, href)
LISTA = {
    'espera': [
        ('helio', 'HC', 'Hélio Batista Corrêa', 'Marta Corrêa, esposa', '“Eles querem resposta até amanhã cedo.”', 'há 1 h', 'Marina (você)', ('mao', 'Proposta de acordo'), U + 'fila'),
        ('joana', 'AP', 'Antônia Ferreira Prado', 'Joana Prado, filha', '“Achei a carta do INSS! Mando só a foto ou preciso levar o papel?”', 'há 2 h', 'Diego', ('imagem', 'Documento novo'), U + 'conversa'),
        ('rafaela', 'RM', 'Rafaela Moura', 'Contato novo · (11) 97640-2281', '“Rafaela Moura. Depois das 14h.”', 'há 42 min', 'Diego', ('pessoa-mais', 'Possível cliente novo'), U + 'novo-contato'),
    ],
    'equipe': [('daniela', 'DM', 'Daniela Rocha Mendes', 'A própria cliente', 'Diego: “Combinado, te ligo às 15h.”', '09:55', 'Diego', None, U + 'fila')],
    'ia': [('benedito', 'BL', 'Benedito Souza Lima', 'O próprio cliente', '“Qual o endereço do escritório?”', '10:08', '', None, U + 'fila'),
           ('farmacia', 'FB', 'Farmácia Bom Jesus Ltda.', 'Sueli Ramos, gerente', '“Recebi o aviso da parcela. Posso pagar por Pix?”', '10:01', '', None, U + 'fila')],
    'resolvidas': [('gabriela', 'GT', 'Gabriela Teixeira', 'A própria cliente', '“Perfeito, obrigada!”', '08:47', '', None, U + 'resolvida'),
                   ('vale', 'CV', 'Construtora Vale Alto Ltda.', 'Ricardo Vale, sócio-administrador', '“Recebido, obrigado.”', '08:36', '', None, U + 'fila'),
                   ('irene', 'IC', 'Irene Castro', 'A própria cliente', '“Confirmo a reunião das 14h30.”', '08:20', '', None, U + 'fila')],
}
CONT = {'espera': 3, 'equipe': 1, 'ia': 2, 'resolvidas': 14}


def item(c, estado, atual=False):
    k, ini, nome, quem, ult, quando, resp, motivo, href = c
    cls = 'cv-item' + (' espera' if estado == 'espera' else '') + (' atual' if atual else '')
    q = f'{ico("relogio")}{quando}' if estado == 'espera' else quando
    q_sr = f'<span class="sr">, esperando </span>' if estado == 'espera' else ''
    pe = ''
    if estado == 'espera':
        pe = f'<div class="cv-it-pe"><span class="selo selo-atencao">{ico(motivo[0])}{motivo[1]}</span><span class="cv-resp">com {resp}</span></div>'
    elif estado == 'equipe':
        pe = f'<div class="cv-it-pe"><span class="selo selo-ativo">{ico("pessoa")}Com {resp}</span></div>'
    elif estado == 'ia':
        pe = f'<div class="cv-it-pe"><span class="selo selo-implant">{ico("ia")}A IA está respondendo</span></div>'
    else:
        pe = f'<div class="cv-it-pe"><span class="selo selo-ok">{ico("check")}Resolvida pela IA</span></div>'
    ac = ' aria-current="true"' if atual else ''
    av = 'av-p forte' if not atual else 'av-p'
    return (f'<li class="{cls}"><span class="{av}" aria-hidden="true">{ini}</span><div style="min-width:0">'
            f'<div class="cv-it-l1"><a class="cv-nome" href="{href}"{ac}>{H(nome)}</a>{q_sr}<span class="cv-quando">{q}</span></div>'
            f'<small>{H(quem)}</small><p class="cv-ult">{H(ult)}</p>{pe}</div></li>')


def lista(filtro='espera', atual=None, vazio=False):
    rot = [('espera', 'Precisa de alguém', 'mao'), ('equipe', 'Com a equipe', 'pessoa'), ('ia', 'Com a IA', 'ia'), ('resolvidas', 'Resolvidas hoje', 'check')]
    bts = ''
    for k, r, i in rot:
        n = 0 if (vazio and k == 'espera') else CONT[k]
        bts += f'<button type="button" aria-pressed="{"true" if k == filtro else "false"}"><span>{r}</span><b>{n}</b></button>'
    if vazio:
        itens = ('<div style="padding:8px 0">' + estado('Ninguém esperando agora', 'Tudo o que a IA passou para a equipe já foi respondido. Quando ela precisar de alguém, a conversa aparece aqui, com o responsável.',
                                                       'check', moldura=False, acoes=f'<button class="btn btn-sec" type="button">{ico("check")}Ver as resolvidas hoje</button>') + '</div>')
    else:
        its = LISTA[filtro]
        itens = '<ul class="cv-itens" aria-label="Conversas">' + ''.join(item(c, filtro, c[0] == atual) for c in its) + '</ul>'
    return (f'<section class="cv-lista" aria-labelledby="cv-lt"><h2 class="sr" id="cv-lt">Conversas</h2><div class="cv-lista-cab">'
            f'<form class="campo-busca" role="search" action="#" onsubmit="return false"><label class="sr" for="cv-busca">Buscar conversa por nome ou telefone</label>{ico("busca")}'
            f'<input class="entrada" id="cv-busca" type="search" placeholder="Nome ou telefone" autocomplete="off"></form>'
            f'<div class="cv-filtros" role="group" aria-label="Mostrar">{bts}</div></div>{itens}'
            f'<p class="cv-lista-pe">{ico("ia")}<span>A IA responde o que está no T3jus. Valor, estratégia e chance de ganhar vão sempre para uma pessoa.</span></p></section>')


# ---------------------------------------------------------------- mensagens
def dia_m(t):
    return f'<li class="cv-dia">{t}</li>'


def cli(de, txt, hora, anexo=''):
    return f'<li class="cv-m cli"><div class="cv-b"><span class="de">{de}</span>{anexo}{txt}<time>{hora}</time></div></li>'


def ia(txt, hora):
    return f'<li class="cv-m ia"><div class="cv-b"><span class="de">{ico("ia")}IA do escritório</span>{txt}<time>{hora}</time></div></li>'


def eq(de, txt, hora):
    return f'<li class="cv-m eq"><div class="cv-b"><span class="de">{de}</span>{txt}<time>{hora}</time></div></li>'


def sis(txt, hora, i='mao'):
    return f'<li class="cv-sis">{ico(i)}<span>{txt}<time>{hora}</time></span></li>'


def aviso_auto(tipo, txt, quando):
    return f'<li class="cv-av"><span class="de">{ico("whats")}Aviso automático · {tipo}</span>{txt}<small>{quando}</small></li>'


def anexo(nome, tipo):
    return f'<span class="cv-anexo">{ico("imagem")}<span>{nome}<small>{tipo}</small></span></span>'


# ---------------------------------------------------------------- conversas
HELIO_MSGS = [
    dia_m('05/11'),
    aviso_auto('Etapa do caso', 'Olá, Marta e Hélio. Novidade no caso: a Justiça marcou a audiência de instrução para quinta, 19/11, às 13h30, no TRT-2, na Barra Funda. '
               'Nessa audiência o juiz ouve vocês e as testemunhas. A Dra. Marina explica tudo antes. Não precisa fazer nada agora.', '05/11, 16:20 · Lido'),
    dia_m('Hoje'),
    cli('Marta Corrêa', 'Bom dia. O Hélio recebeu uma proposta de acordo da empresa, de R$ 18.000,00. Vale a pena aceitar antes da audiência de amanhã?', '09:10'),
    ia('Bom dia, Marta. Proposta de acordo precisa ser avaliada pela advogada do caso, a Dra. Marina Ribeiro. Já passei para ela, e ela responde ainda hoje. '
       'A audiência de amanhã, quinta, 19/11, às 13h30, no TRT-2, continua marcada.', '09:11'),
    sis('A IA passou a conversa para <b>Marina Ribeiro</b>, que cuida do caso. Motivo: proposta de acordo.', '09:12'),
    cli('Marta Corrêa', 'Tá bom. Eles querem resposta até amanhã cedo.', '09:40'),
]
HELIO_ASSUMIDA = HELIO_MSGS + [
    sis('<b>Você assumiu</b> a conversa. A IA fica em silêncio até você devolver.', '10:15', 'pessoa'),
    eq('Marina Ribeiro', 'Oi, Marta. Aqui é a Marina. Antes de responder sobre o acordo, preciso ver a proposta por escrito. Pode mandar uma foto? Ligo para vocês hoje às 14h para conversarmos com calma.', '10:16'),
    cli('Marta Corrêa', anexo('proposta-acordo.jpg', 'Foto · 1,2 MB') + 'Mando sim, está aqui. Obrigada, doutora!', '10:18'),
]
JOANA_MSGS = [
    dia_m('16/11'),
    aviso_auto('Etapa do caso', 'Olá, Joana. Novidade no caso da sua mãe, Antônia: o escritório entrou com o recurso no INSS hoje. Agora o INSS tem até 30 dias para analisar. '
               'Não precisa fazer nada; avisamos quando houver resposta.', '16/11, 15:20 · Lido'),
    dia_m('Hoje'),
    cli('Joana Prado', 'Achei a carta do INSS! Mando só a foto ou preciso levar o papel?', '08:05', anexo('carta-inss.jpg', 'Foto · 2,4 MB')),
    ia('Oi, Joana. Recebi a foto, obrigada. Vou pedir para alguém da equipe conferir se ela está legível e se a foto basta. Respondemos ainda hoje.', '08:06'),
    sis('A IA passou a conversa para <b>Diego Almeida</b>, responsável pelo próximo contato de Antônia. Motivo: documento novo para conferir.', '08:10'),
]
GABRIELA_MSGS = [
    dia_m('17/11'),
    aviso_auto('Lembrete de audiência', 'Olá, Gabriela. Aqui é do escritório Ribeiro &amp; Matos. Sua audiência de conciliação é amanhã, quarta, 18/11, às 11h, por vídeo. '
               'O link chega aqui 2 horas antes. Faltar sem justificativa pode gerar multa. Responda CONFIRMO, ou escreva se tiver dúvida.', '17/11, 11:00 · Lido'),
    cli('Gabriela Teixeira', 'Confirmo, estarei lá.', '11:26'),
    ia('Obrigada, Gabriela. Sua presença está confirmada. Amanhã, às 9h, mandamos o link da sala.', '11:26'),
    dia_m('Hoje'),
    cli('Gabriela Teixeira', 'Bom dia! A audiência de hoje é por vídeo mesmo? Preciso levar algo?', '08:44'),
    ia('Bom dia, Gabriela. Sim, é por vídeo, hoje às 11h. O link chega aqui às 9h. Entre 10 minutos antes, com um documento com foto à mão. A Dra. Marina estará na sala com você.', '08:45'),
    cli('Gabriela Teixeira', 'Perfeito, obrigada!', '08:46'),
    sis('A IA marcou a conversa como <b>resolvida</b>.', '08:47', 'check'),
    aviso_auto('Lembrete de audiência', 'Gabriela, sua audiência começa às 11h. Entre por este link 10 minutos antes: teams.microsoft.com/l/meetup-join/19%3ameeting_YjQ1…', 'hoje, 09:00 · Entregue'),
]
RAFAELA_MSGS = [
    dia_m('Hoje'),
    cli('(11) 97640-2281', 'Oi, bom dia. Fui demitida grávida, vocês atendem esse tipo de caso?', '09:28'),
    ia('Bom dia! Aqui é a assistente virtual do escritório Ribeiro &amp; Matos. Atendemos, sim, casos trabalhistas. Para uma pessoa da equipe falar com você, me diga seu nome completo e o melhor horário para ligar.', '09:28'),
    cli('(11) 97640-2281', 'Rafaela Moura. Depois das 14h.', '09:29'),
    ia('Obrigada, Rafaela. Já passei para a equipe; alguém liga para você hoje, depois das 14h. Se tiver a carta de demissão ou o termo de rescisão, pode mandar a foto aqui.', '09:30'),
    sis('A IA passou a conversa para <b>Diego Almeida</b>, da área Comercial. Motivo: possível cliente novo.', '09:30', 'pessoa-mais'),
]


def cab_conv(nome, fone, quem, ficha=True, novo=False):
    f = f'<a href="{FICHA_CL}">{ico("pessoas", "ico ico-s")}Abrir a ficha</a>' if ficha else '<span class="selo selo-neutro">Ainda não está em Clientes</span>'
    return (f'<div class="cv-cab"><a class="cv-volta" href="{U}fila">{ico("esq", "ico ico-s")}Conversas</a>'
            f'<div><p class="sobretitulo">WhatsApp · <span class="num">{fone}</span></p><h2 id="cv-ct">{H(nome)}</h2></div>'
            f'<p class="cv-quem">{quem}{f}</p></div>')


def barra_est(tipo, texto, botoes):
    selo = {'espera': f'<span class="selo selo-atencao">{ico("mao")}Precisa de alguém</span>',
            'voce': f'<span class="selo selo-ativo">{ico("pessoa")}Com você</span>',
            'resolvida': f'<span class="selo selo-ok">{ico("check")}Resolvida pela IA</span>'}[tipo]
    return f'<div class="cv-est">{selo}<p>{texto}</p>{botoes}</div>'


BT_ASSUMIR = f'<button class="btn btn-pri" type="button">{ico("mao")}Assumir conversa</button>'
BT_PASSAR = f'<button class="btn btn-sec" type="button" data-janela="janela-passar">{ico("trocar")}Passar para outra pessoa</button>'
BT_DEVOLVER = f'<button class="btn btn-sec" type="button" data-janela="janela-devolver">{ico("devolver")}Devolver para a IA</button>'


def compor_bloq(txt, botao=BT_ASSUMIR):
    return f'<div class="cv-compor bloq">{ico("ia")}<p>{txt}</p>{botao}</div>'


def compor(para):
    return (f'<form class="cv-compor" action="#" onsubmit="return false"><label class="sr" for="cv-txt">Mensagem para {para}</label>'
            f'<textarea class="entrada" id="cv-txt" placeholder="Escreva para {para}"></textarea>'
            f'<div class="cv-compor-pe"><span>{ico("whats")}Sai pelo WhatsApp do escritório, com o seu nome.</span>'
            f'<button class="btn btn-pri" type="submit">{ico("enviar")}Enviar</button></div></form>')


def conv(cab, est, msgs, comp):
    return (f'<section class="cv-conv" aria-labelledby="cv-ct">{cab}{est}<ol class="cv-msgs" aria-label="Mensagens">{"".join(msgs)}</ol>{comp}</section>')


def sec(titulo, corpo, i=''):
    ic = ico(i) if i else ''
    return f'<section class="cv-sec"><h3>{ic}{titulo}</h3>{corpo}</section>'


def ctx(secoes, nome_curto):
    inner = ''.join(secoes)
    return (f'<aside class="cv-ctx" aria-label="Sobre {nome_curto}">{inner}</aside>', inner)


def caixa(lista_html, conv_html, ctx_pair, foco='foco-conversa', nome_curto=''):
    a, inner = ctx_pair
    cel = (f'<details class="cv-ctx-cel"><summary>{ico("pessoas")}Sobre {nome_curto} e o caso{ico("baixo", "ico ico-s")}</summary>'
           f'<div class="cv-ctx" role="group" aria-label="Sobre {nome_curto}, no celular">{inner}</div></details>') if inner else ''
    conv_html = conv_html.replace('</section>', cel + '</section>', 1) if cel else conv_html
    # o contexto do celular vai antes do campo de escrever
    return f'<div class="folha cv-caixa {foco}">{lista_html}{conv_html}{a}</div>'


AVISOS_HELIO = (f'<ul class="cv-mini"><li>{ico("whats")}<span><b>Etapa do caso</b> · 05/11<small>Instrução marcada. Lido.</small></span></li>'
                f'<li>{ico("relogio")}<span><b>Lembrete de audiência</b> · hoje, 13:30<small>1 dia antes da instrução. Marcado.</small></span></li></ul>'
                f'<a class="ver" href="{U}avisos">Ver todos os avisos{ico("dir", "ico ico-s")}</a>')

CTX_HELIO = ctx([
    sec('Por que a IA passou', f'<p class="cv-por"><b>Proposta de acordo.</b> Marta pergunta se vale aceitar R$ 18.000,00. Valor e estratégia são com a advogada; a IA não opina. A empresa quer resposta até amanhã cedo.</p>'
        f'<p class="sub">Veio para você porque você cuida do caso.</p>', 'ia'),
    sec('Cliente', f'<dl class="cv-dl"><div><dt>Cliente</dt><dd>Hélio Batista Corrêa</dd></div><div><dt>Quem escreve</dt><dd>Marta, esposa</dd></div><div><dt>Contato</dt><dd>Principal da ficha</dd></div></dl>'
        f'<a class="btn btn-sec" href="{FICHA_CL}">{ico("pessoas")}Abrir a ficha</a>', 'pessoas'),
    sec('Caso', f'<dl class="cv-dl"><div><dt>Processo</dt><dd>Corrêa x Rota Sul</dd></div><div><dt>Etapa</dt><dd>Instrução marcada</dd></div></dl>'
        f'<a class="ver" href="agenda.html?estado=dia">Instrução amanhã, 13:30, no TRT-2{ico("dir", "ico ico-s")}</a>', 'balanca'),
    sec('Avisos enviados', AVISOS_HELIO, 'whats'),
], 'Hélio')


def tela_caixa(lista_html, conv_html, ctx_pair, foco='foco-conversa', nome=''):
    return f'<div class="cv">{caixa(lista_html, conv_html, ctx_pair, foco, nome)}</div>'


# fila (Hélio aberto, celular mostra a lista)
CONV_HELIO = conv(cab_conv('Hélio Batista Corrêa', '(11) 98114-3059', 'Quem escreve: <b>Marta Corrêa</b>, esposa, contato principal'),
                  barra_est('espera', 'Desde 09:12 · responsável: <b>Marina Ribeiro (você)</b>', BT_PASSAR),
                  HELIO_MSGS, compor_bloq('A IA está esperando alguém da equipe. Para escrever para Marta, assuma a conversa: a IA fica em silêncio até você devolver.'))
CONV_HELIO_ASS = conv(cab_conv('Hélio Batista Corrêa', '(11) 98114-3059', 'Quem escreve: <b>Marta Corrêa</b>, esposa, contato principal'),
                      barra_est('voce', 'Você assumiu às 10:15. A IA não responde enquanto isso.', BT_DEVOLVER),
                      HELIO_ASSUMIDA, compor('Marta'))

CTX_JOANA = ctx([
    sec('Por que a IA passou', f'<p class="cv-por"><b>Documento novo.</b> Joana mandou a foto da carta de indeferimento do INSS. Alguém precisa ver se está legível e se a foto basta.</p>'
        f'<p class="sub">Foi para Diego porque ele é o responsável pelo próximo contato de Antônia.</p>', 'ia'),
    sec('Próximo contato', aviso('urgencia', 'Vencido há 5 dias', 'Era 13/11: ligar para Joana sobre a carta do INSS, com Diego Almeida. Esta conversa resolve isso.', papel='status')
        + f'<a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=registrar">{ico("mais")}Registrar atendimento</a>', 'relogio'),
    sec('Cliente', f'<dl class="cv-dl"><div><dt>Cliente</dt><dd>Antônia Ferreira Prado</dd></div><div><dt>Quem escreve</dt><dd>Joana, filha</dd></div></dl>'
        f'<a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=ficha">{ico("pessoas")}Abrir a ficha</a>', 'pessoas'),
], 'Antônia')
CONV_JOANA = conv(cab_conv('Antônia Ferreira Prado', '(11) 99123-4567', 'Quem escreve: <b>Joana Prado</b>, filha, contato principal'),
                  barra_est('espera', 'Desde 08:10 · responsável: <b>Diego Almeida</b>', BT_PASSAR),
                  JOANA_MSGS, compor_bloq('A IA está esperando alguém da equipe. Diego é o responsável, mas qualquer pessoa pode assumir.'))

CTX_GAB = ctx([
    sec('O que a IA usou', f'<ul class="cv-mini"><li>{ico("agenda")}<span><b>Agenda</b><small>Conciliação hoje, 11:00, virtual, com Marina.</small></span></li>'
        f'<li>{ico("pessoas")}<span><b>Ficha de Clientes</b><small>Gabriela é a própria cliente e o contato principal.</small></span></li></ul>'
        f'<a class="ver" href="agenda.html?estado=compromisso">Abrir o compromisso{ico("dir", "ico ico-s")}</a>', 'ia'),
    sec('Avisos enviados', f'<ul class="cv-mini"><li>{ico("whats")}<span><b>Lembrete de audiência</b> · 17/11<small>1 dia antes. Respondeu “Confirmo”.</small></span></li>'
        f'<li>{ico("whats")}<span><b>Lembrete de audiência</b> · hoje, 09:00<small>2 horas antes, com o link. Entregue.</small></span></li></ul>', 'whats'),
    sec('Cliente', f'<dl class="cv-dl"><div><dt>Cliente</dt><dd>Gabriela Teixeira</dd></div><div><dt>Próximo contato</dt><dd>Hoje, com Marina</dd></div></dl>'
        f'<a class="btn btn-sec" href="{FICHA_CL}">{ico("pessoas")}Abrir a ficha</a>', 'pessoas'),
], 'Gabriela')
CONV_GAB = conv(cab_conv('Gabriela Teixeira', '(11) 99602-7735', 'A própria cliente, contato principal'),
                barra_est('resolvida', 'A IA respondeu sozinha às 08:45 e encerrou às 08:47.', f'<button class="btn btn-sec" type="button">{ico("mao")}Assumir mesmo assim</button>'),
                GABRIELA_MSGS, compor_bloq('Se algo na resposta da IA estiver errado, assuma a conversa e corrija com a cliente. Se Gabriela escrever de novo, a IA volta a responder.', ''))

CTX_RAF = ctx([
    sec('A IA anotou', f'<div class="cv-anotou"><span class="selo selo-implant">{ico("ia")}Rascunho para conferir</span>'
        f'<dl class="cv-dl"><div><dt>Nome</dt><dd>Rafaela Moura</dd></div><div><dt>Telefone</dt><dd class="num">(11) 97640-2281</dd></div>'
        f'<div><dt>Assunto</dt><dd>Trabalhista</dd></div><div><dt>Melhor horário</dt><dd>Depois das 14h</dd></div><div><dt>Origem</dt><dd>WhatsApp</dd></div></dl></div>'
        f'<a class="btn btn-pri" href="../portal-clientes/clientes.html?estado=novo">{ico("pessoa-mais")}Cadastrar como cliente</a>'
        f'<a class="btn btn-sec" href="agenda.html?estado=novo">{ico("agenda")}Marcar primeira reunião</a>'
        f'<p class="cv-nota">{ico("escudo")}<span>A IA não cadastra sozinha: o cadastro abre preenchido para você conferir. A gestação é dado de saúde (sensível na LGPD) e fica só na conversa, fora do cadastro.</span></p>', 'ia'),
    sec('Por que a IA passou', f'<p class="cv-por"><b>Possível cliente novo.</b> Número que não está em Clientes, pedindo atendimento trabalhista.</p>'
        f'<p class="sub">Foi para Diego porque contato novo é da área Comercial.</p>', 'mao'),
], 'Rafaela')
CONV_RAF = conv(cab_conv('Rafaela Moura', '(11) 97640-2281', 'Nome dito na conversa', ficha=False),
                barra_est('espera', 'Desde 09:30 · responsável: <b>Diego Almeida</b>', BT_PASSAR),
                RAFAELA_MSGS, compor_bloq('A IA prometeu uma ligação hoje, depois das 14h. Assuma para responder por aqui.'))


# ---------------------------------------------------------------- janelas
def j_devolver(abrir=False):
    corpo = (area_texto('dv-nota', 'O que a IA precisa saber', 'Marina liga para Marta hoje às 14h sobre a proposta. Se perguntarem do acordo antes disso, diga que a Dra. Marina vai ligar.', opc=True, foco=True,
                        ajuda='A IA usa isto nas próximas respostas desta conversa. O cliente não vê.')
             + marcar('dv-atend', 'Registrar como atendimento na ficha de Hélio', 'Vai para o histórico de atendimento, com o resumo acima, seu nome e a hora.', True)
             + f'<p class="pt-comuns">{ico("ia")}<span>A IA volta a responder as próximas mensagens de Marta. Se precisar de alguém de novo, passa para você.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("devolver")}Devolver para a IA</button>'
    return janela('janela-devolver', 'Hélio Batista Corrêa', 'Devolver a conversa para a IA', 'Você sai da conversa; ela continua na lista “Com a IA”.', corpo, pe, abrir=abrir)


def j_passar(abrir=False):
    corpo = (selecao('ps-quem', 'Passar para', ['Escolha uma pessoa', 'Bianca Torres', 'Felipe Matos', 'Gustavo Lima', 'Larissa Costa', 'Marina Ribeiro (você)', 'Paula Nunes'], 'Paula Nunes', foco=True,
                     ajuda='Só pessoas ativas na equipe. A conversa nunca fica sem responsável.')
             + area_texto('ps-recado', 'Recado', 'Paula, confere se a foto da carta está legível? Se não estiver, peça para Joana trazer o papel na segunda.', opc=True,
                          ajuda='Fica na conversa, só para a equipe.')
             + f'<p class="pt-comuns">{ico("sino")}<span>Paula recebe um aviso no sino e vê a conversa em “Precisa de alguém”. A troca fica registrada na conversa, com seu nome e a hora.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("trocar")}Passar a conversa</button>'
    return janela('janela-passar', 'Antônia Ferreira Prado', 'Passar para outra pessoa', 'Hoje o responsável é Diego Almeida.', corpo, pe, abrir=abrir)


# ---------------------------------------------------------------- outras telas
def tela_fila_vazia():
    nada = (f'<section class="cv-conv" aria-labelledby="cv-ct"><div class="cv-nada"><div class="estado sem-moldura" role="status"><span class="icone-estado">{ico("conversas")}</span>'
            f'<h2 id="cv-ct" style="font-size:24px">Hoje, até agora</h2><p>Nenhuma conversa aberta. Escolha uma à esquerda, ou veja o que a IA fez hoje.</p>'
            f'<div class="cv-hoje"><div><span class="disco"><span>14</span></span>resolvidas pela IA</div><div><span class="disco"><span>3</span></span>passadas e já respondidas</div>'
            f'<div><span class="disco"><span>6</span></span>avisos automáticos enviados</div></div></div></div></section>')
    return f'<div class="cv"><div class="folha cv-caixa foco-lista">{lista("espera", vazio=True)}{nada}<aside class="cv-ctx" aria-label="Contexto"></aside></div></div>'


def nao_conectado(dono=True):
    if dono:
        passos = (f'<ol class="cv-passos">'
                  f'<li><span class="disco"><span>1</span></span><span><b>Separe um número só do escritório.</b><small>Um chip ou número fixo com WhatsApp Business. Não use o celular pessoal de ninguém: o número fica com o escritório.</small></span></li>'
                  f'<li><span class="disco"><span>2</span></span><span><b>Marque a ligação com a equipe T3jus.</b><small>Cerca de 30 minutos, por vídeo, com o celular desse número em mãos. A equipe T3jus faz a ligação com você.</small></span></li>'
                  f'<li><span class="disco"><span>3</span></span><span><b>Revise como a IA se apresenta e quais avisos saem.</b><small>Nada é enviado aos clientes antes da sua revisão.</small></span></li></ol>')
        acoes = f'<a class="btn btn-pri" href="#">{ico("agenda")}Marcar a ligação com a equipe T3jus</a><a class="btn btn-sec" href="#">{ico("ajuda")}Como funciona</a>'
        texto = 'É o número que seus clientes já usam para falar com o escritório. Depois de ligado, a IA responde o que sabe e passa para a equipe o que não sabe.'
    else:
        passos = (f'<ol class="cv-passos"><li><span class="disco"><span>{ico("pessoa")}</span></span><span><b>Quem liga é Marina Ribeiro, a sócia dona.</b>'
                  f'<small>Avise a ela que as conversas ainda não estão ligadas. A equipe T3jus faz a ligação junto com ela, em cerca de 30 minutos.</small></span></li></ol>')
        acoes = ''
        texto = 'Enquanto isso, as conversas com clientes continuam no WhatsApp de sempre, fora do T3jus.'
    e = (f'<div class="estado" role="status"><span class="icone-estado">{ico("whats")}</span><h2 style="font-size:26px">O WhatsApp do escritório ainda não está ligado</h2>'
         f'<p style="max-width:60ch">{texto}</p>{passos}' + (f'<div class="acoes">{acoes}</div>' if acoes else '') + '</div>')
    enquanto = (f'<section class="folha" aria-labelledby="t-enq"><div class="folha-cab"><div><h2 id="t-enq">Enquanto isso</h2><p class="sub">Nada se perde; só não sai mensagem.</p></div></div><ul class="cv-lista-x">'
                f'<li>{ico("relogio")}<span><b>Lembretes de audiência</b> ficam na Agenda como “não enviados”, para a equipe avisar o cliente por conta própria.</span></li>'
                f'<li>{ico("moeda")}<span><b>Avisos de pagamento e atraso</b> não saem. O Financeiro continua mostrando o que vence.</span></li>'
                f'<li>{ico("balanca")}<span><b>Avisos de etapa do caso</b> não saem. A etapa muda normalmente no Jurídico.</span></li>'
                f'<li>{ico("cracha")}<p><b>Precisa de ajuda?</b> Fale com o suporte T3jus em <a href="mailto:suporte@t3jus.pro">suporte@t3jus.pro</a>.</p></li></ul></section>')
    return f'<div class="cv"><div class="cv-nc"><div class="cv-col">{e}</div><aside class="cv-col" aria-label="Enquanto isso">{enquanto}</aside></div></div>'


AVISOS = [
    ('falha', 'alerta', 'Parcela em atraso', 'Parcela 3 de 10 · R$ 1.450,00 · venceu 15/11', 'Eduardo Nascimento', 'Para Eduardo, o próprio', 'hoje, 08:00',
     f'<span class="selo selo-urgente">{ico("alerta")}Não entregue</span><small>O número é fixo e não tem WhatsApp</small>', f'<a class="btn btn-sec btn-compacto" href="{FICHA_CL}">Corrigir na ficha</a>'),
    ('', 'relogio', 'Lembrete de audiência', 'Conciliação hoje, 11:00 · 2 horas antes', 'Gabriela Teixeira', 'Para Gabriela, a própria', 'hoje, 09:00', '<span class="selo selo-neutro">Entregue</span>', ''),
    ('', 'moeda', 'Pagamento recebido', 'Parcela 4 de 10 · R$ 3.200,00', 'Construtora Vale Alto Ltda.', 'Para Ricardo Vale', 'hoje, 08:30', '<span class="selo selo-neutro">Lido</span>', ''),
    ('', 'relogio', 'Lembrete de audiência', 'Conciliação 18/11, 11:00 · 1 dia antes', 'Gabriela Teixeira', 'Para Gabriela, a própria', '17/11, 11:00', f'<span class="selo selo-ok">{ico("check")}Respondeu</span><small>“Confirmo, estarei lá.”</small>', ''),
    ('sel', 'balanca', 'Etapa do caso', 'Prado x INSS · Recurso enviado', 'Antônia Ferreira Prado', 'Para Joana Prado, filha', '16/11, 15:20', '<span class="selo selo-neutro">Lido</span>', ''),
    ('', 'moeda', 'Parcela vai vencer', 'Parcela 2 de 6 · R$ 980,00 · vence 19/11', 'Farmácia Bom Jesus Ltda.', 'Para Sueli Ramos', '16/11, 09:00', '<span class="selo selo-neutro">Lido</span>', ''),
    ('', 'carteira', 'Prestação de contas', 'Levantado R$ 12.400,00 · para Benedito R$ 8.500,00', 'Benedito Souza Lima', 'Para Benedito, o próprio', '14/11, 16:05', '<span class="selo selo-neutro">Lido</span>', ''),
]


def tela_avisos():
    linhas, cartoes = '', ''
    for cls, i, tipo, det, cliente, para, quando, sit, acao in AVISOS:
        c = f' class="{"falha" if cls == "falha" else "sel" if cls == "sel" else ""}"' if cls else ''
        ver = (f'<a class="cv-ver" href="#"{" aria-current=\"true\"" if cls == "sel" else ""}>Ver a mensagem<span class="sr"> de {tipo.lower()} para {cliente}</span></a>')
        linhas += (f'<tr{c}><td><div class="cv-tipo">{ico(i)}<div><strong>{tipo}</strong><small>{det}</small></div></div></td>'
                   f'<td><div class="cv-c"><strong>{H(cliente)}</strong><small>{para}</small></div></td><td class="num" style="white-space:nowrap">{quando}</td>'
                   f'<td><div class="cv-sit">{sit}{acao or ver}</div></td></tr>')
        cartoes += (f'<li class="cartao"{" style=\"border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)\"" if cls == "falha" else ""}{" style=\"background:var(--ambar-3);box-shadow:inset 3px 0 0 var(--vinho)\"" if cls == "sel" else ""}>'
                    f'<div class="cv-tipo">{ico(i)}<div><strong>{tipo}</strong><small>{det}</small></div></div>'
                    f'<dl class="c-dados"><dt>Cliente</dt><dd>{H(cliente)}</dd><dt>Enviado</dt><dd class="num">{quando}</dd></dl><div class="cv-sit">{sit}{acao or ver}</div></li>')
    chips = ''.join(f'<button type="button" aria-pressed="{"true" if k == "Todos" else "false"}">{k} ({n})</button>'
                    for k, n in [('Todos', 23), ('Pagamento', 8), ('Atraso', 3), ('Etapa do caso', 4), ('Audiência', 6), ('Prestação de contas', 2)])
    principal = (f'<section class="folha" aria-labelledby="t-env" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-env">Avisos enviados</h2>'
                 f'<p class="sub">Últimos 7 dias · 23 avisos · 1 não entregue</p></div></div>'
                 f'<div class="cv-av-ferr" role="group" aria-label="Mostrar">{chips}</div>'
                 f'<table class="so-pc cv-tab"><caption class="sr">Avisos automáticos enviados</caption><colgroup><col style="width:34%"><col style="width:25%"><col style="width:17%"><col style="width:24%"></colgroup>'
                 f'<thead><tr><th scope="col">Aviso</th><th scope="col">Cliente</th><th scope="col">Enviado</th><th scope="col">Situação</th></tr></thead><tbody>{linhas}</tbody></table>'
                 f'<ul class="cartoes so-cel" aria-label="Avisos enviados">{cartoes}</ul>'
                 f'<div class="mais"><span>Mostrando 7 de 23</span><button class="btn btn-sec" type="button">Carregar mais</button></div></section>')
    prev = (f'<section class="folha" aria-labelledby="t-prev"><div class="folha-cab"><div><p class="sobretitulo">Etapa do caso</p><h2 id="t-prev">Mensagem para Joana</h2></div></div>'
            f'<div class="cv-prev"><dl class="cv-dl"><div><dt>Cliente</dt><dd>Antônia Ferreira Prado</dd></div><div><dt>Para</dt><dd>Joana Prado, filha (principal)</dd></div>'
            f'<div><dt>Enviado</dt><dd>16/11, 15:20 · Lido</dd></div></dl>'
            f'<p class="cv-av"><span class="de">{ico("whats")}Aviso automático · Etapa do caso</span>Olá, Joana. Novidade no caso da sua mãe, Antônia: o escritório entrou com o recurso no INSS hoje. '
            f'Agora o INSS tem até 30 dias para analisar. Não precisa fazer nada; avisamos quando houver resposta.</p>'
            f'<p class="cv-nota">{ico("balanca")}<span><b>O que disparou:</b> Larissa Costa mudou a etapa do caso para “Recurso enviado”, no Jurídico. O texto vem do modelo dessa etapa, escrito pelo escritório em linguagem simples.</span></p>'
            f'<a class="ver" href="{U}conversa">Abrir a conversa com Joana{ico("dir", "ico ico-s")}</a></div></section>')
    regras = [('Pagamento recebido', 'Ligado', 'Quando o Financeiro registra o recebimento.'),
              ('Parcela vai vencer', 'Ligado', '3 dias antes do vencimento.'),
              ('Parcela em atraso', 'Ligado', '1, 7 e 15 dias depois do vencimento. Para no dia em que a parcela é paga.'),
              ('Etapa do caso', 'Ligado', 'Quando a etapa muda no Jurídico, se a etapa tiver texto para o cliente.'),
              ('Lembrete de audiência', 'Ligado', '1 dia antes e 2 horas antes, com o link da sala quando é virtual.'),
              ('Prestação de contas', 'Ligado', 'Quando o repasse ao cliente é registrado: valor levantado, honorários, custas e o que fica para ele.')]
    rg = ''.join(f'<li><strong>{n}</strong><span class="selo selo-ok">{ico("check")}{s}</span><small>{q}</small></li>' for n, s, q in regras)
    reg = (f'<section class="folha" aria-labelledby="t-reg"><div class="folha-cab"><div><h2 id="t-reg">Quais avisos saem</h2><p class="sub">Pelo WhatsApp do escritório, para o contato principal da ficha</p></div></div>'
           f'<ul class="cv-regras">{rg}</ul><div class="cv-prev"><p class="cv-nota">{ico("cadeado")}<span>Quem muda é Marina Ribeiro, a sócia dona. Cada mudança fica no histórico do escritório.</span></p>'
           f'<a class="btn btn-sec" href="#">{ico("ajustes")}Mudar avisos</a></div></section>')
    cab = (f'<div class="pt-cab"><div><p class="sobretitulo">Pelo WhatsApp do escritório</p><h1>Avisos automáticos</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">O que o T3jus manda sozinho aos clientes: pagamento, atraso, etapa do caso, lembrete de audiência e prestação de contas. Nada sai sem estar ligado aqui.</p></div></div>')
    return f'<div class="cv">{cab}<div class="cv-av-grade"><div class="cv-col">{principal}</div><aside class="cv-col" aria-label="Mensagem e regras">{prev}{reg}</aside></div></div>'


# ---------------------------------------------------------------- estados
def barra_cv(sec_, chave, cont=True):
    q = '<span class="q" aria-label="3 esperando">3</span>' if cont else ''
    links = ''.join(f'<a href="{U}{h}"{" aria-current=\"page\"" if s == sec_ else ""}>{s}{q if s == "Mensagens" else ""}</a>'
                    for s, h in [('Mensagens', 'fila'), ('Avisos automáticos', 'avisos')])
    return (f'<template data-barra="conversas|{chave}"><div class="pt-barra-area"><p class="pt-area-nome">{ico("conversas")}Conversas</p>'
            f'<nav class="pt-secoes" aria-label="Seções de Conversas">{links}</nav></div></template>\n')


BARRAS = barra_cv('Mensagens', 'Mensagens') + barra_cv('Avisos automáticos', 'Avisos automáticos') + barra_cv('Mensagens', 'Mensagens0', False)

C = dict(atual='conversas', area='conversas', secao='Mensagens', trilha='Conversas|Mensagens', titulo='Conversas')
T = ''
T += tpl('fila', tela_caixa(lista('espera', 'helio'), CONV_HELIO, CTX_HELIO, 'foco-lista', 'Hélio') + j_passar(), **C)
T += tpl('conversa', tela_caixa(lista('espera', 'joana'), CONV_JOANA, CTX_JOANA, 'foco-conversa', 'Antônia') + j_passar(), **dict(C, trilha='Conversas|Antônia Ferreira Prado'))
T += tpl('assumida', tela_caixa(lista('espera', 'helio'), CONV_HELIO_ASS, CTX_HELIO, 'foco-conversa', 'Hélio') + j_devolver(), cont='2', **dict(C, trilha='Conversas|Hélio Batista Corrêa'))
T += tpl('devolver', tela_caixa(lista('espera', 'helio'), CONV_HELIO_ASS, CTX_HELIO, 'foco-conversa', 'Hélio') + j_devolver(True), cont='2', **dict(C, trilha='Conversas|Hélio Batista Corrêa'))
T += tpl('passar', tela_caixa(lista('espera', 'joana'), CONV_JOANA, CTX_JOANA, 'foco-conversa', 'Antônia') + j_passar(True), **dict(C, trilha='Conversas|Antônia Ferreira Prado'))
T += tpl('resolvida', tela_caixa(lista('resolvidas', 'gabriela'), CONV_GAB, CTX_GAB, 'foco-conversa', 'Gabriela'), **dict(C, trilha='Conversas|Gabriela Teixeira'))
T += tpl('novo-contato', tela_caixa(lista('espera', 'rafaela'), CONV_RAF, CTX_RAF, 'foco-conversa', 'Rafaela') + j_passar(), **dict(C, trilha='Conversas|Rafaela Moura'))
T += tpl('fila-vazia', tela_fila_vazia(), cont='0', **dict(C, secao='Mensagens0'))
T += tpl('avisos', tela_avisos(), **dict(C, secao='Avisos automáticos', trilha='Conversas|Avisos automáticos'))
T += tpl('nao-conectado', nao_conectado(True), cont='0', **dict(C, secao='Mensagens0'))
T += tpl('nao-conectado-equipe', nao_conectado(False), cont='0', quem='sem-area', **dict(C, secao='Mensagens0'))

out = pagina('Conversas', 'Conversas de WhatsApp dos clientes com a IA do escritório: o que ela resolveu, o que passou para a equipe e os avisos automáticos.',
             '{"estado":"fila","atual":"conversas"}', '', T, BARRAS)
out = finalizar(out, CSS_CV)
open(f'{SAIDA}/conversas.html', 'w', encoding='utf-8').write(out)
print('conversas ok', T.count('<template data-est='), 'estados')
