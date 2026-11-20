# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'relatorios.html?estado='

SECOES = [
    ('1. Visão geral', 'Um período inteiro, comparado com o anterior. Padrão: últimos 3 meses (01/09 a 18/11/2026), contra junho a agosto. IN-02 a IN-05, IN-07, IN-09, IN-12, IN-14, FI-06, FI-07.', [
        ('visao', U + 'visao', 'Visão geral do período (sócia dona)', 'Seletor de período (Este mês, Últimos 3 meses, Este ano, Escolher datas) e "Como contamos" aberto. Os três números no campo vinho: Entrou, Falta receber e Rendeu, cada um com a comparação escrita. Entrou mês a mês, com o previsto que falta de novembro e o período anterior; maiores clientes e áreas, cada um levando ao detalhe; falta receber por idade, com RPV e precatório à parte; a conta do Rendeu; e, numa folha âmbar à parte, o que passou pelo escritório de terceiros.'),
    ]),
    ('2. Por cliente', 'Quanto rendeu cada cliente, e o relatório de um cliente por dentro. IN-02 a IN-04, FI-07.', [
        ('clientes', U + 'clientes', 'Por cliente', 'Tabela com contratado, entrou, falta receber (vencido com selo escrito e RPV ou precatório à parte), despesas não reembolsadas e rendeu. Busca, ordenação e área; total no pé igual ao Entrou do período. No celular, cartões.'),
        ('cliente', U + 'cliente', 'Relatório de um cliente (Construtora Vale Alto)', 'Cabeçalho da ficha aprovada, com o atraso no âmbar e o caminho para A receber. Os quatro números, os contratos e casos (com a área), o que entrou mês a mês, o que falta, o que foi adiantado e voltou, e o alvará que passou e foi repassado, à parte.'),
    ]),
    ('3. Por área e por responsável', 'Receita e casos por área do direito e por responsável, com a carga de cada pessoa. IN-08, IN-12.', [
        ('areas', U + 'areas', 'Por área do direito', 'Barras de cada área contra junho a agosto, com o valor escrito, e a leitura do que mudou. Tabela com casos no período, entrou, falta receber, rendeu e rendeu por caso, incluindo "Sem caso ligado".'),
        ('responsaveis', U + 'responsaveis', 'Por responsável', 'Entrou por pessoa, carga (casos e contratos sem caso), falta receber, despesas e rendeu. Lembra que o número não é a parte de cada um (FI-11 em validação).'),
    ]),
    ('4. Janelas', 'Escolher o período e baixar o relatório aberto.', [
        ('periodo', U + 'periodo', 'Escolher datas', 'Atalhos, De e Até em dd/mm/aaaa, e com o que comparar (período anterior, mesmo período do ano passado ou não comparar).'),
        ('periodo-erro', U + 'periodo-erro', 'Escolher datas · erros', 'Dia que não existe e data final antes da inicial. Resumo no topo e cada erro preso ao campo, dizendo o que fazer; o relatório continua no período anterior.'),
        ('exportar', U + 'exportar', 'Exportar o relatório', 'Planilha ou PDF do relatório aberto, com o período e o que vai no arquivo. Terceiros numa aba à parte, que não soma com as outras.'),
    ]),
    ('5. Estados', 'Primeiro uso, carregando, erro e quem não é a sócia dona.', [
        ('vazio', U + 'vazio', 'Escritório novo, sem recebimento', 'Diz o que precisa existir (contratos, caso ligado, recebimentos) e leva a Contratos, Jurídico e A receber. Nenhum número inventado.'),
        ('carregando', U + 'carregando', 'Carregando', 'Esqueleto com aria-busy e aviso para leitor de tela. O período e as visões já aparecem.'),
        ('erro', U + 'erro', 'Erro', 'Tentar de novo, o caminho alternativo (A receber) e o código para o suporte.'),
        ('sem-acesso', U + 'sem-acesso', 'Bianca (Financeiro, não é dona)', 'A barra do Financeiro dela não tem Relatórios. Se abrir o endereço direto, uma mensagem calma diz que só a sócia dona abre os relatórios e que é ela quem decide; leva ao Resumo e ao Caixa.'),
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
<title>Portal · Relatórios do sócio · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: Relatórios do sócio</h1>
<p>A 6ª seção do Financeiro, só para a sócia dona: quanto entrou, quanto falta receber e quanto rendeu num período, comparado com o anterior, por cliente, por área do direito e por responsável. Dinheiro de terceiros fica numa folha âmbar à parte e nunca soma. Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Visão geral</a><a href="#s2">Por cliente</a><a href="#s3">Área e responsável</a><a href="#s4">Janelas</a><a href="#s5">Estados</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
