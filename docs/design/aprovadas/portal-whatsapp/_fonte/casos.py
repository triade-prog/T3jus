# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda, para Escritório › WhatsApp e IA.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
A = 'whatsapp.html?estado='

SECOES = [
    ('1. Ligar o número', 'Escritório › WhatsApp e IA, parte “Número do WhatsApp”. A sócia dona liga sozinha, passo a passo, ou marca a ligação com a equipe T3jus (o caminho aprovado continua). A janela da Meta aparece só como um passo explicado. PA-04, PA-01, PA-02.', [
        ('nao-ligado', A + 'nao-ligado', 'Não ligado (sócia dona)', 'O que ter em mãos (número só do escritório, o telefone por perto, a conta do Facebook, nome e CNPJ) e dois caminhos: “Ligar agora, passo a passo” (uns 15 minutos, principal) e “Marcar ligação com a equipe T3jus” (o aprovado). Ao lado, o que muda ao ligar e o app no celular.'),
        ('passos', A + 'passos', 'Passo a passo: entrar com a Meta', 'Cinco passos no alto (Número, Entrar com a Meta, Nome que aparece, Código, Pronto). O passo 2 explica, em ordem, o que a janela da Meta vai pedir, com os dados para copiar, antes de abrir a janela. Ao lado, o que já foi informado (fica salvo) e o que vem depois.'),
        ('numero-erro', A + 'numero-erro', 'Número com erro', 'Resumo no topo com um link para cada erro e o erro preso ao campo: o número já está ligado a outro sistema de atendimento, e o fixo não recebe SMS (oferece “Por ligação de voz”). Pergunta se o número continua no app do celular.'),
    ]),
    ('2. Número ligado', 'A saúde do número em linguagem simples e os avisos automáticos na Meta. Nada é apagado; trocar e desligar só a sócia dona. PA-04, PT-03, PD-07.', [
        ('em-analise', A + 'em-analise', 'Ligado, esperando a Meta', 'O que já funciona (receber e responder clientes, o app no celular) e o que espera a Meta (o nome que aparece e 4 dos 6 avisos). O que fazer agora: preparar a IA, confirmar a empresa na Meta e esperar o aviso no sino.'),
        ('ligado', A + 'ligado', 'Ligado', 'Nome que o cliente vê, qualidade segundo a Meta, limite de conversas por dia (18 de 250) e empresa confirmada. Os 6 avisos com a situação. Conta e pagamento (cartão na conta da Meta do escritório), Trocar o número, Desligar e o histórico.'),
        ('modelo-recusado', A + 'modelo-recusado', 'Aviso recusado pela Meta', '“Parcela em atraso” recusado: o motivo em palavras simples, o texto recusado, a sugestão da IA tracejada (não vale até aprovar), o texto novo com contador, a prévia como Hélio veria e o que acontece depois. Só a sócia dona aprova.'),
        ('desligar', A + 'desligar', 'Desligar (confirmação)', 'Janela de alerta com o que acontece (avisos param, a IA para, mensagens novas não chegam; nada é apagado e dá para ligar de novo), motivo obrigatório e a confirmação.'),
    ]),
    ('3. Como a IA atende', 'A parte “Como a IA atende”, em quatro partes: apresentação e assuntos, quando passa para alguém, o que ela sabe e testar sem enviar. A IA sempre diz que é assistente virtual; o que ela nunca faz é fixo. PA-04, PT-11, EX-10, PD-07.', [
        ('ia', A + 'ia', 'Apresentação e assuntos', 'Nome e apresentação (sempre “assistente virtual”), tom, o que ela pode responder (seis assuntos marcáveis), o que ela nunca faz (fixo), quem pode falar com ela (só números da ficha; número desconhecido é contato novo e vai para o Comercial) e dado sensível só na conversa. Ao lado, a prévia em âmbar claro.'),
        ('ia-passar', A + 'ia-passar', 'Quando passa para alguém', 'Os sete casos fixos (e quando não sabe), as palavras do escritório, para quem vai (a regra aprovada de Conversas), o horário da equipe (seg a sex, 9h às 18h, feriados e recesso) e o que a IA diz fora do horário. Ao lado, a conversa de sábado à noite.'),
        ('ia-saber', A + 'ia-saber', 'O que ela sabe', 'As respostas escritas pelo escritório (endereço, estacionamento, primeira reunião, formas de pagamento, horário), o que mais ela usa do T3jus e as perguntas que ela não soube (vazio antes de ligar).'),
        ('ia-testar', A + 'ia-testar', 'Testar sem enviar', 'Conversar como Antônia, como Joana ou como número desconhecido. Cada resposta mostra de onde veio; o momento em que passaria para Larissa aparece na conversa. Ao lado, por que respondeu assim e pedidos para experimentar.'),
        ('ia-ligar', A + 'ia-ligar', 'Ligar a IA (confirmação)', 'O que a IA vai fazer numa frase, o que acontece com as conversas abertas, onde fica o “Pausar” e a confirmação de que testou. Só a sócia dona liga.'),
        ('ia-ligada', A + 'ia-ligada', 'IA ligada', 'Faixa vinho “A IA está ligada” com “Pausar a IA agora” (as conversas vão direto para a equipe). Números de hoje, resumo das quatro partes, a pergunta que ela não soube (vira resposta com um clique) e o histórico.'),
        ('so-leitura', A + 'so-leitura', 'Só leitura (Paula, recepção)', 'Quem não é a sócia dona vê tudo sem editar: sem Trocar, Desligar nem Ajustar o texto, com “Quem cuida: Marina Ribeiro”.'),
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
<title>Escritório · WhatsApp e IA · T3jus</title>
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
.legenda{{display:flex;flex-wrap:wrap;gap:18px;margin-top:14px;color:#fff;font-size:13px}} .legenda span{{display:inline-flex;align-items:center;gap:8px}}
.legenda i{{display:inline-block;width:28px;height:18px;border-radius:4px;background:#fff;border:2px solid #AC788D}} .legenda i.t{{border:2px dashed #87335B;background:#FFFCFA}} .legenda i.e{{border-color:#AC3F6B;box-shadow:inset 4px 0 0 #AC3F6B}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Escritório: WhatsApp e IA</h1>
<p>Cada escritório liga o próprio número de WhatsApp, passo a passo, com a conta da Meta dele, e configura a IA que atende os clientes por esse número. Só a sócia dona liga, muda e desliga; a equipe vê para ler. Nada sai para cliente sem revisão, e nada é apagado (PA-04, ideia nova). Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<p class="legenda" aria-label="Legenda do desenho"><span><i aria-hidden="true"></i>Contorno contínuo: salvo</span><span><i class="t" aria-hidden="true"></i>Tracejado: sugerido pela IA, ainda não vale</span><span><i class="e" aria-hidden="true"></i>Filete: precisa de ajuste</span></p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Ligar o número</a><a href="#s2">Número ligado</a><a href="#s3">Como a IA atende</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
