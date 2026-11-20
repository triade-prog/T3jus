# Lista de estados (casos.json, lido pelo fotos.cjs) e o index.html com as capturas.
# Uso: python3 casos.py <pasta-saida>
import json, html, os, sys
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
E = 'equipe.html?estado='
C = 'contratos.html?estado='
K = 'conta.html?estado='
SECOES = [
    ('1. Equipe: a OAB de cada advogado', 'equipe.html. A OAB fica na Equipe, uma vez por pessoa, e é opcional: só quem é advogado tem. Pode haver mais de uma inscrição (principal e suplementar). Só a sócia dona vê e muda a Equipe.', [
        ('equipe-ver', E + 'ver', 'Lista da equipe com a OAB', 'A lista aprovada, com a OAB embaixo do nome (Felipe tem duas). Quem não tem OAB não ganha nada: secretária e financeiro não ficam marcados como pendentes. O nome leva à ficha da pessoa.'),
        ('equipe-pessoa', E + 'pessoa', 'Ficha da pessoa: duas inscrições', 'Felipe Matos: no âmbar, como o nome e a OAB saem no contrato e na procuração. Embaixo, as inscrições (SP principal, RJ suplementar), com Editar e Remover, e onde ele assina como advogado.'),
        ('equipe-pessoa-sem-oab', E + 'pessoa-sem-oab', 'Ficha da pessoa: sem OAB', 'Gustavo Lima acabou de entrar e ainda não tem OAB. O âmbar diz que ele não aparece como advogado nos contratos e oferece Adicionar inscrição.'),
        ('equipe-inscricao-nova', E + 'inscricao-nova', 'Adicionar inscrição', 'UF da seccional (27), número só com dígitos, letra opcional e tipo. A linha âmbar mostra como vai sair no documento.'),
        ('equipe-inscricao-erros', E + 'inscricao-erros', 'Adicionar inscrição · erros de campo', 'Resumo no topo com links e cada erro preso ao campo: UF não escolhida e número com letra no meio.'),
        ('equipe-inscricao-duplicada', E + 'inscricao-duplicada', 'Adicionar inscrição · número de outra pessoa', 'OAB/SP 401.226 já é de Larissa Costa nesta equipe. O servidor recusa e a mensagem diz o que conferir.'),
        ('equipe-inscricao-salva', E + 'inscricao-salva', 'Inscrição salva', 'O âmbar já mostra “Gustavo Lima, OAB/SP nº 512.907” e o aviso diz que vale para os documentos gerados daqui em diante.'),
        ('equipe-inscricao-editar', E + 'inscricao-editar', 'Editar inscrição suplementar', 'Felipe, OAB/RJ 245.880-S. Marcar esta como principal troca a de SP para suplementar, e o texto avisa antes.'),
        ('equipe-inscricao-remover', E + 'inscricao-remover', 'Remover inscrição', 'Janela de confirmação com foco no Voltar. Os documentos já gerados não mudam; os novos saem só com a de SP.'),
        ('equipe-convidar', E + 'convidar', 'Convidar pessoa com a OAB', 'O convite aprovado com um grupo “OAB (opcional)”: UF, número e letra da inscrição principal. A linha âmbar mostra como vai sair.'),
        ('equipe-convidar-oab-erro', E + 'convidar-oab-erro', 'Convidar · UF sem número', 'UF e número vão juntos: escolheu RJ e não escreveu o número. A mensagem diz como sair (escrever o número ou voltar a UF para “Escolha”).'),
    ]),
    ('2. Sua conta: cada pessoa confere a própria OAB', 'conta.html. Decisão 1 da Carol: a Equipe continua só da sócia dona. Quem não é dona vê só as próprias inscrições, para ler, em Sua conta: no computador, pelo nome no pé do menu; no celular, pelo Mais.', [
        ('conta', K + 'conta', 'Sua conta · duas inscrições', 'Felipe Matos (não é sócio dono) vê como sai no contrato e na procuração, as duas inscrições sem Editar nem Remover, e com quem falar se um número estiver errado. Embaixo, os contratos em que assina e as inscrições que vão em cada um.'),
        ('conta-sem-oab', K + 'conta-sem-oab', 'Sua conta · sem OAB', 'Paula Nunes não tem OAB. O âmbar diz que é o normal para quem não é advogada e, se for, quem cadastra.'),
        ('conta-mais', K + 'conta&mais=1', 'Celular · Mais com Sua conta', 'Item novo “Seus dados e sua OAB” no grupo Sua conta do Mais. O item Equipe não aparece para quem não é dono, como no aprovado.', ['celular']),
    ]),
    ('3. Contratos: as inscrições de cada advogado', 'contratos.html. Decisão 2 da Carol: ao criar o contrato, quem cria pode escolher quais inscrições de cada advogado vão no contrato e na procuração. O padrão é todas, com a principal primeiro; fica pelo menos uma por advogado.', [
        ('contratos-novo-sem-oab', C + 'novo-sem-oab', 'Novo contrato · advogados (padrão)', 'Só quem tem OAB pode ser marcado. Felipe, marcado, abre as duas inscrições, já marcadas. Marina tem uma só, que vai sempre. A linha âmbar mostra como sai. Embaixo, “Sem OAB cadastrada” com os nomes e o link para a Equipe.'),
        ('contratos-novo-inscricoes', C + 'novo-inscricoes', 'Novo contrato · só a OAB de SP', 'O caso é em São Paulo: Felipe desmarca a OAB/RJ. A linha âmbar já mostra Felipe só com a OAB/SP.'),
        ('contratos-novo-inscricao-erro', C + 'novo-inscricao-erro', 'Novo contrato · nenhuma inscrição', 'Felipe ficou marcado sem nenhuma inscrição. O resumo no topo leva às caixas, e a mensagem diz como sair: marcar uma ou desmarcar o nome.'),
        ('contratos-contrato-inscricoes', C + 'contrato-inscricoes', 'Ficha do contrato · inscrições escolhidas', 'Em Responsáveis, cada advogado diz o que vai no documento; a OAB/RJ de Felipe aparece como “fica fora deste contrato”. Mudar inscrições abre a janela.'),
        ('contratos-contrato-inscricoes-mudar', C + 'contrato-inscricoes-mudar', 'Ficha do contrato · mudar inscrições', 'As mesmas caixas, só para as inscrições. Vale para os documentos gerados daqui em diante; os já gerados não mudam.'),
        ('contratos-contrato-sem-oab', C + 'contrato-sem-oab', 'Ficha do contrato · advogada sem OAB', 'A OAB de Larissa foi removida da Equipe depois que ela entrou no contrato. Responsáveis mostra “sem OAB cadastrada” com selo e explica o que acontece nos próximos documentos. A sócia dona tem o link.'),
        ('contratos-contrato-sem-oab-pessoa', C + 'contrato-sem-oab-pessoa', 'A mesma ficha vista por quem não é dona', 'Felipe tem Contratos, mas não muda a Equipe: no lugar do link, o texto diz que quem cadastra é Marina Ribeiro.'),
    ]),
]
casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1], **({'tams': it[4]} if len(it) > 4 else {})})
json.dump(casos, open('casos.json', 'w'), ensure_ascii=False, indent=1)
h = lambda s: html.escape(s, quote=True)
corpo = ''
for i, (titulo, sub, itens) in enumerate(SECOES, 1):
    corpo += f'<section id="s{i}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg, *tm in itens:
        figs = ''
        for tam in (tm[0] if tm else ['computador', 'celular']):
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Equipe com OAB · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Equipe: a OAB de cada advogado</h1>
<p>Acréscimo às telas aprovadas da Equipe (Portal v1) e de Contratos. O número da OAB e a UF ficam na Equipe, uma vez por pessoa, e saem dali para o contrato de honorários e a procuração (“Nome, OAB/UF nº”). É opcional, aceita mais de uma inscrição e só a sócia dona muda; cada pessoa confere a própria em Sua conta. Em cada contrato, quem cria escolhe quais inscrições vão (o padrão é todas). Revisão de 19/11/2026, com as respostas da Carol. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões e validação estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Equipe</a><a href="#s2">Sua conta</a><a href="#s3">Contratos</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
