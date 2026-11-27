# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Segue o casos_cb.py da cobrança aprovada. Uso: python3 casos_im.py <pasta-saida>
import json, html, sys, os
from dados_im import *
from comum_im import brl

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
I = 'ficha.html?aba=implantacao&estado='
A = 'ficha.html?aba=assinatura&estado='
C = 'cobranca.html?aba='
P = 'portal-escritorio.html?estado='
N = 'portal-inicio.html?estado='

SECOES = [
    ('1. Console · ficha do escritório, aba Implantação', 'ficha.html?aba=implantacao. Aba nova entre “Contrato e documentos” e “Assinatura”. Exemplo: a Cedro & Lima Advocacia (Recife), implantação aberta em 16/11/2026, prazo 16/12/2026, acompanhada por Rafael Teles. Hoje é 27/11/2026. Administração e Implantação editam; Financeiro e Suporte só veem.', [
        ('im-aberta', I + 'im-aberta', 'Aberta, faltam 19 dias', 'Cabeçalho com o prazo e os dias que faltam num disco, quem acompanha (Rafael Teles) com “Trocar”, “Mudar o prazo” e a condição congelada na abertura (isenta, Oferta de lançamento: R$ 1.490,00 e a isenção, efeito R$ 0,00). “O que já aconteceu”, calculado do Portal, sem nada marcado à mão. As 6 pessoas com o aceite do convite e o treino, “4 de 6 treinadas”, e os treinos com o meio, a duração e quem deu.'),
        ('im-perto', I + 'im-perto', 'Perto do prazo (faltam 7 dias)', 'Hoje 09/12/2026. Faixa âmbar: 2 pessoas sem treino (Tiago Ramos e Diego Alves), quem o sino avisou hoje e que o próximo aviso sai a 3 dias do prazo.'),
        ('im-hoje', I + 'im-hoje', 'Vence hoje', 'Hoje 16/12/2026. A faixa pede para concluir, se o escritório já usa, ou mudar o prazo com motivo. Amanhã nada muda sozinho.'),
        ('im-passou', I + 'im-passou', 'Passou do prazo (há 5 dias)', 'Hoje 21/12/2026. Faixa vinho com os dias passados no disco (+5): o cliente continua em implantação e nada passa para Ativo sozinho. “Concluir a implantação” e “Mudar o prazo”.'),
        ('im-registrar', I + 'im-registrar', 'Registrar treino', 'Janela: dia do treino, duração em minutos, forma (vídeo, presencial, telefone), quem participou (com o treino que cada um já tem; Diego aparece como “ainda não entrou no Portal”), os temas do Portal cobertos e quem deu, que vem da sessão. Depois de registrado, o treino não se edita: desfaz-se com motivo.'),
        ('im-registrar-erros', I + 'im-registrar-erros', 'Registrar treino com erros', 'Dia depois de hoje, duração fora de 15 a 480 minutos e ninguém marcado: resumo no topo (“Nada foi registrado ainda”), erro preso a cada campo, foco no primeiro. O botão não fica desabilitado.'),
        ('im-desfazer', I + 'im-desfazer', 'Desfazer registro', 'alertdialog com foco em Voltar, para o treino presencial de 24/11 (Juliana Prado e Joana Freitas). O registro não é apagado: fica riscado na lista, com o motivo, o nome e a hora; as duas voltam a contar sem treino. Motivo obrigatório.'),
        ('im-trocar', I + 'im-trocar', 'Trocar quem acompanha', 'Só aparece quem atende a Cedro & Lima com a função Implantação ou Administração (Rafael Teles hoje, Carol Andrade). A pessoa nova passa a receber os avisos do sino; os sócios veem o nome novo no Portal.'),
        ('im-prazo', I + 'im-prazo', 'Mudar o prazo', 'Só a Administração. Prazo de hoje 16/12/2026 (aberta em 16/11, 30 dias), novo prazo e motivo obrigatório, que fica no histórico interno e o escritório não vê. Os avisos contam do prazo novo.'),
        ('im-pronta', I + 'im-pronta', 'Tudo pronto (6 de 6)', 'Hoje 07/12/2026: as 6 pessoas treinadas, importação e WhatsApp feitos. A faixa verde convida a concluir, sem nada acontecer sozinho.'),
        ('im-concluir', I + 'im-concluir', 'Concluir a implantação', 'alertdialog: Em implantação → Ativo, sem volta pelo Console. O resumo para o escritório (até 2.000 caracteres), que os sócios leem no Portal. Na cobrança: começa hoje e a 1ª fatura, de janeiro de 2027, vence em 10/01/2027 com a mensalidade, o desconto de entrada, a implantação de R$ 1.490,00 e a isenção de − R$ 1.490,00. Total R$ 399,20.'),
        ('im-concluir-co09', I + 'im-concluir-co09', 'Concluir, com o teste grátis do CO-09', 'A mesma janela quando o escritório passou pelo teste grátis: “Na cobrança, nada muda”. A cobrança começou na assinatura, em 03/12/2026, e a fatura 2027/0004 já traz a implantação e a isenção.'),
        ('im-concluir-conflito', I + 'im-concluir-conflito', 'Conflito ao concluir', 'Carol Andrade mudou o prazo às 14h32, com a janela aberta: nada foi concluído, a tabela compara o salvo agora e o que você via (16/12 → 23/12) e o resumo escrito continua.'),
        ('im-concluida', I + 'im-concluida', 'Concluída', 'Concluída por Rafael Teles em 07/12/2026, 9 dias antes do prazo. O resumo da conclusão, a condição “Faturada na 1ª fatura” com o link e o que aconteceu ficam de leitura; quem entrar depois ainda pode ter o treino registrado.'),
        ('im-cancelada', I + 'im-cancelada', 'Cancelada com o fim do contrato', 'Cancelada sozinha quando o contrato terminou, em 30/11/2026: não chegou a nenhuma fatura, os treinos ficam para leitura. Se o contrato reabrir em implantação, abre a nº 2 com a regra do dia.'),
        ('im-financeiro', I + 'im-aberta&papel=financeiro', 'Visto pelo Financeiro', 'Sem os botões de registrar, trocar e concluir, e a linha que diz quem faz isso. O Financeiro vê o valor e a isenção.'),
        ('im-suporte', I + 'im-aberta&papel=suporte', 'Visto pelo Suporte', 'A mesma leitura, sem valores: prazo, pessoas e treinos, para atender o escritório.'),
        ('im-carregando', I + 'im-carregando', 'Carregando', 'Esqueleto do cabeçalho, das pessoas e dos treinos, com aviso para leitor de tela.'),
        ('im-erro', I + 'im-erro', 'Erro', 'O servidor não respondeu: nada se perdeu, “Tentar de novo” e o código para o suporte.'),
        ('im-sem-permissao', I + 'im-sem-permissao', 'Sem permissão', 'Quem não está na Equipe T3jus do cliente vê “Você não atende a Cedro & Lima”, o que pedir à Administração e o caminho de volta à carteira.'),
    ]),
    ('2. Console · Cobrança › Planos › Implantação assistida', 'cobranca.html?aba=planos. Folha nova abaixo dos planos, só da Administração. O Financeiro vê sem editar.', [
        ('im-regra', C + 'planos&estado=im-regra', 'Folha Implantação assistida', 'Abaixo dos planos: valor R$ 1.490,00 à vista na 1ª fatura (selo “Valor provisório”), condição Isenta · Oferta de lançamento, isenta até “Sem data de fim” enquanto a data não existir, o texto da fatura, o que inclui e o prazo de 30 dias. Como aparece na 1ª fatura (efeito R$ 0,00), as 3 implantações abertas e o histórico da regra.'),
        ('im-regra-editar', C + 'planos&estado=im-regra-editar', 'Editar a regra', 'Valor, prazo, condição, “isenta até” 31/05/2027, texto da isenção e o que inclui. A prévia diz que vale para as implantações que abrirem depois: as 3 abertas continuam como estão; o sino avisa em 01/05/2027.'),
        ('im-regra-cobrada', C + 'planos&estado=im-regra-cobrada', 'Escolher Cobrada', '“Isenta até” deixa de valer e aparece o aviso: resolver a nota fiscal com o contador antes (F1.24), a 1ª fatura passa de R$ 1.800,00, e o carnê não leva a implantação. A prévia mostra o efeito de + R$ 1.490,00.'),
        ('im-regra-erros', C + 'planos&estado=im-regra-erros', 'Erros', 'Valor sem centavos, prazo fora de 1 a 90 dias e “isenta até” antes de hoje: resumo e erro preso a cada campo.'),
        ('im-regra-financeiro', C + 'planos&estado=im-regra&papel=financeiro', 'Visto pelo Financeiro', 'A regra e o histórico, sem editar: “Quem muda a regra da implantação é a Administração.”'),
    ]),
    ('3. Console · ficha, aba Assinatura', 'ficha.html?aba=assinatura. O bloco da implantação na assinatura e a recusa do carnê.', [
        ('im-ass-isenta', A + 'im-ass-isenta', 'Implantação isenta, a faturar', 'Bloco novo na assinatura preparada: “Isenta · Oferta de lançamento”, “Ver a implantação” e as duas linhas que vão na 1ª fatura e somam zero. O desconto de entrada (CO-10) aparece à parte, só sobre a mensalidade.'),
        ('im-ass-faturada', A + 'im-ass-faturada', 'Já faturada', 'Desde 07/12/2026: o bloco diz que a implantação e a isenção estão na fatura de janeiro de 2027, com o link.'),
        ('im-ass-cobrada', A + 'im-ass-cobrada', 'Implantação cobrada', 'Exemplo de quando a regra for Cobrada: “Cobrada à vista”, R$ 1.490,00 inteiro na 1ª fatura, por Pix ou boleto.'),
        ('im-ass-carne-recusa', A + 'im-ass-carne-recusa', 'Carnê com implantação cobrada', 'A assinatura já está em Carnê: o bloco avisa que a 1ª fatura não sai, que concluir ou gerar o carnê é recusado (IMPLANTACAO_COBRADA_NO_CARNE) e leva a “Mudar a forma de pagamento”.'),
        ('im-ass-salvar-carne', A + 'im-ass-salvar-carne', 'Salvar a assinatura com Carnê', 'Editar a assinatura escolhendo Carnê com a implantação cobrada: “Não deu para salvar”, o código e o porquê. Parcelar a implantação fica no pendente F1.49.'),
        ('im-ass-suporte', A + 'im-ass-isenta&papel=suporte', 'Visto pelo Suporte', 'O bloco mostra a condição da implantação, sem valores, e a linha que explica por quê.'),
    ]),
    ('4. Console · fatura aberta', 'cobranca.html?aba=fatura. Os rótulos novos dos itens: Mensalidade, Desconto, Implantação e Isenção.', [
        ('im-fatura-isenta', C + 'fatura&estado=im-fatura-isenta', '1ª fatura com a isenção (Cedro & Lima)', 'Janeiro de 2027, nº 2027/0004, vence 10/01/2027: mensalidade R$ 499,00, desconto de entrada − R$ 99,80, implantação R$ 1.490,00 e isenção − R$ 1.490,00. Total R$ 399,20. O valor da implantação aparece e a isenção também.'),
        ('im-fatura-cobrada', C + 'fatura&estado=im-fatura-cobrada', '1ª fatura com a implantação cobrada (exemplo)', 'Umbu Advocacia de Família, março de 2027, nº 2027/0011: a implantação à vista, sem a isenção. Total R$ 1.889,20; a faixa lembra que passa de R$ 1.800,00 e que, sem nota pelo sistema, o recibo é o comprovante.'),
    ]),
    ('5. PDF da fatura e do recibo', 'fatura-a4.html e recibo-a4.html, a partir do modelo aprovado: só as linhas e os dados mudam.', [
        ('pdf-fatura-isenta', 'fatura-a4.html?estado=im-isenta', 'Fatura A4, implantação isenta', 'As quatro linhas com o rótulo de cada uma e o total de R$ 399,20 no Pix e no boleto (códigos de exemplo).'),
        ('pdf-fatura-cobrada', 'fatura-a4.html?estado=im-cobrada', 'Fatura A4, implantação cobrada', 'Três linhas, a implantação “à vista” e o total de R$ 1.889,20.'),
        ('pdf-recibo-isenta', 'recibo-a4.html?estado=im-isenta', 'Recibo A4, implantação isenta', 'Recibo da fatura 2027/0004 paga por Pix em 08/01/2027: a discriminação com as quatro linhas e R$ 399,20 por extenso.'),
    ]),
    ('6. Sino', 'O sino aprovado, com os avisos novos. Avisos do prazo vão para quem acompanha e para a Administração; o da isenção, para a Administração.', [
        ('im-sino', I + 'im-sino&sino=im-prazos', 'Avisos do prazo (Carol, Administração)', 'Hoje 09/12/2026: “A implantação da Cedro & Lima vence em 7 dias (4 de 6 pessoas treinadas)”, com quem falta; o mesmo “vence hoje” (Jatobá) e “em 3 dias” (Ipê & Moura). Cada aviso leva à aba Implantação.'),
        ('im-sino-rafael', I + 'im-sino&sino=im-rafael&papel=implantacao', 'Avisos do prazo (Rafael, Implantação)', 'Os mesmos avisos para quem acompanha a implantação.'),
        ('im-sino-isencao', C + 'planos&estado=im-sino&sino=im-isencao', 'Fim da isenção chegando', '“A isenção da implantação termina em 30 dias, em 31/05/2027”, em 01/05/2027, com o caminho para a folha da regra.'),
    ]),
    ('7. Console · ficha, aba Contrato', 'ficha.html?aba=contrato. A ação aprovada “Concluir a implantação” agora leva à aba Implantação.', [
        ('im-contrato', 'ficha.html?aba=contrato&estado=im-contrato', 'Contrato e documentos', 'O botão “Concluir a implantação” virou um link para a aba Implantação, onde fica o resumo e o efeito na cobrança.'),
    ]),
    ('8. Portal · Escritório › Implantação', 'portal-escritorio.html. Só os sócios veem. Exemplo: Renata Lima, sócia dona da Cedro & Lima. No celular, a barra de baixo aprovada.', [
        ('pt-impl', P + 'pt-impl', 'Implantação em andamento', 'O prazo e os dias que faltam, quem acompanha (Rafael Teles, com “Falar com Rafael”), o custo (sem custo, na oferta de lançamento), o que a equipe T3jus faz (treina todas as pessoas, acompanha o uso, ajuda a trazer os clientes e o WhatsApp, e treina quem chegar depois; não é uma videochamada só), o que já aconteceu com os atalhos (Equipe, Importar, WhatsApp) e as pessoas com o treino.'),
        ('pt-impl-concluida', P + 'pt-impl-concluida', 'Implantação concluída', 'Concluída em 07/12/2026, 9 dias antes do prazo, com o resumo que a equipe escreveu, quem acompanhou (à disposição pela Ajuda) e o que aconteceu. Quem entrar no escritório depois também recebe o treino.'),
        ('pt-impl-erro', P + 'pt-impl-erro', 'Erro na seção', 'Só a seção falha; o resto da página funciona.'),
    ]),
    ('9. Portal · Início', 'portal-inicio.html. O cartão da implantação para os sócios e “Seu treino” para cada pessoa.', [
        ('pt-inicio-socia', N + 'pt-inicio-socia', 'Sócia dona', 'Cartão da implantação: faltam 19 dias, Rafael Teles acompanha até 16/12/2026, 4 de 6 treinadas, o que falta (treinar Tiago, o convite do Diego, ligar o WhatsApp) e “Ver a implantação”.'),
        ('pt-inicio-sem-treino', N + 'pt-inicio-sem-treino', 'Pessoa sem treino (Tiago Ramos)', '“Seu treino ainda vai ser marcado”: Rafael Teles combina o horário, por vídeo, no escritório ou por telefone, e a Ajuda tem os primeiros passos do Jurídico. “Falar com Rafael”. Sem valores nem dados dos outros.'),
        ('pt-inicio-treinada', N + 'pt-inicio-treinada', 'Pessoa treinada (Joana Freitas)', '“Você foi treinada em 24/11”: presencial, 2h, com Rafael Teles, e os temas. Rafael segue acompanhando até 16/12, com “Falar com Rafael”.'),
    ]),
    ('10. Portal · Escritório › Plano e faturas', 'portal-escritorio.html. A linha da implantação e a fatura com a isenção, só para a sócia dona.', [
        ('pt-plano-isenta', P + 'pt-plano-isenta', 'Plano e faturas, implantação isenta', 'O plano com o desconto de entrada, a implantação “Isenta · Oferta de lançamento” (vale R$ 1.490,00 e sai sem custo) e a próxima fatura, a 1ª, de R$ 399,20, com as quatro linhas.'),
        ('pt-plano-pagar', P + 'pt-plano-pagar', 'Pagar a 1ª fatura', 'A janela aprovada de Pagar com os itens da fatura e o total de R$ 399,20.'),
        ('pt-plano-cobrada', P + 'pt-plano-cobrada', 'Implantação cobrada (exemplo)', 'A linha diz R$ 1.490,00 à vista na 1ª fatura; total R$ 1.889,20.'),
    ]),
    ('11. Portal · Assinar o T3jus (CO-09)', 'portal-escritorio.html. A página é do CO-09; aqui só o lugar e a linha da implantação, sobre um esboço.', [
        ('pt-assinar', P + 'pt-assinar', 'Assinar, com a isenção', 'O que vem na 1ª fatura, com a implantação de R$ 1.490,00 e a isenção de − R$ 1.490,00 (“os 6 primeiros meses do T3jus”), e o que a equipe T3jus faz nos 30 dias. A página é do CO-09; aqui é um esboço.'),
        ('pt-assinar-cobrada', P + 'pt-assinar-cobrada', 'Assinar, com a implantação cobrada', 'O mesmo com R$ 1.490,00 à vista na 1ª fatura.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, its in SECOES for it in its]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_im.json'), 'w'), ensure_ascii=False, indent=1)

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


def conta(cobrada):
    ls = [('Mensalidade do plano Escritório', brl(MENSAL)), ('Desconto de entrada (20%)', brl(-DESC)), ('Implantação assistida', brl(VALOR))]
    if not cobrada:
        ls.append(('Isenção da implantação · Oferta de lançamento', brl(-VALOR)))
    ls.append(('Total da 1ª fatura', brl(TOTAL_COBRADA if cobrada else TOTAL_ISENTA)))
    return ''.join(f'<li{" class=t" if i == len(ls) - 1 else ""}><span>{h(a)}</span><b>{h(b)}</b></li>' for i, (a, b) in enumerate(ls))


index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Implantação assistida · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
header a{{color:#fff}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
.contas{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px;max-width:900px}}
.contas div{{background:#87335B;border-radius:12px;padding:12px 16px}} .contas h2{{font-size:18px;color:#F2CDB3}}
.contas ul{{list-style:none;margin:6px 0 0;padding:0}} .contas li{{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#fff;padding:2px 0}}
.contas li b{{white-space:nowrap;font-weight:500}} .contas li.t{{border-top:1px solid #AC788D;margin-top:4px;padding-top:6px;font-weight:600}} .contas li.t b{{font-weight:600}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}} .contas{{grid-template-columns:1fr}} h1{{font-size:32px}}}}
</style></head><body>
<header><p class="sobre">T3jus · CO-08 · D43 · para aprovação da Carol</p><h1>Implantação assistida</h1>
<p>A equipe T3jus treina todas as pessoas do escritório e acompanha o uso por até 30 dias, não uma videochamada só. No Console: a aba Implantação na ficha, a regra em Cobrança › Planos, o bloco na Assinatura, a fatura e os PDFs com as linhas novas, o sino e a aba Contrato. No Portal: Escritório › Implantação, o Início, Plano e faturas e a linha em Assinar o T3jus (CO-09). Nos 6 primeiros meses a implantação é isenta: o valor aparece e a isenção também, somando zero. Valor de R$ 1.490,00 provisório; preços dos planos de exemplo. Hoje é 27/11/2026. Contorno tracejado marca o que é novo. Cada estado tem computador (1440) e celular (412); clique numa imagem para abrir o HTML naquele estado. Decisões e perguntas estão em NOTAS.md.</p>
<div class="contas"><div><h2>1ª fatura, implantação isenta</h2><ul>{conta(False)}</ul></div><div><h2>1ª fatura, implantação cobrada</h2><ul>{conta(True)}</ul></div></div>
<nav class="ir" aria-label="Ir para">{nav}</nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'estados')
