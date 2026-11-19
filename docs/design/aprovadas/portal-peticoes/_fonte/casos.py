# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos.py <pasta-saida>
# "alto": altura da janela do computador na captura, para as janelas longas aparecerem inteiras.
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'peticoes.html?estado='

SECOES = [
    ('1. Petições', 'A seção Petições do Jurídico, que substitui o lugar reservado aprovado (decisão 11). A lista mostra as petições geradas pelo escritório: modelo, arquivo, caso, quem gerou, quando e se saiu com algum dado marcado. EX-09.', [
        ('peticoes', 'Petições (sócia dona)', 'Busca, filtro por situação, Todas, Minhas e Para eu revisar. Cada linha: modelo e arquivo, caso (leva à ficha), quem gerou e quando, e a situação (Rascunho, Em revisão, Ajuste pedido, Aprovada, Reprovada) com o detalhe: com quem está, quem decidiu, dados marcados. Só a aprovada tem Baixar; a que espera Marina tem Revisar.', 0),
        ('peticoes-vazio', 'Primeiro uso', 'Sem petições: dois passos, conferir os modelos (já vêm 8 padrão do T3jus) e gerar a primeira.', 0),
    ]),
    ('2. Modelos de petição', 'Uma página dentro de Petições, como Etapas do escritório dentro de Casos. Modelos do escritório e padrão do T3jus, por área, em .docx com campos entre colchetes (o mesmo padrão aprovado em Procurações e modelos, CH-08).', [
        ('modelos', 'Modelos por área', 'Trabalhista, Cível e Para qualquer área. Cada modelo: “Do escritório” ou “Padrão T3jus”, versão, quem enviou, quantos campos, quantas vezes foi usado, Baixar e Trocar. Ao lado, os campos aceitos e quem muda os modelos.', 0),
        ('modelo-enviar', 'Enviar modelo, com a conferência', 'O arquivo .docx, nome, tipo de peça, área e qual modelo substitui (a versão anterior fica guardada). A conferência lista os 11 campos achados; o desconhecido [NOME_RECLAMADA] gera aviso e não bloqueia.', 1500),
        ('modelo-erro', 'Enviar modelo: arquivo em PDF', 'O erro fica preso ao arquivo e diz como sair: salvar como Documento do Word. O modelo atual continua valendo.', 1300),
    ]),
    ('3. Nova petição', 'Quatro passos curtos: caso, modelo, dados da peça e prévia. Começando pela ficha do caso, o passo do caso já vem feito. Nada de texto escrito por IA: é o modelo do escritório preenchido.', [
        ('nova-caso', 'Passo 1: o caso', 'Busca e os casos em andamento em cartões de escolha, com número, área, clientes e etapa. Ao lado, de onde vem cada dado.', 0),
        ('nova-modelo', 'Passo 2: o modelo', 'Os modelos da área do caso primeiro, depois os que servem a qualquer área; “Outras áreas” fica fechado. Ao lado, o resumo com Trocar.', 0),
        ('nova-dados', 'Passo 3: dados da peça', 'Só o que o modelo usa: endereçamento montado da vara, número e vara do caso, valor da causa (do caso, editável só nesta petição), clientes que entram como partes, qualificação da parte contrária e quem assina. Felipe entra só com a OAB/SP: a OAB/RJ foi desmarcada nesta petição. A linha âmbar mostra como os advogados saem no documento.', 0),
        ('nova-erro', 'Passo 3: o que impede a prévia', 'Endereçamento vazio e nenhum advogado marcado: resumo no topo com links e o erro preso a cada campo. São os dois únicos bloqueios; dado faltando no cadastro não bloqueia.', 0),
        ('nova-previa', 'Passo 4: prévia e gerar', 'A prévia em papel timbrado, como a aprovada em Contratos: dado do cadastro (traço), deste formulário (pontilhado) e o que falta em destaque ([RG: falta]). Ao lado, o que conferir, o aviso de que o T3jus não revisa nem protocola e Gerar o .docx.', 0),
        ('nova-dados-larissa', 'Passo 3 por quem só tem Jurídico (Larissa)', 'Caso sem número ainda: o campo fica vazio e explica que sai marcado, com a opção de gravar o número no caso. Larissa vê e muda o valor da causa; honorários não entram em petições.', 0),
        ('nova-faltas', 'Passo 4 com dois dados faltando', 'Sem número do processo e sem o RG da cliente: os dois saem marcados. Para o número, a tela lembra que, antes da distribuição, o modelo certo talvez seja a inicial. O botão diz “Gerar com 2 dados marcados”.', 0),
    ]),
    ('4. Revisão pelo advogado responsável', 'Pedido da Carol: quando quem gera não é o advogado responsável pelo caso (aqui, a estagiária Beatriz Nogueira no caso de Felipe Matos), a petição vai para a revisão dele. Ele aprova, pede ajuste ou reprova, com comentário geral e comentários presos a um parágrafo. A v1 e a v2 ficam no histórico. Só a aprovada sai pronta.', [
        ('revisao-enviar', 'Passo 4 pela estagiária: enviar para revisão', 'O último passo vira “Prévia e enviar”: diz que vai para Felipe Matos, responsável pelo caso, e só fica pronta depois da aprovação. Recado opcional. Dá para guardar como rascunho.', 0),
        ('revisao-enviada', 'Enviada: Em revisão', 'Situação “Em revisão” com quem e desde quando, o rascunho para baixar (com “Rascunho · em revisão” no cabeçalho), o que acontece agora e a versão 1 no histórico.', 0),
        ('aviso-revisao', 'Para eu revisar (Felipe)', 'O filtro “Para eu revisar” com a contestação e o botão Revisar. Ao lado, como o pedido chega: no sino e no Início, em “Pedem você agora”, com o prazo do caso.', 0),
        ('revisar', 'Tela de revisão', 'A prévia com um botão de comentar ao lado de cada parágrafo (aqui, um comentário sendo escrito na qualificação). Ao lado: quem enviou, o recado, o prazo do caso, os dados usados, as versões e a decisão: Aprovar, Pedir ajuste ou Reprovar.', 0),
        ('revisar-ajuste', 'Pedir ajuste', 'Um comentário preso ao parágrafo da qualificação e um comentário geral. O botão diz “Pedir ajuste a Beatriz”.', 0),
        ('revisar-erro', 'Pedir ajuste sem comentário', 'Resumo no topo e o erro preso ao comentário geral (COMENTARIO_OBRIGATORIO). Nada foi enviado.', 0),
        ('passar-revisao', 'Passar a revisão', 'Felipe passa para outro advogado com OAB e Jurídico, com o motivo opcional. Ele continua responsável pelo caso.', 1100),
        ('ajuste-pedido', 'Ajuste pedido (Beatriz)', 'Os comentários de Felipe (o geral e o do parágrafo, com o trecho), a v1 com o comentário no lugar e as duas formas de corrigir: refazer pelos dados ou enviar o .docx editado no Word.', 0),
        ('reenviar-v2', 'Enviar a versão 2', 'O .docx editado (conferido: nenhum dado “falta”), cada comentário marcado como resolvido e o recado. Vai como v2, para Felipe de novo.', 0),
        ('revisar-v2', 'Revisar a v2 e aprovar', 'A prévia do .docx editado, o comentário da v1 marcado como resolvido, o histórico v1 (ajuste pedido) e v2, e Aprovar com comentário opcional.', 0),
        ('aprovada', 'Aprovada: pronta', 'Só agora a petição sai pronta: Baixar o .docx sem a marca de rascunho, o comentário de Felipe, o aviso de que o T3jus não protocola nem revisa e as versões.', 0),
        ('reprovada', 'Reprovada', 'O motivo obrigatório, guardada sem sair como pronta (PT-03), o rascunho para consulta e “Gerar outra petição deste caso”.', 0),
    ]),
    ('5. Resultado e ficha do caso', 'O arquivo gerado fica ligado ao caso e aparece nos documentos da ficha. A assinatura eletrônica (CH-09) é só lugar reservado.', [
        ('gerada', 'Petição gerada pela responsável', 'Marina é a responsável pelo caso: sai aprovada, sem revisão. Baixar o .docx, o dado que saiu marcado, o aviso claro de que o T3jus não protocola nem revisa o conteúdo jurídico, os próximos passos e o lugar reservado da assinatura eletrônica. Ao lado, como saiu.', 0),
        ('ficha-peticoes', 'Ficha do caso com Petições', 'A ficha aprovada ganha “Gerar petição” em Documentos e a folha “Petições do caso” na lateral, com a situação de cada uma (a juntada de Beatriz espera Marina: Revisar). Só a aprovada entra nos documentos ligados.', 0),
    ]),
    ('6. Quem vê', 'A área só aparece para quem a sócia dona liberou (PA-01, PA-02). Quem só tem Jurídico usa Petições inteira; o estado de Larissa está na seção 3.', [
        ('sem-juridico', 'Sem a área Jurídico (Paula)', 'O Jurídico não aparece no menu nem no Mais. Quem abre um link direto vê o aviso, com quem libera, e o servidor responde AREA_NAO_LIBERADA.', 0),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for nome, t, leg, alto in itens:
        casos.append({'nome': nome, 'url': U + nome, 'alto': alto, 'titulo': t, 'legenda': leg})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)


def montar(img):
    """img(nome, tam) devolve o src da captura."""
    corpo = ''
    for n, (titulo, sub, itens) in enumerate(SECOES, 1):
        corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
        for nome, t, leg, _ in itens:
            url = U + nome
            figs = ''
            for tam in ['computador', 'celular']:
                figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{img(nome, tam)}" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                         f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
            corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                      f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
        corpo += '</section>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jurídico · Petições · T3jus</title>
<meta name="description" content="Desenho da seção Petições do Jurídico (EX-09), em computador e celular, para a Carol aprovar.">
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Jurídico: Petições</h1>
<p>O gerador de petições (EX-09, a validar): modelos do escritório em Word, preenchidos com a qualificação dos clientes, os dados do caso e a OAB de quem assina, mais um formulário curto (endereçamento, valor da causa, partes e advogados). Sai um .docx para revisar; o T3jus não escreve, não revisa e não protocola. Quando quem gera não é o advogado responsável pelo caso, a petição passa pela revisão dele antes de ficar pronta. Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Petições</a><a href="#s2">Modelos</a><a href="#s3">Nova petição</a><a href="#s4">Revisão</a><a href="#s5">Resultado e ficha</a><a href="#s6">Quem vê</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(lambda n, t: f'{n}-{t}.webp'))
    print(len(casos), 'casos')
