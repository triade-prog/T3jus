# Lista de estados (casos.json, lido pelo fotos.cjs) e o index.html com as capturas.
# montar(img) devolve o index; o publicar.py usa a mesma função com as capturas embutidas.
# Uso: python3 casos.py <pasta-saida>
import json, html, os, sys
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
K = 'conta.html?estado='
E = 'equipe.html?estado='
D = 'documentos.html?estado='
SECOES = [
    ('1. Sua conta: seus dados para os documentos', 'conta.html. Cada pessoa preenche e salva os próprios dados de qualificação. O cabeçalho foi refeito: vinho com o nome e o e-mail, âmbar com a frase que sai no documento, sem nada sobreposto, nem com nome longo.', [
        ('conta-completa', K + 'conta-completa', 'Dados completos', 'Carol Santana, sócia dona, com os 8 dados. No âmbar, a frase inteira de qualificação, como sai no contrato e na procuração. O disco diz “8 de 8”. A OAB fica no mesmo quadro, só para conferir; como sócia dona, Carol tem o link para corrigir na Equipe.'),
        ('conta-faltando', K + 'conta-faltando', 'Dados faltando', 'Faltam o estado civil, o CPF e o RG. A frase mostra as marcas [ESTADO CIVIL: falta], [CPF: falta] e [RG: falta], como no cliente. O disco e a barra de tons dizem “5 de 8”. Não bloqueia nada: “Completar agora” abre a edição.'),
        ('conta-editar', K + 'conta-editar', 'Editando os dados', 'Formulário aberto. Ao lado (no celular, antes dos botões), a prévia da procuração muda enquanto a pessoa digita: já com casada e o CPF, falta só o RG. Endereço do escritório marcado por padrão. A OAB aparece só para conferir.'),
        ('conta-erros', K + 'conta-erros', 'Erros ao salvar', 'Resumo no topo com links e cada erro preso ao campo: nome completo vazio, CPF com dígitos que não conferem e cidade vazia no endereço próprio (a mensagem lembra que dá para voltar ao endereço do escritório).'),
        ('conta-salva', K + 'conta-salva', 'Dados salvos', 'Confirmação: vale para os documentos gerados daqui em diante; os já gerados não mudam. A frase no âmbar já sai completa.'),
        ('conta-sem-oab', K + 'conta-sem-oab', 'Quem não é advogada', 'Júlia Andrade, da recepção, sem OAB. O âmbar diz que ela não assina contratos nem procurações e que nada é cobrado. O quadro explica para quem serve e quando abre.'),
        ('conta-nome-longo', K + 'conta-nome-longo', 'Nome e e-mail muito longos', 'Maria Eduarda Albuquerque Cavalcanti de Vasconcelos Figueiredo, com e-mail longo e endereço próprio. O nome quebra em linhas, o e-mail quebra onde precisar e nada se sobrepõe. Como não é sócia dona, o quadro da OAB diz com quem falar.'),
        ('conta-mais', K + 'conta-completa&mais=1', 'Celular · Mais com Sua conta', 'No grupo Sua conta do Mais, o item passa a se chamar “Seus dados para os documentos”.', ['celular']),
    ]),
    ('2. Equipe: a sócia dona vê e completa os dados da pessoa', 'equipe.html. A ficha da pessoa na Equipe ganha o mesmo quadro. Quem cuida dos dados é a própria pessoa e a sócia dona; a última mudança vale e fica no histórico.', [
        ('equipe-pessoa-dados', E + 'equipe-pessoa-dados', 'Ficha de Rafael com dados faltando', 'Carol vê os dados de Rafael Menezes (faltam o estado civil e o CPF), com a frase marcada no âmbar, as inscrições com Editar e Remover e as últimas mudanças ao lado (Rafael preencheu o RG em Sua conta).'),
        ('equipe-pessoa-editar', E + 'equipe-pessoa-editar', 'Sócia dona completando os dados de Rafael', 'O mesmo formulário de Sua conta, escrito na terceira pessoa. Carol marcou solteiro; o CPF continua faltando e a prévia mostra isso.'),
    ]),
    ('3. Gerar documentos: o aviso de advogado com dado faltando', 'documentos.html. Na página aprovada de Gerar documentos (Procurações e modelos), o advogado com dado faltando ganha o mesmo aviso do cliente: não bloqueia, sai marcado e tem o link para completar.', [
        ('documento-falta', D + 'documento-falta', 'Gerar contrato e procuração com dado do advogado faltando', 'Aviso no alto: faltam o estado civil e o CPF de Rafael. No cartão do advogado, o selo “Faltam 2” e o link “Completar na Equipe” (para Rafael, o link é “Completar em Sua conta”). Na prévia, a qualificação completa de cada advogado, com as marcas de falta.'),
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
<title>Sua conta e seus dados · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Sua conta: seus dados para os documentos</h1>
<p>Sua conta deixa de pedir só a OAB: cada pessoa que assina documentos preenche nome completo, tratamento (advogada ou advogado), nacionalidade, estado civil, CPF, RG e endereço profissional, como no cadastro do cliente. Uma prévia mostra como a pessoa sai no contrato e na procuração, com o que falta marcado. A sócia dona vê e completa os mesmos dados na Equipe, e o gerador de documentos avisa quando falta algo. O cabeçalho foi refeito para não sobrepor textos. Cada estado tem computador (1440) e celular (412); clique numa imagem para abrir o HTML naquele estado. Decisões, servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Sua conta</a><a href="#s2">Equipe</a><a href="#s3">Gerar documentos</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    json.dump(casos(), open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar())
    print(len(casos()), 'casos')
