# Portal · Jurídico (EX-01 a EX-14, CH-05, CH-07, PD-04, PD-05, PD-07, IN-06, IN-08, FI-08; VA-02 fica de fora).
# Reusa a moldura, o CSS e as peças do Portal v1 aprovado (comum.py, sem mudança) e o cabeçalho
# da ficha aprovada do Console v1, como a área Clientes. Peças novas com prefixo ju-.
# Uso: python3 juridico.py <pasta-saida>
import sys, html
from comum import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape
U = 'juridico.html?estado='

# ---------------------------------------------------------------- dados fictícios
# Etapas do escritório (EX-07): nome, o que é, texto ao cliente (EX-14), avisa o Financeiro (CH-07), final (EX-08)
ETAPAS = [
    ('Preparação', 'Juntar documentos e preparar o caso', 'estamos reunindo os documentos e preparando o seu caso. Se pedirmos algum papel, é para isso.', False),
    ('Petição inicial', 'A ação foi distribuída', 'entramos com a ação na Justiça. Agora o juiz vai chamar a outra parte para responder.', False),
    ('Citação e defesa', 'A outra parte responde', 'a outra parte foi chamada e vai apresentar a defesa dela. É normal levar algumas semanas.', False),
    ('Instrução', 'Provas, perícias e audiências', 'é a fase das provas: perícias, testemunhas e audiências. Avisamos a data de cada uma.', False),
    ('Sentença', 'O juiz decidiu', 'o juiz decidiu o caso. Vamos explicar a decisão e o que dá para fazer agora.', False),
    ('Recurso', 'O tribunal revê a decisão', 'vamos pedir para o tribunal rever a decisão. Essa fase costuma levar alguns meses.', False),
    ('Cumprimento', 'Hora de receber', 'a decisão é definitiva e agora é hora de receber. Avisamos quando o valor for liberado.', True),
    ('Encerrado', 'Fim do caso: pede o resultado', 'o seu caso terminou. Obrigado pela confiança; seguimos à disposição.', False),
]
NE = len(ETAPAS)
NOME_E = [e[0] for e in ETAPAS]
POR_ETAPA = [1, 1, 2, 2, 2, 0, 1]  # casos em andamento por etapa (sem o Encerrado)

EQUIPE = ['Marina Ribeiro', 'Felipe Matos', 'Larissa Costa', 'Gustavo Lima', 'Diego Almeida']
INI = {'Marina Ribeiro': 'MR', 'Felipe Matos': 'FM', 'Larissa Costa': 'LC', 'Gustavo Lima': 'GL', 'Diego Almeida': 'DA'}

# (nome do caso, número, área, tribunal/sistema, clientes, etapa (1-based), responsável, próximo prazo (data, rótulo, tipo), pendências)
CASOS = [
    ('Pereira x Mercado Bom Preço', '1001022-33.2026.5.02.0045', 'Trabalhista', 'TRT-2 · PJe', ['Joana Pereira', 'Carlos Henrique Dias'], 5, 'Marina Ribeiro', ('19/11', 'Amanhã', 'amanha'), 2),
    ('Souza x Construtora Atlas', '0812345-67.2026.8.26.0100', 'Cível', 'TJSP · e-SAJ', ['Construtora Atlas Ltda.'], 3, 'Felipe Matos', ('18/11', 'Vence hoje', 'hoje'), 0),
    ('Andrade x Unimed Paulistana', '1004871-20.2025.8.26.0011', 'Saúde', 'TJSP · e-SAJ', ['Roberto Andrade'], 4, 'Larissa Costa', ('18/11', 'Vence hoje', 'hoje'), 1),
    ('Oliveira x Banco Horizonte', '0798812-04.2026.8.26.0100', 'Consumidor', 'TJSP · e-SAJ', ['Sérgio Oliveira'], 3, 'Felipe Matos', ('21/11', 'Em 3 dias', 'depois'), 0),
    ('Lima x Seguradora Norte', '1012233-45.2026.8.26.0100', 'Cível', 'TJSP · e-SAJ', ['Benedito Souza Lima'], 5, 'Gustavo Lima', ('21/11', 'Em 3 dias', 'depois'), 0),
    ('Ferreira x Banco Horizonte', '1000417-58.2026.5.02.0012', 'Trabalhista', 'TRT-2 · PJe', ['Rita de Cássia Ferreira'], 4, 'Marina Ribeiro', ('26/11', '26/11 · qui', 'depois'), 0),
    ('Teixeira x Lojas Brilho', '0024519-11.2025.8.26.0016', 'Consumidor', 'JEC · e-SAJ', ['Gabriela Teixeira'], 7, 'Felipe Matos', ('03/12', '03/12 · qui', 'depois'), 0),
    ('Vale Alto x Prefeitura de Santo André', '1009876-02.2026.8.26.0554', 'Tributário', 'TJSP · e-SAJ', ['Construtora Vale Alto Ltda.'], 2, 'Felipe Matos', None, 1),
    ('Ferreira Prado x INSS', '', 'Previdenciário', 'JEF · PJe', ['Antônia Ferreira Prado'], 1, 'Larissa Costa', None, 2),
]
FICHA = U + 'ficha'

# ---------------------------------------------------------------- CSS
_fi = open(APROV + 'console-v1/ficha.html', encoding='utf-8').read()
_cf = _fi[_fi.index('<style>') + 7:_fi.index('</style>')]
CSS_FICHA_CAB = '\n'.join(r.strip() + '}' for r in _cf.split('}')
                          if r.strip().startswith(('.ficha-cab', '.voltar', '.ident', '.meta', '.estatua', '.dir', '.etapas')))

CSS_JU = r"""
/* ===== Cabeçalho da ficha: o da ficha aprovada do Console v1, sem mudança ===== */
""" + CSS_FICHA_CAB + r"""

/* ==========================================================================
   Portal · Jurídico. Prefixo ju- nas peças novas. Só pares do contraste.md.
   ========================================================================== */
.ju{display:flex;flex-direction:column;gap:24px;min-width:0}
.ju-grade{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.ju-grade .explica{padding-bottom:84px}
.ju-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.ju-cab-lista{align-items:flex-end}
.ju-cab-acoes{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.ju-cab-acoes .btn-sec{background:rgba(255,255,255,.92)}

/* Lista de casos */
.ju-ferr{display:flex;align-items:flex-end;gap:12px;padding:16px 24px;flex-wrap:wrap}
.ju-ferr .campo-busca{position:relative;flex:1 1 240px;max-width:340px}
.ju-ferr .campo-busca .ico{position:absolute;left:14px;top:12px;color:var(--vinho-4);pointer-events:none}
.ju-ferr .campo-busca input{padding-left:44px}
.ju-ferr .campo{flex:0 1 180px}
.ju-ferr .campo label{font-size:12px;color:var(--texto-2);font-weight:500}
.ju-ferr .chips{margin-left:auto}
.ju-cont{padding:0 24px 12px;font-size:13px;color:var(--texto-2)}
.ju-cont b{color:var(--texto);font-weight:500}
.ju-tab td{vertical-align:middle}
.ju-tab .esc a{display:inline-flex;align-items:center;min-height:44px}
.ju-tab .esc small{margin-top:0}
.ju-cli strong{display:block;font-weight:500;font-size:14px;line-height:1.35}
.ju-cli small{display:block;font-size:12px;color:var(--texto-2)}
.ju-et{display:grid;gap:6px;justify-items:start}
.ju-et b{font-weight:500;font-size:14px;color:var(--vinho)}
.ju-et small{font-size:12px;color:var(--texto-2)}
.ju-mini{display:grid;grid-template-columns:repeat(8,1fr);gap:3px;width:112px}
.ju-mini i{height:5px;border-radius:3px;background:var(--sal)}
.ju-mini i.f{background:var(--vinho)}
.ju-mini i.a{background:var(--ambar)}
.ju-pz{display:grid;gap:4px;justify-items:start}
.ju-pz small{font-size:12px;color:var(--texto-2)}
.ju-sem{font-size:13px;color:var(--texto-2)}
.ju-pend-n{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--texto)}
.ju-pend-n .ico{width:16px;height:16px;color:var(--vinho-3)}
.ju-tab tr.ju-hoje td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}
.cartao.ju-hoje{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}

/* Onde estão os casos (IN-08: casos por etapa), discreto, serve de filtro */
.ju-onde{padding:4px 24px 16px}
.ju-onde h3{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);margin-bottom:8px}
.ju-onde ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.ju-onde button{position:relative;width:100%;min-height:52px;display:grid;gap:4px;align-content:center;justify-items:start;padding:6px 10px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel);font:inherit;color:var(--texto);cursor:pointer;text-align:left}
.ju-onde button:hover{border-color:var(--vinho-4);background:#FCF8F5}
.ju-onde button span{font-size:12px;color:var(--texto-2);line-height:1.2}
.ju-onde button b{font-family:var(--serifa);font-size:22px;line-height:1;font-weight:600;color:var(--vinho)}
.ju-onde button[aria-pressed="true"]{background:var(--ambar-3);border-color:var(--vinho-2)}
.ju-onde button.zero b{color:var(--texto-2)}

/* Ficha: etapa no âmbar */
.dir .btn{align-self:flex-start}
.ficha-cab .esq .meta .selo-ativo{background:var(--ambar-3);color:var(--vinho)}
.dir .etapas li.agora{display:flex;flex-direction:column;align-items:stretch;gap:6px;margin:0;font-size:12px;color:var(--tinta)}
.dir .etapas li.agora::after{display:none}
.dir .etapas.ju-et8{grid-template-columns:repeat(8,1fr);gap:3px}
.dir .ju-agora{font-size:13px;color:var(--tinta);line-height:1.45}
.dir .ju-agora b{font-weight:600}
.dir .grande small{font-family:var(--serifa);font-size:24px;color:var(--vinho);margin-left:10px;font-weight:500}
.ju-meta-sis{display:inline-flex;align-items:center;gap:6px}

/* Folhas da ficha */
.ju-dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.ju-dl>div:nth-child(odd){border-right:0}
.ju-dl>div{border-right:1px solid var(--divisor)!important}
.ju-dl>div:nth-child(3n){border-right:0!important}
.ju-clientes>li{display:grid;grid-template-columns:40px minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.3fr);gap:14px;align-items:center;padding:14px 24px}
.ju-clientes a.n{font-family:var(--serifa);font-size:18px;color:var(--vinho);text-decoration:none;font-weight:500;display:inline-flex;min-height:44px;align-items:center;margin:-8px 0 -6px}
.ju-clientes a.n:hover{text-decoration:underline}
.ju-clientes small{display:block;font-size:12px;color:var(--texto-2)}
.ju-clientes .tel{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--vinho);text-decoration:none;font-size:13px}
.ju-clientes .tel .ico{width:16px;height:16px;color:var(--vinho-4)}
.ju-hon b{display:block;font-weight:500;font-size:14px}
.ju-hon small{display:block}
.ju-sub{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 24px 6px;border-top:1px solid var(--divisor)}
.ju-sub h3{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.ju-sub:first-of-type{border-top:0}
.ju-itens{list-style:none;margin:0;padding:0 24px 8px}
.ju-itens li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--divisor)}
.ju-itens li:first-child{border-top:0}
.ju-itens strong{display:block;font-weight:500;line-height:1.35}
.ju-itens small{display:block;font-size:12px;color:var(--texto-2)}
.ju-itens .lado{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.ju-itens li.feito strong{color:var(--texto-2);text-decoration:line-through;text-decoration-color:var(--vinho-4)}
.ju-falta>li{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 24px}
.ju-falta .doc-ico{background:transparent;box-shadow:inset 0 0 0 1.5px var(--vinho-4);border-radius:10px}
.ju-falta .doc-ico .ico{color:var(--vinho-3)}

/* Lateral */
.ju-trava{list-style:none;margin:0;padding:0 24px 16px;display:grid;gap:10px}
.ju-trava li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.45}
.ju-trava li .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.ju-trava li b{font-weight:600}
.ju-trava li .blq{display:block;margin-top:4px;color:var(--tinta)}
.ju-trava li .btn{margin-top:8px}
.ju-ctr{list-style:none;margin:0;padding:0 24px 10px}
.ju-ctr li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.ju-ctr li:first-child{border-top:0}
.ju-ctr .ico{width:18px;height:18px;color:var(--vinho-4);margin-top:1px}
.ju-ctr b{font-weight:500;display:block;font-size:14px}
.ju-ctr small{display:block;font-size:12px;color:var(--texto-2)}
.ju-fin{margin:0;padding:0 24px 8px;display:grid;gap:0}
.ju-fin div{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.ju-fin div:first-child{border-top:0}
.ju-fin dt{color:var(--texto-2)}
.ju-fin dd{margin:0;font-weight:500;font-size:15px;text-align:right}
.ju-fin dd.g{font-family:var(--serifa);font-size:24px;color:var(--vinho);font-weight:500}
.ju-nota{padding:0 24px 18px;font-size:12px;color:var(--texto-2);line-height:1.5;display:flex;gap:8px;align-items:flex-start}
.ju-nota .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}
.ju-aviso-cli{padding:0 24px 18px;display:grid;gap:10px;font-size:13px}
.ju-aviso-cli .lig{display:flex;align-items:center;gap:8px;font-weight:500}
.ju-aviso-cli .lig .ico{color:var(--vinho)}
.ju-aviso-cli p{color:var(--texto-2);line-height:1.5}
.ju-hist{margin:0;padding:0 24px 20px;list-style:none}
.ju-hist li{display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.ju-hist li:first-child{border-top:0}
.ju-hist time{color:var(--texto-2);font-size:12px;padding-top:1px}
.ju-hist b{font-weight:600;color:var(--vinho)}
.ju-hist em{display:block;font-family:var(--serifa);font-size:15px;color:var(--vinho);font-style:italic;margin-top:2px}
.ju-hist small{display:block;font-size:12px;color:var(--texto-2);margin-top:2px}
.ju-hist li.novo{background:#FCF8F5;margin:0 -10px;padding-left:10px;padding-right:10px;border-radius:var(--raio)}

/* Janela de mudar etapa */
@media (min-width:761px){.janela.ju-larga{width:min(680px,calc(100vw - 32px))}}
.ju-de{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px}
.ju-de b{font-weight:600;color:var(--vinho)}
.ju-fs{border:0;margin:0;padding:0;min-width:0;display:grid;gap:8px}
.ju-fs>legend{font-size:13px;font-weight:500;padding:0;margin-bottom:8px;color:var(--texto)}
.ju-fs>legend small{font-weight:400;color:var(--texto-2);margin-left:6px}
.ju-ops{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}
.ju-ops .opcao{margin:0;border:1px solid var(--borda-folha);padding:8px 10px;align-items:center;min-height:48px}
.ju-ops .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.ju-ops .opcao .n{font-family:var(--serifa);font-weight:600;color:var(--vinho);width:16px;text-align:center}
.ju-ops .opcao.atual{border-style:dashed;background:var(--sal-2)}
.ju-ops .opcao small{display:block}
.ju-res .ju-ops{grid-template-columns:repeat(3,1fr)}
.ju-wpp{border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:14px 16px;display:grid;gap:12px;background:var(--papel)}
.ju-wpp .opcao{margin:-6px -8px}
.ju-balao{position:relative;margin:0;background:var(--sal-2);border-radius:4px 14px 14px 14px;padding:12px 14px;font-size:14px;line-height:1.55;color:var(--tinta)}
.ju-balao-cab{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--texto-2)}
.ju-balao-cab .ico{width:16px;height:16px;color:var(--vinho-4)}
.ju-wpp .ju-para{font-size:12px;color:var(--texto-2)}
.ju-calc{border-radius:var(--raio);background:var(--ambar-3);padding:14px 16px;display:grid;gap:8px;font-size:13px;color:var(--tinta)}
.ju-calc h3{font-family:var(--sans);font-size:13px;font-weight:600;display:flex;gap:8px;align-items:center}
.ju-calc h3 .ico{width:18px;height:18px;color:var(--vinho)}
.ju-calc table{table-layout:auto}
.ju-calc td,.ju-calc th{padding:6px 0;border:0;border-top:1px solid rgba(105,39,70,.18);font-size:13px;text-align:left;background:transparent;text-transform:none;letter-spacing:0;color:var(--tinta)}
.ju-calc td:last-child,.ju-calc th:last-child{text-align:right}
.ju-calc tbody td:first-child,.ju-calc thead th:first-child{padding-left:0}
.ju-calc tfoot td{font-weight:600}
.ju-calc p{line-height:1.5}
.ju-dois{display:grid;grid-template-columns:1fr 1fr;gap:16px}

/* Prazos */
.ju-grupo{padding:4px 8px 0}
.ju-grupo>h3{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:14px 16px 4px;display:flex;align-items:center;gap:8px}
.ju-grupo>h3 .q{font-size:11px;font-weight:600;background:var(--sal-2);color:var(--vinho-2);border-radius:10px;padding:1px 7px;letter-spacing:0}
.ju-prazos .prazo{grid-template-columns:64px minmax(0,1fr) auto}
.ju-prazos .lado{flex-direction:row!important;align-items:center!important;gap:12px!important}
.ju-prazos .lado .ju-l{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.ju-prazos .prazo>div>a{display:inline-flex;align-items:center;min-height:44px}
.ju-prazos .p b{font-weight:500;color:var(--texto)}
.ju-pe{display:flex;align-items:flex-start;gap:10px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2);line-height:1.5}
.ju-pe .ico{color:var(--vinho-4);margin-top:1px;flex:none}

/* Tarefas */
.ju-tarefas{list-style:none;margin:0;padding:0 8px}
.ju-tarefas>li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 16px;border-top:1px solid var(--divisor)}
.ju-tarefas>li:first-child{border-top:0}
.ju-tarefas .opcao{margin:0;padding:6px 0;align-items:flex-start}
.ju-tarefas .opcao:hover{background:transparent}
.ju-tarefas .opcao strong{display:block;font-weight:500;line-height:1.35}
.ju-tarefas .opcao small a{color:var(--vinho);font-weight:500;text-decoration:none}
.ju-tarefas .opcao small a:hover{text-decoration:underline}
.ju-tarefas .lado{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.ju-tarefas li.bloq .opcao strong{color:var(--texto)}
.ju-tarefas .opcao{min-height:44px;padding:10px 0 0;align-items:flex-start}
.ju-tarefas .ju-caso{display:flex;align-items:center;width:fit-content;min-height:44px;margin:-16px 0 -8px 34px;font-size:12px;color:var(--vinho);font-weight:500;text-decoration:none}
.ju-tarefas .ju-caso:hover{text-decoration:underline}
.ju-tarefas .ju-espera{margin-left:34px;margin-bottom:6px}
.ju-espera{display:flex;align-items:flex-start;gap:6px;margin-top:4px;font-size:12px;color:var(--tinta);background:var(--ambar-3);border-radius:6px;padding:4px 8px;width:fit-content}
.ju-espera .ico{width:14px;height:14px;color:var(--vinho);margin-top:2px}
.ju-carga{list-style:none;margin:0;padding:0 24px 8px}
.ju-carga li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--divisor)}
.ju-carga li:first-child{border-top:0}
.ju-carga .av-p{width:30px;height:30px;font-size:11px}
.ju-carga strong{display:block;font-weight:500;font-size:13px;line-height:1.35}
.ju-carga strong span{display:block;font-weight:400;color:var(--texto-2);font-size:12px}
.ju-barra{display:flex;gap:2px;height:6px;margin-top:6px}
.ju-barra i{display:block;height:6px;border-radius:3px}
.ju-barra .c{background:var(--vinho-4)}
.ju-barra .t{background:var(--ambar-2)}
.ju-leg{display:flex;gap:14px;flex-wrap:wrap;padding:0 24px 16px;font-size:12px;color:var(--texto-2)}
.ju-leg span{display:inline-flex;align-items:center;gap:6px}
.ju-leg i{width:10px;height:10px;border-radius:2px;display:inline-block}

/* Etapas do escritório */
.ju-etapas{list-style:none;margin:0;padding:0}
.ju-etapas>li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 24px;border-top:1px solid var(--divisor)}
.ju-etapas>li:first-child{border-top:0}
.ju-etapas .disco{--d:40px;--f:20px}
.ju-etapas .nm strong{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:var(--serifa);font-size:19px;font-weight:500;color:var(--vinho);line-height:1.25}
.ju-etapas .nm strong .selo{font-family:var(--sans)}
.ju-etapas .nm small{display:block;font-size:12px;color:var(--texto-2)}
.ju-etapas .nm q{display:block;margin-top:4px;font-size:13px;color:var(--texto);quotes:"“" "”"}
.ju-etapas .ac{display:flex;align-items:center;gap:4px}
.ju-etapas .ac .btn-icone{width:44px;min-width:44px;min-height:44px;border-radius:var(--raio)}
.ju-etapas .ac .btn-icone .ico{width:18px;height:18px}
.ju-etapas li.edit{background:#FCF8F5;grid-template-columns:48px minmax(0,1fr);align-items:start}
.ju-edit{display:grid;gap:14px}
.ju-edit .ju-dois{gap:14px}
.ju-edit-pe{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.ju-ph{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--texto-2)}
.ju-ph code{font-family:var(--fonte-codigo);font-size:12px;background:var(--sal-2);color:var(--vinho);padding:2px 6px;border-radius:6px}
.ju-icone-up{transform:rotate(180deg)}
.ju-cont-casos{font-size:12px;color:var(--texto-2);white-space:nowrap}

/* Petições: lugar reservado e pergunta (EX-09, a validar) */
.ju-reserva{margin:0 24px 20px;padding:18px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);display:grid;gap:12px;font-size:14px;color:var(--texto);line-height:1.55}
.ju-reserva div{display:flex;gap:10px;align-items:flex-start}
.ju-reserva .ico{color:var(--vinho-4);flex:none;margin-top:2px}
.ju-pergunta{padding:4px 24px 24px;display:grid;gap:16px}
.ju-pergunta .ju-ops{grid-template-columns:1fr}

/* Vazio */
.ju-passos{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:10px;text-align:left;max-width:520px;width:100%}
.ju-passos li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel)}
.ju-passos .disco{--d:36px;--f:18px}
.ju-passos b{display:block;font-weight:500}
.ju-passos small{display:block;font-size:12px;color:var(--texto-2)}

/* Novo caso */
.ju-cli-edit{grid-column:1/-1;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--sal-2);padding:14px 16px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr) minmax(0,1.3fr) 44px;gap:12px;align-items:start}
.ju-cli-edit .remover{margin-top:26px}
.ju-cli-edit .remover{width:44px;height:44px;display:grid;place-items:center;border-radius:var(--raio);border:0;background:transparent;color:var(--vinho);cursor:pointer}
.ju-cli-edit .remover:hover{background:var(--ambar-3)}
.ju-sec{grid-column:1/-1;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--divisor);margin-top:4px}
.ju-sec h3{font-size:19px;font-weight:600;color:var(--vinho)}
.ju-sec small{font-size:12px;color:var(--texto-2)}
.ju-sec.ju-primeira{border-top:0;padding-top:0;margin-top:0}
.ju-span{grid-column:1/-1}

@media (max-width:760px){
  .ju .btn-compacto,.janela .btn-compacto{min-height:44px}
  .ju{gap:16px}
  .ju-grade{grid-template-columns:minmax(0,1fr);gap:16px}
  .ju-ficha-grade>aside{display:contents}
  .ju-ficha-grade>aside>*{order:1}
  .ju-ficha-grade>aside>.ju-primeiro{order:-1}
  .ju-col{gap:16px}
  .ju-cab-lista{flex-direction:column;align-items:stretch}
  .ju-cab-acoes{flex-direction:column}
  .ju-cab-acoes .btn{width:100%}
  .cabeca-ambar{padding:22px 16px 20px}
  .cabeca-ambar h1{font-size:34px}
  .ju-ferr{padding:16px;gap:10px}
  .ju-ferr .campo-busca{flex-basis:100%;max-width:none}
  .ju-ferr .campo{flex:1 1 calc(50% - 5px)}
  .ju-ferr .chips{margin-left:0}
  .ju-cont{padding:0 16px 10px}
  .ju-onde{padding:4px 16px 14px}
  .ju-onde ul{display:flex;overflow-x:auto;padding-bottom:4px}
  .ju-onde li{flex:0 0 116px}
  .ju-dl{grid-template-columns:1fr 1fr}
  .ju-dl>div:nth-child(3n){border-right:1px solid var(--divisor)!important}
  .ju-dl>div:nth-child(2n){border-right:0!important}
  .ju-dl>div{padding:12px 16px!important}
  .ju-clientes>li{grid-template-columns:40px minmax(0,1fr);padding:14px 16px}
  .ju-clientes>li>:nth-child(n+3){grid-column:2}
  .ju-sub{padding:12px 16px 6px;flex-wrap:wrap}
  .ju-itens{padding:0 16px 8px}
  .ju-itens li{grid-template-columns:1fr}
  .ju-itens .lado{justify-content:flex-start}
  .ju-falta>li{grid-template-columns:40px minmax(0,1fr);padding:14px 16px}
  .ju-falta>li>.doc-acoes{grid-column:1/-1;justify-content:flex-start}
  .docs>li{grid-template-columns:40px minmax(0,1fr)!important;padding:14px 16px!important}
  .docs>li>.doc-acoes{grid-column:1/-1;justify-content:flex-start}
  .ju-trava,.ju-ctr,.ju-fin,.ju-hist{padding-left:16px;padding-right:16px}
  .ju-nota,.ju-aviso-cli{padding-left:16px;padding-right:16px}
  .ju-ops,.ju-res .ju-ops{grid-template-columns:1fr}
  .ju-dois{grid-template-columns:1fr}
  .ju-grupo{padding:4px 0 0}
  .ju-prazos .prazo{grid-template-columns:52px minmax(0,1fr)!important}
  .ju-prazos .lado{grid-column:2;flex-wrap:wrap;justify-content:flex-start}
  .ju-prazos .lado .ju-l{flex-direction:row;flex-wrap:wrap;align-items:center}
  .ju-pe{padding:12px 16px 16px}
  .ju-tarefas{padding:0}
  .ju-tarefas>li{grid-template-columns:1fr;padding:8px 16px}
  .ju-tarefas .lado{justify-content:flex-start;padding-left:34px}
  .ju-carga{padding:0 16px 8px}
  .ju-leg{padding:0 16px 16px}
  .ju-etapas>li{grid-template-columns:40px minmax(0,1fr);padding:14px 16px}
  .ju-etapas>li>.ac{grid-column:2;justify-content:flex-start}
  .ju-etapas li.edit{grid-template-columns:1fr}
  .ju-etapas .disco{--d:36px;--f:18px}
  .ju-reserva{margin:0 16px 16px}
  .ju-pergunta{padding:4px 16px 20px}
  .ju-cli-edit{grid-template-columns:1fr 44px}
  .ju-cli-edit>.campo{grid-column:1}
  .ju-cli-edit .remover{grid-column:2;grid-row:1}
  .ficha-cab .esq .ident h1{font-size:30px!important}
  .ju-hist li.novo{margin:0 -8px;padding-left:8px;padding-right:8px}
  .ju-de{flex-direction:column;align-items:flex-start;gap:4px}
}
"""

# ---------------------------------------------------------------- peças comuns
def resp(nome):
    return f'<span class="resp"><i aria-hidden="true">{INI[nome]}</i>{nome}</span>'


def selo_prazo(tipo, rot):
    if tipo == 'hoje':
        return f'<span class="selo selo-urgente">{ico("alerta")}{rot}</span>'
    if tipo == 'amanha':
        return f'<span class="selo selo-atencao">{ico("relogio")}{rot}</span>'
    if tipo == 'atraso':
        return f'<span class="selo selo-urgente">{ico("alerta")}{rot}</span>'
    return f'<span class="selo selo-neutro">{rot}</span>'


def mini(n):
    return '<span class="ju-mini" aria-hidden="true">' + ''.join(
        f'<i class="{"f" if i < n - 1 else ("a" if i == n - 1 else "")}"></i>' for i in range(NE)) + '</span>'


def etapa_cel(n):
    return f'<div class="ju-et"><b>{NOME_E[n - 1]}</b>{mini(n)}<small>{n} de {NE}</small></div>'


def campo(id_, rot, valor='', cls='c3', tipo='text', opc=False, ajuda='', erro='', ac='off', im='', foco=False, ph=''):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    desc, aj, er, a = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{id_}-er'); a += ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if im:
        a += f' inputmode="{im}"'
    if foco:
        a += ' data-foco'
    if ph:
        a += f' placeholder="{H(ph)}"'
    v = f' value="{H(valor)}"' if valor else ''
    return (f'<div class="campo {cls}"><label for="{id_}">{rot}{o}</label>'
            f'<input class="entrada" id="{id_}" name="{id_}" type="{tipo}" autocomplete="{ac}"{v}{a}>{aj}{er}</div>')


def selecao(id_, rot, opcoes, sel='', cls='c3', opc=False, ajuda='', vazio='Escolha'):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    ops = (f'<option value="">{vazio}</option>' if vazio else '') + ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in opcoes)
    aj, a = '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; a = f' aria-describedby="{id_}-aj"'
    return f'<div class="campo {cls}"><label for="{id_}">{rot}{o}</label><select class="entrada" id="{id_}" name="{id_}"{a}>{ops}</select>{aj}</div>'


def folha(id_, titulo, sub, corpo, acoes='', estilo='', peq=False):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    st = ' style="font-size:20px"' if peq else ''
    pad = ' style="padding-bottom:8px"' if peq else ''
    return (f'<section class="folha" aria-labelledby="{id_}"{estilo}><div class="folha-cab"{pad}><div><h2 id="{id_}"{st}>{titulo}</h2>{s}</div>{a}</div>{corpo}</section>')


BARRAS = ''.join(f'<template data-barra="juridico|{s}">{barra_area("juridico", s)}</template>\n' for s in AREA['juridico'][3])


def A(secao, trilha, titulo, **kw):
    d = dict(area='juridico', secao=secao, atual='juridico', trilha=trilha, titulo=titulo)
    d.update(kw)
    return d

# ---------------------------------------------------------------- Casos e processos: lista
def cab_casos(dono=True):
    b = (f'<div class="ju-cab-acoes">' + (f'<a class="btn btn-sec" href="{U}etapas">{ico("ajustes")}Etapas do escritório</a>' if dono else '')
         + f'<a class="btn btn-escuro" href="{U}novo-caso">{ico("mais")}Novo caso</a></div>')
    return (f'<div class="cabeca-ambar campo-ambar cabeca-equipe ju-cab-lista"><div><p class="sobretitulo">Jurídico</p><h1>Casos e processos</h1><span class="fio" aria-hidden="true"></span>'
            f'<p class="lede">Cada caso com os clientes, a etapa, os prazos e o que falta. A lista mostra o número, o cliente e a etapa sem precisar abrir.</p></div>{b}</div>')


def onde(sel=None):
    li = ''
    for i, n in enumerate(POR_ETAPA):
        nome = NOME_E[i]
        pr = ' aria-pressed="true"' if sel == i else ' aria-pressed="false"'
        z = ' class="zero"' if n == 0 else ''
        li += f'<li><button type="button"{pr}{z}><b>{n}</b><span>{nome}</span><span class="sr"> casos nesta etapa</span></button></li>'
    return (f'<div class="ju-onde"><h3 id="t-onde">Onde estão os 9 casos em andamento</h3>'
            f'<ul aria-labelledby="t-onde">{li}</ul></div>')


def ferr_casos(resp_sel='Todos', etapa_sel='Todas', ocupado=False):
    bz = ' aria-busy="true"' if ocupado else ''
    return (f'<form class="ju-ferr" role="search" action="#" onsubmit="return false"{bz}>'
            f'<div class="campo-busca"><label class="sr" for="ju-busca">Buscar por caso, número do processo, cliente ou parte contrária</label>{ico("busca")}'
            f'<input class="entrada" id="ju-busca" type="search" placeholder="Caso, número ou cliente" autocomplete="off" spellcheck="false"></div>'
            + selecao('f-resp', 'Responsável', ['Todos'] + EQUIPE[:4], resp_sel, '', vazio='')
            + selecao('f-etapa', 'Etapa', ['Todas'] + NOME_E[:-1], etapa_sel, '', vazio='')
            + '<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="true">Em andamento (9)</button><button type="button" aria-pressed="false">Encerrados (14)</button></div></form>')


def lista_casos(itens):
    linhas, cartoes = '', ''
    for nome, num, area, trib, clis, et, rsp, pz, pend in itens:
        hoje = pz and pz[2] == 'hoje'
        cls = ' class="ju-hoje"' if hoje else ''
        n = num if num else 'Sem número ainda'
        c1 = H(clis[0])
        cmais = f'<small>e mais {len(clis) - 1} cliente</small>' if len(clis) > 1 else '<small>&nbsp;</small>'
        cmais_txt = f' e mais {len(clis) - 1}' if len(clis) > 1 else ''
        pzh = (f'<div class="ju-pz">{selo_prazo(pz[2], pz[1] if pz[2] in ("hoje", "amanha") else pz[1])}<small>{"" if pz[2] in ("depois",) else pz[0]}</small></div>' if pz
               else '<span class="ju-sem">Nenhum aberto</span>')
        pe = (f'<span class="ju-pend-n">{ico("alerta")}{pend} {"pendência" if pend == 1 else "pendências"}</span>' if pend else '<span class="ju-sem">Nenhuma</span>')
        href = FICHA
        linhas += (f'<tr{cls}><td><div class="esc"><div><a href="{href}">{H(nome)}</a><small class="num">{n} · {area}</small></div></div></td>'
                   f'<td><div class="ju-cli"><strong>{c1}</strong>{cmais}</div></td><td>{etapa_cel(et)}</td>'
                   f'<td>{resp(rsp)}</td><td>{pzh}</td><td>{pe}</td></tr>')
        selos = (selo_prazo(pz[2], 'Prazo ' + pz[1].lower() if pz[2] in ('hoje', 'amanha') else 'Prazo ' + pz[0]) if pz else '') + \
                (f'<span class="selo selo-andamento">{ico("alerta")}{pend} {"pendência" if pend == 1 else "pendências"}</span>' if pend else '')
        cartoes += (f'<li class="cartao{" ju-hoje" if hoje else ""}"><div class="c-topo"><div><a class="c-nome" href="{href}">{H(nome)}</a><small class="num">{n}</small></div>{ico("dir", "ico c-ir")}</div>'
                    f'<dl class="c-dados"><dt>Cliente</dt><dd>{c1}{cmais_txt}</dd><dt>Etapa</dt><dd>{NOME_E[et - 1]} · {et} de {NE}</dd><dt>Responsável</dt><dd>{rsp}</dd></dl>'
                    + (f'<div class="c-selos">{selos}</div>' if selos else '') + '</li>')
    cols = '<col style="width:27%"><col style="width:17%"><col style="width:16%"><col style="width:15%"><col style="width:13%"><col style="width:12%">'
    return (f'<table class="so-pc ju-tab"><caption class="sr">Casos em andamento</caption><colgroup>{cols}</colgroup>'
            f'<thead><tr><th scope="col">Caso e processo</th><th scope="col">Cliente</th><th scope="col">Etapa</th><th scope="col">Responsável</th><th scope="col">Próximo prazo</th><th scope="col">Pendências</th></tr></thead>'
            f'<tbody>{linhas}</tbody></table><ul class="cartoes so-cel" aria-label="Casos em andamento">{cartoes}</ul>')


def pagina_casos(itens=CASOS, dono=True, resp_sel='Todos', cont=None):
    c = cont or f'<b>9 casos em andamento</b> · 2 com prazo hoje · ordenados pelo prazo mais próximo'
    return (f'<div class="ju">{cab_casos(dono)}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de casos</h2>'
            f'{ferr_casos(resp_sel)}{onde()}<p class="ju-cont" role="status">{c}</p>{lista_casos(itens)}</section></div>')


def casos_vazio():
    passos = (f'<ol class="ju-passos"><li><span class="disco"><span>1</span></span><span><b>Confira as etapas do escritório</b><small>Já vêm 8 etapas sugeridas, da preparação ao encerramento. Mude os nomes e a ordem como o escritório trabalha.</small></span></li>'
              f'<li><span class="disco"><span>2</span></span><span><b>Cadastre o primeiro caso</b><small>Basta o nome do caso, um cliente, a etapa e o responsável. O número do processo pode vir depois.</small></span></li></ol>')
    e = estado('Nenhum caso cadastrado ainda', 'Aqui ficam os casos e processos do escritório, com a etapa de cada um. Dois passos para começar:', 'balanca', moldura=False,
               acoes=f'<a class="btn btn-sec" href="{U}etapas">{ico("ajustes")}Ver as etapas</a><a class="btn btn-pri" href="{U}novo-caso">{ico("mais")}Cadastrar o primeiro caso</a>')
    e = e.replace('</p><div class="acoes">', '</p>' + passos + '<div class="acoes">')
    return f'<div class="ju">{cab_casos()}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de casos</h2>{e}</section></div>'

# ---------------------------------------------------------------- Novo caso
def cli_linha(n, cliente, papel, contrato, op_ctr):
    return (f'<div class="ju-cli-edit" role="group" aria-label="Cliente {n}">'
            + selecao(f'nc-cli{n}', 'Cliente', ['Daniela Souza', 'Joana Pereira', 'Roberto Andrade', 'Antônia Ferreira Prado'], cliente, '', ajuda='Da lista de Clientes.')
            + selecao(f'nc-papel{n}', 'Papel', ['Autor(a)', 'Réu ou ré', 'Interessado(a)'], papel, '')
            + selecao(f'nc-ctr{n}', 'Contrato e honorários', op_ctr, contrato, '', ajuda='Cada cliente tem os próprios honorários.')
            + f'<button class="remover" type="button" aria-label="Tirar {cliente} do caso">{ico("x")}</button></div>')


def form_novo_caso():
    r = f'<div class="ju-sec ju-primeira"><h3>O caso</h3><small>Só o nome, um cliente, a etapa e o responsável são obrigatórios</small></div>'
    r += campo('nc-nome', 'Nome do caso', 'Souza x Clínica Bem Viver', 'c4', foco=True, ajuda='Como a equipe chama o caso. Aparece na lista e nos avisos.')
    r += selecao('nc-area', 'Área', ['Trabalhista', 'Cível', 'Consumidor', 'Família', 'Previdenciário', 'Saúde', 'Tributário', 'Outra'], 'Trabalhista', 'c2')
    r += campo('nc-contra', 'Parte contrária', 'Clínica Bem Viver Ltda.', 'c6', ajuda='Vai no aviso ao cliente: “seu processo contra …”.')
    r += f'<div class="ju-sec"><h3>Clientes do caso</h3><small>Um processo pode ter mais de um cliente, cada um com os próprios honorários</small></div>'
    r += cli_linha(1, 'Daniela Souza', 'Autor(a)', 'Ainda sem contrato', ['Ainda sem contrato'])
    r += f'<div class="ju-span">{aviso("atencao", "Daniela ainda não tem contrato de honorários.", "Dá para cadastrar o caso assim. Ele fica marcado “sem contrato” na ficha até a área Contratos ligar um.", icone="pena")}</div>'
    r += f'<div class="ju-span"><button class="btn btn-fantasma" type="button">{ico("pessoa-mais")}Adicionar outro cliente</button></div>'
    r += f'<div class="ju-sec"><h3>Processo</h3><small>Pode ficar para depois da distribuição</small></div>'
    r += campo('nc-num', 'Número do processo', '', 'c3', opc=True, im='numeric', ph='0000000-00.0000.0.00.0000', ajuda='No formato do CNJ. Conferimos os dígitos.')
    r += selecao('nc-sis', 'Sistema', ['PJe', 'PJe-JT', 'e-SAJ', 'eproc', 'Projudi', 'Outro'], 'PJe-JT', 'c3', opc=True, ajuda='Onde a equipe acompanha o processo.')
    r += campo('nc-trib', 'Tribunal', 'TRT-2', 'c2', opc=True)
    r += campo('nc-vara', 'Vara ou órgão', '', 'c2', opc=True, ph='Ex.: 45ª Vara do Trabalho')
    r += campo('nc-valor', 'Valor da causa', '', 'c2', opc=True, im='decimal', ph='R$ 0,00')
    r += f'<div class="ju-sec"><h3>Andamento</h3><small>Quem cuida e onde o caso começa</small></div>'
    r += selecao('nc-etapa', 'Etapa', [f'{i + 1}. {n}' for i, n in enumerate(NOME_E[:-1])], '1. Preparação', 'c3', ajuda='As etapas do escritório.')
    r += selecao('nc-resp', 'Responsável', EQUIPE[:4], 'Larissa Costa', 'c3', ajuda='Recebe os avisos de prazo e de tarefa.')
    r += (f'<label class="opcao ju-span"><input class="marcar" type="checkbox" name="nc-wpp" checked><span>Avisar os clientes pelo WhatsApp quando o caso mudar de etapa'
          f'<small>Com o texto simples de cada etapa. Antes de enviar, sempre aparece a prévia.</small></span></label>')
    r += (f'<div class="form-pe"><span class="esq-pe">Os campos sem “(opcional)” são obrigatórios. O cadastro fica no histórico do caso, com seu nome e a hora.</span>'
          f'<a class="btn btn-fantasma" href="{U}casos">Cancelar</a><button class="btn btn-pri" type="submit">{ico("check")}Cadastrar caso</button></div>')
    return folha('t-novo', 'Dados do caso', 'Comece pelo que já sabe. O resto se completa na ficha.', f'<form class="form-folha" action="#" novalidate>{r}</form>')


EXPLICA_NOVO = (f'<section class="explica campo-ambar" aria-labelledby="t-exn"><p class="sobretitulo">Como funciona</p><h2 id="t-exn">Um caso, vários clientes.</h2><ul>'
                f'<li>{ico("pessoas")}<span>Um processo pode ter mais de um cliente. Cada um tem o próprio contrato e os próprios honorários, e o caso aparece na ficha de cada um.</span></li>'
                f'<li>{ico("balanca")}<span>A etapa vem da lista do escritório. Mudar de etapa pede um motivo e fica no histórico.</span></li>'
                f'<li>{ico("whats")}<span>O cliente recebe um aviso simples pelo WhatsApp do escritório a cada etapa. Você vê o texto antes.</span></li>'
                f'<li>{ico("relogio")}<span>Os prazos são cadastrados pela equipe. O T3jus ainda não lê publicações dos tribunais.</span></li></ul></section>')

# ---------------------------------------------------------------- Ficha do caso (o coração)
def cab_ficha(et=5, desde='07/11', mudar=True):
    segs = ''.join(f'<li class="{"" if i < et - 1 else ("agora" if i == et - 1 else "falta")}"><span class="b" aria-hidden="true"></span>'
                   f'<span class="sr">{i + 1}. {NOME_E[i]}{": feita" if i < et - 1 else (": atual" if i == et - 1 else "")}</span></li>' for i in range(NE))
    prox = NOME_E[et] if et < NE else ''
    b = f'<button class="btn btn-pri" type="button" data-janela="janela-etapa">{ico("seta")}Mudar etapa</button>' if mudar else ''
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-etapa"><p class="sobretitulo" id="t-etapa">Etapa do caso</p>'
            f'<p class="grande">{et} de {NE}<small>{NOME_E[et - 1]}</small></p><ol class="etapas ju-et8">{segs}</ol>'
            f'<p class="ju-agora">Desde {desde}. Próxima: <b>{prox}</b>.</p>{b}</section>')
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
            f'<a class="voltar" href="{U}casos">{ico("esq", "ico ico-s")}Casos e processos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Caso · trabalhista</p><h1>Pereira x Mercado Bom Preço</h1>'
            f'<p class="meta"><span class="selo selo-ativo">Em andamento</span><span class="num">1001022-33.2026.5.02.0045</span><span class="sep" aria-hidden="true"></span><span>TRT-2 · PJe-JT</span></p></div></div></div>{dir_}</div>')


def dados_caso():
    d = [('Área', 'Trabalhista'), ('Parte contrária', 'Mercado Bom Preço Ltda.'), ('Valor da causa', '<span class="num">R$ 86.400,00</span>'),
         ('Tribunal', 'TRT da 2ª Região'), ('Vara', '45ª Vara do Trabalho de São Paulo'), ('Sistema', 'PJe-JT'),
         ('Distribuído em', '<span class="num">03/03/2026</span>'), ('Responsável', 'Marina Ribeiro'), ('Também no caso', 'Larissa Costa')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in d)
    return folha('t-dados', 'Dados do processo', 'O que identifica o caso.', f'<dl class="dados-ficha ju-dl">{dl}</dl>',
                 acoes=f'<a class="btn btn-sec" href="#">{ico("lapis")}Editar</a>')


def clientes_caso(fin=True):
    def li(ini, nome, papel, tel, hon, sub):
        h = (f'<div class="ju-hon"><b>{hon}</b><small>{sub}</small></div>' if fin
             else '<div class="ju-hon"><small>Honorários na área Contratos</small></div>')
        return (f'<li><span class="av-p forte" aria-hidden="true">{ini}</span><div><a class="n" href="#">{nome}</a><small>{papel}</small></div>'
                f'<a class="tel" href="#">{ico("whats")}<span class="num">{tel}</span></a>{h}</li>')
    corpo = ('<ul class="lista ju-clientes">'
             + li('JP', 'Joana Pereira', 'Autora · ex-operadora de caixa', '(11) 98552-1034', '30% do êxito', 'Contrato CT-2026-014')
             + li('CD', 'Carlos Henrique Dias', 'Autor · ex-repositor', '(11) 97108-4426', 'R$ 1.500,00 + 25% do êxito', 'Contrato CT-2026-015 · entrada paga')
             + '</ul>')
    return folha('t-cli', 'Clientes do caso', '2 clientes · cada um com os próprios honorários', corpo,
                 acoes=f'<a class="btn btn-sec" href="#">{ico("pessoa-mais")}Adicionar cliente</a>')


def prazos_tarefas(novo_hist=False):
    pz = (f'<li><div><strong>Recurso ordinário</strong><small>Prazo final 19/11/2026 · fazer até hoje, 18/11 · Marina Ribeiro</small></div>'
          f'<div class="lado">{selo_prazo("amanha", "Amanhã")}<button class="btn btn-sec btn-compacto" type="button">{ico("check")}Cumprido</button></div></li>'
          f'<li class="feito"><div><strong>Embargos de declaração</strong><small>Cumprido em 13/11 por Marina Ribeiro</small></div><div class="lado"><span class="selo selo-ok">{ico("check")}Cumprido</span></div></li>')
    tf = (f'<li><div><strong>Minuta do recurso ordinário</strong><small>Marina Ribeiro · vence hoje</small></div><div class="lado">{selo_prazo("hoje", "Hoje")}</div></li>'
          f'<li><div><strong>Calcular as horas extras de Carlos</strong><small>Larissa Costa · vence 20/11</small><span class="ju-espera">{ico("relogio")}Esperando o cliente: CTPS digital de Carlos</span></div><div class="lado"><span class="selo selo-andamento">Travada</span></div></li>'
          f'<li><div><strong>Conversar com Joana e Carlos sobre a proposta de acordo</strong><small>Marina Ribeiro · vence 20/11</small></div><div class="lado"><span class="selo selo-neutro">20/11 · sex</span></div></li>')
    corpo = (f'<div class="ju-sub"><h3>Prazos</h3><button class="btn btn-fantasma btn-compacto" type="button" data-janela="janela-prazo">{ico("mais")}Novo prazo</button></div><ul class="ju-itens">{pz}</ul>'
             f'<div class="ju-sub"><h3>Tarefas</h3><button class="btn btn-fantasma btn-compacto" type="button">{ico("mais")}Nova tarefa</button></div><ul class="ju-itens">{tf}</ul>')
    return folha('t-pt', 'Prazos e tarefas', '1 prazo aberto · 3 tarefas abertas, cada uma com responsável', corpo)


def documentos_caso():
    def doc(nome, cat, meta):
        return (f'<li><span class="doc-ico" aria-hidden="true">{ico("doc")}</span><div><span class="doc-nome">{nome}</span>'
                f'<p class="doc-meta"><span class="selo selo-neutro">{cat}</span><span>{meta}</span></p></div>'
                f'<div class="doc-acoes"><button class="btn btn-sec btn-compacto" type="button" aria-label="Abrir {nome}">{ico("olho", "ico ico-s")}Abrir</button></div></li>')
    lig = ('<ul class="lista docs">'
           + doc('sentenca-07-11-2026.pdf', 'Sentença', 'PDF · 412 KB · Marina Ribeiro · 07/11/2026')
           + doc('peticao-inicial.pdf', 'Petição', 'PDF · 1,1 MB · Larissa Costa · 03/03/2026')
           + doc('procuracao-joana-pereira.pdf', 'Procuração', 'PDF · 220 KB · assinada em 20/02/2026')
           + doc('procuracao-carlos-dias.pdf', 'Procuração', 'PDF · 214 KB · assinada em 22/02/2026')
           + '</ul>')

    def falta(nome, quem, desde):
        return (f'<li><span class="doc-ico" aria-hidden="true">{ico("alerta")}</span><div><span class="doc-nome">{nome}</span>'
                f'<p class="doc-meta"><span class="selo selo-atencao">Falta</span><span>{quem} · pedido em {desde}</span></p></div>'
                f'<div class="doc-acoes"><button class="btn btn-sec btn-compacto" type="button">{ico("whats", "ico ico-s")}Pedir de novo</button>'
                f'<button class="btn btn-fantasma btn-compacto" type="button">{ico("enviar", "ico ico-s")}Já chegou</button></div></li>')
    fal = '<ul class="lista ju-falta">' + falta('CTPS digital de Carlos', 'Com Carlos', '10/11') + falta('Holerites de janeiro a março de 2025', 'Com Joana', '12/11') + '</ul>'
    corpo = (f'<div class="ju-sub"><h3>Faltam 2</h3></div>{fal}<div class="ju-sub"><h3>Ligados ao caso · 4</h3>'
             f'<button class="btn btn-fantasma btn-compacto" type="button">{ico("enviar")}Enviar arquivo</button></div>{lig}'
             f'<p class="docs-pe">{ico("cadeado")}Nada é apagado: cada arquivo fica com quem enviou e quando. “Pedir de novo” abre a conversa do cliente com o texto pronto.</p>')
    return folha('t-docs', 'Documentos', 'O que já está no caso e o que ainda falta', corpo,
                 acoes=f'<button class="btn btn-sec" type="button">{ico("mais")}Pedir documento</button>')


def trava():
    corpo = (f'<ul class="ju-trava">'
             f'<li>{ico("relogio")}<span><b>Esperando Joana:</b> se aceita a proposta de acordo de R$ 20.000,00 ou se recorre. Pedido em 14/11.'
             f'<span class="blq">Trava: <b>Recurso ordinário</b>, que vence amanhã.</span></span></li>'
             f'<li>{ico("relogio")}<span><b>Esperando Carlos:</b> a CTPS digital, pedida em 10/11, há 8 dias.'
             f'<span class="blq">Trava: <b>Calcular as horas extras de Carlos</b> (Larissa).</span></span></li></ul>')
    return folha('t-trava', 'O que está travando', '', corpo, peq=True).replace('<section class="folha"', '<section class="folha ju-primeiro"', 1)


def contratos(fin=True):
    if fin:
        li = (f'<li>{ico("pena")}<span><b>CT-2026-014 · Joana Pereira</b><small>Assinado em 20/02/2026 · 30% do êxito</small></span></li>'
              f'<li>{ico("pena")}<span><b>CT-2026-015 · Carlos Henrique Dias</b><small>Assinado em 22/02/2026 · R$ 1.500,00 de entrada + 25% do êxito</small></span></li>')
        pe = f'<p class="ju-nota">{ico("seta")}<span>Os honorários de êxito saem destes contratos quando o caso chega ao fim.</span></p>'
    else:
        li = (f'<li>{ico("pena")}<span><b>CT-2026-014 · Joana Pereira</b><small>Assinado em 20/02/2026</small></span></li>'
              f'<li>{ico("pena")}<span><b>CT-2026-015 · Carlos Henrique Dias</b><small>Assinado em 22/02/2026</small></span></li>')
        pe = (f'<p class="ju-nota">{ico("cadeado")}<span>Valores dos contratos e o resumo financeiro do caso ficam nas áreas Contratos e Financeiro, que não estão liberadas para você. '
              f'Quem libera é Marina Ribeiro, a sócia dona.</span></p>')
    return folha('t-ctr', 'Contratos ligados', '', f'<ul class="ju-ctr">{li}</ul>{pe}', peq=True)


def financeiro():
    corpo = (f'<dl class="ju-fin"><div><dt>Entrou no caixa</dt><dd class="g num">R$ 1.500,00</dd></div>'
             f'<div><dt>Repassado aos clientes</dt><dd class="num">R$ 0,00</dd></div><div><dt>Falta destinar</dt><dd class="num">R$ 0,00</dd></div>'
             f'<div><dt>Êxito previsto</dt><dd>Depende do resultado</dd></div></dl>'
             f'<p class="ju-nota">{ico("cadeado")}<span>Só quem tem a área Financeiro vê este quadro. O caso só fecha no Financeiro com tudo recebido e repassado.</span></p>')
    return folha('t-fin', 'Resumo financeiro', 'Entrada de Carlos, paga em 25/02', corpo, peq=True)


def aviso_cliente(ultimo='07/11 · Sentença'):
    corpo = (f'<div class="ju-aviso-cli"><span class="lig">{ico("whats")}Ligado para Joana e Carlos</span>'
             f'<p>A cada mudança de etapa, eles recebem um aviso simples pelo WhatsApp do escritório. Último aviso: <b>{ultimo}</b>, entregue aos dois.</p></div>')
    return folha('t-avc', 'Aviso ao cliente', '', corpo, peq=True)


HIST = [('07/11', 'Sentença', 'Marina Ribeiro', 'Sentença publicada: procedente em parte. Horas extras de Carlos negadas.'),
        ('22/07', 'Instrução', 'Marina Ribeiro', 'Audiência de instrução marcada para 09/09.'),
        ('15/04', 'Citação e defesa', 'Larissa Costa', 'Mercado Bom Preço citado em 10/04.'),
        ('03/03', 'Petição inicial', 'Larissa Costa', 'Ação distribuída na 45ª Vara.')]


def historico(novo=None):
    li = ''
    if novo:
        li += f'<li class="novo"><time>hoje</time><span>Para <b>{novo[0]}</b> · {novo[1]}<em>“{novo[2]}”</em><small>Aviso enviado pelo WhatsApp a Joana e Carlos às 15h20</small></span></li>'
    li += ''.join(f'<li><time>{d}</time><span>Para <b>{e}</b> · {q}<em>“{m}”</em></span></li>' for d, e, q, m in HIST)
    return folha('t-hist', 'Mudanças de etapa', '', f'<ol class="ju-hist">{li}</ol>', peq=True)


def ficha(fin=True, et=5, desde='07/11', novo=None, ultimo='07/11 · Sentença'):
    lat = trava() + contratos(fin) + (financeiro() if fin else '') + aviso_cliente(ultimo) + historico(novo)
    pri = dados_caso() + clientes_caso(fin) + prazos_tarefas() + documentos_caso()
    return (f'<div class="ju">{cab_ficha(et, desde)}<div class="ju-grade ju-ficha-grade"><div class="ju-col">{pri}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{lat}</aside></div></div>')

# ---------------------------------------------------------------- Janela: mudar etapa (EX-07, EX-08, EX-14, CH-07)
def wpp(texto, para='Joana Pereira e Carlos Henrique Dias', marcado=True):
    ch = ' checked' if marcado else ''
    return (f'<fieldset class="ju-fs"><legend>Aviso aos clientes<small>pelo WhatsApp do escritório</small></legend><div class="ju-wpp">'
            f'<label class="opcao"><input class="marcar" type="checkbox" name="me-wpp"{ch}><span>Avisar {para}<small>Cada um recebe o aviso no próprio número, com o primeiro nome.</small></span></label>'
            f'<p class="ju-balao-cab">{ico("whats")}Prévia do aviso para Joana</p>'
            f'<p class="ju-balao">{texto}</p>'
            f'<p class="ju-para">Texto da etapa, definido em Etapas do escritório. <a href="#">Ajustar só desta vez</a></p></div></fieldset>')


def ops_etapa(atual, nova):
    out = ''
    for i, (n, sub, _, _) in enumerate(ETAPAS, 1):
        if i == atual:
            out += f'<label class="opcao atual"><input class="marcar" type="radio" name="me-et" disabled><span class="n" aria-hidden="true">{i}</span><span>{n}<small>Etapa atual</small></span></label>'
        else:
            ch = ' checked' if i == nova else ''
            fim = '<small>Pede o resultado</small>' if i == NE else ('<small>Avisa o Financeiro</small>' if ETAPAS[i - 1][3] else '')
            out += f'<label class="opcao"><input class="marcar" type="radio" name="me-et" value="{i}"{ch}><span class="n" aria-hidden="true">{i}</span><span>{n}{fim}</span></label>'
    return f'<fieldset class="ju-fs"><legend>Nova etapa</legend><div class="ju-ops">{out}</div></fieldset>'


def motivo(valor='', erro=False, foco=False):
    a = ' aria-invalid="true" aria-describedby="me-mot-aj me-mot-er"' if erro else ' aria-describedby="me-mot-aj"'
    e = f'<p class="erro-msg" id="me-mot-er">{ico("alerta", "ico ico-s")}Escreva o motivo da mudança. Ele fica no histórico do caso e ajuda quem pegar o caso depois.</p>' if erro else ''
    f = ' data-foco' if (erro or foco) else ''
    return (f'<div class="campo"><label for="me-mot">Motivo</label><textarea class="entrada" id="me-mot" name="me-mot"{a}{f}>{H(valor)}</textarea>'
            f'<p class="ajuda" id="me-mot-aj">Só para a equipe; o cliente não vê. Ex.: sentença procedente em parte; vamos recorrer.</p>{e}</div>')


TXT_REC = ('Olá, Joana. Aqui é do escritório Ribeiro &amp; Matos. Novidade no seu processo contra o Mercado Bom Preço: '
           'vamos pedir para o tribunal rever a decisão. Essa fase costuma levar alguns meses. Qualquer dúvida, é só responder esta mensagem.')
TXT_FIM = ('Olá, Joana. Aqui é do escritório Ribeiro &amp; Matos. Novidade no seu processo contra o Mercado Bom Preço: '
           'o seu caso terminou com um acordo. Vamos explicar os valores e a data do pagamento. Qualquer dúvida, é só responder esta mensagem.')


def j_etapa(abrir=False, erro=False):
    resumo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'A etapa não mudou e nenhum aviso foi enviado.') if erro else ''
    corpo = (resumo + f'<p class="ju-de"><span>Agora: <b>5. Sentença</b>, desde 07/11/2026, por Marina Ribeiro.</span></p>'
             + ops_etapa(5, 6) + motivo('' if erro else 'Sentença procedente em parte. Joana quer recorrer da parte das horas extras de Carlos.', erro, foco=not erro)
             + wpp(TXT_REC))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("seta")}Mudar para Recurso e avisar</button>'
    j = janela('janela-etapa', 'Pereira x Mercado Bom Preço', 'Mudar etapa',
               'A mudança fica no histórico do caso, com seu nome, a hora e o motivo. Dá para voltar depois, também com motivo.', corpo, pe, abrir=abrir or erro)
    return j.replace('class="janela"', 'class="janela ju-larga"', 1)


def j_final():
    res = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="me-res"{" checked" if k == "Acordo" else ""}><span>{k}<small>{s}</small></span></label>'
                  for k, s in [('Ganho', 'Decisão a favor do cliente'), ('Perda', 'Decisão contra o cliente'), ('Acordo', 'As partes fecharam acordo')])
    corpo = (f'<p class="ju-de"><span>De <b>5. Sentença</b> para <b>8. Encerrado</b>, a etapa final.</span></p>'
             f'<fieldset class="ju-fs ju-res"><legend>Resultado<small>alimenta a cobrança do êxito e os indicadores</small></legend><div class="ju-ops">{res}</div></fieldset>'
             f'<div class="ju-dois">' + campo('mf-v1', 'Valor do acordo para Joana', 'R$ 28.000,00', 'c3', im='decimal', foco=True)
             + campo('mf-v2', 'Valor do acordo para Carlos', 'R$ 20.000,00', 'c3', im='decimal') + '</div>'
             + campo('mf-data', 'Pagamento previsto', '15/12/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa. Data em que a outra parte deve pagar.')
             + f'<div class="ju-calc"><h3>{ico("moeda")}Vai para o Financeiro, para conferir</h3>'
             f'<table><caption class="sr">Honorários de êxito por cliente</caption><thead><tr><th scope="col">Cliente e contrato</th><th scope="col">Êxito</th></tr></thead><tbody>'
             f'<tr><td>Joana · 30% de R$ 28.000,00</td><td class="num">R$ 8.400,00</td></tr>'
             f'<tr><td>Carlos · 25% de R$ 20.000,00</td><td class="num">R$ 5.000,00</td></tr></tbody>'
             f'<tfoot><tr><td>A receber em 15/12/2026</td><td class="num">R$ 13.400,00</td></tr></tfoot></table>'
             f'<p>O caso fica “Encerrado · acerto pendente” até o Financeiro registrar o recebimento e o repasse a Joana e Carlos.</p></div>'
             + motivo('Acordo homologado em audiência de 18/11: R$ 48.000,00 em parcela única.')
             + wpp(TXT_FIM))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Encerrar com acordo e avisar</button>'
    j = janela('janela-etapa', 'Pereira x Mercado Bom Preço', 'Encerrar o caso',
               'É a etapa final: o T3jus pede o resultado. Fica no histórico do caso, com seu nome, a hora e o motivo.', corpo, pe, abrir=True)
    return j.replace('class="janela"', 'class="janela ju-larga"', 1)

# ---------------------------------------------------------------- Prazos (EX-04)
def prazo_li(d, mes, hoje, titulo, caso, num, rsp, selo, extra=''):
    dc = 'disco hoje' if hoje else 'disco'
    st = '' if hoje else ' style="--c:var(--sal-2)"' if not selo.startswith('<span class="selo selo-atencao') else ''
    return (f'<li class="prazo"><div class="data"><span class="{dc}"{st}><span>{d}</span></span><small>{mes}</small></div>'
            f'<div><a href="{FICHA}">{titulo} · {caso}</a><span class="p num">{num}{extra}</span></div>'
            f'<div class="lado"><div class="ju-l">{selo}{resp(rsp)}</div>'
            f'<button class="btn btn-sec btn-compacto" type="button" aria-label="Marcar {titulo}, {caso}, como cumprido">{ico("check", "ico ico-s")}Cumprido</button></div></li>')


def grupo(titulo, n, itens):
    return f'<div class="ju-grupo"><h3>{titulo}<span class="q">{n}</span></h3><ol class="prazos ju-prazos">{"".join(itens)}</ol></div>'


def pagina_prazos():
    g = grupo('Hoje · quarta, 18/11', 2, [
        prazo_li('18', 'nov', True, 'Contestação', 'Souza x Construtora Atlas', '0812345-67.2026.8.26.0100', 'Felipe Matos', selo_prazo('hoje', 'Vence hoje'), ' · 4ª Vara Cível'),
        prazo_li('18', 'nov', True, 'Manifestação sobre laudo', 'Andrade x Unimed Paulistana', '1004871-20.2025.8.26.0011', 'Larissa Costa', selo_prazo('hoje', 'Vence hoje'), ' · Foro de Pinheiros')])
    g += grupo('Amanhã · quinta, 19/11', 1, [
        prazo_li('19', 'nov', False, 'Recurso ordinário', 'Pereira x Mercado Bom Preço', '1001022-33.2026.5.02.0045', 'Marina Ribeiro', selo_prazo('amanha', 'Amanhã'), ' · <b>fazer até hoje</b>')])
    g += grupo('Até sexta', 2, [
        prazo_li('21', 'nov', False, 'Réplica', 'Oliveira x Banco Horizonte', '0798812-04.2026.8.26.0100', 'Felipe Matos', selo_prazo('', 'Em 3 dias')),
        prazo_li('21', 'nov', False, 'Embargos de declaração', 'Lima x Seguradora Norte', '1012233-45.2026.8.26.0100', 'Gustavo Lima', selo_prazo('', 'Em 3 dias'))])
    g += grupo('Depois', 2, [
        prazo_li('26', 'nov', False, 'Alegações finais', 'Ferreira x Banco Horizonte', '1000417-58.2026.5.02.0012', 'Marina Ribeiro', selo_prazo('', 'Em 8 dias')),
        prazo_li('03', 'dez', False, 'Manifestação sobre cálculos', 'Teixeira x Lojas Brilho', '0024519-11.2025.8.26.0016', 'Felipe Matos', selo_prazo('', 'Em 15 dias'))])
    ferr = ('<div class="ju-ferr">' + selecao('pz-resp', 'Responsável', ['Todos'] + EQUIPE[:4], 'Todos', '', vazio='')
            + '<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="true">Abertos (7)</button><button type="button" aria-pressed="false">Só meus (2)</button><button type="button" aria-pressed="false">Cumpridos</button></div></div>')
    pe = (f'<p class="ju-pe">{ico("ajuda")}<span>Os prazos são cadastrados pela equipe, a partir da intimação. O T3jus ainda não lê as publicações dos tribunais nem conta dias úteis: '
          f'confira sempre a contagem no processo.</span></p>')
    lista = (f'<section class="folha" aria-labelledby="t-pz" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-pz">Prazos abertos</h2>'
             f'<p class="sub">7 prazos · 2 vencem hoje · do mais próximo para o mais distante</p></div></div>{ferr}{g}{pe}</section>')
    exp = (f'<section class="explica campo-ambar" aria-labelledby="t-exp"><p class="sobretitulo">Prazos</p><h2 id="t-exp">Nenhum prazo sem dono.</h2><ul>'
           f'<li>{ico("pessoas")}<span>Todo prazo tem um responsável. Se a pessoa sai da equipe, o prazo passa para quem a sócia escolher.</span></li>'
           f'<li>{ico("relogio")}<span>“Fazer até” é a margem do escritório, antes do prazo final. O Início de cada pessoa mostra os dela.</span></li>'
           f'<li>{ico("check")}<span>Marcar como cumprido pede confirmação e fica no histórico do caso.</span></li>'
           f'<li>{ico("alerta")}<span>A urgência vem escrita: “Vence hoje”, “Amanhã”, “Em 3 dias”. A cor só reforça.</span></li></ul></section>')
    cab = (f'<div class="pt-cab"><div><p class="sobretitulo">Jurídico</p><h1>Prazos</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">Os prazos de todos os casos, do que vence hoje ao que vence depois.</p></div>'
           f'<button class="btn btn-pri" type="button" data-janela="janela-prazo">{ico("mais")}Novo prazo</button></div>')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{lista}</div><aside class="ju-col" aria-label="Como funcionam os prazos">{exp}</aside></div></div>'


def j_prazo(abrir=False):
    casos = [f'{c[0]}' for c in CASOS]
    corpo = (selecao('np-caso', 'Caso', casos, 'Andrade x Unimed Paulistana', 'c6', ajuda='1004871-20.2025.8.26.0011 · Foro de Pinheiros')
             + campo('np-oque', 'O que é', 'Alegações finais', 'c6', foco=True, ajuda='Aparece assim na lista, no Início e na Agenda.')
             + '<div class="ju-dois">' + campo('np-data', 'Prazo final', '02/12/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa. A data do processo.')
             + campo('np-ate', 'Fazer até', '01/12/2026', 'c3', im='numeric', opc=True, ajuda='A margem do escritório, antes do prazo final.') + '</div>'
             + selecao('np-resp', 'Responsável', EQUIPE[:4], 'Larissa Costa', 'c6', ajuda='Vê o prazo no Início dela e recebe o lembrete.')
             + campo('np-intim', 'Intimação em', '18/11/2026', 'c3', im='numeric', opc=True, ajuda='Para consulta. O T3jus não conta os dias.')
             + f'<label class="opcao"><input class="marcar" type="checkbox" name="np-lemb" checked><span>Lembrar o responsável 2 dias antes<small>No Início e no sino de avisos.</small></span></label>'
             + f'<p class="pt-comuns">{ico("ajuda")}<span>Confira a contagem no processo. Nesta versão, o prazo é cadastrado à mão: o T3jus ainda não lê publicações nem calcula dias úteis.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Cadastrar prazo</button>'
    return janela('janela-prazo', 'Jurídico · Prazos', 'Novo prazo', 'Fica no caso, na lista de prazos e na agenda do responsável.', corpo, pe, abrir=abrir)

# ---------------------------------------------------------------- Tarefas (EX-02, PD-04, PD-05, PD-07, IN-06, IN-08)
def tarefa(id_, titulo, caso, venc, rsp=None, espera='', feito=False):
    ch = ' checked' if feito else ''
    es = f'<span class="ju-espera">{ico("relogio")}{espera}</span>' if espera else ''
    r = resp(rsp) if rsp else ''
    return (f'<li{" class=bloq" if espera else ""}><div><label class="opcao"><input class="marcar" type="checkbox" id="{id_}"{ch}>'
            f'<span><strong>{titulo}</strong></span></label><a class="ju-caso" href="{FICHA}">{caso}</a>{es}</div>'
            f'<div class="lado">{venc}{r}</div></li>')


def grupo_t(titulo, n, itens):
    return f'<div class="ju-grupo"><h3>{titulo}<span class="q">{n}</span></h3><ul class="ju-tarefas">{"".join(itens)}</ul></div>'


def ferr_tarefas(equipe=False):
    m = 'false' if equipe else 'true'
    e = 'true' if equipe else 'false'
    s = selecao('tf-resp', 'Responsável', ['Todos'] + EQUIPE[:4], 'Todos', '', vazio='') if equipe else ''
    return (f'<div class="ju-ferr"><div class="chips" role="group" aria-label="Ver" style="margin-left:0"><button type="button" aria-pressed="{m}">Minhas (5)</button>'
            f'<button type="button" aria-pressed="{e}">Da equipe (23)</button></div>{s}</div>')


def pagina_tarefas(equipe=False):
    if not equipe:
        g = grupo_t('Atrasada', 1, [tarefa('t1', 'Devolver a minuta de acordo ao Banco Horizonte', 'Ferreira x Banco Horizonte', selo_prazo('atraso', 'Venceu ontem'))])
        g += grupo_t('Hoje', 2, [tarefa('t2', 'Minuta do recurso ordinário', 'Pereira x Mercado Bom Preço', selo_prazo('hoje', 'Hoje')),
                                 tarefa('t3', 'Revisar a contestação de Felipe', 'Souza x Construtora Atlas', selo_prazo('hoje', 'Hoje'))])
        g += grupo_t('Esta semana', 1, [tarefa('t4', 'Conversar com Joana e Carlos sobre a proposta de acordo', 'Pereira x Mercado Bom Preço', selo_prazo('', '20/11 · sex'))])
        g += grupo_t('Esperando alguém', 1, [tarefa('t5', 'Assinar e protocolar a petição inicial', 'Vale Alto x Prefeitura de Santo André', selo_prazo('', '25/11 · qua'),
                                                   espera='Esperando o cliente: procuração assinada, pedida em 11/11')])
        sub = '5 abertas · 1 atrasada · 1 esperando alguém'
        lat = (f'<section class="explica campo-ambar" aria-labelledby="t-ext"><p class="sobretitulo">Tarefas</p><h2 id="t-ext">Cada uma com dono e data.</h2><ul>'
               f'<li>{ico("pessoas")}<span>Toda tarefa tem responsável e vencimento. Quem sai da equipe passa as tarefas para outra pessoa.</span></li>'
               f'<li>{ico("relogio")}<span>“Esperando alguém” mostra o que trava: um documento do cliente ou uma resposta. A ficha do caso mostra o mesmo.</span></li>'
               f'<li>{ico("check")}<span>Marcar a caixa conclui a tarefa. Fica no histórico do caso, e dá para reabrir.</span></li></ul></section>')
    else:
        g = grupo_t('Atrasadas', 3, [tarefa('e1', 'Devolver a minuta de acordo ao Banco Horizonte', 'Ferreira x Banco Horizonte', selo_prazo('atraso', 'Venceu ontem'), 'Marina Ribeiro'),
                                     tarefa('e2', 'Juntar o comprovante de pagamento das custas', 'Souza x Construtora Atlas', selo_prazo('atraso', 'Venceu 14/11'), 'Felipe Matos'),
                                     tarefa('e3', 'Atualizar o cálculo da multa', 'Teixeira x Lojas Brilho', selo_prazo('atraso', 'Venceu 16/11'), 'Felipe Matos')])
        g += grupo_t('Hoje', 4, [tarefa('e4', 'Minuta do recurso ordinário', 'Pereira x Mercado Bom Preço', selo_prazo('hoje', 'Hoje'), 'Marina Ribeiro'),
                                 tarefa('e5', 'Revisar a contestação de Felipe', 'Souza x Construtora Atlas', selo_prazo('hoje', 'Hoje'), 'Marina Ribeiro'),
                                 tarefa('e6', 'Protocolar a manifestação sobre o laudo', 'Andrade x Unimed Paulistana', selo_prazo('hoje', 'Hoje'), 'Larissa Costa'),
                                 tarefa('e7', 'Contestação', 'Souza x Construtora Atlas', selo_prazo('hoje', 'Hoje'), 'Felipe Matos')])
        g += grupo_t('Esperando alguém', 3, [tarefa('e8', 'Calcular as horas extras de Carlos', 'Pereira x Mercado Bom Preço', selo_prazo('', '20/11 · sex'), 'Larissa Costa', espera='Esperando o cliente: CTPS digital, pedida há 8 dias'),
                                             tarefa('e9', 'Pedir a pensão por morte', 'Ferreira Prado x INSS', selo_prazo('', '27/11 · sex'), 'Larissa Costa', espera='Esperando o cliente: carta de indeferimento do INSS'),
                                             tarefa('e10', 'Assinar e protocolar a petição inicial', 'Vale Alto x Prefeitura de Santo André', selo_prazo('', '25/11 · qua'), 'Marina Ribeiro', espera='Esperando o cliente: procuração assinada')])
        g += '<div class="mais" style="padding:10px 24px 16px"><button class="btn btn-fantasma" type="button">Ver as outras 13 tarefas, desta semana em diante</button></div>'
        sub = '23 abertas · 3 atrasadas · 3 esperando alguém'
        carga = [('Marina Ribeiro', 2, 5, 1), ('Felipe Matos', 4, 9, 2), ('Larissa Costa', 2, 6, 0), ('Gustavo Lima', 1, 3, 0)]
        li = ''
        for n, c, t, a in carga:
            at = f' · {a} atrasada{"s" if a > 1 else ""}' if a else ''
            li += (f'<li><span class="av-p" aria-hidden="true">{INI[n]}</span><div><strong>{n}<span>{c} {'caso' if c == 1 else 'casos'} · {t} tarefas{at}</span></strong>'
                   f'<span class="ju-barra" aria-hidden="true"><i class="c" style="width:{c * 14}px"></i><i class="t" style="width:{t * 14}px"></i></span></div></li>')
        lat = (f'<section class="folha" aria-labelledby="t-carga"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-carga" style="font-size:20px">Carga da equipe</h2>'
               f'<p class="sub">Casos em andamento e tarefas abertas</p></div></div><ul class="ju-carga">{li}</ul>'
               f'<p class="ju-leg" aria-hidden="true"><span><i style="background:var(--vinho-4)"></i>Casos</span><span><i style="background:var(--ambar-2)"></i>Tarefas</span></p>'
               f'<p class="ju-nota">{ico("ajuda")}<span>Para ver onde o trabalho acumula, não para comparar pessoas. Passar uma tarefa é só trocar o responsável nela.</span></p></section>')
    lista = (f'<section class="folha" aria-labelledby="t-tf" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-tf">{"Tarefas da equipe" if equipe else "Minhas tarefas"}</h2>'
             f'<p class="sub">{sub}</p></div></div>{ferr_tarefas(equipe)}{g}</section>')
    cab = (f'<div class="pt-cab"><div><p class="sobretitulo">Jurídico</p><h1>Tarefas</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">O que cada pessoa precisa entregar, em qual caso e até quando.</p></div>'
           f'<button class="btn btn-pri" type="button">{ico("mais")}Nova tarefa</button></div>')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{lista}</div><aside class="ju-col" aria-label="Sobre as tarefas">{lat}</aside></div></div>'

# ---------------------------------------------------------------- Etapas do escritório (EX-07, EX-08, EX-14, CH-07)
CASOS_ETAPA = POR_ETAPA + [14]


def pagina_etapas():
    li = ''
    for i, (n, sub, txt, fin) in enumerate(ETAPAS, 1):
        selos = ''
        if fin:
            selos += f'<span class="selo selo-andamento">{ico("moeda")}Avisa o Financeiro</span>'
        if i == NE:
            selos += f'<span class="selo selo-ativo">Etapa final · pede o resultado</span>'
        c = CASOS_ETAPA[i - 1]
        cont = f'<span class="ju-cont-casos">{c} {"caso" if c == 1 else "casos"}{" encerrados" if i == NE else ""}</span>'
        up = f'<button class="btn btn-icone" type="button" aria-label="Subir {n}"{" disabled" if i in (1, NE) else ""}>{ico("baixo", "ico ju-icone-up")}</button>'
        dn = f'<button class="btn btn-icone" type="button" aria-label="Descer {n}"{" disabled" if i >= NE - 1 else ""}>{ico("baixo")}</button>'
        ed = f'<button class="btn btn-sec btn-compacto" type="button" aria-label="Editar {n}">{ico("lapis", "ico ico-s")}Editar</button>'
        if i == 5:
            prev = f'Olá, Joana. Aqui é do escritório Ribeiro &amp; Matos. Novidade no seu processo contra o Mercado Bom Preço: {txt}'
            li += (f'<li class="edit"><span class="disco"><span>{i}</span></span><div class="ju-edit" role="group" aria-label="Editando a etapa {n}">'
                   f'<div class="ju-dois">' + campo('ee-nome', 'Nome da etapa', n, 'c3', foco=True, ajuda='Curto. Aparece na lista de casos.')
                   + campo('ee-sub', 'O que é', sub, 'c3', opc=True, ajuda='Só para a equipe.') + '</div>'
                   f'<div class="campo"><div class="campo-linha"><label for="ee-txt">Texto para o cliente</label><span class="contador" aria-hidden="true">{len(txt)} de 240</span></div>'
                   f'<textarea class="entrada" id="ee-txt" name="ee-txt" aria-describedby="ee-txt-aj" style="min-height:80px">{txt}</textarea>'
                   f'<p class="ajuda" id="ee-txt-aj">Linguagem simples, sem termo jurídico. O começo e o fim da mensagem são fixos, com o nome do cliente e a parte contrária.</p></div>'
                   f'<div class="ju-wpp"><p class="ju-balao-cab">{ico("whats")}Prévia com um caso de exemplo</p><p class="ju-balao">{prev} Qualquer dúvida, é só responder esta mensagem.</p></div>'
                   f'<label class="opcao"><input class="marcar" type="checkbox" name="ee-fin"><span>Avisar o Financeiro ao entrar nesta etapa'
                   f'<small>Pede valor e data prevista e cria um valor a receber. Ex.: requisição de pagamento expedida.</small></span></label>'
                   f'<div class="ju-edit-pe"><button class="btn btn-fantasma" type="button">Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Salvar etapa</button></div></div></li>')
            continue
        li += (f'<li><span class="disco"><span>{i}</span></span><div class="nm"><strong>{n}{selos}</strong><small>{sub} · {cont}</small><q>{txt[0].upper() + txt[1:]}</q></div>'
               f'<div class="ac">{up}{dn}{ed}</div></li>')
    lista = (f'<section class="folha" aria-labelledby="t-et" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-et">Etapas dos casos</h2>'
             f'<p class="sub">8 etapas · valem para todos os casos do escritório · a última é sempre a final</p></div>'
             f'<div class="acoes"><button class="btn btn-sec" type="button">{ico("mais")}Adicionar etapa</button></div></div><ol class="ju-etapas">{li}</ol>'
             f'<p class="ju-pe">{ico("historico")}<span>Cada mudança na lista fica no histórico do escritório, com seu nome e a hora. Os casos não mudam de etapa sozinhos.</span></p></section>')
    exp = (f'<section class="explica campo-ambar" aria-labelledby="t-exe"><p class="sobretitulo">Como funciona</p><h2 id="t-exe">O escritório decide o caminho.</h2><ul>'
           f'<li>{ico("lapis")}<span>Mude nomes, textos e a ordem quando quiser. Os casos continuam na mesma etapa, com o nome novo.</span></li>'
           f'<li>{ico("pasta")}<span>Para tirar uma etapa com casos, escolha para qual etapa eles vão. Nada some.</span></li>'
           f'<li>{ico("check")}<span>A última etapa é a final: ao chegar nela, o T3jus pede o resultado (ganho, perda ou acordo) e calcula o êxito.</span></li>'
           f'<li>{ico("whats")}<span>O texto para o cliente vai no aviso do WhatsApp. Quem muda a etapa vê a prévia e pode não enviar.</span></li>'
           f'<li>{ico("cadeado")}<span>Só a sócia dona muda esta lista. A equipe vê as etapas, mas não edita.</span></li></ul></section>')
    cab = (f'<div class="pt-cab"><div><a class="ver" href="{U}casos" style="padding:0">{ico("esq", "ico ico-s")}Casos e processos</a>'
           f'<p class="sobretitulo" style="margin-top:6px">Jurídico · só a sócia dona edita</p><h1>Etapas do escritório</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">O caminho que todo caso percorre aqui, com o texto que o cliente recebe em cada passo.</p></div></div>')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{lista}</div><aside class="ju-col" aria-label="Como funcionam as etapas">{exp}</aside></div></div>'

# ---------------------------------------------------------------- Petições (EX-09, a validar)
def pagina_peticoes():
    res = (f'<div class="ju-reserva"><div>{ico("pena")}<span><b>Em estudo: o gerador de petições.</b> A ideia é usar os modelos do próprio escritório e preencher sozinho '
           f'os dados do cliente, do caso e dos advogados (nome e OAB), com um formulário curto para o endereçamento e o valor da causa. O resultado seria um arquivo editável no Word.</span></div>'
           f'<div>{ico("ajuda")}<span>Antes de construir, queremos saber se isso ajuda no dia a dia de quem escreve as peças. Nada aqui mexe nos seus casos.</span></div></div>')
    ops = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="pe-uso"><span>{k}<small>{s}</small></span></label>' for k, s in [
        ('Usaria toda semana', 'O escritório tem modelos e perde tempo preenchendo dados'),
        ('Usaria às vezes', 'Só para peças repetidas, como iniciais de um mesmo tipo'),
        ('Não usaria', 'Escrevo cada peça do zero ou já uso outro programa')])
    perg = (f'<form class="ju-pergunta" action="#" novalidate><fieldset class="ju-fs"><legend>Você usaria um gerador de petições com os modelos do escritório?</legend><div class="ju-ops">{ops}</div></fieldset>'
            f'<div class="campo"><label for="pe-como">Como você faz hoje? <span class="opcional">(opcional)</span></label><textarea class="entrada" id="pe-como" name="pe-como" aria-describedby="pe-como-aj"></textarea>'
            f'<p class="ajuda" id="pe-como-aj">Ex.: copio a última inicial parecida e troco os dados. Não escreva dados de clientes aqui.</p></div>'
            f'<div><button class="btn btn-pri" type="submit">{ico("enviar")}Enviar resposta</button></div></form>')
    f1 = folha('t-pet', 'Petições', 'Lugar reservado · a validar com os escritórios piloto', res + perg)
    cab = (f'<div class="pt-cab"><div><p class="sobretitulo">Jurídico</p><h1>Petições</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">Ainda não existe. Conte para a gente se faria diferença.</p></div></div>')
    exp = (f'<section class="explica campo-ambar" aria-labelledby="t-exp2"><p class="sobretitulo">Sua resposta</p><h2 id="t-exp2">Vai para a equipe T3jus.</h2><ul>'
           f'<li>{ico("pessoas")}<span>Vai com o seu nome e o do escritório, para podermos conversar depois.</span></li>'
           f'<li>{ico("escudo")}<span>Não leva nenhum dado de cliente ou de caso.</span></li>'
           f'<li>{ico("balanca")}<span>Enquanto isso, os dados que o gerador usaria já ficam prontos: qualificação dos clientes, dados dos casos e OAB da equipe.</span></li></ul></section>')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{f1}</div><aside class="ju-col" aria-label="Sobre a resposta">{exp}</aside></div></div>'

# ---------------------------------------------------------------- estados
T = ''
C = A('Casos e processos', 'Jurídico|Casos e processos', 'Casos e processos')
F = A('Casos e processos', 'Jurídico|Casos e processos|Pereira x Mercado Bom Preço', 'Pereira x Mercado Bom Preço')

T += tpl('casos', pagina_casos(), **C)
LARISSA = [c for c in CASOS if c[6] == 'Larissa Costa']
T += tpl('casos-larissa', pagina_casos(LARISSA, dono=False, resp_sel='Larissa Costa',
         cont='<b>2 casos de Larissa Costa</b> · 1 com prazo hoje'), quem='juridico', **C)
T += tpl('casos-vazio', casos_vazio(), **C)
T += tpl('novo-caso', '<div class="pt-cab"><div><p class="sobretitulo">Casos e processos</p><h1>Novo caso</h1><span class="fio" aria-hidden="true"></span></div></div>'
         + f'<div class="ju-grade"><div class="ju-col">{form_novo_caso()}</div><aside class="ju-col" aria-label="Como funciona o cadastro">{EXPLICA_NOVO}</aside></div>',
         **A('Casos e processos', 'Jurídico|Casos e processos|Novo caso', 'Novo caso'))
T += tpl('ficha', ficha() + j_etapa() + j_prazo(), **F)
T += tpl('mudar-etapa', ficha() + j_etapa(abrir=True) + j_prazo(), **F)
T += tpl('mudar-etapa-erro', ficha() + j_etapa(erro=True) + j_prazo(), **F)
T += tpl('etapa-mudada', ficha(et=6, desde='hoje, 18/11', novo=('Recurso', 'Marina Ribeiro', 'Sentença procedente em parte. Joana quer recorrer da parte das horas extras de Carlos.'),
                               ultimo='hoje, 15h20 · Recurso')
         + toast('Etapa mudada para Recurso.', 'O aviso foi enviado pelo WhatsApp a Joana e Carlos. A mudança está no histórico do caso.') + j_etapa() + j_prazo(), **F)
T += tpl('etapa-final', ficha() + j_final() + j_prazo(), **F)
T += tpl('ficha-sem-financeiro', ficha(fin=False) + j_etapa() + j_prazo(), quem='juridico', **F)
T += tpl('etapas', pagina_etapas(), **A('Casos e processos', 'Jurídico|Casos e processos|Etapas do escritório', 'Etapas do escritório'))
P = A('Prazos', 'Jurídico|Prazos', 'Prazos')
T += tpl('prazos', pagina_prazos() + j_prazo(), **P)
T += tpl('novo-prazo', pagina_prazos() + j_prazo(abrir=True), **P)
TA = A('Tarefas', 'Jurídico|Tarefas', 'Tarefas')
T += tpl('tarefas', pagina_tarefas(), **TA)
T += tpl('tarefas-equipe', pagina_tarefas(equipe=True), **TA)
T += tpl('peticoes', pagina_peticoes(), **A('Petições', 'Jurídico|Petições', 'Petições'))

out = pagina('Jurídico', 'Área Jurídico do Portal: casos e processos, ficha do caso com etapas, prazos, tarefas e petições.',
             '{"estado":"casos","atual":"juridico"}', '', T, BARRAS)
out = out.replace('</style>', CSS_JU + '\n</style>', 1)
open(f'{SAIDA}/juridico.html', 'w', encoding='utf-8').write(out)
print('juridico ok', T.count('<template data-est='), 'estados')
