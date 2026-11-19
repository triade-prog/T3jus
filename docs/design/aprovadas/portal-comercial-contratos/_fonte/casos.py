# Lista dos estados (capturas) e o index.html único de Comercial e Contratos.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
C = 'comercial.html?estado='
K = 'contratos.html?estado='

SECOES = [
    ('1. Comercial · Atendimentos', 'A visão do escritório inteiro: quem precisa de retorno. O registro de cada conversa continua na ficha do cliente (Clientes, aprovada); aqui só se vê e se vai até lá. AP-02, AP-06, PD-02.', [
        ('atendimentos', C + 'atendimentos', 'Quem precisa de retorno', 'Quatro números no alto (vencidos, hoje, 7 dias, sem próximo contato), filtro por responsável e a lista por grupo, do mais atrasado ao mais distante. Cada linha leva à ficha do cliente. Ao lado, as propostas esperando resposta e o retrato por responsável.'),
        ('atendimentos-vazio', C + 'atendimentos-vazio', 'Primeiro uso', 'Diz de onde os retornos nascem (o atendimento registrado na ficha) e leva a Clientes.'),
    ]),
    ('2. Comercial · Propostas', 'Propostas com situação e responsável (AP-05). A proposta aceita vira contrato sem redigitar (IN-01). As condições usam as mesmas peças do contrato.', [
        ('propostas', C + 'propostas', 'Lista de propostas', 'Cliente, número e serviço; os tipos de honorário em selos; responsável; retorno (vencido e hoje em destaque); situação: rascunho, enviada, em negociação, aceita, virou contrato, recusada.'),
        ('propostas-vazio', C + 'propostas-vazio', 'Primeira proposta', 'Explica que a proposta escrita uma vez vira o contrato.'),
        ('proposta', C + 'proposta', 'Ficha da proposta', 'Cabeçalho vinho com o retorno no âmbar e “Registrar resposta”. Condições de honorário, o que está incluído, histórico da proposta e, ao lado, o cliente, a validade e o arquivo .docx.'),
        ('resposta', C + 'resposta', 'Registrar resposta: aceitou', 'Aceitou, pediu mudança ou recusou. Aceitar encerra o retorno e leva a gerar o contrato com as condições preenchidas.'),
        ('resposta-erro', C + 'resposta-erro', 'Recusou sem motivo (erro)', 'Resumo no topo e erro preso ao campo. O motivo alimenta o Funil.'),
        ('proposta-aceita', C + 'proposta-aceita', 'Proposta aceita, falta o contrato', 'O âmbar diz o próximo passo: “Gerar o contrato”, que abre o formulário de Contratos já preenchido.'),
        ('proposta-sem-contratos', C + 'proposta-sem-contratos', 'Diego, só com Comercial', 'Vê a proposta, mas não cria o contrato: o botão vira “Pedir o contrato” e avisa quem tem Contratos.'),
        ('proposta-nova', C + 'proposta-nova', 'Nova proposta', 'Cliente do cadastro único, serviço, responsável, o que está incluído, as condições (as mesmas caixas de marcar do contrato), validade e retorno, que vira o próximo contato do cliente.'),
    ]),
    ('3. Comercial · Funil e Origem', 'Funil simples (AP-03) com a conversão em contrato (IN-01) e a origem dos contatos (AP-04). Regras da OAB sobre publicidade à vista, sem recurso de marketing (VA-07).', [
        ('funil', C + 'funil', 'Funil', 'Funil em faixas que estreitam (24 → 14 → 9), com a taxa de passagem entre as faixas e, ao lado, quem ficou de fora e por quê. Embaixo, quem está em cada etapa agora; a etapa sai do que foi registrado e ninguém arrasta cartão.'),
        ('origem', C + 'origem', 'Origem dos contatos', 'Por origem: contatos, propostas, contratos, quanto vira contrato e o valor certo contratado. Selo “poucos dados” abaixo de 5 contatos. Quem mais indicou.'),
    ]),
    ('4. Contratos · Contratos', 'Contrato ligado ao cliente e aos casos (CH-01, CH-05), com responsáveis (CH-03), vários tipos de honorário no mesmo contrato (CH-02, CH-06) e a programação dos recebimentos que o Financeiro vê (CH-04). Uma etapa do caso gera a cobrança (CH-07).', [
        ('contratos', K + 'contratos', 'Lista de contratos', 'Cliente, número e objeto; os tipos de honorário em selos; responsável; próximo recebimento; situação. Filtro “Base do mês a pedir”.'),
        ('contratos-vazio', K + 'contratos-vazio', 'Primeiro contrato', 'De uma proposta aceita ou direto.'),
        ('novo', K + 'novo', 'Novo contrato, vindo da proposta', 'O coração da área. Quatro passos numa página: cliente e casos, responsáveis, condições de honorário e cláusulas. Os tipos são caixas de marcar (aqui, Parcelado, Êxito e Percentual recorrente); cada tipo marcado abre um bloco com os seus campos e a linha “Gera:”. Ao lado, o resumo do que o contrato gera, com a programação mês a mês.'),
        ('novo-tipos', K + 'novo-tipos', 'Novo contrato, marcar os tipos', 'Sem proposta: “Marque todos os tipos deste contrato”. Fixo e Parcelado marcados abrem os dois blocos, e o resumo soma os dois (R$ 7.500,00).'),
        ('novo-erros', K + 'novo-erros', 'Novo contrato com erros', 'Resumo no topo com links para cada ponto; o bloco da condição com erro ganha filete e selo com quantos pontos; o resumo lateral mostra o que falta.'),
        ('criado', K + 'criado', 'Contrato criado (em elaboração)', 'Aviso de sucesso. O âmbar diz o próximo passo: gerar os documentos e registrar a assinatura, que leva a programação ao Financeiro.'),
        ('contrato', K + 'contrato', 'Ficha do contrato', 'Mensal, por ato e sucumbência no mesmo contrato; casos ligados com a etapa; responsáveis com OAB; assinatura (eletrônica reservada); encerrar sem apagar.'),
        ('contrato-recebimentos', K + 'contrato-recebimentos', 'Programação dos recebimentos', 'A audiência marcada como realizada no caso virou cobrança e avisou o Financeiro (CH-07). Recebido, programado e o que depende do caso; a mesma lista que o Financeiro vê.'),
        ('contrato-sem-financeiro', K + 'contrato-sem-financeiro', 'Felipe, sem Financeiro', 'Vê a programação, mas não se cada recebimento foi pago: isso fica no Financeiro.'),
    ]),
    ('5. Contratos · Honorários', 'O que depende de alguém para virar cobrança: a base do mês do percentual recorrente (com lembrete), a etapa do caso e o ato feito (CH-06, CH-07).', [
        ('honorarios', K + 'honorarios', 'Honorários a acompanhar', 'A cobrança de Hélio parada sem a base de novembro, as condições esperando etapa e onde o caso está, o que virou cobrança no mês e os tipos em uso.'),
        ('base', K + 'base', 'Informar a base do mês', 'Valor do benefício, de onde veio, novo vencimento e comprovante opcional. A linha “Gera:” mostra 30% de R$ 2.910,00 = R$ 873,00.'),
    ]),
    ('6. Contratos · Procurações e modelos', 'Contrato, procuração e declaração de hipossuficiência gerados com os dados do cliente e dos advogados (OAB), no timbrado, em .docx (CH-08, a validar). Assinatura eletrônica só com lugar reservado (CH-09, a validar).', [
        ('procuracoes', K + 'procuracoes', 'Documentos e modelos', 'Documentos gerados com a situação da assinatura, os três modelos do escritório e os advogados com OAB.'),
        ('gerar', K + 'gerar', 'Gerar documentos', 'Escolhe os documentos, os outorgados e os poderes especiais. Falta o RG: avisa e deixa gerar com o espaço marcado. Ao lado, a prévia da procuração com os dados do cadastro marcados.'),
        ('gerado', K + 'gerado', 'Documentos gerados', 'Os três arquivos para baixar, o lembrete do RG que faltou e o próximo passo: anexar o assinado e registrar a assinatura.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for n, (titulo, sub, itens) in enumerate(SECOES, 1):
    corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg in itens:
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portal · Comercial e Contratos · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:90ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
header a{{color:#fff}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: Comercial e Contratos</h1>
<p>As duas áreas que só aparecem para quem a sócia dona liberou. Comercial: retornos do escritório, propostas, funil e origem dos contatos. Contratos: contratos com vários tipos de honorário, a programação dos recebimentos, a base do mês e a etapa que vira cobrança, procurações e modelos. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Atendimentos</a><a href="#s2">Propostas</a><a href="#s3">Funil e Origem</a><a href="#s4">Contratos</a><a href="#s5">Honorários</a><a href="#s6">Procurações e modelos</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
