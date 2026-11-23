# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda. Mesmo casos.py das sobras aprovadas; mudam os estados,
# os textos e o arquivo de cada estado (são três HTML: juridico, lembretes e cliente).
# Uso: python3 casos.py <pasta-saida>
# "alto": altura da janela do computador na captura, para as janelas longas aparecerem inteiras.
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

SECOES = [
    ('1. Registrar o resultado do caso que veio encerrado', 'Na ficha aprovada do encerrado importado, o botão “Registrar o resultado” abre a janela. Reusa o fieldset Resultado e o campo Motivo aprovados da mudança de etapa do Jurídico. Sem valor, sem êxito e sem aviso ao cliente. P2 do plano 2.', [
        ('juridico.html', 'resultado', 'A janela “Registrar o resultado”', 'Resultado (ganho, perda ou acordo), Motivo obrigatório (3 a 1.000 caracteres) e o que acontece: entra nas contas, não avisa o cliente, não pede acerto, fica no histórico.', 1250),
        ('juridico.html', 'resultado-erro', 'Faltou o resultado e o motivo está curto', 'O resumo no topo, os dois erros presos aos campos e o foco no primeiro. Diz que nada foi registrado.', 1350),
        ('juridico.html', 'resultado-feito', 'A ficha depois de registrar', 'O aviso de sucesso, o selo “Veio encerrado” dá lugar ao resultado, a folha Resultado diz quem registrou e Mudanças de etapa ganha a linha nova. A linha da importação fica.', 0),
        ('juridico.html', 'encerrados-desfeitos', 'Encerrados com a importação desfeita', 'A contagem diz os três grupos, e o caso de importação desfeita leva o Selo neutro “Importação desfeita”. P12.', 0),
    ]),
    ('2. Dispensar e trazer de volta: os textos que faltavam', 'Na janela aprovada de dispensar e na lista aprovada dos lembretes. P5, P6 e P7 do plano 2.', [
        ('lembretes.html', 'dispensar-sem-motivo', 'Dispensar sem escolher o motivo', 'O resumo no topo e o erro no grupo de motivos, com o foco na primeira opção. O lembrete continua aberto.', 1300),
        ('lembretes.html', 'ja-dispensado', 'Alguém já tinha dispensado', 'O mesmo corpo e o botão único do conflito aprovado, com o texto de quem dispensou e quando. Nada mudou.', 0),
        ('lembretes.html', 'trazido', 'Trazido de volta', 'O aviso diz que o lembrete voltou para Abertos; a linha sai de Dispensados e os números mudam.', 0),
        ('lembretes.html', 'trazido-resolvido', 'Trazido de volta, já resolvido', 'Um contrato do cliente nasceu enquanto o lembrete estava dispensado: ele volta direto para Viraram contrato.', 0),
        ('lembretes.html', 'busca-vazia-viraram', 'Busca vazia fora de Abertos', 'A busca vale no grupo atual e a Ordem some fora de Abertos. O texto diz onde a busca olhou e como procurar nos outros grupos.', 0),
    ]),
    ('3. Cliente atendido', 'O cliente cujo único caso veio encerrado, depois de registrar o resultado (decisão 2). Na ficha ligada aprovada da jornada.', [
        ('cliente.html', 'cliente-atendido', 'Ficha de Renata: “Cliente atendido”', '“Queiroz x Construtora Lume: ganho, veio encerrado do Astrea.”, sem “Tudo acertado” e sem os passos do fechamento, que não se aplicam. “Gerar proposta” como secundário e “Ver o caso”.', 0),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for arq, nome, t, leg, alto in itens:
        casos.append({'nome': nome, 'url': arq + '?estado=' + nome, 'alto': alto, 'titulo': t, 'legenda': leg})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)


def montar(img):
    """img(nome, tam) devolve o src da captura."""
    corpo = ''
    for n, (titulo, sub, itens) in enumerate(SECOES, 1):
        corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
        for arq, nome, t, leg, _ in itens:
            url = arq + '?estado=' + nome
            figs = ''
            for tam in ['computador', 'celular']:
                figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{img(nome, tam)}" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                         f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
            corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                      f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
        corpo += '</section>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sobras da importação, rodada 2</title>
<meta name="description" content="Rodada curta sobre o desenho aprovado das sobras da importação: registrar o resultado do caso que veio encerrado, os textos de dispensar e trazer de volta, a busca fora de Abertos, os Encerrados com a importação desfeita e o Cliente atendido, em computador e celular, para a Carol aprovar.">
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
</style>
</head><body>
<header><p class="sobre">T3jus · Portal do advogado · rodada curta · para aprovação da Carol</p><h1>Sobras da importação: rodada 2</h1>
<p>Só o que o plano 2 deixou sem desenho, por cima do desenho aprovado das sobras da importação (lembretes de contrato e caso importado), que não muda: a janela “Registrar o resultado” do caso que veio encerrado, “Escolha o motivo.” e o “já dispensou” ao dispensar, os avisos de “Trazer de volta”, a busca vazia fora de Abertos, os Encerrados com a importação desfeita e o “Cliente atendido”. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Os textos finais e as decisões estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Registrar o resultado</a><a href="#s2">Dispensar e trazer de volta</a><a href="#s3">Cliente atendido</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(lambda n, t: f'{n}-{t}.webp'))
    print(len(casos), 'casos')
