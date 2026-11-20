# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos_cb.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
C = 'cobranca.html?aba='
F = 'ficha.html?aba=assinatura&estado='
P = 'portal-escritorio.html?estado='

SECOES = [
    ('1. Console · Cobrança › Faturas', 'cobranca.html. Item novo no trilho, “Cobrança”, com o número de escritórios em atraso. Só Administração e Financeiro veem o item e a página.', [
        ('faturas', C + 'faturas&estado=ver', 'Faturas de todos os escritórios', 'Resumo em números (a receber em novembro, recebido, em atraso com quantos escritórios, atraso por idade em barras com o valor escrito) e a lista com busca, escritório, vencimento, forma (Pix, Boleto ou Carnê) e o filtro de situação. Cada linha: escritório, competência, valor, vencimento, situação com selo e texto, forma (a Pequi paga por carnê). No celular, cartões.'),
        ('faturas-atraso', C + 'faturas&estado=atraso', 'Filtro “Em atraso”', 'Da fatura mais antiga para a mais nova. A coluna Forma vira “Último lembrete”. Em cima, quem passou de 30 dias: a Bacuri (a Administração decide o só consulta) e a Mangaba, com o contrato encerrado, em que a régua parou.'),
        ('faturas-financeiro', C + 'faturas&estado=ver&papel=financeiro', 'Visto pelo Financeiro', 'Marta, do Financeiro, vê a mesma página e faz o mesmo que a Administração nas faturas. Planos e a decisão do só consulta ficam com a Administração.'),
        ('faturas-vazio', C + 'faturas&estado=vazio', 'Vazio', 'Antes do primeiro escritório ativo: os números zerados e o caminho para os planos.'),
        ('faturas-carregando', C + 'faturas&estado=carregando', 'Carregando', 'Esqueleto dos números e da lista, com aviso para leitor de tela.'),
        ('faturas-erro', C + 'faturas&estado=erro', 'Erro', 'O servidor não respondeu: nada se perdeu, “Tentar de novo” e o código para o suporte.'),
        ('sem-permissao', C + 'faturas&papel=suporte', 'Sem permissão (Suporte ou Implantação)', 'O item some do trilho. Quem abre o endereço vê “Esta página é de Administração e Financeiro”, como na Equipe aprovada, e o caminho para a aba Assinatura na ficha.'),
    ]),
    ('2. Console · fatura aberta', 'cobranca.html?aba=fatura. Exemplo principal: a primeira fatura da Cedro & Lima (dezembro de 2026, R$ 431,00). Exemplo de atraso: a Bacuri (outubro, 41 dias).', [
        ('fatura', C + 'fatura&estado=ver', 'Fatura a vencer', 'Abertura vinho com o total no lado âmbar. Itens: mensalidade do plano, pessoa a mais (9 de 8) e desconto com motivo e prazo; total exato. Pix copia e cola e boleto (exemplo), histórico da fatura e os próximos lembretes. Ao lado: registrar pagamento, mandar lembrete, cancelar e o lugar reservado da nota fiscal.'),
        ('fatura-atraso', C + 'fatura&estado=atraso', 'Fatura em atraso há 41 dias', 'Faixa de atraso com os dias num disco, o total em aberto e o que já foi feito (5 lembretes, aviso no Portal). Passou de 30 dias: “Passar o Portal para só consulta”, só para a Administração. O histórico mostra cada lembrete da régua.'),
        ('fatura-lembrete', C + 'fatura&estado=lembrete&papel=financeiro', 'Lembrete enviado (Financeiro)', 'Marta mandou um lembrete agora: aviso de sucesso e evento novo no histórico. O botão de só consulta não aparece para ela; a linha diz que quem decide é a Administração.'),
        ('fatura-pagar', C + 'fatura&estado=pagar', 'Registrar pagamento manual', 'Data, valor recebido, forma, comprovante (opcional) e motivo obrigatório com contador. Diz o que acontece: a fatura passa a Paga e o recibo vai ao e-mail de cobrança.'),
        ('fatura-pagar-erros', C + 'fatura&estado=pagar-erros', 'Erro de campo', 'Data depois de hoje, valor diferente do total e motivo vazio: resumo no topo, erro preso a cada campo, foco no primeiro. O botão nunca fica desabilitado.'),
        ('fatura-pagar-enviando', C + 'fatura&estado=pagar-enviando', 'Enviando', 'Campos travados e “Registrando…” com aria-busy.'),
        ('fatura-pagar-falha', C + 'fatura&estado=pagar-falha', 'Falha de rede', 'A conexão caiu: nada mudou, o que foi escrito continua, “Tentar de novo” e o código.'),
        ('fatura-pagar-conflito', C + 'fatura&estado=pagar-conflito', 'Conflito de edição', 'Marta Quintela registrou um pagamento às 14h32, com a janela aberta: o aviso compara antes e agora e evita contar o pagamento duas vezes. O que foi escrito não se perde.'),
        ('fatura-paga', C + 'fatura&estado=paga', 'Paga', 'Selo Paga, recibo e comprovante guardados, evento com o motivo no histórico. Uma fatura paga não se cancela nem se apaga.'),
        ('fatura-cancelar', C + 'fatura&estado=cancelar', 'Cancelar a fatura', 'alertdialog com foco em “Voltar”: a fatura não é apagada, fica como Cancelada com o motivo; Pix e boleto deixam de valer. Motivo obrigatório.'),
        ('fatura-cancelada', C + 'fatura&estado=cancelada', 'Cancelada', 'Selo Cancelada, o motivo no histórico e “O Pix e o boleto desta fatura não valem mais”.'),
        ('fatura-carne', C + 'fatura&estado=carne', 'Fatura de um carnê (Pequi, parcela 3 de 12)', 'A forma é Carnê. Uma faixa diz “Parcela 3 de 12 do carnê 2026/2027”, com “Baixar o carnê (PDF)” e “Ver o carnê”. O Pix e o boleto são os mesmos da página 3 do carnê; a régua vale igual.'),
    ]),
    ('3. Console · Planos e régua', 'cobranca.html?aba=planos e ?aba=regua. Planos de exemplo: Essencial, Escritório e Banca, por faixa de pessoas, com todas as áreas.', [
        ('planos', C + 'planos&estado=ver', 'Catálogo de planos', 'Cartões tipo Pantone, com o tom de cada plano, o preço, as pessoas incluídas e quantos escritórios assinam. A regra na tela: mudar o preço vale só para novas assinaturas. Pessoa a mais e os planos arquivados (Fundador, que a Bacuri ainda assina).'),
        ('planos-editar', C + 'planos&estado=editar', 'Editar plano', 'Preço de R$ 490,00 para R$ 520,00: o aviso diz que a Cedro & Lima e a Pequi continuam pagando R$ 490,00.'),
        ('planos-criar-erros', C + 'planos&estado=criar-erros', 'Criar plano com erros', 'Nome vazio, preço sem centavos e 0 pessoas: resumo e erro em cada campo.'),
        ('planos-arquivar', C + 'planos&estado=arquivar', 'Arquivar em vez de apagar', 'O plano sai das novas assinaturas; quem assina continua, pelo mesmo preço. Motivo obrigatório.'),
        ('planos-financeiro', C + 'planos&estado=ver&papel=financeiro', 'Planos, visto pelo Financeiro', 'Sem criar, editar nem arquivar: “Quem cria, muda e arquiva planos é a Administração.”'),
        ('planos-vazio', C + 'planos&estado=vazio', 'Nenhum plano', 'Estado vazio com “Criar plano”.'),
        ('regua', C + 'regua&estado=ver', 'Régua de cobrança', 'Sete passos em discos (20 e 3 dias antes, no dia, 3, 7, 15 e 30 dias depois), cada um com o que acontece e o canal. Aos 7 dias, aviso no Portal ao sócio dono; aos 30, a Administração decide. Ao pagar, tudo para. O exemplo do e-mail de 7 dias e o que nunca acontece sozinho.'),
    ]),
    ('4. Console · ficha do escritório, aba Assinatura', 'ficha.html?aba=assinatura. Aba nova entre “Contrato e documentos” e “Equipe T3jus”. Administração e Financeiro editam; Implantação e Suporte veem o plano e a situação, sem valores nem faturas.', [
        ('assinatura', F + 'cb-em-dia', 'Em dia (Cedro & Lima)', 'Plano, mensalidade, pessoas, dia de vencimento, forma, início, e-mail de cobrança, CNPJ da nota e desconto com motivo e prazo. Faturas do escritório e a situação ao lado; “Como funciona” em campo âmbar.'),
        ('assinatura-suporte', F + 'cb-em-dia&papel=suporte', 'Visto pelo Suporte', 'Plano, pessoas, dia, início e a situação (Em dia), sem valores, e-mail, desconto nem faturas, e a linha que explica por quê.'),
        ('assinatura-sem', F + 'cb-sem', 'Sem assinatura (em implantação)', 'A cobrança começa quando o cliente passa para Ativo; dá para preparar a assinatura antes.'),
        ('assinatura-editar', F + 'cb-editar', 'Editar', 'Dia de vencimento, forma (Pix, Boleto ou Carnê), e-mail, CNPJ da nota, desconto com prazo e motivo. O início não muda depois da primeira fatura. No pé: vale a partir da próxima fatura ainda não emitida.'),
        ('assinatura-editar-erros', F + 'cb-editar-erros', 'Erros', 'E-mail sem domínio, CNPJ com dígitos errados e desconto sem motivo.'),
        ('assinatura-conflito', F + 'cb-conflito', 'Conflito de edição', 'Marta Quintela salvou às 14h32: compara os dois campos, marca “Mudou” e oferece “Salvar a minha versão” ou “Ficar com a versão salva”.'),
        ('assinatura-mudar-plano', F + 'cb-mudar-plano', 'Mudar de plano', 'De Escritório para Banca: vale na fatura de janeiro, sem proporcional; a de dezembro, já emitida, continua R$ 431,00. A conta da primeira fatura nova, com o desconto, e o motivo.'),
        ('assinatura-atraso', F + 'cb-atraso', 'Em atraso há 41 dias (Bacuri)', 'Faixa de atraso no alto da aba e o botão da Administração “Passar o Portal para só consulta”. Faturas com cada situação.'),
        ('assinatura-consulta-confirmar', F + 'cb-so-consulta-confirmar', 'Confirmar o só consulta', 'alertdialog: Portal normal → Só consulta, o que acontece (ninguém cria nem muda, nada é apagado, a exportação continua, volta sozinho ao pagar), motivo obrigatório. Foco em Cancelar.'),
        ('assinatura-consulta', F + 'cb-so-consulta', 'Portal só consulta por atraso', 'Faixa em todas as abas da ficha, selo “Portal só consulta” e “Devolver o acesso agora” (Administração, com motivo) para quando a sócia manda o comprovante.'),
        ('assinatura-encerrado', F + 'cb-encerrado', 'Encerrado com fatura em aberto (Mangaba)', 'A assinatura acabou com o contrato; a fatura de julho continua valendo até ser paga ou cancelada com motivo. A régua parou.'),
        ('assinatura-carne', F + 'cb-carne', 'Assinatura em carnê (Pequi)', 'Forma Carnê. O carnê atual: 12 parcelas de R$ 490,00, de outubro de 2026 a setembro de 2027, pagas e a vencer em canhotos (texto e ícone, não só cor), “Baixar o carnê (PDF)” e “Gerar novo carnê”. O aviso de que o valor mudou (9 pessoas) e “Como funciona o carnê”.'),
        ('assinatura-editar-carne', F + 'cb-editar-carne', 'Editar uma assinatura em carnê', 'Forma de pagamento com Pix, Boleto e Carnê. Com o carnê em uso, mudar o dia, a forma ou o valor gera um carnê novo a partir da próxima parcela sem fatura; as que faltam são canceladas com motivo.'),
        ('assinatura-carne-novo', F + 'cb-carne-novo', 'Gerar novo carnê', 'alertdialog com foco em Cancelar: de 12 × R$ 490,00 para 12 × R$ 529,00, de janeiro a dezembro de 2027. Dezembro, já emitida, continua; as parcelas 4 a 12 são canceladas com o motivo, nunca apagadas. Motivo obrigatório.'),
        ('assinatura-erro', F + 'cb-erro', 'Erro ao abrir', 'Nada se perdeu, “Tentar de novo” e o código.'),
    ]),
    ('5. Console · carteira', 'carteira.html. A situação nova “Fatura em atraso”, com os dias, no lugar de “Em dia”, e um filtro. Os números aprovados não mudam.', [
        ('carteira', 'carteira.html?estado=cb-ver', 'Carteira com “Fatura em atraso”', 'Aroeira (5 dias), Vale & Sena (10) e Bacuri (41, em urgência). Filtro “Fatura em atraso (3)” ao lado de Responsável. Cartões no celular.'),
        ('carteira-atraso', 'carteira.html?estado=cb-atraso', 'Filtro ligado', 'Só os 3, do atraso maior para o menor, e o atalho para as faturas em Cobrança (Administração e Financeiro).'),
    ]),
    ('6. Portal · Escritório › Plano e faturas', 'portal-escritorio.html. Exemplo do Portal: a Ribeiro & Matos (sócia dona Marina Ribeiro), como nos desenhos aprovados. No celular, a barra de baixo aprovada.', [
        ('portal-plano', P + 'cb-plano', 'Plano e faturas (sócia dona)', 'O plano, a próxima fatura com “Pagar”, as faturas com recibo e o lugar reservado da nota fiscal. Só a sócia dona vê.'),
        ('portal-pagar', P + 'cb-pagar', 'Pagar', 'Janela com o valor, o Pix copia e cola e o boleto (exemplo) e quando a fatura aparece como paga.'),
        ('portal-carne', P + 'cb-carne', 'Pago por carnê (sócia dona)', 'A próxima parcela (3 de 12) com “Pagar” e “Baixar o carnê”, o carnê com as parcelas pagas e a vencer, e a parcela 4, de janeiro, paga adiantada.'),
        ('portal-atraso', P + 'cb-atraso', 'Aviso de atraso (7 dias ou mais)', 'Faixa no alto de todas as páginas, só para a sócia dona, e a fatura em destaque: com 30 dias a equipe T3jus pode deixar o Portal só para consulta; nenhum dado é apagado.'),
        ('portal-consulta', P + 'cb-so-consulta', 'Só consulta por atraso (sócia dona)', 'A mesma faixa do fim do contrato, com “Ver e pagar”. Ao pagar, tudo volta na hora. A exportação continua liberada.'),
        ('portal-consulta-equipe', P + 'cb-so-consulta-equipe', 'Só consulta (quem não é a sócia dona)', 'Larissa (Jurídico) não vê a seção nem valores: a faixa pede para falar com Marina Ribeiro, a sócia dona.'),
        ('portal-vazio', P + 'cb-vazio', 'Nenhuma fatura ainda', 'Em implantação: a primeira fatura chega quando a implantação terminar.'),
        ('portal-erro', P + 'cb-erro', 'Erro na seção', 'Só a seção falha; o resto da página funciona.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, its in SECOES for it in its]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_cb.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for n, (titulo, sub, itens) in enumerate(SECOES, 1):
    corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg in itens:
        figs = ''
        for tam, larg in (('computador', '1440'), ('celular', '412')):
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{larg}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'

nav = ''.join(f'<a href="#s{n}">{h(t.split(". ", 1)[1])}</a>' for n, (t, _, _) in enumerate(SECOES, 1))
LINHA = [('−20', 'Fatura emitida e enviada'), ('−3 e 0', 'Lembretes por e-mail'), ('+3', 'Lembrete'), ('+7', 'Aviso no Portal ao sócio dono'),
         ('+15', 'Último lembrete automático'), ('+30', 'A Administração decide o só consulta, com motivo'), ('Pagou', 'Tudo volta sozinho')]
linha = ''.join(f'<li><b>{h(d)}</b><span>{h(t)}</span></li>' for d, t in LINHA)
index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cobrança dos escritórios · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
header a{{color:#fff}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
ol.linha{{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}}
ol.linha li{{background:#87335B;border-radius:10px;padding:10px 12px;color:#fff;font-size:12px;line-height:1.45}} ol.linha b{{display:block;font-family:Alegreya,Georgia,serif;font-size:17px;font-weight:500;color:#F2CDB3}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}} ol.linha{{grid-template-columns:1fr 1fr}}}}
</style></head><body>
<header><p class="sobre">T3jus · CO-06 · para aprovação da Carol</p><h1>Cobrança dos escritórios</h1>
<p>Como o T3jus cobra os escritórios que assinam: no Console (faturas, fatura aberta, planos, régua de lembretes, carnê, a aba Assinatura na ficha e a situação “Fatura em atraso” na carteira) e no Portal (Plano e faturas para a sócia dona e os avisos de atraso). Planos e preços são de exemplo; o meio de pagamento e a nota fiscal ficam como lugar reservado. Hoje é 20/11/2026. Cada estado tem computador (1440) e celular (412); clique numa imagem para abrir o HTML naquele estado. Decisões, servidor e perguntas estão em NOTAS.md.</p>
<ol class="linha" aria-label="Régua de cobrança, em dias a partir do vencimento">{linha}</ol>
<nav class="ir" aria-label="Ir para">{nav}</nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'estados')
