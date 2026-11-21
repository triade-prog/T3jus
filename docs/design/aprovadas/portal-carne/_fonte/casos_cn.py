# Lista dos estados (capturas) do carnê e o index.html de apresentação para a Carol.
# Uso: python3 casos_cn.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
A4 = 'carne-a4.html?estado='
FI = 'financeiro.html?estado='
ES = 'escritorio.html?estado='

SECOES = [
    ('a4', '1. O modelo do carnê, em A4', 'A peça principal. O documento é do escritório para o cliente dele: o escritório no alto, o T3jus só no rodapé ("Modelo T3jus"). Três parcelas por folha, cada uma com o canhoto do escritório à esquerda e a via do cliente à direita, cercadas por linha de corte com tesoura. O Pix é o estático do próprio escritório: o T3jus monta o QR e o copia e cola com o valor e o identificador da parcela. Sem boleto e sem provedor de pagamento.', [
        ('a4-padrao', A4 + 'padrao', 'Padrão: capa e parcelas 4 a 6', 'O que sai sem mexer em nada: as parcelas que ainda vão vencer (4/6 a 6/6), 3 por folha, com a capa na primeira faixa (todas as parcelas, total, como pagar, WhatsApp do escritório e o aviso de que o recibo chega pelo WhatsApp). 2 folhas A4. Cada via: escritório com CNPJ e OAB, cliente com CPF parcial, contrato C-2026-014, parcela "4 de 6", mês de referência, vencimento, valor, multa e juros do contrato, QR e Pix copia e cola (BR Code real, escaneável), chave, recebedor e o identificador C2026014P04. O canhoto tem "pago em ___/___/___", forma e visto. O PDF real está em carne-exemplo.pdf.'),
        ('a4-vencida', A4 + 'vencida', 'Com a parcela vencida', 'A 3/6, vencida em 25/10, só entra se alguém escolher. Sai com o selo "Vencida em 25/10", os encargos "a combinar com o escritório" e o Pix sem valor (o app do banco pede o valor), com o mesmo identificador. Na capa, aparece marcada.'),
        ('a4-uma', A4 + 'uma', '1 parcela por folha', 'Para quem imprime ou manda uma parcela por mês. A via ocupa dois terços da folha, com QR maior e o passo a passo; o canhoto fica embaixo, separado pela linha de corte.'),
        ('a4-sem-pix', A4 + 'sem-pix', 'Escritório sem chave Pix', 'No lugar do Pix vão as instruções de pagamento que a sócia dona escreveu (banco, agência, conta) e o pedido de escrever o identificador na descrição da transferência.'),
        ('a4-pb', A4 + 'pb', 'Prévia em preto e branco', 'Como sai numa impressora comum. O que informa está em texto escuro ou em linha; o âmbar é só um filete. O QR é preto no branco desde o início, que é o que lê melhor.'),
    ]),
    ('fluxo', '2. Gerar o carnê no Financeiro', 'Na ficha do contrato em Financeiro › A receber (a ficha aprovada, com Hélio Batista Corrêa). Quem tem a área Financeiro gera; aqui é Diego Almeida, o responsável, que não é dono.', [
        ('contrato-carne', FI + 'contrato-carne', 'Ficha do contrato com o carnê', 'Botão "Gerar carnê" no alto das parcelas e a folha nova "Carnê" ao lado, antes da cobrança: ainda sem carnê, com a chave Pix em uso.'),
        ('carne', FI + 'carne', 'Janela "Gerar carnê"', 'Parcelas (as que vão vencer, padrão; ou escolher), formato (3 por folha recomendado; 1 por folha), capa, o Pix do escritório com a chave em uso (só a sócia dona muda) e a prévia da primeira folha. Ações: Baixar PDF, Imprimir e Mandar pelo WhatsApp, para o contato principal, pelo número do escritório.'),
        ('carne-escolher', FI + 'carne-escolher', 'Escolher as parcelas', 'As pagas aparecem sem poder marcar, com o motivo. A vencida (3/6) pode entrar e diz como sai. A prévia e o total mudam.'),
        ('carne-gerando', FI + 'carne-gerando', 'Gerando o PDF', 'Barra de progresso e o botão dizendo o que está acontecendo. Dá para cancelar.'),
        ('carne-erro', FI + 'carne-erro', 'Erro ao gerar', 'Diz que nada foi enviado nem guardado, o que fazer e o código para a Ajuda. O foco vai para "Tentar de novo".'),
        ('carne-whats', FI + 'carne-whats', 'Mandar pelo WhatsApp', 'Prévia da mensagem a Marta Corrêa, com o PDF anexado, antes de enviar. Opção de mandar também ao cliente.'),
        ('carne-gerado', FI + 'carne-gerado', 'Carnê gerado e enviado', 'Aviso de sucesso e o histórico na ficha: "Parcelas 4/6 a 6/6 · gerado por Diego Almeida em 18/11, às 15h32 · enviado a Marta Corrêa · lido". Baixar de novo ou gerar de novo.'),
        ('carne-desatualizado', FI + 'carne-desatualizado', 'Carnê desatualizado', 'Uma parcela do carnê mudou em Contratos (a 5/6 passou de 25/12 para 30/12). A folha avisa o que mudou, quem mudou e quando, e oferece "Gerar de novo". A linha da parcela mostra "era 25/12". O mesmo vale para parcela cancelada.'),
        ('carne-sem-pix', FI + 'carne-sem-pix', 'Sem chave Pix · sócia dona', 'Marina vê o aviso com o caminho para cadastrar a chave em Escritório › Recebimento. Pode gerar já, com as instruções em texto.'),
        ('carne-sem-pix-equipe', FI + 'carne-sem-pix-equipe', 'Sem chave Pix · quem não é dono', 'Diego vê "Quem cadastra é Marina Ribeiro, a sócia dona" e o botão "Pedir a Marina Ribeiro" (aviso no sino dela). Também pode gerar com as instruções em texto.'),
    ]),
    ('contratos', '3. O mesmo atalho em Contratos', 'Quem tem a área Contratos gera o carnê da ficha do contrato, na aba Recebimentos. É a mesma janela e o mesmo carnê, guardado nas duas fichas.', [
        ('contratos-carne', 'contratos.html?estado=contrato-carne', 'Contrato C-2026-014 em Contratos', 'Ficha do contrato de Hélio na aba Recebimentos, com "Gerar carnê" no alto da programação. O botão abre a mesma janela.'),
    ]),
    ('escritorio', '4. Escritório › Recebimento', 'Seção nova em Escritório, ao lado de "Dados do escritório" e "WhatsApp e IA". Só a sócia dona edita; quem tem o Financeiro vê para ler.', [
        ('recebimento', ES + 'recebimento', 'Recebimento (sócia dona)', 'Tipo e chave Pix, nome do recebedor e cidade como o banco mostra (exigidos pelo Pix, com contador de letras), um Pix de teste para conferir no app do banco, as instruções de pagamento em texto e a marca no carnê (nome em letra ou logo). Ao lado: onde isso aparece e o histórico.'),
        ('recebimento-vazio', ES + 'recebimento-vazio', 'Sem chave cadastrada', 'O aviso diz o que muda no carnê sem a chave. O Pix de teste só aparece com tudo preenchido.'),
        ('recebimento-erros', ES + 'recebimento-erros', 'Erros de validação', 'CNPJ que não existe (dígito errado), nome com mais de 25 letras e cidade em branco. Resumo no topo e cada erro preso ao campo, com o que fazer.'),
        ('recebimento-trocar', ES + 'recebimento-trocar', 'Trocar a chave', 'Confirmação antes de trocar: a chave de hoje e a nova, e o carnê já entregue que usa a chave de hoje.'),
        ('recebimento-salvo', ES + 'recebimento-salvo', 'Chave trocada', 'Aviso de sucesso, o carnê que ficou desatualizado (com o caminho até ele) e a troca no histórico.'),
        ('recebimento-equipe', ES + 'recebimento-equipe', 'Quem não é dono', 'Diego vê os dados para ler e o Pix de teste, com o aviso de que quem muda é Marina Ribeiro.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, _, itens in SECOES for it in itens]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for sid, titulo, sub, itens in SECOES:
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    if sid == 'a4':
        corpo += ('<p class="pdf"><a class="botao" href="carne-exemplo.pdf">Abrir o PDF de exemplo (A4, 2 folhas)</a>'
                  '<a class="botao sec" href="carne-a4.html">Abrir a prévia do carnê</a></p>')
    for nome, url, t, leg in itens:
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" decoding="async"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 390"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a></p></div></article>')
    corpo += '</section>'

PERGUNTAS = [
    ('3 parcelas por folha ou 1 por folha, como padrão?', '3 por folha. Economiza papel, é o formato que o cliente reconhece de carnê e cabe tudo com folga.'),
    ('A capa vem marcada por padrão?', 'Sim, marcada. Ela explica como pagar e lembra o WhatsApp; quem não quiser desmarca.'),
    ('O carnê leva a marca do escritório e o T3jus só no rodapé?', 'Sim. O carnê é do escritório para o cliente dele; "Modelo T3jus" fica em letra pequena no pé de cada via.'),
    ('Parcela vencida entra no carnê?', 'Só se alguém escolher, marcada como vencida e com o Pix sem valor, para o valor com multa e juros combinado.'),
    ('O envio pelo WhatsApp entra já?', 'Sim, no desenho e na primeira entrega, com a prévia antes de enviar. Fora da janela de 24 horas, depende de um aviso aprovado pela Meta.'),
    ('Gerar o carnê muda a forma das parcelas para "Carnê"?', 'Não. A forma continua Pix (ou transferência, sem chave). "Carnê" é o papel, não a forma; o carnê fica no histórico da ficha.'),
]
perg = ''.join(f'<li><b>{h(q)}</b><span>Recomendação: {h(r)}</span></li>' for q, r in PERGUNTAS)

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carnê de pagamento · T3jus</title>
<meta name="description" content="Desenho do carnê de pagamento dos honorários parcelados (FI-23) no Portal do advogado, para aprovação da Carol.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--vinho-2:#87335B;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:var(--ambar-3);max-width:92ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:44px;line-height:1.1}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
.fio{{display:block;width:56px;height:3px;background:var(--ambar);margin:14px 0 4px;border-radius:2px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:var(--vinho-2);color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} a{{color:var(--vinho)}} .abrir a{{font-weight:500}}
.pdf{{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}}
.botao{{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:8px;background:var(--vinho);color:#fff!important;text-decoration:none;font-weight:500}}
.botao.sec{{background:var(--papel);color:var(--vinho)!important;border:1px solid var(--vinho)}}
.perg{{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:q}}
.perg li{{counter-increment:q;display:grid;grid-template-columns:40px minmax(0,1fr);gap:4px 14px;background:var(--papel);border-radius:14px;padding:16px 20px}}
.perg li::before{{content:counter(q);grid-row:1/3;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--ambar-3);color:var(--vinho);font-family:Alegreya,Georgia,serif;font-size:20px}}
.perg b{{font-weight:500}} .perg span{{color:var(--tinta-2)}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:var(--ambar-3)}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} h1{{font-size:34px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Carnê de pagamento</h1><span class="fio" aria-hidden="true"></span>
<p>FI-23. O escritório gera no Portal, a partir das parcelas do contrato, um PDF em A4 com as parcelas destacáveis (canhoto do escritório e via do cliente) e o Pix do próprio escritório, para imprimir ou mandar ao cliente pelo WhatsApp. Sem boleto registrado e sem provedor de pagamento: a baixa continua em "Registrar recebimento". Cada estado tem computador (1440) e celular (390). Clique numa imagem para abrir o HTML naquele estado. Regras, dados novos e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#a4">Modelo A4</a><a href="#fluxo">Gerar no Financeiro</a><a href="#contratos">Em Contratos</a><a href="#escritorio">Escritório › Recebimento</a><a href="#perguntas">Perguntas</a></nav></header>
<main>{corpo}
<section id="perguntas" aria-labelledby="t-perg"><h2 id="t-perg">Perguntas para a Carol</h2><p class="sub">As 6 primeiras. As outras, com as recomendações, estão no NOTAS.md.</p><ol class="perg">{perg}</ol></section>
</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
