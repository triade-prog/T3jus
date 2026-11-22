# Lista dos estados (casos.json) e o index.html de apresentação para a Carol.
# Uso: python3 casos_cp.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
FA, RE, CA = 'fatura-a4.html?estado=', 'recibo-a4.html?estado=', 'carne-a4.html?estado='

SECOES = [
    ('fatura', '1. A fatura do mês', 'Uma por mês, do T3jus para o escritório. Timbre do T3jus (logo oficial em vinho, a versão de impressão), número e competência, situação com texto e ícone, total e vencimento, para quem vai (CNPJ, e-mail e endereço de cobrança), os itens com os centavos exatos e o motivo do desconto, e "Como pagar" com o boleto com Pix do Banco Inter (Inter Empresas, decidido em 22/11/2026): QR e copia e cola, linha digitável e código de barras, uma cobrança só. Os dados do T3jus como emissor ainda não foram decididos e aparecem marcados "a definir".', 'fatura-exemplo.pdf', 'fatura-a4.html', 'A4, 1 página', [
        ('fatura-padrao', FA + 'padrao', 'Padrão: Pix e boleto', 'Cedro & Lima, dezembro de 2026: R$ 490,00 + R$ 39,00 − R$ 98,00 = R$ 431,00, vence em 10/12/2026. O pagador traz CNPJ, e-mail e endereço de cobrança (o boleto registrado do Inter exige o endereço). O QR é um BR Code de verdade (lido de volta do PDF) e a linha digitável tem os dígitos verificadores certos, os dois de exemplo e marcados assim.'),
        ('fatura-sem-codigos', FA + 'sem-codigos', 'Sem códigos (como sai hoje)', 'Enquanto a cobrança pelo Banco Inter não está ligada, a fatura não promete Pix, boleto nem baixa automática. No lugar, o caminho que já funciona: escrever ao T3jus com o número da fatura, pagar e mandar o comprovante; a equipe registra e o recibo chega por e-mail.'),
        ('fatura-sem-endereco', FA + 'sem-endereco', 'Sem endereço: só Pix', 'Cedro & Lima sem o endereço de cobrança: o pagador diz "Falta o endereço", a forma vira "Só Pix" e, no lugar do boleto, uma faixa explica que ele não saiu e como mandar o endereço. O Pix continua valendo.'),
        ('fatura-atraso', FA + 'atraso', 'Em atraso: 2ª via', 'Bacuri, outubro, 41 dias. Selo "Em atraso · 41 dias", faixa "se já pagou, desconsidere", a fatura de novembro em aberto lembrada, e códigos novos com o mesmo valor, sem multa nem juros.'),
        ('fatura-paga', FA + 'paga', 'Paga', 'Cedro & Lima, paga em 20/11/2026 por Pix fora da cobrança, registrada à mão. Carimbo "Paga", data, forma e o número do recibo. Os códigos não saem, para ninguém pagar de novo.'),
        ('fatura-cancelada', FA + 'cancelada', 'Cancelada', 'Valor riscado, selo e carimbo "Cancelada · não pague", sem Pix e sem boleto. O motivo é interno e não vai no documento, como no e-mail aprovado.'),
        ('fatura-carne', FA + 'carne', 'Parcela de carnê', 'Pequi, dezembro: "Parcela 3 de 12 do carnê 2026/2027". O Pix e o boleto são os mesmos da parcela 3 do carnê (gerados pela mesma função).'),
        ('fatura-pb', FA + 'pb', 'Preto e branco', 'Como sai numa impressora comum: o que informa é texto escuro ou linha; QR e código de barras são pretos no branco.'),
    ]),
    ('recibo', '2. O recibo do pagamento', 'O T3jus declara que recebeu do escritório o valor, também por extenso, referente à fatura do mês, pago em tal data, por tal forma. Segue o recibo A4 aprovado do Portal, com quem emite trocado. O número do recibo é o da fatura, como no Console aprovado. Não há nota fiscal por agora (decidido em 22/11/2026): o recibo é o comprovante do pagamento e não promete nota.', 'recibo-exemplo.pdf', 'recibo-a4.html', 'A4, 1 página', [
        ('recibo-padrao', RE + 'padrao', 'Padrão', 'Ribeiro & Matos, novembro de 2026, R$ 490,00 (quatrocentos e noventa reais), pago pelo Pix do boleto em 09/11/2026 e confirmado pelo Banco Inter. É o "Recibo" da lista de faturas no Portal.'),
        ('recibo-carne', RE + 'carne', 'Parcela de carnê', 'Pequi, parcela 2 de 12 do carnê 2026/2027, paga por boleto em 04/11/2026.'),
        ('recibo-manual', RE + 'manual', 'Registrado à mão', 'Cedro & Lima, Pix fora da cobrança, registrado por Carol Andrade em 20/11/2026, às 15h02, a partir do comprovante. O motivo escrito no Console fica de fora.'),
        ('recibo-pb', RE + 'pb', 'Preto e branco', 'Como sai numa impressora comum.'),
    ]),
    ('carne', '3. O carnê de 12 parcelas', 'Segue o carnê A4 aprovado do Portal: 3 faixas destacáveis por folha, com linha de corte e tesoura, canhoto à esquerda e via à direita, a capa na primeira faixa. Aqui quem recebe é o T3jus e cada parcela tem o próprio boleto com Pix do Banco Inter. Capa: escritório, plano, período, valor, dia, as 12 parcelas com a situação e o total, como pagar. 13 faixas em 5 folhas.', 'carne-exemplo.pdf', 'carne-a4.html', 'A4, 5 folhas', [
        ('carne-padrao', CA + 'padrao', 'Padrão (Pequi)', 'Carnê 2026/2027 como foi gerado e mandado em 15/09/2026: 12 × R$ 490,00, de outubro de 2026 a setembro de 2027, todo dia 5. Os 12 QR foram lidos de volta do PDF.'),
        ('carne-hoje', CA + 'hoje', 'Baixado hoje', 'O mesmo carnê baixado em 20/11/2026: as parcelas 1 e 2 saem como pagas (data e forma), sem códigos. É o que "Baixar o carnê (PDF)" entrega na ficha e no Portal.'),
        ('carne-trocado', CA + 'trocado', 'Pagas e canceladas (carnê trocado)', 'Com 9 pessoas, a mensalidade passou a R$ 529,00 e saiu o carnê 2027. A parcela 3, já com fatura, continua valendo; as 4 a 12 saem como "Cancelada em 20/11/2026. Não pague", sem códigos, com o carnê que vale no lugar.'),
        ('carne-sem-codigos', CA + 'sem-codigos', 'Sem códigos (como sairia hoje)', 'Até a cobrança pelo Banco Inter ficar ligada, cada parcela diz que os códigos ainda não saem e como pagar falando com o T3jus. Serve para decidir a pergunta 3.'),
        ('carne-pb', CA + 'pb', 'Preto e branco', 'Como sai numa impressora comum.'),
    ]),
    ('nasce', '4. Onde cada PDF nasce', 'As telas aprovadas da cobrança, sem redesenho: só os botões que hoje levam a "#" passam a abrir o documento. No Console › fatura entra um botão "Baixar a fatura (PDF)" em "O que fazer" (pergunta 7). Preparando e erro seguem o padrão aprovado do PDF do contrato (portal-contrato-pdf).', None, None, None, [
        ('nasce-console-fatura', 'cobranca.html?aba=fatura&estado=ver', 'Console › Cobrança › fatura', '"Baixar a fatura (PDF)" em "O que fazer", depois de "Mandar lembrete agora". Abre a fatura no estado da própria fatura (a vencer, em atraso, paga, cancelada, parcela).'),
        ('nasce-console-paga', 'cobranca.html?aba=fatura&estado=paga', 'Console › fatura paga', '"Baixar o recibo", que já existia, abre o recibo registrado à mão. "Baixar a fatura (PDF)" sai com o carimbo "Paga".'),
        ('nasce-console-carne', 'ficha.html?aba=assinatura&estado=cb-carne', 'Console › ficha › Assinatura › carnê', '"Baixar o carnê (PDF)" entrega o carnê como está hoje (parcelas 1 e 2 pagas).'),
        ('nasce-console-carne-preparando', 'ficha.html?aba=assinatura&estado=cb-carne&pdf=preparando', 'Carnê: preparando o PDF', 'O botão vira "Preparando o PDF" com o indicador (aria-disabled, não disabled) e a linha role=status: "Leva alguns segundos; o arquivo baixa sozinho. Pode continuar na tela."'),
        ('nasce-portal-plano', 'portal-escritorio.html?estado=cb-plano', 'Portal › Escritório › Plano e faturas', '"Baixar a fatura" (próxima fatura) e "Recibo" (faturas pagas) ligados. Só a sócia dona vê esta parte.'),
        ('nasce-portal-preparando', 'portal-escritorio.html?estado=cb-plano&pdf=preparando', 'Portal: preparando o PDF', 'O mesmo padrão aprovado, na próxima fatura. Pagar continua livre.'),
        ('nasce-portal-erro', 'portal-escritorio.html?estado=cb-plano&pdf=erro', 'Portal: não deu para gerar', 'Aviso role=alert preso à fatura: o que aconteceu, que nada mudou e que Pagar continua funcionando, "Tentar de novo" e o código FATURA_PDF_INDISPONIVEL.'),
        ('nasce-portal-carne', 'portal-escritorio.html?estado=cb-carne', 'Portal: pago por carnê', '"Baixar o carnê" e "Baixar o carnê (PDF)" ligados ao carnê como está hoje.'),
    ]),
    ('endereco', '5. Endereço de cobrança na Assinatura', 'O boleto registrado do Banco Inter exige o endereço do pagador. Na ficha do escritório, aba Assinatura (estados aprovados 27, 30 e 31), o endereço fica junto do e-mail de cobrança e do CNPJ, na folha e no editar: CEP, rua, número, complemento, bairro, cidade e UF. Só Administração e Financeiro veem e editam; Implantação e Suporte não veem o endereço.', None, None, None, [
        ('endereco-ver', 'ficha.html?aba=assinatura&estado=cb-em-dia', 'Assinatura com o endereço', 'O estado 27 com uma linha a mais, inteira, entre o e-mail de cobrança e o CNPJ: o endereço numa linha e "vai no boleto como endereço do pagador · o mesmo da ficha".'),
        ('endereco-falta', 'ficha.html?aba=assinatura&estado=cb-sem-endereco', 'Falta o endereço', 'Aviso de atenção no topo, "Falta o endereço: sem ele o boleto não sai, só o Pix.", com "Preencher o endereço". Na linha do endereço, selo "Falta o endereço" com ícone e o motivo (a ficha tem a rua, mas não o CEP). A forma de pagamento diz "Só Pix por enquanto".'),
        ('endereco-editar', 'ficha.html?aba=assinatura&estado=cb-editar', 'Editar: o grupo do endereço', 'O estado 30 com um grupo "Endereço de cobrança" logo depois do e-mail e do CNPJ, já preenchido com o que veio da ficha. Campos com autocomplete de endereço; no celular, um embaixo do outro.'),
        ('endereco-erros', 'ficha.html?aba=assinatura&estado=cb-editar-endereco-erros', 'Editar: erros de campo', 'Resumo role=alert "Falta acertar 2 pontos do endereço" e, em cada campo, a mensagem ligada por aria-describedby, com aria-invalid: CEP com 7 números e número em branco ("Se não houver, escreva S/N"). O foco vai para o CEP. O estado 31 aprovado fica como está.'),
        ('endereco-suporte', 'ficha.html?aba=assinatura&estado=cb-em-dia&papel=suporte', 'Suporte (e Implantação): não vê', 'A mesma aba vista pelo Suporte: plano, pessoas, dia e início, sem e-mail, CNPJ nem endereço, com a linha aprovada "Valores, faturas e mudanças ficam com a Administração e o Financeiro".'),
    ]),
]
FOCO = {'nasce-console-fatura': '[data-pdf-fatura]', 'nasce-console-paga': '[data-pdf-fatura]', 'nasce-console-carne': '.cb-carne-acoes',
        'nasce-console-carne-preparando': '#pdf-st', 'nasce-portal-plano': 'a.btn[href^="fatura-a4"]', 'nasce-portal-preparando': '#pdf-st',
        'nasce-portal-erro': '.pdf-erro', 'nasce-portal-carne': '.cb-carne-acoes',
        'endereco-ver': 'dt:text("Endereço de cobrança")', 'endereco-falta': '#t-ass', 'endereco-editar': '.end-grupo', 'endereco-erros': '#t-ass', 'endereco-suporte': '#t-ass'}

PERGUNTAS = [
    ('Quem é o T3jus no documento?', 'Faltam razão social, CNPJ, endereço e cidade do emissor, o remetente (hoje cobranca@exemplo.com.br) e o contato (hoje atendimento@exemplo.com.br). Recomendo usar exatamente os dados da conta PJ no Inter Empresas, porque o beneficiário do boleto e o recebedor do Pix saem de lá e o escritório confere o nome antes de pagar. Até lá, os marcadores "a definir" ficam no modelo e nada é emitido com eles.'),
    ('O que a fatura diz até a cobrança pelo Inter ficar ligada?', 'Recomendo o texto do estado "sem códigos": escrever ao T3jus com o número da fatura, pagar, mandar o comprovante. Não promete Pix, boleto nem baixa automática. Sai de cena quando a integração estiver pronta.'),
    ('Oferecemos o carnê antes de a cobrança pelo Inter estar ligada?', 'Recomendo que não: sem códigos, o carnê vira só um calendário e a fatura do mês já faz esse papel. Quando ligar, recomendo registrar os 12 boletos no Inter no dia em que o carnê é gerado, para os códigos da folha e os da fatura do mês serem os mesmos.'),
    ('Sem endereço de cobrança: a fatura sai só com o Pix?', 'Recomendo que sim, como no estado "sem endereço": a fatura não atrasa por falta do endereço, o Pix vale, e a Assinatura avisa a equipe. Na ativação, o endereço entra junto do e-mail de cobrança, para isso ser exceção.'),
    ('Atraso: 2ª via com códigos novos, sem multa nem juros?', 'Recomendo que sim, no tom da régua aprovada. O boleto da 2ª via vence em 7 dias; o Pix também. Multa e juros no boleto do Inter ficam desligados.'),
    ('Recibo sem assinatura, "emitido eletronicamente"?', 'Recomendo que sim, com o número igual ao da fatura e quem registrou (quando foi à mão). Sem nota fiscal por agora, o recibo é o comprovante do pagamento; se o contador pedir, entra depois um código de conferência.'),
    ('Botão "Baixar a fatura (PDF)" no Console?', 'Recomendo acrescentar em "O que fazer" da fatura aberta, para a equipe mandar o PDF por outro canal quando o escritório pedir. Não mexe no resto da tela aprovada.'),
    ('Carnê baixado depois: como está hoje ou como foi gerado?', 'Recomendo como está hoje: parcelas pagas e canceladas saem marcadas e sem códigos. O PDF mandado no dia em que o carnê foi gerado continua guardado.'),
    ('"CNPJ da nota" vira "CNPJ de cobrança"?', 'Recomendo trocar só o rótulo, na Assinatura e no editar, já que não há nota por agora: o CNPJ é o do pagador no boleto. Não mexi nas telas aprovadas; fica para quando a Carol decidir.'),
    ('O endereço de cobrança nasce do endereço da ficha?', 'Recomendo que sim: ao preparar a assinatura, o endereço da ficha vem preenchido e a equipe só completa (a ficha aprovada não tem CEP). Preencher rua, bairro e cidade pelo CEP fica para depois, porque depende de um serviço de fora.'),
]

casos = []
for sid, _, _, _, _, _, itens in SECOES:
    for it in itens:
        c = {'nome': it[0], 'url': it[1]}
        if sid not in ('nasce', 'endereco'):
            c['a4'] = True
        if it[0] in FOCO:
            c['foco'] = FOCO[it[0]]
        casos.append(c)
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)


def wh(arq):
    # largura e altura da imagem (reserva o espaço antes de carregar); só depois das capturas
    try:
        from PIL import Image
        w, a = Image.open(os.path.join(SAIDA, arq)).size
        return f' width="{w}" height="{a}"'
    except Exception:
        return ''

corpo = ''
for sid, titulo, sub, pdf, prev, pags, itens in SECOES:
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    if pdf:
        corpo += (f'<p class="pdf"><a class="botao" href="{pdf}">Abrir o PDF de exemplo ({pags})</a>'
                  f'<a class="botao sec" href="{prev}">Abrir a prévia, com as variações</a></p>')
    for nome, url, t, leg in itens:
        if sid not in ('nasce', 'endereco'):
            figs = (f'<figure class="folha"><a href="{h(url)}"><img src="{nome}-miniatura.webp"{wh(nome + "-miniatura.webp")} alt="{h(t)}: primeira folha do documento." loading="lazy" decoding="async"></a>'
                    f'<figcaption>Primeira folha</figcaption></figure>'
                    f'<figure class="cel"><a href="{h(url)}"><img src="{nome}-celular.webp"{wh(nome + "-celular.webp")} alt="{h(t)}, prévia no celular." loading="lazy" decoding="async"></a>'
                    f'<figcaption>Celular · 390</figcaption></figure>')
            extra = f' · <a href="{nome}-computador.webp">captura do computador (1440)</a>'
            cls = 'a4'
        else:
            figs = ''.join(f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp"{wh(nome + "-" + tam + ".webp")} alt="{h(t)}, {tam}." loading="lazy" decoding="async"></a>'
                           f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 390"}</figcaption></figure>' for tam in ('computador', 'celular'))
            extra, cls = '', 'tela'
        corpo += (f'<article class="{cls}">{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a>{extra}</p></div></article>')
    corpo += '</section>'
corpo += ('<section id="perguntas" aria-labelledby="t-perguntas"><h2 id="t-perguntas">6. Perguntas para a Carol</h2>'
          '<p class="sub">Cada uma com a recomendação. O detalhe, as decisões de design e o que depende de quê estão em NOTAS.md.</p><ol class="perg">'
          + ''.join(f'<li><b>{h(p)}</b><span>{h(r)}</span></li>' for p, r in PERGUNTAS) + '</ol></section>')

page = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cobrança em PDF · T3jus</title>
<meta name="description" content="Desenho da fatura, do recibo e do carnê em PDF A4 que o T3jus manda aos escritórios (CO-06, F1.21), para aprovação da Carol.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--vinho-2:#87335B;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:var(--ambar-3);max-width:96ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:44px;line-height:1.1}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
.fio{{display:block;width:56px;height:3px;background:var(--ambar);margin:14px 0 4px;border-radius:2px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:var(--vinho-2);color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-bottom:16px}}
article.a4{{grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr) minmax(240px,1.6fr)}}
article.tela{{grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.3fr)}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
.folha img{{box-shadow:0 8px 24px -12px rgba(42,26,34,.4)}}
.a4 .cel img{{max-height:680px;object-fit:cover;object-position:top}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} a{{color:var(--vinho)}} .abrir a{{font-weight:500}}
.pdf{{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}}
.botao{{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:8px;background:var(--vinho);color:#fff!important;text-decoration:none;font-weight:500}}
.botao.sec{{background:var(--papel);color:var(--vinho)!important;border:1px solid var(--vinho)}}
.perg{{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:q}}
.perg li{{counter-increment:q;display:grid;grid-template-columns:40px minmax(0,1fr);gap:4px 14px;background:var(--papel);border-radius:14px;padding:16px 20px}}
.perg li::before{{content:counter(q);grid-row:1/3;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--ambar-3);color:var(--vinho);font-family:Alegreya,Georgia,serif;font-size:20px}}
.perg b{{font-weight:500}} .perg span{{color:var(--tinta-2)}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:var(--ambar-3)}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} h1{{font-size:34px}} article.a4,article.tela{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Console e Portal · para aprovação da Carol</p><h1>Cobrança em PDF: fatura, recibo e carnê</h1><span class="fio" aria-hidden="true"></span>
<p>CO-06, item F1.21 do painel. Os três documentos A4 que o T3jus manda aos escritórios que o assinam, com as variações, e onde cada um nasce nas telas já aprovadas. Os dados são fictícios e os do desenho aprovado da cobrança; O boleto com Pix é do Banco Inter (Inter Empresas), e Pix, QR e boleto são de exemplo e marcados assim. Não há nota fiscal por agora. Clique numa imagem para abrir o HTML naquele estado. Regras, dados novos e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#fatura">Fatura</a><a href="#recibo">Recibo</a><a href="#carne">Carnê</a><a href="#nasce">Onde nasce</a><a href="#endereco">Endereço</a><a href="#perguntas">Perguntas</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(page)
print('index ok,', len(casos), 'estados')
