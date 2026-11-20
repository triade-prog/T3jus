# Lista dos estados (capturas) e o index.html das duas telas: "não receber avisos" na ficha do cliente e o sino de avisos.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
S = 'sem-avisos.html?estado='
N = 'sino.html?estado='

SECOES = [
    ('1. Ficha do cliente: não receber avisos', 'F3.63 · PA-03. Muda o mínimo na ficha aprovada: uma folha “Avisos automáticos” logo abaixo de Contatos, um selo no cabeçalho vinho quando o cliente está fora, e duas janelas (registrar ou mudar o pedido, e retirar). Nada se apaga: cada pedido e cada retirada ficam no histórico do pedido.', [
        ('sa-ficha', S + 'ficha', 'Cliente fora dos avisos de cobrança', 'Antônia, da ficha aprovada. O selo “Sem avisos de cobrança” fica ao lado de “Ativo”. A folha diz desde quando, quem pediu (Joana, a filha), como (pelo WhatsApp) e quem registrou (Diego, na conversa); o que continua saindo; “Mudar o pedido”, “Retirar o pedido” e o histórico.'),
        ('sa-retirar', S + 'retirar', 'Retirar o pedido (janela)', 'Pede quem pediu para voltar e como. Diz que o pedido de 03/11 continua no histórico e que nada é enviado na hora: as automações voltam a incluir a cliente na próxima vez que rodarem.'),
        ('sa-retirado', S + 'retirado', 'Pedido retirado', 'O selo some do cabeçalho; a folha volta a “Recebe os avisos automáticos”, desde quando, com o histórico aberto: a retirada de hoje e o pedido de 03/11, cada um com quem pediu e quem registrou.'),
        ('sa-mudar', S + 'mudar', 'Mudar o pedido (janela)', 'O mesmo formulário do registro, para quando o cliente pede outra coisa (aqui, parar também os lembretes). O pedido atual vai para o histórico e o novo passa a valer.'),
        ('sa-recebe', S + 'recebe', 'Cliente que recebe os avisos', 'Construtora Vale Alto, da ficha PJ aprovada. A folha diz o que sai sozinho e oferece “Registrar pedido para não receber”.'),
        ('sa-marcar', S + 'marcar', 'Registrar o pedido (janela)', 'O que não quer receber (só cobrança ou todos), quem pediu (o próprio cliente, um contato da ficha ou outra pessoa, com nome), como pediu (WhatsApp, telefone, pessoalmente, e-mail) e quando. No celular, um campo embaixo do outro, com os botões no rodapé da janela.'),
        ('sa-marcar-erros', S + 'marcar-erros', 'Registrar com erros', 'Resumo no topo e o erro preso ao campo: “Outra pessoa” sem nome e data depois de hoje. O pedido ainda não foi registrado.'),
        ('sa-marcado', S + 'marcado', 'Pedido registrado', 'Aviso de sucesso; o selo aparece no cabeçalho e a folha mostra o pedido de Sônia (Financeiro), por telefone, registrado por Marina, hoje.'),
        ('sa-sem-comercial', S + 'sem-comercial', 'Quem não tem Comercial (Larissa, Jurídico)', 'A folha é igual para toda a equipe: quem recebe o pedido registra na hora, tenha a área que tiver. Não mostra valor nem parcela.'),
    ]),
    ('2. O sino de avisos', 'F3.57 · PD-07, e o lembrete de prazo de F3.38. O botão do sino já existe na moldura aprovada (no topo do computador, ao lado da busca; na barra vinho do celular): nada muda na moldura, só abre o painel. Cada aviso diz o que aconteceu, de quem, e leva ao lugar que o explica.', [
        ('si-aberto', N + 'aberto', 'Painel aberto (Marina, sócia dona)', 'No computador, desce do sino sobre a página, sem cobri-la; no celular, ocupa a tela. Hoje: a IA passou uma conversa, Gustavo sugeriu mudança numa automação, a Meta recusou um texto, prazo em 2 dias. Ontem (lidos): Felipe assumiu uma conversa que era dela, Diego passou uma conversa, a Meta aprovou um texto. O não lido tem filete, ponto, título forte e a palavra “Novo”.'),
        ('si-nao-lidos', N + 'nao-lidos', 'Só os não lidos', 'O filtro “Não lidos” mostra os 4 novos. O número do filtro é o mesmo do sino.'),
        ('si-lidos', N + 'lidos', 'Depois de “Marcar todos como lidos”', 'Aviso de sucesso no painel; os avisos continuam, sem destaque; o ponto do sino some e o rótulo vira “Avisos, nenhum novo”. No lugar do botão, “Tudo lido”.'),
        ('si-juridico', N + 'juridico', 'Larissa (só Jurídico)', 'Cada pessoa só recebe o que é dela e pode abrir: a conversa que a IA passou, o seu prazo em 2 dias e a conversa que Marina assumiu. Sugestões de automação e textos da Meta vão só para a sócia dona.'),
        ('si-vazio', N + 'vazio', 'Nenhum aviso (Paula)', 'Diz o que chega ali e que cada aviso leva ao lugar certo.'),
        ('si-erro', N + 'erro', 'Não carregou', 'Erro com “Tentar de novo” e o código para o suporte. Diz que nenhum aviso se perde.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, itens in SECOES for it in itens]
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
<title>Não receber avisos e sino · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Não receber avisos e o sino</h1>
<p>Duas telas pequenas, com o mínimo de mudança no que já foi aprovado. Na ficha do cliente, registrar e retirar o pedido de não receber avisos automáticos (todos ou só cobrança), com quem pediu, como e quando (F3.63). E o painel do sino, que vários desenhos aprovados já citam (F3.57). Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Não receber avisos</a><a href="#s2">O sino</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
