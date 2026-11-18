# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'clientes.html?estado='

SECOES = [
    ('1. Lista de clientes', 'Item Clientes do trilho (no celular, dentro do Mais). Todos da equipe veem a lista; origem, próximo contato e o filtro de vencidos são da área Comercial. AP-01, AP-04, AP-06.', [
        ('lista', U + 'lista', 'Lista (sócia dona)', 'Busca por nome, CPF, CNPJ ou telefone e três filtros: Ativos, Inativos e Contato vencido. Cada linha: nome e tipo, contato principal com papel e telefone, origem, próximo contato e situação. A linha com contato vencido tem filete e selo de urgência com quantos dias.'),
        ('busca', U + 'busca', 'Busca por nome', '“Prado” acha a cliente e quem tem o sobrenome num contato. O trecho encontrado fica marcado.'),
        ('busca-cpf', U + 'busca-cpf', 'Busca por CPF', 'O CPF completo leva direto ao cliente. A lista não mostra CPF; ele só aparece na ficha.'),
        ('vencidos', U + 'vencidos', 'Filtro: contato vencido', 'Só quem tem o próximo contato vencido, do mais atrasado para o mais recente.'),
        ('inativos', U + 'inativos', 'Filtro: inativos', 'Cliente inativado continua guardado e encontrável. Nada foi apagado.'),
        ('sem-resultado', U + 'sem-resultado', 'Nenhum resultado', 'Diz o que tentar (grafia, telefone, CPF, filtro Inativos) e oferece cadastrar.'),
        ('vazio', U + 'vazio', 'Primeiro cliente', 'Escritório sem cliente: o que basta para começar e um botão só.'),
        ('carregando', U + 'carregando', 'Carregando', 'Esqueleto no formato da lista, aria-busy e aviso para leitor de tela.'),
        ('erro', U + 'erro', 'Erro ao carregar', 'Tentar de novo e código para o suporte. Diz que nada se perdeu.'),
        ('lista-sem-comercial', U + 'lista-sem-comercial', 'Sem a área Comercial (Larissa, só Jurídico)', 'Vê a lista com nome, tipo, contato e situação. As colunas Origem e Próximo contato e o filtro de vencidos não aparecem; o pé da folha diz por quê e quem libera.'),
    ]),
    ('2. Cadastrar cliente', 'Página própria (Clientes › Novo cliente), não janela: o formulário cresce com a qualificação. Obrigatório só o nome e um telefone ou e-mail. AP-01, PT-11.', [
        ('novo', U + 'novo', 'Pessoa física, só o mínimo', 'Tipo, nome, telefone ou e-mail e CPF opcional. Origem e quem indicou (Comercial). A qualificação vem fechada, com “Preencher agora”. Cada campo diz para que serve: o selo “procuração” ou a ajuda “Para falar com o cliente”.'),
        ('novo-qualificacao', U + 'novo-qualificacao', 'Qualificação aberta', 'Nacionalidade, estado civil, profissão, RG com órgão emissor, CEP, endereço, bairro, cidade e UF, cada um com o selo da finalidade. No topo, a regra LGPD: só o que vai para a procuração e o contrato. CPF com “Dígitos conferidos”.'),
        ('novo-erros', U + 'novo-erros', 'Erros presos ao campo', 'Resumo no topo e três erros: nome vazio, nenhum contato e CPF com dígito que não confere. aria-invalid e aria-describedby em cada um.'),
        ('novo-duplicado', U + 'novo-duplicado', 'Possível duplicado (não bloqueia)', 'O telefone já é de Antônia Ferreira Prado. O aviso oferece abrir a ficha dela e explica quando cadastrar mesmo assim. O botão Cadastrar continua valendo.'),
        ('novo-pj', U + 'novo-pj', 'Pessoa jurídica', 'Razão social, com quem falar e o papel, contato e CNPJ opcional. A qualificação pede a sede e quem assina pela empresa.'),
        ('cadastrado', U + 'cadastrado', 'Cadastrado', 'A ficha nova abre com o aviso de sucesso. “Para gerar a procuração: 1 de 7” mostra o que falta, sem bloquear nada.'),
    ]),
    ('3. Ficha do cliente', 'Cabeçalho da ficha aprovada do Console (vinho com a estátua, corte para o âmbar). No âmbar, o próximo contato, que é o que o escritório precisa fazer. Abas Ficha e Atendimentos. AP-01, AP-02, AP-04, AP-06, CH-08, EX-01.', [
        ('ficha', U + 'ficha', 'Ficha (pessoa física)', 'Dados e qualificação com o que falta marcado; contatos com papel (Joana, a filha que acompanha, é a principal); ao lado, o que falta para a procuração (5 de 7), a origem, o espaço reservado para Contratos e Casos e a situação com Inativar.'),
        ('atendimentos', U + 'atendimentos', 'Histórico de atendimento', 'Aviso de próximo contato vencido no topo, com Registrar. Por dia: hora, quem atendeu, canal, com quem falou, o resumo e o próximo contato que foi marcado.'),
        ('registrar', U + 'registrar', 'Registrar atendimento', 'Data e hora, canal, quem atendeu, com quem falou (os contatos da ficha), resumo e o próximo contato (data, responsável, o que fazer) ou “Sem próximo contato”.'),
        ('registrar-erros', U + 'registrar-erros', 'Registrar · erros', 'Resumo vazio e data do próximo contato no passado, cada erro no campo.'),
        ('registrado', U + 'registrado', 'Atendimento registrado', 'O novo atendimento entra no topo com o selo Novo; o âmbar passa a mostrar 20/11, com Paula Nunes. O aviso diz que o de 13/11 foi encerrado.'),
        ('editar', U + 'editar', 'Editar ficha', 'Mesmo formulário do cadastro, preenchido, com a qualificação aberta e os contatos em blocos, com papel e o principal marcado.'),
        ('conflito', U + 'conflito', 'Conflito de edição', 'Felipe Matos salvou às 14h52 enquanto você editava. Compara só os campos que mudaram e oferece as duas saídas. Os campos ganham o selo Mudou. Nada se perde.'),
        ('ficha-pj', U + 'ficha-pj', 'Ficha (pessoa jurídica)', 'Razão social, CNPJ, sede e o representante legal com a qualificação dele. Procuração: 6 de 6.'),
        ('ficha-sem-comercial', U + 'ficha-sem-comercial', 'Ficha sem a área Comercial', 'Larissa vê dados, qualificação e contatos. Sem a aba Atendimentos, sem origem; o âmbar mostra o que falta para a procuração.'),
        ('ficha-carregando', U + 'ficha-carregando', 'Ficha carregando', 'Esqueleto do cabeçalho e das folhas.'),
        ('ficha-erro', U + 'ficha-erro', 'Ficha com erro', 'Tentar de novo, voltar para a lista e código para o suporte.'),
    ]),
    ('4. Inativar e reativar', 'Nada é apagado (PT-03). Inativar pede motivo, encerra o próximo contato e tira o cliente da lista do dia a dia. Reativar devolve tudo como estava.', [
        ('inativar', U + 'inativar', 'Inativar (alertdialog)', 'Motivo obrigatório e o que acontece: nada é apagado, o próximo contato é encerrado, dá para reativar.'),
        ('inativar-erro', U + 'inativar-erro', 'Inativar · sem motivo', 'Resumo no topo e erro preso ao campo. Antônia continua ativa.'),
        ('inativo', U + 'inativo', 'Ficha de cliente inativo', 'Faixa com quem inativou, quando e o motivo, e o botão Reativar. Sem próximo contato.'),
        ('reativar', U + 'reativar', 'Reativar', 'Motivo opcional. Volta com dados, contatos e atendimentos.'),
        ('reativado', U + 'reativado', 'Reativado', 'Aviso de sucesso e o convite para registrar o atendimento que trouxe o cliente de volta.'),
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
<title>Portal · Clientes · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Portal: Clientes</h1>
<p>O cadastro único de clientes e contatos (AP-01), com a qualificação usada na procuração e no contrato, a origem (AP-04), o histórico de atendimento (AP-02) e o próximo contato (AP-06). Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Lista</a><a href="#s2">Cadastrar</a><a href="#s3">Ficha</a><a href="#s4">Inativar e reativar</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
