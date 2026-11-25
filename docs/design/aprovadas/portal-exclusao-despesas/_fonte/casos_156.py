# Lista dos estados (capturas) e o index.html com as capturas e a legenda.
# Mesmo formato do casos_155.py aprovado. Uso: python3 casos_156.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'exclusao.html?estado='

SECOES = [
    ('1. A despesa adiantada e os arquivos que ficam', 'Quando o cliente tem despesa adiantada pelo escritório, a descrição dela é trocada na exclusão, e a nota, a guia, o boleto ou o comprovante ficam guardados pela lei fiscal até o prazo acabar. A janela passa a dizer isso em dois lugares: uma linha em “O que é apagado” e um quadro “O que a lei obriga a guardar”, que só aparece quando há arquivo. A frase em negrito da faixa do escudo muda junto. O contorno tracejado em âmbar é só do desenho, para achar o que é novo. O resto é a janela aprovada da F3.155. F3.156, PT-11.', [
        ('despesa-nenhuma', U + 'despesa-nenhuma', 'Cliente sem despesa adiantada',
         'Nada muda. A janela é a aprovada da F3.155 (estado com os arquivos do cliente), letra por letra; o gerador confere. “O que fica, sem dado pessoal” e “Nada aqui precisa ser guardado por lei.” continuam verdade.'),
        ('despesa-paga-nota', U + 'despesa-paga-nota', 'Uma despesa paga, com nota fiscal (aprovado)',
         'Em “O que é apagado”: “A descrição da despesa adiantada”, que vira “Despesa adiantada a cliente excluído”. Abaixo de “O que fica, sem dado pessoal”, que não muda, entra o quadro âmbar “O que a lei obriga a guardar” com “O arquivo da despesa adiantada” e a data em que o T3jus apaga: 01/01/2033 (paga em 2026). A faixa do escudo passa a dizer “Fora esse arquivo, nada aqui precisa ser guardado por lei.”'),
        ('despesa-em-aberto', U + 'despesa-em-aberto', 'Duas despesas, uma ainda em aberto',
         'Cada despesa tem um arquivo. Como uma delas não foi paga, ainda não há data de saída: “Enquanto houver despesa em aberto, não há data: o T3jus apaga sozinho em 1º de janeiro do 7º ano depois do pagamento.” Tudo no plural.'),
        ('despesa-pasta-contador', U + 'despesa-pasta-contador', 'Despesa que já foi numa pasta do contador',
         'A despesa tem nota e comprovante e entrou na pasta de março mandada ao contador. O quadro ganha “A pasta mandada ao contador”: ela fica como foi montada, com a descrição antiga no nome dos arquivos. A cópia do T3jus sai pela regra do mês da pasta; a que o contador recebeu fica fora do T3jus.'),
        ('despesa-sem-arquivo', U + 'despesa-sem-arquivo', 'Despesa sem nenhum arquivo',
         'Só a linha da descrição em “O que é apagado”. Sem arquivo, nada fica guardado pela lei: o quadro não aparece, e o título e a faixa do escudo ficam como os aprovados.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_156.json'), 'w'), ensure_ascii=False, indent=1)

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
<title>Exclusão: despesa adiantada · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · aprovado pela Carol em 24/11/2026 (alternativa A)</p><h1>Exclusão: a despesa adiantada ao cliente</h1>
<p>F3.156. A janela de exclusão a pedido do titular (desenho aprovado em portal-exclusao-arquivos) passa a dizer o que acontece com a despesa que o escritório adiantou ao cliente: a descrição é trocada, e a nota, a guia, o boleto ou o comprovante ficam guardados pela lei fiscal até o prazo acabar. Só a sócia dona abre a janela, então só ela recebe a contagem. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. O texto de cada variante e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Os estados</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
