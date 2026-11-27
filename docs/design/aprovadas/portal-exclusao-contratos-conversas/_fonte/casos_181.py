# Lista dos estados (capturas) e o index.html com as capturas e a legenda.
# Mesmo formato do casos_177.py aprovado. Uso: python3 casos_181.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
E, CM, CT, LB = 'exclusao.html?estado=', 'comercial.html?estado=', 'contratos.html?estado=', 'lembretes.html?estado='

SECOES = [
    ('1. As conversas do WhatsApp (F3.190)', 'Linha nova em “O que é apagado”, logo depois dos contatos, só quando alguma conversa sai. A conversa que fica porque guarda o registro de outro cliente ganha uma dica (C6). O que fica da conversa vai na própria linha (C5, recomendada).', [
        ('exc-conversas-uma', E, 'Uma conversa sai', 'Linha “A conversa do WhatsApp”, sem fila e sem dica.'),
        ('exc-conversas-varias', E, 'Duas conversas, uma mensagem na fila', '“As 2 conversas do WhatsApp”, com “A mensagem que ainda ia sair não sai mais.” no fim.'),
        ('exc-conversas-e-fica', E, 'Duas saem e uma fica com Rosa', 'A dica, dentro da linha: “1 conversa fica como está, com as mensagens, porque guarda o registro de Rosa Alves Coelho, outra cliente. As mensagens de Marina nessa conversa também ficam.”'),
        ('exc-so-fica', E, 'Nenhuma sai, uma fica', 'Sem a linha das conversas. A mesma dica vai dentro da linha dos contatos.'),
        ('exc-conversas-alternativa-fica', E, 'Alternativa C5 (B): o que fica, à direita', 'Não recomendada. A linha das conversas perde a frase do que fica, e “O que fica, sem dado pessoal” ganha “As datas, quem atendeu e os momentos, nas 2 conversas”. A janela fica mais longa.'),
    ]),
    ('2. Contratos: o pedido de contrato e o lembrete (F3.181 e F3.186)', 'O pedido de contrato não é apagado: a proposta fica no Comercial. Por isso a linha vai para “O que fica, sem dado pessoal” (revisão b14). O lembrete em aberto vira um aviso no topo, porque é dinheiro que o escritório talvez queira cobrar (C10, recomendada).', [
        ('exc-pedido-contrato', E, 'Proposta aceita com contrato pedido', '“A proposta P-2026-014, sem o pedido de contrato”: fica no Comercial como registro, e o pedido sai de Contratos.'),
        ('exc-lembrete', E, 'R$ 1.840,00 em aberto no Astrea (C10 a)', 'Aviso de atenção no topo: “Há R$ 1.840,00 em aberto no Astrea.” Diz que o valor perde o dono e que, para cobrar, é preciso criar o contrato antes (aí o pedido se atende arquivando). O quadro “O que a lei obriga a guardar” já traz os 3 lançamentos (F3.177).'),
        ('exc-lembrete-alternativa-linha', E, 'Alternativa C10 (c): só uma linha', 'Não recomendada. Só a linha do plano em “O que é apagado”, sem avisar que o valor deixa de ter dono.'),
    ]),
    ('3. O outro cadastro com o mesmo CPF (F3.188, C7 na B\')', 'Aviso de atenção no topo, com a caixa já marcada “Abrir também um pedido de exclusão no cadastro de …” e o link para a ficha. Nada é apagado no outro cadastro sem a dona conferir.', [
        ('exc-mesmo-cpf', E, 'Um outro cadastro, caixa marcada', 'Marina A. Coelho, ativo, cliente desde 03/02/2025, sem contrato. A caixa vem marcada; a dona desmarca só se tiver certeza de que é outra pessoa.'),
        ('exc-mesmo-cpf-desmarcado', E, 'Caixa desmarcada', 'Aparece a frase “Sem o pedido, o cadastro de Marina A. Coelho fica como está. Se for outra pessoa, o CPF de um dos dois está errado: corrija na ficha certa.”'),
        ('exc-mesmo-cpf-pedido', E, 'Com o pedido registrado por Diego', 'Os avisos do topo convivem: primeiro o “Pedido registrado por Diego Martins em 20/11.” (como hoje), depois o do mesmo CPF (revisão b13).'),
        ('exc-mesmo-cpf-varios', E, 'Dois outros cadastros', 'Um inativo que já tem pedido aberto (sem caixa) e um ativo com processo (com caixa; o pedido dele vira arquivamento).'),
        ('arq-mesmo-cpf', E, 'Na janela de arquivar (C8)', 'O mesmo aviso, com “Este arquivamento não mexe nele.” A nota “Desenho do futuro” do desenho antigo sai, porque o produto não a tem.'),
        ('exc-feito-mesmo-cpf', E, 'Depois de excluir (M3)', 'A mensagem de feito não manda dizer “atendido”: “Antes de responder à cliente, confira o cadastro de Marina A. Coelho, que ficou com um pedido de exclusão aberto. O pedido só está atendido por inteiro quando ele também for resolvido.” Com o botão para a ficha dele.'),
        ('ficha-pedido-mesmo-cpf', E, 'A ficha do outro cadastro, para a dona (M4)', 'A faixa do pedido ganha uma variante: “Pedido de exclusão aberto em 20/11, ao atender outro cadastro com o mesmo CPF.” Pede para conferir se é a mesma pessoa. Sem protocolo e sem nome do cadastro excluído (A1).'),
        ('ficha-pedido-mesmo-cpf-equipe', E, 'A ficha do outro cadastro, para a equipe', 'Título neutro, sem observação: “Pedido de exclusão aberto em 20/11, aguardando a sócia dona.” e “Paula Reis, a sócia dona, vai conferir este cadastro e decidir.”'),
    ]),
    ('4. O que mais entra na janela', 'A dica de quem assina por outro cliente (C9) e as duas linhas que a outra frente deixou para este desenho (M2): o “sobre” das condições (F3.179) e a explicação da baixa (F3.193). As duas dependem do que a Carol decidir na outra frente.', [
        ('exc-assina-por-outro', E, 'Marina assina por João Coelho (C9)', 'Dica dentro da linha da qualificação: o nome e o CPF dela continuam na ficha de João, porque servem ao contrato e à procuração dele.'),
        ('exc-sobre-condicao', E, 'O “sobre” do êxito (F3.179)', '“Sobre o que se cobra o êxito, na proposta P-2026-014”: o texto livre vira “Base apagada a pedido do titular”.'),
        ('exc-baixa-explicacao', E, 'A explicação da baixa (F3.193)', '“A explicação da baixa sem receber” vira “Explicação apagada a pedido do titular”. Caso raro: hoje, quem tem contrato não pode ser excluído.'),
        ('exc-tudo', E, 'Tudo junto (o pior caso de altura)', 'Os dois avisos do topo, arquivos, despesa, “sobre”, baixa, contatos, conversas com a dica, quem assina, a proposta em “O que fica” e o quadro da lei.'),
        ('arq-pedido-contrato', E, 'Arquivar com pedido de contrato (C2 = A)', 'Em “O que acontece”: “O pedido de contrato da proposta P-2026-014 sai de Contratos”, porque cliente arquivado não ganha contrato novo.'),
    ]),
    ('5. A proposta e o contrato novo', 'Telas de hoje, com só o que o plano pede. O pedido do excluído (e do arquivado, C2) some do bloco “Pedidos de contrato” sem estado novo.', [
        ('proposta-aceita-excluido', CM, 'Ficha da proposta, cliente excluído', 'No lugar de “Falta o contrato”: “Não vira contrato”, sem botões e sem o selo “Contrato pedido”. O escopo diz “Apagado a pedido do titular”, o Word some da lateral e o quadro “A proposta aceita vira contrato.” sai.'),
        ('proposta-aceita-arquivado', CM, 'Ficha da proposta, cliente arquivado (C2)', 'O mesmo, com o nome da cliente (o arquivado guarda os dados) e “Cliente arquivado não ganha contrato novo.”'),
        ('proposta-pedir-recusado', CM, 'Pedir no instante da exclusão', 'Diego tinha a página aberta. O pedir volta recusado, a página recarrega e mostra o aviso “Não deu para pedir o contrato.” sobre a proposta como ficou.'),
        ('novo-contrato-cliente-excluido', CT, 'Novo contrato pelo link do sino, excluído', 'No molde do aviso “Esta proposta não está aceita”: “O cliente desta proposta foi excluído a pedido do titular.” e “Voltar para Contratos”.'),
        ('novo-contrato-cliente-arquivado', CT, 'Novo contrato pelo link do sino, arquivado (C2)', '“A cliente desta proposta foi arquivada a pedido do titular.”'),
    ]),
    ('6. Lembretes de contrato abertos antes da exclusão', 'No molde do conflito aprovado “Este lembrete já saiu da lista.” (portal-importacao-sobras-rodada2).', [
        ('lembrete-excluido-na-hora', LB, 'Dispensar, com a cliente já excluída', '“A cliente foi excluída a pedido do titular.” O lembrete saiu da lista; nada foi gravado. O botão aprovado “Ver a lista atualizada” recarrega.'),
        ('trazer-excluido-na-hora', LB, 'Trazer de volta, com a cliente já excluída', 'Aviso no topo de Dispensados: “Não deu para trazer de volta. A cliente foi excluída a pedido do titular.” A lista já vem sem o lembrete dela.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1] + it[0]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_181.json'), 'w'), ensure_ascii=False, indent=1)

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
<title>Exclusão: contratos, conversas e mesmo CPF · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para a Carol aprovar</p><h1>Exclusão: contratos, conversas e o mesmo CPF</h1>
<p>F3.181, F3.186, F3.190 e F3.188: o que ainda sobra da exclusão a pedido do titular. A janela de exclusão (desenho aprovado em portal-exclusao-historico) ganha as conversas, o pedido de contrato, o lembrete em aberto e o outro cadastro com o mesmo CPF; a proposta, o contrato novo e os lembretes ganham o caso do cliente excluído. Cada estado tem computador (1440) e celular (412). O contorno tracejado em âmbar só marca o que é novo; no produto não há contorno. Clique numa imagem para abrir o HTML naquele estado. O texto exato, as decisões e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para">{nav}</nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
