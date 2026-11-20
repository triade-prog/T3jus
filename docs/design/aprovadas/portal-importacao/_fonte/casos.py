# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos.py <pasta-saida>
# "alto": altura da janela do computador na captura, para as janelas longas aparecerem inteiras.
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'importacao.html?estado='

SECOES = [
    ('1. Por onde se chega', 'O botão “Importar planilha” fica no cabeçalho de Clientes e de Contratos. No escritório novo, a lista vazia convida a importar. VA-05.', [
        ('clientes-vazio', 'Clientes de um escritório novo', 'A lista vazia oferece as duas saídas: importar a planilha (principal) ou cadastrar um por um. Embaixo, o atalho para a planilha-modelo.', 0),
        ('clientes-lista', 'Clientes com o botão Importar planilha', 'A lista aprovada, sem mudança, com “Importar planilha” ao lado de “Novo cliente” e, no pé, o caminho para o histórico das importações.', 0),
        ('contratos-lista', 'Contratos com o botão Importar planilha', 'A lista aprovada de Contratos ganha o mesmo botão. Ele abre o mesmo fluxo, já com “Clientes e contratos” marcado.', 0),
    ]),
    ('2. Passo 1: o arquivo', 'O que importar, a planilha-modelo e o arquivo, com os limites ditos antes e o aviso de que o arquivo não fica guardado (PT-11).', [
        ('enviar', 'Enviar a planilha', 'Só clientes, ou clientes e contratos. A planilha-modelo para baixar, o espaço para soltar o arquivo, os limites (.xlsx ou .csv, 5 MB, 2.000 linhas) e o aviso LGPD. Ao lado: como funciona, quem pode importar e as importações anteriores.', 0),
        ('modelo', 'As colunas da planilha-modelo', 'Janela com cada coluna, se é obrigatória e um exemplo. Uma linha por contrato; quatro dos sete tipos de honorário vêm da planilha.', 1300),
        ('lendo', 'Lendo a planilha', 'O arquivo enviado e a leitura em andamento (96 de 148 linhas), com Cancelar e apagar o arquivo.', 0),
        ('arquivo-erro', 'Arquivo que não é planilha', 'Um PDF no lugar da planilha: o erro diz como baixar em .xlsx no Google Planilhas. Ao lado, as mensagens dos outros problemas: vazia, grande demais, com senha e sem os nomes das colunas.', 0),
        ('enviar-sem-contratos', 'Quem não tem a área Contratos (Paula)', 'Paula importa só clientes. A linha diz que as colunas de contrato e de origem ficam de fora e quem libera.', 0),
    ]),
    ('3. Passo 2: as colunas', 'Cada coluna da planilha ligada a um campo do T3jus, já sugerida pelo nome, com o primeiro valor como exemplo. As colunas que ficam de fora aparecem com o motivo.', [
        ('colunas', 'Ligar as colunas', 'A aba da planilha, as 11 colunas do cliente e as 9 do contrato, cada uma com “Vai para” e como foi ligada. Embaixo, os valores que viram itens das listas (“Dra. Marina” vira Marina Ribeiro; “Dr. Paulo”, que saiu, vai para quem você escolher). Ao lado, o que é obrigatório.', 1500),
        ('colunas-erro', 'Campo obrigatório sem coluna', 'Telefone, e-mail e tipo de honorário ficaram como “Não importar”: resumo no topo com links, erro preso a cada coluna e a lista de obrigatórios marcando o que falta. O botão “Ver a prévia” não fica desabilitado.', 1500),
    ]),
    ('4. Passo 3: a prévia antes de salvar', 'O coração da tela. Cada linha aparece pronta, com aviso ou com erro, e o resumo diz o que vai entrar e o que vai para o Financeiro, em centavos exatos. Nada é salvo até importar.', [
        ('previa', 'A prévia', 'Os quatro números (lidas, prontas, com aviso, com erro) são também filtros. Cada linha mostra o cliente, o contrato, o que gera no Financeiro e a situação. Ao lado, o que vai entrar e o botão “Importar 131 linhas prontas”, que explica o que fica de fora.', 0),
        ('previa-erros', 'Linhas com erro: corrigir na prévia', 'A linha 4 aberta para corrigir o CPF com dígito errado, ou pular. Outras: sem telefone e sem e-mail, data que não existe (31/02) e valor com a letra O no lugar do zero.', 0),
        ('previa-duplicado', 'Linhas com aviso: possível duplicado', 'A linha 3 tem o CPF de Antônia, já cadastrada: a comparação campo a campo e as três saídas (juntar, criar outro, pular). Juntar só preenche o que está vazio. Há “Juntar as 6” e outros avisos: telefone de outro cliente, sem data da assinatura, estado civil fora da lista.', 0),
        ('previa-contrato', 'O que um contrato gera', 'A linha 7 aberta: R$ 5.000,00 em 3 parcelas (2 de R$ 1.666,67 e 1 de R$ 1.666,66), a já paga como informação, a vencida entrando em atraso e a soma que fecha no total.', 0),
        ('confirmar', 'Confirmar a importação', 'A janela resume as 142 linhas que entram (clientes, contratos, parcelas e valor) e as 6 que ficam de fora, diz que entra tudo ou nada, que o arquivo é apagado e até quando dá para desfazer.', 1000),
    ]),
    ('5. Importar e o resultado', 'A importação entra de uma vez (ou nada entra), fica no histórico e pode ser desfeita em 7 dias sem apagar nada em silêncio (PT-03).', [
        ('importando', 'Importando', 'A barra de progresso, “ou entra tudo ou nada” e “pode sair desta página, avisamos no sino”.', 0),
        ('importar-erro', 'A importação falhou', 'O servidor desfez tudo: nada entrou. A prévia continua guardada; código para o suporte.', 0),
        ('resultado', 'Importação concluída', '142 entraram e 6 ficaram de fora. Links para os clientes, os cadastros completados, os contratos e A receber. A planilha com as 6 linhas e o motivo. O aviso de que o arquivo foi apagado e o caminho para desfazer.', 0),
        ('importacoes', 'Histórico das importações', 'Cada importação com arquivo, quem, quando, o que entrou e a situação: concluída, com prazo de desfazer, ou desfeita com quem, quando e o motivo.', 0),
        ('desfazer', 'Desfazer a importação', 'Janela de alerta com motivo obrigatório: clientes inativados, cadastros completados voltando ao que eram, contratos encerrados e parcelas canceladas. O que alguém já mexeu depois fica como está.', 1100),
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
<title>Importar planilha · T3jus</title>
<meta name="description" content="Desenho da importação de clientes e contratos por planilha (VA-05), em computador e celular, para a Carol aprovar.">
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Clientes: Importar planilha</h1>
<p>A importação de clientes e contratos de uma planilha do Excel ou do Google Planilhas (VA-05, a validar), para o escritório chegar ao T3jus sem redigitar. Quatro passos: o arquivo, as colunas, a prévia antes de salvar e importar. Nada entra até a pessoa conferir; o arquivo enviado não fica guardado; e a importação pode ser desfeita em 7 dias sem apagar nada em silêncio. Cada estado tem computador (1440) e celular (412, com a barra de navegação embaixo). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Por onde se chega</a><a href="#s2">O arquivo</a><a href="#s3">As colunas</a><a href="#s4">A prévia</a><a href="#s5">Importar e resultado</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(lambda n, t: f'{n}-{t}.webp'))
    print(len(casos), 'casos')
