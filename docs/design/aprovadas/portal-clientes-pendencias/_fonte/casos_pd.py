# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Mesmo formato do casos.py aprovado de Clientes. Uso: python3 casos_pd.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'pendencias.html?estado='

SECOES = [
    ('1. Início: contatos de hoje', 'Primeira versão do Início do Portal (hoje “em preparação”), com o bloco Contatos de hoje para quem tem a área Comercial. O hero e as peças são os do Início aprovado. F1.14, AP-06, PT-02, PT-10.', [
        ('inicio', U + 'inicio', 'Início de Diego (área Comercial)', 'Só os contatos em que Diego é o responsável: 3 vencidos, do mais antigo para o mais novo, e 2 de hoje. Cada item: data, cliente, o que fazer, com quem falar, o selo (urgência com os dias de atraso, ou atenção “Hoje”) e “Registrar atendimento”. O nome do cliente abre a ficha. No hero, as contagens levam ao bloco.'),
        ('inicio-registrar', U + 'inicio-registrar', 'Registrar a partir do Início', 'Abre a janela aprovada da ficha, já com o cliente e com Diego como quem atendeu.'),
        ('inicio-registrado', U + 'inicio-registrado', 'Atendimento registrado', 'Antônia sai do bloco e o aviso diz qual é o próximo contato e com quem. As contagens do hero caem.'),
        ('inicio-muitos', U + 'inicio-muitos', 'Mais de 5 contatos', 'O bloco mostra no máximo 5, os mais atrasados primeiro. O pé diz quantos faltam e leva a Clientes, filtro Contato vencido.'),
        ('inicio-dona', U + 'inicio-dona', 'Sócia dona: os dela', 'Por padrão, Marina vê os dela (1 de hoje). Uma linha avisa que a equipe tem vencidos e com quem, e o botão “Da equipe” mostra todos. Decisão 1.'),
        ('inicio-dona-pedido', U + 'inicio-dona-pedido', 'Sócia dona: pedido de exclusão esperando', 'Entre o hero e os blocos, um aviso curto “1 pedido de exclusão esperando você”, com a cliente e quem pediu. Leva à ficha com a faixa do pedido. Só a sócia dona vê. Decisão 2.'),
        ('inicio-dona-equipe', U + 'inicio-dona-equipe', 'Sócia dona: da equipe', 'Os 7 contatos da equipe, com o responsável de cada um, na mesma ordem.'),
        ('inicio-vazio', U + 'inicio-vazio', 'Tudo em dia', 'Nada vencido e nada para hoje: o bloco comemora em uma linha e mostra o próximo contato marcado.'),
        ('inicio-carregando', U + 'inicio-carregando', 'Carregando', 'A saudação vem da sessão e aparece logo. As contagens e o bloco têm esqueleto, aria-busy e aviso para leitor de tela.'),
        ('inicio-erro', U + 'inicio-erro', 'Erro no bloco', 'O erro fica dentro do bloco: o resto do Início continua. Tentar de novo, o caminho alternativo (Clientes) e o código para o suporte.'),
        ('inicio-sem-comercial', U + 'inicio-sem-comercial', 'Sem a área Comercial (Larissa, só Jurídico)', 'O bloco não aparece nem bloqueado. O Início mostra a saudação, os atalhos e o que vai chegar com as áreas dela.'),
        ('inicio-encaixe', U + 'inicio-encaixe', 'Onde entram os vizinhos (anotação)', 'Só para a aprovação: os blocos tracejados são os do Início aprovado, que outra frente está desenhando. Contatos fica na coluna da esquerda, entre Prazos e Recebimentos; a explicação sai quando a coluna da direita tiver blocos.'),
    ]),
    ('2. Pedido de exclusão do titular (LGPD)', 'Na ficha, perto de Inativar, só para a sócia dona. Anonimiza os dados pessoais e guarda o registro da exclusão e os atendimentos sem com quem se falou. Irreversível. Com contrato ou processo, arquiva em vez de excluir. F1.15, PT-11, PT-02, PT-03.', [
        ('excluir-ficha', U + 'excluir-ficha', 'Onde fica a ação', 'Na folha Situação, abaixo de Inativar e separada dela: “Atender pedido de exclusão”, em botão discreto, com uma linha que explica quando usar.'),
        ('excluir', U + 'excluir', 'Janela de confirmação (alertdialog)', 'À esquerda, o que é apagado e o que fica, com o porquê; perto do resumo que fica, a dica de não pôr dado pessoal desnecessário no resumo. À direita, o pedido (data, canal, quem pediu, conferência) e a confirmação com o nome da cliente. O botão de perigo é cheio e diz “para sempre”.'),
        ('excluir-erros', U + 'excluir-erros', 'Erros', 'Canal vazio, conferência não marcada e nome que não confere: resumo no topo e cada erro preso ao campo. O botão nunca fica desabilitado.'),
        ('excluir-confirmar', U + 'excluir-confirmar', 'Pronto para confirmar', 'Tudo preenchido e “O nome confere”.'),
        ('excluir-falhou', U + 'excluir-falhou', 'Falha no servidor', 'A exclusão é de uma vez só: se falha, nada foi apagado. O que foi preenchido continua na janela.'),
        ('excluido', U + 'excluido', 'Ficha depois da exclusão', '“Cliente excluído”, com o selo Excluído (LGPD), a data e o protocolo. Os campos dizem “Excluído”. Ao lado, o registro da exclusão. Não dá para editar, reativar nem registrar atendimento.'),
        ('excluido-atendimentos', U + 'excluido-atendimentos', 'Atendimentos depois da exclusão', 'Ficam a data, o canal, quem atendeu e o resumo, como foi escrito; com quem se falou e o próximo contato saem. Decisão 3.'),
        ('excluido-lista', U + 'excluido-lista', 'Lista de Clientes: Inativos', 'O excluído aparece em Inativos como “Cliente excluído”, com a data e o protocolo, sem nada pessoal. Sai de Ativos e de Contato vencido. Decisão 4.'),
        ('excluir-depois', U + 'excluir-depois', 'Futuro: com contrato ou processo, arquivar', 'Desenho do futuro, porque hoje não há contratos nem processos. A ação vira “Arquivar a pedido (LGPD)”: nada é apagado, o cliente sai das listas comuns, a ficha fica só leitura e o pedido fica registrado. Sem escrever o nome, porque nada se perde. Decisão 5.'),
    ]),
    ('3. Pedido de exclusão pela equipe', 'Quem não é a sócia dona não exclui, mas registra o pedido para ela. A dona vê o pedido no Início e na ficha, e exclui ou recusa com motivo. Decisão 2.', [
        ('excluir-ficha-equipe', U + 'excluir-ficha-equipe', 'Quem não é a dona (Diego)', 'No lugar do botão de excluir, uma linha: quem atende é Marina, a sócia dona, e o botão discreto “Pedir a exclusão à sócia dona”.'),
        ('excluir-pedir', U + 'excluir-pedir', 'Pedir a exclusão (janela)', 'Janela pequena: data do pedido, como chegou e uma observação opcional, sem dado pessoal. Nada é apagado agora; Marina recebe no Início.'),
        ('excluir-pedido', U + 'excluir-pedido', 'Pedido enviado (visão de quem pediu)', 'No alto da ficha, para todos: “Exclusão pedida em 18/11 por Diego Almeida, aguardando a sócia dona”, com o canal e a observação. Não há botão de repetir; a Situação diz que o pedido já foi.'),
        ('excluir-pedido-dona', U + 'excluir-pedido-dona', 'Pedido esperando (visão da sócia dona)', 'A mesma faixa, com “Excluir os dados” e “Recusar o pedido”. O botão da Situação dá lugar a uma linha que aponta para a faixa.'),
        ('excluir-do-pedido', U + 'excluir-do-pedido', 'Excluir a partir do pedido', 'A janela de exclusão aprovada, já com a data e o canal do pedido e uma linha que diz quem o registrou. O resto é igual: conferir quem pediu e escrever o nome.'),
        ('excluir-recusar', U + 'excluir-recusar', 'Recusar o pedido', 'Motivo obrigatório, sem dado pessoal. Nada é apagado; a recusa fica no histórico do escritório.'),
        ('excluir-recusado', U + 'excluir-recusado', 'Pedido recusado (visão de Diego)', 'A faixa mostra a recusa, quem recusou e o motivo, para todos. A linha “Pedir a exclusão à sócia dona” volta, para um pedido novo.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_pd.json'), 'w'), ensure_ascii=False, indent=1)

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
<title>Portal · Pendências de Clientes · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: pendências de Clientes</h1>
<p>As duas pendências da entrega de Clientes: o Início com os contatos vencidos e de hoje de quem é o responsável (F1.14, AP-06) e o pedido de exclusão do titular pela LGPD (F1.15, PT-11). Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. As decisões da Carol (18/11/2026) estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Início</a><a href="#s2">Exclusão (LGPD)</a><a href="#s3">Pedido pela equipe</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
