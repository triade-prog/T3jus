# Lista dos estados (capturas) e o index.html com as capturas e a legenda.
# Mesmo formato do casos_pd.py aprovado. Uso: python3 casos_155.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'exclusao.html?estado='

SECOES = [
    ('1. A linha nova de “O que é apagado”', 'Na exclusão, o T3jus agora apaga também os arquivos do cliente: os documentos pessoais, o termo de curatela ou de tutela e o Word das propostas. A janela passa a dizer isso numa linha só, logo depois de “Nome, CPF, RG e a qualificação”. Ela só aparece quando há arquivo. O contorno tracejado em âmbar é só do desenho, para achar a linha nova. O resto da janela é o aprovado, sem mudança. F3.155, PT-11.', [
        ('excluir-arquivos', U + 'excluir-arquivos', 'Pessoa física com os três tipos de arquivo',
         'Antônia tem 3 documentos pessoais, o termo de curatela e 1 proposta: “Os 3 documentos pessoais, o termo de curatela e o arquivo Word da proposta”, com “os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos.” “O que fica” não muda (recomendado).'),
        ('excluir-um-documento', U + 'excluir-um-documento', 'Só 1 documento pessoal',
         'Tudo no singular: “O documento pessoal”, com “o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo.”'),
        ('excluir-pj-propostas', U + 'excluir-pj-propostas', 'Pessoa jurídica com 2 propostas, sem documentos',
         'A Construtora Vale Alto (ficha PJ aprovada): “Os arquivos Word das 2 propostas”. As propostas continuam no Comercial; sai o arquivo. Os outros textos da janela são os do código de hoje para pessoa jurídica.'),
        ('excluir-tutela', U + 'excluir-tutela', 'Menor sob tutela',
         'Laura, menor, com 2 documentos e o termo de tutela: “Os 2 documentos pessoais e o termo de tutela”. A ficha ao fundo é a aprovada, com outro nome: só a janela está em revisão.'),
        ('excluir-sem-arquivos', U + 'excluir-sem-arquivos', 'Sem nenhum arquivo',
         'A linha não aparece. A janela fica igual à aprovada, letra por letra (o gerador confere).'),
    ]),
    ('2. Alternativa para comparar (não recomendada)', 'Se a Carol preferir que “o que fica” dos arquivos apareça na coluna “O que fica”, como já acontece com os atendimentos.', [
        ('excluir-alternativa-fica', U + 'excluir-alternativa-fica', 'Alternativa B: uma linha também em “O que fica”',
         'Em “O que é apagado”, a linha diz só “os arquivos são apagados do T3jus”. Em “O que fica”, entra “Que os arquivos existiram”, com “tipo, tamanho e datas de cada um, sem o nome do arquivo”. Fica mais simétrico, mas divide uma ideia em dois lugares e alonga a janela no celular.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_155.json'), 'w'), ensure_ascii=False, indent=1)

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
<title>Exclusão: arquivos do cliente · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Exclusão: os arquivos do cliente</h1>
<p>F3.155. A janela de exclusão a pedido do titular (desenho aprovado em portal-clientes-pendencias) ganha uma linha em “O que é apagado” com os documentos pessoais, o termo de curatela ou de tutela e o Word das propostas. Só a sócia dona abre a janela, então só ela recebe a contagem. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. O texto de cada variante e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">A linha nova</a><a href="#s2">Alternativa B</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
