# Lista dos estados (casos.json, para as capturas) e o index.html com todas as telas lado a lado.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'emprestimos.html?estado='
H = html.escape

SECOES = [
    ('T1 · Caixa', 'A folha “Empréstimos”, com a faixa “À parte · entra no saldo, mas não é receita”, fica na coluna principal, logo abaixo da previsão. A tabela mês a mês volta, com a coluna “Empréstimos · à parte”. O saldo do escritório diz quanto dele veio de empréstimo. Nada em âmbar: o âmbar continua só para terceiros.', [
        ('em-caixa', 'Caixa com empréstimos', 'Três empréstimos ativos: Banco do Brasil (Pronampe, anterior ao T3jus, fora do saldo), Sicoob (capital de giro, entrou em outubro) e Marina Ribeiro (sócia, devolve quando der). Cada linha mostra o falta pagar, quantas foram pagas, quando termina e a próxima parcela. No pé, o total que falta pagar (R$ 84.830,00). O saldo de hoje inclui R$ 29.870,00 de empréstimos.'),
        ('em-vazio', 'Nenhum empréstimo', 'Só uma linha discreta: “Pegou empréstimo de banco ou de sócio? Registre aqui: entra no saldo, mas não conta como receita.” A tabela mês a mês fica sem a coluna Empréstimos, que só aparece quando há algum.'),
    ]),
    ('T2 · Registrar empréstimo', 'Uma janela só, de cima para baixo: de quem, quanto entrou e quando, como vai devolver. A prévia mostra o que nasce em A pagar e o custo do empréstimo antes de gravar. Os textos de ajuda (sócio, retirada, aporte) ficam num “Veja a diferença” que abre e fecha.', [
        ('em-registrar', 'Janela aberta', 'Vazia, com “Banco ou financeira” e “Em parcelas” marcados. A ajuda “Empréstimo, retirada ou aporte?” vem aberta na primeira vez. O valor do contrato fica em “Mais detalhes”.'),
        ('em-registrar-parcelas', 'Em parcelas, com a prévia', 'Sicredi: entraram R$ 12.500,00 em 10/11. “14 parcelas de R$ 1.250,00 · de 10/12/2026 a 10/01/2028 · custo do empréstimo R$ 5.000,00”, com IOF e tarifas de R$ 370,00. A lista abre com o valor de cada parcela editável.'),
        ('em-registrar-antigo', 'Empréstimo anterior ao T3jus', 'Pronampe da Caixa, de 06/2024. O aviso diz que não soma no saldo (já está no saldo de abertura). A próxima parcela posta é de 2024, então a janela pergunta se as parcelas até outubro de 2026 já foram pagas e sugere 28, sem deixar nenhuma vencida.'),
        ('em-registrar-livre', 'Sócio, devolve quando der', 'Felipe Matos pôs R$ 5.000,00. Nenhuma parcela nasce: a janela diz que cada devolução se registra na ficha e que o falta devolver começa em R$ 5.000,00, sem juros.'),
        ('em-registrar-erros', 'Erros de campo', 'Nome e valor em branco e a próxima parcela antes do dia em que o dinheiro entrou. Resumo no topo, cada erro preso ao campo, foco no primeiro. A prévia espera os números certos.'),
        ('em-registrar-falha', 'Falha do servidor', 'Nada foi salvo, o saldo e A pagar não mudaram, tudo o que foi digitado continua na janela, e há o código para o suporte.'),
        ('em-registrado', 'Registrado', 'Aviso: “As 14 parcelas já estão em A pagar.” O Sicredi entra no alto da folha com o selo “Novo”; o saldo sobe R$ 12.500,00 e a coluna Empréstimos de novembro também.'),
    ]),
    ('T3 · Ficha do empréstimo', 'Página própria (Financeiro › Caixa › nome), no molde da ficha de contrato aprovada: no vinho, quem emprestou e para quê; ao lado, numa folha clara (sem âmbar), o falta pagar e a próxima ação. Embaixo, os quatro números, as parcelas, os dados e o histórico. No pé, a saída certa para cada caso.', [
        ('em-ficha', 'Em parcelas, anterior ao T3jus', 'Banco do Brasil: 40 parcelas de R$ 2.090,00, 16 pagas antes do T3jus (uma linha só, com o valor estimado), 2 pagas aqui (uma sem comprovante, com “Anexar”) e a 19/40 vencendo sexta, com “Marcar paga”. Custo R$ 23.600,00. A nota explica a diferença entre falta pagar e saldo devedor do banco.'),
        ('em-ficha-livre', 'Sem parcelas fixas', 'Marina Ribeiro, sócia: entrou R$ 8.000,00, devolvido R$ 2.500,00 em duas vezes, falta devolver R$ 5.500,00, sem juros. “Registrar devolução” no alto e na folha.'),
        ('em-devolucao', 'Registrar devolução', 'R$ 6.000,00, acima do que falta: o aviso diz que os R$ 500,00 a mais ficam como juros pagos à sócia e que o empréstimo fica quitado.'),
        ('em-devolucao-erros', 'Devolução com erros', 'Valor em branco e data depois de hoje. A ajuda da data já diz o intervalo aceito (de 12/09/2026 até hoje).'),
        ('em-devolucao-falha', 'Devolução com falha', 'Nada foi salvo; o preenchido continua; código para o suporte.'),
        ('em-encerrar', 'Encerrar as parcelas que faltam', 'Sicoob, com 1 parcela paga. A janela (alertdialog) diz o que é cancelado (23 parcelas, R$ 33.350,00) e o que fica (o que entrou e o que foi pago), pede o motivo e lembra os três usos: quitar antes, renegociar, erro descoberto depois de pagar.'),
        ('em-encerrado', 'Encerrado', 'Só leitura: o motivo no alto, as parcelas canceladas riscadas, o falta pagar em R$ 0,00 e a linha nova no histórico. Sai da folha do Caixa.'),
        ('em-cancelar', 'Lançado errado', 'Sicredi, sem nada pago. A janela diz que sai do saldo (que volta a R$ 70.180,00), da exportação e de A pagar, e pede o motivo.'),
        ('em-cancelado', 'Cancelado', 'Só leitura: “Fora do caixa”, o motivo, as 14 parcelas canceladas e o histórico.'),
    ]),
    ('T4 · A pagar', 'A parcela entra na lista como qualquer conta, com o selo “Empréstimo · 19/40” que leva à ficha. Nas saídas por categoria, os empréstimos ficam abaixo de um divisor, fora do total.', [
        ('em-pagar', 'A pagar com a parcela', 'A 19/40 do Banco do Brasil vence sexta, entre as contas da semana (que passam a 6, “1 de empréstimo”). “Empréstimos (à parte)”, R$ 5.040,00, fica sob o divisor tracejado, em listras, fora dos R$ 40.900,00.'),
        ('em-nova-conta', 'Lançar conta', 'A categoria Empréstimos sai da lista. A ajuda: “Parcela de empréstimo? Registre o empréstimo no Caixa e as parcelas nascem sozinhas.”, com o caminho.'),
    ]),
    ('T5 · Exportar para o contador', 'A janela aprovada ganha uma linha, sem campo novo.', [
        ('em-exportar', 'Exportar outubro', '“Empréstimos numa aba à parte: 1 recebido (R$ 30.000,00) e 2 pagamentos (R$ 3.090,00): 1 parcela e 1 devolução, 1 sem comprovante.” O saldo do começo e do fim do mês já conta os empréstimos.'),
    ]),
]

casos = [{'nome': n, 'url': U + n} for _, _, est in SECOES for n, _, _ in est]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

blocos = ''
for titulo, txt, est in SECOES:
    cards = ''
    for n, rot, nota in est:
        cards += (f'<article class="caso" id="{n}"><header><h3>{H(rot)}</h3><code>{n}</code></header><p>{H(nota)}</p>'
                  f'<div class="fotos"><a class="pc" href="{U}{n}" title="Abrir o HTML neste estado"><img src="{n}-computador.png" alt="{H(rot)}, no computador" loading="lazy"></a>'
                  f'<a class="cel" href="{U}{n}" title="Abrir o HTML neste estado"><img src="{n}-celular.png" alt="{H(rot)}, no celular" loading="lazy"></a></div></article>')
    blocos += f'<section class="secao"><h2>{H(titulo)}</h2><p class="lede">{H(txt)}</p>{cards}</section>'

idx = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Empréstimos · Financeiro do Portal</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--vinho-2:#87335B;--vinho-4:#AC788D;--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--texto-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.55 Poppins,system-ui,sans-serif}}
header.topo{{background:var(--vinho);color:var(--sal);padding:32px 48px 28px}}
header.topo p.sobre{{margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90}}
header.topo h1{{margin:6px 0 8px;font:500 44px/1.05 Alegreya,Georgia,serif;color:#fff}}
header.topo p{{margin:0;max-width:900px;color:var(--sal)}}
header.topo a{{color:#fff}}
main{{padding:24px 48px 64px;display:grid;gap:40px}}
.regras{{background:var(--papel);border:1px solid #EBDDD5;border-radius:16px;padding:18px 22px}}
.regras h2{{margin:0 0 6px;font:500 22px Alegreya,Georgia,serif;color:var(--vinho)}}
.regras ul{{margin:0;padding-left:20px}}
.secao>h2{{margin:0;font:500 32px/1.1 Alegreya,Georgia,serif;color:var(--vinho)}}
.secao>.lede{{margin:6px 0 18px;max-width:980px;color:var(--texto-2)}}
.caso{{background:var(--papel);border:1px solid #EBDDD5;border-radius:16px;padding:18px 20px 20px;margin-bottom:20px}}
.caso header{{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}}
.caso h3{{margin:0;font:500 22px Alegreya,Georgia,serif;color:var(--vinho)}}
.caso code{{font-size:12px;color:var(--texto-2);background:var(--sal-2);padding:2px 8px;border-radius:10px}}
.caso>p{{margin:4px 0 14px;max-width:1000px}}
.fotos{{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:start}}
.fotos a{{display:block;border:1px solid #EBDDD5;border-radius:10px;overflow:hidden;background:var(--sal)}}
.fotos img{{display:block;width:100%;height:auto}}
.fotos .pc{{max-height:900px;overflow:auto}}
.fotos .cel{{max-height:900px;overflow:auto}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px}}
@media (max-width:760px){{header.topo{{padding:24px 16px}}header.topo h1{{font-size:32px}}main{{padding:16px}}.fotos{{grid-template-columns:1fr}}.fotos .cel{{max-width:280px}}}}
</style>
</head>
<body>
<header class="topo"><p class="sobre">T3jus · Portal · Financeiro · F3.51 (FI-20)</p><h1>Empréstimos</h1>
<p>Desenho para a Carol aprovar. {len(casos)} estados, cada um no computador (1440) e no celular (412). Clique numa imagem para abrir o HTML naquele estado (<a href="emprestimos.html">emprestimos.html</a>). Decisões e perguntas em NOTAS.md.</p></header>
<main>
<section class="regras" aria-labelledby="t-regras"><h2 id="t-regras">A regra visual</h2><ul>
<li>Empréstimo fica <b>à parte</b>, mas não é de terceiros: nunca usa o âmbar. Tudo dele é areia e vinho, com o ícone das duas setas e a frase “entra no saldo, mas não é receita”.</li>
<li>O dinheiro emprestado entra no saldo do Caixa. As parcelas e devoluções saem com a categoria Empréstimos, fora das despesas e fora do Resumo.</li>
<li>“Falta pagar”, nunca “saldo devedor”: este nome fica para o número do banco, e a ficha explica a diferença.</li>
<li>Nada se apaga: “Lançado errado” (sem nada pago) e “Encerrar as parcelas que faltam” (com algo pago), sempre com motivo e histórico.</li></ul></section>
{blocos}
</main>
</body>
</html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(idx)
print('casos ok', len(casos))
