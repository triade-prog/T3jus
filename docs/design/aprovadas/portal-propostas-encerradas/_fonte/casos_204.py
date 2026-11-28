# Lista dos estados (capturas) e o index.html com as capturas e a legenda.
# Mesmo formato do casos_181.py aprovado. Uso: python3 casos_204.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
CM, FU, IN = 'comercial.html?estado=', 'funil.html?estado=', 'inicio.html?estado='

SECOES = [
    ('1. A lista de Propostas (P2)', 'Um filtro novo, “Encerradas a pedido”, depois de “Recusadas”, que só aparece quando há alguma. A proposta sai de “Em andamento” sem sumir. Na coluna Situação, o selo neutro “Encerrada a pedido” e, embaixo, o que tinha acontecido até ali.', [
        ('pl-encerradas', CM, 'Encerradas a pedido (2), cliente arquivado', 'Marina Alves Coelho foi arquivada a pedido em 20/11. As duas propostas dela saem de “Em andamento” e aparecem aqui: P-2026-019 “Enviada em 14/11” e P-2026-014 “Aceita em 12/11”. Retorno “—”. No pé: a proposta não segue e fica como registro.'),
        ('pl-encerradas-excluido', CM, 'O mesmo, cliente excluído', 'As linhas dizem “Cliente excluído” e “Serviço apagado a pedido do titular”, como a lista já mostra hoje. O resto é igual.'),
    ]),
    ('2. A ficha da proposta encerrada', 'O quadro âmbar diz “Não segue” e por quê. Sem “Registrar resposta”, sem “Editar” e sem “Marcar como enviada”. A ficha da proposta aceita (“Não vira contrato”, aprovada na F3.181) não muda.', [
        ('pr-encerrada-enviada-excluido', CM, 'Enviada, cliente excluído', 'Selo “Enviada” no alto, como o fato. Quadro: “Enviada em 14/11 · Não segue · O cliente foi excluído a pedido do titular em 20/11/2026. A proposta fica só como registro, sem resposta: não dá mais para registrar a resposta nem editar.” O escopo e o Word apagados são os textos já aprovados na F3.181.'),
        ('pr-encerrada-enviada-arquivado', CM, 'Enviada, cliente arquivado', 'O mesmo, com o nome e o escopo (o arquivado guarda os dados) e o botão do Word, que continua.'),
        ('pr-encerrada-rascunho', CM, 'Rascunho, cliente arquivado', '“Rascunho · Não segue · … A proposta não foi enviada e fica só como registro.” Sem “Marcar como enviada”: hoje, o rascunho do arquivado ainda se envia.'),
    ]),
    ('3. O histórico da proposta (para você escolher)', 'A antiga pergunta C3 virou um estado: a linha no topo do histórico é calculada, sem gravar nada e sem protocolo. Sem a linha, o histórico fica como no estado “Enviada, cliente excluído” acima.', [
        ('pr-historico-encerrada', CM, 'Com a linha “Encerrada a pedido do titular”', 'No topo, em 20/11/2026: “Encerrada a pedido do titular”, com o selo, e “O cliente foi excluído a pedido do titular. A proposta não segue.” Sem hora, porque não é uma mudança gravada.'),
    ]),
    ('4. Quando alguém tenta mexer na proposta que já não segue', 'Para quem estava com a página aberta antes da exclusão ou do arquivamento, ou abre a edição por um link antigo. No molde do pedir recusado da F3.181.', [
        ('pr-acao-recusada', CM, 'Registrar a resposta, recusado', 'A janela da resposta fecha, a página recarrega e mostra o aviso: “Não deu para registrar a resposta. O cliente foi excluído a pedido do titular agora há pouco. A proposta abaixo já mostra como ficou: ela não segue.”'),
        ('pr-acao-recusada-enviada', CM, 'Marcar como enviada, recusado', 'O mesmo aviso no rascunho do arquivado: “Não deu para marcar como enviada.”'),
        ('ed-encerrada', CM, 'Editar pelo link', 'No lugar do formulário: “A proposta não segue. O cliente foi excluído a pedido do titular em 20/11/2026. Ela fica só como registro e não se edita mais.” e “Voltar para a proposta”. Sai o “escreva uma proposta nova”.'),
        ('ed-encerrada-salvar', CM, 'Salvar a edição, recusado', 'Quem estava editando e salva depois do arquivamento: “Não deu para salvar a proposta. O cliente foi arquivado a pedido do titular agora há pouco. A proposta não segue: ela fica só como registro, sem as mudanças.”'),
    ]),
    ('5. O Funil (P3)', 'As colunas de “Agora no funil” deixam de mostrar a proposta encerrada. No período, o cliente arquivado a pedido que recebeu proposta e não fechou ganha uma linha própria na barra. O excluído já sai dos números do período desde o começo do Funil.', [
        ('fu-hoje', FU, 'Hoje (antes)', 'As duas propostas do cliente excluído ficam nas colunas para sempre: “Cliente excluído · P-2026-019” em Proposta enviada e “Cliente excluído · P-2026-014 · falta o contrato” em Aceita. Na barra, um cliente arquivado conta como “proposta em andamento” (4).'),
        ('fu-barra-encerrada', FU, 'Depois', 'As colunas sem os cartões do excluído (1 e 1). Na legenda, “3 proposta em andamento (abaixo)” e a linha nova “1 encerrada a pedido do titular”, com um segmento listrado no tom vinho. A frase para o leitor de tela ganha “1 encerrada a pedido do titular”.'),
    ]),
    ('6. Atendimentos e Início: só sai das listas', 'Nada novo para desenhar: o texto é o de hoje, sem a proposta encerrada. Os pares mostram o antes e o depois. O resto destas telas é o desenho aprovado, com a data dele (18/11).', [
        ('at-hoje', FU, 'Atendimentos, hoje (antes)', '“Propostas esperando resposta” mostra “P-2026-019 · Cliente excluído · Enviada em 14/11 · sem retorno marcado”, para sempre.'),
        ('at-depois', FU, 'Atendimentos, depois', 'A proposta encerrada sai. Ficam as três de hoje.'),
        ('in-hoje', IN, 'Início, da equipe, hoje (antes)', 'No bloco Comercial: “4 propostas esperando resposta; a mais antiga: P-2026-013, de Construtora Vale Alto.” e “4 propostas” no cartão de cima. O rodapé segue o texto que o produto mostra hoje.'),
        ('in-depois', IN, 'Início, da equipe, depois', '“3 propostas esperando resposta…”. Se a encerrada fosse a mais antiga, o rodapé passaria a mostrar a seguinte.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1] + it[0]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_204.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
nav = ''
for n, (titulo, sub, itens) in enumerate(SECOES, 1):
    nav += f'<a href="#s{n}">{h(titulo.split(". ", 1)[1].split(" (")[0])}</a>'
    corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, base, t, leg in itens:
        url = base + nome
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Propostas encerradas a pedido · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para a Carol aprovar</p><h1>Propostas encerradas a pedido do titular</h1>
<p>F3.204: a proposta de um cliente excluído ou arquivado a pedido do titular sai das listas de trabalho (Propostas em andamento, Funil, Atendimentos e Início) e fica como registro, com o que aconteceu até ali e o selo “Encerrada a pedido”. Ninguém consegue mais responder, editar ou marcar como enviada. Cada estado tem computador (1440) e celular (412). O contorno tracejado em âmbar só marca o que é novo; no produto não há contorno. Clique numa imagem para abrir o HTML naquele estado. O texto exato, as decisões e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para">{nav}</nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
