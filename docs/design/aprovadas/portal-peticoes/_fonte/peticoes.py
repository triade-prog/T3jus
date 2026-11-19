# Portal · Jurídico › Petições (EX-09, a validar): modelos do escritório preenchidos com os dados
# do cliente, do caso e dos advogados, mais um formulário curto, gerando um .docx para revisar.
# Base sem mudança: comum.py (Portal v1) e juridico.py (Jurídico aprovado). Este arquivo carrega as
# definições do juridico.py (sem gerar o juridico.html) e acrescenta as peças novas, com prefixo pe-.
# Segue o padrão aprovado de Procurações e modelos (Contratos, decisões 24 a 26) e a decisão da Carol
# sobre as inscrições da OAB (cada advogado entra com todas, principal primeiro, e quem gera pode desmarcar).
# Uso: python3 peticoes.py <pasta-saida>
import sys, os, html

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_src = open(os.path.join(AQUI, 'juridico.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ---------------------------------------------------------------- estados')]
_ns = {'__name__': 'juridico_base', '__file__': os.path.join(AQUI, 'juridico.py')}
_argv = sys.argv[:]
exec(compile(_src, 'juridico.py', 'exec'), _ns)
sys.argv = _argv
globals().update({k: v for k, v in _ns.items() if not k.startswith('__')})

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape
UJ = 'juridico.html?estado='   # o Jurídico aprovado (links para lá ficam como referência)
U = 'peticoes.html?estado='


def cpf(b):
    d = [int(x) for x in b]
    for n in (10, 11):
        s = sum(v * (n - i) for i, v in enumerate(d)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:3]}.{s[3:6]}.{s[6:9]}-{s[9:]}'


# ---------------------------------------------------------------- dados fictícios
# Inscrições da OAB (as mesmas da Equipe · OAB): principal primeiro
OABS = {
    'Marina Ribeiro': [('OAB/SP nº 214.538', 'principal')],
    'Felipe Matos': [('OAB/SP nº 287.104', 'principal'), ('OAB/RJ nº 245.880-S', 'suplementar')],
    'Larissa Costa': [('OAB/SP nº 401.226', 'principal')],
}
SEM_OAB = 'Gustavo Lima e Diego Almeida'

CPF_JOANA, CPF_CARLOS, CPF_ANTONIA = cpf('318204576'), cpf('402917355'), cpf('215873904')

# Modelos: (nome, área, do escritório?, versão/quem, campos, usos)
MODELOS = [
    ('Trabalhista', [
        ('Petição inicial trabalhista', True, 'v3 · enviado por Marina Ribeiro em 02/10/2026', 16, 9),
        ('Recurso ordinário', True, 'v2 · enviado por Marina Ribeiro em 14/08/2026', 12, 4),
        ('Contestação trabalhista', False, 'padrão do T3jus · atualizado em 01/11/2026', 11, 2),
    ]),
    ('Cível, consumidor e saúde', [
        ('Petição inicial cível', True, 'v1 · enviado por Felipe Matos em 20/09/2026', 15, 3),
        ('Contestação cível', False, 'padrão do T3jus · atualizado em 01/11/2026', 11, 1),
    ]),
    ('Para qualquer área', [
        ('Juntada de documentos', False, 'padrão do T3jus · atualizado em 01/11/2026', 8, 6),
        ('Pedido de prazo', False, 'padrão do T3jus · atualizado em 01/11/2026', 8, 5),
        ('Manifestação simples', False, 'padrão do T3jus · atualizado em 01/11/2026', 7, 2),
    ]),
]

# Petições geradas: (modelo, arquivo, caso, quem, quando, dados marcados)
PETS = [
    ('Recurso ordinário', 'recurso-ordinario-pereira-x-mercado-bom-preco.docx', 'Pereira x Mercado Bom Preço', 'Marina Ribeiro', 'hoje, 15h42', 1),
    ('Juntada de documentos', 'juntada-ferreira-prado-x-inss.docx', 'Ferreira Prado x INSS', 'Larissa Costa', 'hoje, 11h05', 2),
    ('Contestação cível', 'contestacao-souza-x-construtora-atlas.docx', 'Souza x Construtora Atlas', 'Felipe Matos', 'ontem, 18h20', 0),
    ('Pedido de prazo', 'pedido-de-prazo-andrade-x-unimed.docx', 'Andrade x Unimed Paulistana', 'Larissa Costa', '16/11, 10h12', 0),
    ('Petição inicial cível', 'inicial-lima-x-seguradora-norte.docx', 'Lima x Seguradora Norte', 'Gustavo Lima', '28/10, 09h30', 0),
    ('Petição inicial trabalhista', 'inicial-ferreira-x-banco-horizonte.docx', 'Ferreira x Banco Horizonte', 'Marina Ribeiro', '12/03, 14h02', 0),
]

# Campos aceitos nos modelos (grupo, [(campo, o que entra)])
CAMPOS = [
    ('Clientes do caso', [
        ('[PARTES_QUALIFICACAO]', 'Todos os clientes marcados como partes, cada um com a qualificação, ligados por “e”'),
        ('[CLIENTE_NOME]', 'Nome do primeiro cliente, em maiúsculas'),
        ('[CLIENTE_QUALIFICACAO]', 'Nacionalidade, estado civil, profissão, RG, CPF e endereço do primeiro cliente'),
        ('[CLIENTE_CPF]  [CLIENTE_RG]  [CLIENTE_ENDERECO]', 'Um dado só, quando o modelo precisa separado'),
    ]),
    ('Caso e processo', [
        ('[NUMERO_PROCESSO]', 'Número no formato do CNJ'),
        ('[VARA]  [TRIBUNAL]  [SISTEMA]', 'Do bloco “Processo” do caso'),
        ('[PARTE_CONTRARIA]', 'Nome da parte contrária'),
        ('[PARTE_CONTRARIA_QUALIFICACAO]', 'CNPJ ou CPF e endereço, quando o caso tiver'),
        ('[VALOR_CAUSA]  [VALOR_CAUSA_EXTENSO]', 'R$ 86.400,00 e “oitenta e seis mil e quatrocentos reais”'),
    ]),
    ('Advogados', [
        ('[ADVOGADOS_OAB]', 'Nome e inscrições de quem assina: “MARINA RIBEIRO, OAB/SP nº 214.538, e …”'),
        ('[ADVOGADOS_ASSINATURA]', 'O bloco de assinatura, uma linha por advogado'),
    ]),
    ('Formulário e escritório', [
        ('[ENDERECAMENTO]', 'Para quem vai a petição; vem montado da vara do caso'),
        ('[CIDADE_DATA]', '“São Paulo, 18 de novembro de 2026”'),
        ('[ESCRITORIO_NOME]  [ESCRITORIO_ENDERECO]', 'De Escritório, no Portal'),
    ]),
]

# ---------------------------------------------------------------- CSS (prefixo pe-)
CSS_PE = r"""
/* ==========================================================================
   Portal · Jurídico › Petições (EX-09). Prefixo pe-. Só pares do contraste.md.
   A prévia em papel repete o desenho aprovado de Contratos (ct-papel), com o
   terceiro marcador "deste formulário".
   ========================================================================== */
.pe-cab-acoes{display:flex;gap:10px;flex-wrap:wrap}
.pe-voltar{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--vinho);font-weight:500;text-decoration:none;font-size:13px}
.pe-voltar:hover{text-decoration:underline}

/* Lista de petições */
.pe-tab td{vertical-align:middle}
.pe-doc{display:flex;align-items:center;gap:12px}
.pe-doc .pe-ci{width:40px;height:40px;flex:none;border-radius:10px;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.pe-doc b{display:block;font-weight:500;line-height:1.35}
.pe-doc small{display:block;font-size:12px;color:var(--texto-2);overflow-wrap:anywhere}
.pe-caso{display:inline-flex;align-items:center;min-height:44px;color:var(--vinho);font-weight:500;text-decoration:none}
.pe-caso:hover{text-decoration:underline}
.pe-quando{font-size:13px;color:var(--texto-2);white-space:nowrap}
.pe-tab tr.pe-nova td{background:#FCF8F5}
.pe-dx{display:flex;align-items:center;justify-content:space-between;gap:8px}
.pe-quem{display:grid;gap:4px;justify-items:start}
.pe-bx{width:44px;padding:0;justify-content:center}
.pe-partes .opcao small .selo{margin:4px 0 0 8px;vertical-align:middle}

/* Passos da nova petição */
.pe-passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pe-passos li{position:relative;display:flex;align-items:center;gap:10px;min-height:56px;padding:8px 12px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha);font-size:13px;color:var(--texto-2);min-width:0}
.pe-passos li>a,.pe-passos li>span.pe-pi{display:flex;align-items:center;gap:10px;min-width:0;color:inherit;text-decoration:none;min-height:44px;flex:1}
.pe-passos li>a:hover b{text-decoration:underline}
.pe-passos .pe-n{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--serifa);font-size:16px;font-weight:600;background:var(--sal-2);color:var(--vinho-2)}
.pe-passos b{display:block;font-weight:500;color:var(--texto);line-height:1.25}
.pe-passos small{display:block;font-size:12px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pe-passos li.feito .pe-n{background:var(--vinho);color:var(--papel)}
.pe-passos li[aria-current="step"]{border-color:var(--vinho);box-shadow:inset 0 -3px 0 var(--vinho);background:#FCF8F5}
.pe-passos li[aria-current="step"] .pe-n{background:var(--ambar);color:var(--vinho-escuro)}
.pe-passos li[aria-current="step"] b{color:var(--vinho)}

/* Escolhas em cartão (caso, modelo) */
.pe-escolhas{list-style:none;margin:0;padding:0 24px 8px;display:grid;gap:8px}
.pe-escolhas .opcao{margin:0;padding:12px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);align-items:flex-start;background:var(--papel)}
.pe-escolhas .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.pe-escolhas .opcao strong{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);line-height:1.25}
.pe-escolhas .opcao strong .selo{font-family:var(--sans)}
.pe-escolhas .opcao small{display:block;font-size:12px;color:var(--texto-2)}
.pe-escolhas .opcao .pe-linha2{color:var(--texto);font-size:13px}
.pe-grupo-t{font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:10px 24px 8px}
.pe-busca{padding:0 24px 14px}
.pe-busca .campo-busca{position:relative;max-width:420px}
.pe-busca .campo-busca .ico{position:absolute;left:14px;top:12px;color:var(--vinho-4);pointer-events:none}
.pe-busca .campo-busca input{padding-left:44px}

/* Formulário da peça */
.pe-form .ju-sec{margin-top:6px}
.pe-dado{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px}
.pe-dado b{font-weight:500}
.pe-dado small{display:block;font-size:12px;color:var(--texto-2)}
.pe-dado .pe-de{font-size:12px;color:var(--texto-2);margin-left:auto}
.pe-partes{display:grid;gap:6px}
.pe-partes .opcao{margin:0;border:1px solid var(--borda-folha);padding:10px 12px;align-items:flex-start}
.pe-partes .opcao:has(input:checked){border-color:var(--vinho-2);background:#FCF8F5}
.pe-partes .opcao .selo{margin-top:6px}
.pe-partes .pe-completar{display:inline-flex;align-items:center;min-height:44px;margin:-6px 0 -10px 34px;font-size:13px;font-weight:500;color:var(--vinho)}
.pe-adv{display:grid;gap:8px}
.pe-adv>.pe-a{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:4px 12px 8px}
.pe-adv>.pe-a:has(>.opcao input:checked){border-color:var(--vinho-2);background:#FCF8F5}
.pe-adv>.pe-a>.opcao{margin:0 -4px;padding:8px 4px}
.pe-insc{border:0;margin:0 0 4px 34px;padding:8px 0 0;border-top:1px dashed var(--borda-folha);min-width:0;display:grid;gap:0}
.pe-insc legend{float:left;width:100%;padding:0;margin:0 0 2px;font-size:12px;color:var(--texto-2)}
.pe-insc .opcao{margin:0 -4px;padding:6px 4px;min-height:44px;align-items:center}
.pe-insc .opcao small{display:inline;margin-left:6px}
.pe-insc-uma{margin:0 0 6px 34px;font-size:13px;color:var(--texto)}
.pe-insc-uma small{color:var(--texto-2);font-size:12px;margin-left:6px}
.pe-sai{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.pe-sai .ico{color:var(--vinho);flex:none;margin-top:1px}
.pe-sai b{font-weight:600}
.pe-fs{border:0;margin:0;padding:0;min-width:0;display:grid;gap:8px}
.pe-fs>legend{padding:0;margin-bottom:8px;font-size:13px;font-weight:500;color:var(--texto)}
.pe-fs>legend small{font-weight:400;color:var(--texto-2);margin-left:6px}
.pe-fs .erro-msg{margin:-2px 0 4px}

/* Resumo lateral da petição */
.pe-resumo{margin:0;padding:0 24px 14px;display:grid}
.pe-resumo>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:10px 0;border-top:1px solid var(--divisor)}
.pe-resumo>div:first-child{border-top:0}
.pe-resumo dt{font-size:12px;color:var(--texto-2);grid-column:1}
.pe-resumo dd{margin:0;grid-column:1;font-weight:500;font-size:14px;line-height:1.35}
.pe-resumo dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.pe-resumo dd.pe-tr{grid-column:2;grid-row:1/span 2}
.pe-lat-acoes{padding:0 24px 20px;display:grid;gap:10px}
.pe-lat-acoes>p{font-size:13px;color:var(--texto-2);line-height:1.5}
.pe-faltas{list-style:none;margin:0;padding:0 24px 12px;display:grid;gap:8px}
.pe-faltas li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.pe-faltas li .ico{width:18px;height:18px;color:var(--vinho);margin-top:2px}
.pe-faltas li b{font-weight:600}
.pe-faltas li .pe-fa{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:2px}
.pe-faltas li .pe-fa a{display:inline-flex;align-items:center;min-height:44px;font-weight:500;color:var(--vinho)}
.pe-ok{display:flex;gap:10px;align-items:flex-start;padding:0 24px 12px;font-size:13px;line-height:1.5}
.pe-ok .ico{color:var(--vinho-2);flex:none;margin-top:1px}
.pe-cuidado{margin:0 24px 14px;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5;color:var(--tinta)}
.pe-cuidado .ico{color:var(--vinho);flex:none;margin-top:1px}
.pe-cuidado b{font-weight:600}

/* Prévia em papel timbrado (o mesmo desenho do aprovado em Contratos) */
.pe-leg{display:flex;flex-wrap:wrap;gap:6px 16px;padding:0 24px 12px;font-size:12px;color:var(--texto-2)}
.pe-leg span{display:inline-flex;align-items:center;gap:6px}
.pe-leg i{width:18px;height:12px;border-radius:2px;display:inline-block}
.pe-papel-folha{padding:0 24px 24px}
.pe-papel{background:var(--papel);border:1px solid var(--borda-folha);border-radius:4px;box-shadow:0 10px 24px -16px rgba(42,26,34,.45);padding:28px 40px 32px;font-family:var(--serifa);font-size:15px;line-height:1.7;color:var(--tinta);position:relative;max-width:760px;margin:0 auto}
.pe-papel::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:var(--vinho);border-radius:4px 4px 0 0}
.pe-timbre{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding-bottom:8px;margin-bottom:18px;border-bottom:1px solid var(--ambar-2);font-family:var(--sans);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--vinho-2)}
.pe-papel p+p{margin-top:12px}
.pe-papel .pe-end{font-weight:600;text-transform:uppercase;letter-spacing:.02em}
.pe-papel .pe-proc{margin-top:22px}
.pe-papel .pe-tit{font-weight:700;letter-spacing:.06em}
.pe-papel .pe-ass{margin-top:22px;text-align:center}
.pe-papel mark{background:var(--sal-2);color:inherit;border-radius:3px;padding:0 2px;box-shadow:inset 0 -2px 0 var(--vinho-4)}
.pe-papel mark.pe-f{background:#FCF8F5;box-shadow:none;border-bottom:2px dotted var(--vinho-2)}
.pe-papel mark.pe-falta{background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-3);font-family:var(--sans);font-size:12px;font-weight:600;padding:1px 6px;white-space:nowrap}
.pe-papel .pe-mais{font-family:var(--sans);font-size:12px;color:var(--texto-2);margin-top:18px;padding-top:12px;border-top:1px dashed var(--borda-folha);display:flex;gap:8px;align-items:flex-start}
.pe-papel .pe-mais .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}
.pe-mini .pe-papel{padding:18px 18px 20px;font-size:12.5px;line-height:1.6}
.pe-mini .pe-papel-folha{padding:0 24px 20px}

/* Modelos */
.pe-modelos{list-style:none;margin:0;padding:0 24px 10px}
.pe-modelos li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 0;border-top:1px solid var(--divisor)}
.pe-modelos li:first-child{border-top:0}
.pe-modelos .pe-ci{width:44px;height:44px;border-radius:var(--raio);display:grid;place-items:center;background:var(--sal-2);color:var(--vinho-2)}
.pe-modelos li.pe-do-esc .pe-ci{background:var(--ambar-3);color:var(--vinho)}
.pe-modelos strong{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);line-height:1.25}
.pe-modelos strong .selo{font-family:var(--sans)}
.pe-modelos small{display:block;font-size:12px;color:var(--texto-2)}
.pe-modelos .pe-bts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.pe-campos{padding:0 24px 8px}
.pe-campos h3{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:12px 0 6px;border-top:1px solid var(--divisor)}
.pe-campos h3:first-child{border-top:0;padding-top:0}
.pe-campos dl{margin:0 0 8px;display:grid;gap:8px}
.pe-campos dt code,.pe-code{font-family:var(--fonte-codigo);font-size:12px;background:var(--sal-2);color:var(--vinho);padding:2px 6px;border-radius:6px;overflow-wrap:anywhere}
.pe-campos dd{margin:2px 0 0;font-size:12px;color:var(--texto-2);line-height:1.45}

/* Janela de enviar modelo */
.pe-arq{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:#FCF8F5}
.pe-arq.erro{border:2px solid var(--vinho-3);background:var(--papel)}
.pe-arq .pe-ci{width:44px;height:44px;border-radius:var(--raio);display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.pe-arq b{display:block;font-weight:500;overflow-wrap:anywhere}
.pe-arq small{display:block;font-size:12px;color:var(--texto-2)}
.pe-rot{font-size:13px;font-weight:500;color:var(--texto)}
.pe-conf{border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:14px 16px;display:grid;gap:12px}
.pe-conf h3{font-family:var(--sans);font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;color:var(--texto)}
.pe-conf h3 .ico{color:var(--vinho)}
.pe-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.pe-chips li{display:inline-flex;align-items:center;gap:6px;font-size:12px}
.pe-chips li .ico{width:14px;height:14px;color:var(--vinho-2)}
.pe-chips li.pe-desc code{background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-3)}
.pe-chips li.pe-desc .ico{color:var(--vinho-3)}

/* Resultado */
.pe-pronto{padding:0 24px 16px;display:grid;gap:14px}
.pe-pronto .pe-arq{background:var(--papel)}
.pe-pronto .pe-arq .pe-ci{background:var(--ambar-3)}
.pe-proximo{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:pp}
.pe-proximo li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:10px;align-items:start;font-size:13px;line-height:1.5}
.pe-proximo li::before{counter-increment:pp;content:counter(pp);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho);font-family:var(--serifa);font-weight:600;font-size:15px}
.pe-proximo b{font-weight:600}
.pe-reserva{margin:0 24px 20px;padding:16px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--texto-2);line-height:1.5}
.pe-reserva .ico{color:var(--vinho-4);flex:none;margin-top:1px}
.pe-reserva b{color:var(--texto);font-weight:500}
.pe-acoes-res{display:flex;gap:10px;flex-wrap:wrap}

/* Ficha do caso: petições do caso */
.pe-do-caso{list-style:none;margin:0;padding:0 24px 8px}
.pe-do-caso li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.pe-do-caso li:first-child{border-top:0}
.pe-do-caso b{display:block;font-weight:500;font-size:14px}
.pe-do-caso small{display:block;font-size:12px;color:var(--texto-2);margin-bottom:4px}
.docs>li.pe-novo-doc{background:#FCF8F5}

@media (max-width:760px){
  .pe-cab-acoes{flex-direction:column;width:100%}
  .pe-cab-acoes .btn{width:100%}
  .pe-passos{gap:4px}
  .pe-passos li{flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 2px;min-height:64px;text-align:center}
  .pe-passos li>a,.pe-passos li>span.pe-pi{flex-direction:column;gap:2px;min-height:52px;justify-content:center}
  .pe-passos small{display:none}
  .pe-passos b{font-size:12px}
  .pe-escolhas{padding:0 16px 8px}
  .pe-grupo-t{padding:10px 16px 8px}
  .pe-busca{padding:0 16px 12px}
  .pe-resumo,.pe-faltas,.pe-ok,.pe-lat-acoes,.pe-campos,.pe-modelos,.pe-pronto,.pe-do-caso{padding-left:16px;padding-right:16px}
  .pe-cuidado,.pe-reserva{margin-left:16px;margin-right:16px}
  .pe-leg{padding:0 16px 10px}
  .pe-papel-folha,.pe-mini .pe-papel-folha{padding:0 12px 16px}
  .pe-papel{padding:20px 16px 22px;font-size:13.5px;line-height:1.65}
  .pe-modelos li{grid-template-columns:44px minmax(0,1fr)}
  .pe-modelos .pe-bts{grid-column:1/-1;justify-content:stretch}
  .pe-modelos .pe-bts .btn{flex:1 1 auto}
  .pe-arq{grid-template-columns:44px minmax(0,1fr)}
  .pe-arq .btn{grid-column:1/-1;width:100%}
  .pe-insc,.pe-insc-uma{margin-left:30px}
  .pe-acoes-res .btn{width:100%}
  .pe-dado .pe-de{margin-left:0;flex-basis:100%}
  /* Botões no rodapé do formulário, largos, um ao lado do outro */
  .pe-rodape{padding-top:12px;border-top:1px solid var(--divisor)}
  .pe-rodape .btn{flex:1 1 calc(50% - 5px)}
}
"""

# ---------------------------------------------------------------- peças
def op(nome, rot, sub='', marcado=False, tipo='checkbox', id_=None, cls='', extra_attr=''):
    ch = ' checked' if marcado else ''
    i = f' id="{id_}"' if id_ else ''
    s = f'<small>{sub}</small>' if sub else ''
    c = f' {cls}' if cls else ''
    return f'<label class="opcao{c}"><input class="marcar" type="{tipo}" name="{nome}"{i}{ch}{extra_attr}><span>{rot}{s}</span></label>'


def area_txt(campo_id, rot, valor='', ajuda='', erro='', opc=False, foco=False, alto=88):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    desc, aj, er, a = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{campo_id}-aj">{ajuda}</p>'; desc.append(f'{campo_id}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{campo_id}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{campo_id}-er'); a += ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if foco:
        a += ' data-foco'
    return (f'<div class="campo c6"><label for="{campo_id}">{rot}{o}</label><textarea class="entrada" id="{campo_id}" name="{campo_id}" style="min-height:{alto}px"{a}>{valor}</textarea>{aj}{er}</div>')


def sel(tipo, txt, icone=None):
    i = ico(icone) if icone else ''
    return f'<span class="selo selo-{tipo}">{i}{txt}</span>'


def selo_dados(n):
    if n == 0:
        return sel('ok', 'Completa', 'check')
    return sel('atencao', f'{n} {"marcado" if n == 1 else "marcados"}<span class="sr"> para completar</span>', 'pena')


def cab_pet(titulo='Petições', lede='', acoes='', voltar=None, sobre='Jurídico'):
    v = f'<a class="pe-voltar" href="{voltar[0]}">{ico("esq", "ico ico-s")}{voltar[1]}</a>' if voltar else ''
    lp = f'<p class="lede">{lede}</p>' if lede else ''
    a = f'<div class="pe-cab-acoes">{acoes}</div>' if acoes else ''
    return (f'<div class="pt-cab"><div>{v}<p class="sobretitulo">{sobre}</p><h1>{titulo}</h1><span class="fio" aria-hidden="true"></span>{lp}</div>{a}</div>')


EXPLICA_LISTA = (f'<section class="explica campo-ambar" aria-labelledby="t-expe"><p class="sobretitulo">Como funciona</p><h2 id="t-expe">O texto é do escritório. Os dados, do cadastro.</h2><ul>'
                 f'<li>{ico("doc")}<span>Cada petição parte de um modelo do escritório, em Word, com campos entre colchetes como [PARTES_QUALIFICACAO] e [ADVOGADOS_OAB].</span></li>'
                 f'<li>{ico("pessoas")}<span>A qualificação dos clientes, os dados do processo e a OAB dos advogados vêm do caso, da ficha do cliente e da Equipe.</span></li>'
                 f'<li>{ico("lapis")}<span>Um formulário curto pede o resto: para quem vai a petição, quem assina e o que muda só desta vez.</span></li>'
                 f'<li>{ico("balanca")}<span>Sai um .docx para revisar no Word. O T3jus não escreve a tese, não revisa o conteúdo jurídico e não protocola.</span></li></ul></section>')


# ---------------------------------------------------------------- 1. lista (a função pagina_lista, com a situação, está na parte 7)
def pagina_vazia():
    acoes = (f'<a class="btn btn-sec" href="{U}modelos">{ico("doc")}Modelos de petição</a>'
             f'<a class="btn btn-pri" href="{U}nova-caso">{ico("mais")}Nova petição</a>')
    cab = cab_pet('Petições', 'As petições feitas a partir dos modelos do escritório, já com os dados do cliente, do caso e dos advogados.', acoes)
    passos = (f'<ol class="ju-passos"><li><span class="disco"><span>1</span></span><span><b>Confira os modelos</b><small>Já vêm 8 modelos padrão do T3jus. Troque pelos do escritório: um .docx com os campos entre colchetes.</small></span></li>'
              f'<li><span class="disco"><span>2</span></span><span><b>Gere a primeira petição</b><small>Escolha o caso e o modelo. Também dá para começar pela ficha do caso, em “Gerar petição”.</small></span></li></ol>')
    e = estado('Nenhuma petição gerada ainda', 'Aqui ficam as petições geradas pelo escritório, com o caso e quem gerou. Dois passos para começar:', 'pena', moldura=False,
               acoes=f'<a class="btn btn-sec" href="{U}modelos">{ico("doc")}Ver os modelos</a><a class="btn btn-pri" href="{U}nova-caso">{ico("mais")}Gerar a primeira</a>', h='h2')
    e = e.replace('</p><div class="acoes">', '</p>' + passos + '<div class="acoes">')
    lista = f'<section class="folha" aria-label="Petições geradas" style="overflow:hidden">{e}</section>'
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{lista}</div><aside class="ju-col" aria-label="Como funcionam as petições">{EXPLICA_LISTA}</aside></div></div>'


# ---------------------------------------------------------------- 2. modelos
def pagina_modelos():
    cab = cab_pet('Modelos de petição', 'Os textos do escritório, em Word. O T3jus só preenche os campos entre colchetes; o resto fica como está.',
                  f'<button class="btn btn-pri" type="button" data-janela="janela-modelo">{ico("enviar")}Enviar modelo</button>',
                  voltar=(f'{U}peticoes', 'Petições'), sobre='Jurídico · Petições')
    corpo = ''
    for area, itens in MODELOS:
        li = ''
        for nome, esc, ver, ncampos, usos in itens:
            s = sel('implant', 'Do escritório') if esc else sel('neutro', 'Padrão T3jus')
            bts = (f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> o modelo {nome}</span></button>'
                   f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-modelo">{ico("trocar", "ico ico-s")}{"Trocar" if esc else "Usar o do escritório"}<span class="sr">: {nome}</span></button>')
            li += (f'<li class="{"pe-do-esc" if esc else ""}"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><strong>{nome}{s}</strong>'
                   f'<small>{ver} · {ncampos} campos · usado {usos} {"vez" if usos == 1 else "vezes"}</small></div><div class="pe-bts">{bts}</div></li>')
        corpo += f'<div class="ju-grupo"><h3>{area}<span class="q">{len(itens)}</span></h3><ul class="pe-modelos">{li}</ul></div>'
    pe = (f'<p class="ju-pe">{ico("historico")}<span>Trocar um modelo cria a versão nova e guarda a anterior. As petições já geradas não mudam. '
          f'Cada envio e cada troca ficam no histórico do escritório, com quem fez e quando.</span></p>')
    lista = (f'<section class="folha" aria-labelledby="t-mo" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-mo">Modelos</h2>'
             f'<p class="sub">8 modelos · 3 do escritório e 5 padrão do T3jus · por área</p></div></div>{corpo}{pe}</section>')
    cps = ''
    for g, itens in CAMPOS:
        cps += f'<h3>{g}</h3><dl>' + ''.join(
            f'<div><dt>{" ".join(f"<code>{H(x)}</code>" for x in c.split("  "))}</dt><dd>{d}</dd></div>' for c, d in itens) + '</dl>'
    campos = (f'<section class="folha" aria-labelledby="t-cps"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-cps" style="font-size:20px">Campos aceitos</h2>'
              f'<p class="sub">Escreva no modelo do jeito que está aqui, com os colchetes.</p></div></div><div class="pe-campos">{cps}</div>'
              f'<p class="ju-nota">{ico("ajuda")}<span>Dado que falta no cadastro sai marcado, como [RG: falta]. Campo que o T3jus não conhece sai como está, para completar no Word.</span></p></section>')
    quem = (f'<section class="folha" aria-labelledby="t-qm"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-qm" style="font-size:20px">Quem muda os modelos</h2></div></div>'
            f'<p class="ju-nota" style="font-size:13px">{ico("pessoas")}<span>Quem tem a área Jurídico envia e troca modelos. A versão anterior fica guardada e a troca entra no histórico.</span></p></section>')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{lista}</div><aside class="ju-col" aria-label="Campos e permissões">{campos}{quem}</aside></div></div>'


def j_modelo(abrir=False, erro=False):
    if erro:
        arq = (f'<div class="campo c6"><p class="pe-rot" id="ma-arq-r">Arquivo do modelo</p><div class="pe-arq erro" role="group" aria-labelledby="ma-arq-r">'
               f'<span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><b>recurso-ordinario.pdf</b><small>PDF · 212 KB</small></div>'
               f'<button class="btn btn-sec btn-compacto" type="button" data-foco aria-describedby="ma-arq-er">{ico("enviar", "ico ico-s")}Escolher outro arquivo</button></div>'
               f'<p class="erro-msg" id="ma-arq-er">{ico("alerta", "ico ico-s")}Este arquivo é PDF. O modelo precisa ser do Word (.docx), para o T3jus preencher e você editar depois. No Word: Arquivo › Salvar como › Documento do Word.</p></div>')
        conf = ''
        resumo = aviso('urgencia', 'O modelo não foi salvo.', 'Escolha um arquivo .docx de até 5 MB. O modelo atual (v2) continua valendo.')
    else:
        arq = (f'<div class="campo c6"><p class="pe-rot" id="ma-arq-r">Arquivo do modelo</p><div class="pe-arq" role="group" aria-labelledby="ma-arq-r">'
               f'<span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><b>recurso-ordinario-rm-v3.docx</b><small>Word · 58 KB · conferido agora</small></div>'
               f'<button class="btn btn-sec btn-compacto" type="button">{ico("enviar", "ico ico-s")}Trocar arquivo</button></div>'
               f'<p class="ajuda">Só .docx, até 5 MB. Arquivos com macro (.docm) e PDF não servem.</p></div>')
        ok = ['[ENDERECAMENTO]', '[NUMERO_PROCESSO]', '[VALOR_CAUSA]', '[PARTES_QUALIFICACAO]', '[PARTE_CONTRARIA]', '[VARA]', '[TRIBUNAL]', '[CIDADE_DATA]', '[ADVOGADOS_OAB]', '[ADVOGADOS_ASSINATURA]']
        chips = ''.join(f'<li>{ico("check")}<code class="pe-code">{c}</code></li>' for c in ok)
        chips += f'<li class="pe-desc">{ico("alerta")}<code class="pe-code">[NOME_RECLAMADA]</code><span class="sr">: campo desconhecido</span></li>'
        conf = (f'<section class="pe-conf c6" aria-labelledby="ma-conf-t"><h3 id="ma-conf-t">{ico("doc")}Conferimos o arquivo: 11 campos, 1 desconhecido</h3>'
                f'<ul class="pe-chips" aria-label="Campos encontrados">{chips}</ul>'
                + aviso('atencao', 'O T3jus não conhece o campo [NOME_RECLAMADA].',
                        'Na petição, ele sai do jeito que está, entre colchetes, para completar no Word. Para preencher sozinho, troque no Word por [PARTE_CONTRARIA] e envie de novo. Dá para salvar assim.',
                        icone='alerta') + '</section>')
        resumo = ''
    corpo = (resumo + '<div class="form-folha" style="padding:0">' + arq
             + campo('ma-nome', 'Nome do modelo', 'Recurso ordinário', 'c6', foco=not erro, ajuda='Como aparece na hora de escolher.')
             + selecao('ma-tipo', 'Tipo de peça', ['Petição inicial', 'Contestação', 'Recurso', 'Juntada de documentos', 'Pedido de prazo', 'Manifestação', 'Outra'], 'Recurso', 'c3')
             + selecao('ma-area', 'Área', ['Trabalhista', 'Cível', 'Consumidor', 'Família', 'Previdenciário', 'Saúde', 'Tributário', 'Qualquer área'], 'Trabalhista', 'c3', ajuda='Os modelos da área do caso aparecem primeiro.')
             + selecao('ma-subst', 'Substitui', ['Recurso ordinário · v2, do escritório', 'Nenhum: é um modelo novo'], 'Recurso ordinário · v2, do escritório', 'c6',
                       ajuda='A v2 fica guardada. As petições já geradas com ela não mudam.', vazio='')
             + conf + '</div>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}{"Salvar modelo" if erro else "Salvar como v3"}</button>')
    j = janela('janela-modelo', 'Modelos de petição', 'Enviar modelo',
               'Um .docx do escritório com os campos entre colchetes. Conferimos os campos assim que o arquivo chega.', corpo, pe, abrir=abrir or erro)
    return j.replace('class="janela"', 'class="janela ju-larga"', 1)


# ---------------------------------------------------------------- 3. nova petição
PASSOS = [('Caso', 'nova-caso'), ('Modelo', 'nova-modelo'), ('Dados da peça', 'nova-dados'), ('Prévia e gerar', 'nova-previa')]


def passos(atual, escolhas=('', '', '', ''), lista=None):
    li = ''
    for i, (nome, est) in enumerate(lista or PASSOS, 1):
        sub = f'<small>{escolhas[i - 1]}</small>' if escolhas[i - 1] else ''
        n = f'<span class="pe-n" aria-hidden="true">{i}</span>'
        txt = f'<span style="min-width:0"><b>{nome}</b>{sub}</span>'
        if i < atual:
            li += f'<li class="feito"><a href="{U}{est}">{n}{txt}<span class="sr"> (feito; voltar a este passo)</span></a></li>'
        elif i == atual:
            li += f'<li aria-current="step"><span class="pe-pi">{n}{txt}<span class="sr"> (passo atual)</span></span></li>'
        else:
            li += f'<li><span class="pe-pi">{n}{txt}</span></li>'
    return f'<ol class="pe-passos" aria-label="Passo {atual} de 4">{li}</ol>'


def cab_nova(atual, escolhas, lista=None):
    return (cab_pet('Nova petição', voltar=(f'{U}peticoes', 'Petições'), sobre='Petições') + passos(atual, escolhas, lista))


def pagina_nova(atual, escolhas, principal, lateral, rot_lat='Sua petição', passos_lista=None):
    return (f'<div class="ju">{cab_nova(atual, escolhas, passos_lista)}<div class="ju-grade"><div class="ju-col">{principal}</div>'
            f'<aside class="ju-col" aria-label="{rot_lat}">{lateral}</aside></div></div>')


EXPLICA_DADOS = (f'<section class="explica campo-ambar" aria-labelledby="t-exd"><p class="sobretitulo">De onde vêm os dados</p><h2 id="t-exd">Você escolhe; o resto já está no T3jus.</h2><ul>'
                 f'<li>{ico("pessoas")}<span><b>Dos clientes:</b> nome, nacionalidade, estado civil, profissão, RG, CPF e endereço, da ficha de cada um.</span></li>'
                 f'<li>{ico("balanca")}<span><b>Do caso:</b> número, vara, tribunal, parte contrária e valor da causa.</span></li>'
                 f'<li>{ico("cracha")}<span><b>Da Equipe:</b> nome e OAB de quem assina.</span></li>'
                 f'<li>{ico("lapis")}<span><b>De você:</b> o endereçamento e o que mudar só nesta petição.</span></li></ul></section>')


def nova_caso():
    def c(nome, num, area, cli, et, marc=False):
        n = num or 'Sem número ainda'
        sub = f'<span class="num">{n}</span> · {area}<span class="pe-linha2" style="display:block">{cli} · etapa {et}</span>'
        return '<li>' + op('nv-caso', f'<strong>{nome}</strong>', sub, marc, 'radio') + '</li>'
    li = (c('Pereira x Mercado Bom Preço', '1001022-33.2026.5.02.0045', 'Trabalhista', 'Joana Pereira e Carlos Henrique Dias', 'Sentença', True)
          + c('Souza x Construtora Atlas', '0812345-67.2026.8.26.0100', 'Cível', 'Construtora Atlas Ltda.', 'Citação e defesa')
          + c('Andrade x Unimed Paulistana', '1004871-20.2025.8.26.0011', 'Saúde', 'Roberto Andrade', 'Instrução')
          + c('Ferreira Prado x INSS', '', 'Previdenciário', 'Antônia Ferreira Prado', 'Preparação')
          + c('Oliveira x Banco Horizonte', '0798812-04.2026.8.26.0100', 'Consumidor', 'Sérgio Oliveira', 'Citação e defesa'))
    busca = (f'<div class="pe-busca"><div class="campo-busca"><label class="sr" for="nv-busca">Buscar caso por nome, número ou cliente</label>{ico("busca")}'
             f'<input class="entrada" id="nv-busca" type="search" placeholder="Caso, número ou cliente" autocomplete="off" data-foco></div></div>')
    rod = (f'<div class="form-pe pe-rodape"><span class="esq-pe">Também dá para começar pela ficha do caso, em “Gerar petição”: o caso já vem escolhido.</span>'
           f'<a class="btn btn-fantasma" href="{U}peticoes">Cancelar</a><a class="btn btn-pri" href="{U}nova-modelo">Continuar{ico("dir")}</a></div>')
    pri = (f'<section class="folha" aria-labelledby="t-nc"><div class="folha-cab"><div><h2 id="t-nc">Para qual caso?</h2>'
           f'<p class="sub">Casos em andamento · os seus primeiro</p></div></div>{busca}'
           f'<fieldset class="pe-fs" style="padding:0"><legend class="sr">Caso</legend><ul class="pe-escolhas">{li}</ul></fieldset>'
           f'<div class="form-folha" style="padding-top:8px">{rod}</div></section>')
    return pagina_nova(1, ('', '', '', ''), pri, EXPLICA_DADOS)


def resumo_lat(caso='Pereira x Mercado Bom Preço', sub_caso='1001022-33.2026.5.02.0045 · Trabalhista', modelo=None, extra=''):
    m = (f'<div><dt>Modelo</dt><dd>{modelo[0]}<small>{modelo[1]}</small></dd><dd class="pe-tr"><a class="btn btn-fantasma btn-compacto" href="{U}nova-modelo">Trocar<span class="sr"> o modelo</span></a></dd></div>' if modelo else '')
    return (f'<section class="folha" aria-labelledby="t-sp"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-sp" style="font-size:20px">Sua petição</h2></div></div>'
            f'<dl class="pe-resumo"><div><dt>Caso</dt><dd>{caso}<small>{sub_caso}</small></dd><dd class="pe-tr"><a class="btn btn-fantasma btn-compacto" href="{U}nova-caso">Trocar<span class="sr"> o caso</span></a></dd></div>{m}</dl>{extra}</section>')


def nova_modelo():
    def m(nome, esc, sub, marc=False):
        s = sel('implant', 'Do escritório') if esc else sel('neutro', 'Padrão T3jus')
        return f'<li>{op("nv-mod", f"<strong>{nome}{s}</strong>", sub, marc, "radio")}</li>'
    tr = (m('Recurso ordinário', True, 'v2 · 12 campos · usado 4 vezes', True)
          + m('Petição inicial trabalhista', True, 'v3 · 16 campos · usado 9 vezes')
          + m('Contestação trabalhista', False, '11 campos · usado 2 vezes'))
    qq = (m('Juntada de documentos', False, '8 campos · usado 6 vezes')
          + m('Pedido de prazo', False, '8 campos · usado 5 vezes')
          + m('Manifestação simples', False, '7 campos · usado 2 vezes'))
    rod = (f'<div class="form-pe pe-rodape"><a class="btn btn-fantasma" href="{U}nova-caso">{ico("esq")}Voltar</a>'
           f'<a class="btn btn-pri" href="{U}nova-dados">Continuar{ico("dir")}</a></div>')
    pri = (f'<section class="folha" aria-labelledby="t-nm"><div class="folha-cab"><div><h2 id="t-nm">Qual modelo?</h2>'
           f'<p class="sub">Primeiro os de Trabalhista, a área do caso. Os outros 2 ficam em “Outras áreas”.</p></div>'
           f'<div class="acoes"><a class="btn btn-fantasma" href="{U}modelos">{ico("doc")}Ver os modelos</a></div></div>'
           f'<fieldset class="pe-fs" style="padding:0"><legend class="sr">Modelo</legend>'
           f'<p class="pe-grupo-t" aria-hidden="true">Trabalhista</p><ul class="pe-escolhas" aria-label="Trabalhista">{tr}</ul>'
           f'<p class="pe-grupo-t" aria-hidden="true">Para qualquer área</p><ul class="pe-escolhas" aria-label="Para qualquer área">{qq}</ul></fieldset>'
           f'<div style="padding:4px 24px 0"><button class="btn btn-fantasma" type="button" aria-expanded="false">{ico("baixo")}Outras áreas (2)</button></div>'
           f'<div class="form-folha" style="padding-top:12px">{rod}</div></section>')
    return pagina_nova(2, ('Pereira x Mercado Bom Preço', '', '', ''), pri, resumo_lat() + EXPLICA_DADOS)


def adv_bloco(marcados, felipe_rj=False, erro=False):
    def bloco(nome, papel, insc_html, marc):
        return (f'<div class="pe-a">{op("nd-adv", f"<strong style=font-weight:500>{nome}</strong>", papel, marc, id_="nd-adv-" + nome.split()[0].lower())}{insc_html}</div>')
    mar = '<p class="pe-insc-uma">OAB/SP nº 214.538<small>única inscrição</small></p>'
    fel = (f'<fieldset class="pe-insc"><legend>Inscrições de Felipe nesta petição</legend>'
           + op('nd-insc-felipe', 'OAB/SP nº 287.104', 'principal', True)
           + op('nd-insc-felipe', 'OAB/RJ nº 245.880-S', 'suplementar · desmarcada só nesta petição' if not felipe_rj else 'suplementar', felipe_rj)
           + '</fieldset>')
    lar = '<p class="pe-insc-uma">OAB/SP nº 401.226<small>única inscrição</small></p>'
    b = (bloco('Marina Ribeiro', 'Responsável pelo caso', mar, 'Marina Ribeiro' in marcados)
         + bloco('Felipe Matos', 'Também no escritório', fel, 'Felipe Matos' in marcados)
         + bloco('Larissa Costa', 'Também no caso', lar, 'Larissa Costa' in marcados))
    er = (f'<p class="erro-msg" id="nd-adv-er">{ico("alerta", "ico ico-s")}Marque ao menos um advogado. Sem advogado, a petição não tem quem assine.</p>' if erro else '')
    d = ' aria-describedby="nd-adv-er nd-adv-aj"' if erro else ' aria-describedby="nd-adv-aj"'
    if marcados:
        partes = []
        for n in marcados:
            ins = [OABS[n][0][0]] + ([OABS[n][1][0]] if n == 'Felipe Matos' and felipe_rj else [])
            partes.append(f'{n.upper()}, {" e ".join(ins)}')
        frase = ', e '.join(partes) if len(partes) < 3 else ', '.join(partes[:-1]) + ', e ' + partes[-1]
        sai = f'<p class="pe-sai" aria-live="polite">{ico("pena")}<span><b>No documento:</b> {frase}.</span></p>'
    else:
        sai = f'<p class="pe-sai" aria-live="polite">{ico("pena")}<span><b>No documento:</b> ninguém assina ainda.</span></p>'
    return (f'<fieldset class="pe-fs c6" id="nd-adv"{d}><legend>Advogados que assinam<small>a OAB vem da Equipe</small></legend>{er}<div class="pe-adv">{b}</div>'
            f'<p class="ajuda" id="nd-adv-aj">Cada advogado entra com todas as inscrições, a principal primeiro. Desmarque a que não serve nesta petição. '
            f'Sem OAB cadastrada, não aparecem aqui: {SEM_OAB}. Estagiários não assinam nesta versão.</p>{sai}</fieldset>')


def form_dados(erro=False):
    r = ''
    if erro:
        r += ('<div class="c6">' + aviso('urgencia', 'Falta acertar 2 pontos para ver a prévia.',
                                       'Nada foi gerado. <a href="#nd-end">Endereçamento vazio</a> · <a href="#nd-adv-marina">Nenhum advogado marcado</a>') + '</div>')
    r += '<div class="ju-sec ju-primeira"><h3>Endereçamento</h3><small>Para quem vai a petição</small></div>'
    END = 'Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo – SP'
    r += area_txt('nd-end', 'Endereçamento', '' if erro else END,
                  ajuda='Montado a partir da vara do caso. Mude se a peça vai para outro juízo, como o tribunal.',
                  erro='Escreva para quem vai a petição. Ex.: Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo – SP.' if erro else '',
                  foco=erro, alto=72)
    r += '<div class="ju-sec"><h3>Processo</h3><small>Do caso</small></div>'
    r += (f'<div class="c3"><p class="pe-dado"><span><small>Número do processo</small><b class="num">1001022-33.2026.5.02.0045</b></span></p></div>'
          f'<div class="c3"><p class="pe-dado"><span><small>Vara e tribunal</small><b>45ª Vara do Trabalho · TRT-2</b></span></p></div>')
    r += campo('nd-valor', 'Valor da causa', 'R$ 86.400,00', 'c3', im='decimal',
               ajuda='Vem do caso. Mudar aqui vale só para esta petição; o caso continua com R$ 86.400,00.')
    r += '<div class="ju-sec"><h3>Partes</h3><small>Os clientes do caso que entram na petição</small></div>'
    partes = (f'<div class="pe-partes">'
              + op('nd-parte', '<strong style="font-weight:500">Joana Pereira</strong>', 'Autora · qualificação completa', True)
              + op('nd-parte', '<strong style="font-weight:500">Carlos Henrique Dias</strong>', f'Autor{sel("atencao", "Falta o RG", "pena")}', True)
              + f'<a class="pe-completar" href="#">Completar na ficha de Carlos</a></div>')
    r += f'<fieldset class="pe-fs c6"><legend>Clientes que entram como partes</legend>{partes}</fieldset>'
    r += (f'<div class="c6"><p class="pe-dado"><span><small>Parte contrária</small><b>Mercado Bom Preço Ltda.</b></span><span class="pe-de">do caso</span></p></div>')
    r += area_txt('nd-contra', 'Qualificação da parte contrária', 'pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 12.418.330/0001-74, com sede na Avenida Cruzeiro do Sul, 1.800, Canindé, São Paulo, SP',
                  ajuda='Fica guardada no caso para as próximas petições.', opc=True, alto=72)
    r += '<div class="ju-sec"><h3>Quem assina</h3><small>Só aparece quem tem OAB na Equipe</small></div>'
    r += adv_bloco([] if erro else ['Marina Ribeiro', 'Felipe Matos'], erro=erro)
    r += campo('nd-data', 'Cidade e data', 'São Paulo, 18 de novembro de 2026', 'c3', ajuda='Do endereço do escritório e de hoje.')
    r += (f'<div class="form-pe pe-rodape"><a class="btn btn-fantasma" href="{U}nova-modelo">{ico("esq")}Voltar</a>'
          f'<a class="btn btn-pri" href="{U}nova-previa">Ver a prévia{ico("dir")}</a></div>')
    return (f'<section class="folha" aria-labelledby="t-nd"><div class="folha-cab"><div><h2 id="t-nd">Dados da peça</h2>'
            f'<p class="sub">Só o que o modelo Recurso ordinário usa. O resto vem do cadastro.</p></div></div>'
            f'<form class="form-folha pe-form" action="#" novalidate>{r}</form></section>')


def lat_dados(n_falta=1):
    extra = (f'<ul class="pe-faltas" aria-label="O que falta no cadastro"><li>{ico("pena")}<span><b>Falta 1 dado no cadastro:</b> o RG de Carlos. '
             f'Dá para seguir: sai [RG: falta] para completar no Word.</span></li></ul>'
             f'<p class="ju-nota">{ico("doc")}<span>12 campos neste modelo: 9 vêm do cadastro e 3 deste formulário.</span></p>')
    return resumo_lat(modelo=('Recurso ordinário', 'Do escritório · v2'), extra=extra)


def nova_dados(erro=False):
    return pagina_nova(3, ('Pereira x Mercado Bom Preço', 'Recurso ordinário', '', ''), form_dados(erro), lat_dados())


# Ferreira Prado x INSS (Larissa, só Jurídico): sem número de processo e sem o RG da cliente
def nova_dados_larissa():
    r = '<div class="ju-sec ju-primeira"><h3>Endereçamento</h3><small>Para quem vai a petição</small></div>'
    r += area_txt('nd-end', 'Endereçamento', 'Excelentíssimo(a) Senhor(a) Juiz(íza) Federal do Juizado Especial Federal de São Paulo – SP',
                  ajuda='Montado a partir do tribunal do caso (JEF · PJe). O caso ainda não tem vara: confira.', alto=72, foco=True)
    r += '<div class="ju-sec"><h3>Processo</h3><small>Do caso</small></div>'
    r += campo('nd-num', 'Número do processo', '', 'c3', opc=True, im='numeric', ph='0000000-00.0000.0.00.0000',
               ajuda='O caso ainda não tem número. Escreva aqui ou deixe em branco: sai [NÚMERO DO PROCESSO: falta].')
    r += campo('nd-valor', 'Valor da causa', 'R$ 39.840,00', 'c3', im='decimal',
               ajuda='Vem do caso. É o valor do processo, que todos com Jurídico veem; honorários não entram em petições.')
    r += f'<div class="c6">{op("nd-num-caso", "Gravar o número também no caso", "Só quando escrito acima. Fica no histórico do caso.", False)}</div>'
    r += '<div class="ju-sec"><h3>Partes</h3><small>Os clientes do caso que entram na petição</small></div>'
    partes = (f'<div class="pe-partes">'
              + op('nd-parte', '<strong style="font-weight:500">Antônia Ferreira Prado</strong>', f'Autora{sel("atencao", "Falta o RG", "pena")}', True)
              + f'<a class="pe-completar" href="#">Completar na ficha de Antônia</a></div>')
    r += f'<fieldset class="pe-fs c6"><legend>Clientes que entram como partes</legend>{partes}</fieldset>'
    r += (f'<div class="c6"><p class="pe-dado"><span><small>Parte contrária</small><b>Instituto Nacional do Seguro Social (INSS)</b></span><span class="pe-de">do caso</span></p></div>')
    r += '<div class="ju-sec"><h3>Quem assina</h3><small>Só aparece quem tem OAB na Equipe</small></div>'
    r += adv_bloco(['Larissa Costa'], felipe_rj=True).replace('Responsável pelo caso', 'Sócia dona').replace('Também no caso', 'Responsável pelo caso')
    r += campo('nd-data', 'Cidade e data', 'São Paulo, 18 de novembro de 2026', 'c3', ajuda='Do endereço do escritório e de hoje.')
    r += (f'<div class="form-pe pe-rodape"><a class="btn btn-fantasma" href="{U}nova-modelo">{ico("esq")}Voltar</a>'
          f'<a class="btn btn-pri" href="{U}nova-faltas">Ver a prévia{ico("dir")}</a></div>')
    pri = (f'<section class="folha" aria-labelledby="t-nd"><div class="folha-cab"><div><h2 id="t-nd">Dados da peça</h2>'
           f'<p class="sub">Só o que o modelo Juntada de documentos usa. O resto vem do cadastro.</p></div></div>'
           f'<form class="form-folha pe-form" action="#" novalidate>{r}</form></section>')
    extra = (f'<ul class="pe-faltas" aria-label="O que falta no cadastro"><li>{ico("pena")}<span><b>Faltam 2 dados:</b> o número do processo e o RG de Antônia. '
             f'Dá para seguir: os dois saem marcados para completar no Word.</span></li></ul>'
             f'<p class="ju-nota">{ico("doc")}<span>8 campos neste modelo: 6 vêm do cadastro e 2 deste formulário.</span></p>')
    lat = resumo_lat('Ferreira Prado x INSS', 'Sem número ainda · Previdenciário', ('Juntada de documentos', 'Padrão T3jus'), extra)
    return pagina_nova(3, ('Ferreira Prado x INSS', 'Juntada de documentos', '', ''), pri, lat)


def legenda():
    return ('<p class="pe-leg" aria-hidden="true"><span><i style="background:var(--sal-2);box-shadow:inset 0 -2px 0 var(--vinho-4)"></i>do cadastro (traço)</span>'
            '<span><i style="background:#FCF8F5;border-bottom:2px dotted var(--vinho-2)"></i>deste formulário (pontilhado)</span>'
            '<span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-3)"></i>falta: completar no Word</span></p>'
            '<p class="sr">Na prévia, os dados preenchidos vêm marcados. Os que faltam aparecem entre colchetes, com a palavra falta.</p>')


def papel_ro():
    c = 'mark'
    f = 'mark class="pe-f"'
    return (f'<div class="pe-papel"><div class="pe-timbre"><span>Ribeiro &amp; Matos</span><span>Advocacia</span></div>'
            f'<p class="pe-end"><{f}>Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo – SP</mark></p>'
            f'<p class="pe-proc">Processo nº <{c}>1001022-33.2026.5.02.0045</mark> · Valor da causa: <{f}>R$ 86.400,00</mark></p>'
            f'<p><{c}>JOANA PEREIRA</mark>, <{c}>brasileira, solteira, operadora de caixa, portadora do RG nº 28.441.903-1 SSP/SP, inscrita no CPF sob o nº {CPF_JOANA}, '
            f'residente na Rua Doutor Zuquim, 1.480, apto. 32, Santana, São Paulo, SP, CEP 02035-021</mark>, e <{c}>CARLOS HENRIQUE DIAS</mark>, '
            f'<{c}>brasileiro, casado, repositor, portador do</mark> <mark class="pe-falta">[RG: falta]</mark>, <{c}>inscrito no CPF sob o nº {CPF_CARLOS}, '
            f'residente na Rua Voluntários da Pátria, 3.210, Santana, São Paulo, SP, CEP 02402-100</mark>, nos autos da reclamação trabalhista que movem em face de '
            f'<{c}>MERCADO BOM PREÇO LTDA.</mark>, <{f}>pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 12.418.330/0001-74</mark>, vêm, por seus advogados, '
            f'inconformados com a r. sentença, interpor</p><p class="pe-tit" style="text-align:center">RECURSO ORDINÁRIO</p>'
            f'<p>com as razões anexas, requerendo o seu recebimento e a remessa ao Egrégio <{c}>Tribunal Regional do Trabalho da 2ª Região</mark>.</p>'
            f'<p>Termos em que pede deferimento.</p><p><{f}>São Paulo, 18 de novembro de 2026</mark>.</p>'
            f'<p class="pe-ass"><{c}>MARINA RIBEIRO</mark><br><{c}>OAB/SP nº 214.538</mark><br><br><{c}>FELIPE MATOS</mark><br><{c}>OAB/SP nº 287.104</mark></p>'
            f'<p class="pe-mais">{ico("doc")}<span>Continua com as razões do recurso, do jeito que estão no modelo do escritório (v2). O T3jus não muda esse texto.</span></p></div>')


def papel_juntada():
    c = 'mark'
    f = 'mark class="pe-f"'
    return (f'<div class="pe-papel"><div class="pe-timbre"><span>Ribeiro &amp; Matos</span><span>Advocacia</span></div>'
            f'<p class="pe-end"><{f}>Excelentíssimo(a) Senhor(a) Juiz(íza) Federal do Juizado Especial Federal de São Paulo – SP</mark></p>'
            f'<p class="pe-proc">Processo nº <mark class="pe-falta">[NÚMERO DO PROCESSO: falta]</mark></p>'
            f'<p><{c}>ANTÔNIA FERREIRA PRADO</mark>, <{c}>brasileira, viúva, costureira, portadora do</mark> <mark class="pe-falta">[RG: falta]</mark>, '
            f'<{c}>inscrita no CPF sob o nº {CPF_ANTONIA}, residente na Rua Itapura, 77, Tatuapé, São Paulo, SP, CEP 03310-000</mark>, nos autos da ação que move em face do '
            f'<{c}>INSTITUTO NACIONAL DO SEGURO SOCIAL (INSS)</mark>, vem, por sua advogada, requerer a juntada dos documentos anexos.</p>'
            f'<p>Termos em que pede deferimento.</p><p><{f}>São Paulo, 18 de novembro de 2026</mark>.</p>'
            f'<p class="pe-ass"><{c}>LARISSA COSTA</mark><br><{c}>OAB/SP nº 401.226</mark></p>'
            f'<p class="pe-mais">{ico("doc")}<span>Fim do modelo padrão do T3jus. A lista dos documentos se escreve no Word.</span></p></div>')


def previa_folha(papel, sub):
    return (f'<section class="folha" aria-labelledby="t-pv"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pv">Prévia</h2>'
            f'<p class="sub">{sub}</p></div></div>{legenda()}<div class="pe-papel-folha">{papel}</div></section>')


def nova_previa():
    pri = previa_folha(papel_ro(), 'O começo do documento, com os dados de agora. No Word, a formatação é a do modelo.')
    lat = (f'<section class="folha" aria-labelledby="t-cf"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-cf" style="font-size:20px">Confira antes de gerar</h2>'
           f'<p class="sub">Recurso ordinário · Pereira x Mercado Bom Preço</p></div></div>'
           f'<p class="pe-ok">{ico("check")}<span>11 de 12 campos preenchidos: 8 do cadastro e 3 deste formulário.</span></p>'
           f'<p class="pe-ok">{ico("pessoas")}<span>Você é a sócia dona e a responsável pelo caso: a petição sai aprovada, sem revisão.</span></p>'
           f'<ul class="pe-faltas" aria-label="O que falta"><li>{ico("pena")}<span><b>Falta o RG de Carlos Henrique Dias.</b> Dá para gerar assim: sai [RG: falta] marcado para completar no Word.'
           f'<span class="pe-fa"><a href="#">Completar na ficha de Carlos</a></span></span></li></ul>'
           f'<p class="pe-cuidado">{ico("balanca")}<span><b>Você revisa e protocola.</b> O T3jus preenche o modelo com os dados do cadastro. Não confere o conteúdo jurídico e não protocola no tribunal.</span></p>'
           f'<div class="pe-lat-acoes form-pe pe-rodape"><a class="btn btn-fantasma" href="{U}nova-dados">{ico("esq")}Mudar dados</a>'
           f'<a class="btn btn-pri" href="{U}gerada">{ico("doc")}Gerar o .docx</a></div></section>')
    return pagina_nova(4, ('Pereira x Mercado Bom Preço', 'Recurso ordinário', 'Marina e Felipe assinam', ''), pri, lat, 'Conferir e gerar')


def nova_faltas():
    pri = previa_folha(papel_juntada(), 'O documento inteiro: o modelo de juntada é curto.')
    lat = (f'<section class="folha" aria-labelledby="t-cf"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-cf" style="font-size:20px">Confira antes de gerar</h2>'
           f'<p class="sub">Juntada de documentos · Ferreira Prado x INSS</p></div></div>'
           f'<p class="pe-ok">{ico("check")}<span>6 de 8 campos preenchidos.</span></p>'
           f'<p class="pe-ok">{ico("pessoas")}<span>Você é a responsável pelo caso: a petição sai aprovada, sem revisão.</span></p>'
           f'<ul class="pe-faltas" aria-label="O que falta">'
           f'<li>{ico("balanca")}<span><b>O caso ainda não tem número do processo.</b> Se a ação ainda não foi distribuída, talvez o modelo certo seja a petição inicial.'
           f'<span class="pe-fa"><a href="{U}nova-dados-larissa">Escrever o número</a><a href="{U}nova-modelo">Trocar o modelo</a></span></span></li>'
           f'<li>{ico("pena")}<span><b>Falta o RG de Antônia Ferreira Prado.</b> Sai [RG: falta] para completar no Word.'
           f'<span class="pe-fa"><a href="#">Completar na ficha de Antônia</a></span></span></li></ul>'
           f'<p class="pe-cuidado">{ico("balanca")}<span><b>Você revisa e protocola.</b> O T3jus preenche o modelo com os dados do cadastro. Não confere o conteúdo jurídico e não protocola no tribunal.</span></p>'
           f'<div class="pe-lat-acoes form-pe pe-rodape"><a class="btn btn-fantasma" href="{U}nova-dados-larissa">{ico("esq")}Mudar dados</a>'
           f'<a class="btn btn-pri" href="{U}gerada">{ico("doc")}Gerar com 2 dados marcados</a></div></section>')
    return pagina_nova(4, ('Ferreira Prado x INSS', 'Juntada de documentos', 'Larissa assina', ''), pri, lat, 'Conferir e gerar')


# ---------------------------------------------------------------- 4. resultado
def gerada():
    cab = cab_pet('Petição gerada', voltar=(f'{U}peticoes', 'Petições'), sobre='Petições')
    corpo = (f'<div class="pe-pronto"><p class="pe-sit-grande">{selo_sit("aprovada")}<span>Sem revisão: Marina é a responsável pelo caso</span></p>'
             f'<div class="pe-arq"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span>'
             f'<div><b>recurso-ordinario-pereira-x-mercado-bom-preco.docx</b><small>Word · 38 KB · gerado agora por Marina Ribeiro · modelo Recurso ordinário v2</small></div>'
             f'<button class="btn btn-pri" type="button" data-foco>{ico("baixar")}Baixar o .docx</button></div>'
             + aviso('atencao', 'O RG de Carlos saiu como [RG: falta].', 'Complete no Word, ou complete a ficha de Carlos e gere de novo. O arquivo anterior fica guardado.', icone='pena')
             + f'<p class="pe-cuidado" style="margin:0">{ico("balanca")}<span><b>O T3jus não protocola e não revisa o conteúdo jurídico.</b> Ele só preencheu o modelo do escritório com os dados do cadastro. '
             f'A revisão, a assinatura e o protocolo no PJe-JT são do escritório.</span></p>'
             f'<ol class="pe-proximo" aria-label="Próximos passos"><li><span><b>Revise no Word:</b> os dados marcados, a concordância (“vêm”, “inconformados”) e as razões.</span></li>'
             f'<li><span><b>Assine e protocole</b> no sistema do tribunal, como sempre.</span></li>'
             f'<li><span><b>Se quiser, anexe o protocolado</b> nos documentos do caso.</span></li></ol>'
             f'<div class="pe-acoes-res"><a class="btn btn-sec" href="{U}ficha-peticoes">{ico("balanca")}Abrir a ficha do caso</a>'
             f'<a class="btn btn-fantasma" href="{U}nova-modelo">{ico("mais")}Outra petição deste caso</a></div></div>'
             f'<div class="pe-reserva">{ico("lapis")}<span><b>Assinatura eletrônica: em estudo.</b> Quando existir, o botão para mandar assinar fica aqui. Por enquanto, a assinatura é a de sempre, no protocolo.</span></div>')
    pri = (f'<section class="folha" aria-labelledby="t-gr"><div class="folha-cab"><div><h2 id="t-gr">Recurso ordinário pronto</h2>'
           f'<p class="sub">Pereira x Mercado Bom Preço · ficou em Petições e nos documentos do caso</p></div></div>{corpo}</section>')
    lat = (f'<section class="folha pe-mini" aria-labelledby="t-pv2"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pv2" style="font-size:20px">Como saiu</h2>'
           f'<p class="sub">O começo do arquivo</p></div></div>{legenda()}<div class="pe-papel-folha">{papel_ro()}</div></section>')
    t = toast('Petição gerada.', 'Ficou em Petições e nos documentos do caso Pereira x Mercado Bom Preço.')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{pri}</div><aside class="ju-col" aria-label="Como saiu">{lat}</aside></div></div>{t}'


# ---------------------------------------------------------------- 5. ficha do caso com Petições
def ficha_peticoes():
    f = ficha()
    pet = (f'<section class="folha" aria-labelledby="t-pc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pc" style="font-size:20px">Petições do caso</h2>'
           f'<p class="sub">Geradas pelos modelos do escritório</p></div></div><ul class="pe-do-caso">'
           f'<li><span><b>Juntada de documentos</b><small>Hoje, 13h02 · Beatriz Nogueira · v1</small>{selo_sit("revisao")}</span>'
           f'<a class="btn btn-pri btn-compacto" href="#">Revisar<span class="sr"> a juntada de documentos</span></a></li>'
           f'<li><span><b>Recurso ordinário</b><small>Hoje, 15h42 · Marina Ribeiro · sem revisão</small>{selo_sit("aprovada")}</span>'
           f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> o recurso ordinário</span></button></li>'
           f'<li><span><b>Petição inicial trabalhista</b><small>02/03/2026 · Larissa Costa · aprovada por Marina</small>{selo_sit("aprovada")}</span>'
           f'<button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> a petição inicial</span></button></li></ul>'
           f'<div class="pe-lat-acoes"><a class="btn btn-sec" href="{U}nova-modelo">{ico("pena")}Gerar petição</a>'
           f'<p>Começando por aqui, o caso já vem escolhido. Só a aprovada entra em Documentos.</p></div></section>')
    alvo = '<section class="folha" aria-labelledby="t-ctr"'
    assert alvo in f
    f = f.replace(alvo, pet + alvo, 1)
    novo = (f'<li class="pe-novo-doc"><span class="doc-ico" aria-hidden="true">{ico("doc")}</span><div><span class="doc-nome">recurso-ordinario-pereira-x-mercado-bom-preco.docx</span>'
            f'<p class="doc-meta"><span class="selo selo-neutro">Petição aprovada</span><span>Word · 38 KB · Marina Ribeiro · hoje, 15h42 · aprovada</span></p></div>'
            f'<div class="doc-acoes"><button class="btn btn-sec btn-compacto" type="button">{ico("baixar", "ico ico-s")}Baixar<span class="sr"> o recurso ordinário</span></button></div></li>')
    f = f.replace('<ul class="lista docs">', '<ul class="lista docs">' + novo, 1).replace('Ligados ao caso · 4', 'Ligados ao caso · 5')
    bt = f'<button class="btn btn-sec" type="button">{ico("mais")}Pedir documento</button>'
    assert bt in f
    f = f.replace(bt, f'<a class="btn btn-sec" href="{U}nova-modelo">{ico("pena")}Gerar petição</a>' + bt, 1)
    return f


# ---------------------------------------------------------------- 6. sem a área
def sem_area():
    e = estado('Esta área não está liberada para você',
               'O Jurídico, com casos, prazos, tarefas e petições, só aparece para quem a sócia dona liberou. Se você precisa dele, fale com Marina Ribeiro.',
               'cadeado', acoes=f'<a class="btn btn-pri" href="#">{ico("inicio")}Ir para o Início</a>', codigo='AREA_NAO_LIBERADA', h='h1', moldura=False)
    return f'<section class="folha" aria-label="Acesso" style="overflow:hidden">{e}</section>'


# ---------------------------------------------------------------- 7. revisão pelo advogado responsável
# Pedido da Carol: quando quem gera não é o advogado responsável pelo caso (por exemplo, a estagiária),
# a petição vai para o responsável analisar, aprovar, pedir ajuste ou reprovar, com comentários.
INI['Beatriz Nogueira'] = 'BN'
REV = 'Felipe Matos'   # responsável do caso Souza x Construtora Atlas

SIT = {'rascunho': ('neutro', 'Rascunho', 'doc'), 'revisao': ('andamento', 'Em revisão', 'relogio'),
       'ajuste': ('atencao', 'Ajuste pedido', 'lapis'), 'aprovada': ('ok', 'Aprovada', 'check'),
       'reprovada': ('neutro', 'Reprovada', 'x')}


def selo_sit(k):
    t, txt, i = SIT[k]
    return sel(t, txt, i)


# (modelo, arquivo, caso, quem gerou, quando, situação, detalhe, revisor, destino)
PETS2 = [
    ('Recurso ordinário', 'recurso-ordinario-pereira-x-mercado-bom-preco.docx', 'Pereira x Mercado Bom Preço', 'Marina Ribeiro', 'hoje, 15h42', 'aprovada', 'Sem revisão: gerada pela responsável · 1 dado marcado', None, 'gerada'),
    ('Contestação cível', 'contestacao-souza-x-construtora-atlas.docx', 'Souza x Construtora Atlas', 'Beatriz Nogueira', 'hoje, 14h10', 'revisao', 'v1 · com {r}', 'Felipe Matos', 'revisar'),
    ('Juntada de documentos', 'juntada-pereira-x-mercado-bom-preco.docx', 'Pereira x Mercado Bom Preço', 'Beatriz Nogueira', 'hoje, 13h02', 'revisao', 'v1 · com {r}', 'Marina Ribeiro', 'revisar'),
    ('Juntada de documentos', 'juntada-ferreira-prado-x-inss.docx', 'Ferreira Prado x INSS', 'Larissa Costa', 'hoje, 11h05', 'aprovada', 'Sem revisão: gerada pela responsável · 2 dados marcados', None, 'gerada'),
    ('Juntada de documentos', 'juntada-teixeira-x-lojas-brilho.docx', 'Teixeira x Lojas Brilho', 'Beatriz Nogueira', 'ontem, 18h40', 'rascunho', 'Ainda não foi para a revisão', None, 'revisao-enviar'),
    ('Pedido de prazo', 'pedido-de-prazo-oliveira-x-banco-horizonte.docx', 'Oliveira x Banco Horizonte', 'Beatriz Nogueira', 'ontem, 17h30', 'ajuste', 'v1 · pedido por Felipe Matos', None, 'ajuste-pedido'),
    ('Manifestação simples', 'manifestacao-andrade-x-unimed.docx', 'Andrade x Unimed Paulistana', 'Beatriz Nogueira', 'ontem, 10h15', 'reprovada', 'Por Larissa Costa · fica guardada', None, 'reprovada'),
    ('Petição inicial cível', 'inicial-lima-x-seguradora-norte.docx', 'Lima x Seguradora Norte', 'Gustavo Lima', '28/10, 09h30', 'aprovada', 'Por Marina Ribeiro (Gustavo, o responsável, não tem OAB)', None, 'aprovada'),
    ('Petição inicial trabalhista', 'inicial-ferreira-x-banco-horizonte.docx', 'Ferreira x Banco Horizonte', 'Marina Ribeiro', '12/03, 14h02', 'aprovada', 'Sem revisão: gerada pela responsável', None, 'gerada'),
]


def pagina_lista(viewer='Marina Ribeiro', visao='todas', aside=None):
    acoes = (f'<a class="btn btn-sec" href="{U}modelos">{ico("doc")}Modelos de petição</a>'
             f'<a class="btn btn-pri" href="{U}nova-caso">{ico("mais")}Nova petição</a>')
    cab = cab_pet('Petições', 'As petições feitas a partir dos modelos do escritório, já com os dados do cliente, do caso e dos advogados.', acoes)
    minhas = sum(1 for p in PETS2 if p[3] == viewer)
    rev = sum(1 for p in PETS2 if p[7] == viewer and p[5] == 'revisao')
    pr = lambda v: 'true' if visao == v else 'false'
    ferr = (f'<form class="ju-ferr" role="search" action="#" onsubmit="return false">'
            f'<div class="campo-busca"><label class="sr" for="pe-busca">Buscar por caso, cliente ou modelo</label>{ico("busca")}'
            f'<input class="entrada" id="pe-busca" type="search" placeholder="Caso, cliente ou modelo" autocomplete="off" spellcheck="false"></div>'
            + selecao('pe-f-sit', 'Situação', ['Todas', 'Rascunho', 'Em revisão', 'Ajuste pedido', 'Aprovada', 'Reprovada'], 'Todas', '', vazio='')
            + f'<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="{pr("todas")}">Todas ({len(PETS2)})</button>'
            f'<button type="button" aria-pressed="{pr("minhas")}">Minhas ({minhas})</button>'
            f'<button type="button" aria-pressed="{pr("revisar")}">Para eu revisar ({rev})</button></div></form>')
    itens = PETS2 if visao == 'todas' else [p for p in PETS2 if p[7] == viewer and p[5] == 'revisao']
    linhas, cartoes = '', ''
    for mod, arq, caso, quem, quando, sit, det, revisor, dest in itens:
        meu = revisor == viewer and sit == 'revisao'
        det = det.replace('{r}', 'você' if meu else (revisor or ''))
        href = U + dest
        if sit == 'aprovada':
            bx = f'<button class="btn btn-sec btn-compacto pe-bx" type="button" title="Baixar o .docx">{ico("baixar", "ico ico-s")}<span class="sr">Baixar {mod}, {caso}</span></button>'
        elif meu:
            bx = f'<a class="btn btn-pri btn-compacto" href="{href}">Revisar<span class="sr"> {mod}, {caso}</span></a>'
        else:
            bx = f'<a class="btn btn-sec btn-compacto pe-bx" href="{href}" title="Abrir">{ico("olho", "ico ico-s")}<span class="sr">Abrir {mod}, {caso}</span></a>'
        cl = ' class="pe-nova"' if meu else ''
        linhas += (f'<tr{cl}><td><div class="pe-doc"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><a class="pe-nome" href="{href}">{mod}</a><small>{arq}</small></div></div></td>'
                   f'<td><a class="pe-caso" href="{U}ficha-peticoes">{caso}</a></td><td><div class="pe-quem">{resp(quem)}<span class="pe-quando">{quando}</span></div></td>'
                   f'<td><div class="pe-dx"><div class="pe-sit">{selo_sit(sit)}<small>{det}</small></div>{bx}</div></td></tr>')
        cartoes += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{href}">{mod}</a><small class="num">{caso}</small></div>{ico("dir", "ico c-ir")}</div>'
                    f'<dl class="c-dados"><dt>Gerada por</dt><dd>{quem}</dd><dt>Quando</dt><dd>{quando}</dd><dt>Situação</dt><dd>{det}</dd></dl>'
                    f'<div class="c-selos">{selo_sit(sit)}</div></li>')
    cols = '<col style="width:33%"><col style="width:19%"><col style="width:17%"><col style="width:31%">'
    tab = (f'<table class="so-pc pe-tab"><caption class="sr">Petições</caption><colgroup>{cols}</colgroup>'
           f'<thead><tr><th scope="col">Petição e arquivo</th><th scope="col">Caso</th><th scope="col">Gerada por</th><th scope="col">Situação</th></tr></thead>'
           f'<tbody>{linhas}</tbody></table><ul class="cartoes so-cel" aria-label="Petições">{cartoes}</ul>')
    pe = (f'<p class="ju-pe">{ico("cadeado")}<span>Só a aprovada sai pronta. Quem gera sem ser o responsável pelo caso manda para a revisão dele; '
          f'a petição gerada pelo próprio responsável, ou pela sócia dona, já sai aprovada. Nada é apagado: reprovadas e versões antigas ficam guardadas.</span></p>')
    sub = (f'{len(PETS2)} petições · 2 em revisão · da mais nova para a mais antiga' if visao == 'todas'
           else f'{len(itens)} esperando a sua revisão')
    lista = (f'<section class="folha" aria-labelledby="t-pl" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-pl">Petições</h2>'
             f'<p class="sub">{sub}</p></div></div>{ferr}{tab}{pe}</section>')
    lat = aside if aside is not None else EXPLICA_LISTA
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{lista}</div><aside class="ju-col" aria-label="Sobre as petições">{lat}</aside></div></div>'


AVISO_CHEGA = (f'<section class="folha" aria-labelledby="t-ac"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-ac" style="font-size:20px">Como o pedido chega a Felipe</h2>'
               f'<p class="sub">No sino e no Início, em “Pedem você agora”</p></div></div><ul class="pe-avisos">'
               f'<li><span class="pe-av-ico" aria-hidden="true">{ico("sino")}</span><span><b>Sino de avisos</b>Beatriz Nogueira mandou a contestação de Souza x Construtora Atlas para você revisar.<small>há 20 min</small></span></li>'
               f'<li><span class="pe-av-ico" aria-hidden="true">{ico("inicio")}</span><span><b>Início · Pedem você agora</b>Revisar a contestação · Souza x Construtora Atlas.<small>O prazo do caso vence hoje</small></span></li></ul>'
               f'<p class="ju-nota">{ico("ajuda")}<span>O pedido sai do Início quando Felipe decide. Se ele passar a revisão para outra pessoa, o aviso vai junto.</span></p></section>')


# ------------------------------------------------ fluxo da estagiária (Beatriz) no caso de Felipe
PASSOS_REV = [('Caso', 'nova-caso'), ('Modelo', 'nova-modelo'), ('Dados da peça', 'nova-dados'), ('Prévia e enviar', 'revisao-enviar')]


def papel_contestacao(v=1, comentar=False, coments=None, marcas=True, aberto=None):
    """Prévia da contestação, parágrafo por parágrafo. comentar=True põe o botão de comentar ao lado de cada parágrafo."""
    coments = coments or {}
    c = 'mark' if marcas else 'span'
    f = 'mark class="pe-f"' if marcas else 'span'
    sede = ('Rua Tagipuru, 235, Barra Funda, São Paulo, SP, CEP 01156-000' if v == 1
            else 'Avenida Paulista, 2.100, 9º andar, Bela Vista, São Paulo, SP, CEP 01310-300')
    par = [
        ('o endereçamento', f'<p class="pe-end"><{f}>Excelentíssimo(a) Senhor(a) Juiz(íza) de Direito da 4ª Vara Cível do Foro Central da Comarca de São Paulo – SP</{f.split()[0]}></p>'),
        ('o número do processo', f'<p class="pe-proc">Processo nº <{c}>0812345-67.2026.8.26.0100</{c}></p>'),
        ('a qualificação das partes', f'<p><{c}>CONSTRUTORA ATLAS LTDA.</{c}>, <{c}>pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 23.509.114/0001-08, com sede na {sede}</{c}>, '
                                      f'nos autos da ação indenizatória que lhe move <{c}>MARCOS ANTÔNIO SOUZA</{c}>, vem, por seu advogado, apresentar</p>'),
        (None, '<p class="pe-tit" style="text-align:center">CONTESTAÇÃO</p>'),
        ('o pedido de abertura', '<p>pelos fatos e fundamentos a seguir' + (', começando pela preliminar de ilegitimidade passiva.' if v == 2 else '.') + '</p>'),
        ('a data e a assinatura', f'<p><{f}>São Paulo, 18 de novembro de 2026</{f.split()[0]}>.</p><p class="pe-ass"><{c}>FELIPE MATOS</{c}><br><{c}>OAB/SP nº 287.104 e OAB/RJ nº 245.880-S</{c}></p>'),
    ]
    out = ''
    n = 0
    for nome, h in par:
        if nome is None:
            out += h
            continue
        n += 1
        bt = (f'<button class="btn btn-fantasma btn-compacto pe-cbt" type="button" title="Comentar este parágrafo">{ico("conversas", "ico ico-s")}'
              f'<span class="sr">Comentar o parágrafo {n}: {nome}</span></button>') if comentar else ''
        cm = ''
        for autor, txt, res in coments.get(n, []):
            r = f'<span class="selo selo-ok">{ico("check")}Resolvido na v2</span>' if res else ''
            cm += (f'<div class="pe-com{" pe-com-ok" if res else ""}" role="note" aria-label="Comentário de {autor} no parágrafo {n}">{ico("conversas")}<div><b>{autor}</b>{r}<p>{txt}</p></div></div>')
        if aberto == n:
            cm += (f'<div class="pe-com-edit"><label for="rv-c{n}">Comentário sobre {nome}</label>'
                   f'<textarea class="entrada" id="rv-c{n}" name="rv-c{n}" data-foco style="min-height:72px">O endereço da sede mudou em setembro. Corrija na ficha da Construtora Atlas e refaça.</textarea>'
                   f'<div class="pe-com-pe"><button class="btn btn-fantasma btn-compacto" type="button">Cancelar</button><button class="btn btn-sec btn-compacto" type="button">{ico("check", "ico ico-s")}Guardar comentário</button></div></div>')
        out += f'<div class="pe-par{" pe-com-tem" if cm else ""}"><div class="pe-par-t">{h}</div>{bt}</div>{cm}'
    rod = ('Continua com os fatos, a preliminar de ilegitimidade passiva e o mérito, do jeito que estão no .docx enviado por Beatriz.' if v == 2
           else 'Continua com os fatos e o mérito, do jeito que estão no modelo Contestação cível (padrão do T3jus).')
    return (f'<div class="pe-papel{" pe-papel-com" if comentar else ""}"><div class="pe-timbre"><span>Ribeiro &amp; Matos</span><span>Rascunho · em revisão</span></div>'
            f'{out}<p class="pe-mais">{ico("doc")}<span>{rod}</span></p></div>')


def revisao_enviar():
    pri = previa_folha(papel_contestacao(), 'O começo do documento. Enquanto não for aprovado, o arquivo sai com “Rascunho · em revisão” no cabeçalho.')
    lat = (f'<section class="folha" aria-labelledby="t-cf"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-cf" style="font-size:20px">Confira e envie</h2>'
           f'<p class="sub">Contestação cível · Souza x Construtora Atlas</p></div></div>'
           f'<p class="pe-ok">{ico("check")}<span>Todos os 11 campos preenchidos.</span></p>'
           f'<div class="pe-cuidado">{ico("pessoas")}<span><b>Vai para a revisão de Felipe Matos,</b> o responsável pelo caso. Só fica pronta depois que ele aprovar. '
           f'Felipe é avisado no sino e no Início.</span></div>'
           f'<div class="pe-lat-campo">' + area_txt('re-recado', 'Recado para Felipe', 'Usei o modelo padrão. O prazo vence hoje: se puder, revise até as 16h.', opc=True, alto=72,
                                                  ajuda='Aparece no topo da revisão.') + '</div>'
           f'<div class="pe-lat-acoes form-pe pe-rodape"><a class="btn btn-fantasma" href="{U}nova-dados">{ico("esq")}Mudar dados</a>'
           f'<button class="btn btn-sec" type="button">{ico("doc")}Guardar como rascunho</button>'
           f'<a class="btn btn-pri" href="{U}revisao-enviada">{ico("enviar")}Enviar para revisão de Felipe Matos</a></div></section>')
    return pagina_nova(4, ('Souza x Construtora Atlas', 'Contestação cível', 'Felipe assina', ''), pri, lat, 'Conferir e enviar', passos_lista=PASSOS_REV)


def historico_versoes(itens):
    li = ''
    for v, quando, quem, txt, sit, atual in itens:
        li += (f'<li{" class=pe-v-atual" if atual else ""}><span class="pe-vn" aria-hidden="true">v{v}</span><span><b>Versão {v}</b> · {quando} · {quem}'
               f'<small>{txt}</small>{selo_sit(sit)}</span></li>')
    return (f'<section class="folha" aria-labelledby="t-hv"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-hv" style="font-size:20px">Versões</h2>'
            f'<p class="sub">Todas ficam guardadas, com os comentários</p></div></div><ol class="pe-versoes">{li}</ol></section>')


def revisao_enviada():
    cab = cab_pet('Contestação cível', voltar=(f'{U}peticoes', 'Petições'), sobre='Petições · Souza x Construtora Atlas')
    corpo = (f'<div class="pe-pronto"><p class="pe-sit-grande">{selo_sit("revisao")}<span>Com <b>Felipe Matos</b> desde hoje, 14h10</span></p>'
             f'<div class="pe-arq"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span>'
             f'<div><b>contestacao-souza-x-construtora-atlas.docx</b><small>Word · 41 KB · versão 1 · sai com “Rascunho · em revisão” no cabeçalho</small></div>'
             f'<button class="btn btn-sec" type="button" data-foco>{ico("baixar")}Baixar o rascunho</button></div>'
             f'<ol class="pe-proximo" aria-label="O que acontece agora"><li><span><b>Felipe revisa:</b> aprova, pede ajuste ou reprova, com comentários.</span></li>'
             f'<li><span><b>Você é avisada</b> no sino e no Início quando ele decidir.</span></li>'
             f'<li><span><b>Aprovada, fica pronta</b> para baixar e protocolar. O T3jus não protocola.</span></li></ol>'
             f'<p class="pe-cuidado" style="margin:0">{ico("relogio")}<span><b>O prazo do caso vence hoje.</b> Felipe vê isso no topo da revisão.</span></p></div>')
    pri = (f'<section class="folha" aria-labelledby="t-re"><div class="folha-cab"><div><h2 id="t-re">Enviada para revisão</h2>'
           f'<p class="sub">Ainda não está pronta: falta a aprovação do responsável pelo caso</p></div></div>{corpo}</section>')
    lat = historico_versoes([(1, 'hoje, 14h10', 'Beatriz Nogueira', 'Enviada para Felipe Matos com recado.', 'revisao', True)])
    t = toast('Enviada para revisão de Felipe Matos.', 'Ele foi avisado no sino e no Início.')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{pri}</div><aside class="ju-col" aria-label="Versões">{lat}</aside></div></div>{t}'


# ------------------------------------------------ revisão (Felipe)
def resumo_rev(v=1):
    recado = ('Usei o modelo padrão. O prazo vence hoje: se puder, revise até as 16h.' if v == 1
              else 'Incluí a preliminar na página 2 e corrigi o endereço da sede na ficha da Construtora Atlas.')
    dados = [('Partes', 'Construtora Atlas Ltda. (cliente, ré) · Marcos Antônio Souza (autor)'),
             ('Endereçamento', '4ª Vara Cível do Foro Central de São Paulo'),
             ('Quem assina', 'Felipe Matos · OAB/SP nº 287.104 e OAB/RJ nº 245.880-S'),
             ('Modelo', 'Contestação cível · padrão do T3jus' + (' · v2 editada no Word' if v == 2 else ''))]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{x}</dd></div>' for k, x in dados)
    return (f'<section class="folha" aria-labelledby="t-rr"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-rr" style="font-size:20px">Enviada por Beatriz Nogueira</h2>'
            f'<p class="sub">Estagiária · {"hoje, 14h10" if v == 1 else "hoje, 15h05"} · versão {v}</p></div></div>'
            f'<blockquote class="pe-recado">{recado}</blockquote>'
            f'<p class="pe-prazo">{sel("urgente", "Prazo do caso vence hoje", "alerta")}<span>Contestação · fazer até hoje</span></p>'
            f'<dl class="pe-resumo pe-dados-rev">{dl}</dl></section>')


def decisao(escolha=None, comentario='', erro=False, v=1):
    ops = [('aprovar', 'Aprovar', 'Fica pronta para baixar e protocolar.'),
           ('ajuste', 'Pedir ajuste', 'Volta para Beatriz com seus comentários. Ela manda a versão ' + str(v + 1) + '.'),
           ('reprovar', 'Reprovar', 'Fica guardada como reprovada e não sai como pronta.')]
    r = ''.join(op('rv-dec', f'<strong style="font-weight:500">{t}</strong>', s, escolha == k, 'radio') for k, t, s in ops)
    er = (f'<p class="erro-msg" id="rv-com-er">{ico("alerta", "ico ico-s")}Para pedir ajuste, escreva o que precisa mudar, aqui ou num parágrafo da prévia.</p>' if erro else '')
    ajuda = 'Opcional ao aprovar. Para pedir ajuste ou reprovar, é obrigatório: aqui ou num parágrafo da prévia.'
    a = ' aria-invalid="true" aria-describedby="rv-com-aj rv-com-er" data-foco' if erro else ' aria-describedby="rv-com-aj"'
    resumo = (aviso('urgencia', 'A decisão não foi enviada.', '<a href="#rv-com">Falta o comentário</a> que diz o que ajustar.') if erro else '')
    btxt = {'aprovar': f'{ico("check")}Aprovar a versão {v}', 'ajuste': f'{ico("lapis")}Pedir ajuste a Beatriz',
            'reprovar': f'{ico("x")}Reprovar', None: f'{ico("enviar")}Enviar decisão'}[escolha]
    if escolha == 'aprovar' and comentario:
        nota = '<p class="ajuda">Beatriz recebe o aviso com o seu comentário.</p>'
    else:
        nota = ''
    return (f'<section class="folha pe-decisao" aria-labelledby="t-dc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-dc" style="font-size:20px">Sua decisão</h2>'
            f'<p class="sub">Versão {v}</p></div></div><form class="pe-dec-form" action="#" novalidate>{resumo}'
            f'<fieldset class="pe-fs pe-dec-ops"><legend class="sr">Decisão</legend>{r}</fieldset>'
            f'<div class="campo"><label for="rv-com">Comentário geral</label><textarea class="entrada" id="rv-com" name="rv-com" style="min-height:96px"{a}>{comentario}</textarea>'
            f'<p class="ajuda" id="rv-com-aj">{ajuda}</p>{er}</div>{nota}'
            f'<div class="form-pe pe-rodape"><button class="btn btn-pri" type="submit">{btxt}</button></div>'
            f'<p class="pe-passar"><a href="{U}passar-revisao">{ico("pessoas", "ico ico-s")}Passar a revisão para outro advogado</a></p></form></section>')


def pagina_revisar(v=1, coments=None, aberto=None, escolha=None, comentario='', erro=False, janela_passar=False):
    cab = cab_pet('Revisar petição', voltar=(f'{U}aviso-revisao', 'Petições'), sobre='Petições · Souza x Construtora Atlas')
    leg = (legenda() if v == 1 else '<p class="pe-leg">Prévia do .docx que Beatriz editou no Word. Os dados não aparecem marcados, porque o texto agora é o do arquivo.</p>')
    nota = ('<p class="pe-leg">Para comentar um trecho, use o botão ao lado do parágrafo. O comentário fica preso a ele.</p>')
    pri = (f'<section class="folha" aria-labelledby="t-pv"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pv">Contestação cível · versão {v}</h2>'
           f'<p class="sub">Souza x Construtora Atlas · 0812345-67.2026.8.26.0100</p></div>'
           f'<div class="acoes"><button class="btn btn-sec" type="button">{ico("baixar")}Baixar a v{v}</button></div></div>'
           f'{leg}{nota}<div class="pe-papel-folha">{papel_contestacao(v, True, coments, marcas=(v == 1), aberto=aberto)}</div></section>')
    hv = [(1, 'hoje, 14h10', 'Beatriz Nogueira', 'Enviada para Felipe Matos.', 'revisao', v == 1)]
    if v == 2:
        hv = [(1, 'hoje, 14h10', 'Beatriz Nogueira', 'Felipe pediu ajuste às 14h40: 1 comentário geral e 1 no parágrafo da qualificação.', 'ajuste', False),
              (2, 'hoje, 15h05', 'Beatriz Nogueira', '.docx editado no Word, com recado.', 'revisao', True)]
    lat = resumo_rev(v) + historico_versoes(hv) + decisao(escolha, comentario, erro, v)
    jp = j_passar(abrir=janela_passar)
    return f'<div class="ju">{cab}<div class="ju-grade pe-grade-rev"><div class="ju-col">{pri}</div><aside class="ju-col" aria-label="Revisão">{lat}</aside></div></div>{jp}'


def j_passar(abrir=False):
    corpo = ('<div class="form-folha" style="padding:0">'
             + selecao('ps-para', 'Passar para', ['Marina Ribeiro · OAB/SP nº 214.538', 'Larissa Costa · OAB/SP nº 401.226'], 'Marina Ribeiro · OAB/SP nº 214.538', 'c6',
                       ajuda='Só aparecem advogados com OAB e com a área Jurídico.')
             + area_txt('ps-mot', 'Por quê', 'Estou em audiência até as 17h e o prazo vence hoje.', opc=True, alto=72, ajuda='Vai no aviso e fica no histórico da petição.')
             + f'<p class="pt-comuns c6">{ico("historico")}<span>Felipe continua responsável pelo caso. Só a revisão desta petição muda de mãos; Beatriz é avisada.</span></p></div>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("pessoas")}Passar para Marina</button>')
    return janela('janela-passar', 'Contestação cível · Souza x Construtora Atlas', 'Passar a revisão',
                  'Para quando você não consegue revisar a tempo.', corpo, pe, abrir=abrir)


COM_GERAL = 'Inclua a preliminar de ilegitimidade passiva antes do mérito, como combinamos na segunda. O resto está bom.'
COM_P3 = 'O endereço da sede mudou em setembro. Corrija na ficha da Construtora Atlas e refaça.'


# ------------------------------------------------ Beatriz vê o ajuste pedido e manda a v2
def ajuste_pedido():
    cab = cab_pet('Contestação cível', voltar=(f'{U}peticoes', 'Petições'), sobre='Petições · Souza x Construtora Atlas')
    pedidos = (f'<div class="pe-pronto"><p class="pe-sit-grande">{selo_sit("ajuste")}<span>Por <b>Felipe Matos</b>, hoje, 14h40</span></p>'
               f'<div class="pe-com pe-com-geral" role="note" aria-label="Comentário geral de Felipe Matos">{ico("conversas")}<div><b>Comentário geral</b><p>{COM_GERAL}</p></div></div>'
               f'<div class="pe-com" role="note" aria-label="Comentário de Felipe Matos no parágrafo 3">{ico("conversas")}<div><b>No parágrafo 3 · a qualificação das partes</b>'
               f'<p class="pe-trecho">“… com sede na Rua Tagipuru, 235, Barra Funda …”</p><p>{COM_P3}</p></div></div>'
               f'<p class="pe-cuidado" style="margin:0">{ico("relogio")}<span><b>O prazo do caso vence hoje.</b></span></p></div>')
    pri = (f'<section class="folha" aria-labelledby="t-ap"><div class="folha-cab"><div><h2 id="t-ap">O que Felipe pediu</h2>'
           f'<p class="sub">2 comentários na versão 1</p></div></div>{pedidos}</section>'
           f'<section class="folha" aria-labelledby="t-pv"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pv" style="font-size:20px">Versão 1, com os comentários</h2></div></div>'
           f'<div class="pe-papel-folha">{papel_contestacao(1, False, {3: [("Felipe Matos", COM_P3, False)]})}</div></section>')
    ops = (op('aj-como', '<strong style="font-weight:500">Refazer pelos dados</strong>', 'Volta ao formulário com tudo preenchido. Serve para dado do cadastro, como o endereço.', False, 'radio')
           + op('aj-como', '<strong style="font-weight:500">Enviar o .docx editado no Word</strong>', 'Baixe a v1, edite e envie. Serve para mudança no texto, como a preliminar.', True, 'radio'))
    acao = (f'<section class="folha" aria-labelledby="t-cr"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-cr" style="font-size:20px">Corrigir e reenviar</h2>'
            f'<p class="sub">Vai como versão 2, para Felipe de novo</p></div></div>'
            f'<form class="pe-dec-form" action="#" novalidate><fieldset class="pe-fs pe-dec-ops"><legend class="sr">Como corrigir</legend>{ops}</fieldset>'
            f'<div class="form-pe pe-rodape"><button class="btn btn-sec" type="button">{ico("baixar")}Baixar a v1</button>'
            f'<a class="btn btn-pri" href="{U}reenviar-v2">Continuar{ico("dir")}</a></div></form></section>')
    hv = historico_versoes([(1, 'hoje, 14h10', 'Beatriz Nogueira', 'Felipe pediu ajuste às 14h40.', 'ajuste', True)])
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{pri}</div><aside class="ju-col" aria-label="Corrigir">{acao}{hv}</aside></div></div>'


def reenviar_v2():
    cab = cab_pet('Enviar a versão 2', voltar=(f'{U}ajuste-pedido', 'Contestação cível'), sobre='Petições · Souza x Construtora Atlas')
    arq = (f'<div class="campo c6"><p class="pe-rot" id="v2-arq-r">Arquivo editado</p><div class="pe-arq" role="group" aria-labelledby="v2-arq-r">'
           f'<span class="pe-ci" aria-hidden="true">{ico("doc")}</span><div><b>contestacao-souza-x-construtora-atlas-v2.docx</b><small>Word · 47 KB · conferido agora: nenhum dado marcado como falta</small></div>'
           f'<button class="btn btn-sec btn-compacto" type="button">{ico("enviar", "ico ico-s")}Trocar arquivo</button></div>'
           f'<p class="ajuda">Só .docx, até 5 MB. Se ainda houver algo como [RG: falta] no texto, avisamos antes de enviar.</p></div>')
    res = (f'<fieldset class="pe-fs c6"><legend>Os comentários de Felipe</legend>'
           + op('v2-res', '<strong style="font-weight:500">Comentário geral: incluir a preliminar</strong>', 'Marcar como resolvido', True)
           + op('v2-res', '<strong style="font-weight:500">Parágrafo 3: endereço da sede</strong>', 'Marcar como resolvido · corrigido também na ficha da Construtora Atlas', True)
           + '</fieldset>')
    rec = area_txt('v2-rec', 'Recado para Felipe', 'Incluí a preliminar na página 2 e corrigi o endereço da sede na ficha da Construtora Atlas.', opc=True, alto=72)
    rod = (f'<div class="form-pe pe-rodape"><a class="btn btn-fantasma" href="{U}ajuste-pedido">{ico("esq")}Voltar</a>'
           f'<a class="btn btn-pri" href="{U}revisar-v2">{ico("enviar")}Enviar a v2 para Felipe Matos</a></div>')
    pri = (f'<section class="folha" aria-labelledby="t-v2"><div class="folha-cab"><div><h2 id="t-v2">Versão 2</h2>'
           f'<p class="sub">A v1 e os comentários ficam guardados no histórico.</p></div></div>'
           f'<form class="form-folha" action="#" novalidate>{arq}{res}{rec}{rod}</form></section>')
    hv = historico_versoes([(1, 'hoje, 14h10', 'Beatriz Nogueira', 'Felipe pediu ajuste às 14h40.', 'ajuste', False),
                            (2, 'agora', 'Beatriz Nogueira', 'Ainda não enviada.', 'rascunho', True)])
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{pri}</div><aside class="ju-col" aria-label="Versões">{hv}</aside></div></div>'


# ------------------------------------------------ resultado: aprovada e reprovada
def pagina_aprovada():
    cab = cab_pet('Contestação cível', voltar=(f'{U}peticoes', 'Petições'), sobre='Petições · Souza x Construtora Atlas')
    corpo = (f'<div class="pe-pronto"><p class="pe-sit-grande">{selo_sit("aprovada")}<span>Por <b>Felipe Matos</b>, hoje, 15h20 · versão 2</span></p>'
             f'<div class="pe-com pe-com-geral" role="note" aria-label="Comentário de Felipe Matos ao aprovar">{ico("conversas")}<div><b>Felipe Matos</b><p>Ótimo. Pode protocolar hoje.</p></div></div>'
             f'<div class="pe-arq"><span class="pe-ci" aria-hidden="true">{ico("doc")}</span>'
             f'<div><b>contestacao-souza-x-construtora-atlas.docx</b><small>Word · 47 KB · versão 2 aprovada · sem a marca de rascunho</small></div>'
             f'<button class="btn btn-pri" type="button" data-foco>{ico("baixar")}Baixar o .docx</button></div>'
             f'<p class="pe-cuidado" style="margin:0">{ico("balanca")}<span><b>O T3jus não protocola e não revisa o conteúdo jurídico.</b> A revisão foi de Felipe; '
             f'a assinatura e o protocolo no e-SAJ são do escritório.</span></p>'
             f'<div class="pe-acoes-res"><a class="btn btn-sec" href="{U}ficha-peticoes">{ico("balanca")}Abrir a ficha do caso</a></div></div>'
             f'<div class="pe-reserva">{ico("lapis")}<span><b>Assinatura eletrônica: em estudo.</b> Quando existir, o botão para mandar assinar fica aqui.</span></div>')
    pri = (f'<section class="folha" aria-labelledby="t-ok"><div class="folha-cab"><div><h2 id="t-ok">Pronta para protocolar</h2>'
           f'<p class="sub">Ficou nos documentos do caso como petição aprovada</p></div></div>{corpo}</section>')
    hv = historico_versoes([(1, 'hoje, 14h10', 'Beatriz Nogueira', 'Felipe pediu ajuste: 2 comentários, os dois resolvidos.', 'ajuste', False),
                            (2, 'hoje, 15h05', 'Beatriz Nogueira', 'Felipe aprovou às 15h20.', 'aprovada', True)])
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{pri}</div><aside class="ju-col" aria-label="Versões">{hv}</aside></div></div>'


def pagina_reprovada():
    cab = cab_pet('Manifestação simples', voltar=(f'{U}peticoes', 'Petições'), sobre='Petições · Andrade x Unimed Paulistana')
    corpo = (f'<div class="pe-pronto"><p class="pe-sit-grande">{selo_sit("reprovada")}<span>Por <b>Larissa Costa</b>, ontem, 11h02 · versão 1</span></p>'
             f'<div class="pe-com pe-com-geral" role="note" aria-label="Motivo de Larissa Costa">{ico("conversas")}<div><b>Motivo</b>'
             f'<p>O laudo ainda não saiu; esta manifestação não cabe agora. Vamos tratar na audiência de 02/12.</p></div></div>'
             f'<p class="pe-cuidado" style="margin:0">{ico("cadeado")}<span><b>Fica guardada, mas não sai como pronta.</b> Não entra nos documentos do caso. '
             f'Dá para baixar só como rascunho, para consulta.</span></p>'
             f'<div class="pe-acoes-res"><button class="btn btn-sec" type="button">{ico("baixar")}Baixar o rascunho</button>'
             f'<a class="btn btn-fantasma" href="{U}nova-modelo">{ico("mais")}Gerar outra petição deste caso</a></div></div>')
    pri = (f'<section class="folha" aria-labelledby="t-rp"><div class="folha-cab"><div><h2 id="t-rp">Reprovada</h2>'
           f'<p class="sub">Gerada por Beatriz Nogueira ontem, 10h15</p></div></div>{corpo}</section>')
    hv = historico_versoes([(1, 'ontem, 10h15', 'Beatriz Nogueira', 'Larissa reprovou às 11h02, com motivo.', 'reprovada', True)])
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{pri}</div><aside class="ju-col" aria-label="Versões">{hv}</aside></div></div>'


CSS_REV = r"""
/* ===== Revisão pelo advogado responsável (pe-) ===== */
.pe-nome{display:flex;align-items:center;min-height:44px;margin:-6px 0 -4px;font-weight:500;color:var(--vinho);text-decoration:none;line-height:1.3}
.pe-nome:hover{text-decoration:underline}
.pe-sit{display:grid;gap:4px;justify-items:start;min-width:0}
.pe-sit small{font-size:12px;color:var(--texto-2);line-height:1.35}
.pe-dx>.btn{flex:none}
.pe-avisos{list-style:none;margin:0;padding:0 24px 8px;display:grid;gap:10px}
.pe-avisos li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:10px;padding:12px;border:1px solid var(--borda-folha);border-radius:var(--raio);font-size:13px;line-height:1.45}
.pe-avisos b{display:block;font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--vinho-2);margin-bottom:2px}
.pe-avisos small{display:block;font-size:12px;color:var(--texto-2);margin-top:2px}
.pe-av-ico{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.pe-av-ico .ico{width:18px;height:18px}
.pe-lat-campo{padding:0 24px 12px}
.pe-versoes{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:0}
.pe-versoes li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:10px;padding:12px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.pe-versoes li:first-child{border-top:0}
.pe-versoes li.pe-v-atual{background:#FCF8F5;margin:0 -10px;padding-left:10px;padding-right:10px;border-radius:var(--raio)}
.pe-versoes b{font-weight:600;color:var(--vinho)}
.pe-versoes small{display:block;font-size:12px;color:var(--texto-2);margin:2px 0 6px}
.pe-vn{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho);font-family:var(--serifa);font-weight:600;font-size:15px}
.pe-v-atual .pe-vn{background:var(--vinho);color:var(--papel)}
.pe-sit-grande{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font-size:14px}
.pe-sit-grande b{font-weight:600}
.pe-recado{margin:0 24px 12px;padding:10px 14px;border-left:3px solid var(--ambar);background:var(--sal-2);border-radius:0 var(--raio) var(--raio) 0;font-family:var(--serifa);font-size:15px;font-style:italic;color:var(--vinho);line-height:1.5}
.pe-prazo{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:0 24px 10px;font-size:12px;color:var(--texto-2)}
.pe-dados-rev>div{grid-template-columns:1fr}
.pe-dec-form{padding:0 24px 20px;display:grid;gap:14px}
.pe-dec-ops{gap:6px}
.pe-dec-ops .opcao{margin:0;border:1px solid var(--borda-folha);padding:10px 12px;align-items:flex-start}
.pe-dec-ops .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.pe-dec-form .form-pe .btn{flex:1 1 auto}
.pe-passar{font-size:13px}
.pe-passar a{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--vinho);font-weight:500}
/* Prévia com comentários presos ao parágrafo */
.pe-par{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start;margin-top:12px;border-radius:4px}
.pe-par:first-of-type{margin-top:0}
.pe-par-t p+p{margin-top:12px}
.pe-par.pe-com-tem .pe-par-t{box-shadow:-10px 0 0 -7px var(--ambar)}
.pe-cbt{width:36px;min-width:36px;padding:0;justify-content:center;color:var(--vinho-2)}
.pe-papel-com{padding-right:20px}
.pe-com{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;margin:8px 0 4px;padding:10px 12px;border-radius:var(--raio);background:var(--ambar-3);font-family:var(--sans);font-size:13px;line-height:1.5;color:var(--tinta)}
.pe-com>.ico{width:18px;height:18px;color:var(--vinho);margin-top:2px}
.pe-com b{font-weight:600;margin-right:8px}
.pe-com .selo{vertical-align:middle}
.pe-com p{margin:2px 0 0}
.pe-com .pe-trecho{font-family:var(--serifa);font-style:italic;color:var(--vinho)}
.pe-com-ok{background:var(--sal-2)}
.pe-com-geral{background:var(--sal-2)}
.pe-papel>.pe-tit{margin-top:14px}
.pe-com-edit{display:grid;gap:8px;margin:8px 0 4px;padding:12px;border:1px solid var(--vinho-2);border-radius:var(--raio);background:var(--papel);font-family:var(--sans);font-size:13px}
.pe-com-edit label{font-weight:500}
.pe-com-pe{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
@media (max-width:760px){
  .pe-avisos,.pe-versoes,.pe-dec-form,.pe-lat-campo{padding-left:16px;padding-right:16px}
  .pe-recado{margin:0 16px 12px}
  .pe-prazo{padding:0 16px 10px}
  .pe-cbt{width:44px;min-width:44px;min-height:44px}
  .pe-papel-com{padding-right:10px}
  .pe-com-pe .btn{flex:1 1 auto;min-height:44px}
  .pe-versoes li.pe-v-atual{margin:0 -8px;padding-left:8px;padding-right:8px}
}
"""


# ---------------------------------------------------------------- estados
T = ''
PT = A('Petições', 'Jurídico|Petições', 'Petições')
MO = A('Petições', 'Jurídico|Petições|Modelos de petição', 'Modelos de petição')
NV = A('Petições', 'Jurídico|Petições|Nova petição', 'Nova petição')
F = A('Casos e processos', 'Jurídico|Casos e processos|Pereira x Mercado Bom Preço', 'Pereira x Mercado Bom Preço')

T += tpl('peticoes', pagina_lista(), **PT)
T += tpl('aviso-revisao', pagina_lista('Felipe Matos', 'revisar', AVISO_CHEGA), quem='felipe', **PT)
T += tpl('peticoes-vazio', pagina_vazia(), **PT)
T += tpl('modelos', pagina_modelos() + j_modelo(), **MO)
T += tpl('modelo-enviar', pagina_modelos() + j_modelo(abrir=True), **MO)
T += tpl('modelo-erro', pagina_modelos() + j_modelo(erro=True), **MO)
T += tpl('nova-caso', nova_caso(), **NV)
T += tpl('nova-modelo', nova_modelo(), **NV)
T += tpl('nova-dados', nova_dados(), **NV)
T += tpl('nova-erro', nova_dados(erro=True), **NV)
T += tpl('nova-previa', nova_previa(), **NV)
T += tpl('nova-dados-larissa', nova_dados_larissa(), quem='juridico', **NV)
T += tpl('nova-faltas', nova_faltas(), quem='juridico', **NV)
T += tpl('gerada', gerada(), **A('Petições', 'Jurídico|Petições|Petição gerada', 'Petição gerada'))
T += tpl('ficha-peticoes', ficha_peticoes() + j_etapa() + j_prazo(), **F)
RV = A('Petições', 'Jurídico|Petições|Revisar petição', 'Revisar petição')
PE = A('Petições', 'Jurídico|Petições|Contestação cível', 'Contestação cível')
T += tpl('revisao-enviar', revisao_enviar(), quem='estagiaria', **NV)
T += tpl('revisao-enviada', revisao_enviada(), quem='estagiaria', **PE)
T += tpl('revisar', pagina_revisar(aberto=3), quem='felipe', **RV)
T += tpl('revisar-ajuste', pagina_revisar(coments={3: [('Felipe Matos', COM_P3, False)]}, escolha='ajuste', comentario=COM_GERAL), quem='felipe', **RV)
T += tpl('revisar-erro', pagina_revisar(escolha='ajuste', erro=True), quem='felipe', **RV)
T += tpl('passar-revisao', pagina_revisar(janela_passar=True), quem='felipe', **RV)
T += tpl('ajuste-pedido', ajuste_pedido(), quem='estagiaria', **PE)
T += tpl('reenviar-v2', reenviar_v2(), quem='estagiaria', **A('Petições', 'Jurídico|Petições|Contestação cível|Versão 2', 'Versão 2'))
T += tpl('revisar-v2', pagina_revisar(v=2, coments={3: [('Felipe Matos', COM_P3, True)]}, escolha='aprovar', comentario='Ótimo. Pode protocolar hoje.'), quem='felipe', **RV)
T += tpl('aprovada', pagina_aprovada(), quem='estagiaria', **PE)
T += tpl('reprovada', pagina_reprovada(), quem='estagiaria', **A('Petições', 'Jurídico|Petições|Manifestação simples', 'Manifestação simples'))
T += tpl('sem-juridico', sem_area(), quem='sem-area', atual='nenhum', trilha='Jurídico', titulo='Jurídico')

out = pagina('Petições', 'Jurídico › Petições: modelos do escritório preenchidos com os dados do cliente, do caso e dos advogados, gerando um .docx para revisar.',
             '{"estado":"peticoes","atual":"juridico"}', '', T, BARRAS)
out = out.replace('</style>', CSS_JU + CSS_PE + CSS_REV + '\n</style>', 1)
# Elenco: duas pessoas a mais no script de demonstração (o comum.py fica sem mudança)
_q = "'sem-area':{nome:'Paula Nunes'"
assert _q in out
out = out.replace(_q, "felipe:{nome:'Felipe Matos',ini:'F',papel:'Áreas: Comercial, Contratos, Financeiro e Jurídico',areas:['comercial','contratos','financeiro','juridico'],dono:false},\n    "
                  "estagiaria:{nome:'Beatriz Nogueira',ini:'B',papel:'Estagiária · Jurídico',areas:['juridico'],dono:false},\n    " + _q, 1)
open(os.path.join(SAIDA, 'peticoes.html'), 'w', encoding='utf-8').write(out)
print('peticoes ok', T.count('<template data-est='), 'estados')
