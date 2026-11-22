# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda, para Escritório › Integrações.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
A = 'integracoes.html?estado='

SECOES = [
    ('1. Chaves de acesso', 'Escritório › Integrações, parte “Chaves de acesso”. A sócia dona cria a chave, escolhe o que ela lê (só leitura), confirma a responsabilidade da LGPD e entrega ao parceiro. A chave aparece uma vez só. PT-15, PT-11, PT-17.', [
        ('vazio', A + 'vazio', 'Nenhuma chave ainda', 'Como funciona em três passos, o que pode sair (as quatro áreas e, à parte, CPF e documentos) e o que nunca sai (conversas do WhatsApp, notas internas, dados de saúde). Os limites aparecem zerados.'),
        ('lista', A + 'lista', 'Lista de chaves', 'Duas ativas, uma delas vencendo em 9 dias (aviso com “Criar a substituta”), e uma revogada, apagada, com quem revogou e o motivo. Ao lado, os limites (2 de 5 chaves, 2 de 3 destinos), o que pode sair e o histórico.'),
        ('criar', A + 'criar', 'Nova chave', 'Nome, o que ela pode ler (Clientes, Jurídico, Contratos, Financeiro), o que nunca sai (fixo), CPF e documentos à parte e desmarcado, validade de 3, 6 ou 12 meses (12 recomendado) e o aceite da LGPD. Ao lado, a chave numa frase.'),
        ('criar-erros', A + 'criar-erros', 'Nova chave com erros', 'Resumo no topo com um link por erro e o erro preso ao campo: nome repetido de uma chave ativa, nenhuma área marcada e o aceite da LGPD sem confirmar.'),
        ('criada', A + 'criada', 'Chave criada (aparece uma vez)', 'A chave inteira com “Copiar”, o aviso de que não aparece de novo (depois, só o começo), o endereço da API e o manual para quem programa, e como entregar ao contador por um canal seguro.'),
    ]),
    ('2. Ficha da chave e revogar', 'O uso da chave sem conteúdo de cliente: validade, último uso, chamadas em 30 dias com gráfico, limite e as últimas chamadas. Revogar vale na hora, com motivo, e nada some. PT-03, PT-02, PT-13.', [
        ('ficha', A + 'ficha', 'Ficha da chave', '“Integração Acme Publicações”: começo da chave, quem criou e quando, validade, último uso, 30 dias de chamadas por dia, limite (60 por minuto, 10.000 por dia), as 6 últimas chamadas (hora, o que pediu, registros, resultado) e o que ela lê.'),
        ('revogar', A + 'revogar', 'Revogar (confirmação)', 'Janela de alerta: a Acme para de ler agora, os avisos do destino ligado param junto, nada é apagado, não tem volta. Motivo obrigatório.'),
        ('revogada', A + 'revogada', 'Chave revogada', 'A ficha fica apagada, com quem revogou, a hora e o motivo. A primeira chamada depois da revogação aparece recusada. “Criar outra chave” no lugar de Revogar.'),
        ('limite', A + 'limite', 'Limite de 5 chaves', 'Com 5 chaves ativas, “Criar chave” fica bloqueado com o motivo escrito, e o aviso aponta a chave sem uso há 64 dias.'),
    ]),
    ('3. Avisos para o parceiro', 'Os destinos de webhook: o T3jus avisa o sistema do parceiro quando algo acontece. O aviso leva só o tipo, o número do registro e a hora; o resto o parceiro busca com a chave. Até 3 destinos. PT-15, PT-11.', [
        ('webhooks', A + 'webhooks', 'Destinos, um com falhas', '“Planilha do contador” falhando desde ontem: quando pausamos, as entregas recentes com falha e “Tentar de novo”. “Acme Publicações” funcionando. Ao lado, como funciona o aviso.'),
        ('webhook-criar', A + 'webhook-criar', 'Novo destino', 'Nome, endereço https, a chave que lê os detalhes e os eventos por área. Os eventos das áreas que a chave não lê ficam bloqueados, com o motivo. Ao lado, o exemplo do que o parceiro recebe.'),
        ('webhook-criado', A + 'webhook-criado', 'Destino criado (segredo aparece uma vez)', 'O teste já foi entregue. O segredo de assinatura com “Copiar”, o aviso de que não aparece de novo e “Trocar o segredo” como saída se perder.'),
        ('webhook-pausado', A + 'webhook-pausado', 'Destino pausado', 'Depois de 3 dias seguidos falhando, o destino é pausado e a dona é avisada. Os avisos da pausa ficam guardados por 7 dias e saem em ordem ao retomar.'),
    ]),
    ('4. Quem vê, só consulta e estados da página', 'Só a sócia dona vê e mexe. Com o Portal só para consulta, as chaves continuam lendo e criar fica bloqueado. PT-02, PT-10.', [
        ('so-consulta', A + 'so-consulta', 'Portal só para consulta', 'A faixa aprovada de Cobrança no alto. As chaves continuam lendo e os avisos continuam saindo; revogar continua liberado; criar chave volta ao pagar.'),
        ('nao-dona', A + 'nao-dona', 'Quem não é a dona (Felipe, sócio)', '“Quem cuida das integrações é Marina Ribeiro”, no padrão “sem permissão” aprovado. Ninguém além da dona vê as chaves, o uso ou os parceiros.'),
        ('erro', A + 'erro', 'Erro ao abrir', 'O que aconteceu, o que continua igual (as chaves seguem funcionando para os parceiros) e o que fazer, com o código para o suporte.'),
        ('carregando', A + 'carregando', 'Carregando', 'Esqueleto da página no lugar das abas, da lista e do lado.'),
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
<title>Escritório · Integrações · T3jus</title>
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
.legenda i{{display:inline-block;width:28px;height:18px;border-radius:4px;background:#fff;border:2px solid #AC788D}} .legenda i.a{{background:#F2ECE8;border-color:#F2ECE8}} .legenda i.e{{border-color:#AC3F6B;box-shadow:inset 4px 0 0 #AC3F6B}} .legenda i.v{{box-shadow:inset 4px 0 0 #DD9760}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Escritório: Integrações</h1>
<p>A sócia dona cria, vê e revoga as chaves da API de parceiros e os destinos dos avisos para o parceiro (webhooks). Cada chave é de um só escritório, só lê, lê só as áreas marcadas e aparece uma vez só. Nada some: revogada e vencida ficam na lista (PT-15, PT-01, PT-02, PT-03, PT-10, PT-11, PT-17). Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<p class="legenda" aria-label="Legenda do desenho"><span><i aria-hidden="true"></i>Folha branca: ativa</span><span><i class="a" aria-hidden="true"></i>Fundo areia, texto apagado: revogada ou vencida</span><span><i class="v" aria-hidden="true"></i>Filete âmbar: vence logo ou sem uso</span><span><i class="e" aria-hidden="true"></i>Filete vinho claro: falha ou erro</span></p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Chaves de acesso</a><a href="#s2">Ficha e revogar</a><a href="#s3">Avisos para o parceiro</a><a href="#s4">Quem vê e estados</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
