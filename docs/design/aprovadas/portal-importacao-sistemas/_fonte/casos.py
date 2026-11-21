# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda. Mesmo casos.py da importação de planilha aprovada; mudam os estados e os textos.
# Uso: python3 casos.py <pasta-saida>
# "alto": altura da janela do computador na captura, para as janelas longas aparecerem inteiras.
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'sistemas.html?estado='

SECOES = [
    ('1. Por onde se chega', 'O botão de Clientes vira “Importar dados” e abre a escolha da origem: planilha (o fluxo aprovado), Astrea ou ADVBOX. F3.56, VA-05.', [
        ('clientes-vazio', 'Clientes de um escritório novo', 'A lista vazia oferece importar (principal) ou cadastrar um por um, com as três origens logo embaixo: planilha, backup do Astrea e ADVBOX.', 0),
        ('clientes-lista', 'Clientes com o botão Importar dados', 'A lista aprovada, sem mudança, com “Importar dados” no lugar de “Importar planilha”.', 0),
        ('origem', 'Escolher a origem', 'Três cartões: Planilha, Astrea e ADVBOX, cada um com o que traz e o que não traz. “Usa outro sistema?” leva à planilha. Ao lado, quem pode importar de outro sistema (só a sócia dona) e o histórico.', 0),
    ]),
    ('2. Astrea, pelo backup', 'O Astrea não tem API. O caminho é o backup completo em .xlsx, que o administrador pede no próprio Astrea e recebe por e-mail em até 24 horas.', [
        ('astrea-pedir', 'Pedir o backup e enviar', 'Passo a passo só em texto, com os nomes dos menus do Astrea (Administração › Escritório › Manutenção de conta), o e-mail que chega e o envio do .xlsx. Ao lado, o que vem do Astrea e o que não vem.', 0),
        ('astrea-abas', 'As abas reconhecidas', 'Contatos, Processos e Lançamentos ligados pelo modelo do Astrea; Tarefas, Agenda e Publicações ficam de fora, com o motivo. Os processos arquivados ficam de fora por padrão.', 0),
        ('astrea-diferente', 'Backup diferente do esperado', 'Duas abas novas que não estão no modelo: o resto segue ligado e as novas esperam a sua escolha. Uma aba de honorários pode ser ligada como a planilha de clientes e contratos.', 0),
        ('astrea-colunas', 'As colunas, já ligadas pelo modelo', 'A tabela aprovada de colunas, com o selo “Pelo modelo do Astrea”. Os valores: o tipo de contato separa clientes de partes contrárias; responsáveis e áreas dos processos.', 1500),
    ]),
    ('3. ADVBOX, pela conexão ou pela planilha', 'Com o plano de API do ADVBOX, o T3jus lê direto de lá, só leitura, em segundo plano. Sem ele, a planilha exportada segue o fluxo aprovado.', [
        ('advbox-escolha', 'Conexão ou planilha', 'Dois caminhos, com o custo dito (o plano de API é contratado com o ADVBOX) e a explicação de por que contratos não vêm.', 0),
        ('advbox-token', 'Colar o token', 'Onde achar o token, o campo que não devolve o token à tela e o que o T3jus faz com ele: só lê, guarda cifrado durante a leitura e apaga ao terminar.', 0),
        ('advbox-token-erro', 'Token recusado e outros problemas', 'O erro no campo e no topo, no tom aprovado. Ao lado: plano sem API (leva à planilha), pausa pedida pelo ADVBOX, ADVBOX fora do ar e token que parou no meio.', 0),
        ('advbox-conectado', 'Conectado: o que ler', 'As listas do escritório no ADVBOX, o que ler (clientes, processos, financeiro), o que não é lido e quanto tempo leva com o limite de 30 leituras por minuto.', 0),
        ('advbox-lendo', 'Lendo em segundo plano', 'O andamento por tipo de dado, a pausa do ADVBOX explicada, “pode fechar a página, avisamos no sino” e cancelar apagando o token.', 0),
        ('advbox-valores', 'Leitura pronta: ligar os valores', 'Chegou pelo sino: a leitura terminou e o token foi apagado. Pessoas do ADVBOX vão para a Equipe, origens para a lista fixa, etapas para as do escritório e tipos de ação para a área.', 0),
        ('advbox-planilha', 'Sem plano de API: a planilha', 'Como exportar os relatórios, clientes primeiro e processos depois, caindo nas colunas da importação aprovada com o modelo do ADVBOX.', 0),
    ]),
    ('4. A prévia', 'A mesma prévia aprovada, com uma aba por tipo de dado: clientes, casos e financeiro. Nada é salvo até importar.', [
        ('previa-sistema', 'Prévia: clientes', 'Os quatro números, as linhas com o código da aba (C de Contatos), o duplicado com cliente já cadastrado e o CPF errado. Ao lado, o que vai entrar e o que não entra: nenhum contrato, nada no Caixa, nenhuma mensagem.', 0),
        ('previa-casos', 'Prévia: casos', 'Um processo aberto mostra o caso que vai entrar no Jurídico, com a etapa ligada, “sem contrato” e o que não vem (prazos, andamentos). Outros: mesmo número de caso existente, número inválido e cliente não encontrado.', 0),
        ('previa-financeiro', 'Prévia: financeiro', 'Recebidos ficam como informação, em aberto vira lembrete de contrato, despesas do escritório ficam de fora (pergunta 2).', 0),
        ('confirmar-sistema', 'Confirmar', 'O resumo do que entra e do que fica de fora, tudo ou nada, o backup apagado, nenhuma mensagem ao cliente e o prazo de desfazer.', 1100),
    ]),
    ('5. O resultado', 'Igual ao aprovado, com a origem escrita no resultado, no histórico e em cada ficha.', [
        ('resultado-sistema', 'Importação concluída', 'O campo âmbar com clientes, casos e o que ficou de fora; os lembretes de contrato; o backup apagado; desfazer até 28/11.', 0),
        ('importacoes', 'Histórico com a origem', 'Cada importação com o selo da origem (Astrea, ADVBOX, Planilha), o arquivo ou a conexão e, no ADVBOX, a hora em que o token foi apagado.', 0),
        ('desfazer-sistema', 'Desfazer', 'Clientes inativos, cadastros de volta ao que eram, casos em Encerrados marcados “importação desfeita”, histórico financeiro fora das fichas; o que alguém mexeu depois fica.', 1150),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for nome, t, leg, alto in itens:
        casos.append({'nome': nome, 'url': U + nome, 'alto': alto, 'titulo': t, 'legenda': leg})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)


def montar(img):
    """img(nome, tam) devolve o src da captura."""
    corpo = ''
    for n, (titulo, sub, itens) in enumerate(SECOES, 1):
        corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
        for nome, t, leg, _ in itens:
            url = U + nome
            figs = ''
            for tam in ['computador', 'celular']:
                figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{img(nome, tam)}" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                         f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
            corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                      f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
        corpo += '</section>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Importar de outros sistemas · T3jus</title>
<meta name="description" content="Desenho da importação direta do Astrea e do ADVBOX (F3.56, VA-05), em computador e celular, para a Carol aprovar.">
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Clientes: Importar do Astrea e do ADVBOX</h1>
<p>A importação direta de outros sistemas (F3.56, VA-05), em cima da importação de planilha aprovada, que não muda. Do Astrea, pelo backup em .xlsx que o próprio Astrea gera; do ADVBOX, pela conexão com a API (só leitura, token apagado ao fim da leitura) ou pela planilha exportada. Entram clientes, processos como casos no Jurídico e o financeiro só como informação; contratos, não. Nada entra até a prévia, entra tudo ou nada, o arquivo e o token não ficam guardados e dá para desfazer em 7 dias. Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Por onde se chega</a><a href="#s2">Astrea</a><a href="#s3">ADVBOX</a><a href="#s4">A prévia</a><a href="#s5">O resultado</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(lambda n, t: f'{n}-{t}.webp'))
    print(len(casos), 'casos')
