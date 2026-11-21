# Lista dos estados (capturas) e o index.html do pacote "Não foi paga" e "Logo no carnê e no recibo".
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
N = 'contrato-nao-paga.html?estado='
FN = 'financeiro-nao-paga.html?estado='
E = 'escritorio-logo.html?estado='
CA = 'carne-logo-a4.html?estado='
RA = 'recibo-logo-a4.html?estado='

SECOES = [
    ('A. “Não foi paga” no Pago antes do T3jus', 'F3.84 · VA-05. Na ficha do contrato de Rosa Almeida (importado da planilha), aba Recebimentos, cada parcela paga antes do T3jus ganha o botão “Não foi paga”, só para quem tem Financeiro. A parcela passa para A receber sem desfazer a importação, com motivo obrigatório e no histórico. Desfazer a importação inteira continua até 24/11.', [
        ('np-folha', N + 'folha', 'A folha com o botão em cada parcela', 'Marina Ribeiro, sócia dona, com Financeiro. Cada linha de “Pago antes do T3jus” tem “Não foi paga”. Embaixo, os dois caminhos: uma parcela (o botão) ou a planilha inteira (desfazer a importação, até 24/11, com “Ver a importação” e “Desfazer a importação”).'),
        ('np-janela', N + 'janela', 'A janela de confirmação', 'A parcela, o que vai acontecer (sai da folha, entra em A receber, o programado passa a R$ 4.000,00, a cobrança fica com Marina, a importação não muda), o vencimento (recomendado: manter 10/11/2026; ou outra data combinada), o motivo obrigatório e o aviso de que nenhum aviso automático sai para Rosa.'),
        ('np-erros', N + 'erros', 'Sem o motivo', 'Resumo no topo e o erro preso ao campo, com o foco nele. O botão nunca fica desabilitado.'),
        ('np-falha', N + 'falha', 'Falha do servidor', 'Nada mudou: a parcela continua em “Pago antes do T3jus” e o que se escreveu fica na janela. “Tentar de novo” e o código para o suporte.'),
        ('np-conflito', N + 'conflito', 'Outra pessoa mexeu antes', 'Diego Almeida passou a mesma parcela para A receber às 10h13, enquanto a janela de Marina estava aberta (desde 10h11). Diz quem, a hora e como ficou. Nada é gravado duas vezes; “Ver como ficou” recarrega a ficha.'),
        ('np-feito', N + 'feito', 'Depois: a parcela em A receber', 'A parcela 2 sai da folha (agora 1 parcela, R$ 800,00) e entra na programação como “Vencida há 8 dias”, com “Era paga antes do T3jus até hoje” e o botão “Foi paga, sim”. Totais: programado R$ 4.000,00, aba Recebimentos 5, cabeçalho “Recebimento em atraso”. O histórico dos recebimentos mostra quem, quando e o motivo.'),
        ('np-voltar', N + 'voltar', '“Foi paga, sim”: voltar atrás', 'Enquanto nada foi feito na parcela em A receber (nenhum recebimento, carnê ou cobrança enviada), ela pode voltar para “Pago antes do T3jus”, com motivo. As duas mudanças ficam no histórico.'),
        ('np-sem-financeiro', N + 'sem-financeiro', 'Quem não tem Financeiro (Felipe)', 'Felipe Matos tem Contratos e não tem Financeiro: vê a folha como aprovada, sem o botão, e o texto diz quem pode fazer a mudança.'),
        ('np-a-receber', FN + 'a-receber', 'A parcela em Financeiro › A receber', 'Rosa Almeida entra em Vencidas (agora 5, R$ 7.850,00), na ordem do vencimento, com “Vencida há 8 dias”, a marca “Era paga antes do T3jus”, o motivo e a próxima ação com Marina. “Sem aviso automático” na cobrança.'),
    ]),
    ('B. Logo do escritório: Escritório › Recebimento', 'F3.81 e o resto do F3.19 · FI-23 e FI-14. A folha aprovada “Marca no carnê” vira “Marca e timbrado”: nome em letra ou logo, o envio do logo com a conferência para impressão (corte da margem, tamanho, contraste com o papel, preto e branco), a prévia do carnê e do recibo e o registro da sociedade na OAB, que o Escritório ainda não guarda. Só a sócia dona muda.', [
        ('lg-escolher', E + 'escolher', 'Escolher o logo, antes de enviar', 'Marina marcou “O logo do escritório”. A área de soltar diz o que vale (PNG, JPG ou SVG, até 1 MB) e como o T3jus confere. A prévia mostra como sai hoje, com o nome em letra. O registro da sociedade na OAB está vazio.'),
        ('lg-largo', E + 'largo', 'Logo largo enviado: passa', 'logo-ribeiro-matos.png, 1800 × 420 px. A conferência corta a margem vazia (fica 1425 × 366 px), mede o contraste da parte mais clara com o papel (5,0:1) e mostra o carnê e o recibo em cores e em preto e branco. “Trocar o logo”, “Ver o carnê inteiro” e “Ver o recibo inteiro”.'),
        ('lg-quadrado', E + 'quadrado', 'Logo quadrado: com o nome ao lado', 'Monograma 800 × 800 px. Passa na conferência (11,4:1), e o padrão vira “O logo e o nome ao lado”, porque um logo quadrado na altura do carnê fica pequeno e não diz o nome.'),
        ('lg-claro', E + 'claro', 'Logo claro demais: não salva', 'Ouro muito claro, 1,2:1 contra o papel. Ao salvar, o resto da página é salvo e a marca não: o aviso diz por quê e o grupo “Como imprimir o logo” mostra o erro. Saídas: “Em uma cor só, na cor da tinta” (com a prévia), outro arquivo ou o nome em letra.'),
        ('lg-recusa', E + 'recusa', 'Arquivo recusado', '“logo-whatsapp.jpg” tem 240 × 80 px e sairia borrado. A mensagem diz o motivo e o que fazer. Embaixo, os outros motivos de recusa, cada um com a frase que aparece.'),
        ('lg-salvo', E + 'salvo', 'Marca salva', 'Aviso de sucesso: os próximos carnês e recibos saem com o logo; os já emitidos ficam como saíram. O histórico ganha a linha com o arquivo, o tamanho, o contraste e o registro na OAB. Aparecem “Trocar o logo” e “Remover o logo”.'),
        ('lg-remover', E + 'remover', 'Remover o logo', 'Confirmação (alertdialog): volta o nome em letra, o arquivo fica guardado no histórico, e carnês e recibos já emitidos não mudam. O foco vai para “Voltar”.'),
        ('lg-letra', E + 'letra', 'Depois de remover: nome em letra', 'A folha volta ao nome em letra. O registro na OAB, se preenchido, continua valendo no timbrado.'),
        ('lg-equipe', E + 'equipe', 'Quem não é a sócia dona (Diego)', 'Diego Almeida vê a página só para ler: a marca em uso (o logo, com a prévia) e o registro na OAB, sem botões.'),
    ]),
    ('C. O carnê e o recibo com o logo, em A4', 'Os modelos aprovados, sem outra mudança: o logo entra no lugar do nome em letra, na via do cliente e na capa do carnê (o canhoto continua com o nome em letra) e no timbrado do recibo. O T3jus continua só no rodapé, “Modelo T3jus”. PDF real em carne-exemplo.pdf (2 páginas A4) e recibo-exemplo.pdf (1 página).', [
        ('a4c-largo', CA + 'largo', 'Carnê com o logo largo', 'Capa e parcelas 4/6 a 6/6 de Hélio, C-2026-014. O logo cabe numa caixa de 56 × 12 mm, com o CNPJ e o registro na OAB embaixo.'),
        ('a4c-quadrado', CA + 'quadrado', 'Carnê com o logo quadrado e o nome', 'O monograma de 12 mm com o nome em letra ao lado.'),
        ('a4c-pb', CA + 'pb', 'Carnê em preto e branco', 'O logo largo em cinza: continua legível.'),
        ('a4c-uma-cor', CA + 'uma-cor', 'Carnê com o logo claro, em uma cor', 'O logo claro demais, impresso “em uma cor só”, na cor da tinta.'),
        ('a4r-largo', RA + 'largo', 'Recibo com o logo largo', 'O recibo nº 2026-0187. O logo no timbrado, numa caixa de 92 × 20 mm; à direita, razão social, CNPJ, registro da sociedade na OAB, endereço e contatos.'),
        ('a4r-quadrado', RA + 'quadrado', 'Recibo com o logo quadrado e o nome', 'O monograma de 20 mm com o nome em letra ao lado.'),
        ('a4r-pb', RA + 'pb', 'Recibo em preto e branco', 'Como sai numa impressora comum.'),
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
    if n == 3:
        corpo += ('<p class="arqs">Arquivos: <a href="carne-exemplo.pdf">carne-exemplo.pdf</a> · <a href="recibo-exemplo.pdf">recibo-exemplo.pdf</a> · '
                  'logos fictícios usados: <a href="_fonte/logos/logo-largo.png">largo</a>, <a href="_fonte/logos/logo-quadrado.png">quadrado</a>, '
                  '<a href="_fonte/logos/logo-claro.png">claro demais</a></p>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Não foi paga e logo no carnê · T3jus</title>
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
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a,.arqs a{{color:var(--vinho);font-weight:500}}
.arqs{{background:#fff;border-radius:14px;padding:14px 20px;line-height:2.4}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>“Não foi paga” e logo no carnê e no recibo</h1>
<p>Dois desenhos sobre telas já aprovadas. Na ficha do contrato, o botão “Não foi paga” em “Pago antes do T3jus”, que passa a parcela para A receber sem desfazer a importação (F3.84). Em Escritório › Recebimento, o logo do escritório no alto do carnê e no timbrado do recibo, com a conferência para impressão e o registro da sociedade na OAB (F3.81 e o resto do F3.19). Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões, o que muda no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Não foi paga</a><a href="#s2">Logo: Escritório › Recebimento</a><a href="#s3">Carnê e recibo em A4</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
