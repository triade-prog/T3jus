# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos.py <pasta-saida>
# "alto": altura da janela do computador na captura, para as janelas longas aparecerem inteiras.
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'juridico.html?estado='

SECOES = [
    ('1. Casos e processos', 'Primeira seção da área Jurídico. A lista mostra número, cliente e etapa sem abrir; filtros por responsável e etapa; a faixa “Onde estão os casos” conta os casos por etapa e serve de filtro. EX-01, EX-07, IN-08.', [
        ('casos', 'Lista de casos (sócia dona)', 'Busca, filtros de responsável e etapa, Em andamento e Encerrados. Cada linha: caso e número, cliente (com “e mais 1” quando há vários), etapa com a régua de 8, responsável, próximo prazo e pendências. Prazo de hoje ganha filete e selo escrito. “Etapas do escritório” só aparece para a sócia dona.', 0),
        ('casos-larissa', 'Filtrado por responsável (Larissa, só Jurídico)', 'Larissa abre a área inteira, mas não vê o botão “Etapas do escritório”. O filtro de responsável traz os casos dela.', 0),
        ('casos-vazio', 'Primeiro uso', 'Sem casos: dois passos, conferir as etapas sugeridas e cadastrar o primeiro caso.', 0),
        ('novo-caso', 'Novo caso', 'Nome, área e parte contrária; clientes do caso, cada um com papel e contrato (aqui, ainda sem contrato: avisa e não bloqueia); processo opcional (número, sistema, tribunal, vara, valor); etapa, responsável e o aviso ao cliente.', 0),
    ]),
    ('2. Ficha do caso', 'O coração da área. Cabeçalho da ficha aprovada do Console: vinho com a balança e, no âmbar, a etapa atual com a régua e o botão Mudar etapa. EX-01, EX-02, EX-03, EX-04, EX-05, EX-07, EX-08, EX-14, CH-05, CH-07, PD-05, FI-08.', [
        ('ficha', 'Ficha (sócia dona)', 'Dados do processo (área, parte contrária, tribunal, vara, sistema), os dois clientes com os próprios honorários, prazos e tarefas com responsável, documentos que faltam e ligados. Ao lado: o que está travando, contratos ligados, resumo financeiro, aviso ao cliente e as mudanças de etapa com motivo.', 0),
        ('mudar-etapa', 'Mudar etapa', 'Etapa atual marcada, a nova escolhida (Recurso), motivo obrigatório e o aviso aos clientes pelo WhatsApp com a prévia do texto simples da etapa. O botão diz o que vai acontecer.', 1500),
        ('mudar-etapa-erro', 'Mudar etapa · motivo vazio', 'Resumo no topo e o erro preso ao campo, com aria-invalid. Diz que a etapa não mudou e que nenhum aviso saiu.', 1500),
        ('etapa-mudada', 'Etapa mudada', 'O âmbar passa a 6 de 8, Recurso. A mudança entra no topo do histórico com o motivo e a hora do aviso. Aviso de sucesso.', 0),
        ('etapa-final', 'Etapa final: pede o resultado', 'Encerrado pede Ganho, Perda ou Acordo, o valor de cada cliente e a data prevista. O êxito de cada contrato é calculado e vai ao Financeiro para conferir; o caso fica “acerto pendente” até tudo ser recebido e repassado.', 1960),
        ('ficha-sem-financeiro', 'Ficha sem Financeiro (Larissa)', 'Sem o resumo financeiro e sem valores de honorários. Os contratos ligados aparecem sem valores, e uma linha diz quem libera.', 0),
    ]),
    ('3. Etapas do escritório', 'Onde a sócia dona define a lista de etapas: Casos e processos › Etapas do escritório. EX-07, EX-08, EX-14, CH-07.', [
        ('etapas', 'Etapas do escritório', 'As 8 etapas sugeridas, com quantos casos estão em cada uma, o texto que o cliente recebe e os selos “Avisa o Financeiro” e “Etapa final”. Subir, descer e editar; uma etapa aberta em edição com a prévia do WhatsApp.', 0),
    ]),
    ('4. Prazos', 'Cadastrados à mão (EX-04). A urgência vem escrita no selo e no disco; não há verde nem vermelho. A leitura de publicações é integração posterior e não aparece como se existisse.', [
        ('prazos', 'Prazos abertos', 'Agrupados por Hoje, Amanhã, Até sexta e Depois. Cada prazo: dia no disco (âmbar quando é hoje), o que é, caso, número, responsável e “Cumprido”. O “fazer até” mostra a margem do escritório.', 0),
        ('novo-prazo', 'Novo prazo', 'Caso, o que é, prazo final, fazer até, responsável, intimação (só para consulta) e lembrete. Diz que o T3jus não conta dias úteis nesta versão.', 1200),
    ]),
    ('5. Tarefas', 'Toda tarefa tem responsável e vencimento (EX-02, PD-04, PD-07). “Esperando alguém” mostra o que trava (PD-05, IN-06). A carga por pessoa fica discreta, só na visão da equipe (IN-08).', [
        ('tarefas', 'Minhas tarefas', 'Atrasada, Hoje, Esta semana e Esperando alguém, com o caso de cada tarefa e o que ela espera.', 0),
        ('tarefas-equipe', 'Tarefas da equipe', 'As mesmas tarefas com o responsável e o filtro. Ao lado, “Carga da equipe”: casos e tarefas de cada pessoa em barras finas, com a nota de que é para ver onde o trabalho acumula.', 0),
    ]),
    ('6. Petições', 'EX-09 é hipótese a validar: só o lugar reservado e a pergunta aos escritórios piloto.', [
        ('peticoes', 'Petições: lugar reservado', 'Explica o que está em estudo e pergunta se a pessoa usaria, com um campo opcional sobre como faz hoje. Nada é gerado.', 0),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for nome, t, leg, alto in itens:
        casos.append({'nome': nome, 'url': U + nome, 'alto': alto})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for n, (titulo, sub, itens) in enumerate(SECOES, 1):
    corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, t, leg, _ in itens:
        url = U + nome
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portal · Jurídico · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: Jurídico</h1>
<p>A área Jurídico: casos e processos com vários clientes (EX-01), a ficha do caso com etapas definidas pelo escritório (EX-07), mudança de etapa com motivo, resultado na etapa final (EX-08, CH-07) e aviso ao cliente pelo WhatsApp (EX-14), prazos cadastrados à mão (EX-04), tarefas com responsável (EX-02) e o lugar reservado de Petições (EX-09). Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Casos</a><a href="#s2">Ficha do caso</a><a href="#s3">Etapas do escritório</a><a href="#s4">Prazos</a><a href="#s5">Tarefas</a><a href="#s6">Petições</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
