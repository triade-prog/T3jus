# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda, para Agenda e Conversas.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
A = 'agenda.html?estado='
C = 'conversas.html?estado='

SECOES = [
    ('1. Agenda: as três visões', 'Item comum do trilho e da barra de baixo do celular. Uma agenda só para a equipe toda, com filtro por pessoa. Os prazos do Jurídico entram sozinhos para quem tem a área. EX-06, PD-04, PD-07.', [
        ('ag-semana', A + 'semana', 'Semana (sócia dona, equipe toda)', 'Grade de segunda a domingo, das 8h às 19h. Faixa de prazos do Jurídico no alto de cada dia, linha de agora em âmbar e o dia de hoje no disco âmbar. Feriado em hachura (fórum fechado, prazos não correm). O + de cada dia marca um compromisso ali. No celular, vira lista por dia, com os dias que passaram recolhidos.'),
        ('ag-mes', A + 'mes', 'Mês', 'Visão do mês com até três itens por dia e “e mais N”. No celular, um calendário compacto com pontos por tipo e, embaixo, a lista do dia escolhido.'),
        ('ag-dia', A + 'dia', 'Dia', 'Prazos do dia com “Abrir no Jurídico”, compromissos com modalidade, local e pessoas, linha de agora e os horários livres como botões de marcar. Ao lado, os lembretes que saem hoje e o lugar reservado para Google Agenda e Outlook (EX-13, em estudo).'),
        ('ag-pessoa', A + 'pessoa', 'Filtro por pessoa', 'Só a agenda de Felipe Matos: os compromissos dele, os da equipe toda e o prazo dele. Uma linha diz o filtro e volta para a equipe toda.'),
        ('ag-sem-juridico', A + 'sem-juridico', 'Sem a área Jurídico (Paula, recepção)', 'A mesma agenda sem a faixa de prazos e sem a legenda de prazo. O pé diz por quê e quem libera. O servidor já manda sem os prazos.'),
        ('ag-vazio', A + 'vazio', 'Primeiro uso', 'Nada marcado: três passos (marcar, lembrete ao cliente, prazos que entram sozinhos) e um botão.'),
    ]),
    ('2. Agenda: marcar, ver e cancelar', 'Marcar clicando no dia, com modalidade e link da sala, cliente da ficha e lembrete pelo WhatsApp. A ficha do compromisso mostra o lembrete e o histórico. Nada é apagado. EX-06, EX-11, PT-03.', [
        ('ag-novo', A + 'novo', 'Novo compromisso (clicou na quinta)', 'A janela abre com o dia e a hora do clique; a grade mostra o lugar tracejado. Tipo, o que é, dia e horas, presencial ou virtual com link da sala, cliente, processo (só com Jurídico), responsável e quem mais vai. Nas audiências, o lembrete ao cliente já vem marcado, com o porquê (CPC, art. 334, § 8º).'),
        ('ag-novo-erros', A + 'novo-erros', 'Novo · erros', 'Resumo no topo e três erros presos ao campo: o que é vazio, término antes do início e virtual sem link.'),
        ('ag-novo-outro', A + 'novo-outro', 'Novo · tipo “Outro”', 'No Tipo, a opção Outro abre o campo “Qual tipo”, obrigatório, para escrever o tipo (aqui, Perícia). O tipo escrito aparece com esse nome no compromisso da grade (“16:00 · Perícia”) e na legenda. Presencial pede o endereço, que vai no lembrete.'),
        ('ag-marcado-outro', A + 'marcado-outro', 'Marcado · tipo escrito', 'A perícia entra na grade como “16:00 · Perícia”, e a legenda passa a mostrar Perícia ao lado dos tipos fixos. Todo tipo escrito usa a mesma cor; o que distingue é o nome, sempre escrito.'),
        ('ag-novo-outro-erro', A + 'novo-outro-erro', 'Novo · “Outro” sem o tipo', 'Outro marcado e o campo “Qual tipo” vazio: resumo no topo e o erro preso ao campo.'),
        ('ag-marcado', A + 'marcado', 'Marcado', 'O compromisso entra na grade em destaque e o aviso diz quando saem os dois lembretes.'),
        ('ag-compromisso', A + 'compromisso', 'Ficha da audiência', 'Cabeçalho da ficha aprovada: no âmbar, a sala virtual com “Entrar na sala” e “Copiar o link”. Dados com cliente, processo e observações da equipe. O lembrete à cliente: por que lembrar, o que saiu, a resposta “Confirmo” e a mensagem enviada. Ao lado, quem vai, o histórico com motivo da remarcação e Cancelar.'),
        ('ag-cancelar', A + 'cancelar', 'Cancelar (alertdialog)', 'Motivo obrigatório e aviso à cliente pelo WhatsApp, já marcado. Nada é apagado: o compromisso fica riscado na agenda e no histórico.'),
    ]),
    ('3. Conversas: mensagens', 'Item comum com contador na barra de baixo. Cada conversa de WhatsApp dos clientes com a IA do escritório: o que ela resolveu, o que passou para uma pessoa, com responsável, e o momento de assumir e devolver. Barra de seções: Mensagens e Avisos automáticos (pergunta 1).', [
        ('cv-fila', C + 'fila', '“Precisa de alguém” (fila)', 'Três conversas esperando, cada uma com quanto tempo, o motivo e o responsável. Aberta, a de Hélio: Marta pergunta sobre uma proposta de acordo, a IA não opina e passa para Marina, que cuida do caso. Ao lado, por que a IA passou, a ficha, o caso e os avisos enviados. No celular, só a lista.'),
        ('cv-conversa', C + 'conversa', 'Conversa aberta (celular)', 'Joana mandou a foto da carta do INSS. A IA guardou e passou para Diego, responsável pelo próximo contato vencido de Antônia. Ao lado, o vencido e o atalho para registrar o atendimento na ficha. No celular, o contexto fica num bloco que abre e fecha.'),
        ('cv-assumida', C + 'assumida', 'Você assumiu', 'Linha no histórico da conversa (“Você assumiu… a IA fica em silêncio”), a mensagem de Marina em vinho, a resposta com a foto da proposta e o campo de escrever.'),
        ('cv-devolver', C + 'devolver', 'Devolver para a IA', 'O que a IA precisa saber (opcional, o cliente não vê) e “Registrar como atendimento na ficha”, já marcado.'),
        ('cv-passar', C + 'passar', 'Passar para outra pessoa', 'Escolhe só entre pessoas ativas, com recado opcional. A conversa nunca fica sem responsável; a troca fica registrada.'),
        ('cv-resolvida', C + 'resolvida', 'Resolvida pela IA', 'Gabriela pergunta se a audiência é por vídeo; a IA responde com o que está na Agenda e encerra. Ao lado, o que a IA usou para responder. “Assumir mesmo assim” corrige quando algo está errado.'),
        ('cv-novo-contato', C + 'novo-contato', 'Contato novo (VA-03, a validar)', 'Número que não está em Clientes. A IA anotou nome, telefone, assunto e melhor horário como rascunho: “Cadastrar como cliente” abre o cadastro preenchido para conferir; a IA não cadastra sozinha. O dado de saúde fica fora do cadastro.'),
        ('cv-fila-vazia', C + 'fila-vazia', 'Ninguém esperando', 'Fila vazia, sem contador, e o resumo do dia: resolvidas pela IA, passadas e respondidas, avisos enviados.'),
    ]),
    ('4. Conversas: avisos e WhatsApp não ligado', 'Os avisos que saem sozinhos (pagamento, atraso, etapa do caso, lembrete de audiência, prestação de contas) e o estado antes de ligar o número do escritório. EX-11, EX-14, FI-12.', [
        ('cv-avisos', C + 'avisos', 'Avisos automáticos', 'Avisos dos últimos 7 dias com tipo, cliente, a quem foi, quando e a situação (entregue, lido, respondeu). O não entregue vem primeiro, com “Corrigir na ficha”. Ao lado, a mensagem escolhida em linguagem simples e o que a disparou, e a lista de avisos ligados, que só a sócia dona muda.'),
        ('cv-nao-conectado', C + 'nao-conectado', 'WhatsApp não ligado (sócia dona)', 'Três passos: número só do escritório, ligação de 30 minutos com a equipe T3jus, revisão antes de qualquer envio. Ao lado, o que acontece enquanto isso e o contato do suporte.'),
        ('cv-nao-conectado-equipe', C + 'nao-conectado-equipe', 'WhatsApp não ligado (equipe)', 'Para quem não é a sócia dona: quem liga é Marina, e as conversas seguem no WhatsApp de sempre até lá.'),
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
<title>Portal · Agenda e Conversas · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: Agenda e Conversas</h1>
<p>As duas áreas comuns do Portal que ficam na barra de baixo do celular. A Agenda do escritório, com mês, semana e dia, audiências presenciais ou virtuais e o lembrete ao cliente pelo WhatsApp (EX-06, EX-11). As Conversas de WhatsApp dos clientes com a IA do escritório, com a fila “Precisa de alguém”, o assumir e devolver e os avisos automáticos (EX-14, FI-12, VA-03). Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Agenda: visões</a><a href="#s2">Agenda: marcar</a><a href="#s3">Conversas: mensagens</a><a href="#s4">Avisos e WhatsApp</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
