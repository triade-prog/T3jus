# Lista de estados (casos.json, lido pelo fotos.cjs) e o index.html com as capturas.
# montar(img) devolve o index; o publicar.py usa a mesma função com as capturas embutidas.
# Uso: python3 casos.py <pasta-saida>
import json, html, os, sys
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
X = 'escritorio.html?estado='
K = 'conta.html?estado='
C = 'console-ficha.html?aba='
M = 'marca.html?estado='
SECOES = [
    ('1. Portal › Escritório › Dados do escritório', 'escritorio.html. O cartão passa a pedir o que o contrato, a procuração, as petições e o timbrado usam: tipo, razão social, CNPJ, registro da sociedade na OAB, sede em partes e os contatos do escritório. No alto, o resumo “N de 5” e a frase “CONTRATADA: ...” como sai no papel, com as marcas do que falta. A sócia dona muda; os outros leem.', [
        ('escritorio-completo', X + 'escritorio-completo', 'Dados completos', 'Santana Advocacia, sociedade individual, em Salvador. Disco “5 de 5”; no âmbar, o parágrafo da contratada como sai no contrato. Cada dado diz em uma linha onde sai (contrato, procuração, petições, recibo e carnê). Os contatos com a equipe T3jus ficam num bloco à parte; ao lado, onde os dados entram e o resumo dos advogados.'),
        ('escritorio-faltando', X + 'escritorio-faltando', 'O caso do print: faltam 4 de 5', 'Santana, CNPJ 60.814.144/0001-03, Presidente Jânio Quadros/BA, endereço não informado. A frase sai com SANTANA [RAZÃO SOCIAL: falta], [OAB DA SOCIEDADE: falta] e [ENDEREÇO DO ESCRITÓRIO: falta], com a cidade que já existe. Não bloqueia; “Completar agora” abre a edição.'),
        ('escritorio-editar', X + 'escritorio-editar', 'Editar, pela sócia dona', 'Três grupos (quem é, onde fica, como falar). O tipo é um trio de botões de opção; “sem sociedade” esconde razão social, CNPJ e OAB e troca a prévia (funciona na página). A prévia em papel mostra o contrato e o timbrado do recibo e do carnê, e o contador “4 de 5: falta o registro na OAB. Dá para salvar assim.”'),
        ('escritorio-erros', X + 'escritorio-erros', 'Erros ao salvar', 'Resumo no alto com links e o erro preso a cada campo: CNPJ com dígitos que não conferem, CEP com 7 números e número em branco (“Se não houver, escreva S/N.”). A prévia marca [CNPJ: confira].'),
        ('escritorio-salvo', X + 'escritorio-salvo', 'Salvo', 'Aviso “Dados do escritório salvos. Valem para os próximos documentos; os já gerados não mudam.”'),
        ('escritorio-sem-sociedade', X + 'escritorio-sem-sociedade', 'Advogada sem sociedade', 'Tipo “advogada ou advogado sem sociedade”: sem razão social, CNPJ nem OAB da sociedade. A contratada é Carol Santana, com a qualificação de Advogados nos documentos e o endereço do escritório. Disco “2 de 2”.'),
        ('escritorio-endereco-antigo', X + 'escritorio-endereco-antigo', 'Endereço antigo num texto só', 'O texto antigo aparece inteiro e vai para “Rua”; a pessoa separa número, complemento, bairro e CEP. Até salvar, o contrato sai com [ENDEREÇO: confira].'),
        ('escritorio-leitura', X + 'escritorio-leitura', 'Quem não é a sócia dona', 'Rafael Menezes vê tudo só para ler, sem “Editar” nem “Completar”, com a linha de quem muda: Carol Santana, sócia dona (ou a equipe T3jus, no Console).'),
    ]),
    ('2. Portal › Escritório › Advogados nos documentos (e Sua conta só com o sistema)', 'Mudança da Carol (22/11, 18h54): os dados de qualificação dos advogados saem de Sua conta e vão para o Escritório, numa seção própria ao lado de Dados do escritório. Sua conta fica só com o que é do sistema.', [
        ('escritorio-advogados', X + 'escritorio-advogados', 'Advogados nos documentos', 'A lista de quem tem OAB na Equipe, cada um com a barra “N de 8”, o que falta e a frase de qualificação com as marcas. Carol e Maria Eduarda completas; Rafael com 2 faltas e “Completar os dados”. Júlia, sem OAB, não aparece, e o texto diz por quê.'),
        ('escritorio-advogado-editar', X + 'escritorio-advogado-editar', 'Editar os dados de um advogado', 'O formulário aprovado de portal-conta-dados (frase com marcas, campos, prévia da procuração, erros), agora dentro do Escritório. A OAB continua vindo da Equipe, com o link.'),
        ('conta-so-sistema', K + 'conta-so-sistema', 'Sua conta só com o que é do sistema', 'Nome de exibição, e-mail de entrada, senha, avisos e escritórios. Uma linha diz que os dados para contratos e procurações agora ficam em Escritório › Advogados nos documentos, com o link.'),
    ]),
    ('3. Console e Marca e timbrado', 'Os mesmos campos para a equipe T3jus, no padrão aprovado do Console; o endereço de cobrança passa a ser “o mesmo da sede” por padrão; o registro da OAB sai de Marca e timbrado como campo.', [
        ('console-ficha-editar', C + 'ficha&estado=dd-editar', 'Console › Editar ficha', 'O editar aprovado da ficha com os grupos novos: tipo, razão social, CNPJ, registro na OAB, sede em partes (o grupo aprovado do endereço de cobrança), telefone, e-mail e site do escritório, e os contatos como estavam.'),
        ('console-cobranca-mesmo-endereco', C + 'assinatura&estado=dd-mesmo', 'Console › Assinatura: o mesmo endereço da sede', 'O grupo “Endereço de cobrança” ganha a caixa “O mesmo endereço da sede”, marcada por padrão, que mostra a sede numa linha e esconde os campos. Desmarcada, aparecem os campos aprovados (funciona na página).'),
        ('marca-oab-leitura', M + 'oab-leitura', 'Marca e timbrado: o registro da OAB só para ler', 'Em Escritório › Recebimento, o bloco do registro da sociedade na OAB mostra o número e o link “Mudar em Dados do escritório”. A barra de seções ganha “Advogados nos documentos”.'),
    ]),
]


def casos():
    out = []
    for _, _, itens in SECOES:
        for it in itens:
            out.append({'nome': it[0], 'url': it[1], **({'tams': it[4]} if len(it) > 4 else {})})
    return out


def montar(img=lambda nome, tam: f'{nome}-{tam}.webp'):
    h = lambda s: html.escape(s, quote=True)
    corpo = ''
    for i, (titulo, sub, itens) in enumerate(SECOES, 1):
        corpo += f'<section id="s{i}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
        for nome, url, t, leg, *tm in itens:
            figs = ''
            for tam in (tm[0] if tm else ['computador', 'celular']):
                figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{img(nome, tam)}" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                         f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
            corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                      f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
        corpo += '</section>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dados do escritório · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado e Console · para aprovação da Carol</p><h1>Dados do escritório para os documentos</h1>
<p>O cartão Dados do escritório passa a pedir o que sai no contrato, na procuração, nas petições e no timbrado do recibo e do carnê: tipo, razão social, CNPJ, registro da sociedade na OAB, a sede em partes e os contatos do escritório. A sócia dona preenche no Portal, com a prévia em papel; a equipe T3jus continua podendo mudar no Console. Os dados de qualificação dos advogados saem de Sua conta e vão para Escritório › Advogados nos documentos. Cada estado tem computador (1440) e celular (412); clique numa imagem para abrir o HTML naquele estado. Decisões, servidor e as 5 perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Dados do escritório</a><a href="#s2">Advogados nos documentos</a><a href="#s3">Console e Marca</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    json.dump(casos(), open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar())
    print(len(casos()), 'casos')
