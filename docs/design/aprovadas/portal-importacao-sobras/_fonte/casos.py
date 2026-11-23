# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda. Mesmo casos.py da importação aprovada; mudam os estados,
# os textos e o arquivo de cada estado (são três HTML: lembretes, dispensar e caso-importado).
# Uso: python3 casos.py <pasta-saida>
# "alto": altura da janela do computador na captura, para as janelas longas aparecerem inteiras.
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

SECOES = [
    ('1. A lista dos lembretes de contrato', 'Mora em Contratos › Contratos, ao lado de “Novo contrato”, porque a ação dela é criar o contrato. É para onde leva o “Ver lembretes” do resultado da importação. F3.56.', [
        ('lembretes.html', 'lista', 'Lembretes abertos', 'Cada cliente (e caso) com valor em aberto no Astrea, os lançamentos e as ações: Criar o contrato (principal) e Dispensar. Os três números no alto são os filtros: abertos, viraram contrato e dispensados. Ao lado, de onde vieram e como funciona.', 0),
        ('lembretes.html', 'entrada', 'Por onde se chega, em Contratos', 'A lista de contratos aprovada ganha uma faixa enquanto houver lembrete aberto, com “Ver os lembretes”. Some quando não sobra nenhum.', 0),
        ('lembretes.html', 'viraram', 'Viraram contrato', 'O lembrete sai sozinho quando um contrato do cliente é criado. Fica aqui com o número do contrato, quem criou e quando.', 0),
        ('lembretes.html', 'dispensados', 'Dispensados', 'O motivo, o detalhe, quem dispensou e quando, e “Trazer de volta”, sem prazo.', 0),
        ('lembretes.html', 'busca-vazia', 'Busca sem resultado', 'Diz o que procurou, onde a busca olha e oferece limpar.', 0),
        ('lembretes.html', 'vazio', 'Nenhum lembrete aberto', 'Todos viraram contrato ou foram dispensados. Os números continuam levando aos dois grupos.', 0),
        ('lembretes.html', 'carregando', 'Carregando', 'Esqueleto das linhas e dos números, com a busca ocupada (aria-busy).', 0),
        ('lembretes.html', 'erro', 'Erro ao carregar', 'O que houve, o que continua igual e o que fazer, no tom aprovado.', 0),
    ]),
    ('2. Dispensar um lembrete à mão', 'Para o valor que o escritório não vai cobrar: já negociado ou recebido fora, perdoado ou já em outro contrato. Pede o motivo, não mexe no histórico do Astrea e dá para trazer de volta.', [
        ('dispensar.html', 'dispensar', 'Dispensar, pela lista', 'Janela de confirmação (alertdialog, showModal) com o lembrete, o motivo obrigatório em quatro opções, o detalhe e o que acontece.', 1150),
        ('dispensar.html', 'dispensar-erro', 'Faltou o motivo', '“Outro motivo” sem o texto: o erro no topo e no campo, que recebe o foco. O lembrete continua aberto.', 1250),
        ('dispensar.html', 'dispensar-conflito', 'Alguém criou o contrato antes', 'Enquanto a janela estava aberta, o contrato foi criado e o lembrete saiu sozinho. Nada foi dispensado.', 0),
        ('dispensar.html', 'dispensado', 'Dispensado', 'O aviso com Desfazer, o lembrete fora da lista e os números atualizados.', 0),
        ('dispensar.html', 'dispensados-hoje', 'Em Dispensados', 'O de hoje no alto, com o motivo e “Trazer de volta”.', 0),
        ('dispensar.html', 'ficha', 'Na ficha do cliente: “Do Astrea”', 'A folha aprovada no código, com o lembrete e as duas ações: Criar o contrato e Dispensar. Embaixo, o pago antes do T3jus e os lançamentos.', 0),
        ('dispensar.html', 'ficha-dispensar', 'Dispensar, pela ficha', 'A mesma janela, aberta da ficha.', 1150),
        ('dispensar.html', 'ficha-dispensado', 'Na ficha, depois de dispensar', 'O lembrete sai; fica uma linha discreta com quem dispensou, o motivo e o link para Dispensados. Os lançamentos não mudam.', 0),
    ]),
    ('3. O caso que veio de outro sistema, no Jurídico', 'A ficha do caso aprovada ganha a linha “Veio da importação”, logo abaixo do cabeçalho. O caso importado como encerrado fica em Encerrados, sem resultado e sem acerto, com selo próprio.', [
        ('caso-importado.html', 'caso-importado', 'Caso importado do Astrea', 'Origem (Astrea · backup), data e hora, quem importou, a etapa no Astrea e a ligada, a linha do backup e o link para o resultado. Sem contrato, sem prazo, nenhum aviso ao cliente.', 0),
        ('caso-importado.html', 'caso-advbox', 'Caso importado do ADVBOX', 'A mesma linha com o selo “ADVBOX · planilha” e o número do registro lá.', 0),
        ('caso-importado.html', 'encerrados', 'Encerrados, com os que vieram encerrados', 'A coluna Resultado vira “Como encerrou”: resultado e acerto, ou “Veio encerrado” com a data do arquivamento e o selo da origem. Filtro “Como encerrou”.', 0),
        ('caso-importado.html', 'encerrado-importado', 'Ficha do caso que veio encerrado', 'Etapa 8 de 8 sem botão, o selo “Veio encerrado”, a linha da importação e a folha Resultado: sem resultado, fora das contas, sem acerto; dá para registrar.', 0),
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
<title>Lembretes e caso importado · T3jus</title>
<meta name="description" content="O que faltava no desenho da importação do Astrea e do ADVBOX: a lista dos lembretes de contrato, dispensar um lembrete e o caso importado no Jurídico, em computador e celular, para a Carol aprovar.">
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Importação: lembretes de contrato e caso importado</h1>
<p>O que faltava no desenho aprovado da importação do Astrea e do ADVBOX (F3.56, VA-05), que não muda. A lista dos lembretes de contrato, para onde leva o “Ver lembretes” do resultado; dispensar um lembrete à mão, na lista e na ficha do cliente; e, no Jurídico, a linha “Veio da importação” na ficha do caso e o caso que veio encerrado. Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Lista dos lembretes</a><a href="#s2">Dispensar</a><a href="#s3">Caso importado</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(lambda n, t: f'{n}-{t}.webp'))
    print(len(casos), 'casos')
